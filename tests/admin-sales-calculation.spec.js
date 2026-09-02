import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  calculateMaximumSalesDiscount,
  calculateSalesPlan,
  calculateTargetSalesPrice,
  calculateTargetSalesQuantity,
  createSalesExportFilename,
  createSalesPlanningSummary,
  createSalesRecordCsv,
  filterSalesOrders,
  summarizeSalesReconciliation,
  summarizeSalesOrders,
} from '../src/lib/salesCalculations.js'

test('sales summary keeps submitted, verified, and fulfilled values separate', () => {
  const summary = summarizeSalesOrders([
    { total_amount: 1000, payment_status: 'unpaid', status: 'submitted' },
    { total_amount: 2500, payment_status: 'verified', status: 'confirmed' },
    { total_amount: 4000, payment_status: 'verified', status: 'fulfilled' },
    { total_amount: 'not-money', payment_status: 'verified', status: 'fulfilled' },
  ])
  expect(summary).toEqual({ submittedValue: 7500, submittedCount: 4, verifiedPaymentValue: 6500, verifiedPaymentCount: 3, fulfilledValue: 4000, fulfilledCount: 2 })
})

test('payment-by-fulfillment reconciliation partitions every request and peso exactly once', () => {
  const summary = summarizeSalesReconciliation([
    { id: 'both', total_amount: 1000, payment_status: 'verified', status: 'fulfilled' },
    { id: 'paid-open', total_amount: 2000, payment_status: 'verified', status: 'confirmed' },
    { id: 'fulfilled-exception', total_amount: 3000, payment_status: 'evidence_submitted', status: 'fulfilled' },
    { id: 'other', total_amount: 4000, payment_status: 'not_requested', status: 'submitted' },
  ])

  expect(summary).toEqual({
    verifiedFulfilled: { count: 1, value: 1000 },
    verifiedPending: { count: 1, value: 2000 },
    fulfilledUnverified: { count: 1, value: 3000 },
    other: { count: 1, value: 4000 },
    total: { count: 4, value: 10000 },
  })
  expect(summary.verifiedFulfilled.count + summary.verifiedPending.count + summary.fulfilledUnverified.count + summary.other.count).toBe(summary.total.count)
  expect(summary.verifiedFulfilled.value + summary.verifiedPending.value + summary.fulfilledUnverified.value + summary.other.value).toBe(summary.total.value)
})

test('sales planner computes the complete bounded staff scenario', () => {
  const result = calculateSalesPlan({ quantity: '10', unitPrice: '250', unitCost: '120', discount: '100', otherCosts: '75', fixedFees: '50', channelFeePercent: '8' })
  expect(result.ok).toBe(true)
  expect(result).toMatchObject({ grossSales: 2500, netSales: 2400, goodsCost: 1200, otherAndFixedCosts: 125, percentageFees: 200, totalCosts: 1525, grossProfit: 875, breakEvenUnitPrice: 154.9 })
  expect(result.grossMarginPercent).toBeCloseTo(36.458333, 5)
  expect(result.markupPercent).toBeCloseTo(57.377049, 5)

  const atBreakEven = calculateSalesPlan({ quantity: '10', unitPrice: '154.90', unitCost: '120', discount: '100', otherCosts: '75', fixedFees: '50', channelFeePercent: '8' })
  const belowBreakEven = calculateSalesPlan({ quantity: '10', unitPrice: '154.89', unitCost: '120', discount: '100', otherCosts: '75', fixedFees: '50', channelFeePercent: '8' })
  expect(atBreakEven.grossProfit).toBeGreaterThanOrEqual(0)
  expect(belowBreakEven.grossProfit).toBeLessThan(0)
})

test('sales planner rejects unsafe values and never returns NaN or Infinity', () => {
  for (const input of [
    { quantity: '0', unitPrice: '1', unitCost: '1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '0' },
    { quantity: '1.5', unitPrice: '1', unitCost: '1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '0' },
    { quantity: '1', unitPrice: '-1', unitCost: '1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '0' },
    { quantity: '1', unitPrice: '100', unitCost: '1', discount: '101', otherCosts: '0', fixedFees: '0', channelFeePercent: '0' },
    { quantity: '1', unitPrice: '100', unitCost: '1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '100' },
  ]) {
    const result = calculateSalesPlan(input)
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/)
  }
})

test('target-price planner solves percentage fees and target gross margin exactly', () => {
  const result = calculateTargetSalesPrice({ quantity: '10', unitCost: '120', discount: '100', otherCosts: '75', fixedFees: '50', channelFeePercent: '8', targetMarginPercent: '30' })
  expect(result).toMatchObject({
    ok: true,
    recommendedUnitPrice: 225,
    grossSales: 2250,
    netSales: 2150,
    percentageFees: 180,
    totalCosts: 1505,
    grossProfit: 645,
    achievedMarginPercent: 30,
  })
})

test('target-price planner rounds upward and denies impossible or unsafe targets', () => {
  const rounded = calculateTargetSalesPrice({ quantity: '3', unitCost: '101.11', discount: '7.13', otherCosts: '4.44', fixedFees: '2.22', channelFeePercent: '7.7', targetMarginPercent: '33.3' })
  expect(rounded.ok).toBe(true)
  expect(rounded.recommendedUnitPrice).toBe(177.83)
  expect(rounded.achievedMarginPercent).toBeGreaterThanOrEqual(33.3)

  for (const input of [
    { quantity: '0', unitCost: '1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '1', targetMarginPercent: '20' },
    { quantity: '1.5', unitCost: '1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '1', targetMarginPercent: '20' },
    { quantity: '1', unitCost: '-1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '1', targetMarginPercent: '20' },
    { quantity: '1', unitCost: '1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '30', targetMarginPercent: '70' },
    { quantity: '1', unitCost: '1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '100', targetMarginPercent: '0' },
    { quantity: '1', unitCost: '1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '0', targetMarginPercent: '99.999' },
  ]) {
    const result = calculateTargetSalesPrice(input)
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/)
  }
})

test('maximum-discount planner rounds the safe allowance downward and preserves the target margin', () => {
  const result = calculateMaximumSalesDiscount({ quantity: '10', unitPrice: '250', unitCost: '120', otherCosts: '75', fixedFees: '50', channelFeePercent: '8', targetMarginPercent: '30' })
  expect(result).toMatchObject({
    ok: true,
    grossSales: 2500,
    percentageFees: 200,
    totalCosts: 1525,
    maximumDiscount: 321.42,
    maximumDiscountPerUnit: 32.14,
    netSales: 2178.58,
    grossProfit: 653.58,
  })
  expect(result.maximumDiscountPercent).toBeCloseTo(12.8568, 4)
  expect(result.achievedMarginPercent).toBeGreaterThanOrEqual(30)
  expect(calculateMaximumSalesDiscount({ quantity: '3', unitPrice: '177.83', unitCost: '101.11', otherCosts: '4.44', fixedFees: '2.22', channelFeePercent: '7.7', targetMarginPercent: '33.3' }).achievedMarginPercent).toBeGreaterThanOrEqual(33.3)
})

test('maximum-discount planner denies a price that misses the target at zero discount and unsafe inputs', () => {
  const impossible = calculateMaximumSalesDiscount({ quantity: '1', unitPrice: '100', unitCost: '100', otherCosts: '0', fixedFees: '0', channelFeePercent: '10', targetMarginPercent: '20' })
  expect(impossible).toEqual({ ok: false, errors: ['This selling price cannot reach the target gross margin even with no discount.'] })

  for (const input of [
    { quantity: '0', unitPrice: '100', unitCost: '1', otherCosts: '0', fixedFees: '0', channelFeePercent: '1', targetMarginPercent: '20' },
    { quantity: '1.5', unitPrice: '100', unitCost: '1', otherCosts: '0', fixedFees: '0', channelFeePercent: '1', targetMarginPercent: '20' },
    { quantity: '1', unitPrice: '-1', unitCost: '1', otherCosts: '0', fixedFees: '0', channelFeePercent: '1', targetMarginPercent: '20' },
    { quantity: '1', unitPrice: '100', unitCost: '1', otherCosts: '0', fixedFees: '0', channelFeePercent: '100', targetMarginPercent: '0' },
    { quantity: '1', unitPrice: '100', unitCost: '1', otherCosts: '0', fixedFees: '0', channelFeePercent: '0', targetMarginPercent: '99.999' },
  ]) {
    const result = calculateMaximumSalesDiscount(input)
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/)
  }
})

test('target-quantity planner rounds to the minimum whole units that reach planned profit', () => {
  const result = calculateTargetSalesQuantity({ unitPrice: '250', unitCost: '120', discount: '100', otherCosts: '75', fixedFees: '50', channelFeePercent: '8', targetProfit: '1000' })
  expect(result).toMatchObject({
    ok: true,
    requiredQuantity: 12,
    unitContribution: 110,
    grossSales: 3000,
    netSales: 2900,
    goodsCost: 1440,
    otherAndFixedCosts: 125,
    percentageFees: 240,
    totalCosts: 1805,
    grossProfit: 1095,
    profitAboveTarget: 95,
    previousQuantity: 11,
    previousQuantityProfit: 985,
  })
  expect(result.achievedMarginPercent).toBeCloseTo(37.75862, 5)
  expect(result.grossProfit).toBeGreaterThanOrEqual(result.targetProfit)
  expect(result.previousQuantityProfit).toBeLessThan(result.targetProfit)
})

test('target-quantity planner refuses non-contributing products and unsafe targets', () => {
  expect(calculateTargetSalesQuantity({ unitPrice: '100', unitCost: '95', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '10', targetProfit: '100' }))
    .toEqual({ ok: false, errors: ['Each unit must contribute more than ₱0 after unit cost and the channel fee.'] })

  for (const input of [
    { unitPrice: '100', unitCost: '1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '0', targetProfit: '0' },
    { unitPrice: '100', unitCost: '1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '0', targetProfit: '0.001' },
    { unitPrice: '-1', unitCost: '1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '0', targetProfit: '1' },
    { unitPrice: '100', unitCost: '1', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '100', targetProfit: '1' },
    { unitPrice: '1', unitCost: '0', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '0', targetProfit: '1000000000' },
  ]) {
    const result = calculateTargetSalesQuantity(input)
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/)
  }
})

test('planning summaries preserve each valid mode assumptions and results without customer data', () => {
  const generatedAt = '2026-08-30T12:34:56.000Z'
  const scenarios = [
    {
      mode: 'check',
      input: { quantity: '10', unitPrice: '250', unitCost: '120', discount: '100', otherCosts: '75', fixedFees: '50', channelFeePercent: '8' },
      result: calculateSalesPlan({ quantity: '10', unitPrice: '250', unitCost: '120', discount: '100', otherCosts: '75', fixedFees: '50', channelFeePercent: '8' }),
      expected: ['Mode: Check a price', 'Fee-aware break-even unit price: PHP 154.90'],
    },
    {
      mode: 'target',
      input: { quantity: '10', unitCost: '120', discount: '100', otherCosts: '75', fixedFees: '50', channelFeePercent: '8', targetMarginPercent: '30' },
      result: calculateTargetSalesPrice({ quantity: '10', unitCost: '120', discount: '100', otherCosts: '75', fixedFees: '50', channelFeePercent: '8', targetMarginPercent: '30' }),
      expected: ['Mode: Find target price', 'Minimum planned unit price: PHP 225.00'],
    },
    {
      mode: 'discount',
      input: { quantity: '10', unitPrice: '250', unitCost: '120', otherCosts: '75', fixedFees: '50', channelFeePercent: '8', targetMarginPercent: '30' },
      result: calculateMaximumSalesDiscount({ quantity: '10', unitPrice: '250', unitCost: '120', otherCosts: '75', fixedFees: '50', channelFeePercent: '8', targetMarginPercent: '30' }),
      expected: ['Mode: Find max discount', 'Maximum total discount: PHP 321.42'],
    },
    {
      mode: 'quantity',
      input: { unitPrice: '250', unitCost: '120', discount: '100', otherCosts: '75', fixedFees: '50', channelFeePercent: '8', targetProfit: '1000' },
      result: calculateTargetSalesQuantity({ unitPrice: '250', unitCost: '120', discount: '100', otherCosts: '75', fixedFees: '50', channelFeePercent: '8', targetProfit: '1000' }),
      expected: ['Mode: Find units needed', 'Minimum whole units: 12', 'At 11 units: PHP 985.00 — below target'],
    },
  ]

  for (const scenario of scenarios) {
    const summary = createSalesPlanningSummary({ ...scenario, generatedAt })
    expect(summary).toContain('K2 SALES PLANNING SUMMARY')
    expect(summary).toContain('PLANNING ONLY — NOT AN APPROVED PRICE, PROMOTION, QUOTA, ORDER, PAYOUT, SETTLEMENT, ACCOUNTING RECORD, OR ACTUAL PROFIT')
    expect(summary).toContain(`Generated: ${generatedAt}`)
    for (const expected of scenario.expected) expect(summary).toContain(expected)
    expect(summary).not.toMatch(/customer|email/i)
    expect(createSalesPlanningSummary({ ...scenario, generatedAt })).toBe(summary)
  }

  expect(createSalesPlanningSummary({ mode: 'check', input: {}, result: { ok: false }, generatedAt })).toBe('')
  expect(createSalesPlanningSummary({ mode: 'unknown', input: {}, result: { ok: true }, generatedAt })).toBe('')
})

test('sales record filters use exact canonical states and newest-first order', () => {
  const orders = [
    { id: 'old-verified', created_at: '2026-08-01T00:00:00Z', payment_status: 'verified', status: 'confirmed' },
    { id: 'new-fulfilled', created_at: '2026-08-03T00:00:00Z', payment_status: 'evidence_submitted', status: 'fulfilled' },
    { id: 'middle-both', created_at: '2026-08-02T00:00:00Z', payment_status: 'verified', status: 'fulfilled' },
  ]

  expect(filterSalesOrders(orders, 'all').map(order => order.id)).toEqual(['new-fulfilled', 'middle-both', 'old-verified'])
  expect(filterSalesOrders(orders, 'verified').map(order => order.id)).toEqual(['middle-both', 'old-verified'])
  expect(filterSalesOrders(orders, 'fulfilled').map(order => order.id)).toEqual(['new-fulfilled', 'middle-both'])
  expect(filterSalesOrders(orders, 'verified_fulfilled').map(order => order.id)).toEqual(['middle-both'])
  expect(filterSalesOrders(orders, 'verified_pending').map(order => order.id)).toEqual(['old-verified'])
  expect(filterSalesOrders(orders, 'fulfilled_unverified').map(order => order.id)).toEqual(['new-fulfilled'])
  expect(filterSalesOrders(orders, 'other')).toEqual([])
  expect(filterSalesOrders(orders, 'unsupported').map(order => order.id)).toEqual(['new-fulfilled', 'middle-both', 'old-verified'])
})

test('sales CSV exports the exact filter without customer data or spreadsheet formulas', () => {
  const csv = createSalesRecordCsv([
    { id: 'unpaid-row', created_at: '2026-08-03T00:00:00Z', channel_source: 'website', status: 'submitted', payment_status: 'not_requested', total_amount: 10 },
    { id: '=SUM(1,1)', created_at: '2026-08-02T00:00:00Z', channel_source: 'shopee-ph', status: '+fulfilled', payment_status: 'verified', total_amount: '1250.5', customer_name: 'Must not export', customer_email: 'private@example.test' },
  ], 'verified')

  expect(csv.startsWith('\uFEFF')).toBe(true)
  expect(csv.endsWith('\r\n')).toBe(true)
  expect(csv).toContain('"created_at","order_reference","channel","order_status","payment_status","request_value_php"')
  expect(csv).toContain('"\'=SUM(1,1)"')
  expect(csv).toContain('"\'+fulfilled"')
  expect(csv).toContain('"shopee"')
  expect(csv).toContain('"1250.50"')
  expect(csv).not.toContain('unpaid-row')
  expect(csv).not.toContain('Must not export')
  expect(csv).not.toContain('private@example.test')
  expect(csv.split('\r\n')).toHaveLength(3)
  expect(createSalesExportFilename({ range: 90, filter: 'fulfilled', generatedAt: '2026-08-30T12:00:00Z' })).toBe('k2-sales-90d-fulfilled-2026-08-30.csv')
})

test('the sales planner is mounted in the authenticated Admin shell', async () => {
  const admin = await readFile(new URL('../src/views/admin/Admin.jsx', import.meta.url), 'utf8')
  expect(admin).toContain("import AdminToolsWidget from './AdminToolsWidget'")
  expect(admin).toContain('<AdminToolsWidget onOpenGuide=')
})
