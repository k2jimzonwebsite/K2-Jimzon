import { createHash, randomUUID } from 'node:crypto'
import Papa from 'papaparse'
import { authorizeAdminRequest } from './authorize.js'
import { safeJson, signedAdminCommandArguments } from './security.js'

export const CATALOG_TEMPLATE_VERSION = 'k2-catalog-v1'
export const MAX_CATALOG_CSV_BYTES = 512 * 1024
export const MAX_CATALOG_ROWS = 1000
export const MAX_CATALOG_CELL_LENGTH = 4000
export const MAX_CATALOG_COMMIT_ROWS = 50
const MAX_CATALOG_REQUEST_BYTES = 1100 * 1024

export const CATALOG_PROTECTED_COLUMNS = Object.freeze([
  'template_version', 'export_operation_id', 'exported_at', 'catalog_id',
  'sku', 'record_version', 'updated_at',
])

export const CATALOG_EDITABLE_COLUMNS = Object.freeze([
  'name', 'description', 'usage_instructions', 'storage_instructions',
  'ingredients', 'allergens', 'country_of_origin', 'net_weight',
  'package_type', 'subcategory', 'seo_keywords', 'primary_image_url',
  'product_video_url', 'internal_notes',
])

export const CATALOG_COLUMNS = Object.freeze([
  ...CATALOG_PROTECTED_COLUMNS, ...CATALOG_EDITABLE_COLUMNS,
])

const PRODUCT_PROJECTION = [
  'catalog_id', 'sku', 'catalog_record_version', 'updated_at',
  ...CATALOG_EDITABLE_COLUMNS,
].join(',')
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function cell(value) {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join(' | ')
  return String(value)
}

export function neutralizeSpreadsheetFormula(value) {
  const text = cell(value)
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

function normalizedComparable(value) {
  return cell(value).replace(/\r\n/g, '\n').trim()
}

function validHeaderRow(csvText) {
  const first = Papa.parse(csvText, { preview: 1, skipEmptyLines: false })
  if (first.errors.length || !Array.isArray(first.data?.[0])) throw new Error('CATALOG_CSV_INVALID')
  const headers = first.data[0].map((value, index) => index === 0 ? String(value).replace(/^\uFEFF/, '') : String(value))
  if (headers.length !== CATALOG_COLUMNS.length || new Set(headers).size !== headers.length) {
    throw new Error('CATALOG_HEADERS_INVALID')
  }
  const expected = new Set(CATALOG_COLUMNS)
  if (headers.some((header) => !expected.has(header))) throw new Error('CATALOG_HEADERS_INVALID')
  return headers
}

function textCell(row, column) {
  const value = cell(row[column])
  if (value.length > MAX_CATALOG_CELL_LENGTH) throw new Error('CATALOG_CELL_TOO_LARGE')
  return value
}

function normalizeImportRow(raw) {
  const row = Object.fromEntries(CATALOG_COLUMNS.map((column) => [column, textCell(raw, column)]))
  row.template_version = row.template_version.replace(/^\uFEFF/, '')
  return row
}

function invalidFormulaColumns(row) {
  return CATALOG_EDITABLE_COLUMNS.filter((column) => /^[=+\-@\t\r]/.test(row[column]))
}

function validVersion(value) {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0
}

function normalizeProduct(product) {
  return {
    ...product,
    catalog_id: cell(product.catalog_id),
    sku: cell(product.sku),
    record_version: cell(product.catalog_record_version),
    updated_at: cell(product.updated_at),
  }
}

function rowDiff(row, product) {
  return CATALOG_EDITABLE_COLUMNS.flatMap((column) => {
    const before = normalizedComparable(neutralizeSpreadsheetFormula(product[column]))
    const after = normalizedComparable(row[column])
    return before === after ? [] : [{ field: column, before, after }]
  })
}

export function serializeCatalogCsv(products, {
  operationId = randomUUID(), exportedAt = new Date().toISOString(),
} = {}) {
  const rows = products.map((product) => {
    const normalized = normalizeProduct(product)
    return Object.fromEntries(CATALOG_COLUMNS.map((column) => {
      const value = column === 'template_version' ? CATALOG_TEMPLATE_VERSION
        : column === 'export_operation_id' ? operationId
          : column === 'exported_at' ? exportedAt
            : normalized[column]
      return [column, neutralizeSpreadsheetFormula(value)]
    }))
  })
  return `\uFEFF${Papa.unparse(rows, { columns: CATALOG_COLUMNS, newline: '\r\n' })}`
}

export async function readCatalogExport(client) {
  const { data, error } = await client.from('products').select(PRODUCT_PROJECTION)
    .order('sku', { ascending: true }).limit(MAX_CATALOG_ROWS + 1)
  if (error) throw new Error('CATALOG_EXPORT_UNAVAILABLE')
  if ((data || []).length > MAX_CATALOG_ROWS) throw new Error('CATALOG_EXPORT_ROW_LIMIT')
  return data || []
}

export function parseCatalogCsv(csvText) {
  if (typeof csvText !== 'string' || !csvText.trim()
      || Buffer.byteLength(csvText, 'utf8') > MAX_CATALOG_CSV_BYTES) {
    throw new Error('CATALOG_FILE_INVALID')
  }
  validHeaderRow(csvText)
  const parsed = Papa.parse(csvText.replace(/^\uFEFF/, ''), {
    header: true, skipEmptyLines: 'greedy', transformHeader: (header) => header.trim(),
  })
  if (parsed.errors.length) throw new Error('CATALOG_CSV_INVALID')
  if (parsed.data.length < 1 || parsed.data.length > MAX_CATALOG_ROWS) throw new Error('CATALOG_ROW_LIMIT')
  return parsed.data.map(normalizeImportRow)
}

export function classifyCatalogRows(rows, products) {
  const byId = new Map(products.map(normalizeProduct).filter((row) => row.catalog_id).map((row) => [row.catalog_id, row]))
  const bySku = new Map(products.map(normalizeProduct).map((row) => [row.sku.toLowerCase(), row]))
  const seenIds = new Set()
  const seenSkus = new Set()
  return rows.map((row, index) => {
    const rowNumber = index + 2
    const skuKey = row.sku.toLowerCase()
    const duplicate = (row.catalog_id && seenIds.has(row.catalog_id)) || (skuKey && seenSkus.has(skuKey))
    if (row.catalog_id) seenIds.add(row.catalog_id)
    if (skuKey) seenSkus.add(skuKey)
    if (duplicate) return { rowNumber, sku: row.sku, category: 'Duplicate', errors: ['DUPLICATE_IDENTITY'] }

    const errors = []
    if (row.template_version !== CATALOG_TEMPLATE_VERSION) errors.push('TEMPLATE_VERSION_UNSUPPORTED')
    if (row.sku.length > 120) errors.push('SKU_INVALID')
    if (!row.name.trim()) errors.push('NAME_REQUIRED')
    const formulaColumns = invalidFormulaColumns(row)
    if (formulaColumns.length) errors.push('FORMULA_LIKE_VALUE_BLOCKED')
    if (errors.length) return { rowNumber, sku: row.sku, category: 'Invalid', errors, formulaColumns }

    const idMatch = row.catalog_id ? byId.get(row.catalog_id) : null
    const skuMatch = bySku.get(skuKey)
    if (idMatch && skuMatch && idMatch.sku !== skuMatch.sku) {
      return { rowNumber, sku: row.sku, category: 'Protected/Ignored', errors: ['IDENTITY_MISMATCH'] }
    }
    const product = idMatch || skuMatch
    if (!product) {
      if (row.catalog_id || row.record_version || row.updated_at) {
        return { rowNumber, sku: row.sku, category: 'Protected/Ignored', errors: ['UNKNOWN_PROTECTED_IDENTITY'] }
      }
      return {
        rowNumber, sku: row.sku, category: 'New', changes: CATALOG_EDITABLE_COLUMNS
          .filter((column) => row[column] !== '').map((field) => ({ field, before: '', after: row[field] })),
        consequence: 'Creates an unpublished Draft product; stock remains unchanged.',
      }
    }
    if (row.sku !== product.sku) {
      return { rowNumber, sku: row.sku, category: 'Protected/Ignored', errors: ['SKU_IMMUTABLE'] }
    }
    if (!validVersion(row.record_version) || Number(row.record_version) !== Number(product.record_version)
        || !row.updated_at || row.updated_at !== product.updated_at) {
      return { rowNumber, sku: row.sku, category: 'Stale/Conflict', errors: ['RECORD_CHANGED_SINCE_EXPORT'] }
    }
    const changes = rowDiff(row, product)
    return changes.length
      ? { rowNumber, sku: row.sku, category: 'Changed', changes, consequence: 'Updates approved catalog metadata only.' }
      : { rowNumber, sku: row.sku, category: 'Unchanged', changes: [] }
  })
}

async function readCatalogJson(req) {
  const declared = Number(req.headers['content-length'] || 0)
  if (declared > MAX_CATALOG_REQUEST_BYTES) throw new Error('BODY_TOO_LARGE')
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    throw new Error('JSON_REQUIRED')
  }
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    if (Buffer.byteLength(JSON.stringify(req.body), 'utf8') > MAX_CATALOG_REQUEST_BYTES) throw new Error('BODY_TOO_LARGE')
    return req.body
  }
  const raw = typeof req.body === 'string' ? req.body : ''
  if (Buffer.byteLength(raw, 'utf8') > MAX_CATALOG_REQUEST_BYTES) throw new Error('BODY_TOO_LARGE')
  try { return JSON.parse(raw) } catch { throw new Error('INVALID_JSON') }
}

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REQUEST_INVALID')
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
}

function commitValues(row) {
  return Object.fromEntries(CATALOG_EDITABLE_COLUMNS.map((column) => [
    column, row[column].replace(/^'(?=[=+\-@\t\r])/, ''),
  ]))
}

function validateCommitValues(row) {
  if (!row.name.trim() || row.name.trim().length > 140) throw new Error('REQUEST_INVALID')
  if (row.net_weight.trim() && !/^[0-9]{1,9}(?:\.[0-9]{1,3})?$/.test(row.net_weight.trim())) {
    throw new Error('REQUEST_INVALID')
  }
  for (const column of ['primary_image_url', 'product_video_url']) {
    const value = row[column].trim()
    if (value && (value.length > 2048 || !value.startsWith('https://'))) throw new Error('REQUEST_INVALID')
  }
}

export async function buildCatalogCommitPayload(client, body) {
  exactObject(body, [
    'csvText', 'fileSha256', 'selectedRowNumbers', 'reason',
    'operationId', 'chunkIndex', 'finalChunk',
  ])
  const reason = String(body.reason || '').trim()
  const operationId = String(body.operationId || '').trim()
  const fileSha256 = String(body.fileSha256 || '').toLowerCase()
  if (!UUID.test(operationId) || !/^[0-9a-f]{64}$/.test(fileSha256)
      || createHash('sha256').update(String(body.csvText || ''), 'utf8').digest('hex') !== fileSha256
      || reason.length < 10 || reason.length > 500
      || !Number.isInteger(body.chunkIndex) || body.chunkIndex < 0 || body.chunkIndex > 9999
      || typeof body.finalChunk !== 'boolean'
      || !Array.isArray(body.selectedRowNumbers)
      || body.selectedRowNumbers.length < 1 || body.selectedRowNumbers.length > MAX_CATALOG_COMMIT_ROWS
      || body.selectedRowNumbers.some((value) => !Number.isInteger(value) || value < 2)
      || new Set(body.selectedRowNumbers).size !== body.selectedRowNumbers.length) {
    throw new Error('REQUEST_INVALID')
  }
  const rows = parseCatalogCsv(body.csvText)
  const preview = await previewCatalogImport(client, body.csvText)
  const outcomeByNumber = new Map(preview.outcomes.map((outcome) => [outcome.rowNumber, outcome]))
  const selectedRows = body.selectedRowNumbers.map((rowNumber) => {
    const row = rows[rowNumber - 2]
    const outcome = outcomeByNumber.get(rowNumber)
    if (!row || !outcome || !['New', 'Changed'].includes(outcome.category)) {
      throw new Error('CATALOG_SELECTION_INVALID')
    }
    if (outcome.category === 'New' && row.sku) throw new Error('CATALOG_NEW_SKU_MUST_BE_BLANK')
    validateCommitValues(row)
    return {
      rowNumber,
      kind: outcome.category === 'New' ? 'new' : 'update',
      catalogId: row.catalog_id || null,
      sku: row.sku || null,
      expectedVersion: row.record_version ? Number(row.record_version) : null,
      expectedUpdatedAt: row.updated_at || null,
      values: commitValues(row),
    }
  })
  return {
    operationId, fileSha256, templateVersion: CATALOG_TEMPLATE_VERSION,
    chunkIndex: body.chunkIndex, finalChunk: body.finalChunk, reason,
    rows: selectedRows,
  }
}

export async function previewCatalogImport(client, csvText) {
  const rows = parseCatalogCsv(csvText)
  const { data, error } = await client.from('products').select(PRODUCT_PROJECTION)
    .order('sku', { ascending: true }).limit(MAX_CATALOG_ROWS + 1)
  if (error) throw new Error('CATALOG_PREVIEW_UNAVAILABLE')
  if ((data || []).length > MAX_CATALOG_ROWS) throw new Error('CATALOG_PREVIEW_UNAVAILABLE')
  const outcomes = classifyCatalogRows(rows, data || [])
  const counts = Object.fromEntries(['New', 'Changed', 'Unchanged', 'Invalid', 'Protected/Ignored', 'Duplicate', 'Stale/Conflict']
    .map((category) => [category, outcomes.filter((row) => row.category === category).length]))
  return {
    templateVersion: CATALOG_TEMPLATE_VERSION,
    fileSha256: createHash('sha256').update(csvText, 'utf8').digest('hex'),
    counts, outcomes,
  }
}

export async function handleCatalogExport(req, res) {
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  try {
    const csv = serializeCatalogCsv(await readCatalogExport(authorized.client))
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="k2-catalog-${new Date().toISOString().slice(0, 10)}.csv"`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return res.end(csv)
  } catch {
    return safeJson(res, 503, { error: { code: 'CATALOG_EXPORT_UNAVAILABLE' } })
  }
}

export async function handleCatalogPreview(req, res) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!UUID.test(String(req.headers['x-k2-idempotency-key'] || '').trim())) {
    return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  }
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const body = await readCatalogJson(req)
    if (!body || typeof body !== 'object' || Array.isArray(body)
        || Object.keys(body).some((key) => !['csvText'].includes(key))) throw new Error('REQUEST_INVALID')
    const preview = await previewCatalogImport(authorized.client, body.csvText)
    return safeJson(res, 200, { ok: true, preview })
  } catch (error) {
    const invalidCodes = new Set([
      'REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON',
      'CATALOG_FILE_INVALID', 'CATALOG_CSV_INVALID', 'CATALOG_HEADERS_INVALID',
      'CATALOG_ROW_LIMIT', 'CATALOG_CELL_TOO_LARGE',
    ])
    const invalid = invalidCodes.has(error?.message)
    return safeJson(res, invalid ? 400 : 503, {
      error: { code: invalid ? String(error.message) : 'CATALOG_PREVIEW_UNAVAILABLE' },
    })
  }
}

export async function handleCatalogCommit(req, res) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const payload = await buildCatalogCommitPayload(authorized.client, await readCatalogJson(req))
    const signed = signedAdminCommandArguments('catalog_import_chunk', authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_catalog_import_v1', signed)
    if (error) {
      const providerCode = String(error.message || '')
      if (providerCode.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      if (providerCode.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      if (providerCode.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
      if (providerCode.includes('K2_CATALOG_STALE_CONFLICT')) return safeJson(res, 409, { error: { code: 'CATALOG_STALE_CONFLICT' } })
      if (providerCode.includes('K2_CATALOG_OPERATION_CONFLICT')) return safeJson(res, 409, { error: { code: 'CATALOG_OPERATION_CONFLICT' } })
      if (providerCode.includes('K2_CATALOG_CHUNK_SEQUENCE')) return safeJson(res, 409, { error: { code: 'CATALOG_CHUNK_SEQUENCE' } })
      return safeJson(res, 503, { error: { code: 'CATALOG_COMMIT_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    const invalidCodes = new Set([
      'REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON',
      'CATALOG_FILE_INVALID', 'CATALOG_CSV_INVALID', 'CATALOG_HEADERS_INVALID',
      'CATALOG_ROW_LIMIT', 'CATALOG_CELL_TOO_LARGE', 'CATALOG_SELECTION_INVALID',
      'CATALOG_NEW_SKU_MUST_BE_BLANK',
    ])
    return safeJson(res, invalidCodes.has(error?.message) ? 400 : 503, {
      error: { code: invalidCodes.has(error?.message) ? error.message : 'CATALOG_COMMIT_UNAVAILABLE' },
    })
  }
}

export async function handleCatalogStatus(req, res) {
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  const operationId = String(req.query?.operationId || '').trim()
  if (!UUID.test(operationId)) return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  try {
    const { data, error } = await authorized.client.rpc('read_admin_catalog_import_status_v1', {
      p_operation_id: operationId,
    })
    if (error) return safeJson(res, 503, { error: { code: 'CATALOG_STATUS_UNAVAILABLE' } })
    if (!data) return safeJson(res, 404, { error: { code: 'CATALOG_OPERATION_NOT_FOUND' } })
    return safeJson(res, 200, { ok: true, status: data })
  } catch {
    return safeJson(res, 503, { error: { code: 'CATALOG_STATUS_UNAVAILABLE' } })
  }
}
