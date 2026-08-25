import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'
import { isStaffInvitationForwardingConfigured } from './staff-invitations.js'
import { isMfaReplacementConfigured } from './mfa-replacement.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ACTIONS = new Set(['staff_role_change', 'admin_delete_pin_set'])

export function validateStaffAccessCommand(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 2
      || !ACTIONS.has(body.action) || !body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) throw new Error('REQUEST_INVALID')
  const reason = String(body.payload.reason || '').trim()
  if (reason.length < 3 || reason.length > 500) throw new Error('REQUEST_INVALID')
  if (body.action === 'staff_role_change') {
    if (Object.keys(body.payload).length !== 3 || !['targetUserId', 'role', 'reason'].every((key) => Object.hasOwn(body.payload, key))
        || !UUID.test(String(body.payload.targetUserId || '')) || !['Admin', 'Staff', 'Customer'].includes(body.payload.role)) throw new Error('REQUEST_INVALID')
    return { action: body.action, payload: { targetUserId: body.payload.targetUserId, role: body.payload.role, reason } }
  }
  if (Object.keys(body.payload).length !== 2 || !['pin', 'reason'].every((key) => Object.hasOwn(body.payload, key))
      || !/^\d{4}$/.test(String(body.payload.pin || ''))) throw new Error('REQUEST_INVALID')
  return { action: body.action, payload: { pin: String(body.payload.pin), reason } }
}

function commandError(res, error) {
  const raw = String(error?.message || '')
  if (raw.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
  if (raw.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
  if (raw.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
  if (raw.includes('K2_ADMIN_FINAL_ADMIN')) return safeJson(res, 409, { error: { code: 'FINAL_ADMIN_REQUIRED' } })
  if (raw.includes('K2_ADMIN_STAFF_UNCHANGED')) return safeJson(res, 409, { error: { code: 'STAFF_ROLE_UNCHANGED' } })
  if (raw.includes('K2_ADMIN_STAFF_NOT_FOUND')) return safeJson(res, 404, { error: { code: 'STAFF_PROFILE_NOT_FOUND' } })
  if (raw.includes('K2_ADMIN_STAFF_INVALID')) return safeJson(res, 400, { error: { code: 'STAFF_ACCESS_INVALID' } })
  return safeJson(res, 503, { error: { code: 'STAFF_ACCESS_COMMAND_UNAVAILABLE' } })
}

export default async function handleStaffAccess(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (req.method === 'POST' && !UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (authorized.identity.role !== 'Admin') return safeJson(res, 403, { error: { code: 'STAFF_ACCESS_ADMIN_REQUIRED' } })
  if (req.method === 'GET') {
    const { data, error } = await authorized.client.rpc('read_admin_staff_access_v1')
    if (error || !data) return safeJson(res, 503, { error: { code: 'STAFF_ACCESS_UNAVAILABLE' } })
    return safeJson(res, 200, { ok: true, staffAccess: {
      ...data,
      invitationAvailable: isStaffInvitationForwardingConfigured(),
      mfaReplacementAvailable: isMfaReplacementConfigured(),
    } })
  }
  try {
    const command = validateStaffAccessCommand(await readJson(req))
    const signed = signedAdminCommandArguments(command.action, authorized.identity.userId, idempotencyKey, command.payload)
    const { data, error } = await authorized.client.rpc('execute_admin_staff_access_command_v1', signed)
    if (error) return commandError(res, error)
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) return safeJson(res, 400, { error: { code: 'STAFF_ACCESS_INVALID' } })
    return safeJson(res, 503, { error: { code: 'STAFF_ACCESS_COMMAND_UNAVAILABLE' } })
  }
}
