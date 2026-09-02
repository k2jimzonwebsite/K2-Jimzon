const DEFAULT_TARGET_PER_SHOP = 2
const DEFAULT_FRESHNESS_HOURS = 72
const COVERAGE_STATUSES = new Set(['covered', 'thin', 'skipped', 'out', 'needs_review'])

const keyFor = (productId, shopId) => `${productId}:${shopId}`

function boundedWholeNumber(value, fallback, minimum, maximum) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.floor(number)))
}

function observationStatus(observation, override, asOfMs, freshnessMs, targetPerShop) {
  if (override?.action === 'skip') return 'skipped'
  if (!observation || observation.needsReview === true) return 'needs_review'
  const observedAtMs = Date.parse(observation.observedAt)
  if (!Number.isFinite(observedAtMs) || observedAtMs > asOfMs || asOfMs - observedAtMs > freshnessMs) return 'needs_review'
  const reportedQuantity = Number(observation.reportedQuantity)
  if (!Number.isInteger(reportedQuantity) || reportedQuantity < 0) return 'needs_review'
  const natural = reportedQuantity === 0 ? 'out' : reportedQuantity < targetPerShop ? 'thin' : 'covered'
  return override?.action === 'thin' ? 'thin' : natural
}

function normalizeOverrides(overrides, validKeys) {
  const result = new Map()
  for (const override of overrides || []) {
    const key = keyFor(override?.productId, override?.shopId)
    if (!validKeys.has(key)) throw new Error('Coverage override must name one known product and exact shop.')
    if (!['include', 'thin', 'skip'].includes(override.action)) throw new Error('Coverage override action must be include, thin, or skip.')
    const priority = override.priority === null || override.priority === undefined ? null : Number(override.priority)
    if (priority !== null && (!Number.isInteger(priority) || priority < 1 || priority > 50)) {
      throw new Error('Coverage override priority must be 1–50.')
    }
    if (typeof override.reason !== 'string' || override.reason.trim().length < 10 || override.reason.trim().length > 500) {
      throw new Error('Coverage override reason must be 10–500 characters.')
    }
    if (result.has(key)) throw new Error('Only one coverage override is allowed per product and exact shop.')
    result.set(key, { action: override.action, priority, reason: override.reason.trim() })
  }
  return result
}

function recentSalesByKey(recentSales, validKeys) {
  const result = new Map()
  for (const sale of recentSales || []) {
    const key = keyFor(sale?.productId, sale?.shopId)
    if (!validKeys.has(key) || sale?.verified === false) continue
    const units = Number(sale?.verifiedUnits)
    if (!Number.isFinite(units) || units <= 0) continue
    result.set(key, (result.get(key) || 0) + Math.floor(units))
  }
  return result
}

export function buildMarketplaceCoverageProposal({
  products = [], shops = [], observations = [], recentSales = [], overrides = [],
  targetPerShop = DEFAULT_TARGET_PER_SHOP,
  freshnessHours = DEFAULT_FRESHNESS_HOURS,
  asOf = new Date().toISOString(),
} = {}) {
  const target = boundedWholeNumber(targetPerShop, DEFAULT_TARGET_PER_SHOP, 1, 100)
  const freshness = boundedWholeNumber(freshnessHours, DEFAULT_FRESHNESS_HOURS, 1, 24 * 30)
  const asOfMs = Date.parse(asOf)
  if (!Number.isFinite(asOfMs)) throw new Error('Coverage as-of time must be a valid timestamp.')

  const sortedProducts = [...products].sort((left, right) => String(left.sku).localeCompare(String(right.sku)))
  const sortedShops = [...shops].sort((left, right) => String(left.shopCode).localeCompare(String(right.shopCode)))
  const validKeys = new Set(sortedProducts.flatMap((product) => sortedShops.map((shop) => keyFor(product.id, shop.id))))
  const overrideByKey = normalizeOverrides(overrides, validKeys)
  const salesByKey = recentSalesByKey(recentSales, validKeys)
  const observationByKey = new Map()

  for (const observation of observations) {
    const key = keyFor(observation?.productId, observation?.shopId)
    if (!validKeys.has(key)) continue
    const previous = observationByKey.get(key)
    if (!previous || Date.parse(observation.observedAt) > Date.parse(previous.observedAt)) observationByKey.set(key, observation)
  }

  const rows = []
  for (const product of sortedProducts) {
    let remaining = boundedWholeNumber(product.eligibleQuantity, 0, 0, 1_000_000)
    const productRows = sortedShops.map((shop) => {
      const key = keyFor(product.id, shop.id)
      const override = overrideByKey.get(key)
      const observation = observationByKey.get(key)
      return {
        productId: product.id,
        sku: product.sku,
        shopId: shop.id,
        shopCode: shop.shopCode,
        shopName: shop.displayName,
        reportedQuantity: observation?.reportedQuantity ?? null,
        observedAt: observation?.observedAt ?? null,
        status: observationStatus(observation, override, asOfMs, freshness * 60 * 60 * 1000, target),
        verifiedRecentSales: salesByKey.get(key) || 0,
        overrideAction: override?.action || null,
        overridePriority: override?.priority ?? null,
        overrideReason: override?.reason || null,
        canonicalEligibleQuantity: boundedWholeNumber(product.eligibleQuantity, 0, 0, 1_000_000),
        proposedAvailability: 0,
        effect: 'proposal_only',
        custodyTransfer: false,
        providerWrite: false,
      }
    })

    const allocatable = productRows.filter((row) => row.status !== 'needs_review' && row.status !== 'skipped')
    const priority = allocatable.sort((a, b) => {
      const aRank = a.overridePriority ?? 51
      const bRank = b.overridePriority ?? 51
      if (aRank !== bRank) return aRank - bRank
      if ((a.overrideAction === 'include') !== (b.overrideAction === 'include')) return a.overrideAction === 'include' ? -1 : 1
      return b.verifiedRecentSales - a.verifiedRecentSales || a.shopCode.localeCompare(b.shopCode)
    })
    for (const row of priority) {
      const cap = row.overrideAction === 'thin' ? 1 : target
      row.proposedAvailability = Math.min(cap, remaining)
      remaining -= row.proposedAvailability
    }
    rows.push(...productRows)
  }

  return {
    asOf: new Date(asOfMs).toISOString(),
    targetPerShop: target,
    freshnessHours: freshness,
    rows,
  }
}

export function summarizeMarketplaceCoverageAlerts({ rows = [], targetPerShop = DEFAULT_TARGET_PER_SHOP } = {}) {
  const exactShops = new Set()
  const criticalProducts = new Set()
  const result = { zero: 0, low: 0, needsReview: 0, allocationShortfall: 0, criticalMasterZero: 0, exactShopsAffected: 0 }
  for (const row of rows) {
    if (!COVERAGE_STATUSES.has(row?.status)) continue
    if (row.status === 'out') result.zero += 1
    if (row.status === 'thin') result.low += 1
    if (row.status === 'needs_review') result.needsReview += 1
    if (!['skipped', 'needs_review'].includes(row.status)
        && Number(row.proposedAvailability) < targetPerShop) result.allocationShortfall += 1
    if (Number(row.canonicalEligibleQuantity) === 0) criticalProducts.add(row.productId)
    if (['out', 'thin', 'needs_review'].includes(row.status)) exactShops.add(row.shopId)
  }
  result.exactShopsAffected = exactShops.size
  result.criticalMasterZero = criticalProducts.size
  return result
}
