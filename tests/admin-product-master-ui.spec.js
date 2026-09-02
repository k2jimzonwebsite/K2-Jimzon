import { expect, test } from '@playwright/test'

const product = {
  sku: 'K2-SKU-001001',
  name: 'Rigatoni di Gragnano 500g',
  short: 'Rigatoni 500g',
  barcode: '8001234567890',
  status: 'Draft',
  subcategory: 'Dry Pasta',
  origin: 'Gragnano, Italy',
  country_of_origin: 'Gragnano, Italy',
  net_weight: 500,
  package_type: 'Bag',
  size: '500g',
  description: 'Reviewed pasta product.',
  srp: 185,
  cost_price: 100,
  wholesale_price: 150,
  dealer_price: 140,
  reorder_level: 5,
  stock_available: 0,
  primary_image_url: '/placeholder.png',
  is_human_reviewed: true,
  updated_at: '2026-08-26T00:00:00.000Z',
}

test('keeps secure Product Master edit, lifecycle, and delete decisions usable at 375px', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.context().addCookies([{
    name: 'k2_admin_csrf', value: 'visual-csrf-token', url: 'http://localhost:5181',
  }])

  await page.route('**/api/admin/products', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, products: [product] }),
  }))
  await page.route('**/api/admin/staff-access', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, staffAccess: { hasDeletePin: true } }),
  }))
  await page.route('**/api/admin/product-master*', route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, product }) })
    }
    const action = route.request().postDataJSON()?.action
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        result: action === 'delete' ? { ok: false, code: 'PRODUCT_HAS_HISTORY' } : { success: true },
      }),
    })
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    const [reactModule, reactDomClientModule, inventoryModule] = await Promise.all([
      import('/@id/react'), import('/@id/react-dom/client'), import('/src/views/admin/InventoryGrid.jsx'),
    ])
    const React = reactModule.default || reactModule
    const createRoot = reactDomClientModule.createRoot || reactDomClientModule.default?.createRoot
    const app = document.getElementById('root')
    if (app) app.style.display = 'none'
    const fixture = document.createElement('main')
    fixture.id = 'product-master-browser-fixture'
    document.body.appendChild(fixture)
    createRoot(fixture).render(React.createElement(inventoryModule.default, { canManageProducts: true }))
  })

  await expect(page.getByRole('heading', { name: 'Inventory exception board' })).toBeVisible()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Edit Product' })
  await expect(editor).toBeVisible()
  await expect(editor.getByText('Reason for this change')).toBeVisible()
  expect(await editor.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
  await page.screenshot({ path: 'C:/tmp/k2-admin-product-master-edit-mobile.png', fullPage: true })
  await editor.getByRole('button', { name: 'Close product editor' }).click()

  await page.getByRole('button', { name: 'Review', exact: true }).click()
  const statusDialog = page.getByRole('dialog', { name: 'Set Under Review' })
  await expect(statusDialog).toBeVisible()
  await statusDialog.getByLabel('Reason for the status change').fill('Reviewed package and publication evidence.')
  expect(await statusDialog.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
  await page.screenshot({ path: 'C:/tmp/k2-admin-product-master-status-mobile.png', fullPage: true })
  await statusDialog.getByRole('button', { name: 'Close status decision' }).click()

  await page.getByRole('button', { name: 'Delete product' }).click()
  const deleteDialog = page.getByRole('dialog', { name: 'Delete 1 product?' })
  await expect(deleteDialog).toBeVisible()
  await expect(deleteDialog.getByLabel('Your 4-digit delete PIN')).toBeFocused()
  await deleteDialog.getByLabel('Reason for permanent deletion').fill('Duplicate setup record with history review.')
  await deleteDialog.getByLabel('Your 4-digit delete PIN').fill('1234')
  expect(await deleteDialog.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
  await page.screenshot({ path: 'C:/tmp/k2-admin-product-master-delete-mobile.png', fullPage: true })
  await deleteDialog.getByRole('button', { name: 'Delete 1 product' }).click()
  await expect(deleteDialog).toContainText('has stock, listings, or operational history')
})
