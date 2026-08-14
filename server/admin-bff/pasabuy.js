import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STATUS = new Set([
  'researching', 'quoted', 'approved', 'purchasing', 'purchased',
  'in_transit', 'arrived', 'delivered', 'expired', 'cancelled',
])
const SHIPPING = new Set(['air', 'sea'])

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REQUEST_INVALID')
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
}

function text(value, { required = false, max = 500 } = {}) {
  const result = String(value ?? '').trim()
  if ((required && !result) || result.length > max) throw new Error('REQUEST_INVALID')
  return result
}

function uuid(value) {
  const result = text(value, { required: true, max: 36 })
  if (!UUID.test(result)) throw new Error('REQUEST_INVALID')
  return result
}

function number(value, { min = 0, max }) {
  const result = Number(value)
  if (!Number.isFinite(result) || result < min || result > max) throw new Error('REQUEST_INVALID')
  return result
}

function timestamp(value, { future = false, maxFutureDays = 31 } = {}) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error('REQUEST_INVALID')
  const now = Date.now()
  if (future && (parsed.getTime() <= now || parsed.getTime() > now + maxFutureDays * 86_400_000)) {
    throw new Error('REQUEST_INVALID')
  }
  if (!future && parsed.getTime() > now + 5 * 60_000) throw new Error('REQUEST_INVALID')
  return parsed.toISOString()
}

export function validatePasabuyCommand(action, body) {
  if (action === 'pasabuy_transition') {
    exactObject(body, ['requestId', 'toStatus', 'reason'])
    const toStatus = text(body.toStatus, { required: true, max: 30 })
    if (!STATUS.has(toStatus)) throw new Error('REQUEST_INVALID')
    return {
      requestId: uuid(body.requestId), toStatus,
      reason: text(body.reason, { required: true, max: 500 }),
    }
  }
  if (action === 'pasabuy_quote') {
    exactObject(body, [
      'requestId', 'itemCostForeign', 'fxRate', 'fxSource', 'fxCapturedAt',
      'weightKg', 'shippingMethod', 'freightRateForeignPerKg',
      'customsTaxPercent', 'handlingPhp', 'marginPercent', 'finalPricePhp',
      'validUntil', 'priceRationale',
    ])
    const shippingMethod = text(body.shippingMethod, { required: true, max: 10 })
    if (!SHIPPING.has(shippingMethod)) throw new Error('REQUEST_INVALID')
    const payload = {
      requestId: uuid(body.requestId),
      itemCostForeign: number(body.itemCostForeign, { max: 10_000_000 }),
      fxRate: number(body.fxRate, { min: 0.000001, max: 10_000 }),
      fxSource: text(body.fxSource, { required: true, max: 200 }),
      fxCapturedAt: timestamp(body.fxCapturedAt),
      weightKg: number(body.weightKg, { max: 10_000 }),
      shippingMethod,
      freightRateForeignPerKg: number(body.freightRateForeignPerKg, { max: 100_000 }),
      customsTaxPercent: number(body.customsTaxPercent, { max: 100 }),
      handlingPhp: number(body.handlingPhp, { max: 100_000_000 }),
      marginPercent: number(body.marginPercent, { max: 1_000 }),
      finalPricePhp: number(body.finalPricePhp, { max: 100_000_000 }),
      validUntil: timestamp(body.validUntil, { future: true }),
      priceRationale: text(body.priceRationale, { required: true, max: 500 }),
    }
    const itemPhp = payload.itemCostForeign * payload.fxRate
    const freightPhp = payload.weightKg * payload.freightRateForeignPerKg * payload.fxRate
    const landed = itemPhp + freightPhp + ((itemPhp + freightPhp) * payload.customsTaxPercent / 100) + payload.handlingPhp
    if (payload.finalPricePhp + 0.005 < landed) throw new Error('REQUEST_INVALID')
    return payload
  }
  throw new Error('REQUEST_INVALID')
}

export async function readAdminPasabuy(client) {
  const { data, error } = await client.from('pasabuy_requests').select([
    'id,public_reference,customer_name,customer_email,customer_phone,item_title,reference_url',
    'quantity,target_budget_php,shipping_preference,alternatives_allowed,customer_notes,status,assigned_to,created_at,updated_at',
    'pasabuy_quotes(id,pasabuy_request_id,version,currency,item_cost_foreign,fx_rate,fx_source,fx_captured_at,weight_kg,shipping_method,freight_rate_foreign_per_kg,freight_cost_php,customs_tax_percent,customs_tax_php,handling_php,estimated_landed_cost_php,margin_percent,final_price_php,status,valid_until,created_by,created_at)',
  ].join(',')).order('created_at', { ascending: false }).limit(500)
  if (error) throw new Error('PASABUY_UNAVAILABLE')
  return { requests: data || [] }
}

export async function handlePasabuyCommand(req, res, action) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const payload = validatePasabuyCommand(action, await readJson(req))
    const signed = signedAdminCommandArguments(action, authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_pasabuy_command_v1', signed)
    if (error) {
      const providerCode = String(error.message || '')
      if (providerCode.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      if (providerCode.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      if (providerCode.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
      return safeJson(res, 503, { error: { code: 'PASABUY_COMMAND_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'PASABUY_COMMAND_UNAVAILABLE' } })
  }
}
