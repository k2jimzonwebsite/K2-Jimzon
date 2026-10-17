import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import {handleProductMediaUpload,handleProductMediaAssignment} from '../server/admin-bff/product-media.js'
import { setActiveSessionCookies } from '../server/admin-bff/security.js'
const actor='11111111-1111-4111-8111-111111111111', key='22222222-2222-4222-8222-222222222222'
const secret=Buffer.alloc(32,17)
const body={sku:'DUMMY-REVIEW',primary:null,lifestyle:[],secondary:[],reason:'Reviewed product photos'}
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
      else if(url.pathname==='/rest/v1/products') data={primary_image_url:null,image_url:null,lifestyle_images:[],secondary_images:[]}
      else if(url.pathname==='/rest/v1/rpc/execute_admin_product_media_assignment_v1') data={sku:'DUMMY-REVIEW'}
      else if(url.pathname==='/rest/v1/rpc/record_security_event_v1') data={}
      else throw Error(`Unexpected transport ${url.pathname}`)
      return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}})
    }
    const res=response()
    await (options.upload?handleProductMediaUpload:handleProductMediaAssignment)({method:'POST',body,headers:{origin:'https://admin.example.test',cookie,'content-type':options.upload?'image/png':'application/json','x-k2-csrf':options.csrf===false?'wrong':csrf,'x-k2-idempotency-key':key,...(options.expectedActor!==undefined?{'x-k2-actor-id':options.expectedActor}:{})}},res)
    return {res,calls}
  } finally {
    globalThis.fetch=fetchOriginal
    for(const [k,v] of Object.entries(previous)) {if(v===undefined) delete process.env[k]; else process.env[k]=v}
  }
}

test('photo upload and assignment actor mismatch refuse before Storage or command dispatch',async()=>{for(const upload of [true,false])for(const expectedActor of [key,'',[actor],'malformed']){const {res,calls}=await run({upload,expectedActor});assert.equal(res.statusCode,403);assert.ok(!calls.some(c=>c.path.includes('/storage/')||c.path.endsWith('execute_admin_product_media_assignment_v1')))}})
test('existing and actor-bound assignment clients retain current staff command behavior',async()=>{for(const options of [{},{expectedActor:actor}]){const {res,calls}=await run(options);assert.equal(res.statusCode,200);const commands=calls.filter(c=>c.path.endsWith('execute_admin_product_media_assignment_v1'));assert.equal(commands.length,1);assert.equal(commands[0].body.p_idempotency_key,key)}})
