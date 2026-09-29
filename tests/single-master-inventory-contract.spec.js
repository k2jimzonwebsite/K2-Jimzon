import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// IDEA-20260929-06: one Supabase project, one Master Inventory. Admin owns
// truth for the Website plus every marketplace shop; the storefront shows a
// SKU only when it is Live and listed for Website. These contracts exist for
// one reason: an AI session rebuilding a second stock or catalog logic for
// the storefront is how this project already wasted months. They pin the
// single read path, the one-row-per-SKU display, and the website-price-only
// rule in source.

const sheet = () => readFile('src/views/admin/Sheet.jsx', 'utf8')
const grid = () => readFile('src/views/admin/InventoryGrid.jsx', 'utf8')
const storeContext = () => readFile('src/context/StoreContext.jsx', 'utf8')
const lotsApi = () => readFile('server/admin-bff/lots.js', 'utf8')
const smartPaste = () => readFile('src/views/admin/SmartPasteModal.jsx', 'utf8')
const migration = () => readFile('supabase/migrations/20260929_channel_listing_slices.sql', 'utf8')
const rollback = () => readFile('supabase/migrations/20260929_channel_listing_slices_rollback.sql', 'utf8')
const rulebook = () => readFile('K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md', 'utf8')
const plan = () => readFile('MASTER_ACTION_PLAN.md', 'utf8')

test('both Admin surfaces read lots through the same path', async () => {
  const [sheetSource, gridSource] = await Promise.all([sheet(), grid()])

  // Cards roll up getAdminLots; the Sheet detail must use the same call, never
  // a second stock table or a copied projection.
  expect(gridSource).toContain('getAdminLots')
  expect(sheetSource).toContain('getAdminLots')
  expect(sheetSource).toContain('toggleLotDetail')
})

test('the Sheet keeps one row per SKU with detail underneath', async () => {
  const view = await sheet()

  // The detail is a second row spanning the grid, not a second product row:
  // a channel split must never render as another SKU.
  expect(view).toContain('colSpan={ALL_COLS.length + 3}')
  expect(view).toContain('`${r.sku}-lots`')
  expect(view).toContain('Warehouse and expiry detail for')
})

test('the Sheet detail shows warehouse slices, not invented stock', async () => {
  const view = await sheet()

  // Every slice names its warehouse, holder, quantity, and expiry, and an
  // empty SKU says it has no lots rather than showing zero as truth.
  expect(view).toContain('No warehouse lots recorded for')
  expect(view).toContain('lot.hub')
  expect(view).toContain('lot.custodian')
  expect(view).toContain('lot.expiry_date')
})

test('website browse and direct lookup require the published Website slice', async () => {
  const view = await storeContext()

  // Website publication has its own channel listing. Product status and the
  // existing publication approval remain required; marketplace-only SKUs
  // must never leak into the storefront.
  expect(view).toContain("from('v_storefront_visible_skus')")
  expect(view).toContain("eq('published', true)")
  expect(view).toContain('websiteVisibleSkus?.has(product.sku)')
  expect(view).toContain("p.status !== 'Unlisted' && websiteVisibleSkus?.has(p.sku)")
  expect(view).not.toContain("product.status === 'Unlisted') return product")
})

test('lot detail includes measured weight and can retry a failed read', async () => {
  const [view, api] = await Promise.all([sheet(), lotsApi()])

  // Weight belongs to the physical lot. A failed lazy read must remain
  // recoverable without refreshing the entire Admin page.
  expect(api).toContain('net_weight_g')
  expect(view).toContain("net_weight_g")
  expect(view).toContain('Retry lot details')
  expect(view).toContain('loadLotDetail')
})

test('Admin product intake has no browser-side product insert path', async () => {
  const [gridSource, pasteSource] = await Promise.all([grid(), smartPaste()])

  // Product identities and Draft creation must stay on the attributable
  // phone-first route, including when the secure Admin surface is unavailable.
  expect(gridSource).not.toMatch(/from\(['"]products['"]\)\.insert/)
  expect(pasteSource).not.toMatch(/from\(['"]products['"]\)\.insert/)
  expect(pasteSource).not.toContain("from('products')")
  expect(pasteSource).toContain('Copy the approved JSON for protected phone-first intake')
  expect(pasteSource).toContain('no product or inventory record is created here')
})

test('price stays website-only: no per-shop price columns', async () => {
  const view = await sheet()

  // Owner decision 29 September: one price set on the product. A Shopee or
  // Lazada price column here would be a second pricing truth.
  expect(view).toContain("'Cost ₱', 'SRP ₱', 'Wholesale ₱', 'Dealer ₱'")
  expect(view).not.toMatch(/Shopee ₱|Lazada ₱|TikTok ₱|shop_price/i)
})

test('the slice migration and its rollback exist as a pair', async () => {
  const [forward, backward] = await Promise.all([migration(), rollback()])

  expect(forward).toContain('v_storefront_visible_skus')
  expect(forward).toContain('channel_shop_allocations_oversell_guard')
  expect(forward).toContain('K2_SHOP_OVERSELL_REFUSED')
  expect(forward).toContain('net_weight_g')
  expect(forward).toContain('security_invoker = false')
  expect(forward).toContain('security_barrier = true')
  expect(forward).toContain('grant select on table public.v_storefront_visible_skus to anon, authenticated')
  expect(forward).toContain('pg_advisory_xact_lock')
  expect(forward).toContain('update of sku, allocated_units')
  expect(forward).toContain('enforce_master_stock_not_below_shop_offers')
  expect(forward).toContain('inventory_balances_shop_allocation_guard')
  expect(forward).toContain('p.published is true')
  expect(forward).toContain("p.status in ('Live', 'Active', 'Unlisted')")
  // The rollback removes the slice but keeps an operationalized shop.
  expect(backward).toContain("status = 'not_connected'")
})

test('a second Supabase project can never become a data source', async () => {
  const [client, lazy] = await Promise.all([
    readFile('src/lib/supabaseClient.js', 'utf8'),
    readFile('src/lib/lazySupabaseClient.js', 'utf8'),
  ])

  // Both browser clients read the one project URL from the environment.
  // ScoutIT must never appear in either: it is out of scope entirely.
  expect(client).toContain('import.meta.env.VITE_SUPABASE_URL')
  expect(lazy).toContain('import.meta.env.VITE_SUPABASE_URL')
  expect(client).not.toContain('yyixsuaimdzyiocswcgc')
  expect(lazy).not.toContain('yyixsuaimdzyiocswcgc')
})

test('the locked rule is written where AI sessions must read it', async () => {
  const [book, map] = await Promise.all([rulebook(), plan()])

  expect(book).toContain('Single master inventory, Website-as-channel')
  expect(book).toContain('IDEA-20260929-06')
  expect(map).toContain('IDEA-20260929-06')
})
