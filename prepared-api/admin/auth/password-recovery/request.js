import { createHash, randomUUID } from 'node:crypto'
import {
  consumeLoginAttempt, requestIp, readJson, requireAdminProject, requireAllowedOrigin, safeJson,
} from '../../../../server/admin-bff/security.js'
import {
  isPasswordRecoveryConfigured, passwordRecoveryCallbackUrl, validatePasswordRecoveryRequest,
} from '../../../../server/admin-bff/password-recovery.js'
import { createServerSupabase } from '../../../../server/admin-bff/supabase.js'
import { recordSecurityEvent } from '../../../../server/admin-bff/security-events.js'
import { consumeAdminPreauthRate } from '../../../../server/admin-bff/preauth-rate.js'
import { verifyBotChallenge } from '../../../../server/bot-challenge.js'

export function createPasswordRecoveryRequestHandler(overrides = {}) {
  const createClient = overrides.createServerSupabase || createServerSupabase
  const consumeDurableRate = overrides.consumeAdminPreauthRate || consumeAdminPreauthRate
  const recordEvent = overrides.recordSecurityEvent || recordSecurityEvent
  const verifyBot = overrides.verifyBotChallenge || verifyBotChallenge

  return async function handler(req, res) {
    const correlationId = randomUUID()
    res.setHeader('X-Correlation-ID', correlationId)
    if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
    if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
    if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_DENIED' } })
    if (!isPasswordRecoveryConfigured()) return safeJson(res, 503, { error: { code: 'PASSWORD_RECOVERY_UNAVAILABLE' } })
    try {
      const { email, botToken } = validatePasswordRecoveryRequest(await readJson(req))
      const fingerprint = createHash('sha256').update(email).digest('hex')
      const attempt = consumeLoginAttempt(`password-recovery:${requestIp(req)}:${fingerprint}`)
      if (!attempt.allowed) {
        return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': String(attempt.retryAfter) })
      }
      const client = createClient()
      const durableAttempt = await consumeDurableRate(client, req, 'password_recovery', email)
      if (!durableAttempt.allowed) {
        return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, {
          'Retry-After': String(durableAttempt.retryAfter),
        })
      }
      if (!await verifyBot(botToken, requestIp(req), 'admin_auth')) {
        return safeJson(res, 403, { error: { code: 'BOT_CHALLENGE_REQUIRED' } })
      }
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: passwordRecoveryCallbackUrl().toString(),
      })
      if (error) return safeJson(res, 503, { error: { code: 'PASSWORD_RECOVERY_UNAVAILABLE' } })
      await recordEvent(client, {
        correlationId, eventType: 'password_reset', source: 'admin_bff', severity: 'info',
        outcome: 'flagged', routeKey: 'admin.auth.password_recovery.request',
        reasonCode: 'PASSWORD_RECOVERY_REQUEST_ACCEPTED',
      })
      return safeJson(res, 202, { ok: true })
    } catch (error) {
      const inputError = ['BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON', 'PASSWORD_RECOVERY_REQUEST_INVALID'].includes(error.message)
      return safeJson(res, inputError ? 400 : 503, { error: { code: inputError ? error.message : 'PASSWORD_RECOVERY_UNAVAILABLE' } })
    }
  }
}

export default createPasswordRecoveryRequestHandler()
