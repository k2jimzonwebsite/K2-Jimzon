import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'
import { recordSecurityEvent } from './security-events.js'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STEPS = new Set([
  'identify', 'packaging_evidence', 'research_handoff', 'field_review',
  'draft_saved', 'first_inventory', 'publication_review', 'completed',
])
const CATEGORIES = new Set(['food', 'beauty', 'household'])
const PUBLICATION = new Set(['draft', 'under_review', 'live', 'unlisted', 'discontinued'])
export const MAX_EVIDENCE_BYTES = 4 * 1024 * 1024

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REQUEST_INVALID')
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
}

function text(value, { required = false, max = 500, nullable = false } = {}) {
  if (nullable && (value === null || value === '')) return null
  const result = String(value ?? '').trim()
  if ((required && !result) || result.length > max) throw new Error('REQUEST_INVALID')
  return result
}

function uuid(value) {
  const result = text(value, { required: true, max: 36 })
  if (!UUID.test(result)) throw new Error('REQUEST_INVALID')
  return result
}

function jsonObject(value, maxBytes) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REQUEST_INVALID')
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > maxBytes) throw new Error('REQUEST_INVALID')
  return value
}

function stringArray(value, { maxItems = 100, maxItemLength = 200 } = {}) {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error('REQUEST_INVALID')
  return value.map((item) => text(item, { required: true, max: maxItemLength }))
}

function inventoryPayload(source, value) {
  const common = ['quantity', 'boxCode', 'batchCode', 'expiryDate', 'isNonExpiry', 'unitCost']
  const keys = source === 'flight'
    ? [...common, 'consignmentId']
    : [...common, 'ownerCode', 'hubLocation', 'custodian', 'reason']
  exactObject(value, keys)
  const quantity = Number(value.quantity)
  const unitCost = Number(value.unitCost ?? 0)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) throw new Error('REQUEST_INVALID')
  if (!Number.isFinite(unitCost) || unitCost < 0 || unitCost > 10_000_000) throw new Error('REQUEST_INVALID')
  if (typeof value.isNonExpiry !== 'boolean') throw new Error('REQUEST_INVALID')
  const expiryDate = text(value.expiryDate, { max: 10, nullable: true })
  if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) throw new Error('REQUEST_INVALID')
  if (!value.isNonExpiry && !expiryDate) throw new Error('REQUEST_INVALID')
  const result = {
    quantity, boxCode: text(value.boxCode, { required: true, max: 120 }),
    batchCode: text(value.batchCode, { required: true, max: 120 }), expiryDate,
    isNonExpiry: value.isNonExpiry, unitCost,
  }
  if (source === 'flight') {
    if (value.isNonExpiry) throw new Error('REQUEST_INVALID')
    return { ...result, consignmentId: uuid(value.consignmentId) }
  }
  return {
    ...result,
    ownerCode: text(value.ownerCode, { required: true, max: 120 }),
    hubLocation: text(value.hubLocation, { required: true, max: 120 }),
    custodian: text(value.custodian, { required: true, max: 120 }),
    reason: text(value.reason, { required: true, max: 1000 }),
  }
}

export function validateProductIntakeCommand(action, body) {
  if (action === 'intake_session_create') {
    exactObject(body, ['requestId', 'barcode', 'scannedIdentity'])
    return {
      requestId: uuid(body.requestId),
      barcode: text(body.barcode, { max: 32, nullable: true }),
      scannedIdentity: text(body.scannedIdentity, { max: 240 }),
    }
  }
  if (action === 'intake_session_step') {
    exactObject(body, ['sessionId', 'step', 'patch'])
    const step = text(body.step, { required: true, max: 40 })
    if (!STEPS.has(step)) throw new Error('REQUEST_INVALID')
    exactObject(body.patch, [
      'barcode', 'scannedIdentity', 'categoryType', 'evidenceChecklist',
      'draftPayload', 'fieldDecisions', 'fieldProvenance', 'unknownFields',
    ])
    const has = (key) => Object.prototype.hasOwnProperty.call(body.patch, key)
    const patch = {}
    if (has('barcode')) patch.barcode = text(body.patch.barcode, { max: 32, nullable: true })
    if (has('scannedIdentity')) patch.scannedIdentity = text(body.patch.scannedIdentity, { max: 240 })
    if (has('categoryType')) {
      patch.categoryType = text(body.patch.categoryType, { max: 20, nullable: true })
      if (patch.categoryType && !CATEGORIES.has(patch.categoryType)) throw new Error('REQUEST_INVALID')
    }
    if (has('evidenceChecklist')) patch.evidenceChecklist = jsonObject(body.patch.evidenceChecklist, 8_192)
    if (has('draftPayload')) patch.draftPayload = jsonObject(body.patch.draftPayload, 131_072)
    if (has('fieldDecisions')) patch.fieldDecisions = jsonObject(body.patch.fieldDecisions, 32_768)
    if (has('fieldProvenance')) patch.fieldProvenance = jsonObject(body.patch.fieldProvenance, 32_768)
    if (has('unknownFields')) patch.unknownFields = stringArray(body.patch.unknownFields)
    return {
      sessionId: uuid(body.sessionId), step,
      patch,
    }
  }
  if (action === 'intake_draft') {
    exactObject(body, ['sessionId', 'requestId', 'reviewedPayload', 'fieldDecisions'])
    return {
      sessionId: uuid(body.sessionId), requestId: uuid(body.requestId),
      reviewedPayload: jsonObject(body.reviewedPayload, 131_072),
      fieldDecisions: jsonObject(body.fieldDecisions, 32_768),
    }
  }
  if (action === 'intake_inventory') {
    exactObject(body, ['sessionId', 'inventoryRequestId', 'source', 'inventory'])
    const source = text(body.source, { required: true, max: 30 })
    if (!['flight', 'reconciliation'].includes(source)) throw new Error('REQUEST_INVALID')
    return {
      sessionId: uuid(body.sessionId), inventoryRequestId: uuid(body.inventoryRequestId),
      source, inventory: inventoryPayload(source, body.inventory),
    }
  }
  if (action === 'intake_publication') {
    exactObject(body, ['sessionId', 'requestedStatus', 'reason'])
    const requestedStatus = text(body.requestedStatus, { required: true, max: 30 })
    if (!PUBLICATION.has(requestedStatus)) throw new Error('REQUEST_INVALID')
    return {
      sessionId: uuid(body.sessionId), requestedStatus,
      reason: text(body.reason, { required: true, max: 500 }),
    }
  }
  throw new Error('REQUEST_INVALID')
}

const SESSION_PROJECTION = [
  'id,request_id,session_code,barcode,scanned_identity,checklist_step,category_type',
  'packaging_images,evidence_checklist,draft_payload,field_decisions,field_provenance,unknown_fields',
  'assigned_sku,product_id,inventory_request_id,inventory_result,status,created_by,created_at,updated_at,completed_at',
].join(',')

export async function readProductIntakeSession(client, sessionId) {
  let query = client.from('product_intake_sessions').select(SESSION_PROJECTION)
  query = sessionId
    ? query.eq('id', sessionId).single()
    : query.eq('status', 'active').order('updated_at', { ascending: false }).limit(1).maybeSingle()
  const { data, error } = await query
  if (error) throw new Error('INTAKE_UNAVAILABLE')
  return { session: data || null }
}

export async function searchProductIntakeDuplicates(client, rawQuery) {
  const query = text(rawQuery, { required: true, max: 140 })
  const projection = 'id,sku,barcode,name,status,brand_id,category_id,brand:brands(name),category:categories(name)'
  const normalize = (product) => ({
    ...product,
    brand: product.brand?.name || 'Unassigned brand',
    category: product.category?.name || 'Unassigned category',
  })
  const barcode = await client.from('products').select(projection).eq('barcode', query).limit(5)
  if (barcode.error) throw new Error('INTAKE_DUPLICATES_UNAVAILABLE')
  if (barcode.data?.length) return { matchType: 'exact', product: normalize(barcode.data[0]), candidates: barcode.data.map(normalize) }
  const sku = await client.from('products').select(projection).ilike('sku', query).limit(5)
  if (sku.error) throw new Error('INTAKE_DUPLICATES_UNAVAILABLE')
  const exactSku = sku.data?.find((product) => product.sku?.toLowerCase() === query.toLowerCase())
  if (exactSku) return { matchType: 'exact', product: normalize(exactSku), candidates: sku.data.map(normalize) }
  const safeLike = query.replace(/[\\%_]/g, (character) => `\\${character}`)
  const names = await client.from('products').select(projection).ilike('name', `%${safeLike}%`).limit(5)
  if (names.error) throw new Error('INTAKE_DUPLICATES_UNAVAILABLE')
  return names.data?.length
    ? { matchType: 'ambiguous', candidates: names.data.map(normalize) }
    : { matchType: 'none', candidates: [] }
}

export async function listProductIntakeConsignments(client) {
  const { data, error } = await client.from('consignments')
    .select('id,manifest_code,flight_number,status,created_at')
    .eq('status', 'Packing_Italy').order('created_at', { ascending: false }).limit(50)
  if (error) throw new Error('INTAKE_CONSIGNMENTS_UNAVAILABLE')
  return { consignments: data || [] }
}

export async function handleProductIntakeCommand(req, res, action) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const payload = validateProductIntakeCommand(action, await readJson(req))
    const signed = signedAdminCommandArguments(action, authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_product_intake_command_v1', signed)
    if (error) {
      const providerCode = String(error.message || '')
      if (providerCode.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      if (providerCode.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      if (providerCode.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
      return safeJson(res, 503, { error: { code: 'INTAKE_COMMAND_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'INTAKE_COMMAND_UNAVAILABLE' } })
  }
}

export async function readImageBody(req) {
  const declared = Number(req.headers['content-length'] || 0)
  if (!Number.isFinite(declared) || declared < 1 || declared > MAX_EVIDENCE_BYTES) throw new Error('EVIDENCE_FILE_INVALID')
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length !== declared || req.body.length > MAX_EVIDENCE_BYTES) throw new Error('EVIDENCE_FILE_INVALID')
    return req.body
  }
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_EVIDENCE_BYTES) throw new Error('EVIDENCE_FILE_INVALID')
    chunks.push(chunk)
  }
  if (!total || total !== declared) throw new Error('EVIDENCE_FILE_INVALID')
  return Buffer.concat(chunks)
}

function safeFileName(value) {
  return String(value || 'evidence-image').replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120)
}

export async function decodeEvidenceImage(buffer, declaredType) {
  const allowed = new Map([
    ['jpeg', { type: 'image/jpeg', extension: 'jpg' }],
    ['png', { type: 'image/png', extension: 'png' }],
    ['webp', { type: 'image/webp', extension: 'webp' }],
  ])
  const image = sharp(buffer, { failOn: 'warning', limitInputPixels: 40_000_000 })
  const metadata = await image.metadata()
  const format = allowed.get(metadata.format)
  if (!format || format.type !== declaredType || !metadata.width || !metadata.height
      || metadata.width < 100 || metadata.height < 100
      || metadata.width > 12_000 || metadata.height > 12_000
      || metadata.width * metadata.height > 40_000_000 || Number(metadata.pages || 1) !== 1) {
    throw new Error('EVIDENCE_FILE_INVALID')
  }
  const oriented = image.rotate()
  const encoded = metadata.format === 'jpeg'
    ? await oriented.jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer()
    : metadata.format === 'png'
      ? await oriented.png({ compressionLevel: 9 }).toBuffer()
      : await oriented.webp({ quality: 95 }).toBuffer()
  if (!encoded.length || encoded.length > MAX_EVIDENCE_BYTES) throw new Error('EVIDENCE_FILE_INVALID')
  const outputMetadata = await sharp(encoded, { failOn: 'warning', limitInputPixels: 40_000_000 }).metadata()
  return {
    buffer: encoded, type: format.type, extension: format.extension,
    width: outputMetadata.width, height: outputMetadata.height,
    sha256: createHash('sha256').update(encoded).digest('hex'),
  }
}

export async function removeUnregisteredEvidence(client, path) {
  if (!path) return false
  try {
    const removal = await client.storage.from('product-intake-evidence').remove([path])
    return !removal.error
  } catch {
    return false
  }
}

export async function recordPendingEvidenceCleanup(
  client, identity, registrationRequestId, sessionId, objectPath,
) {
  const objectPathHash = createHash('sha256').update(objectPath, 'utf8').digest('hex')
  const payload = { sessionId, objectPath, objectPathHash }
  const signed = signedAdminCommandArguments(
    'intake_evidence_cleanup_pending', identity.userId, registrationRequestId, payload,
  )
  const result = await client.rpc('record_admin_product_intake_evidence_cleanup_v1', signed)
  const cleanupId = String(result?.data?.cleanupId || '')
  if (result?.error || !UUID.test(cleanupId) || result.data?.status !== 'pending') return null
  return { cleanupId, status: 'pending' }
}

export async function reconcilePendingEvidenceCleanup(
  client, identity, retryRequestId, cleanupId,
) {
  if (!UUID.test(retryRequestId) || !UUID.test(cleanupId)) throw new Error('REQUEST_INVALID')
  const claim = await client.rpc(
    'claim_admin_product_intake_evidence_cleanup_v1',
    signedAdminCommandArguments(
      'intake_evidence_cleanup_retry', identity.userId, retryRequestId, { cleanupId },
    ),
  )
  if (claim?.error || !claim?.data) throw new Error('EVIDENCE_CLEANUP_UNAVAILABLE')
  if (claim.data.status === 'completed') return { cleanupId, cleanupPending: false }
  const objectPath = String(claim.data.objectPath || '')
  const objectPathHash = String(claim.data.objectPathHash || '')
  const validPath = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,180}$/i.test(objectPath)
  const actualHash = createHash('sha256').update(objectPath, 'utf8').digest('hex')
  if (!validPath || !/^[a-f0-9]{64}$/.test(objectPathHash) || actualHash !== objectPathHash) {
    throw new Error('EVIDENCE_CLEANUP_INVALID')
  }
  const removal = await client.storage.from('product-intake-evidence').remove([objectPath])
  if (removal?.error) return { cleanupId, cleanupPending: true }
  const completion = await client.rpc(
    'complete_admin_product_intake_evidence_cleanup_v1',
    signedAdminCommandArguments(
      'intake_evidence_cleanup_complete', identity.userId, retryRequestId,
      { cleanupId, objectPathHash },
    ),
  )
  return { cleanupId, cleanupPending: Boolean(completion?.error) }
}

export async function handleProductEvidenceCleanup(req, res) {
  if (req.method !== 'POST') {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  }
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) {
    return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  }
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const body = await readJson(req)
    exactObject(body, ['cleanupId'])
    const cleanupId = uuid(body.cleanupId)
    const result = await reconcilePendingEvidenceCleanup(
      authorized.client, authorized.identity, idempotencyKey, cleanupId,
    )
    return safeJson(res, 200, { ok: true, ...result })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'EVIDENCE_CLEANUP_INVALID' } })
    }
    if (error?.message === 'EVIDENCE_CLEANUP_INVALID') {
      return safeJson(res, 409, { error: { code: 'EVIDENCE_CLEANUP_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'EVIDENCE_CLEANUP_UNAVAILABLE' } })
  }
}

export async function handleProductEvidenceUpload(req, res) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  const sessionId = String(req.headers['x-k2-intake-session'] || '').trim()
  const slot = String(req.headers['x-k2-evidence-slot'] || '').trim().toUpperCase()
  const declaredType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
  if (!UUID.test(idempotencyKey) || !UUID.test(sessionId) || !['PRIMARY', 'BACK', 'BARCODE'].includes(slot)) {
    return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
  }
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const decoded = await decodeEvidenceImage(await readImageBody(req), declaredType)
    const path = `${authorized.identity.userId}/${sessionId}/${slot.toLowerCase()}-${idempotencyKey}-${decoded.sha256.slice(0, 16)}.${decoded.extension}`
    const upload = await authorized.client.storage.from('product-intake-evidence').upload(path, decoded.buffer, {
      contentType: decoded.type, cacheControl: '3600', upsert: true,
    })
    if (upload.error) return safeJson(res, 503, { error: { code: 'EVIDENCE_UPLOAD_UNAVAILABLE' } })
    const payload = {
      sessionId, slot, path, fileName: safeFileName(req.headers['x-k2-file-name']),
      size: decoded.buffer.length, type: decoded.type, width: decoded.width,
      height: decoded.height, sha256: decoded.sha256,
    }
    const signed = signedAdminCommandArguments('intake_evidence_register', authorized.identity.userId, idempotencyKey, payload)
    const command = await authorized.client.rpc('execute_admin_product_intake_command_v1', signed)
    if (command.error) {
      const removed = await removeUnregisteredEvidence(authorized.client, path)
      if (!removed) {
        const pending = await recordPendingEvidenceCleanup(
          authorized.client, authorized.identity, idempotencyKey, sessionId, path,
        ).catch(() => null)
        const objectPathHash = createHash('sha256').update(path, 'utf8').digest('hex')
        await recordSecurityEvent(authorized.client, {
          correlationId: idempotencyKey,
          eventType: 'application_error', source: 'admin_bff', severity: 'warning',
          outcome: 'failed', sessionId: authorized.session?.sessionId || null,
          routeKey: 'admin.product-intake.evidence',
          reasonCode: pending ? 'INTAKE_EVIDENCE_CLEANUP_PENDING' : 'INTAKE_EVIDENCE_CLEANUP_UNTRACKED',
          subjectKind: 'private_object_hash', subjectId: objectPathHash,
        })
        if (pending) {
          return safeJson(res, 503, {
            error: { code: 'EVIDENCE_CLEANUP_PENDING' }, cleanupId: pending.cleanupId,
          })
        }
        return safeJson(res, 503, { error: { code: 'EVIDENCE_CLEANUP_UNTRACKED' } })
      }
      const providerCode = String(command.error.message || '')
      if (providerCode.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      if (providerCode.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      return safeJson(res, 503, { error: { code: 'EVIDENCE_REGISTER_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, result: command.data })
  } catch (error) {
    const invalid = ['EVIDENCE_FILE_INVALID', 'Input buffer contains unsupported image format'].includes(error?.message)
      || /corrupt|invalid|unsupported|decode/i.test(String(error?.message || ''))
    return safeJson(res, invalid ? 400 : 503, { error: { code: invalid ? 'EVIDENCE_FILE_INVALID' : 'EVIDENCE_UPLOAD_UNAVAILABLE' } })
  }
}
