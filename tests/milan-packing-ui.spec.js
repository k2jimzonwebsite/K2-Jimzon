import {test,expect} from '@playwright/test'
const actor='11111111-1111-4111-8111-111111111111',shipment='33333333-3333-4333-8333-333333333333',item='44444444-4444-4444-8444-444444444444'
async function setup(page,{pause=false,block=false}={}){
 let count=0,revision=0,removed=false,cancelled=false,hold=pause;const commands=[],receipts=new Map();let unblock
 const gate=block?new Promise(resolve=>{unblock=resolve}):Promise.resolve()
 const manifest=()=>({id:shipment,manifest_code:'SYNTHETIC-IT-BOX',status:'Packing_Italy',packing_revision:revision,packing_cancelled_at:cancelled?'2026-10-29':null,consignment_items:count||removed?[{
 id:item,sku:'K2-SKU-009999',box_code:'BOX-A',batch_code:'LOT-A',best_before_date:'2027-10-01',italy_packed_qty:removed?0:count,manila_scanned_qty:0,expected_qty:0,packing_count_only:true,packing_removed_at:removed?'2026-10-29':null}]:[]})
 await page.context().addCookies([{name:'k2_admin_csrf',value:'synthetic',url:'http://localhost:5181'}])
 await page.context().route('https://fixture.supabase.co/**',r=>r.abort())
 await page.context().route('**/api/admin/session',r=>r.fulfill({json:{ok:true,user:{userId:actor,role:'Admin'}}}))
 await page.context().route('**/api/admin/consignments',r=>r.fulfill({json:{ok:true,data:{consignments:[manifest()]}}}))
 await page.context().route('**/api/admin/consignments/packing',async r=>{
  const p=r.request().postDataJSON(),key=r.request().headers()['x-k2-idempotency-key'];commands.push({p,key})
  await gate
  if(hold)return r.abort()
  if(!receipts.has(key)){
   if(p.operation==='count')count+=p.delta
   if(p.operation==='remove')removed=true
   if(p.operation==='restore')removed=false
   if(p.operation==='cancel')cancelled=true
   if(p.operation==='reopen')cancelled=false
   const lineOperation=['count','remove','restore'].includes(p.operation)
   revision++;receipts.set(key,{consignmentId:shipment,operation:p.operation,itemId:lineOperation?item:null,sku:lineOperation?'K2-SKU-009999':null,packingRevision:revision,status:'Packing_Italy',historicalReceipt:true})
  }
  await r.fulfill({json:{ok:true,result:receipts.get(key)}})
 })
 await page.goto('/tests/fixtures/milan-packing-harness.html')
 return {commands,release:()=>{hold=false;unblock?.()},count:()=>count}
}
async function context(page){await page.getByLabel('Physical box code',{exact:true}).fill('BOX-A');await page.getByLabel('Batch / lot code',{exact:true}).fill('LOT-A');await page.getByLabel('Best-before date',{exact:true}).fill('2027-10-01')}
async function scan(page,code='8001234567890'){
 const input=page.getByLabel('Barcode or SKU',{exact:true})
 // Hardware scanners emit characters then Enter; keep the burst independent
 // of server acknowledgement and avoid replace-all text injection.
 await input.focus();await input.pressSequentially(code,{delay:0});await input.press('Enter')
}
test('packing accepts rapid identical scans and offers manual ±1 without catalog completion',async({page})=>{
 const h=await setup(page);await context(page)
 await scan(page);await scan(page);await scan(page)
 await expect(page.getByLabel('Packed quantity K2-SKU-009999')).toHaveText('3')
 await expect(page.getByText('Details needed',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Add one K2-SKU-009999',exact:true}).click()
 await expect(page.getByLabel('Packed quantity K2-SKU-009999')).toHaveText('4')
 await page.getByRole('button',{name:'Remove one K2-SKU-009999',exact:true}).click()
 await expect(page.getByLabel('Packed quantity K2-SKU-009999')).toHaveText('3')
 expect(new Set(h.commands.map(c=>c.key)).size).toBe(5)
})

test('native scan submission reads and clears the physical input before another render',async({page})=>{
 await setup(page);await context(page)
 const remaining=await page.getByLabel('Barcode or SKU',{exact:true}).evaluate(input=>{
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'8001234567890')
  input.dispatchEvent(new Event('input',{bubbles:true}))
  input.form.requestSubmit()
  return input.value
 })
 expect(remaining).toBe('')
 await expect(page.getByLabel('Packed quantity K2-SKU-009999')).toHaveText('1')
})

test('another Enter scan is accepted while the first saved append is completing',async({page})=>{
 await setup(page);await context(page)
 await page.evaluate(actor=>{
  const request=navigator.locks.request.bind(navigator.locks)
  let delayed=false
  navigator.locks.request=(name,callback)=>request(name,async lock=>{
   const result=await callback(lock)
   if(name==='k2:packing:pending:v1:'+actor&&!delayed){
    delayed=true;window.appendHeld=true
    await new Promise(resolve=>{window.releaseAppend=resolve})
   }
   return result
  })
 },actor)
 await scan(page)
 await expect.poll(()=>page.evaluate(()=>window.appendHeld)).toBe(true)
 await scan(page)
 await page.evaluate(()=>window.releaseAppend())
 await expect(page.getByLabel('Packed quantity K2-SKU-009999')).toHaveText('2')
})
test('another tab cannot dismiss a refused request while its exact retry is in flight',async({page})=>{
 await setup(page)
 let calls=0,release;const gate=new Promise(resolve=>{release=resolve})
 await page.context().route('**/api/admin/consignments/packing',async r=>{
  calls++;if(calls===1)return r.fulfill({status:409,json:{error:{code:'PACKING_COUNT_INVALID'}}})
  await gate
  await r.fulfill({json:{ok:true,result:{consignmentId:shipment,operation:'count',itemId:item,sku:'K2-SKU-009999',packingRevision:1,status:'Packing_Italy'}}})
 })
 await context(page);await scan(page)
 await expect(page.getByRole('button',{name:'Dismiss refused attempt'})).toBeVisible()
 const other=await page.context().newPage();await other.goto('/tests/fixtures/milan-packing-harness.html')
 await other.getByRole('button',{name:'Resume saved packing'}).click()
 await expect.poll(()=>calls).toBe(2)
 await page.getByRole('button',{name:'Dismiss refused attempt'}).click()
 expect(await page.evaluate(a=>JSON.parse(localStorage.getItem('k2:packing:pending:v1:'+a)).entries.length,actor)).toBe(1)
 release()
 await expect.poll(()=>page.evaluate(a=>JSON.parse(localStorage.getItem('k2:packing:pending:v1:'+a)).entries.length,actor)).toBe(0)
 await other.close()
})
test('unsent accepted burst survives reload and retries original keys',async({page})=>{
 const h=await setup(page,{block:true});await context(page)
 for(let i=0;i<5;i++)await scan(page)
 await expect(page.getByRole('status')).toContainText('5 saved requests')
 const stored=await page.evaluate(a=>localStorage.getItem('k2:packing:pending:v1:'+a),actor)
 await page.reload();h.release()
 await page.getByRole('button',{name:'Resume saved packing'}).click()
 await expect(page.getByLabel('Packed quantity K2-SKU-009999')).toHaveText('5')
 expect(h.commands[1].key).toBe(h.commands[0].key)
 expect(new Set(h.commands.map(c=>c.key)).size).toBe(5)
 expect(JSON.parse(stored).entries[0].payloadText).toBe(JSON.stringify(h.commands[0].p))
})
test('a changed staff identity cannot submit the original saved queue',async({page})=>{
 const h=await setup(page,{pause:true});await context(page);await scan(page)
 await expect(page.getByRole('button',{name:'Resume saved packing'})).toBeVisible()
 const before=h.commands.length
 await page.getByRole('button',{name:'Switch staff',exact:true}).click()
 await context(page);await scan(page)
 await expect(page.getByRole('alert')).toContainText('original staff account')
 expect(h.commands.length).toBe(before)
 const original=await page.evaluate(a=>JSON.parse(localStorage.getItem('k2:packing:pending:v1:'+a)).entries.length,actor)
 expect(original).toBe(1)
})
test('packing layout, focus and targets remain usable at phone and desktop widths',async({page})=>{
 await setup(page);await context(page);await scan(page)
 await expect(page.getByLabel('Packed quantity K2-SKU-009999')).toHaveText('1')
 await page.emulateMedia({reducedMotion:'reduce'})
 for(const width of [375,1440]){
  await page.setViewportSize({width,height:900})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
  for(const btn of await page.getByRole('button',{name:/^(Add one|Remove one)/}).all())expect((await btn.boundingBox()).height).toBeGreaterThanOrEqual(44)
  await page.screenshot({path:`docs/acceptance/milan-packing-discovery-20261029/packing-${width}.png`,fullPage:true})
 }
})
test('remove preserves a restore action; cancellation can be reopened before dispatch',async({page})=>{
 await setup(page);await context(page);await scan(page)
 await expect(page.getByLabel('Packed quantity K2-SKU-009999')).toHaveText('1')
 await page.getByRole('button',{name:'Remove packing line K2-SKU-009999'}).click()
 await page.getByLabel('Reason for this packing change').fill('Wrong item selected')
 await page.getByRole('button',{name:'Confirm packing change'}).click()
 await page.getByText('Removed packing lines (1)',{exact:true}).click()
 await page.getByRole('button',{name:'Restore packing line K2-SKU-009999'}).click()
 await page.getByLabel('Reason for this packing change').fill('Restore correct item')
 await page.getByRole('button',{name:'Confirm packing change'}).click()
 await expect(page.getByLabel('Packed quantity K2-SKU-009999')).toHaveText('1')
 await page.getByRole('button',{name:'Cancel this packing shipment'}).click()
 await page.getByLabel('Reason for this packing change').fill('Wrong shipment')
 await page.getByRole('button',{name:'Confirm packing change'}).click()
 await expect(page.getByRole('button',{name:'Reopen packing'})).toBeVisible()
})
