
import { chromium } from 'playwright'
import fs from 'node:fs'
const out='outputs/storefront-mobile-audit-20261024'
const products=[0,1,2,3,4,5].map(i=>({sku:`mobile-audit-${i}`,name:i===0?'Siciliani Pistacchio Crunchy Italian Cream with Chopped Pistachios 200 g':`G. Bellini Italian Eau de Parfum for Everyday Wear ${75+i} ml`,status:'Live',srp:499+i*100,wholesale_price:449+i*100,subcategory:i?'Fragrances':'Sweet spreads',brand_id:'Audit Brand',description:'Product description for a hermetic presentation audit. Not a live listing.',primary_image_url:'/images/placeholder.svg',secondary_images:[],lifestyle_images:[],created_at:'2026-10-24T00:00:00Z'}))

const browser=await chromium.launch({headless:true})
try{
const page=await browser.newPage({viewport:{width:320,height:812},reducedMotion:'reduce'})
await page.route('https://**/*',r=>r.abort())
await page.route('**/rest/v1/**',r=>r.fulfill({json:[]}))
await page.route('**/api/**',r=>r.fulfill({json:r.request().url().endsWith('/status')?{ok:true,orders:[{public_reference:'AUDIT-ONLY',total_amount:499,shipping_quote_status:'customer_confirmed',delivery_review_required:false,status:'submitted',payment_status:'awaiting_instructions'}]}:{ok:true,receipt:{public_reference:'AUDIT-ONLY',total_amount:499,shipping_quote_status:'customer_confirmed',delivery_review_required:false,order_status:'submitted',payment_status:'awaiting_instructions',messages:[]}}}))

await page.goto('http://127.0.0.1:5499/catalog',{waitUntil:'networkidle'})
await page.evaluate(()=>document.documentElement.style.fontSize='200%')
console.log(JSON.stringify(await page.locator('header button').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>({name:e.getAttribute('aria-label')||e.textContent,rect:e.getBoundingClientRect().toJSON()})))))
await page.screenshot({path:'outputs/storefront-mobile-audit-20261024/enlarged-header-before.png'})
}finally{await browser.close()}
