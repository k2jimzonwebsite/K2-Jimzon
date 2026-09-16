import { test, expect } from '@playwright/test'
import { validateCouponCommand } from '../server/admin-bff/coupons.js'
import { validatePasabuyCommand } from '../server/admin-bff/pasabuy.js'
import { validateLotCommand } from '../server/admin-bff/lots.js'
import { validateSupplierCreate } from '../server/admin-bff/procurement.js'
import { validateProductIntakeCommand } from '../server/admin-bff/product-intake.js'
import { validateGlobeReviewCommand } from '../server/admin-bff/globe-cms.js'
import { deduplicateMarketplaceOrderFacts } from '../server/admin-bff/marketplace-snapshots.js'
import { strictInteger, strictNumeric } from '../server/shared-numeric.js'

// MAP-019 F-019-002: Admin BFF numerics must reject booleans, blank strings,
// arrays and null instead of coercing them with Number() (Number(true) === 1,
// Number('') === 0, Number([]) === 0, Number(null) === 0). Canonical numbers
// and canonical numeric strings keep working.
const POISON = [true, '', [], null]
const UUID = '6a88b5f9-8be6-4f4d-a504-173c96f40df1'

test('coupon financials reject coerced numerics', () => {
  const valid = {
    code: 'MILANO10', description: 'August direct-store campaign',
    discountType: 'percentage', discountValue: 10, minSpend: 1000,
    maxRedemptions: 100, startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    isActive: false, isHunt: false, clue: null,
    reason: 'Approved August direct-store campaign.',
  }
  for (const value of POISON) {
    expect(() => validateCouponCommand('coupon_create', { ...valid, minSpend: value }), `minSpend rejects ${JSON.stringify(value)}`).toThrow('REQUEST_INVALID')
  }
  expect(() => validateCouponCommand('coupon_create', { ...valid, discountValue: true })).toThrow('REQUEST_INVALID')
  expect(validateCouponCommand('coupon_create', { ...valid, discountValue: '10' }).discountValue).toBe(10)
})

test('pasabuy quote money fields reject coerced numerics', () => {
  const valid = {
    requestId: UUID, itemCostForeign: 10,
    fxRate: 62.5, fxSource: 'Bank published rate', fxCapturedAt: new Date().toISOString(),
    weightKg: 0.5, shippingMethod: 'air', freightRateForeignPerKg: 14,
    customsTaxPercent: 12, handlingPhp: 0, marginPercent: 40, finalPricePhp: 1200,
    validUntil: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    priceRationale: 'Seasonal availability and air freight.',
  }
  for (const value of POISON) {
    expect(() => validatePasabuyCommand('pasabuy_quote', { ...valid, itemCostForeign: value }), `itemCostForeign rejects ${JSON.stringify(value)}`).toThrow('REQUEST_INVALID')
  }
  expect(validatePasabuyCommand('pasabuy_quote', { ...valid, itemCostForeign: '10' }).itemCostForeign).toBe(10)
})

test('lot reconciliation quantities reject coerced numerics', () => {
  const lot = {
    id: UUID, boxCode: 'MIL-104',
    batchCode: 'B-2026-08', quantity: 12, expiryDate: '2027-08-12',
    landedDate: '2026-08-12', hub: 'Manila Hub', custodian: 'Main stock room',
    channel: '', pinned: false, status: 'available',
  }
  const body = (quantity) => ({
    sku: 'SKU-1', reason: 'Manila physical recount after shelf transfer.',
    lots: [{ ...lot, quantity }],
  })
  for (const value of POISON) {
    expect(() => validateLotCommand('lots_reconcile', body(value)), `quantity rejects ${JSON.stringify(value)}`).toThrow('REQUEST_INVALID')
  }
  expect(validateLotCommand('lots_reconcile', body('12')).lots[0].quantity).toBe(12)
})

test('supplier lead time rejects coerced numerics', () => {
  const valid = { name: 'Verified Italia Supplier', contactEmail: 'supply@example.test', leadTimeDays: 14, reason: 'Create from verified purchasing contact.' }
  for (const value of POISON) {
    expect(() => validateSupplierCreate({ ...valid, leadTimeDays: value }), `leadTimeDays rejects ${JSON.stringify(value)}`).toThrow('REQUEST_INVALID')
  }
  expect(validateSupplierCreate({ ...valid, leadTimeDays: '14' }).leadTimeDays).toBe(14)
})

test('intake inventory rejects non-canonical numerics and null cost', () => {
  const inventory = { quantity: 1, unitCost: 0, boxCode: 'BOX-A', batchCode: 'LOT-A',
    expiryDate: '2027-09-13', isNonExpiry: false, consignmentId: UUID }
  const validate = (changes) => validateProductIntakeCommand('intake_inventory', {
    sessionId: UUID, inventoryRequestId: UUID, source: 'flight', inventory: { ...inventory, ...changes },
  })
  expect(() => validate({ quantity: '0x10' })).toThrow('REQUEST_INVALID')
  expect(() => validate({ unitCost: null })).toThrow('REQUEST_INVALID')
  expect(validate({ unitCost: undefined }).inventory.unitCost).toBe(0)
})

test('review stars and ordering reject coerced numerics', () => {
  const payload = {
    name: 'Verified buyer', channel: 'Shopee', stars: 5,
    text: 'The package arrived safely and matched the listing.', item: 'Rio Mare tuna',
    productId: 'rio-mare', reviewDate: '2026-08-20', sourceKind: 'verified_marketplace',
    sourceReference: 'SHOPEE-ORDER-1042', rightsBasis: 'marketplace_publication',
    reason: 'Record attributable customer feedback.',
  }
  expect(() => validateGlobeReviewCommand({ action: 'review_create', payload: { ...payload, stars: true } })).toThrow('REQUEST_INVALID')
  const config = (displayOrder) => validateGlobeReviewCommand({ action: 'globe_config_update',
    payload: { productId: 'rio-mare', enabled: true, hero: null, displayOrder, version: 1, reason: 'Feature the reviewed product.' } })
  for (const value of POISON) {
    expect(() => config(value), `displayOrder rejects ${JSON.stringify(value)}`).toThrow('REQUEST_INVALID')
  }
  expect(config('3').payload.displayOrder).toBe(3)
})

test('marketplace order facts reject coerced quantities', () => {
  const fact = {
    shopId: UUID, externalOrderId: 'EXT-1', externalLineId: 'L-1', marketplaceSku: 'SKU-1',
    quantity: 2, grossAmount: '120.00', currency: 'PHP', orderedAt: '2026-08-20T00:00:00.000Z',
    orderStatus: 'confirmed', paymentStatus: 'paid',
  }
  expect(() => deduplicateMarketplaceOrderFacts([{ ...fact, quantity: true }])).toThrow('MARKETPLACE_ORDER_FACT_INVALID')
  expect(deduplicateMarketplaceOrderFacts([{ ...fact, quantity: '2' }]).accepted).toHaveLength(1)
})

test('the shared validator keeps one rule with caller-owned error codes', () => {
  for (const value of [...POISON, {}, [1], ' ', '0x10', '1e3', '+12', '12abc', Number.NaN]) {
    expect(() => strictNumeric(value, 'REQUEST_INVALID', { min: 0, max: 100 }), `rejects ${String(value)}`).toThrow('REQUEST_INVALID')
    expect(() => strictInteger(value, 'MARKETPLACE_FEE_POLICY_INVALID', { min: 0, max: 100 }), `rejects ${String(value)}`).toThrow('MARKETPLACE_FEE_POLICY_INVALID')
  }
  expect(strictNumeric(12.5, 'REQUEST_INVALID', { min: 0, max: 100 })).toBe(12.5)
  expect(strictNumeric('12.50', 'REQUEST_INVALID', { min: 0, max: 100 })).toBe(12.5)
  expect(strictNumeric(' 12 ', 'REQUEST_INVALID', { min: 0, max: 100 })).toBe(12)
  expect(() => strictInteger(12.5, 'REQUEST_INVALID', { min: 0, max: 100 })).toThrow('REQUEST_INVALID')
  expect(strictInteger('12', 'REQUEST_INVALID', { min: 0, max: 100 })).toBe(12)
  expect(() => strictNumeric(101, 'REQUEST_INVALID', { min: 0, max: 100 })).toThrow('REQUEST_INVALID')
  expect(() => strictNumeric(-1, 'REQUEST_INVALID', { min: 0, max: 100 })).toThrow('REQUEST_INVALID')
})
