import { randomUUID } from 'node:crypto'
import { requireAdminProject, safeJson, setRecoverySessionCookies } from '../../../../server/admin-bff/security.js'
import {
  isPasswordRecoveryConfigured, passwordRecoveryResultUrl, validatePasswordRecoveryCallback,
} from '../../../../server/admin-bff/password-recovery.js'
import { createServerSupabase, requireStaffIdentity } from '../../../../server/admin-bff/supabase.js'
import { recordSecurityEvent } from '../../../../server/admin-bff/security-events.js'
import { consumeAdminPreauthRate } from '../../../../server/admin-bff/preauth-rate.js'

function redirect(res, location) {
  res.statusCode = 303
  res.setHeader('Location', location)
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end('')
}

export function createPasswordRecoveryVerifyHandler(overrides = {}) {
  const createClient = overrides.createServerSupabase || createServerSupabase
  const consumeDurableRate = overrides.consumeAdminPreauthRate || consumeAdminPreauthRate
  const requireStaff = overrides.requireStaffIdentity || requireStaffIdentity
  const recordEvent = overrides.recordSecurityEvent || recordSecurityEvent

  return async function handler(req, res) {
    const correlationId = randomUUID()
    res.setHeader('X-Correlation-ID', correlationId)
    if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
    if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
    if (!isPasswordRecoveryConfigured()) return safeJson(res, 503, { error: { code: 'PASSWORD_RECOVERY_UNAVAILABLE' } })
    const invalidUrl = passwordRecoveryResultUrl('invalid')
    try {
      const { tokenHash } = validatePasswordRecoveryCallback({
        token_hash: req.query?.token_hash, type: req.query?.type,
      })
      const client = createClient()
      const durableAttempt = await consumeDurableRate(
        client, req, 'password_recovery_verify', tokenHash,
      )
      if (!durableAttempt.allowed) {
        await recordEvent(client, {
          correlationId, eventType: 'rate_limit', source: 'admin_bff', severity: 'warning',
          outcome: 'denied', routeKey: 'admin.auth.password_recovery.verify',
          reasonCode: 'PASSWORD_RECOVERY_VERIFY_RATE_LIMITED',
        })
        return safeJson(res, 429, {
          error: { code: 'RATE_LIMITED', retryAfter: durableAttempt.retryAfter },
        }, { 'Retry-After': String(durableAttempt.retryAfter) })
      }
      const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      if (error || !data?.session || !data?.user || !data.user.email_confirmed_at) return redirect(res, invalidUrl)
      const identity = await requireStaff(client, data.user)
      if (!identity) {
        await client.auth.signOut()
        return redirect(res, invalidUrl)
      }
      setRecoverySessionCookies(res, data.session, identity)
      await recordEvent(client, {
        correlationId, eventType: 'password_reset', source: 'admin_bff', severity: 'info',
        outcome: 'flagged', routeKey: 'admin.auth.password_recovery.verify',
        reasonCode: 'PASSWORD_RECOVERY_LINK_VERIFIED', subjectKind: 'staff', subjectId: identity.userId,
      })
      return redirect(res, passwordRecoveryResultUrl('ready'))
    } catch {
      return redirect(res, invalidUrl)
    }
  }
}

export default createPasswordRecoveryVerifyHandler()
