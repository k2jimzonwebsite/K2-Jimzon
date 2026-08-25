import {
  clearSessionCookies, readActiveSession, requireAdminProject,
  requireAllowedOrigin, safeJson, verifyCsrf,
} from '../../../server/admin-bff/security.js'
import {
  createServerSupabase, requireStaffIdentity, restoreAuthSession,
} from '../../../server/admin-bff/supabase.js'
import { revokeCurrentAdminSession } from '../../../server/admin-bff/sessions.js'

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_DENIED' } })
  const session = readActiveSession(req)
  if (!session || !verifyCsrf(req, session)) return safeJson(res, 403, { error: { code: 'CSRF_DENIED' } })
  try {
    const client = createServerSupabase()
    const restored = await restoreAuthSession(client, session)
    if (restored) {
      const identity = await requireStaffIdentity(client, restored.user)
      const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
      if (identity && aal?.currentLevel === 'aal2') {
        await revokeCurrentAdminSession(client, identity, session)
      }
      await client.auth.signOut()
    }
  } catch {
    clearSessionCookies(res)
    return safeJson(res, 503, { error: { code: 'SESSION_REVOCATION_UNAVAILABLE' } })
  }
  clearSessionCookies(res)
  return safeJson(res, 200, { ok: true })
}
