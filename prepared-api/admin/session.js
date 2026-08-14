import {
  clearSessionCookies, readActiveSession, requireAdminProject, safeJson,
  setActiveSessionCookies,
} from '../../server/admin-bff/security.js'
import {
  createServerSupabase, requireStaffIdentity, restoreAuthSession,
} from '../../server/admin-bff/supabase.js'

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  try {
    const session = readActiveSession(req)
    if (!session) {
      clearSessionCookies(res)
      return safeJson(res, 401, { error: { code: 'SESSION_EXPIRED' } })
    }
    const client = createServerSupabase()
    const restored = await restoreAuthSession(client, session)
    if (!restored) {
      clearSessionCookies(res)
      return safeJson(res, 401, { error: { code: 'SESSION_REVOKED' } })
    }
    const identity = await requireStaffIdentity(client, restored.user)
    if (!identity) {
      clearSessionCookies(res)
      return safeJson(res, 403, { error: { code: 'STAFF_ACCESS_REQUIRED' } })
    }
    const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel !== 'aal2') {
      clearSessionCookies(res)
      return safeJson(res, 401, { error: { code: 'MFA_REQUIRED' } })
    }
    setActiveSessionCookies(res, restored.session, { ...identity, createdAt: session.createdAt })
    return safeJson(res, 200, { ok: true, user: identity })
  } catch {
    clearSessionCookies(res)
    return safeJson(res, 503, { error: { code: 'SESSION_UNAVAILABLE' } })
  }
}
