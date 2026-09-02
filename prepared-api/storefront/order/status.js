import {
  requireAllowedOrigin, requireStorefrontProject, safeJson, signedRpcArguments,
} from '../../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../../server/storefront-bff/supabase.js'

export default async function handler(req, res) {
  if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
  try {
    const client = createStorefrontServerSupabase()
    const { data, error } = await client.rpc(
      'read_guest_order_status_v1', signedRpcArguments(req, 'guest_read', {})
    )
    if (error) return safeJson(res, 503, { error: { code: 'ORDER_STATUS_SERVICE_UNAVAILABLE' } })
    const mapped = mapBoundaryResult(data)
    if (!mapped.ok) {
      return safeJson(res, mapped.status, { error: { code: mapped.code } },
        mapped.retryAfter ? { 'Retry-After': mapped.retryAfter } : {})
    }
    return safeJson(res, 200, { ok: true, orders: mapped.result.orders || [] })
  } catch {
    return safeJson(res, 503, { error: { code: 'ORDER_STATUS_SERVICE_UNAVAILABLE' } })
  }
}
