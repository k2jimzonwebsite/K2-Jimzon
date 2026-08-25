import { randomUUID } from 'node:crypto'
import {
  consumeLoginAttempt, readJson, readPendingSession, requestIp, requireAdminProject,
  prepareActiveSession, requireAllowedOrigin, safeJson, setPreparedActiveSessionCookies,
} from '../../../server/admin-bff/security.js'
import {
  createServerSupabase, requireStaffIdentity, restoreAuthSession,
} from '../../../server/admin-bff/supabase.js'
import { registerAdminSession } from '../../../server/admin-bff/sessions.js'
import { recordSecurityEvent } from '../../../server/admin-bff/security-events.js'
import { consumeAdminPreauthRate } from '../../../server/admin-bff/preauth-rate.js'
import {
  startPendingMfaEnrollment, validatePendingMfaCommand, verifyPendingMfaEnrollment,
} from '../../../server/admin-bff/mfa-enrollment.js'

export function createAdminMfaHandler(overrides = {}) {
  const createClient = overrides.createServerSupabase || createServerSupabase
  const consumeDurableRate = overrides.consumeAdminPreauthRate || consumeAdminPreauthRate
  const recordEvent = overrides.recordSecurityEvent || recordSecurityEvent

  return async function handler(req, res) {
  const correlationId=randomUUID()
  res.setHeader('X-Correlation-ID',correlationId)
  const record=async(event,client)=>{
    try { await recordEvent(client||createClient(),{
      correlationId,source:'admin_bff',severity:'warning',outcome:'denied',
      routeKey:'admin.auth.mfa',...event,
    }) } catch { /* MFA remains fail closed without telemetry. */ }
  }
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) {
    await record({ eventType:'authorization',reasonCode:'ORIGIN_DENIED' })
    return safeJson(res, 403, { error: { code: 'ORIGIN_DENIED' } })
  }
  const attempt = consumeLoginAttempt(`mfa:${requestIp(req)}`)
  if (!attempt.allowed) {
    await record({ eventType:'rate_limit',reasonCode:'MFA_RATE_LIMITED' })
    return safeJson(res, 429, { error: { code: 'RATE_LIMITED', retryAfter: attempt.retryAfter } }, { 'Retry-After': String(attempt.retryAfter) })
  }
  try {
    const pending = readPendingSession(req)
    if (!pending) {
      await record({ eventType:'mfa',reasonCode:'MFA_SESSION_EXPIRED' })
      return safeJson(res, 401, { error: { code: 'MFA_SESSION_EXPIRED' } })
    }
    const body = await readJson(req)
    let command
    try { command = validatePendingMfaCommand(body) } catch {
      await record({ eventType:'mfa',reasonCode:'MFA_CODE_FORMAT_INVALID' })
      return safeJson(res, 400, { error: { code: 'MFA_CODE_INVALID' } })
    }

    const client = createClient()
    const durableAttempt = await consumeDurableRate(client, req, 'admin_mfa', pending.pendingId)
    if (!durableAttempt.allowed) {
      await record({ eventType:'rate_limit',reasonCode:'MFA_RATE_LIMITED' },client)
      return safeJson(res, 429, { error: { code: 'RATE_LIMITED', retryAfter: durableAttempt.retryAfter } }, {
        'Retry-After': String(durableAttempt.retryAfter),
      })
    }
    const restored = await restoreAuthSession(client, pending)
    if (!restored) {
      await record({ eventType:'mfa',reasonCode:'MFA_SESSION_EXPIRED' },client)
      return safeJson(res, 401, { error: { code: 'MFA_SESSION_EXPIRED' } })
    }
    if (command.action === 'enroll_start') {
      const identity = await requireStaffIdentity(client, restored.user)
      if (!identity) {
        await record({ eventType:'authorization',reasonCode:'STAFF_ACCESS_REQUIRED' },client)
        return safeJson(res, 403, { error: { code: 'STAFF_ACCESS_REQUIRED' } })
      }
      const enrollment = await startPendingMfaEnrollment(client)
      await recordEvent(client,{
        correlationId,eventType:'mfa',source:'admin_bff',severity:'info',outcome:'flagged',
        routeKey:'admin.auth.mfa',reasonCode:'MFA_ENROLLMENT_STARTED',
      })
      return safeJson(res, 200, { ok:true,enrollment })
    }
    if (command.action === 'enroll_verify') {
      const verified = await verifyPendingMfaEnrollment(client, command.factorId, command.code)
      const identity = await requireStaffIdentity(client, verified.user)
      if (!identity) {
        await record({ eventType:'authorization',reasonCode:'STAFF_ACCESS_REQUIRED' },client)
        return safeJson(res, 403, { error: { code: 'STAFF_ACCESS_REQUIRED' } })
      }
      const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.currentLevel !== 'aal2') {
        await record({ eventType:'mfa',reasonCode:'AAL2_NOT_REACHED' },client)
        return safeJson(res, 401, { error: { code: 'MFA_ENROLLMENT_VERIFICATION_FAILED' } })
      }
      const prepared = prepareActiveSession({
        ...verified, expires_at: Math.floor(Date.now() / 1000) + verified.expires_in,
      }, identity)
      await registerAdminSession(client, identity, prepared.session)
      await recordEvent(client,{
        correlationId,eventType:'mfa',source:'admin_bff',severity:'info',outcome:'succeeded',
        sessionId:prepared.session.sessionId,routeKey:'admin.auth.mfa',
        reasonCode:'MFA_ENROLLMENT_VERIFIED',
      })
      setPreparedActiveSessionCookies(res, prepared)
      return safeJson(res, 200, { ok:true,user:identity })
    }
    const { data: factors, error: factorsError } = await client.auth.mfa.listFactors()
    const factor = factors?.totp?.find((item) => item.status === 'verified')
    if (factorsError || !factor) {
      await record({ eventType:'mfa',reasonCode:'MFA_ENROLLMENT_REQUIRED' },client)
      return safeJson(res, 403, { error: { code: 'MFA_ENROLLMENT_REQUIRED' } })
    }
    const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: factor.id })
    if (challengeError || !challenge?.id) {
      await record({ eventType:'mfa',reasonCode:'MFA_CHALLENGE_FAILED' },client)
      return safeJson(res, 401, { error: { code: 'MFA_VERIFICATION_FAILED' } })
    }
    const { data: verified, error: verifyError } = await client.auth.mfa.verify({
      factorId: factor.id, challengeId: challenge.id, code:command.code,
    })
    if (verifyError || !verified?.access_token || !verified?.refresh_token || !verified?.user) {
      await record({ eventType:'mfa',reasonCode:'MFA_VERIFICATION_FAILED' },client)
      return safeJson(res, 401, { error: { code: 'MFA_VERIFICATION_FAILED' } })
    }
    const identity = await requireStaffIdentity(client, verified.user)
    if (!identity) {
      await record({ eventType:'authorization',reasonCode:'STAFF_ACCESS_REQUIRED' },client)
      return safeJson(res, 403, { error: { code: 'STAFF_ACCESS_REQUIRED' } })
    }
    const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel !== 'aal2') {
      await record({ eventType:'mfa',reasonCode:'AAL2_NOT_REACHED' },client)
      return safeJson(res, 401, { error: { code: 'MFA_VERIFICATION_FAILED' } })
    }
    const prepared = prepareActiveSession({
      ...verified,
      expires_at: Math.floor(Date.now() / 1000) + verified.expires_in,
    }, identity)
    await registerAdminSession(client, identity, prepared.session)
    await recordEvent(client,{
      correlationId,eventType:'mfa',source:'admin_bff',severity:'info',
      outcome:'succeeded',sessionId:prepared.session.sessionId,
      routeKey:'admin.auth.mfa',reasonCode:'MFA_VERIFICATION_SUCCEEDED',
    })
    setPreparedActiveSessionCookies(res, prepared)
    return safeJson(res, 200, { ok: true, user: identity })
  } catch (error) {
    await record({ eventType:'application_error',reasonCode:'MFA_SERVICE_UNAVAILABLE',outcome:'failed' })
    if (error?.message === 'MFA_ALREADY_ENROLLED') return safeJson(res, 409, { error:{ code:'MFA_ALREADY_ENROLLED' } })
    if (error?.message === 'MFA_ENROLLMENT_INVALID') return safeJson(res, 400, { error:{ code:'MFA_ENROLLMENT_INVALID' } })
    if (error?.message === 'MFA_ENROLLMENT_VERIFICATION_FAILED') return safeJson(res, 401, { error:{ code:'MFA_ENROLLMENT_VERIFICATION_FAILED' } })
    if (error?.message === 'MFA_ENROLLMENT_UNAVAILABLE') return safeJson(res, 503, { error:{ code:'MFA_ENROLLMENT_UNAVAILABLE' } })
    const code = ['BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error.message)
      ? error.message : 'AUTH_UNAVAILABLE'
    return safeJson(res, code === 'AUTH_UNAVAILABLE' ? 503 : 400, { error: { code } })
  }
}
}

export default createAdminMfaHandler()
