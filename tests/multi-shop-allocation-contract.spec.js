import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  computeProductShopAllocation,
  DEFAULT_TARGET_UNITS,
  DEFAULT_SHOPS,
  COVERAGE_STATUS,
} from '../src/lib/channelAllocationEngine.js'
import {
  TRANSFER_STATUS,
  validateTransferAvailability,
  createTransferRequest,
  transitionTransferStatus,
} from '../src/lib/custodyTransferEngine.js'

const FORWARD_MIGRATION = 'supabase/migrations/20260917_multi_shop_allocation_and_transfers.sql'
const ROLLBACK_MIGRATION = 'supabase/migrations/20260917_multi_shop_allocation_and_transfers_rollback.sql'

test('channel allocation engine enforces 2-unit target coverage and scarcity order', () => {
  expect(DEFAULT_TARGET_UNITS).toBe(2)
  expect(DEFAULT_SHOPS.length).toBe(6)

  // 1. Ample stock (12 units across 6 shops)
  const fullResult = computeProductShopAllocation({
    masterStock: 12,
    shops: DEFAULT_SHOPS,
    targetUnits: 2,
  })

  expect(fullResult.masterStock).toBe(12)
  expect(fullResult.totalAllocated).toBe(12)
  expect(fullResult.unallocatedMasterStock).toBe(0)
  expect(fullResult.breakdown.length).toBe(6)
  for (const alloc of fullResult.breakdown) {
    expect(alloc.allocatedUnits).toBe(2)
    expect(alloc.status).toBe(COVERAGE_STATUS.COVERED)
  }

  // 2. Scarce stock (3 units across 6 shops)
  const scarceResult = computeProductShopAllocation({
    masterStock: 3,
    shops: DEFAULT_SHOPS,
    targetUnits: 2,
  })

  expect(scarceResult.masterStock).toBe(3)
  expect(scarceResult.totalAllocated).toBe(3)
  expect(scarceResult.unallocatedMasterStock).toBe(0)
  expect(scarceResult.scarcityWarning).toBe(true)
  expect(scarceResult.scarcityDeficit).toBe(9) // 12 needed - 3 available

  // Shop priority 1 (shopee-01) gets 2 (Covered)
  expect(scarceResult.breakdown[0].shopCode).toBe('shopee-01')
  expect(scarceResult.breakdown[0].allocatedUnits).toBe(2)
  expect(scarceResult.breakdown[0].status).toBe(COVERAGE_STATUS.COVERED)

  // Shop priority 2 (shopee-02) gets 1 (Thin)
  expect(scarceResult.breakdown[1].shopCode).toBe('shopee-02')
  expect(scarceResult.breakdown[1].allocatedUnits).toBe(1)
  expect(scarceResult.breakdown[1].status).toBe(COVERAGE_STATUS.THIN)

  // Shops priority 3-6 get 0 (Out)
  for (let i = 2; i < 6; i++) {
    expect(scarceResult.breakdown[i].allocatedUnits).toBe(0)
    expect(scarceResult.breakdown[i].status).toBe(COVERAGE_STATUS.OUT)
  }

  // 3. Zero stock
  const zeroResult = computeProductShopAllocation({
    masterStock: 0,
    shops: DEFAULT_SHOPS,
  })

  expect(zeroResult.totalAllocated).toBe(0)
  for (const alloc of zeroResult.breakdown) {
    expect(alloc.allocatedUnits).toBe(0)
    expect(alloc.status).toBe(COVERAGE_STATUS.OUT)
  }

  // 4. Inactive / Skipped shop
  const shopsWithSkip = DEFAULT_SHOPS.map((s) =>
    s.shopCode === 'tiktok-02' ? { ...s, skipped: true } : s
  )
  const skippedResult = computeProductShopAllocation({
    masterStock: 10,
    shops: shopsWithSkip,
    targetUnits: 2,
  })

  const skippedShop = skippedResult.breakdown.find((a) => a.shopCode === 'tiktok-02')
  expect(skippedShop.status).toBe(COVERAGE_STATUS.SKIPPED)
  expect(skippedShop.allocatedUnits).toBe(0)
  expect(skippedResult.totalAllocated).toBe(10) // remaining 5 active shops get 2 each
})

test('custody transfer state machine validates availability and enforces role transition gates', () => {
  expect(TRANSFER_STATUS.PENDING_APPROVAL).toBe('pending_approval')
  expect(TRANSFER_STATUS.APPROVED).toBe('approved')
  expect(TRANSFER_STATUS.REJECTED).toBe('rejected')
  expect(TRANSFER_STATUS.IN_TRANSIT).toBe('in_transit')
  expect(TRANSFER_STATUS.COMPLETED).toBe('completed')
  expect(TRANSFER_STATUS.CANCELLED).toBe('cancelled')

  // Stock availability validation
  const invalidStock = validateTransferAvailability(5, 2)
  expect(invalidStock.valid).toBe(false)
  expect(invalidStock.error).toBe('INSUFFICIENT_UNRESERVED_LOT_STOCK')

  const validStock = validateTransferAvailability(2, 5)
  expect(validStock.valid).toBe(true)

  // Create transfer request validation
  expect(() =>
    createTransferRequest({
      sku: '',
      quantity: 0,
      reason: '',
      requestedBy: '',
    })
  ).toThrow()

  const validRequest = createTransferRequest({
    sku: 'LAV-ORO-1KG',
    batchId: 'batch-001',
    quantity: 2,
    sourceHub: 'MANILA_MAIN',
    destinationHub: 'CEBU_HUB',
    reason: 'Stock replenishment for live sale',
    requestedBy: 'staff-user-01',
  })

  expect(validRequest.status).toBe(TRANSFER_STATUS.PENDING_APPROVAL)
  expect(validRequest.quantity).toBe(2)
  expect(validRequest.sku).toBe('LAV-ORO-1KG')

  // Transition gates
  // Non-admin cannot approve
  expect(() =>
    transitionTransferStatus(validRequest, TRANSFER_STATUS.APPROVED, {
      actorId: 'staff-user-01',
      actorRole: 'staff',
    })
  ).toThrow(/UNAUTHORIZED_TRANSFER_REVIEW/)

  // Admin can approve
  const approved = transitionTransferStatus(validRequest, TRANSFER_STATUS.APPROVED, {
    actorId: 'admin-user-01',
    actorRole: 'admin',
  })
  expect(approved.status).toBe(TRANSFER_STATUS.APPROVED)
  expect(approved.reviewedBy).toBe('admin-user-01')

  // Rejection requires reason
  expect(() =>
    transitionTransferStatus(validRequest, TRANSFER_STATUS.REJECTED, {
      actorId: 'admin-user-01',
      actorRole: 'admin',
      rejectionReason: '',
    })
  ).toThrow(/REJECTION_REASON_REQUIRED/)

  // Staff can move approved to in_transit
  const inTransit = transitionTransferStatus(approved, TRANSFER_STATUS.IN_TRANSIT, {
    actorId: 'staff-user-01',
    actorRole: 'staff',
  })
  expect(inTransit.status).toBe(TRANSFER_STATUS.IN_TRANSIT)

  // Staff can complete in_transit
  const completed = transitionTransferStatus(inTransit, TRANSFER_STATUS.COMPLETED, {
    actorId: 'staff-user-01',
    actorRole: 'staff',
  })
  expect(completed.status).toBe(TRANSFER_STATUS.COMPLETED)
  expect(completed.completedAt).toBeTruthy()

  // Completed cannot transition to pending_approval
  expect(() =>
    transitionTransferStatus(completed, TRANSFER_STATUS.PENDING_APPROVAL, {
      actorId: 'admin-user-01',
      actorRole: 'admin',
    })
  ).toThrow(/ILLEGAL_TRANSFER_TRANSITION/)
})

test('multi-shop allocation and custody migrations adhere to SQL transaction and safety invariants', async () => {
  const forwardSql = await readFile(FORWARD_MIGRATION, 'utf8')

  expect(forwardSql).toMatch(/^begin;/m)
  expect(forwardSql).toMatch(/commit;\s*$/m)

  // Table creation
  expect(forwardSql).toContain('create table if not exists public.channel_shop_allocations')
  expect(forwardSql).toContain('create table if not exists public.inventory_transfer_requests')

  // Stored procedures and views
  expect(forwardSql).toContain('create or replace view public.v_multi_shop_stock_projection')
  expect(forwardSql).toContain('create or replace function public.request_inventory_transfer')
  expect(forwardSql).toContain('create or replace function public.review_inventory_transfer')
  expect(forwardSql).toContain('create or replace function public.rebalance_shop_allocations_v1')

  // Safe role handling for blank environments
  expect(forwardSql).toContain('exception when undefined_object then null')

  // Rollback file invariants
  const rollbackSql = await readFile(ROLLBACK_MIGRATION, 'utf8')
  expect(rollbackSql).toMatch(/^begin;/m)
  expect(rollbackSql).toMatch(/commit;\s*$/m)
  expect(rollbackSql).toContain('drop view if exists public.v_multi_shop_stock_projection')
  expect(rollbackSql).toContain('drop table if exists public.inventory_transfer_requests')
  expect(rollbackSql).toContain('drop table if exists public.channel_shop_allocations')
})

test('anti-emoji and humanizer tone invariants are maintained across new components', async () => {
  const filesToCheck = [
    'src/lib/channelAllocationEngine.js',
    'src/lib/custodyTransferEngine.js',
    'src/views/admin/ShopAllocationManager.jsx',
  ]

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
  const emDashRegex = /\u2014/

  for (const file of filesToCheck) {
    const content = await readFile(file, 'utf8')
    expect(emojiRegex.test(content), `File ${file} must contain zero raw emojis`).toBe(false)
    expect(emDashRegex.test(content), `File ${file} must contain zero em dashes`).toBe(false)
  }
})
