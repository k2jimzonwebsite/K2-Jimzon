import { createHash } from 'node:crypto'
import { authorizationBearer, readJson, requireAllowedOrigin, requireStorefrontProject, safeJson, signedRpcArguments } from '../../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../../server/storefront-bff/supabase.js'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function validatePrivacyRequest(body) {
  if (!body || typeof body!=='object' || Array.isArray(body)
    || !['begin','status','send','confirm','cancel'].includes(body.operation)
    || !uuid.test(body.requestId) || typeof body.receiptToken!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(body.receiptToken)) throw new Error('PRIVACY_REQUEST_INVALID')
  const keys=['operation','requestId','receiptToken',...(body.operation==='begin'?['channel']:body.operation==='confirm'?['code']:[])]
  if (Object.keys(body).sort().join(',')!==keys.sort().join(',')
    || (body.operation==='begin'&&!['email','phone'].includes(body.channel))
    || (body.operation==='confirm'&&!/^[0-9]{6,10}$/.test(body.code))) throw new Error('PRIVACY_REQUEST_INVALID')
  return body
}
const contactHash=(kind,value)=>createHash('sha256').update(`${kind}:${kind==='email'?value.trim().toLowerCase():value.replace(/[^0-9+]/g,'')}`).digest('hex')
function currentContact(user,kind) {
  const value=kind==='email'&&user?.email_confirmed_at?user.email:kind==='phone'&&user?.phone_confirmed_at?user.phone:null
  return typeof value==='string'&&value?value:null
}
export function createCustomerPrivacyHandler({createClient=createStorefrontServerSupabase}={}) {
  return async function handler(req,res) {
    if (!requireStorefrontProject()) return safeJson(res,404,{error:{code:'NOT_FOUND'}})
    if(process.env.NODE_ENV==='production'&&process.env.K2_CUSTOMER_PRIVACY_ENABLED!=='true')return safeJson(res,404,{error:{code:'NOT_FOUND'}})
    if(req.method!=='POST') return safeJson(res,405,{error:{code:'METHOD_NOT_ALLOWED'}},{Allow:'POST'})
    if(!requireAllowedOrigin(req)) return safeJson(res,403,{error:{code:'ORIGIN_NOT_ALLOWED'}})
    let body
    try {body=validatePrivacyRequest(await readJson(req))}catch{return safeJson(res,400,{error:{code:'INVALID_REQUEST'}})}
    try {
      const token=authorizationBearer(req)
      // A receipt capability recovers only closure state after the original Auth
      // account has been obfuscated. It never grants purchase/history access.
      const client=createClient(body.operation==='status'?null:token)
      let user=null
      if(body.operation!=='status') {
        if(!token)return safeJson(res,401,{error:{code:'ACCOUNT_AUTH_REQUIRED'}})
        const identity=await client.auth.getUser(token)
        user=identity.data?.user
        if(identity.error||!user?.id)return safeJson(res,401,{error:{code:'ACCOUNT_AUTH_REQUIRED'}})
      }
      const base={requestId:body.requestId,receiptHash:createHash('sha256').update(body.receiptToken).digest('hex')}
      async function command(operation,extra={}) {
        const {data,error}=await client.rpc('customer_privacy_command_v1',signedRpcArguments(req,'account_settings_write',{...base,operation,...extra}))
        if(error)throw new Error('PRIVACY_UNAVAILABLE')
        return mapBoundaryResult(data)
      }
      let result
      if(body.operation==='begin') {
        const contact=currentContact(user,body.channel)
        if(!contact)return safeJson(res,403,{error:{code:'ACCOUNT_CONTACT_NOT_VERIFIED'}})
        result=await command('begin',{channel:body.channel,contactHash:contactHash(body.channel,contact)})
      }else if(body.operation==='send'||body.operation==='confirm') {
        // The database consumes durable attempts/delivery budgets before Auth.
        result=await command(body.operation==='send'?'send':'attempt')
        if(result.ok&&result.result.receipt?.state==='verification_pending') {
          const kind=result.result.verification?.channel
          const contact=currentContact(user,kind)
          if(!contact)return safeJson(res,403,{error:{code:'ACCOUNT_CONTACT_NOT_VERIFIED'}})
          if(body.operation==='send') {
            const {error}=await client.auth.signInWithOtp({[kind]:contact,options:{shouldCreateUser:false}})
            if(error)return safeJson(res,503,{error:{code:'PRIVACY_CODE_UNAVAILABLE'}})
            result=await command('sent')
          }else {
            const {data,error}=await client.auth.verifyOtp({[kind]:contact,token:body.code,type:kind==='email'?'email':'sms'})
            if(error||data?.user?.id!==user.id)return safeJson(res,401,{error:{code:'PRIVACY_CODE_INVALID'}})
            result=await command('confirm',{proofVerified:true,contactHash:contactHash(kind,contact)})
            // Separate PostgREST commits: provider proof must survive a later
            // processing timeout/lock. The worker resumes this approved request.
            if(result.ok&&result.result.receipt?.state==='pending')result=await command('process')
          }
        }
      }else result=await command(body.operation)
      if(!result.ok)return safeJson(res,result.status,{error:{code:result.code}},result.retryAfter?{'Retry-After':String(result.retryAfter)}:{})
      return safeJson(res,200,{ok:true,receipt:result.result.receipt})
    }catch{return safeJson(res,503,{error:{code:'ACCOUNT_PRIVACY_UNAVAILABLE'}})}
  }
}
export default createCustomerPrivacyHandler()
