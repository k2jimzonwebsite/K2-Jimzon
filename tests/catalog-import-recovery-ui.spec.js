import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { serializeCatalogCsv } from '../server/admin-bff/catalog-spreadsheet.js'

const product = {
  catalog_id: 'e74a4161-72ca-4d72-8f59-37aa690e1869', sku: 'K2-PASTA-001',
  catalog_record_version: 7, updated_at: '2026-09-09T00:00:00.000Z',
  name: 'Reviewed pasta', description: 'Previous package description',
  usage_instructions: 'Boil before serving', storage_instructions: 'Store dry',
  ingredients: 'Durum wheat', allergens: 'Wheat', country_of_origin: 'Italy',
  net_weight: '500', package_type: 'Bag', subcategory: 'Pasta',
  seo_keywords: ['pasta'], primary_image_url: '', product_video_url: '',
  internal_notes: '',
}

test('uncertain catalog commit freezes review and retries the exact chunk identity', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const csvText = serializeCatalogCsv([{ ...product, description: 'Reviewed package description' }])
  const fileSha256 = createHash('sha256').update(csvText).digest('hex')
  const calls = []
  let loseResponse
  const responseGate = new Promise(resolve => { loseResponse = resolve })
  const safetyRelease = setTimeout(() => loseResponse(), 10_000)

  await page.route('https://**/*', route => route.abort())
  await page.route('**/api/admin/catalog-import/preview', route => route.fulfill({ json: {
    ok: true,
    preview: {
      fileSha256,
      counts: { New: 0, Changed: 1, Unchanged: 0, Invalid: 0, 'Protected/Ignored': 0, Duplicate: 0, 'Stale/Conflict': 0 },
      outcomes: [{ rowNumber: 2, sku: product.sku, category: 'Changed', consequence: 'Updates approved catalog metadata only.', changes: [{ field: 'description', before: product.description, after: 'Reviewed package description' }] }],
    },
  } }))
  await page.route('**/api/admin/catalog-import/commit', async route => {
    calls.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
    if (calls.length === 1) {
      await responseGate
      return route.fulfill({ status: 503, json: { error: { code: 'ADMIN_SERVICE_UNAVAILABLE' } } })
    }
    return route.fulfill({ json: { ok: true, result: { status: 'completed', rows: [{ rowNumber: 2, sku: product.sku, outcome: 'updated', recordVersion: 8, updatedAt: '2026-09-09T00:01:00.000Z' }] } } })
  })

  await page.goto('/tests/fixtures/payment-harness.html?csv=1')
  await page.getByRole('button', { name: 'Open catalog CSV review' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input[type="file"]').setInputFiles({ name: 'reviewed-catalog.csv', mimeType: 'text/csv', buffer: Buffer.from(csvText) })
  await dialog.getByRole('button', { name: 'Review changes' }).click()
  await dialog.getByLabel(`Select row 2, ${product.sku}`).check()
  await dialog.getByLabel('Reason for this catalog change').fill('Package copy checked against the physical label.')
  await dialog.getByText('I reviewed the selected before/after values.', { exact: false }).click()
  await dialog.getByRole('button', { name: 'Commit 1 selected row' }).click()
  await expect.poll(() => calls.length).toBe(1)

  await expect(dialog.getByRole('button', { name: 'Close catalog CSV review' })).toBeDisabled()
  await expect(dialog.locator('input[type="file"]')).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Review again' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()

  loseResponse()
  clearTimeout(safetyRelease)
  await expect(dialog.getByRole('button', { name: 'Retry 1 selected row' })).toBeVisible()
  await expect(dialog).toContainText('may already be recorded')
  await expect(dialog.getByRole('button', { name: 'Close catalog CSV review' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: 'Retry 1 selected row' }).click()
  await expect(dialog).toContainText('1 selected row was recorded successfully')
  expect(calls).toHaveLength(2)
  expect(calls[0].key).toMatch(/^[0-9a-f-]{36}$/)
  expect(calls[1]).toEqual(calls[0])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('catalog commit response from a disposed staff view cannot refresh the next actor', async ({ page }) => {
  const csvText = serializeCatalogCsv([{ ...product, description: 'Actor-scoped package description' }])
  const fileSha256 = createHash('sha256').update(csvText).digest('hex')
  let finishCommit
  let commitReturned = false

  await page.route('https://**/*', route => route.abort())
  await page.route('**/api/admin/catalog-import/preview', route => route.fulfill({ json: {
    ok: true,
    preview: {
      fileSha256,
      counts: { New: 0, Changed: 1, Unchanged: 0, Invalid: 0, 'Protected/Ignored': 0, Duplicate: 0, 'Stale/Conflict': 0 },
      outcomes: [{ rowNumber: 2, sku: product.sku, category: 'Changed', consequence: 'Updates approved catalog metadata only.', changes: [{ field: 'description', before: product.description, after: 'Actor-scoped package description' }] }],
    },
  } }))
  await page.route('**/api/admin/catalog-import/commit', async route => {
    await new Promise(resolve => { finishCommit = resolve })
    await route.fulfill({ json: { ok: true, result: { status: 'completed', rows: [{ rowNumber: 2, sku: product.sku, outcome: 'updated', recordVersion: 8, updatedAt: '2026-09-09T00:01:00.000Z' }] } } })
    commitReturned = true
  })

  await page.goto('/tests/fixtures/payment-harness.html?csv=1')
  await page.getByRole('button', { name: 'Open catalog CSV review' }).click()
  let dialog = page.getByRole('dialog')
  await dialog.locator('input[type="file"]').setInputFiles({ name: 'reviewed-catalog.csv', mimeType: 'text/csv', buffer: Buffer.from(csvText) })
  await dialog.getByRole('button', { name: 'Review changes' }).click()
  await dialog.getByLabel(`Select row 2, ${product.sku}`).check()
  await dialog.getByLabel('Reason for this catalog change').fill('Actor-scoped package copy verified against the label.')
  await dialog.getByText('I reviewed the selected before/after values.', { exact: false }).click()
  await dialog.getByRole('button', { name: 'Commit 1 selected row' }).click()
  await expect.poll(() => typeof finishCommit).toBe('function')

  await page.evaluate(() => window.switchActor())
  dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Review changes' })).toBeDisabled()
  finishCommit()
  await expect.poll(() => commitReturned).toBe(true)
  await expect(page.getByRole('status')).toHaveText('')
  await expect(dialog).not.toContainText('selected rows were recorded successfully')
})

test('definitive catalog rejection reopens correction with a new operation identity', async ({ page }) => {
  const csvText = serializeCatalogCsv([{ ...product, description: 'Correctable package description' }])
  const fileSha256 = createHash('sha256').update(csvText).digest('hex')
  const calls = []

  await page.route('https://**/*', route => route.abort())
  await page.route('**/api/admin/catalog-import/preview', route => route.fulfill({ json: {
    ok: true,
    preview: {
      fileSha256,
      counts: { New: 0, Changed: 1, Unchanged: 0, Invalid: 0, 'Protected/Ignored': 0, Duplicate: 0, 'Stale/Conflict': 0 },
      outcomes: [{ rowNumber: 2, sku: product.sku, category: 'Changed', consequence: 'Updates approved catalog metadata only.', changes: [{ field: 'description', before: product.description, after: 'Correctable package description' }] }],
    },
  } }))
  await page.route('**/api/admin/catalog-import/commit', route => {
    calls.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
    if (calls.length === 1) return route.fulfill({ status: 409, json: { error: { code: 'CATALOG_STALE_CONFLICT' } } })
    return route.fulfill({ json: { ok: true, result: { status: 'completed', rows: [{ rowNumber: 2, sku: product.sku, outcome: 'updated', recordVersion: 8, updatedAt: '2026-09-09T00:01:00.000Z' }] } } })
  })

  await page.goto('/tests/fixtures/payment-harness.html?csv=1')
  await page.getByRole('button', { name: 'Open catalog CSV review' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input[type="file"]').setInputFiles({ name: 'reviewed-catalog.csv', mimeType: 'text/csv', buffer: Buffer.from(csvText) })
  await dialog.getByRole('button', { name: 'Review changes' }).click()
  await dialog.getByLabel(`Select row 2, ${product.sku}`).check()
  const reason = dialog.getByLabel('Reason for this catalog change')
  await reason.fill('Initial package-copy review was rejected by the server.')
  await dialog.getByText('I reviewed the selected before/after values.', { exact: false }).click()
  await dialog.getByRole('button', { name: 'Commit 1 selected row' }).click()

  await expect(reason).toBeEnabled()
  await reason.fill('Corrected package-copy review after refreshing the source label.')
  await dialog.getByText('I reviewed the selected before/after values.', { exact: false }).click()
  await dialog.getByRole('button', { name: 'Commit 1 selected row' }).click()
  await expect(dialog).toContainText('1 selected row was recorded successfully')
  expect(calls).toHaveLength(2)
  expect(calls[1].body.operationId).not.toBe(calls[0].body.operationId)
  expect(calls[1].key).not.toBe(calls[0].key)
})
