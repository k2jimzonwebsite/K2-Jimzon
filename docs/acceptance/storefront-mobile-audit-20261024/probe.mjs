
import { chromium } from 'playwright'
import fs from 'node:fs'
const out='outputs/storefront-mobile-audit-20261024'
const products=[0,1,2,3,4,5].map(i=>({sku:`mobile-audit-${i}`,name:i===0?'Siciliani Pistacchio Crunchy Italian Cream with Chopped Pistachios 200 g':`G. Bellini Italian Eau de Parfum for Everyday Wear ${75+i} ml`,status:'Live',srp:499+i*100,wholesale_price:449+i*100,subcategory:i?'Fragrances':'Sweet spreads',brand_id:'Audit Brand',description:'Product description for a hermetic presentation audit. Not a live listing.',primary_image_url:'/images/placeholder.svg',secondary_images:[],lifestyle_images:[],created_at:'2026-10-24T00:00:00Z'}))
const paths=['/','/catalog','/product/mobile-audit-0','/pasabuy','/trade','/contact','/messages','/account','/checkout','/confirmation','/privacy','/terms','/returns','/policies','/missing-mobile-audit','/store']
const browser=await chromium.launch({headless:true})
const results=[]
try {
 for(const width of [320,375]) for(const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width,height:812},reducedMotion:'reduce'})
  await context.addInitScript(({theme})=>{localStorage.setItem('theme',theme);localStorage.setItem('k2_cart_v1',JSON.stringify([{id:'mobile-audit-0',qty:1}]))},{theme})
  const page=await context.newPage()
  await page.route('https://**/*',r=>r.abort())
  await page.route('**/rest/v1/**',r=>{
   const table=new URL(r.request().url()).pathname.split('/').pop()
   return r.fulfill({json:table==='products'?products:table==='v_storefront_visible_skus'?products.map(p=>({sku:p.sku})):table==='v_product_stock_from_batches'?products.map(p=>({sku:p.sku,stock_from_batches:5})):[]})
  })
  await page.route('**/api/**',r=>r.fulfill({status:503,json:{error:'Audit fixture unavailable state'}}))
  for(const path of paths) {
   const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError)
   try{
    await page.goto('http://127.0.0.1:5499'+path,{waitUntil:'networkidle',timeout:30000})
    await page.locator('h1').first().waitFor({timeout:10000}).catch(()=>{})
    const data=await page.evaluate(()=>{
     const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}
     const isRail=e=>{for(let p=e.parentElement;p;p=p.parentElement){if(/auto|scroll/.test(getComputedStyle(p).overflowX)&&p.scrollWidth>p.clientWidth)return true}return false}
     const identify=e=>({tag:e.tagName,text:(e.innerText||e.getAttribute('aria-label')||e.placeholder||'').trim().slice(0,100),cls:e.className?.baseVal??e.className})
     const over=[...document.querySelectorAll('main *,section *,form *,[role="dialog"] *')].filter(e=>visible(e)&&!isRail(e)&&!e.closest('svg')&&e.tagName!=='CANVAS').filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+2||r.left< -2}).slice(0,12).map(identify)
     const small=[...document.querySelectorAll('button,input:not([type="checkbox"]):not([type="radio"]),select,textarea')].filter(e=>visible(e)&&!e.closest('svg')).filter(e=>{const r=e.getBoundingClientRect();return r.height<43.5||r.width<43.5}).slice(0,24).map(e=>({...identify(e),w:Math.round(e.getBoundingClientRect().width),h:Math.round(e.getBoundingClientRect().height)}))
     const textclip=[...document.querySelectorAll('h1,h2,h3,h4,label,button')].filter(e=>visible(e)&&e.scrollWidth>e.clientWidth+2&&!e.closest('svg')).filter(e=>{const s=getComputedStyle(e);return s.textOverflow!=='ellipsis'&&s.webkitLineClamp==='none'}).slice(0,12).map(identify)
     const fields=[...document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]),select,textarea')].filter(visible).filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).map(e=>({...identify(e),font:getComputedStyle(e).fontSize}))
     const bright=[...document.querySelectorAll('main *,section *,form *')].filter(visible).filter(e=>{const r=e.getBoundingClientRect();if(r.width*r.height<500)return false;const c=getComputedStyle(e).backgroundColor.match(/[\d.]+/g)?.map(Number);return c&&c.length>=3&&c[0]>240&&c[1]>240&&c[2]>240&&(c[3]??1)>.8}).slice(0,12).map(identify)
     return {rootOverflow:document.documentElement.scrollWidth-innerWidth,over,small,textclip,fields,bright,h1:[...document.querySelectorAll('h1')].map(e=>e.textContent)}
    })
    const slug=path==='/'?'home':path.replaceAll('/','_').slice(1)
    if(width===320&&theme==='dark'||width===375&&theme==='light'){
     await page.screenshot({path:`${out}/${slug}-${width}-${theme}-top.png`})
     await page.evaluate(()=>scrollTo(0,Math.max(0,(document.documentElement.scrollHeight-innerHeight)/2)))
     await page.screenshot({path:`${out}/${slug}-${width}-${theme}-middle.png`})
    }
    results.push({path,width,theme,...data,errors})
    console.log(JSON.stringify({path,width,theme,over:data.over.length,small:data.small.length,clip:data.textclip.length,fields:data.fields.length,bright:data.bright.length,errors:errors.length}))
   }catch(error){results.push({path,width,theme,failure:error.message});console.log('FAILED '+path+' '+error.message.slice(0,150))}
   page.off('pageerror',onError)
  }
  await context.close()
 }
}finally{await browser.close();fs.writeFileSync(`${out}/baseline.json`,JSON.stringify(results,null,2))}
