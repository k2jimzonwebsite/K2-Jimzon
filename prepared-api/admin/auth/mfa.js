import {
  consumeLoginAttempt, readJson, readPendingSession, requestIp, requireAdminProject,
  requireAllowedOrigin, safeJson, setActiveSessionCookies,
} from '../../../server/admin-bff/security.js'
import {
  createServerSupabase, requireStaffIdentity, restoreAuthSession,
} from '../../../server/admin-bff/supabase.js'

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_DENIED' } })
  const attempt = consumeLoginAttempt(`mfa:${requestIp(req)}`)
  if (!attempt.allowed) {
    return safeJson(res, 429, { error: { code: 'RATE_LIMITED', retryAfter: attempt.retryAfter } }, { 'Retry-After': String(attempt.retryAfter) })
  }
  try {
    const pending = readPendingSession(req)
    if (!pending) return safeJson(res, 401, { error: { code: 'MFA_SESSION_EXPIRED' } })
    const body = await readJson(req)
    const code = String(body.code || '').trim()
    if (!/^\d{6}$/.test(code)) return safeJson(res, 400, { error: { code: 'MFA_CODE_INVALID' } })

    const client = createServerSupabase()
    const restored = await restoreAuthSession(client, pending)
    if (!restored) return safeJson(res, 401, { error: { code: 'MFA_SESSION_EXPIRED' } })
    const { data: factors, error: factorsError } = await client.auth.mfa.listFactors()
    const factor = factors?.totp?.find((item) => item.status === 'verified')
    if (factorsError || !factor) return safeJson(res, 403, { error: { code: 'MFA_ENROLLMENT_REQUIRED' } })
    const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: factor.id })
    if (challengeError || !challenge?.id) return safeJson(res, 401, { error: { code: 'MFA_VERIFICATION_FAILED' } })
    const { data: verified, error: verifyError } = await client.auth.mfa.verify({
      factorId: factor.id, challengeId: challenge.id, code,
    })
    if (verifyError || !verified?.access_token || !verified?.refresh_token || !verified?.user) {
      return safeJson(res, 401, { error: { code: 'MFA_VERIFICATION_FAILED' } })
    }
    const identity = await requireStaffIdentity(client, verified.user)
    if (!identity) return safeJson(res, 403, { error: { code: 'STAFF_ACCESS_REQUIRED' } })
    const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel !== 'aal2') return safeJson(res, 401, { error: { code: 'MFA_VERIFICATION_FAILED' } })
    setActiveSessionCookies(res, {
      ...verified,
      expires_at: Math.floor(Date.now() / 1000) + verified.expires_in,
    }, identity)
    return safeJson(res, 200, { ok: true, user: identity })
  } catch (error) {
    const code = ['BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error.message)
      ? error.message : 'AUTH_UNAVAILABLE'
    return safeJson(res, code === 'AUTH_UNAVAILABLE' ? 503 : 400, { error: { code } })
  }
}
