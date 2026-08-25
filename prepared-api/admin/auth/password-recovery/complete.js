import { randomUUID } from 'node:crypto'
import {
  clearRecoverySessionCookies, readJson, readRecoverySession, requireAdminProject,
  requireAllowedOrigin, safeJson, verifyRecoveryCsrf,
} from '../../../../server/admin-bff/security.js'
import {
  isPasswordRecoveryConfigured, validatePasswordRecoveryCompletion,
} from '../../../../server/admin-bff/password-recovery.js'
import { createServerSupabase, requireStaffIdentity, restoreAuthSession } from '../../../../server/admin-bff/supabase.js'
import { recordSecurityEvent } from '../../../../server/admin-bff/security-events.js'
import { consumeAdminPreauthRate } from '../../../../server/admin-bff/preauth-rate.js'

export function createPasswordRecoveryCompleteHandler(overrides = {}) {
  const createClient = overrides.createServerSupabase || createServerSupabase
  const consumeDurableRate = overrides.consumeAdminPreauthRate || consumeAdminPreauthRate
  const requireStaff = overrides.requireStaffIdentity || requireStaffIdentity
  const restoreSession = overrides.restoreAuthSession || restoreAuthSession
  const recordEvent = overrides.recordSecurityEvent || recordSecurityEvent

  return async function handler(req, res) {
    const correlationId = randomUUID()
    res.setHeader('X-Correlation-ID', correlationId)
    if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
    if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
    if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_DENIED' } })
    if (!isPasswordRecoveryConfigured()) return safeJson(res, 503, { error: { code: 'PASSWORD_RECOVERY_UNAVAILABLE' } })
    const recovery = readRecoverySession(req)
    if (!recovery) return safeJson(res, 401, { error: { code: 'PASSWORD_RECOVERY_EXPIRED' } })
    if (!verifyRecoveryCsrf(req, recovery)) return safeJson(res, 403, { error: { code: 'CSRF_DENIED' } })
    try {
      const { password } = validatePasswordRecoveryCompletion(await readJson(req))
      const client = createClient()
      const durableAttempt = await consumeDurableRate(
        client, req, 'password_recovery_complete', recovery.recoveryId,
      )
      if (!durableAttempt.allowed) {
        await recordEvent(client, {
          correlationId, eventType: 'rate_limit', source: 'admin_bff', severity: 'warning',
          outcome: 'denied', routeKey: 'admin.auth.password_recovery.complete',
          reasonCode: 'PASSWORD_RECOVERY_COMPLETE_RATE_LIMITED',
        })
        return safeJson(res, 429, {
          error: { code: 'RATE_LIMITED', retryAfter: durableAttempt.retryAfter },
        }, { 'Retry-After': String(durableAttempt.retryAfter) })
      }
      const restored = await restoreSession(client, recovery)
      if (!restored?.user?.email_confirmed_at) throw new Error('PASSWORD_RECOVERY_EXPIRED')
      const identity = await requireStaff(client, restored.user)
      if (!identity || identity.userId !== recovery.userId || identity.role !== recovery.role) {
        throw new Error('PASSWORD_RECOVERY_EXPIRED')
      }
      const { error: updateError } = await client.auth.updateUser({ password })
      if (updateError) throw new Error('PASSWORD_RECOVERY_UPDATE_FAILED')
      const { error: signOutError } = await client.auth.signOut({ scope: 'global' })
      clearRecoverySessionCookies(res)
      if (signOutError) return safeJson(res, 503, { error: { code: 'PASSWORD_RECOVERY_REVOCATION_UNAVAILABLE' } })
      await recordEvent(client, {
        correlationId, eventType: 'password_reset', source: 'admin_bff', severity: 'warning',
        outcome: 'succeeded', routeKey: 'admin.auth.password_recovery.complete',
        reasonCode: 'PASSWORD_RECOVERY_COMPLETED', subjectKind: 'staff', subjectId: identity.userId,
      })
      return safeJson(res, 200, { ok: true })
    } catch (error) {
      const inputError = ['BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON', 'PASSWORD_RECOVERY_PASSWORD_INVALID'].includes(error.message)
      if (!inputError) clearRecoverySessionCookies(res)
      const code = inputError ? error.message : error.message === 'PASSWORD_RECOVERY_EXPIRED'
        ? 'PASSWORD_RECOVERY_EXPIRED' : 'PASSWORD_RECOVERY_UNAVAILABLE'
      return safeJson(res, inputError ? 400 : code === 'PASSWORD_RECOVERY_EXPIRED' ? 401 : 503, { error: { code } })
    }
  }
}

export default createPasswordRecoveryCompleteHandler()
