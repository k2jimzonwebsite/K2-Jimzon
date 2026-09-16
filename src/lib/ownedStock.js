/**
 * MAP-023 / MAP-028 I-001: Derived owned-stock read boundary.
 *
 * Implements OWNER-002 stock lifecycle reads without introducing any second
 * writable stock balance in the database or cache.
 *
 * Core truths:
 * 1. Physical stock: quantity on hand in batches (custody).
 * 2. Active allocations: held or committed reservations.
 * 3. Committed stock: allocations with complete, attributable commitment evidence
 *    (committed_at, committed_by, and commit_cause in ('confirmation', 'payment_verification')).
 * 4. Derived owned stock = physicalQuantity - committedQuantity.
 * 5. Available stock = max(0, physicalQuantity - reservedQuantity).
 * 6. Unresolved allocations: active reservations on confirmed/verified orders lacking
 *    commitment attribution, or allocations carrying malformed/partial commitment data.
 *    These are flagged explicitly and NEVER collapsed into a healthy owned total.
 */

export const ALLOWED_COMMIT_CAUSES = Object.freeze(new Set(['confirmation', 'payment_verification']))

export function isAttributableCommitment(reservation) {
  if (!reservation || typeof reservation !== 'object') return false
  const hasAt = typeof reservation.committed_at === 'string' && reservation.committed_at.trim().length > 0
  const hasBy = typeof reservation.committed_by === 'string' && reservation.committed_by.trim().length > 0
  const hasValidCause = ALLOWED_COMMIT_CAUSES.has(reservation.commit_cause)
  return hasAt && hasBy && hasValidCause
}

export function isUnresolvedAllocation(reservation, order) {
  if (!reservation || reservation.status !== 'active') return null
  const qty = Number(reservation.quantity)
  if (!Number.isInteger(qty) || qty <= 0) {
    return { reason: 'INVALID_ALLOCATION_QUANTITY', reservationId: reservation.id, quantity: qty }
  }

  const hasAt = Boolean(reservation.committed_at)
  const hasBy = Boolean(reservation.committed_by)
  const hasCause = Boolean(reservation.commit_cause)

  // Partial or invalid commitment fields
  if (hasAt || hasBy || hasCause) {
    if (!hasAt || !hasBy || !ALLOWED_COMMIT_CAUSES.has(reservation.commit_cause)) {
      return { reason: 'MALFORMED_COMMITMENT_DATA', reservationId: reservation.id, quantity: qty }
    }
  }

  // Unattributed reservation on confirmed or verified order
  if (order) {
    const isConfirmed = ['confirmed', 'fulfilled'].includes(order.status)
    const isVerified = order.payment_status === 'verified'
    if (isConfirmed && !hasAt) {
      return { reason: 'UNATTRIBUTED_CONFIRMED_ORDER', reservationId: reservation.id, quantity: qty }
    }
    if (isVerified && !hasAt) {
      return { reason: 'UNATTRIBUTED_VERIFIED_ORDER', reservationId: reservation.id, quantity: qty }
    }
  }

  return null
}

export function deriveOwnedStock({ sku, batches = [], reservations = [], orders = new Map() }) {
  const skuBatches = batches.filter((b) => !sku || b.sku === sku)
  const skuReservations = reservations.filter((r) => (!sku || r.sku === sku) && r.status === 'active')

  let physicalQuantity = 0
  for (const b of skuBatches) {
    const q = Number(b.quantity) || 0
    if (q > 0) physicalQuantity += q
  }

  let committedQuantity = 0
  let heldQuantity = 0
  let reservedQuantity = 0
  let unresolvedQuantity = 0
  const unresolvedAllocations = []

  for (const res of skuReservations) {
    const qty = Number(res.quantity) || 0
    reservedQuantity += qty

    const order = orders instanceof Map ? orders.get(res.order_request_id) : orders?.[res.order_request_id]
    const unresolved = isUnresolvedAllocation(res, order)

    if (unresolved) {
      unresolvedQuantity += qty
      unresolvedAllocations.push({
        id: res.id,
        order_request_id: res.order_request_id,
        sku: res.sku,
        batch_id: res.batch_id,
        quantity: qty,
        reason: unresolved.reason,
      })
    } else if (isAttributableCommitment(res)) {
      committedQuantity += qty
    } else {
      heldQuantity += qty
    }
  }

  const requiresReconciliation = unresolvedAllocations.length > 0
  const healthyTotal = !requiresReconciliation
  const ownedQuantity = healthyTotal ? Math.max(0, physicalQuantity - committedQuantity) : null
  const availableQuantity = Math.max(0, physicalQuantity - reservedQuantity)

  return {
    sku,
    physicalQuantity,
    committedQuantity,
    heldQuantity,
    reservedQuantity,
    ownedQuantity,
    availableQuantity,
    unresolvedCount: unresolvedAllocations.length,
    unresolvedQuantity,
    unresolvedAllocations,
    requiresReconciliation,
    healthyTotal,
  }
}

export function deriveCatalogOwnedStock({ batches = [], reservations = [], orders = new Map() }) {
  const skus = new Set()
  for (const b of batches) if (b.sku) skus.add(b.sku)
  for (const r of reservations) if (r.sku && r.status === 'active') skus.add(r.sku)

  const map = {}
  for (const sku of skus) {
    map[sku] = deriveOwnedStock({ sku, batches, reservations, orders })
  }
  return map
}

export function computeInventoryMetrics(products, batchMap = {}, getExpiryHealth) {
  let units = 0
  let out = 0
  let low = 0
  let unknown = 0
  let expiryRisk = 0
  let drafts = 0
  let unresolved = 0

  for (const product of products || []) {
    const raw = product?.stock_available
    const stock = raw === null || raw === undefined || raw === '' ? Number.NaN : Number(raw)
    const threshold = Number(product?.reorder_level) || 5
    if (!Number.isFinite(stock)) {
      unknown += 1
    } else {
      units += Math.max(0, stock)
      if (stock <= 0) out += 1
      else if (stock <= threshold) low += 1
    }
    const bEntry = batchMap[product?.sku]
    if (bEntry?.requiresReconciliation) {
      unresolved += 1
    }
    const earliest = bEntry?.earliestExpiry || product?.expiry_date
    if (typeof getExpiryHealth === 'function') {
      const health = getExpiryHealth(earliest)
      if (['EXPIRED', 'CRITICAL', 'WARNING'].includes(health?.status)) expiryRisk += 1
    } else if (earliest) {
      const parsed = Date.parse(earliest)
      if (Number.isFinite(parsed)) {
        const diffDays = Math.ceil((parsed - Date.now()) / (1000 * 60 * 60 * 24))
        if (diffDays <= 90) expiryRisk += 1
      }
    }
    if (!['Live', 'Active'].includes(product?.status)) drafts += 1
  }
  return { units, out, low, unknown, expiryRisk, drafts, unresolved }
}
