import { test, expect } from '@playwright/test'

const product = { sku: 'DUMMY-BATCH', name: 'Synthetic batch read', status: 'UnderReview', stock_available: 6, srp: 100 }
const data = (quantity = 6) => ({ complete: true, asOf: '2026-10-11T06:00:00Z', lots: [
  { id: 'b1', sku: product.sku, quantity, reserved_quantity: 0, hub: 'Dummy hub', channel: 'Unassigned', custodian: 'Dummy holder', expiry_date: '2027-10-11' },
], derivedStock: { [product.sku]: { ownedQuantity: quantity, committedQuantity: 0, heldQuantity: 0, requiresReconciliation: false, unresolvedCount: 0, unresolvedQuantity: 0, unresolvedAllocations: [] } } })

test('secure inventory loads complete batches, rejects failures and recovers on retry', async ({ page }, testInfo) => {
  let state = 'ready'; let reads = 0
  await page.route('https://fixture.supabase.co/**', route => route.abort())
  await page.route('**/api/admin/products', route => route.fulfill({ json: { ok: true, products: [product] } }))
  await page.route('**/api/admin/lots?*', route => {
    reads++
    return route.fulfill(state === 'error' ? { status: 503, json: { error: { code: 'LOTS_UNAVAILABLE' } } }
      : { json: { ok: true, data: state === 'partial' ? { ...data(), complete: false } : data() } })
  })
  await page.goto('/tests/fixtures/admin-product-master-harness.html')
  await expect(page.getByRole('button', { name: 'Batches (1)', exact: true })).toBeVisible()
  await expect(page.getByText('6 pcs in 1 lot', { exact: true }).filter({ visible: true })).toBeVisible()
  for (const stateValue of ['error', 'partial']) {
    state = stateValue
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await expect(page.getByRole('button', { name: 'Batches (Unknown)', exact: true })).toBeVisible()
    await expect(page.getByText('6 pcs in 1 lot', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Retry batch details', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Expiry/ })).toBeDisabled()
    if (stateValue === 'error') {
      const retry = page.getByRole('button', { name: 'Retry batch details', exact: true })
      const bounds = await retry.boundingBox()
      expect(bounds.height).toBeGreaterThanOrEqual(44)
      await retry.focus()
      await expect(retry).toBeFocused()
      await page.screenshot({ path: testInfo.outputPath('batch-read-unavailable-375.png'), fullPage: true })
    }
  }
  state = 'ready'
  await page.getByRole('button', { name: 'Retry batch details', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Batches (1)', exact: true })).toBeVisible()
  expect(reads).toBeGreaterThanOrEqual(4)
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`batch-read-${width}.png`), fullPage: true })
  }
})

test('older secure batch response cannot overwrite a later refresh', async ({ page }) => {
  let release; let reads = 0
  const held = new Promise(resolve => { release = resolve })
  await page.route('https://fixture.supabase.co/**', route => route.abort())
  await page.route('**/api/admin/products', route => route.fulfill({ json: { ok: true, products: [product] } }))
  await page.route('**/api/admin/lots?*', async route => {
    if (++reads === 1) { await held; return route.fulfill({ json: { ok: true, data: data(6) } }) }
    return route.fulfill({ json: { ok: true, data: data(5) } })
  })
  await page.goto('/tests/fixtures/admin-product-master-harness.html')
  await expect.poll(() => reads).toBe(1)
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByText('5 pcs in 1 lot', { exact: true }).filter({ visible: true })).toBeVisible()
  release()
  await expect.poll(() => reads).toBe(2)
  await expect(page.getByText('6 pcs in 1 lot', { exact: true })).toHaveCount(0)
})
