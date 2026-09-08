import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  MANILA_TIME_ZONE,
  manilaDateKey,
  manilaReportingWindow,
} from '../src/lib/manilaReportingWindow.js'

/**
 * MAP-028 H-006. The rulebook reports the business day in Asia/Manila. Browser
 * local midnight and UTC midnight both produce a different day for staff in
 * Italy, and the UTC start silently omits the first eight hours of the intended
 * prior Manila day.
 */

test('the window is Manila midnight to Manila midnight, whoever is looking', () => {
  expect(MANILA_TIME_ZONE).toBe('Asia/Manila')

  // 2026-09-05T15:30Z is already 2026-09-05 23:30 in Manila.
  const window = manilaReportingWindow(7, { now: new Date('2026-09-05T15:30:00Z') })
  expect(window.currentStart).toBe('2026-08-29T16:00:00.000Z') // 2026-08-30 00:00 Manila
  expect(window.currentEnd).toBe('2026-09-05T16:00:00.000Z') // exclusive: 2026-09-06 00:00 Manila
  expect(window.priorStart).toBe('2026-08-22T16:00:00.000Z')
  expect(window.priorEnd).toBe(window.currentStart)
  expect(window.days).toBe(7)
})

test('an instant just after Manila midnight belongs to the new Manila day, not the old UTC one', () => {
  // 2026-09-05T16:10Z is 2026-09-06 00:10 in Manila: a new business day.
  const window = manilaReportingWindow(7, { now: new Date('2026-09-05T16:10:00Z') })
  expect(window.currentEnd).toBe('2026-09-06T16:00:00.000Z') // 2026-09-07 00:00 Manila
  expect(manilaDateKey('2026-09-05T16:10:00Z')).toBe('2026-09-06')
  // The same instant is still 5 September in UTC and 6 p.m. on the 5th in Rome.
  expect(manilaDateKey('2026-09-05T15:50:00Z')).toBe('2026-09-05')
})

test('Manila has no daylight saving, so an Italian summer-to-winter change cannot move a bucket', () => {
  // Rome shifts CEST → CET on 2026-10-25. Manila keeps UTC+8 either side.
  expect(manilaDateKey('2026-10-24T16:00:00Z')).toBe('2026-10-25')
  expect(manilaDateKey('2026-10-26T16:00:00Z')).toBe('2026-10-27')
  const before = manilaReportingWindow(30, { now: new Date('2026-10-24T20:00:00Z') })
  const after = manilaReportingWindow(30, { now: new Date('2026-10-26T20:00:00Z') })
  expect(before.currentEnd).toBe('2026-10-25T16:00:00.000Z') // 2026-10-26 00:00 Manila
  expect(after.currentEnd).toBe('2026-10-27T16:00:00.000Z') // 2026-10-28 00:00 Manila
})

test('only the supported ranges produce a window', () => {
  for (const days of [7, 30, 90]) {
    expect(manilaReportingWindow(days).days).toBe(days)
  }
  expect(() => manilaReportingWindow(45)).toThrow(/range/i)
  expect(() => manilaReportingWindow('7')).toThrow(/range/i)
})

test('the prior period is the same length and never overlaps the current one', () => {
  for (const days of [7, 30, 90]) {
    const window = manilaReportingWindow(days, { now: new Date('2026-09-05T15:30:00Z') })
    const spanOf = (start, end) => (Date.parse(end) - Date.parse(start)) / 86_400_000
    expect(spanOf(window.currentStart, window.currentEnd)).toBe(days)
    expect(spanOf(window.priorStart, window.priorEnd)).toBe(days)
    expect(Date.parse(window.priorEnd)).toBe(Date.parse(window.currentStart))
  }
})

test('the overview API and the dashboard share one window instead of two definitions', async () => {
  const api = await readFile(new URL('../prepared-api/admin/overview.js', import.meta.url), 'utf8')
  const view = await readFile(new URL('../src/views/admin/Overview.jsx', import.meta.url), 'utf8')

  expect(api).toContain('overviewPeriodStart')
  expect(api).not.toContain('setUTCHours(0, 0, 0, 0)')
  expect(view).toContain('overviewPeriodStart')
  expect(view).toContain('overviewDateKey')
  expect(view).not.toContain('date.setHours(0, 0, 0, 0)')
  // A slower earlier range must not replace the range staff are now looking at.
  expect(view).toContain('requestSequence')
})
