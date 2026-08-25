import {
  contact, idempotencyKey, publicFailure, readJson, requestIp, requireAllowedOrigin,
  requireStorefrontProject, safeJson, setGuestGrantCookie, signedRpcArguments, text,
  verifyBotChallenge,
} from '../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../server/storefront-bff/supabase.js'

const BUSINESS_TYPES = new Set(['cafe_restaurant','retail_deli','hospitality','corporate','distributor','other'])
const VOLUME_BANDS = new Set(['starter','case_regular','high_volume','recurring_weekly','unsure'])
const exactEnum = (value,allowed) => {
  if (typeof value !== 'string' || !allowed.has(value)) throw new Error('REQUEST_INVALID')
  return value
}
export function validateWholesaleInquiry(body) {
  const allowed=new Set(['organizationName','businessType','customerName','contactRole','email','phone','deliveryArea','volumeBand','targetItems','notes','idempotencyKey','botToken'])
  if (!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).some(key=>!allowed.has(key))) throw new Error('REQUEST_INVALID')
  const { email,phone }=contact(body.email,body.phone)
  return { payload:{
    organizationName:text(body.organizationName,'ORGANIZATION_NAME',{required:true,min:1,max:160}),
    businessType:exactEnum(body.businessType,BUSINESS_TYPES),
    customerName:text(body.customerName,'CUSTOMER_NAME',{required:true,min:1,max:140}),
    contactRole:text(body.contactRole,'CONTACT_ROLE',{max:100}),email,phone,
    deliveryArea:text(body.deliveryArea,'DELIVERY_AREA',{required:true,min:2,max:200}),
    volumeBand:exactEnum(body.volumeBand,VOLUME_BANDS),
    targetItems:text(body.targetItems,'TARGET_ITEMS',{required:true,min:2,max:1500}),
    notes:text(body.notes,'NOTES',{max:1000}),idempotencyKey:idempotencyKey(body.idempotencyKey),
  },botToken:body.botToken }
}
export default async function handler(req,res) {
  if(!requireStorefrontProject()) return safeJson(res,404,{error:{code:'NOT_FOUND'}})
  if(req.method!=='POST') return safeJson(res,405,{error:{code:'METHOD_NOT_ALLOWED'}},{Allow:'POST'})
  if(!requireAllowedOrigin(req)) return safeJson(res,403,{error:{code:'ORIGIN_NOT_ALLOWED'}})
  try {
    const {payload,botToken}=validateWholesaleInquiry(await readJson(req))
    if(!await verifyBotChallenge(botToken,requestIp(req))) return safeJson(res,403,{error:{code:'BOT_CHALLENGE_REQUIRED'}})
    const {data,error}=await createStorefrontServerSupabase().rpc('submit_wholesale_inquiry_v1',signedRpcArguments(req,'wholesale_inquiry',payload))
    if(error) return safeJson(res,503,{error:{code:'WHOLESALE_INQUIRY_UNAVAILABLE'}})
    const mapped=mapBoundaryResult(data)
    if(!mapped.ok) return safeJson(res,mapped.status,{error:{code:mapped.code}},mapped.retryAfter?{'Retry-After':mapped.retryAfter}:{})
    setGuestGrantCookie(res,mapped.result.guest_grant_token)
    return safeJson(res,201,{ok:true,receipt:{public_reference:mapped.result.public_reference,conversation_reference:mapped.result.conversation_reference,status:mapped.result.status,created_at:mapped.result.created_at,pricing_approved:false,credit_approved:false,terms_approved:false}})
  } catch(error) { const [status,code]=publicFailure(error); return safeJson(res,status,{error:{code}}) }
}
