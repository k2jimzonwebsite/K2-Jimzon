import {
  clearSessionCookies, readActiveSession, requireAdminProject,
  requireAllowedOrigin, safeJson, verifyCsrf,
} from '../../../server/admin-bff/security.js'
import { createServerSupabase, restoreAuthSession } from '../../../server/admin-bff/supabase.js'

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_DENIED' } })
  const session = readActiveSession(req)
  if (!session || !verifyCsrf(req, session)) return safeJson(res, 403, { error: { code: 'CSRF_DENIED' } })
  try {
    const client = createServerSupabase()
    const restored = await restoreAuthSession(client, session)
    if (restored) await client.auth.signOut()
  } catch {
    // Local cookie revocation still completes; provider revocation is best-effort.
  }
  clearSessionCookies(res)
  return safeJson(res, 200, { ok: true })
}
