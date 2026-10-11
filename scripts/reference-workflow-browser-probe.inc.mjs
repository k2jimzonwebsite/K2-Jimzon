// Included in the pinned local native BFF helper. Never records credentials.
async function browserProbe(credentials,report,uid) {
 const {chromium}=(await import(pathToFileURL(path.join(process.cwd(),'node_modules/playwright/index.js')).href)).default
 const {createHash,randomUUID}=await import('node:crypto')
 const fs=await import('node:fs')
 const sha=value=>createHash('sha256').update(value).digest('hex')
 const sku='MAP018-REFERENCE-WORKFLOW-01',origin='http://127.0.0.1:54396'
 const out=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'))
 const observed=[];let browser,context
 report.browser={scope:'Actual full local Admin password/MFA and protected reference creation/reload/exact replay/paired Save. Real local Auth/PostgREST/captured PostgreSQL; public test widget and explicit unconfigured local bot fixture. No provider or hosted acceptance.',checks:[],requests:observed}
 try {
  browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
  const page=await context.newPage();page.setDefaultTimeout(30000)
  await page.route('**/*',route=>{const url=new URL(route.request().url());return ['127.0.0.1','localhost','challenges.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)||['data:','blob:'].includes(url.protocol)?route.continue():route.abort()})
  page.on('response',async response=>{const url=new URL(response.url());if(url.hostname!=='127.0.0.1'||!url.pathname.startsWith('/api/admin/'))return;const row={path:url.pathname,method:response.request().method(),status:response.status()};observed.push(row);if(row.status>=400){const data=await response.json().catch(()=>null);row.code=data?.error?.code||null}})
  report.browser.stage='login';await page.goto(origin+'/admin-portal-k2-secure?section=inventory',{waitUntil:'domcontentloaded'})
  await page.getByLabel('Email',{exact:true}).fill(credentials.email);await page.getByLabel('Password',{exact:true}).fill(credentials.password)
  await page.waitForFunction(()=>Boolean(document.querySelector('[name="cf-turnstile-response"]')?.value),{},{timeout:60000})
  await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByLabel('Six-digit authenticator code').fill(credentials.totp())
  await page.getByRole('button',{name:'Verify & enter',exact:true}).click();await page.getByRole('switch',{name:'Sheet mode',exact:true}).waitFor()
  report.browser.checks.push('real_password_mfa_full_admin')
  assert.equal((await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes('auth-token')))).length,0)
  report.browser.cookies=(await context.cookies()).filter(cookie=>cookie.name.startsWith('k2_admin_')).map(({name,httpOnly,secure,sameSite})=>({name,httpOnly,secure,sameSite}))
  assert.ok(report.browser.cookies.some(cookie=>cookie.name==='k2_admin_session'&&cookie.httpOnly))
  const {readActiveSession}=await import(pathToFileURL(path.join(process.cwd(),'server/admin-bff/security.js')).href)
  const {createServerSupabase,restoreAuthSession}=await import(pathToFileURL(path.join(process.cwd(),'server/admin-bff/supabase.js')).href)
  const diagnosticClient=createServerSupabase(),diagnosticCookies=(await context.cookies()).map(value=>value.name+'='+value.value).join('; ')
  await restoreAuthSession(diagnosticClient,readActiveSession({headers:{cookie:diagnosticCookies}}))
  const deadlines=await diagnosticClient.rpc('k2_reference_fixture_deadlines');assert.equal(deadlines.error,null);report.browser.callerDeadlines=deadlines.data
  const openEditor=async()=>{report.browser.stage='open_editor';await page.getByPlaceholder('Search SKU, product, barcode, or origin',{exact:true}).fill(sku);const response=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/admin/product-master'&&res.request().method()==='GET');await page.getByRole('button',{name:'Edit',exact:true}).click();const data=await(await response).json();report.browser.taxonomyReview={status:data.taxonomyReview?.status,brandCount:data.taxonomyReview?.brandOptions?.length,categoryCount:data.taxonomyReview?.categoryOptions?.length};return page.getByRole('dialog',{name:'Edit Product',exact:true})}
  const nameSuffix=randomUUID(),brandName='MAP018 genuine brand '+nameSuffix,categoryName='MAP018 genuine category '+nameSuffix
  let editor=await openEditor();
  if(report.browser.taxonomyReview.status!=='eligible') {
   const load=file=>import(pathToFileURL(path.join(process.cwd(),'server/admin-bff',file)).href)
   const security=await load('security.js'),{createServerSupabase,restoreAuthSession}=await load('supabase.js'),client=createServerSupabase()
   const cookie=(await context.cookies()).map(value=>value.name+'='+value.value).join('; ')
   await restoreAuthSession(client,security.readActiveSession({headers:{cookie}}))
   report.browser.eligibilityDiagnostics=[]
   for(const [table,columns,filter] of [['v_product_stock_from_batches','sku,stock_from_batches',true],['product_batches','id',true],['inventory_balances','on_hand,reserved,in_transit,damaged,expired,unaccounted',true],['inventory_events','id',true],['brands','id,name',false],['categories','id,name',false]]) {
    let query=client.from(table).select(columns,{count:'exact'}).limit(501);if(filter)query=query.eq('sku',sku)
    const result=await query
    report.browser.eligibilityDiagnostics.push({table,status:result.status,errorCode:result.error?.code,count:result.count,rows:result.data?.length,allNamesReadable:filter?undefined:result.data?.every(value=>typeof value.name==='string'&&value.name.trim().length>0)})
   }
   throw Error('GENUINE_TAXONOMY_ELIGIBILITY_UNAVAILABLE')
  }
  report.browser.stage='open_brand_creation';await editor.getByRole('button',{name:'Create brand',exact:true}).click()
  let dialog=page.getByRole('dialog',{name:'Create brand',exact:true})
  await dialog.getByLabel('Brand name',{exact:true}).fill(brandName);await dialog.getByLabel('Creation reason',{exact:true}).fill('Synthetic genuine reference workflow brand')
  let first,firstAttempt
  await page.route('**/api/admin/references',async route=>{
   if(route.request().method()!=='POST'||first)return route.fallback()
   const req=route.request(),response=await route.fetch(),result=await response.json()
   firstAttempt={status:response.status(),code:result.error?.code||null};report.browser.firstCreation=firstAttempt
   if(response.status()!==200||!result.result?.reference?.id)return route.fulfill({response})
   first={body:req.postData(),key:req.headers()['x-k2-idempotency-key'],actor:req.headers()['x-k2-actor-id'],result:result.result}
   await route.abort()
  })
  report.browser.stage='brand_lost_reply';await dialog.getByRole('button',{name:'Create reference',exact:true}).click()
  await dialog.getByRole('alert').filter({hasText:'saved request'}).waitFor()
  assert.equal(firstAttempt.status,200);assert.ok(first);assert.equal(first.actor,uid)
  const heldKey='k2-reference-pending-v1:'+uid,saved=await page.evaluate(key=>localStorage.getItem(key),heldKey)
  const held=JSON.parse(saved);assert.equal(held.payloadText,first.body);assert.equal(held.key,first.key);assert.equal(held.actorId,uid)
  await page.reload();await page.getByRole('button',{name:'Review pending reference creation',exact:true}).click()
  dialog=page.getByRole('dialog',{name:'Create brand',exact:true})
  const retryRequest=page.waitForRequest(req=>new URL(req.url()).pathname==='/api/admin/references'&&req.method()==='POST')
  const retryResponse=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/admin/references'&&res.request().method()==='POST')
  await dialog.getByRole('button',{name:'Retry saved request',exact:true}).click()
  const req=await retryRequest,res=await retryResponse;assert.equal(req.postData(),first.body);assert.equal(req.headers()['x-k2-idempotency-key'],first.key);assert.equal(req.headers()['x-k2-actor-id'],uid);assert.equal(res.status(),200);assert.deepEqual((await res.json()).result,first.result)
  await dialog.getByRole('button',{name:'Use reference',exact:true}).click();await page.waitForFunction(key=>localStorage.getItem(key)===null,heldKey)
  report.browser.recovery={lostReplyServerStatus:200,exactLiteralBody:true,exactKey:true,actor:uid,payloadSha256:sha(first.body),acknowledged:true}
  report.browser.checks.push('committed_lost_reply_reload_exact_request_receipt_recovery')
  editor=await openEditor();await editor.getByLabel('Brand',{exact:true}).selectOption(first.result.reference.id)
  report.browser.stage='category_creation';await editor.getByRole('button',{name:'Create category',exact:true}).click();dialog=page.getByRole('dialog',{name:'Create category',exact:true})
  await dialog.getByLabel('Category name',{exact:true}).fill(categoryName);await dialog.getByLabel('Creation reason',{exact:true}).fill('Synthetic genuine reference workflow category')
  const categoryResponse=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/admin/references'&&res.request().method()==='POST')
  await dialog.getByRole('button',{name:'Create reference',exact:true}).click();const categoryReply=await categoryResponse;assert.equal(categoryReply.status(),200)
  const category=(await categoryReply.json()).result.reference;assert.equal(category.kind,'category');assert.equal(category.parentId,null)
  report.browser.stage='category_acknowledgement';await dialog.getByRole('button',{name:'Use reference',exact:true}).click();await dialog.waitFor({state:'hidden'})
  report.browser.stage='unsaved_choices'
  report.browser.unsavedChoices={brand:await editor.getByLabel('Brand',{exact:true}).inputValue(),expectedBrand:first.result.reference.id,category:await editor.getByLabel('Canonical category',{exact:true}).inputValue(),expectedCategory:category.id}
  assert.equal(report.browser.unsavedChoices.brand,first.result.reference.id)
  assert.equal(report.browser.unsavedChoices.category,category.id)
  const getCanonical=async()=>{report.browser.stage='canonical_read';const response=await context.request.get(origin+'/api/admin/product-master?sku='+sku,{headers:{origin}});report.browser.canonicalReadStatus=response.status();assert.equal(response.status(),200);return (await response.json()).product}
  let product=await getCanonical();assert.equal(product.brand_id,null);assert.equal(product.category_id,null)
  report.browser.checks.push('creation_does_not_assign_before_paired_save')
  const csrf=(await context.cookies()).find(cookie=>cookie.name==='k2_admin_csrf').value
  const post=async(body=first.body,key=first.key,extra={})=>{
   const response=await context.request.post(origin+'/api/admin/references',{headers:{origin,'content-type':'application/json','x-k2-csrf':decodeURIComponent(csrf),'x-k2-idempotency-key':key,'x-k2-actor-id':uid,...extra},data:body})
   return {status:response.status(),data:await response.json()}
  }
  const replay=await post();assert.equal(replay.status,200);assert.deepEqual(replay.data.result,first.result)
  const changed=await post(JSON.stringify({...JSON.parse(first.body),reason:'Synthetic changed request is refused'}));assert.equal(changed.status,409)
  const badActor=await post(first.body,randomUUID(),{'x-k2-actor-id':randomUUID()});assert.equal(badActor.status,403)
  const badCsrf=await post(first.body,randomUUID(),{'x-k2-csrf':'synthetic-invalid-csrf'});assert.equal(badCsrf.status,403)
  const promote=async role=>{const response=await fetch('http://127.0.0.1:54394/user_profiles?id=eq.'+uid+'&select=role',{method:'PATCH',headers:{Authorization:'Bearer '+localServiceJwt(),'content-type':'application/json',Prefer:'return=representation'},body:JSON.stringify({role})});assert.equal(response.status,200);assert.deepEqual(await response.json(),[{role}])}
  const localServiceJwt=()=>{const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),body=Buffer.from(JSON.stringify({role:'service_role',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+60})).toString('base64url');return header+'.'+body+'.'+createLocalSignature(header+'.'+body)}
  const {createHmac}=await import('node:crypto'),createLocalSignature=value=>createHmac('sha256','synthetic-local-startup-only-secret-20261010').update(value).digest('base64url')
  await promote('Staff');try{const staff=await post(first.body,randomUUID());assert.equal(staff.status,403);report.browser.refusals={changedBody:changed.status,actor:badActor.status,csrf:badCsrf.status,currentStaff:staff.status}}finally{await promote('Admin')}
  report.browser.checks.push('real_current_role_csrf_actor_changed_body_refusals_and_exact_replay')
  report.browser.stage='paired_save';await editor.getByLabel(/Reason for this change/).fill('Synthetic genuine paired reference assignment')
  const savedResponse=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/admin/product-master'&&res.request().method()==='POST')
  await editor.getByRole('button',{name:'Save Changes',exact:true}).click();const savedReply=await savedResponse;assert.equal(savedReply.status(),200)
  product=await getCanonical();assert.equal(product.brand_id,first.result.reference.id);assert.equal(product.category_id,category.id)
  report.browser.canonical={sku,brandId:product.brand_id,categoryId:product.category_id,pairedSaveStatus:200}
  report.browser.checks.push('actual_rendered_paired_save_canonical_ids')
  await page.getByRole('switch',{name:'Sheet mode',exact:true}).click();await page.getByText('Brands and categories are read-only here. Switch to Grid, then Edit a product to review or create references.',{exact:true}).waitFor()
  await page.screenshot({path:path.join(out,'browser-sheet.png'),fullPage:false})
  report.browser.checks.push('actual_secure_sheet_guidance');report.browser.stage='complete';report.browser.passed=true
 } finally {if(context)await context.close();if(browser)await browser.close()}
}
