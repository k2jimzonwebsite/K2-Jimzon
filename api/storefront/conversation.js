import {
  contact, idempotencyKey, publicFailure, readJson, requestIp, requireAllowedOrigin,
  requireStorefrontProject, safeJson, setGuestGrantCookie, signedRpcArguments, text,
  verifyBotChallenge,
} from '../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../server/storefront-bff/supabase.js'

function validate(body) {
  const allowed = new Set(['customerName', 'email', 'phone', 'message', 'idempotencyKey', 'botToken'])
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
  const { email, phone } = contact(body.email, body.phone)
  return {
    payload: {
      customerName: text(body.customerName, 'CUSTOMER_NAME', { required: true, min: 1, max: 140 }),
      email,
      phone,
      message: text(body.message, 'MESSAGE', { required: true, min: 2, max: 2000 }),
      idempotencyKey: idempotencyKey(body.idempotencyKey),
    },
    botToken: body.botToken,
  }
}

export default async function handler(req, res) {
  if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
  try {
    const { payload, botToken } = validate(await readJson(req))
    if (!await verifyBotChallenge(botToken, requestIp(req))) {
      return safeJson(res, 403, { error: { code: 'BOT_CHALLENGE_REQUIRED' } })
    }
    const client = createStorefrontServerSupabase()
    const { data, error } = await client.rpc(
      'start_guest_conversation_v1', signedRpcArguments(req, 'guest_start', payload)
    )
    if (error) return safeJson(res, 503, { error: { code: 'MESSAGE_SERVICE_UNAVAILABLE' } })
    const mapped = mapBoundaryResult(data)
    if (!mapped.ok) return safeJson(res, mapped.status, { error: { code: mapped.code } },
      mapped.retryAfter ? { 'Retry-After': mapped.retryAfter } : {})
    setGuestGrantCookie(res, mapped.result.guest_grant_token)
    const { guest_grant_token: _secret, ok: _ok, error_code: _error, retry_after_seconds: _retry, ...receipt } = mapped.result
    return safeJson(res, 201, { ok: true, receipt })
  } catch (error) {
    const [status, code] = publicFailure(error)
    return safeJson(res, status, { error: { code } })
  }
}
