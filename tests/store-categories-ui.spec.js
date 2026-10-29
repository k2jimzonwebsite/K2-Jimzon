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
  await expect(page.locator('footer').getByRole('link', { name: 'Fragrances', exact: true })).toBeVisible()
  await expect(page.locator('footer').getByRole('link', { name: 'Skin care', exact: true })).toHaveCount(0)
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

async function admin(page, { failSku, surface = 'admin', readOnly = false } = {}) {
  const rows = structuredClone(products), writes = []
  await page.route('https://fixture.supabase.co/**', route => route.fulfill({ json: [] }))
  await page.route('**/api/admin/**', route => route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND' } } }))
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
  await page.goto(`/tests/fixtures/store-categories.html?surface=${surface}${readOnly ? '&readOnly=1' : ''}`)
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
  await expect(page.locator('footer').getByRole('link', { name: 'Italian favourites', exact: true })).toBeVisible()
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


const cabinetRows = ['Beverages', 'Biscuits and wafers', 'Chocolate', 'Coffee and drink preparations', 'Cooking oils', 'Fragrances', 'Pasta', 'Tinned fish'].map((name, index) => ({ ...products[0], sku: 'cabinet-' + index, name: 'Cabinet ' + name, subcategory: name }))

test('Cabinet shows two side-by-side cards and scrolls horizontally at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await store(page, cabinetRows)
  await page.goto('/catalog')
  const cabinet = page.getByRole('region', { name: 'The Italian Cabinet' })
  const rail = cabinet.getByRole('group', { name: 'Cabinet categories', exact: true })
  await expect(rail).toBeVisible()
  const layout = await rail.evaluate(node => {
    const cards = [...node.querySelectorAll('button')].map(card => card.getBoundingClientRect())
    return { width: node.clientWidth, scrollWidth: node.scrollWidth, cardWidth: cards[0].width, left: node.scrollLeft, cardLefts: cards.map(card => card.left), right: node.getBoundingClientRect().right, sameRow: cards[0].top === cards[1].top, thirdBeyond: cards[2].left >= node.getBoundingClientRect().right - 1, pageOverflow: document.documentElement.scrollWidth > innerWidth }
  })
  expect(layout.sameRow).toBe(true)
  expect(layout.cardWidth).toBeCloseTo((layout.width - 12) / 2, 0)
  expect(layout.scrollWidth).toBeGreaterThan(layout.width)
  expect(layout.thirdBeyond).toBe(true)
  expect(layout.pageOverflow).toBe(false)
  await cabinet.getByRole('button', { name: 'Next categories', exact: true }).click()
  await expect.poll(() => rail.evaluate(node => node.scrollLeft)).toBeGreaterThan(0)
})


test.describe('Cabinet interaction and responsive review', () => {
  test.use({ hasTouch: true })
  for (const width of [320, 375, 768, 1440]) for (const theme of ['light', 'dark']) {
    test('Cabinet readable two-card layout at ' + width + 'px ' + theme, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await store(page, cabinetRows)
      await page.goto('/catalog')
      await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme)
      const cabinet = page.getByRole('region', { name: 'The Italian Cabinet' })
      const rail = cabinet.getByRole('group', { name: 'Cabinet categories', exact: true })
      await expect(cabinet.getByRole('button', { name: 'Next categories', exact: true })).toBeEnabled()
      expect(await rail.evaluate(node => [...node.querySelectorAll('button')].every(card => card.scrollWidth <= card.clientWidth + 1))).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await rail.focus()
      await page.keyboard.press('End')
      await expect(cabinet.getByRole('button', { name: 'Next categories', exact: true })).toBeDisabled()
      await expect(cabinet.getByRole('button', { name: 'Previous categories', exact: true })).toBeEnabled()
      await page.keyboard.press('Home')
      await expect(cabinet.getByRole('button', { name: 'Previous categories', exact: true })).toBeDisabled()
      await page.keyboard.press('ArrowRight')
      await expect.poll(() => rail.evaluate(node => node.scrollLeft)).toBeGreaterThan(0)
      await page.keyboard.press('Home')
      await cabinet.getByRole('heading', { name: 'The Cabinet', exact: true }).click()
      fs.mkdirSync('docs/design-checkpoints/20261023-cabinet', { recursive: true })
      await cabinet.screenshot({ path: 'docs/design-checkpoints/20261023-cabinet/' + width + '-' + theme + '.png' })
    })
  }

  test('mouse drag never navigates, then a deliberate click opens the exact category', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 })
    await store(page, cabinetRows)
    await page.goto('/catalog')
    const cabinet = page.getByRole('region', { name: 'The Italian Cabinet' })
    const rail = cabinet.getByRole('group', { name: 'Cabinet categories', exact: true })
    await expect(cabinet.getByRole('button', { name: 'Next categories', exact: true })).toBeEnabled()
    await rail.scrollIntoViewIfNeeded()
    const box = await rail.boundingBox()
    await page.mouse.move(box.x + box.width * .4, box.y + box.height * .5)
    await page.mouse.down()
    await page.mouse.move(box.x + 15, box.y + box.height * .5, { steps: 12 })
    await page.mouse.up()
    await expect.poll(() => rail.evaluate(node => node.scrollLeft)).toBeGreaterThan(0)
    await expect(page).not.toHaveURL(/category=/)
    await rail.focus(); await page.keyboard.press('Home')
    await cabinet.getByRole('button', { name: /^Beverages/ }).click()
    await expect(page.getByTestId('product-card')).toHaveCount(1)
    await expect(page.getByTestId('product-card')).toContainText('Cabinet Beverages')
  })

  test('native touch swipe browses horizontally and still permits vertical page scrolling', async ({ page }) => {
    await store(page, cabinetRows)
    await page.goto('/catalog')
    const rail = page.getByRole('group', { name: 'Cabinet categories', exact: true })
    await rail.scrollIntoViewIfNeeded()
    const box = await rail.boundingBox()
    const cdp = await page.context().newCDPSession(page)
    const startX = box.x + box.width * .85, y = box.y + box.height * .5
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] })
    for (let step = 1; step <= 8; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX - step * 22, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(() => rail.evaluate(node => node.scrollLeft)).toBeGreaterThan(0)
    const before = await page.evaluate(() => window.scrollY)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] })
    for (let step = 1; step <= 8; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX, y: y - step * 15 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
    await expect(page).not.toHaveURL(/category=/)
    await cdp.detach()
  })

  test('empty and single-category rails have honest bounds and preserve Pasabuy navigation', async ({ page }) => {
    await store(page, [])
    await page.goto('/catalog')
    const cabinet = page.getByRole('region', { name: 'The Italian Cabinet' })
    await expect(cabinet.getByRole('button', { name: 'Next categories', exact: true })).toBeDisabled()
    await expect(cabinet.getByRole('button', { name: /Pasabuy su Misura/ })).toBeVisible()
    await cabinet.getByRole('button', { name: /Pasabuy su Misura/ }).click()
    await expect(page).toHaveURL(/pasabuy/)
    await page.unroute('**/rest/v1/**')
    await store(page, cabinetRows.slice(0, 1))
    await page.goto('/catalog')
    await expect(cabinet.getByRole('button', { name: /^Beverages/ })).toBeVisible()
    await expect(cabinet.getByRole('button', { name: 'Next categories', exact: true })).toBeDisabled()
  })
})


test('Cabinet long names remain readable after smooth navigation and viewport resize', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await store(page, cabinetRows)
  await page.goto('/catalog')
  const cabinet = page.getByRole('region', { name: 'The Italian Cabinet' })
  await cabinet.getByRole('button', { name: 'Next categories', exact: true }).click()
  const coffee = cabinet.getByRole('button', { name: /^Coffee and drink preparations/ })
  await expect(coffee).toBeInViewport({ ratio: 1 })
  expect(await coffee.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true)
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme)
    await cabinet.screenshot({ path: 'docs/design-checkpoints/20261023-cabinet/320-long-' + theme + '.png', animations: 'disabled' })
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await cabinet.getByRole('button', { name: 'Previous categories', exact: true }).click()
  await expect(cabinet.getByRole('button', { name: /^Beverages/ })).toBeInViewport({ ratio: 1 })
})


test.describe('Cabinet hybrid input recovery', () => {
  test.use({ hasTouch: true })
  test('Cabinet touch tap works after a mouse drag', async ({ page }) => {
    await store(page, cabinetRows)
    await page.goto('/catalog')
    const cabinet = page.getByRole('region', { name: 'The Italian Cabinet' })
    const rail = cabinet.getByRole('group', { name: 'Cabinet categories', exact: true })
    await rail.scrollIntoViewIfNeeded()
    const box = await rail.boundingBox()
    await page.mouse.move(box.x + box.width * .4, box.y + box.height * .5)
    await page.mouse.down(); await page.mouse.move(box.x + 12, box.y + box.height * .5, { steps: 10 }); await page.mouse.up()
    await rail.focus(); await page.keyboard.press('Home')
    await cabinet.getByRole('button', { name: /^Beverages/ }).tap()
    await expect(page.getByTestId('product-card')).toHaveCount(1)
    await expect(page.getByTestId('product-card')).toContainText('Cabinet Beverages')
  })
})


test('Cabinet blur stops an active mouse drag and allows the next gesture', async ({ page }) => {
  await store(page, cabinetRows)
  await page.goto('/catalog')
  const rail = page.getByRole('group', { name: 'Cabinet categories', exact: true })
  await rail.scrollIntoViewIfNeeded()
  const box = await rail.boundingBox()
  await page.mouse.move(box.x + box.width * .6, box.y + box.height * .5)
  await page.mouse.down(); await page.mouse.move(box.x + box.width * .3, box.y + box.height * .5, { steps: 8 })
  await expect(rail).toHaveClass(/cursor-grabbing/)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(rail).not.toHaveClass(/cursor-grabbing/)
  await rail.focus(); await page.keyboard.press('Home')
  await page.mouse.move(box.x + 10, box.y + box.height * .5)
  expect(await rail.evaluate(node => node.scrollLeft)).toBe(0)
  await page.mouse.up()
  await page.getByRole('region', { name: 'The Italian Cabinet' }).getByRole('button', { name: /^Beverages/ }).click()
  await expect(page.getByTestId('product-card')).toHaveCount(1)
})


for (const surface of ['admin', 'sheet']) test(`new store category can be created and assigned from ${surface} without hidden bulk selection`, async ({ page }) => {
  const { rows, writes } = await admin(page, { surface })
  await page.getByRole('button', { name: 'Create store category', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Create store category', exact: true })
  await expect(dialog.getByRole('button', { name: 'Apply to 0 products', exact: true })).toBeDisabled()
  await dialog.getByLabel('Store category', { exact: true }).fill('Italian pantry')
  await dialog.getByRole('checkbox', { name: 'Assign Inventory pasta (pasta)', exact: true }).check()
  await dialog.getByRole('button', { name: 'Apply to 1 product', exact: true }).click()
  await expect(dialog.getByRole('status')).toContainText('1 saved')
  expect(writes).toHaveLength(1)
  expect(writes[0].payload.patch).toEqual({ subcategory: 'Italian pantry' })
  expect(rows[0]).toMatchObject({ published: true, status: 'Live', srp: 100, stock_available: 2 })
  expect(rows[1].subcategory).toBe('Fragrances')
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  if (surface === 'sheet') await expect(page.getByRole('columnheader', { name: 'Store category', exact: true })).toBeVisible()
})

test('footer category destinations stay native and update with the current published inventory', async ({ page }) => {
  let rows = structuredClone(products)
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop()
    return route.fulfill({ json: table === 'products' ? rows.filter(p => p.published)
      : table === 'v_storefront_visible_skus' ? rows.filter(p => p.published).map(p => ({ sku: p.sku }))
      : table === 'v_product_stock_from_batches' ? rows.map(p => ({ sku: p.sku, stock_from_batches: p.stock_available })) : [] })
  })
  await page.goto('/catalog')
  const footer = page.getByRole('navigation', { name: 'Shop by category', exact: true })
  await expect(footer.getByRole('link', { name: 'Pasta', exact: true })).toHaveAttribute('href', '/catalog?category=Pasta')
  rows[0].subcategory = 'Italian pantry'
  await page.reload()
  const category = footer.getByRole('link', { name: 'Italian pantry', exact: true })
  await expect(category).toHaveAttribute('href', '/catalog?category=Italian+pantry')
  await expect(footer.getByRole('link', { name: 'Pasta', exact: true })).toHaveCount(0)
  await category.click()
  await expect(page).toHaveURL(/category=Italian\+pantry/)
  await expect(page.getByTestId('product-card')).toHaveCount(1)
  await expect(page.getByTestId('product-card')).toContainText('Inventory pasta')
  await footer.getByRole('link', { name: 'Browse all products', exact: true }).click()
  await expect(page.getByTestId('product-card')).toHaveCount(2)
})

test('empty footer keeps a useful catalog destination', async ({ page }) => {
  await store(page, [])
  await page.goto('/catalog')
  await expect(page.getByRole('navigation', { name: 'Shop by category', exact: true }).getByRole('link', { name: 'Browse all products', exact: true })).toHaveAttribute('href', '/catalog')
})

for (const surface of ['admin', 'sheet']) test(`store category actions respect read-only access in ${surface}`, async ({ page }) => {
  const { writes } = await admin(page, { surface, readOnly: true })
  await expect(page.getByRole('button', { name: 'Create store category', exact: true })).toHaveCount(0)
  if (surface === 'sheet') await expect(page.getByRole('button', { name: 'Set store category for pasta', exact: true })).toBeDisabled()
  expect(writes).toHaveLength(0)
})

test('Sheet category cell uses the same saved decision and retains an uncertain save across reload', async ({ page }) => {
  const { writes } = await admin(page, { surface: 'sheet', failSku: 'scent' })
  await page.getByRole('button', { name: 'Set store category for scent', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Set store category', exact: true })
  await dialog.getByLabel('Store category', { exact: true }).fill('Perfumes')
  await dialog.getByRole('button', { name: 'Apply to 1 product', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  const original = structuredClone(writes[0])
  await page.reload()
  await expect(page.getByRole('button', { name: 'Create store category', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Review pending product decision scent', exact: true }).click()
  await page.getByRole('button', { name: 'Retry saved decision', exact: true }).click()
  await expect.poll(() => writes.length).toBe(2)
  expect(writes[1]).toEqual(original)
})

for (const width of [375, 1440]) test(`category creation and the dynamic footer fit the K2 surfaces at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 })
  fs.mkdirSync('docs/design-checkpoints/20261029-account-category-footer', { recursive: true })
  await admin(page, { surface: 'sheet' })
  await expect(page.getByRole('button', { name: 'Create store category', exact: true })).toBeInViewport()
  await page.getByRole('button', { name: 'Create store category', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Create store category', exact: true })
  await dialog.getByLabel('Store category', { exact: true }).fill('Italian pantry')
  await dialog.getByRole('searchbox', { name: 'Find products to assign', exact: true }).fill('pasta')
  await dialog.getByRole('checkbox', { name: 'Assign Inventory pasta (pasta)', exact: true }).check()
  await page.screenshot({ path: `docs/design-checkpoints/20261029-account-category-footer/sheet-${width}.png` })
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  const longName = 'Special Italian delicacies and seasonal favourites for sharing'
  await store(page, [...cabinetRows, { ...products[0], sku: 'long', subcategory: longName }])
  await page.goto('/catalog')
  const footer = page.locator('footer')
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme)
    const link = footer.getByRole('link', { name: longName, exact: true })
    await expect(link).toBeVisible()
    expect(await link.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await footer.screenshot({ path: `docs/design-checkpoints/20261029-account-category-footer/footer-${width}-${theme}.png` })
  }
})
