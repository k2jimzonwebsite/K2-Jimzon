// MAP-023 delivery quotation. Port of the owner-approved K2_DELIVERY_LOGIC_CONTROL
// workbook (QUOTE TESTER / RATE MATRIX / PROVIDERS & SERVICES / LOCATION MAP) into
// one pure function, so the admin tester, the admin BFF, and the storefront estimate
// all resolve an outcome from the same rules instead of three drifting copies.
//
// Governing invariants, from docs/specs/SHIPPING_AND_COURIER_LOGIC_SPEC.md:
//   - Every unknown, exception, or integrity problem fails closed to a manual quote
//     or a stop. Nothing ever falls through to a macro-area planning floor.
//   - The fee is the MAXIMUM complete current cost across every route-qualified
//     courier/service option, rounded upward. Adding a selectable courier without a
//     current cost row removes automatic quoting rather than silently under-charging.
//   - Blank means unknown. Numeric zero is valid only for a confirmed K2 pickup.
//   - Money is integer centavos end to end; no float arithmetic reaches a charge.

export const DELIVERY_OUTCOMES = Object.freeze({
  INPUT_ERROR: 'INPUT_ERROR',
  DATA_CONFLICT_STOP: 'DATA_CONFLICT_STOP',
  PLATFORM_CHARGED_EXTERNAL: 'PLATFORM_CHARGED_EXTERNAL',
  PICKUP_ZERO: 'PICKUP_ZERO',
  UNAVAILABLE: 'UNAVAILABLE',
  MANUAL_COURIER_QUOTE: 'MANUAL_COURIER_QUOTE',
  STANDARD_FEE: 'STANDARD_FEE',
})

// Only these two ever reach a customer. Everything else is staff-internal.
const CUSTOMER_VISIBLE = new Set([DELIVERY_OUTCOMES.STANDARD_FEE, DELIVERY_OUTCOMES.PICKUP_ZERO])

export const DELIVERY_CHANNELS = Object.freeze(['Website', 'Pasabuy', 'Wholesale', 'Marketplace'])
export const PILOT_CHANNELS = Object.freeze(['Website', 'Pasabuy'])
export const DELIVERY_SERVICES = Object.freeze([
  'K2 Standard Delivery',
  'K2 Pickup',
  'Platform Delivery',
])

export const COURIER_ELIGIBILITY = Object.freeze(['AUTO_QUOTE_ELIGIBLE', 'MANUAL_ONLY', 'DISABLED'])
export const WEIGHT_BASES = Object.freeze(['MEASURED', 'FROZEN_CONSERVATIVE'])

const REASONS = {
  STANDARD_FEE: [
    'Maximum complete current cost across every route-qualified courier/service option, rounded upward.',
    'Communicate the K2-arranged delivery fee, then freeze the snapshot on acceptance. K2 absorbs ordinary later variance.',
  ],
  PICKUP_ZERO: [
    'Confirmed K2 pickup is the only valid zero delivery charge.',
    'Confirm the pickup window with the customer and freeze the pickup outcome on the order.',
  ],
  PLATFORM_CHARGED_EXTERNAL: [
    'The marketplace or platform owns the delivery charge for this order.',
    'Use the platform amount and its evidence. Do not run K2 rating; it would double-charge.',
  ],
  UNAVAILABLE: [
    'No supported K2 delivery path exists for the selected service.',
    'Select a supported service, or escalate to the owner. Do not guess an amount.',
  ],
  INPUT_ERROR: [
    'A required input is missing, blank, or explicitly unknown.',
    'Complete every required input and confirm a full recalculation before quoting.',
  ],
  DATA_CONFLICT_STOP: [
    'Integrity conflict in the source, route qualification, location, or cost rows.',
    'Stop and repair the offending IDs, obtain owner approval, then recalculate. Manual bypass is forbidden.',
  ],
  NO_QUALIFIED_OPTION: [
    'No owner-approved courier/service option is route-qualified for this destination and profile.',
    'Obtain a named manual courier quote, or approve a courier option covering this route.',
  ],
  QUALIFIED_OPTION_MISSING_COST: [
    'At least one qualified courier/service option lacks a current, complete, approved cost.',
    'Add the missing current cost row, or mark that courier manual-only, then recalculate.',
  ],
  OUTSIDE_PILOT: [
    'The order falls outside the owner-approved exact-locality non-exception pilot.',
    'Obtain a named courier quote with its profile, expiry, evidence, and approver before acceptance.',
  ],
  SOURCE_NOT_CURRENT: [
    'The evidence source backing this rate is no longer marked current.',
    'Re-verify the source and publish a new rate version, or quote manually in the meantime.',
  ],
}

function result(outcome, reasonCode, extra = {}) {
  const [reason, nextAction] = REASONS[reasonCode] || REASONS[outcome]
  return Object.freeze({
    outcome,
    reasonCode,
    reason,
    nextAction,
    feeMinor: null,
    currency: extra.currency || 'PHP',
    customerVisible: CUSTOMER_VISIBLE.has(outcome),
    snapshot: null,
    ...extra,
  })
}

/** Round a centavo amount up to the next whole increment. Never rounds down. */
export function ceilingToIncrementMinor(amountMinor, incrementMinor) {
  const amount = Math.round(Number(amountMinor))
  const increment = Math.round(Number(incrementMinor))
  if (!Number.isFinite(amount) || !Number.isFinite(increment) || increment <= 0) return null
  return Math.ceil(amount / increment) * increment
}

const isBlank = (value) =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

const isBool = (value) => value === true || value === false

const isCount = (value, { min = 0 } = {}) =>
  Number.isInteger(value) && value >= min

// Half-open [effectiveFrom, effectiveTo) on plain Asia/Manila calendar dates. String
// comparison is safe and timezone-free because every date is a YYYY-MM-DD literal.
function isEffectiveOn(row, quoteDate) {
  if (row.effectiveFrom && quoteDate < row.effectiveFrom) return false
  if (row.effectiveTo && quoteDate >= row.effectiveTo) return false
  return true
}

/**
 * Resolve one delivery quotation.
 *
 * @param {object} inputs  the order facts a staff member or checkout supplies
 * @param {object} tables  controls, sources, courierOptions, localityRules, costRows
 * @returns a frozen result: outcome, feeMinor, reason, nextAction, customerVisible,
 *          and — only for STANDARD_FEE — the snapshot to freeze onto the order.
 */
export function resolveDeliveryQuote(inputs = {}, tables = {}) {
  const controls = tables.controls || {}
  const currency = controls.currency || 'PHP'
  const sources = Array.isArray(tables.sources) ? tables.sources : []
  const courierOptions = Array.isArray(tables.courierOptions) ? tables.courierOptions : []
  const localityRules = Array.isArray(tables.localityRules) ? tables.localityRules : []
  const costRows = Array.isArray(tables.costRows) ? tables.costRows : []

  const fail = (outcome, reasonCode) => result(outcome, reasonCode, { currency })

  // 1. Channel and service must be present before anything else can be read.
  if (isBlank(inputs.channel) || isBlank(inputs.service)) {
    return fail(DELIVERY_OUTCOMES.INPUT_ERROR, 'INPUT_ERROR')
  }

  // 2. Platform-priced channels never run K2 rating.
  if (inputs.channel === 'Marketplace' || inputs.service === 'Platform Delivery') {
    return fail(DELIVERY_OUTCOMES.PLATFORM_CHARGED_EXTERNAL, 'PLATFORM_CHARGED_EXTERNAL')
  }

  // 3. A confirmed pickup is the only path to a zero charge.
  if (inputs.service === 'K2 Pickup') {
    return result(DELIVERY_OUTCOMES.PICKUP_ZERO, 'PICKUP_ZERO', { currency, feeMinor: 0 })
  }

  // 4. Anything else we do not model is unavailable, not estimated.
  if (inputs.service !== 'K2 Standard Delivery') {
    return fail(DELIVERY_OUTCOMES.UNAVAILABLE, 'UNAVAILABLE')
  }

  // 5. Every required input must be present and not explicitly unknown. A blank
  //    exception flag is unknown, which is an input error — never an implied "no".
  const requiredPresent =
    !isBlank(inputs.localityId) &&
    !isBlank(inputs.originId) &&
    !isBlank(inputs.quoteDate) &&
    isCount(inputs.parcelCount, { min: 1 }) &&
    isCount(inputs.weightG, { min: 1 }) &&
    isCount(inputs.merchandiseSubtotalMinor, { min: 0 }) &&
    isBool(inputs.oversize) &&
    isBool(inputs.remoteArea) &&
    isBool(inputs.specialProtection) &&
    inputs.recalculationConfirmed === true &&
    WEIGHT_BASES.includes(inputs.weightBasis)
  if (!requiredPresent) {
    return fail(DELIVERY_OUTCOMES.INPUT_ERROR, 'INPUT_ERROR')
  }

  const quoteDate = String(inputs.quoteDate)

  // 6. Integrity gates. Any duplicate, overlap, or broken reference stops the quote
  //    rather than being resolved by priority.
  const sourceById = new Map()
  for (const source of sources) {
    if (sourceById.has(source.sourceId)) {
      return fail(DELIVERY_OUTCOMES.DATA_CONFLICT_STOP, 'DATA_CONFLICT_STOP')
    }
    sourceById.set(source.sourceId, source)
  }

  const optionById = new Map()
  for (const option of courierOptions) {
    if (optionById.has(option.optionId) || option.integrity === 'DATA_CONFLICT_STOP') {
      return fail(DELIVERY_OUTCOMES.DATA_CONFLICT_STOP, 'DATA_CONFLICT_STOP')
    }
    optionById.set(option.optionId, option)
  }

  const localityById = new Map()
  for (const rule of localityRules) {
    if (localityById.has(rule.localityId) || rule.integrity === 'DATA_CONFLICT_STOP') {
      return fail(DELIVERY_OUTCOMES.DATA_CONFLICT_STOP, 'DATA_CONFLICT_STOP')
    }
    localityById.set(rule.localityId, rule)
  }

  const locality = localityById.get(inputs.localityId) || null

  // Every active cost row must name a real option and a real source, and no two
  // active rows may cover the same option/origin/locality/profile on the same date.
  const activeRows = []
  const seenRoutes = new Set()
  for (const row of costRows) {
    if (row.status !== 'ACTIVE_APPROVED') continue
    if (!isEffectiveOn(row, quoteDate)) continue
    if (!optionById.has(row.optionId) || !sourceById.has(row.sourceId)) {
      return fail(DELIVERY_OUTCOMES.DATA_CONFLICT_STOP, 'DATA_CONFLICT_STOP')
    }
    const routeKey = [row.optionId, row.originId, row.localityId, row.profileId].join(' ')
    if (seenRoutes.has(routeKey)) {
      return fail(DELIVERY_OUTCOMES.DATA_CONFLICT_STOP, 'DATA_CONFLICT_STOP')
    }
    seenRoutes.add(routeKey)
    activeRows.push(row)
  }

  // 7. Cost resolution across every route-qualified option, before eligibility, so
  //    a rate-table problem is reported as a rate-table problem.
  const profileId = locality ? locality.profileId : null
  const qualifiedOptions = courierOptions
    .filter(
      (option) =>
        option.eligibility === 'AUTO_QUOTE_ELIGIBLE' &&
        option.approved === true &&
        option.integrity !== 'DATA_CONFLICT_STOP' &&
        option.originId === inputs.originId,
    )
    .sort((a, b) => String(a.optionId).localeCompare(String(b.optionId)))

  if (qualifiedOptions.length === 0) {
    return fail(DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE, 'NO_QUALIFIED_OPTION')
  }

  const costed = []
  for (const option of qualifiedOptions) {
    const row = activeRows.find(
      (candidate) =>
        candidate.optionId === option.optionId &&
        candidate.originId === inputs.originId &&
        candidate.localityId === inputs.localityId &&
        candidate.profileId === profileId,
    )
    const usable =
      row &&
      row.currency === currency &&
      row.completeness === 'PROVIDER_TOTAL_COMPLETE' &&
      row.approvedByOwner === true &&
      Number.isInteger(row.amountMinor) &&
      row.amountMinor > 0
    if (!usable) break
    costed.push({ option, row, source: sourceById.get(row.sourceId) })
  }

  // 8. Eligibility. An exception is only meaningful once we know the route exists.
  const eligible =
    locality !== null &&
    locality.scope === 'EXACT_PILOT' &&
    locality.status === 'PILOT_APPROVED' &&
    PILOT_CHANNELS.includes(inputs.channel) &&
    inputs.originId === controls.originId &&
    inputs.parcelCount <= controls.maxParcels &&
    inputs.weightG <= controls.maxWeightG &&
    inputs.merchandiseSubtotalMinor <= controls.maxMerchandiseSubtotalMinor &&
    inputs.oversize === false &&
    inputs.remoteArea === false &&
    inputs.specialProtection === false

  if (costed.length !== qualifiedOptions.length) {
    // Report the rate-table gap only when the order could otherwise have been quoted;
    // an ineligible order is outside the pilot regardless of the table's state.
    return fail(
      DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE,
      eligible ? 'QUALIFIED_OPTION_MISSING_COST' : 'OUTSIDE_PILOT',
    )
  }

  if (!eligible) {
    return fail(DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE, 'OUTSIDE_PILOT')
  }

  if (costed.some(({ source }) => source.freshness !== 'CURRENT' || source.integrity !== 'OK')) {
    return fail(DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE, 'SOURCE_NOT_CURRENT')
  }

  // 9. The loss-control rule: charge the worst qualified option, rounded upward.
  const maxOptionCostMinor = costed.reduce((max, { row }) => Math.max(max, row.amountMinor), 0)
  const feeMinor = ceilingToIncrementMinor(maxOptionCostMinor, controls.roundingIncrementMinor)
  if (!Number.isInteger(feeMinor) || feeMinor <= 0) {
    return fail(DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE, 'QUALIFIED_OPTION_MISSING_COST')
  }

  return result(DELIVERY_OUTCOMES.STANDARD_FEE, 'STANDARD_FEE', {
    currency,
    feeMinor,
    snapshot: Object.freeze({
      localityId: locality.localityId,
      matchKey: locality.matchKey,
      profileId,
      originId: inputs.originId,
      channel: inputs.channel,
      service: inputs.service,
      optionIds: costed.map(({ option }) => option.optionId),
      costIds: costed.map(({ row }) => row.costId),
      sourceIds: [...new Set(costed.map(({ row }) => row.sourceId))],
      maxOptionCostMinor,
      roundingIncrementMinor: controls.roundingIncrementMinor,
      feeMinor,
      currency,
      parcelCount: inputs.parcelCount,
      weightG: inputs.weightG,
      weightBasis: inputs.weightBasis,
      quotedAt: quoteDate,
    }),
  })
}

/** Present a centavo amount as a PHP string for staff and customer surfaces. */
export function formatDeliveryFee(feeMinor, currency = 'PHP') {
  if (!Number.isInteger(feeMinor)) return null
  return `${currency} ${(feeMinor / 100).toFixed(2)}`
}
