import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'

const REFERENCE=/^WI-[0-9A-F]{16}$/
const STATUS=new Set(['submitted','under_review','closed'])

export function validateWholesaleInquiryReview(body) {
  if(!body||typeof body!=='object'||Array.isArray(body)) throw new Error('REQUEST_INVALID')
  if(Object.keys(body).some(key=>!['inquiryReference','toStatus','reason'].includes(key))) throw new Error('REQUEST_INVALID')
  const inquiryReference=String(body.inquiryReference||'').trim()
  const toStatus=String(body.toStatus||'').trim()
  const reason=String(body.reason||'').trim()
  if(!REFERENCE.test(inquiryReference)||!STATUS.has(toStatus)||reason.length<3||reason.length>500) throw new Error('REQUEST_INVALID')
  return {inquiryReference,toStatus,reason}
}

export async function readAdminWholesaleInquiries(client) {
  const {data,error}=await client.rpc('list_admin_wholesale_inquiries_v1')
  if(error) throw new Error('WHOLESALE_INQUIRIES_UNAVAILABLE')
  return { inquiries:Array.isArray(data)?data:[], asOf:new Date().toISOString(), commercialAuthorityAvailable:false }
}

export async function handleWholesaleInquiryReview(req,res) {
  if(req.method!=='POST') return safeJson(res,405,{error:{code:'METHOD_NOT_ALLOWED'}},{Allow:'POST'})
  const idempotencyKey=String(req.headers['x-k2-idempotency-key']||'').trim()
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) return safeJson(res,400,{error:{code:'IDEMPOTENCY_KEY_REQUIRED'}})
  const authorized=await authorizeAdminRequest(req,res,{csrf:true})
  if(!authorized) return undefined
  if(authorized.identity.role!=='Admin') return safeJson(res,403,{error:{code:'WHOLESALE_ADMIN_REQUIRED'}})
  try {
    const payload=validateWholesaleInquiryReview(await readJson(req))
    const signed=signedAdminCommandArguments('wholesale_inquiry_review',authorized.identity.userId,idempotencyKey,payload)
    const {data,error}=await authorized.client.rpc('execute_admin_wholesale_inquiry_command_v1',signed)
    if(error){
      const code=String(error.message||'')
      if(code.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res,429,{error:{code:'RATE_LIMITED'}},{'Retry-After':'60'})
      if(code.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res,409,{error:{code:'IDEMPOTENCY_CONFLICT'}})
      if(code.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res,409,{error:{code:'COMMAND_IN_PROGRESS'}},{'Retry-After':'1'})
      if(code.includes('K2_WHOLESALE_STATUS_CONFLICT')) return safeJson(res,409,{error:{code:'WHOLESALE_STATUS_CONFLICT'}})
      if(code.includes('K2_WHOLESALE_INQUIRY_NOT_FOUND')) return safeJson(res,404,{error:{code:'WHOLESALE_INQUIRY_NOT_FOUND'}})
      return safeJson(res,503,{error:{code:'WHOLESALE_COMMAND_UNAVAILABLE'}})
    }
    return safeJson(res,200,{ok:true,result:data})
  } catch(error) {
    if(['REQUEST_INVALID','BODY_TOO_LARGE','JSON_REQUIRED','INVALID_JSON'].includes(error?.message)) return safeJson(res,400,{error:{code:'REQUEST_INVALID'}})
    return safeJson(res,503,{error:{code:'WHOLESALE_COMMAND_UNAVAILABLE'}})
  }
}
