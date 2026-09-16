import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'
import { isAdminRole } from './supabase.js'
import { strictNumeric } from '../shared-numeric.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PAYMENT_STATES = new Set(['awaiting_instructions', 'evidence_submitted', 'verified', 'failed', 'refunded'])
const PAYMENT_METHODS = new Set(['gcash', 'bank_transfer', 'maya', 'cash', 'other'])

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REQUEST_INVALID')
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
  return value
}

function text(value, { required = false, max = 500 } = {}) {
  if (value != null && typeof value !== 'string') throw new Error('REQUEST_INVALID')
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
    exactObject(body, ['orderRequestId', 'scannedCode', 'reservationId', 'lotConfirmed'])
    if (body.lotConfirmed !== true) throw new Error('REQUEST_INVALID')
    return { orderRequestId: uuid(body.orderRequestId), scannedCode: text(body.scannedCode, { required: true, max: 120 }), reservationId: uuid(body.reservationId), lotConfirmed: true }
  }
  if (action === 'payment_status') {
    exactObject(body, [
      'orderRequestId', 'toStatus', 'evidenceNote', 'expectedPaymentStatus', 'expectedUpdatedAt',
      'paymentMethod', 'paymentAmount', 'paymentCurrency', 'payerName', 'paymentReference', 'proofAssetRef',
    ])
    const toStatus = text(body.toStatus, { required: true, max: 40 })
    if (!PAYMENT_STATES.has(toStatus)) throw new Error('REQUEST_INVALID')
    const evidenceNote = text(body.evidenceNote, { max: 1000 })
    const expectedPaymentStatus = text(body.expectedPaymentStatus, { required: true, max: 40 })
    const expectedUpdatedAt = text(body.expectedUpdatedAt, { required: true, max: 40 })
    if (!new Set(['not_requested', ...PAYMENT_STATES]).has(expectedPaymentStatus)
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(expectedUpdatedAt)
      || !Number.isFinite(Date.parse(expectedUpdatedAt))) throw new Error('REQUEST_INVALID')

    const result = { orderRequestId: uuid(body.orderRequestId), toStatus, evidenceNote, expectedPaymentStatus, expectedUpdatedAt }

    const hasStructured = body.paymentMethod !== undefined
      || body.paymentAmount !== undefined
      || body.paymentCurrency !== undefined
      || body.payerName !== undefined
      || body.paymentReference !== undefined
      || body.proofAssetRef !== undefined

    if (hasStructured) {
      const paymentMethod = text(body.paymentMethod, { required: true, max: 40 })
      if (!PAYMENT_METHODS.has(paymentMethod)) throw new Error('REQUEST_INVALID')
      const paymentAmount = strictNumeric(body.paymentAmount, 'REQUEST_INVALID', { min: 0.01, max: 10000000 })
      const paymentCurrency = body.paymentCurrency === undefined
        ? 'PHP'
        : text(body.paymentCurrency, { required: true, max: 10 })
      if (paymentCurrency !== 'PHP') throw new Error('REQUEST_INVALID')
      const payerName = text(body.payerName, { required: true, max: 140 })
      const paymentReference = text(body.paymentReference, { required: true, max: 100 })
      const proofAssetRef = text(body.proofAssetRef, { max: 500 })

      result.paymentMethod = paymentMethod
      result.paymentAmount = paymentAmount
      result.paymentCurrency = paymentCurrency
      result.payerName = payerName
      result.paymentReference = paymentReference
      if (proofAssetRef) result.proofAssetRef = proofAssetRef
    } else if (toStatus !== 'awaiting_instructions' && !evidenceNote) {
      throw new Error('REQUEST_INVALID')
    }

    return result
  }
  if (action === 'delivery_details') {
    exactObject(body, ['orderRequestId', 'shippingAmount', 'courierName', 'trackingNumber', 'waybillUrl', 'customerConfirmed', 'note'])
    const shippingAmount = body.shippingAmount
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
    const quantity = body.quantity
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

/**
 * Payment verdicts (verified / failed / refunded) decide money truth and
 * require the finance-verifier separation: only an Admin may record them.
 * Operational commands (confirm, packing, evidence submission, delivery,
 * fulfill, custody moves) stay available to Staff running the warehouse.
 */
const PAYMENT_VERDICT_STATES = new Set(['verified', 'failed', 'refunded'])

export function requiresPaymentVerdictAdmin(action, toStatus) {
  return action === 'payment_status' && PAYMENT_VERDICT_STATES.has(toStatus)
}

export async function handleFulfillmentCommand(req, res, action) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const payload = validateFulfillmentCommand(action, await readJson(req))
    if (requiresPaymentVerdictAdmin(action, payload.toStatus) && !isAdminRole(authorized.identity.role)) {
      return safeJson(res, 403, { error: { code: 'PAYMENT_VERDICT_ADMIN_REQUIRED' } })
    }
    const signed = signedAdminCommandArguments(action, authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_fulfillment_command_v1', signed)
    if (error) {
      const providerCode = String(error.message || '')
      if (['K2_PACKING_ALLOCATION_INVALID', 'K2_PACKING_LOT_CONFIRMATION_REQUIRED', 'K2_RESERVATION_RECONCILIATION_REQUIRED'].includes(providerCode)) {
        return safeJson(res, 409, { error: { code: providerCode.slice(3) } })
      }
      const paymentErrors = [
        'VERSION_CONFLICT', 'ORDER_INELIGIBLE', 'STOCK_INELIGIBLE', 'TRANSITION_INVALID',
        'EVIDENCE_REQUIRED', 'INDEPENDENT_REVIEW_REQUIRED',
        'METHOD_INVALID', 'AMOUNT_INVALID', 'CURRENCY_INVALID', 'PAYER_INVALID', 'REFERENCE_INVALID', 'PROOF_INVALID',
      ]
      const paymentError = paymentErrors.find(code => providerCode === `K2_PAYMENT_${code}`)
      if (paymentError) return safeJson(res, 409, { error: { code: `PAYMENT_${paymentError}` } })
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

export const FULFILLMENT_READ_LIMITS = Object.freeze({
  submitted: 200,
  confirmed: 200,
  lots: 1000,
  staff: 50,
})

export async function readFulfillmentData(client) {
  const [submitted, confirmed, lots, staff] = await Promise.all([
    client.from('order_requests')
      .select('id,public_reference,channel_source,customer_name,customer_email,customer_phone,delivery_address,fulfillment_method,subtotal,discount_amount,shipping_amount,shipping_quote_status,courier_name,tracking_number,waybill_url,total_amount,payment_status,payment_evidence,updated_at,created_at,order_request_items(sku,product_name,quantity,line_total)')
      .eq('status', 'submitted')
      .order('created_at', { ascending: true })
      .limit(FULFILLMENT_READ_LIMITS.submitted),
    client.from('order_requests')
      .select('id,public_reference,channel_source,customer_name,customer_email,customer_phone,delivery_address,fulfillment_method,payment_status,payment_evidence,subtotal,discount_amount,shipping_amount,total_amount,delivery_status,shipping_quote_status,courier_name,tracking_number,waybill_url,updated_at,created_at,order_request_items(id,sku,product_name,quantity,line_total),inventory_reservations(id,order_request_item_id,sku,quantity,packed_quantity,status,batch_id)')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(FULFILLMENT_READ_LIMITS.confirmed),
    client.from('product_batches')
      .select('id,box_code,batch_code,sku,quantity,reserved_quantity,custodian,hub,inventory_status,expiry_date')
      .gt('quantity', 0)
      .limit(FULFILLMENT_READ_LIMITS.lots),
    client.from('user_profiles')
      .select('id,email,full_name,role')
      .in('role', ['Admin', 'Staff', 'SuperAdmin'])
      .limit(FULFILLMENT_READ_LIMITS.staff),
  ])
  if ([submitted, confirmed, lots, staff].some((result) => result.error)) throw new Error('FULFILLMENT_UNAVAILABLE')

  const submittedRows = submitted.data || []
  const confirmedRows = confirmed.data || []
  const lotRows = lots.data || []
  const staffRows = staff.data || []

  const completeness = {
    submitted: {
      returned: submittedRows.length,
      limit: FULFILLMENT_READ_LIMITS.submitted,
      truncated: submittedRows.length >= FULFILLMENT_READ_LIMITS.submitted,
    },
    confirmed: {
      returned: confirmedRows.length,
      limit: FULFILLMENT_READ_LIMITS.confirmed,
      truncated: confirmedRows.length >= FULFILLMENT_READ_LIMITS.confirmed,
    },
    lots: {
      returned: lotRows.length,
      limit: FULFILLMENT_READ_LIMITS.lots,
      truncated: lotRows.length >= FULFILLMENT_READ_LIMITS.lots,
    },
    staff: {
      returned: staffRows.length,
      limit: FULFILLMENT_READ_LIMITS.staff,
      truncated: staffRows.length >= FULFILLMENT_READ_LIMITS.staff,
    },
  }

  return {
    completeness,
    submitted: submittedRows,
    confirmed: confirmedRows,
    lots: lotRows,
    staff: staffRows.map((profile) => ({
      id: profile.id, role: profile.role,
      displayName: profile.full_name || String(profile.email || '').split('@')[0] || 'Staff member',
    })),
  }
}
