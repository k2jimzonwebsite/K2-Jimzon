import { randomUUID } from 'node:crypto'
import { signedAdminCommandArguments } from './security.js'

const SESSION_ACTIONS = new Set([
  'admin_session_register',
  'admin_session_validate',
  'admin_session_revoke_current',
  'admin_session_revoke_one',
  'admin_session_revoke_all',
  'admin_session_list',
])

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key))
}

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')
}

function cleanReason(value) {
  const reason = String(value || '').trim()
  if (reason.length < 3 || reason.length > 160) throw new Error('SESSION_REQUEST_INVALID')
  return reason
}

export function validateAdminSessionCommand(action, payload) {
  if (!SESSION_ACTIONS.has(action)) throw new Error('SESSION_REQUEST_INVALID')
  if (action === 'admin_session_register') {
    if (!exactKeys(payload, ['sessionId', 'createdAt', 'expiresAt'])
        || !validUuid(payload.sessionId)
        || !Number.isSafeInteger(payload.createdAt)
        || !Number.isSafeInteger(payload.expiresAt)
        || payload.expiresAt <= payload.createdAt
        || payload.expiresAt - payload.createdAt !== 8 * 60 * 60 * 1000) {
      throw new Error('SESSION_REQUEST_INVALID')
    }
    return payload
  }
  if (action === 'admin_session_validate' || action === 'admin_session_list') {
    if (!exactKeys(payload, ['sessionId']) || !validUuid(payload.sessionId)) {
      throw new Error('SESSION_REQUEST_INVALID')
    }
    return payload
  }
  if (!exactKeys(payload, ['sessionId', 'reason']) || !validUuid(payload.sessionId)) {
    throw new Error('SESSION_REQUEST_INVALID')
  }
  return { sessionId: payload.sessionId, reason: cleanReason(payload.reason) }
}

export async function executeAdminSessionCommand(
  client, identity, action, payload, idempotencyKey = randomUUID(),
) {
  const validated = validateAdminSessionCommand(action, payload)
  const { data, error } = await client.rpc('execute_admin_session_command_v1', {
    ...signedAdminCommandArguments(action, identity.userId, idempotencyKey, validated),
  })
  if (String(error?.message || '').includes('K2_ADMIN_RATE_LIMITED')) {
    throw new Error('SESSION_RATE_LIMITED')
  }
  if (error || !data || typeof data !== 'object') throw new Error('SESSION_REGISTRY_UNAVAILABLE')
  return data
}

export function registerAdminSession(client, identity, session) {
  return executeAdminSessionCommand(client, identity, 'admin_session_register', {
    sessionId: session.sessionId,
    createdAt: session.createdAt,
    expiresAt: session.expiresHardAt,
  }).then((result) => {
    if (result.registered !== true || result.sessionId !== session.sessionId) {
      throw new Error('SESSION_REGISTRY_UNAVAILABLE')
    }
    return result
  })
}

export async function validateAdminSession(client, identity, session) {
  const result = await executeAdminSessionCommand(client, identity, 'admin_session_validate', {
    sessionId: session.sessionId,
  })
  return result.active === true
}

export function revokeCurrentAdminSession(client, identity, session, reason = 'Staff logout') {
  return executeAdminSessionCommand(client, identity, 'admin_session_revoke_current', {
    sessionId: session.sessionId,
    reason,
  })
}

export function revokeOneAdminSession(client, identity, targetSessionId, reason, idempotencyKey) {
  return executeAdminSessionCommand(client, identity, 'admin_session_revoke_one', {
    sessionId: targetSessionId,
    reason,
  }, idempotencyKey)
}

export function revokeAllAdminSessions(client, identity, session, reason, idempotencyKey) {
  return executeAdminSessionCommand(client, identity, 'admin_session_revoke_all', {
    sessionId: session.sessionId,
    reason,
  }, idempotencyKey)
}

export function listAdminSessions(client, identity, session) {
  return executeAdminSessionCommand(client, identity, 'admin_session_list', {
    sessionId: session.sessionId,
  })
}
