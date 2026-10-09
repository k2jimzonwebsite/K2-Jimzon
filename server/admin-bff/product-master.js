import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'
import { isAdminRole } from './supabase.js'
import { strictInteger } from '../shared-numeric.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SKU = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/
const STATUSES = new Set(['Draft', 'Under Review', 'Live', 'Unlisted', 'Discontinued'])
const PATCH_FIELDS = new Set([
  'name', 'short', 'barcode', 'subcategory', 'country_of_origin', 'origin', 'net_weight', 'brand_id', 'category_id',
  'package_type', 'size', 'description', 'why_buy', 'why_rare', 'usage_instructions',
  'storage_instructions', 'ingredients', 'allergens', 'finished_product_details',
  'pairings', 'cost_price', 'srp', 'wholesale_price', 'dealer_price', 'reorder_level',
  'slug', 'seo_keywords', 'is_featured', 'is_human_reviewed', 'product_video_url', 'internal_notes',
])
const MASTER_FIELDS = [
  'sku', 'name', 'short', 'barcode', 'status', 'updated_at', 'published', 'brand_id', 'category_id', 'stock_available', 'total_stock', 'subcategory',
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

function policyVersion(value) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('REQUEST_INVALID')
    value = String(value)
  }
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,18})$/.test(value)
      || BigInt(value) > 9223372036854775807n) throw new Error('REQUEST_INVALID')
  return value
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
    else if (key === 'brand_id' || key === 'category_id') {
      if (typeof value !== 'string' || !UUID.test(value)) throw new Error('REQUEST_INVALID')
      patch[key] = value.toLowerCase()
    }
    else if (['cost_price', 'srp', 'wholesale_price', 'dealer_price'].includes(key)) patch[key] = boundedNumber(value, 1_000_000)
    else if (key === 'net_weight' || key === 'reorder_level') patch[key] = boundedNumber(value, key === 'net_weight' ? 100_000 : 1_000_000)
    else if (key === 'pairings') patch[key] = boundedStrings(value, 20, 240)
    else if (key === 'seo_keywords') patch[key] = boundedStrings(value, 30, 120)
    else if (key === 'is_featured' || key === 'is_human_reviewed') {
      if (typeof value !== 'boolean') throw new Error('REQUEST_INVALID')
      patch[key] = value
    }
  }
  const includesBrand = Object.hasOwn(patch, 'brand_id')
  const includesCategory = Object.hasOwn(patch, 'category_id')
  if (includesBrand !== includesCategory) throw new Error('REQUEST_INVALID')
  return patch
}

function stockQuantity(result) {
  if (result.error) return null
  if (!result.data) return 0
  try {
    return strictInteger(result.data.stock_from_batches, 'STOCK_UNAVAILABLE', { max: Number.MAX_SAFE_INTEGER })
  } catch {
    return null
  }
}

function zeroQuantity(value) {
  try {
    return strictInteger(value, 'STOCK_UNAVAILABLE', { max: Number.MAX_SAFE_INTEGER }) === 0
  } catch {
    return false
  }
}

function isCompleteTaxonomyOptions(result) {
  return !result.error && Array.isArray(result.data) && Number.isInteger(result.count)
    && result.count >= 1 && result.count <= 500 && result.data.length === result.count
    && result.data.every(option => option && UUID.test(String(option.id || ''))
      && typeof option.name === 'string' && option.name.trim().length > 0)
}

export function validateProductMasterCommand(body) {
  exactObject(body, ['action', 'payload'])
  if (body.action === 'category_policy_set' || body.action === 'category_policy_clear') {
    const setting = body.action === 'category_policy_set'
    exactObject(body.payload, setting
      ? ['categoryId', 'minimumDays', 'expectedVersion', 'reason']
      : ['categoryId', 'expectedVersion', 'reason'])
    const raw = body.payload
    if (typeof raw.categoryId !== 'string' || !UUID.test(raw.categoryId)
        || typeof raw.reason !== 'string') throw new Error('REQUEST_INVALID')
    if (setting && (typeof raw.minimumDays !== 'number' || !Number.isInteger(raw.minimumDays)
        || raw.minimumDays < 90 || raw.minimumDays > 2147483647)) throw new Error('REQUEST_INVALID')
    const payload = { categoryId: raw.categoryId.toLowerCase() }
    if (setting) payload.minimumDays = raw.minimumDays
    payload.expectedVersion = policyVersion(raw.expectedVersion)
    payload.reason = reason(raw.reason)
    return { action: body.action, payload }
  }
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

function commandError(res, error, action) {
  const raw = String(error?.message || '')
  if (action === 'category_policy_set' || action === 'category_policy_clear') {
    if (error?.code === '55P03' || error?.code === '57014') return safeJson(res, 503, { error: { code: 'CATEGORY_POLICY_BUSY' } }, { 'Retry-After': '1' })
    for (const [message, status, code] of [
      ['K2_CATEGORY_POLICY_VERSION_CONFLICT', 409, 'CATEGORY_POLICY_VERSION_CONFLICT'],
      ['K2_CATEGORY_POLICY_TAXONOMY_INVALID', 409, 'CATEGORY_POLICY_TAXONOMY_INVALID'],
      ['K2_CATEGORY_POLICY_INPUT_INVALID', 400, 'CATEGORY_POLICY_INVALID'],
      ['K2_CATEGORY_POLICY_VERSION_EXHAUSTED', 409, 'CATEGORY_POLICY_VERSION_EXHAUSTED'],
      ['K2_CATEGORY_POLICY_NOT_CONFIGURED', 503, 'CATEGORY_POLICY_UNAVAILABLE'],
    ]) {
      if (raw.includes(message)) return safeJson(res, status, { error: { code } })
    }
  }
  if (raw.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
  if (raw.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
  if (raw.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
  if (raw.includes('K2_ADMIN_PRODUCT_VERSION_CONFLICT')) return safeJson(res, 409, { error: { code: 'PRODUCT_VERSION_CONFLICT' } })
  if (raw.includes('K2_PRODUCT_TAXONOMY_INITIAL_ONLY')) return safeJson(res, 409, { error: { code: 'PRODUCT_TAXONOMY_INITIAL_ONLY' } })
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
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'PRODUCT_ADMIN_REQUIRED' } })
  if (req.method === 'GET') {
    const sku = String(req.query?.sku || '').trim()
    if (!SKU.test(sku)) return safeJson(res, 400, { error: { code: 'PRODUCT_COMMAND_INVALID' } })
    const { data, error } = await authorized.client.from('products').select(MASTER_FIELDS).eq('sku', sku).maybeSingle()
    if (error) return safeJson(res, 503, { error: { code: 'PRODUCTS_UNAVAILABLE' } })
    if (!data) return safeJson(res, 404, { error: { code: 'PRODUCT_NOT_FOUND' } })
    const stockResult = await authorized.client.from('v_product_stock_from_batches')
      .select('sku,stock_from_batches').eq('sku', sku).maybeSingle()
    const stockAvailable = stockQuantity(stockResult)
    const product = { ...data, stock_available: stockAvailable }
    let taxonomyReview = null
    if (data.status === 'Draft' && data.published === false && (!data.brand_id || !data.category_id)) {
      const [batchResult, balanceResult, eventResult] = await Promise.all([
        authorized.client.from('product_batches').select('id').eq('sku', sku).limit(1),
        authorized.client.from('inventory_balances')
          .select('on_hand,reserved,in_transit,damaged,expired,unaccounted', { count: 'exact' })
          .eq('sku', sku).limit(501),
        authorized.client.from('inventory_events').select('id').eq('sku', sku).limit(1),
      ])
      const balancesReadable = !balanceResult.error && Array.isArray(balanceResult.data)
        && Number.isInteger(balanceResult.count) && balanceResult.count === balanceResult.data.length
        && balanceResult.count <= 500
      const balancesZero = balancesReadable && balanceResult.data.every(balance =>
        ['on_hand', 'reserved', 'in_transit', 'damaged', 'expired', 'unaccounted']
          .every(field => zeroQuantity(balance[field])))
      const productStocksZero = zeroQuantity(data.stock_available) && zeroQuantity(data.total_stock)
      const evidenceReadable = !stockResult.error && !batchResult.error && !eventResult.error && balancesReadable
      if (!evidenceReadable) {
        taxonomyReview = { status: 'unavailable' }
      } else if (!productStocksZero || stockAvailable !== 0 || (batchResult.data || []).length > 0
          || !balancesZero || (eventResult.data || []).length > 0) {
        taxonomyReview = { status: 'blocked' }
      } else {
        const [brands, categories] = await Promise.all([
          authorized.client.from('brands').select('id,name', { count: 'exact' }).order('name', { ascending: true }).limit(501),
          authorized.client.from('categories').select('id,name', { count: 'exact' }).order('name', { ascending: true }).limit(501),
        ])
        const optionsAvailable = isCompleteTaxonomyOptions(brands) && isCompleteTaxonomyOptions(categories)
        taxonomyReview = {
          status: optionsAvailable ? 'eligible' : 'unavailable',
          brandOptions: optionsAvailable ? brands.data : [],
          categoryOptions: optionsAvailable ? categories.data : [],
          originalBrandId: data.brand_id || null,
          originalCategoryId: data.category_id || null,
        }
      }
    }
    return safeJson(res, 200, { ok: true, product, taxonomyReview })
  }
  try {
    const command = validateProductMasterCommand(await readJson(req))
    const signed = signedAdminCommandArguments(command.action, authorized.identity.userId, idempotencyKey, command.payload)
    const { data, error } = await authorized.client.rpc('execute_admin_product_master_command_v1', signed)
    if (error) return commandError(res, error, command.action)
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) return safeJson(res, 400, { error: { code: 'PRODUCT_COMMAND_INVALID' } })
    return safeJson(res, 503, { error: { code: 'PRODUCT_COMMAND_UNAVAILABLE' } })
  }
}
