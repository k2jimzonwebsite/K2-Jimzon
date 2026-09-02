import { createHash, randomUUID } from 'node:crypto'
import Papa from 'papaparse'
import { authorizeAdminRequest } from './authorize.js'
import { safeJson, signedAdminCommandArguments } from './security.js'
import { isAdminRole } from './supabase.js'
import { buildMarketplaceCoverageProposal, summarizeMarketplaceCoverageAlerts } from '../../src/lib/marketplaceCoverage.js'

export const MARKETPLACE_SNAPSHOT_VERSION = 'k2.marketplace-snapshot.v1'
export const MARKETPLACE_ORDER_VERSION = 'k2.marketplace-orders.v1'
export const MAX_MARKETPLACE_SNAPSHOT_BYTES = 512 * 1024
export const MAX_MARKETPLACE_SNAPSHOT_ROWS = 1000
export const MAX_MARKETPLACE_SNAPSHOT_CELL_LENGTH = 4000
const MAX_MARKETPLACE_REQUEST_BYTES = 600 * 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256 = /^[0-9a-f]{64}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const PROVIDERS = new Set(['shopee', 'lazada', 'tiktok'])
const LISTING_STATUSES = new Set(['active', 'inactive', 'draft', 'deleted', 'out_of_stock', 'unknown'])
const CLOSE_STEPS = new Set([
  'source_selection', 'source_import', 'product_matching', 'sales_reconciliation',
  'fee_estimates', 'stock_count', 'coverage_review', 'pasabuy_boxing', 'bookkeeping_handoff',
])

export const MARKETPLACE_SNAPSHOT_COLUMNS = Object.freeze([
  'schema_version', 'source_row_id', 'external_item_id', 'external_variant_id',
  'marketplace_sku', 'barcode', 'title', 'size', 'concentration', 'flavor',
  'shade', 'formulation', 'pack_count', 'unit_price', 'currency',
  'listing_status', 'reported_quantity', 'observed_at',
])

export const MARKETPLACE_ORDER_COLUMNS = Object.freeze([
  'schema_version', 'external_order_id', 'external_line_id', 'marketplace_sku',
  'quantity', 'gross_amount', 'currency', 'ordered_at', 'order_status', 'payment_status',
])

const VARIANT_FIELDS = Object.freeze([
  'size', 'concentration', 'flavor', 'shade', 'formulation', 'pack_count',
])

function exactObject(value, keys, code = 'REQUEST_INVALID') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code)
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error(code)
  return value
}

function boundedText(value, { required = false, min = 0, max = 500, code = 'REQUEST_INVALID' } = {}) {
  const result = String(value ?? '').trim()
  if ((required && result.length < Math.max(1, min)) || result.length > max || (result && result.length < min)) {
    throw new Error(code)
  }
  return result
}

function uuid(value, code = 'REQUEST_INVALID') {
  const result = boundedText(value, { required: true, max: 36, code })
  if (!UUID.test(result)) throw new Error(code)
  return result
}

function validDate(value) {
  if (!DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function normalizeComparable(value) {
  return String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

function formulaLike(value) {
  return /^[=+\-@\t\r]/.test(String(value ?? ''))
}

function parseMoney(value) {
  const text = String(value ?? '').trim()
  if (/^[=+@\t\r]/.test(text) || (/^-/.test(text) && !/^-\d/.test(text))) {
    throw new Error('MARKETPLACE_SNAPSHOT_FORMULA_BLOCKED')
  }
  if (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(text)) {
    throw new Error('MARKETPLACE_SNAPSHOT_ROW_INVALID')
  }
  const amount = Number(text)
  if (!Number.isFinite(amount) || amount < 0 || amount > 100_000_000) {
    throw new Error('MARKETPLACE_SNAPSHOT_ROW_INVALID')
  }
  return amount.toFixed(2)
}

function parseInteger(value, { min, max, optional = false } = {}) {
  const text = String(value ?? '').trim()
  if (optional && !text) return null
  if (!/^-?\d+$/.test(text)) throw new Error('MARKETPLACE_SNAPSHOT_ROW_INVALID')
  const result = Number(text)
  if (!Number.isSafeInteger(result) || result < min || result > max) {
    throw new Error('MARKETPLACE_SNAPSHOT_ROW_INVALID')
  }
  return result
}

function validateHeader(csvText) {
  const preview = Papa.parse(csvText, { preview: 1, skipEmptyLines: false })
  if (preview.errors.length || !Array.isArray(preview.data?.[0])) {
    throw new Error('MARKETPLACE_SNAPSHOT_CSV_INVALID')
  }
  const headers = preview.data[0].map((value, index) => (
    index === 0 ? String(value).replace(/^\uFEFF/, '').trim() : String(value).trim()
  ))
  if (headers.length !== MARKETPLACE_SNAPSHOT_COLUMNS.length
      || headers.some((header, index) => header !== MARKETPLACE_SNAPSHOT_COLUMNS[index])) {
    throw new Error('MARKETPLACE_SNAPSHOT_HEADERS_INVALID')
  }
}

function normalizeSnapshotSource(raw) {
  const source = Object.fromEntries(MARKETPLACE_SNAPSHOT_COLUMNS.map((column) => {
    const value = String(raw[column] ?? '').trim()
    if (value.length > MAX_MARKETPLACE_SNAPSHOT_CELL_LENGTH) {
      throw new Error('MARKETPLACE_SNAPSHOT_CELL_TOO_LARGE')
    }
    return [column, value]
  }))
  source.schema_version = source.schema_version.replace(/^\uFEFF/, '')
  if (source.schema_version !== MARKETPLACE_SNAPSHOT_VERSION
      || !source.source_row_id || source.source_row_id.length > 200
      || !source.external_item_id || source.external_item_id.length > 200
      || (!source.external_variant_id && !source.marketplace_sku)
      || source.external_variant_id.length > 200 || source.marketplace_sku.length > 200
      || source.barcode.length > 64 || !source.title || source.title.length > 240
      || !/^[A-Z]{3}$/.test(source.currency)
      || !LISTING_STATUSES.has(source.listing_status)) {
    throw new Error('MARKETPLACE_SNAPSHOT_ROW_INVALID')
  }
  for (const column of [
    'source_row_id', 'external_item_id', 'external_variant_id', 'marketplace_sku',
    'barcode', 'title', ...VARIANT_FIELDS, 'currency', 'listing_status', 'observed_at',
  ]) {
    if (source[column] && formulaLike(source[column])) {
      throw new Error('MARKETPLACE_SNAPSHOT_FORMULA_BLOCKED')
    }
  }
  const observedAt = new Date(source.observed_at)
  if (Number.isNaN(observedAt.getTime())
      || observedAt.getUTCFullYear() < 2000
      || observedAt.getTime() > Date.now() + 366 * 86_400_000) {
    throw new Error('MARKETPLACE_SNAPSHOT_ROW_INVALID')
  }
  const normalized = {
    sourceRowId: source.source_row_id,
    externalItemId: source.external_item_id,
    externalVariantId: source.external_variant_id || null,
    marketplaceSku: source.marketplace_sku || null,
    barcode: source.barcode || null,
    title: source.title,
    normalizedTitle: normalizeComparable(source.title),
    size: source.size || null,
    concentration: source.concentration || null,
    flavor: source.flavor || null,
    shade: source.shade || null,
    formulation: source.formulation || null,
    packCount: parseInteger(source.pack_count, { min: 1, max: 10_000, optional: true }),
    unitPrice: parseMoney(source.unit_price),
    currency: source.currency,
    listingStatus: source.listing_status,
    reportedQuantity: parseInteger(source.reported_quantity, { min: 0, max: 1_000_000 }),
    observedAt: observedAt.toISOString(),
  }
  return { source, normalized }
}

export function parseMarketplaceSnapshotCsv(csvText) {
  if (typeof csvText !== 'string' || !csvText.trim()
      || Buffer.byteLength(csvText, 'utf8') > MAX_MARKETPLACE_SNAPSHOT_BYTES) {
    throw new Error('MARKETPLACE_SNAPSHOT_FILE_INVALID')
  }
  validateHeader(csvText)
  const parsed = Papa.parse(csvText.replace(/^\uFEFF/, ''), {
    header: true, skipEmptyLines: 'greedy', transformHeader: (header) => header.trim(),
  })
  if (parsed.errors.length) throw new Error('MARKETPLACE_SNAPSHOT_CSV_INVALID')
  if (parsed.data.length < 1 || parsed.data.length > MAX_MARKETPLACE_SNAPSHOT_ROWS) {
    throw new Error('MARKETPLACE_SNAPSHOT_ROW_LIMIT')
  }

  const firstByIdentity = new Map()
  const rows = parsed.data.map((raw, index) => {
    const rowNumber = index + 2
    const { source, normalized } = normalizeSnapshotSource(raw)
    const payloadSha256 = createHash('sha256').update(JSON.stringify(source), 'utf8').digest('hex')
    const identities = [
      `source:${normalizeComparable(source.source_row_id)}`,
      `external:${normalizeComparable(source.external_item_id)}:${normalizeComparable(source.external_variant_id || source.marketplace_sku)}`,
    ]
    const prior = identities.map((identity) => firstByIdentity.get(identity)).find(Boolean)
    let outcome = 'accepted'
    let duplicateOfRowNumber = null
    let errors = []
    if (prior) {
      duplicateOfRowNumber = prior.rowNumber
      if (prior.payloadSha256 === payloadSha256) outcome = 'duplicate'
      else {
        outcome = 'conflict'
        errors = ['DUPLICATE_IDENTITY_CHANGED_PAYLOAD']
      }
    } else {
      for (const identity of identities) firstByIdentity.set(identity, { rowNumber, payloadSha256 })
    }
    return { rowNumber, source, normalized, payloadSha256, outcome, duplicateOfRowNumber, errors }
  })
  return {
    schemaVersion: MARKETPLACE_SNAPSHOT_VERSION,
    fileSha256: createHash('sha256').update(csvText, 'utf8').digest('hex'),
    rows,
    counts: Object.fromEntries(['accepted', 'duplicate', 'conflict']
      .map((outcome) => [outcome, rows.filter((row) => row.outcome === outcome).length])),
  }
}

function candidateValue(candidate, field) {
  if (field === 'size') return candidate.size ?? candidate.net_weight
  if (field === 'formulation') return candidate.formulation ?? candidate.package_type
  if (field === 'pack_count') return candidate.pack_count
  return candidate[field]
}

function variantComparison(row, candidate) {
  const source = row.source || row
  const conflicts = VARIANT_FIELDS.flatMap((field) => {
    const imported = normalizeComparable(source[field])
    const canonical = normalizeComparable(candidateValue(candidate, field))
    return imported && canonical && imported !== canonical
      ? [{ field, imported: source[field], canonical: String(candidateValue(candidate, field)) }]
      : []
  })
  return { variantConflict: conflicts.length > 0, variantConflicts: conflicts }
}

export function buildMarketplaceProductSuggestions(row, products) {
  const source = row.source || row
  return (Array.isArray(products) ? products : []).flatMap((product) => {
    const reasons = []
    if (source.marketplace_sku && normalizeComparable(source.marketplace_sku) === normalizeComparable(product.sku)) reasons.push('sku')
    if (source.barcode && normalizeComparable(source.barcode) === normalizeComparable(product.barcode)) reasons.push('barcode')
    if (normalizeComparable(source.title) && normalizeComparable(source.title) === normalizeComparable(product.name)) reasons.push('normalized_name')
    if (!reasons.length) return []
    const { variantConflict, variantConflicts } = variantComparison(row, product)
    const score = (reasons.includes('sku') ? 100 : 0) + (reasons.includes('barcode') ? 80 : 0)
      + (reasons.includes('normalized_name') ? 60 : 0)
    return [{
      productId: String(product.id), sku: String(product.sku), name: String(product.name || product.sku),
      reasons, score, eligible: !variantConflict, variantConflict, variantConflicts,
    }]
  }).sort((left, right) => right.score - left.score || left.sku.localeCompare(right.sku)).slice(0, 5)
}

function decisionReason(value) {
  return boundedText(value, { required: true, min: 10, max: 500, code: 'MARKETPLACE_MATCH_DECISION_INVALID' })
}

export function validateMarketplaceMatchDecision(value, stagedRow) {
  if (!stagedRow || stagedRow.outcome !== 'accepted') throw new Error('MARKETPLACE_MATCH_DECISION_INVALID')
  exactObject(value, ['decision', 'productId', 'reviewedProduct', 'reason'], 'MARKETPLACE_MATCH_DECISION_INVALID')
  const decision = String(value.decision || '')
  const reason = decisionReason(value.reason)
  if (decision === 'link_existing') {
    if (!value.productId || value.reviewedProduct !== undefined) throw new Error('MARKETPLACE_MATCH_DECISION_INVALID')
    const suggestion = (stagedRow.suggestions || []).find((item) => String(item.productId) === String(value.productId))
    if (!suggestion) throw new Error('MARKETPLACE_MATCH_DECISION_INVALID')
    if (!suggestion.eligible || suggestion.variantConflict) throw new Error('MARKETPLACE_VARIANT_CONFLICT')
    return { decision, productId: String(value.productId), reviewedProduct: null, reason }
  }
  if (decision === 'create_new_draft') {
    if (value.productId !== undefined) throw new Error('MARKETPLACE_MATCH_DECISION_INVALID')
    exactObject(value.reviewedProduct, ['name', 'barcode', 'description', 'size', 'packageType', 'subcategory'], 'MARKETPLACE_MATCH_DECISION_INVALID')
    const reviewedProduct = {
      name: boundedText(value.reviewedProduct.name, { required: true, max: 140, code: 'MARKETPLACE_MATCH_DECISION_INVALID' }),
      barcode: boundedText(value.reviewedProduct.barcode, { max: 64, code: 'MARKETPLACE_MATCH_DECISION_INVALID' }) || null,
      description: boundedText(value.reviewedProduct.description, { max: 4000, code: 'MARKETPLACE_MATCH_DECISION_INVALID' }) || null,
      size: boundedText(value.reviewedProduct.size, { max: 120, code: 'MARKETPLACE_MATCH_DECISION_INVALID' }) || null,
      packageType: boundedText(value.reviewedProduct.packageType, { max: 120, code: 'MARKETPLACE_MATCH_DECISION_INVALID' }) || null,
      subcategory: boundedText(value.reviewedProduct.subcategory, { max: 120, code: 'MARKETPLACE_MATCH_DECISION_INVALID' }) || null,
    }
    return { decision, productId: null, reviewedProduct, reason }
  }
  if (decision === 'leave_unresolved') {
    if (value.productId !== undefined || value.reviewedProduct !== undefined) throw new Error('MARKETPLACE_MATCH_DECISION_INVALID')
    return { decision, productId: null, reviewedProduct: null, reason }
  }
  throw new Error('MARKETPLACE_MATCH_DECISION_INVALID')
}

function normalizeOrderFact(value) {
  exactObject(value, [
    'shopId', 'externalOrderId', 'externalLineId', 'marketplaceSku', 'quantity',
    'grossAmount', 'currency', 'orderedAt', 'orderStatus', 'paymentStatus',
  ], 'MARKETPLACE_ORDER_FACT_INVALID')
  const orderedAt = new Date(value.orderedAt)
  const quantity = Number(value.quantity)
  const amount = String(value.grossAmount ?? '').trim()
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000
      || !/^(?:0|[1-9]\d{0,10})(?:\.\d{1,2})?$/.test(amount)
      || !/^[A-Z]{3}$/.test(String(value.currency || ''))
      || Number.isNaN(orderedAt.getTime()) || orderedAt.getUTCFullYear() < 2000
      || orderedAt.getTime() > Date.now() + 366 * 86_400_000) throw new Error('MARKETPLACE_ORDER_FACT_INVALID')
  return {
    shopId: uuid(value.shopId, 'MARKETPLACE_ORDER_FACT_INVALID'),
    externalOrderId: boundedText(value.externalOrderId, { required: true, max: 200, code: 'MARKETPLACE_ORDER_FACT_INVALID' }),
    externalLineId: boundedText(value.externalLineId, { required: true, max: 200, code: 'MARKETPLACE_ORDER_FACT_INVALID' }),
    marketplaceSku: boundedText(value.marketplaceSku, { required: true, max: 200, code: 'MARKETPLACE_ORDER_FACT_INVALID' }),
    quantity, grossAmount: Number(amount).toFixed(2), currency: String(value.currency),
    orderedAt: orderedAt.toISOString(),
    orderStatus: boundedText(value.orderStatus, { required: true, max: 80, code: 'MARKETPLACE_ORDER_FACT_INVALID' }),
    paymentStatus: boundedText(value.paymentStatus, { required: true, max: 80, code: 'MARKETPLACE_ORDER_FACT_INVALID' }),
  }
}

export function parseMarketplaceOrderCsv(csvText, shopId) {
  const exactShopId = uuid(shopId, 'MARKETPLACE_ORDER_FACT_INVALID')
  if (typeof csvText !== 'string' || !csvText.trim()
      || Buffer.byteLength(csvText, 'utf8') > MAX_MARKETPLACE_SNAPSHOT_BYTES) {
    throw new Error('MARKETPLACE_ORDER_FILE_INVALID')
  }
  const preview = Papa.parse(csvText, { preview: 1, skipEmptyLines: false })
  if (preview.errors.length || !Array.isArray(preview.data?.[0])) throw new Error('MARKETPLACE_ORDER_CSV_INVALID')
  const headers = preview.data[0].map((value, index) => (
    index === 0 ? String(value).replace(/^\uFEFF/, '').trim() : String(value).trim()
  ))
  if (headers.length !== MARKETPLACE_ORDER_COLUMNS.length
      || headers.some((header, index) => header !== MARKETPLACE_ORDER_COLUMNS[index])) {
    throw new Error('MARKETPLACE_ORDER_HEADERS_INVALID')
  }
  const parsed = Papa.parse(csvText.replace(/^\uFEFF/, ''), {
    header: true, skipEmptyLines: 'greedy', transformHeader: (header) => header.trim(),
  })
  if (parsed.errors.length) throw new Error('MARKETPLACE_ORDER_CSV_INVALID')
  if (parsed.data.length > 5000) throw new Error('MARKETPLACE_ORDER_ROW_LIMIT')
  const facts = parsed.data.map((raw) => {
    const source = Object.fromEntries(MARKETPLACE_ORDER_COLUMNS.map((column) => {
      const value = String(raw[column] ?? '').trim()
      if (value.length > MAX_MARKETPLACE_SNAPSHOT_CELL_LENGTH) throw new Error('MARKETPLACE_ORDER_CELL_TOO_LARGE')
      if (value && formulaLike(value)) throw new Error('MARKETPLACE_ORDER_FORMULA_BLOCKED')
      return [column, value]
    }))
    source.schema_version = source.schema_version.replace(/^\uFEFF/, '')
    if (source.schema_version !== MARKETPLACE_ORDER_VERSION) throw new Error('MARKETPLACE_ORDER_FACT_INVALID')
    return normalizeOrderFact({
      shopId: exactShopId,
      externalOrderId: source.external_order_id,
      externalLineId: source.external_line_id,
      marketplaceSku: source.marketplace_sku,
      quantity: source.quantity,
      grossAmount: source.gross_amount,
      currency: source.currency,
      orderedAt: source.ordered_at,
      orderStatus: source.order_status,
      paymentStatus: source.payment_status,
    })
  })
  return {
    schemaVersion: MARKETPLACE_ORDER_VERSION,
    fileSha256: createHash('sha256').update(csvText, 'utf8').digest('hex'),
    facts,
  }
}

export function deduplicateMarketplaceOrderFacts(facts) {
  if (!Array.isArray(facts) || facts.length > 5000) throw new Error('MARKETPLACE_ORDER_FACT_INVALID')
  const byIdentity = new Map()
  const result = { accepted: [], duplicates: [], conflicts: [] }
  facts.forEach((fact, index) => {
    const normalized = normalizeOrderFact(fact)
    const identity = [normalized.shopId, normalized.externalOrderId, normalized.externalLineId].join('\n')
    const payloadSha256 = createHash('sha256').update(JSON.stringify(normalized), 'utf8').digest('hex')
    const row = { rowNumber: index + 1, ...normalized, payloadSha256 }
    const prior = byIdentity.get(identity)
    if (!prior) {
      byIdentity.set(identity, row)
      result.accepted.push(row)
    } else if (prior.payloadSha256 === payloadSha256) {
      result.duplicates.push({ ...row, duplicateOfRowNumber: prior.rowNumber })
    } else {
      result.conflicts.push({ ...row, conflictWithRowNumber: prior.rowNumber })
    }
  })
  return result
}

export function validateOwnerCloseSession(value) {
  exactObject(value, [
    'sessionId', 'periodStart', 'periodEnd', 'timezone', 'shopIds', 'currentStep', 'expectedVersion',
  ], 'OWNER_CLOSE_SESSION_INVALID')
  const periodStart = String(value.periodStart || '')
  const periodEnd = String(value.periodEnd || '')
  if (!validDate(periodStart) || !validDate(periodEnd) || periodEnd < periodStart
      || (new Date(`${periodEnd}T00:00:00Z`) - new Date(`${periodStart}T00:00:00Z`)) / 86_400_000 > 366
      || value.timezone !== 'Asia/Manila' || !CLOSE_STEPS.has(value.currentStep)
      || !Number.isSafeInteger(value.expectedVersion) || value.expectedVersion < 1
      || !Array.isArray(value.shopIds) || value.shopIds.length < 1 || value.shopIds.length > 50) {
    throw new Error('OWNER_CLOSE_SESSION_INVALID')
  }
  const shopIds = value.shopIds.map((item) => uuid(item, 'OWNER_CLOSE_SESSION_INVALID'))
  if (new Set(shopIds).size !== shopIds.length) throw new Error('OWNER_CLOSE_SESSION_INVALID')
  return {
    sessionId: uuid(value.sessionId, 'OWNER_CLOSE_SESSION_INVALID'), periodStart, periodEnd,
    timezone: 'Asia/Manila', shopIds, currentStep: value.currentStep,
    expectedVersion: value.expectedVersion,
  }
}

async function readMarketplaceJson(req) {
  const declared = Number(req.headers['content-length'] || 0)
  if (declared > MAX_MARKETPLACE_REQUEST_BYTES) throw new Error('BODY_TOO_LARGE')
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new Error('JSON_REQUIRED')
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    if (Buffer.byteLength(JSON.stringify(req.body), 'utf8') > MAX_MARKETPLACE_REQUEST_BYTES) throw new Error('BODY_TOO_LARGE')
    return req.body
  }
  const raw = typeof req.body === 'string' ? req.body : ''
  if (Buffer.byteLength(raw, 'utf8') > MAX_MARKETPLACE_REQUEST_BYTES) throw new Error('BODY_TOO_LARGE')
  try { return JSON.parse(raw) } catch { throw new Error('INVALID_JSON') }
}

function mapCommandError(res, error) {
  const raw = String(error?.message || '')
  if (raw.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
  if (raw.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
  if (raw.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
  if (raw.includes('K2_MARKETPLACE_SNAPSHOT_CONFLICT')) return safeJson(res, 409, { error: { code: 'MARKETPLACE_SNAPSHOT_CONFLICT' } })
  if (raw.includes('K2_MARKETPLACE_ORDER_IMPORT_CONFLICT')) return safeJson(res, 409, { error: { code: 'MARKETPLACE_ORDER_IMPORT_CONFLICT' } })
  if (raw.includes('K2_MARKETPLACE_VARIANT_CONFLICT')) return safeJson(res, 409, { error: { code: 'MARKETPLACE_VARIANT_CONFLICT' } })
  if (raw.includes('K2_MARKETPLACE_DECISION_CONFLICT')) return safeJson(res, 409, { error: { code: 'MARKETPLACE_DECISION_CONFLICT' } })
  if (raw.includes('K2_OWNER_CLOSE_VERSION_CONFLICT')) return safeJson(res, 409, { error: { code: 'OWNER_CLOSE_VERSION_CONFLICT' } })
  if (raw.includes('K2_MARKETPLACE_COVERAGE_OVERRIDE_INVALID')) return safeJson(res, 400, { error: { code: 'MARKETPLACE_COVERAGE_OVERRIDE_INVALID' } })
  if (raw.includes('K2_MARKETPLACE_FEE_POLICY_INVALID')) return safeJson(res, 400, { error: { code: 'MARKETPLACE_FEE_POLICY_INVALID' } })
  if (raw.includes('K2_MARKETPLACE_FEE_FACTS_BLOCKED')) return safeJson(res, 409, { error: { code: 'MARKETPLACE_FEE_FACTS_BLOCKED' } })
  if (raw.includes('K2_MARKETPLACE_FEE_FACTS_INVALID')) return safeJson(res, 409, { error: { code: 'MARKETPLACE_FEE_FACTS_INVALID' } })
  if (raw.includes('K2_OWNER_CLOSE_STOCK_REVIEW_INVALID')) return safeJson(res, 400, { error: { code: 'OWNER_CLOSE_STOCK_REVIEW_INVALID' } })
  if (raw.includes('K2_OWNER_CLOSE_STOCK_NOT_RECONCILED')) return safeJson(res, 409, { error: { code: 'OWNER_CLOSE_STOCK_NOT_RECONCILED' } })
  if (raw.includes('K2_OWNER_CLOSE_PASABUY_REVIEW_INVALID')) return safeJson(res, 400, { error: { code: 'OWNER_CLOSE_PASABUY_REVIEW_INVALID' } })
  if (raw.includes('K2_OWNER_CLOSE_HANDOFF_BLOCKED')) return safeJson(res, 409, { error: { code: 'OWNER_CLOSE_HANDOFF_BLOCKED' } })
  if (raw.includes('K2_OWNER_CLOSE_HANDOFF_INVALID')) return safeJson(res, 409, { error: { code: 'OWNER_CLOSE_HANDOFF_INVALID' } })
  if (raw.includes('K2_MARKETPLACE_ADMIN_REQUIRED')) return safeJson(res, 403, { error: { code: 'ADMIN_REQUIRED' } })
  if (raw.includes('K2_MARKETPLACE_ROW_NOT_FOUND')) return safeJson(res, 404, { error: { code: 'MARKETPLACE_ROW_NOT_FOUND' } })
  return safeJson(res, 503, { error: { code: 'MARKETPLACE_SNAPSHOT_UNAVAILABLE' } })
}

export async function handleMarketplaceOrderStage(req, res) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'ADMIN_REQUIRED' } })
  try {
    const body = exactObject(await readMarketplaceJson(req), [
      'importId', 'sessionId', 'shopId', 'sourceIdentity', 'reason', 'csvText',
    ])
    const importId = uuid(body.importId)
    const sessionId = uuid(body.sessionId)
    const shopId = uuid(body.shopId)
    const sourceIdentity = boundedText(body.sourceIdentity, { required: true, max: 200 })
    const reason = boundedText(body.reason, { required: true, min: 10, max: 500 })
    const parsed = parseMarketplaceOrderCsv(body.csvText, shopId)
    const deduplicated = deduplicateMarketplaceOrderFacts(parsed.facts)
    const facts = [
      ...deduplicated.accepted.map((fact) => ({ ...fact, outcome: 'accepted', duplicateOfRowNumber: null, conflictWithRowNumber: null })),
      ...deduplicated.duplicates.map((fact) => ({ ...fact, outcome: 'duplicate', conflictWithRowNumber: null })),
      ...deduplicated.conflicts.map((fact) => ({ ...fact, outcome: 'conflict', duplicateOfRowNumber: null })),
    ].sort((left, right) => left.rowNumber - right.rowNumber)
    const payload = {
      importId, sessionId, shopId, sourceIdentity, fileSha256: parsed.fileSha256,
      schemaVersion: parsed.schemaVersion, reason, facts,
    }
    const signed = signedAdminCommandArguments('marketplace_order_fact_stage', authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_marketplace_snapshot_v1', signed)
    if (error) return mapCommandError(res, error)
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    const invalid = [
      'REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON',
      'MARKETPLACE_ORDER_FILE_INVALID', 'MARKETPLACE_ORDER_CSV_INVALID',
      'MARKETPLACE_ORDER_HEADERS_INVALID', 'MARKETPLACE_ORDER_ROW_LIMIT',
      'MARKETPLACE_ORDER_CELL_TOO_LARGE', 'MARKETPLACE_ORDER_FORMULA_BLOCKED',
      'MARKETPLACE_ORDER_FACT_INVALID',
    ].includes(error?.message)
    return safeJson(res, invalid ? 400 : 503, { error: { code: invalid ? error.message : 'MARKETPLACE_ORDER_IMPORT_UNAVAILABLE' } })
  }
}

export async function handleMarketplaceOrderStatus(req, res) {
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  let importId
  try { importId = uuid(req.query?.importId) } catch { return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } }) }
  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'ADMIN_REQUIRED' } })
  const { data, error } = await authorized.client.rpc('read_admin_owner_close_order_import_v1', { p_import_id: importId })
  if (error) return mapCommandError(res, error)
  if (!data) return safeJson(res, 404, { error: { code: 'MARKETPLACE_ORDER_IMPORT_NOT_FOUND' } })
  return safeJson(res, 200, { ok: true, status: data })
}

async function readSuggestionProducts(client) {
  const { data, error } = await client.from('products')
    .select('id,sku,barcode,name,size,net_weight,package_type,subcategory,status')
    .order('sku', { ascending: true }).limit(1001)
  if (error || (data || []).length > 1000) throw new Error('MARKETPLACE_SNAPSHOT_UNAVAILABLE')
  return data || []
}

export async function handleMarketplaceSnapshotStage(req, res) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const body = exactObject(await readMarketplaceJson(req), [
      'importId', 'provider', 'shopId', 'sourceIdentity', 'periodStart', 'periodEnd', 'reason', 'csvText',
    ])
    const provider = boundedText(body.provider, { required: true, max: 30 })
    const shopId = uuid(body.shopId)
    const importId = uuid(body.importId)
    const sourceIdentity = boundedText(body.sourceIdentity, { required: true, max: 200 })
    const reason = boundedText(body.reason, { required: true, min: 10, max: 500 })
    if (!PROVIDERS.has(provider) || !validDate(body.periodStart) || !validDate(body.periodEnd) || body.periodEnd < body.periodStart) {
      throw new Error('REQUEST_INVALID')
    }
    const shop = await authorized.client.from('channel_shops')
      .select('id,shop_code,channel_code,status').eq('id', shopId).single()
    if (shop.error || !shop.data || shop.data.channel_code !== provider) throw new Error('MARKETPLACE_SHOP_INVALID')
    const parsed = parseMarketplaceSnapshotCsv(body.csvText)
    const products = await readSuggestionProducts(authorized.client)
    const payload = {
      importId, provider, shopId, sourceIdentity, fileSha256: parsed.fileSha256,
      schemaVersion: parsed.schemaVersion, periodStart: body.periodStart, periodEnd: body.periodEnd,
      reason, rows: parsed.rows.map((row) => ({
        ...row, suggestions: row.outcome === 'accepted' ? buildMarketplaceProductSuggestions(row, products) : [],
      })),
    }
    const signed = signedAdminCommandArguments('marketplace_snapshot_stage', authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_marketplace_snapshot_v1', signed)
    if (error) return mapCommandError(res, error)
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    const invalid = [
      'REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON',
      'MARKETPLACE_SNAPSHOT_FILE_INVALID', 'MARKETPLACE_SNAPSHOT_CSV_INVALID',
      'MARKETPLACE_SNAPSHOT_HEADERS_INVALID', 'MARKETPLACE_SNAPSHOT_ROW_LIMIT',
      'MARKETPLACE_SNAPSHOT_CELL_TOO_LARGE', 'MARKETPLACE_SNAPSHOT_ROW_INVALID',
      'MARKETPLACE_SNAPSHOT_FORMULA_BLOCKED', 'MARKETPLACE_SHOP_INVALID',
    ].includes(error?.message)
    return safeJson(res, invalid ? 400 : 503, { error: { code: invalid ? error.message : 'MARKETPLACE_SNAPSHOT_UNAVAILABLE' } })
  }
}

export async function handleMarketplaceSnapshotDecision(req, res) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'ADMIN_REQUIRED' } })
  try {
    const body = exactObject(await readMarketplaceJson(req), [
      'importId', 'rowId', 'decision', 'productId', 'reviewedProduct', 'reason',
    ])
    const importId = uuid(body.importId)
    const rowId = uuid(body.rowId)
    const staged = await authorized.client.rpc('read_admin_marketplace_snapshot_row_v1', {
      p_import_id: importId, p_row_id: rowId,
    })
    if (staged.error) return mapCommandError(res, staged.error)
    if (!staged.data) return safeJson(res, 404, { error: { code: 'MARKETPLACE_ROW_NOT_FOUND' } })
    const decision = validateMarketplaceMatchDecision({
      decision: body.decision,
      ...(Object.hasOwn(body, 'productId') ? { productId: body.productId } : {}),
      ...(Object.hasOwn(body, 'reviewedProduct') ? { reviewedProduct: body.reviewedProduct } : {}),
      reason: body.reason,
    }, staged.data)
    const payload = { importId, rowId, ...decision }
    const signed = signedAdminCommandArguments('marketplace_match_decision', authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_marketplace_snapshot_v1', signed)
    if (error) return mapCommandError(res, error)
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (error?.message === 'MARKETPLACE_VARIANT_CONFLICT') return safeJson(res, 409, { error: { code: error.message } })
    const invalid = ['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON', 'MARKETPLACE_MATCH_DECISION_INVALID'].includes(error?.message)
    return safeJson(res, invalid ? 400 : 503, { error: { code: invalid ? error.message : 'MARKETPLACE_SNAPSHOT_UNAVAILABLE' } })
  }
}

export async function handleMarketplaceSnapshotStatus(req, res) {
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  let importId
  try { importId = uuid(req.query?.importId) } catch { return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } }) }
  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  const { data, error } = await authorized.client.rpc('read_admin_marketplace_snapshot_status_v1', { p_import_id: importId })
  if (error) return mapCommandError(res, error)
  if (!data) return safeJson(res, 404, { error: { code: 'MARKETPLACE_SNAPSHOT_NOT_FOUND' } })
  return safeJson(res, 200, { ok: true, status: data })
}

export async function handleOwnerCloseSession(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'ADMIN_REQUIRED' } })
  if (req.method === 'GET') {
    const shopOptions = await authorized.client.rpc('read_admin_marketplace_shop_options_v1')
    if (shopOptions.error) return mapCommandError(res, shopOptions.error)
    if (!req.query?.sessionId) {
      return safeJson(res, 200, { ok: true, shops: shopOptions.data || [], session: null })
    }
    let sessionId
    try { sessionId = uuid(req.query.sessionId) } catch { return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } }) }
    const session = await authorized.client.rpc('read_admin_owner_close_session_v1', { p_session_id: sessionId })
    if (session.error) return mapCommandError(res, session.error)
    if (!session.data) return safeJson(res, 404, { error: { code: 'OWNER_CLOSE_SESSION_NOT_FOUND' } })
    return safeJson(res, 200, { ok: true, shops: shopOptions.data || [], session: session.data })
  }
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  try {
    const body = exactObject(await readMarketplaceJson(req), ['session', 'reason'])
    const session = validateOwnerCloseSession(body.session)
    const reason = boundedText(body.reason, { required: true, min: 10, max: 500, code: 'OWNER_CLOSE_SESSION_INVALID' })
    const signed = signedAdminCommandArguments('owner_close_session_save', authorized.identity.userId, idempotencyKey, { ...session, reason })
    const { data, error } = await authorized.client.rpc('execute_admin_marketplace_snapshot_v1', signed)
    if (error) return mapCommandError(res, error)
    return safeJson(res, 200, { ok: true, session: data })
  } catch (error) {
    const invalid = ['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON', 'OWNER_CLOSE_SESSION_INVALID'].includes(error?.message)
    return safeJson(res, invalid ? 400 : 503, { error: { code: invalid ? error.message : 'OWNER_CLOSE_SESSION_UNAVAILABLE' } })
  }
}

export async function handleOwnerCloseCoverage(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'ADMIN_REQUIRED' } })
  if (req.method === 'POST') {
    const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
    if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
    try {
      const body = exactObject(await readMarketplaceJson(req), ['sessionId', 'productId', 'shopId', 'action', 'priority', 'reason'])
      const priority = body.priority === null ? null : Number(body.priority)
      const payload = {
        sessionId: uuid(body.sessionId), productId: uuid(body.productId), shopId: uuid(body.shopId),
        action: boundedText(body.action, { required: true, max: 20 }),
        priority,
        reason: boundedText(body.reason, { required: true, min: 10, max: 500 }),
      }
      if (!['include', 'thin', 'skip'].includes(payload.action)
          || (priority !== null && (!Number.isInteger(priority) || priority < 1 || priority > 50))) throw new Error('REQUEST_INVALID')
      const signed = signedAdminCommandArguments('marketplace_coverage_override', authorized.identity.userId, idempotencyKey, payload)
      const { data, error } = await authorized.client.rpc('execute_admin_marketplace_snapshot_v1', signed)
      if (error) return mapCommandError(res, error)
      return safeJson(res, 200, { ok: true, result: data })
    } catch (error) {
      const invalid = ['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)
      return safeJson(res, invalid ? 400 : 503, { error: { code: invalid ? error.message : 'MARKETPLACE_COVERAGE_UNAVAILABLE' } })
    }
  }
  let sessionId
  try { sessionId = uuid(req.query?.sessionId) } catch { return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } }) }
  const { data, error } = await authorized.client.rpc('read_admin_marketplace_coverage_input_v1', { p_session_id: sessionId })
  if (error) return mapCommandError(res, error)
  if (!data) return safeJson(res, 404, { error: { code: 'OWNER_CLOSE_SESSION_NOT_FOUND' } })
  try {
    const proposal = buildMarketplaceCoverageProposal(data)
    return safeJson(res, 200, {
      ok: true,
      coverage: { ...proposal, alerts: summarizeMarketplaceCoverageAlerts(proposal) },
    })
  } catch {
    return safeJson(res, 503, { error: { code: 'MARKETPLACE_COVERAGE_UNAVAILABLE' } })
  }
}

export async function handleOwnerCloseFees(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'ADMIN_REQUIRED' } })
  if (req.method === 'POST') {
    const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
    if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
    try {
      const body = exactObject(await readMarketplaceJson(req), [
        'sessionId', 'shopId', 'policyVersion', 'currency', 'commissionBasisPoints',
        'paymentBasisPoints', 'withholdingBasisPoints', 'fixedFeeMinorPerOrder', 'reason',
      ])
      const integer = (value, minimum, maximum) => {
        const parsed = Number(value)
        if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error('MARKETPLACE_FEE_POLICY_INVALID')
        return parsed
      }
      const payload = {
        estimateId: randomUUID(), sessionId: uuid(body.sessionId), shopId: uuid(body.shopId),
        policyVersion: boundedText(body.policyVersion, { required: true, min: 3, max: 120, code: 'MARKETPLACE_FEE_POLICY_INVALID' }),
        currency: boundedText(body.currency, { required: true, min: 3, max: 3, code: 'MARKETPLACE_FEE_POLICY_INVALID' }),
        commissionBasisPoints: integer(body.commissionBasisPoints, 0, 9999),
        paymentBasisPoints: integer(body.paymentBasisPoints, 0, 9999),
        withholdingBasisPoints: integer(body.withholdingBasisPoints, 0, 9999),
        fixedFeeMinorPerOrder: integer(body.fixedFeeMinorPerOrder, 0, 10_000_000),
        reason: boundedText(body.reason, { required: true, min: 10, max: 500, code: 'MARKETPLACE_FEE_POLICY_INVALID' }),
      }
      if (!/^[A-Z]{3}$/.test(payload.currency)
          || payload.commissionBasisPoints + payload.paymentBasisPoints + payload.withholdingBasisPoints >= 10_000) {
        throw new Error('MARKETPLACE_FEE_POLICY_INVALID')
      }
      const signed = signedAdminCommandArguments('marketplace_fee_estimate_save', authorized.identity.userId, idempotencyKey, payload)
      const { data, error } = await authorized.client.rpc('execute_admin_marketplace_snapshot_v1', signed)
      if (error) return mapCommandError(res, error)
      return safeJson(res, 200, { ok: true, result: data })
    } catch (error) {
      const invalid = ['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON', 'MARKETPLACE_FEE_POLICY_INVALID'].includes(error?.message)
      return safeJson(res, invalid ? 400 : 503, { error: { code: invalid ? error.message : 'MARKETPLACE_FEE_UNAVAILABLE' } })
    }
  }
  let sessionId
  try { sessionId = uuid(req.query?.sessionId) } catch { return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } }) }
  const { data, error } = await authorized.client.rpc('read_admin_owner_close_fee_input_v1', { p_session_id: sessionId })
  if (error) return mapCommandError(res, error)
  if (!data) return safeJson(res, 404, { error: { code: 'OWNER_CLOSE_SESSION_NOT_FOUND' } })
  return safeJson(res, 200, { ok: true, fees: data })
}

export async function handleOwnerCloseStock(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'ADMIN_REQUIRED' } })
  if (req.method === 'POST') {
    const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
    if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
    try {
      const body = exactObject(await readMarketplaceJson(req), [
        'sessionId', 'productId', 'expectedCanonicalBefore', 'physicalCount', 'reason',
      ])
      const integer = (value) => {
        const parsed = Number(value)
        if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 100_000_000) throw new Error('OWNER_CLOSE_STOCK_REVIEW_INVALID')
        return parsed
      }
      const payload = {
        sessionId: uuid(body.sessionId), productId: uuid(body.productId),
        expectedCanonicalBefore: integer(body.expectedCanonicalBefore),
        physicalCount: integer(body.physicalCount),
        reason: boundedText(body.reason, { required: true, min: 10, max: 500, code: 'OWNER_CLOSE_STOCK_REVIEW_INVALID' }),
      }
      const signed = signedAdminCommandArguments('owner_close_stock_review_save', authorized.identity.userId, idempotencyKey, payload)
      const { data, error } = await authorized.client.rpc('execute_admin_marketplace_snapshot_v1', signed)
      if (error) return mapCommandError(res, error)
      return safeJson(res, 200, { ok: true, result: data })
    } catch (error) {
      const invalid = ['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON', 'OWNER_CLOSE_STOCK_REVIEW_INVALID'].includes(error?.message)
      return safeJson(res, invalid ? 400 : 503, { error: { code: invalid ? error.message : 'OWNER_CLOSE_STOCK_UNAVAILABLE' } })
    }
  }
  let sessionId
  try { sessionId = uuid(req.query?.sessionId) } catch { return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } }) }
  const { data, error } = await authorized.client.rpc('read_admin_owner_close_stock_input_v1', { p_session_id: sessionId })
  if (error) return mapCommandError(res, error)
  if (!data) return safeJson(res, 404, { error: { code: 'OWNER_CLOSE_SESSION_NOT_FOUND' } })
  return safeJson(res, 200, { ok: true, stock: data })
}

export async function handleOwnerClosePasabuy(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'ADMIN_REQUIRED' } })
  if (req.method === 'POST') {
    const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
    if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
    try {
      const body = exactObject(await readMarketplaceJson(req), ['sessionId', 'requestId', 'readiness', 'reason'])
      const payload = {
        sessionId: uuid(body.sessionId),
        requestId: uuid(body.requestId),
        readiness: boundedText(body.readiness, { required: true, max: 20, code: 'OWNER_CLOSE_PASABUY_REVIEW_INVALID' }),
        reason: boundedText(body.reason, { required: true, min: 10, max: 500, code: 'OWNER_CLOSE_PASABUY_REVIEW_INVALID' }),
      }
      if (!['ready', 'not_ready', 'not_applicable'].includes(payload.readiness)) throw new Error('OWNER_CLOSE_PASABUY_REVIEW_INVALID')
      const signed = signedAdminCommandArguments('owner_close_pasabuy_review_save', authorized.identity.userId, idempotencyKey, payload)
      const { data, error } = await authorized.client.rpc('execute_admin_marketplace_snapshot_v1', signed)
      if (error) return mapCommandError(res, error)
      return safeJson(res, 200, { ok: true, result: data })
    } catch (error) {
      const invalid = ['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON', 'OWNER_CLOSE_PASABUY_REVIEW_INVALID'].includes(error?.message)
      return safeJson(res, invalid ? 400 : 503, { error: { code: invalid ? error.message : 'OWNER_CLOSE_PASABUY_UNAVAILABLE' } })
    }
  }
  let sessionId
  try { sessionId = uuid(req.query?.sessionId) } catch { return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } }) }
  const { data, error } = await authorized.client.rpc('read_admin_owner_close_pasabuy_input_v1', { p_session_id: sessionId })
  if (error) return mapCommandError(res, error)
  if (!data) return safeJson(res, 404, { error: { code: 'OWNER_CLOSE_SESSION_NOT_FOUND' } })
  return safeJson(res, 200, { ok: true, pasabuy: data })
}

export async function handleOwnerCloseBookkeeping(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'ADMIN_REQUIRED' } })
  if (req.method === 'POST') {
    const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
    if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
    try {
      const body = exactObject(await readMarketplaceJson(req), ['sessionId', 'expectedSessionVersion', 'reason'])
      const expectedSessionVersion = Number(body.expectedSessionVersion)
      if (!Number.isSafeInteger(expectedSessionVersion) || expectedSessionVersion < 1) throw new Error('OWNER_CLOSE_HANDOFF_INVALID')
      const payload = {
        sessionId: uuid(body.sessionId), expectedSessionVersion,
        reason: boundedText(body.reason, { required: true, min: 10, max: 500, code: 'OWNER_CLOSE_HANDOFF_INVALID' }),
      }
      const signed = signedAdminCommandArguments('owner_close_bookkeeping_handoff_save', authorized.identity.userId, idempotencyKey, payload)
      const { data, error } = await authorized.client.rpc('execute_admin_marketplace_snapshot_v1', signed)
      if (error) return mapCommandError(res, error)
      return safeJson(res, 200, { ok: true, result: data })
    } catch (error) {
      const invalid = ['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON', 'OWNER_CLOSE_HANDOFF_INVALID'].includes(error?.message)
      return safeJson(res, invalid ? 400 : 503, { error: { code: invalid ? error.message : 'OWNER_CLOSE_HANDOFF_UNAVAILABLE' } })
    }
  }
  let sessionId
  try { sessionId = uuid(req.query?.sessionId) } catch { return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } }) }
  const { data, error } = await authorized.client.rpc('read_admin_owner_close_bookkeeping_handoff_v1', { p_session_id: sessionId })
  if (error) return mapCommandError(res, error)
  if (!data) return safeJson(res, 404, { error: { code: 'OWNER_CLOSE_SESSION_NOT_FOUND' } })
  return safeJson(res, 200, { ok: true, handoff: data })
}
