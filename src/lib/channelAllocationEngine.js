/**
 * Channel Allocation Engine (MAP-026)
 *
 * Implements the owner-confirmed multi-shop inventory projection rules:
 * 1. Default coverage target is two sellable units per active individual shop account.
 * 2. Master Inventory is the Philippines-wide physical truth across warehouse lots.
 *    Master Inventory never shrinks when stock is allocated; shop allocation is a
 *    sellable-availability projection over that master stock.
 * 3. Product-shop relationships carry one explicit status:
 *    - Covered: 2 or more eligible units available.
 *    - Thin: exactly 1 eligible unit available.
 *    - Skipped: intentionally not offered in that shop.
 *    - Out: active shop with 0 sellable units available.
 *    - Needs review: provider observation or custody state is stale or conflicting.
 * 4. Zero double-counting invariant: sum of shop allocations must never exceed Master sellable stock.
 */

export const COVERAGE_STATUS = {
  COVERED: 'Covered',
  THIN: 'Thin',
  SKIPPED: 'Skipped',
  OUT: 'Out',
  NEEDS_REVIEW: 'Needs review',
}

export const DEFAULT_TARGET_UNITS = 2

export const DEFAULT_SHOPS = [
  { shopId: '30000000-0000-4000-8000-000000000001', shopCode: 'shopee-01', channelCode: 'shopee', displayName: 'Shopee Main Shop', priority: 1 },
  { shopId: '30000000-0000-4000-8000-000000000002', shopCode: 'shopee-02', channelCode: 'shopee', displayName: 'Shopee Outlet', priority: 2 },
  { shopId: '30000000-0000-4000-8000-000000000003', shopCode: 'tiktok-01', channelCode: 'tiktok', displayName: 'TikTok Main Shop', priority: 3 },
  { shopId: '30000000-0000-4000-8000-000000000004', shopCode: 'tiktok-02', channelCode: 'tiktok', displayName: 'TikTok Live Outlet', priority: 4 },
  { shopId: '30000000-0000-4000-8000-000000000005', shopCode: 'lazada-01', channelCode: 'lazada', displayName: 'Lazada Flagship', priority: 5 },
  { shopId: '30000000-0000-4000-8000-000000000006', shopCode: 'lazada-02', channelCode: 'lazada', displayName: 'Lazada Express', priority: 6 },
]

/**
 * Evaluates coverage status for a given allocated unit count and skip flag.
 *
 * @param {number} units - Allocated sellable units
 * @param {boolean} skipped - Whether the shop is intentionally skipped for this product
 * @param {boolean} needsReview - Whether an inventory or sync discrepancy is flagged
 * @returns {string} One of COVERAGE_STATUS values
 */
export function evaluateCoverageStatus(units, skipped = false, needsReview = false) {
  if (needsReview) return COVERAGE_STATUS.NEEDS_REVIEW
  if (skipped) return COVERAGE_STATUS.SKIPPED
  const count = Math.max(0, Math.floor(Number(units) || 0))
  if (count >= 2) return COVERAGE_STATUS.COVERED
  if (count === 1) return COVERAGE_STATUS.THIN
  return COVERAGE_STATUS.OUT
}

/**
 * Computes deterministic shop allocations for a single product over Master Inventory.
 *
 * @param {Object} params
 * @param {number} params.masterStock - Landed sellable units in warehouse (e.g. MANILA_MAIN)
 * @param {Array} params.shops - Array of shop candidates:
 *   { shopId, shopCode, channelCode, displayName, priority, skipped, currentAllocated, needsReview }
 * @param {number} [params.targetUnits=2] - Coverage target per shop (default 2)
 * @returns {Object} Allocation proposal with summary, breakdown, and warnings
 */
export function computeProductShopAllocation({
  masterStock = 0,
  shops = [],
  targetUnits = DEFAULT_TARGET_UNITS,
}) {
  const cleanMaster = Math.max(0, Math.floor(Number(masterStock) || 0))
  const target = Math.max(1, Math.floor(Number(targetUnits) || DEFAULT_TARGET_UNITS))

  const activeCandidates = []
  const skippedList = []

  for (const shop of shops) {
    if (shop.skipped) {
      skippedList.push({
        shopId: shop.shopId,
        shopCode: shop.shopCode,
        channelCode: shop.channelCode,
        displayName: shop.displayName || shop.shopCode,
        targetUnits: target,
        allocatedUnits: 0,
        status: COVERAGE_STATUS.SKIPPED,
        priority: Number(shop.priority) || 100,
      })
    } else {
      activeCandidates.push({
        shopId: shop.shopId,
        shopCode: shop.shopCode,
        channelCode: shop.channelCode,
        displayName: shop.displayName || shop.shopCode,
        priority: Number(shop.priority) || 100,
        needsReview: Boolean(shop.needsReview),
        currentAllocated: Math.max(0, Math.floor(Number(shop.currentAllocated) || 0)),
      })
    }
  }

  // Sort candidate shops: highest priority first (lower number = higher priority),
  // with stable alphabetical tie-break on shopCode.
  activeCandidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.shopCode.localeCompare(b.shopCode)
  })

  const totalRequiredUnits = activeCandidates.length * target
  const isScarce = cleanMaster < totalRequiredUnits

  let remainingUnits = cleanMaster
  const activeBreakdown = []

  // Step 1: Pass 1 gives each shop up to target units in priority order.
  for (const shop of activeCandidates) {
    if (shop.needsReview) {
      activeBreakdown.push({
        shopId: shop.shopId,
        shopCode: shop.shopCode,
        channelCode: shop.channelCode,
        displayName: shop.displayName,
        targetUnits: target,
        allocatedUnits: 0,
        status: COVERAGE_STATUS.NEEDS_REVIEW,
        priority: shop.priority,
      })
      continue
    }

    const grant = Math.min(remainingUnits, target)
    remainingUnits -= grant

    activeBreakdown.push({
      shopId: shop.shopId,
      shopCode: shop.shopCode,
      channelCode: shop.channelCode,
      displayName: shop.displayName,
      targetUnits: target,
      allocatedUnits: grant,
      status: evaluateCoverageStatus(grant, false, false),
      priority: shop.priority,
    })
  }

  // Combine active breakdown and skipped list
  const allShopsBreakdown = [...activeBreakdown, ...skippedList]

  // Sort back to match initial shop list or priority
  allShopsBreakdown.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.shopCode.localeCompare(b.shopCode)
  })

  const totalAllocated = activeBreakdown.reduce((sum, s) => sum + s.allocatedUnits, 0)
  const unallocatedMasterStock = cleanMaster - totalAllocated

  const thinShops = activeBreakdown.filter(s => s.status === COVERAGE_STATUS.THIN)
  const outShops = activeBreakdown.filter(s => s.status === COVERAGE_STATUS.OUT)

  return {
    masterStock: cleanMaster,
    totalAllocated,
    unallocatedMasterStock,
    targetUnitsPerShop: target,
    activeShopsCount: activeCandidates.length,
    skippedShopsCount: skippedList.length,
    scarcityWarning: isScarce,
    scarcityDeficit: Math.max(0, totalRequiredUnits - cleanMaster),
    thinShops: thinShops.map(s => s.displayName),
    outShops: outShops.map(s => s.displayName),
    breakdown: allShopsBreakdown,
  }
}

/**
 * Calculates outbox synchronization deltas between current and desired allocations.
 *
 * @param {Array} currentList - Array of { shopCode, sku, allocatedUnits }
 * @param {Array} desiredList - Array of { shopCode, sku, allocatedUnits }
 * @returns {Array} List of deltas requiring marketplace outbox updates
 */
export function calculateOutboxSyncDeltas(currentList = [], desiredList = []) {
  const currentMap = new Map()
  for (const item of currentList) {
    const key = `${item.shopCode}::${item.sku}`
    currentMap.set(key, Math.max(0, Math.floor(Number(item.allocatedUnits) || 0)))
  }

  const deltas = []
  for (const item of desiredList) {
    const key = `${item.shopCode}::${item.sku}`
    const current = currentMap.get(key) || 0
    const desired = Math.max(0, Math.floor(Number(item.allocatedUnits) || 0))
    const delta = desired - current

    if (delta !== 0) {
      deltas.push({
        shopCode: item.shopCode,
        sku: item.sku,
        currentUnits: current,
        desiredUnits: desired,
        delta,
        action: delta > 0 ? 'increase_stock' : 'decrease_stock',
      })
    }
  }

  return deltas
}
