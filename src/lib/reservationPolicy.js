// MAP-023 reservation policy. The owner's OWNER-002 answer, recorded
// 2 September 2026, expressed as one place the rest of the system can ask.
//
// The whole point of this module is that "in a cart", "reserved", and "sold" are
// three different facts about a unit of stock, and conflating any two of them is
// how a shop either oversells or quietly strands its own inventory:
//
//   in a cart   -> nothing is held. A cart is a saved list, exactly like Shopee's.
//   purchased   -> reserved for 30 minutes. Held for that customer, not yet sold.
//   confirmed   -> deducted. The units have left inventory.
//   expired     -> released. The exact lots return, and may be sold to anyone.
//
// Availability is therefore re-checked at the moment of purchase and never
// inferred from when something entered the cart.
//
// Pasabuy and wholesale deliberately hold no stock at all. Those flows run
// through live chat, so a commitment becomes a durable history record on the
// customer rather than an expiring claim on inventory.

export const RESERVATION_POLICY = Object.freeze({
  defaultHoldMinutes: 30,
  minimumExtensionMinutes: 30,
  maximumExtensionMinutes: 7 * 24 * 60, // 7 days
  cartHoldsStock: false,
})

// Matches the check constraint on public.inventory_reservations (20260809).
// The policy layer must never invent a state no column can store.
export const RESERVATION_STATES = Object.freeze(['active', 'released', 'fulfilled'])

// Channels whose orders take a timed hold. Everything else records history.
const HOLDING_CHANNELS = Object.freeze(['Website', 'Pasabuy_direct_purchase'])

const STOCK_EFFECTS = Object.freeze({
  in_cart: 'none',
  purchase_submitted: 'reserved',
  confirmed: 'deducted',
  fulfilled: 'deducted',
  expired: 'released',
  cancelled: 'released',
  // Conversation-led commitments. These are history, not inventory claims.
  pasabuy_committed: 'none',
  wholesale_committed: 'none',
})

/** A cart is a saved list. It never claims stock, at any age. */
export function cartHoldsStock() {
  return RESERVATION_POLICY.cartHoldsStock
}

/**
 * What one lifecycle event does to stock.
 * An unrecognised event returns 'none' rather than a guess, because the cost of
 * wrongly reserving or wrongly deducting is far higher than doing nothing.
 */
export function stockEffectOf(event) {
  // Own-key only. A bare index would resolve inherited names such as
  // `constructor` or `toString` to an Object member, which is truthy and would
  // be returned in place of the 'none' the unrecognised-event rule promises.
  return Object.hasOwn(STOCK_EFFECTS, event) ? STOCK_EFFECTS[event] : 'none'
}

function parseInstant(value) {
  if (typeof value !== 'string' || value.trim() === '') return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * The moment a purchase's hold ends.
 *
 * @param startedAt ISO instant at which the customer submitted the purchase.
 * @param channel   optional; a non-holding channel returns null by design.
 * @returns ISO instant, or null when no hold applies or the start is unusable.
 */
export function reservationDeadline(startedAt, { channel = 'Website' } = {}) {
  const started = parseInstant(startedAt)
  if (started === null) return null
  if (!HOLDING_CHANNELS.includes(channel)) return null
  return new Date(started + RESERVATION_POLICY.defaultHoldMinutes * 60_000).toISOString()
}

/**
 * Whether a hold has ended. Exclusive at the boundary: the deadline instant is
 * already expired, so two callers evaluating the same millisecond agree.
 *
 * A missing deadline is unknown, not overdue — releasing stock on unknown would
 * silently cancel a live customer's hold.
 */
export function isExpiredAt(deadline, now) {
  const ends = parseInstant(deadline)
  const at = parseInstant(now)
  if (ends === null || at === null) return false
  return at >= ends
}

/** Why an extension was refused, or null when it is acceptable. */
export function extensionRefusalReason(minutes) {
  if (!Number.isInteger(minutes)) {
    return 'An extension must be a whole number of minutes.'
  }
  if (minutes < RESERVATION_POLICY.minimumExtensionMinutes) {
    return 'An extension must be at least 30 minutes.'
  }
  if (minutes > RESERVATION_POLICY.maximumExtensionMinutes) {
    return 'An extension may not exceed 7 days.'
  }
  return null
}

/**
 * A staff-extended deadline, or null if the extension is refused.
 *
 * Passing `now` additionally refuses to extend a hold that has already expired.
 * Reviving one would re-take stock that has already been released and may now
 * belong to a different customer; staff must create a new reservation instead.
 */
export function extendedDeadline(deadline, minutes, { now = null } = {}) {
  const ends = parseInstant(deadline)
  if (ends === null) return null
  if (extensionRefusalReason(minutes) !== null) return null
  if (now !== null && isExpiredAt(deadline, now)) return null
  return new Date(ends + minutes * 60_000).toISOString()
}
