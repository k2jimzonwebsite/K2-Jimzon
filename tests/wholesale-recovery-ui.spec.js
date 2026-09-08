import { expect, test } from '@playwright/test'

const inquiry = { publicReference: 'WI-0123456789ABCDEF', organizationName: 'Naviglio Pantry',
  businessType: 'cafe_restaurant', contactName: 'Mila Reyes', email: 'buyer@example.test',
  targetItems: 'Coffee beans and pantry items', volumeBand: 'starter', deliveryArea: 'Makati',
  status: 'submitted', updatedAt: '2026-08-22T08:00:00Z' }
const receipt = { publicReference: inquiry.publicReference, status: 'under_review',
  updatedAt: '2026-09-08T08:00:00.123456+00:00', commercialAuthorityAvailable: false }

async function setup(page, command) {
  await page.route('https://**/*', route => route.abort())
  await page.route('**/api/admin/customers', route => route.fulfill({ json: { ok: true, data: { customers: [], mode: 'canonical' } } }))
  await page.route('**/api/admin/wholesale-inquiries**', route => route.request().method() === 'GET'
    ? route.fulfill({ json: { ok: true, data: { inquiries: [inquiry] } } }) : command(route))
  await page.goto('/tests/fixtures/payment-harness.html?wholesale=1')
  const opener = page.getByRole('button', { name: /^(Review|Review inquiry)$/ }).filter({ visible: true })
  await opener.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Reason', exact: true }).fill('Business need reviewed with the requester')
  return { dialog, opener }
}

for (const failure of ['lost', 'unavailable', 'missing receipt']) test(`wholesale ${failure} retains the original review command`, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const calls = []
  let release
  const gate = new Promise(resolve => { release = resolve })
  const { dialog, opener } = await setup(page, async route => {
    calls.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
    if (calls.length === 1) {
      await gate
      if (failure === 'lost') return route.abort('failed')
      return route.fulfill(failure === 'unavailable'
        ? { status: 503, json: { error: { code: 'WHOLESALE_COMMAND_UNAVAILABLE' } } }
        : { json: { ok: true, result: { status: 'under_review' } } })
    }
    return route.fulfill({ json: { ok: true, result: receipt } })
  })
  await dialog.getByRole('button', { name: 'Record status' }).click()
  await expect.poll(() => calls.length).toBe(1)
  await expect(dialog.getByLabel('New status')).toBeDisabled()
  await expect(dialog.getByRole('textbox', { name: 'Reason', exact: true })).toBeDisabled()
  await dialog.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit() })
  expect(calls).toHaveLength(1)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  release()
  await expect(dialog).toContainText('may already be saved')
  await dialog.getByRole('button', { name: 'Retry same command' }).focus()
  await page.screenshot({ path: `docs/evidence/20260908-wholesale-retry/${failure.replaceAll(' ', '-')}-phone.png`, fullPage: true })
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  await expect(dialog.getByLabel('New status')).toBeDisabled()
  await dialog.getByRole('button', { name: 'Retry same command' }).click()
  await expect(dialog).toHaveCount(0)
  expect(calls).toHaveLength(2)
  expect(calls[1]).toEqual(calls[0])
  await expect(opener).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('wholesale rejection permits correction and uses a new identity', async ({ page }) => {
  const calls = []
  const { dialog } = await setup(page, route => {
    calls.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
    return route.fulfill(calls.length === 1
      ? { status: 409, json: { error: { code: 'WHOLESALE_STATUS_CONFLICT' } } }
      : { json: { ok: true, result: { ...receipt, status: 'closed' } } })
  })
  await dialog.getByRole('button', { name: 'Record status' }).click()
  await expect(dialog).toContainText('status changed')
  await expect(dialog.getByLabel('New status')).toBeEnabled()
  await dialog.getByLabel('New status').selectOption('closed')
  await dialog.getByRole('textbox', { name: 'Reason', exact: true }).fill('Request withdrawn after staff reconciliation')
  await dialog.getByRole('button', { name: 'Record status' }).click()
  await expect(dialog).toHaveCount(0)
  expect(calls[1].key).not.toBe(calls[0].key)
  expect(calls[1].body.toStatus).toBe('closed')
})

test('wholesale actor change prevents an old response closing the new review', async ({ page }) => {
  let release
  let sent = false
  const gate = new Promise(resolve => { release = resolve })
  const { dialog, opener } = await setup(page, async route => {
    sent = true
    await gate
    return route.fulfill({ json: { ok: true, result: receipt } })
  })
  await dialog.getByRole('button', { name: 'Record status' }).click()
  await expect.poll(() => sent).toBe(true)
  await page.evaluate(() => window.switchActor())
  await expect(dialog).toHaveCount(0)
  await opener.click()
  const response = page.waitForResponse('**/api/admin/wholesale-inquiries/review')
  release()
  await response
  await expect(dialog.getByRole('textbox', { name: 'Reason', exact: true })).toHaveValue('')
  await expect(dialog.getByLabel('New status')).toHaveValue('under_review')
})
