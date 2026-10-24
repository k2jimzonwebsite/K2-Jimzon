import { expect, test } from '@playwright/test'

const name = 'Siciliani Pistacchio Crunchy Italian Cream with Chopped Pistachios 200 g'
const products = [0, 1, 2].map(i => ({ sku: `mobile-audit-${i}`, name: i ? `G. Bellini Italian Eau de Parfum ${75 + i} ml` : name, status: 'Live', srp: 499 + i * 100, primary_image_url: '/images/placeholder.svg', secondary_images: [], lifestyle_images: [], subcategory: i ? 'Fragrances' : 'Sweet spreads' }))
const paths = ['/', '/catalog', '/product/mobile-audit-0', '/pasabuy', '/trade', '/contact', '/messages', '/account', '/checkout', '/confirmation', '/privacy', '/terms', '/returns', '/policies', '/missing-mobile-audit', '/store']

async function surfaceColors(locator) {
  return locator.evaluate(e => {
    const ctx = document.createElement('canvas').getContext('2d', { colorSpace: 'srgb' })
    const rgb = color => {
      ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1)
      return `rgb(${[...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).join(',')})`
    }
    return { fg: rgb(getComputedStyle(e).color), bg: rgb(getComputedStyle(e).backgroundColor) }
  })
}

function contrast(a, b) {
  const light = value => value.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((s, n, i) => s + n * [.2126, .7152, .0722][i], 0)
  return (Math.max(light(a), light(b)) + .05) / (Math.min(light(a), light(b)) + .05)
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => localStorage.setItem('k2_cart_v1', JSON.stringify([{ id: 'mobile-audit-0', qty: 1 }])))
  await page.route('https://**/*', r => r.abort())
  await page.route('**/rest/v1/**', r => {
    const table = new URL(r.request().url()).pathname.split('/').pop()
    return r.fulfill({ json: table === 'products' ? products : table === 'v_storefront_visible_skus' ? products.map(p => ({ sku: p.sku })) : table === 'v_product_stock_from_batches' ? products.map(p => ({ sku: p.sku, stock_from_batches: 5 })) : [] })
  })
  await page.route('**/api/**', r => r.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE' } } }))
})

for (const width of [320, 375, 430, 768, 1440]) for (const theme of ['light', 'dark']) {
  test(`${width} ${theme}: every storefront route reflows without runtime errors`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme)
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    for (const path of paths) {
      await page.goto(path)
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('h1').first()).toBeAttached()
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), path).toBeLessThanOrEqual(1)
      const smallFields = await page.locator('input:not([type="checkbox"]):not([type="radio"]),select,textarea').evaluateAll(fields => fields.filter(e => e.getBoundingClientRect().height > 0 && parseFloat(getComputedStyle(e).fontSize) < 16).length)
      expect(smallFields, path).toBe(0)
    }
    expect(errors).toEqual([])
  })
}

for (const theme of ['light', 'dark']) {
  test(`${theme}: checkout retains complete names and contains coupon controls`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 })
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme)
    await page.goto('/checkout')
    const title = page.getByText(name, { exact: true })
    await expect(title).toBeVisible()
    expect(await title.evaluate(e => getComputedStyle(e).textOverflow)).not.toBe('ellipsis')
    const coupon = page.getByRole('button', { name: 'Apply', exact: true })
    const bounds = await coupon.boundingBox()
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(304)
    await page.evaluate(() => document.documentElement.style.fontSize = '200%')
    expect(await coupon.evaluate(e => e.getBoundingClientRect().right)).toBeLessThanOrEqual(320)
  })

  test(`${theme}: FAQ controls remain readable, sized and recover from no results`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 })
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme)
    await page.goto('/')
    const search = page.getByRole('searchbox', { name: 'Search questions' })
    await search.scrollIntoViewIfNeeded()
    const active = page.getByRole('group', { name: 'FAQ categories' }).getByRole('button', { name: 'All', exact: true })
    const colors = await surfaceColors(active)
    expect(contrast(colors.fg, colors.bg)).toBeGreaterThanOrEqual(4.5)
    const questions = page.locator('.faq-trigger')
    expect(await questions.evaluateAll(es => es.every(e => e.scrollWidth <= e.clientWidth + 1))).toBe(true)
    await search.fill('no-matching-question-xyz')
    const clear = page.getByRole('button', { name: 'Clear search filters' })
    expect((await clear.boundingBox()).height).toBeGreaterThanOrEqual(44)
    await clear.focus(); await page.keyboard.press('Enter')
    await expect(search).toHaveValue('')
    await expect(questions.first()).toBeVisible()
  })

  test(`${theme}: policy navigation exposes current page and works with keyboard`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 })
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme)
    await page.goto('/privacy')
    const nav = page.getByRole('navigation', { name: 'Policy sections' })
    await expect(nav.getByRole('button', { name: 'Privacy', exact: true })).toHaveAttribute('aria-current', 'page')
    const next = nav.getByRole('button', { name: 'Terms of Service', exact: true })
    await next.focus(); await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/terms$/)
    await expect(next).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('tab')).toHaveCount(0)
  })

  test(`${theme}: unavailable receiving-account warning has readable contrast`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme)
    await page.route('**/api/storefront/order/status', r => r.fulfill({ json: { ok: true, orders: [{ public_reference: 'AUDIT-ONLY', total_amount: 499, item_count: 1, shipping_quote_status: 'customer_confirmed', delivery_review_required: false, status: 'submitted', payment_status: 'awaiting_instructions' }] } }))
    await page.route('**/api/storefront/order/conversation', r => r.fulfill({ json: { ok: true, receipt: { public_reference: 'AUDIT-ONLY', total_amount: 499, shipping_quote_status: 'customer_confirmed', delivery_review_required: false, order_status: 'submitted', payment_status: 'awaiting_instructions', messages: [] } } }))
    await page.goto('/confirmation')
    const warning = page.getByRole('status').filter({ hasText: 'Payment method unavailable.' })
    await expect(warning).toBeVisible()
    await expect.poll(() => page.locator('html').evaluate(e => e.classList.contains('dark'))).toBe(theme === 'dark')
    const colors = await surfaceColors(warning)
    expect(contrast(colors.fg, colors.bg)).toBeGreaterThanOrEqual(4.5)
  })
}

for (const kind of ['cart', 'chat']) {
  test(`${kind}: modal keyboard focus stays in panel and returns to opener`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 })
    await page.goto('/catalog')
    const opener = page.getByRole('button', { name: kind === 'cart' ? /Open cart/ : 'Chat with K2 staff', exact: kind !== 'cart' })
    await opener.click()
    const dialog = page.getByRole('dialog', { name: kind === 'cart' ? 'Shopping cart' : 'Storefront live chat' })
    await expect(dialog).toBeVisible()
    const panel = dialog.locator('aside')
    const visibleButtons = panel.locator('button:visible:not([disabled]),input:visible:not([disabled]),textarea:visible:not([disabled]),a[href]:visible')
    await visibleButtons.last().focus()
    await page.keyboard.press('Tab')
    expect(await panel.evaluate(e => e.contains(document.activeElement))).toBe(true)
    await visibleButtons.first().focus(); await page.keyboard.press('Shift+Tab')
    expect(await panel.evaluate(e => e.contains(document.activeElement))).toBe(true)
    await page.evaluate(() => document.querySelector('.storefront-ui').style.setProperty('--k2-safe-top', '44px'))
    await expect.poll(() => panel.locator('header').evaluate(e => parseFloat(getComputedStyle(e).paddingTop))).toBeGreaterThanOrEqual(60)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()
  })
}

test('home-indicator spacing keeps mobile chat clear of navigation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/catalog')
  await expect(page.getByRole('navigation', { name: 'Mobile storefront' })).toBeVisible()
  await page.evaluate(() => document.querySelector('.storefront-ui').style.setProperty('--k2-safe-bottom', '34px'))
  await expect.poll(async () => {
    const nav = await page.getByRole('navigation', { name: 'Mobile storefront' }).boundingBox()
    const chat = await page.getByRole('button', { name: 'Chat with K2 staff', exact: true }).boundingBox()
    return nav.y - chat.y - chat.height
  }).toBeGreaterThanOrEqual(8)
})

test('cart checkout action focuses the new route heading', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 })
  await page.goto('/product/mobile-audit-0')
  await page.getByRole('button', { name: /Open cart/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Shopping cart' })
  for (const name of ['Continue shopping in 3D Store', 'Browse catalog']) {
    expect((await dialog.getByRole('button', { name, exact: true }).boundingBox()).height).toBeGreaterThanOrEqual(44)
  }
  await dialog.getByRole('button', { name: 'Review order request', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Review order request' })).toBeFocused()
})

for (const width of [320, 1440]) test(`${width}: chat returns focus after browser Back changes its trigger`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Shop the Collection', exact: true }).click()
  await expect(page).toHaveURL(/\/catalog$/)
  await page.getByRole('button', { name: 'Chat with K2 staff', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Storefront live chat' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Storefront live chat' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Chat with K2 staff', exact: true })).toBeFocused()
})

test('enlarged mobile text preserves every header control without trapping the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 })
  await page.goto('/catalog')
  await expect(page.locator('header.store-nav-surface')).toBeVisible()
  await page.evaluate(() => document.documentElement.style.fontSize = '200%')
  const controls = page.locator('header.store-nav-surface button:visible')
  expect(await controls.evaluateAll(es => es.every(e => { const r=e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 }))).toBe(true)
  expect(await page.locator('header.store-nav-surface').evaluate(e => getComputedStyle(e).position)).not.toBe('sticky')
  const nav = page.getByRole('navigation', { name: 'Mobile storefront' })
  expect(await nav.locator('button').evaluateAll(es => es.every(e => {const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1}))).toBe(true)
  await expect.poll(async () => { const bounds=await nav.boundingBox(); const chat=await page.getByRole('button', { name: 'Chat with K2 staff', exact: true }).boundingBox(); return bounds.y-chat.y-chat.height }).toBeGreaterThanOrEqual(8)
})

for (const width of [768, 1023]) test(`${width}: tablet has navigation and chat clears it`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/contact')
  const nav = page.getByRole('navigation', { name: 'Mobile storefront' })
  await expect(nav).toBeVisible()
  const chat = await page.getByRole('button', { name: 'Chat with K2 staff', exact: true }).boundingBox()
  const bounds = await nav.boundingBox()
  expect(chat.y + chat.height).toBeLessThan(bounds.y - 8)
  await nav.getByRole('button', { name: 'Inventory & Catalog', exact: true }).click()
  await expect(page).toHaveURL(/\/catalog$/)
})
