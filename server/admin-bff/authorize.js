import {
  clearSessionCookies, readActiveSession, refreshActiveSessionCookie,
  requireAdminProject, requireAllowedOrigin, safeJson, verifyCsrf,
} from './security.js'
import {
  createServerSupabase, requireStaffIdentity, restoreAuthSession,
} from './supabase.js'

export async function authorizeAdminRequest(req, res, { csrf = false } = {}) {
  if (!requireAdminProject(req)) {
    safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
    return null
  }
  if (!requireAllowedOrigin(req)) {
    safeJson(res, 403, { error: { code: 'ORIGIN_DENIED' } })
    return null
  }

  const session = readActiveSession(req)
  if (!session) {
    clearSessionCookies(res)
    safeJson(res, 401, { error: { code: 'SESSION_EXPIRED' } })
    return null
  }
  if (csrf && !verifyCsrf(req, session)) {
    safeJson(res, 403, { error: { code: 'CSRF_DENIED' } })
    return null
  }

  try {
    const client = createServerSupabase()
    const restored = await restoreAuthSession(client, session)
    if (!restored) {
      clearSessionCookies(res)
      safeJson(res, 401, { error: { code: 'SESSION_REVOKED' } })
      return null
    }
    const identity = await requireStaffIdentity(client, restored.user)
    if (!identity) {
      clearSessionCookies(res)
      safeJson(res, 403, { error: { code: 'STAFF_ACCESS_REQUIRED' } })
      return null
    }
    const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalError || aal?.currentLevel !== 'aal2') {
      clearSessionCookies(res)
      safeJson(res, 401, { error: { code: 'MFA_REQUIRED' } })
      return null
    }
    refreshActiveSessionCookie(res, restored.session, { ...session, ...identity })
    return { client, identity }
  } catch {
    safeJson(res, 503, { error: { code: 'ADMIN_SERVICE_UNAVAILABLE' } })
    return null
  }
}
