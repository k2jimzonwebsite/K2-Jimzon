import { authorizeAdminRequest } from './authorize.js'
import { safeJson } from './security.js'

export default async function handleSystemReadiness(req, res) {
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  if (authorized.identity.role !== 'Admin') return safeJson(res, 403, { error: { code: 'SYSTEM_READINESS_ADMIN_REQUIRED' } })
  const { data, error } = await authorized.client.rpc('read_admin_system_readiness_v1')
  if (error || !data) return safeJson(res, 503, { error: { code: 'SYSTEM_READINESS_UNAVAILABLE' } })
  return safeJson(res, 200, { ok: true, readiness: { ...data, serverBoundary: true, currentSessionAal2: true } })
}
