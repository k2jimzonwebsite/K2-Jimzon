// Synthetic HTTP provider boundary; production authorization and signing execute.
import {randomUUID} from 'node:crypto'
import addLine from '../../prepared-api/admin/consignments/add-line.js'
import {setActiveSessionCookies} from '../../server/admin-bff/security.js'

function response() {
  return {headers:new Map(),statusCode:0,body:'',
    setHeader(name,value){this.headers.set(name.toLowerCase(),value)},
    end(value){this.body=value}}
}

export async function withConsignmentHandler(options,work) {
  const originalFetch=globalThis.fetch,OriginalDate=globalThis.Date
  const names=['NODE_ENV','K2_DEPLOYMENT_TARGET','K2_ADMIN_ORIGINS','K2_SESSION_COOKIE_KEY',
    'K2_ADMIN_BFF_REQUEST_SECRET','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY']
  const before=Object.fromEntries(names.map(n=>[n,process.env[n]]))
  const actor=options.actor||randomUUID(),calls=[]
  Object.assign(process.env,{NODE_ENV:'production',K2_DEPLOYMENT_TARGET:'admin',K2_ADMIN_ORIGINS:'https://admin.example.test',
    K2_SESSION_COOKIE_KEY:Buffer.alloc(32,9).toString('base64'),
    K2_ADMIN_BFF_REQUEST_SECRET:(options.requestSecret||Buffer.alloc(32,44)).toString('base64'),
    SUPABASE_URL:'https://receiving-provider.example.test',SUPABASE_PUBLISHABLE_KEY:'synthetic-publishable-key'})
  const now=Math.floor(OriginalDate.now()/1000)
  const jwt=[{alg:'HS256',typ:'JWT'},{sub:actor,exp:now+3600,iat:now,aal:options.aal||'aal2',
    amr:[{method:'totp',timestamp:now}],session_id:randomUUID()},'synthetic-signature']
    .map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.')
  const user={id:actor,email:'synthetic@example.test',aud:'authenticated',role:'authenticated',
    app_metadata:{},user_metadata:{},factors:[]}
  const cookies=response()
  setActiveSessionCookies(cookies,{access_token:jwt,refresh_token:'synthetic-refresh-token',expires_at:now+3600},
    {userId:actor,role:'Admin'})
  const cookie=cookies.headers.get('set-cookie').map(s=>s.split(';')[0]).join('; ')
  const csrf=decodeURIComponent(cookie.match(/k2_admin_csrf=([^;]+)/)[1])
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})
  globalThis.fetch=async(input,init={})=>{
    const url=new URL(typeof input==='string'?input:input.url)
    if(url.origin!=='https://receiving-provider.example.test')throw Error('Unexpected provider origin')
    const body=init.body?JSON.parse(init.body):null
    calls.push({path:url.pathname,body})
    if(url.pathname==='/auth/v1/user')return json(user)
    if(url.pathname==='/rest/v1/user_profiles')return json({role:options.role||'Admin'})
    if(url.pathname==='/rest/v1/rpc/execute_admin_session_command_v1')return json({active:options.sessionActive!==false})
    if(url.pathname==='/rest/v1/rpc/record_security_event_v1')return json({recorded:true})
    if(url.pathname==='/rest/v1/rpc/execute_admin_consignment_command_v1') {
      const result=await options.command(body,actor)
      return result.error?json({code:'P0001',message:result.error,details:null,hint:null},400):json(result.data)
    }
    throw Error('Unexpected provider path '+url.pathname)
  }
  const commandCalls=()=>calls.filter(c=>c.path.endsWith('/execute_admin_consignment_command_v1'))
  const invoke=async(body,{key=randomUUID(),headers={},method='POST',date}={})=>{
    if(date)globalThis.Date=class extends OriginalDate {
      constructor(...args){super(...(args.length?args:[date+'T12:00:00+08:00']))}
    }
    else globalThis.Date=OriginalDate
    const req={method,headers:{origin:'https://admin.example.test','content-type':'application/json',cookie,
      'x-k2-csrf':csrf,'x-k2-idempotency-key':key,...headers},body,query:{route:['consignments','add-line']},
      socket:{remoteAddress:'127.0.0.1'}}
    const res=response()
    await (options.handler||addLine)(req,res)
    return {status:res.statusCode,body:JSON.parse(res.body),headers:Object.fromEntries(res.headers)}
  }
  try{return await work({invoke,calls,commandCalls,actor})}
  finally {
    globalThis.fetch=originalFetch;globalThis.Date=OriginalDate
    for(const n of names)if(before[n]===undefined)delete process.env[n];else process.env[n]=before[n]
  }
}
