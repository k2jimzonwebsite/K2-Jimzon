// Continuity only. The signed database command owns identity, price and expiry.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REFERENCE = /^WEB-[A-Z0-9]{8,32}$/
const invalid = () => { throw Error('Keep this request and contact K2. Its saved approval could not be restored safely.') }
export function expressAcceptanceStorageKey(reference) {
  if (!REFERENCE.test(reference || '')) invalid()
  return `k2-express-acceptance-v1:${reference}`
}
export function readExpressAcceptance(reference) {
  const raw = localStorage.getItem(expressAcceptanceStorageKey(reference))
  if (raw === null) return null
  if (new TextEncoder().encode(raw).length > 4096) invalid()
  let r
  try { r = JSON.parse(raw) } catch { invalid() }
  if (!r || r.version !== 1 || !['pending', 'resolved', 'rejected'].includes(r.state)
    || typeof r.identity !== 'string' || !(r.identity === 'guest' || UUID.test(r.identity))
    || !r.body || Object.keys(r.body).length !== 3 || r.body.orderReference !== reference
    || !UUID.test(r.body.idempotencyKey || '') || !Number.isInteger(r.body.quoteVersion)
    || r.body.quoteVersion < 1 || r.body.quoteVersion > 2147483647) invalid()
  if (r.state === 'resolved' && (!r.receipt || r.receipt.orderReference !== reference
    || r.receipt.quoteVersion !== r.body.quoteVersion || r.receipt.shippingQuoteStatus !== 'customer_confirmed'
    || !Number.isFinite(r.receipt.totalAmount) || r.receipt.totalAmount < 0
    || typeof r.receipt.acceptedAt !== 'string' || !Number.isFinite(Date.parse(r.receipt.acceptedAt)))) invalid()
  return r
}
export function writeExpressAcceptance(reference, record) {
  const key = expressAcceptanceStorageKey(reference), raw = JSON.stringify(record)
  if (new TextEncoder().encode(raw).length > 4096) invalid()
  localStorage.setItem(key, raw)
  if (localStorage.getItem(key) !== raw) invalid()
  return readExpressAcceptance(reference)
}
export function validExpressReceipt(receipt, body) {
  return receipt?.orderReference === body.orderReference && receipt.quoteVersion === body.quoteVersion
    && receipt.shippingQuoteStatus === 'customer_confirmed' && Number.isFinite(receipt.totalAmount)
    && receipt.totalAmount >= 0 && typeof receipt.acceptedAt === 'string' && Number.isFinite(Date.parse(receipt.acceptedAt))
}
export function withExpressAcceptanceLock(reference, work) {
  if (!navigator.locks?.request) throw Error('Safe approval recovery is unavailable in this browser. Contact K2 before accepting.')
  return navigator.locks.request(expressAcceptanceStorageKey(reference), work)
}
