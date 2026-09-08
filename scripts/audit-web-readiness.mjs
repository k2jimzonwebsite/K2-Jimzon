// Read-only rendered audit. Fabricated catalog, blocked external traffic, no providers.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
const root = process.cwd()
const out = path.join(root, '.tools/readiness-audit-20260906')
fs.mkdirSync(out, { recursive: true })
const base = 'http://127.0.0.1:5196'
let occupied=false
try { await fetch(base,{signal:AbortSignal.timeout(1000)}); occupied=true } catch {}
if(occupied)throw new Error('Audit port 5196 is occupied; refuse to reuse an unidentified server.')
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--mode', 'combined', '--host', '127.0.0.1', '--port', '5196', '--strictPort', '--configLoader', 'runner'], {
 cwd: root, windowsHide: true, stdio: 'ignore', env: { ...process.env, VITE_SUPABASE_URL: 'https://audit-fixture.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'audit-public-fixture', VITE_GUEST_BFF_ENABLED: 'false', VITE_ADMIN_BFF_ENABLED: 'false' },
})
let browser
const reports=[]
try {
 for(let n=0;n<100;n++){ if(server.exitCode!==null)throw new Error('Audit server exited before readiness'); try{if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok)break}catch{} await new Promise(r=>setTimeout(r,300)) }
 browser=await chromium.launch()
 const context=await browser.newContext({ reducedMotion:'reduce' })
 const products=[['audit-coffee','Audit Italian coffee',550,'2026-09-04'],['audit-pasta','Audit Italian pasta',150,'2026-09-05'],['audit-spread','Audit pistachio spread',735,'2026-09-06']].map(([sku,name,srp,created_at])=>({sku,name,srp,created_at,status:'Live',stock_available:5,primary_image_url:'/images/placeholder.svg',secondary_images:[],lifestyle_images:[],description:'Fabricated audit product. Not a live listing.',country_of_origin:'Italy'}))
 await context.route('**/*', async route=>{
  const url=new URL(route.request().url())
  if(url.hostname==='audit-fixture.supabase.co') {
   const table=url.pathname.split('/').pop()
   const data=table==='products'?products:table==='v_product_stock_from_batches'?products.map(p=>({sku:p.sku,stock_from_batches:5})):[]
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)})
  }
  if(url.origin!==base)return route.abort()
  return route.continue()
 })
 const page=await context.newPage()
 const errors=[]; page.on('pageerror',e=>errors.push(e.message))
 for(const width of [375,1440]){
  await page.setViewportSize({width,height:900})
  for(const route of (process.argv.includes('--focused') ? ['/','/store','/product/audit-coffee','/catalog'] : ['/','/catalog','/product/audit-coffee','/pasabuy','/trade','/contact','/account','/messages','/checkout','/confirmation','/missing-audit-route','/admin'])){
   const before=errors.length
   try{
    await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:120000})
    await page.locator('h1').first().waitFor({state:'visible',timeout:120000}).catch(()=>{})
    const snapshot=await page.evaluate(()=>({
     title:document.title,h1:[...document.querySelectorAll('h1')].map(e=>e.textContent.trim()),
     main:document.querySelectorAll('main').length,overflow:document.documentElement.scrollWidth>innerWidth,
     text:document.body.innerText.slice(0,10000),
     unnamedInputs:[...document.querySelectorAll('input,select,textarea')].filter(e=>e.type!=='hidden'&&e.getBoundingClientRect().width&&!e.labels?.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')).map(e=>({tag:e.tagName,type:e.type,placeholder:e.placeholder})),
     shortTargets:[...document.querySelectorAll('button,a,input,select')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<44||r.height<44)}).map(e=>({text:(e.textContent||e.getAttribute('aria-label')||e.placeholder||'').trim().slice(0,70),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)})).slice(0,25),
    }))
    reports.push({width,route,...snapshot,errors:errors.slice(before)})
    if(['/','/catalog','/product/audit-coffee','/admin','/store'].includes(route))await page.screenshot({path:path.join(out,`${width}-${route.replaceAll('/','_')||'home'}${process.argv.includes('--focused')?'-viewport':''}.png`),fullPage:!process.argv.includes('--focused')})
    console.log(JSON.stringify({width,route,h1:snapshot.h1,overflow:snapshot.overflow,unnamed:snapshot.unnamedInputs.length,short:snapshot.shortTargets.length,errors:errors.slice(before)}))
   }catch(e){reports.push({width,route,failure:e.message});console.log(JSON.stringify({width,route,failure:e.message}))}
  }
 }
 fs.writeFileSync(path.join(out,process.argv.includes('--focused')?'focused-results.json':'rendered-results.json'),JSON.stringify({scope:'isolated fabricated catalog; no live provider or authenticated staff evidence',reports},null,2))
}finally{await browser?.close();server.kill()}
