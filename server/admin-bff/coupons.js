import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'
import { isAdminRole } from './supabase.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CODE = /^[A-Z0-9][A-Z0-9_-]{2,39}$/
const TYPES = new Set(['percentage', 'fixed'])

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REQUEST_INVALID')
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
}

function text(value, { required = false, min = 0, max = 500 } = {}) {
  const result = String(value ?? '').trim()
  if ((required && result.length < Math.max(1, min)) || result.length > max || (result && result.length < min)) throw new Error('REQUEST_INVALID')
  return result
}

function uuid(value) {
  const result = text(value, { required: true, min: 36, max: 36 })
  if (!UUID.test(result)) throw new Error('REQUEST_INVALID')
  return result
}

function number(value, { min = 0, max }) {
  const result = Number(value)
  if (!Number.isFinite(result) || result < min || result > max) throw new Error('REQUEST_INVALID')
  return Math.round(result * 100) / 100
}

function integer(value, optional = false) {
  if (optional && (value === null || value === undefined || value === '')) return null
  const result = Number(value)
  if (!Number.isInteger(result) || result < 1 || result > 1_000_000) throw new Error('REQUEST_INVALID')
  return result
}

function timestamp(value, optional = false) {
  if (optional && (value === null || value === undefined || value === '')) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error('REQUEST_INVALID')
  const earliest = Date.now() - 7 * 86_400_000
  const latest = Date.now() + 5 * 366 * 86_400_000
  if (parsed.getTime() < earliest || parsed.getTime() > latest) throw new Error('REQUEST_INVALID')
  return parsed.toISOString()
}

export function validateCouponCommand(action, body) {
  if (action === 'coupon_create') {
    exactObject(body, [
      'code', 'description', 'discountType', 'discountValue', 'minSpend', 'maxRedemptions',
      'startsAt', 'endsAt', 'isActive', 'isHunt', 'clue', 'reason',
    ])
    const code = text(body.code, { required: true, min: 3, max: 40 }).toUpperCase()
    if (!CODE.test(code)) throw new Error('REQUEST_INVALID')
    const discountType = text(body.discountType, { required: true, max: 20 })
    if (!TYPES.has(discountType)) throw new Error('REQUEST_INVALID')
    const discountValue = number(body.discountValue, { min: 0.01, max: discountType === 'percentage' ? 100 : 1_000_000 })
    const startsAt = timestamp(body.startsAt)
    const endsAt = timestamp(body.endsAt, true)
    if (endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('REQUEST_INVALID')
    if (typeof body.isActive !== 'boolean' || typeof body.isHunt !== 'boolean') throw new Error('REQUEST_INVALID')
    const clue = text(body.clue, { required: body.isHunt, min: body.isHunt ? 3 : 0, max: 300 }) || null
    return {
      code,
      description: text(body.description, { required: true, min: 3, max: 300 }),
      discountType,
      discountValue,
      minSpend: number(body.minSpend, { min: 0, max: 10_000_000 }),
      maxRedemptions: integer(body.maxRedemptions, true),
      startsAt,
      endsAt,
      isActive: body.isActive,
      isHunt: body.isHunt,
      clue,
      reason: text(body.reason, { required: true, min: 10, max: 500 }),
    }
  }
  if (action === 'coupon_state') {
    exactObject(body, ['couponId', 'active', 'reason'])
    if (typeof body.active !== 'boolean') throw new Error('REQUEST_INVALID')
    return { couponId: uuid(body.couponId), active: body.active, reason: text(body.reason, { required: true, min: 10, max: 500 }) }
  }
  if (action === 'coupon_archive') {
    exactObject(body, ['couponId', 'reason'])
    return { couponId: uuid(body.couponId), reason: text(body.reason, { required: true, min: 10, max: 500 }) }
  }
  throw new Error('REQUEST_INVALID')
}

export async function readAdminCoupons(client) {
  const { data, error } = await client.from('coupons').select([
    'id,code,description,discount_type,discount_value,min_spend,max_redemptions',
    'redemption_count,starts_at,ends_at,is_active,is_hunt,clue,archived_at,created_at,updated_at',
  ].join(',')).order('created_at', { ascending: false }).limit(500)
  if (error) throw new Error('COUPONS_UNAVAILABLE')
  return { coupons: data || [], asOf: new Date().toISOString() }
}

export async function handleCouponCommand(req, res, action) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'COUPON_ADMIN_REQUIRED' } })
  try {
    const payload = validateCouponCommand(action, await readJson(req))
    const signed = signedAdminCommandArguments(action, authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_coupon_command_v1', signed)
    if (error) {
      const providerCode = String(error.message || '')
      if (providerCode.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      if (providerCode.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      if (providerCode.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
      if (providerCode.includes('K2_COUPON_ADMIN_REQUIRED')) return safeJson(res, 403, { error: { code: 'COUPON_ADMIN_REQUIRED' } })
      if (providerCode.includes('K2_COUPON_STATE_CONFLICT')) return safeJson(res, 409, { error: { code: 'COUPON_STATE_CONFLICT' } })
      if (error.code === '23505') return safeJson(res, 409, { error: { code: 'COUPON_CODE_CONFLICT' } })
      return safeJson(res, 503, { error: { code: 'COUPON_COMMAND_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    return safeJson(res, 503, { error: { code: 'COUPON_COMMAND_UNAVAILABLE' } })
  }
}
