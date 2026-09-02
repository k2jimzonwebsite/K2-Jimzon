import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  OWNER_CLOSE_STEPS,
  buildOwnerCloseSessionDraft,
  nextPendingMarketplaceRow,
  summarizeMarketplaceRows,
} from '../src/views/admin/ownerCountCloseModel.js'
import {
  decideMarketplaceSnapshotRowBff,
  getOwnerCloseCoverageBff,
  getOwnerCloseFeesBff,
  getOwnerCloseStockBff,
  getOwnerClosePasabuyBff,
  getOwnerCloseBookkeepingHandoffBff,
  saveOwnerCloseCoverageOverrideBff,
  saveOwnerCloseFeeEstimateBff,
  saveOwnerCloseStockReviewBff,
  saveOwnerClosePasabuyReviewBff,
  completeOwnerCloseBookkeepingHandoffBff,
  reconcileLotsBff,
  getMarketplaceSnapshotStatusBff,
  getMarketplaceOrderStatusBff,
  getOwnerCloseWorkspaceBff,
  saveOwnerCloseSessionBff,
  stageMarketplaceOrdersBff,
  stageMarketplaceSnapshotBff,
} from '../src/services/adminBffService.js'

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('Owner Count & Close uses the accepted resumable step order without inventing completion', () => {
  expect(OWNER_CLOSE_STEPS.map((step) => step.id)).toEqual([
    'source_selection', 'source_import', 'product_matching', 'sales_reconciliation',
    'fee_estimates', 'stock_count', 'coverage_review', 'pasabuy_boxing',
    'bookkeeping_handoff',
  ])
  expect(OWNER_CLOSE_STEPS.every((step) => step.available)).toBe(true)
})

test('close-session draft is exact-shop, Asia/Manila, versioned, and bounded', () => {
  expect(buildOwnerCloseSessionDraft({
    sessionId: '70000000-0000-4000-8000-000000000001',
    periodStart: '2026-08-01', periodEnd: '2026-08-31',
    shopIds: ['20000000-0000-4000-8000-000000000001'],
    currentStep: 'source_selection', expectedVersion: 1,
  })).toEqual({
    sessionId: '70000000-0000-4000-8000-000000000001',
    periodStart: '2026-08-01', periodEnd: '2026-08-31', timezone: 'Asia/Manila',
    shopIds: ['20000000-0000-4000-8000-000000000001'],
    currentStep: 'source_selection', expectedVersion: 1,
  })
  expect(() => buildOwnerCloseSessionDraft({
    sessionId: 'bad', periodStart: '2026-08-31', periodEnd: '2026-08-01',
    shopIds: [], currentStep: 'source_selection', expectedVersion: 0,
  })).toThrow('OWNER_CLOSE_SESSION_INVALID')
})

test('review summary preserves duplicates, conflicts, unresolved rows, and the next human decision', () => {
  const rows = [
    { id: '1', outcome: 'accepted', matchStatus: 'linked' },
    { id: '2', outcome: 'accepted', matchStatus: 'pending' },
    { id: '3', outcome: 'accepted', matchStatus: 'unresolved' },
    { id: '4', outcome: 'duplicate', matchStatus: 'duplicate' },
    { id: '5', outcome: 'conflict', matchStatus: 'conflict' },
  ]
  expect(summarizeMarketplaceRows(rows)).toEqual({
    total: 5, pending: 1, linked: 1, createdDraft: 0, unresolved: 1,
    duplicates: 1, conflicts: 1,
  })
  expect(nextPendingMarketplaceRow(rows)?.id).toBe('2')
})

test('phone workflow is wired only through fixed Admin BFF services and exposes complete states', async () => {
  for (const fn of [
    getOwnerCloseWorkspaceBff, saveOwnerCloseSessionBff, stageMarketplaceSnapshotBff,
    getMarketplaceSnapshotStatusBff, decideMarketplaceSnapshotRowBff,
    stageMarketplaceOrdersBff, getMarketplaceOrderStatusBff,
    getOwnerCloseFeesBff, saveOwnerCloseFeeEstimateBff,
    getOwnerCloseStockBff, saveOwnerCloseStockReviewBff, reconcileLotsBff,
    getOwnerCloseCoverageBff,
    saveOwnerCloseCoverageOverrideBff,
    getOwnerClosePasabuyBff, saveOwnerClosePasabuyReviewBff,
    getOwnerCloseBookkeepingHandoffBff, completeOwnerCloseBookkeepingHandoffBff,
  ]) expect(typeof fn).toBe('function')

  const component = await source('src/views/admin/OwnerCountClose.jsx')
  const admin = await source('src/views/admin/Admin.jsx')
  const handler = await source('server/admin-bff/marketplace-snapshots.js')
  const migration = await source('supabase/migrations/20260831_marketplace_snapshot_staging.sql')

  expect(component).not.toContain("from '../../lib/supabaseClient'")
  for (const copy of [
    'Owner Count & Close', 'Reported quantity is observation evidence',
    'Link existing', 'Create new Draft', 'Leave unresolved',
    'Loading close workspace', 'No staged import yet', 'Offline',
    'changed in another session', 'Try again', 'not official books',
    'Deduplicate and reconcile sales/order facts', 'Canonical inventory changed: No',
    'Calculate versioned marketplace fee estimates', 'not provider settlement',
    'Compare expected stock with physical and canonical stock',
    'Record reasoned discrepancies through controlled reconciliation',
    'Review flexible per-shop coverage and low/zero warnings',
    'Proposal only. Provider write: No. Custody transfer: No.',
    'Check customer-minimized Pasabuy boxing readiness',
    'Canonical Pasabuy status changed: No.',
    'Prepare the customer-free bookkeeping handoff',
    'Complete close & seal handoff',
  ]) expect(component).toContain(copy)
  expect(admin).toContain("owner_close:")
  expect(admin).toContain("section === 'owner_close'")
  expect(handler).toContain('read_admin_marketplace_shop_options_v1')
  expect(migration).toContain('create or replace function public.read_admin_marketplace_shop_options_v1()')
})
