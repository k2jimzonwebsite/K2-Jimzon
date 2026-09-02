import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const readStoreContext = () => readFile(
  new URL('../src/context/StoreContext.jsx', import.meta.url),
  'utf8',
)

test('storefront catalog has a bounded visible-page freshness fallback', async () => {
  const source = await readStoreContext()

  expect(source).toContain('const CATALOG_REFRESH_INTERVAL_MS = 60_000')
  expect(source).toContain("document.visibilityState === 'visible'")
  expect(source).toContain('window.setInterval(refreshWhenVisible, CATALOG_REFRESH_INTERVAL_MS)')
  expect(source).toContain("document.addEventListener('visibilitychange', refreshWhenVisible)")
  expect(source).toContain('window.clearInterval(refreshInterval)')
  expect(source).toContain("document.removeEventListener('visibilitychange', refreshWhenVisible)")
})

// Superseded 28 August 2026. This previously required product and stock to be
// published atomically, pinning the exact all-or-nothing guard string. That
// requirement caused a live outage: the anon grant on
// v_product_stock_from_batches was revoked, the stock read began returning 401,
// and the atomic guard discarded a successful product read so the production
// catalog rendered zero products to every customer.
//
// The replacement keeps the property that actually mattered — stock is never
// fabricated — while removing the coupling that turned one view permission error
// into a total storefront outage.
test('catalog refresh is overlap-safe and degrades safely without the stock projection', async () => {
  const source = await readStoreContext()

  expect(source).toContain('if (catalogRefreshInFlightRef.current) return')
  expect(source).toContain('catalogRefreshInFlightRef.current = true')
  expect(source).toContain('catalogRefreshInFlightRef.current = false')

  // The catalog publishes on a successful product read alone. The stock
  // projection is an enhancement, not a precondition for rendering.
  expect(source).toContain('if (!productsResult.error && productsResult.data) {')

  // A failed stock read must not be silently coerced into an empty map, which
  // would report every product as zero stock rather than as unknown.
  expect(source).not.toContain('(stockResult.data || [])')

  // When the projection is missing, stock falls back to the product row's own
  // persisted figure, including null/unknown. Zero must never be invented from
  // a missing value because that would misreport an unavailable stock read as
  // a verified sell-out.
  expect(source).toContain('stock_available: dbP.stock_available')
  expect(source).not.toContain('Number(p.stock_available) || 0')
})

test('storefront catalog is gated on the staff publication flag, not status alone', async () => {
  const source = await readStoreContext()

  // `published` is the staff-controlled publication decision, set from the
  // Published toggle in Sheet.jsx. Without this filter, any row reaching a Live
  // status leaks to the public storefront — including unpublished drafts and the
  // mock catalog rows kept for pre-launch checking.
  expect(source).toContain(".eq('published', true)")

  // The status filter stays: publication and lifecycle status are separate
  // conditions and both must hold.
  expect(source).toContain("in('status', ['Live', 'Active', 'Unlisted'])")
})
