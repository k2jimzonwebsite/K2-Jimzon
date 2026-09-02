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
 * The configured minimum shelf life for a category, or the default.
 *
 * Separators are folded to the underscore the table uses, so the category a
 * staff member actually types (`Personal Care`, `personal-care`) resolves to the
 * same row as `personal_care` instead of silently falling back to the default.
 * The lookup is own-key only: a bare index would resolve inherited names such as
 * `constructor` to a function, which is truthy and would then be compared
 * against a day count as if it were a threshold.
 *
 * @param {string} category Product category
 * @returns {number} Minimum sellable days for that category
 */
export function minimumShelfLifeDays(category = 'default') {
  const key = String(category ?? '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z_]/g, '')
  return Object.hasOwn(CATEGORY_MIN_SHELF_LIFE_DAYS, key)
    ? CATEGORY_MIN_SHELF_LIFE_DAYS[key]
    : CATEGORY_MIN_SHELF_LIFE_DAYS.default
}

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
  const minDays = minimumShelfLifeDays(category)

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
