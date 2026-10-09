// MAP-023 J. Static transport validation; native commands own current validity,
// ownership, quotation arithmetic and replay. Do not expire saved retries here.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REFERENCE = /^WEB-[A-Z0-9]{8,32}$/
function exact(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key))) throw Error('REQUEST_INVALID')
}
function integer(value, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw Error('REQUEST_INVALID')
  return value
}
function text(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 500) throw Error('REQUEST_INVALID')
  return value.trim()
}
function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw Error('REQUEST_INVALID')
  return value
}
export function validateExpressOrderId(value) {
  if (typeof value !== 'string' || !UUID.test(value)) throw Error('REQUEST_INVALID')
  return value
}
export function validateExpressQuote(body) {
  exact(body, ['orderRequestId', 'expectedVersion', 'courier', 'feeMinor', 'quotedAt', 'expiresAt', 'route', 'packageDescription', 'availabilityNote', 'evidenceRef', 'note'])
  if (typeof body.orderRequestId !== 'string' || !UUID.test(body.orderRequestId)
    || !['Lalamove', 'Grab'].includes(body.courier)) throw Error('REQUEST_INVALID')
  const result = { orderRequestId: body.orderRequestId, expectedVersion: integer(body.expectedVersion, 0, 2147483646),
    courier: body.courier, feeMinor: integer(body.feeMinor, 0, 10000000), quotedAt: timestamp(body.quotedAt), expiresAt: timestamp(body.expiresAt) }
  if (Date.parse(result.expiresAt) <= Date.parse(result.quotedAt)) throw Error('REQUEST_INVALID')
  for (const key of ['route', 'packageDescription', 'availabilityNote', 'evidenceRef', 'note']) result[key] = text(body[key])
  return result
}
export function validateExpressAcceptance(body) {
  exact(body, ['orderReference', 'quoteVersion', 'idempotencyKey'])
  if (typeof body.orderReference !== 'string' || !REFERENCE.test(body.orderReference)
    || typeof body.idempotencyKey !== 'string' || !UUID.test(body.idempotencyKey)) throw Error('REQUEST_INVALID')
  return { orderReference: body.orderReference, quoteVersion: integer(body.quoteVersion, 1, 2147483647), idempotencyKey: body.idempotencyKey }
}
export function expressDeliveryFailure(error) {
  const message = String(error?.message || '')
  if (message.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT') || message.includes('K2_DELIVERY_IDEMPOTENCY_CONFLICT')) return [409, 'IDEMPOTENCY_CONFLICT']
  if (message.includes('K2_EXPRESS_QUOTE_STALE')) return [409, 'EXPRESS_QUOTE_STALE']
  if (message.includes('K2_EXPRESS_QUOTE_EXPIRED')) return [409, 'EXPRESS_QUOTE_EXPIRED']
  if (message.includes('K2_EXPRESS_ORDER_INELIGIBLE')) return [409, 'EXPRESS_ORDER_INELIGIBLE']
  if (error?.code === '42501') return [403, 'DELIVERY_ACCESS_REQUIRED']
  if (error?.code === '54000') return [429, 'RATE_LIMITED']
  if (error?.code === '22023') return [400, 'REQUEST_INVALID']
  return [503, 'EXPRESS_DELIVERY_UNAVAILABLE']
}
