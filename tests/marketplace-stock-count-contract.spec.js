import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  buildOwnerCloseStockReview,
  buildLotReconciliationPayload,
} from '../src/lib/ownerCloseStockReview.js'
import { ADMIN_BFF_ROUTES } from '../server/admin-bff/router.js'

const input = {
  products: [{ id: 'product-1', sku: 'K2-001', name: 'Product One' }],
  lots: [
    { id: '10000000-0000-4000-8000-000000000001', productId: 'product-1', sku: 'K2-001', quantity: 3, reservedQuantity: 1, boxCode: 'B1', batchCode: 'LOT1', expiryDate: '2027-08-31', landedDate: '2026-08-01', hub: 'Manila', custodian: 'Owner', channel: '', pinned: false, status: 'available' },
    { id: '10000000-0000-4000-8000-000000000002', productId: 'product-1', sku: 'K2-001', quantity: 2, reservedQuantity: 0, boxCode: 'B2', batchCode: 'LOT2', expiryDate: '2027-09-30', landedDate: '2026-08-02', hub: 'Manila', custodian: 'Owner', channel: '', pinned: false, status: 'quarantine' },
  ],
  observations: [
    { productId: 'product-1', shopId: 'shop-1', reportedQuantity: 2, observedAt: '2026-08-31T00:00:00Z' },
    { productId: 'product-1', shopId: 'shop-2', reportedQuantity: 1, observedAt: '2026-08-31T01:00:00Z' },
  ],
  acceptedSales: [{ productId: 'product-1', shopId: 'shop-1', units: 2 }],
}

test('stock review keeps marketplace observation, canonical physical, reserved, and sellable facts separate', () => {
  expect(buildOwnerCloseStockReview(input)).toEqual([expect.objectContaining({
    productId: 'product-1', sku: 'K2-001', canonicalPhysical: 5,
    canonicalReserved: 1, canonicalSellable: 2, marketplaceReportedTotal: 3,
    acceptedSalesUnits: 2, observationOnly: true,
  })])
})

test('lot handoff requires complete exact-lot counts and refuses reservation corruption', () => {
  expect(buildLotReconciliationPayload({
    sku: 'K2-001', lots: input.lots,
    physicalCounts: {
      '10000000-0000-4000-8000-000000000001': 4,
      '10000000-0000-4000-8000-000000000002': 2,
    }, reason: 'Physical recount found one additional unit in the first exact lot.',
  })).toMatchObject({ sku: 'K2-001', lots: [{ quantity: 4 }, { quantity: 2 }] })
  expect(() => buildLotReconciliationPayload({
    sku: 'K2-001', lots: input.lots,
    physicalCounts: {
      '10000000-0000-4000-8000-000000000001': 0,
      '10000000-0000-4000-8000-000000000002': 2,
    }, reason: 'Attempt to count below reserved units must be denied safely.',
  })).toThrow('OWNER_CLOSE_RESERVED_COUNT_CONFLICT')
})

test('stock comparison reads privately and hands mutations to the existing lot command', async () => {
  expect(ADMIN_BFF_ROUTES).toContain('owner-close/stock')
  const component = await readFile(new URL('../src/views/admin/OwnerCountClose.jsx', import.meta.url), 'utf8')
  const migration = await readFile(new URL('../supabase/migrations/20260831_marketplace_snapshot_staging.sql', import.meta.url), 'utf8')
  expect(migration).toContain('read_admin_owner_close_stock_input_v1')
  expect(migration).not.toMatch(/(?:insert\s+into|update|delete\s+from)\s+public\.product_batches/i)
  expect(component).toContain('reconcileLotsBff')
  expect(component).toContain('Marketplace-reported availability is observation only')
})
