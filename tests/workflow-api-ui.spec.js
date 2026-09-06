import { expect, test } from '@playwright/test'
test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort())
})
test('workflow step requests real API records only on staff action', async ({ page }) => {
  let calls = 0
  await page.route('**/api/admin/products', route => {
    calls++
    expect(route.request().method()).toBe('GET')
    return route.fulfill({ json: { ok: true, products: [{ sku: 'FIXTURE-SKU', name: 'Fixture coffee', status: 'Live' }] } })
  })
  await page.goto('/tests/fixtures/workflow-api-harness.html', { waitUntil: 'domcontentloaded' })
  const load = page.getByRole('button', { name: 'Load current records' })
  await expect(load).toBeVisible()
  expect(calls).toBe(0)
  await load.click()
  await expect(page.getByRole('region', { name: 'Current records' })).toContainText('Fixture coffee')
  await expect(page.getByRole('region', { name: 'Current records' })).toContainText('FIXTURE-SKU')
  expect(calls).toBe(1)
  await page.getByRole('region', { name: 'Current records' }).screenshot({ path: 'docs/evidence/20260906-workflow-api/records-desktop.png' })
  await page.setViewportSize({ width: 375, height: 812 })
  expect(await page.getByRole('region', { name: 'Current records' }).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await page.getByRole('region', { name: 'Current records' }).screenshot({ path: 'docs/evidence/20260906-workflow-api/records-phone.png' })
})

test('partial data stays explicit and a refresh replaces the previous batch', async ({ page }) => {
  let refreshed = false
  await page.route('**/api/admin/products', route => route.fulfill({ json: refreshed
    ? { ok: true, products: [] }
    : { ok: true, products: Array.from({ length: 12 }, (_, i) => ({ sku: `SKU-${i}`, name: `Coffee ${i}` })), unavailable: ['stock'] }
  }))
  await page.goto('/tests/fixtures/workflow-api-harness.html', { waitUntil: 'domcontentloaded' })
  const region = page.getByRole('region', { name: 'Current records' })
  await page.getByRole('button', { name: 'Load current records' }).click()
  await expect(region.getByRole('listitem')).toHaveCount(10)
  await expect(region).toContainText('Some supporting data is unavailable')
  refreshed = true
  await page.getByRole('button', { name: 'Load current records' }).click()
  await expect(region).toContainText('No records returned.')
  await expect(region.getByRole('listitem')).toHaveCount(0)
  await expect(region).not.toContainText('Some supporting data is unavailable')
})
test('denied and malformed replies do not masquerade as empty success', async ({ page }) => {
  let invalid = false
  await page.route('**/api/admin/products', route => route.fulfill(invalid ? { json: { ok: true, products: 'invalid' } } : { status: 403, json: { error: { code: 'FORBIDDEN' } } }))
  await page.goto('/tests/fixtures/workflow-api-harness.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Load current records' }).click()
  await expect(page.getByRole('region', { name: 'Current records' }).getByRole('alert')).toBeVisible()
  invalid = true
  await page.getByRole('button', { name: 'Load current records' }).click()
  await expect(page.getByRole('alert')).toContainText('could not be read')
  await expect(page.getByText('No records returned.')).toHaveCount(0)
})
test('switching steps drops old responses and loads the new allowed route', async ({ page }) => {
  let release
  const hold = new Promise(resolve => { release = resolve })
  await page.route('**/api/admin/products', async route => { await hold; await route.fulfill({ json: { ok: true, products: [{ sku: 'OLD', name: 'Old record' }] } }).catch(() => {}) })
  await page.route('**/api/admin/consignments', route => route.fulfill({ json: { ok: true, data: { consignments: [] } } }))
  await page.goto('/tests/fixtures/workflow-api-harness.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Load current records' }).click()
  await expect(page.getByRole('button', { name: 'Loading records…' })).toBeDisabled()
  await page.getByRole('button', { name: 'Choose consignment step' }).click()
  release()
  await page.getByRole('button', { name: 'Load current records' }).click()
  await expect(page.getByRole('region', { name: 'Current records' })).toContainText('No records returned.')
  await expect(page.getByText('Old record', { exact: true })).toHaveCount(0)
})
