import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// MAP-023 Queue item 12: 'Unlisted' products can be bought through direct link.
// Documents and locks the shared predicate between StoreContext, InventoryGrid,
// and public.submit_order_request_v2.

const MIGRATION = 'supabase/migrations/20260916_allow_unlisted_product_orders.sql'
const ROLLBACK = 'supabase/migrations/20260916_allow_unlisted_product_orders_rollback.sql'
const STORE_CONTEXT = 'src/context/StoreContext.jsx'
const INVENTORY_GRID = 'src/views/admin/InventoryGrid.jsx'

test('storefront catalogue query includes Live, Active, and Unlisted statuses', async () => {
  const code = await readFile(STORE_CONTEXT, 'utf8')
  // StoreContext fetches Live, Active, and Unlisted
  expect(code).toMatch(/in\(\s*'status',\s*\[\s*'Live',\s*'Active',\s*'Unlisted'\s*\]\s*\)/)
  // StoreContext filters out Unlisted only from listedProducts (browse view)
  expect(code).toContain("p.status !== 'Unlisted'")
})

test('admin inventory status options explicitly state direct link works for Unlisted', async () => {
  const code = await readFile(INVENTORY_GRID, 'utf8')
  expect(code).toMatch(/value:\s*'Unlisted'/)
  expect(code).toContain('Hidden from browse — direct link still works')
})

test('submit_order_request_v2 migration allows Live, Active, and Unlisted products', async () => {
  const sql = await readFile(MIGRATION, 'utf8')

  // The check must accept Unlisted products
  expect(sql).toContain("v_product.product_status not in ('Live', 'Active', 'Unlisted')")
  expect(sql).toContain("raise exception 'Product % is not available for website orders', v_product.sku;")

  // Must preserve transaction safety and preflight
  expect(sql).toMatch(/^begin;/m)
  expect(sql).toMatch(/commit;\s*$/m)
  expect(sql).toContain("submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text)")

  // Must NOT grant to anon (preserving signed guest cutover from 20260812)
  expect(sql).not.toMatch(/grant\s+execute\s+on\s+function\s+public\.submit_order_request_v2[^;]*\banon\b/i)
})

test('rollback migration restores original status check without Unlisted', async () => {
  const sql = await readFile(ROLLBACK, 'utf8')

  // Rollback must restrict back to Live and Active
  expect(sql).toContain("v_product.product_status not in ('Live', 'Active')")
  expect(sql).toMatch(/^begin;/m)
  expect(sql).toMatch(/commit;\s*$/m)
})

test('purchase-time reservation rehearsal includes unlisted product ordering and rollback checks', async () => {
  const runner = await readFile('scripts/rehearse-purchase-time-reservation.mjs', 'utf8')
  expect(runner).toContain('20260916_allow_unlisted_product_orders.sql')
  expect(runner).toContain('20260916_allow_unlisted_product_orders_rollback.sql')
  expect(runner).toContain('unlisted products can be ordered after migration while draft products remain forbidden')
})
