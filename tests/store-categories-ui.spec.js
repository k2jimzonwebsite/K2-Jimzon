import { test, expect } from '@playwright/test'
import fs from 'node:fs'
const actor = '11111111-1111-4111-8111-111111111111'
const stamp = '2026-10-22T00:00:00Z'
const products = [
  { sku: 'pasta', name: 'Inventory pasta', categories: { name: 'Pasta' }, subcategory: 'Pasta', stock_available: 2 },
  { sku: 'scent', name: 'Inventory perfume', categories: { name: 'Personal care' }, subcategory: 'Fragrances', stock_available: 0 },
  { sku: 'draft', name: 'Private shoes', categories: { name: 'Footwear' }, subcategory: 'Footwear', status: 'Draft', published: false },
].map(p => ({ status: 'Live', published: true, srp: 100, updated_at: stamp, primary_image_url: '/images/placeholder.svg', ...p }))

async function store(page, rows = products) {
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop()
    if (table === 'products') return route.fulfill({ json: rows.filter(p => p.published) })
    if (table === 'v_storefront_visible_skus') return route.fulfill({ json: rows.filter(p => p.published).map(p => ({ sku: p.sku })) })
    if (table === 'v_product_stock_from_batches') return route.fulfill({ json: rows.map(p => ({ sku: p.sku, stock_from_batches: p.stock_available })) })
    return route.fulfill({ json: [] })
  })
}

test('Home, Catalog and Footer share actual shelves, preserving sold-out Fragrances and excluding Draft shelves', async ({ page }) => {
  await store(page)
  await page.goto('/catalog')
  const home = page.getByRole('region', { name: 'The Italian Cabinet' })
  await expect(home.getByRole('button', { name: /Fragrances/ })).toBeVisible()
  await expect(home.getByRole('button', { name: /Pasta/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Dolci|Cura|Bellezza/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Footwear/ })).toHaveCount(0)
  await home.getByRole('button', { name: /Fragrances/ }).click()
  await expect(page.getByTestId('product-card')).toHaveCount(1)
  await expect(page.getByTestId('product-card')).toContainText('Inventory perfume')
  await expect(page.locator('footer').getByRole('button', { name: 'Fragrances', exact: true })).toBeVisible()
  await expect(page.locator('footer').getByRole('button', { name: 'Skin care', exact: true })).toHaveCount(0)
})

test('obsolete category URL returns to All without recreating an empty category', async ({ page }) => {
  await store(page)
  await page.goto('/catalog?category=Whitening')
  await expect(page.getByTestId('product-card')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Whitening', exact: true })).toHaveCount(0)
  await expect(page).not.toHaveURL(/category=/)
})

test('an empty configured catalog never advertises demo or fixed categories', async ({ page }) => {
  await store(page, [])
  await page.goto('/catalog')
  await expect(page.getByTestId('product-card')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Snack & Sweets|Beverages|Skin Care|Caffè & Bevande/ })).toHaveCount(0)
})

async function admin(page, { failSku } = {}) {
  const rows = structuredClone(products), writes = []
  await page.context().addCookies([{ name: 'k2_admin_csrf', value: 'synthetic-category-csrf', url: 'http://127.0.0.1:5221' }])
  await page.route('**/api/admin/session', r => r.fulfill({ json: { ok: true, user: { userId: actor, role: 'Admin' } } }))
  await page.route('**/api/admin/products', r => r.fulfill({ json: { ok: true, products: rows } }))
  await page.route('**/api/admin/lots*', r => r.fulfill({ json: { ok: true, data: { lots: [], derivedStock: {}, complete: true } } }))
  await page.route('**/api/admin/product-master*', r => {
    if (r.request().method() === 'GET') return r.fulfill({ json: { ok: true, product: rows.find(p => p.sku === new URL(r.request().url()).searchParams.get('sku')) } })
    const body = r.request().postDataJSON(); writes.push(body)
    if (body.payload.sku === failSku) return r.fulfill({ status: 503, json: { error: { code: 'PRODUCT_COMMAND_UNAVAILABLE' } } })
    const row = rows.find(p => p.sku === body.payload.sku)
    Object.assign(row, body.payload.patch, { updated_at: '2026-10-22T01:00:00Z' })
    return r.fulfill({ json: { ok: true, result: { sku: row.sku, status: row.status, updatedAt: row.updated_at } } })
  })
  await page.goto('/tests/fixtures/store-categories.html?surface=admin')
  return { rows, writes }
}

for (const width of [375, 1440]) test(`staff apply one new store category to selected products at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 })
  const { writes, rows } = await admin(page)
  await page.getByRole('checkbox', { name: /Select visible/ }).check()
  await page.getByRole('button', { name: 'Set store category', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Set store category', exact: true })
  await dialog.getByLabel('Store category', { exact: true }).fill('Italian favourites')
  fs.mkdirSync('docs/design-checkpoints/20261022-categories', { recursive: true })
  await page.screenshot({ path: `docs/design-checkpoints/20261022-categories/bulk-${width}.png` })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await dialog.getByRole('button', { name: 'Apply to 3 products', exact: true }).click()
  await expect(dialog.getByRole('status')).toContainText('3 saved')
  expect(writes).toHaveLength(3)
  for (const request of writes) {
    expect(request.action).toBe('update')
    expect(request.payload.patch).toEqual({ subcategory: 'Italian favourites' })
    expect(request.payload.expectedUpdatedAt).toBe(stamp)
  }
  expect(rows.map(p => [p.stock_available, p.status, p.published])).toEqual(products.map(p => [p.stock_available, p.status, p.published]))
  await store(page, rows)
  await page.goto('/catalog')
  await expect(page.getByRole('region', { name: 'The Italian Cabinet' }).getByRole('button', { name: /Italian favourites/ })).toBeVisible()
  await expect(page.locator('footer').getByRole('button', { name: 'Italian favourites', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fragrances', exact: true })).toHaveCount(0)
})

test('uncertain second save stops the batch, retains the original request and reports partial progress', async ({ page }) => {
  const { writes } = await admin(page, { failSku: 'scent' })
  await page.getByRole('checkbox', { name: /Select visible/ }).check()
  await page.getByRole('button', { name: 'Set store category', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Set store category', exact: true })
  await dialog.getByLabel('Store category', { exact: true }).fill('Reviewed shelf')
  await dialog.getByRole('button', { name: 'Apply to 3 products', exact: true }).click()
  await expect(dialog.getByRole('status')).toContainText('1 saved')
  await expect(dialog.getByRole('alert')).toBeVisible()
  expect(writes.map(r => r.payload.sku)).toEqual(['pasta', 'scent'])
  const pending = await page.evaluate(() => Object.entries(localStorage).find(([key]) => key.includes('k2-product-master-pending')))
  expect(pending?.[1]).toContain('scent')
  await page.reload()
  await expect(page.getByRole('button', { name: /Review pending product decision/ })).toBeVisible()
})

test('invalid category names can be corrected before any batch begins', async ({ page }) => {
  const { writes } = await admin(page)
  await page.getByRole('checkbox', { name: /Select visible/ }).check()
  await page.getByRole('button', { name: 'Set store category', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Set store category', exact: true })
  await dialog.getByLabel('Store category', { exact: true }).fill('All')
  await dialog.getByRole('button', { name: 'Apply to 3 products' }).click()
  await expect(dialog.getByRole('alert')).toContainText('reserved')
  expect(writes).toHaveLength(0)
  await dialog.getByLabel('Store category', { exact: true }).fill('Household')
  await dialog.getByRole('button', { name: 'Apply to 3 products' }).click()
  await expect(dialog.getByRole('status')).toContainText('3 saved')
})

test('a category filter and Select visible restrict bulk work to matching SKUs', async ({ page }) => {
  const { writes } = await admin(page)
  await page.getByLabel('Store category filter').selectOption('Fragrances')
  await page.getByRole('checkbox', { name: /Select visible \(1\)/ }).check()
  await page.getByRole('button', { name: 'Set store category', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Set store category', exact: true })
  await dialog.getByLabel('Store category', { exact: true }).fill('Perfumes')
  await dialog.getByRole('button', { name: 'Apply to 1 product', exact: true }).click()
  await expect(dialog.getByRole('status')).toContainText('1 saved')
  expect(writes.map(r => r.payload.sku)).toEqual(['scent'])
})

for (const width of [375, 1440]) test(`inventory category shelves remain readable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 })
  await store(page)
  await page.goto('/catalog')
  await expect(page.getByRole('region', { name: 'The Italian Cabinet' }).getByRole('button', { name: /Fragrances/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  fs.mkdirSync('docs/design-checkpoints/20261022-categories', { recursive: true })
  await page.screenshot({ path: `docs/design-checkpoints/20261022-categories/store-${width}.png` })
})

test('a long category list stays visible without depending on a scroll-animation threshold', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const rows = Array.from({ length: 50 }, (_, index) => ({ ...products[0], sku: `shelf-${index}`, subcategory: `Shelf ${String(index).padStart(2, '0')}` }))
  await store(page, rows)
  await page.goto('/catalog')
  const home = page.getByRole('region', { name: 'The Italian Cabinet' })
  await expect(home.getByRole('button', { name: /Shelf 00/ })).toHaveCSS('opacity', '1')
  await home.getByRole('button', { name: /Shelf 49/ }).click()
  await expect(page.getByTestId('product-card')).toHaveCount(1)
})
