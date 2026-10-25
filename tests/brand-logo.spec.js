import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort())
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }))
})

for (const width of [320, 375, 430, 768, 1024, 1440]) for (const dark of [false, true]) {
  test('logo preserves shopping layout at ' + width + ', ' + (dark ? 'dark' : 'light'), async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width, height: 812 })
    await page.goto('/')
    await page.evaluate(d => document.documentElement.classList.toggle('dark', d), dark)
    const home = page.getByRole('button', { name: 'K2 Jimzon home', exact: true })
    await expect(home.locator('[data-brand-mark="compact"]')).toBeVisible()
    const mark = await home.locator('svg').boundingBox()
    expect(mark.width).toBeGreaterThanOrEqual(36)
    expect(mark.width).toBeLessThanOrEqual(40)
    expect((await home.boundingBox()).height).toBeGreaterThanOrEqual(44)
    const row = await home.boundingBox()
    const cart = await page.getByRole('button', { name: /Open cart,/ }).boundingBox()
    expect(cart.y).toBeLessThan(row.y + row.height)
    expect(row.x + row.width).toBeLessThanOrEqual(cart.x)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await home.locator('[data-brand-plane]').evaluate(e => e.getAnimations().length)).toBe(0)
    await expect(page.locator('footer [data-brand-mark="globe"]')).toBeAttached()
    await home.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('h1').first()).toBeVisible()
    await home.blur()
    await page.mouse.click(0, 0)
    await expect(page).toHaveURL(/\/$/)
    await page.screenshot({ path: 'docs/acceptance/logo-motion-20261025/' + width + '-' + (dark ? 'dark' : 'light') + '.png' })
  })
}

test('aircraft settles and navigation does not replay the arrival', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const mark = page.locator('header [data-brand-mark="compact"]')
  await expect(mark).toHaveAttribute('data-arrival', 'played')
  await expect.poll(() => mark.locator('[data-brand-plane]').evaluate(e => e.getAnimations().filter(a => a.playState === 'running').length)).toBe(0)
  await page.getByRole('navigation', { name: 'Storefront', exact: true }).getByRole('button', { name: 'Inventory & Catalog', exact: true }).click()
  await page.getByRole('button', { name: 'K2 Jimzon home', exact: true }).click()
  expect(await mark.locator('[data-brand-plane]').evaluate(e => e.getAnimations().filter(a => a.playState === 'running').length)).toBe(0)
  await page.mouse.move(0, 0)
  await mark.hover()
  expect(await mark.locator('[data-brand-plane]').evaluate(e => e.getAnimations().some(a => a.effect.getTiming().duration === 180))).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mark.hover()
  expect(await mark.locator('[data-brand-plane]').evaluate(e => e.getAnimations().filter(a => a.playState === 'running').length)).toBe(0)
})

test('failed artwork keeps a readable usable home control', async ({ page }) => {
  await page.route('**/brand/k2-owner-sheet.webp', route => route.abort())
  await page.goto('/')
  const home = page.getByRole('button', { name: 'K2 Jimzon home', exact: true })
  await expect(home.getByText('K2 Jimzon', { exact: true })).toBeVisible()
  await home.click()
  await expect(page).toHaveURL(/\/$/)
})

test('owner artwork delivery stays below 200 kB', async ({ request }) => {
  const response = await request.get('/brand/k2-owner-sheet.webp')
  expect(response.ok()).toBe(true)
  expect((await response.body()).byteLength).toBeLessThan(200000)
})

test('browser and install icons decode at their declared sizes', async ({ page }) => {
  await page.goto('/')
  const dimensions = await page.evaluate(async () => {
    return Promise.all(['/icon.svg','/icon-maskable.svg','/icon-192.png','/icon-512.png','/apple-touch-icon.png'].map(async src => {
      const image = new Image()
      image.src = src
      await image.decode()
      return [image.naturalWidth, image.naturalHeight]
    }))
  })
  expect(dimensions).toEqual([[192,192],[512,512],[192,192],[512,512],[180,180]])
})
