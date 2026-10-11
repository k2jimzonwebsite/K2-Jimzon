import { test, expect } from '@playwright/test'
async function setup(page) {
  const taxonomy=[]
  await page.route('https://fixture.supabase.co/**', route => {
    if (/\/rest\/v1\/(brands|categories)(\?|$)/.test(route.request().url())) taxonomy.push({method:route.request().method(),url:route.request().url()})
    return route.fulfill({json:[]})
  })
  await page.route('**/api/admin/**', route => route.fulfill({status:401,json:{error:{code:'ADMIN_SESSION_REQUIRED'}}}))
  await page.route('**/api/admin/products', route => route.fulfill({json:{ok:true,products:[
    {sku:'synthetic-unassigned',name:'Synthetic unassigned',brand_id:null,category_id:null,status:'Draft',stock_available:0},
    {sku:'synthetic-assigned',name:'Synthetic assigned',brand_id:'22222222-2222-4222-8222-222222222222',category_id:'33333333-3333-4333-8333-333333333333',status:'Draft',stock_available:0},
  ]}}))
  return taxonomy
}
test('secure Sheet taxonomy is readable with protected Grid Edit guidance and no anonymous taxonomy access',async({page},testInfo)=>{
  const taxonomy=await setup(page)
  await page.goto('/tests/fixtures/admin-sheet-reference-harness.html')
  const unassigned=page.getByRole('row').filter({has:page.getByRole('textbox',{name:'SKU for synthetic-unassigned',exact:true})})
  const assigned=page.getByRole('row').filter({has:page.getByRole('textbox',{name:'SKU for synthetic-assigned',exact:true})})
  await expect(unassigned.getByText('Not assigned',{exact:true})).toHaveCount(2)
  await expect(assigned.getByText('Assigned',{exact:true})).toHaveCount(2)
  await expect(unassigned.getByText('Grid → Edit',{exact:true})).toHaveCount(2)
  await expect(assigned.getByText('Grid → Edit',{exact:true})).toHaveCount(2)
  await expect(unassigned.getByRole('cell').filter({hasText:'Grid → Edit'}).getByRole('combobox')).toHaveCount(0)
  await expect(assigned.getByRole('cell').filter({hasText:'Grid → Edit'}).getByRole('combobox')).toHaveCount(0)
  expect(taxonomy).toEqual([])
  for(const width of [375,1440]){
    await page.setViewportSize({width,height:900})
    const guidance=page.getByText('Brands and categories are read-only here. Switch to Grid, then Edit a product to review or create references.',{exact:true})
    await expect(guidance).toBeVisible()
    expect(await guidance.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1)
    await unassigned.getByText('Not assigned',{exact:true}).first().scrollIntoViewIfNeeded()
    await page.screenshot({path:testInfo.outputPath(`secure-sheet-${width}.png`),fullPage:true})
  }
})
test('secure reference hook refuses explicit reload and create calls without taxonomy transport',async({page})=>{
  const taxonomy=await setup(page)
  await page.goto('/tests/fixtures/admin-sheet-reference-harness.html?probe')
  await page.getByRole('button',{name:'Probe protected taxonomy callers'}).click()
  await expect(page.locator('output')).toContainText('Grid')
  const results=JSON.parse(await page.locator('output').textContent())
  expect(results).toHaveLength(2);expect(results.every(result=>result.ok===false)).toBe(true)
  expect(taxonomy).toEqual([])
})
