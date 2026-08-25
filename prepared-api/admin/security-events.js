import { authorizeAdminRequest } from '../../server/admin-bff/authorize.js'
import { readJson, requireAdminProject, safeJson } from '../../server/admin-bff/security.js'
import { recordSecurityEvent } from '../../server/admin-bff/security-events.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BROWSER_KINDS = new Set(['react-boundary','window-error','unhandled-rejection','browser-error'])

function exactKeys(value, keys) {
  return value && typeof value==='object' && !Array.isArray(value)
    && Object.keys(value).length===keys.length && keys.every((key)=>Object.hasOwn(value,key))
}

export default async function handler(req,res) {
  if (!requireAdminProject(req)) return safeJson(res,404,{ error:{ code:'NOT_FOUND' } })
  if (!['GET','POST'].includes(req.method)) {
    return safeJson(res,405,{ error:{ code:'METHOD_NOT_ALLOWED' } },{ Allow:'GET, POST' })
  }
  const idempotencyKey=String(req.headers['x-k2-idempotency-key']||'').trim()
  if (req.method==='POST' && !UUID.test(idempotencyKey)) {
    return safeJson(res,400,{ error:{ code:'IDEMPOTENCY_KEY_REQUIRED' } })
  }
  const authorized=await authorizeAdminRequest(req,res,{ csrf:req.method==='POST' })
  if (!authorized) return undefined

  if (req.method==='GET') {
    if (authorized.identity.role!=='Admin') {
      return safeJson(res,403,{ error:{ code:'SECURITY_REVIEW_ADMIN_REQUIRED' } })
    }
    const hours=Number(Array.isArray(req.query?.hours)?req.query.hours[0]:req.query?.hours||24)
    if (!Number.isInteger(hours)||hours<1||hours>168) {
      return safeJson(res,400,{ error:{ code:'SECURITY_REVIEW_RANGE_INVALID' } })
    }
    const { data,error }=await authorized.client.rpc('read_admin_security_review_v1',{ p_hours:hours })
    if (error||!data) return safeJson(res,503,{ error:{ code:'SECURITY_REVIEW_UNAVAILABLE' } })
    return safeJson(res,200,{ ok:true,review:data })
  }

  try {
    const body=await readJson(req)
    if (!exactKeys(body,['code','kind'])||body.code!=='UI_SECTION_UNAVAILABLE'
       ||!BROWSER_KINDS.has(body.kind)) throw new Error('SECURITY_EVENT_INVALID')
    const result=await recordSecurityEvent(authorized.client,{
      correlationId:idempotencyKey,eventType:'browser_error',source:'admin_browser',
      severity:'warning',outcome:'failed',sessionId:authorized.session.sessionId,
      routeKey:'admin.ui',reasonCode:'UI_SECTION_UNAVAILABLE',
      subjectKind:'browser_failure',subjectId:body.kind,
    })
    if (!result.recorded) return safeJson(res,503,{ error:{ code:'SECURITY_EVENT_UNAVAILABLE' } })
    return safeJson(res,202,{ ok:true,correlationId:result.correlationId,replayed:Boolean(result.replayed) })
  } catch(error) {
    const code=['BODY_TOO_LARGE','JSON_REQUIRED','INVALID_JSON'].includes(error?.message)
      ? error.message:'SECURITY_EVENT_INVALID'
    return safeJson(res,400,{ error:{ code } })
  }
}
