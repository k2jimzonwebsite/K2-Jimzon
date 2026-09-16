import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { signedRpcArguments, publicFailure } from '../../../server/storefront-bff/security.js'
import { readAdminCustomers } from '../../../server/admin-bff/customers.js'

const root = new URL('./', import.meta.url)
const result = { scope: 'Synthetic loopback browser and actual exported helpers; no provider traffic', checks: [] }
const customerRows = [{ id:'customer-a',display_name:'Synthetic audit customer',customer_accounts:[],customer_contact_points:[],channel_identities:[] }]
const cappedOrders = Array.from({length:2000},(_,i)=>({id:`order-${i}`,customer_id:'customer-a',total_amount:10,status:'submitted'}))
const fakeClient = {from(table){const query={select(){return query},order(){return query},in(){return query},limit(){return Promise.resolve({data:table==='customers'?customerRows:table==='order_requests'?cappedOrders:[],error:null})}};return query}}
const customerRead = await readAdminCustomers(fakeClient)
result.checks.push({check:'customer-capped-metrics',sourceHasMoreThanCap:true,returnedRows:2000,metricsAvailable:customerRead.metricsAvailable,metrics:customerRead.customers[0].metrics})
process.env.K2_GUEST_BFF_SECRET = Buffer.alloc(32, 7).toString('base64')
for (const cookie of ['', 'unrelated=%', 'k2_guest_access=%E0%A4%A']) {
  try {
    signedRpcArguments({ headers: { cookie }, socket: { remoteAddress: '127.0.0.1' } }, 'coupon', { couponCode: 'AUDIT' })
    result.checks.push({ check: 'guest-cookie', cookie, outcome: 'signed' })
  } catch (error) {
    result.checks.push({ check: 'guest-cookie', cookie, outcome: error.name, response: publicFailure(error) })
  }
}
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  let gallery = ['/images/placeholder.svg', '/images/placeholder.svg?second']
  const product = () => ({ sku: 'audit-product', name: 'Audit Italian pantry item', status: 'Live', published: true,
    srp: 735, wholesale_price: 620, primary_image_url: '/images/placeholder.svg', secondary_images: gallery,
    description: 'Synthetic audit product.', country_of_origin: 'Italy', created_at: '2026-09-14T00:00:00Z' })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort()
    if (url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.split('/').pop()
      const body = table === 'products' ? [product()] : table === 'v_product_stock_from_batches'
        ? [{ sku: 'audit-product', stock_from_batches: 5 }] : []
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    }
    return route.continue()
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5199/product/audit-product', { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { level: 1, name: 'Audit Italian pantry item' }).waitFor({ timeout: 90000 })
  const dimensions = [[320,740],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1024,900],[1280,900],[1440,900],[1920,1080]]
  for (const [width,height] of dimensions) {
    await page.setViewportSize({ width,height })
    const measurements = await page.evaluate(() => {
      const h1 = document.querySelector('main h1')?.getBoundingClientRect()
      const targets = [...document.querySelectorAll('main button')].map(el => {
        const r = el.getBoundingClientRect()
        return { text: el.textContent.trim().slice(0,60), name: el.getAttribute('aria-label'), width:r.width,height:r.height }
      }).filter(t => t.width > 0 && t.height > 0 && (t.width < 44 || t.height < 44))
      return { scrollWidth:document.documentElement.scrollWidth, viewport:innerWidth,h1Top:h1?.top,smallTargets:targets }
    })
    result.checks.push({ check:'product-responsive',width,height,...measurements })
    if ([390,1440].includes(width)) await page.screenshot({ path:fileURLToPath(new URL(`product-${width}.png`,root)),fullPage:true })
  }
  await page.getByRole('button', { name:'Go to slide 2' }).click()
  gallery = []
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await page.getByText(/Something went wrong|couldn.t load|try again/i).first().waitFor({ timeout:15000 }).catch(() => {})
  result.checks.push({ check:'gallery-shrink',errors,body:(await page.locator('body').innerText()).slice(0,1800) })
  const checkout = await context.newPage()
  await checkout.addInitScript(() => {
    window.turnstile={render:(_,options)=>{queueMicrotask(()=>options.callback('synthetic-audit-token'));return 'audit-widget'},remove:()=>{}}
  })
  const submissions=[]
  await checkout.route('**/api/storefront/order',async route=>{
    submissions.push(route.request().postDataJSON())
    if(submissions.length===1) return route.abort('failed')
    return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:{code:'IDEMPOTENCY_CONFLICT'}})})
  })
  await checkout.goto('http://127.0.0.1:5199/product/audit-product',{waitUntil:'domcontentloaded'})
  await checkout.getByRole('button',{name:/Add to cart/}).waitFor({timeout:60000})
  await checkout.getByRole('button',{name:/Add to cart/}).click()
  const cart=checkout.getByRole('dialog',{name:'Shopping cart'})
  await cart.waitFor({timeout:30000})
  const cartActions=await cart.getByRole('button').allTextContents()
  result.checks.push({check:'cart-actions',cartActions})
  await cart.getByRole('button',{name:/checkout|review|request/i}).last().click()
  await checkout.getByLabel('Full name',{exact:true}).fill('Audit Customer')
  await checkout.getByLabel('Email address',{exact:true}).fill('audit@example.com')
  await checkout.getByLabel('Delivery address',{exact:true}).fill('Synthetic Manila address')
  await checkout.getByRole('button',{name:'Submit order request',exact:true}).click()
  await checkout.getByRole('alert').waitFor()
  await checkout.getByLabel('Full name',{exact:true}).fill('Changed Audit Customer')
  await checkout.getByRole('button',{name:'Submit order request',exact:true}).click()
  await checkout.getByRole('alert').filter({hasText:'The request could not be completed'}).waitFor()
  result.checks.push({check:'checkout-lost-response-edit',submissions,sameKey:submissions[0].idempotencyKey===submissions[1].idempotencyKey,alert:await checkout.getByRole('alert').innerText()})
  await context.close()
} finally {
  await browser.close()
  writeFileSync(new URL('probe-results.json',root),JSON.stringify(result,null,2))
}
console.log(JSON.stringify(result,null,2))
