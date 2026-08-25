import {
  clearSessionCookies, readActiveSession, refreshActiveSessionCookie,
  requireAdminProject, requireAllowedOrigin, safeJson, verifyCsrf,
} from './security.js'
import { randomUUID } from 'node:crypto'
import {
  createServerSupabase, requireStaffIdentity, restoreAuthSession,
} from './supabase.js'
import { validateAdminSession } from './sessions.js'
import { adminRouteKey, recordSecurityEvent } from './security-events.js'

async function recordDenial(req, event, client) {
  try {
    const target=client||createServerSupabase()
    await recordSecurityEvent(target,{ routeKey:adminRouteKey(req),source:'admin_bff',
      severity:'warning',outcome:'denied',...event })
  } catch {
    // Authorization must fail closed even if telemetry is unavailable.
  }
}

export async function authorizeAdminRequest(req, res, { csrf = false } = {}) {
  const correlationId=randomUUID()
  res.setHeader('X-Correlation-ID',correlationId)
  if (!requireAdminProject(req)) {
    safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
    return null
  }
  if (!requireAllowedOrigin(req)) {
    await recordDenial(req,{ correlationId,eventType:'authorization',reasonCode:'ORIGIN_DENIED' })
    safeJson(res, 403, { error: { code: 'ORIGIN_DENIED' } })
    return null
  }

  const session = readActiveSession(req)
  if (!session) {
    await recordDenial(req,{ correlationId,eventType:'session',reasonCode:'SESSION_MISSING_OR_EXPIRED' })
    clearSessionCookies(res)
    safeJson(res, 401, { error: { code: 'SESSION_EXPIRED' } })
    return null
  }
  if (csrf && !verifyCsrf(req, session)) {
    await recordDenial(req,{ correlationId,eventType:'authorization',reasonCode:'CSRF_DENIED',sessionId:session.sessionId })
    safeJson(res, 403, { error: { code: 'CSRF_DENIED' } })
    return null
  }

  try {
    const client = createServerSupabase()
    const restored = await restoreAuthSession(client, session)
    if (!restored) {
      await recordDenial(req,{ correlationId,eventType:'session',reasonCode:'SESSION_REVOKED',sessionId:session.sessionId },client)
      clearSessionCookies(res)
      safeJson(res, 401, { error: { code: 'SESSION_REVOKED' } })
      return null
    }
    const identity = await requireStaffIdentity(client, restored.user)
    if (!identity) {
      await recordDenial(req,{ correlationId,eventType:'authorization',reasonCode:'STAFF_ACCESS_REQUIRED',sessionId:session.sessionId },client)
      clearSessionCookies(res)
      safeJson(res, 403, { error: { code: 'STAFF_ACCESS_REQUIRED' } })
      return null
    }
    const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalError || aal?.currentLevel !== 'aal2') {
      await recordDenial(req,{ correlationId,eventType:'mfa',reasonCode:'AAL2_REQUIRED',sessionId:session.sessionId },client)
      clearSessionCookies(res)
      safeJson(res, 401, { error: { code: 'MFA_REQUIRED' } })
      return null
    }
    if (!await validateAdminSession(client, identity, session)) {
      await recordDenial(req,{ correlationId,eventType:'session',reasonCode:'SESSION_REGISTRY_REVOKED',sessionId:session.sessionId },client)
      clearSessionCookies(res)
      safeJson(res, 401, { error: { code: 'SESSION_REVOKED' } })
      return null
    }
    refreshActiveSessionCookie(res, restored.session, { ...session, ...identity })
    return { client, identity, session, correlationId }
  } catch (error) {
    if (error?.message === 'SESSION_RATE_LIMITED') {
      await recordDenial(req,{ correlationId,eventType:'rate_limit',reasonCode:'ADMIN_REQUEST_RATE_LIMITED',sessionId:session.sessionId })
      safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      return null
    }
    await recordDenial(req,{ correlationId,eventType:'application_error',reasonCode:'ADMIN_AUTHORIZATION_UNAVAILABLE',sessionId:session.sessionId })
    safeJson(res, 503, { error: { code: 'ADMIN_SERVICE_UNAVAILABLE' } })
    return null
  }
}
