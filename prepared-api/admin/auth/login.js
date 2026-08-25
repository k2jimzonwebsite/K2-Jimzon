import { randomUUID } from 'node:crypto'
import {
  consumeLoginAttempt, requestIp, readJson, requireAdminProject,
  prepareActiveSession, requireAllowedOrigin, safeJson,
  setPendingCookie, setPreparedActiveSessionCookies,
} from '../../../server/admin-bff/security.js'
import { createServerSupabase, requireStaffIdentity } from '../../../server/admin-bff/supabase.js'
import { registerAdminSession } from '../../../server/admin-bff/sessions.js'
import { recordSecurityEvent } from '../../../server/admin-bff/security-events.js'
import { consumeAdminPreauthRate } from '../../../server/admin-bff/preauth-rate.js'
import { verifyBotChallenge } from '../../../server/bot-challenge.js'

function validateAdminLoginRequest(body) {
  const keys = body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body) : []
  if (keys.length !== 3 || !['email', 'password', 'botToken'].every((key) => Object.hasOwn(body, key))) {
    throw new Error('INVALID_CREDENTIAL_FORMAT')
  }
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const botToken = String(body.botToken || '')
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 256
      || botToken.length < 10 || botToken.length > 2048) throw new Error('INVALID_CREDENTIAL_FORMAT')
  return { email, password, botToken }
}

export function createAdminLoginHandler(overrides = {}) {
  const createClient = overrides.createServerSupabase || createServerSupabase
  const consumeDurableRate = overrides.consumeAdminPreauthRate || consumeAdminPreauthRate
  const recordEvent = overrides.recordSecurityEvent || recordSecurityEvent
  const verifyBot = overrides.verifyBotChallenge || verifyBotChallenge

  return async function handler(req, res) {
    const correlationId=randomUUID()
    res.setHeader('X-Correlation-ID',correlationId)
    const record=async(event,client)=>{
      try { await recordEvent(client||createClient(),{
        correlationId,source:'admin_bff',severity:'warning',outcome:'denied',
        routeKey:'admin.auth.login',...event,
      }) } catch { /* Authentication remains fail closed without telemetry. */ }
    }
    if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
    if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
    if (!requireAllowedOrigin(req)) {
      await record({ eventType:'authorization',reasonCode:'ORIGIN_DENIED' })
      return safeJson(res, 403, { error: { code: 'ORIGIN_DENIED' } })
    }
    const attempt = consumeLoginAttempt(`login:${requestIp(req)}`)
    if (!attempt.allowed) {
      await record({ eventType:'rate_limit',reasonCode:'LOGIN_RATE_LIMITED' })
      return safeJson(res, 429, { error: { code: 'RATE_LIMITED', retryAfter: attempt.retryAfter } }, { 'Retry-After': String(attempt.retryAfter) })
    }

    try {
      const { email, password, botToken } = validateAdminLoginRequest(await readJson(req))
      const client = createClient()
      const durableAttempt = await consumeDurableRate(client, req, 'admin_login', email)
      if (!durableAttempt.allowed) {
        await record({ eventType:'rate_limit',reasonCode:'LOGIN_RATE_LIMITED' },client)
        return safeJson(res, 429, { error: { code: 'RATE_LIMITED', retryAfter: durableAttempt.retryAfter } }, {
          'Retry-After': String(durableAttempt.retryAfter),
        })
      }
      if (!await verifyBot(botToken, requestIp(req), 'admin_auth')) {
        await record({ eventType:'bot_defense',reasonCode:'BOT_CHALLENGE_REQUIRED' },client)
        return safeJson(res, 403, { error: { code: 'BOT_CHALLENGE_REQUIRED' } })
      }
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error || !data?.session || !data?.user) {
        await record({ eventType:'authentication',reasonCode:'CREDENTIALS_REJECTED' },client)
        return safeJson(res, 401, { error: { code: 'INVALID_CREDENTIALS' } })
      }
      const identity = await requireStaffIdentity(client, data.user)
      if (!identity) {
        await record({ eventType:'authorization',reasonCode:'STAFF_ACCESS_REQUIRED' },client)
        await client.auth.signOut()
        return safeJson(res, 403, { error: { code: 'STAFF_ACCESS_REQUIRED' } })
      }
      const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aalError || aal?.currentLevel !== 'aal2') {
        if (aal?.nextLevel !== 'aal2') {
          setPendingCookie(res, data.session)
          await record({ eventType:'mfa',reasonCode:'MFA_ENROLLMENT_REQUIRED' },client)
          return safeJson(res, 202, { ok:false,enrollmentRequired: true, code: 'MFA_ENROLLMENT_REQUIRED' })
        }
        setPendingCookie(res, data.session)
        await record({ eventType:'mfa',reasonCode:'MFA_CHALLENGE_REQUIRED',outcome:'flagged' },client)
        return safeJson(res, 202, { ok: false, challenge: 'totp', code: 'MFA_REQUIRED' })
      }
      const prepared = prepareActiveSession(data.session, identity)
      await registerAdminSession(client, identity, prepared.session)
      await recordEvent(client,{
        correlationId,eventType:'authentication',source:'admin_bff',severity:'info',
        outcome:'succeeded',sessionId:prepared.session.sessionId,
        routeKey:'admin.auth.login',reasonCode:'AUTHENTICATION_SUCCEEDED',
      })
      setPreparedActiveSessionCookies(res, prepared)
      return safeJson(res, 200, { ok: true, user: identity })
    } catch (error) {
      const code = ['BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON', 'INVALID_CREDENTIAL_FORMAT'].includes(error.message)
        ? error.message : 'AUTH_UNAVAILABLE'
      await record(code === 'INVALID_CREDENTIAL_FORMAT'
        ? { eventType:'authentication',reasonCode:'CREDENTIAL_FORMAT_INVALID' }
        : { eventType:'application_error',reasonCode:'AUTH_SERVICE_UNAVAILABLE',outcome:'failed' })
      return safeJson(res, code === 'AUTH_UNAVAILABLE' ? 503 : 400, { error: { code } })
    }
  }
}

export default createAdminLoginHandler()
