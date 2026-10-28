import { randomUUID } from 'node:crypto'
import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'
import { isAdminRole } from './supabase.js'
import { currentAdminRequestSignal } from './request-deadline.js'
import { withAuthorityScope } from '../privacy-authority/bounds.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HOLD_KINDS = new Set(['legal', 'refund', 'dispute', 'security'])

export function validatePrivacyReview(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('REQUEST_INVALID')
  const { requestId, customerId, action, reason } = body
  const allowed = action === 'assign' ? ['requestId', 'action', 'reason']
    : action === 'add_hold' ? ['requestId', 'action', 'reason', 'kind']
      : action === 'resolve_hold' ? ['requestId', 'action', 'reason', 'holdId']
        : action === 'add_customer_hold' ? ['customerId', 'action', 'reason', 'kind']
          : action === 'resolve_customer_hold' ? ['customerId', 'action', 'reason', 'holdId'] : []
  const customerScoped = action === 'add_customer_hold' || action === 'resolve_customer_hold'
  if (!allowed.length || Object.keys(body).some(key => !allowed.includes(key)) ||
      !UUID.test((customerScoped ? customerId : requestId) || '') || typeof reason !== 'string' ||
      reason.trim().length < 3 || reason.trim().length > 500) throw new Error('REQUEST_INVALID')
  const payload = { ...(customerScoped ? { customerId } : { requestId }), action, reason: reason.trim() }
  if (action === 'add_hold' || action === 'add_customer_hold') {
    if (!HOLD_KINDS.has(body.kind)) throw new Error('REQUEST_INVALID')
    payload.kind = body.kind
  }
  if (action === 'resolve_hold' || action === 'resolve_customer_hold') {
    if (!UUID.test(body.holdId || '')) throw new Error('REQUEST_INVALID')
    payload.holdId = body.holdId
  }
  return payload
}

function readCursor(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.length > 256 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('REQUEST_INVALID')
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (!cursor || Object.keys(cursor).sort().join(',') !== 'createdAt,id' ||
        !UUID.test(cursor.id || '') || typeof cursor.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(cursor.createdAt))) throw new Error('REQUEST_INVALID')
    return cursor
  } catch { throw new Error('REQUEST_INVALID') }
}

export function createCustomerPrivacyAdminHandler({ authorize = authorizeAdminRequest, holdAuthority = null, deadlineMs = 9000 } = {}) {
  return async function handleCustomerPrivacy(req, res) {
    if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
    const authorized = await authorize(req, res, req.method === 'POST' ? { csrf: true } : undefined)
    if (!authorized) return undefined
    if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'PRIVACY_ADMIN_REQUIRED' } })
    if (req.method === 'POST' && req.headers['x-k2-actor-id'] !== authorized.identity.userId) return safeJson(res, 403, { error: { code: 'PRIVACY_ACTOR_CHANGED' } })
    try {
      if (req.method === 'GET') {
        const scope = req.query?.scope || 'current'
        if (!['current', 'history', 'customer'].includes(scope)) throw new Error('REQUEST_INVALID')
        if (scope === 'customer' && !UUID.test(req.query?.customerId || '')) throw new Error('REQUEST_INVALID')
        const payload = { cursor: readCursor(req.query?.cursor), scope, ...(scope === 'customer' ? { customerId: req.query.customerId } : {}) }
        const args = signedAdminCommandArguments('customer_privacy_read', authorized.identity.userId, randomUUID(), payload)
        const { data, error } = await authorized.client.rpc('read_admin_customer_privacy_v1', args)
        if (error) throw new Error('PRIVACY_READ_UNAVAILABLE')
        const nextCursor = data?.nextCursor ? Buffer.from(JSON.stringify(data.nextCursor)).toString('base64url') : null
        return safeJson(res, 200, { ok: true, requests: Array.isArray(data?.requests) ? data.requests : [], customerHolds: Array.isArray(data?.customerHolds) ? data.customerHolds : [], nextCursor, actorId: authorized.identity.userId })
      }
      const key = String(req.headers['x-k2-idempotency-key'] || '').trim()
      if (!UUID.test(key)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
      const payload = validatePrivacyReview(await readJson(req))
      if (payload.action !== 'assign') {
        // No default bootstrap or direct-write fallback. Legacy holds still
        // require qualified native reconciliation before activation.
        if (!holdAuthority) return safeJson(res, 503, { error: { code: 'PRIVACY_AUTHORITY_UNAVAILABLE' } })
        const adding = payload.action === 'add_hold' || payload.action === 'add_customer_hold'
        const scopeId = payload.customerId ? { customerId: payload.customerId } : { requestId: payload.requestId }
        const result = await withAuthorityScope(async scope => {
          const action = adding ? 'customer_privacy_hold_prepare' : 'customer_privacy_hold_resolve'
          const nativePayload = adding ? { ...scopeId, kind: payload.kind, reason: payload.reason }
            : { ...scopeId, holdId: payload.holdId, reason: payload.reason }
          const args = signedAdminCommandArguments(action, authorized.identity.userId, key, nativePayload)
          const { data, error } = await scope.io(() => {
            const call = adding ? authorized.client.rpc('prepare_admin_customer_privacy_hold_v2', args)
              : authorized.client.rpc('resolve_admin_customer_privacy_hold_v2', args)
            return call.abortSignal ? call.abortSignal(scope.signal) : call
          })
          if (error) throw new Error(String(error.message || 'PRIVACY_COMMAND_UNAVAILABLE'))
          return scope.io(() => adding ? holdAuthority.applyHold(data, { signal: scope.signal }) : holdAuthority.releaseHold(data, { signal: scope.signal }))
        }, { deadlineMs, signal: currentAdminRequestSignal() })
        if (adding && result?.currentState === 'resolved') return safeJson(res, 409, { error: { code: 'PRIVACY_HOLD_ALREADY_RESOLVED' } })
        if (adding && result?.currentState === 'refused') return safeJson(res, 409, { error: { code: 'PRIVACY_PROCESSING_STARTED' } })
        if (result?.currentState !== (adding ? 'projected' : 'resolved') || !UUID.test(result.receipt?.holdId || '')) throw new Error('PRIVACY_COMMAND_UNAVAILABLE')
        return safeJson(res, 200, { ok: true, result: { ...scopeId, action: payload.action,
          holdId: result.receipt.holdId, currentState: result.currentState, checkedAt: new Date().toISOString() } })
      }
      const args = signedAdminCommandArguments('customer_privacy_review', authorized.identity.userId, key, payload)
      const { data, error } = await authorized.client.rpc('review_admin_customer_privacy_v1', args)
      if (error) {
        const message = String(error.message || '')
        for (const [source, code, status] of [
          ['K2_ADMIN_RATE_LIMITED', 'RATE_LIMITED', 429],
          ['K2_ADMIN_IDEMPOTENCY_CONFLICT', 'IDEMPOTENCY_CONFLICT', 409],
          ['K2_ADMIN_COMMAND_IN_PROGRESS', 'COMMAND_IN_PROGRESS', 409],
          ['K2_PRIVACY_ASSIGNMENT_REQUIRED', 'PRIVACY_ASSIGNMENT_REQUIRED', 409],
          ['K2_PRIVACY_STATE_CONFLICT', 'PRIVACY_STATE_CONFLICT', 409],
          ['K2_PRIVACY_HOLD_NOT_FOUND', 'PRIVACY_HOLD_NOT_FOUND', 404],
          ['K2_PRIVACY_REQUEST_NOT_FOUND', 'PRIVACY_REQUEST_NOT_FOUND', 404],
        ]) if (message.includes(source)) return safeJson(res, status, { error: { code } })
        throw new Error('PRIVACY_COMMAND_UNAVAILABLE')
      }
      return safeJson(res, 200, { ok: true, result: data })
    } catch (error) {
      if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
      for (const [source, code, status] of [
        ['K2_ADMIN_RATE_LIMITED', 'RATE_LIMITED', 429],
        ['K2_ADMIN_IDEMPOTENCY_CONFLICT', 'IDEMPOTENCY_CONFLICT', 409],
        ['K2_PRIVACY_INTENT_CONFLICT', 'IDEMPOTENCY_CONFLICT', 409],
        ['K2_PRIVACY_ASSIGNMENT_REQUIRED', 'PRIVACY_ASSIGNMENT_REQUIRED', 409],
        ['K2_PRIVACY_HOLD_RECONCILIATION_REQUIRED', 'PRIVACY_HOLD_RECONCILIATION_REQUIRED', 409],
        ['K2_PRIVACY_STATE_CONFLICT', 'PRIVACY_STATE_CONFLICT', 409],
      ]) if (String(error?.message).includes(source)) return safeJson(res, status, { error: { code } })
      return safeJson(res, 503, { error: { code: req.method === 'GET' ? 'PRIVACY_READ_UNAVAILABLE' : 'PRIVACY_COMMAND_UNAVAILABLE' } })
    }
  }
}
