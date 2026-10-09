import { expect, test } from '@playwright/test'

const shop = { id: '40000000-0000-4000-8000-000000000001', shop_code: 'reviewed-shop', channel_code: 'shopee', display_name: 'Reviewed K2 shop', status: 'operational' }
const product = { sku: 'REVIEW-SKU', name: 'Reviewed pasta', status: 'Live', stock_available: 900 }

async function mount(page, secureMode = false) {
  await page.route('**/shop-stock-fixture', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><html><head><link rel="stylesheet" href="/src/index.css"></head><body><div id="root"></div></body></html>',
  }))
  await page.goto('/shop-stock-fixture', { waitUntil: 'domcontentloaded' })
  await page.evaluate(async (secure) => {
    const refresh = await import('/@react-refresh')
    refresh.default.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => type => type
    window.__vite_plugin_react_preamble_installed__ = true
    const [react, dom, view] = await Promise.all([
      (await import('/tests/fixtures/loaded-react-runtime.js')).ReactRuntime, (await import('/tests/fixtures/loaded-react-runtime.js')).ReactDomRuntime, import('/src/views/admin/ShopAllocationManager.jsx'),
    ])
    document.getElementById('root').style.display = 'none'
    const fixture = document.createElement('main')
    fixture.className = 'admin-ui min-h-screen bg-adm-bg p-4 text-white font-sans'
    document.body.appendChild(fixture)
    const createRoot = dom.createRoot || dom.default?.createRoot
    const React = react.default || react
    createRoot(fixture).render(React.createElement(view.default, { secureMode: secure }))
  }, secureMode)
}

async function mockReads(page, rows = {}, failTable = null, calls = [], counts = {}) {
  await page.route('https://fixture.supabase.co/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split('/').at(-1)
    const count = Object.hasOwn(counts, table) ? counts[table] : (rows[table] || []).length
    calls.push({ table, method: request.method() })
    await route.fulfill({
      status: table === failTable ? 503 : 200,
      contentType: 'application/json',
      headers: count === null ? {} : { 'content-range': `*/${count}`, 'access-control-expose-headers': 'content-range' },
      body: JSON.stringify(table === failTable ? { message: 'private provider diagnostic' } : (rows[table] || [])),
    })
  })
}

test('protected shop stock never uses the direct database path', async ({ page }) => {
  const calls = []
  await mockReads(page, { channel_shops: [shop], products: [product] }, null, calls)
  await mount(page, true)
  await expect(page.getByText('Protected shop stock is not available yet.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request stock transfer' })).toHaveCount(0)
  expect(calls).toEqual([])
})

for (const [table, count] of [['inventory_balances', 3], ['inventory_transfer_requests', 26], ['channel_shops', null]]) {
  test(`successful ${table} read refuses incomplete or missing count ${count}`, async ({ page }) => {
    await mockReads(page, { channel_shops: [shop], products: [product] }, null, [], { [table]: count })
    await mount(page)
    await expect(page.getByText(/Shop stock could not be loaded/)).toBeVisible()
    await expect(page.locator('dd').filter({ hasText: /^--$/ })).toHaveCount(4)
    await expect(page.getByRole('row').filter({ hasText: product.sku })).toHaveCount(0)
  })
}

test('empty canonical shop reads do not create six operating shops', async ({ page }) => {
  await mockReads(page)
  await mount(page)
  await expect(page.getByText('No active shops have been configured.')).toBeVisible()
  await expect(page.getByText('Shopee Main Shop')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Request stock transfer' })).toBeDisabled()
})

test('missing warehouse balance never borrows display stock or reports coverage', async ({ page }) => {
  await mockReads(page, { channel_shops: [shop], products: [product] })
  await mount(page)
  const row = page.getByRole('row').filter({ hasText: 'REVIEW-SKU' })
  await expect(row).toContainText('Needs review')
  await expect(row).not.toContainText('900')
  await expect(row).not.toContainText('Covered')
  await expect(row.getByRole('button', { name: 'Review stock split' })).toBeDisabled()
})

test('missing saved allocation is Needs review even when aggregate stock exists', async ({ page }) => {
  await mockReads(page, {
    channel_shops: [shop], products: [product],
    inventory_balances: [{ sku: product.sku, location_code: 'MANILA_MAIN', available: 9, on_hand: 12 }],
  })
  await mount(page)
  const row = page.getByRole('row').filter({ hasText: product.sku })
  await expect(row).toContainText('Needs review')
  await expect(row).not.toContainText('Covered')
})

test('failed reads hide operating totals and actions, then Refresh recovers exact saved rows', async ({ page }) => {
  const rows = {
    channel_shops: [shop, { ...shop, id: '40000000-0000-4000-8000-000000000002', display_name: 'Disabled shop', status: 'disabled' }],
    products: [product], inventory_balances: [{ sku: product.sku, available: 9 }],
    channel_shop_allocations: [{ sku: product.sku, shop_id: shop.id, allocated_units: 2, status: 'Covered' }],
    inventory_transfer_requests: [{ id: '50000000-0000-4000-8000-000000000001', sku: product.sku, status: 'pending_approval', quantity: 2, source_hub: 'MANILA_MAIN', destination_hub: 'CEBU_HUB', reason: 'Reviewed transfer request' }],
  }
  await mockReads(page, rows, 'inventory_balances')
  await mount(page)
  await expect(page.getByText(/Shop stock could not be loaded/)).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('private provider diagnostic')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Request stock transfer' })).toBeDisabled()
  await expect(page.getByRole('row').filter({ hasText: product.sku })).toHaveCount(0)
  await expect(page.locator('dd').filter({ hasText: /^--$/ })).toHaveCount(4)
  await page.unroute('https://fixture.supabase.co/**')
  await mockReads(page, rows)
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByRole('row').filter({ hasText: product.sku })).toContainText('Covered')
  await expect(page.getByRole('button', { name: 'Request stock transfer' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Review stock split' })).toBeDisabled()
  await page.getByRole('button', { name: /Stock transfers/ }).click()
  await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Reject', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Stock by shop', exact: true }).click()
  await expect(page.getByText('Disabled shop')).toHaveCount(0)
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (process.env.K2_SHOP_STOCK_SCREENSHOT_DIR) {
      await page.screenshot({ path: `${process.env.K2_SHOP_STOCK_SCREENSHOT_DIR}/shop-stock-${width}.png`, fullPage: true })
    }
  }
})
