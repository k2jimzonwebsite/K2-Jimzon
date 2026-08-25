import { authorizeAdminRequest } from '../../server/admin-bff/authorize.js'
import { safeJson } from '../../server/admin-bff/security.js'
import { listAdminSessions } from '../../server/admin-bff/sessions.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  }
  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  try {
    const result = await listAdminSessions(
      authorized.client, authorized.identity, authorized.session,
    )
    if (!result.active || !Array.isArray(result.sessions)) throw new Error('SESSION_REGISTRY_UNAVAILABLE')
    const sessions = result.sessions.slice(0, 20).map((item) => ({
      sessionId: String(item.sessionId || ''),
      current: item.current === true,
      createdAt: String(item.createdAt || ''),
      lastSeenAt: String(item.lastSeenAt || ''),
      expiresAt: String(item.expiresAt || ''),
    }))
    return safeJson(res, 200, { ok: true, sessions })
  } catch {
    return safeJson(res, 503, { error: { code: 'SESSION_REGISTRY_UNAVAILABLE' } })
  }
}
