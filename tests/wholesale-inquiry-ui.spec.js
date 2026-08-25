import { expect,test } from '@playwright/test'

test('secure wholesale inquiry returns only a server receipt and no commercial authority',async({page})=>{
  let requestBody=null
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**',route=>route.fulfill({contentType:'application/javascript',body:`window.turnstile={render:(_,options)=>{options.callback('verified-test-token');return 1},remove:()=>{}}`}))
  await page.route('**/api/storefront/wholesale',async route=>{
    requestBody=route.request().postDataJSON()
    await route.fulfill({status:201,contentType:'application/json',headers:{'Set-Cookie':'k2_guest_access='+('a'.repeat(64))+'; Path=/; HttpOnly; SameSite=Lax'},body:JSON.stringify({ok:true,receipt:{public_reference:'WI-0123456789ABCDEF',conversation_reference:'CV-0123456789ABCDEF',status:'submitted',created_at:'2026-08-22T08:00:00Z',pricing_approved:false,credit_approved:false,terms_approved:false}})})
  })
  await page.goto('/',{waitUntil:'domcontentloaded'})
  await expect(page.getByRole('main')).toBeVisible({timeout:30000})
  await page.getByRole('navigation',{name:'Mobile storefront'}).getByRole('button',{name:'Wholesale'}).click()
  await expect(page.getByRole('heading',{name:/Start a traceable business-supply inquiry/i})).toBeVisible({timeout:15000})
  await page.getByLabel(/Registered Company Name/i).fill('Launch Test Cafe')
  await page.getByLabel(/Contact Person Full Name/i).fill('Maria Buyer')
  await page.getByLabel(/Work Email/i).fill('buyer@example.com')
  await page.getByLabel(/Mobile.*WhatsApp.*Viber/i).fill('09171234567')
  await page.getByLabel(/Delivery City.*Area/i).fill('Makati City')
  await page.getByLabel(/Target Italian Items/i).fill('Coffee beans, 30 units')
  await page.getByLabel(/I am authorized to make this inquiry/i).check()
  await expect(page.getByRole('button',{name:'Record Wholesale Inquiry'})).toBeEnabled({timeout:10000})
  await page.getByRole('button',{name:'Record Wholesale Inquiry'}).click()
  await expect(page.getByRole('heading',{name:'Inquiry recorded'})).toBeVisible()
  await expect(page.getByText(/WI-0123456789ABCDEF.*CV-0123456789ABCDEF/)).toBeVisible()
  await expect(page.getByText(/does not approve a business account, wholesale pricing, stock, credit/i)).toBeVisible()
  expect(requestBody).toMatchObject({organizationName:'Launch Test Cafe',customerName:'Maria Buyer',deliveryArea:'Makati City',targetItems:'Coffee beans, 30 units',botToken:'verified-test-token'})
  for(const key of ['pricingApproved','creditLimit','termsApproved','customerId','organizationId','registrationNumber']) expect(requestBody).not.toHaveProperty(key)
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
})
