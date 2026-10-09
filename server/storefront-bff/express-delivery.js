// MAP-023 J. Prepared caller, not buyer acceptance until native receipt.
import { authorizationBearer, readJson, requireAllowedOrigin, requireStorefrontProject, safeJson, signedRpcArguments } from './security.js'
import { createStorefrontServerSupabase } from './supabase.js'
import { validateExpressAcceptance, expressDeliveryFailure } from '../express-delivery-contract.js'

export async function handleExpressAcceptance(req, res, { account = false } = {}) {
  if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
  const token = account ? authorizationBearer(req) : null
  if (account && !token) return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })
  try {
    const payload = validateExpressAcceptance(await readJson(req))
    const client = createStorefrontServerSupabase(token)
    if (account) {
      const { data, error } = await client.auth.getUser(token)
      if (error || !data?.user?.id) return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })
    }
    const action = account ? 'account_delivery_accept' : 'guest_delivery_accept'
    const args = signedRpcArguments(req, action, payload)
    const { data, error } = account
      ? await client.rpc('accept_account_express_delivery_v1', args)
      : await client.rpc('accept_guest_express_delivery_v1', args)
    if (error) {
      const [status, code] = expressDeliveryFailure(error)
      return safeJson(res, status, { error: { code } }, status === 429 ? { 'Retry-After': '60' } : {})
    }
    if (!data?.ok || data.orderReference !== payload.orderReference || data.quoteVersion !== payload.quoteVersion
      || data.shippingQuoteStatus !== 'customer_confirmed' || typeof data.totalAmount !== 'number'
      || !Number.isFinite(data.totalAmount) || data.totalAmount < 0
      || typeof data.acceptedAt !== 'string' || !Number.isFinite(Date.parse(data.acceptedAt))) {
      return safeJson(res, 503, { error: { code: 'EXPRESS_DELIVERY_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, receipt: { orderReference: data.orderReference, quoteVersion: data.quoteVersion,
      shippingQuoteStatus: data.shippingQuoteStatus, totalAmount: data.totalAmount, acceptedAt: data.acceptedAt } })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    return safeJson(res, 503, { error: { code: 'EXPRESS_DELIVERY_UNAVAILABLE' } })
  }
}
