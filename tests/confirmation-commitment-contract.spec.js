import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const migration = 'supabase/migrations/20260912_confirmation_stock_commitment.sql'
const rollback = 'supabase/confirmation_stock_commitment_rollback.sql'
const runner = 'scripts/rehearse-purchase-time-reservation.mjs'

test('the commitment migration is additive and never rewrites history', async () => {
  const sql = await readFile(migration, 'utf8')
  expect(sql).toMatch(/add column if not exists committed_at timestamptz/)
  expect(sql).toMatch(/add column if not exists commit_cause text/)
  expect(sql).not.toMatch(/drop table|drop column|truncate|delete from/i)
})

test('the commitment helper is internal-only with an exact cause allowlist', async () => {
  const sql = await readFile(migration, 'utf8')
  expect(sql).toMatch(
    /revoke all on function public\.commit_order_request_stock_v1\(uuid,text,text\)\s*\n?\s*from public, anon, authenticated;/,
  )
  expect(sql).toMatch(/p_cause not in \('confirmation', 'payment_verification'\)/)
  expect(sql).toMatch(/raise exception 'Unknown stock commitment cause'/)
})

test('confirmation deducts ownership without moving physical custody', async () => {
  const sql = await readFile(migration, 'utf8')
  expect(sql).toMatch(
    /perform public\.commit_order_request_stock_v1\(v_order\.id, 'confirmation', p_reason\);/,
  )
  expect(sql).toMatch(/event_type, quantity, reference_type, reference_id[^;]*'stock_committed'/)
  // Physical quantity and encumbered counters are intentionally untouched.
  const helper = sql.slice(
    sql.indexOf('create or replace function public.commit_order_request_stock_v1'),
    sql.indexOf('comment on function public.commit_order_request_stock_v1'),
  )
  expect(helper).not.toMatch(/product_batches|inventory_balances/)
})

test('the sweep exempts committed allocations in both selection passes', async () => {
  const sql = await readFile(migration, 'utf8')
  const guards = sql.match(/r\.committed_at is not null/g) || []
  expect(guards.length).toBeGreaterThanOrEqual(2)
})

test('rollback restores prior bodies without erasing commitment audit facts', async () => {
  const sql = await readFile(rollback, 'utf8')
  expect(sql).toMatch(/20260902_purchase_time_reservation\.sql/)
  expect(sql).toMatch(/20260906_atomic_order_hold_expiry\.sql/)
  expect(sql).toMatch(/drop function if exists public\.commit_order_request_stock_v1\(uuid,text,text\);/)
  expect(sql).not.toMatch(/drop column/i)
})

test('the rehearsal applies the migration with replay before asserting', async () => {
  const js = await readFile(runner, 'utf8')
  expect(js).toMatch(/20260912_confirmation_stock_commitment\.sql/)
  expect(js).toMatch(/confirmation stock commitment replay/)
  expect(js).toMatch(/confirmation_commitment_behavior\.sql/)
})

test('deriveOwnedStock calculates owned stock from physical and committed allocations', async () => {
  const { deriveOwnedStock } = await import('../src/lib/ownedStock.js')
  const batches = [
    { id: 'b1', sku: 'SKU-01', quantity: 10, reserved_quantity: 3 },
    { id: 'b2', sku: 'SKU-01', quantity: 10, reserved_quantity: 2 },
  ]
  const reservations = [
    {
      id: 'r1', order_request_id: 'o1', sku: 'SKU-01', batch_id: 'b1', quantity: 3, status: 'active',
      committed_at: '2026-09-14T00:00:00Z', committed_by: 'staff-uuid-1', commit_cause: 'confirmation',
    },
    {
      id: 'r2', order_request_id: 'o2', sku: 'SKU-01', batch_id: 'b2', quantity: 2, status: 'active',
      committed_at: null, committed_by: null, commit_cause: null,
    },
    {
      id: 'r3', order_request_id: 'o3', sku: 'SKU-01', batch_id: 'b1', quantity: 5, status: 'released',
      committed_at: null,
    },
  ]
  const orders = new Map([
    ['o1', { id: 'o1', status: 'confirmed', payment_status: 'pending' }],
    ['o2', { id: 'o2', status: 'submitted', payment_status: 'pending' }],
  ])

  const result = deriveOwnedStock({ sku: 'SKU-01', batches, reservations, orders })
  expect(result.physicalQuantity).toBe(20)
  expect(result.committedQuantity).toBe(3)
  expect(result.heldQuantity).toBe(2)
  expect(result.reservedQuantity).toBe(5)
  expect(result.ownedQuantity).toBe(17) // 20 - 3
  expect(result.availableQuantity).toBe(15) // 20 - 5
  expect(result.requiresReconciliation).toBe(false)
  expect(result.healthyTotal).toBe(true)
  expect(result.unresolvedCount).toBe(0)
  expect(result.unresolvedQuantity).toBe(0)
  expect(result.unresolvedAllocations).toEqual([])
})

test('deriveOwnedStock flags legacy unattributed confirmed and verified allocations as unresolved', async () => {
  const { deriveOwnedStock } = await import('../src/lib/ownedStock.js')
  const batches = [{ id: 'b1', sku: 'SKU-02', quantity: 10, reserved_quantity: 5 }]
  const reservations = [
    // Active reservation on confirmed order without commitment attribution
    {
      id: 'r-legacy-1', order_request_id: 'o-conf', sku: 'SKU-02', batch_id: 'b1', quantity: 3, status: 'active',
      committed_at: null, committed_by: null, commit_cause: null,
    },
    // Active reservation on verified payment order without commitment attribution
    {
      id: 'r-legacy-2', order_request_id: 'o-verif', sku: 'SKU-02', batch_id: 'b1', quantity: 2, status: 'active',
      committed_at: null, committed_by: null, commit_cause: null,
    },
  ]
  const orders = new Map([
    ['o-conf', { id: 'o-conf', status: 'confirmed', payment_status: 'pending' }],
    ['o-verif', { id: 'o-verif', status: 'submitted', payment_status: 'verified' }],
  ])

  const result = deriveOwnedStock({ sku: 'SKU-02', batches, reservations, orders })
  expect(result.requiresReconciliation).toBe(true)
  expect(result.healthyTotal).toBe(false)
  expect(result.unresolvedCount).toBe(2)
  expect(result.unresolvedQuantity).toBe(5)
  expect(result.ownedQuantity).toBeNull() // Never turn into healthy total
  expect(result.unresolvedAllocations.map(a => a.reason)).toEqual([
    'UNATTRIBUTED_CONFIRMED_ORDER',
    'UNATTRIBUTED_VERIFIED_ORDER',
  ])
})

test('deriveOwnedStock flags malformed commitment data as unresolved', async () => {
  const { deriveOwnedStock } = await import('../src/lib/ownedStock.js')
  const batches = [{ id: 'b1', sku: 'SKU-03', quantity: 10, reserved_quantity: 4 }]
  const reservations = [
    {
      id: 'r-bad-1', order_request_id: 'o1', sku: 'SKU-03', batch_id: 'b1', quantity: 2, status: 'active',
      committed_at: '2026-09-14T00:00:00Z', committed_by: null, commit_cause: 'confirmation',
    },
    {
      id: 'r-bad-2', order_request_id: 'o2', sku: 'SKU-03', batch_id: 'b1', quantity: 2, status: 'active',
      committed_at: '2026-09-14T00:00:00Z', committed_by: 'staff-uuid', commit_cause: 'arbitrary_hack',
    },
  ]
  const orders = new Map([
    ['o1', { id: 'o1', status: 'submitted', payment_status: 'pending' }],
    ['o2', { id: 'o2', status: 'submitted', payment_status: 'pending' }],
  ])

  const result = deriveOwnedStock({ sku: 'SKU-03', batches, reservations, orders })
  expect(result.requiresReconciliation).toBe(true)
  expect(result.healthyTotal).toBe(false)
  expect(result.unresolvedCount).toBe(2)
  expect(result.unresolvedQuantity).toBe(4)
  expect(result.ownedQuantity).toBeNull()
  expect(result.unresolvedAllocations.every(a => a.reason === 'MALFORMED_COMMITMENT_DATA')).toBe(true)
})

test('readLotData integrates derived stock and allocation visibility', async () => {
  const { readLotData } = await import('../server/admin-bff/lots.js')
  const batchesData = [
    { id: 'b1', sku: 'SKU-READ', box_code: 'BOX-1', batch_code: 'LOT-1', quantity: 12, reserved_quantity: 4, expiry_date: '2027-01-01', hub: 'Manila', custodian: 'Staff' },
  ]
  const reservationsData = [
    { id: 'r1', order_request_id: 'o1', sku: 'SKU-READ', batch_id: 'b1', quantity: 4, status: 'active', committed_at: '2026-09-14T00:00:00Z', committed_by: 'staff-1', commit_cause: 'confirmation' },
  ]
  const ordersData = [
    { id: 'o1', status: 'confirmed', payment_status: 'pending' },
  ]
  const mockClient = {
    from: (table) => {
      if (table === 'product_batches') {
        return {
          select: () => ({
            order: () => ({
              limit: () => ({
                eq: () => Promise.resolve({ data: batchesData, error: null }),
                then: (cb) => Promise.resolve({ data: batchesData, error: null }).then(cb),
              }),
            }),
          }),
        }
      }
      if (table === 'products') {
        return { select: () => ({ in: () => ({ limit: () => Promise.resolve({ data: [{ sku: 'SKU-READ', name: 'Test Product' }], error: null }) }) }) }
      }
      if (table === 'inventory_reservations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: reservationsData, error: null }),
              limit: () => Promise.resolve({ data: reservationsData, error: null }),
              in: () => Promise.resolve({ data: reservationsData, error: null }),
            }),
          }),
        }
      }
      if (table === 'order_requests') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: ordersData, error: null }),
          }),
        }
      }
      return { select: () => Promise.resolve({ data: [], error: null }) }
    },
  }

  const result = await readLotData(mockClient, 'SKU-READ')
  expect(result.lots).toBeDefined()
  expect(result.derivedStock).toBeDefined()
  expect(result.derivedStock['SKU-READ'].ownedQuantity).toBe(8) // 12 - 4
  expect(result.derivedStock['SKU-READ'].committedQuantity).toBe(4)
  expect(result.derivedStock['SKU-READ'].requiresReconciliation).toBe(false)
  expect(result.lots[0].activeAllocations).toHaveLength(1)
  expect(result.lots[0].activeAllocations[0].committed).toBe(true)
})

test('computeInventoryMetrics tracks unresolved allocations and flags reconciliation required', async () => {
  const { computeInventoryMetrics } = await import('../src/lib/ownedStock.js')
  const products = [
    { sku: 'SKU-HEALTHY', stock_available: 10, status: 'Live' },
    { sku: 'SKU-UNRESOLVED', stock_available: 5, status: 'Live' },
  ]
  const batchMap = {
    'SKU-HEALTHY': { total: 10, requiresReconciliation: false, owned: 10 },
    'SKU-UNRESOLVED': { total: 5, requiresReconciliation: true, unresolvedCount: 1, unresolvedQuantity: 2 },
  }

  const metrics = computeInventoryMetrics(products, batchMap)
  expect(metrics.unresolved).toBe(1)
})

