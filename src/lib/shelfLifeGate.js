/**
 * Shelf Life Gate (MAP-002)
 * Category-configurable shelf life enforcement with approved 90-day default.
 */

export const CATEGORY_MIN_SHELF_LIFE_DAYS = Object.freeze({
  food: 90,
  beverage: 90,
  beauty: 90,
  personal_care: 90,
  household: 60,
  default: 90
})

/**
 * Calculates remaining days until expiry date.
 * @param {string|Date} expiryDate Expiry date
 * @returns {number|null} Days remaining or null if invalid date/non-expiry
 */
export function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null
  const expiry = new Date(expiryDate)
  if (isNaN(expiry.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)

  const diffTime = expiry.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Evaluates shelf-life eligibility for sale.
 * @param {string|Date} expiryDate Batch expiry date
 * @param {string} category Product category
 * @returns {{ eligible: boolean, status: 'regular'|'clearance'|'unsellable', daysRemaining: number|null, minDays: number, reason: string }}
 */
export function evaluateShelfLife(expiryDate, category = 'default') {
  if (!expiryDate) {
    return {
      eligible: false,
      status: 'unsellable',
      daysRemaining: null,
      minDays: CATEGORY_MIN_SHELF_LIFE_DAYS.default,
      reason: 'Unknown expiry date — not sellable until corrected.'
    }
  }

  const days = getDaysUntilExpiry(expiryDate)
  const catKey = (category || '').toLowerCase().replace(/[^a-z_]/g, '')
  const minDays = CATEGORY_MIN_SHELF_LIFE_DAYS[catKey] || CATEGORY_MIN_SHELF_LIFE_DAYS.default

  if (days === null || days <= 0) {
    return {
      eligible: false,
      status: 'unsellable',
      daysRemaining: days,
      minDays,
      reason: 'Batch has expired — unsellable.'
    }
  }

  if (days <= 30) {
    return {
      eligible: false,
      status: 'unsellable',
      daysRemaining: days,
      minDays,
      reason: `Only ${days} day(s) remaining — unsellable (minimum 30 days mandatory).`
    }
  }

  if (days < minDays) {
    return {
      eligible: true, // eligible only under explicit clearance path
      status: 'clearance',
      daysRemaining: days,
      minDays,
      reason: `${days} day(s) remaining — requires approved clearance disclosure.`
    }
  }

  return {
    eligible: true,
    status: 'regular',
    daysRemaining: days,
    minDays,
    reason: `Eligible for ordinary sale (${days} days remaining).`
  }
}
