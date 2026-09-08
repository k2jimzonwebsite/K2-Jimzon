import { expect, test } from '@playwright/test'

const product = { sku: 'ORIENTATION-COFFEE', name: 'Milano espresso beans', status: 'Live',
  subcategory: 'Coffee & Drinks', srp: 845, wholesale_price: 720,
  primary_image_url: '/images/placeholder.svg', secondary_images: [], lifestyle_images: [],
  description: 'Fabricated catalog record for responsive store verification.', brand_id: 'Milano', country_of_origin: 'Italy' }

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort())
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop()
    return route.fulfill({ json: table === 'products' ? [product]
      : table === 'v_product_stock_from_batches' ? [{ sku: product.sku, stock_from_batches: 8 }] : [] })
  })
})

test('fallback keeps room controls usable in portrait and landscape', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/store')
  const store = page.getByRole('main', { name: 'K2 virtual store' })
  await expect(store).toBeVisible({ timeout: 60000 })
  await expect(store.getByRole('navigation', { name: 'Shelves' }).getByRole('button').nth(1)).toBeVisible()
  for (const [name, width, height] of [['portrait', 390, 844], ['landscape', 844, 390], ['desktop', 1440, 900]]) {
    await page.setViewportSize({ width, height })
    await page.screenshot({ path: `docs/evidence/20260908-store-orientation/${name}-after.png`, fullPage: false })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 844, height: 390 })
  expect((await store.locator('.k2-store-bar').boundingBox()).height).toBeLessThanOrEqual(80)
  expect((await store.locator('.k2-store-side-intro').boundingBox()).height).toBeLessThanOrEqual(115)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(store.locator('.k2-store-basket-dock[data-filled="false"]')).toBeHidden()
})

test('3D room renders in desktop, portrait and landscape', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/store')
  const store = page.getByRole('main', { name: 'K2 virtual store' })
  await expect(store.locator('.k2-store-scene canvas')).toBeVisible({ timeout: 60000 })
  for (const [name, width, height] of [['desktop', 1440, 900], ['portrait', 390, 844], ['landscape', 844, 390]]) {
    await page.setViewportSize({ width, height })
    await page.screenshot({ path: `docs/evidence/20260908-store-orientation/3d-${name}-after.png`, fullPage: false })
  }
  await store.getByRole('navigation', { name: 'Shelves', exact: true }).getByRole('button', { name: 'Coffee & Drinks' }).click()
  await store.locator('.k2-store-side-product').filter({ hasText: product.name }).click()
  await store.getByRole('button', { name: 'Add to basket', exact: true }).click()
  for (const [name, width, height] of [['portrait', 390, 844], ['landscape', 844, 390], ['desktop', 1440, 900]]) {
    await page.setViewportSize({ width, height })
    await expect(store.getByRole('heading', { name: product.name, exact: true })).toBeVisible()
    await expect(store.locator('.k2-store-basket-copy')).toContainText('1 item')
    await expect(store.locator('.k2-store-basket-copy')).toContainText('845')
    await expect(store.locator('.k2-store-scene canvas')).toBeVisible()
    await expect(store.getByRole('button', { name: 'Review basket' })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/evidence/20260908-store-orientation/3d-${name}-basket.png` })
    await store.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await store.getByRole('button', { name: 'Zoom out', exact: true }).click()
  }
  await store.getByRole('button', { name: 'Open K2 shopkeeper' }).click()
  await store.locator('#keeper-question').fill('Does this come in a smaller bag?')
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    await expect(store.locator('#keeper-question')).toHaveValue('Does this come in a smaller bag?')
    await expect(store.getByRole('button', { name: 'Minimize K2 shopkeeper' })).toBeInViewport()
  }
  await store.getByRole('button', { name: 'Minimize K2 shopkeeper' }).click()
})
