import { randomBytes, randomUUID } from 'node:crypto'
import {
  clearAdminOAuthCookie, consumeLoginAttempt, prepareActiveSession, readAdminOAuthCookie,
  readJson, requestHostname, requestIp, requireAdminProject, requireAllowedOrigin,
  safeJson, setAdminOAuthCookie, setPendingCookie, setPreparedActiveSessionCookies,
} from './security.js'
import { createServerSupabase, requireStaffIdentity } from './supabase.js'
import { consumeAdminPreauthRate } from './preauth-rate.js'
import { registerAdminSession } from './sessions.js'
import { verifyBotChallenge } from '../bot-challenge.js'
import { recordSecurityEvent } from './security-events.js'

const STORAGE_KEY = 'k2-admin-oauth'
const VERIFIER_KEY = `${STORAGE_KEY}-code-verifier`
const RETURN_PATH = '/admin-portal-k2-secure'

export function createAdminGoogleHandler(stage, overrides = {}) {
  const createClient = overrides.createServerSupabase || createServerSupabase
  const consumeRate = overrides.consumeAdminPreauthRate || consumeAdminPreauthRate
  const verifyBot = overrides.verifyBotChallenge || verifyBotChallenge
  const requireStaff = overrides.requireStaffIdentity || requireStaffIdentity
  const registerSession = overrides.registerAdminSession || registerAdminSession
  const recordEvent = overrides.recordSecurityEvent || recordSecurityEvent
  return async function handler(req, res) {
    const correlationId = randomUUID()
    res.setHeader('X-Correlation-ID', correlationId)
    let client
    const reply = async (status, body, headers = {}) => {
      const code = body.error?.code || body.code || 'GOOGLE_SIGN_IN_STARTED'
      if (client) {
        try {
          await recordEvent(client, { correlationId, eventType: status === 429 ? 'rate_limit' : 'authentication',
            source: 'admin_bff', severity: status >= 400 ? 'warning' : 'info',
            outcome: status >= 400 ? 'denied' : status === 202 ? 'flagged' : 'succeeded',
            routeKey: `admin.auth.google.${stage}`, reasonCode: code })
        } catch { /* Telemetry must never replace authentication authority. */ }
      }
      return safeJson(res, status, body, headers)
    }
    if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
    if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
    if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_DENIED' } })
    const attempt = consumeLoginAttempt(`google:${requestIp(req)}`)
    if (!attempt.allowed) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': String(attempt.retryAfter) })
    try {
      const body = await readJson(req)
      const keys = stage === 'start' ? ['botToken'] : ['code', 'state']
      if (!body || typeof body !== 'object' || Array.isArray(body)
          || Object.keys(body).length !== keys.length || !keys.every(key => typeof body[key] === 'string')) {
        return safeJson(res, 400, { error: { code: 'OAUTH_REQUEST_INVALID' } })
      }
      const pending = stage === 'start' ? null : readAdminOAuthCookie(req)
      if (stage !== 'start' && (!pending || pending.state !== body.state
          || !/^[A-Za-z0-9_-]{16,256}$/.test(body.code))) {
        return safeJson(res, 400, { error: { code: 'OAUTH_RETURN_INVALID' } })
      }
      if (stage === 'start' && (body.botToken.length < 10 || body.botToken.length > 2048)) {
        return safeJson(res, 400, { error: { code: 'BOT_CHALLENGE_REQUIRED' } })
      }
      const values = new Map(pending ? [[VERIFIER_KEY, pending.verifier]] : [])
      const storage = { getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
      // SDK storage is per-request memory; only the verifier is encrypted into
      // the HttpOnly cookie. persistSession allows the SDK to use this adapter.
      client = createClient({ flowType: 'pkce', persistSession: true, storageKey: STORAGE_KEY, storage })
      const budget = await consumeRate(client, req, 'admin_login', `google:${requestIp(req)}`)
      if (!budget.allowed) return reply(429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': String(budget.retryAfter) })
      if (stage === 'start') {
        if (!await verifyBot(body.botToken, requestIp(req), 'admin_auth', { hostname: requestHostname(req) })) {
          return reply(403, { error: { code: 'BOT_CHALLENGE_REQUIRED' } })
        }
        const origin = new URL(req.headers.origin || req.headers.referer).origin
        const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(new URL(origin).hostname)
        const returnOrigin = local ? origin : 'https://admin.k2jimzon.com'
        const state = randomBytes(32).toString('base64url')
        const redirectTo = `${returnOrigin}${RETURN_PATH}?google=${state}`
        const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } })
        const verifier = values.get(VERIFIER_KEY)
        if (error || !data?.url || !verifier) throw new Error('AUTH_UNAVAILABLE')
        const url = new URL(data.url)
        if (url.origin !== new URL(process.env.SUPABASE_URL).origin || url.pathname !== '/auth/v1/authorize') throw new Error('AUTH_UNAVAILABLE')
        setAdminOAuthCookie(res, { state, verifier, createdAt: Date.now() })
        return reply(200, { ok: true, url: url.toString() })
      }
      const { data, error } = await client.auth.exchangeCodeForSession(body.code)
      if (error || !data?.session || !data?.user?.email_confirmed_at) {
        clearAdminOAuthCookie(res)
        return reply(401, { error: { code: 'OAUTH_RETURN_INVALID' } })
      }
      const identity = await requireStaff(client, data.user)
      if (!identity) {
        await client.auth.signOut()
        clearAdminOAuthCookie(res)
        return reply(403, { error: { code: 'STAFF_ACCESS_REQUIRED' } })
      }
      const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aalError) throw new Error('AUTH_UNAVAILABLE')
      if (aal?.currentLevel !== 'aal2') {
        setPendingCookie(res, data.session)
        clearAdminOAuthCookie(res)
        return reply(202, { ok: false, code: aal?.nextLevel === 'aal2' ? 'MFA_REQUIRED' : 'MFA_ENROLLMENT_REQUIRED' })
      }
      const prepared = prepareActiveSession(data.session, identity)
      await registerSession(client, identity, prepared.session)
      setPreparedActiveSessionCookies(res, prepared)
      clearAdminOAuthCookie(res)
      return reply(200, { ok: true, user: identity, code: 'GOOGLE_AUTHENTICATION_SUCCEEDED' })
    } catch {
      return reply(503, { error: { code: 'AUTH_UNAVAILABLE' } })
    }
  }
}
