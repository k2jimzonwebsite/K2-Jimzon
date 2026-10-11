import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import * as client from '../src/services/adminBffService.js'
const recovery = await import('../src/lib/productMasterCommandRecovery.js').catch(() => null)
const actor = '89300000-0000-4000-8000-000000000001', key = '89310000-0000-4000-8000-000000000001'
const text = '{ "payload": {"reason":"Reviewed current facts", "expectedUpdatedAt":"2026-10-12T00:00:00Z", "patch":{"is_human_reviewed":true}, "sku":"DUMMY-REVIEW"}, "action":"update" }'

test('Product Master recovery has a literal-body actor-bound browser client', () => {
  assert.equal(typeof client.sendSavedProductMasterBff,'function','Saved Product Master transport is missing')
})
test('lost HTTP reply and later auth refusal preserve same literal request key and current CSRF', {skip:!client.sendSavedProductMasterBff || !recovery}, async () => {
  const requests=[]
  const server=http.createServer(async(req,res)=>{
    let body=''; for await(const part of req) body+=part
    requests.push({body,headers:req.headers,path:req.url,method:req.method})
    if(requests.length===1) { req.socket.destroy(); return }
    res.setHeader('Content-Type','application/json')
    res.statusCode=requests.length===2 ? 403 : 200
    res.end(JSON.stringify(requests.length===2 ? {error:{code:'PRODUCT_ACTOR_CHANGED'}} : {ok:true,result:{sku:'DUMMY-REVIEW'}}))
  })
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const originalFetch=globalThis.fetch, originalDocument=globalThis.document
  const base=`http://127.0.0.1:${server.address().port}`
  globalThis.fetch=(url,options)=>originalFetch(new URL(url,base),options)
  globalThis.document={cookie:'k2_admin_csrf=before-csrf'}
  let raw=null
  const storage={getItem:()=>raw,setItem:(_,value)=>{raw=value},removeItem:()=>{raw=null}}
  try {
    const held=recovery.holdPendingProductMaster(actor,key,text,storage)
    assert.equal((await client.sendSavedProductMasterBff(held.payloadText,held.key,actor)).code,'ADMIN_SERVICE_UNAVAILABLE')
    assert.equal(requests.length,1,'POST must not retry automatically after losing its reply')
    globalThis.document.cookie='k2_admin_csrf=current-csrf'
    const restored=recovery.readPendingProductMaster(actor,storage)
    const denied=await client.sendSavedProductMasterBff(restored.payloadText,restored.key,actor)
    assert.equal(denied.code,'PRODUCT_ACTOR_CHANGED'); assert.match(denied.error,/original staff/i)
    assert.deepEqual(recovery.readPendingProductMaster(actor,storage),held)
    assert.equal((await client.sendSavedProductMasterBff(restored.payloadText,restored.key,actor)).ok,true)
    assert.equal(requests.length,3)
    for(const request of requests) {
      assert.equal(request.body,text); assert.equal(request.headers['x-k2-idempotency-key'],key)
      assert.equal(request.headers['x-k2-actor-id'],actor); assert.equal(request.path,'/api/admin/product-master'); assert.equal(request.method,'POST')
    }
    assert.equal(requests[0].headers['x-k2-csrf'],'before-csrf')
    assert.equal(requests[1].headers['x-k2-csrf'],'current-csrf')
    assert.equal(requests[2].headers['x-k2-csrf'],'current-csrf')
    for(const [payload,k,a] of [['{}',key,actor],[text,'',actor],[text,key,''],[text,key,undefined]]) {
      assert.equal((await client.sendSavedProductMasterBff(payload,k,a)).code,'PRODUCT_COMMAND_INVALID')
    }
    assert.equal(requests.length,3,'Invalid recovery must refuse before network or a replacement key')
    assert.deepEqual(recovery.readPendingProductMaster(actor,storage),held,'Transport alone cannot acknowledge/erase a saved decision')
  } finally {
    globalThis.fetch=originalFetch; globalThis.document=originalDocument
    await new Promise(resolve=>server.close(resolve))
  }
})
