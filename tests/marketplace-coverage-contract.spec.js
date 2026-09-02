import { expect, test } from '@playwright/test'
import {
  buildMarketplaceCoverageProposal,
  summarizeMarketplaceCoverageAlerts,
} from '../src/lib/marketplaceCoverage.js'

const shops = [
  { id: 'shop-shopee', shopCode: 'shopee-main', displayName: 'Shopee Main' },
  { id: 'shop-lazada', shopCode: 'lazada-main', displayName: 'Lazada Main' },
  { id: 'shop-tiktok', shopCode: 'tiktok-main', displayName: 'TikTok Main' },
]

test('coverage status is per exact shop and treats marketplace quantity as observation only', () => {
  const proposal = buildMarketplaceCoverageProposal({
    products: [{ id: 'product-1', sku: 'K2-SKU-000001', eligibleQuantity: 7 }],
    shops,
    observations: [
      { productId: 'product-1', shopId: 'shop-shopee', reportedQuantity: 4, observedAt: '2026-08-31T00:00:00.000Z' },
      { productId: 'product-1', shopId: 'shop-lazada', reportedQuantity: 1, observedAt: '2026-08-31T00:00:00.000Z' },
      { productId: 'product-1', shopId: 'shop-tiktok', reportedQuantity: 0, observedAt: '2026-08-31T00:00:00.000Z' },
    ],
    asOf: '2026-08-31T12:00:00.000Z',
  })

  expect(proposal.targetPerShop).toBe(2)
  expect(proposal.rows.map(({ shopId, status }) => [shopId, status])).toEqual([
    ['shop-lazada', 'thin'],
    ['shop-shopee', 'covered'],
    ['shop-tiktok', 'out'],
  ])
  expect(proposal.rows.every((row) => row.effect === 'proposal_only')).toBe(true)
  expect(proposal.rows.every((row) => !('canonicalQuantity' in row))).toBe(true)
  expect(proposal.rows.every((row) => row.canonicalEligibleQuantity === 7)).toBe(true)
})

test('unresolved, missing, and stale evidence stays Needs review while owner skip is explicit', () => {
  const proposal = buildMarketplaceCoverageProposal({
    products: [{ id: 'product-1', sku: 'K2-SKU-000001', eligibleQuantity: 2 }],
    shops,
    observations: [
      { productId: 'product-1', shopId: 'shop-shopee', reportedQuantity: 2, observedAt: '2026-07-01T00:00:00.000Z' },
      { productId: 'product-1', shopId: 'shop-lazada', reportedQuantity: 2, observedAt: '2026-08-31T00:00:00.000Z', needsReview: true },
    ],
    overrides: [{ productId: 'product-1', shopId: 'shop-tiktok', action: 'skip', reason: 'Do not list this variant in TikTok Main.' }],
    asOf: '2026-08-31T12:00:00.000Z',
    freshnessHours: 72,
  })

  expect(proposal.rows.map(({ shopId, status }) => [shopId, status])).toEqual([
    ['shop-lazada', 'needs_review'],
    ['shop-shopee', 'needs_review'],
    ['shop-tiktok', 'skipped'],
  ])
  expect(proposal.rows.find((row) => row.status === 'skipped').overrideReason).toContain('TikTok Main')
})

test('scarcity proposal ranks verified recent sales and owner override wins without moving custody', () => {
  const proposal = buildMarketplaceCoverageProposal({
    products: [{ id: 'product-1', sku: 'K2-SKU-000001', eligibleQuantity: 3 }],
    shops,
    observations: shops.map((shop) => ({
      productId: 'product-1', shopId: shop.id, reportedQuantity: 0,
      observedAt: '2026-08-31T00:00:00.000Z',
    })),
    recentSales: [
      { productId: 'product-1', shopId: 'shop-shopee', verifiedUnits: 2 },
      { productId: 'product-1', shopId: 'shop-lazada', verifiedUnits: 8 },
      { productId: 'product-1', shopId: 'shop-tiktok', verifiedUnits: 4 },
    ],
    overrides: [
      { productId: 'product-1', shopId: 'shop-tiktok', action: 'thin', priority: 1, reason: 'Keep one unit for the highest owner-selected priority.' },
      { productId: 'product-1', shopId: 'shop-shopee', action: 'include', priority: 2, reason: 'Owner campaign decision.' },
    ],
    asOf: '2026-08-31T12:00:00.000Z',
  })

  expect(proposal.rows.map(({ shopId, proposedAvailability }) => [shopId, proposedAvailability])).toEqual([
    ['shop-lazada', 0],
    ['shop-shopee', 2],
    ['shop-tiktok', 1],
  ])
  expect(proposal.rows.reduce((sum, row) => sum + row.proposedAvailability, 0)).toBe(3)
  expect(proposal.rows.every((row) => row.custodyTransfer === false && row.providerWrite === false)).toBe(true)
})

test('low and zero support alerts are projections with exact shop identity', () => {
  const alerts = summarizeMarketplaceCoverageAlerts({ rows: [
    { productId: 'p1', sku: 'K2-SKU-1', shopId: 's1', shopCode: 'one', status: 'out', proposedAvailability: 0, canonicalEligibleQuantity: 3 },
    { productId: 'p1', sku: 'K2-SKU-1', shopId: 's2', shopCode: 'two', status: 'thin', proposedAvailability: 1, canonicalEligibleQuantity: 3 },
    { productId: 'p1', sku: 'K2-SKU-1', shopId: 's3', shopCode: 'three', status: 'covered', proposedAvailability: 2, canonicalEligibleQuantity: 3 },
    { productId: 'p2', sku: 'K2-SKU-2', shopId: 's1', shopCode: 'one', status: 'needs_review', proposedAvailability: 0, canonicalEligibleQuantity: 0 },
  ] })

  expect(alerts).toEqual({
    zero: 1, low: 1, needsReview: 1, allocationShortfall: 2,
    criticalMasterZero: 1, exactShopsAffected: 2,
  })
})
