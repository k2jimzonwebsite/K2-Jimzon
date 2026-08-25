import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SKU = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/
const STATUSES = new Set(['Draft', 'Under Review', 'Live', 'Unlisted', 'Discontinued'])
const PATCH_FIELDS = new Set([
  'name', 'short', 'barcode', 'subcategory', 'country_of_origin', 'origin', 'net_weight',
  'package_type', 'size', 'description', 'why_buy', 'why_rare', 'usage_instructions',
  'storage_instructions', 'ingredients', 'allergens', 'finished_product_details',
  'pairings', 'cost_price', 'srp', 'wholesale_price', 'dealer_price', 'reorder_level',
  'slug', 'seo_keywords', 'is_featured', 'is_human_reviewed', 'product_video_url', 'internal_notes',
])
const MASTER_FIELDS = [
  'sku', 'name', 'short', 'barcode', 'status', 'updated_at', 'subcategory',
  'country_of_origin', 'origin', 'net_weight', 'package_type', 'size', 'description',
  'why_buy', 'why_rare', 'usage_instructions', 'storage_instructions', 'ingredients',
  'allergens', 'finished_product_details', 'pairings', 'cost_price', 'srp',
  'wholesale_price', 'dealer_price', 'reorder_level', 'slug', 'seo_keywords',
  'is_featured', 'is_human_reviewed', 'product_video_url', 'internal_notes',
].join(',')

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) throw new Error('REQUEST_INVALID')
}

function reason(value) {
  const normalized = String(value || '').trim()
  if (normalized.length < 8 || normalized.length > 500) throw new Error('REQUEST_INVALID')
  return normalized
}

function skus(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 25) throw new Error('REQUEST_INVALID')
  const normalized = value.map((item) => String(item || '').trim())
  if (new Set(normalized).size !== normalized.length || normalized.some((item) => !SKU.test(item))) throw new Error('REQUEST_INVALID')
  return normalized
}

function boundedText(value, max, { required = false } = {}) {
  if (value === null) return null
  if (typeof value !== 'string') throw new Error('REQUEST_INVALID')
  const normalized = value.trim()
  if ((required && !normalized) || normalized.length > max) throw new Error('REQUEST_INVALID')
  return normalized || null
}

function boundedNumber(value, max) {
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) throw new Error('REQUEST_INVALID')
  return value
}

function boundedStrings(value, maxItems, maxLength) {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error('REQUEST_INVALID')
  return value.map((item) => boundedText(item, maxLength, { required: true }))
}

function validatePatch(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length < 1
      || Object.keys(raw).some((key) => !PATCH_FIELDS.has(key))) throw new Error('REQUEST_INVALID')
  const patch = {}
  const textLimits = {
    name: 240, short: 500, barcode: 64, subcategory: 120, country_of_origin: 120,
    origin: 240, package_type: 120, size: 120, description: 10000, why_buy: 2000,
    why_rare: 2000, usage_instructions: 5000, storage_instructions: 5000,
    ingredients: 10000, allergens: 5000, finished_product_details: 5000,
    slug: 180, product_video_url: 2000, internal_notes: 5000,
  }
  for (const [key, value] of Object.entries(raw)) {
    if (Object.hasOwn(textLimits, key)) patch[key] = boundedText(value, textLimits[key], { required: key === 'name' })
    else if (['cost_price', 'srp', 'wholesale_price', 'dealer_price'].includes(key)) patch[key] = boundedNumber(value, 1_000_000)
    else if (key === 'net_weight' || key === 'reorder_level') patch[key] = boundedNumber(value, key === 'net_weight' ? 100_000 : 1_000_000)
    else if (key === 'pairings') patch[key] = boundedStrings(value, 20, 240)
    else if (key === 'seo_keywords') patch[key] = boundedStrings(value, 30, 120)
    else if (key === 'is_featured' || key === 'is_human_reviewed') {
      if (typeof value !== 'boolean') throw new Error('REQUEST_INVALID')
      patch[key] = value
    }
  }
  return patch
}

export function validateProductMasterCommand(body) {
  exactObject(body, ['action', 'payload'])
  if (body.action === 'update') {
    exactObject(body.payload, ['sku', 'patch', 'expectedUpdatedAt', 'reason'])
    const expectedUpdatedAt = String(body.payload.expectedUpdatedAt || '')
    if (!SKU.test(String(body.payload.sku || '')) || !Number.isFinite(Date.parse(expectedUpdatedAt))) throw new Error('REQUEST_INVALID')
    return { action: 'product_master_update', payload: { sku: body.payload.sku, patch: validatePatch(body.payload.patch), expectedUpdatedAt, reason: reason(body.payload.reason) } }
  }
  if (body.action === 'status') {
    exactObject(body.payload, ['skus', 'status', 'reason'])
    if (!STATUSES.has(body.payload.status)) throw new Error('REQUEST_INVALID')
    return { action: 'product_master_status', payload: { skus: skus(body.payload.skus), status: body.payload.status, reason: reason(body.payload.reason) } }
  }
  if (body.action === 'delete') {
    exactObject(body.payload, ['skus', 'pin', 'reason'])
    if (!/^\d{4}$/.test(String(body.payload.pin || ''))) throw new Error('REQUEST_INVALID')
    return { action: 'product_master_delete', payload: { skus: skus(body.payload.skus), pin: String(body.payload.pin), reason: reason(body.payload.reason) } }
  }
  throw new Error('REQUEST_INVALID')
}

function commandError(res, error) {
  const raw = String(error?.message || '')
  if (raw.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
  if (raw.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
  if (raw.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
  if (raw.includes('K2_ADMIN_PRODUCT_VERSION_CONFLICT')) return safeJson(res, 409, { error: { code: 'PRODUCT_VERSION_CONFLICT' } })
  if (raw.includes('K2_PUBLICATION_NOT_READY')) return safeJson(res, 409, { error: { code: 'PUBLICATION_NOT_READY' } })
  if (raw.includes('K2_PUBLICATION_TRANSITION_INVALID')) return safeJson(res, 409, { error: { code: 'PUBLICATION_TRANSITION_INVALID' } })
  if (raw.includes('K2_PRODUCT_NOT_FOUND')) return safeJson(res, 404, { error: { code: 'PRODUCT_NOT_FOUND' } })
  if (raw.includes('K2_ADMIN_PRODUCT_INVALID') || raw.includes('K2_ADMIN_PRODUCT_REASON_INVALID')) return safeJson(res, 400, { error: { code: 'PRODUCT_COMMAND_INVALID' } })
  return safeJson(res, 503, { error: { code: 'PRODUCT_COMMAND_UNAVAILABLE' } })
}

export default async function handleProductMaster(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (req.method === 'POST' && !UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (authorized.identity.role !== 'Admin') return safeJson(res, 403, { error: { code: 'PRODUCT_ADMIN_REQUIRED' } })
  if (req.method === 'GET') {
    const sku = String(req.query?.sku || '').trim()
    if (!SKU.test(sku)) return safeJson(res, 400, { error: { code: 'PRODUCT_COMMAND_INVALID' } })
    const { data, error } = await authorized.client.from('products').select(MASTER_FIELDS).eq('sku', sku).maybeSingle()
    if (error) return safeJson(res, 503, { error: { code: 'PRODUCTS_UNAVAILABLE' } })
    if (!data) return safeJson(res, 404, { error: { code: 'PRODUCT_NOT_FOUND' } })
    return safeJson(res, 200, { ok: true, product: data })
  }
  try {
    const command = validateProductMasterCommand(await readJson(req))
    const signed = signedAdminCommandArguments(command.action, authorized.identity.userId, idempotencyKey, command.payload)
    const { data, error } = await authorized.client.rpc('execute_admin_product_master_command_v1', signed)
    if (error) return commandError(res, error)
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) return safeJson(res, 400, { error: { code: 'PRODUCT_COMMAND_INVALID' } })
    return safeJson(res, 503, { error: { code: 'PRODUCT_COMMAND_UNAVAILABLE' } })
  }
}
