/**
 * One reporting window for the whole business.
 *
 * The operations rulebook reports the business day in Asia/Manila. Browser-local
 * midnight and UTC midnight both give a different answer for staff working from
 * Italy, and a UTC start silently drops the first eight hours of the intended
 * prior Manila day. Every producer and consumer of a reporting range uses this
 * module so a dashboard, an API and an export cannot disagree about which day a
 * sale belongs to.
 *
 * Asia/Manila is UTC+08:00 year-round: the Philippines has observed no daylight
 * saving since 1978, so a fixed offset is exact here and stays exact when the
 * viewer's own zone changes for summer time.
 */

export const MANILA_TIME_ZONE = 'Asia/Manila'
export const MANILA_UTC_OFFSET_MINUTES = 8 * 60

const SUPPORTED_RANGES = Object.freeze([7, 30, 90])
const DAY_MS = 86_400_000
const OFFSET_MS = MANILA_UTC_OFFSET_MINUTES * 60_000

export function isSupportedReportingRange(days) {
  return SUPPORTED_RANGES.includes(days)
}

/** The calendar day an instant falls on in Manila, as `YYYY-MM-DD`. */
export function manilaDateKey(value) {
  const instant = value instanceof Date ? value : new Date(value)
  const time = instant.getTime()
  if (!Number.isFinite(time)) return ''
  return new Date(time + OFFSET_MS).toISOString().slice(0, 10)
}

/** Midnight in Manila, at the start of the Manila day containing `value`. */
function manilaMidnightUtcMs(value) {
  const shifted = value.getTime() + OFFSET_MS
  return Math.floor(shifted / DAY_MS) * DAY_MS - OFFSET_MS
}

/**
 * The current and prior comparison periods for a supported range.
 *
 * Boundaries are inclusive of `currentStart` and exclusive of `currentEnd`, so a
 * row is counted in exactly one period. `currentEnd` is the next Manila midnight,
 * which keeps today's activity inside the current period.
 */
export function manilaReportingWindow(days, { now = new Date() } = {}) {
  if (!isSupportedReportingRange(days)) {
    throw new Error(`Unsupported reporting range: ${days}. Use one of ${SUPPORTED_RANGES.join(', ')} days.`)
  }
  const todayStart = manilaMidnightUtcMs(now instanceof Date ? now : new Date(now))
  const currentEnd = todayStart + DAY_MS
  const currentStart = currentEnd - days * DAY_MS
  const priorStart = currentStart - days * DAY_MS
  return {
    days,
    timeZone: MANILA_TIME_ZONE,
    currentStart: new Date(currentStart).toISOString(),
    currentEnd: new Date(currentEnd).toISOString(),
    priorStart: new Date(priorStart).toISOString(),
    priorEnd: new Date(currentStart).toISOString(),
  }
}

/** Manila day keys covering a window, oldest first — the chart's x-axis. */
export function manilaDayKeys(window) {
  const keys = []
  for (let time = Date.parse(window.currentStart); time < Date.parse(window.currentEnd); time += DAY_MS) {
    keys.push(manilaDateKey(new Date(time)))
  }
  return keys
}
