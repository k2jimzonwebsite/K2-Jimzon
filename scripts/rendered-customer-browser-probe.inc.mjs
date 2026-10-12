// MAP-018: same canonical synthetic product, separate actual Storefront process.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fork} from 'node:child_process'
import {chromium} from 'playwright'
import {expect} from '@playwright/test'

export async function renderedCustomerBrowserProbe({sku,name,publicUrl,report,out,readOrder,readOrderItems,readStock}){
 const origin='http://127.0.0.1:54398',caseName=path.basename(out)
 assert.match(caseName,/^oci-imported-media\d{2}$/)
 assert.equal(process.env.SUPABASE_URL,'https://127.0.0.1:54395')
 const result=report.customerBrowser={scope:'Actual separate local Storefront catalog/product/cart/pickup quote and guest order recovery on same canonical Admin product. Synthetic contact and stock, public test bot widget. No real payment, fulfillment, provider, hosted or human acceptance.',stage:'start',checks:[]}
 let worker,browser,context,logs=''
 try{
  const visible=await fetch(process.env.SUPABASE_URL+'/rest/v1/v_storefront_visible_skus?select=sku&sku=eq.'+encodeURIComponent(sku),{headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+process.env.SUPABASE_PUBLISHABLE_KEY}})
  assert.equal(visible.status,200);assert.deepEqual(await visible.json(),[{sku}])
  result.checks.push('actual_anonymous_narrow_website_projection_exact_same_sku')
  const env=Object.fromEntries(['Path','PATH','SystemRoot','WINDIR','TEMP','TMP','COMSPEC'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]))
  Object.assign(env,{NODE_ENV:'development',NODE_EXTRA_CA_CERTS:path.resolve('.tools',caseName+'-cert.pem'),SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY,K2_GUEST_BFF_SECRET:Buffer.alloc(32,1).toString('base64'),K2_DEPLOYMENT_TARGET:'storefront',K2_STOREFRONT_BFF_ENABLED:'true',K2_STOREFRONT_ORIGINS:origin,K2_TURNSTILE_ALLOW_UNCONFIGURED:'true',VITE_SUPABASE_URL:process.env.SUPABASE_URL,VITE_SUPABASE_PUBLISHABLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY,VITE_GUEST_BFF_ENABLED:'true',VITE_CUSTOMER_ACCOUNT_ENABLED:'false',VITE_ADMIN_BFF_ENABLED:'false',VITE_IS_ADMIN_DEPLOYMENT:'false',VITE_TURNSTILE_SITE_KEY:'1x00000000000000000000AA'})
  env.VITE_SUPABASE_PUBLIC_KEY=env.SUPABASE_PUBLISHABLE_KEY;env.K2_ACCEPTANCE_NO_WATCH='true'
  worker=fork(path.resolve('scripts/storefront-fixture-worker.mjs'),[],{env,windowsHide:true,stdio:['ignore','pipe','pipe','ipc']})
  worker.stdout.on('data',value=>{logs=(logs+value).slice(-4000)});worker.stderr.on('data',value=>{logs=(logs+value).slice(-4000)})
  result.workerPid=worker.pid
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('LOCAL_STOREFRONT_START_TIMEOUT')),30000)
   worker.once('error',error=>{clearTimeout(timer);reject(error)})
   worker.once('exit',()=>{clearTimeout(timer);reject(new Error('LOCAL_STOREFRONT_EXIT_BEFORE_READY'))})
   worker.once('message',message=>{clearTimeout(timer);message.ready===true?resolve():reject(new Error('LOCAL_STOREFRONT_INVALID_READY'))})
  })
  browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce',ignoreHTTPSErrors:true})
  assert.deepEqual(await context.cookies(),[])
  const page=await context.newPage();page.setDefaultTimeout(30000)
  await page.route('**/*',route=>{const url=new URL(route.request().url());return ['127.0.0.1','localhost','challenges.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)||['data:','blob:'].includes(url.protocol)?route.continue():route.abort()})
  result.stage='product';await page.goto(origin+'/product/'+encodeURIComponent(sku),{waitUntil:'domcontentloaded'})
  await expect(page.getByRole('heading',{level:1,name,exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:/^Add to cart/})).toBeEnabled()
  await expect(page.getByRole('button',{name:/^Add to cart/})).toContainText('100')
  await expect.poll(()=>page.locator('img').evaluateAll((elements,url)=>elements.some(image=>image.src===url&&image.complete&&image.naturalWidth>0),publicUrl)).toBe(true)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  await page.screenshot({path:path.join(out,'customer-product-375.png')})
  result.checks.push('anonymous_same_sku_name_price_stock_and_owned_image_rendered')
  await page.getByRole('button',{name:/^Add to cart/}).click()
  await page.getByRole('dialog',{name:'Shopping cart'}).getByRole('button',{name:'Review order request',exact:true}).click()
  result.stage='checkout'
  await page.getByLabel('Full name',{exact:true}).fill('Explicit synthetic integration buyer')
  await page.getByLabel('Email address',{exact:true}).fill('rendered-integration@example.invalid')
  await page.getByRole('radio',{name:/K2 Warehouse Pickup/}).check()
  await page.getByRole('checkbox',{name:/I accept.*warehouse pickup/}).check()
  await page.waitForFunction(()=>Boolean(document.querySelector('[name="cf-turnstile-response"]')?.value),{},{timeout:60000})
  await page.screenshot({path:path.join(out,'customer-checkout-375.png')})
  let firstBody,committed,used=false;const callbackErrors=[]
  const orderPath='**/api/storefront/order'
  await page.route(orderPath,async route=>{
   if(route.request().method()!=='POST'||used)return route.fallback()
   used=true
   try{firstBody=route.request().postDataJSON();const response=await route.fetch();assert.equal(response.status(),201);committed=(await response.json()).receipt}
   catch(error){callbackErrors.push(error.message)}
   finally{await route.abort('failed').catch(error=>callbackErrors.push(error.message))}
  })
  await page.getByRole('button',{name:'Submit order request',exact:true}).click()
  await expect(page.getByRole('button',{name:'Retry order request',exact:true})).toBeEnabled()
  assert.deepEqual(callbackErrors,[]);assert.ok(committed.public_reference)
  assert.deepEqual(firstBody.items,[{sku,quantity:1}]);assert.equal(firstBody.fulfillmentMethod,'K2 Warehouse Pickup')
  const pending=await page.evaluate(()=>localStorage.getItem('k2-checkout-recovery-v1'))
  assert.equal(JSON.parse(pending).state,'pending');assert.equal(JSON.parse(pending).key,firstBody.idempotencyKey)
  await page.unroute(orderPath);await page.reload()
  assert.equal(await page.evaluate(()=>localStorage.getItem('k2-checkout-recovery-v1')),pending)
  await page.waitForFunction(()=>Boolean(document.querySelector('[name="cf-turnstile-response"]')?.value),{},{timeout:60000})
  const responsePromise=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/storefront/order'&&response.request().method()==='POST');void responsePromise.catch(()=>{})
  await page.getByRole('button',{name:'Retry order request',exact:true}).click()
  const response=await responsePromise;assert.equal(response.status(),201)
  const retry=response.request().postDataJSON(),withoutBot=body=>Object.fromEntries(Object.entries(body).filter(([key])=>key!=='botToken'))
  assert.deepEqual(withoutBot(retry),withoutBot(firstBody))
  const receipt=(await response.json()).receipt;assert.deepEqual(receipt,committed)
  await page.waitForURL(/\/confirmation/);await page.getByText(receipt.public_reference,{exact:true}).first().waitFor()
  const orders=await readOrder(firstBody.idempotencyKey);assert.equal(orders.length,1);assert.equal(orders[0].public_reference,receipt.public_reference);assert.equal(Number(orders[0].total_amount),100)
  assert.match(orders[0].id,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);assert.deepEqual(await readOrderItems(orders[0].id),[{sku,quantity:1}])
  const stock=await readStock();assert.equal(stock.reduce((sum,row)=>sum+Number(row.quantity),0),6);assert.equal(stock.reduce((sum,row)=>sum+Number(row.reserved_quantity),0),1)
  result.receipt={publicReference:receipt.public_reference,totalAmount:100,idempotencyKey:firstBody.idempotencyKey,canonicalOrders:1,physicalQuantity:6,reservedQuantity:1}
  const cookies=await context.cookies();assert.ok(cookies.some(cookie=>cookie.name==='k2_guest_access'&&cookie.httpOnly));assert.equal(cookies.some(cookie=>cookie.name.startsWith('k2_admin_')),false)
  result.checks.push('actual_pickup_quote_acceptance_and_guest_order_lost_after_commit_reload_same_payload_key_receipt_one_hold')
  await page.screenshot({path:path.join(out,'customer-confirmation-375.png')});result.stage='complete';result.passed=true
 }catch(error){result.passed=false;result.failure={name:error.name,message:error.message.slice(0,2000)};if(context){const page=context.pages()[0];if(page){await page.screenshot({path:path.join(out,'customer-failure.png')}).catch(()=>{});result.failureText=(await page.locator('body').innerText().catch(()=>'' )).slice(-7000)}}throw error}
 finally{
  try{if(context)await context.close()}
  finally{
   try{if(browser)await browser.close()}
   finally{
    if(worker){
     const exited=new Promise(resolve=>worker.exitCode!==null||worker.signalCode!==null?resolve():worker.once('exit',resolve))
     const timer=setTimeout(()=>{try{worker.kill()}catch{}},10000)
     try{if(worker.connected)worker.send('stop',()=>{})}catch(error){result.workerStopError=error.message}
     await exited;clearTimeout(timer);result.workerStopped=true;result.workerExit=worker.exitCode;result.workerSignal=worker.signalCode
    }
    fs.writeFileSync(path.join(out,'storefront-worker.log'),logs)
   }
  }
 }
}
