import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function validateSupplierCreate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 4
      || !['name', 'contactEmail', 'leadTimeDays', 'reason'].every((key) => Object.hasOwn(body, key))) throw new Error('REQUEST_INVALID')
  const name = String(body.name || '').trim()
  const contactEmail = String(body.contactEmail || '').trim().toLowerCase()
  const leadTimeDays = Number(body.leadTimeDays)
  const reason = String(body.reason || '').trim()
  if (name.length < 2 || name.length > 120 || contactEmail.length > 254
      || (contactEmail && !EMAIL.test(contactEmail)) || !Number.isInteger(leadTimeDays)
      || leadTimeDays < 0 || leadTimeDays > 365 || reason.length < 3 || reason.length > 500) throw new Error('REQUEST_INVALID')
  return { name, contactEmail: contactEmail || null, leadTimeDays, reason }
}

function commandError(res, error) {
  const raw = String(error?.message || '')
  if (raw.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
  if (raw.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
  if (raw.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
  if (raw.includes('K2_ADMIN_SUPPLIER_DUPLICATE')) return safeJson(res, 409, { error: { code: 'SUPPLIER_DUPLICATE' } })
  if (raw.includes('K2_ADMIN_SUPPLIER_INVALID')) return safeJson(res, 400, { error: { code: 'SUPPLIER_INVALID' } })
  return safeJson(res, 503, { error: { code: 'PROCUREMENT_COMMAND_UNAVAILABLE' } })
}

export default async function handleProcurement(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (req.method === 'POST' && !UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (req.method === 'GET') {
    const { data, error } = await authorized.client.rpc('read_admin_procurement_v1')
    if (error || !data) return safeJson(res, 503, { error: { code: 'PROCUREMENT_UNAVAILABLE' } })
    return safeJson(res, 200, { ok: true, procurement: data })
  }
  if (authorized.identity.role !== 'Admin') return safeJson(res, 403, { error: { code: 'SUPPLIER_ADMIN_REQUIRED' } })
  try {
    const payload = validateSupplierCreate(await readJson(req))
    const signed = signedAdminCommandArguments('supplier_create', authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_supplier_command_v1', signed)
    if (error) return commandError(res, error)
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) return safeJson(res, 400, { error: { code: 'SUPPLIER_INVALID' } })
    return safeJson(res, 503, { error: { code: 'PROCUREMENT_COMMAND_UNAVAILABLE' } })
  }
}
