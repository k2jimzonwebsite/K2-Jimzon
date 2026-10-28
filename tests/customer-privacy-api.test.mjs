import test from 'node:test'
import assert from 'node:assert/strict'
import { createCustomerPrivacyHandler } from '../prepared-api/storefront/account/privacy.js'
process.env.K2_STOREFRONT_ORIGINS='https://store.test'
process.env.K2_GUEST_BFF_SECRET=Buffer.alloc(32,7).toString('base64')
const actor='10000000-0000-4000-8000-000000000001'
const requestId='60000000-0000-4000-8000-000000000001'
const receiptToken=Buffer.alloc(32,9).toString('base64url')
const req=body=>({method:'POST',headers:{origin:'https://store.test','content-type':'application/json',authorization:`Bearer ${'a'.repeat(40)}`},body})
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=JSON.parse(v)}})
function fixture({verifiedActor=actor,deliveryError=false}={}) {
 const calls=[]
 const client={auth:{getUser:async()=>({data:{user:{id:actor,email:'verified@example.test',email_confirmed_at:'2026-01-01'}}}),
  signInWithOtp:async input=>{calls.push(['send',input]);return {error:deliveryError?new Error('provider secret'):null}},
  verifyOtp:async input=>{calls.push(['verify',input]);return {data:{user:{id:verifiedActor}}}}},
  rpc:async(name,args)=>{const payload=JSON.parse(args.p_payload_text);calls.push(['rpc',payload]);
   return {data:{ok:true,receipt:{requestId,state:'verification_pending',externalPending:true},
    verification:payload.operation==='send'||payload.operation==='attempt'?{channel:'email'}:undefined}}}}
 return {calls,handler:createCustomerPrivacyHandler({createClient:()=>client})}
}
test('privacy rejects selected identities/contact overrides before any provider or RPC',async()=>{
 for(const extra of [{email:'victim@example.test'},{userId:actor},{proofVerified:true}]){
  const {handler,calls}=fixture();const res=response();await handler(req({operation:'send',requestId,receiptToken,...extra}),res)
  assert.equal(res.statusCode,400);assert.equal(calls.length,0)
 }
})
test('OTP send persists delivery budget before provider call, uses verified contact, never creates users',async()=>{
 const {handler,calls}=fixture();const res=response();await handler(req({operation:'send',requestId,receiptToken}),res)
 assert.equal(res.statusCode,200);assert.equal(calls[0][0],'rpc');assert.equal(calls[0][1].operation,'send')
 assert.deepEqual(calls[1],['send',{email:'verified@example.test',options:{shouldCreateUser:false}}])
 assert.equal(calls[2][1].operation,'sent')
 assert.equal(res.body.receipt.state,'verification_pending');assert.equal(JSON.stringify(res.body).includes('verified@example.test'),false)
})
test('delivery failure does not confirm closure or leak provider errors',async()=>{
 const {handler,calls}=fixture({deliveryError:true});const res=response();await handler(req({operation:'send',requestId,receiptToken}),res)
 assert.equal(res.statusCode,503);assert.equal(calls.some(c=>c[0]==='rpc'&&c[1].operation==='confirm'),false)
 assert.equal(calls.some(c=>c[0]==='rpc'&&c[1].operation==='sent'),false)
 assert.equal(JSON.stringify(res.body).includes('provider secret'),false)
})
test('confirmation consumes attempt before exact-channel OTP check and refuses wrong returned identity',async()=>{
 const {handler,calls}=fixture({verifiedActor:'wrong-user'});const res=response()
 await handler(req({operation:'confirm',requestId,receiptToken,code:'123456'}),res)
 assert.equal(res.statusCode,401);assert.equal(calls[0][1].operation,'attempt')
 assert.deepEqual(calls[1],['verify',{email:'verified@example.test',token:'123456',type:'email'}])
 assert.equal(calls.some(c=>c[0]==='rpc'&&c[1].operation==='confirm'),false)
})
test('only a successful matching provider verification creates the signed confirmation',async()=>{
 const {handler,calls}=fixture();const res=response();await handler(req({operation:'confirm',requestId,receiptToken,code:'123456'}),res)
 assert.equal(res.statusCode,200);assert.equal(calls.at(-1)[1].operation,'confirm')
 assert.equal(calls.at(-1)[1].proofVerified,true)
 assert.equal(JSON.stringify(calls.at(-1)).includes('123456'),false)
})
test('fresh proof is committed before processing so a processing failure never requires a new confirmation',async()=>{
 const calls=[]
 const client={auth:{getUser:async()=>({data:{user:{id:actor,email:'verified@example.test',email_confirmed_at:'2026-01-01'}}}),verifyOtp:async()=>({data:{user:{id:actor}}})},
  rpc:async(name,args)=>{const p=JSON.parse(args.p_payload_text);calls.push(p.operation)
   return {data:{ok:true,receipt:{requestId,state:p.operation==='confirm'?'pending':p.operation==='process'?'closed':'verification_pending'},verification:{channel:'email'}}}}}
 const res=response();await createCustomerPrivacyHandler({createClient:()=>client})(req({operation:'confirm',requestId,receiptToken,code:'123456'}),res)
 assert.deepEqual(calls,['attempt','confirm','process']);assert.equal(res.body.receipt.state,'closed')
})
