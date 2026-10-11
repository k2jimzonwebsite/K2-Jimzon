// MAP-018 / IDEA-20261009-11. Actual local Admin screens; explicit dummy facts.
import assert from 'node:assert/strict'
import path from 'node:path'
import {chromium} from 'playwright'
import sharp from 'sharp'
import {decodeEvidenceImage} from '../server/admin-bff/product-intake.js'

export async function importedIntakeBrowserProbe({credentials,uid,report,target,out,trackRequest,trackPath,browserInventory=false,staffStock=false}) {
 const origin='http://127.0.0.1:54396',observed=[]
 report.intakeBrowser={scope:'Actual local password/MFA, imported Draft selection, three packaging uploads, manual field review and Save. Public test widget/unconfigured local bot fixture. No hosted/provider acceptance.',requests:observed,checks:[]}
 const result=report.intakeBrowser
 if(browserInventory)result.scope+=' Actual phone first-inventory form and Under Review publication; explicit dummy opening balance, not real inventory.'
 let browser,context,sessionId,requestId
 const pending=new Set(),callbackErrors=[],images=new Map()
 const drain=async()=>{while(pending.size)await Promise.all([...pending]);assert.deepEqual(callbackErrors,[],'browser_event_observation_errors')}
 try {
  browser=await chromium.launch({headless:true})
  context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
  const page=await context.newPage();page.setDefaultTimeout(30000)
  await page.route('**/*',route=>{const url=new URL(route.request().url());return ['127.0.0.1','localhost','challenges.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)||['data:','blob:'].includes(url.protocol)?route.continue():route.abort()})
  page.on('request',req=>{
   try {
   const url=new URL(req.url())
   if(url.pathname==='/api/admin/product-intake/session'&&req.method()==='POST') {
    const body=req.postDataJSON();trackRequest(body.requestId)
    if(body.existingProduct){assert.equal(body.existingProduct.productId,target.baseline.id);requestId=body.requestId}
   }
   if(url.pathname==='/api/admin/product-intake/evidence'&&req.method()==='POST') {
    const headers=req.headers(),slot=headers['x-k2-evidence-slot'],image=images.get(slot)
    assert.ok(image);assert.match(headers['x-k2-intake-session']||'',/^[0-9a-f-]{36}$/i)
    assert.match(headers['x-k2-idempotency-key']||'',/^[0-9a-f-]{36}$/i)
    trackPath(`${uid}/${headers['x-k2-intake-session']}/${slot.toLowerCase()}-${headers['x-k2-idempotency-key']}-${image.sha256.slice(0,16)}.${image.extension}`)
   }
   } catch(error) {callbackErrors.push(error.message)}
  })
  page.on('response',response=>{
   const task=(async()=>{
   const url=new URL(response.url());if(url.hostname!=='127.0.0.1'||!url.pathname.startsWith('/api/admin/'))return
   const row={path:url.pathname,method:response.request().method(),status:response.status()};observed.push(row)
   const data=await response.json().catch(()=>null)
   if(row.status>=400)row.code=data?.error?.code||null
   if(url.pathname==='/api/admin/product-intake/session'&&row.method==='POST'&&response.request().postDataJSON()?.existingProduct)sessionId=data?.result?.sessionId
   if(url.pathname==='/api/admin/product-intake/evidence'&&data?.result?.path)trackPath(data.result.path)
   })().catch(error=>{callbackErrors.push(error.message)})
   pending.add(task);void task.finally(()=>pending.delete(task))
  })
  result.stage='login';await page.goto(origin+'/admin-portal-k2-secure?section=inventory',{waitUntil:'domcontentloaded'})
  await page.getByLabel('Email',{exact:true}).fill(credentials.email);await page.getByLabel('Password',{exact:true}).fill(credentials.password)
  await page.waitForFunction(()=>Boolean(document.querySelector('[name="cf-turnstile-response"]')?.value),{},{timeout:60000})
  await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByLabel('Six-digit authenticator code').fill(credentials.totp())
  await page.getByRole('button',{name:'Verify & enter',exact:true}).click();await page.getByRole('switch',{name:'Sheet mode',exact:true}).waitFor()
  result.cookies=(await context.cookies()).filter(cookie=>cookie.name.startsWith('k2_admin_')).map(({name,httpOnly,sameSite})=>({name,httpOnly,sameSite}))
  assert.ok(result.cookies.some(cookie=>cookie.name==='k2_admin_session'&&cookie.httpOnly))
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes('auth-token'))),[])
  result.checks.push('real_password_mfa_http_only_session')
  result.stage='select_imported_draft';await page.getByRole('button',{name:'Add product',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Phone-First Product Intake',exact:true})
  await dialog.getByLabel('Product barcode, SKU, or name',{exact:true}).fill(target.baseline.sku)
  await dialog.getByRole('button',{name:'Check Duplicate',exact:true}).click()
  await dialog.getByRole('button',{name:'Review existing Draft before inventory',exact:true}).click()
  await dialog.getByRole('button',{name:'Next',exact:true}).click()
  result.stage='packaging_uploads'
  for(const [index,label] of ['Front Package','Back / Ingredients','Barcode Label'].entries()) {
   result.stage='upload_'+['PRIMARY','BACK','BARCODE'][index]
   // A 200 upload reply precedes the protected session refresh. Staff cannot
   // select another file while that command is held; automation must wait too.
   await page.waitForFunction(name=>{const input=[...document.querySelectorAll('input[type="file"]')].find(value=>value.getAttribute('aria-label')===name);return input&&!input.matches(':disabled')},label+' evidence photo')
   const bytes=await sharp({create:{width:160,height:120,channels:3,background:{r:23+index,g:115,b:201}}}).png().toBuffer()
   images.set(['PRIMARY','BACK','BARCODE'][index],await decodeEvidenceImage(bytes,'image/png'))
   const received=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/admin/product-intake/evidence'&&res.request().method()==='POST')
   await dialog.getByLabel(label+' evidence photo',{exact:true}).setInputFiles({name:'synthetic-'+index+'.png',mimeType:'image/png',buffer:bytes})
   const response=await received;assert.equal(response.status(),200)
   const image=(await response.json()).result;assert.equal(image.uploadStatus,'uploaded');assert.equal(image.width,160);assert.equal(image.height,120)
   trackPath(image.path)
   await dialog.getByRole('img',{name:label+' preview',exact:true}).waitFor()
  }
  for(const label of ['Ingredients / Composition captured in back photo','Allergens / Warnings verified','Storage & Directions captured','Batch and expiry / non-expiry evidence checked'])await dialog.getByLabel(label,{exact:true}).check()
  await dialog.getByRole('button',{name:'Next',exact:true}).click()
  await dialog.getByRole('heading',{name:'Step 3: Optional advice',exact:true}).waitFor()
  await dialog.getByRole('button',{name:'Next',exact:true}).click()
  result.stage='manual_field_review'
  for(const [key,value] of Object.entries({description:'Staff accepted correction',ingredients:'Rejected AI suggestion',origin:'Italy',brand:target.brand.name,category:target.category.name}))await dialog.getByLabel('Proposed '+key,{exact:true}).fill(value)
  for(const key of ['name','description','origin','brand','category'])await dialog.getByLabel('Accept '+key,{exact:true}).check()
  assert.equal(await dialog.getByLabel('Accept ingredients',{exact:true}).isChecked(),false)
  for(const [name,viewport] of browserInventory ? [] : [['desktop',{width:1440,height:1000}],['phone',{width:375,height:812}]]) {
   await page.setViewportSize(viewport)
   await page.screenshot({path:path.join(out,'intake-review-'+name+'.png'),fullPage:false})
   const geometry=await dialog.evaluate(element=>({width:element.getBoundingClientRect().width,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}))
   assert.ok(geometry.width<=geometry.viewport+1);assert.ok(geometry.documentWidth<=geometry.viewport+1)
   result[name]=geometry
  }
  if(browserInventory)await page.setViewportSize({width:375,height:812})
  // Complete the save using the narrow phone layout, with no optional AI call.
  await dialog.getByRole('button',{name:'Next',exact:true}).click()
  const saved=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/admin/product-intake/draft'&&res.request().method()==='POST')
  await dialog.getByRole('button',{name:'Save reviewed details',exact:true}).click()
  assert.equal((await saved).status(),200)
  await dialog.getByRole('heading',{name:'Step 6: Controlled First Inventory',exact:true}).waitFor()
  if(browserInventory){
   // Publication and stock updates may advance the catalog version too. Prove
   // the review's single increment before either later command runs.
   result.stage='review_before_inventory_readback'
   // MASTER_FIELDS omits ID/catalog version. Use the existing authenticated
   // fixture read, without changing the production response or browser authority.
   result.reviewRecordVersion=await target.readReviewedVersion()
   result.stage='first_inventory_form'
   await dialog.getByRole('button',{name:'Opening Balance',exact:true}).click()
   const fields={'Box / Container Code':'SYN-WORKFLOW-BOX','Batch / Lot Code':'SYN-WORKFLOW-LOT','Verified physical quantity':'6','Best-before / expiry date':new Date(Date.now()+400*86400000).toISOString().slice(0,10),'Inventory Owner':'SYNTHETIC-OWNER','Unit Cost (PHP)':'40','Reconciliation reason':'Explicit dummy opening stock; no physical inventory claim'}
   for(const[label,value]of Object.entries(fields))await dialog.getByLabel(label,{exact:true}).fill(value)
   await dialog.getByLabel('Hub / Location',{exact:true}).selectOption('HUB-MNL-CENTRAL')
   await dialog.getByLabel('Custodian',{exact:true}).selectOption('CUST-STAFF-ELENA')
   result.stockInputs={quantity:6,unitCost:40,ownerCode:'SYNTHETIC-OWNER',hubLocation:'HUB-MNL-CENTRAL',custodian:'CUST-STAFF-ELENA',source:'reconciliation',synthetic:true}
   for(const[name,viewport]of [['desktop',{width:1440,height:1000}],['phone',{width:375,height:812}]]){
    await page.setViewportSize(viewport);await dialog.getByLabel('Reconciliation reason',{exact:true}).scrollIntoViewIfNeeded()
    await page.screenshot({path:path.join(out,'intake-inventory-'+name+'.png')})
    const geometry=await dialog.evaluate(element=>({width:element.getBoundingClientRect().width,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}))
    assert.ok(geometry.width<=geometry.viewport+1);assert.ok(geometry.documentWidth<=geometry.viewport+1);result[name]=geometry
   }
   result.stage='record_first_inventory'
   const inventory=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/admin/product-intake/inventory'&&res.request().method()==='POST')
   await dialog.getByRole('button',{name:'Record Authorized Opening Balance',exact:true}).click()
   const response=await inventory;result.inventoryStatus=response.status();assert.equal(response.status(),200)
   await dialog.getByRole('heading',{name:'Step 7: Publication Readiness Review',exact:true}).waitFor()
   result.stage='publication_under_review'
   await dialog.getByLabel(/^Publication reason/).fill('Explicit synthetic staff package review')
   const publication=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/admin/product-intake/publication'&&res.request().method()==='POST')
   await dialog.getByLabel('Publication status',{exact:true}).selectOption('under_review')
   const published=await publication;assert.equal(published.status(),200)
   // A successful publication decision calls the register's completion handler
   // and closes intake. Wait for that staff-visible result, not a removed select.
   await dialog.waitFor({state:'hidden'})
   await page.getByPlaceholder('Search SKU, product, barcode, or origin',{exact:true}).fill(target.baseline.sku)
   await page.getByText(/^under review$/i).waitFor()
   if(staffStock){
    await page.getByText('Stock',{exact:true}).locator('..').getByText('6',{exact:true}).waitFor()
    for(const[name,viewport]of [['desktop',{width:1440,height:1000}],['phone',{width:375,height:812}]]){
     await page.setViewportSize(viewport)
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
     await page.screenshot({path:path.join(out,'staff-stock-register-'+name+'.png')})
    }
    result.staffStockRendered=true
   }
   result.phoneFirstInventory=true;result.publicationUnderReview=true
   result.checks.push('actual_phone_first_inventory_and_under_review_publication')
  }
  await drain()
  assert.match(sessionId||'',/^[0-9a-f-]{36}$/i);assert.match(requestId||'',/^[0-9a-f-]{36}$/i)
  result.sessionId=sessionId;result.requestId=requestId;result.manualReview=true;result.phoneSave=true
  result.checks.push('actual_imported_selection_three_uploads_manual_review_phone_save')
  assert.equal(observed.some(row=>row.path==='/api/admin/product-intake/ai'&&row.method==='POST'),false)
  result.stage='complete';result.passed=true
  return {sessionId,requestId}
 } catch(error) {
  result.passed=false
  result.failure={name:error.name,message:error.message.slice(0,2000)}
  if(context){const page=context.pages()[0];if(page){await page.screenshot({path:path.join(out,'intake-browser-failure.png')}).catch(()=>{});result.failureText=(await page.locator('body').innerText().catch(()=>'' )).slice(-12000)}}
  throw error
 } finally {
  // Observers finish before the caller removes actor-owned sessions and objects.
  if(context)await context.close();if(browser)await browser.close()
  await drain()
 }
}
