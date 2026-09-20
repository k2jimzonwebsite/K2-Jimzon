import {
  contact, idempotencyKey, publicFailure, quantity, readJson, requestHostname, requestIp, requireAllowedOrigin,
  requireStorefrontProject, safeJson, setGuestGrantCookie, signedRpcArguments, text,
  verifyBotChallenge,
} from '../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../server/storefront-bff/supabase.js'

import { strictNumeric } from '../../server/shared-numeric.js'

// The exact note marker Checkout writes for Cash on Delivery. Kept identical
// to the storefront copy and the database trigger by contract; a forged note
// claiming COD is refused below while the admin switch is off.
const COD_NOTE_MARKER = 'cash on delivery'

async function codAvailable(client) {
  try {
    const { data } = await client
      .from('payment_method_availability')
      .select('cod_available')
      .eq('method', 'cod')
      .maybeSingle()
    return data?.cod_available === true
  } catch {
    return false
  }
}

const FULFILLMENT = new Set([
  'Metro Manila delivery',
  'Courier delivery',
  'Pickup',
  'Standard Courier Delivery',
  'Metro Manila Express Dispatch',
  'Standard Courier Delivery (Luzon)',
  'Standard Courier Delivery (Visayas)',
  'Standard Courier Delivery (Mindanao)',
  'K2 Warehouse Pickup',
])

function validate(body) {
  const allowed = new Set([
    'customerName','email','phone','address','fulfillmentMethod','note','items','idempotencyKey','couponCode','botToken',
    'shippingAmount','shippingQuoteStatus',
  ])
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
    const itemQuantity = quantity(item.quantity, 'ITEM')
    if (!/^[A-Za-z0-9._/-]+$/.test(sku)) {
      throw new Error('ITEM_INVALID')
    }
    return { quantity: itemQuantity, sku }
  })
  const couponCode = text(body.couponCode, 'COUPON', { max: 64 }).toUpperCase()
  if (couponCode && !/^[A-Z0-9_-]+$/.test(couponCode)) throw new Error('COUPON_INVALID')

  let shippingAmount = null
  if (body.shippingAmount !== undefined) {
    shippingAmount = strictNumeric(body.shippingAmount, 'SHIPPING_AMOUNT_INVALID', { min: 0, max: 100000 })
  }

  let shippingQuoteStatus = null
  if (body.shippingQuoteStatus !== undefined) {
    const s = text(body.shippingQuoteStatus, 'SHIPPING_QUOTE_STATUS', { required: true, max: 40 })
    if (!['pending_quote', 'quoted', 'customer_confirmed', 'platform_charged', 'waived'].includes(s)) {
      throw new Error('SHIPPING_QUOTE_STATUS_INVALID')
    }
    shippingQuoteStatus = s
  }

  const payload = {
    address, couponCode, customerName, email,
    fulfillmentMethod, idempotencyKey: idempotencyKey(body.idempotencyKey), items,
    note: text(body.note, 'NOTE', { max: 2000 }), phone,
  }
  if (shippingAmount !== null) payload.shippingAmount = shippingAmount
  if (shippingQuoteStatus !== null) payload.shippingQuoteStatus = shippingQuoteStatus

  return {
    payload,
    botToken: body.botToken,
  }
}

export default async function handler(req, res) {
  if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
  try {
    const { payload, botToken } = validate(await readJson(req))
    if (!await verifyBotChallenge(botToken, requestIp(req), 'guest_order', { hostname: requestHostname(req) })) {
      return safeJson(res, 403, { error: { code: 'BOT_CHALLENGE_REQUIRED' } })
    }
    const client = createStorefrontServerSupabase()
    if (String(payload.note || '').toLowerCase().includes(COD_NOTE_MARKER) && !(await codAvailable(client))) {
      return safeJson(res, 409, { error: { code: 'COD_UNAVAILABLE' } })
    }
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
