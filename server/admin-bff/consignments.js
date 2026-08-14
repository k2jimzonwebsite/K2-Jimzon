import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/
const STAGES = new Set(['milan', 'manila'])
const NEXT_STATES = new Set(['In_Transit', 'Arrived_Manila'])

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

function uuid(value) {
  const result = text(value, { required: true, min: 36, max: 36 })
  if (!UUID.test(result)) throw new Error('REQUEST_INVALID')
  return result
}

function date(value) {
  const result = text(value, { required: true, min: 10, max: 10 })
  if (!DATE.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) throw new Error('REQUEST_INVALID')
  const today = new Date().toISOString().slice(0, 10)
  const latest = new Date(); latest.setUTCFullYear(latest.getUTCFullYear() + 10)
  if (result < today || result > latest.toISOString().slice(0, 10)) throw new Error('REQUEST_INVALID')
  return result
}

export function validateConsignmentCommand(action, body) {
  if (action === 'consignment_create') {
    exactObject(body, ['manifestCode', 'shipmentReference'])
    return {
      manifestCode: text(body.manifestCode, { required: true, min: 3, max: 80 }),
      shipmentReference: text(body.shipmentReference, { max: 120 }),
    }
  }
  if (action === 'consignment_add_line') {
    exactObject(body, ['consignmentId', 'sku', 'batchCode', 'boxCode', 'bestBeforeDate', 'expectedQty'])
    const expectedQty = Number(body.expectedQty)
    if (!Number.isInteger(expectedQty) || expectedQty < 1 || expectedQty > 100_000) throw new Error('REQUEST_INVALID')
    return {
      consignmentId: uuid(body.consignmentId), sku: text(body.sku, { required: true, max: 120 }),
      batchCode: text(body.batchCode, { required: true, max: 120 }),
      boxCode: text(body.boxCode, { required: true, max: 120 }),
      bestBeforeDate: date(body.bestBeforeDate), expectedQty,
    }
  }
  if (action === 'consignment_scan') {
    exactObject(body, ['consignmentId', 'itemId', 'stage', 'scannedCode'])
    const stage = text(body.stage, { required: true, max: 10 })
    if (!STAGES.has(stage)) throw new Error('REQUEST_INVALID')
    return {
      consignmentId: uuid(body.consignmentId), itemId: uuid(body.itemId), stage,
      scannedCode: text(body.scannedCode, { required: true, max: 120 }),
    }
  }
  if (action === 'consignment_advance') {
    exactObject(body, ['consignmentId', 'toStatus', 'reason'])
    const toStatus = text(body.toStatus, { required: true, max: 30 })
    if (!NEXT_STATES.has(toStatus)) throw new Error('REQUEST_INVALID')
    return {
      consignmentId: uuid(body.consignmentId), toStatus,
      reason: text(body.reason, { required: true, min: 10, max: 500 }),
    }
  }
  if (action === 'consignment_finalize') {
    exactObject(body, ['consignmentId', 'notes'])
    return {
      consignmentId: uuid(body.consignmentId),
      notes: text(body.notes, { required: true, min: 10, max: 1000 }),
    }
  }
  throw new Error('REQUEST_INVALID')
}

export async function readConsignmentData(client) {
  const { data, error } = await client.from('consignments')
    .select('id,manifest_code,flight_number,departure_city,destination_city,status,packed_at,arrived_at,created_at,consignment_items(id,consignment_id,sku,batch_code,box_code,best_before_date,expected_qty,italy_packed_qty,manila_scanned_qty,status,created_at)')
    .order('created_at', { ascending: false }).limit(100)
  if (error) throw new Error('CONSIGNMENTS_UNAVAILABLE')
  const consignments = data || []
  const ids = consignments.map((item) => item.id)
  let events = []
  if (ids.length) {
    const result = await client.from('consignment_scan_events')
      .select('id,consignment_id,consignment_item_id,sku,stage,resulting_qty,actor_id,created_at')
      .in('consignment_id', ids).order('created_at', { ascending: false }).limit(200)
    if (result.error) throw new Error('CONSIGNMENTS_UNAVAILABLE')
    events = result.data || []
  }
  return { consignments, recentScanEvents: events }
}

export async function handleConsignmentCommand(req, res, action) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const payload = validateConsignmentCommand(action, await readJson(req))
    const signed = signedAdminCommandArguments(action, authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_consignment_command_v1', signed)
    if (error) {
      const providerCode = String(error.message || '')
      if (providerCode.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      if (providerCode.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      if (providerCode.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
      if (providerCode.includes('K2_SCAN_CODE_MISMATCH')) return safeJson(res, 409, { error: { code: 'SCAN_CODE_MISMATCH' } })
      return safeJson(res, 503, { error: { code: 'CONSIGNMENT_COMMAND_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'CONSIGNMENT_COMMAND_UNAVAILABLE' } })
  }
}
