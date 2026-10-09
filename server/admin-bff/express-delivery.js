// MAP-023 J. Prepared signed staff quote caller; native installation required.
import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'
import { validateExpressQuote, validateExpressOrderId, expressDeliveryFailure } from '../express-delivery-contract.js'

export async function handleExpressDeliveryQuote(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const key = req.headers['x-k2-idempotency-key']
  if (req.method === 'POST' && (typeof key !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (!['Admin', 'Staff'].includes(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'DELIVERY_ACCESS_REQUIRED' } })
  try {
    if (req.method === 'GET') {
      const orderRequestId = validateExpressOrderId(req.query?.orderRequestId)
      const { data, error } = await authorized.client.rpc('read_staff_express_delivery_v1', { p_order_id: orderRequestId })
      if (error) {
        const [status, code] = expressDeliveryFailure(error)
        return safeJson(res, status, { error: { code } })
      }
      if (!data?.ok || data.orderRequestId !== orderRequestId || !Number.isInteger(data.currentVersion)
        || data.currentVersion < 0 || typeof data.eligible !== 'boolean') return safeJson(res, 503, { error: { code: 'EXPRESS_DELIVERY_UNAVAILABLE' } })
      const quote = data.quote
      if ((data.currentVersion === 0) !== (quote === null)) return safeJson(res, 503, { error: { code: 'EXPRESS_DELIVERY_UNAVAILABLE' } })
      if (quote !== null && (!quote || quote.quoteVersion !== data.currentVersion || !['Lalamove', 'Grab'].includes(quote.courier)
        || !Number.isInteger(quote.feeMinor) || quote.feeMinor < 0 || quote.feeMinor > 10000000
        || ['subtotal', 'discountAmount', 'proposedTotal'].some(field => !Number.isFinite(quote[field]) || quote[field] < 0)
        || typeof quote.accepted !== 'boolean' || ['quotedAt', 'expiresAt'].some(field => typeof quote[field] !== 'string' || !Number.isFinite(Date.parse(quote[field])))
        || ['availabilityNote', 'route', 'packageDescription', 'evidenceRef', 'note'].some(field => typeof quote[field] !== 'string' || !quote[field].trim() || quote[field].length > 500))) {
        return safeJson(res, 503, { error: { code: 'EXPRESS_DELIVERY_UNAVAILABLE' } })
      }
      return safeJson(res, 200, { ok: true, orderRequestId, currentVersion: data.currentVersion, eligible: data.eligible,
        quote: quote === null ? null : Object.fromEntries(['quoteVersion', 'courier', 'feeMinor', 'subtotal', 'discountAmount', 'proposedTotal', 'quotedAt', 'expiresAt', 'availabilityNote', 'accepted', 'route', 'packageDescription', 'evidenceRef', 'note'].map(field => [field, quote[field]])) })
    }
    const payload = validateExpressQuote(await readJson(req))
    const args = signedAdminCommandArguments('delivery_express_quote', authorized.identity.userId, key, payload)
    const { data, error } = await authorized.client.rpc('execute_express_delivery_quote_v1', args)
    if (error) {
      const [status, code] = expressDeliveryFailure(error)
      return safeJson(res, status, { error: { code } }, status === 429 ? { 'Retry-After': '60' } : {})
    }
    if (!data?.ok || data.orderRequestId !== payload.orderRequestId || !Number.isInteger(data.quoteVersion)
      || data.quoteVersion !== payload.expectedVersion + 1) return safeJson(res, 503, { error: { code: 'EXPRESS_DELIVERY_UNAVAILABLE' } })
    return safeJson(res, 200, { ok: true, receipt: { orderRequestId: data.orderRequestId, quoteVersion: data.quoteVersion } })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    return safeJson(res, 503, { error: { code: 'EXPRESS_DELIVERY_UNAVAILABLE' } })
  }
}
