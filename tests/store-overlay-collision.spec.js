import { expect, test } from '@playwright/test'

const product = {
  sku: 'COLLISION-COFFEE',
  name: 'Milano espresso beans',
  status: 'Live',
  subcategory: 'Coffee & Drinks',
  srp: 845,
  wholesale_price: 720,
  primary_image_url: '/images/placeholder.svg',
  secondary_images: [],
  lifestyle_images: [],
  description: 'Fabricated catalog record for responsive store collision verification.',
  brand_id: 'Milano',
  country_of_origin: 'Italy',
}

function doBoxesIntersect(boxA, boxB) {
  if (!boxA || !boxB) return false
  return !(
    boxA.x + boxA.width <= boxB.x ||
    boxB.x + boxB.width <= boxA.x ||
    boxA.y + boxA.height <= boxB.y ||
    boxB.y + boxB.height <= boxA.y
  )
}

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort())
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop()
    return route.fulfill({
      json: table === 'products'
        ? [product]
        : table === 'v_product_stock_from_batches'
          ? [{ sku: product.sku, stock_from_batches: 8 }]
          : [],
    })
  })
})

test.describe('Mobile store overlay collision prevention', () => {
  test.setTimeout(180000)

  test('portrait viewport (375x812): zero collision between counter, keeper, zoom, and basket dock', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/store', { waitUntil: 'domcontentloaded' })

    const store = page.getByRole('main', { name: 'K2 virtual store' })
    await expect(store).toBeVisible({ timeout: 60000 })

    // 1. Counter view with empty basket
    const keeperToggle = store.locator('.k2-store-guide')
    const emptyBasket = store.locator('.k2-store-basket-dock[data-filled="false"]')

    await expect(keeperToggle).toBeVisible()
    await expect(store.locator('.k2-store-zoom')).toBeHidden()
    await expect(emptyBasket).toBeHidden()

    const keeperBox = await keeperToggle.boundingBox()
    expect(keeperBox.width).toBeGreaterThan(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    // 2. Navigate to Coffee & Drinks shelf and add item to basket
    await store.getByRole('navigation', { name: 'Shelves', exact: true }).getByRole('button', { name: 'Coffee & Drinks' }).click()
    await store.locator('.k2-store-rail button').filter({ hasText: product.name }).click()
    const productPopup = store.locator('.k2-store-product-popup')
    await expect(productPopup).toBeVisible()
    await store.getByRole('button', { name: 'Add to basket', exact: true }).click()

    // 3. Basket dock is now filled and docked at bottom right above the rail
    const filledBasket = store.locator('.k2-store-basket-dock[data-filled="true"]')
    await expect(filledBasket).toBeVisible()
    await expect(filledBasket.locator('.k2-store-basket-copy')).toContainText('1 item')
    await expect(filledBasket.locator('.k2-store-basket-copy')).toContainText('845')

    const filledBasketBox = await filledBasket.boundingBox()
    const updatedKeeperBox = await keeperToggle.boundingBox()

    // Assert zero overlay collision between floating utilities
    expect(doBoxesIntersect(filledBasketBox, updatedKeeperBox)).toBe(false)

    // Verify touch targets: review basket button is at least 44x44
    const reviewBtn = filledBasket.getByRole('button', { name: 'Review basket' })
    await expect(reviewBtn).toBeInViewport()
    const reviewBtnBox = await reviewBtn.boundingBox()
    expect(reviewBtnBox.height).toBeGreaterThanOrEqual(44)
    expect(reviewBtnBox.width).toBeGreaterThanOrEqual(44)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    // 4. Open shopkeeper: verify dialogue panel does not collide with filled basket dock
    await store.getByRole('button', { name: 'Open K2 shopkeeper' }).click()
    const keeperPanel = store.locator('#k2-store-guide-panel')
    await expect(keeperPanel).toBeVisible()

    const openKeeperTotalBox = await keeperToggle.boundingBox()
    const currentBasketBox = await filledBasket.boundingBox()
    expect(doBoxesIntersect(openKeeperTotalBox, currentBasketBox)).toBe(false)

    // Form input #keeper-question is fillable and inside viewport
    const questionInput = store.locator('#keeper-question')
    await expect(questionInput).toBeVisible()
    await questionInput.fill('Is this medium or dark roast?')
    await expect(questionInput).toHaveValue('Is this medium or dark roast?')

    // Review basket button remains visible and clickable even with keeper panel open
    await expect(reviewBtn).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    // Capture open keeper dialogue alongside basket evidence
    await page.screenshot({ path: 'docs/evidence/20260915-store-overlay-collisions/portrait-375-keeper-open.png', fullPage: false })

    await store.getByRole('button', { name: 'Minimize K2 shopkeeper' }).click()
    await expect(keeperPanel).toBeHidden()

    // Screenshot evidence for audit trail
    await page.screenshot({ path: 'docs/evidence/20260915-store-overlay-collisions/portrait-375-basket.png', fullPage: false })
  })

  test('landscape viewport (844x390): controls and basket dock usable without collision', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await page.goto('/store')

    const store = page.getByRole('main', { name: 'K2 virtual store' })
    await expect(store).toBeVisible({ timeout: 60000 })

    await store.getByRole('navigation', { name: 'Shelves', exact: true }).getByRole('button', { name: 'Coffee & Drinks' }).click()
    await store.locator('.k2-store-rail button').filter({ hasText: product.name }).click()
    await store.getByRole('button', { name: 'Add to basket', exact: true }).click()

    const filledBasket = store.locator('.k2-store-basket-dock[data-filled="true"]')
    const keeperToggle = store.locator('.k2-store-guide')

    await expect(filledBasket).toBeVisible()
    await expect(store.locator('.k2-store-zoom')).toBeHidden()
    await expect(keeperToggle).toBeVisible()

    const filledBasketBox = await filledBasket.boundingBox()
    const keeperBox = await keeperToggle.boundingBox()

    expect(doBoxesIntersect(filledBasketBox, keeperBox)).toBe(false)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    await page.screenshot({ path: 'docs/evidence/20260915-store-overlay-collisions/landscape-844-basket.png', fullPage: false })
  })

  test('reduced motion fallback (375x812): flat scene card unobstructed by basket dock', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/store')

    const store = page.getByRole('main', { name: 'K2 virtual store' })
    await expect(store).toBeVisible({ timeout: 60000 })

    await store.getByRole('navigation', { name: 'Shelves', exact: true }).getByRole('button', { name: 'Coffee & Drinks' }).click()
    await store.locator('.k2-store-rail button').filter({ hasText: product.name }).click()
    await store.getByRole('button', { name: 'Add to basket', exact: true }).click()

    const flatCard = store.locator('.k2-store-flat-scene-card')
    const filledBasket = store.locator('.k2-store-basket-dock[data-filled="true"]')

    await expect(flatCard).toBeVisible()
    await expect(filledBasket).toBeVisible()

    const flatCardBox = await flatCard.boundingBox()
    const filledBasketBox = await filledBasket.boundingBox()

    expect(doBoxesIntersect(flatCardBox, filledBasketBox)).toBe(false)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    await page.screenshot({ path: 'docs/evidence/20260915-store-overlay-collisions/flat-scene-basket.png', fullPage: false })
  })
})
