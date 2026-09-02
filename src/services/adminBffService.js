import { fetchReadWithRetry, fetchWithTimeout, isRequestTimeoutError } from '../lib/fetchWithTimeout.js'

export function adminBffEnabled() {
  return String(import.meta.env.VITE_ADMIN_BFF_ENABLED || '').toLowerCase() === 'true'
}

const ADMIN_COMMAND_ROUTES = Object.freeze({
  fulfillment: new Set(['confirm', 'packing-scan', 'payment', 'delivery', 'fulfill', 'transfer-lot', 'assign-box']),
  inbox: new Set(['internal-note', 'send-reply', 'mark-read', 'workflow']),
  pasabuy: new Set(['transition', 'quote']),
  'product-intake': new Set(['session', 'step', 'draft', 'inventory', 'publication']),
  'product-knowledge': new Set(['save']),
  consignments: new Set(['create', 'add-line', 'scan', 'advance', 'finalize']),
  lots: new Set(['reconcile', 'clearance']),
  coupons: new Set(['create', 'state', 'archive']),
  delivery: new Set(['quote', 'courier', 'courier-state', 'locality', 'cost-publish', 'source-state']),
  'catalog-import': new Set(['commit']),
  'marketplace-snapshots': new Set(['stage', 'decision']),
  'marketplace-orders': new Set(['stage']),
  'owner-close': new Set(['session', 'coverage', 'fees', 'stock', 'pasabuy', 'bookkeeping']),
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
  DELIVERY_CONTROL_UNAVAILABLE: 'Delivery rate control is temporarily unavailable.',
  DELIVERY_COMMAND_UNAVAILABLE: 'The delivery rule could not be saved safely. Retry the same change.',
  DELIVERY_ADMIN_REQUIRED: 'Only an administrator can change what a customer is charged for delivery.',
  DELIVERY_EFFECTIVE_IN_PAST: 'A rate can only take effect today or later. Past orders keep the rate they were quoted.',
  DELIVERY_COST_ID_TAKEN: 'That rate identifier already exists. Use a new one; published rates are never edited in place.',
  DELIVERY_REFERENCE_MISSING: 'This rule points at a courier, locality, or source that does not exist.',
  DELIVERY_RULE_CONFLICT: 'Another active rule already covers this route. Resolve the overlap before saving.',
  DELIVERY_RULE_REJECTED: 'The delivery rules refused this change. Check the pilot scope and approval flags.',
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
  AI_SPEND_CONTROLS_UNAVAILABLE: 'Paid AI spending controls are not active yet. Use the manual two-Project workflow.',
  AI_SPEND_SUPER_ADMIN_REQUIRED: 'Only a SuperAdmin can change paid AI spending controls.',
  AI_SPEND_CONTROLS_INVALID: 'Review the provider/model and budget values, then try again.',
  AI_SPEND_CONTROLS_LIMIT_REQUIRED: 'Enabling paid AI requires a provider/model and all three hard caps.',
  AI_SPEND_CONTROLS_CONFIRMATION_REQUIRED: 'Type ENABLE_PAID_AI to deliberately enable paid AI.',
  AI_SPEND_CONTROLS_VERSION_CONFLICT: 'These controls changed in another session. Refresh and review the latest version.',
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
  MARKETPLACE_SNAPSHOT_FILE_INVALID: 'Choose a non-empty marketplace CSV no larger than 512 KB.',
  MARKETPLACE_SNAPSHOT_CSV_INVALID: 'The marketplace CSV could not be parsed safely. Correct it and try again.',
  MARKETPLACE_SNAPSHOT_HEADERS_INVALID: 'Use the exact current marketplace snapshot template without changing its columns.',
  MARKETPLACE_SNAPSHOT_ROW_LIMIT: 'The marketplace snapshot must contain between 1 and 1,000 rows.',
  MARKETPLACE_SNAPSHOT_CELL_TOO_LARGE: 'One or more marketplace cells exceed the 4,000-character limit.',
  MARKETPLACE_SNAPSHOT_ROW_INVALID: 'One or more marketplace rows contain invalid or out-of-bound evidence.',
  MARKETPLACE_SNAPSHOT_FORMULA_BLOCKED: 'Remove spreadsheet formulas from the marketplace export before importing.',
  MARKETPLACE_SHOP_INVALID: 'Choose an exact shop that belongs to the selected marketplace.',
  MARKETPLACE_SNAPSHOT_CONFLICT: 'This shop export identity already exists with different contents. Keep both files and review the conflict.',
  MARKETPLACE_VARIANT_CONFLICT: 'That product suggestion conflicts on variant attributes and cannot be linked.',
  MARKETPLACE_DECISION_CONFLICT: 'This row was already decided or changed. Refresh the staged import.',
  MARKETPLACE_ROW_NOT_FOUND: 'That staged row no longer exists. Refresh the import.',
  MARKETPLACE_SNAPSHOT_NOT_FOUND: 'No staged import was found for that identifier.',
  MARKETPLACE_SNAPSHOT_UNAVAILABLE: 'Marketplace snapshot evidence is temporarily unavailable. Keep the file and try again.',
  MARKETPLACE_ORDER_FILE_INVALID: 'Choose one non-empty marketplace order CSV no larger than 512 KB.',
  MARKETPLACE_ORDER_CSV_INVALID: 'The marketplace order CSV could not be parsed safely.',
  MARKETPLACE_ORDER_HEADERS_INVALID: 'Use the exact current marketplace order template without changing its columns.',
  MARKETPLACE_ORDER_ROW_LIMIT: 'The marketplace order export can contain at most 5,000 rows. A header-only export is valid zero-sales evidence.',
  MARKETPLACE_ORDER_CELL_TOO_LARGE: 'One or more marketplace order cells exceed the 4,000-character limit.',
  MARKETPLACE_ORDER_FORMULA_BLOCKED: 'Remove spreadsheet formulas from the marketplace order export before importing.',
  MARKETPLACE_ORDER_FACT_INVALID: 'One or more marketplace order rows contain invalid or out-of-period evidence.',
  MARKETPLACE_ORDER_IMPORT_CONFLICT: 'This shop order-export identity already exists with different contents. Preserve both files and investigate.',
  MARKETPLACE_ORDER_IMPORT_NOT_FOUND: 'No staged marketplace order import was found for that identifier.',
  MARKETPLACE_ORDER_IMPORT_UNAVAILABLE: 'Marketplace order staging is temporarily unavailable. Keep the source file and try again.',
  MARKETPLACE_COVERAGE_UNAVAILABLE: 'The exact-shop coverage proposal is temporarily unavailable.',
  MARKETPLACE_COVERAGE_OVERRIDE_INVALID: 'Choose one exact shop and product, then enter a specific include or skip reason.',
  MARKETPLACE_FEE_POLICY_INVALID: 'Review the named policy, rates, currency, fixed fee, and reason before saving.',
  MARKETPLACE_FEE_FACTS_BLOCKED: 'Resolve changed order conflicts and unknown product links for this exact shop before estimating fees.',
  MARKETPLACE_FEE_FACTS_INVALID: 'Stage and reconcile an order export for this exact shop before estimating fees.',
  MARKETPLACE_FEE_UNAVAILABLE: 'Marketplace fee estimates are temporarily unavailable. Keep the reviewed policy evidence and try again.',
  OWNER_CLOSE_STOCK_UNAVAILABLE: 'Canonical lot and marketplace observation evidence could not be loaded. Try again before counting.',
  OWNER_CLOSE_STOCK_REVIEW_INVALID: 'Review every exact-lot count and enter a specific count reason.',
  OWNER_CLOSE_STOCK_NOT_RECONCILED: 'Canonical lots do not yet equal the physical count. Retry the protected lot reconciliation before recording this review.',
  OWNER_CLOSE_SESSION_INVALID: 'Review the period, exact shops, step, and reason before saving.',
  OWNER_CLOSE_VERSION_CONFLICT: 'This close session changed in another session. Refresh before saving again.',
  OWNER_CLOSE_SESSION_NOT_FOUND: 'No saved close session was found for that identifier.',
  OWNER_CLOSE_SESSION_UNAVAILABLE: 'Owner Count & Close is temporarily unavailable. Keep this page open and try again.',
  ADMIN_REQUIRED: 'Only an administrator can approve marketplace matches or save Owner Count & Close.',
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
export const sendWebsiteReplyBff = (conversationId, content) => inboxCommand('send-reply', { conversationId, content })
export const markConversationReadBff = (conversationId) => inboxCommand('mark-read', { conversationId })
export const updateConversationWorkflowBff = (payload) => inboxCommand('workflow', payload)

/**
 * Publish a product's reviewed knowledge.
 *
 * One call carries the whole record for a SKU, matching the command: the
 * Studio reviews a product's fields and FAQs together, so saving them together
 * keeps what staff approved and what got stored the same thing.
 */
export const saveProductKnowledgeBff = (sku, fields, faqs) =>
  adminRequest(boundedAdminCommandRoute('product-knowledge', 'save'), {
    method: 'POST', body: { sku, fields, faqs }, csrf: true, idempotency: true,
  })

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

export function getAdminDeliveryControlBff(signal) {
  return adminRequest('/api/admin/delivery', { signal })
}

const operationIdempotencyKey = () =>
  (typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : '')

function deliveryCommand(path, body, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('delivery', path), {
    method: 'POST', body, csrf: true, idempotency: !idempotencyKey, idempotencyKey,
  })
}

// Quoting writes nothing, but it keeps the same envelope as every other admin
// POST. A fresh key per call keeps the tester re-runnable.
export const testAdminDeliveryQuoteBff = (inputs) => deliveryCommand('quote', inputs, operationIdempotencyKey())
export const upsertDeliveryCourierBff = (payload, key) => deliveryCommand('courier', payload, key)
export const setDeliveryCourierStateBff = (payload, key) => deliveryCommand('courier-state', payload, key)
export const upsertDeliveryLocalityBff = (payload, key) => deliveryCommand('locality', payload, key)
export const publishDeliveryCostBff = (payload, key) => deliveryCommand('cost-publish', payload, key)
export const setDeliverySourceStateBff = (payload, key) => deliveryCommand('source-state', payload, key)

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

export function getOwnerCloseWorkspaceBff(sessionId, signal) {
  if (sessionId) {
    return adminRequest(`/api/admin/owner-close/session?sessionId=${encodeURIComponent(sessionId)}`, { signal })
  }
  return adminRequest('/api/admin/owner-close/session', { signal })
}

export function saveOwnerCloseSessionBff(session, reason, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('owner-close', 'session'), {
    method: 'POST', body: { session, reason }, csrf: true,
    idempotency: !idempotencyKey, idempotencyKey,
  })
}

export function getOwnerCloseCoverageBff(sessionId, signal) {
  return adminRequest(`/api/admin/owner-close/coverage?sessionId=${encodeURIComponent(sessionId)}`, { signal })
}

export function saveOwnerCloseCoverageOverrideBff(payload, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('owner-close', 'coverage'), {
    method: 'POST', body: payload, csrf: true,
    idempotency: !idempotencyKey, idempotencyKey,
  })
}

export function getOwnerCloseFeesBff(sessionId, signal) {
  return adminRequest(`/api/admin/owner-close/fees?sessionId=${encodeURIComponent(sessionId)}`, { signal })
}

export function saveOwnerCloseFeeEstimateBff(payload, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('owner-close', 'fees'), {
    method: 'POST', body: payload, csrf: true,
    idempotency: !idempotencyKey, idempotencyKey,
  })
}

export function getOwnerCloseStockBff(sessionId, signal) {
  return adminRequest(`/api/admin/owner-close/stock?sessionId=${encodeURIComponent(sessionId)}`, { signal })
}

export function saveOwnerCloseStockReviewBff(payload, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('owner-close', 'stock'), {
    method: 'POST', body: payload, csrf: true,
    idempotency: !idempotencyKey, idempotencyKey,
  })
}

export function getOwnerClosePasabuyBff(sessionId, signal) {
  return adminRequest(`/api/admin/owner-close/pasabuy?sessionId=${encodeURIComponent(sessionId)}`, { signal })
}

export function saveOwnerClosePasabuyReviewBff(payload, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('owner-close', 'pasabuy'), {
    method: 'POST', body: payload, csrf: true,
    idempotency: !idempotencyKey, idempotencyKey,
  })
}

export function getOwnerCloseBookkeepingHandoffBff(sessionId, signal) {
  return adminRequest(`/api/admin/owner-close/bookkeeping?sessionId=${encodeURIComponent(sessionId)}`, { signal })
}

export function completeOwnerCloseBookkeepingHandoffBff(payload, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('owner-close', 'bookkeeping'), {
    method: 'POST', body: payload, csrf: true,
    idempotency: !idempotencyKey, idempotencyKey,
  })
}

export function stageMarketplaceSnapshotBff(payload, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('marketplace-snapshots', 'stage'), {
    method: 'POST', body: payload, csrf: true,
    idempotency: !idempotencyKey, idempotencyKey,
  })
}

export function getMarketplaceSnapshotStatusBff(importId, signal) {
  return adminRequest(`/api/admin/marketplace-snapshots/status?importId=${encodeURIComponent(importId)}`, { signal })
}

export function decideMarketplaceSnapshotRowBff(payload, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('marketplace-snapshots', 'decision'), {
    method: 'POST', body: payload, csrf: true,
    idempotency: !idempotencyKey, idempotencyKey,
  })
}

export function stageMarketplaceOrdersBff(payload, idempotencyKey) {
  return adminRequest(boundedAdminCommandRoute('marketplace-orders', 'stage'), {
    method: 'POST', body: payload, csrf: true,
    idempotency: !idempotencyKey, idempotencyKey,
  })
}

export function getMarketplaceOrderStatusBff(importId, signal) {
  return adminRequest(`/api/admin/marketplace-orders/status?importId=${encodeURIComponent(importId)}`, { signal })
}

export function getSecurityReviewBff(hours = 24, signal) {
  return adminRequest(`/api/admin/security-events?hours=${encodeURIComponent(hours)}`, { signal })
}

export function reportBrowserSecurityEventBff(code, kind, idempotencyKey = crypto.randomUUID()) {
  return adminRequest('/api/admin/security-events', {
    method: 'POST', body: { code, kind }, csrf: true, idempotencyKey,
  })
}
