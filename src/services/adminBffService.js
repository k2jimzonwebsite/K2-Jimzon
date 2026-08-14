export function adminBffEnabled() {
  return String(import.meta.env.VITE_ADMIN_BFF_ENABLED || '').toLowerCase() === 'true'
}

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  INVALID_CREDENTIAL_FORMAT: 'Enter a valid staff email and password.',
  MFA_CODE_INVALID: 'Enter the 6-digit code from your authenticator app.',
  MFA_VERIFICATION_FAILED: 'That authenticator code could not be verified.',
  MFA_ENROLLMENT_REQUIRED: 'This staff account must enroll an authenticator before it can sign in.',
  SESSION_EXPIRED: 'Your admin session expired. Sign in again.',
  SESSION_REVOKED: 'This admin session is no longer valid. Sign in again.',
  MFA_REQUIRED: 'Two-factor verification is required again.',
  STAFF_ACCESS_REQUIRED: 'This account no longer has staff access.',
  ORIGIN_DENIED: 'This admin request was blocked for security.',
  INVALID_RANGE: 'Choose a supported analytics range.',
  OVERVIEW_UNAVAILABLE: 'Operational analytics are temporarily unavailable.',
  PRODUCTS_UNAVAILABLE: 'Product and stock records are temporarily unavailable.',
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
  EVIDENCE_FILE_INVALID: 'Use one valid JPEG, PNG, or WebP image between 100px and 12,000px, no larger than 10 MB.',
  EVIDENCE_UPLOAD_UNAVAILABLE: 'The evidence photo could not be securely uploaded. Try again.',
  EVIDENCE_REGISTER_UNAVAILABLE: 'The uploaded evidence could not be registered safely. Try again before continuing.',
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
  REQUEST_INVALID: 'Check the entered details and try again.',
  ADMIN_SERVICE_UNAVAILABLE: 'The secure admin service is temporarily unavailable.',
}

function csrfToken() {
  const match = String(document.cookie || '').split('; ')
    .find((entry) => entry.startsWith('k2_admin_csrf='))
  return match ? decodeURIComponent(match.slice('k2_admin_csrf='.length)) : ''
}

async function adminRequest(path, { method = 'GET', body, csrf = false, idempotency = false, idempotencyKey, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (csrf) headers['X-K2-CSRF'] = csrfToken()
  if (idempotency || idempotencyKey) headers['X-K2-Idempotency-Key'] = idempotencyKey || crypto.randomUUID()
  try {
    const response = await fetch(path, {
      method, credentials: 'include', headers,
      body: body === undefined ? undefined : JSON.stringify(body), signal,
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload?.ok) {
      if (response.status === 202 && payload?.code === 'MFA_REQUIRED') {
        return { ok: false, mfaRequired: true }
      }
      const code = payload?.error?.code || 'ADMIN_SERVICE_UNAVAILABLE'
      return { ok: false, code, error: ERROR_MESSAGES[code] || ERROR_MESSAGES.ADMIN_SERVICE_UNAVAILABLE }
    }
    return { ok: true, ...payload }
  } catch (error) {
    if (error?.name === 'AbortError') return { ok: false, aborted: true }
    return { ok: false, code: 'ADMIN_SERVICE_UNAVAILABLE', error: ERROR_MESSAGES.ADMIN_SERVICE_UNAVAILABLE }
  }
}

export function loginAdminBff(credentials) {
  return adminRequest('/api/admin/auth/login', { method: 'POST', body: credentials })
}

export function challengeAdminMfaBff(code) {
  return adminRequest('/api/admin/auth/mfa', { method: 'POST', body: { code } })
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
  return adminRequest(`/api/admin/fulfillment/${path}`, {
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
  return adminRequest(`/api/admin/inbox/${path}`, {
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
  return adminRequest(`/api/admin/pasabuy/${path}`, {
    method: 'POST', body, csrf: true, idempotency: true,
  })
}

export const transitionPasabuyBff = (requestId, toStatus, reason) => pasabuyCommand('transition', { requestId, toStatus, reason })
export const savePasabuyQuoteBff = (payload) => pasabuyCommand('quote', payload)

export function getProductIntakeSessionBff(sessionId, signal) {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''
  return adminRequest(`/api/admin/product-intake/session${query}`, { signal })
}

export function searchProductIntakeDuplicatesBff(query, signal) {
  return adminRequest(`/api/admin/product-intake/duplicates?query=${encodeURIComponent(query)}`, { signal })
}

export function listProductIntakeConsignmentsBff(signal) {
  return adminRequest('/api/admin/product-intake/consignments', { signal })
}

function intakeCommand(path, body) {
  return adminRequest(`/api/admin/product-intake/${path}`, {
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
    const response = await fetch('/api/admin/product-intake/evidence', {
      method: 'POST', credentials: 'include', headers, body: file,
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload?.ok) {
      const code = payload?.error?.code || 'EVIDENCE_UPLOAD_UNAVAILABLE'
      return { ok: false, code, error: ERROR_MESSAGES[code] || ERROR_MESSAGES.EVIDENCE_UPLOAD_UNAVAILABLE }
    }
    return { ok: true, ...payload }
  } catch {
    return { ok: false, code: 'EVIDENCE_UPLOAD_UNAVAILABLE', error: ERROR_MESSAGES.EVIDENCE_UPLOAD_UNAVAILABLE }
  }
}

export function getAdminConsignments(signal) {
  return adminRequest('/api/admin/consignments', { signal })
}

function consignmentCommand(path, body, idempotencyKey) {
  return adminRequest(`/api/admin/consignments/${path}`, {
    method: 'POST', body, csrf: true, idempotency: !idempotencyKey, idempotencyKey,
  })
}

export const createConsignmentBff = (payload, key) => consignmentCommand('create', payload, key)
export const addConsignmentLineBff = (payload, key) => consignmentCommand('add-line', payload, key)
export const recordConsignmentScanBff = (payload, key) => consignmentCommand('scan', payload, key)
export const advanceConsignmentBff = (payload, key) => consignmentCommand('advance', payload, key)
export const finalizeConsignmentBff = (payload, key) => consignmentCommand('finalize', payload, key)

export function getAdminLots(sku = '', signal) {
  const query = sku ? `?sku=${encodeURIComponent(sku)}` : ''
  return adminRequest(`/api/admin/lots${query}`, { signal })
}

function lotCommand(path, body, idempotencyKey) {
  return adminRequest(`/api/admin/lots/${path}`, {
    method: 'POST', body, csrf: true, idempotency: !idempotencyKey, idempotencyKey,
  })
}

export const reconcileLotsBff = (payload, key) => lotCommand('reconcile', payload, key)
export const setLotClearanceBff = (payload, key) => lotCommand('clearance', payload, key)

export function getAdminCoupons(signal) {
  return adminRequest('/api/admin/coupons', { signal })
}

function couponCommand(path, body, idempotencyKey) {
  return adminRequest(`/api/admin/coupons/${path}`, {
    method: 'POST', body, csrf: true, idempotency: !idempotencyKey, idempotencyKey,
  })
}

export const createCouponBff = (payload, key) => couponCommand('create', payload, key)
export const setCouponStateBff = (payload, key) => couponCommand('state', payload, key)
export const archiveCouponBff = (payload, key) => couponCommand('archive', payload, key)

export function getAdminCustomers(signal) {
  return adminRequest('/api/admin/customers', { signal })
}
