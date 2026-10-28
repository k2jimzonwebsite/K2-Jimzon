import { expect, test } from '@playwright/test'

// Supplied by scripts/test-customer-account-ui.mjs, which also pins the
// VITE_SUPABASE_URL this key is derived from. The literal is only a
// fallback for running this spec directly against an already-running server.
const AUTH_STORAGE_KEY = process.env.K2_ACCOUNT_UI_AUTH_STORAGE_KEY || 'sb-fixture-auth-token'

function fakeJwt(userId = '10000000-0000-4000-8000-000000000001') {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    aud: 'authenticated', sub: userId,
    role: 'authenticated', aal: 'aal1', exp: Math.floor(Date.now() / 1000) + 3600,
    email: 'buyer@example.com',
  })}.c2lnbmF0dXJl`
}

test.beforeEach(async ({ page }) => {
  // No account fixture may make an external provider request. The fabricated
  // origin is needed only so supabase-js constructs its local Auth client.
  await page.route('https://fixture.supabase.co/**', route => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Fixture provider calls are disabled.' }),
  }))
})

const expressActor = '10000000-0000-4000-8000-000000000001'
const expressReference = 'WEB-ACCOUNTEXPRESS01'
const expressStorageKey = `k2-express-acceptance-v1:${expressReference}`

for (const width of [375, 1440]) test(`disabled account closure keeps settings available at ${width}`, async ({ page }) => {
  test.skip(process.env.VITE_CUSTOMER_PRIVACY_ENABLED !== 'false', 'Runs against the disabled production capability.')
  await page.setViewportSize({ width, height: 900 })
  await seedExpressAccount(page, fakeJwt(expressActor))
  await page.addInitScript(({ owner }) => localStorage.setItem(`k2-privacy-request-v1:${owner}`, JSON.stringify({ owner, requestId: '20000000-0000-4000-8000-000000000001', receiptToken: 'a'.repeat(43) })), { owner: expressActor })
  await page.route('**/api/storefront/account/history', route => route.fulfill({ json: accountExpressHistory() }))
  await page.route('**/api/storefront/account/settings', route => route.fulfill({ json: { ok: true, settings: { displayName: 'Elena Villanueva', deliveryAddress: '', notifyInApp: true, addressBook: { initialized: true, addresses: [], defaultAddressId: null, revision: 0 } }, notifications: [] } }))
  await page.route('**/api/storefront/account/portfolio', route => route.fulfill({ json: { ok: true, portfolio: purchasePortfolio } }))
  let privacyRequests = 0
  await page.route('**/api/storefront/account/privacy', route => { privacyRequests++; return route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND' } } }) })
  await page.goto('/account')
  await expect(page.getByRole('region', { name: 'Delivery addresses', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save settings', exact: true })).toBeVisible()
  await expect(page.getByText('For account closure or a privacy request, contact K2.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send closure verification code', exact: true })).toHaveCount(0)
  expect(privacyRequests).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  const declineAnalytics = page.getByRole('button', { name: 'Decline', exact: true })
  if (await declineAnalytics.count()) await declineAnalytics.click()
  await page.getByRole('heading', { name: 'Privacy', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: test.info().outputPath(`profile-release-${width}.png`), fullPage: true })
})
function accountUser(id) {
  return { id, aud: 'authenticated', role: 'authenticated', email: 'buyer@example.com',
    email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
}
async function captureSignOutNotice(page, name) {
  const decline = page.getByRole('button', { name: 'Decline', exact: true })
  if (await decline.isVisible()) await decline.click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const theme of ['light', 'dark']) {
    const toggle = page.getByRole('button', { name: theme === 'light' ? 'Switch to light mode' : 'Switch to dark mode' })
    if (await toggle.isVisible()) await toggle.click()
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      const notice = page.getByRole('alert').filter({ hasText: /Sign-out could not/ })
      await notice.scrollIntoViewIfNeeded()
      for (const button of await notice.getByRole('button').all()) {
        const bounds = await button.boundingBox()
        expect(bounds.height).toBeGreaterThanOrEqual(44)
      }
      await page.screenshot({ path: `docs/acceptance/account-signout-20261027/${name}-${theme}-${width}.png`, animations: 'disabled' })
    }
  }
}
const purchasePortfolio = { summary: { orderCount: 21, fulfilledItems: 42, verifiedAmount: 200, refundedAmount: 10, unknownPaymentCount: 1, currency: 'PHP' },
 orders: [{ public_reference: 'WEB-PURCHASE-1', status: 'fulfilled', payment_status: 'verified', shipping_quote_status: 'waived', total_amount: 10,
 created_at: '2026-10-01T00:00:00Z', payment: { amount: 10, currency: 'PHP', method: 'GCash', reference: 'OWN-REFERENCE' },
 items: [{ sku: 'SYNTHETIC', name: 'Synthetic pantry item', quantity: 2, unitPrice: 5, lineTotal: 10 }], proofs: [{ id: '50000000-0000-4000-8000-000000000001', mediaType: 'application/pdf' }] }], nextCursor: null }

const addressPlaces = [
 {code:'1300000000',name:'National Capital Region',level:'Reg'},
 {code:'1374000000',name:'Second District',level:'Group'},
 {code:'1374030000',name:'Pasig City',level:'City'},
 {code:'1374030010',name:'San Antonio',level:'Bgy'},
].map(place=>({...place,sourceVersion:'psgc-2026-06-30'}))
const deliveryAddressFixture = (patch={}) => ({id:'50000000-0000-4000-8000-000000000008',label:'Home',recipientName:'Teresa Abella',
 phone:'+639276143852',street:'42 Mabini Street',postalCode:'1600',landmark:'Blue gate',
 destination:{sourceVersion:'psgc-2026-06-30',path:addressPlaces.map(place=>place.code)},
 formattedAddress:'42 Mabini Street, San Antonio, Pasig City, 1600, Blue gate',...patch})
async function addressReferenceRoutes(page){
 await page.route('**/api/storefront/delivery/locations*',route=>{
  const parent=new URL(route.request().url()).searchParams.get('parent')
  const index=parent?addressPlaces.findIndex(place=>place.code===parent)+1:0
  return route.fulfill({json:{ok:true,sourceVersion:'psgc-2026-06-30',children:addressPlaces[index]?[addressPlaces[index]]:[]}})
 })
}
async function addressCheckoutBase(page,authenticated=true){
 if(authenticated)await seedExpressAccount(page,fakeJwt(expressActor))
 await addressReferenceRoutes(page)
 await page.addInitScript(()=>localStorage.setItem('k2_cart_v1',JSON.stringify([{id:'ADDRESS-COFFEE',qty:1}])))
 await page.route('**/rest/v1/**',route=>{
  const table=new URL(route.request().url()).pathname.split('/').pop()
  return route.fulfill({json:table==='products'?[{sku:'ADDRESS-COFFEE',name:'Synthetic address-test coffee',status:'Live',srp:845,primary_image_url:'/images/placeholder.svg',description:'Synthetic local fixture',subcategory:'Coffee & Drinks'}]
   :table==='v_storefront_visible_skus'?[{sku:'ADDRESS-COFFEE'}]:table==='v_product_stock_from_batches'?[{sku:'ADDRESS-COFFEE',stock_from_batches:8}]:[]})
 })
 await page.route('**/api/storefront/account/history',route=>route.fulfill({json:accountExpressHistory()}))
 const quotes=[]
 await page.route('**/api/storefront/delivery/quote',route=>{quotes.push(route.request().postDataJSON());return route.fulfill({json:{ok:true,
  quote:{service:'standard',feeMinor:6500,inputFingerprint:'address-fixture',rateVersion:1,weightBasis:'estimated'}}})})
 return quotes
}

test('saved delivery addresses retain one exact change through a lost save reply',async({page})=>{
 await seedExpressAccount(page,fakeJwt(expressActor));await addressReferenceRoutes(page)
 await page.route('**/api/storefront/account/history',route=>route.fulfill({json:accountExpressHistory()}))
 await page.route('**/api/storefront/account/portfolio',route=>route.fulfill({json:{ok:true,portfolio:purchasePortfolio}}))
 let settings={displayName:'Elena Villanueva',deliveryAddress:'',notifyInApp:true,addressBook:{initialized:false,addresses:[],defaultAddressId:null,revision:0}}
 const writes=[];let lost=true
 await page.route('**/api/storefront/account/settings',route=>{
  const body=route.request().postDataJSON()
  if(body.operation==='addresses'){
   writes.push(body)
   if(settings.addressBook.lastOperationId!==body.operationId)settings={...settings,deliveryAddress:'42 Mabini Street, San Antonio, Pasig City, 1600',
    addressBook:{initialized:true,addresses:body.addresses.map(a=>({...a,formattedAddress:'42 Mabini Street, San Antonio, Pasig City, 1600'})),
     defaultAddressId:body.defaultAddressId,revision:body.expectedRevision+1,lastOperationId:body.operationId,lastOperationRevision:body.expectedRevision}}
   if(lost){lost=false;return route.abort('failed')}
  }
  return route.fulfill({json:{ok:true,settings,notifications:[]}})
 })
 await page.goto('/account')
 const section=page.getByRole('region',{name:'Delivery addresses',exact:true})
 await expect(section).toBeVisible({timeout:5000})
 await section.getByRole('button',{name:'Add delivery address',exact:true}).click()
 await section.getByLabel('Address label',{exact:true}).fill('Home')
 await section.getByLabel('Recipient full name',{exact:true}).fill('Teresa Abella')
 await section.getByLabel('Delivery contact number',{exact:true}).fill('09276143852')
 await section.getByLabel('House, unit and street',{exact:true}).fill('42 Mabini Street')
 for(let i=0;i<addressPlaces.length;i++)await section.locator(`#account-address-area-${i}`).selectOption(addressPlaces[i].code)
 await section.getByLabel('Postal code (optional)',{exact:true}).fill('1600')
 await section.getByRole('button',{name:'Save address',exact:true}).click()
 await expect(section.getByRole('button',{name:'Retry saved change',exact:true})).toBeVisible()
 await expect(section.getByRole('textbox',{name:'House, unit and street',exact:true})).toBeDisabled()
 await section.getByRole('button',{name:'Retry saved change',exact:true}).click()
 await expect(section.getByText('Address saved.',{exact:true})).toBeVisible()
 expect(writes).toHaveLength(2);expect(writes[1]).toEqual(writes[0])
 expect(writes[0].addresses[0].phone).toBe('+639276143852')
 await expect(section.getByText('Default',{exact:true})).toBeVisible()
 await expect(section.getByText('Teresa Abella',{exact:true})).toBeVisible()
 await page.reload();await expect(section.getByText('Teresa Abella',{exact:true})).toBeVisible()
})

test('saved delivery default restores gift recipient and location without requiring another entry',async({page})=>{
 const quotes=await addressCheckoutBase(page),address=deliveryAddressFixture()
 await page.route('**/api/storefront/account/settings',route=>route.fulfill({json:{ok:true,settings:{displayName:'Elena Villanueva',notifyInApp:true,
  deliveryAddress:address.formattedAddress,addressBook:{initialized:true,addresses:[address],defaultAddressId:address.id,revision:1}},notifications:[]}}))
 await page.goto('/checkout')
 await expect(page.getByRole('heading',{name:'Review order request',exact:true})).toBeVisible()
 await expect(page.getByLabel('Full name',{exact:true})).toHaveValue('Teresa Abella')
 await expect(page.getByLabel('Mobile number',{exact:true})).toHaveValue('+639276143852')
 await expect(page.getByRole('textbox',{name:'Delivery address',exact:true})).toHaveValue(address.formattedAddress)
 await expect(page.getByRole('combobox',{name:'Saved delivery address',exact:true})).toHaveValue(address.id)
 await expect.poll(()=>quotes.length).toBeGreaterThan(0)
 expect(quotes.at(-1).destination).toEqual(address.destination)
 await expect(page.getByRole('checkbox',{name:/I accept the/})).not.toBeChecked()
})

test('saved delivery editor accepts a name added in the profile form while it is open',async({page})=>{
 await seedExpressAccount(page,fakeJwt(expressActor));await addressReferenceRoutes(page)
 await page.route('**/api/storefront/account/history',route=>route.fulfill({json:accountExpressHistory()}))
 await page.route('**/api/storefront/account/portfolio',route=>route.fulfill({json:{ok:true,portfolio:purchasePortfolio}}))
 let settings={displayName:'',deliveryAddress:'',notifyInApp:true,addressBook:{initialized:false,addresses:[],defaultAddressId:null,revision:0}}
 const writes=[]
 await page.route('**/api/storefront/account/settings',route=>{
  const body=route.request().postDataJSON()
  if(typeof body.displayName==='string'&&!body.operation)settings={...settings,displayName:body.displayName}
  if(body.operation==='addresses'){
   writes.push(body);settings={...settings,deliveryAddress:'42 Mabini Street',addressBook:{initialized:true,revision:1,
    addresses:body.addresses.map(a=>({...a,formattedAddress:'42 Mabini Street'})),defaultAddressId:body.defaultAddressId}}
  }
  return route.fulfill({json:{ok:true,settings,notifications:[]}})
 })
 await page.goto('/account');const section=page.getByRole('region',{name:'Delivery addresses',exact:true})
 await section.getByRole('button',{name:'Add delivery address',exact:true}).click()
 await expect(section.locator('#address-profile-name')).toBeVisible()
 await page.locator('#account-profile-name').fill('Elena Villanueva')
 await page.getByRole('button',{name:'Save settings',exact:true}).click()
 await expect(page.getByText('Settings saved.',{exact:true})).toBeVisible()
 await expect(section.locator('#address-profile-name')).toHaveCount(0)
 await section.getByLabel('Recipient full name',{exact:true}).fill('Teresa Abella')
 await section.getByLabel('Delivery contact number',{exact:true}).fill('09276143852')
 await section.getByLabel('House, unit and street',{exact:true}).fill('42 Mabini Street')
 for(let i=0;i<addressPlaces.length;i++)await section.locator(`#account-address-area-${i}`).selectOption(addressPlaces[i].code)
 await section.getByRole('button',{name:'Save address',exact:true}).click()
 await expect(section.getByText('Address saved.',{exact:true})).toBeVisible()
 expect(writes).toHaveLength(1);expect(writes[0].displayName).toBe('Elena Villanueva')
})

test('saved delivery lost reply reconciles a JSONB destination with reordered keys',async({page})=>{
 await seedExpressAccount(page,fakeJwt(expressActor));await addressReferenceRoutes(page)
 await page.route('**/api/storefront/account/history',route=>route.fulfill({json:accountExpressHistory()}))
 await page.route('**/api/storefront/account/portfolio',route=>route.fulfill({json:{ok:true,portfolio:purchasePortfolio}}))
 const address=deliveryAddressFixture();let settings={displayName:'Elena Villanueva',deliveryAddress:address.formattedAddress,
  notifyInApp:true,addressBook:{initialized:true,addresses:[address],defaultAddressId:address.id,revision:1}}
 let writes=0
 await page.route('**/api/storefront/account/settings',route=>{
  const body=route.request().postDataJSON()
  if(body.operation==='addresses'){
   writes++;settings={...settings,addressBook:{initialized:true,revision:body.expectedRevision+1,defaultAddressId:body.defaultAddressId,
    lastOperationId:body.operationId,lastOperationRevision:body.expectedRevision,
    addresses:body.addresses.map(a=>({...a,destination:{path:a.destination.path,sourceVersion:a.destination.sourceVersion},formattedAddress:address.formattedAddress}))}}
   return route.abort('failed')
  }
  return route.fulfill({json:{ok:true,settings,notifications:[]}})
 })
 await page.goto('/account');const section=page.getByRole('region',{name:'Delivery addresses',exact:true})
 await section.getByRole('button',{name:'Edit Home',exact:true}).click()
 await section.getByLabel('Address label',{exact:true}).fill('Work')
 await section.getByRole('button',{name:'Save address',exact:true}).click()
 await expect(section.getByRole('button',{name:'Retry saved change',exact:true})).toBeVisible()
 await section.getByRole('button',{name:'Check latest addresses',exact:true}).click()
 await expect(section.getByText('Address saved.',{exact:true})).toBeVisible()
 await expect(section.getByRole('heading',{name:'Work',exact:true})).toBeVisible()
 await expect(section.getByRole('button',{name:'Retry saved change',exact:true})).toHaveCount(0)
 expect(writes).toBe(1)
})

test('saved delivery default never mixes into a manually entered recipient or street',async({page})=>{
 const quotes=await addressCheckoutBase(page),address=deliveryAddressFixture()
 let release,started;const held=new Promise(resolve=>{release=resolve}),requested=new Promise(resolve=>{started=resolve})
 await page.route('**/api/storefront/account/settings',async route=>{started();await held;return route.fulfill({json:{ok:true,
  settings:{displayName:'Elena Villanueva',deliveryAddress:address.formattedAddress,notifyInApp:true,
   addressBook:{initialized:true,addresses:[address],defaultAddressId:address.id,revision:1}},notifications:[]}})})
 await page.goto('/checkout');await requested
 await page.getByRole('textbox',{name:'Full name',exact:true}).fill('Manual recipient')
 await page.getByRole('textbox',{name:'Mobile number',exact:true}).fill('09178546329')
 await page.getByRole('textbox',{name:'Delivery address',exact:true}).fill('A different street already typed')
 release()
 await expect(page.getByRole('combobox',{name:'Saved delivery address',exact:true})).toBeVisible()
 await expect(page.getByRole('textbox',{name:'Full name',exact:true})).toHaveValue('Manual recipient')
 await expect(page.getByRole('textbox',{name:'Mobile number',exact:true})).toHaveValue('09178546329')
 await expect(page.getByRole('textbox',{name:'Delivery address',exact:true})).toHaveValue('A different street already typed')
 await expect(page.locator('#delivery-area-0')).toHaveValue('');expect(quotes).toHaveLength(0)
 await page.getByRole('combobox',{name:'Saved delivery address',exact:true}).selectOption(address.id)
 await expect(page.getByRole('textbox',{name:'Full name',exact:true})).toHaveValue(address.recipientName)
 await expect.poll(()=>quotes.length).toBeGreaterThan(0)
 expect(quotes.at(-1).destination).toEqual(address.destination)
 await expect(page.getByRole('checkbox',{name:/I accept the/})).not.toBeChecked()
})

test('saved delivery addresses change defaults and remove the final destination without resurrection',async({page})=>{
 await seedExpressAccount(page,fakeJwt(expressActor))
 await page.route('**/api/storefront/account/history',route=>route.fulfill({json:accountExpressHistory()}))
 await page.route('**/api/storefront/account/portfolio',route=>route.fulfill({json:{ok:true,portfolio:purchasePortfolio}}))
 const home=deliveryAddressFixture(),work=deliveryAddressFixture({id:'50000000-0000-4000-8000-000000000009',label:'Work',recipientName:'Elena Villanueva'})
 let settings={displayName:'Elena Villanueva',notifyInApp:true,deliveryAddress:home.formattedAddress,
  addressBook:{initialized:true,addresses:[home,work],defaultAddressId:home.id,revision:1}}
 await page.route('**/api/storefront/account/settings',route=>{
  const body=route.request().postDataJSON()
  if(body.operation==='addresses')settings={...settings,deliveryAddress:body.addresses.length?home.formattedAddress:'',addressBook:{initialized:true,
   addresses:body.addresses.map(a=>({...a,formattedAddress:home.formattedAddress})),defaultAddressId:body.defaultAddressId,revision:body.expectedRevision+1,
   lastOperationId:body.operationId,lastOperationRevision:body.expectedRevision}}
  return route.fulfill({json:{ok:true,settings,notifications:[]}})
 })
 await page.goto('/account');const section=page.getByRole('region',{name:'Delivery addresses',exact:true})
 await section.getByRole('button',{name:'Make Work default',exact:true}).click()
 await expect(section.getByRole('article').filter({has:page.getByRole('heading',{name:'Work',exact:true})}).getByText('Default',{exact:true})).toBeVisible()
 await section.getByRole('button',{name:'Remove Work',exact:true}).click()
 await expect(section.getByText(/Home will become your default/)).toBeVisible()
 await section.getByRole('button',{name:'Confirm removal',exact:true}).click()
 await expect(section.getByText('Address removed.',{exact:true})).toBeVisible()
 await section.getByRole('button',{name:'Remove Home',exact:true}).click()
 await section.getByRole('button',{name:'Confirm removal',exact:true}).click()
 await expect(section.getByText(/No delivery addresses saved yet/)).toBeVisible()
 expect(settings.deliveryAddress).toBe('');expect(settings.addressBook.defaultAddressId).toBeNull()
 await page.reload();await expect(section.getByText(/No delivery addresses saved yet/)).toBeVisible()
 await expect(page.getByLabel('Saved delivery address',{exact:true})).toHaveCount(0)
})

test('saved delivery work keeps guest checkout available without an account',async({page})=>{
 const quotes=await addressCheckoutBase(page,false);let accountReads=0
 await page.route('**/api/storefront/account/settings',route=>{accountReads++;return route.abort()})
 await page.goto('/checkout')
 await page.getByRole('textbox',{name:'Full name',exact:true}).fill('Guest recipient')
 await page.getByRole('textbox',{name:'Email address',exact:true}).fill('guest@example.invalid')
 await page.getByRole('textbox',{name:'Delivery address',exact:true}).fill('18 Synthetic Street')
 for(let i=0;i<addressPlaces.length;i++)await page.locator(`#delivery-area-${i}`).selectOption(addressPlaces[i].code)
 await expect.poll(()=>quotes.length).toBeGreaterThan(0)
 await expect(page.getByRole('checkbox',{name:/I accept the/})).toBeVisible()
 await expect(page.getByRole('button',{name:'Submit order request',exact:true})).toBeVisible()
 await expect(page.getByRole('combobox',{name:'Saved delivery address',exact:true})).toHaveCount(0)
 expect(accountReads).toBe(0)
})

test('saved delivery checkout clears the previous customer on an account switch and sign-out',async({page})=>{
 const quotes=await addressCheckoutBase(page),address=deliveryAddressFixture(),actorB='10000000-0000-4000-8000-000000000002'
 const tokenB=fakeJwt(actorB),other=deliveryAddressFixture({recipientName:'Second customer',street:'9 Second Street',formattedAddress:'9 Second Street, Pasig City'})
 await page.route('https://fixture.supabase.co/auth/v1/user',route=>route.fulfill({json:accountUser(actorB)}))
 await page.route('**/api/storefront/account/settings',route=>{
  const a=route.request().headers().authorization===`Bearer ${tokenB}`?other:address
  return route.fulfill({json:{ok:true,settings:{displayName:'Profile name',deliveryAddress:a.formattedAddress,notifyInApp:true,
   addressBook:{initialized:true,addresses:[a],defaultAddressId:a.id,revision:1}},notifications:[]}})
 })
 await page.goto('/checkout');await expect(page.getByLabel('Full name',{exact:true})).toHaveValue(address.recipientName)
 await expect.poll(()=>quotes.length).toBeGreaterThan(0)
 await page.getByRole('checkbox',{name:/I accept the/}).check()
 await page.evaluate(async token=>{
  const {customerAuthClient}=await import('/src/services/customerAccountService.js')
  const result=await(await customerAuthClient()).auth.setSession({access_token:token,refresh_token:'synthetic-other'})
  if(result.error)throw result.error
 },tokenB)
 await expect(page.getByLabel('Full name',{exact:true})).toHaveValue(other.recipientName)
 await expect(page.getByRole('textbox',{name:'Delivery address',exact:true})).toHaveValue(other.formattedAddress)
 await expect(page.getByRole('checkbox',{name:/I accept the/})).not.toBeChecked()
 await page.evaluate(async()=>{
  const {customerAuthClient}=await import('/src/services/customerAccountService.js')
  await(await customerAuthClient()).auth.signOut({scope:'local'})
 })
 await expect(page.getByLabel('Full name',{exact:true})).toHaveValue('')
 await expect(page.getByRole('textbox',{name:'Delivery address',exact:true})).toHaveValue('')
 await expect(page.getByRole('combobox',{name:'Saved delivery address',exact:true})).toHaveCount(0)
 await expect(page.locator('#delivery-area-0')).toHaveValue('')
})

test('saved delivery default cannot replace an existing held order snapshot',async({page})=>{
 const quotes=await addressCheckoutBase(page),address=deliveryAddressFixture()
 const key='60000000-0000-4000-8000-000000000001'
 const payload={idempotencyKey:key,customerName:'Original held recipient',phone:'+639178563492',email:'held@example.invalid',
  address:'Original held street',fulfillmentMethod:'Standard Courier Delivery',items:[{sku:'ADDRESS-COFFEE',quantity:1}],
  delivery:{service:'standard',destination:address.destination},note:'[Payment: gcash] Original note'}
 await page.addInitScript(({key,payload})=>localStorage.setItem('k2-checkout-recovery-v1',JSON.stringify({version:1,state:'pending',key,payload,
  paymentMethod:'gcash',deliveryPreview:{service:'standard',feeMinor:6500},lines:[{id:'ADDRESS-COFFEE',qty:1,unit:845,
   product:{id:'ADDRESS-COFFEE',name:'Synthetic held coffee',retail:845}}]})),{key,payload})
 await page.route('**/api/storefront/account/settings',route=>route.fulfill({json:{ok:true,settings:{displayName:'Elena Villanueva',
  deliveryAddress:address.formattedAddress,notifyInApp:true,addressBook:{initialized:true,addresses:[address],defaultAddressId:address.id,revision:1}},notifications:[]}}))
 await page.goto('/checkout')
 await expect(page.getByLabel('Full name',{exact:true})).toHaveValue(payload.customerName)
 await expect(page.getByLabel('Full name',{exact:true})).toBeDisabled()
 await expect(page.getByRole('combobox',{name:'Saved delivery address',exact:true})).toBeDisabled()
 await expect(page.getByRole('textbox',{name:'Delivery address',exact:true})).toHaveValue(payload.address)
 await expect(page.getByText('Your original delivery terms are held for this retry.',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('k2-checkout-recovery-v1')).payload)).toEqual(payload)
 expect(quotes).toHaveLength(0)
})

test('saved delivery edit removed in another tab remains a draft instead of a false save',async({page})=>{
 await seedExpressAccount(page,fakeJwt(expressActor));await addressReferenceRoutes(page)
 await page.route('**/api/storefront/account/history',route=>route.fulfill({json:accountExpressHistory()}))
 await page.route('**/api/storefront/account/portfolio',route=>route.fulfill({json:{ok:true,portfolio:purchasePortfolio}}))
 const home=deliveryAddressFixture(),work=deliveryAddressFixture({id:'50000000-0000-4000-8000-000000000009',label:'Work'})
 let settings={displayName:'Elena Villanueva',notifyInApp:true,deliveryAddress:home.formattedAddress,
  addressBook:{initialized:true,addresses:[home,work],defaultAddressId:home.id,revision:1}},writes=0
 await page.route('**/api/storefront/account/settings',route=>{
  if(route.request().postDataJSON().operation==='addresses'){
   writes++;settings={...settings,addressBook:{...settings.addressBook,addresses:[work],defaultAddressId:work.id,revision:2}}
   if(writes===1)return route.fulfill({status:409,json:{ok:false,error:{code:'ADDRESS_BOOK_CONFLICT'}}})
  }
  return route.fulfill({json:{ok:true,settings,notifications:[]}})
 })
 await page.goto('/account');const section=page.getByRole('region',{name:'Delivery addresses',exact:true})
 await section.getByRole('button',{name:'Edit Home',exact:true}).click()
 await section.getByRole('textbox',{name:'House, unit and street',exact:true}).fill('A draft to preserve')
 await section.getByRole('button',{name:'Save address',exact:true}).click()
 await section.getByRole('button',{name:'Check latest addresses',exact:true}).click()
 await expect(section.getByText('Latest saved addresses loaded. Review your draft before saving.',{exact:true})).toBeVisible()
 await section.getByRole('button',{name:'Save address',exact:true}).click()
 await expect(section.getByText('This address was removed elsewhere. Your draft is still here. Cancel and add it as a new address if needed.',{exact:true})).toBeVisible()
 await expect(section.getByRole('textbox',{name:'House, unit and street',exact:true})).toHaveValue('A draft to preserve')
 expect(writes).toBe(1)
})

test('saved delivery address editor stays readable on mobile and desktop in both themes',async({page})=>{
 await seedExpressAccount(page,fakeJwt(expressActor));await addressReferenceRoutes(page)
 await page.route('**/api/storefront/account/history',route=>route.fulfill({json:accountExpressHistory()}))
 await page.route('**/api/storefront/account/portfolio',route=>route.fulfill({json:{ok:true,portfolio:purchasePortfolio}}))
 const address=deliveryAddressFixture()
 await page.route('**/api/storefront/account/settings',route=>route.fulfill({json:{ok:true,settings:{displayName:'Elena Villanueva',
  deliveryAddress:address.formattedAddress,notifyInApp:true,addressBook:{initialized:true,addresses:[address],defaultAddressId:address.id,revision:1}},notifications:[]}}))
 await page.goto('/account');const section=page.getByRole('region',{name:'Delivery addresses',exact:true})
 await section.getByRole('button',{name:'Edit Home',exact:true}).click()
 await expect(section.locator('#account-address-area-3')).toHaveValue(addressPlaces[3].code)
 const decline=page.getByRole('button',{name:'Decline',exact:true});if(await decline.isVisible())await decline.click()
 await page.emulateMedia({reducedMotion:'reduce'})
 for(const theme of ['light','dark']){
  const toggle=page.getByRole('button',{name:theme==='light'?'Switch to light mode':'Switch to dark mode'})
  if(await toggle.isVisible())await toggle.click()
  for(const width of [375,1440]){
   await page.setViewportSize({width,height:900});await section.scrollIntoViewIfNeeded()
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   for(const control of await section.locator('input,select,textarea,button').all()){
    if(await control.isVisible())expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(44)
   }
   await section.getByLabel('Address label',{exact:true}).focus()
   await expect(section.getByLabel('Address label',{exact:true})).toBeFocused()
   await section.screenshot({path:`docs/acceptance/customer-addresses-20261028/editor-${theme}-${width}.png`,animations:'disabled'})
  }
 }
})
test('account purchase overview uses complete linked totals and has private order/proof downloads', async ({ page },testInfo) => {
 await seedExpressAccount(page,fakeJwt(expressActor))
 await page.route('**/api/storefront/account/history',route=>route.fulfill({json:accountExpressHistory()}))
 await page.route('**/api/storefront/account/portfolio',route=>route.fulfill({json:{ok:true,portfolio:route.request().postDataJSON().operation==='proof'
  ?{proof:{mediaType:'application/pdf',base64:Buffer.from('Synthetic private proof').toString('base64')}}:purchasePortfolio}}))
 await page.goto('/account')
 await expect(page.getByRole('heading',{name:'Your purchases'})).toBeVisible()
 await expect(page.getByText('21 linked orders',{exact:true})).toBeVisible()
 await expect(page.getByText('Recorded payments on orders marked refunded: ₱10.00',{exact:true})).toBeVisible()
 await expect(page.getByText('This total shows original payments, not the amounts refunded.',{exact:true})).toBeVisible()
 await expect(page.getByText(/1 payment record has no confirmed amount/)).toBeVisible()
 await page.getByText('Order details and payment records',{exact:true}).click()
 await expect(page.getByText('Synthetic pantry item',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Download order summary'})).toBeVisible()
 await expect(page.getByRole('button',{name:'Download uploaded proof 1'})).toBeVisible()
 const summaryDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download order summary'}).click()
 const summaryFile=await summaryDownload
 expect(summaryFile.suggestedFilename()).toBe('WEB-PURCHASE-1-summary.txt')
 expect(await (await import('node:fs/promises')).readFile(await summaryFile.path(),'utf8')).toContain('not a tax invoice')
 const proofDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download uploaded proof 1'}).click()
 expect(await (await import('node:fs/promises')).readFile(await (await proofDownload).path(),'utf8')).toBe('Synthetic private proof')
 await page.getByRole('button',{name:'Decline',exact:true}).click()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 for(const viewport of [{width:375,height:812},{width:768,height:768},{width:1024,height:768},{width:1440,height:1000}]){
  await page.setViewportSize(viewport)
  await page.evaluate(()=>window.scrollTo(0,0));await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0)
  if(viewport.width===375){
   await expect(page.getByText('Verified customer account',{exact:true})).toHaveCount(0)
   const totals=await page.getByText(/^Verified payments:/).boundingBox();expect(totals.y+totals.height).toBeLessThan(viewport.height-60)
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const shortControls=await page.locator('main button, main summary, main nav a').evaluateAll(elements=>elements.filter(el=>el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height<43.5).map(el=>el.textContent))
  expect(shortControls).toEqual([])
  if([375,1440].includes(viewport.width)){
   await page.screenshot({path:`.impeccable/review/customer-account-20261027/light-${viewport.width}.png`,fullPage:true,animations:'disabled'})
   await page.screenshot({path:`.impeccable/review/customer-account-20261027/light-${viewport.width}-viewport.png`,animations:'disabled'})
  }
 }
 await page.getByRole('button',{name:'Switch to dark mode'}).click()
 for(const viewport of [{width:1440,height:1000},{width:375,height:812}]){
  await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.evaluate(()=>window.scrollTo(0,0));await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0)
  await page.screenshot({path:`.impeccable/review/customer-account-20261027/dark-${viewport.width}.png`,fullPage:true,animations:'disabled'})
  await page.screenshot({path:`.impeccable/review/customer-account-20261027/dark-${viewport.width}-viewport.png`,animations:'disabled'})
 }
})
for(const fixture of [{width:375,height:812,theme:'light'},{width:1440,height:1000,theme:'dark'}])test(`closure states remain usable at ${fixture.width} in ${fixture.theme}`,async({page})=>{
 await page.setViewportSize({width:fixture.width,height:fixture.height})
 await seedExpressAccount(page,fakeJwt(expressActor))
 await page.route('**/api/storefront/account/history',route=>route.fulfill({json:accountExpressHistory()}))
 await page.route('**/api/storefront/account/portfolio',route=>route.fulfill({json:{ok:true,portfolio:purchasePortfolio}}))
 let state='verification_pending';let expireNext=false;let loseNext=false
 await page.route('**/api/storefront/account/privacy',route=>{
  const body=route.request().postDataJSON()
  if(body.operation==='begin')state='verification_pending'
  if(body.operation==='cancel')state='cancelled'
  if(body.operation==='confirm'){
   if(expireNext){expireNext=false;state='expired';return route.fulfill({status:409,json:{error:{code:'PRIVACY_PROOF_EXPIRED'}}})}
   if(loseNext){loseNext=false;state='closed';return route.abort('failed')}
   state='held'
  }
  return route.fulfill({json:{ok:true,receipt:{requestId:body.requestId,state,canCancel:['verification_pending','held'].includes(state),
   reasons:state==='held'?['open_order_or_payment']:[],closedAt:state==='closed'?'2026-10-27T03:00:00Z':null,
   providerState:'pending',externalPending:true,retainedCategories:['transaction_retention_review','excel_review','backup_review']}}})
 })
 await page.goto('/account');await page.getByRole('button',{name:'Decline',exact:true}).click()
 if(fixture.theme==='dark')await page.getByRole('button',{name:'Switch to dark mode'}).click()
 const section=page.getByRole('region',{name:'Close your account and request data removal',exact:true})
 const capture=async name=>{await section.scrollIntoViewIfNeeded();await section.screenshot({path:`.impeccable/review/customer-account-20261027/${name}-${fixture.width}-${fixture.theme}.png`,animations:'disabled'})}
 await section.getByRole('checkbox').check();await section.getByRole('button',{name:'Send closure verification code'}).click()
 await expect(section.getByLabel('Closure verification code')).toBeVisible();await capture('verification')
 await section.getByLabel('Closure verification code').fill('123456');await section.getByRole('button',{name:'Confirm account closure',exact:true}).click()
 await expect(section.getByText('Your closure request is pending.',{exact:true})).toBeVisible();await expect(section.getByRole('button',{name:'Cancel closure request'})).toBeVisible();await capture('held')
 await section.getByRole('button',{name:'Cancel closure request'}).click()
 await section.getByRole('button',{name:'Send closure verification code'}).click();expireNext=true
 await section.getByLabel('Closure verification code').fill('123456');await section.getByRole('button',{name:'Confirm account closure',exact:true}).click()
 await expect(section.getByText('Verification expired. Start again when you’re ready.',{exact:true})).toBeVisible();await capture('expired')
 await page.context().setOffline(true);await expect(section.getByRole('button',{name:'Send closure verification code'})).toBeDisabled();await capture('offline')
 await page.context().setOffline(false);await section.getByRole('button',{name:'Send closure verification code'}).click();loseNext=true
 await section.getByLabel('Closure verification code').fill('123456');await section.getByRole('button',{name:'Confirm account closure',exact:true}).click()
 await expect(section.getByRole('alert')).toBeVisible();await capture('uncertain')
 await section.getByRole('button',{name:'Check saved closure status'}).click()
 const closed=page.getByRole('region',{name:'Your closure receipt',exact:true})
 await expect(closed.getByText('Account access is closed.',{exact:true})).toBeVisible()
 await closed.screenshot({path:`.impeccable/review/customer-account-20261027/closed-${fixture.width}-${fixture.theme}.png`,animations:'disabled'})
})
test('closure survives a lost confirmation response and can be recovered without repeating confirmation',async({page})=>{
 await seedExpressAccount(page,fakeJwt(expressActor))
 await page.route('**/api/storefront/account/history',route=>route.fulfill({json:accountExpressHistory()}))
 await page.route('**/api/storefront/account/portfolio',route=>route.fulfill({json:{ok:true,portfolio:purchasePortfolio}}))
 let closed=false;const writes=[]
 await page.route('**/api/storefront/account/privacy',route=>{
  const body=route.request().postDataJSON();writes.push(body)
  if(body.operation==='confirm'){closed=true;return route.abort('failed')}
  return route.fulfill({json:{ok:true,receipt:{requestId:body.requestId,state:closed?'closed':'verification_pending',canCancel:!closed,
   retainedCategories:['excel_review','backup_review'],externalPending:true,providerState:'pending'}}})
 })
 await page.goto('/account')
 await page.getByRole('checkbox',{name:/I understand eligible closure starts/}).check()
 await page.getByRole('button',{name:'Send closure verification code'}).click()
 await page.getByLabel('Closure verification code').fill('123456')
 await page.getByRole('button',{name:'Confirm account closure',exact:true}).click()
 await expect(page.getByRole('button',{name:'Check saved closure status'})).toBeVisible()
 await page.reload()
 await expect(page.getByText('Account access is closed.',{exact:true})).toBeVisible()
 expect(writes.filter(body=>body.operation==='confirm')).toHaveLength(1)
 const original=writes.find(body=>body.operation==='begin');const status=writes.filter(body=>body.operation==='status').at(-1)
 expect(status.requestId).toBe(original.requestId);expect(status.receiptToken).toBe(original.receiptToken)
 await expect(page.getByText(/Excel and backup cleanup still need confirmation/)).toBeVisible()
})
async function seedExpressAccount(page, token) {
  await page.addInitScript(({ key, token, user }) => localStorage.setItem(key, JSON.stringify({
    access_token: token, refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, user,
  })), { key: AUTH_STORAGE_KEY, token, user: accountUser(expressActor) })
  await page.route('**/api/storefront/account/settings', route => route.fulfill({ status: 200,
    json: { ok: true, settings: { displayName: '', deliveryAddress: '', notifyInApp: true }, notifications: [] } }))
}
const accountExpressHistory = (accepted = false, feeMinor = 15000) => ({ ok: true, history: {
  linked_at: '2026-08-22T07:00:00Z', pasabuy_requests: [], conversations: [], orders: [{
    public_reference: expressReference, status: 'submitted', payment_status: 'not_requested',
    shipping_quote_status: accepted ? 'customer_confirmed' : 'pending_quote', total_amount: accepted ? 100 + feeMinor / 100 : null,
    created_at: '2026-08-22T07:00:00Z', express_quote: {
      quoteVersion: 1, courier: 'Grab', feeMinor, subtotal: 100, discountAmount: 0, proposedTotal: 100 + feeMinor / 100,
      quotedAt: new Date(Date.now() - 60000).toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString(),
      availabilityNote: 'Synthetic courier availability for readiness only', accepted,
    },
  }],
} })
const expressAccountReceipt = (feeMinor = 15000) => ({ orderReference: expressReference, quoteVersion: 1,
  shippingQuoteStatus: 'customer_confirmed', totalAmount: 100 + feeMinor / 100, acceptedAt: new Date().toISOString() })

test('legacy account history keeps recorded payment and messages without final bill or approval', async ({ page }) => {
  await seedExpressAccount(page, fakeJwt(expressActor))
  const result = accountExpressHistory(true)
  result.history.orders[0] = { ...result.history.orders[0], delivery_review_required: true,
    total_amount: null, payment_status: 'verified' }
  result.history.orders.push({ public_reference: 'WEB-CURRENT-CHARGE', status: 'submitted',
    payment_status: 'awaiting_instructions', shipping_quote_status: 'customer_confirmed',
    total_amount: 100, delivery_review_required: false, created_at: '2026-08-22T07:00:00Z' })
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 200, json: result }))
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Total needs staff review', { exact: true })).toBeVisible()
  await expect(page.getByText(/Recorded payment verified/)).toBeVisible()
  await expect(page.getByText('₱100.00', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: `Express delivery review for ${expressReference}` })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Website messages' })).toBeVisible()
  await expect(page.getByText(/Message K2 staff before transferring money/)).toBeVisible()
})

test('authenticated express approval recovers an already accepted lost reply after reload', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  let accepted = false
  const writes = []
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 200, json: accountExpressHistory(accepted) }))
  await page.route('**/api/storefront/account/delivery-accept', route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`)
    writes.push(route.request().postDataJSON())
    accepted = true
    return writes.length === 1 ? route.abort('failed') : route.fulfill({ status: 200, json: { ok: true, receipt: expressAccountReceipt() } })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  const review = page.getByRole('region', { name: `Express delivery review for ${expressReference}` })
  await expect(review.getByRole('button', { name: 'Accept final total' })).toBeDisabled()
  await review.getByRole('checkbox', { name: /I reviewed and accept/ }).check()
  await review.getByRole('button', { name: 'Accept final total' }).click()
  await expect(review.getByRole('button', { name: 'Retry saved approval' })).toBeVisible()
  const held = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), expressStorageKey)
  expect(held.identity).toBe(expressActor)
  expect(Object.keys(held.body).sort()).toEqual(['idempotencyKey', 'orderReference', 'quoteVersion'])
  await page.reload()
  await expect(review.getByRole('button', { name: 'Retry saved approval' })).toBeVisible()
  await review.getByRole('button', { name: 'Retry saved approval' }).click()
  await expect(review.getByRole('status')).toContainText('Final total ₱250.')
  expect(writes).toHaveLength(2); expect(writes[1]).toEqual(writes[0])
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).state, expressStorageKey)).toBe('resolved')
  await expect(page.getByAltText(/payment QR/i)).toHaveCount(0)
})

test('authenticated express late receipt stays with the original account and accepts an explicit zero fee', async ({ page }) => {
  const tokenA = fakeJwt(expressActor)
  const actorB = '10000000-0000-4000-8000-000000000002'
  const tokenB = fakeJwt(actorB)
  await seedExpressAccount(page, tokenA)
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({ status: 200,
    json: accountUser(route.request().headers().authorization === `Bearer ${tokenA}` ? expressActor : actorB) }))
  let accepted = false
  let started = false
  let release
  const heldReply = new Promise(resolve => { release = resolve })
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 200,
    json: route.request().headers().authorization === `Bearer ${tokenA}` ? accountExpressHistory(accepted, 0)
      : { ok: true, history: { linked_at: '2026-08-22T07:00:00Z', orders: [], conversations: [], pasabuy_requests: [] } } }))
  await page.route('**/api/storefront/account/delivery-accept', async route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${tokenA}`)
    started = true; accepted = true; await heldReply
    return route.fulfill({ status: 200, json: { ok: true, receipt: expressAccountReceipt(0) } })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  const review = page.getByRole('region', { name: `Express delivery review for ${expressReference}` })
  await expect(review.getByText('₱0', { exact: true })).toHaveCount(2)
  await review.getByRole('checkbox', { name: /I reviewed and accept/ }).check()
  await review.getByRole('button', { name: 'Accept final total' }).click()
  await expect.poll(() => started).toBe(true)
  const switchAccount = token => page.evaluate(async token => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const result = await (await customerAuthClient()).auth.setSession({ access_token: token, refresh_token: 'synthetic-switch-token' })
    if (result.error) throw result.error
  }, token)
  await switchAccount(tokenB)
  await expect(page.getByText(expressReference, { exact: true })).toHaveCount(0)
  release()
  await page.evaluate(key => navigator.locks.request(key, () => {}), expressStorageKey)
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), expressStorageKey)
  expect(saved.identity).toBe(expressActor); expect(saved.state).toBe('resolved'); expect(saved.receipt.totalAmount).toBe(100)
  await expect(page.getByText(/Delivery accepted\. Final total/)).toHaveCount(0)
  await switchAccount(tokenA)
  await expect(review.getByRole('status')).toContainText('Final total ₱100.')
  await expect(review.getByRole('button', { name: 'Accept final total' })).toHaveCount(0)
})

test('account switch discards a late previous-customer history response', async ({ page }) => {
  const actorA = '10000000-0000-4000-8000-000000000001'
  const actorB = '10000000-0000-4000-8000-000000000002'
  const tokenA = fakeJwt(actorA)
  const tokenB = fakeJwt(actorB)
  const user = id => ({ id, aud: 'authenticated', role: 'authenticated', email: 'buyer@example.com',
    email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() })
  await page.addInitScript(({ key, token, actor }) => localStorage.setItem(key, JSON.stringify({
    access_token: token, refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, user: actor,
  })), { key: AUTH_STORAGE_KEY, token: tokenA, actor: user(actorA) })
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(user(actorB)),
  }))
  await page.route('**/api/storefront/account/settings', route => route.fulfill({ status: 200,
    contentType: 'application/json', body: JSON.stringify({ ok: true,
      settings: { displayName: '', deliveryAddress: '', notifyInApp: true }, notifications: [] }),
  }))
  let releaseA
  let startedA = false
  let deliveredA = false
  const heldA = new Promise(resolve => { releaseA = resolve })
  await page.route('**/api/storefront/account/history', async route => {
    const isA = route.request().headers().authorization === `Bearer ${tokenA}`
    if (isA) { startedA = true; await heldA }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true,
      history: { linked_at: '2026-08-22T07:00:00Z', pasabuy_requests: [], conversations: [], orders: [{
        public_reference: isA ? 'WEB-PREVIOUSCUSTOMER' : 'WEB-CURRENTCUSTOMER', status: 'submitted',
        shipping_quote_status: 'pending_quote', payment_status: 'not_requested', created_at: '2026-08-22T07:00:00Z',
      }] },
    }) })
    if (isA) deliveredA = true
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect.poll(() => startedA).toBe(true)
  await page.evaluate(async token => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const client = await customerAuthClient()
    const result = await client.auth.setSession({ access_token: token, refresh_token: 'test-refresh-token-b' })
    if (result.error) throw result.error
  }, tokenB)
  await expect(page.getByText('WEB-CURRENTCUSTOMER', { exact: true })).toBeVisible()
  releaseA()
  await expect.poll(() => deliveredA).toBe(true)
  await expect(page.getByText('WEB-PREVIOUSCUSTOMER', { exact: true })).toHaveCount(0)
  await expect(page.getByText('WEB-CURRENTCUSTOMER', { exact: true })).toBeVisible()
})

test('unconfirmed provider sign-out clears the local view and remains visible after reload', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await page.addInitScript(({ key, token, user }) => {
    if (sessionStorage.getItem('signout-fixture-seeded')) return
    sessionStorage.setItem('signout-fixture-seeded', '1')
    localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: 'test-refresh-token', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }))
  }, { key: AUTH_STORAGE_KEY, token, user: accountUser(expressActor) })
  await page.route('**/api/storefront/account/settings', route => route.fulfill({ json: { ok: true,
    settings: { displayName: '', deliveryAddress: '', notifyInApp: true }, notifications: [] } }))
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  await page.route('https://fixture.supabase.co/auth/v1/logout**', route => route.fulfill({ status: 503, json: { msg: 'Synthetic provider unavailable' } }))
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Create an account or sign in' })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'Sign-out could not be confirmed' })).toBeVisible()
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), AUTH_STORAGE_KEY)).toBeNull()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('alert').filter({ hasText: 'Sign-out could not be confirmed' })).toBeVisible()
  await expect(page.getByLabel('Your name')).toHaveCount(0)
  await captureSignOutNotice(page, 'provider-unconfirmed')
})

test('reloading during an unfinished sign-out does not restore the private account view', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await page.addInitScript(({ key, token, user }) => {
    if (sessionStorage.getItem('signout-fixture-seeded')) return
    sessionStorage.setItem('signout-fixture-seeded', '1')
    localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: 'test-refresh-token', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }))
  }, { key: AUTH_STORAGE_KEY, token, user: accountUser(expressActor) })
  await page.route('**/api/storefront/account/settings', route => route.fulfill({ json: { ok: true,
    settings: { displayName: 'Private account name', deliveryAddress: '', notifyInApp: true }, notifications: [] } }))
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  let logoutStarted = false, releaseLogout
  const heldLogout = new Promise(resolve => { releaseLogout = resolve })
  await page.route('https://fixture.supabase.co/auth/v1/logout**', async route => {
    logoutStarted = true; await heldLogout
    try { await route.fulfill({ status: 204, body: '' }) } catch { /* Reload cancelled the synthetic request. */ }
  })
  try {
    await page.goto('/account', { waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel('Your name')).toHaveValue('Private account name')
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect.poll(() => logoutStarted).toBe(true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('alert').filter({ hasText: 'Sign-out could not be confirmed' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Create an account or sign in' })).toBeVisible()
    await expect(page.getByLabel('Your name')).toHaveCount(0)
  } finally { releaseLogout() }
})

test('a new tab cannot restore a private session while sign-out is unfinished', async ({ page, context }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  const serveSettings = route => route.fulfill({ json: { ok: true,
    settings: { displayName: 'Private account name', deliveryAddress: '', notifyInApp: true }, notifications: [] } })
  const serveHistory = route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } })
  await page.route('**/api/storefront/account/settings', serveSettings)
  await page.route('**/api/storefront/account/history', serveHistory)
  let logoutStarted = false, releaseLogout
  const heldLogout = new Promise(resolve => { releaseLogout = resolve })
  await page.route('https://fixture.supabase.co/auth/v1/logout**', async route => {
    logoutStarted = true; await heldLogout
    try { await route.fulfill({ status: 204, body: '' }) } catch { /* Test cleanup may close the page. */ }
  })
  let otherTab
  try {
    await page.goto('/account', { waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel('Your name')).toHaveValue('Private account name')
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect.poll(() => logoutStarted).toBe(true)
    expect(await page.evaluate(key => localStorage.getItem(key), AUTH_STORAGE_KEY)).not.toBeNull()
    otherTab = await context.newPage()
    await otherTab.route('https://fixture.supabase.co/**', route => route.fulfill({ status: 401, json: { message: 'Fixture provider calls are disabled.' } }))
    await otherTab.route('**/api/storefront/account/settings', serveSettings)
    await otherTab.route('**/api/storefront/account/history', serveHistory)
    await otherTab.goto('/account', { waitUntil: 'domcontentloaded' })
    await expect(otherTab.getByRole('heading', { name: 'Create an account or sign in' })).toBeVisible()
    await expect(otherTab.getByLabel('Your name')).toHaveCount(0)
  } finally { releaseLogout(); if (otherTab) await otherTab.close() }
})

test('sign-out closes an already-open account view in another tab', async ({ page, context }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  const serveSettings = route => route.fulfill({ json: { ok: true,
    settings: { displayName: 'Private account name', deliveryAddress: '', notifyInApp: true }, notifications: [] } })
  const serveHistory = route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } })
  await page.route('**/api/storefront/account/settings', serveSettings)
  await page.route('**/api/storefront/account/history', serveHistory)
  let logoutStarted = false, releaseLogout
  const heldLogout = new Promise(resolve => { releaseLogout = resolve })
  await page.route('https://fixture.supabase.co/auth/v1/logout**', async route => {
    logoutStarted = true; await heldLogout
    try { await route.fulfill({ status: 204, body: '' }) } catch { /* Test cleanup may close the page. */ }
  })
  let otherTab
  try {
    await page.goto('/account', { waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel('Your name')).toHaveValue('Private account name')
    otherTab = await context.newPage()
    await otherTab.route('https://fixture.supabase.co/**', route => route.fulfill({ status: 401, json: { message: 'Fixture provider calls are disabled.' } }))
    await otherTab.route('**/api/storefront/account/settings', serveSettings)
    await otherTab.route('**/api/storefront/account/history', serveHistory)
    await otherTab.goto('/account', { waitUntil: 'domcontentloaded' })
    await expect(otherTab.getByLabel('Your name')).toHaveValue('Private account name')
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect.poll(() => logoutStarted).toBe(true)
    await expect(otherTab.getByRole('heading', { name: 'Create an account or sign in' })).toBeVisible()
    await expect(otherTab.getByLabel('Your name')).toHaveCount(0)
  } finally { releaseLogout(); if (otherTab) await otherTab.close() }
})

test('sign-out reports failure without hiding the account when its shared guard cannot be saved', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'k2-account-signout-local-pending-v1') throw new DOMException('Synthetic quota error', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  let logoutCalls = 0
  await page.route('https://fixture.supabase.co/auth/v1/logout**', route => { logoutCalls++; return route.fulfill({ status: 204, body: '' }) })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Sign-out could not start safely' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
  expect(logoutCalls).toBe(0)
  await captureSignOutNotice(page, 'storage-refused')
})

test('a blocked sign-out keeps its retry when browser storage fails', async ({ page }) => {
  await seedExpressAccount(page, fakeJwt(expressActor))
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  let logoutStarted = false, releaseLogout
  const heldLogout = new Promise(resolve => { releaseLogout = resolve })
  await page.route('https://fixture.supabase.co/auth/v1/logout**', async route => {
    logoutStarted = true; await heldLogout
    await route.fulfill({ status: 204, body: '' }).catch(() => {})
  })
  try {
    await page.goto('/account', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
    await page.clock.install()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect.poll(() => logoutStarted).toBe(true)
    await page.clock.fastForward(15001)
    await page.evaluate(() => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (key, value) {
        if (key === 'k2-account-signout-local-pending-v1') throw new DOMException('Synthetic quota error', 'QuotaExceededError')
        return original.call(this, key, value)
      }
    })
    await page.getByRole('button', { name: 'Retry sign-out' }).click()
    await expect(page.getByRole('button', { name: 'Retry sign-out' })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: 'Sign-out could not be confirmed' })).not.toContainText('Your account is still signed in')
    await expect(page.getByLabel('Your name')).toHaveCount(0)
  } finally { releaseLogout() }
})

test('a new accepted session clears the previous local sign-out success', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  await page.route('https://fixture.supabase.co/auth/v1/logout**', route => route.fulfill({ status: 204, body: '' }))
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({ json: accountUser(expressActor) }))
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Signed out on this browser' })).toBeVisible()
  await page.evaluate(async accessToken => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const client = await customerAuthClient()
    const result = await client.auth.setSession({ access_token: accessToken, refresh_token: 'test-refresh-token' })
    if (result.error) throw result.error
  }, token)
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Signed out on this browser' })).toHaveCount(0)
})

test('sign-out does not claim success when the saved session has disappeared', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  let logoutCalls = 0
  await page.route('https://fixture.supabase.co/auth/v1/logout**', route => { logoutCalls++; return route.fulfill({ status: 204, body: '' }) })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
  await page.evaluate(key => localStorage.removeItem(key), AUTH_STORAGE_KEY)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Sign-out could not be confirmed' })).toBeVisible()
  expect(logoutCalls).toBe(0)
})

test('an SDK-ignored provider refusal does not claim remote sign-out was verified', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  await page.route('https://fixture.supabase.co/auth/v1/logout**', route => route.fulfill({ status: 403, json: { msg: 'Synthetic provider refusal' } }))
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Create an account or sign in' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Other sessions may still be active' })).toBeVisible()
})

test('an SDK-accepted sign-out with a cleared local session does not report an error', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  await page.route('https://fixture.supabase.co/auth/v1/logout**', route => route.fulfill({ status: 204, body: '' }))
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Create an account or sign in' })).toBeVisible()
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), AUTH_STORAGE_KEY)).toBeNull()
  await expect(page.getByRole('alert').filter({ hasText: 'Sign-out could not be confirmed' })).toHaveCount(0)
})

test('a late settings read cannot overwrite a newer saved profile', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({ json: accountUser(expressActor) }))
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  let reads = 0
  let releaseOld
  const heldOld = new Promise(resolve => { releaseOld = resolve })
  await page.route('**/api/storefront/account/settings', async route => {
    const body = route.request().postDataJSON()
    if (Object.keys(body).length) return route.fulfill({ json: { ok: true, settings: body, notifications: [] } })
    reads += 1
    const first = reads === 1
    if (first) await heldOld
    return route.fulfill({ headers: first ? { 'x-test-old': 'yes' } : {}, json: { ok: true,
      settings: { displayName: 'Before save', deliveryAddress: '', notifyInApp: true }, notifications: [] } })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect.poll(() => reads).toBeGreaterThanOrEqual(1)
  await page.evaluate(async accessToken => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const result = await (await customerAuthClient()).auth.setSession({ access_token: accessToken, refresh_token: 'test-refresh-token' })
    if (result.error) throw result.error
  }, token)
  await expect.poll(() => reads).toBeGreaterThanOrEqual(2)
  await expect(page.getByLabel('Your name')).toHaveValue('Before save')
  await page.getByLabel('Your name').fill('Saved customer')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect(page.getByText('Settings saved.', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Your name')).toHaveValue('Saved customer')
  const oldResponse = page.waitForResponse(response => response.headers()['x-test-old'] === 'yes')
  releaseOld()
  await (await oldResponse).finished()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByLabel('Your name')).toHaveValue('Saved customer')
  await expect(page.getByText('Settings saved.', { exact: true })).toBeVisible()
})

test('a settings read started during a save cannot undo its successful result', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({ json: accountUser(expressActor) }))
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  let saveStarted = false, holdNextRead = false, oldReadStarted = false
  let releaseSave, releaseOldRead
  let serverSettings = { displayName: 'Before save', deliveryAddress: '', notifyInApp: true }
  const heldSave = new Promise(resolve => { releaseSave = resolve })
  const heldRead = new Promise(resolve => { releaseOldRead = resolve })
  await page.route('**/api/storefront/account/settings', async route => {
    const body = route.request().postDataJSON()
    if (Object.keys(body).length) {
      saveStarted = true
      await heldSave
      serverSettings = body
      return route.fulfill({ json: { ok: true, settings: body, notifications: [] } })
    }
    const held = holdNextRead
    const snapshot = { ...serverSettings }
    if (held) { holdNextRead = false; oldReadStarted = true; await heldRead }
    return route.fulfill({ headers: held ? { 'x-test-during-save': 'yes' } : {}, json: { ok: true,
      settings: snapshot, notifications: [] } })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('Your name')).toHaveValue('Before save')
  await page.getByLabel('Your name').fill('Saved customer')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect.poll(() => saveStarted).toBe(true)
  holdNextRead = true
  await page.evaluate(async accessToken => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const result = await (await customerAuthClient()).auth.setSession({ access_token: accessToken, refresh_token: 'test-refresh-token' })
    if (result.error) throw result.error
  }, token)
  await expect.poll(() => oldReadStarted).toBe(true)
  releaseSave()
  await expect(page.getByText('Settings saved.', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Your name')).toHaveValue('Saved customer')
  const oldResponse = page.waitForResponse(response => response.headers()['x-test-during-save'] === 'yes')
  releaseOldRead()
  await (await oldResponse).finished()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByLabel('Your name')).toHaveValue('Saved customer')
})

test('a save from an earlier sign-in cannot replace newer settings after signing in again', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({ json: accountUser(expressActor) }))
  await page.route('https://fixture.supabase.co/auth/v1/logout**', route => route.fulfill({ status: 204, body: '' }))
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  let savedCount = 0, oldSaveStarted = false
  let releaseOldSave
  const heldOldSave = new Promise(resolve => { releaseOldSave = resolve })
  await page.route('**/api/storefront/account/settings', async route => {
    const body = route.request().postDataJSON()
    if (Object.keys(body).length) {
      savedCount += 1
      if (savedCount === 1) { oldSaveStarted = true; await heldOldSave }
      return route.fulfill({ headers: body.displayName === 'Earlier session' ? { 'x-test-old-save': 'yes' } : {},
        json: { ok: true, settings: body, notifications: [] } })
    }
    return route.fulfill({ json: { ok: true,
      settings: { displayName: 'Initial customer', deliveryAddress: '', notifyInApp: true }, notifications: [] } })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('Your name')).toHaveValue('Initial customer')
  await page.getByLabel('Your name').fill('Earlier session')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect.poll(() => oldSaveStarted).toBe(true)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Create an account or sign in' })).toBeVisible()
  await page.evaluate(async accessToken => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const result = await (await customerAuthClient()).auth.setSession({ access_token: accessToken, refresh_token: 'test-refresh-token' })
    if (result.error) throw result.error
  }, token)
  await expect(page.getByLabel('Your name')).toHaveValue('Initial customer')
  await page.getByLabel('Your name').fill('Current session')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect(page.getByText('Settings saved.', { exact: true })).toBeVisible()
  const oldResponse = page.waitForResponse(response => response.headers()['x-test-old-save'] === 'yes')
  releaseOldSave()
  await (await oldResponse).finished()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByLabel('Your name')).toHaveValue('Current session')
})

test('a delayed save reply cannot replace a newer settings read', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({ json: accountUser(expressActor) }))
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  let serverSettings = { displayName: 'Initial customer', deliveryAddress: '', notifyInApp: true }
  let saveStarted = false, releaseSave
  const heldSave = new Promise(resolve => { releaseSave = resolve })
  await page.route('**/api/storefront/account/settings', async route => {
    const body = route.request().postDataJSON()
    if (Object.keys(body).length) {
      serverSettings = body
      saveStarted = true
      await heldSave
      return route.fulfill({ headers: { 'x-test-delayed-save': 'yes' }, json: { ok: true, settings: body, notifications: [] } })
    }
    return route.fulfill({ json: { ok: true, settings: serverSettings, notifications: [] } })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('Your name')).toHaveValue('Initial customer')
  await page.getByLabel('Your name').fill('First device')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect.poll(() => saveStarted).toBe(true)
  serverSettings = { displayName: 'Newer device', deliveryAddress: '', notifyInApp: true }
  await page.evaluate(async accessToken => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const result = await (await customerAuthClient()).auth.setSession({ access_token: accessToken, refresh_token: 'test-refresh-token' })
    if (result.error) throw result.error
  }, token)
  await expect(page.getByLabel('Your name')).toHaveValue('First device')
  await expect(page.getByLabel('Your name')).toBeDisabled()
  const delayedResponse = page.waitForResponse(response => response.headers()['x-test-delayed-save'] === 'yes')
  releaseSave()
  await (await delayedResponse).finished()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByLabel('Your name')).toHaveValue('Newer device')
})

test('a stale settings read cannot make a marked notification unread again', async ({ page }) => {
  const token = fakeJwt(expressActor)
  const notificationId = '10000000-0000-4000-8000-000000000099'
  await seedExpressAccount(page, token)
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({ json: accountUser(expressActor) }))
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  let serverRead = false, markStarted = false, holdNextRead = false, oldReadStarted = false
  let releaseMark, releaseOldRead
  const heldMark = new Promise(resolve => { releaseMark = resolve })
  const heldRead = new Promise(resolve => { releaseOldRead = resolve })
  await page.route('**/api/storefront/account/settings', async route => {
    const snapshot = serverRead ? '2026-10-27T00:00:00Z' : null
    const held = holdNextRead
    if (held) { holdNextRead = false; oldReadStarted = true; await heldRead }
    return route.fulfill({ headers: held ? { 'x-test-old-unread': 'yes' } : {}, json: { ok: true,
      settings: { displayName: 'Buyer', deliveryAddress: '', notifyInApp: true },
      notifications: [{ id: notificationId, event_kind: 'staff_reply', public_reference: 'CV-TEST', created_at: '2026-10-01T00:00:00Z', read_at: snapshot }] } })
  })
  await page.route('**/api/storefront/account/notifications', async route => {
    markStarted = true; await heldMark; serverRead = true
    return route.fulfill({ json: { ok: true, receipt: { read: true } } })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Mark notification read' }).click()
  await expect.poll(() => markStarted).toBe(true)
  holdNextRead = true
  await page.evaluate(async accessToken => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const result = await (await customerAuthClient()).auth.setSession({ access_token: accessToken, refresh_token: 'test-refresh-token' })
    if (result.error) throw result.error
  }, token)
  await expect.poll(() => oldReadStarted).toBe(true)
  releaseMark()
  await expect.poll(() => serverRead).toBe(true)
  const oldResponse = page.waitForResponse(response => response.headers()['x-test-old-unread'] === 'yes')
  releaseOldRead()
  await (await oldResponse).finished()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByRole('button', { name: 'Mark notification read' })).toHaveCount(0)
  await expect(page.getByText('Read', { exact: true })).toBeVisible()
})

test('a delayed save cannot report success on a different customer account', async ({ page }) => {
  const actorB = '10000000-0000-4000-8000-000000000002'
  const tokenA = fakeJwt(expressActor), tokenB = fakeJwt(actorB)
  await seedExpressAccount(page, tokenA)
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({ json: accountUser(actorB) }))
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  let saveStarted = false, releaseSave
  const heldSave = new Promise(resolve => { releaseSave = resolve })
  await page.route('**/api/storefront/account/settings', async route => {
    const body = route.request().postDataJSON()
    const isA = route.request().headers().authorization === `Bearer ${tokenA}`
    if (Object.keys(body).length) {
      saveStarted = true; await heldSave
      return route.fulfill({ headers: { 'x-test-customer-a-save': 'yes' }, json: { ok: true, settings: body, notifications: [] } })
    }
    return route.fulfill({ json: { ok: true, settings: { displayName: isA ? 'Customer A' : 'Customer B', deliveryAddress: '', notifyInApp: true }, notifications: [] } })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('Your name')).toHaveValue('Customer A')
  await page.getByLabel('Your name').fill('Customer A saved')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect.poll(() => saveStarted).toBe(true)
  await page.evaluate(async accessToken => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const result = await (await customerAuthClient()).auth.setSession({ access_token: accessToken, refresh_token: 'test-refresh-token' })
    if (result.error) throw result.error
  }, tokenB)
  await expect(page.getByLabel('Your name')).toHaveValue('Customer B')
  const oldResponse = page.waitForResponse(response => response.headers()['x-test-customer-a-save'] === 'yes')
  releaseSave()
  await (await oldResponse).finished()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByLabel('Your name')).toHaveValue('Customer B')
  await expect(page.getByText('Settings saved.', { exact: true })).toHaveCount(0)
})

for (const newerFails of [false, true]) test(`superseded save reconciliation respects a newer ${newerFails ? 'failed' : 'successful'} read`, async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({ json: accountUser(expressActor) }))
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  let phase = 'initial', saveStarted = false, overlapStarted = false, reconcileStarted = false, newerDone = false
  let releaseSave, releaseOverlap, releaseReconcile
  const heldSave = new Promise(resolve => { releaseSave = resolve })
  const heldOverlap = new Promise(resolve => { releaseOverlap = resolve })
  const heldReconcile = new Promise(resolve => { releaseReconcile = resolve })
  const settings = { displayName: 'Current customer', deliveryAddress: '', notifyInApp: true }
  await page.route('**/api/storefront/account/settings', async route => {
    const body = route.request().postDataJSON()
    if (Object.keys(body).length) { saveStarted = true; await heldSave; return route.fulfill({ json: { ok: true, settings: body, notifications: [] } }) }
    if (phase === 'overlap') { phase = 'held'; overlapStarted = true; await heldOverlap; return route.fulfill({ json: { ok: true, settings, notifications: [] } }) }
    if (phase === 'reconcile') {
      phase = 'held'; reconcileStarted = true; await heldReconcile
      return route.fulfill({ status: newerFails ? 200 : 503, headers: { 'x-test-old-reconcile': 'yes' },
        json: newerFails ? { ok: true, settings, notifications: [] } : { error: { code: 'SERVICE_UNAVAILABLE' } } })
    }
    if (phase === 'newer') {
      phase = 'held'; newerDone = true
      return route.fulfill({ status: newerFails ? 503 : 200,
        json: newerFails ? { error: { code: 'SERVICE_UNAVAILABLE' } } : { ok: true, settings, notifications: [] } })
    }
    return route.fulfill({ json: { ok: true, settings, notifications: [] } })
  })
  const refreshSession = () => page.evaluate(async accessToken => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const result = await (await customerAuthClient()).auth.setSession({ access_token: accessToken, refresh_token: 'test-refresh-token' })
    if (result.error) throw result.error
  }, token)
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('Your name')).toHaveValue('Current customer')
  await page.getByLabel('Your name').fill('Saved customer')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect.poll(() => saveStarted).toBe(true)
  phase = 'overlap'; await refreshSession(); await expect.poll(() => overlapStarted).toBe(true)
  phase = 'reconcile'; releaseSave(); await expect.poll(() => reconcileStarted).toBe(true)
  phase = 'newer'; await refreshSession(); await expect.poll(() => newerDone).toBe(true)
  if (newerFails) await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  else { await expect(page.getByLabel('Your name')).toHaveValue('Saved customer'); await expect(page.getByLabel('Your name')).toBeDisabled() }
  const oldResponse = page.waitForResponse(response => response.headers()['x-test-old-reconcile'] === 'yes')
  releaseReconcile(); await (await oldResponse).finished(); releaseOverlap()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  if (newerFails) {
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
    await expect(page.getByLabel('Your name')).toHaveCount(0)
  } else {
    await expect(page.getByLabel('Your name')).toHaveValue('Current customer')
    await expect(page.getByText('Settings were saved, but the latest values could not be checked. Try again.', { exact: true })).toHaveCount(0)
  }
})

test('marking a notification read preserves unsaved profile edits', async ({ page }) => {
  const token = fakeJwt(expressActor), notificationId = '10000000-0000-4000-8000-000000000099'
  await seedExpressAccount(page, token)
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  let marked = false
  await page.route('**/api/storefront/account/settings', route => route.fulfill({ json: { ok: true,
    settings: { displayName: 'Saved name', deliveryAddress: 'Saved address', notifyInApp: true },
    notifications: [{ id: notificationId, event_kind: 'staff_reply', public_reference: 'CV-TEST', created_at: '2026-10-01T00:00:00Z', read_at: marked ? '2026-10-27T00:00:00Z' : null }] } }))
  await page.route('**/api/storefront/account/notifications', route => { marked = true; return route.fulfill({ json: { ok: true, receipt: { read: true } } }) })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Your name').fill('Unsaved name')
  await page.getByLabel('Saved delivery address').fill('Unsaved address')
  await page.getByRole('button', { name: 'Mark notification read' }).click()
  await expect(page.getByText('Read', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Your name')).toHaveValue('Unsaved name')
  await expect(page.getByLabel('Saved delivery address')).toHaveValue('Unsaved address')
})

test('a same-account refresh preserves unsaved profile edits', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({ json: accountUser(expressActor) }))
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  await page.route('**/api/storefront/account/settings', route => route.fulfill({ json: { ok: true,
    settings: { displayName: 'Saved name', deliveryAddress: 'Saved address', notifyInApp: true }, notifications: [] } }))
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Your name').fill('Unsaved name')
  await page.getByLabel('Saved delivery address').fill('Unsaved address')
  const refreshed = page.waitForResponse(response => response.url().includes('/account/settings') && response.request().postData() === '{}')
  await page.evaluate(async accessToken => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const result = await (await customerAuthClient()).auth.setSession({ access_token: accessToken, refresh_token: 'test-refresh-token' })
    if (result.error) throw result.error
  }, token)
  await (await refreshed).finished()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByLabel('Your name')).toHaveValue('Unsaved name')
  await expect(page.getByLabel('Saved delivery address')).toHaveValue('Unsaved address')
})

test('refreshing a linked account preserves an unsaved settings draft', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({ json: accountUser(expressActor) }))
  let holdHistory = false, refreshStarted = false, releaseHistory
  const heldHistory = new Promise(resolve => { releaseHistory = resolve })
  await page.route('**/api/storefront/account/history', async route => {
    if (holdHistory) { holdHistory = false; refreshStarted = true; await heldHistory }
    return route.fulfill({ json: accountExpressHistory() })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Your K2 records, in one place.' })).toBeVisible()
  await page.getByLabel('Your name').fill('Unsaved linked name')
  await page.getByLabel('Saved delivery address').fill('Unsaved linked address')
  holdHistory = true
  await page.evaluate(async accessToken => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const result = await (await customerAuthClient()).auth.setSession({ access_token: accessToken, refresh_token: 'test-refresh-token' })
    if (result.error) throw result.error
  }, token)
  await expect.poll(() => refreshStarted).toBe(true)
  await expect(page.getByRole('heading', { name: 'Your K2 records, in one place.' })).toBeVisible()
  releaseHistory()
  await expect(page.getByLabel('Your name')).toHaveValue('Unsaved linked name')
  await expect(page.getByLabel('Saved delivery address')).toHaveValue('Unsaved linked address')
})

test('a transient linked-history refresh error keeps the unsaved settings draft', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  let failRefresh = false
  await page.route('**/api/storefront/account/history', route => failRefresh
    ? route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE' } } })
    : route.fulfill({ json: accountExpressHistory() }))
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Your name').fill('Unsaved linked name')
  await page.getByLabel('Saved delivery address').fill('Unsaved linked address')
  failRefresh = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Account records are unavailable' })).toBeVisible()
  await expect(page.getByLabel('Your name')).toHaveValue('Unsaved linked name')
  await expect(page.getByLabel('Saved delivery address')).toHaveValue('Unsaved linked address')
  await expect(page.getByRole('heading', { name: 'Link this browser’s guest records' })).toHaveCount(0)
})

test('a late same-account history response cannot replace a newer history result', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({ json: accountUser(expressActor) }))
  let holdNext = false, oldStarted = false, releaseOld, latest = false
  const heldOld = new Promise(resolve => { releaseOld = resolve })
  await page.route('**/api/storefront/account/history', async route => {
    const old = holdNext
    if (old) { holdNext = false; oldStarted = true; await heldOld }
    const result = accountExpressHistory()
    result.history.orders[0].public_reference = old ? 'WEB-HISTORY-OLD' : latest ? 'WEB-HISTORY-NEW' : 'WEB-HISTORY-INITIAL'
    return route.fulfill({ headers: old ? { 'x-test-old-history': 'yes' } : {}, json: result })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('WEB-HISTORY-INITIAL', { exact: true })).toBeVisible()
  holdNext = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect.poll(() => oldStarted).toBe(true)
  latest = true
  await page.evaluate(async accessToken => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const result = await (await customerAuthClient()).auth.setSession({ access_token: accessToken, refresh_token: 'test-refresh-token' })
    if (result.error) throw result.error
  }, token)
  await expect(page.getByText('WEB-HISTORY-NEW', { exact: true })).toBeVisible()
  const oldResponse = page.waitForResponse(response => response.headers()['x-test-old-history'] === 'yes')
  releaseOld(); await (await oldResponse).finished()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByText('WEB-HISTORY-NEW', { exact: true })).toBeVisible()
  await expect(page.getByText('WEB-HISTORY-OLD', { exact: true })).toHaveCount(0)
})

test('linking guest records preserves an unsaved settings draft', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  let linked = false
  await page.route('**/api/storefront/account/history', route => linked
    ? route.fulfill({ json: accountExpressHistory() })
    : route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  await page.route('**/api/storefront/account/claim', route => { linked = true; return route.fulfill({ json: { ok: true, receipt: { claimed: true } } }) })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Your name').fill('Unsaved name before linking')
  await page.getByLabel('Saved delivery address').fill('Unsaved address before linking')
  await page.getByRole('button', { name: 'Link verified guest records' }).click()
  await expect(page.getByRole('heading', { name: 'Your K2 records, in one place.' })).toBeVisible()
  await expect(page.getByLabel('Your name')).toHaveValue('Unsaved name before linking')
  await expect(page.getByLabel('Saved delivery address')).toHaveValue('Unsaved address before linking')
})

test('settings fields cannot be changed while their save is pending', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, json: { error: { code: 'ACCOUNT_NOT_LINKED' } } }))
  let saveStarted = false, releaseSave
  const heldSave = new Promise(resolve => { releaseSave = resolve })
  await page.route('**/api/storefront/account/settings', async route => {
    const body = route.request().postDataJSON()
    if (Object.keys(body).length) { saveStarted = true; await heldSave; return route.fulfill({ json: { ok: true, settings: body, notifications: [] } }) }
    return route.fulfill({ json: { ok: true, settings: { displayName: 'Buyer', deliveryAddress: '', notifyInApp: true }, notifications: [] } })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Your name').fill('Saving buyer')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect.poll(() => saveStarted).toBe(true)
  await expect(page.getByLabel('Your name')).toBeDisabled()
  await expect(page.getByLabel('Saved delivery address')).toBeDisabled()
  await expect(page.getByLabel('Show account notifications')).toBeDisabled()
  releaseSave()
  await expect(page.getByLabel('Your name')).toBeEnabled()
})

test('a verified new customer can save profile settings and read a scoped notification before ordering', async ({ page }) => {
  test.setTimeout(120000)
  const accessToken = fakeJwt()
  await page.addInitScript(({ key, token }) => {
    localStorage.setItem(key, JSON.stringify({
      access_token: token, refresh_token: 'test-refresh-token', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '10000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated',
        email: 'buyer@example.com', email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    }))
  }, { key: AUTH_STORAGE_KEY, token: accessToken })
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: { code: 'ACCOUNT_NOT_LINKED' } }) }))
  let saved = null
  let readId = null
  const notificationId = '10000000-0000-4000-8000-000000000099'
  await page.route('**/api/storefront/account/settings', route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${accessToken}`)
    const body = route.request().postDataJSON()
    if (Object.keys(body).length) saved = body
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true,
      settings: saved || { displayName: '', deliveryAddress: '', notifyInApp: true },
      notifications: [{ id: notificationId, event_kind: 'staff_reply', public_reference: 'CV-0123456789ABCDEF', created_at: '2026-09-24T00:00:00Z', read_at: readId ? '2026-10-27T00:00:00Z' : null }],
    }) })
  })
  await page.route('**/api/storefront/account/notifications', route => {
    readId = route.request().postDataJSON().notificationId
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: { read: true } }) })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Your account settings' })).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('button', { name: 'Customer account, 1 unread notification' })).toBeVisible()
  await page.getByLabel('Your name').fill('Maria Prieto')
  await page.getByLabel('Saved delivery address').fill('Manila, Philippines')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect.poll(() => saved?.displayName).toBe('Maria Prieto')
  expect(saved.deliveryAddress).toBe('Manila, Philippines')
  await page.getByRole('button', { name: 'Mark notification read' }).click()
  await expect.poll(() => readId).toBe(notificationId)
  await expect(page.getByRole('button', { name: 'Customer account', exact: true })).toBeVisible()
  await expect(page.getByText('You can start shopping before linking guest records.')).toBeVisible()
})

test('customer account entry is phone-safe, passwordless, recoverable, and keeps primary mobile navigation at five', async ({ page, context }, testInfo) => {
  test.setTimeout(180000)
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.turnstile={render:(_,options)=>{options.callback('verified-test-token');return 1},remove:()=>{}}`,
  }))
  await page.route('**/api/storefront/account/auth/email', route => {
    expect(route.request().postDataJSON()).toEqual({ email: 'buyer@example.com', botToken: 'verified-test-token' })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('main')).toBeVisible({ timeout: 90000 })
  await page.getByRole('button', { name: 'Customer account' }).click()
  await expect(page.getByRole('heading', { name: 'Keep verified K2 history across devices.' })).toBeVisible({ timeout: 90000 })
  await expect(page.getByRole('navigation', { name: 'Mobile storefront' }).getByRole('link')).toHaveCount(5)
  await expect(page.getByLabel('Email address')).toBeVisible()
  await expect(page.getByText('Complete this check before K2 asks the sign-in provider to send a link or text code.')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toHaveCount(0)
  await expect(page.getByText(/VIP Login|Authenticate to unlock tier pricing/i)).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

  await context.setOffline(true)
  await expect(page.getByRole('status').filter({ hasText: 'You are offline' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeDisabled()
  await context.setOffline(false)
  await page.getByLabel('Email address').fill('buyer@example.com')
  await page.screenshot({ path: testInfo.outputPath('account-auth-turnstile-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Send sign-in link' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('account-email-sent-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
  await page.setViewportSize({ width: 812, height: 375 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await expect(page.getByRole('button', { name: 'Customer account' })).toBeVisible()
})

test('verified account claims once, loads only customer-visible history, and sends an authenticated bounded reply', async ({ page }, testInfo) => {
  const accessToken = fakeJwt()
  await page.addInitScript(({ key, token }) => {
    localStorage.setItem(key, JSON.stringify({
      access_token: token, refresh_token: 'test-refresh-token', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: '10000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated',
        email: 'buyer@example.com', email_confirmed_at: new Date().toISOString(),
        app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString(),
      },
    }))
  }, { key: AUTH_STORAGE_KEY, token: accessToken })
  let linked = false
  let replyBody = null
  await page.route('**/api/storefront/account/history', async route => {
    const authorization = route.request().headers().authorization
    expect(authorization).toBe(`Bearer ${accessToken}`)
    if (!linked) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: { code: 'ACCOUNT_NOT_LINKED' } }) })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, history: {
      linked_at: '2026-08-22T07:00:00Z',
      orders: [
        { public_reference: 'WEB-A19X7K2Q', status: 'confirmed', payment_status: 'not_requested', shipping_quote_status: 'customer_confirmed', total_amount: 1234.5, created_at: '2026-08-22T07:00:00Z' },
        { public_reference: 'WEB-PENDING', status: 'submitted', payment_status: 'not_requested', shipping_quote_status: 'pending_quote', total_amount: 735, created_at: '2026-08-22T07:00:00Z' },
      ],
      pasabuy_requests: [{ public_reference: 'PB-Q81M4K2Z', status: 'researching', item_title: 'Italian pantry item', quantity: 2, created_at: '2026-08-22T07:00:00Z' }],
      conversations: [{ conversation_reference: 'CV-0123456789ABCDEF', channel: 'Website', status: 'Open', last_message_at: '2026-08-22T07:05:00Z', messages: [{ direction: 'outbound', content: 'Customer-visible reply', delivery_status: 'sent', created_at: '2026-08-22T07:05:00Z' }] }],
    } }) })
  })
  await page.route('**/api/storefront/account/claim', route => {
    const body = route.request().postDataJSON()
    expect(Object.keys(body).sort()).toEqual(['contactKind','idempotencyKey'].sort())
    expect(body.contactKind).toBe('email')
    linked = true
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: { claimed: true, guest_access_revoked: true, linked_at: '2026-08-22T07:00:00Z' } }) })
  })
  await page.route('**/api/storefront/account/message', route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${accessToken}`)
    replyBody = route.request().postDataJSON()
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: { message_status: 'received', created_at: '2026-08-22T07:06:00Z' } }) })
  })

  await page.goto('/?account=continue', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Link this browser’s guest records' })).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: 'Link verified guest records' }).click()
  await expect(page.getByRole('heading', { name: 'Your K2 records, in one place.' })).toBeVisible()
  await expect(page.getByText('WEB-A19X7K2Q')).toBeVisible()
  await expect(page.getByText('Final total pending', { exact: true })).toBeVisible()
  await expect(page.getByText('₱1,234.50', { exact: true })).toBeVisible()
  await expect(page.getByText('₱735.00', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Private staff note')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('account-linked-mobile.png'), fullPage: true })
  await page.getByLabel('Reply').fill('Please confirm my delivery status.')
  await page.getByRole('button', { name: 'Record reply' }).click()
  await expect.poll(() => replyBody).not.toBeNull()
  expect(replyBody).toMatchObject({ conversationReference: 'CV-0123456789ABCDEF', message: 'Please confirm my delivery status.' })
  expect(replyBody.customerId).toBeUndefined()
  expect(replyBody.userId).toBeUndefined()
})
