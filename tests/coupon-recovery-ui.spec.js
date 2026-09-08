import { expect, test } from '@playwright/test'

const coupon = { id: '11111111-1111-4111-8111-111111111111', code: 'REVIEWED10', description: 'Reviewed promotion',
  discount_type: 'percentage', discount_value: 10, min_spend: 0, max_redemptions: 100, redemption_count: 0,
  is_active: false, starts_at: null, ends_at: null, archived_at: null }

for (const action of ['create', 'activate', 'pause', 'archive']) {
  test(`${action} retains the frozen coupon command after a lost response`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const calls = []
    let loseResponse
    const responseGate = new Promise(resolve => { loseResponse = resolve })
    await page.route('https://**/*', route => route.abort())
    await page.route('**/api/admin/coupons**', async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { ok: true, data: { coupons: [{ ...coupon, is_active: action === 'pause' }] } } })
      calls.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
      if (calls.length === 1) {
        await responseGate
        if (action === 'archive') return route.fulfill({ status: 503, json: { error: { code: 'COUPON_COMMAND_UNAVAILABLE' } } })
        return route.abort('failed')
      }
      return route.fulfill({ json: { ok: true } })
    })
    await page.goto('/tests/fixtures/payment-harness.html?coupons=1')
    await expect(page.getByRole('heading', { name: 'Coupons & vouchers' })).toBeVisible({ timeout: 60000 })
    const opener = page.getByRole('button', { name: action === 'create' ? 'Create coupon' : action[0].toUpperCase() + action.slice(1), exact: true }).filter({ visible: true })
    await opener.click()
    const dialog = page.getByRole('dialog')
    if (action === 'create') {
      await dialog.getByLabel('Coupon code', { exact: true }).fill('NEWCODE10')
      await dialog.getByLabel('Description', { exact: true }).fill('Approved launch promotion')
      await dialog.getByLabel('Discount percent').fill('12.5')
      await dialog.getByLabel('Minimum spend (PHP)').fill('1250')
      await dialog.getByLabel('Maximum redemptions').fill('75')
      await dialog.getByLabel('Ends at').fill('2027-12-31T23:59')
      await dialog.getByLabel('Voucher-hunt campaign').check()
      await dialog.getByLabel('Public hunt clue').fill('Find the approved pantry promotion')
      await dialog.getByLabel('Reason for creating this promotion').fill('Owner approved the launch promotion')
    } else await dialog.getByLabel('Decision reason').fill('Owner reviewed this promotion decision')
    await dialog.getByRole('button', { name: action === 'create' ? 'Save coupon' : `Confirm ${action}`, exact: true }).click()
    await expect.poll(() => calls.length).toBe(1)
    for (const field of await dialog.locator('input, select, textarea').all()) await expect(field).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
    await dialog.evaluate(form => { form.requestSubmit(); form.requestSubmit() })
    expect(calls).toHaveLength(1)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    loseResponse()
    await expect(dialog).toContainText('may already be saved')
    for (const field of await dialog.locator('input, select, textarea').all()) await expect(field).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('button', { name: 'Retry same command' })).toBeFocused()
    await page.screenshot({ path: `docs/evidence/20260908-coupon-retry/${action}-uncertain-phone.png`, fullPage: true })
    await dialog.getByRole('button', { name: 'Retry same command' }).click()
    await expect(dialog).toHaveCount(0)
    expect(calls).toHaveLength(2)
    expect(calls[0].key).toMatch(/^[0-9a-f-]{36}$/)
    expect(calls[1]).toEqual(calls[0])
    await expect(opener).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

async function openCreation(page) {
  await page.goto('/tests/fixtures/payment-harness.html?coupons=1')
  await page.getByRole('button', { name: 'Create coupon', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Coupon code', { exact: true }).fill('NEWCODE10')
  await dialog.getByLabel('Description', { exact: true }).fill('Approved launch promotion')
  await dialog.getByLabel('Reason for creating this promotion').fill('Owner approved the launch promotion')
  return dialog
}

test('coupon rejection permits a corrected command with a different identity', async ({ page }) => {
  const calls = []
  await page.route('https://**/*', route => route.abort())
  await page.route('**/api/admin/coupons**', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { ok: true, data: { coupons: [] } } })
    calls.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
    return calls.length === 1
      ? route.fulfill({ status: 409, json: { error: { code: 'COUPON_CODE_CONFLICT' } } })
      : route.fulfill({ json: { ok: true } })
  })
  const dialog = await openCreation(page)
  await dialog.getByLabel('Discount percent').fill('0.5')
  await dialog.getByRole('button', { name: 'Save coupon' }).click()
  await expect(dialog).toContainText('Percentage discount must be between 1% and 100%')
  expect(calls).toHaveLength(0)
  await dialog.getByLabel('Discount percent').fill('10')
  await dialog.getByRole('button', { name: 'Save coupon' }).click()
  await expect(dialog.getByLabel('Coupon code', { exact: true })).toBeEnabled()
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeEnabled()
  await dialog.getByLabel('Coupon code', { exact: true }).fill('CORRECTED10')
  await dialog.getByRole('button', { name: 'Save coupon' }).click()
  await expect(dialog).toHaveCount(0)
  expect(calls).toHaveLength(2)
  expect(calls[1].body.code).toBe('CORRECTED10')
  expect(calls[1].key).not.toBe(calls[0].key)
})

test('coupon dialogs restore the keyboard trigger after cancellation on a short viewport', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('https://**/*', route => route.abort())
  await page.route('**/api/admin/coupons**', route => route.fulfill({ json: { ok: true, data: { coupons: [coupon] } } }))
  await page.goto('/tests/fixtures/payment-harness.html?coupons=1')
  for (const name of ['Create coupon', 'Activate']) {
    const opener = page.getByRole('button', { name, exact: true }).filter({ visible: true })
    await opener.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).focus()
    await page.screenshot({ path: `docs/evidence/20260908-coupon-retry/${name === 'Activate' ? 'decision' : 'create'}-landscape.png`, fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()
  }
})

test('coupon actor change discards late completion and the old form', async ({ page }) => {
  let finish
  let sent = false
  const responseGate = new Promise(resolve => { finish = resolve })
  await page.route('https://**/*', route => route.abort())
  await page.route('**/api/admin/coupons**', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { ok: true, data: { coupons: [] } } })
    sent = true
    await responseGate
    return route.fulfill({ json: { ok: true } })
  })
  const dialog = await openCreation(page)
  await dialog.getByRole('button', { name: 'Save coupon' }).click()
  await expect.poll(() => sent).toBe(true)
  await page.evaluate(() => window.switchActor())
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Create coupon', exact: true }).click()
  await expect(dialog.getByLabel('Coupon code', { exact: true })).toHaveValue('')
  finish()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Coupon code', { exact: true })).toHaveValue('')
  await expect(page.getByText(/Coupon NEWCODE10 saved/)).toHaveCount(0)
})
