import {
  contact, idempotencyKey, publicFailure, readJson, requestIp, requireAllowedOrigin,
  requireStorefrontProject, safeJson, setGuestGrantCookie, signedRpcArguments, text,
  verifyBotChallenge,
} from '../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../server/storefront-bff/supabase.js'

function validate(body) {
  const allowed = new Set(['customerName','email','phone','item','url','quantity','budget','shipping','alternativesAllowed','notes','idempotencyKey','botToken'])
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
  const { email, phone } = contact(body.email, body.phone)
  const shipping = text(body.shipping || 'sea', 'SHIPPING', { required: true, max: 10 })
  if (!['air','sea','either'].includes(shipping)) throw new Error('SHIPPING_INVALID')
  const quantity = Number(body.quantity)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('QUANTITY_INVALID')
  const budget = body.budget === '' || body.budget == null ? null : Number(body.budget)
  if (budget != null && (!Number.isFinite(budget) || budget < 0 || budget > 10000000)) throw new Error('BUDGET_INVALID')
  const url = text(body.url, 'URL', { max: 2048 })
  if (url) {
    let parsed
    try { parsed = new URL(url) } catch { throw new Error('URL_INVALID') }
    if (!['http:','https:'].includes(parsed.protocol)) throw new Error('URL_INVALID')
  }
  return {
    payload: {
      alternativesAllowed: body.alternativesAllowed === true,
      budget: budget == null ? '' : budget,
      customerName: text(body.customerName, 'CUSTOMER_NAME', { required: true, min: 1, max: 140 }),
      email, idempotencyKey: idempotencyKey(body.idempotencyKey),
      item: text(body.item, 'ITEM', { required: true, min: 2, max: 500 }),
      notes: text(body.notes, 'NOTES', { max: 2000 }), phone, quantity, shipping, url,
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
    const { data, error } = await client.rpc('submit_guest_pasabuy_v1', signedRpcArguments(req, 'pasabuy', payload))
    if (error) return safeJson(res, 503, { error: { code: 'PASABUY_SERVICE_UNAVAILABLE' } })
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
