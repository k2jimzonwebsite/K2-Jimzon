import { test, expect } from '@playwright/test'

async function unnamedInteractiveRoles(page) {
  const session = await page.context().newCDPSession(page)
  const { nodes } = await session.send('Accessibility.getFullAXTree')
  const interactive = new Set(['button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch'])
  return nodes
    .filter(node => !node.ignored && interactive.has(node.role?.value) && !String(node.name?.value || '').trim())
    .map(node => node.role.value)
}

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
    const imageButton = cards.first().getByTestId('product-image-btn')
    await expect(imageButton).toHaveAccessibleName(/^View .+/)
    const titleButton = firstTitle.locator('..')
    const footerAction = page.locator('footer .footer-link').first()
    await expect.poll(async () => (await titleButton.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44)
    await expect.poll(async () => (await footerAction.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44)
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
    await expect(page.getByRole('button', { name: /Shop the Collection/i })).toBeVisible({ timeout: 45000 })

    const routeMap = page.getByRole('img', { name: 'Sourcing route from Milano, Italy to Manila, Philippines' })
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

  test('landmarks, names, keyboard focus, and reflow survive 200% text', async ({ page }) => {
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort())
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/catalog', { waitUntil: 'commit', timeout: 30000 })
    await expect(page.getByRole('heading', { level: 1, name: 'Explore the Italian cabinet.' })).toBeVisible({ timeout: 30000 })

    expect(await page.locator('main').count()).toBe(1)
    expect(await page.getByRole('heading', { level: 1 }).count()).toBe(1)
    expect(await page.locator('img:not([alt])').count()).toBe(0)
    expect(await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(element => element.id).filter(Boolean)
      return ids.filter((id, index) => ids.indexOf(id) !== index)
    })).toEqual([])
    expect(await unnamedInteractiveRoles(page)).toEqual([])

    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => {
      const active = document.activeElement
      if (!active || active === document.body) return false
      const style = getComputedStyle(active)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })).toBe(true)

    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  })
})
