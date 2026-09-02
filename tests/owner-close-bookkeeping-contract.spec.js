import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { ADMIN_BFF_ROUTES, ADMIN_BFF_ROUTE_CONTROLS } from '../server/admin-bff/router.js'
import { boundedAdminCommandRoute, completeOwnerCloseBookkeepingHandoffBff, getOwnerCloseBookkeepingHandoffBff } from '../src/services/adminBffService.js'
import { buildOwnerCloseBookkeepingCsv } from '../src/lib/ownerCloseBookkeepingHandoff.js'

const handoff = {
  sessionId: 'session-1', periodStart: '2026-08-01', periodEnd: '2026-08-31', timezone: 'Asia/Manila',
  customerMinimized: true, estimateOnly: true, officialBooks: false, settlementReconciled: false, actualProfit: false,
  summary: {
    shops: [{ shopCode: '=unsafe', displayName: '+K2 Shop', channelCode: 'shopee', orderImportId: 'import-1', acceptedLines: 1, duplicateLines: 0, conflictLines: 0, unresolvedLines: 0, currency: 'PHP', grossMinor: 10000, estimatedFeeMinor: 1000, estimatedNetMinor: 9000, feePolicyVersion: 'manual-v1', feeEstimateVersion: 1 }],
    stock: { linkedProducts: 1, reviewedProducts: 1, totalPhysicalCount: 2, netDiscrepancy: 0 },
    pasabuy: { openRequests: 1, reviewedRequests: 1, ready: 1, notReady: 0, notApplicable: 0 },
  },
}

test('bookkeeping handoff has a bounded authenticated completion boundary', () => {
  expect(ADMIN_BFF_ROUTES).toContain('owner-close/bookkeeping')
  expect(ADMIN_BFF_ROUTE_CONTROLS['owner-close/bookkeeping'].additionalMethods.POST).toMatchObject({ csrf: true, idempotency: true })
  expect(boundedAdminCommandRoute('owner-close', 'bookkeeping')).toBe('/api/admin/owner-close/bookkeeping')
  expect(typeof getOwnerCloseBookkeepingHandoffBff).toBe('function')
  expect(typeof completeOwnerCloseBookkeepingHandoffBff).toBe('function')
})

test('customer-free handoff CSV is fixed-schema, formula-safe, and explicitly non-accounting', () => {
  const csv = buildOwnerCloseBookkeepingCsv(handoff)
  expect(csv).toContain("'=unsafe")
  expect(csv).toContain("'+K2 Shop")
  expect(csv).not.toMatch(/customer|email|phone|address/i)
  expect(csv).toContain('"estimate_only","official_books","settlement_reconciled","actual_profit"')
  expect(csv).toContain('"true","false","false","false"')
})

test('database completion is blocker-aware, durable, and customer-minimized', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260831_marketplace_snapshot_staging.sql', import.meta.url), 'utf8')
  expect(migration).toContain('read_admin_owner_close_bookkeeping_handoff_v1')
  expect(migration).toContain("'owner_close_bookkeeping_handoff_save'")
  expect(migration).toContain("'bookkeeping_handoff_completed'")
  expect(migration).toContain("'customerMinimized',true,'estimateOnly',true,'officialBooks',false")
})
