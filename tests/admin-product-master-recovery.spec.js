import {test,expect} from '@playwright/test'
const actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222'
const address=`k2-product-master-pending-v1:${actor}`
const product={sku:'DUMMY-REVIEW',name:'Synthetic recovery product',status:'Under Review',published:false,is_human_reviewed:false,updated_at:'2026-10-12T00:00:00Z',stock_available:6}
const receipt={ok:true,result:{sku:product.sku,status:'Under Review',updatedAt:'2026-10-12T00:00:01Z'}}
async function setup(page,write,{present=()=>true,session=()=>actor,role=()=> 'Admin'}={}) {
  await page.route('https://fixture.supabase.co/**',r=>r.abort())
  await page.context().addCookies([{name:'k2_admin_csrf',value:'synthetic-recovery-csrf',url:'http://localhost:5181'}])
  await page.route('**/api/admin/session',r=>r.fulfill({json:{ok:true,user:{userId:session(),role:role()}}}))
  await page.route('**/api/admin/products',r=>r.fulfill({json:{ok:true,products:present()?[product]:[]}}))
  await page.route('**/api/admin/lots*',r=>r.fulfill({json:{ok:true,data:{lots:[],derivedStock:{},complete:true}}}))
  await page.route('**/api/admin/product-master*',r=>r.request().method()==='POST'?write(r):r.fulfill({json:{ok:true,product,taxonomyReview:{status:'assigned'}}}))
  await page.goto('/tests/fixtures/admin-product-master-harness.html?surface=product-recovery')
}
async function save(page) {
  await page.getByRole('button',{name:'Edit',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'Edit Product'})
  await editor.getByRole('button',{name:/Pricing/}).click()
  await editor.getByRole('checkbox',{name:/I reviewed this product/}).check()
  await editor.getByLabel('Reason for this change').fill('Synthetic current product facts reviewed')
  await editor.getByRole('button',{name:'Save Changes'}).click()
  return editor
}
const review=page=>page.getByRole('button',{name:`Review pending product decision ${product.sku}`})
test('lost reply survives close reload missing product and refusal before exact retry confirms',async({page},info)=>{
  const writes=[];let present=true
  await setup(page,async r=>{
    writes.push({text:r.request().postData(),key:r.request().headers()['x-k2-idempotency-key'],actor:r.request().headers()['x-k2-actor-id']})
    if(writes.length===1){present=false;return r.abort()}
    if(writes.length===2)return r.fulfill({status:403,json:{error:{code:'PRODUCT_ADMIN_REQUIRED'}}})
    return r.fulfill({json:receipt})
  },{present:()=>present})
  const editor=await save(page)
  await expect(editor.getByRole('alert')).toBeVisible()
  await expect.poll(()=>page.evaluate(k=>localStorage.getItem(k),address)).not.toBeNull()
  const stored=await page.evaluate(k=>localStorage.getItem(k),address)
  expect(JSON.parse(stored).payloadText).toBe(writes[0].text)
  expect(stored).not.toMatch(/csrf|refresh_token|access_token/)
  await editor.getByRole('button',{name:'Close product editor'}).click()
  await page.reload();await review(page).click()
  const dialog=page.getByRole('dialog',{name:'Saved product decision'})
  await expect(dialog.getByText('Synthetic current product facts reviewed',{exact:true})).toBeVisible()
  await dialog.getByRole('button',{name:'Retry saved decision'}).click()
  await expect(dialog.getByRole('alert')).toContainText('saved request')
  expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBe(stored)
  for(const width of [375,1440]) {
    await page.setViewportSize({width,height:900})
    expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await page.screenshot({path:info.outputPath(`product-recovery-${width}.png`)})
  }
  await dialog.getByRole('button',{name:'Retry saved decision'}).click()
  await expect(dialog).toHaveCount(0)
  expect(writes).toHaveLength(3);expect(writes[1]).toEqual(writes[0]);expect(writes[2]).toEqual(writes[0]);expect(writes[0].actor).toBe(actor)
  expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBeNull()
})
test('queued retry cannot become a fresh save after another tab resolves it',async({page})=>{
  let writes=0;await setup(page,r=>{writes++;return r.abort()})
  const editor=await save(page);await expect(editor.getByRole('alert')).toBeVisible()
  await editor.getByRole('button',{name:'Close product editor'}).click();await review(page).click()
  await page.evaluate(async k=>{
    let entered;const ready=new Promise(r=>{entered=r})
    window.testProductLock=navigator.locks.request(k,()=>new Promise(r=>{window.releaseProductLock=r;entered()}));await ready
  },address)
  await page.getByRole('button',{name:'Retry saved decision',exact:true}).click()
  await expect(page.getByRole('button',{name:'Confirming saved decision…'})).toBeDisabled()
  await page.evaluate(k=>{localStorage.removeItem(k);window.releaseProductLock()},address)
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('changed in another tab')
  expect(writes).toBe(1)
})
test('late reply after actor switch preserves original request for original account',async({page})=>{
  let release;const held=new Promise(r=>{release=r})
  await setup(page,async r=>{await held;return r.fulfill({json:receipt})})
  await save(page);await expect.poll(()=>page.evaluate(k=>localStorage.getItem(k),address)).not.toBeNull()
  await page.getByRole('button',{name:'Switch synthetic staff'}).evaluate(b=>b.click())
  release();await expect(page.getByRole('region',{name:'Pending product decision'})).toHaveCount(0)
  expect(await page.evaluate(k=>localStorage.getItem(k),address)).not.toBeNull()
  await page.getByRole('button',{name:'Switch synthetic staff'}).click();await review(page).click()
})
test('changed cookie actor refuses retry before HTTP and retains request',async({page})=>{
  let current=actor,writes=0;await setup(page,r=>{writes++;return r.abort()},{session:()=>current})
  const editor=await save(page);await expect(editor.getByRole('alert')).toBeVisible()
  await editor.getByRole('button',{name:'Close product editor'}).click();current=other;await review(page).click()
  await page.getByRole('button',{name:'Retry saved decision',exact:true}).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('original account')
  expect(writes).toBe(1);expect(await page.evaluate(k=>localStorage.getItem(k),address)).not.toBeNull()
})
test('unusable storage or malformed saved command refuses before a fresh POST',async({page})=>{
  let writes=0;await setup(page,r=>{writes++;return r.abort()})
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('Synthetic storage unavailable')}})
  const editor=await save(page);await expect(editor.getByRole('alert')).toContainText('Nothing was sent');expect(writes).toBe(0)
  await page.reload();await page.evaluate(k=>{localStorage.setItem(k,'{');window.dispatchEvent(new StorageEvent('storage',{key:k}))},address)
  await expect(page.getByRole('region',{name:'Pending product decision'}).getByRole('alert')).toBeVisible()
  await save(page);expect(writes).toBe(0);expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBe('{')
})
test('invalid successful reply cannot erase pending decision',async({page})=>{
  await setup(page,r=>r.fulfill({json:{ok:true,result:{...receipt.result,sku:'WRONG-SKU'}}}))
  const editor=await save(page)
  await expect(editor.getByRole('alert')).toContainText('valid recorded decision')
  expect(await page.evaluate(k=>localStorage.getItem(k),address)).not.toBeNull()
})

test('two tabs cannot submit different new decisions under one actor lock',async({page,context})=>{
  let release;const held=new Promise(r=>{release=r});const writes=[]
  let allowSession;const sessionHeld=new Promise(r=>{allowSession=r})
  await setup(page,async r=>{writes.push(r.request().postData());await held;return r.abort()})
  await page.route('**/api/admin/session',async r=>{await sessionHeld;return r.fulfill({json:{ok:true,user:{userId:actor,role:'Admin'}}})})
  const second=await context.newPage()
  await setup(second,r=>{writes.push(r.request().postData());return r.abort()})
  await second.getByRole('button',{name:'Edit',exact:true}).click()
  const secondEditor=second.getByRole('dialog',{name:'Edit Product'})
  await secondEditor.getByLabel('Reason for this change').fill('A distinct decision from the second tab')
  await save(page)
  await secondEditor.getByRole('button',{name:'Save Changes'}).click()
  allowSession()
  await expect.poll(()=>page.evaluate(k=>localStorage.getItem(k),address)).not.toBeNull()
  release()
  await expect(page.getByRole('dialog',{name:'Edit Product'}).getByRole('alert')).toBeVisible()
  await expect(secondEditor.getByRole('alert')).toContainText('changed in another tab')
  await expect(secondEditor.getByRole('button',{name:'Review saved decision'})).toBeVisible()
  expect(writes).toHaveLength(1)
  expect(JSON.parse(await second.evaluate(k=>localStorage.getItem(k),address)).payloadText).toBe(writes[0])
})

test('current role downgrade refuses before retry and retains the request',async({page})=>{
  let role='Admin',writes=0;await setup(page,r=>{writes++;return r.abort()},{role:()=>role})
  const editor=await save(page);await expect(editor.getByRole('alert')).toBeVisible()
  await editor.getByRole('button',{name:'Close product editor'}).click();role='Staff';await review(page).click()
  await page.getByRole('button',{name:'Retry saved decision',exact:true}).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Admin or SuperAdmin')
  expect(writes).toBe(1);expect(await page.evaluate(k=>localStorage.getItem(k),address)).not.toBeNull()
})

test('changed session after a valid receipt cannot acknowledge the original request',async({page})=>{
  let current=actor
  await setup(page,r=>{current=other;return r.fulfill({json:receipt})},{session:()=>current})
  const editor=await save(page)
  await expect(editor.getByRole('alert')).toContainText('original account')
  expect(await page.evaluate(k=>localStorage.getItem(k),address)).not.toBeNull()
})

test('retained editor survives actor switch back while the old reply is still held',async({page})=>{
  let release;const held=new Promise(r=>{release=r});let writes=0
  await setup(page,async r=>{if(++writes===1)await held;return r.fulfill({json:receipt})})
  await page.goto('/tests/fixtures/admin-product-master-harness.html?surface=product-recovery&retain-editor')
  await save(page);await expect.poll(()=>page.evaluate(k=>localStorage.getItem(k),address)).not.toBeNull()
  await page.getByRole('button',{name:'Switch synthetic staff'}).evaluate(b=>b.click())
  await expect(review(page)).toHaveCount(0)
  await page.getByRole('button',{name:'Switch synthetic staff'}).click();await review(page).click()
  const dialog=page.getByRole('dialog',{name:'Saved product decision'})
  await expect(dialog.getByRole('button',{name:'Close',exact:true})).toBeEnabled()
  await dialog.getByRole('button',{name:'Retry saved decision'}).click()
  release()
  await expect(dialog).toHaveCount(0)
  expect(writes).toBe(2);expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBeNull()
})
