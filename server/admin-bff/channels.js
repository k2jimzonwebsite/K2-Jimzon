import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'
import { isAdminRole } from './supabase.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateInternalChannelVerification(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 3
      || !['channel', 'publicReference', 'reason'].every((key) => Object.hasOwn(body, key))) throw new Error('REQUEST_INVALID')
  const channel = String(body.channel || '').trim()
  const publicReference = String(body.publicReference || '').trim()
  const reason = String(body.reason || '').trim()
  if (!['website', 'pasabuy'].includes(channel) || publicReference.length < 3
      || publicReference.length > 80 || reason.length < 3 || reason.length > 500) throw new Error('REQUEST_INVALID')
  return { channel, publicReference, reason }
}

function commandError(res, error) {
  const raw = String(error?.message || '')
  if (raw.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
  if (raw.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
  if (raw.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
  if (raw.includes('K2_ADMIN_CHANNEL_REFERENCE_NOT_FOUND')) return safeJson(res, 404, { error: { code: 'CHANNEL_REFERENCE_NOT_FOUND' } })
  if (raw.includes('K2_ADMIN_CHANNEL_NOT_FOUND')) return safeJson(res, 404, { error: { code: 'CHANNEL_NOT_FOUND' } })
  if (raw.includes('K2_ADMIN_CHANNEL_INVALID')) return safeJson(res, 400, { error: { code: 'CHANNEL_VERIFICATION_INVALID' } })
  return safeJson(res, 503, { error: { code: 'CHANNEL_COMMAND_UNAVAILABLE' } })
}

export default async function handleChannels(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (req.method === 'POST' && !UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (req.method === 'GET') {
    const { data, error } = await authorized.client.rpc('read_admin_channel_readiness_v1')
    if (error || !data) return safeJson(res, 503, { error: { code: 'CHANNEL_READINESS_UNAVAILABLE' } })
    return safeJson(res, 200, { ok: true, channels: data })
  }
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'CHANNEL_ADMIN_REQUIRED' } })
  try {
    const payload = validateInternalChannelVerification(await readJson(req))
    const signed = signedAdminCommandArguments('channel_internal_event_verify', authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_channel_command_v1', signed)
    if (error) return commandError(res, error)
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) return safeJson(res, 400, { error: { code: 'CHANNEL_VERIFICATION_INVALID' } })
    return safeJson(res, 503, { error: { code: 'CHANNEL_COMMAND_UNAVAILABLE' } })
  }
}
