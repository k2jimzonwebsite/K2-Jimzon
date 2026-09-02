import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { ADMIN_BFF_ROUTES, ADMIN_BFF_ROUTE_CONTROLS } from '../server/admin-bff/router.js'
import { boundedAdminCommandRoute, getOwnerClosePasabuyBff, saveOwnerClosePasabuyReviewBff } from '../src/services/adminBffService.js'

test('Pasabuy boxing readiness uses an authenticated idempotent owner-close boundary', () => {
  expect(ADMIN_BFF_ROUTES).toContain('owner-close/pasabuy')
  expect(ADMIN_BFF_ROUTE_CONTROLS['owner-close/pasabuy']).toMatchObject({
    method: 'GET', identity: 'active-aal2-session',
    additionalMethods: { POST: { csrf: true, idempotency: true, rateLimit: 'database' } },
  })
  expect(typeof getOwnerClosePasabuyBff).toBe('function')
  expect(typeof saveOwnerClosePasabuyReviewBff).toBe('function')
  expect(boundedAdminCommandRoute('owner-close', 'pasabuy')).toBe('/api/admin/owner-close/pasabuy')
})

test('Pasabuy close input is customer-minimized and cannot mutate canonical request status', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260831_marketplace_snapshot_staging.sql', import.meta.url), 'utf8')
  const handler = await readFile(new URL('../server/admin-bff/marketplace-snapshots.js', import.meta.url), 'utf8')
  expect(migration).toContain('read_admin_owner_close_pasabuy_input_v1')
  expect(migration).toContain("'canonicalPasabuyStatusChanged',false")
  expect(migration).not.toMatch(/owner_close_pasabuy_review_save[\s\S]{0,8000}update\s+public\.pasabuy_requests/i)
  expect(handler).toContain("exactObject(await readMarketplaceJson(req), ['sessionId', 'requestId', 'readiness', 'reason'])")
  expect(handler).not.toMatch(/customer(Name|Email|Phone)/)
})
