import { idempotencyKey, publicFailure, readJson, requireAllowedOrigin, requireStorefrontProject,
  safeJson, signedRpcArguments, text } from '../../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../../server/storefront-bff/supabase.js'
import { projectOrderCharge } from '../../../src/lib/orderChargeState.js'
import { createHash } from 'node:crypto'

export function validateOrderConversation(body) {
  const fields = { read: ['operation', 'orderReference'], message: ['operation', 'orderReference', 'message', 'idempotencyKey'],
    receipt: ['operation', 'orderReference', 'paymentReference', 'mediaType', 'base64', 'idempotencyKey'] }
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.hasOwn(fields, body.operation)
    || Object.keys(body).some(key => !fields[body.operation].includes(key))) throw new Error('REQUEST_INVALID')
  const orderReference = text(body.orderReference, 'ORDER', { required: true, min: 5, max: 100 })
  if (!/^WEB-[A-Z0-9-]+$/.test(orderReference)) throw new Error('ORDER_INVALID')
  const payload = { operation: body.operation, orderReference }
  if (body.operation === 'read') return payload
  payload.idempotencyKey = idempotencyKey(body.idempotencyKey)
  if (body.operation === 'message') return { ...payload, message: text(body.message, 'MESSAGE', { required: true, min: 1, max: 2000 }) }
  if (!['image/png', 'image/jpeg', 'application/pdf'].includes(body.mediaType)
    || typeof body.base64 !== 'string' || body.base64.length < 24 || body.base64.length > 4194304
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.base64)) throw new Error('RECEIPT_INVALID')
  const bytes = Buffer.from(body.base64, 'base64')
  const magic = { 'image/png': '89504e470d0a1a0a', 'image/jpeg': 'ffd8ff', 'application/pdf': '255044462d' }[body.mediaType]
  if (bytes.length < 16 || bytes.length > 3145728 || !bytes.toString('hex', 0, magic.length / 2).startsWith(magic)) throw new Error('RECEIPT_INVALID')
  return { ...payload, paymentReference: text(body.paymentReference, 'REFERENCE', { required: true, min: 1, max: 100 }),
    mediaType: body.mediaType, base64: body.base64 }
}

export default async function handler(req, res) {
  if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
  try {
    // Only this route admits the bounded 3 MB proof encoded as base64.
    const payload = validateOrderConversation(await readJson(req, 4194304 + 2048))
    const { base64, ...metadata } = payload
    const signedPayload = base64 ? { ...metadata, proofSha256: createHash('sha256').update(Buffer.from(base64, 'base64')).digest('hex') } : metadata
    const args = signedRpcArguments(req, payload.operation === 'read' ? 'guest_read' : 'guest_reply', signedPayload)
    if (!args.p_guest_grant_hash) return safeJson(res, 401, { error: { code: 'GUEST_ACCESS_REQUIRED' } })
    const { data, error } = await createStorefrontServerSupabase().rpc('guest_order_conversation_v1', { ...args, p_base64: base64 || null })
    if (error) return safeJson(res, 503, { error: { code: 'ORDER_CONVERSATION_UNAVAILABLE' } })
    const mapped = mapBoundaryResult(data)
    if (!mapped.ok) return safeJson(res, mapped.status, { error: { code: mapped.code } }, mapped.retryAfter ? { 'Retry-After': mapped.retryAfter } : {})
    const saved = mapped.result
    const receipt = payload.operation === 'read' ? projectOrderCharge({ public_reference: saved.public_reference,
      order_status: saved.order_status, payment_status: saved.payment_status, total_amount: saved.total_amount,
      shipping_quote_status: saved.shipping_quote_status, delivery_review_required: saved.delivery_review_required,
      messages: (saved.messages || []).map(item => ({ content: item.content, direction: item.direction, created_at: item.created_at })) }) : { received: true }
    return safeJson(res, 200, { ok: true, receipt })
  } catch (error) {
    const [status, code] = publicFailure(error)
    return safeJson(res, status, { error: { code } })
  }
}
