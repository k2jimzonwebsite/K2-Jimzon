// MAP-023 delivery rate input handling.
//
// Extracted from DeliveryRateControl.jsx so the two decisions that turn staff
// keystrokes into a published courier cost can be tested directly. Both were
// previously private to a 753-line component, which meant the money parsing on
// the path to `publishDeliveryCostBff` had no coverage at all.

/**
 * Today's date in Asia/Manila, as `YYYY-MM-DD`.
 *
 * Rate intervals are compared as plain calendar dates, so the workstation's own
 * timezone must not decide them. A staff member in Manila publishing at 8am
 * would otherwise get the previous day from a UTC host and open an interval that
 * appears to have started yesterday.
 *
 * @returns {string} ISO calendar date
 */
export function manilaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const at = (type) => parts.find((part) => part.type === type)?.value
  return `${at('year')}-${at('month')}-${at('day')}`
}

/**
 * A typed peso amount as whole centavos, or null when it is not a usable cost.
 *
 * Null is the refusal signal the caller checks before publishing. A blank,
 * zero, negative, or unparseable amount must never reach the rate register:
 * `delivery_cost_rows` treats a missing amount as unknown, and an active row
 * with an unknown amount is exactly the state that lets an unknown fee reach a
 * customer.
 *
 * Trailing text is rejected rather than silently truncated. `Number.parseFloat`
 * alone would read "95.15 or so" as 95.15, publishing a number the staff member
 * never confirmed.
 *
 * @param {string|number} value
 * @returns {number|null} centavos, or null when unusable
 */
export function pesoInputToMinor(value) {
  const text = String(value ?? '').replace(/,/g, '').trim()
  // Digits with at most two decimal places. Anything else is a typo, not a cost.
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const parsed = Number.parseFloat(text)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  // Cent arithmetic on binary floats: 95.15 * 100 is 9514.999999999998, so the
  // rounding is required rather than cosmetic.
  const minor = Math.round(parsed * 100)
  return minor > 0 ? minor : null
}
