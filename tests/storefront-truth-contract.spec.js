import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// Small source-truth pins for storefront rendering rules that browser tests
// only exercise with non-zero fixtures. Each pin names the exact line so a
// regression shows up here instead of as a mislabeled shelf.

test('zero stock reaches the stock pill instead of falling back', async () => {
  const page = await readFile(new URL('../src/views/MasterProduct.jsx', import.meta.url), 'utf8')
  expect(page).toContain('product.stock_available ?? product.stock')
  expect(page).not.toMatch(/stock_available \|\| product\.stock/)
})

test('a failed catalog load never reads as empty and a stale list says so', async () => {  const context = await readFile(new URL('../src/context/StoreContext.jsx', import.meta.url), 'utf8')
  expect(context).toContain('catalogStale')
  expect(context).toContain('catalogFailed')
  expect(context).toContain('refreshCatalog')
  const grid = await readFile(new URL('../src/components/CatalogGrid.jsx', import.meta.url), 'utf8')
  expect(grid).toContain('catalogFailed')
  expect(grid).toContain('Retry loading the catalog')
  expect(grid).toContain('catalogStale')
  const arrivals = await readFile(new URL('../src/components/home/NewArrivals.jsx', import.meta.url), 'utf8')
  expect(arrivals).toContain('catalogFailed')
})

test('route changes move screen-reader and keyboard focus to the destination', async () => {  const context = await readFile(new URL('../src/context/StoreContext.jsx', import.meta.url), 'utf8')
  expect(context).toContain('focusRouteDestination')
  expect(context).toContain("document.querySelector('main h1,main')")
  const drawer = await readFile(new URL('../src/components/CartDrawer.jsx', import.meta.url), 'utf8')
  expect(drawer).toContain('headingRef')
  expect(drawer).toContain('openerRef')
})

test('retries keep their idempotency identity and double submits stay silent', async () => {
  const context = await readFile(new URL('../src/context/StoreContext.jsx', import.meta.url), 'utf8')
  // The rotating challenge token must not fingerprint the logical request.
  expect(context).toContain('botToken: _challengeToken')
  // A second submit mid-flight is a non-error the UI swallows deliberately.
  expect(context).toContain("code: 'ALREADY_SUBMITTING'")
  const checkout = await readFile(new URL('../src/views/Checkout.jsx', import.meta.url), 'utf8')
  expect(checkout).toContain("result?.code === 'ALREADY_SUBMITTING'")
})

test('provenance claims render only from recorded origin evidence', async () => {
  const passport = await readFile(new URL('../src/components/ProductPassport.jsx', import.meta.url), 'utf8')
  expect(passport).toContain('{origin && (')
  expect(passport).not.toMatch(/Authentic Import[\s\S]{0,200}?\borigin \|\| 'Italy'/)
  const page = await readFile(new URL('../src/views/MasterProduct.jsx', import.meta.url), 'utf8')
  expect(page).not.toContain("|| 'Italy'")
})

test('checkout offers the server-accepted fulfillment methods instead of hardcoding one', async () => {
  const checkout = await readFile(new URL('../src/views/Checkout.jsx', import.meta.url), 'utf8')
  for (const method of ['Metro Manila delivery', 'Courier delivery', 'Pickup']) {
    expect(checkout).toContain(method)
  }
  expect(checkout).toContain('name="fulfillment-method"')
})

test('wholesale rejects malformed contact details before submission', async () => {
  const wholesale = await readFile(new URL('../src/views/Wholesale.jsx', import.meta.url), 'utf8')
  expect(wholesale).toContain('Enter a valid work email address.')
  expect(wholesale).toContain('Enter a valid phone number with country code.')
})

test('story section uses honest neutral fallback on media error', async () => {
  const story = await readFile(new URL('../src/components/home/StorySection.jsx', import.meta.url), 'utf8')
  expect(story).toContain('applyImageFallback')
  expect(story).toMatch(/onError=\{applyImageFallback\}/)
})

test('new arrivals and product page controls meet the 44px touch target invariant', async () => {
  const arrivals = await readFile(new URL('../src/components/home/NewArrivals.jsx', import.meta.url), 'utf8')
  expect(arrivals).toMatch(/min-h-11|h-11/)
  expect(arrivals).toMatch(/min-w-11|w-11/)
  const product = await readFile(new URL('../src/views/MasterProduct.jsx', import.meta.url), 'utf8')
  expect(product).toContain('min-h-11 min-w-11')
  expect(product).toContain('min-h-11 px-2')
})

test('catalog grid provides newest arrivals sort option and explicit comparator logic', async () => {
  const grid = await readFile(new URL('../src/components/CatalogGrid.jsx', import.meta.url), 'utf8')
  expect(grid).toContain('value="latest"')
  expect(grid).toContain('compareCatalogProducts')
  const sortLib = await readFile(new URL('../src/lib/catalogSort.js', import.meta.url), 'utf8')
  expect(sortLib).toContain("sortBy === 'latest'")
  expect(sortLib).toMatch(/new Date\([ab]\.created_at/)
})


test('storefront context queries products newest-first and supports shareable catalog URL params', async () => {
  const context = await readFile(new URL('../src/context/StoreContext.jsx', import.meta.url), 'utf8')
  expect(context).toContain(".order('created_at', { ascending: false })")
  expect(context).toContain("sortBy,")
  expect(context).toContain("setSortBy,")
  expect(context).toContain("replaceState")
  expect(context).toContain("params.get('q')")
  expect(context).toContain("params.get('category')")
  expect(context).toContain("params.get('sort')")
})

test('mobile buying order places purchase controls and safety notices before secondary product detail', async () => {
  const product = await readFile(new URL('../src/views/MasterProduct.jsx', import.meta.url), 'utf8')
  const priceIndex = product.indexOf('peso(price)')
  const allergenIndex = product.indexOf('Allergen Notice')
  const cartIndex = product.indexOf('Add to cart')
  const descIndex = product.indexOf('product.description')
  const passportIndex = product.indexOf('<ProductPassport')
  const specsIndex = product.indexOf('Product specifications')

  expect(priceIndex).toBeGreaterThan(0)
  expect(allergenIndex).toBeGreaterThan(priceIndex)
  expect(allergenIndex).toBeLessThan(cartIndex)
  expect(cartIndex).toBeLessThan(descIndex)
  expect(descIndex).toBeLessThan(passportIndex)
  expect(passportIndex).toBeLessThan(specsIndex)
})

test('product detail replaces full catalog duplication with curated related provisions and browse link', async () => {
  const product = await readFile(new URL('../src/views/MasterProduct.jsx', import.meta.url), 'utf8')
  expect(product).not.toContain('<CatalogGrid')
  expect(product).not.toContain("import CatalogGrid from '../components/CatalogGrid'")
  expect(product).toContain('Related Italian Provisions')
  expect(product).toContain('Browse full catalog')
  expect(product).toContain('min-h-11')
})

test('catalog grid supports 2-column mobile scanning on phones 370px and above', async () => {
  const grid = await readFile(new URL('../src/components/CatalogGrid.jsx', import.meta.url), 'utf8')
  expect(grid).toContain('min-[370px]:grid-cols-2')
})
