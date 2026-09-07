export const OVERVIEW_TIME_ZONE = 'Asia/Manila'
const DAY_MS = 86_400_000
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000

// Modern operational records use Philippine time (UTC+08, no daylight saving).
export function overviewDateKey(value) {
  return new Date(new Date(value).getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10)
}

export function overviewPeriodStart(days, periodOffset = 0, now = new Date()) {
  const midnight = new Date(`${overviewDateKey(now)}T00:00:00+08:00`).getTime()
  return new Date(midnight - (days - 1 + days * periodOffset) * DAY_MS)
}
