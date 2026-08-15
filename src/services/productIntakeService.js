/**
 * Product Intake Service (MAP-018)
 *
 * This browser service is deliberately thin. Operational truth is created only
 * by authenticated server/database commands protected by RLS and role checks.
 * It never generates an SKU, lot, or publication success in the browser.
 */

import { supabase } from '../lib/supabaseClient'
import { validateUploadFile } from '../lib/uploadValidation'
import {
  adminBffEnabled, createProductDraftBff, createProductFirstInventoryBff,
  createProductIntakeSessionBff, getProductIntakeSessionBff,
  listProductIntakeConsignmentsBff, saveProductIntakeStepBff,
  searchProductIntakeDuplicatesBff, transitionProductPublicationBff,
  uploadProductEvidenceBff,
} from './adminBffService'

const ACTIVE_SESSION_KEY = 'k2_active_intake_session'
const EVIDENCE_BUCKET = 'product-intake-evidence'
const SESSION_PATCH_FIELDS = new Set([
  'barcode', 'scanned_identity', 'category_type', 'packaging_images',
  'evidence_checklist', 'draft_payload', 'field_decisions',
  'field_provenance', 'unknown_fields',
])

export class ProductIntakeError extends Error {
  constructor(code, userMessage, cause = null) {
    super(userMessage)
    this.name = 'ProductIntakeError'
    this.code = code
    this.userMessage = userMessage
    this.cause = cause
  }
}

function requireClient() {
  if (!supabase) {
    throw new ProductIntakeError(
      'INTAKE_SERVICE_UNAVAILABLE',
      'Product intake is unavailable until the secure database connection is configured.'
    )
  }
  return supabase
}

function commandError(code, userMessage, cause) {
  return new ProductIntakeError(code, userMessage, cause)
}

function cacheSession(session) {
  // Presentation continuity only. The server record remains authoritative.
  if (adminBffEnabled()) return
  if (session?.id) localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session))
}

function readCachedSessionId() {
  if (adminBffEnabled()) return null
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) || 'null')?.id || null
  } catch {
    localStorage.removeItem(ACTIVE_SESSION_KEY)
    return null
  }
}

async function fetchSession(client, sessionId) {
  if (adminBffEnabled()) {
    const result = await getProductIntakeSessionBff(sessionId)
    if (!result.ok || !result.data?.session) {
      throw commandError('INTAKE_REFRESH_FAILED', result.error || 'The saved intake session could not be refreshed.')
    }
    return result.data.session
  }
  const { data, error } = await client
    .from('product_intake_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  if (error || !data) {
    throw commandError('INTAKE_REFRESH_FAILED', 'The saved intake session could not be refreshed.', error)
  }
  cacheSession(data)
  return data
}

/** Search exact identity first, then name candidates without interpolated filters. */
export async function searchIdentityDuplicates(rawQuery) {
  const query = String(rawQuery || '').trim()
  if (!query) return { matchType: 'none', candidates: [] }

  if (adminBffEnabled()) {
    const result = await searchProductIntakeDuplicatesBff(query)
    if (!result.ok) throw commandError('DUPLICATE_CHECK_FAILED', result.error)
    return result.data
  }
  const client = requireClient()
  const projection = 'id,sku,barcode,name,status,brand_id,category_id,brand:brands(name),category:categories(name)'
  const normalize = (product) => ({
    ...product,
    brand: product.brand?.name || 'Unassigned brand',
    category: product.category?.name || 'Unassigned category',
  })

  const { data: barcodeMatches, error: barcodeError } = await client
    .from('products')
    .select(projection)
    .eq('barcode', query)
    .limit(5)
  if (barcodeError) {
    throw commandError('DUPLICATE_CHECK_FAILED', 'The duplicate check could not be completed. Try again.', barcodeError)
  }

  const barcodeHit = barcodeMatches?.[0]
  if (barcodeHit) {
    const candidates = barcodeMatches.map(normalize)
    return { matchType: 'exact', product: candidates[0], candidates }
  }

  const { data: skuMatches, error: skuError } = await client
    .from('products')
    .select(projection)
    .ilike('sku', query)
    .limit(5)
  if (skuError) {
    throw commandError('DUPLICATE_CHECK_FAILED', 'The duplicate check could not be completed. Try again.', skuError)
  }

  const skuHit = skuMatches?.find((product) => product.sku?.toLowerCase() === query.toLowerCase())
  if (skuHit) {
    const candidates = skuMatches.map(normalize)
    return { matchType: 'exact', product: normalize(skuHit), candidates }
  }

  // `%` and `_` are LIKE wildcards. Escaping them keeps user input as data.
  const safeLike = query.replace(/[\\%_]/g, (character) => `\\${character}`)
  const { data: nameMatches, error: nameError } = await client
    .from('products')
    .select(projection)
    .ilike('name', `%${safeLike}%`)
    .limit(5)
  if (nameError) {
    throw commandError('DUPLICATE_CHECK_FAILED', 'The duplicate check could not be completed. Try again.', nameError)
  }

  return nameMatches?.length
    ? { matchType: 'ambiguous', candidates: nameMatches.map(normalize) }
    : { matchType: 'none', candidates: [] }
}

/** Resume the cached server session when authorized, otherwise create one. */
export async function createOrResumeIntakeSession(barcode = null, scannedIdentity = null) {
  if (adminBffEnabled()) {
    const active = await getProductIntakeSessionBff(null)
    if (!active.ok) throw commandError('INTAKE_RESUME_FAILED', active.error)
    if (active.data?.session) return active.data.session
    const requestId = crypto.randomUUID()
    const created = await createProductIntakeSessionBff({
      requestId, barcode: barcode || null, scannedIdentity: scannedIdentity || barcode || '',
    })
    if (!created.ok) throw commandError('INTAKE_CREATE_FAILED', created.error)
    return fetchSession(null, created.result?.sessionId)
  }
  const client = requireClient()
  const cachedId = readCachedSessionId()

  if (cachedId) {
    const { data: resumed, error: resumeError } = await client
      .from('product_intake_sessions')
      .select('*')
      .eq('id', cachedId)
      .eq('status', 'active')
      .maybeSingle()

    if (resumeError) {
      throw commandError('INTAKE_RESUME_FAILED', 'The saved intake session could not be resumed.', resumeError)
    }
    if (resumed) {
      cacheSession(resumed)
      return resumed
    }
    localStorage.removeItem(ACTIVE_SESSION_KEY)
  }

  const requestId = crypto.randomUUID()
  const initialSession = {
    request_id: requestId,
    barcode: barcode || null,
    scanned_identity: scannedIdentity || barcode || '',
    checklist_step: 'identify',
    packaging_images: [],
    draft_payload: {},
    field_decisions: {},
    field_provenance: {},
    unknown_fields: [],
  }

  const { data, error } = await client
    .from('product_intake_sessions')
    .insert(initialSession)
    .select()
    .single()

  if (error || !data) {
    throw commandError('INTAKE_CREATE_FAILED', 'A secure intake session could not be created. Nothing was saved.', error)
  }

  cacheSession(data)
  return data
}

/** Persist one server-authoritative checklist transition. */
export async function saveIntakeSessionStep(session, step, partialData = {}) {
  if (!session?.id) {
    throw commandError('INTAKE_SESSION_REQUIRED', 'A valid server intake session is required before continuing.')
  }

  const unsafeField = Object.keys(partialData).find((field) => !SESSION_PATCH_FIELDS.has(field))
  if (unsafeField) {
    throw commandError('INTAKE_PATCH_REJECTED', 'This intake change must be performed by a protected server command.')
  }
  const safePatch = Object.fromEntries(
    Object.entries(partialData).filter(([field]) => SESSION_PATCH_FIELDS.has(field))
  )

  if (adminBffEnabled()) {
    if (Object.hasOwn(safePatch, 'packaging_images')) {
      throw commandError(
        'INTAKE_PATCH_REJECTED',
        'Packaging evidence must be changed through the protected image-upload command.'
      )
    }
    const keyMap = {
      barcode: 'barcode', scanned_identity: 'scannedIdentity', category_type: 'categoryType',
      evidence_checklist: 'evidenceChecklist', draft_payload: 'draftPayload',
      field_decisions: 'fieldDecisions', field_provenance: 'fieldProvenance',
      unknown_fields: 'unknownFields',
    }
    const patch = Object.fromEntries(Object.entries(safePatch).map(([key, value]) => [keyMap[key], value]))
    const result = await saveProductIntakeStepBff({ sessionId: session.id, step, patch })
    if (!result.ok) throw commandError('INTAKE_SAVE_FAILED', result.error)
    return fetchSession(null, session.id)
  }
  const client = requireClient()

  const { data, error } = await client
    .from('product_intake_sessions')
    .update({ checklist_step: step, ...safePatch })
    .eq('id', session.id)
    .select()
    .single()

  if (error || !data) {
    throw commandError('INTAKE_SAVE_FAILED', 'This intake step was not saved. Your previous server state is unchanged.', error)
  }

  cacheSession(data)
  return data
}

/** Upload one private packaging-evidence image and persist its server path. */
export async function uploadProductEvidence(session, slot, file) {
  if (!session?.id) {
    throw commandError('INTAKE_SESSION_REQUIRED', 'Start a secure intake session before uploading evidence.')
  }
  if (!['PRIMARY', 'BACK', 'BARCODE'].includes(slot)) {
    throw commandError('EVIDENCE_SLOT_INVALID', 'Choose a valid packaging-evidence slot.')
  }
  const validation = validateUploadFile(file)
  if (!validation.ok) {
    throw commandError('EVIDENCE_FILE_INVALID', validation.error || 'Use a valid JPG, PNG, WebP, or AVIF image no larger than 10 MB.')
  }
  const extensionByType = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }
  const extension = extensionByType[file?.type] || 'jpg'

  if (adminBffEnabled()) {
    const result = await uploadProductEvidenceBff(session.id, slot, file)
    if (!result.ok) throw commandError(result.code || 'EVIDENCE_UPLOAD_FAILED', result.error)
    const updatedSession = await fetchSession(null, session.id)
    const evidence = (updatedSession.packaging_images || []).find((image) => image.slot === slot)
    if (!evidence) throw commandError('EVIDENCE_REGISTER_FAILED', 'The evidence photo was uploaded but its verified record could not be loaded. Try again before continuing.')
    return { session: updatedSession, evidence }
  }
  const client = requireClient()

  const { data: authData, error: authError } = await client.auth.getUser()
  const userId = authData?.user?.id
  if (authError || !userId) {
    throw commandError('EVIDENCE_AUTH_REQUIRED', 'Sign in as authorized staff before uploading evidence.', authError)
  }

  const path = `${userId}/${session.id}/${slot.toLowerCase()}-${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await client.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '3600' })
  if (uploadError) {
    throw commandError('EVIDENCE_UPLOAD_FAILED', 'The evidence photo was not uploaded. Try again.', uploadError)
  }

  const evidence = {
    slot,
    path,
    name: file.name,
    size: file.size,
    type: file.type,
    upload_status: 'uploaded',
    uploaded_at: new Date().toISOString(),
  }
  const packagingImages = [
    ...(Array.isArray(session.packaging_images) ? session.packaging_images : [])
      .filter((image) => image.slot !== slot),
    evidence,
  ]

  try {
    const updatedSession = await saveIntakeSessionStep(
      session,
      session.checklist_step || 'packaging_evidence',
      { packaging_images: packagingImages }
    )
    return { session: updatedSession, evidence }
  } catch (error) {
    await client.storage.from(EVIDENCE_BUCKET).remove([path])
    throw error
  }
}

/** Load open Italy manifests for the controlled first-inventory handoff. */
export async function listPackingConsignments() {
  if (adminBffEnabled()) {
    const result = await listProductIntakeConsignmentsBff()
    if (!result.ok) throw commandError('CONSIGNMENT_LIST_FAILED', result.error)
    return result.data?.consignments || []
  }
  const client = requireClient()
  const { data, error } = await client
    .from('consignments')
    .select('id,manifest_code,flight_number,status,created_at')
    .eq('status', 'Packing_Italy')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) {
    throw commandError('CONSIGNMENT_LIST_FAILED', 'Open Italy flights could not be loaded.', error)
  }
  return data || []
}

/** Create exactly one reviewed Draft through the server command. */
export async function createProductDraftServer(session) {
  if (!session?.id) {
    throw commandError('INTAKE_SESSION_REQUIRED', 'A valid server intake session is required before creating a product.')
  }

  if (adminBffEnabled()) {
    const result = await createProductDraftBff({
      sessionId: session.id, requestId: session.request_id,
      reviewedPayload: session.draft_payload || {}, fieldDecisions: session.field_decisions || {},
    })
    if (!result.ok || !result.result?.success || !result.result?.product_id || !result.result?.sku) {
      throw commandError('DRAFT_CREATE_FAILED', result.error || 'The product Draft was not created. Review the fields or ask an administrator.')
    }
    const updatedSession = await fetchSession(null, session.id)
    return {
      success: true, sku: result.result.sku,
      product: { id: result.result.product_id, sku: result.result.sku, status: 'draft' },
      session: updatedSession,
    }
  }
  const client = requireClient()
  const { data, error } = await client.rpc('create_product_draft_server', {
    p_session_id: session.id,
    p_request_id: session.request_id,
    p_reviewed_payload: session.draft_payload || {},
    p_field_decisions: session.field_decisions || {},
  })

  if (error || !data?.success || !data?.product_id || !data?.sku) {
    throw commandError('DRAFT_CREATE_FAILED', 'The product Draft was not created. Review the fields or ask an administrator.', error)
  }

  const updatedSession = await fetchSession(client, session.id)
  return {
    success: true,
    sku: data.sku,
    product: { id: data.product_id, sku: data.sku, status: 'draft' },
    session: updatedSession,
  }
}

/** Route first inventory to its selected operational server workflow. */
export async function createFirstInventoryServer(session, inventory) {
  if (!session?.id || !session?.product_id) {
    throw commandError('PRODUCT_DRAFT_REQUIRED', 'Create the server Product Draft before recording inventory.')
  }

  const keyName = `${ACTIVE_SESSION_KEY}:inventory:${session.id}`
  const requestId = localStorage.getItem(keyName) || crypto.randomUUID()
  localStorage.setItem(keyName, requestId)
  if (adminBffEnabled()) {
    const common = {
      quantity: inventory.quantity, boxCode: inventory.boxCode,
      batchCode: inventory.batchCode, expiryDate: inventory.expiryDate,
      isNonExpiry: inventory.isNonExpiry, unitCost: inventory.unitCost,
    }
    const inventoryFields = inventory.source === 'flight'
      ? { ...common, consignmentId: inventory.consignmentId }
      : {
        ...common, ownerCode: inventory.ownerCode, hubLocation: inventory.hubLocation,
        custodian: inventory.custodian, reason: inventory.reason,
      }
    const result = await createProductFirstInventoryBff({
      sessionId: session.id, inventoryRequestId: requestId,
      source: inventory.source, inventory: inventoryFields,
    })
    if (!result.ok || !result.result?.success) {
      throw commandError('INVENTORY_CREATE_FAILED', result.error || 'Inventory was not recorded. No quantity was added.')
    }
    const updatedSession = await fetchSession(null, session.id)
    return { ...result.result, session: updatedSession }
  }
  const client = requireClient()
  const { data, error } = await client.rpc('create_product_first_inventory_server', {
    p_session_id: session.id,
    p_request_id: requestId,
    p_source: inventory.source,
    p_inventory: inventory,
  })

  if (error || !data?.success) {
    throw commandError('INVENTORY_CREATE_FAILED', 'Inventory was not recorded. No quantity was added.', error)
  }
  const updatedSession = await fetchSession(client, session.id)
  return { ...data, session: updatedSession }
}

/** Ask the server to validate and perform a publication transition. */
export async function updateProductPublicationServer(session, requestedStatus, reason = '') {
  if (!session?.id || !session?.product_id) {
    throw commandError('PRODUCT_DRAFT_REQUIRED', 'Create the server Product Draft before changing publication.')
  }

  if (adminBffEnabled()) {
    const result = await transitionProductPublicationBff({
      sessionId: session.id, requestedStatus, reason: String(reason || '').trim(),
    })
    if (!result.ok || !result.result?.success) {
      throw commandError('PUBLICATION_FAILED', result.error || 'Publication was not changed. Complete the server readiness checklist first.')
    }
    const updatedSession = await fetchSession(null, session.id)
    return { ...result.result, session: updatedSession }
  }
  const client = requireClient()
  const { data, error } = await client.rpc('transition_product_publication_server', {
    p_session_id: session.id,
    p_requested_status: requestedStatus,
  })

  if (error || !data?.success) {
    throw commandError('PUBLICATION_FAILED', 'Publication was not changed. Complete the server readiness checklist first.', error)
  }
  const updatedSession = await fetchSession(client, session.id)
  return { ...data, session: updatedSession }
}
