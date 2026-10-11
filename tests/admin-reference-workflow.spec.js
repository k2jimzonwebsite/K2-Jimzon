import { test, expect } from '@playwright/test'
const actor='11111111-1111-4111-8111-111111111111', heldKey=`k2-reference-pending-v1:${actor}`
const brand={id:'22222222-2222-4222-8222-222222222222',name:'Synthetic reviewed brand'}
const category={id:'33333333-3333-4333-8333-333333333333',name:'Synthetic category',parent_id:null}
const product={sku:'synthetic-reference-draft',name:'Synthetic reference Draft',status:'Draft',published:false,brand_id:null,category_id:null,stock_available:0,total_stock:0,updated_at:'2026-10-11T00:00:00Z'}
const receipt={ok:true,result:{reference:{...brand,kind:'brand',parentId:null},reused:false},currentReference:{status:'available',reference:brand}}
async function setup(page,create,save=route=>route.fulfill({json:{ok:true}}),references={brands:[brand],categories:[category]}){
 await page.route('https://fixture.supabase.co/**',route=>route.abort())
 await page.route('**/api/admin/session',route=>route.fulfill({json:{ok:true,user:{userId:actor,role:'Admin'}}}))
 await page.route('**/api/admin/products',route=>route.fulfill({json:{ok:true,products:[product]}}))
 await page.route('**/api/admin/product-master*',route=>route.request().method()==='POST'?save(route):route.fulfill({json:{ok:true,product,taxonomyReview:{status:'eligible',originalBrandId:null,originalCategoryId:null,brandOptions:[],categoryOptions:[category]}}}))
 await page.route('**/api/admin/references',route=>route.request().method()==='POST'?create(route):route.fulfill({json:{ok:true,references}}))
 await page.goto('/tests/fixtures/admin-product-master-harness.html?surface=references')
}
async function createForm(page){
 await page.getByRole('button',{name:'Edit',exact:true}).click()
 await page.getByRole('button',{name:'Create brand',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Create brand'})
 await dialog.getByLabel('Brand name',{exact:true}).fill('  Synthetic reviewed brand  ')
 await dialog.getByLabel('Creation reason',{exact:true}).fill('Reviewed supplier catalogue')
 await dialog.getByRole('button',{name:'Create reference',exact:true}).click()
 return dialog
}
test('confirmed creation fills only an unsaved choice and failed paired Save keeps it',async({page},testInfo)=>{
 const writes=[];let saves=0
 await setup(page,route=>{writes.push(route.request().postData());return route.fulfill({json:receipt})},route=>{saves++;return route.fulfill({status:503,json:{error:{code:'ADMIN_SERVICE_UNAVAILABLE'}}})})
 const dialog=await createForm(page)
 await expect(dialog.getByRole('status')).toContainText('product changes are not saved yet')
 for(const width of [375,1440]){await page.setViewportSize({width,height:900});expect(await dialog.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);await page.screenshot({path:testInfo.outputPath(`reference-dialog-${width}.png`),fullPage:true})}
 await dialog.getByRole('button',{name:'Use reference',exact:true}).click()
 const editor=page.getByRole('dialog',{name:'Edit Product'})
 await expect(editor.getByLabel('Brand',{exact:true})).toHaveValue(brand.id)
 expect(saves).toBe(0);expect(writes).toHaveLength(1)
 await editor.getByLabel('Canonical category',{exact:true}).selectOption(category.id)
 await editor.getByLabel(/Reason for this change/).fill('Reviewed initial product identity')
 await editor.getByRole('button',{name:'Save Changes',exact:true}).click()
 await expect(editor.getByRole('alert')).toBeVisible()
 await expect(editor.getByLabel('Brand',{exact:true})).toHaveValue(brand.id)
 for(const width of [375,1440]){await page.setViewportSize({width,height:900});expect(await editor.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);await page.screenshot({path:testInfo.outputPath(`reference-${width}.png`),fullPage:true})}
})
test('lost reply survives close reload and retry uses exact saved request and actor',async({page})=>{
 const writes=[]
 await setup(page,route=>{writes.push({body:route.request().postData(),key:route.request().headers()['x-k2-idempotency-key'],actor:route.request().headers()['x-k2-actor-id']});return writes.length===1?route.abort():route.fulfill({json:receipt})})
 const dialog=await createForm(page)
 await expect(dialog.getByRole('alert')).toContainText('saved request')
 const saved=await page.evaluate(key=>localStorage.getItem(key),heldKey);expect(saved).not.toMatch(/token|csrf|secret/i)
 await dialog.getByRole('button',{name:'Close reference creation',exact:true}).click();await page.reload()
 await page.getByRole('button',{name:'Review pending reference creation',exact:true}).click()
 const recovery=page.getByRole('dialog',{name:'Create brand'})
 await recovery.getByRole('button',{name:'Retry saved request',exact:true}).click()
 await expect(recovery.getByRole('status')).toContainText('product changes are not saved yet')
 expect(writes).toHaveLength(2);expect(writes[1]).toEqual(writes[0]);expect(writes[0].actor).toBe(actor)
 expect(await page.evaluate(key=>localStorage.getItem(key),heldKey)).toBe(saved)
 await recovery.getByRole('button',{name:'Use reference',exact:true}).click()
 await expect.poll(()=>page.evaluate(key=>localStorage.getItem(key),heldKey)).toBeNull()
})
test('reference changed after confirmation is reviewed before unsaved selection',async({page})=>{
 await setup(page,route=>route.fulfill({json:receipt}))
 const dialog=await createForm(page)
 await expect(dialog.getByRole('status')).toContainText('product changes are not saved yet')
 await page.route('**/api/admin/references',route=>route.fulfill({json:{ok:true,references:{brands:[],categories:[category]}}}))
 await dialog.getByRole('button',{name:'Use reference',exact:true}).click()
 await expect(dialog.getByText(/current name, parent or availability/)).toBeVisible()
 await expect(page.getByRole('dialog',{name:'Edit Product'}).getByLabel('Brand',{exact:true})).toHaveValue('')
 await dialog.getByRole('button',{name:'Acknowledge reference outcome',exact:true}).click()
 await expect(dialog).toHaveCount(0)
})

test('approved U+FEFF reference name remains readable and acknowledgeable',async({page})=>{
 const unicodeBrand={...brand,name:'\ufeff'}
 const unicodeReceipt={...receipt,result:{...receipt.result,reference:{...receipt.result.reference,name:'\ufeff'}},currentReference:{status:'available',reference:unicodeBrand}}
 await setup(page,route=>route.fulfill({json:unicodeReceipt}),undefined,{brands:[unicodeBrand],categories:[category]})
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('button',{name:'Create brand',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Create brand'})
 await expect(dialog.getByRole('button',{name:'Create reference',exact:true})).toBeEnabled()
 await dialog.getByLabel('Brand name',{exact:true}).fill('\ufeff');await dialog.getByLabel('Creation reason',{exact:true}).fill('Reviewed Unicode identity')
 await dialog.getByRole('button',{name:'Create reference',exact:true}).click()
 await expect(dialog.getByRole('status')).toContainText('product changes are not saved yet')
 await dialog.getByRole('button',{name:'Use reference',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Edit Product'}).getByLabel('Brand',{exact:true})).toHaveValue(brand.id)
})

test('current permissions and actor guard retry without replacing the held request',async({page})=>{
 let writes=0
 await setup(page,route=>{writes++;return writes===1?route.abort():route.fulfill({json:receipt})})
 const dialog=await createForm(page)
 await expect(dialog.getByRole('alert')).toContainText('saved request')
 const saved=await page.evaluate(key=>localStorage.getItem(key),heldKey)
 for(const user of [{userId:actor,role:'Staff'},{userId:brand.id,role:'Admin'}]){
  await page.route('**/api/admin/session',route=>route.fulfill({json:{ok:true,user}}))
  await dialog.getByRole('button',{name:'Retry saved request',exact:true}).click()
  await expect(dialog.getByRole('alert')).toContainText(user.role==='Staff'?'Only an Admin':'account changed')
  expect(writes).toBe(1);expect(await page.evaluate(key=>localStorage.getItem(key),heldKey)).toBe(saved)
 }
 await page.route('**/api/admin/session',route=>route.fulfill({json:{ok:true,user:{userId:actor,role:'Admin'}}}))
 await dialog.getByRole('button',{name:'Retry saved request',exact:true}).click()
 await expect(dialog.getByRole('status')).toContainText('product changes are not saved yet');expect(writes).toBe(2)
})

test('switching actor hides the original actor recovery and switching back restores it',async({page})=>{
 await setup(page,route=>route.abort())
 const dialog=await createForm(page);await expect(dialog.getByRole('alert')).toContainText('saved request')
 const saved=await page.evaluate(key=>localStorage.getItem(key),heldKey)
 await dialog.getByRole('button',{name:'Close reference creation',exact:true}).click()
 await page.getByRole('button',{name:'Close product editor',exact:true}).click()
 await page.getByRole('button',{name:'Switch synthetic staff'}).click()
 await expect(page.getByRole('button',{name:'Review pending reference creation'})).toHaveCount(0)
 expect(await page.evaluate(key=>localStorage.getItem(key),heldKey)).toBe(saved)
 await page.getByRole('button',{name:'Switch synthetic staff'}).click()
 await expect(page.getByRole('button',{name:'Review pending reference creation'})).toBeVisible()
})

test('a queued retry refuses a request acknowledged in another tab',async({page,context})=>{
 let writes=0
 await setup(page,route=>{writes++;return route.abort()})
 const dialog=await createForm(page);await expect(dialog.getByRole('alert')).toContainText('saved request')
 await page.evaluate(async key=>{
  window.lockReady=new Promise(resolve=>{window.markReady=resolve})
  window.lockTask=navigator.locks.request(key,async()=>{window.markReady();await new Promise(resolve=>{window.releaseReferenceLock=resolve})})
  await window.lockReady
 },heldKey)
 const other=await context.newPage();await setup(other,route=>{writes++;return route.abort()})
 await other.getByRole('button',{name:'Review pending reference creation'}).click()
 const recovery=other.getByRole('dialog',{name:'Create brand'})
 await recovery.getByRole('button',{name:'Retry saved request',exact:true}).click()
 await expect(recovery.getByRole('button',{name:'Confirming creation…',exact:true})).toBeDisabled()
 await page.evaluate(async key=>{localStorage.removeItem(key);window.releaseReferenceLock();await window.lockTask},heldKey)
 await expect(recovery.getByRole('alert')).toContainText('saved request changed in another tab')
 expect(writes).toBe(1);expect(await other.evaluate(key=>localStorage.getItem(key),heldKey)).toBeNull()
})

test('category creation preserves its parent and selects only the unsaved category',async({page})=>{
 const child={id:'44444444-4444-4444-8444-444444444444',name:'Synthetic child',parent_id:category.id}
 let created=false,body
 await setup(page,route=>{created=true;body=route.request().postDataJSON();return route.fulfill({json:{ok:true,result:{reference:{id:child.id,name:child.name,kind:'category',parentId:category.id},reused:false},currentReference:{status:'available'}}})})
 await page.route('**/api/admin/references',route=>route.request().method()==='POST'?route.fallback():route.fulfill({json:{ok:true,references:{brands:[brand],categories:created?[category,child]:[category]}}}))
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('button',{name:'Create category',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Create category'})
 await dialog.getByLabel('Category name',{exact:true}).fill(child.name)
 await dialog.getByLabel(/^Category parent/).selectOption(category.id)
 await dialog.getByLabel('Creation reason',{exact:true}).fill('Reviewed child identity')
 await dialog.getByRole('button',{name:'Create reference',exact:true}).click()
 await expect(dialog.getByRole('status')).toContainText('product changes are not saved yet')
 expect(body).toEqual({kind:'category',name:child.name,parentId:category.id,reason:'Reviewed child identity'})
 await dialog.getByRole('button',{name:'Use reference',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Edit Product'}).getByLabel('Canonical category',{exact:true})).toHaveValue(child.id)
 await expect(page.getByRole('dialog',{name:'Edit Product'}).getByLabel('Brand',{exact:true})).toHaveValue('')
})
