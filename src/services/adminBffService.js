import { fetchReadWithRetry, fetchWithTimeout, isRequestTimeoutError } from '../lib/fetchWithTimeout.js'

export function adminBffEnabled() {
  return String(import.meta.env.VITE_ADMIN_BFF_ENABLED || '').toLowerCase() === 'true'
}

const ADMIN_COMMAND_ROUTES = Object.freeze({
  fulfillment: new Set(['confirm', 'packing-scan', 'payment', 'delivery', 'fulfill', 'transfer-lot', 'assign-box']),
  inbox: new Set(['internal-note', 'mark-read', 'workflow']),
  pasabuy: new Set(['transition', 'quote']),
  'product-intake': new Set(['session', 'step', 'draft', 'inventory', 'publication']),
  consignments: new Set(['create', 'add-line', 'scan', 'advance', 'finalize']),
  lots: new Set(['reconcile', 'clearance']),
  coupons: new Set(['create', 'state', 'archive']),
  'catalog-import': new Set(['commit']),
  'wholesale-inquiries': new Set(['review']),
})

export function boundedAdminCommandRoute(group, path) {
  if (!ADMIN_COMMAND_ROUTES[group]?.has(path)) throw new Error('ADMIN_ROUTE_INVALID')
  return `/api/admin/${group}/${path}`
}

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  INVALID_CREDENTIAL_FORMAT: 'Enter a valid staff email and password.',
  MFA_CODE_INVALID: 'Enter the 6-digit code from your authenticator app.',
  MFA_VERIFICATION_FAILED: 'That authenticator code could not be verified.',
  MFA_ENROLLMENT_REQUIRED: 'This staff account must enroll an authenticator before it can sign in.',
  MFA_ALREADY_ENROLLED: 'An authenticator is already active. Return to sign-in and enter its code.',
  MFA_ENROLLMENT_INVALID: 'This authenticator setup expired or changed. Return to sign-in and start again.',
  MFA_ENROLLMENT_VERIFICATION_FAILED: 'That authenticator code could not be verified.',
  MFA_ENROLLMENT_UNAVAILABLE: 'Authenticator setup is temporarily unavailable. Return to sign-in and try again.',
  MFA_REPLACEMENT_INVALID: 'Review the replacement reason and six-digit authenticator code.',
  MFA_REPLACEMENT_ACTIVE_FACTOR_REQUIRED: 'A verified current authenticator is required before it can be replaced.',
  MFA_REPLACEMENT_MULTIPLE_ACTIVE_FACTORS: 'More than one active authenticator was found. Use the documented recovery process before changing factors.',
  MFA_REPLACEMENT_FACTOR_INVALID: 'This authenticator replacement is no longer valid. Start again.',
  MFA_REPLACEMENT_VERIFICATION_FAILED: 'The new authenticator code could not be verified.',
  MFA_REPLACEMENT_RETIRE_FAILED: 'The new authenticator was verified, but the previous factor could not be retired. Retry the same replacement.',
  MFA_REPLACEMENT_AUDIT_UNAVAILABLE: 'The authenticator change could not be recorded safely. Retry the same replacement.',
  MFA_REPLACEMENT_UNAVAILABLE: 'Authenticator replacement is not available yet. Keep using your current factor.',
  PASSWORD_RECOVERY_REQUEST_INVALID: 'Enter a valid staff email.',
  PASSWORD_RECOVERY_PASSWORD_INVALID: 'Use matching passwords between 12 and 128 characters.',
  PASSWORD_RECOVERY_EXPIRED: 'This recovery link expired or was already used. Request a new link.',
  PASSWORD_RECOVERY_REVOCATION_UNAVAILABLE: 'The password changed, but closing every prior session could not be confirmed. Contact the owner before signing in.',
  PASSWORD_RECOVERY_UNAVAILABLE: 'Secure staff password recovery is temporarily unavailable.',
  BOT_CHALLENGE_REQUIRED: 'Complete the security check and try again.',
  SESSION_EXPIRED: 'Your admin session expired. Sign in again.',
  SESSION_REVOKED: 'This admin session is no longer valid. Sign in again.',
  MFA_REQUIRED: 'Two-factor verification is required again.',
  STAFF_ACCESS_REQUIRED: 'This account no longer has staff access.',
  ORIGIN_DENIED: 'This admin request was blocked for security.',
  INVALID_RANGE: 'Choose a supported analytics range.',
  OVERVIEW_UNAVAILABLE: 'Operational analytics are temporarily unavailable.',
  PRODUCTS_UNAVAILABLE: 'Product and stock records are temporarily unavailable.',
  PRODUCT_ADMIN_REQUIRED: 'Only an administrator can change product-master records.',
  PRODUCT_COMMAND_INVALID: 'Review the product details and enter a specific reason before saving.',
  PRODUCT_COMMAND_UNAVAILABLE: 'The product change could not be recorded safely. Refresh and try again.',
  PRODUCT_VERSION_CONFLICT: 'This product changed after you opened it. Refresh and review the latest record.',
  PRODUCT_NOT_FOUND: 'That product is no longer available. Refresh the inventory register.',
  PUBLICATION_NOT_READY: 'This product is missing required content, price, photo, or human-review evidence.',
  PUBLICATION_TRANSITION_INVALID: 'That publication change is not allowed from the product’s current state.',
  FULFILLMENT_UNAVAILABLE: 'Fulfillment records are temporarily unavailable.',
  FULFILLMENT_COMMAND_UNAVAILABLE: 'That operation could not be completed safely. Refresh and try again.',
  IDEMPOTENCY_KEY_REQUIRED: 'A secure operation key could not be created. Refresh and try again.',
  IDEMPOTENCY_CONFLICT: 'This operation key was already used for different details. Refresh and try again.',
  COMMAND_IN_PROGRESS: 'That operation is still being recorded. Wait a moment, then refresh.',
  RATE_LIMITED: 'Too many operations were attempted. Wait a minute, then try again.',
  INBOX_UNAVAILABLE: 'Inbox records are temporarily unavailable.',
  INBOX_HISTORY_UNAVAILABLE: 'Conversation history is temporarily unavailable.',
  INBOX_COMMAND_UNAVAILABLE: 'That inbox operation could not be completed safely. Refresh and try again.',
  PASABUY_UNAVAILABLE: 'Pasabuy records are temporarily unavailable.',
  PASABUY_COMMAND_UNAVAILABLE: 'That Pasabuy operation could not be completed safely. Refresh and try again.',
  INTAKE_UNAVAILABLE: 'Product intake is temporarily unavailable.',
  INTAKE_DUPLICATES_UNAVAILABLE: 'The duplicate check could not be completed safely.',
  INTAKE_CONSIGNMENTS_UNAVAILABLE: 'Open Italy flights could not be loaded.',
  INTAKE_COMMAND_UNAVAILABLE: 'That intake operation could not be completed safely. Refresh and try again.',
  EVIDENCE_FILE_INVALID: 'Use one valid JPEG, PNG, or WebP image between 100px and 12,000px, no larger than 4 MB.',
  EVIDENCE_UPLOAD_UNAVAILABLE: 'The evidence photo could not be securely uploaded. Try again.',
  EVIDENCE_REGISTER_UNAVAILABLE: 'The uploaded evidence could not be registered safely. Try again before continuing.',
  EVIDENCE_CLEANUP_PENDING: 'The unregistered private file is queued for cleanup. Retry cleanup before selecting the photo again.',
  EVIDENCE_CLEANUP_UNTRACKED: 'The unregistered private file could not be scheduled for cleanup. Stop intake and ask an administrator to review Storage.',
  EVIDENCE_CLEANUP_INVALID: 'This cleanup record changed or is no longer available. Refresh the intake session.',
  EVIDENCE_CLEANUP_UNAVAILABLE: 'Private-file cleanup is temporarily unavailable. Keep this intake open and try again.',
  PRODUCT_MEDIA_FILE_INVALID: 'Use one valid JPEG, PNG, or WebP image between 100px and 12,000px, no larger than 4 MB.',
  PRODUCT_MEDIA_UPLOAD_UNAVAILABLE: 'The product photo could not be securely uploaded. Try again.',
  PRODUCT_MEDIA_REGISTER_UNAVAILABLE: 'The uploaded product photo could not be registered safely. Retry before saving.',
  PRODUCT_MEDIA_ASSIGNMENT_INVALID: 'One or more photos are not verified for this product. Remove them and upload again.',
  PRODUCT_MEDIA_ASSIGNMENT_UNAVAILABLE: 'The product photos could not be saved safely. Your selections are preserved; try again.',
  PRODUCT_MEDIA_PRIMARY_REQUIRED: 'A published product must keep a primary photo. Add one before saving.',
  PRODUCT_MEDIA_ADMIN_REQUIRED: 'Only an administrator can review or remove unused product-photo files.',
  PRODUCT_MEDIA_ORPHAN_RANGE_INVALID: 'Choose an unused-file age between 1 hour and 7 days.',
  PRODUCT_MEDIA_ORPHAN_REVIEW_UNAVAILABLE: 'Unused product-photo files could not be reviewed safely. Try again.',
  PRODUCT_MEDIA_ORPHAN_INVALID: 'Choose only the unused product-photo files shown in the current review.',
  PRODUCT_MEDIA_ORPHAN_CHANGED: 'One or more files changed or became referenced. Refresh the review before retrying.',
  PRODUCT_MEDIA_ORPHAN_CLEANUP_UNAVAILABLE: 'Unused product-photo cleanup could not be completed safely. Try again.',
  GLOBE_REVIEW_ADMIN_REQUIRED: 'Only an administrator can change public Globe or review claims.',
  GLOBE_REVIEW_UNAVAILABLE: 'Globe and review records are temporarily unavailable.',
  GLOBE_REVIEW_INVALID: 'Review the Globe or testimonial details and evidence before saving.',
  GLOBE_REVIEW_STALE: 'This record changed after it was opened. Refresh and review the latest version.',
  REVIEW_EVIDENCE_REQUIRED: 'Publication requires attributable source and rights evidence.',
  GLOBE_REVIEW_NOT_FOUND: 'That Globe or review record is no longer available.',
  GLOBE_REVIEW_COMMAND_UNAVAILABLE: 'The Globe or review change could not be recorded safely. Try again.',
  PROCUREMENT_UNAVAILABLE: 'Supplier and purchase-order records are temporarily unavailable.',
  PROCUREMENT_COMMAND_UNAVAILABLE: 'The supplier could not be recorded safely. Try again.',
  SUPPLIER_ADMIN_REQUIRED: 'Only an administrator can add a supplier.',
  SUPPLIER_INVALID: 'Review the supplier name, email, lead time, and reason.',
  SUPPLIER_DUPLICATE: 'A supplier with that name already exists. Review the existing record.',
  CHANNEL_READINESS_UNAVAILABLE: 'Channel evidence is temporarily unavailable.',
  CHANNEL_COMMAND_UNAVAILABLE: 'The channel verification could not be recorded safely. Try again.',
  CHANNEL_ADMIN_REQUIRED: 'Only an administrator can verify an internal channel event.',
  CHANNEL_VERIFICATION_INVALID: 'Review the request reference and reconciliation reason.',
  CHANNEL_REFERENCE_NOT_FOUND: 'That public request reference was not found in the matching channel.',
  CHANNEL_NOT_FOUND: 'That internal channel record is not available.',
  STAFF_ACCESS_UNAVAILABLE: 'Staff access records are temporarily unavailable.',
  STAFF_ACCESS_COMMAND_UNAVAILABLE: 'The staff access change could not be recorded safely. Try again.',
  STAFF_ACCESS_ADMIN_REQUIRED: 'Only an administrator can manage staff access.',
  STAFF_ACCESS_INVALID: 'Review the staff access details and required reason.',
  STAFF_PROFILE_NOT_FOUND: 'That staff profile is no longer available.',
  STAFF_ROLE_UNCHANGED: 'That person already has the selected role.',
  FINAL_ADMIN_REQUIRED: 'The final administrator cannot be demoted.',
  STAFF_INVITATION_INVALID: 'Review the email, role, and required invitation reason.',
  STAFF_INVITATION_UNAVAILABLE: 'The staff invitation could not be completed safely. Refresh and try again.',
  SYSTEM_READINESS_UNAVAILABLE: 'Protected readiness checks are temporarily unavailable.',
  SYSTEM_READINESS_ADMIN_REQUIRED: 'Only an administrator can review system readiness.',
  CONSIGNMENTS_UNAVAILABLE: 'Flight and consignment records are temporarily unavailable.',
  CONSIGNMENT_COMMAND_UNAVAILABLE: 'That consignment operation could not be completed safely. Refresh and try again.',
  SCAN_CODE_MISMATCH: 'That barcode does not belong to the selected manifest line. No unit was counted.',
  LOTS_UNAVAILABLE: 'Inventory lots and expiry records are temporarily unavailable.',
  LOT_COMMAND_UNAVAILABLE: 'That inventory change could not be completed safely. Refresh and try again.',
  LOT_RESERVED_CONFLICT: 'The quantity cannot be lower than units already reserved for orders.',
  CLEARANCE_INELIGIBLE: 'Clearance is allowed only for an eligible 31–89 day lot that is not damaged or otherwise disposed.',
  COUPONS_UNAVAILABLE: 'Coupon records are temporarily unavailable.',
  COUPON_COMMAND_UNAVAILABLE: 'That coupon change could not be completed safely. Refresh and try again.',
  COUPON_ADMIN_REQUIRED: 'Only an administrator can change coupon rules.',
  COUPON_CODE_CONFLICT: 'That coupon code already exists. Choose a different code.',
  COUPON_STATE_CONFLICT: 'That coupon can no longer move to the requested state. Refresh and review its dates and usage.',
  CUSTOMERS_UNAVAILABLE: 'Customer records are temporarily unavailable.',
  CUSTOMER_ADMIN_REQUIRED: 'Customer identity records are limited to administrators until staff capabilities are enforced.',
  WHOLESALE_INQUIRIES_UNAVAILABLE: 'Wholesale inquiries are temporarily unavailable.',
  WHOLESALE_COMMAND_UNAVAILABLE: 'That inquiry status could not be recorded safely. Refresh and try again.',
  WHOLESALE_ADMIN_REQUIRED: 'Only an administrator can review Wholesale inquiries.',
  WHOLESALE_STATUS_CONFLICT: 'This inquiry status changed. Refresh it before trying again.',
  WHOLESALE_INQUIRY_NOT_FOUND: 'That inquiry is no longer available.',
  CATALOG_EXPORT_UNAVAILABLE: 'The catalog workbook could not be prepared safely. Try again.',
  CATALOG_PREVIEW_UNAVAILABLE: 'The catalog workbook could not be reviewed safely. Try again.',
  CATALOG_COMMIT_UNAVAILABLE: 'The selected catalog rows could not be committed safely. Refresh and review before retrying.',
  CATALOG_STALE_CONFLICT: 'A selected product changed after export. Refresh the workbook and review that row again.',
  CATALOG_OPERATION_CONFLICT: 'This import operation no longer matches the reviewed file or reason. Start a new review.',
  CATALOG_CHUNK_SEQUENCE: 'This import chunk is out of sequence. Refresh the operation status before continuing.',
  CATALOG_STATUS_UNAVAILABLE: 'The import status could not be checked safely. Keep this review open and try again.',
  CATALOG_OPERATION_NOT_FOUND: 'No durable import operation was found for this identifier.',
  SECURITY_REVIEW_ADMIN_REQUIRED: 'Only an administrator can review security events.',
  SECURITY_REVIEW_RANGE_INVALID: 'Choose a security review window from 1 to 168 hours.',
  SECURITY_REVIEW_UNAVAILABLE: 'The redacted security review is temporarily unavailable.',
  SECURITY_EVENT_UNAVAILABLE: 'The security event could not be recorded.',
  SECURITY_EVENT_INVALID: 'The security event was rejected by the protected boundary.',
  CATALOG_SELECTION_INVALID: 'Select only rows currently classified as New or Changed.',
  CATALOG_NEW_SKU_MUST_BE_BLANK: 'Leave SKU blank for new products. K2 assigns the stable SKU on the server.',
  CATALOG_FILE_INVALID: 'Choose a non-empty K2 catalog CSV no larger than 512 KB.',
  CATALOG_CSV_INVALID: 'The CSV could not be parsed safely. Correct its structure and try again.',
  CATALOG_HEADERS_INVALID: 'Use the current K2 template without adding, removing, or duplicating columns.',
  CATALOG_ROW_LIMIT: 'The workbook must contain between 1 and 1,000 product rows.',
  CATALOG_CELL_TOO_LARGE: 'One or more cells exceed the 4,000-character limit.',
  REQUEST_INVALID: 'Check the entered details and try again.',
  ADMIN_SERVICE_UNAVAILABLE: 'The secure admin service is temporarily unavailable.',
  REQUEST_TIMEOUT: 'The secure admin request timed out. Refresh the record before trying again.',
}

function csrfToken() {
  const match = String(document.cookie || '').split('; ')
    .find((entry) => entry.startsWith('k2_admin_csrf='))
  return match ? decodeURIComponent(match.slice('k2_admin_csrf='.length)) : ''
}

function recoveryCsrfToken() {
  const match = String(document.cookie || '').split('; ')
    .find((entry) => entry.startsWith('k2_admin_recovery_csrf='))
  return match ? decodeURIComponent(match.slice('k2_admin_recovery_csrf='.length)) : ''
}

async function adminRequest(path, { method = 'GET', body, csrf = false, recoveryCsrf = false, idempotency = false, idempotencyKey, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (csrf) headers['X-K2-CSRF'] = csrfToken()
  if (recoveryCsrf) headers['X-K2-Recovery-CSRF'] = recoveryCsrfToken()
  if (idempotency || idempotencyKey) headers['X-K2-Idempotency-Key'] = idempotencyKey || crypto.randomUUID()
  try {
    const requestInit = {
      method, credentials: 'include', headers,
      body: body === undefined ? undefined : JSON.stringify(body), signal,
    }
    const response = method === 'GET'
      ? await fetchReadWithRetry(path, requestInit, { timeoutMs: 10000 })
      : await fetchWithTimeout(path, requestInit, 15000)
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload?.ok) {
      if (response.status === 202) {
        if (payload?.code === 'MFA_REQUIRED') return { ok: false, mfaRequired: true }
        if (payload?.code === 'MFA_ENROLLMENT_REQUIRED') return { ok: false, enrollmentRequired: true }
      }
      const code = payload?.error?.code || 'ADMIN_SERVICE_UNAVAILABLE'
      return { ok: false, code, error: ERROR_MESSAGES[code] || ERROR_MESSAGES.ADMIN_SERVICE_UNAVAILABLE }
    }
    return { ok: true, ...payload }
  } catch (error) {
    if (error?.name === 'AbortError') return { ok: false, aborted: true }
    if (isRequestTimeoutError(error)) return { ok: false, code: 'REQUEST_TIMEOUT', error: ERROR_MESSAGES.REQUEST_TIMEOUT }
    return { ok: false, code: 'ADMIN_SERVICE_UNAVAILABLE', error: ERROR_MESSAGES.ADMIN_SERVICE_UNAVAILABLE }
  }
}

export function loginAdminBff(credentials) {
  return adminRequest('/api/admin/auth/login', { method: 'POST', body: credentials })
}

export function challengeAdminMfaBff(code) {
  return adminRequest('/api/admin/auth/mfa', { method: 'POST', body: { code } })
}

export function requestAdminPasswordRecoveryBff(email, botToken) {
  return adminRequest('/api/admin/auth/password-recovery/request', {
    method: 'POST', body: { email, botToken },
  })
}

export function completeAdminPasswordRecoveryBff(password) {
  return adminRequest('/api/admin/auth/password-recovery/complete', {
    method: 'POST', body: { password, confirmation: password }, recoveryCsrf: true,
  })
}

export function startAdminMfaEnrollmentBff() {
  return adminRequest('/api/admin/auth/mfa', { method: 'POST', body: { action: 'enroll_start' } })
}

export function verifyAdminMfaEnrollmentBff(factorId, code) {
  return adminRequest('/api/admin/auth/mfa', {
    method: 'POST', body: { action: 'enroll_verify', factorId, code },
  })
}

export function startAdminMfaReplacementBff(reason, replacementId) {
  return adminRequest('/api/admin/staff-access/mfa-replacement', {
    method: 'POST', body: { action: 'start', reason }, csrf: true,
    idempotency: false, idempotencyKey: replacementId,
  })
}

export function completeAdminMfaReplacementBff(replacement, code) {
  return adminRequest('/api/admin/staff-access/mfa-replacement', {
    method: 'POST', csrf: true, idempotency: false,
    idempotencyKey: replacement.replacementId,
    body: {
      action: 'complete', replacementId: replacement.replacementId,
      previousFactorId: replacement.previousFactorId, factorId: replacement.factorId,
      code, reason: replacement.reason, confirmation: 'replace_active_factor',
    },
  })
}

export function getAdminSessionBff(signal) {
  return adminRequest('/api/admin/session', { signal })
}

export function logoutAdminBff() {
  return adminRequest('/api/admin/auth/logout', { method: 'POST', body: {}, csrf: true })
}

export async function getAdminOverview(range, signal) {
  const result = await adminRequest(`/api/admin/overview?range=${encodeURIComponent(range)}`, { signal })
  if (!result.ok && result.code === 'ADMIN_SERVICE_UNAVAILABLE') {
    return { ...result, code: 'OVERVIEW_UNAVAILABLE', error: ERROR_MESSAGES.OVERVIEW_UNAVAILABLE }
  }
  return result
}

export function getAdminProducts(signal) {
  return adminRequest('/api/admin/products', { signal })
}

export function getAdminFulfillment(signal) {
  return adminRequest('/api/admin/fulfillment', { signal })
}

function fulfillmentCommand(path, body) {
  return adminRequest(boundedAdminCommandRoute('fulfillment', path), {
    method: 'POST', body, csrf: true, idempotency: true,
  })
}

export const confirmOrderBff = (orderRequestId, reason) => fulfillmentCommand('confirm', { orderRequestId, reason })
export const recordPackingScanBff = (orderRequestId, scannedCode) => fulfillmentCommand('packing-scan', { orderRequestId, scannedCode })
export const updatePaymentBff = (orderRequestId, toStatus, evidenceNote) => fulfillmentCommand('payment', { orderRequestId, toStatus, evidenceNote })
export const updateDeliveryBff = (payload) => fulfillmentCommand('delivery', payload)
export const fulfillOrderBff = (orderRequestId, handoverNote) => fulfillmentCommand('fulfill', { orderRequestId, handoverNote })
export const transferLotBff = (payload) => fulfillmentCommand('transfer-lot', payload)
export const assignBoxBff = (boxCode, toCustodian, reason) => fulfillmentCommand('assign-box', { boxCode, toCustodian, reason })

export function getAdminInbox(signal) {
  return adminRequest('/api/admin/inbox', { signal })
}

export function getAdminInboxHistory(conversationId, signal) {
  return adminRequest(`/api/admin/inbox/history?conversationId=${encodeURIComponent(conversationId)}`, { signal })
}

function inboxCommand(path, body) {
  return adminRequest(boundedAdminCommandRoute('inbox', path), {
    method: 'POST', body, csrf: true, idempotency: true,
  })
}

export const saveInternalNoteBff = (conversationId, content) => inboxCommand('internal-note', { conversationId, content })
export const markConversationReadBff = (conversationId) => inboxCommand('mark-read', { conversationId })
export const updateConversationWorkflowBff = (payload) => inboxCommand('workflow', payload)

export function getAdminPasabuy(signal) {
  return adminRequest('/api/admin/pasabuy', { signal })
}

function pasabuyCommand(path, body) {
  return adminRequest(boundedAdminCommandRoute('pasabuy', path), {
    method: 'POST', body, csrf: true, idempotency: true,
  })
}

export const transitionPasabuyBff = (requestId, toStatus, reason) => pasabuyCommand('transition', { requestId, toStatus, reason })
export const savePasabuyQuoteBff = (payload) => pasabuyCommand('quote', payload)

export function getProductIntakeSessionBff(sessionId, signal) {
  return adminRequest(`/api/admin/product-intake/session?sessionId=${encodeURIComponent(sessionId || '')}`, { signal })
}

export function searchProductIntakeDuplicatesBff(query, signal) {
  return adminRequest(`/api/admin/product-intake/duplicates?query=${encodeURIComponent(query)}`, { signal })
}

export function listProductIntakeConsignmentsBff(signal) {
  return adminRequest('/api/admin/product-intake/consignments', { signal })
}

function intakeCommand(path, body) {
  return adminRequest(boundedAdminCommandRoute('product-intake', path), {
    method: 'POST', body, csrf: true, idempotency: true,
  })
}

export const createProductIntakeSessionBff = (payload) => intakeCommand('session', payload)
export const saveProductIntakeStepBff = (payload) => intakeCommand('step', payload)
export const createProductDraftBff = (payload) => intakeCommand('draft', payload)
export const createProductFirstInventoryBff = (payload) => intakeCommand('inventory', payload)
export const transitionProductPublicationBff = (payload) => intakeCommand('publication', payload)

export async function uploadProductEvidenceBff(sessionId, slot, file) {
  const headers = {
    Accept: 'application/json', 'Content-Type': file.type,
    'X-K2-CSRF': csrfToken(), 'X-K2-Idempotency-Key': crypto.randomUUID(),
    'X-K2-Intake-Session': sessionId, 'X-K2-Evidence-Slot': slot,
    'X-K2-File-Name': String(file.name || 'evidence-image').slice(0, 120),
  }
  try {
    const response = await fetchWithTimeout('/api/admin/product-intake/evidence', {
      method: 'POST', credentials: 'include', headers, body: file,
    }, 30000)
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload?.ok) {
      const code = payload?.error?.code || 'EVIDENCE_UPLOAD_UNAVAILABLE'
      return {
        ok: false, code, cleanupId: payload?.cleanupId || null,
        error: ERROR_MESSAGES[code] || ERROR_MESSAGES.EVIDENCE_UPLOAD_UNAVAILABLE,
      }
    }
    return { ok: true, ...payload }
  } catch (error) {
    if (isRequestTimeoutError(error)) return { ok: false, code: 'REQUEST_TIMEOUT', error: ERROR_MESSAGES.REQUEST_TIMEOUT }
    return { ok: false, code: 'EVIDENCE_UPLOAD_UNAVAILABLE', error: ERROR_MESSAGES.EVIDENCE_UPLOAD_UNAVAILABLE }
  }
}

export function getAdminConsignments(signal) {
  return adminRequest('/api/admin/consignments', { signal })
}

function consignmentCommand(path, body, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('consignments', path), {
    method: 'POST', body, csrf: true, idempotency: !idempotencyKey, idempotencyKey,
  })
}

export const createConsignmentBff = (payload, key) => consignmentCommand('create', payload, key)
export const addConsignmentLineBff = (payload, key) => consignmentCommand('add-line', payload, key)
export const recordConsignmentScanBff = (payload, key) => consignmentCommand('scan', payload, key)
export const advanceConsignmentBff = (payload, key) => consignmentCommand('advance', payload, key)
export const finalizeConsignmentBff = (payload, key) => consignmentCommand('finalize', payload, key)

export function getAdminLots(sku = '', signal) {
  return adminRequest(`/api/admin/lots?sku=${encodeURIComponent(sku)}`, { signal })
}

function lotCommand(path, body, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('lots', path), {
    method: 'POST', body, csrf: true, idempotency: !idempotencyKey, idempotencyKey,
  })
}

export const reconcileLotsBff = (payload, key) => lotCommand('reconcile', payload, key)
export const setLotClearanceBff = (payload, key) => lotCommand('clearance', payload, key)

export function getAdminCoupons(signal) {
  return adminRequest('/api/admin/coupons', { signal })
}

function couponCommand(path, body, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('coupons', path), {
    method: 'POST', body, csrf: true, idempotency: !idempotencyKey, idempotencyKey,
  })
}

export const createCouponBff = (payload, key) => couponCommand('create', payload, key)
export const setCouponStateBff = (payload, key) => couponCommand('state', payload, key)
export const archiveCouponBff = (payload, key) => couponCommand('archive', payload, key)

export function getAdminCustomers(signal) {
  return adminRequest('/api/admin/customers', { signal })
}

export function retryProductEvidenceCleanupBff(cleanupId, idempotencyKey = crypto.randomUUID()) {
  return adminRequest('/api/admin/product-intake/evidence-cleanup', {
    method: 'POST', body: { cleanupId }, csrf: true, idempotencyKey,
  })
}

export async function uploadProductMediaBff(file, idempotencyKey = crypto.randomUUID()) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': file.type,
    'X-K2-CSRF': csrfToken(),
    'X-K2-Idempotency-Key': idempotencyKey,
  }
  try {
    const response = await fetchWithTimeout('/api/admin/product-media', {
      method: 'POST', credentials: 'include', headers, body: file,
    }, 30000)
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload?.ok || !payload?.media?.publicUrl) {
      const code = payload?.error?.code || 'PRODUCT_MEDIA_UPLOAD_UNAVAILABLE'
      return { ok: false, code, error: ERROR_MESSAGES[code] || ERROR_MESSAGES.PRODUCT_MEDIA_UPLOAD_UNAVAILABLE }
    }
    return { ok: true, ...payload }
  } catch (error) {
    if (isRequestTimeoutError(error)) return { ok: false, code: 'REQUEST_TIMEOUT', error: ERROR_MESSAGES.REQUEST_TIMEOUT }
    return { ok: false, code: 'PRODUCT_MEDIA_UPLOAD_UNAVAILABLE', error: ERROR_MESSAGES.PRODUCT_MEDIA_UPLOAD_UNAVAILABLE }
  }
}

export function assignProductMediaBff(payload, idempotencyKey = crypto.randomUUID()) {
  return adminRequest('/api/admin/product-media/assign', {
    method: 'POST', body: payload, csrf: true, idempotency: false, idempotencyKey,
  })
}

export function getProductMediaOrphansBff(minimumAgeMinutes = 60, signal) {
  return adminRequest(`/api/admin/product-media/orphans?minimumAgeMinutes=${encodeURIComponent(minimumAgeMinutes)}`, { signal })
}

export function cleanupProductMediaOrphansBff(payload, idempotencyKey = crypto.randomUUID()) {
  return adminRequest('/api/admin/product-media/orphans', {
    method: 'POST', body: payload, csrf: true, idempotency: false, idempotencyKey,
  })
}

export function getAdminGlobeCmsBff(signal) {
  return adminRequest('/api/admin/globe-cms', { signal })
}

export function commandAdminGlobeCmsBff(action, payload, idempotencyKey = crypto.randomUUID()) {
  return adminRequest('/api/admin/globe-cms', {
    method: 'POST', body: { action, payload }, csrf: true, idempotency: false, idempotencyKey,
  })
}

export function getAdminProcurementBff(signal) {
  return adminRequest('/api/admin/procurement', { signal })
}

export function getAdminProductMasterBff(sku, signal) {
  return adminRequest(`/api/admin/product-master?sku=${encodeURIComponent(sku)}`, { signal })
}

export function commandAdminProductMasterBff(action, payload, idempotencyKey = crypto.randomUUID()) {
  return adminRequest('/api/admin/product-master', {
    method: 'POST', body: { action, payload }, csrf: true, idempotency: false, idempotencyKey,
  })
}

export function createSupplierBff(payload, idempotencyKey = crypto.randomUUID()) {
  return adminRequest('/api/admin/procurement', {
    method: 'POST', body: payload, csrf: true, idempotency: false, idempotencyKey,
  })
}

export function getAdminChannelsBff(signal) {
  return adminRequest('/api/admin/channels', { signal })
}

export function verifyInternalChannelBff(payload, idempotencyKey = crypto.randomUUID()) {
  return adminRequest('/api/admin/channels', {
    method: 'POST', body: payload, csrf: true, idempotency: false, idempotencyKey,
  })
}

export function getAdminStaffAccessBff(signal) {
  return adminRequest('/api/admin/staff-access', { signal })
}

export function commandAdminStaffAccessBff(action, payload, idempotencyKey = crypto.randomUUID()) {
  return adminRequest('/api/admin/staff-access', {
    method: 'POST', body: { action, payload }, csrf: true, idempotency: false, idempotencyKey,
  })
}

export function inviteAdminStaffBff(email, role, reason, idempotencyKey = crypto.randomUUID()) {
  return adminRequest('/api/admin/staff-access/invite', {
    method: 'POST', body: { email, role, reason }, csrf: true, idempotency: false, idempotencyKey,
  })
}

export function getAdminSystemReadinessBff(signal) {
  return adminRequest('/api/admin/system-readiness', { signal })
}

export function getAdminWholesaleInquiries(signal) {
  return adminRequest('/api/admin/wholesale-inquiries', { signal })
}

export function reviewAdminWholesaleInquiry(inquiryReference,toStatus,reason) {
  return adminRequest(boundedAdminCommandRoute('wholesale-inquiries','review'), {
    method:'POST',body:{inquiryReference,toStatus,reason},csrf:true,idempotency:true,
  })
}

export async function downloadCatalogCsvBff(signal) {
  try {
    const response = await fetchReadWithRetry('/api/admin/catalog-export', {
      method: 'GET', credentials: 'include', headers: { Accept: 'text/csv' }, signal,
    }, { timeoutMs: 10000 })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      const code = payload?.error?.code || 'CATALOG_EXPORT_UNAVAILABLE'
      return { ok: false, code, error: ERROR_MESSAGES[code] || ERROR_MESSAGES.CATALOG_EXPORT_UNAVAILABLE }
    }
    return { ok: true, csvText: await response.text() }
  } catch (error) {
    if (error?.name === 'AbortError') return { ok: false, aborted: true }
    const code = isRequestTimeoutError(error) ? 'REQUEST_TIMEOUT' : 'CATALOG_EXPORT_UNAVAILABLE'
    return { ok: false, code, error: ERROR_MESSAGES[code] }
  }
}

export function previewCatalogCsvBff(csvText) {
  return adminRequest('/api/admin/catalog-import/preview', {
    method: 'POST', body: { csvText }, csrf: true, idempotency: true,
  })
}

export function commitCatalogCsvBff(payload, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('catalog-import', 'commit'), {
    method: 'POST', body: payload, csrf: true, idempotency: !idempotencyKey, idempotencyKey,
  })
}

export function getCatalogImportStatusBff(operationId, signal) {
  return adminRequest(`/api/admin/catalog-import/status?operationId=${encodeURIComponent(operationId)}`, { signal })
}

export function getSecurityReviewBff(hours = 24, signal) {
  return adminRequest(`/api/admin/security-events?hours=${encodeURIComponent(hours)}`, { signal })
}

export function reportBrowserSecurityEventBff(code, kind, idempotencyKey = crypto.randomUUID()) {
  return adminRequest('/api/admin/security-events', {
    method: 'POST', body: { code, kind }, csrf: true, idempotencyKey,
  })
}
