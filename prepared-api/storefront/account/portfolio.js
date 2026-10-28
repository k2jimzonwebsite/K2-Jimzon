import {
  authorizationBearer, readJson, requireAllowedOrigin, requireStorefrontProject,
  safeJson, signedRpcArguments,
} from '../../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../../server/storefront-bff/supabase.js'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function validatePortfolioRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('PORTFOLIO_REQUEST_INVALID')
  if (body.operation === 'proof') {
    if (Object.keys(body).sort().join(',') !== 'operation,orderReference,proofId'
      || !/^WEB-[A-Z0-9-]{1,64}$/.test(body.orderReference) || !uuid.test(body.proofId)) throw new Error('PORTFOLIO_REQUEST_INVALID')
    return { operation: 'proof', orderReference: body.orderReference, proofId: body.proofId }
  }
  if (Object.keys(body).some(key => key !== 'cursor')) throw new Error('PORTFOLIO_REQUEST_INVALID')
  let cursor = null
  if (body.cursor !== undefined && body.cursor !== null) {
    if (typeof body.cursor !== 'string' || body.cursor.length > 400 || !/^[A-Za-z0-9_-]+$/.test(body.cursor)) throw new Error('PORTFOLIO_REQUEST_INVALID')
    try { cursor = JSON.parse(Buffer.from(body.cursor, 'base64url').toString('utf8')) } catch { throw new Error('PORTFOLIO_REQUEST_INVALID') }
    if (!cursor || Object.keys(cursor).sort().join(',') !== 'createdAt,reference'
      || typeof cursor.createdAt !== 'string' || !Number.isFinite(Date.parse(cursor.createdAt))
      || !/^WEB-[A-Z0-9-]{1,64}$/.test(cursor.reference)) throw new Error('PORTFOLIO_REQUEST_INVALID')
  }
  return { operation: 'list', cursor }
}

export function createCustomerPortfolioHandler({ createClient = createStorefrontServerSupabase } = {}) {
  return async function handler(req, res) {
    if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
    if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
    if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
    const token = authorizationBearer(req)
    if (!token) return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })
    let payload
    try { payload = validatePortfolioRequest(await readJson(req)) } catch { return safeJson(res, 400, { error: { code: 'INVALID_REQUEST' } }) }
    try {
      const client = createClient(token)
      const { data: identity, error: identityError } = await client.auth.getUser(token)
      if (identityError || !identity?.user?.id) return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })
      const { data, error } = await client.rpc('read_customer_portfolio_v1', signedRpcArguments(req, 'account_read', payload))
      if (error) throw new Error('PORTFOLIO_UNAVAILABLE')
      const mapped = mapBoundaryResult(data)
      if (!mapped.ok) return safeJson(res, mapped.status, { error: { code: mapped.code } }, mapped.retryAfter ? { 'Retry-After': String(mapped.retryAfter) } : {})
      const { ok: _ok, ...portfolio } = mapped.result
      if (portfolio.nextCursor) portfolio.nextCursor = Buffer.from(JSON.stringify(portfolio.nextCursor)).toString('base64url')
      return safeJson(res, 200, { ok: true, portfolio })
    } catch { return safeJson(res, 503, { error: { code: 'ACCOUNT_PORTFOLIO_UNAVAILABLE' } }) }
  }
}
export default createCustomerPortfolioHandler()
