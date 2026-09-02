import {
  contact, idempotencyKey, publicFailure, readJson, requestIp, requireAllowedOrigin,
  requireStorefrontProject, safeJson, setGuestGrantCookie, signedRpcArguments, text,
  verifyBotChallenge,
} from '../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../server/storefront-bff/supabase.js'

const FULFILLMENT = new Set(['Metro Manila delivery', 'Courier delivery', 'Pickup'])

function validate(body) {
  const allowed = new Set(['customerName','email','phone','address','fulfillmentMethod','note','items','idempotencyKey','couponCode','botToken'])
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
  const customerName = text(body.customerName, 'CUSTOMER_NAME', { required: true, min: 1, max: 140 })
  const { email, phone } = contact(body.email, body.phone)
  const address = text(body.address, 'ADDRESS', { required: true, min: 5, max: 500 })
  const fulfillmentMethod = text(body.fulfillmentMethod || 'Metro Manila delivery', 'FULFILLMENT', { required: true, max: 60 })
  if (!FULFILLMENT.has(fulfillmentMethod)) throw new Error('FULFILLMENT_INVALID')
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) throw new Error('ITEMS_INVALID')
  const items = body.items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)
        || Object.keys(item).some((key) => !['sku','quantity'].includes(key))) throw new Error('ITEM_INVALID')
    const sku = text(item.sku, 'SKU', { required: true, min: 1, max: 80 })
    const quantity = Number(item.quantity)
    if (!/^[A-Za-z0-9._/-]+$/.test(sku) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error('ITEM_INVALID')
    }
    return { quantity, sku }
  })
  const couponCode = text(body.couponCode, 'COUPON', { max: 64 }).toUpperCase()
  if (couponCode && !/^[A-Z0-9_-]+$/.test(couponCode)) throw new Error('COUPON_INVALID')
  return {
    payload: {
      address, couponCode, customerName, email,
      fulfillmentMethod, idempotencyKey: idempotencyKey(body.idempotencyKey), items,
      note: text(body.note, 'NOTE', { max: 2000 }), phone,
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
    const { data, error } = await client.rpc('submit_guest_order_v1', signedRpcArguments(req, 'order', payload))
    // K2STK is raised by reserve_order_request_lots_v1 when the units are
    // already held by someone else. That is a normal, expected outcome of two
    // customers reaching the last unit, not a service fault: telling the
    // customer the service is unavailable would hide the one fact they need.
    // The submission transaction has already rolled back, so no unfillable
    // order exists to clean up.
    if (error?.code === 'K2STK') {
      return safeJson(res, 409, { error: { code: 'INSUFFICIENT_STOCK' } })
    }
    if (error) return safeJson(res, 503, { error: { code: 'ORDER_SERVICE_UNAVAILABLE' } })
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
