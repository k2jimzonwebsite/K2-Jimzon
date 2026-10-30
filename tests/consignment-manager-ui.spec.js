import {test,expect} from '@playwright/test'
const actor='11111111-1111-4111-8111-111111111111',shipment='33333333-3333-4333-8333-333333333333',item='44444444-4444-4444-8444-444444444444',sku='K2-SKU-009999'
async function setup(page,{holdRefresh=false}={}){
 let count=0,productReads=0;const writes=[],creates=[];let release;const held=new Promise(r=>{release=r})
 const prefix='K2-'+new Date().toISOString().slice(0,7)
 const manifests=()=>[{id:shipment,manifest_code:prefix,status:'Packing_Italy',packing_revision:count,consignment_items:[{id:item,sku,box_code:'BOX-A',batch_code:'LOT-A',best_before_date:'2027-10-01',italy_packed_qty:count,manila_scanned_qty:0,expected_qty:0,packing_count_only:true}]}]
 await page.context().route('https://fixture.supabase.co/**',r=>r.abort())
 await page.context().route('**/api/admin/**',async r=>{
  const path=new URL(r.request().url()).pathname
  if(path==='/api/admin/session')return r.fulfill({json:{ok:true,user:{userId:actor,role:'Admin'}}})
  if(path==='/api/admin/products'){productReads++;return r.fulfill({json:{ok:true,products:[{sku,name:'Known packing item',is_human_reviewed:true,barcode:'8001234567890'}]}})}
  if(path==='/api/admin/consignments'){
   if(holdRefresh&&writes.length)await held
   return r.fulfill({json:{ok:true,data:{consignments:manifests()}}})
  }
  if(path==='/api/admin/consignments/create'){
   creates.push({body:r.request().postDataJSON(),key:r.request().headers()['x-k2-idempotency-key']})
   return r.fulfill({status:409,json:{error:{code:'MANIFEST_CODE_EXISTS'}}})
  }
  if(path==='/api/admin/consignments/packing'){
   const p=r.request().postDataJSON();writes.push(p);count+=p.delta
   return r.fulfill({json:{ok:true,result:{consignmentId:shipment,operation:p.operation,itemId:item,sku,packingRevision:count,status:'Packing_Italy',historicalReceipt:true}}})
  }
  return r.fulfill({json:{ok:true,data:{}}})
 })
 await page.goto('/tests/fixtures/consignment-manager-harness.html')
 await expect(page.getByRole('heading',{name:'Pack boxes in Italy',exact:true})).toBeVisible()
 await expect(page.getByRole('article').getByText('Known packing item',{exact:true})).toBeVisible()
 return {prefix,writes,creates,release,productReads:()=>productReads}
}
async function context(page){await page.getByLabel('Box label',{exact:true}).fill('BOX-A')}

test('Create manifest suggests an unused code and explains duplicate races inside the form',async({page})=>{
 const h=await setup(page);await page.getByRole('button',{name:'Create manifest',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Create consignment manifest'})
 await expect(dialog.getByLabel('Manifest code',{exact:true})).toHaveValue(h.prefix+'-001')
 await dialog.getByLabel('Manifest code',{exact:true}).fill(h.prefix)
 await dialog.getByRole('button',{name:'Save',exact:true}).click()
 await expect(dialog.getByRole('alert')).toContainText('already exists')
 expect(h.creates).toHaveLength(0)
 await dialog.getByLabel('Manifest code',{exact:true}).fill('OTHER-STAFF-RACE')
 await dialog.getByLabel('Flight or shipment reference',{exact:true}).fill('Actual reference entered by staff')
 await dialog.getByRole('button',{name:'Save',exact:true}).click()
 await expect(dialog.getByRole('alert')).toContainText('already exists')
 await expect(dialog.getByLabel('Flight or shipment reference',{exact:true})).toHaveValue('Actual reference entered by staff')
 expect(h.creates).toHaveLength(1)
 for(const width of [375,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:test.info().outputPath(`create-${width}.png`),fullPage:true})}
})

test('a burst sends every saved count before a slow canonical refresh finishes',async({page})=>{
 const h=await setup(page,{holdRefresh:true});await context(page)
 for(let i=0;i<5;i++)await page.getByRole('button',{name:'Add one '+sku,exact:true}).click()
 try{
  await expect.poll(()=>h.writes.length,{timeout:3000}).toBe(5)
  await expect(page.getByRole('button',{name:'Cancel this packing shipment',exact:true})).toBeDisabled()
  await expect(page.getByRole('button',{name:'Add one '+sku,exact:true})).toBeEnabled()
 }finally{h.release()}
 await expect(page.getByLabel('Packed quantity '+sku)).toHaveText('5')
})

test('confirmed known-SKU counts do not reload the entire product catalogue',async({page})=>{
 const h=await setup(page);await context(page);const before=h.productReads()
 await page.getByRole('button',{name:'Add one '+sku,exact:true}).click()
 await expect(page.getByLabel('Packed quantity '+sku)).toHaveText('1')
 expect(h.productReads()).toBe(before)
})


test('a delayed refresh cannot switch away from the latest staff selection',async({page})=>{
 const a={id:shipment,manifest_code:'MANIFEST-A',status:'Packing_Italy',consignment_items:[]}
 const b={id:'55555555-5555-4555-8555-555555555555',manifest_code:'MANIFEST-B',status:'Packing_Italy',consignment_items:[]}
 let reads=0,release,held=false,finished=false,holdNext=false;const gate=new Promise(resolve=>{release=resolve})
 await page.context().route('https://fixture.supabase.co/**',r=>r.abort())
 await page.context().route('**/api/admin/**',async r=>{
  const path=new URL(r.request().url()).pathname
  if(path==='/api/admin/session')return r.fulfill({json:{ok:true,user:{userId:actor,role:'Admin'}}})
  if(path==='/api/admin/products')return r.fulfill({json:{ok:true,products:[]}})
  if(path==='/api/admin/consignments'){
   reads++;if(holdNext){holdNext=false;held=true;await gate;await r.fulfill({json:{ok:true,data:{consignments:[a,b]}}});finished=true;return}
   return r.fulfill({json:{ok:true,data:{consignments:[a,b]}}})
  }
  return r.fulfill({json:{ok:true,data:{}}})
 })
 await page.goto('/tests/fixtures/consignment-manager-harness.html')
 const selector=page.getByLabel('Current manifest');await expect(selector).toHaveValue(a.id)
 await expect.poll(()=>reads).toBeGreaterThanOrEqual(2)
 holdNext=true;await selector.selectOption(b.id);await expect.poll(()=>held).toBe(true)
 await selector.selectOption(a.id);await expect.poll(()=>reads).toBeGreaterThanOrEqual(4);release()
 await expect.poll(()=>finished).toBe(true);await page.waitForTimeout(300)
 await expect(selector).toHaveValue(a.id)
 await expect(page.getByText('MANIFEST-A',{exact:true})).toBeVisible()
})

test('creating a manifest opens the saved manifest after refresh',async({page})=>{
 const a={id:shipment,manifest_code:'MANIFEST-A',status:'Packing_Italy',consignment_items:[]}
 const b={id:'55555555-5555-4555-8555-555555555555',manifest_code:'NEW-MANIFEST',status:'Packing_Italy',consignment_items:[]}
 let created=false,reads=0,release,held=false,finished=false;const gate=new Promise(resolve=>{release=resolve})
 await page.context().route('https://fixture.supabase.co/**',r=>r.abort())
 await page.context().route('**/api/admin/**',async r=>{
  const path=new URL(r.request().url()).pathname
  if(path==='/api/admin/session')return r.fulfill({json:{ok:true,user:{userId:actor,role:'Admin'}}})
  if(path==='/api/admin/products')return r.fulfill({json:{ok:true,products:[]}})
  if(path==='/api/admin/consignments'){reads++;if(created&&!held){held=true;await gate;await r.fulfill({json:{ok:true,data:{consignments:[b,a]}}});finished=true;return}return r.fulfill({json:{ok:true,data:{consignments:created?[b,a]:[a]}}})}
  if(path==='/api/admin/consignments/create'){created=true;return r.fulfill({json:{ok:true,result:{consignmentId:b.id}}})}
  return r.fulfill({json:{ok:true,data:{}}})
 })
 await page.goto('/tests/fixtures/consignment-manager-harness.html')
 await expect(page.getByLabel('Current manifest')).toHaveValue(a.id)
 await page.getByRole('button',{name:'Create manifest'}).click()
 await page.getByLabel('Manifest code').fill('NEW-MANIFEST')
 await expect.poll(()=>reads).toBeGreaterThanOrEqual(2)
 await page.getByRole('button',{name:'Save',exact:true}).click()
 await expect.poll(()=>held).toBe(true);await expect(page.getByLabel('Current manifest')).toHaveValue(b.id)
 release();await expect.poll(()=>finished).toBe(true);await page.waitForTimeout(300)
 await expect(page.getByLabel('Current manifest')).toHaveValue(b.id)
 await expect(page.getByText('NEW-MANIFEST',{exact:true})).toBeVisible()
})

test('a superseded count refresh waits for the newer canonical read before dispatch',async({page})=>{
 test.setTimeout(45000)
 let count=0,reads=0,initialReads=0,releaseFirst,releaseSecond,firstHeld=false,secondHeld=false,firstFinished=false
 const first=new Promise(r=>{releaseFirst=r}),second=new Promise(r=>{releaseSecond=r})
 const record=()=>({id:shipment,manifest_code:'A',status:'Packing_Italy',packing_revision:count,consignment_items:[{id:item,sku,box_code:'BOX-A',batch_code:'LOT-A',best_before_date:'2027-10-01',italy_packed_qty:count,manila_scanned_qty:0,expected_qty:0,packing_count_only:true}]})
 await page.context().route('https://fixture.supabase.co/**',r=>r.abort())
 await page.context().route('**/api/admin/**',async r=>{
  const path=new URL(r.request().url()).pathname
  if(path==='/api/admin/session')return r.fulfill({json:{ok:true,user:{userId:actor,role:'Admin'}}})
  if(path==='/api/admin/products')return r.fulfill({json:{ok:true,products:[{sku,name:'Known',is_human_reviewed:true}]}})
  if(path==='/api/admin/consignments'){
   if(!count)initialReads++;else {reads++;if(reads===1){firstHeld=true;await first;firstFinished=true}else if(reads===2){secondHeld=true;await second}}
   return r.fulfill({json:{ok:true,data:{consignments:[record()]}}})
  }
  if(path==='/api/admin/consignments/packing'){count++;return r.fulfill({json:{ok:true,result:{consignmentId:shipment,operation:'count',itemId:item,sku,packingRevision:count}}})}
  return r.fulfill({json:{ok:true,data:{}}})
 })
 await page.goto('/tests/fixtures/consignment-manager-harness.html');await context(page)
 await expect.poll(()=>initialReads).toBeGreaterThanOrEqual(2);await page.waitForTimeout(10000)
 await page.getByRole('button',{name:'Add one '+sku}).click()
 await expect.poll(()=>firstHeld).toBe(true)
 await expect(page.getByRole('status').filter({hasText:'Updating confirmed totals'})).toBeVisible()
 try{
  await expect.poll(()=>secondHeld,{timeout:20000}).toBe(true)
  releaseFirst();await expect.poll(()=>firstFinished).toBe(true);await page.waitForTimeout(2000)
  await expect(page.getByRole('button',{name:'Cancel this packing shipment'})).toBeDisabled()
 }finally{releaseFirst();releaseSecond()}
 await expect(page.getByLabel('Packed quantity '+sku)).toHaveText('1')
})

test('failed confirmed-count refresh closes stale packing until staff retry',async({page})=>{
 let count=0,fail=false
 const record=()=>({id:shipment,manifest_code:'A',status:'Packing_Italy',packing_revision:count,consignment_items:[{id:item,sku,box_code:'BOX-A',batch_code:'LOT-A',best_before_date:'2027-10-01',italy_packed_qty:count,manila_scanned_qty:0,expected_qty:0,packing_count_only:true}]})
 await page.context().route('https://fixture.supabase.co/**',r=>r.abort())
 await page.context().route('**/api/admin/**',async r=>{
  const path=new URL(r.request().url()).pathname
  if(path==='/api/admin/session')return r.fulfill({json:{ok:true,user:{userId:actor,role:'Admin'}}})
  if(path==='/api/admin/products')return r.fulfill({json:{ok:true,products:[{sku,name:'Known',is_human_reviewed:true}]}})
  if(path==='/api/admin/consignments')return fail?r.fulfill({status:503,json:{error:{code:'UNAVAILABLE'}}}):r.fulfill({json:{ok:true,data:{consignments:[record()]}}})
  if(path==='/api/admin/consignments/packing'){count++;fail=true;return r.fulfill({json:{ok:true,result:{consignmentId:shipment,operation:'count',itemId:item,sku,packingRevision:count}}})}
  return r.fulfill({json:{ok:true,data:{}}})
 })
 await page.goto('/tests/fixtures/consignment-manager-harness.html');await context(page)
 await page.getByRole('button',{name:'Add one '+sku}).click()
 await expect(page.getByRole('alert')).toBeVisible()
 await expect(page.getByRole('heading',{name:'Pack boxes in Italy'})).toHaveCount(0)
 await expect(page.getByLabel('Current manifest')).toBeDisabled()
 for(const width of [320,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:test.info().outputPath('refresh-error-'+width+'.png'),fullPage:true})}
 fail=false;await page.getByRole('button',{name:'Retry loading consignments'}).click()
 await expect(page.getByLabel('Packed quantity '+sku)).toHaveText('1')
})
