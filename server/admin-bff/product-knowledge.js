import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'

/**
 * MAP-027 — the staff write path for customer-facing product knowledge.
 *
 * Everything this accepts ends up in front of a customer, so the shape is
 * exact rather than permissive: unknown keys are a rejection, not something to
 * ignore. The database enforces the same bounds again; this exists so a
 * malformed request is refused before it reaches a signed command and burns an
 * idempotency key.
 */

const STATUS = new Set(['draft', 'approved'])
const FIELD_KEY = /^[a-z][a-z0-9_]{1,40}$/
const MAX_ENTRIES = 20

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REQUEST_INVALID')
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
}

function boundedText(value, { required = false, max = 4000 } = {}) {
  const result = String(value ?? '').trim()
  if ((required && !result) || result.length > max) throw new Error('REQUEST_INVALID')
  return result
}

function status(value) {
  const result = boundedText(value, { required: true, max: 20 })
  if (!STATUS.has(result)) throw new Error('REQUEST_INVALID')
  return result
}

/**
 * Provenance travels with the record so a reader can later tell approved-as-
 * generated from approved-after-editing. It is a closed set of short strings,
 * not free-form JSON, because it is written by a tool and read by people.
 */
function provenance(value) {
  if (value === undefined || value === null) return {}
  exactObject(value, ['source', 'model', 'generatedAt', 'approvedBy', 'approvedAt'])
  const out = {}
  for (const key of ['source', 'model', 'generatedAt', 'approvedBy', 'approvedAt']) {
    const text = boundedText(value[key], { max: 200 })
    if (text) out[key] = text
  }
  return out
}

function boundedList(value) {
  if (!Array.isArray(value)) throw new Error('REQUEST_INVALID')
  if (value.length > MAX_ENTRIES) throw new Error('REQUEST_INVALID')
  return value
}

export function validateProductKnowledgeCommand(action, body) {
  if (action !== 'product_knowledge_save') throw new Error('REQUEST_INVALID')
  exactObject(body, ['sku', 'fields', 'faqs'])

  const fields = boundedList(body.fields).map((entry) => {
    exactObject(entry, ['key', 'status', 'value', 'provenance'])
    const key = boundedText(entry.key, { required: true, max: 41 })
    if (!FIELD_KEY.test(key)) throw new Error('REQUEST_INVALID')
    const entryStatus = status(entry.status)
    const value = boundedText(entry.value, { max: 4000 })
    // The database refuses this too. Refusing it here as well means a staff
    // mistake comes back as a validation error instead of a command failure.
    if (entryStatus === 'approved' && !value) throw new Error('REQUEST_INVALID')
    return { key, status: entryStatus, value, provenance: provenance(entry.provenance) }
  })

  const faqs = boundedList(body.faqs).map((entry) => {
    exactObject(entry, ['question', 'answer', 'status', 'provenance'])
    return {
      question: boundedText(entry.question, { required: true, max: 300 }),
      answer: boundedText(entry.answer, { required: true, max: 2000 }),
      status: status(entry.status),
      provenance: provenance(entry.provenance),
    }
  })

  const keys = fields.map((field) => field.key)
  if (new Set(keys).size !== keys.length) throw new Error('REQUEST_INVALID')

  return { sku: boundedText(body.sku, { required: true, max: 120 }), fields, faqs }
}

export async function handleProductKnowledgeCommand(req, res, action) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuid.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const payload = validateProductKnowledgeCommand(action, await readJson(req))
    const signed = signedAdminCommandArguments(action, authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_product_knowledge_v1', signed)
    if (error) {
      const providerCode = String(error.message || '')
      if (providerCode.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      if (providerCode.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      if (providerCode.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
      if (providerCode.includes('K2_KNOWLEDGE_SKU_UNKNOWN')) return safeJson(res, 404, { error: { code: 'PRODUCT_NOT_FOUND' } })
      return safeJson(res, 503, { error: { code: 'PRODUCT_KNOWLEDGE_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'PRODUCT_KNOWLEDGE_UNAVAILABLE' } })
  }
}
