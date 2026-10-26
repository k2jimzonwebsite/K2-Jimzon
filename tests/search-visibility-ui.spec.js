import { expect, test } from '@playwright/test'

const product = {
  sku: 'K2-SEO-001', name: 'Reviewed Italian coffee', status: 'Live', published: true,
  srp: 320, primary_image_url: '/images/placeholder.svg',
  description: 'Italian ground coffee in its reviewed retail package.',
}

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort())
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop()
    return route.fulfill({ json: table === 'products' ? [product]
      : table === 'v_storefront_visible_skus' ? [{ sku: product.sku }]
        : table === 'v_product_stock_from_batches' ? [{ sku: product.sku, stock_from_batches: 2 }] : [] })
  })
})

test('a failed Footer module cannot replace the Pasabuy page', async ({ page }) => {
  await page.route('**/src/components/Footer.jsx*', route => route.abort('failed'))
  await page.goto('/pasabuy')
  await expect(page.getByRole('heading', { level: 1, name: /Pasabuy/ })).toBeVisible({ timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'This section stopped loading' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: /Pasabuy/ })).toBeVisible()
})

test('a failed optional Analytics module cannot replace the shopping page', async ({ page }) => {
  await page.route('**/src/components/StorefrontAnalytics.jsx*', route => route.abort('failed'))
  await page.goto('/catalog')
  await expect(page.getByRole('heading', { level: 1, name: 'Explore the Italian cabinet.' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('link', { name: product.name, exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'This section stopped loading' })).toHaveCount(0)
})

test('product names provide real links and preserve client navigation', async ({ page }) => {
  await page.goto('/catalog')
  const link = page.getByRole('link', { name: product.name, exact: true })
  await expect(link).toHaveAttribute('href', `/product/${product.sku}`, { timeout: 15000 })
  await page.evaluate(() => { window.__sameDocumentSeoTest = true })
  await link.click()
  await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible()
  expect(await page.evaluate(() => window.__sameDocumentSeoTest)).toBe(true)
})

test('analytics requires consent, strips URLs, avoids duplicate/private views and can be withdrawn', async ({ page }) => {
  let tagLoads = 0
  await page.route('https://www.googletagmanager.com/gtag/js?*', route => {
    tagLoads++
    return route.fulfill({ contentType: 'application/javascript', body: '/* vendor isolated; inspect actual queued commands */' })
  })
  await page.goto('/catalog?token=private-token&email=visitor@example.test')
  await expect(page.getByRole('region', { name: 'Optional analytics' })).toBeVisible({ timeout: 15000 })
  expect(tagLoads).toBe(0)
  await page.getByRole('button', { name: 'Decline', exact: true }).click()
  expect(tagLoads).toBe(0)
  await page.getByRole('button', { name: 'Analytics choices', exact: true }).click()
  await page.getByRole('button', { name: 'Accept analytics', exact: true }).click()
  await expect.poll(() => tagLoads).toBe(1)
  const events = () => page.evaluate(() => (window.dataLayer || []).map(args => Array.from(args)).filter(args => args[0] === 'event'))
  await expect.poll(async () => (await events()).length).toBe(1)
  expect(JSON.stringify(await events())).not.toMatch(/private-token|visitor@|email=|token=/)
  expect((await events())[0][2].page_location).toBe('https://www.k2jimzon.com/catalog')
  await page.getByRole('button', { name: 'Analytics choices', exact: true }).click()
  await page.getByRole('button', { name: 'Accept analytics', exact: true }).click()
  expect((await events()).length).toBe(1)
  await page.getByRole('button', { name: 'Review your basket', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout/)
  expect((await events()).length).toBe(1)
  expect(await page.evaluate(() => window['ga-disable-G-4JQ3D0GDB9'])).toBe(true)
  await page.getByRole('button', { name: 'Analytics choices', exact: true }).click()
  await page.getByRole('button', { name: 'Decline', exact: true }).click()
  await page.goto('/catalog')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(tagLoads).toBe(1)
})

test('browser privacy signals refuse analytics even if a previous visit allowed it', async ({ page }) => {
  let tagLoads = 0
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true })
    localStorage.setItem('k2-analytics-consent-v1', JSON.stringify({ choice: 'granted', expires: Date.now() + 60000 }))
  })
  await page.route('https://www.googletagmanager.com/gtag/js?*', route => { tagLoads++; return route.abort() })
  await page.goto('/catalog')
  await page.getByRole('button', { name: 'Analytics choices', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Accept analytics', exact: true })).toBeDisabled()
  expect(tagLoads).toBe(0)
})

test('keyboard reopening focuses the consent choices and Escape restores the opener', async ({ page }) => {
  await page.goto('/catalog')
  await page.getByRole('button', { name: 'Decline', exact: true }).click()
  const opener = page.getByRole('button', { name: 'Analytics choices', exact: true })
  await opener.focus()
  await opener.press('Enter')
  await expect(page.getByRole('button', { name: 'Accept analytics', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(opener).toBeFocused()
})

test('consent expiry disables measurement in a tab that remains open', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('k2-analytics-consent-v1', JSON.stringify({ choice: 'granted', expires: Date.now() + 2500 }))
  })
  await page.route('https://www.googletagmanager.com/gtag/js?*', route => route.fulfill({ contentType: 'application/javascript', body: '/* isolated vendor */' }))
  await page.goto('/catalog')
  await expect.poll(() => page.evaluate(() => Boolean(window.gtag))).toBe(true)
  await expect(page.getByRole('region', { name: 'Optional analytics' })).toBeVisible({ timeout: 7000 })
  expect(await page.evaluate(() => window['ga-disable-G-4JQ3D0GDB9'])).toBe(true)
})

test('enlarged text keeps consent reachable and closing does not grant analytics', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/catalog')
  const panel = page.getByRole('region', { name: 'Optional analytics' })
  await expect(panel).toBeVisible()
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  const box = await panel.boundingBox()
  expect(box.y).toBeGreaterThanOrEqual(0)
  const close = page.getByRole('button', { name: 'Close analytics choices', exact: true })
  await expect(close).toBeInViewport()
  expect((await close.boundingBox()).height).toBeGreaterThanOrEqual(44)
  await page.screenshot({ path: '.impeccable/review/mobile-200.png', fullPage: true })
  await close.click()
  await expect(panel).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('k2-analytics-consent-v1'))).toBeNull()
  expect(await page.locator('script[src*="googletagmanager.com"]').count()).toBe(0)
  await page.getByRole('button', { name: 'Chat with K2 staff', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Storefront live chat' })).toBeVisible()
})

for (const [name, width, theme] of [['mobile-320', 320, 'light'], ['mobile', 375, 'light'], ['mobile-dark', 375, 'dark'], ['desktop', 1440, 'light'], ['desktop-dark', 1440, 'dark'], ['user-777', 777, 'light']]) {
  test(`consent controls remain readable and clear navigation: ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await page.goto('/catalog')
    const panel = page.getByRole('region', { name: 'Optional analytics' })
    await expect(panel).toBeVisible()
    await expect(page.getByRole('link', { name: product.name, exact: true })).toBeVisible()
    const box = await panel.boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(box.y).toBeGreaterThanOrEqual(0)
    const nav = page.getByRole('navigation', { name: 'Mobile storefront', exact: true })
    if (await nav.isVisible()) expect(box.y + box.height).toBeLessThan((await nav.boundingBox()).y)
    for (const action of ['Accept analytics', 'Decline']) expect((await panel.getByRole('button', { name: action, exact: true }).boundingBox()).height).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: `.impeccable/review/${name}.png`, fullPage: true })
  })
}
