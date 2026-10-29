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
async function context(page){await page.getByLabel('Physical box code',{exact:true}).fill('BOX-A');await page.getByLabel('Batch / lot code',{exact:true}).fill('LOT-A');await page.getByLabel('Best-before date',{exact:true}).fill('2027-10-01')}

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
