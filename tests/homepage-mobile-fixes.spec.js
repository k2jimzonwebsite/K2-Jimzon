import { expect, test } from '@playwright/test'

const names = ['Siciliani Pistacchio Crunchy 200 g', 'G. Bellini X-Bolt Eau de Parfum 75 ml', 'Italian pantry selection with a longer variant name 500 g']
const products = names.map((name, i) => ({ sku: `mobile-home-${i}`, name, srp: 499 + i * 150, status: 'Live', subcategory: i ? 'Fragrances' : 'Sweet spreads', primary_image_url: '/images/placeholder.svg', secondary_images: [], lifestyle_images: [], created_at: `2026-10-${24-i}T00:00:00Z` }))

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('https://**/*', route => route.abort())
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop()
    return route.fulfill({ json: table === 'products' ? products : table === 'v_storefront_visible_skus' ? products.map(p => ({ sku: p.sku })) : table === 'v_product_stock_from_batches' ? products.map(p => ({ sku: p.sku, stock_from_batches: 5 })) : [] })
  })
})

for (const width of [320, 375, 430, 768, 1440]) for (const theme of ['light', 'dark']) {
  test(`${width} ${theme}: homepage shopping stays readable and reachable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await page.goto('/')
    const hero = page.locator('section').filter({ has: page.locator('h1') }).first()
    await expect(hero.locator('.hero-collection-item')).toHaveCount(3, { timeout: 60000 })
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), theme === 'dark')
    const cta = hero.getByRole('link', { name: 'Shop the Collection', exact: true })
    if (width <= 430) {
      const nav = await page.getByRole('navigation', { name: 'Mobile storefront' }).boundingBox()
      const action = await cta.boundingBox()
      expect.soft(action.y + action.height, 'primary action above fixed navigation on arrival').toBeLessThan(nav.y - 8)
      const chat = await page.getByRole('button', { name: 'Chat with K2 staff', exact: true }).boundingBox()
      expect.soft(chat.width, 'compact mobile chat footprint').toBeLessThanOrEqual(52)
      const copy = await hero.locator('h1 + p').boundingBox()
      expect.soft(copy.y + copy.height, 'hero copy clears fixed chat').toBeLessThan(chat.y)
      const images = hero.locator('.hero-collection-image')
      for (const img of [images.nth(0), images.nth(1)]) {
        const area = await img.evaluate(e => e.clientWidth - parseFloat(getComputedStyle(e).paddingLeft) - parseFloat(getComputedStyle(e).paddingRight))
        expect.soft(area, 'hero image usable width').toBeGreaterThanOrEqual(100)
      }
      const routeTitle = hero.locator('p').filter({ hasText: /^Milano to Manila$/ })
      const title = await routeTitle.evaluate(e => ({ height: e.getBoundingClientRect().height, line: parseFloat(getComputedStyle(e).lineHeight) }))
      expect.soft(title.height).toBeLessThanOrEqual(title.line + 1)
    }
    await expect.soft(page.getByText('Monthly Cargo Flights', { exact: true })).toHaveCount(0)
    await expect.soft(page.getByText('Direct Sourcing', { exact: true })).toHaveCount(0)
    expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/design-checkpoints/20261024-homepage-mobile/${width}-${theme}-top.png` })
    const thumb = page.getByRole('region', { name: 'New arrivals' }).locator('img').filter({ hasNot: page.locator('.hero-collection-image') }).last()
    const area = await thumb.evaluate(e => ({ width: e.clientWidth - parseFloat(getComputedStyle(e).paddingLeft) - parseFloat(getComputedStyle(e).paddingRight), height: e.clientHeight - parseFloat(getComputedStyle(e).paddingTop) - parseFloat(getComputedStyle(e).paddingBottom) }))
    expect.soft(Math.min(area.width, area.height), 'arrival thumbnail usable area').toBeGreaterThanOrEqual(40)
    const stops = hero.getByRole('group', { name: 'Sourcing route stops' })
    await expect(stops.getByRole('button')).toHaveCount(3)
    for (const button of await stops.getByRole('button').all()) {
      const box = await button.boundingBox()
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
    const milano = stops.getByRole('button', { name: 'Milano Sourcing', exact: true })
    await milano.focus()
    await page.keyboard.press('Enter')
    await expect(milano).toHaveAttribute('aria-pressed', 'true')
    await expect(hero.getByText('Bought directly from Italian markets, local shops, and verified wholesale partners in Italy.')).toBeVisible()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(stops.getByRole('button', { name: 'In Flight & Transit', exact: true })).toHaveAttribute('aria-pressed', 'true')
    const last = hero.locator('.hero-collection-item').last()
    await last.focus()
    await expect(last).toBeInViewport()
    await expect(last).toContainText(names[2])
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/product\/mobile-home-2$/)
  })
}

test('mobile homepage preserves layout with 200% text and ordinary motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.locator('.hero-collection-item')).toHaveCount(3, { timeout: 60000 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  // Optional consent stays reachable at enlarged text and can be closed
  // without a measurement decision before continuing the shopping task.
  await page.getByRole('button', { name: 'Close analytics choices', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Optional analytics' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.getByRole('link', { name: 'Shop the Collection', exact: true })).toBeVisible()
  const stops = page.getByRole('group', { name: 'Sourcing route stops' })
  expect(await stops.evaluate(group => [...group.querySelectorAll('button')].every(button => button.scrollWidth <= button.clientWidth))).toBe(true)
  const routeTitle = page.locator('p').filter({ hasText: /^Milano to Manila$/ })
  expect(await routeTitle.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true)
  await page.getByRole('main').getByRole('link', { name: 'Request from Italy', exact: true }).click()
  await expect(page).toHaveURL(/\/pasabuy$/)
})

for (const width of [320, 375, 430]) for (const theme of ['light', 'dark']) {
  test(`${width} ${theme}: featured browsing controls reveal every product and preserve full photos`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await page.goto('/')
    const hero = page.locator('section').filter({ has: page.locator('h1') }).first()
    await expect(hero.locator('.hero-collection-item')).toHaveCount(3, { timeout: 60000 })
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), theme === 'dark')
    const thumb = page.getByRole('region', { name: 'New arrivals' }).locator('img').last()
    const area = await thumb.evaluate(e => Math.min(e.clientWidth - parseFloat(getComputedStyle(e).paddingLeft) - parseFloat(getComputedStyle(e).paddingRight), e.clientHeight - parseFloat(getComputedStyle(e).paddingTop) - parseFloat(getComputedStyle(e).paddingBottom)))
    expect.soft(area, 'readable full-photo thumbnail content').toBeGreaterThanOrEqual(64)
    const previous = hero.getByRole('button', { name: 'Previous featured products', exact: true })
    const next = hero.getByRole('button', { name: 'Next featured products', exact: true })
    await expect(previous).toBeDisabled()
    await expect(next).toBeEnabled()
    for (const button of [previous,next]) {
      const box = await button.boundingBox()
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
    await next.focus()
    await page.keyboard.press('Enter')
    await expect(next).toBeDisabled()
    await expect(previous).toBeEnabled()
    const rail = hero.locator('.hero-collection-shelf')
    const positions = await rail.evaluate(e => ({ left:e.scrollLeft,last:e.lastElementChild.getBoundingClientRect().right,right:e.getBoundingClientRect().right }))
    expect(positions.left).toBeGreaterThan(0)
    expect(positions.last).toBeLessThanOrEqual(positions.right+1)
    await expect(page).toHaveURL(/\/$/)
    await previous.click()
    await expect(previous).toBeDisabled()
    await expect(next).toBeEnabled()
    await expect.poll(() => rail.evaluate(e => e.scrollLeft)).toBeLessThanOrEqual(1)
    const fits = await hero.locator('.hero-collection-image').evaluateAll(images => images.map(e => ({ fit:getComputedStyle(e).objectFit,padding:getComputedStyle(e).padding,width:e.clientWidth,height:e.clientHeight })))
    for(const image of fits){ expect(image.fit).toBe('contain');expect(image.padding).toBe('0px');expect(image.height).toBeGreaterThanOrEqual(160) }
    await hero.locator('.hero-collection').screenshot({ path:`docs/design-checkpoints/20261024-homepage-mobile/rail-${width}-${theme}.png` })
  })
}
