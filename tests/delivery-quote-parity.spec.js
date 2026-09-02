import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { DELIVERY_OUTCOMES, resolveDeliveryQuote } from '../src/lib/deliveryQuote.js'
import { DELIVERY_PILOT_CONTROLS } from '../server/admin-bff/delivery.js'
import { STOREFRONT_BFF_ROUTE_CONTROLS, STOREFRONT_BFF_ROUTES } from '../server/storefront-bff/router.js'
import { ADMIN_BFF_ROUTES, ADMIN_BFF_ROUTE_CONTROLS } from '../server/admin-bff/router.js'
import { EXPECTED_ANON_FUNCTIONS } from '../scripts/security-surface-policy.mjs'

// The customer estimate is resolved in SQL, because the storefront BFF holds a
// publishable key and must never be able to read what a courier costs K2. That
// leaves two implementations of one rule set. These tests pin the constants and
// the vocabulary they share, so changing one without the other fails the build.

const guestSql = () => readFile('supabase/migrations/20260902_delivery_guest_quote_boundary.sql', 'utf8')
const schemaSql = () => readFile('supabase/migrations/20260902_delivery_quote_control.sql', 'utf8')
const seedSql = () => readFile('supabase/migrations/20260902_delivery_quote_pilot_seed.sql', 'utf8')

test('the SQL guest quote pins the same pilot boundary as the JavaScript resolver', async () => {
  const sql = await guestSql()
  const pinned = [
    ['c_origin', `'${DELIVERY_PILOT_CONTROLS.originId}'`],
    ['c_max_parcels', String(DELIVERY_PILOT_CONTROLS.maxParcels)],
    ['c_max_weight_g', String(DELIVERY_PILOT_CONTROLS.maxWeightG)],
    ['c_max_subtotal_minor', String(DELIVERY_PILOT_CONTROLS.maxMerchandiseSubtotalMinor)],
    ['c_rounding_minor', String(DELIVERY_PILOT_CONTROLS.roundingIncrementMinor)],
  ]
  for (const [name, value] of pinned) {
    expect(sql, `${name} must equal the JavaScript control`).toMatch(
      new RegExp(`${name}\\s+constant\\s+\\w+\\s*:=\\s*${value.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&')}\\s*;`),
    )
  }
})

test('the SQL guest quote emits only outcomes the shared vocabulary defines', async () => {
  const sql = await guestSql()
  const emitted = [...sql.matchAll(/return query select (?:true|false),[^;]*?'([A-Z_]+)',(?:null::integer|\d+),'PHP'/g)]
    .map((match) => match[1])
  expect(emitted.length).toBeGreaterThan(4)
  for (const outcome of emitted) {
    expect(Object.values(DELIVERY_OUTCOMES), `${outcome} is not a defined outcome`).toContain(outcome)
  }
})

test('the customer path can only ever be more conservative than the staff path', async () => {
  const sql = await guestSql()
  // Exactly one STANDARD_FEE return exists, and it is the last statement, after
  // every refusal has already returned. A second one would be a way to reach a
  // charge that skipped a gate.
  const standardFeeReturns = sql.match(/'STANDARD_FEE',v_fee/g) || []
  expect(standardFeeReturns).toHaveLength(1)
  expect(sql).not.toMatch(/'PLANNING_FLOOR|FLOOR\|LUZON|FLOOR\|NCR/)
  // The macro-area floors must not be reachable from the customer function at all.
  expect(sql).toMatch(/scope = 'EXACT_PILOT'/)
  expect(sql).toMatch(/status = 'PILOT_APPROVED'/)
})

test('a planning floor can never hold a quotable status, whatever the dashboard sends', async () => {
  const schema = await schemaSql()
  expect(schema).toMatch(
    /delivery_locality_rules_quotable_scope_check\s+check \(\(status = 'PILOT_APPROVED'\) = \(scope = 'EXACT_PILOT'\)\)/,
  )
  // And the resolver refuses the same row shape independently of the database.
  const floor = {
    localityId: 'LOC-FLOOR-LUZON', matchKey: 'FLOOR|LUZON', scope: 'REFERENCE_ONLY',
    status: 'PLANNING_FLOOR_NOT_QUOTABLE', profileId: 'PROFILE-STD-1P-UPTO-3KG', integrity: 'OK',
  }
  const result = resolveDeliveryQuote({
    channel: 'Website', service: 'K2 Standard Delivery', originId: 'WAREHOUSE_A',
    localityId: 'LOC-FLOOR-LUZON', parcelCount: 1, weightG: 1000, weightBasis: 'MEASURED',
    oversize: false, remoteArea: false, specialProtection: false,
    merchandiseSubtotalMinor: 1000, recalculationConfirmed: true, quoteDate: '2026-09-02',
  }, {
    controls: DELIVERY_PILOT_CONTROLS,
    sources: [{ sourceId: 'SRC-A', currency: 'PHP', freshness: 'CURRENT', integrity: 'OK' }],
    courierOptions: [{
      optionId: 'OPT-A', providerId: 'PRV-A', providerName: 'A', serviceCode: 'A',
      serviceName: 'A', originId: 'WAREHOUSE_A', eligibility: 'AUTO_QUOTE_ELIGIBLE',
      approved: true, integrity: 'OK',
    }],
    localityRules: [floor],
    costRows: [{
      costId: 'COST-A', optionId: 'OPT-A', originId: 'WAREHOUSE_A', localityId: 'LOC-FLOOR-LUZON',
      profileId: 'PROFILE-STD-1P-UPTO-3KG', currency: 'PHP', completeness: 'PROVIDER_TOTAL_COMPLETE',
      amountMinor: 8500, status: 'ACTIVE_APPROVED', approvedByOwner: true, sourceId: 'SRC-A',
      effectiveFrom: '2026-09-01', effectiveTo: null,
    }],
  })
  expect(result.outcome).toBe(DELIVERY_OUTCOMES.MANUAL_COURIER_QUOTE)
  expect(result.feeMinor).toBeNull()
})

test('the seed carries exactly the eight verified pilot localities and no more', async () => {
  const seed = await seedSql()
  const exact = seed.match(/'EXACT_PILOT',\s*\n?\s*'PILOT_APPROVED'/g) || []
  expect(exact).toHaveLength(8)
  for (const [localityId, minor] of [
    ['LOC-SJDM-MUZON-E', 8500], ['LOC-ANGELES-AGAPITO', 8500],
    ['LOC-CALAMBA-BAGONG-K', 8500], ['LOC-DAGUPAN-BACAYAO-N', 8500],
    ['LOC-BAGUIO-ABCR', 8500], ['LOC-CALOOCAN-BRGY-1', 9500],
    ['LOC-CEBU-APAS', 10000], ['LOC-DAVAO-AGDAO', 10500],
  ]) {
    expect(seed, localityId).toMatch(new RegExp(`'${localityId}',\\s*${minor}\\)`))
  }
  // The four macro-area rows exist, and every one of them is non-quotable.
  const floors = seed.match(/'REFERENCE_ONLY', 'PLANNING_FLOOR_NOT_QUOTABLE'/g) || []
  expect(floors).toHaveLength(4)
})

test('cost rows are readable by no client role, and the guest function returns no cost', async () => {
  const schema = await schemaSql()
  expect(schema).toMatch(/revoke all on table public\.delivery_cost_rows from public, anon, authenticated;/)
  // Every other control table gets a staff select grant; this one deliberately
  // gets none, so a missing grant here is the boundary, not an oversight.
  expect(schema).not.toMatch(/grant select on table public\.delivery_cost_rows/)

  const guest = await guestSql()
  expect(guest).not.toMatch(/amount_minor(?![\s\S]{0,80}(max|is not null|<=|>))/)
  // The returned columns carry an outcome and a final charge only.
  expect(guest).toMatch(
    /returns table\(\s*ok boolean, error_code text, retry_after_seconds integer,\s*outcome text, fee_minor integer, currency text, customer_visible boolean, message_code text\s*\)/,
  )
})

test('both delivery routes are registered with the controls their surface requires', () => {
  expect(STOREFRONT_BFF_ROUTES).toContain('delivery/quote')
  expect(STOREFRONT_BFF_ROUTE_CONTROLS['delivery/quote']).toMatchObject({
    method: 'POST', origin: true, signed: true, databaseRateLimit: true, guestGrant: 'none',
  })

  for (const route of ['delivery', 'delivery/quote', 'delivery/cost-publish', 'delivery/courier-state']) {
    expect(ADMIN_BFF_ROUTES, route).toContain(route)
  }
  expect(ADMIN_BFF_ROUTE_CONTROLS.delivery).toMatchObject({ method: 'GET', identity: 'active-aal2-session' })
  // Every admin write, and the tester, sit behind CSRF and an idempotency key.
  for (const route of ['delivery/quote', 'delivery/cost-publish', 'delivery/courier', 'delivery/courier-state', 'delivery/locality', 'delivery/source-state']) {
    expect(ADMIN_BFF_ROUTE_CONTROLS[route], route).toMatchObject({
      method: 'POST', csrf: true, idempotency: true, identity: 'active-aal2-session',
    })
  }
})

test('only the two intended delivery functions are reachable anonymously', () => {
  const anonDelivery = EXPECTED_ANON_FUNCTIONS.filter((name) => name.includes('delivery'))
  expect(anonDelivery.sort()).toEqual([
    'public.quote_guest_delivery_v1(bigint,uuid,text,text,text)',
    'public.read_delivery_pilot_localities_v1()',
  ])
  // Neither the staff read nor the admin command may be anonymous.
  expect(EXPECTED_ANON_FUNCTIONS).not.toContain('public.read_delivery_control_v1()')
  expect(EXPECTED_ANON_FUNCTIONS.some((name) => name.includes('execute_admin_delivery'))).toBe(false)
})
