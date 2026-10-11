import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'
import { isAdminRole } from './supabase.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PRINTABLE_SPACE = /[ \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/gu
const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/u

function validText(value, minimum, maximum) {
  if (typeof value !== 'string' || !value.isWellFormed() || CONTROLS.test(value)) return false
  const length = Array.from(value.replace(PRINTABLE_SPACE, ' ').replace(/^ +| +$/g, '')).length
  return length >= minimum && length <= maximum
}

export function validateReferenceCreate(body) {
  const keys = ['kind', 'name', 'parentId', 'reason']
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== keys.length || !keys.every(key => Object.hasOwn(body, key))
      || !['brand', 'category'].includes(body.kind)
      || !validText(body.name, 1, 120) || !validText(body.reason, 8, 500)
      || (body.kind === 'brand' && body.parentId !== null)
      || (body.parentId !== null && (typeof body.parentId !== 'string' || !UUID.test(body.parentId)))) {
    throw new Error('REQUEST_INVALID')
  }
  // SQL owns normalization/equivalence. Preserve strings and key order for replay.
  return body
}

function completeOptions(result, category) {
  return !result.error && Array.isArray(result.data) && Number.isInteger(result.count)
    && result.count >= 0 && result.count <= 500 && result.data.length === result.count
    && result.data.every(row => row && UUID.test(String(row.id || ''))
      && validText(row.name, 1, Number.MAX_SAFE_INTEGER)
      && (!category || row.parent_id === null
        || (typeof row.parent_id === 'string' && UUID.test(row.parent_id))))
}

export async function readAdminReferences(client) {
  const [brands, categories] = await Promise.all([
    client.from('brands').select('id,name', { count: 'exact' }).order('name').order('id').limit(501),
    client.from('categories').select('id,name,parent_id', { count: 'exact' }).order('name').order('id').limit(501),
  ])
  if (!completeOptions(brands, false) || !completeOptions(categories, true)) throw new Error('REFERENCES_UNAVAILABLE')
  return { brands: brands.data, categories: categories.data }
}

function commandError(res, error) {
  const message = String(error?.message || '')
  if (message.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
  if (message.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
  if (message.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
  if (message.includes('K2_REFERENCE_INPUT_INVALID')) return safeJson(res, 400, { error: { code: 'REFERENCE_INVALID' } })
  if (message.includes('K2_REFERENCE_PARENT_INVALID')) return safeJson(res, 409, { error: { code: 'REFERENCE_PARENT_INVALID' } })
  if (message.includes('K2_REFERENCE_RETRY_REQUIRED') || error?.code === '55P03' || error?.code === '57014') {
    return safeJson(res, 503, { error: { code: 'REFERENCE_BUSY' } }, { 'Retry-After': '1' })
  }
  return safeJson(res, 503, { error: { code: 'REFERENCE_COMMAND_UNAVAILABLE' } })
}

export default async function handleReferences(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const key = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (req.method === 'POST' && !UUID.test(key)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'REFERENCE_ADMIN_REQUIRED' } })
  try {
    if (req.method === 'GET') {
      return safeJson(res, 200, { ok: true, references: await readAdminReferences(authorized.client) })
    }
    const payload = validateReferenceCreate(await readJson(req))
    const signed = signedAdminCommandArguments('reference_create', authorized.identity.userId, key, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_reference_command_v1', signed)
    if (error) return commandError(res, error)
    if (!data?.reference || !UUID.test(String(data.reference.id || ''))
        || data.reference.kind !== payload.kind || typeof data.reference.name !== 'string'
        || typeof data.reused !== 'boolean') return safeJson(res, 503, { error: { code: 'REFERENCE_COMMAND_UNAVAILABLE' } })
    // A receipt describes history. Current identity is independently read and
    // may have changed; unavailable readback never hides the committed receipt.
    const category = payload.kind === 'category'
    const current = category
      ? await authorized.client.from('categories').select('id,name,parent_id').eq('id', data.reference.id).maybeSingle()
      : await authorized.client.from('brands').select('id,name').eq('id', data.reference.id).maybeSingle()
    const status = current.error ? 'unavailable' : !current.data ? 'missing'
      : current.data.name !== data.reference.name
        || (category && current.data.parent_id !== data.reference.parentId) ? 'changed' : 'available'
    return safeJson(res, 200, { ok: true, result: data,
      currentReference: { status, reference: current.error ? null : current.data } })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'REFERENCE_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: req.method === 'GET' ? 'REFERENCES_UNAVAILABLE' : 'REFERENCE_COMMAND_UNAVAILABLE' } })
  }
}
