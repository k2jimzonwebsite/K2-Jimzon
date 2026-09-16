import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  UNAVAILABLE_LABEL,
  countProductStock,
  overviewDomainsUnavailable,
  salesExportBlockReason,
  showMetric,
} from '../src/lib/overviewAvailability.js'
import { createSalesRecordCsv } from '../src/lib/salesCalculations.js'
import {
  OVERVIEW_TIME_ZONE,
  overviewDateKey,
  overviewPeriodStart,
} from '../src/lib/overviewPeriod.js'
import {
  MANILA_TIME_ZONE,
  manilaDateKey,
  manilaReportingWindow,
} from '../src/lib/manilaReportingWindow.js'

/**
 * MAP-028 H-005. Operations rulebook section 21 forbids turning a query failure
 * into a zero. A staff member must be able to tell "nothing happened" from
 * "we could not read it".
 */

test('a failed domain is unavailable, not zero', () => {
  const unavailable = overviewDomainsUnavailable([{ key: 'orders', code: 'QUERY_UNAVAILABLE' }])
  expect(unavailable.has('orders')).toBe(true)
  expect(unavailable.has('pasabuy')).toBe(false)

  expect(showMetric(0, { unavailable, domain: 'pasabuy' })).toEqual({ known: true, value: 0 })
  expect(showMetric(0, { unavailable, domain: 'orders' })).toEqual({ known: false, value: UNAVAILABLE_LABEL })
  expect(showMetric(12, { unavailable, domain: 'orders' })).toEqual({ known: false, value: UNAVAILABLE_LABEL })
})

test('a genuine zero stays a zero', () => {
  const unavailable = overviewDomainsUnavailable([])
  expect(unavailable.size).toBe(0)
  expect(showMetric(0, { unavailable, domain: 'orders' })).toEqual({ known: true, value: 0 })
})

test('a metric spanning several domains is unavailable when any of them is', () => {
  const unavailable = overviewDomainsUnavailable([{ key: 'conversations', code: 'QUERY_UNAVAILABLE' }])
  expect(showMetric(3, { unavailable, domain: ['orders', 'conversations'] }).known).toBe(false)
  expect(showMetric(3, { unavailable, domain: ['orders', 'pasabuy'] }).known).toBe(true)
})

test('unknown product stock is counted as unknown, never as out of stock', () => {
  const counts = countProductStock([
    { sku: 'A', stock_available: 0 },
    { sku: 'B', stock_available: 3 },
    { sku: 'C', stock_available: 40 },
    { sku: 'D', stock_available: null },
    { sku: 'E' },
    { sku: 'F', stock_available: 'not-a-number' },
  ])
  expect(counts).toEqual({ outOfStock: 1, lowStock: 1, unknownStock: 3 })
})

test('an export is refused while its source data is unavailable or stale', () => {
  const clean = overviewDomainsUnavailable([])
  const broken = overviewDomainsUnavailable([{ key: 'orders', code: 'QUERY_UNAVAILABLE' }])

  expect(salesExportBlockReason({ unavailable: clean, stale: false })).toBe('')
  expect(salesExportBlockReason({ unavailable: broken, stale: false }))
    .toMatch(/order records could not be read/i)
  expect(salesExportBlockReason({ unavailable: clean, stale: true }))
    .toMatch(/last loaded copy/i)
})

test('the dashboard and stock holds report unavailable data instead of deriving zero', async () => {
  const overview = await readFile(new URL('../src/views/admin/Overview.jsx', import.meta.url), 'utf8')
  const holds = await readFile(new URL('../src/views/admin/ReservationHolds.jsx', import.meta.url), 'utf8')

  expect(overview).toContain('overviewUnavailable')
  // A failed first load must not present an empty, confident hold list. The
  // reassuring wording stays legitimate on a successful read, so what matters is
  // that the failure path reports unavailable figures instead of deriving them.
  expect(holds).toContain('loadFailed')
  expect(holds).toContain('UNAVAILABLE_LABEL')
  expect(holds).toContain("if (loadFailed || !data) {")
  expect(holds).toContain("'Hold status unavailable'")
})

test('the command center counts unknown stock as unknown and orders queues by severity', async () => {
  const overview = await readFile(new URL('../src/views/admin/Overview.jsx', import.meta.url), 'utf8')
  // Null reads must flow through the unknown split, never the falsy-or-zero path.
  expect(overview).toContain('countProductStock(products)')
  expect(overview).not.toMatch(/stock_available \|\| 0\) <= 0/)
  // Queues carry their source domain so failed reads render Unavailable.
  for (const source of ['orderBacklog', 'conversations', 'pasabuy', 'products', 'listings']) {
    expect(overview).toContain(`source: '${source}'`)
  }
  expect(overview).toContain('{display(queue.source, queue.count)}')
  // Severity outranks raw counts; unknown stock is named in the detail.
  expect(overview).toContain('SEVERITY_RANK')
  expect(overview).toContain('unknownStockCount')
})

test('screen and export attribute channels identically', () => {
  const csv = createSalesRecordCsv([
    { created_at: '2026-09-01T00:00:00Z', id: 'a', channel_source: 'mystery-mall', status: 'confirmed', payment_status: 'verified', total_amount: 100 },
    { created_at: '2026-09-01T00:00:00Z', id: 'b', channel_source: '', status: 'confirmed', payment_status: 'verified', total_amount: 50 },
  ])
  expect(csv).toContain(',"other",')
  expect(csv).not.toMatch(/,"(website|shopee|tiktok|lazada|pasabuy)",/)
})

test('sales exports preserve exact channel aliases and reject marketplace-like unknown sources', () => {
  const channels = [
    ['shopee', 'shopee'], ['tiktok_shop', 'tiktok'], ['web', 'website'],
    ['shopee_unmapped', 'other'], ['shopee-ph', 'other'], ['tiktok_unmapped', 'other'],
    ['lazada_unmapped', 'other'], ['pasabuy_unmapped', 'other'],
  ]
  for (const [channel_source, expected] of channels) {
    const csv = createSalesRecordCsv([{ id: 'fixture', channel_source }])
    expect(csv, channel_source).toContain(`,"${expected}",`)
  }
})

test('the overview period aliases the canonical Manila window', () => {
  expect(OVERVIEW_TIME_ZONE).toBe(MANILA_TIME_ZONE)
  const now = new Date('2026-09-12T06:00:00Z')
  for (const days of [7, 30, 90]) {
    const window = manilaReportingWindow(days, { now })
    expect(overviewPeriodStart(days, 0, now).toISOString()).toBe(window.currentStart)
    expect(overviewPeriodStart(days, 1, now).toISOString()).toBe(window.priorStart)
  }
  expect(overviewDateKey('2026-09-11T17:00:00Z')).toBe(manilaDateKey('2026-09-11T17:00:00Z'))
  expect(overviewDateKey('2026-09-11T17:00:00Z')).toBe('2026-09-12')
})
