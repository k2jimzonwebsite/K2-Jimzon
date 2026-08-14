import {
  consumeLoginAttempt, requestIp, readJson, requireAdminProject,
  requireAllowedOrigin, safeJson, setActiveSessionCookies, setPendingCookie,
} from '../../../server/admin-bff/security.js'
import { createServerSupabase, requireStaffIdentity } from '../../../server/admin-bff/supabase.js'

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_DENIED' } })
  const attempt = consumeLoginAttempt(`login:${requestIp(req)}`)
  if (!attempt.allowed) return safeJson(res, 429, { error: { code: 'RATE_LIMITED', retryAfter: attempt.retryAfter } }, { 'Retry-After': String(attempt.retryAfter) })

  try {
    const body = await readJson(req)
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 256) {
      return safeJson(res, 400, { error: { code: 'INVALID_CREDENTIAL_FORMAT' } })
    }
    const client = createServerSupabase()
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error || !data?.session || !data?.user) {
      return safeJson(res, 401, { error: { code: 'INVALID_CREDENTIALS' } })
    }
    const identity = await requireStaffIdentity(client, data.user)
    if (!identity) {
      await client.auth.signOut()
      return safeJson(res, 403, { error: { code: 'STAFF_ACCESS_REQUIRED' } })
    }
    const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalError || aal?.currentLevel !== 'aal2') {
      if (aal?.nextLevel !== 'aal2') {
        await client.auth.signOut()
        return safeJson(res, 403, { error: { code: 'MFA_ENROLLMENT_REQUIRED' } })
      }
      setPendingCookie(res, data.session)
      return safeJson(res, 202, { ok: false, challenge: 'totp', code: 'MFA_REQUIRED' })
    }
    setActiveSessionCookies(res, data.session, identity)
    return safeJson(res, 200, { ok: true, user: identity })
  } catch (error) {
    const code = ['BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error.message)
      ? error.message : 'AUTH_UNAVAILABLE'
    return safeJson(res, code === 'AUTH_UNAVAILABLE' ? 503 : 400, { error: { code } })
  }
}
