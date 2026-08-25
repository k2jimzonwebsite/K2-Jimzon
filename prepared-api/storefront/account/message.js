import {
  authorizationBearer, idempotencyKey, publicFailure, readJson,
  requireAllowedOrigin, requireStorefrontProject, safeJson,
  signedRpcArguments, text,
} from '../../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../../server/storefront-bff/supabase.js'

export function validateAccountMessage(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => !['conversationReference','message','idempotencyKey'].includes(key))) {
    throw new Error('REQUEST_INVALID')
  }
  const conversationReference = text(body.conversationReference, 'CONVERSATION', { required: true, min: 19, max: 19 })
  if (!/^CV-[0-9A-F]{16}$/.test(conversationReference)) throw new Error('CONVERSATION_INVALID')
  return {
    conversationReference,
    message: text(body.message, 'MESSAGE', { required: true, min: 1, max: 2000 }),
    idempotencyKey: idempotencyKey(body.idempotencyKey),
  }
}

export default async function handler(req, res) {
  if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
  const accessToken = authorizationBearer(req)
  if (!accessToken) return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })
  try {
    const payload = validateAccountMessage(await readJson(req))
    const client = createStorefrontServerSupabase(accessToken)
    const { data: identity, error: identityError } = await client.auth.getUser(accessToken)
    if (identityError || !identity?.user?.id) return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })
    const { data, error } = await client.rpc(
      'append_customer_account_message_v1', signedRpcArguments(req, 'account_reply', payload)
    )
    if (error) return safeJson(res, 503, { error: { code: 'MESSAGE_SERVICE_UNAVAILABLE' } })
    const mapped = mapBoundaryResult(data)
    if (!mapped.ok) return safeJson(res, mapped.status, { error: { code: mapped.code } },
      mapped.retryAfter ? { 'Retry-After': mapped.retryAfter } : {})
    return safeJson(res, 201, { ok: true, receipt: {
      message_status: mapped.result.message_status, created_at: mapped.result.created_at,
    } })
  } catch (error) {
    const [status, code] = publicFailure(error)
    return safeJson(res, status, { error: { code } })
  }
}

