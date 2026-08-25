import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PRODUCT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const SOURCE_KINDS = new Set(['verified_marketplace', 'website_customer', 'wholesale_customer', 'pasabuy_customer', 'owner_record'])
const RIGHTS_BASES = new Set(['customer_consent', 'marketplace_publication', 'contractual_permission', 'owner_record'])
const ACTIONS = new Set(['globe_config_update', 'review_create', 'review_update', 'review_publish', 'review_withdraw'])

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

function boundedText(value, minimum, maximum) {
  const normalized = String(value || '').trim()
  if (normalized.length < minimum || normalized.length > maximum) throw new Error('REQUEST_INVALID')
  return normalized
}

function validateHero(value) {
  if (value === null) return null
  if (!exactKeys(value, ['url', 'objectPath'])) throw new Error('REQUEST_INVALID')
  const url = String(value.url || '')
  const objectPath = value.objectPath === null ? null : String(value.objectPath || '')
  if (!/^https:\/\/[^\s\u0000-\u001f\u007f]+$/.test(url) || url.length > 2048
      || (objectPath !== null && (objectPath.length > 256 || !/^[0-9a-f-]{36}\/product-media\/[0-9a-f-]{36}-[0-9a-f]{16}\.(jpg|png|webp)$/i.test(objectPath)))) {
    throw new Error('REQUEST_INVALID')
  }
  return { url, objectPath }
}

function validateReviewFields(body) {
  const stars = Number(body.stars)
  const reviewDate = String(body.reviewDate || '')
  const parsedReviewDate = new Date(`${reviewDate}T00:00:00Z`)
  const productId = body.productId === null ? null : String(body.productId || '')
  if (!Number.isInteger(stars) || stars < 1 || stars > 5 || !DATE.test(reviewDate)
      || Number.isNaN(parsedReviewDate.getTime())
      || parsedReviewDate.toISOString().slice(0, 10) !== reviewDate
      || parsedReviewDate.getTime() > Date.now()
      || (productId !== null && !PRODUCT_ID.test(productId))
      || !SOURCE_KINDS.has(body.sourceKind) || !RIGHTS_BASES.has(body.rightsBasis)) {
    throw new Error('REQUEST_INVALID')
  }
  return {
    name: boundedText(body.name, 2, 80),
    channel: boundedText(body.channel, 2, 80),
    stars,
    text: boundedText(body.text, 10, 1200),
    item: boundedText(body.item, 2, 120),
    productId,
    reviewDate,
    sourceKind: body.sourceKind,
    sourceReference: boundedText(body.sourceReference, 3, 120),
    rightsBasis: body.rightsBasis,
  }
}

export function validateGlobeReviewCommand(body) {
  if (!exactKeys(body, ['action', 'payload']) || !ACTIONS.has(body.action)) throw new Error('REQUEST_INVALID')
  const reason = boundedText(body.payload?.reason, 3, 500)
  if (body.action === 'globe_config_update') {
    if (!exactKeys(body.payload, ['productId', 'enabled', 'hero', 'displayOrder', 'version', 'reason'])) throw new Error('REQUEST_INVALID')
    const displayOrder = Number(body.payload.displayOrder)
    const version = Number(body.payload.version)
    if (!PRODUCT_ID.test(String(body.payload.productId || '')) || typeof body.payload.enabled !== 'boolean'
        || !Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 99
        || !Number.isInteger(version) || version < 1) throw new Error('REQUEST_INVALID')
    return { action: body.action, payload: {
      productId: body.payload.productId, enabled: body.payload.enabled,
      hero: validateHero(body.payload.hero), displayOrder, version, reason,
    } }
  }
  if (['review_publish', 'review_withdraw'].includes(body.action)) {
    if (!exactKeys(body.payload, ['id', 'version', 'reason'])) throw new Error('REQUEST_INVALID')
    const version = Number(body.payload.version)
    if (!UUID.test(String(body.payload.id || '')) || !Number.isInteger(version) || version < 1) throw new Error('REQUEST_INVALID')
    return { action: body.action, payload: { id: body.payload.id, version, reason } }
  }
  const keys = ['name', 'channel', 'stars', 'text', 'item', 'productId', 'reviewDate', 'sourceKind', 'sourceReference', 'rightsBasis', 'reason']
  if (body.action === 'review_update') keys.push('id', 'version')
  if (!exactKeys(body.payload, keys)) throw new Error('REQUEST_INVALID')
  const payload = { ...validateReviewFields(body.payload), reason }
  if (body.action === 'review_update') {
    const version = Number(body.payload.version)
    if (!UUID.test(String(body.payload.id || '')) || !Number.isInteger(version) || version < 1) throw new Error('REQUEST_INVALID')
    payload.id = body.payload.id
    payload.version = version
  }
  return { action: body.action, payload }
}

function errorResponse(res, error) {
  const raw = String(error?.message || '')
  if (raw.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
  if (raw.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
  if (raw.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
  if (raw.includes('K2_ADMIN_GLOBE_STALE') || raw.includes('K2_ADMIN_REVIEW_STALE')) return safeJson(res, 409, { error: { code: 'GLOBE_REVIEW_STALE' } })
  if (raw.includes('K2_ADMIN_REVIEW_EVIDENCE_REQUIRED')) return safeJson(res, 409, { error: { code: 'REVIEW_EVIDENCE_REQUIRED' } })
  if (raw.includes('K2_ADMIN_GLOBE_NOT_FOUND') || raw.includes('K2_ADMIN_REVIEW_NOT_FOUND')) return safeJson(res, 404, { error: { code: 'GLOBE_REVIEW_NOT_FOUND' } })
  if (raw.includes('K2_ADMIN_MEDIA_UNREGISTERED') || raw.includes('K2_ADMIN_GLOBE_REVIEW_INVALID')) return safeJson(res, 400, { error: { code: 'GLOBE_REVIEW_INVALID' } })
  return safeJson(res, 503, { error: { code: 'GLOBE_REVIEW_COMMAND_UNAVAILABLE' } })
}

export default async function handleGlobeCms(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (req.method === 'POST' && !UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (authorized.identity.role !== 'Admin') return safeJson(res, 403, { error: { code: 'GLOBE_REVIEW_ADMIN_REQUIRED' } })
  if (req.method === 'GET') {
    const result = await authorized.client.rpc('read_admin_globe_cms_v1')
    if (result.error || !result.data) return safeJson(res, 503, { error: { code: 'GLOBE_REVIEW_UNAVAILABLE' } })
    return safeJson(res, 200, { ok: true, cms: result.data })
  }
  try {
    const command = validateGlobeReviewCommand(await readJson(req))
    if (command.action === 'globe_config_update' && command.payload.hero?.objectPath) {
      const expectedPrefix = `${authorized.identity.userId}/product-media/`
      if (!command.payload.hero.objectPath.startsWith(expectedPrefix)) throw new Error('REQUEST_INVALID')
      const { data } = authorized.client.storage.from('product-images').getPublicUrl(command.payload.hero.objectPath)
      if (!data?.publicUrl || data.publicUrl !== command.payload.hero.url) throw new Error('REQUEST_INVALID')
    }
    const signed = signedAdminCommandArguments(command.action, authorized.identity.userId, idempotencyKey, command.payload)
    const result = await authorized.client.rpc('execute_admin_globe_review_command_v1', signed)
    if (result.error) return errorResponse(res, result.error)
    return safeJson(res, 200, { ok: true, result: result.data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'GLOBE_REVIEW_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'GLOBE_REVIEW_COMMAND_UNAVAILABLE' } })
  }
}
