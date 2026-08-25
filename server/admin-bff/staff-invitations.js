import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson } from './security.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const ROLES = new Set(['Admin', 'Staff', 'Customer'])
const PROVIDER_ERRORS = new Map([
  ['AAL2_REQUIRED', ['MFA_REQUIRED', 401]],
  ['FORBIDDEN_ROLE', ['STAFF_ACCESS_ADMIN_REQUIRED', 403]],
  ['INVALID_EMAIL', ['STAFF_INVITATION_INVALID', 400]],
  ['INVALID_ROLE', ['STAFF_INVITATION_INVALID', 400]],
  ['INVALID_REASON', ['STAFF_INVITATION_INVALID', 400]],
  ['IDEMPOTENCY_CONFLICT', ['IDEMPOTENCY_CONFLICT', 409]],
  ['OPERATION_IN_PROGRESS', ['COMMAND_IN_PROGRESS', 409]],
  ['RATE_LIMITED', ['RATE_LIMITED', 429]],
])

export function validateStaffInvitation(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 3
      || !['email', 'role', 'reason'].every((key) => Object.hasOwn(body, key))) throw new Error('REQUEST_INVALID')
  const email = String(body.email || '').trim().toLowerCase()
  const role = String(body.role || '')
  const reason = String(body.reason || '').trim()
  if (!email || email.length > 254 || !EMAIL.test(email) || !ROLES.has(role)
      || reason.length < 3 || reason.length > 500) throw new Error('REQUEST_INVALID')
  return { email, role, reason }
}

export function staffInvitationForwardingConfig(env = process.env) {
  if (String(env.K2_STAFF_INVITATIONS_ENABLED || '').toLowerCase() !== 'true') return null
  const supabaseUrl = String(env.SUPABASE_URL || '').trim().replace(/\/$/, '')
  const publishableKey = String(env.SUPABASE_PUBLISHABLE_KEY || '').trim()
  try {
    const parsed = new URL(supabaseUrl)
    const local = ['localhost', '127.0.0.1'].includes(parsed.hostname)
    if ((!local && parsed.protocol !== 'https:') || (local && !['http:', 'https:'].includes(parsed.protocol))
        || parsed.origin !== supabaseUrl || !publishableKey) return null
  } catch { return null }
  return { supabaseUrl, publishableKey }
}

export function isStaffInvitationForwardingConfigured(env = process.env) {
  return Boolean(staffInvitationForwardingConfig(env))
}

export async function forwardStaffInvitation(authorized, request, fetchImpl = fetch, config = staffInvitationForwardingConfig()) {
  if (!config) throw new Error('STAFF_INVITATION_UNAVAILABLE')
  const { data, error } = await authorized.client.auth.getSession()
  const accessToken = data?.session?.access_token
  if (error || !accessToken) throw new Error('STAFF_INVITATION_SESSION_UNAVAILABLE')

  let response
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    response = await fetchImpl(`${config.supabaseUrl}/functions/v1/invite-staff`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: config.publishableKey,
        Origin: request.origin,
        'X-Idempotency-Key': request.idempotencyKey,
      },
      body: JSON.stringify({ ...request.invitation, redirectTo: request.origin }),
      signal: controller.signal,
    })
  } catch { throw new Error('STAFF_INVITATION_UNAVAILABLE') }
  finally { clearTimeout(timeout) }

  const raw = await response.text()
  if (Buffer.byteLength(raw, 'utf8') > 16 * 1024) throw new Error('STAFF_INVITATION_UNAVAILABLE')
  let payload = {}
  try { payload = JSON.parse(raw) } catch { throw new Error('STAFF_INVITATION_UNAVAILABLE') }
  if (!response.ok || payload?.ok !== true) {
    const mapped = PROVIDER_ERRORS.get(String(payload?.error || ''))
    const failure = new Error(mapped?.[0] || 'STAFF_INVITATION_UNAVAILABLE')
    failure.status = mapped?.[1] || 503
    throw failure
  }
  if (payload.email !== request.invitation.email || payload.role !== request.invitation.role
      || typeof payload.invited !== 'boolean' || payload.roleAssigned !== true) {
    throw new Error('STAFF_INVITATION_UNAVAILABLE')
  }
  return { email: payload.email, role: payload.role, invited: payload.invited }
}

export default async function handleStaffInvitation(req, res) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  if (authorized.identity.role !== 'Admin') return safeJson(res, 403, { error: { code: 'STAFF_ACCESS_ADMIN_REQUIRED' } })
  try {
    const invitation = validateStaffInvitation(await readJson(req))
    const result = await forwardStaffInvitation(authorized, {
      origin: String(req.headers.origin || ''), idempotencyKey, invitation,
    })
    return safeJson(res, 200, { ok: true, result })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'STAFF_INVITATION_INVALID' } })
    }
    const status = Number(error?.status) || 503
    const code = String(error?.message || '')
    const safeCode = ['MFA_REQUIRED', 'STAFF_ACCESS_ADMIN_REQUIRED', 'STAFF_INVITATION_INVALID',
      'IDEMPOTENCY_CONFLICT', 'COMMAND_IN_PROGRESS', 'RATE_LIMITED'].includes(code)
      ? code : 'STAFF_INVITATION_UNAVAILABLE'
    return safeJson(res, status, { error: { code: safeCode } }, safeCode === 'RATE_LIMITED' ? { 'Retry-After': '60' } : {})
  }
}
