import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PAYMENT_STATES = new Set(['awaiting_instructions', 'evidence_submitted', 'verified', 'failed', 'refunded'])

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REQUEST_INVALID')
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
  return value
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

export function validateFulfillmentCommand(action, body) {
  if (action === 'confirm_order') {
    exactObject(body, ['orderRequestId', 'reason'])
    return { orderRequestId: uuid(body.orderRequestId), reason: text(body.reason, { required: true }) }
  }
  if (action === 'packing_scan') {
    exactObject(body, ['orderRequestId', 'scannedCode'])
    return { orderRequestId: uuid(body.orderRequestId), scannedCode: text(body.scannedCode, { required: true, max: 120 }) }
  }
  if (action === 'payment_status') {
    exactObject(body, ['orderRequestId', 'toStatus', 'evidenceNote'])
    const toStatus = text(body.toStatus, { required: true, max: 40 })
    if (!PAYMENT_STATES.has(toStatus)) throw new Error('REQUEST_INVALID')
    const evidenceNote = text(body.evidenceNote, { max: 1000 })
    if (toStatus !== 'awaiting_instructions' && !evidenceNote) throw new Error('REQUEST_INVALID')
    return { orderRequestId: uuid(body.orderRequestId), toStatus, evidenceNote }
  }
  if (action === 'delivery_details') {
    exactObject(body, ['orderRequestId', 'shippingAmount', 'courierName', 'trackingNumber', 'waybillUrl', 'customerConfirmed', 'note'])
    const shippingAmount = Number(body.shippingAmount)
    if (!Number.isFinite(shippingAmount) || shippingAmount < 0 || shippingAmount > 1_000_000) throw new Error('REQUEST_INVALID')
    const waybillUrl = text(body.waybillUrl, { max: 1000 })
    if (waybillUrl && !/^https?:\/\//i.test(waybillUrl)) throw new Error('REQUEST_INVALID')
    if (typeof body.customerConfirmed !== 'boolean') throw new Error('REQUEST_INVALID')
    return {
      orderRequestId: uuid(body.orderRequestId), shippingAmount,
      courierName: text(body.courierName, { required: true, max: 120 }),
      trackingNumber: text(body.trackingNumber, { max: 200 }), waybillUrl,
      customerConfirmed: body.customerConfirmed, note: text(body.note, { required: true, max: 1000 }),
    }
  }
  if (action === 'fulfill_order') {
    exactObject(body, ['orderRequestId', 'handoverNote'])
    return { orderRequestId: uuid(body.orderRequestId), handoverNote: text(body.handoverNote, { required: true, max: 1000 }) }
  }
  if (action === 'transfer_lot') {
    exactObject(body, ['batchId', 'quantity', 'toCustodian', 'toLocation', 'reason'])
    const quantity = Number(body.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) throw new Error('REQUEST_INVALID')
    return {
      batchId: uuid(body.batchId), quantity,
      toCustodian: text(body.toCustodian, { required: true, max: 140 }),
      toLocation: text(body.toLocation, { max: 140 }), reason: text(body.reason, { required: true, max: 500 }),
    }
  }
  if (action === 'assign_box') {
    exactObject(body, ['boxCode', 'toCustodian', 'reason'])
    return {
      boxCode: text(body.boxCode, { required: true, max: 140 }),
      toCustodian: text(body.toCustodian, { required: true, max: 140 }),
      reason: text(body.reason, { required: true, max: 500 }),
    }
  }
  throw new Error('REQUEST_INVALID')
}

export async function handleFulfillmentCommand(req, res, action) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const payload = validateFulfillmentCommand(action, await readJson(req))
    const signed = signedAdminCommandArguments(action, authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_fulfillment_command_v1', signed)
    if (error) {
      const providerCode = String(error.message || '')
      if (providerCode.includes('K2_ADMIN_RATE_LIMITED')) {
        return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      }
      if (providerCode.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) {
        return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      }
      if (providerCode.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) {
        return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
      }
      return safeJson(res, 503, { error: { code: 'FULFILLMENT_COMMAND_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'FULFILLMENT_COMMAND_UNAVAILABLE' } })
  }
}

export async function readFulfillmentData(client) {
  const [submitted, confirmed, lots, staff] = await Promise.all([
    client.from('order_requests').select('id,public_reference,channel_source,customer_name,customer_email,customer_phone,delivery_address,fulfillment_method,subtotal,discount_amount,shipping_amount,shipping_quote_status,courier_name,tracking_number,waybill_url,total_amount,payment_status,created_at,order_request_items(sku,product_name,quantity,line_total)').eq('status', 'submitted').order('created_at', { ascending: true }),
    client.from('order_requests').select('id,public_reference,channel_source,customer_name,customer_email,customer_phone,delivery_address,fulfillment_method,payment_status,subtotal,discount_amount,shipping_amount,total_amount,delivery_status,shipping_quote_status,courier_name,tracking_number,waybill_url,created_at,order_request_items(id,sku,product_name,quantity,line_total),inventory_reservations(order_request_item_id,sku,quantity,packed_quantity,status,batch_id)').eq('status', 'confirmed').order('created_at', { ascending: false }),
    client.from('product_batches').select('id,box_code,batch_code,sku,quantity,reserved_quantity,custodian,hub,inventory_status,expiry_date').gt('quantity', 0),
    client.from('user_profiles').select('id,email,full_name,role').in('role', ['Admin', 'Staff']),
  ])
  if ([submitted, confirmed, lots, staff].some((result) => result.error)) throw new Error('FULFILLMENT_UNAVAILABLE')
  return {
    submitted: submitted.data || [], confirmed: confirmed.data || [], lots: lots.data || [],
    staff: (staff.data || []).map((profile) => ({
      id: profile.id, role: profile.role,
      displayName: profile.full_name || String(profile.email || '').split('@')[0] || 'Staff member',
    })),
  }
}
