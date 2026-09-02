import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { calculateMarketplaceFeeEstimate } from '../src/lib/marketplaceFeeEstimate.js'
import { ADMIN_BFF_ROUTES, ADMIN_BFF_ROUTE_CONTROLS } from '../server/admin-bff/router.js'

test('fee estimate uses integer minor units and a named policy version', () => {
  const result = calculateMarketplaceFeeEstimate({
    shopId: 'shop-1', currency: 'PHP', policyVersion: 'shopee-manual-2026-08-v1',
    commissionBasisPoints: 600, paymentBasisPoints: 200, withholdingBasisPoints: 100,
    fixedFeeMinorPerOrder: 1500,
    orderFacts: [
      { externalOrderId: 'A', externalLineId: '1', grossAmount: '1250.00', outcome: 'accepted', matchStatus: 'linked' },
      { externalOrderId: 'A', externalLineId: '2', grossAmount: '250.00', outcome: 'accepted', matchStatus: 'linked' },
      { externalOrderId: 'A', externalLineId: '2', grossAmount: '250.00', outcome: 'duplicate', matchStatus: 'duplicate' },
    ],
  })

  expect(result).toMatchObject({
    grossMinor: 150000, acceptedLines: 2, acceptedOrders: 1,
    commissionMinor: 9000, paymentMinor: 3000, withholdingMinor: 1500,
    fixedMinor: 1500, estimatedFeeMinor: 15000, estimatedNetMinor: 135000,
    policyVersion: 'shopee-manual-2026-08-v1', estimateOnly: true,
    settlementReconciled: false, officialBooks: false, actualProfit: false,
  })
})

test('rounding is deterministic per aggregate and ignores duplicate, conflict, and unresolved facts', () => {
  const result = calculateMarketplaceFeeEstimate({
    shopId: 'shop-1', currency: 'PHP', policyVersion: 'manual-v1',
    commissionBasisPoints: 333, paymentBasisPoints: 0, withholdingBasisPoints: 0,
    fixedFeeMinorPerOrder: 0,
    orderFacts: [
      { externalOrderId: 'A', externalLineId: '1', grossAmount: '10.01', outcome: 'accepted', matchStatus: 'linked' },
      { externalOrderId: 'B', externalLineId: '1', grossAmount: '99.99', outcome: 'conflict', matchStatus: 'conflict' },
      { externalOrderId: 'C', externalLineId: '1', grossAmount: '99.99', outcome: 'accepted', matchStatus: 'unresolved' },
    ],
  })
  expect(result.grossMinor).toBe(1001)
  expect(result.commissionMinor).toBe(33)
  expect(result.excludedLines).toBe(2)
})

test('a reviewed zero-sales export produces a zero estimate instead of inventing sales', () => {
  expect(calculateMarketplaceFeeEstimate({
    shopId: 'shop-1', currency: 'PHP', policyVersion: 'manual-zero-sales-v1',
    commissionBasisPoints: 600, paymentBasisPoints: 200, withholdingBasisPoints: 100,
    fixedFeeMinorPerOrder: 1500, orderFacts: [],
  })).toMatchObject({
    grossMinor: 0, acceptedLines: 0, acceptedOrders: 0, estimatedFeeMinor: 0,
    estimatedNetMinor: 0, estimateOnly: true,
  })
})

test('fee policy rejects invalid, excessive, mixed-currency, and customer-bearing inputs', () => {
  const base = {
    shopId: 'shop-1', currency: 'PHP', policyVersion: 'manual-v1',
    commissionBasisPoints: 600, paymentBasisPoints: 200, withholdingBasisPoints: 100,
    fixedFeeMinorPerOrder: 0,
    orderFacts: [{ externalOrderId: 'A', externalLineId: '1', grossAmount: '10.00', outcome: 'accepted', matchStatus: 'linked' }],
  }
  expect(() => calculateMarketplaceFeeEstimate({ ...base, commissionBasisPoints: 10000 })).toThrow('MARKETPLACE_FEE_POLICY_INVALID')
  expect(() => calculateMarketplaceFeeEstimate({ ...base, fixedFeeMinorPerOrder: -1 })).toThrow('MARKETPLACE_FEE_POLICY_INVALID')
  expect(() => calculateMarketplaceFeeEstimate({ ...base, orderFacts: [{ ...base.orderFacts[0], customerEmail: 'x@example.invalid' }] })).toThrow('MARKETPLACE_FEE_FACT_INVALID')
  expect(() => calculateMarketplaceFeeEstimate({ ...base, orderFacts: [{ ...base.orderFacts[0], currency: 'USD' }] })).toThrow('MARKETPLACE_FEE_FACT_INVALID')
})

test('fee save is an Admin-only signed versioned estimate boundary', async () => {
  expect(ADMIN_BFF_ROUTES).toContain('owner-close/fees')
  expect(ADMIN_BFF_ROUTE_CONTROLS['owner-close/fees']).toMatchObject({
    method: 'GET', identity: 'active-aal2-session', csrf: false, idempotency: false,
    additionalMethods: { POST: { csrf: true, idempotency: true, rateLimit: 'database' } },
  })
  const migration = await readFile(new URL('../supabase/migrations/20260831_marketplace_snapshot_staging.sql', import.meta.url), 'utf8')
  expect(migration).toContain('k2_private.owner_close_fee_estimates')
  expect(migration).toContain("p_action='marketplace_fee_estimate_save'")
  expect(migration).toContain('K2_MARKETPLACE_FEE_FACTS_BLOCKED')
  expect(migration).toContain('read_admin_owner_close_fee_input_v1')
  expect(migration).toContain("'estimateOnly',true,'settlementReconciled',false")
})
