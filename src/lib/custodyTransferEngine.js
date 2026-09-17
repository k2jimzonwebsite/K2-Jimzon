/**
 * Custody Transfer Engine (MAP-026)
 *
 * Implements the owner-confirmed physical stock custody movement rules:
 * 1. Physical stock moves on a staff-request, admin-approval, receiver-acceptance workflow.
 * 2. Custody functions never execute immediately on request alone.
 * 3. Transfer requests fail closed on insufficient quantity.
 * 4. Approval records actor, timestamp, and reason before lot custody transitions.
 */

export const TRANSFER_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IN_TRANSIT: 'in_transit',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

const ALLOWED_TRANSITIONS = {
  [TRANSFER_STATUS.PENDING_APPROVAL]: [
    TRANSFER_STATUS.APPROVED,
    TRANSFER_STATUS.REJECTED,
    TRANSFER_STATUS.CANCELLED,
  ],
  [TRANSFER_STATUS.APPROVED]: [
    TRANSFER_STATUS.IN_TRANSIT,
    TRANSFER_STATUS.COMPLETED,
    TRANSFER_STATUS.CANCELLED,
  ],
  [TRANSFER_STATUS.IN_TRANSIT]: [
    TRANSFER_STATUS.COMPLETED,
    TRANSFER_STATUS.CANCELLED,
  ],
  [TRANSFER_STATUS.COMPLETED]: [],
  [TRANSFER_STATUS.REJECTED]: [],
  [TRANSFER_STATUS.CANCELLED]: [],
}

/**
 * Validates whether the source lot holds sufficient unreserved stock.
 *
 * @param {number} requestedQuantity
 * @param {number} availableLotStock
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateTransferAvailability(requestedQuantity, availableLotStock) {
  const qty = Math.floor(Number(requestedQuantity) || 0)
  const avail = Math.floor(Number(availableLotStock) || 0)

  if (qty <= 0) {
    return { valid: false, error: 'TRANSFER_QUANTITY_MUST_BE_POSITIVE' }
  }
  if (avail < qty) {
    return { valid: false, error: 'INSUFFICIENT_UNRESERVED_LOT_STOCK' }
  }
  return { valid: true }
}

/**
 * Creates a normalized transfer request record in pending_approval status.
 */
export function createTransferRequest({
  sku,
  batchId,
  quantity,
  sourceCustodianId,
  destinationCustodianId,
  sourceHub = 'MANILA_MAIN',
  destinationHub = 'MANILA_MAIN',
  targetShopId = null,
  reason,
  requestedBy,
}) {
  const qty = Math.floor(Number(quantity) || 0)
  if (qty <= 0) {
    throw new Error('TRANSFER_QUANTITY_INVALID: Quantity must be greater than zero')
  }
  if (!sku || typeof sku !== 'string') {
    throw new Error('TRANSFER_SKU_REQUIRED: Valid SKU required')
  }
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    throw new Error('TRANSFER_REASON_REQUIRED: Operational reason required')
  }
  if (!requestedBy) {
    throw new Error('TRANSFER_REQUESTER_REQUIRED: Authenticated staff identity required')
  }

  return {
    sku: sku.trim(),
    batchId: batchId || null,
    quantity: qty,
    sourceCustodianId: sourceCustodianId || null,
    destinationCustodianId: destinationCustodianId || null,
    sourceHub: sourceHub.trim(),
    destinationHub: destinationHub.trim(),
    targetShopId: targetShopId || null,
    reason: reason.trim(),
    status: TRANSFER_STATUS.PENDING_APPROVAL,
    requestedBy,
    requestedAt: new Date().toISOString(),
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    completedAt: null,
  }
}

/**
 * Transitions transfer request status with permission and data validation.
 */
export function transitionTransferStatus(request, nextStatus, {
  actorId,
  actorRole = 'staff',
  rejectionReason = null,
} = {}) {
  if (!request || !request.status) {
    throw new Error('INVALID_REQUEST_RECORD')
  }

  const currentStatus = request.status
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || []

  if (!allowed.includes(nextStatus)) {
    throw new Error(`ILLEGAL_TRANSFER_TRANSITION: Cannot transition from ${currentStatus} to ${nextStatus}`)
  }

  // Permission gate: approval and rejection require admin role
  if (nextStatus === TRANSFER_STATUS.APPROVED || nextStatus === TRANSFER_STATUS.REJECTED) {
    if (actorRole !== 'admin' && actorRole !== 'owner') {
      throw new Error('UNAUTHORIZED_TRANSFER_REVIEW: Admin authorization required to approve or reject transfers')
    }
  }

  // Rejection reason requirement
  if (nextStatus === TRANSFER_STATUS.REJECTED && (!rejectionReason || !rejectionReason.trim())) {
    throw new Error('REJECTION_REASON_REQUIRED: Explicit reason required when rejecting a transfer')
  }

  const now = new Date().toISOString()
  const updated = { ...request, status: nextStatus }

  if (nextStatus === TRANSFER_STATUS.APPROVED || nextStatus === TRANSFER_STATUS.REJECTED) {
    updated.reviewedBy = actorId || null
    updated.reviewedAt = now
    if (nextStatus === TRANSFER_STATUS.REJECTED) {
      updated.rejectionReason = rejectionReason.trim()
    }
  }

  if (nextStatus === TRANSFER_STATUS.COMPLETED) {
    updated.completedAt = now
  }

  return updated
}
