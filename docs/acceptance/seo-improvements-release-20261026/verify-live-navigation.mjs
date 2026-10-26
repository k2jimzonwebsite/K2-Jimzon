import {chromium} from 'playwright'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true})
const page=await browser.newPage()
const events=[]
page.on('request',r=>{if(!/google-analytics\.com\/g\/collect/.test(r.url()))return;for(const line of (r.postData()||'').split('\n')){const p=new URLSearchParams(new URL(r.url()).search);for(const[k,v]of new URLSearchParams(line))p.set(k,v);events.push({event:p.get('en'),location:p.get('dl'),title:p.get('dt')})}})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
try{
 await page.goto('https://www.k2jimzon.com/pasabuy')
 await page.getByRole('button',{name:'Accept analytics',exact:true}).click()
 for(let i=0;i<20&&!events.some(e=>e.event==='page_view');i++)await sleep(500)
 await sleep(1500)
 const before=events.filter(e=>e.event==='page_view')
 assert.equal(before.length,1)
 assert.equal(before[0].location,'https://www.k2jimzon.com/pasabuy')
 await page.getByRole('navigation',{name:'Storefront',exact:true}).getByRole('link',{name:'Home',exact:true}).click()
 for(let i=0;i<20&&events.filter(e=>e.event==='page_view').length<2;i++)await sleep(500)
 await sleep(2500)
 const views=events.filter(e=>e.event==='page_view')
 assert.equal(views.length,2)
 assert.equal(views[1].location,'https://www.k2jimzon.com/')
 assert(events.every(e=>!e.location||['https://www.k2jimzon.com/pasabuy','https://www.k2jimzon.com/'].includes(e.location)))
 fs.writeFileSync('.tools/seo-improvements-release-20261026/live-navigation.json',JSON.stringify({at:new Date().toISOString(),pass:true,events},null,2))
 console.log('LIVE_NAVIGATION_OK: exactly one real vendor page_view per public navigation; locations sanitized.')
}catch(e){fs.writeFileSync('.tools/seo-improvements-release-20261026/live-navigation-failure.json',JSON.stringify({at:new Date().toISOString(),error:e.message,events},null,2));throw e}
finally{await browser.close()}
