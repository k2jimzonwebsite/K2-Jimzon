import { expect, test } from '@playwright/test'
import {
  DELIVERY_OUTCOMES,
  resolveDeliveryQuote,
  ceilingToIncrementMinor,
} from '../src/lib/deliveryQuote.js'

// ---------------------------------------------------------------------------
// Fixture mirrors the owner-approved controlled pilot: Warehouse A origin, one
// J&T EZ ordinary option, and the eight verified VIP localities. Anything the
// workbook would refuse to quote must be refused here too.
// ---------------------------------------------------------------------------

const SOURCE = {
  sourceId: 'SRC-JNT-VIP-20260901',
  currency: 'PHP',
  freshness: 'CURRENT',
  integrity: 'OK',
}

const OPTION = {
  optionId: 'OPT-JNT-EZ-WHA',
  providerId: 'PRV-JNT',
  providerName: 'J&T Express',
  serviceCode: 'JNT_EZ_ORDINARY',
  serviceName: 'J&T EZ ordinary',
  originId: 'WAREHOUSE_A',
  eligibility: 'AUTO_QUOTE_ELIGIBLE',
  approved: true,
  integrity: 'OK',
}

const LOCALITIES = [
  ['LOC-SJDM-MUZON-E', 'BULACAN|SAN-JOSE-DEL-MONTE-CITY|MUZON-EAST', 8500],
  ['LOC-ANGELES-AGAPITO', 'PAMPANGA|ANGELES-CITY|AGAPITO-DEL-ROSARIO', 8500],
  ['LOC-CALAMBA-BAGONG-K', 'LAGUNA|CALAMBA-CITY|BAGONG-KALSADA', 8500],
  ['LOC-DAGUPAN-BACAYAO-N', 'PANGASINAN|DAGUPAN-CITY|BACAYAO-NORTE', 8500],
  ['LOC-BAGUIO-ABCR', 'BENGUET|BAGUIO-CITY|ABCR', 8500],
  ['LOC-CALOOCAN-BRGY-1', 'NCR|CALOOCAN|BARANGAY-1', 9500],
  ['LOC-CEBU-APAS', 'CEBU|CEBU-CITY|APAS', 10000],
  ['LOC-DAVAO-AGDAO', 'DAVAO-DEL-SUR|DAVAO-CITY|AGDAO', 10500],
]

function baseTables(overrides = {}) {
  return {
    controls: {
      originId: 'WAREHOUSE_A',
      maxParcels: 1,
      maxWeightG: 3000,
      maxMerchandiseSubtotalMinor: 200000,
      roundingIncrementMinor: 500,
      currency: 'PHP',
    },
    sources: [SOURCE],
    courierOptions: [OPTION],
    localityRules: LOCALITIES.map(([localityId, matchKey]) => ({
      localityId,
      matchKey,
      scope: 'EXACT_PILOT',
      status: 'PILOT_APPROVED',
      profileId: 'PROFILE-STD-1P-UPTO-3KG',
      integrity: 'OK',
    })),
    costRows: LOCALITIES.map(([localityId, , amountMinor], i) => ({
      costId: 'COST-' + i,
      optionId: 'OPT-JNT-EZ-WHA',
      originId: 'WAREHOUSE_A',
      localityId,
      profileId: 'PROFILE-STD-1P-UPTO-3KG',
      currency: 'PHP',
      completeness: 'PROVIDER_TOTAL_COMPLETE',
      amountMinor,
      status: 'ACTIVE_APPROVED',
      approvedByOwner: true,
      sourceId: 'SRC-JNT-VIP-20260901',
      effectiveFrom: '2026-09-01',
      effectiveTo: null,
    })),
    ...overrides,
  }
}

function baseInputs(overrides = {}) {
  return {
    channel: 'Website',
    service: 'K2 Standard Delivery',
    originId: 'WAREHOUSE_A',
    localityId: 'LOC-SJDM-MUZON-E',
    parcelCount: 1,
    weightG: 1200,
    weightBasis: 'MEASURED',
    oversize: false,
    remoteArea: false,
    specialProtection: false,
    merchandiseSubtotalMinor: 150000,
    recalculationConfirmed: true,
    quoteDate: '2026-09-02',
    ...overrides,
  }
}

// --- rounding -------------------------------------------------------------

test('rounds upward to the next PHP 5 and never downward', () => {
  expect(ceilingToIncrementMinor(8500, 500)).toBe(8500)
  expect(ceilingToIncrementMinor(8501, 500)).toBe(9000)
  expect(ceilingToIncrementMinor(10499, 500)).toBe(10500)
  expect(ceilingToIncrementMinor(1, 500)).toBe(500)
  expect(ceilingToIncrementMinor(0, 500)).toBe(0)
})

// --- the eight approved localities ---------------------------------------

test('each verified pilot locality returns its owner-approved standard fee', () => {
  for (const [localityId, , expectedMinor] of LOCALITIES) {
    const result = resolveDeliveryQuote(baseInputs({ localityId }), baseTables())
    expect(result.outcome, localityId).toBe(DELIVERY_OUTCOMES.STANDARD_FEE)
    expect(result.feeMinor, localityId).toBe(expectedMinor)
    expect(result.customerVisible, localityId).toBe(true)
  }
})

test('a standard fee carries a frozen snapshot naming every input that produced it', () => {
  const result = resolveDeliveryQuote(baseInputs(), baseTables())
  expect(result.snapshot).toMatchObject({
    localityId: 'LOC-SJDM-MUZON-E',
    optionIds: ['OPT-JNT-EZ-WHA'],
    profileId: 'PROFILE-STD-1P-UPTO-3KG',
    sourceIds: ['SRC-JNT-VIP-20260901'],
    roundingIncrementMinor: 500,
    currency: 'PHP',
  })
  expect(result.snapshot.maxOptionCostMinor).toBe(8500)
  expect(result.snapshot.quotedAt).toBe('2026-09-02')
})

// --- channel and service axes --------------------------------------------

test('marketplace channels never run K2 rating', () => {
  for (const inputs of [
    baseInputs({ channel: 'Marketplace' }),
    baseInputs({ service: 'Platform Delivery' }),
  ]) {
    const result = resolveDeliveryQuote(inputs, baseTables())
    expect(result.outcome).toBe(DELIVERY_OUTCOMES.PLATFORM_CHARGED_EXTERNAL)
    expect(result.feeMinor).toBeNull()
    expect(result.customerVisible).toBe(false)
  }
})

test('zero is only ever valid for a confirmed K2 pickup', () => {
  const result = resolveDeliveryQuote(baseInputs({ service: 'K2 Pickup' }), baseTables())
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.PICKUP_ZERO)
  expect(result.feeMinor).toBe(0)
})

test('an unrecognised service is unavailable rather than guessed', () => {
  const result = resolveDeliveryQuote(baseInputs({ service: 'Same Day Courier' }), baseTables())
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.UNAVAILABLE)
  expect(result.feeMinor).toBeNull()
})

test('a channel outside the direct/Pasabuy pilot falls to manual quotation', () => {
  const result = resolveDeliveryQuote(baseInputs({ channel: 'Wholesale' }), baseTables())
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE)
})

// --- input validation ------------------------------------------------------

test('a blank or unknown required input is an input error, never a fee', () => {
  const cases = [
    { channel: '' },
    { service: '' },
    { localityId: '' },
    { parcelCount: null },
    { weightG: null },
    { weightBasis: 'UNKNOWN' },
    { merchandiseSubtotalMinor: null },
    { recalculationConfirmed: false },
    { oversize: null },
  ]
  for (const patch of cases) {
    const result = resolveDeliveryQuote(baseInputs(patch), baseTables())
    expect(result.outcome, JSON.stringify(patch)).toBe(DELIVERY_OUTCOMES.INPUT_ERROR)
    expect(result.feeMinor, JSON.stringify(patch)).toBeNull()
  }
})

// --- eligibility exceptions all fail closed to manual ---------------------

test('every declared exception routes to manual quotation, never to a floor', () => {
  const cases = [
    { oversize: true },
    { remoteArea: true },
    { specialProtection: true },
    { parcelCount: 2 },
    { weightG: 3001 },
    { merchandiseSubtotalMinor: 200001 },
    { originId: 'CEBU_TRANSIT_HUB' },
    { localityId: 'LOC-UNLISTED-SOMEWHERE' },
  ]
  for (const patch of cases) {
    const result = resolveDeliveryQuote(baseInputs(patch), baseTables())
    expect(result.outcome, JSON.stringify(patch)).toBe(DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE)
    expect(result.feeMinor, JSON.stringify(patch)).toBeNull()
    expect(result.customerVisible, JSON.stringify(patch)).toBe(false)
  }
})

test('an unlisted destination never falls back to a macro-area planning floor', () => {
  const tables = baseTables()
  tables.localityRules.push({
    localityId: 'LOC-FLOOR-LUZON',
    matchKey: 'LUZON|*|*',
    scope: 'REFERENCE_ONLY',
    status: 'PLANNING_FLOOR_NOT_QUOTABLE',
    profileId: 'PROFILE-STD-1P-UPTO-3KG',
    integrity: 'OK',
  })
  const result = resolveDeliveryQuote(baseInputs({ localityId: 'LOC-FLOOR-LUZON' }), tables)
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE)
  expect(result.feeMinor).toBeNull()
})

// --- integrity conflicts stop the quote ----------------------------------

test('duplicate active cost rows for one route stop the quote instead of picking one', () => {
  const tables = baseTables()
  tables.costRows.push({ ...tables.costRows[0], costId: 'COST-DUPE', amountMinor: 7000 })
  const result = resolveDeliveryQuote(baseInputs(), tables)
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.DATA_CONFLICT_STOP)
  expect(result.feeMinor).toBeNull()
})

test('a duplicate locality rule id stops the quote', () => {
  const tables = baseTables()
  tables.localityRules.push({ ...tables.localityRules[0] })
  const result = resolveDeliveryQuote(baseInputs(), tables)
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.DATA_CONFLICT_STOP)
})

test('a broken source reference stops the quote', () => {
  const tables = baseTables()
  tables.costRows[0] = { ...tables.costRows[0], sourceId: 'SRC-DOES-NOT-EXIST' }
  const result = resolveDeliveryQuote(baseInputs(), tables)
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.DATA_CONFLICT_STOP)
})

test('a source that is no longer current downgrades to manual quotation', () => {
  const tables = baseTables({ sources: [{ ...SOURCE, freshness: 'REVIEW_DUE' }] })
  const result = resolveDeliveryQuote(baseInputs(), tables)
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE)
})

// --- the maximum-cost loss-control rule -----------------------------------

test('the fee is the maximum across every route-qualified option, not the cheapest', () => {
  const tables = baseTables()
  tables.courierOptions.push({
    ...OPTION, optionId: 'OPT-LBC-STD', providerId: 'PRV-LBC',
    providerName: 'LBC', serviceCode: 'LBC_STANDARD',
  })
  tables.costRows.push({
    ...tables.costRows[0], costId: 'COST-LBC', optionId: 'OPT-LBC-STD', amountMinor: 11800,
  })
  const result = resolveDeliveryQuote(baseInputs(), tables)
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.STANDARD_FEE)
  expect(result.snapshot.maxOptionCostMinor).toBe(11800)
  expect(result.feeMinor).toBe(12000)
  expect(result.snapshot.optionIds).toEqual(['OPT-JNT-EZ-WHA', 'OPT-LBC-STD'])
})

test('adding a selectable courier with no current cost row forces manual quotation', () => {
  const tables = baseTables()
  tables.courierOptions.push({
    ...OPTION, optionId: 'OPT-LBC-STD', providerId: 'PRV-LBC',
    providerName: 'LBC', serviceCode: 'LBC_STANDARD',
  })
  const result = resolveDeliveryQuote(baseInputs(), tables)
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE)
  expect(result.reasonCode).toBe('QUALIFIED_OPTION_MISSING_COST')
})

test('a courier marked manual-only or disabled is excluded from automatic rating', () => {
  for (const eligibility of ['MANUAL_ONLY', 'DISABLED']) {
    const tables = baseTables()
    tables.courierOptions.push({
      ...OPTION, optionId: 'OPT-LBC-STD', providerId: 'PRV-LBC', eligibility,
    })
    const result = resolveDeliveryQuote(baseInputs(), tables)
    expect(result.outcome, eligibility).toBe(DELIVERY_OUTCOMES.STANDARD_FEE)
    expect(result.feeMinor, eligibility).toBe(8500)
  }
})

test('no owner-approved qualified option at all is manual, not free and not unavailable', () => {
  const tables = baseTables({ courierOptions: [{ ...OPTION, approved: false }] })
  const result = resolveDeliveryQuote(baseInputs(), tables)
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE)
  expect(result.reasonCode).toBe('NO_QUALIFIED_OPTION')
})

// --- effective intervals ---------------------------------------------------

test('effective intervals are half-open: the end date is already expired', () => {
  const tables = baseTables()
  tables.costRows = tables.costRows.map((row) => ({ ...row, effectiveTo: '2026-09-02' }))
  const result = resolveDeliveryQuote(baseInputs({ quoteDate: '2026-09-02' }), tables)
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE)
})

test('a cost row that has not started yet does not price an order', () => {
  const tables = baseTables()
  tables.costRows = tables.costRows.map((row) => ({ ...row, effectiveFrom: '2026-09-03' }))
  const result = resolveDeliveryQuote(baseInputs({ quoteDate: '2026-09-02' }), tables)
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE)
})

test('a superseded row and its replacement do not collide across the boundary', () => {
  const tables = baseTables()
  const [old] = tables.costRows
  tables.costRows = [
    { ...old, costId: 'COST-OLD', effectiveFrom: '2026-08-01', effectiveTo: '2026-09-01' },
    { ...old, costId: 'COST-NEW', effectiveFrom: '2026-09-01', effectiveTo: null, amountMinor: 9200 },
    ...tables.costRows.slice(1),
  ]
  expect(resolveDeliveryQuote(baseInputs({ quoteDate: '2026-08-15' }), tables).feeMinor).toBe(8500)
  expect(resolveDeliveryQuote(baseInputs({ quoteDate: '2026-09-02' }), tables).feeMinor).toBe(9500)
})

// --- customer-facing boundary ---------------------------------------------

test('only a standard fee or a confirmed pickup is ever customer visible', () => {
  const visible = new Set([DELIVERY_OUTCOMES.STANDARD_FEE, DELIVERY_OUTCOMES.PICKUP_ZERO])
  const probes = [
    baseInputs(),
    baseInputs({ service: 'K2 Pickup' }),
    baseInputs({ oversize: true }),
    baseInputs({ channel: 'Marketplace' }),
    baseInputs({ service: 'Same Day Courier' }),
    baseInputs({ weightBasis: 'UNKNOWN' }),
  ]
  for (const inputs of probes) {
    const result = resolveDeliveryQuote(inputs, baseTables())
    expect(result.customerVisible).toBe(visible.has(result.outcome))
  }
})

test('every outcome carries a staff reason and a next action', () => {
  const probes = [
    baseInputs(), baseInputs({ service: 'K2 Pickup' }), baseInputs({ oversize: true }),
    baseInputs({ channel: 'Marketplace' }), baseInputs({ service: 'X' }), baseInputs({ channel: '' }),
  ]
  for (const inputs of probes) {
    const result = resolveDeliveryQuote(inputs, baseTables())
    expect(result.reason.length).toBeGreaterThan(10)
    expect(result.nextAction.length).toBeGreaterThan(10)
    expect(Object.values(DELIVERY_OUTCOMES)).toContain(result.outcome)
  }
})
