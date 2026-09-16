import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { createRateShield } from '../server/rate-shield.js'

// MAP-020 F-020-004: bounded in-memory buckets shield RPC cost in front of the
// authoritative durable budgets. Early 429s must not require proportional RPC
// growth — the shield decides before any handler runs.
test('a burst past the bucket is shed with a retry delay', () => {
  let now = 1_000_000
  const shield = createRateShield({ windowMs: 60_000, limit: 3, now: () => now })
  expect(shield.consume('order\n10.0.0.1')).toEqual({ allowed: true, retryAfter: 0 })
  expect(shield.consume('order\n10.0.0.1')).toEqual({ allowed: true, retryAfter: 0 })
  expect(shield.consume('order\n10.0.0.1')).toEqual({ allowed: true, retryAfter: 0 })
  const shed = shield.consume('order\n10.0.0.1')
  expect(shed.allowed).toBe(false)
  expect(shed.retryAfter).toBeGreaterThan(0)
  expect(shield.consume('coupon\n10.0.0.1').allowed).toBe(true)
  expect(shield.consume('order\n10.0.0.2').allowed).toBe(true)
  now += 60_001
  expect(shield.consume('order\n10.0.0.1')).toEqual({ allowed: true, retryAfter: 0 })
})

test('both consolidated routers shed floods before their handlers run', async () => {
  const storefront = await readFile(new URL('../server/storefront-bff/router.js', import.meta.url), 'utf8')
  expect(storefront).toContain('STOREFRONT_RATE_SHIELD')
  expect(storefront).toContain("error: { code: 'RATE_LIMITED' }")
  expect(storefront.indexOf('STOREFRONT_RATE_SHIELD.consume')).toBeLessThan(storefront.indexOf('return handler(req, res)'))
  const admin = await readFile(new URL('../server/admin-bff/router.js', import.meta.url), 'utf8')
  expect(admin).toContain('ADMIN_AUTH_RATE_SHIELD')
  expect(admin).toContain("error: { code: 'RATE_LIMITED' }")
})
