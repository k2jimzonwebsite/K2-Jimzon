// Browser continuity, never monetary/inventory authority. No automatic expiry:
// an unknown outcome must retain its original identity until server resolution.
export const CHECKOUT_RECOVERY_KEY = 'k2-checkout-recovery-v1'
const MAX_BYTES = 256 * 1024
const payloadFields = new Set(['customerName','email','phone','address','fulfillmentMethod','note','items','idempotencyKey','couponCode','delivery','shippingAmount','shippingQuoteStatus'])
const receiptFields = ['public_reference','status','payment_status','subtotal','discount_amount','total_amount','shipping_quote_status','delivery_status','created_at','shipping_amount','fulfillment_method','item_count']
const invalid = () => { throw new Error('CHECKOUT_RECOVERY_UNAVAILABLE') }
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)

function validate(record) {
  if (!object(record) || record.version !== 1 || !['pending','resolved','rejected'].includes(record.state)
      || typeof record.key !== 'string' || !/^[a-f0-9-]{36}$/i.test(record.key)) invalid()
  if (record.state === 'pending') {
    const payload = record.payload
    if (!object(payload) || payload.idempotencyKey !== record.key
        || Object.keys(payload).some(key => !payloadFields.has(key))
        || !Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 50
        || payload.items.some(item => !object(item) || typeof item.sku !== 'string' || item.sku.length > 80
          || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)
        || !Array.isArray(record.lines) || record.lines.length !== payload.items.length
        || record.lines.some((line, index) => !object(line) || !object(line.product)
          || line.id !== payload.items[index].sku || line.qty !== payload.items[index].quantity
          || line.product.id !== line.id || typeof line.product.name !== 'string'
          || !Number.isFinite(line.unit) || !Number.isFinite(line.product.retail))) invalid()
  } else if (record.state === 'resolved' && (!object(record.receipt)
      || !record.receipt.public_reference || Object.keys(record.receipt).some(key => !receiptFields.includes(key)))) invalid()
  return record
}

export function readCheckoutRecovery() {
  const raw = window.localStorage.getItem(CHECKOUT_RECOVERY_KEY)
  if (raw === null) return null
  if (new TextEncoder().encode(raw).length > MAX_BYTES) invalid()
  return validate(JSON.parse(raw))
}

export function writeCheckoutRecovery(record) {
  validate(record)
  const raw = JSON.stringify(record)
  if (new TextEncoder().encode(raw).length > MAX_BYTES) invalid()
  window.localStorage.setItem(CHECKOUT_RECOVERY_KEY, raw)
  if (window.localStorage.getItem(CHECKOUT_RECOVERY_KEY) !== raw) invalid()
}

export function pendingCheckoutRecord(payload, lines, display) {
  return { version: 1, state: 'pending', key: payload.idempotencyKey, payload,
    paymentMethod: display.paymentMethod, deliveryPreview: display.deliveryPreview,
    lines: lines.map(({ id, qty, unit, product }) => ({ id, qty, unit, product: {
      id: product.id, name: product.name, retail: product.retail, size: product.size,
      image: product.image, primary_image_url: product.primary_image_url,
    } })) }
}

export function resolvedCheckoutRecord(key, saved, display, count) {
  const receipt = Object.fromEntries(receiptFields.filter(field => saved[field] !== undefined).map(field => [field, saved[field]]))
  receipt.item_count = count
  return { version: 1, state: 'resolved', key, receipt, paymentMethod: display.paymentMethod }
}

export async function withCheckoutLock(work) {
  if (!navigator.locks?.request) invalid()
  return navigator.locks.request('k2-checkout-request-v1', { mode: 'exclusive' }, work)
}
