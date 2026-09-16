import { chromium } from 'playwright'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true})
const results=[]
try {
  const context=await browser.newContext({reducedMotion:'reduce'})
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url())
    if(!['127.0.0.1','localhost'].includes(url.hostname)) return route.abort()
    if(url.pathname.startsWith('/rest/v1/')) return route.fulfill({status:200,contentType:'application/json',body:'[]'})
    if(url.pathname.startsWith('/api/')) return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'SERVICE_UNAVAILABLE'}})})
    return route.continue()
  })
  const page=await context.newPage()
  for(const route of ['/','/catalog','/store','/pasabuy','/trade','/contact','/account','/messages','/checkout','/confirmation','/audit-not-found']) {
    const errors=[]
    const onError=error=>errors.push(error.message)
    page.on('pageerror',onError)
    await page.goto(`http://127.0.0.1:5199${route}`,{waitUntil:'domcontentloaded'})
    await page.locator('main').waitFor({timeout:90000}).catch(()=>{})
    for(const [width,height] of [[320,740],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1024,900],[1280,900],[1440,900],[1920,1080]]) {
      await page.setViewportSize({width,height})
      const state=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,heading:document.querySelector('main h1')?.textContent,main:Boolean(document.querySelector('main')),boundary:Boolean([...document.querySelectorAll('[role=alert]')].find(el=>el.textContent.includes('UI_SECTION_UNAVAILABLE')))}))
      results.push({route,width,height,...state,errors:[...errors]})
    }
    page.off('pageerror',onError)
  }
  await context.close()
} finally {await browser.close();fs.writeFileSync(new URL('route-matrix.json',import.meta.url),JSON.stringify(results,null,2))}
console.log(JSON.stringify({checks:results.length,overflow:results.filter(r=>r.scrollWidth>r.width),boundaries:results.filter(r=>r.boundary),missingMain:results.filter(r=>!r.main)},null,2))
