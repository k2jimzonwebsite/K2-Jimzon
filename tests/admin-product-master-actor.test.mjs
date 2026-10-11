import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import handleProductMaster from '../server/admin-bff/product-master.js'
import { setActiveSessionCookies } from '../server/admin-bff/security.js'
const actor='11111111-1111-4111-8111-111111111111', key='22222222-2222-4222-8222-222222222222'
const secret=Buffer.alloc(32,17)
const body={action:'update',payload:{sku:'DUMMY-REVIEW',patch:{is_human_reviewed:true},expectedUpdatedAt:'2026-10-12T00:00:00Z',reason:'Reviewed product facts'}}
const response=()=>({headers:{},setHeader(key,value){this.headers[key.toLowerCase()]=value},end(value){this.body=JSON.parse(value)}})

// Only remote Auth/PostgREST is substituted. Actual cookie/session/current-role/
// current-AAL2 authorization, handler and signing run; no native or live claim.
async function run(options={}) {
  const env={K2_SESSION_COOKIE_KEY:Buffer.alloc(32,7).toString('base64'),K2_ADMIN_BFF_REQUEST_SECRET:secret.toString('base64'),K2_ADMIN_ORIGINS:'https://admin.example.test',K2_DEPLOYMENT_TARGET:'admin',NODE_ENV:'production',SUPABASE_URL:'https://transport.example.test',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'}
  const previous=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]])), fetchOriginal=globalThis.fetch, calls=[]
  try {
    Object.assign(process.env,env)
    const now=Math.floor(Date.now()/1000), claims={sub:actor,exp:now+3600,iat:now,aal:options.aal||'aal2',role:'authenticated',amr:[]}
    const token=`${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${Buffer.alloc(32,1).toString('base64url')}`
    const cookieRes=response()
    setActiveSessionCookies(cookieRes,{access_token:token,refresh_token:'synthetic-refresh',expires_at:now+3600},{userId:actor,role:'Admin'})
    const cookie=cookieRes.headers['set-cookie'].map(v=>v.split(';')[0]).join('; ')
    const csrf=decodeURIComponent(cookieRes.headers['set-cookie'][1].split(';')[0].split('=').slice(1).join('='))
    globalThis.fetch=async(input,init)=>{
      const url=new URL(input); assert.equal(url.origin,'https://transport.example.test')
      calls.push({path:url.pathname,body:init?.body?JSON.parse(init.body):null})
      let data
      if(url.pathname==='/auth/v1/user') data={id:actor,email:'dummy@example.test'}
      else if(url.pathname==='/rest/v1/user_profiles') data={role:options.role||'Admin'}
      else if(url.pathname==='/rest/v1/rpc/execute_admin_session_command_v1') data={active:options.active!==false}
      else if(url.pathname==='/rest/v1/rpc/execute_admin_product_master_command_v1') data={sku:'DUMMY-REVIEW'}
      else if(url.pathname==='/rest/v1/rpc/record_security_event_v1') data={}
      else throw Error(`Unexpected transport ${url.pathname}`)
      return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}})
    }
    const res=response()
    await handleProductMaster({method:'POST',body,headers:{origin:'https://admin.example.test',cookie,'content-type':'application/json','x-k2-csrf':options.csrf===false?'wrong':csrf,'x-k2-idempotency-key':key,...(options.expectedActor!==undefined?{'x-k2-actor-id':options.expectedActor}:{})}},res)
    return {res,calls}
  } finally {
    globalThis.fetch=fetchOriginal
    for(const [k,v] of Object.entries(previous)) {if(v===undefined) delete process.env[k]; else process.env[k]=v}
  }
}
test('saved Product Master actor mismatch refuses before command RPC',async()=>{
  for(const expectedActor of [key,'', [actor], 'malformed']) {
    const {res,calls}=await run({expectedActor})
    assert.equal(res.statusCode,403,'Changed actor must not receive a successful write')
    assert.equal(res.body.error.code,'PRODUCT_ACTOR_CHANGED')
    assert.ok(!calls.some(c=>c.path.endsWith('execute_admin_product_master_command_v1')))
  }
})
test('matching Admin and SuperAdmin send exactly one correctly signed original-actor update',async()=>{
  for(const role of ['Admin','SuperAdmin']) {
    const {res,calls}=await run({expectedActor:actor,role})
    assert.equal(res.statusCode,200)
    const commands=calls.filter(c=>c.path.endsWith('execute_admin_product_master_command_v1'))
    assert.equal(commands.length,1)
    const p=commands[0].body
    assert.equal(p.p_idempotency_key,key)
    assert.equal(p.p_action,'product_master_update'); assert.equal(p.p_payload_text,JSON.stringify(body.payload))
    const digest=createHash('sha256').update(p.p_payload_text).digest('hex')
    assert.equal(p.p_signature,createHmac('sha256',secret).update([p.p_action,p.p_timestamp,p.p_nonce,actor,key,digest].join('\n')).digest('hex'))
  }
})
test('current Staff, CSRF, AAL2 and registry still refuse before update dispatch',async()=>{
  for(const options of [{role:'Staff'},{csrf:false},{aal:'aal1'},{active:false}]) {
    const {res,calls}=await run({...options,expectedActor:actor})
    assert.ok([401,403].includes(res.statusCode))
    assert.ok(!calls.some(c=>c.path.endsWith('execute_admin_product_master_command_v1')))
  }
})
test('existing clients without actor header retain current authenticated actor behavior',async()=>{
  assert.equal((await run()).res.statusCode,200)
})
