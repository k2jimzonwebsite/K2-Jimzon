import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import handleChannels from '../server/admin-bff/channels.js'
import { setActiveSessionCookies } from '../server/admin-bff/security.js'
const actor='11111111-1111-4111-8111-111111111111', key='22222222-2222-4222-8222-222222222222'
const secret=Buffer.alloc(32,17)
const body={action:'website_listing_set',sku:'DUMMY-REVIEW',assigned:true,expectedUpdatedAt:null,reason:'Explicit Website decision'}
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
      calls.push({path:url.pathname,query:url.search,body:init?.body?JSON.parse(init.body):null})
      let data
      if(url.pathname==='/auth/v1/user') data={id:actor,email:'dummy@example.test'}
      else if(url.pathname==='/rest/v1/user_profiles') data={role:options.role||'Admin'}
      else if(url.pathname==='/rest/v1/rpc/execute_admin_session_command_v1') data={active:options.active!==false}
      else if(url.pathname==='/rest/v1/rpc/execute_admin_website_listing_command_v1') data={sku:'DUMMY-REVIEW'}
      else if(url.pathname==='/rest/v1/rpc/read_admin_channel_readiness_v1') data={connections:[],readiness:[]}
      else if(url.pathname==='/rest/v1/products') data=options.missingProduct?null:{sku:body.sku}
      else if(url.pathname==='/rest/v1/channel_listings') {
        data=options.rows??[]
        return new Response(JSON.stringify(options.readError?{message:'synthetic refusal'}:data),{status:options.readError?503:200,headers:{'content-type':'application/json','content-range':`0-${Math.max(0,data.length-1)}/${options.count??data.length}`}})
      }
      else if(url.pathname==='/rest/v1/rpc/record_security_event_v1') data={}
      else throw Error(`Unexpected transport ${url.pathname}`)
      return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}})
    }
    const res=response()
    await handleChannels({method:options.get?'GET':'POST',query:options.get?{sku:options.sku}:undefined,body,headers:{origin:'https://admin.example.test',cookie,'content-type':'application/json','x-k2-csrf':options.csrf===false?'wrong':csrf,'x-k2-idempotency-key':key,...(options.expectedActor!==undefined?{'x-k2-actor-id':options.expectedActor}:{})}},res)
    return {res,calls}
  } finally {
    globalThis.fetch=fetchOriginal
    for(const [k,v] of Object.entries(previous)) {if(v===undefined) delete process.env[k]; else process.env[k]=v}
  }
}
test('saved Website assignment actor mismatch refuses before command RPC',async()=>{
  for(const expectedActor of [key,'', [actor], 'malformed']) {
    const {res,calls}=await run({expectedActor})
    assert.equal(res.statusCode,403,'Changed actor must not receive a successful write')
    assert.equal(res.body.error.code,'CHANNEL_ACTOR_CHANGED')
    assert.ok(!calls.some(c=>c.path.endsWith('execute_admin_website_listing_command_v1')))
  }
})
test('matching Admin and SuperAdmin send exactly one correctly signed original-actor update',async()=>{
  for(const role of ['Admin','SuperAdmin']) {
    const {res,calls}=await run({expectedActor:actor,role})
    assert.equal(res.statusCode,200)
    const commands=calls.filter(c=>c.path.endsWith('execute_admin_website_listing_command_v1'))
    assert.equal(commands.length,1)
    const p=commands[0].body
    assert.equal(p.p_idempotency_key,key)
    assert.equal(p.p_action,'website_listing_set'); assert.equal(p.p_payload_text,JSON.stringify({sku:body.sku,assigned:body.assigned,expectedUpdatedAt:body.expectedUpdatedAt,reason:body.reason}))
    const digest=createHash('sha256').update(p.p_payload_text).digest('hex')
    assert.equal(p.p_signature,createHmac('sha256',secret).update([p.p_action,p.p_timestamp,p.p_nonce,actor,key,digest].join('\n')).digest('hex'))
  }
})
test('current Staff, CSRF, AAL2 and registry still refuse before update dispatch',async()=>{
  for(const options of [{role:'Staff'},{csrf:false},{aal:'aal1'},{active:false}]) {
    const {res,calls}=await run({...options,expectedActor:actor})
    assert.ok([401,403].includes(res.statusCode))
    assert.ok(!calls.some(c=>c.path.endsWith('execute_admin_website_listing_command_v1')))
  }
})
test('existing clients without actor header retain current authenticated actor behavior',async()=>{
  assert.equal((await run()).res.statusCode,200)
})
test('bounded Website read distinguishes absent, paused and active existing rows',async()=>{
  const row={id:key,sku:body.sku,status:'Paused',publication_status:'paused',updated_at:'2026-10-12T00:00:00Z'}
  for(const rows of [[],[row],[{...row,status:'Active',publication_status:'ready'}]]) {
    const {res,calls}=await run({get:true,sku:body.sku,rows})
    assert.equal(res.statusCode,200)
    assert.deepEqual(res.body.listing,{id:rows.length?key:null,sku:body.sku,assigned:rows[0]?.status==='Active',updatedAt:rows.length?row.updated_at:null})
    const q=new URLSearchParams(calls.find(c=>c.path==='/rest/v1/channel_listings').query)
    assert.equal(q.get('sku'),`eq.${body.sku}`);assert.equal(q.get('channel_source'),'eq.website');assert.equal(q.get('shop_id'),'is.null');assert.equal(q.get('limit'),'2')
  }
})
test('Website read refuses duplicate partial malformed failed or missing product evidence',async()=>{
  const row={id:key,sku:body.sku,status:'Active',publication_status:'ready',updated_at:'2026-10-12T00:00:00Z'}
  for(const options of [{rows:[null]},{rows:[false]},{rows:[row,row]},{rows:[row],count:2},{rows:[{...row,id:'bad'}]},{rows:[{...row,updated_at:null}]},{rows:[{...row,status:'invented'}]},{readError:true},{missingProduct:true}]) {
    const {res}=await run({get:true,sku:body.sku,...options});assert.ok([404,503].includes(res.statusCode));assert.equal(res.body.ok,undefined)
  }
})
test('current Staff and invalid SKU refuse per-product read before data lookup; aggregate contract stays',async()=>{
  for(const options of [{role:'Staff',sku:body.sku},{sku:'bad sku'},{sku:[body.sku]}]) {
    const {res,calls}=await run({get:true,...options});assert.ok([400,403].includes(res.statusCode));assert.ok(!calls.some(c=>['/rest/v1/products','/rest/v1/channel_listings'].includes(c.path)))
  }
  const {res}=await run({get:true});assert.equal(res.statusCode,200);assert.deepEqual(res.body.channels,{connections:[],readiness:[]})
})
