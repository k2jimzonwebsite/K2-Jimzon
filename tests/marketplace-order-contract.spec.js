import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { ADMIN_BFF_ROUTES, ADMIN_BFF_ROUTE_CONTROLS } from '../server/admin-bff/router.js'
import {
  MARKETPLACE_ORDER_VERSION,
  deduplicateMarketplaceOrderFacts,
  parseMarketplaceOrderCsv,
} from '../server/admin-bff/marketplace-snapshots.js'

const SHOP_ID = '20000000-0000-4000-8000-000000000001'
const fixture = (provider) => readFile(new URL(`fixtures/marketplace-orders/${provider}.synthetic.csv`, import.meta.url), 'utf8')

test('synthetic order exports normalize without accepting customer fields', async () => {
  for (const provider of ['shopee', 'lazada', 'tiktok']) {
    const parsed = parseMarketplaceOrderCsv(await fixture(provider), SHOP_ID)
    expect(parsed.schemaVersion).toBe(MARKETPLACE_ORDER_VERSION)
    expect(parsed.facts.length).toBeGreaterThan(0)
    expect(parsed.facts.every((fact) => fact.shopId === SHOP_ID)).toBe(true)
    expect(JSON.stringify(parsed)).not.toMatch(/customer|email|phone|address/i)
  }
})

test('order import preserves exact duplicates and changed-payload conflicts', async () => {
  const parsed = parseMarketplaceOrderCsv(await fixture('shopee'), SHOP_ID)
  const result = deduplicateMarketplaceOrderFacts(parsed.facts)
  expect(result.accepted).toHaveLength(1)
  expect(result.duplicates).toHaveLength(1)
  expect(result.conflicts).toHaveLength(1)
  expect(result.duplicates[0].duplicateOfRowNumber).toBe(1)
  expect(result.conflicts[0].conflictWithRowNumber).toBe(1)
})

test('order CSV enforces exact schema, formula, size, date, quantity, and money bounds', async () => {
  const csv = await fixture('lazada')
  expect(() => parseMarketplaceOrderCsv(csv.replace('external_order_id', 'order_id'), SHOP_ID))
    .toThrow('MARKETPLACE_ORDER_HEADERS_INVALID')
  expect(() => parseMarketplaceOrderCsv(csv.replace('LZ-ORDER-001', '=IMPORTXML("x")'), SHOP_ID))
    .toThrow('MARKETPLACE_ORDER_FORMULA_BLOCKED')
  expect(() => parseMarketplaceOrderCsv(csv.replace(',2,2400.00,', ',0,2400.00,'), SHOP_ID))
    .toThrow('MARKETPLACE_ORDER_FACT_INVALID')
  expect(() => parseMarketplaceOrderCsv(csv.replace('2400.00', '999999999999.00'), SHOP_ID))
    .toThrow('MARKETPLACE_ORDER_FACT_INVALID')
  expect(() => parseMarketplaceOrderCsv(`${csv}${'x'.repeat(512 * 1024)}`, SHOP_ID))
    .toThrow('MARKETPLACE_ORDER_FILE_INVALID')
})

test('order staging uses fixed private BFF and database boundaries without canonical stock writes', async () => {
  expect(ADMIN_BFF_ROUTES).toContain('marketplace-orders/stage')
  expect(ADMIN_BFF_ROUTES).toContain('marketplace-orders/status')
  expect(ADMIN_BFF_ROUTE_CONTROLS['marketplace-orders/stage']).toMatchObject({
    method: 'POST', csrf: true, idempotency: true,
  })
  const migration = await readFile(new URL('../supabase/migrations/20260831_marketplace_snapshot_staging.sql', import.meta.url), 'utf8')
  expect(migration).toContain('k2_private.owner_close_order_imports')
  expect(migration).toContain("p_action='marketplace_order_fact_stage'")
  expect(migration).toContain('read_admin_owner_close_order_import_v1')
  expect(migration).not.toMatch(/(?:insert\s+into|update|delete\s+from)\s+public\.product_batches/i)
})
