import { test, expect } from '@playwright/test'
const actor='11111111-1111-4111-8111-111111111111', key='k2-product-master-pending-v1:'+actor
const group='borella-prosciutto', skus=['K2-SKU-001020','K2-SKU-001019','K2-SKU-001021']
const preview={groupId:group,canonicalSku:skus[0],stateHash:'a'.repeat(64),blocker:null,recorded:false,
 products:skus.map((sku,i)=>({sku,name:'Synthetic Borella Prosciutto',size:'250 g',packageType:'bag',status:'Live',quantity:[42,0,22][i],available:[42,0,22][i]})),
 lots:[{id:'33333333-3333-4333-8333-333333333333',sku:skus[2],box_code:'SYNTHETIC-BOX',quantity:22,expiry_date:'2027-10-25'},
 {id:'33333333-3333-4333-8333-333333333334',sku:skus[0],box_code:'SYNTHETIC-BOX-2',quantity:42,expiry_date:'2027-10-25'}]}
async function setup(page,write,read=()=>preview){
 await page.route('https://fixture.supabase.co/**',r=>r.abort())
 await page.context().addCookies([{name:'k2_admin_csrf',value:'synthetic-merge-csrf',url:'http://localhost:5181'}])
 await page.route('**/api/admin/**',r=>{
  const u=new URL(r.request().url())
  if(u.pathname.endsWith('/session'))return r.fulfill({json:{ok:true,user:{userId:actor,role:'Admin'}}})
  if(u.pathname.endsWith('/product-master'))return r.request().method()==='POST'?write(r):r.fulfill({json:{ok:true,preview:read()}})
  return r.fulfill({json:{ok:true,products:[],lots:[],batches:[],stock:[]}})
 })
 await page.goto('/tests/fixtures/admin-product-master-harness.html?surface=product-recovery')
 await page.getByRole('button',{name:'Combine approved duplicates',exact:true}).click()
 await page.getByLabel('Duplicate group').selectOption(group)
 await expect(page.getByText('Keep K2-SKU-001020',{exact:true})).toBeVisible()
}
test('merge preview and exact lost-reply retry survive reload at mobile and desktop widths',async({page})=>{
 const writes=[]
 await setup(page,r=>{
  writes.push({text:r.request().postData(),key:r.request().headers()['x-k2-idempotency-key']})
  if(writes.length===1)return r.abort()
  return r.fulfill({json:{ok:true,result:{groupId:group,canonicalSku:skus[0],sourceSkus:skus.slice(1),quantity:64,available:64,lotCount:2,requestId:writes[0].key}}})
 })
 const save=page.getByRole('button',{name:'Combine these duplicates',exact:true})
 await expect(save).toBeDisabled()
 for(const width of [375,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.tools/sku-merge-completion/merge-${width}.png`,fullPage:true})}
 await page.getByLabel('I reviewed the retained listing and all lots').check();await save.click()
 await expect(page.getByRole('button',{name:'Retry saved merge'})).toBeVisible()
 const held=await page.evaluate(k=>localStorage.getItem(k),key);expect(held).toContain('expectedStateHash')
 await page.reload();await page.getByRole('button',{name:/Review pending product decision/}).click()
 await page.getByRole('button',{name:'Retry saved merge'}).click()
 await expect(page.getByText('Duplicate merge recorded. Refreshing inventory…')).toBeVisible()
 expect(writes).toHaveLength(2);expect(writes[1]).toEqual(writes[0]);expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull()
})
test('stale saved merge reconciles against group preview before a new decision',async({page})=>{
 let writes=0,latest=false
 await setup(page,r=>{
  writes++
  if(writes===1)return r.abort()
  latest=true;return r.fulfill({status:409,json:{error:{code:'PRODUCT_VERSION_CONFLICT'}}})
 },()=>({...preview,stateHash:(latest?'b':'a').repeat(64)}))
 await page.getByLabel('I reviewed the retained listing and all lots').check()
 await page.getByRole('button',{name:'Combine these duplicates',exact:true}).click()
 await page.getByRole('button',{name:'Retry saved merge'}).click()
 await page.getByRole('button',{name:'Review latest merge preview'}).click()
 await expect(page.getByLabel('I reviewed the retained listing and all lots')).not.toBeChecked()
 await expect(page.getByRole('alert')).toContainText('previous merge did not apply')
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();expect(writes).toBe(3)
})
test('dependency refusal disables confirmation without a write',async({page})=>{
 let writes=0
 await setup(page,r=>{writes++;return r.abort()},()=>({...preview,blocker:'ACTIVE_RESERVATION'}))
 await expect(page.getByRole('alert')).toContainText('reservation')
 await page.getByLabel('I reviewed the retained listing and all lots').check()
 await expect(page.getByRole('button',{name:'Combine these duplicates',exact:true})).toBeDisabled();expect(writes).toBe(0)
})
