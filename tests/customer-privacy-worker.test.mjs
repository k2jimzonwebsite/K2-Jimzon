import test from 'node:test'
import assert from 'node:assert/strict'
import { createPrivacyWorkerHandler } from '../server/storefront-bff/privacy-worker.js'
const env={K2_DEPLOYMENT_TARGET:'storefront',K2_CUSTOMER_PRIVACY_ENABLED:'true',CRON_SECRET:'x'.repeat(40),
 SUPABASE_URL:'https://pixplcjqivlfflickobf.supabase.co',K2_PRIVACY_SERVICE_ROLE_KEY:'test-capability'}
const request={method:'GET',headers:{authorization:`Bearer ${env.CRON_SECRET}`}}
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=JSON.parse(v)}})
test('worker rejects missing scheduler authority and any other project before constructing a client',async()=>{
 for(const [overrides,req] of [[{}, {...request,headers:{}}],[{SUPABASE_URL:'https://other.supabase.co'},request]]){
  let created=false;const handler=createPrivacyWorkerHandler({env:{...env,...overrides},createClient:()=>{created=true}});const res=response();await handler(req,res)
  assert.notEqual(res.statusCode,200);assert.equal(created,false)
 }
})
test('worker obfuscates only leased original Auth UUID and acknowledges with that lease',async()=>{
 const calls=[];let leased=false
 const client={rpc:async(name,args)=>{
  calls.push([args.p_operation,args.p_payload]);if(args.p_operation==='lease'&&!leased){leased=true;return {data:{ok:true,task:{userId:'original-id',requestId:'request-id',lease:'lease-id'}}}}
  return {data:{ok:true,task:null}}
 },auth:{admin:{getUserById:async id=>{calls.push(['get',id]);return {data:{user:{id}}}},deleteUser:async(...args)=>{calls.push(['delete',...args]);return {data:{user:{}}}}}}}
 const res=response();await createPrivacyWorkerHandler({env,createClient:()=>client})(request,res)
 assert.equal(res.statusCode,200);assert.deepEqual(calls.find(c=>c[0]==='delete'),['delete','original-id',true])
 assert.deepEqual(calls.find(c=>c[0]==='complete'),['complete',{requestId:'request-id',lease:'lease-id'}])
 assert.equal(JSON.stringify(res.body).includes('original-id'),false)
})
test('a lost provider acknowledgement is recoverable without deleting a new account',async()=>{
 let leased=false;let deleted=false;const actions=[]
 const client={rpc:async(name,args)=>{actions.push(args.p_operation);if(args.p_operation==='lease'&&!leased){leased=true;return {data:{ok:true,task:{userId:'original-id',requestId:'r',lease:'l'}}}}return {data:{ok:true,task:null}}},
 auth:{admin:{getUserById:async()=>({data:{user:{id:'original-id',deleted_at:'2026-10-27'}}}),deleteUser:async()=>{deleted=true;return {}}}}}
 const res=response();await createPrivacyWorkerHandler({env,createClient:()=>client})(request,res)
 assert.equal(res.statusCode,200);assert.equal(deleted,false);assert.ok(actions.includes('complete'))
})
