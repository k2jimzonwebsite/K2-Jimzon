import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/
const STATUSES = new Set(['available', 'quarantine', 'damaged', 'expired', 'unaccounted', 'depleted'])

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REQUEST_INVALID')
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
  return value
}

function text(value, { required = false, min = 0, max = 500 } = {}) {
  const result = String(value ?? '').trim()
  if ((required && result.length < Math.max(1, min)) || result.length > max || (result && result.length < min)) {
    throw new Error('REQUEST_INVALID')
  }
  return result
}

function uuid(value, optional = false) {
  if (optional && (value === null || value === undefined || value === '')) return null
  const result = text(value, { required: true, min: 36, max: 36 })
  if (!UUID.test(result)) throw new Error('REQUEST_INVALID')
  return result
}

function date(value, optional = false) {
  if (optional && (value === null || value === undefined || value === '')) return null
  const result = text(value, { required: true, min: 10, max: 10 })
  if (!DATE.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) throw new Error('REQUEST_INVALID')
  if (result < '2000-01-01') throw new Error('REQUEST_INVALID')
  const latest = new Date(); latest.setUTCFullYear(latest.getUTCFullYear() + 10)
  if (result > latest.toISOString().slice(0, 10)) throw new Error('REQUEST_INVALID')
  return result
}

function lot(value) {
  exactObject(value, [
    'id', 'boxCode', 'batchCode', 'quantity', 'expiryDate', 'landedDate',
    'hub', 'custodian', 'channel', 'pinned', 'status',
  ])
  const quantity = Number(value.quantity)
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1_000_000) throw new Error('REQUEST_INVALID')
  const status = text(value.status, { required: true, max: 30 })
  if (!STATUSES.has(status)) throw new Error('REQUEST_INVALID')
  const normalized = {
    id: uuid(value.id, true),
    boxCode: text(value.boxCode, { required: quantity > 0, max: 120 }),
    batchCode: text(value.batchCode, { required: quantity > 0, max: 120 }),
    quantity,
    expiryDate: date(value.expiryDate, quantity === 0),
    landedDate: date(value.landedDate, true),
    hub: text(value.hub, { required: quantity > 0, max: 120 }),
    custodian: text(value.custodian, { required: quantity > 0, max: 120 }),
    channel: text(value.channel, { max: 80 }),
    pinned: value.pinned,
    status,
  }
  if (typeof normalized.pinned !== 'boolean') throw new Error('REQUEST_INVALID')
  return normalized
}

export function validateLotCommand(action, body) {
  if (action === 'lots_reconcile') {
    exactObject(body, ['sku', 'reason', 'lots'])
    if (!Array.isArray(body.lots) || body.lots.length > 50) throw new Error('REQUEST_INVALID')
    const lots = body.lots.map(lot)
    const ids = lots.map((item) => item.id).filter(Boolean)
    if (new Set(ids).size !== ids.length) throw new Error('REQUEST_INVALID')
    return {
      sku: text(body.sku, { required: true, max: 120 }),
      reason: text(body.reason, { required: true, min: 10, max: 500 }),
      lots,
    }
  }
  if (action === 'lot_clearance') {
    exactObject(body, ['batchId', 'approved', 'reason'])
    if (typeof body.approved !== 'boolean') throw new Error('REQUEST_INVALID')
    return {
      batchId: uuid(body.batchId), approved: body.approved,
      reason: text(body.reason, { required: true, min: 10, max: 500 }),
    }
  }
  throw new Error('REQUEST_INVALID')
}

export async function readLotData(client, requestedSku = '') {
  const sku = text(requestedSku, { max: 120 })
  let query = client.from('product_batches')
    .select('id,sku,box_code,batch_code,quantity,quantity_available,reserved_quantity,expiry_date,best_before_date,landed_date,hub,custodian,channel,is_pinned,inventory_status,clearance_approved_at,clearance_approved_by,created_at,updated_at')
    .order('expiry_date', { ascending: true, nullsFirst: false }).limit(sku ? 200 : 500)
  if (sku) query = query.eq('sku', sku)
  const { data, error } = await query
  if (error) throw new Error('LOTS_UNAVAILABLE')
  const lots = data || []
  const skus = [...new Set(lots.map((item) => item.sku).filter(Boolean))]
  let productNames = {}
  if (skus.length) {
    const products = await client.from('products').select('sku,name,title').in('sku', skus).limit(500)
    if (products.error) throw new Error('LOTS_UNAVAILABLE')
    productNames = Object.fromEntries((products.data || []).map((item) => [item.sku, item.name || item.title || item.sku]))
  }
  return {
    lots: lots.map((item) => ({ ...item, product_name: productNames[item.sku] || item.sku })),
    asOf: new Date().toISOString(),
  }
}

export async function handleLotCommand(req, res, action) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const payload = validateLotCommand(action, await readJson(req))
    const signed = signedAdminCommandArguments(action, authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_lot_command_v1', signed)
    if (error) {
      const providerCode = String(error.message || '')
      if (providerCode.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      if (providerCode.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      if (providerCode.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
      if (providerCode.includes('K2_LOT_RESERVED_CONFLICT')) return safeJson(res, 409, { error: { code: 'LOT_RESERVED_CONFLICT' } })
      if (providerCode.includes('K2_CLEARANCE_INELIGIBLE')) return safeJson(res, 409, { error: { code: 'CLEARANCE_INELIGIBLE' } })
      return safeJson(res, 503, { error: { code: 'LOT_COMMAND_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'LOT_COMMAND_UNAVAILABLE' } })
  }
}
