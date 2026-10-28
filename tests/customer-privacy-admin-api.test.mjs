import test from 'node:test'
import assert from 'node:assert/strict'
import { createCustomerPrivacyAdminHandler,validatePrivacyReview } from '../server/admin-bff/customer-privacy.js'
process.env.K2_ADMIN_BFF_REQUEST_SECRET=Buffer.alloc(32,11).toString('base64')
const id='60000000-0000-4000-8000-000000000001'
const key='90000000-0000-4000-8000-000000000001'
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=JSON.parse(v)}})
const request=(body,method='POST')=>({method,body,query:{},headers:{'content-type':'application/json','x-k2-idempotency-key':key,'x-k2-actor-id':'acting-admin'}})
test('privacy review accepts only exact bounded request/hold operations',()=>{
 assert.deepEqual(validatePrivacyReview({requestId:id,action:'assign',reason:'Take responsibility'}),{requestId:id,action:'assign',reason:'Take responsibility'})
 assert.deepEqual(validatePrivacyReview({customerId:id,action:'add_customer_hold',kind:'security',reason:'Security investigation'}),{customerId:id,action:'add_customer_hold',reason:'Security investigation',kind:'security'})
 for(const value of [{requestId:id,action:'force_delete',reason:'bad'}, {requestId:id,action:'assign',reason:'ok',actorId:'victim'},
  {requestId:id,action:'add_hold',kind:'marketing',reason:'bad'}, {requestId:id,action:'resolve_hold',holdId:'invalid',reason:'bad'},
  {requestId:id,action:'assign',reason:'x'.repeat(501)}])assert.throws(()=>validatePrivacyReview(value))
})
test('a pre-request hold can only target an exact customer and allowed reason',()=>{
 for(const value of [{customerId:id,action:'add_customer_hold',kind:'marketing',reason:'Invalid category'}, {customerId:id,requestId:id,action:'add_customer_hold',kind:'legal',reason:'Invalid scope'}, {customerId:id,action:'resolve_customer_hold',holdId:'bad',reason:'Invalid id'}]) assert.throws(()=>validatePrivacyReview(value))
})
test('Staff cannot reach private customer privacy records or mutations',async()=>{
 let called=false
 const handler=createCustomerPrivacyAdminHandler({authorize:async()=>({identity:{role:'Staff',userId:'staff'},client:{rpc:async()=>{called=true}}})})
 for(const method of ['GET','POST']){const res=response();await handler(request({requestId:id,action:'assign',reason:'Reason'},method),res);assert.equal(res.statusCode,403)}
 assert.equal(called,false)
})
test('Admin review uses CSRF authorization, exact shared signature action and original idempotency key',async()=>{
 let options;let args
 const handler=createCustomerPrivacyAdminHandler({authorize:async(req,res,value)=>{options=value;return {identity:{role:'Admin',userId:'acting-admin'},client:{rpc:async(name,input)=>{args={name,input};return {data:{requestId:id,action:'assign',updatedAt:'2026-10-27T00:00:00Z'}}}}}}})
 const res=response();await handler(request({requestId:id,action:'assign',reason:'Taking follow-up'}),res)
 assert.equal(res.statusCode,200);assert.deepEqual(options,{csrf:true})
 assert.equal(args.name,'review_admin_customer_privacy_v1');assert.equal(args.input.p_action,'customer_privacy_review');assert.equal(args.input.p_idempotency_key,key)
 assert.equal(JSON.parse(args.input.p_payload_text).actorId,undefined)
})
test('Admin read signs a bounded private read and exposes no capability fields',async()=>{
 let args
 const handler=createCustomerPrivacyAdminHandler({authorize:async()=>({identity:{role:'Admin',userId:'acting-admin'},client:{rpc:async(name,input)=>{args={name,input};return {data:{requests:[],nextCursor:null}}}}})})
 const res=response();await handler(request(null,'GET'),res)
 assert.equal(res.statusCode,200);assert.equal(args.name,'read_admin_customer_privacy_v1');assert.equal(args.input.p_action,'customer_privacy_read')
 assert.deepEqual(JSON.parse(args.input.p_payload_text),{cursor:null,scope:'current'})
})
test('an action cannot be retried as a different signed-in Admin',async()=>{
 let called=false
 const handler=createCustomerPrivacyAdminHandler({authorize:async()=>({identity:{role:'Admin',userId:'different-admin'},client:{rpc:async()=>{called=true}}})})
 const res=response();await handler(request({requestId:id,action:'assign',reason:'Take responsibility'}),res)
 assert.equal(res.statusCode,403);assert.equal(called,false)
})

const hold='70000000-0000-4000-8000-000000000001'
const prepared={command:{operationId:key},proof:{body:'private native evidence',mac:'private mac'}}
function holdHandler({rpc=async()=>({data:prepared}),authority,deadlineMs}={}) {
 return createCustomerPrivacyAdminHandler({holdAuthority:authority,deadlineMs,
  authorize:async()=>({identity:{role:'Admin',userId:'acting-admin'},client:{rpc}})})
}
test('every hold action refuses without native writes when the authority is absent',async()=>{
 let calls=0
 const handler=holdHandler({rpc:async()=>{calls++;return {data:{}}}})
 for(const payload of [
  {requestId:id,action:'add_hold',kind:'legal',reason:'Review needed'},
  {requestId:id,action:'resolve_hold',holdId:hold,reason:'Review finished'},
  {customerId:id,action:'add_customer_hold',kind:'legal',reason:'Review needed'},
  {customerId:id,action:'resolve_customer_hold',holdId:hold,reason:'Review finished'},
 ]) {const res=response();await handler(request(payload),res);assert.equal(res.statusCode,503);assert.equal(res.body.error.code,'PRIVACY_AUTHORITY_UNAVAILABLE')}
 assert.equal(calls,0)
})
test('request holds use the separate signed native boundary and expose only checked current outcome',async()=>{
 const calls=[];let input;let signal
 const authority={applyHold:async(value,options)=>{input=value;signal=options.signal;return {currentState:'projected',receipt:{holdId:hold}}}}
 const handler=holdHandler({authority,rpc:async(name,args)=>{calls.push({name,args});return {data:prepared}}})
 const res=response();await handler(request({requestId:id,action:'add_hold',kind:'legal',reason:'Review needed'}),res)
 assert.equal(res.statusCode,200);assert.equal(calls.length,1)
 assert.equal(calls[0].name,'prepare_admin_customer_privacy_hold_v2');assert.equal(calls[0].args.p_action,'customer_privacy_hold_prepare')
 assert.equal(calls[0].args.p_idempotency_key,key);assert.deepEqual(JSON.parse(calls[0].args.p_payload_text),{requestId:id,kind:'legal',reason:'Review needed'})
 assert.equal(input,prepared);assert.equal(signal.aborted,true)
 assert.deepEqual(Object.keys(res.body.result).sort(),['action','checkedAt','currentState','holdId','requestId'])
 assert.equal(res.body.result.currentState,'projected');assert.equal(res.body.result.holdId,hold)
 assert.ok(Number.isFinite(Date.parse(res.body.result.checkedAt)));assert.equal(JSON.stringify(res.body).includes('private'),false)
})
test('historical resolved creation and authorization refusal never become a successful saved hold',async()=>{
 for(const [state,code] of [['resolved','PRIVACY_HOLD_ALREADY_RESOLVED'],['refused','PRIVACY_PROCESSING_STARTED']]){
  const handler=holdHandler({authority:{applyHold:async()=>({currentState:state,receipt:{holdId:hold}})}})
  const res=response();await handler(request({requestId:id,action:'add_hold',kind:'legal',reason:'Original reason'}),res)
  assert.equal(res.statusCode,409);assert.equal(res.body.error.code,code);assert.notEqual(res.body.ok,true)
 }
})
test('customer-only holds use the same signed pipeline with real customer scope and checked outcome',async()=>{
 for(const action of ['add_customer_hold','resolve_customer_hold']){
  let call;let applied;const adding=action==='add_customer_hold'
  const authority={applyHold:async()=>{applied='protect';return {currentState:'projected',receipt:{holdId:hold}}},releaseHold:async()=>{applied='release';return {currentState:'resolved',receipt:{holdId:hold}}}}
  const handler=holdHandler({authority,rpc:async(name,args)=>{call={name,args};return {data:prepared}}})
  const payload={customerId:id,action,reason:'Customer review',...(adding?{kind:'legal'}:{holdId:hold})}
  const res=response();await handler(request(payload),res)
  assert.equal(res.statusCode,200);assert.equal(applied,adding?'protect':'release')
  assert.equal(call.name,adding?'prepare_admin_customer_privacy_hold_v2':'resolve_admin_customer_privacy_hold_v2')
  assert.equal(call.args.p_idempotency_key,key)
  assert.deepEqual(JSON.parse(call.args.p_payload_text),{customerId:id,...(adding?{kind:'legal'}:{holdId:hold}),reason:'Customer review'})
  assert.equal(res.body.result.customerId,id);assert.equal(res.body.result.requestId,undefined)
  assert.equal(res.body.result.currentState,adding?'projected':'resolved');assert.ok(Number.isFinite(Date.parse(res.body.result.checkedAt)))
 }
})
test('existing holds without native intents remain an explicit non-writing reconciliation outcome',async()=>{
 let releases=0
 const handler=holdHandler({authority:{releaseHold:async()=>{releases++}},rpc:async()=>({error:{message:'K2_PRIVACY_HOLD_RECONCILIATION_REQUIRED'}})})
 const res=response();await handler(request({customerId:id,action:'resolve_customer_hold',holdId:hold,reason:'Original legacy hold'}),res)
 assert.equal(res.statusCode,409);assert.equal(res.body.error.code,'PRIVACY_HOLD_RECONCILIATION_REQUIRED');assert.equal(releases,0)
})
test('a lost native preparation reply retains its exact signed operation before coordinator retry',async()=>{
 const calls=[];let applies=0
 const handler=holdHandler({authority:{applyHold:async()=>{applies++;return {currentState:'projected',receipt:{holdId:hold}}}},rpc:async(name,args)=>{
  calls.push({name,args});return calls.length===1?{error:{message:'Lost reply after commit'}}:{data:prepared}
 }})
 const payload={requestId:id,action:'add_hold',kind:'legal',reason:'Keep this exact reason'}
 const first=response();await handler(request(payload),first);assert.equal(first.statusCode,503);assert.equal(applies,0)
 const second=response();await handler(request(payload),second);assert.equal(second.statusCode,200);assert.equal(applies,1)
 assert.equal(calls[0].args.p_idempotency_key,calls[1].args.p_idempotency_key);assert.equal(calls[0].args.p_payload_text,calls[1].args.p_payload_text)
})
test('committed native resolution stays uncertain until its original protection release is verified',async()=>{
 const calls=[];let releases=0
 const handler=holdHandler({authority:{releaseHold:async()=>{if(++releases===1)throw Error('Lost journal reply');return {currentState:'resolved',receipt:{holdId:hold}}}},rpc:async(name,args)=>{calls.push({name,args});return {data:prepared}}})
 const payload={requestId:id,action:'resolve_hold',holdId:hold,reason:'Original resolution'}
 const first=response();await handler(request(payload),first);assert.equal(first.statusCode,503);assert.equal(first.body.error.code,'PRIVACY_COMMAND_UNAVAILABLE')
 const second=response();await handler(request(payload),second);assert.equal(second.statusCode,200);assert.equal(second.body.result.currentState,'resolved')
 assert.equal(calls[0].name,'resolve_admin_customer_privacy_hold_v2');assert.equal(calls[0].args.p_action,'customer_privacy_hold_resolve')
 assert.equal(calls[0].args.p_payload_text,calls[1].args.p_payload_text);assert.equal(calls[0].args.p_idempotency_key,key);assert.equal(calls[1].args.p_idempotency_key,key)
})
test('one deadline aborts native prepare and prevents late coordinator or fallback work',async()=>{
 let applies=0;let nativeSignal;let finish
 const handler=holdHandler({deadlineMs:15,authority:{applyHold:async()=>{applies++}},rpc:()=>({abortSignal(signal){nativeSignal=signal;return new Promise(resolve=>{finish=resolve})}})})
 const res=response();await handler(request({requestId:id,action:'add_hold',kind:'legal',reason:'Review needed'}),res)
 assert.equal(res.statusCode,503);assert.equal(nativeSignal.aborted,true);assert.equal(applies,0)
 finish({data:prepared});await new Promise(resolve=>setImmediate(resolve));assert.equal(applies,0);assert.equal(res.body.ok,undefined)
})

test('native preparation time remains inside the inherited coordinator deadline',async()=>{
 let remaining
 const handler=holdHandler({deadlineMs:120,rpc:async()=>{
  const end=performance.now()+30;while(performance.now()<end){}
  return {data:prepared}
 },authority:{applyHold:async(_value,options)=>{
  remaining=options.deadlineAt-performance.now()
  assert.ok(remaining>0&&remaining<100,'coordinator cannot receive a reset120ms or9000ms clock')
  return {currentState:'projected',receipt:{holdId:hold}}
 }}})
 const res=response();await handler(request({requestId:id,action:'add_hold',kind:'legal',reason:'Review needed'}),res)
 assert.equal(res.statusCode,200);assert.ok(Number.isFinite(remaining))
})
