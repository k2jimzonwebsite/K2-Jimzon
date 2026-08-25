import {
  authorizationBearer, requireAllowedOrigin, requireStorefrontProject,
  safeJson, signedRpcArguments,
} from '../../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../../server/storefront-bff/supabase.js'

export default async function handler(req, res) {
  if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
  const accessToken = authorizationBearer(req)
  if (!accessToken) return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })
  try {
    const client = createStorefrontServerSupabase(accessToken)
    const { data: identity, error: identityError } = await client.auth.getUser(accessToken)
    if (identityError || !identity?.user?.id) return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })
    const { data, error } = await client.rpc(
      'list_customer_account_history_v1', signedRpcArguments(req, 'account_read', {})
    )
    if (error) return safeJson(res, 503, { error: { code: 'ACCOUNT_HISTORY_UNAVAILABLE' } })
    const mapped = mapBoundaryResult(data)
    if (!mapped.ok) return safeJson(res, mapped.status, { error: { code: mapped.code } },
      mapped.retryAfter ? { 'Retry-After': mapped.retryAfter } : {})
    return safeJson(res, 200, { ok: true, history: {
      linked_at: mapped.result.linked_at,
      orders: mapped.result.orders || [],
      pasabuy_requests: mapped.result.pasabuy_requests || [],
      conversations: mapped.result.conversations || [],
    } })
  } catch {
    return safeJson(res, 503, { error: { code: 'ACCOUNT_HISTORY_UNAVAILABLE' } })
  }
}

