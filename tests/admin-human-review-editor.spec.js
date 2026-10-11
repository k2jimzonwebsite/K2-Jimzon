import { expect, test } from '@playwright/test'

async function setup(page, write, reviewed = false) {
  const product = { sku: 'synthetic-review', name: 'Synthetic reviewed product', status: 'Under Review', published: false,
    is_human_reviewed: reviewed, stock_available: 6, updated_at: '2026-10-12T00:00:00Z' }
  await page.route('https://fixture.supabase.co/**', route => route.abort())
  await page.context().addCookies([{ name: 'k2_admin_csrf', value: 'synthetic-review-csrf', url: 'http://localhost:5181' }])
  await page.route('**/api/admin/session', route => route.fulfill({ json: { ok: true, user: { userId: '11111111-1111-4111-8111-111111111111', role: 'Admin' } } }))
  await page.route('**/api/admin/products', route => route.fulfill({ json: { ok: true, products: [product] } }))
  await page.route('**/api/admin/lots*', route => route.fulfill({ json: { ok: true, data: { lots: [], derivedStock: {}, complete: true } } }))
  await page.route('**/api/admin/product-master*', route => route.request().method() === 'POST' ? write(route, product)
    : route.fulfill({ json: { ok: true, product, taxonomyReview: { status: 'assigned' } } }))
  await page.goto('/tests/fixtures/admin-product-master-harness.html')
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Edit Product' })
  await editor.getByRole('button', { name: /Pricing/ }).click()
  return editor
}

test('human review is explicit, reasoned, saved and reversible independently of publication', async ({ page }, testInfo) => {
  const writes = []
  const editor = await setup(page, async (route, product) => {
    const body = route.request().postDataJSON(); writes.push(body)
    Object.assign(product, body.payload.patch)
    await route.fulfill({ json: { ok: true, result: { sku: product.sku, status: product.status, updatedAt: '2026-10-12T00:00:01Z' } } })
  })
  const review = editor.getByRole('checkbox', { name: 'I reviewed this product’s details and pricing' })
  await expect(review).not.toBeChecked()
  await review.focus(); await page.keyboard.press('Space')
  await expect(review).toBeChecked()
  await expect(editor.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
  await editor.getByLabel('Reason for this change').fill('Synthetic product details and pricing reviewed')
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await review.scrollIntoViewIfNeeded()
    expect(await review.locator('..').evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
    expect(await editor.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    expect(await review.evaluate(el => {
      const scroll = el.closest('fieldset').parentElement.getBoundingClientRect()
      const footer = document.querySelector('textarea[required][maxlength="500"]').closest('label').parentElement.getBoundingClientRect()
      const label = el.parentElement.getBoundingClientRect()
      return scroll.bottom <= footer.top + 1 && label.top >= scroll.top && label.bottom <= scroll.bottom
    })).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`human-review-${width}.png`), fullPage: true })
  }
  await editor.getByRole('button', { name: 'Save Changes' }).click()
  await expect(editor).toHaveCount(0)
  expect(writes[0].payload.patch.is_human_reviewed).toBe(true)
  expect(writes[0].payload.expectedUpdatedAt).toBe('2026-10-12T00:00:00Z')
  expect(writes[0].payload.reason).toBe('Synthetic product details and pricing reviewed')
  expect(writes[0].payload.patch).not.toHaveProperty('published')
  expect(writes[0].payload.patch).not.toHaveProperty('status')
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await editor.getByRole('button', { name: /Pricing/ }).click()
  await expect(review).toBeChecked()
  await review.uncheck()
  await editor.getByLabel('Reason for this change').fill('Synthetic product needs another human review')
  await editor.getByRole('button', { name: 'Save Changes' }).click()
  await expect(editor).toHaveCount(0)
  expect(writes[1].payload.patch.is_human_reviewed).toBe(false)
})

test('failed human-review save preserves the unsaved decision and exact unchanged retry', async ({ page }) => {
  const writes = []
  const editor = await setup(page, async route => {
    writes.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
    if (writes.length === 1) return route.fulfill({ status: 503, json: { error: { code: 'DATABASE_UNAVAILABLE' } } })
    if (writes.length === 2) return route.fulfill({ status: 403, json: { error: { code: 'PRODUCT_ADMIN_REQUIRED' } } })
    await route.fulfill({ json: { ok: true, result: { sku: 'synthetic-review', status: 'Under Review', updatedAt: '2026-10-12T00:00:01Z' } } })
  })
  const review = editor.getByRole('checkbox', { name: 'I reviewed this product’s details and pricing' })
  await review.check()
  await editor.getByLabel('Reason for this change').fill('Synthetic reviewed product verification')
  await editor.getByRole('button', { name: 'Save Changes' }).click()
  await expect(editor.getByRole('alert')).toBeVisible()
  await expect(review).toBeChecked()
  await expect(review).toBeDisabled()
  await expect(editor.getByLabel('Reason for this change')).toBeDisabled()
  await expect(editor.getByRole('button', { name: 'Close product editor' })).toBeEnabled()
  await expect(editor.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled()
  await expect(editor.getByLabel('Reason for this change')).toHaveValue('Synthetic reviewed product verification')
  await editor.getByRole('button', { name: 'Review saved decision' }).click()
  const recovery = page.getByRole('dialog', { name: 'Saved product decision' })
  await recovery.getByRole('button', { name: 'Retry saved decision' }).click()
  await expect(recovery.getByRole('alert')).toContainText('Only an administrator')
  await expect(review).toBeDisabled()
  await recovery.getByRole('button', { name: 'Retry saved decision' }).click()
  await expect(editor).toHaveCount(0)
  expect(writes).toHaveLength(3); expect(writes[1]).toEqual(writes[0]); expect(writes[2]).toEqual(writes[0])
})

test('initial explicit version rejection permits cancelling and a fresh canonical read', async ({ page }) => {
  const editor = await setup(page, route => route.fulfill({ status: 409, json: { error: { code: 'PRODUCT_VERSION_CONFLICT' } } }))
  await editor.getByRole('checkbox', { name: 'I reviewed this product’s details and pricing' }).check()
  await editor.getByLabel('Reason for this change').fill('Synthetic stale product review refusal')
  await editor.getByRole('button', { name: 'Save Changes' }).click()
  await expect(editor.getByRole('alert')).toContainText('product changed')
  await expect(editor.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled()
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await editor.getByRole('button', { name: /Pricing/ }).click()
  await expect(editor.getByRole('checkbox', { name: 'I reviewed this product’s details and pricing' })).not.toBeChecked()
})

test('existing human review survives an unrelated detail save', async ({ page }) => {
  let patch
  const editor = await setup(page, async route => {
    patch = route.request().postDataJSON().payload.patch
    await route.fulfill({ json: { ok: true, result: { sku: 'synthetic-review', status: 'Under Review', updatedAt: '2026-10-12T00:00:01Z' } } })
  }, true)
  await expect(editor.getByRole('checkbox', { name: 'I reviewed this product’s details and pricing' })).toBeChecked()
  await editor.getByLabel('Reason for this change').fill('Synthetic unrelated detail verification')
  await editor.getByRole('button', { name: 'Save Changes' }).click()
  await expect(editor).toHaveCount(0)
  expect(patch.is_human_reviewed).toBe(true)
})
