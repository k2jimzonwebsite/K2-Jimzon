import {
  MANILA_TIME_ZONE,
  manilaDateKey,
  manilaReportingWindow,
} from './manilaReportingWindow.js'

// Single-implementation alias over the canonical Manila reporting window.
// overviewPeriod.js keeps its historical exports so existing callers
// (Overview, the prepared overview route) work unchanged, but every instant
// is computed in exactly one place: manilaReportingWindow.js. A second
// fixed-offset implementation here previously duplicated the math and could
// drift from the canonical window without any test noticing.
export const OVERVIEW_TIME_ZONE = MANILA_TIME_ZONE

// The calendar day an instant falls on in Manila, as `YYYY-MM-DD`.
export function overviewDateKey(value) {
  return manilaDateKey(value)
}

export function overviewPeriodStart(days, periodOffset = 0, now = new Date()) {
  const window = manilaReportingWindow(days, { now })
  return new Date(periodOffset === 0 ? window.currentStart : window.priorStart)
}
