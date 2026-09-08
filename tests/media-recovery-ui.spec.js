import { expect, test } from '@playwright/test'

async function open(page) {
  await page.route('https://**/*', route => route.abort())
  await page.goto('/tests/fixtures/payment-harness.html?media=1')
  await page.getByRole('button', { name: 'Review product photos' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: /Change reason/ }).fill('Approved product image review')
  return dialog
}

for (const outcome of ['lost', 'cleanup']) test(`media ${outcome} freezes pending details and retains the assignment key`, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const calls = []
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/api/admin/product-media/assign', async route => {
    calls.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
    if (calls.length === 1) {
      await gate
      if (outcome === 'lost') return route.abort('failed')
      return route.fulfill({ json: { ok: true, cleanupPending: true } })
    }
    return route.fulfill({ json: { ok: true, cleanupPending: false } })
  })
  const dialog = await open(page)
  await dialog.getByRole('button', { name: 'Save photo assignment' }).click()
  await expect.poll(() => calls.length).toBe(1)
  await expect(dialog.getByRole('textbox', { name: /Change reason/ })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Remove Primary storefront photo 1' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  release()
  await expect(dialog).toContainText(outcome === 'lost' ? 'may already be saved' : 'Photos are saved')
  await dialog.getByRole('button', { name: outcome === 'lost' ? 'Retry same command' : 'Retry file cleanup' }).focus()
  await page.screenshot({ path: `docs/evidence/20260908-media-retry/${outcome}-phone.png`, fullPage: true })
  await expect(dialog.getByRole('textbox', { name: /Change reason/ })).toBeDisabled()
  await dialog.getByRole('button', { name: outcome === 'lost' ? 'Retry same command' : 'Retry file cleanup' }).click()
  await expect(dialog).toHaveCount(0)
  expect(calls[1]).toEqual(calls[0])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('media rejection reopens correction with a new assignment key', async ({ page }) => {
  const calls = []
  await page.route('**/api/admin/product-media/assign', route => {
    calls.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
    return route.fulfill(calls.length === 1
      ? { status: 400, json: { error: { code: 'PRODUCT_MEDIA_ASSIGNMENT_INVALID' } } }
      : { json: { ok: true } })
  })
  const dialog = await open(page)
  await dialog.getByRole('button', { name: 'Save photo assignment' }).click()
  await expect(dialog).toContainText('not verified for this product')
  await expect(dialog.getByRole('textbox', { name: /Change reason/ })).toBeEnabled()
  await dialog.getByRole('textbox', { name: /Change reason/ }).fill('Corrected assignment after verification')
  await dialog.getByRole('button', { name: 'Save photo assignment' }).click()
  await expect(dialog).toHaveCount(0)
  expect(calls[1].key).not.toBe(calls[0].key)
})

test('media assignment waits for an in-flight upload', async ({ page }) => {
  let finish
  const gate = new Promise(resolve => { finish = resolve })
  await page.route('**/api/admin/product-media', async route => {
    await gate
    return route.fulfill({ json: { ok: true, media: { publicUrl: 'https://images.example.test/new.png', objectPath: 'staff/new.png' } } })
  })
  const dialog = await open(page)
  await dialog.getByLabel('After-use photo', { exact: true }).setInputFiles({ name: 'pantry.png', mimeType: 'image/png', buffer: Buffer.alloc(256) })
  await expect(dialog.getByText('Checking photo…')).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Save photo assignment|Wait for photo upload/ })).toBeDisabled()
  finish()
  await expect(dialog.getByRole('button', { name: 'Save photo assignment' })).toBeEnabled()
})

test('media actor change discards late save completion', async ({ page }) => {
  let finish
  let sent = false
  const gate = new Promise(resolve => { finish = resolve })
  await page.route('**/api/admin/product-media/assign', async route => {
    sent = true
    await gate
    return route.fulfill({ json: { ok: true } })
  })
  const dialog = await open(page)
  await dialog.getByRole('button', { name: 'Save photo assignment' }).click()
  await expect.poll(() => sent).toBe(true)
  await page.evaluate(() => window.switchActor())
  const response = page.waitForResponse('**/api/admin/product-media/assign')
  finish()
  await response
  await expect(dialog.getByRole('textbox', { name: /Change reason/ })).toHaveValue('')
  await expect(page.getByText('Assignment refreshed')).toHaveCount(0)
})
