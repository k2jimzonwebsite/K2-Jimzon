import { authorizationBearer, publicFailure, readJson, requireAllowedOrigin, requireStorefrontProject, safeJson, signedRpcArguments } from '../../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../../server/storefront-bff/supabase.js'

export function validateNotificationRead(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).join(',') !== 'notificationId'
      || typeof body.notificationId !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.notificationId)) {
    throw new Error('REQUEST_INVALID')
  }
  return { notificationId: body.notificationId.toLowerCase() }
}

export default async function handler(req, res) {
  if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
  const accessToken = authorizationBearer(req)
  if (!accessToken) return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })
  try {
    const payload = validateNotificationRead(await readJson(req))
    const client = createStorefrontServerSupabase(accessToken)
    const { data: identity, error: identityError } = await client.auth.getUser(accessToken)
    if (identityError || !identity?.user?.id) return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })
    const { data, error } = await client.rpc('read_customer_account_notification_v1', signedRpcArguments(req, 'account_notification_read', payload))
    if (error) return safeJson(res, 503, { error: { code: 'ACCOUNT_NOTIFICATIONS_UNAVAILABLE' } })
    const mapped = mapBoundaryResult(data)
    if (!mapped.ok) return safeJson(res, mapped.status, { error: { code: mapped.code } })
    return safeJson(res, 200, { ok: true, receipt: { read: mapped.result.read === true } })
  } catch (error) {
    const [status, code] = publicFailure(error)
    return safeJson(res, status, { error: { code } })
  }
}
