import {test,expect} from '@playwright/test'
const actor='11111111-1111-4111-8111-111111111111',key='33333333-3333-4333-8333-333333333333'
const address=`k2-website-assignment-pending-v1:${actor}`
const product={sku:'DUMMY-REVIEW',name:'Synthetic Website product',status:'Live',published:true,updated_at:'2026-10-12T00:00:00Z',stock_available:6}
const absent={id:null,sku:product.sku,assigned:false,updatedAt:null}
const saved={id:key,sku:product.sku,assigned:true,updatedAt:'2026-10-12T00:00:01Z'}
async function setup(page,write,{listing=()=>absent,session=()=>actor,role=()=> 'Admin',present=()=>true}={}) {
  await page.route('https://fixture.supabase.co/**',r=>r.abort())
  await page.context().addCookies([{name:'k2_admin_csrf',value:'synthetic-website-csrf',url:'http://localhost:5181'}])
  await page.route('**/api/admin/session',r=>r.fulfill({json:{ok:true,user:{userId:session(),role:role()}}}))
  await page.route('**/api/admin/products',r=>r.fulfill({json:{ok:true,products:present()?[product]:[]}}))
  await page.route('**/api/admin/lots*',r=>r.fulfill({json:{ok:true,data:{lots:[],derivedStock:{},complete:true}}}))
  await page.route('**/api/admin/channels*',r=>r.request().method()==='POST'?write(r):r.fulfill({json:{ok:true,listing:listing()}}))
  await page.goto('/tests/fixtures/admin-product-master-harness.html?surface=product-recovery&retain-editor')
}
const dialog=page=>page.getByRole('dialog',{name:'Website assignment',exact:true})
async function open(page) {await page.getByRole('button',{name:'Website assignment',exact:true}).click({timeout:5000});await expect(dialog(page).getByRole('checkbox')).toBeEnabled();return dialog(page)}
async function assign(page) {const d=await open(page);await d.getByRole('checkbox').check();await d.getByLabel('Reason for Website decision').fill('Synthetic explicit assignment');await d.getByRole('button',{name:'Save Website decision'}).click();return d}
test('separate reasoned Website assign and remove preserve current row version without Product Master writes',async({page},info)=>{
  let current=absent;const writes=[]
  await setup(page,r=>{const b=r.request().postDataJSON();writes.push(b);current={...saved,assigned:b.assigned,updatedAt:`2026-10-12T00:00:0${writes.length}Z`};return r.fulfill({json:{ok:true,result:{listing:current}}})},{listing:()=>current})
  await page.emulateMedia({reducedMotion:'reduce'})
  const d=await assign(page);await expect(d).toContainText('Original Website decision was recorded')
  await expect(d.getByRole('checkbox')).toBeChecked();expect(writes[0]).toEqual({action:'website_listing_set',sku:product.sku,assigned:true,expectedUpdatedAt:null,reason:'Synthetic explicit assignment'})
  await d.getByRole('checkbox').uncheck();await d.getByLabel('Reason for Website decision').fill('Synthetic explicit removal')
  await d.getByRole('checkbox').focus();await expect(d.getByRole('checkbox')).toBeFocused();await d.getByRole('checkbox').press('Space');await expect(d.getByRole('checkbox')).toBeChecked();await d.getByRole('checkbox').press('Space');await expect(d.getByRole('checkbox')).not.toBeChecked()
  expect(await d.getByRole('checkbox').evaluate(e=>e.closest('label').getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
  for(const width of [375,1440]) {await page.setViewportSize({width,height:900});expect(await d.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await page.screenshot({path:info.outputPath(`website-${width}.png`)})}
  await d.getByRole('button',{name:'Save Website decision'}).click();await expect.poll(()=>writes.length).toBe(2);await expect(d.getByRole('checkbox')).not.toBeChecked();await expect(d.getByRole('checkbox')).toBeEnabled()
  expect(writes[1].expectedUpdatedAt).toBe(saved.updatedAt);expect(writes[1].assigned).toBe(false)
  expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBeNull()
  await page.keyboard.press('Escape');await expect(d).toHaveCount(0);await expect(page.getByRole('button',{name:'Website assignment',exact:true})).toBeFocused()
})
test('lost Website reply survives reload missing product and Staff refusal; historical receipt is separate from current state',async({page})=>{
  const writes=[];let role='Admin',present=true
  await setup(page,r=>{writes.push({body:r.request().postData(),key:r.request().headers()['x-k2-idempotency-key'],actor:r.request().headers()['x-k2-actor-id'],csrf:r.request().headers()['x-k2-csrf']});return writes.length===1?r.abort():r.fulfill({json:{ok:true,result:{listing:saved}}})},{role:()=>role,present:()=>present,listing:()=>({...saved,assigned:false,updatedAt:'2026-10-12T00:00:09Z'})})
  const d=await assign(page);await expect(d.getByRole('alert')).toBeVisible();const raw=await page.evaluate(k=>localStorage.getItem(k),address)
  await d.getByRole('button',{name:'Close',exact:true}).click();present=false;await page.reload()
  await page.getByRole('button',{name:`Review pending Website decision ${product.sku}`}).click()
  role='Staff';await dialog(page).getByRole('button',{name:'Retry saved Website decision'}).click();await expect(dialog(page).getByRole('alert')).toContainText('Only an Admin or SuperAdmin');expect(writes).toHaveLength(1)
  expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBe(raw)
  role='Admin';await dialog(page).getByRole('button',{name:'Retry saved Website decision'}).click()
  await expect(dialog(page)).toContainText('Original Website decision was recorded');await expect(dialog(page)).toContainText('Current assignment: Not assigned')
  expect(writes[1]).toEqual(writes[0]);expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBeNull()
})
test('Website stale saved request releases only after explicit exact recheck and valid fresh read',async({page})=>{
  const writes=[];let current=absent
  await setup(page,r=>{writes.push({body:r.request().postData(),key:r.request().headers()['x-k2-idempotency-key']});if(writes.length===1)return r.abort();if(writes.length<4)return r.fulfill({status:409,json:{error:{code:'WEBSITE_LISTING_STALE'}}});current=saved;return r.fulfill({json:{ok:true,result:{listing:saved}}})},{listing:()=>current})
  const d=await assign(page);await expect(d.getByRole('alert')).toBeVisible();const raw=await page.evaluate(k=>localStorage.getItem(k),address)
  await d.getByRole('button',{name:'Retry saved Website decision'}).click();await expect(d.getByRole('button',{name:'Review latest assignment'})).toBeVisible();expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBe(raw)
  current={...saved,assigned:false,updatedAt:'2026-10-12T00:00:09Z'}
  await d.getByRole('button',{name:'Review latest assignment'}).click();await expect(d.getByLabel('Reason for Website decision')).toHaveValue('');await expect(d).toContainText('previous Website decision did not apply')
  expect(writes[1]).toEqual(writes[0]);expect(writes[2]).toEqual(writes[0]);expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBeNull()
  await d.getByRole('checkbox').check();await d.getByLabel('Reason for Website decision').fill('Fresh current assignment reviewed');await d.getByRole('button',{name:'Save Website decision'}).click();await expect.poll(()=>writes.length).toBe(4)
  expect(writes[3].key).not.toBe(writes[0].key);expect(JSON.parse(writes[3].body).expectedUpdatedAt).toBe('2026-10-12T00:00:09Z')
})
for(const scenario of ['unavailable','wrong SKU','missing version'])test(`Website reconciliation preserves evidence on ${scenario} read`,async({page})=>{
  let writes=0;await setup(page,r=>++writes===1?r.abort():r.fulfill({status:409,json:{error:{code:'WEBSITE_LISTING_STALE'}}}))
  const d=await assign(page);await expect(d.getByRole('alert')).toBeVisible();const raw=await page.evaluate(k=>localStorage.getItem(k),address)
  await d.getByRole('button',{name:'Retry saved Website decision'}).click();await expect(d.getByRole('button',{name:'Review latest assignment'})).toBeVisible()
  await page.route('**/api/admin/channels?*',r=>scenario==='unavailable'?r.fulfill({status:503,json:{error:{code:'WEBSITE_LISTING_UNAVAILABLE'}}}):r.fulfill({json:{ok:true,listing:scenario==='wrong SKU'?{...saved,sku:'OTHER'}:{...saved,updatedAt:null}}}))
  await d.getByRole('button',{name:'Review latest assignment'}).click();await expect(d.getByRole('alert')).toContainText('could not be verified');expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBe(raw)
})
test('malformed successful Website receipt cannot erase pending evidence',async({page})=>{
  await setup(page,r=>r.fulfill({json:{ok:true,result:{listing:{...saved,assigned:false}}}}));const d=await assign(page)
  await expect(d.getByRole('alert')).toContainText('valid recorded decision');expect(await page.evaluate(k=>localStorage.getItem(k),address)).not.toBeNull()
})
test('corrupt Website storage blocks fresh controls and remains untouched',async({page})=>{
  let writes=0;await setup(page,r=>{writes++;return r.abort()})
  await page.evaluate(k=>{localStorage.setItem(k,'{');window.dispatchEvent(new StorageEvent('storage',{key:k}))},address)
  await expect(page.getByRole('button',{name:'Website assignment',exact:true})).toBeDisabled();await expect(page.getByRole('region',{name:'Pending Website decision'}).getByRole('alert')).toBeVisible()
  expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBe('{');expect(writes).toBe(0)
})
test('Website actor switch away and back cannot acknowledge held original receipt',async({page})=>{
  let release,started;const held=new Promise(r=>release=r),sent=new Promise(r=>started=r)
  await setup(page,async r=>{started();await held;return r.fulfill({json:{ok:true,result:{listing:saved}}})})
  const action=assign(page);await sent;await page.getByRole('button',{name:'Switch synthetic staff'}).evaluate(b=>b.click());await expect(dialog(page)).toHaveCount(0);await page.getByRole('button',{name:'Switch synthetic staff'}).click();release();await action
  await expect(page.getByRole('button',{name:`Review pending Website decision ${product.sku}`})).toBeVisible();expect(await page.evaluate(k=>localStorage.getItem(k),address)).not.toBeNull()
})
test('Website two tabs cannot replace a held request with another decision',async({page,context})=>{
  let release,started,writes=0;const held=new Promise(r=>release=r),sent=new Promise(r=>started=r)
  await setup(page,async r=>{writes++;started();await held;return r.abort()});const other=await context.newPage();await setup(other,r=>{writes++;return r.abort()})
  const d=await open(page),second=await open(other);await d.getByRole('checkbox').check();await d.getByLabel('Reason for Website decision').fill('First explicit Website decision')
  const action=d.getByRole('button',{name:'Save Website decision'}).click();await sent;await action
  await expect(second.getByRole('button',{name:'Retry saved Website decision'})).toBeVisible();expect(writes).toBe(1);release();await expect(d.getByRole('alert')).toBeVisible();await other.close()
})
test('Website current account change during latest read retains request',async({page})=>{
  let writes=0,currentActor=actor
  await setup(page,r=>++writes===1?r.abort():r.fulfill({status:409,json:{error:{code:'WEBSITE_LISTING_STALE'}}}),{session:()=>currentActor})
  const d=await assign(page);await expect(d.getByRole('alert')).toBeVisible();const raw=await page.evaluate(k=>localStorage.getItem(k),address)
  await d.getByRole('button',{name:'Retry saved Website decision'}).click();await expect(d.getByRole('button',{name:'Review latest assignment'})).toBeVisible()
  await page.route('**/api/admin/channels?*',r=>{currentActor='22222222-2222-4222-8222-222222222222';return r.fulfill({json:{ok:true,listing:absent}})})
  await d.getByRole('button',{name:'Review latest assignment'}).click();await expect(d.getByRole('alert')).toContainText('account changed');expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBe(raw)
})
test('Website storage remove and restore invalidates held reconciliation',async({page})=>{
  let writes=0;await setup(page,r=>++writes===1?r.abort():r.fulfill({status:409,json:{error:{code:'WEBSITE_LISTING_STALE'}}}))
  const d=await assign(page);await expect(d.getByRole('alert')).toBeVisible();const raw=await page.evaluate(k=>localStorage.getItem(k),address)
  await d.getByRole('button',{name:'Retry saved Website decision'}).click();await expect(d.getByRole('button',{name:'Review latest assignment'})).toBeVisible()
  let release,started;const held=new Promise(r=>release=r),read=new Promise(r=>started=r)
  await page.route('**/api/admin/channels?*',async r=>{started();await held;return r.fulfill({json:{ok:true,listing:absent}})})
  await d.getByRole('button',{name:'Review latest assignment'}).click();await read
  await page.evaluate(({address,raw})=>{localStorage.removeItem(address);window.dispatchEvent(new StorageEvent('storage',{key:address}));localStorage.setItem(address,raw);window.dispatchEvent(new StorageEvent('storage',{key:address}))},{address,raw});release()
  await expect(d.getByRole('alert')).toContainText('saved request changed');expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBe(raw);await expect(d.getByRole('button',{name:'Review latest assignment'})).toHaveCount(0)
})
test('Website in-progress refusal never enables replacement',async({page})=>{
  let writes=0;await setup(page,r=>++writes===1?r.abort():r.fulfill({status:409,json:{error:{code:'COMMAND_IN_PROGRESS'}}}))
  const d=await assign(page);await expect(d.getByRole('alert')).toBeVisible();const raw=await page.evaluate(k=>localStorage.getItem(k),address)
  await d.getByRole('button',{name:'Retry saved Website decision'}).click();await expect(d.getByRole('alert')).toContainText('Keep and retry');await expect(d.getByRole('button',{name:'Review latest assignment'})).toHaveCount(0);expect(await page.evaluate(k=>localStorage.getItem(k),address)).toBe(raw)
})
test('delayed Website lock completion cannot leave stale handoff for a later saved decision',async({page})=>{
  let writes=0,current=absent
  await setup(page,r=>{writes++;if(writes===1)return r.abort();if(writes<4)return r.fulfill({status:409,json:{error:{code:'WEBSITE_LISTING_STALE'}}});current=saved;return r.fulfill({json:{ok:true,result:{listing:saved}}})},{listing:()=>current})
  const d=await assign(page);await expect(d.getByRole('alert')).toBeVisible();await d.getByRole('button',{name:'Retry saved Website decision'}).click();await expect(d.getByRole('button',{name:'Review latest assignment'})).toBeVisible()
  current={...saved,assigned:false,updatedAt:'2026-10-12T00:00:09Z'}
  await page.evaluate(()=>{const request=navigator.locks.request.bind(navigator.locks);navigator.locks.request=(name,callback)=>request(name,async lock=>{const result=await callback(lock);if(result?.nonApplied){window.websiteLockFinished=true;await new Promise(resolve=>{window.releaseWebsiteLock=resolve})}return result})})
  await d.getByRole('button',{name:'Review latest assignment'}).click();await expect.poll(()=>page.evaluate(()=>window.websiteLockFinished)).toBe(true)
  await expect.poll(()=>page.evaluate(k=>localStorage.getItem(k),address)).toBeNull();await page.waitForTimeout(100)
  await page.evaluate(()=>window.releaseWebsiteLock());await expect(d.getByLabel('Reason for Website decision')).toHaveValue('');await expect(d.getByRole('checkbox')).toBeEnabled()
  await d.getByRole('checkbox').check();await d.getByLabel('Reason for Website decision').fill('Explicit fresh current assignment');await d.getByRole('button',{name:'Save Website decision'}).click();await expect.poll(()=>writes).toBe(4)
  await expect(d).toContainText('Current assignment: Assigned');await expect(d.getByRole('checkbox')).toBeEnabled()
})
