// MAP-018 / IDEA-20261012-01. Actual screens/services; owned synthetic facts only.
import assert from 'node:assert/strict'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {expect} from '@playwright/test'
import sharp from 'sharp'
import {decodeEvidenceImage} from '../server/admin-bff/product-intake.js'

export async function renderedListingBrowserProbe({page,uid,report,target,out}) {
 const sku=target.baseline.sku,productAddress=`k2-product-master-pending-v1:${uid}`,websiteAddress=`k2-website-assignment-pending-v1:${uid}`
 const result=report.renderedListing={scope:'Owned local Auth/MFA, BFF/PostgreSQL/Storage and actual Admin screens. Synthetic product, image, stock and reasons. No customer browser, provider, hosted or human acceptance.',checks:[],writes:[],stage:'photos'}
 const stored=address=>page.evaluate(key=>localStorage.getItem(key),address)
 const fingerprint=req=>({body:req.postData(),key:req.headers()['x-k2-idempotency-key'],actor:req.headers()['x-k2-actor-id']})
 const callbackErrors=[]
 const checkCallbacks=()=>assert.deepEqual(callbackErrors,[],'rendered_route_callback_errors')
 const observeResponse=predicate=>{const pending=page.waitForResponse(predicate);void pending.catch(()=>{});return pending}
 const reload=async()=>{
  await page.reload();await page.getByPlaceholder('Search SKU, product, barcode, or origin',{exact:true}).fill(sku)
 }
 const openEditor=async()=>{await page.getByRole('button',{name:'Edit',exact:true}).click();return page.getByRole('dialog',{name:'Edit Product'})}
 const pricing=async editor=>{await editor.getByRole('button',{name:/Pricing/}).click();return editor.getByText('SRP ₱',{exact:true}).locator('..').locator('input')}
 const save=async(editor,price,review,reason)=>{
  await (await pricing(editor)).fill(String(price));await editor.getByRole('checkbox',{name:/I reviewed this product/}).setChecked(review)
  await editor.getByLabel('Reason for this change').fill(reason);await editor.getByRole('button',{name:'Save Changes',exact:true}).click()
 }
 // Loss injection acts only in this browser. Every non-lost response is real.
 const lose=async(routePath,afterCommit)=>{
  let used=false
  await page.route('**/api/admin/'+routePath,async route=>{
   if(route.request().method()!=='POST'||used)return route.fallback()
   used=true
   try{
    result.writes.push(fingerprint(route.request()))
    if(afterCommit){const response=await route.fetch();assert.equal(response.status(),200);result.lostCommittedReceipt=await response.json()}
   }catch(error){callbackErrors.push(error.message)}
   finally{await route.abort('failed').catch(error=>callbackErrors.push(error.message))}
  })
 }
 const retry=async(dialog,button,routePath,original,status)=>{
  const response=observeResponse(res=>new URL(res.url()).pathname==='/api/admin/'+routePath&&res.request().method()==='POST')
  await dialog.getByRole('button',{name:button,exact:true}).click()
  const reply=await response;assert.equal(reply.status(),status);assert.deepEqual(fingerprint(reply.request()),original)
  result.writes.push(fingerprint(reply.request()));return reply.json()
 }
 await page.setViewportSize({width:1440,height:1000})
 await page.getByRole('button',{name:'Photos',exact:true}).click()
 const photos=page.getByRole('dialog',{name:'Product photos'})
 await photos.getByRole('button',{name:'Remove Primary storefront photo 1',exact:true}).click()
 const bytes=await sharp({create:{width:180,height:140,channels:3,background:{r:184,g:93,b:42}}}).png().toBuffer()
 const decoded=await decodeEvidenceImage(bytes,'image/png')
 // Record owned path before dispatch so a later failure still cleans the object.
 const mediaRoute='**/api/admin/product-media'
 await page.route(mediaRoute,async route=>{
  try{
   if(route.request().method()==='POST')target.trackPublicMedia(`${uid}/product-media/${route.request().headers()['x-k2-idempotency-key']}-${decoded.sha256.slice(0,16)}.${decoded.extension}`)
   await route.fallback()
  }catch(error){callbackErrors.push(error.message);await route.abort('failed').catch(failure=>callbackErrors.push(failure.message))}
 })
 const upload=observeResponse(res=>new URL(res.url()).pathname==='/api/admin/product-media'&&res.request().method()==='POST')
 await photos.getByLabel('Primary storefront photo',{exact:true}).setInputFiles({name:'synthetic-primary.png',mimeType:'image/png',buffer:bytes})
 const uploaded=await upload;checkCallbacks();assert.equal(uploaded.status(),200);const media=(await uploaded.json()).media
 await photos.getByLabel(/^Change reason/).fill('Explicit synthetic primary photo approval')
 const assignment=observeResponse(res=>new URL(res.url()).pathname==='/api/admin/product-media/assign'&&res.request().method()==='POST')
 await photos.getByRole('button',{name:'Save photo assignment',exact:true}).click()
 assert.equal((await assignment).status(),200);await expect(photos).toHaveCount(0)
 assert.equal((await target.readProduct()).primary_image_url,media.publicUrl,'canonical_primary_image_matches_rendered_assignment')
 await page.unroute(mediaRoute)
 const image=await fetch(media.publicUrl);assert.equal(image.status,200)
 assert.equal(createHash('sha256').update(Buffer.from(await image.arrayBuffer())).digest('hex'),decoded.sha256)
 report.publicMedia={url:media.publicUrl,sha256:decoded.sha256,browserAssigned:true,anonymousBytes:true}
 result.checks.push('rendered_primary_upload_assignment_and_anonymous_normalized_bytes')

 result.stage='applied_product_recovery'
 await lose('product-master',true)
 let editor=await openEditor();await save(editor,100,true,'Explicit synthetic human review after photo approval')
 await expect(editor.getByRole('alert')).toBeVisible()
 checkCallbacks()
 await expect.poll(()=>stored(productAddress)).not.toBeNull()
 const appliedRecord=await stored(productAddress),applied=result.writes.at(-1)
 await page.unroute('**/api/admin/product-master');await reload()
 await page.getByRole('button',{name:`Review pending product decision ${sku}`,exact:true}).click()
 let saved=page.getByRole('dialog',{name:'Saved product decision'})
 assert.equal(await stored(productAddress),appliedRecord)
 await retry(saved,'Retry saved decision','product-master',applied,200);await expect(saved).toHaveCount(0)
 await expect.poll(()=>stored(productAddress)).toBeNull()
 let current=await target.readProduct();assert.equal(Number(current.srp),100);assert.equal(current.is_human_reviewed,true)
 result.checks.push('rendered_lost_after_real_commit_reload_literal_actor_body_key_replay')

 result.stage='non_applied_product_recovery'
 await lose('product-master',false)
 editor=await openEditor();await save(editor,110,false,'Explicit synthetic change lost before server dispatch')
 await expect(editor.getByRole('alert')).toBeVisible()
 checkCallbacks()
 await expect.poll(()=>stored(productAddress)).not.toBeNull()
 const absentRecord=await stored(productAddress),absent=result.writes.at(-1)
 await page.unroute('**/api/admin/product-master');await target.advanceProduct();await reload()
 await page.getByRole('button',{name:`Review pending product decision ${sku}`,exact:true}).click()
 saved=page.getByRole('dialog',{name:'Saved product decision'})
 await retry(saved,'Retry saved decision','product-master',absent,409)
 await expect(saved.getByRole('button',{name:'Review latest product',exact:true})).toBeVisible()
 assert.equal(await stored(productAddress),absentRecord)
 await retry(saved,'Review latest product','product-master',absent,409)
 editor=page.getByRole('dialog',{name:'Edit Product'});await expect(editor).toBeVisible()
 await expect(editor.getByLabel('Reason for this change')).toHaveValue('')
 await expect(await pricing(editor)).toHaveValue('120')
 await expect(editor.getByRole('checkbox',{name:/I reviewed this product/})).toBeChecked()
 assert.equal(await stored(productAddress),null)
 const freshReply=observeResponse(res=>new URL(res.url()).pathname==='/api/admin/product-master'&&res.request().method()==='POST')
 await save(editor,100,true,'Explicit fresh review of current synthetic product facts')
 const fresh=await freshReply;assert.equal(fresh.status(),200);assert.notEqual(fingerprint(fresh.request()).key,absent.key)
 await expect(editor).toHaveCount(0)
 result.checks.push('rendered_proven_non_applied_exact_recheck_current_read_blank_reason_fresh_key')

 result.stage='live_publication'
 await page.getByRole('button',{name:'Live',exact:true}).click()
 const status=page.getByRole('dialog',{name:'Set Live'})
 await status.getByLabel('Reason for the status change').fill('Explicit synthetic final publication decision')
 await status.getByRole('button',{name:'Set Live',exact:true}).click();await expect(status).toHaveCount(0)
 current=await target.readProduct();assert.equal(current.status,'Live');assert.equal(current.published,true)
 result.checks.push('rendered_independent_live_publication')

 result.stage='website_recovery'
 await page.getByRole('button',{name:'Website assignment',exact:true}).click()
 let website=page.getByRole('dialog',{name:'Website assignment'})
 await expect(website).toContainText('Current assignment: Not assigned')
 await website.getByRole('checkbox',{name:'Assign this product to Website',exact:true}).check()
 await website.getByLabel('Reason for Website decision').fill('Explicit synthetic independent Website assignment')
 await lose('channels',true);await website.getByRole('button',{name:'Save Website decision',exact:true}).click()
 await expect(website.getByRole('alert')).toBeVisible()
 checkCallbacks()
 await expect.poll(()=>stored(websiteAddress)).not.toBeNull()
 const websiteRecord=await stored(websiteAddress),websiteWrite=result.writes.at(-1)
 await page.unroute('**/api/admin/channels');await reload()
 await page.getByRole('button',{name:`Review pending Website decision ${sku}`,exact:true}).click()
 website=page.getByRole('dialog',{name:'Website assignment'})
 assert.equal(await stored(websiteAddress),websiteRecord)
 await retry(website,'Retry saved Website decision','channels',websiteWrite,200)
 await expect(website).toContainText('Current assignment: Assigned');assert.equal(await stored(websiteAddress),null)
 for(const width of [375,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,`listing-recovery-${width}.png`)})}
 await website.getByRole('button',{name:'Close',exact:true}).click()
 result.checks.push('rendered_website_lost_after_commit_reload_exact_replay_current_assignment')
 result.stage='complete';result.passed=true
}
