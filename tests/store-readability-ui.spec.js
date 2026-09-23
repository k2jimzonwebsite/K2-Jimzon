import { expect, test } from '@playwright/test'

const product = { sku: 'READABLE-COFFEE', name: 'Milano espresso beans 250g', status: 'Live',
  subcategory: 'Coffee & Drinks', srp: 845, wholesale_price: 720,
  primary_image_url: '/images/placeholder.svg', secondary_images: [], lifestyle_images: [],
  description: 'Fabricated catalog record for readability verification.', country_of_origin: 'Italy' }
const evidence = 'docs/evidence/20260921-store-readability'

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort())
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop()
    return route.fulfill({ json: table === 'products' ? [product]
      : table === 'v_product_stock_from_batches' ? [{ sku: product.sku, stock_from_batches: 8 }] : [] })
  })
})

async function contrast(locator, background) {
  return locator.evaluate((el, backgroundSelector) => {
    const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
    const lum = value => rgb(value).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
    const fg = lum(getComputedStyle(el).color)
    const bg = lum(getComputedStyle(backgroundSelector ? document.querySelector(backgroundSelector) : el).backgroundColor)
    return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
  }, background)
}

for (const width of [390, 1440]) for (const dark of [false, true]) {
  test(`readable shelf and chat at ${width}px in ${dark ? 'dark' : 'light'} mode`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: dark ? 'dark' : 'light' })
    await page.goto('/store')
    const store = page.getByRole('main', { name: 'K2 virtual store' })
    const tabs = store.getByRole('navigation', { name: 'Shelves', exact: true })
    await tabs.getByRole('button', { name: 'Coffee & Drinks' }).click()
    await expect(store.locator('.k2-store-side-product strong')).toHaveCSS('font-size', '17px')
    expect(await contrast(store.locator('.k2-store-side-product strong'), '.k2-store-side')).toBeGreaterThanOrEqual(4.5)
    expect(await contrast(store.locator('.k2-store-side-product small'), '.k2-store-side')).toBeGreaterThanOrEqual(4.5)
    if (width < 900) await expect(store.locator('.k2-store-steps')).toBeHidden()
    await page.screenshot({ path: `${evidence}/shelf-${width}-${dark ? 'dark' : 'light'}.png` })
    await store.getByRole('button', { name: 'Open K2 shopkeeper' }).click()
    await store.locator('#keeper-question').fill('Is this ground coffee?')
    await store.getByRole('button', { name: 'Ask', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Chat with K2', exact: true })
    await expect(dialog).toBeVisible()
    for (const locator of [dialog.getByRole('heading', { name: 'Chat with K2' }), dialog.getByRole('button', { name: 'Close', exact: true }), dialog.locator('label[for="store-chat-name"]')]) {
      expect(await contrast(locator, '.k2-store-sheet')).toBeGreaterThanOrEqual(4.5)
    }
    const input = dialog.locator('#store-chat-name')
    expect(await contrast(input)).toBeGreaterThanOrEqual(4.5)
    await expect(input).toHaveCSS('font-size', '16px')
    await page.screenshot({ path: `${evidence}/chat-${width}-${dark ? 'dark' : 'light'}.png` })
    await dialog.locator('#store-chat-message').fill('A retained question')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await store.getByRole('button', { name: 'Ordering questions' }).click()
    const faq = page.getByRole('dialog', { name: 'Questions and answers' })
    expect(await contrast(faq.locator('summary').first(), '.k2-store-sheet')).toBeGreaterThanOrEqual(4.5)
    await faq.locator('summary').first().click()
    await expect(faq.locator('details').first()).toHaveAttribute('open', '')
    await page.keyboard.press('Escape')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('short mobile drag changes shelf; zoom controls and hint leave room to browse', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/store')
  const canvas = page.locator('.k2-store-scene canvas')
  await expect(canvas).toBeVisible({ timeout: 60000 })
  await expect(page.locator('.k2-store-touch-hint')).toBeVisible()
  await expect(page.locator('.k2-store-steps')).toBeHidden()
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.65)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.65 - 90, box.y + box.height * 0.65, { steps: 8 })
  await page.mouse.up()
  await expect(page.getByRole('navigation', { name: 'Shelves', exact: true }).getByRole('button', { name: 'Coffee & Drinks' })).toHaveAttribute('aria-current', 'true')
  const cameraDistance = () => page.evaluate(async () => {
    const moduleUrl = performance.getEntriesByType('resource').map(entry => entry.name)
      .find(url => url.includes('/@react-three_fiber.js'))
    const { _roots } = await import(moduleUrl)
    return _roots.get(document.querySelector('.k2-store-scene canvas')).store.getState().camera.position.z
  })
  let lastDistance = await cameraDistance()
  await expect.poll(async () => {
    const current = await cameraDistance()
    const difference = Math.abs(current - lastDistance)
    lastDistance = current
    return difference
  }).toBeLessThan(0.02)
  const originalDistance = await cameraDistance()
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect.poll(cameraDistance).toBeLessThan(originalDistance * 0.85)
  const zoomedDistance = await cameraDistance()
  const session = await page.context().newCDPSession(page)
  const y = box.y + box.height * 0.65
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y, id: 1 }, { x: 250, y, id: 2 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 140, y, id: 1 }, { x: 260, y, id: 2 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(cameraDistance).toBeLessThan(zoomedDistance * 0.92)
  await page.getByRole('button', { name: 'Reset store view', exact: true }).click()
  await expect.poll(cameraDistance).toBeGreaterThan(originalDistance * 0.98)
  for (const name of ['Zoom in', 'Zoom out', 'Reset store view']) {
    const button = page.getByRole('button', { name, exact: true })
    await expect(button).toBeInViewport()
    expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44)
    await button.click()
    expect(await contrast(button)).toBeGreaterThanOrEqual(4.5)
  }
  await page.screenshot({ path: `${evidence}/mobile-3d.png` })
})

test('enlarged phone text keeps store help reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await page.goto('/store')
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  const tabs = page.getByRole('navigation', { name: 'Shelves', exact: true })
  await tabs.getByRole('button', { name: 'Coffee & Drinks' }).click()
  await page.getByRole('button', { name: 'Ordering questions' }).click()
  const dialog = page.getByRole('dialog', { name: 'Questions and answers' })
  await expect(dialog).toBeVisible()
  await dialog.locator('#store-faq-search').fill('delivery')
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `${evidence}/phone-200-percent.png` })
})

test('catalog footer remains readable in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/catalog')
  const footer = page.locator('footer')
  for (const dark of [false, true]) {
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark)
    await footer.scrollIntoViewIfNeeded()
    await expect(footer.locator('.footer-link').first()).toHaveCSS('font-size', '16px')
    expect(await contrast(footer.locator('.footer-link').first(), 'footer')).toBeGreaterThanOrEqual(4.5)
    expect(await contrast(footer.locator('h3').first(), 'footer')).toBeGreaterThanOrEqual(4.5)
    await page.screenshot({ path: `${evidence}/footer-${dark ? 'dark' : 'light'}.png` })
  }
})
