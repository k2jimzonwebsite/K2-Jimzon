import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  MARKETPLACE_SNAPSHOT_COLUMNS,
  MARKETPLACE_SNAPSHOT_VERSION,
  buildMarketplaceProductSuggestions,
  deduplicateMarketplaceOrderFacts,
  parseMarketplaceSnapshotCsv,
  validateMarketplaceMatchDecision,
  validateOwnerCloseSession,
} from '../server/admin-bff/marketplace-snapshots.js'
import { ADMIN_BFF_ROUTE_CONTROLS, ADMIN_BFF_ROUTES } from '../server/admin-bff/router.js'

const fixture = async (provider) => readFile(
  new URL(`./fixtures/marketplace-snapshots/${provider}.synthetic.csv`, import.meta.url),
  'utf8',
)

test('synthetic Shopee, Lazada, and TikTok fixtures normalize into one bounded contract', async () => {
  for (const provider of ['shopee', 'lazada', 'tiktok']) {
    const parsed = parseMarketplaceSnapshotCsv(await fixture(provider))
    expect(parsed.schemaVersion).toBe(MARKETPLACE_SNAPSHOT_VERSION)
    expect(parsed.rows).toHaveLength(2)
    expect(Object.keys(parsed.rows[0].source)).toEqual(MARKETPLACE_SNAPSHOT_COLUMNS)
    expect(parsed.rows.every((row) => row.outcome === 'accepted')).toBe(true)
    expect(parsed.fileSha256).toMatch(/^[0-9a-f]{64}$/)
  }
})

test('snapshot parsing enforces byte, row, quantity, money, time, and formula bounds', async () => {
  const csv = await fixture('shopee')
  const rows = parseMarketplaceSnapshotCsv(csv).rows.map((row) => row.source)
  const header = MARKETPLACE_SNAPSHOT_COLUMNS.join(',')
  const line = MARKETPLACE_SNAPSHOT_COLUMNS.map((column) => rows[0][column]).join(',')
  expect(() => parseMarketplaceSnapshotCsv(`${header}\n${Array.from({ length: 1001 }, () => line).join('\n')}`))
    .toThrow('MARKETPLACE_SNAPSHOT_ROW_LIMIT')
  expect(() => parseMarketplaceSnapshotCsv(csv.replace(',4,2026-', ',-1,2026-')))
    .toThrow('MARKETPLACE_SNAPSHOT_ROW_INVALID')
  expect(() => parseMarketplaceSnapshotCsv(csv.replace('349.00', '=2+2')))
    .toThrow('MARKETPLACE_SNAPSHOT_FORMULA_BLOCKED')
})

test('duplicate snapshot rows are retained as evidence while changed duplicates conflict', async () => {
  const csv = await fixture('shopee')
  const [header, first] = csv.trim().split(/\r?\n/)
  const exact = parseMarketplaceSnapshotCsv(`${header}\n${first}\n${first}`)
  expect(exact.rows.map((row) => row.outcome)).toEqual(['accepted', 'duplicate'])
  expect(exact.rows[1].duplicateOfRowNumber).toBe(2)

  const changed = first.replace(',4,2026-', ',5,2026-')
  const conflict = parseMarketplaceSnapshotCsv(`${header}\n${first}\n${changed}`)
  expect(conflict.rows.map((row) => row.outcome)).toEqual(['accepted', 'conflict'])
  expect(conflict.rows[1].errors).toContain('DUPLICATE_IDENTITY_CHANGED_PAYLOAD')
})

test('SKU, barcode, and normalized-name matches remain ranked suggestions only', async () => {
  const row = parseMarketplaceSnapshotCsv(await fixture('shopee')).rows[0]
  const candidates = [
    { id: 'p-1', sku: 'SP-LAV-250', barcode: null, name: 'Other product', size: '250 g', formulation: 'ground coffee' },
    { id: 'p-2', sku: 'K2-SKU-000010', barcode: '8000000000012', name: 'Lavazza Qualità Oro Ground Coffee 250g', size: '250 g', formulation: 'ground coffee' },
    { id: 'p-3', sku: 'K2-SKU-000011', barcode: null, name: 'Lavazza Qualita Oro Ground Coffee 250g', size: '1 kg', formulation: 'whole bean' },
  ]
  const suggestions = buildMarketplaceProductSuggestions(row, candidates)
  expect(suggestions[0]).toMatchObject({ productId: 'p-2', reasons: expect.arrayContaining(['barcode', 'normalized_name']), eligible: true })
  expect(suggestions.find((item) => item.productId === 'p-3')).toMatchObject({ eligible: false, variantConflict: true })
  expect(row.matchDecision).toBeUndefined()
})

test('Admin decisions allow link, create Draft, or unresolved without accepting a supplied K2 SKU', async () => {
  const row = {
    ...parseMarketplaceSnapshotCsv(await fixture('shopee')).rows[0],
    suggestions: [{ productId: 'p-2', sku: 'K2-SKU-000010', eligible: true }],
  }
  expect(validateMarketplaceMatchDecision({
    decision: 'link_existing', productId: 'p-2', reason: 'Package evidence confirms this exact 250 g ground-coffee variant.',
  }, row)).toMatchObject({ decision: 'link_existing', productId: 'p-2' })
  expect(validateMarketplaceMatchDecision({
    decision: 'create_new_draft', reviewedProduct: { name: 'New exact variant' }, reason: 'No canonical product represents this exact sellable variant.',
  }, row)).toMatchObject({ decision: 'create_new_draft', reviewedProduct: { name: 'New exact variant' } })
  expect(() => validateMarketplaceMatchDecision({
    decision: 'create_new_draft', reviewedProduct: { name: 'New exact variant', sku: 'MANUAL-SKU' }, reason: 'No canonical product represents this exact sellable variant.',
  }, row)).toThrow('MARKETPLACE_MATCH_DECISION_INVALID')
  expect(validateMarketplaceMatchDecision({
    decision: 'leave_unresolved', reason: 'Pack count is missing, so exact variant identity is unresolved.',
  }, row)).toMatchObject({ decision: 'leave_unresolved' })
})

test('variant-conflicting suggestions cannot be linked', async () => {
  const row = {
    ...parseMarketplaceSnapshotCsv(await fixture('shopee')).rows[0],
    suggestions: [{ productId: 'p-3', sku: 'K2-SKU-000011', eligible: false, variantConflict: true }],
  }
  expect(() => validateMarketplaceMatchDecision({
    decision: 'link_existing', productId: 'p-3', reason: 'The provider reused the identifier.',
  }, row)).toThrow('MARKETPLACE_VARIANT_CONFLICT')
})

test('order facts deduplicate per exact shop/order/line and expose changed-payload conflicts', () => {
  const base = {
    shopId: '11111111-1111-4111-8111-111111111111', externalOrderId: 'ORDER-1', externalLineId: 'LINE-1',
    marketplaceSku: 'SP-LAV-250', quantity: 1, grossAmount: '349.00', currency: 'PHP',
    orderedAt: '2026-08-31T08:30:00+08:00', orderStatus: 'paid', paymentStatus: 'verified',
  }
  const otherShop = { ...base, shopId: '22222222-2222-4222-8222-222222222222' }
  const result = deduplicateMarketplaceOrderFacts([base, { ...base }, { ...base, quantity: 2 }, otherShop])
  expect(result.accepted).toHaveLength(2)
  expect(result.duplicates).toHaveLength(1)
  expect(result.conflicts).toHaveLength(1)
})

test('Owner Count & Close contract is Asia/Manila, bounded, exact-shop, and resumable', () => {
  const session = validateOwnerCloseSession({
    sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    periodStart: '2026-08-01', periodEnd: '2026-08-31', timezone: 'Asia/Manila',
    shopIds: ['11111111-1111-4111-8111-111111111111'],
    currentStep: 'source_selection', expectedVersion: 1,
  })
  expect(session).toMatchObject({ timezone: 'Asia/Manila', expectedVersion: 1 })
  expect(() => validateOwnerCloseSession({ ...session, timezone: 'UTC' }))
    .toThrow('OWNER_CLOSE_SESSION_INVALID')
})

test('prepared BFF and database boundary is private, signed, receipt-backed, and cannot change stock', async () => {
  for (const route of [
    'marketplace-snapshots/stage', 'marketplace-snapshots/decision',
    'marketplace-snapshots/status', 'owner-close/session', 'owner-close/coverage', 'owner-close/fees',
  ]) {
    expect(ADMIN_BFF_ROUTES).toContain(route)
  }
  expect(ADMIN_BFF_ROUTE_CONTROLS['marketplace-snapshots/stage']).toMatchObject({
    method: 'POST', identity: 'active-aal2-session', csrf: true, idempotency: true,
  })
  const migration = await readFile(new URL('../supabase/migrations/20260831_marketplace_snapshot_staging.sql', import.meta.url), 'utf8')
  expect(migration).toContain('k2_private.marketplace_snapshot_imports')
  expect(migration).toContain('k2_private.marketplace_snapshot_rows')
  expect(migration).toContain('k2_private.marketplace_snapshot_events')
  expect(migration).toContain('k2_private.owner_close_sessions')
  expect(migration).toContain('verify_admin_bff_request')
  expect(migration).toContain('admin_command_receipts')
  expect(migration).toContain('generate_k2_sku_internal')
  expect(migration).toContain('K2_MARKETPLACE_SNAPSHOT_CONFLICT')
  expect(migration).toContain('K2_MARKETPLACE_ADMIN_REQUIRED')
  expect(migration).toContain("p_action='owner_close_session_save'")
  expect(migration).toContain('read_admin_marketplace_coverage_input_v1')
  expect(migration).toContain('k2_private.marketplace_coverage_override_events')
  expect(migration).toContain("p_action='marketplace_coverage_override'")
  expect(migration).toContain("'effect','proposal_only'")
  expect(migration).toContain("'providerWrite',false")
  expect(migration).not.toMatch(/(?:insert\s+into|update|delete\s+from)\s+public\.product_batches/i)

  const preflight = await readFile(new URL('../supabase/marketplace_snapshot_staging_preflight.sql', import.meta.url), 'utf8')
  const postflight = await readFile(new URL('../supabase/marketplace_snapshot_staging_postflight.sql', import.meta.url), 'utf8')
  expect(preflight).toContain('MARKETPLACE_SNAPSHOT_PREFLIGHT_OK')
  expect(postflight).toContain('MARKETPLACE_SNAPSHOT_POSTFLIGHT_OK')

  const rollback = await readFile(new URL('../supabase/marketplace_snapshot_staging_rollback.sql', import.meta.url), 'utf8')
  expect(rollback).toContain('revoke execute on function public.execute_admin_marketplace_snapshot_v1')
  expect(rollback).not.toContain('drop table')
})

test('portable PostgreSQL rehearsal covers preflight, behavior, postflight, and non-destructive rollback', async () => {
  const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
  const packageJson = JSON.parse(await readProjectFile('package.json'))
  const rehearsal = await readProjectFile('scripts/rehearse-marketplace-snapshot-portable.mjs')
  const bootstrap = await readProjectFile('supabase/tests/marketplace_snapshot_staging_bootstrap.sql')
  const assertions = await readProjectFile('supabase/tests/marketplace_snapshot_staging_assertions.sql')

  expect(packageJson.scripts['rehearse:marketplace-snapshots']).toBe(
    'node scripts/rehearse-marketplace-snapshot-portable.mjs',
  )
  for (const phase of [
    'marketplace_snapshot_staging_bootstrap.sql',
    'marketplace_snapshot_staging_preflight.sql',
    '20260831_marketplace_snapshot_staging.sql',
    'marketplace_snapshot_staging_assertions.sql',
    'marketplace_snapshot_staging_postflight.sql',
    'marketplace_snapshot_staging_rollback.sql',
  ]) expect(rehearsal).toContain(phase)
  expect(bootstrap).toContain('create table public.product_batches')
  expect(assertions).toContain('physical inventory changed')
  expect(assertions).toContain('K2_MARKETPLACE_SNAPSHOT_CONFLICT')
  expect(assertions).toContain('K2_OWNER_CLOSE_VERSION_CONFLICT')
  expect(assertions).toContain('server generated Draft SKU')
})
