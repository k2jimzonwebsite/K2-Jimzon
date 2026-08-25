import { authorizeAdminRequest } from '../../../server/admin-bff/authorize.js'
import { clearSessionCookies, readJson, safeJson } from '../../../server/admin-bff/security.js'
import {
  revokeAllAdminSessions, revokeOneAdminSession,
} from '../../../server/admin-bff/sessions.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  }
  const operationKey = String(req.headers['x-k2-idempotency-key'] || '')
  if (!UUID.test(operationKey)) {
    return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  }
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const body = await readJson(req)
    if (!body || typeof body !== 'object' || Array.isArray(body)
        || Object.keys(body).sort().join(',') !== 'reason,scope,targetSessionId') {
      throw new Error('SESSION_REQUEST_INVALID')
    }
    const scope = String(body.scope || '')
    const reason = String(body.reason || '').trim()
    const targetSessionId = String(body.targetSessionId || '')
    if (!['one', 'all'].includes(scope) || reason.length < 3 || reason.length > 160
        || (scope === 'one' && !UUID.test(targetSessionId))
        || (scope === 'all' && targetSessionId !== '')) {
      throw new Error('SESSION_REQUEST_INVALID')
    }
    const result = scope === 'all'
      ? await revokeAllAdminSessions(
          authorized.client, authorized.identity, authorized.session, reason, operationKey,
        )
      : await revokeOneAdminSession(
          authorized.client, authorized.identity, targetSessionId, reason, operationKey,
        )
    const signedOut = scope === 'all' || targetSessionId === authorized.session.sessionId
    if (signedOut) clearSessionCookies(res)
    return safeJson(res, 200, { ok: true, revoked: result.revoked === true, signedOut })
  } catch (error) {
    const code = ['BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON', 'SESSION_REQUEST_INVALID']
      .includes(error.message) ? error.message : 'SESSION_REGISTRY_UNAVAILABLE'
    return safeJson(res, code === 'SESSION_REGISTRY_UNAVAILABLE' ? 503 : 400, { error: { code } })
  }
}
