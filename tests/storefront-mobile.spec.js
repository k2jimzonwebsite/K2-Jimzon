import { test, expect } from '@playwright/test'

test.describe('mobile storefront contract', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('catalog stays readable and keeps stock in one universal slot', async ({ page }) => {
    const privateInboxRequests = []
    page.on('request', request => {
      if (/\/rest\/v1\/(conversations|messages)(\?|$)/.test(request.url())) privateInboxRequests.push(request.url())
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Inventory & Catalog' }).click()

    const cards = page.getByTestId('product-card')
    await expect(cards.first()).toBeVisible({ timeout: 30000 })
    await expect.poll(async () => (await cards.first().boundingBox())?.width || 0).toBeGreaterThan(340)

    const firstTitle = cards.first().locator('.store-card-title')
    await expect(firstTitle).toBeVisible()
    const titleType = await firstTitle.evaluate(element => {
      const style = getComputedStyle(element)
      return { family: style.fontFamily, size: Number.parseFloat(style.fontSize) }
    })
    expect(titleType.family).toContain('Source Sans 3')
    expect(titleType.size).toBeGreaterThanOrEqual(16)

    const firstStock = cards.first().getByTestId('stock-count')
    await expect(firstStock).toBeVisible()
    await expect(firstStock).toHaveAttribute('aria-label', /available|Sold out/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    expect(privateInboxRequests).toEqual([])

    await page.setViewportSize({ width: 430, height: 844 })
    const stockSlots = cards.locator('.product-card-stock')
    await expect.poll(async () => {
      const firstSlot = await stockSlots.nth(0).boundingBox()
      const secondSlot = await stockSlots.nth(1).boundingBox()
      return firstSlot && secondSlot ? Math.abs(firstSlot.y - secondSlot.y) : Number.POSITIVE_INFINITY
    }).toBeLessThanOrEqual(2)

    if (process.env.K2_CAPTURE_MOBILE === '1') {
      await page.screenshot({ path: 'test-results/storefront-mobile-catalog.png', fullPage: true })
    }
  })

  test('animated route and interactive review globe remain present', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Shop the Drop/i })).toBeVisible({ timeout: 45000 })

    const routeMap = page.locator('svg[aria-label^="Animated sourcing route"]')
    await expect(routeMap).toBeVisible()
    await expect(routeMap.getByTestId('animated-flight-plane')).toHaveCount(1)
    if (process.env.K2_CAPTURE_MOBILE === '1') {
      await routeMap.screenshot({ path: 'test-results/storefront-mobile-route.png' })
    }

    const globeHeading = page.getByRole('heading', { name: 'Reviews, mapped to the products.' })
    await globeHeading.scrollIntoViewIfNeeded()
    await expect(globeHeading).toBeVisible({ timeout: 90000 })
    const globe = page.getByRole('application', { name: /Interactive product review globe/i })
    await expect(globe).toBeVisible({ timeout: 30000 })
    await expect(globe.locator('canvas')).toBeVisible()
    await expect(globe).toHaveClass(/touch-pan-y/)

    if (process.env.K2_CAPTURE_MOBILE === '1') {
      await page.screenshot({ path: 'test-results/storefront-mobile-globe.png', fullPage: false })
    }
  })
})
