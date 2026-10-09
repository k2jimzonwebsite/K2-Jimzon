import { expect, test } from '@playwright/test'

const cancellationKey = 'k2-order-cancellation-pending-v1:11111111-1111-4111-8111-111111111111:33333333-3333-4333-8333-333333333333'
const cancellationRow = timestamp => ({ id: '33333333-3333-4333-8333-333333333333', public_reference: 'WEB-DUMMYCANCEL01', updated_at: timestamp, payment_status: 'not_requested' })
async function cancellationPage(page, read, write) {
  await page.route('https://fixture.supabase.co/**', route => route.abort())
  await page.context().addCookies([{ name: 'k2_admin_csrf', value: 'synthetic-cancellation-csrf', url: 'http://localhost:5181' }])
  await page.route('**/api/admin/fulfillment', route => route.fulfill({ json: { ok: true, data: { submitted: read(), confirmed: [] } } }))
  await page.route('**/api/admin/fulfillment/cancel', write)
  await page.goto('/tests/fixtures/admin-product-master-harness.html?surface=cancellation')
}
async function reviewCancellation(page) {
  await page.getByRole('button', { name: 'Review dummy cancellation', exact: true }).click()
  await expect(page.getByText('Order: submitted · Payment: not requested', { exact: true })).toBeVisible()
  await page.getByLabel('Cancellation reason', { exact: true }).fill('Synthetic customer cancellation request')
  await page.getByRole('checkbox', { name: /I reviewed this order/ }).check()
}
const cancellationReceipt = { ok: true, result: { orderRequestId: '33333333-3333-4333-8333-333333333333', publicReference: 'WEB-DUMMYCANCEL01', status: 'cancelled', paymentStatus: 'not_requested' } }

test('cancellation recovery survives lost reply and missing queue, permission refusal and actor switch', async ({ page }, testInfo) => {
  let present = true; const writes = []
  await cancellationPage(page, () => present ? [cancellationRow('2026-10-08T04:00:00Z')] : [], async route => {
    writes.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
    if (writes.length === 1) { present = false; return route.abort() }
    if (writes.length === 2) return route.fulfill({ status: 403, json: { error: { code: 'CANCELLATION_ACCESS_REQUIRED' } } })
    return route.fulfill({ json: cancellationReceipt })
  })
  await reviewCancellation(page)
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('command stays saved')
  const saved = await page.evaluate(key => localStorage.getItem(key), cancellationKey)
  expect(saved).not.toMatch(/token|csrf|secret/i)
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Switch synthetic staff' }).click()
  await expect(page.getByRole('region', { name: 'Pending cancellations' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Switch synthetic staff' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Review pending cancellation WEB-DUMMYCANCEL01', exact: true }).click()
  await page.getByRole('button', { name: 'Retry pending cancellation' }).click()
  await expect(page.getByRole('alert')).toContainText('command stays saved')
  expect(await page.evaluate(key => localStorage.getItem(key), cancellationKey)).toBe(saved)
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`cancellation-${width}.png`), fullPage: true })
  }
  await page.getByRole('button', { name: 'Retry pending cancellation' }).click()
  await expect(page.getByRole('status')).toContainText('Cancellation confirmed')
  expect(writes).toHaveLength(3); expect(writes[1]).toEqual(writes[0]); expect(writes[2]).toEqual(writes[0])
  expect(await page.evaluate(key => localStorage.getItem(key), cancellationKey)).toBeNull()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('cancellation queued retry never becomes a fresh command after another tab resolves it', async ({ page }) => {
  let writes = 0
  await cancellationPage(page, () => [cancellationRow('2026-10-08T04:00:00Z')], route => { writes++; return route.abort() })
  await reviewCancellation(page); await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('command stays saved')
  await page.evaluate(async key => {
    let entered
    const ready = new Promise(resolve => { entered = resolve })
    window.cancellationTestLock = navigator.locks.request(key, () => new Promise(resolve => { window.releaseCancellationTestLock = resolve; entered() }))
    await ready
  }, cancellationKey)
  await page.getByRole('button', { name: 'Retry pending cancellation' }).click()
  await expect(page.getByRole('button', { name: 'Confirming cancellation…' })).toBeDisabled()
  await page.evaluate(key => { localStorage.removeItem(key); window.releaseCancellationTestLock() }, cancellationKey)
  await expect(page.getByRole('alert')).toContainText('changed in another tab')
  expect(writes).toBe(1)
})

test('cancellation late receipt resolves only its original staff record', async ({ page }) => {
  let release
  const held = new Promise(resolve => { release = resolve })
  await cancellationPage(page, () => [cancellationRow('2026-10-08T04:00:00Z')], async route => { await held; return route.fulfill({ json: cancellationReceipt }) })
  await reviewCancellation(page); await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), cancellationKey)).not.toBeNull()
  // Simulate an external session switch while the protected dialog owns focus.
  await page.getByRole('button', { name: 'Switch synthetic staff' }).evaluate(button => button.click())
  await expect(page.getByRole('region', { name: 'Pending cancellations' })).toHaveCount(0)
  release()
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), cancellationKey)).toBeNull()
  await expect(page.getByText(/Cancellation confirmed/)).toHaveCount(0)
})

test('cancellation stale version requires refreshed order and explicit new review', async ({ page }) => {
  let timestamp = '2026-10-08T04:00:00Z'; const writes = []
  await cancellationPage(page, () => [cancellationRow(timestamp)], async route => {
    writes.push(route.request().postDataJSON())
    if (writes.length === 1) { timestamp = '2026-10-08T04:01:00Z'; return route.fulfill({ status: 409, json: { error: { code: 'CANCELLATION_VERSION_CONFLICT' } } }) }
    return route.fulfill({ json: cancellationReceipt })
  })
  await reviewCancellation(page); await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Refresh and review')
  expect(await page.evaluate(key => localStorage.getItem(key), cancellationKey)).toBeNull()
  await page.getByRole('button', { name: 'Refresh order' }).click()
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Cancellation confirmed')
  expect(writes[1].expectedUpdatedAt).toBe(timestamp)
})

test('cancellation malformed success receipts retain the exact command until a valid confirmation', async ({ page }) => {
  const writes = []
  const malformed = [{ publicReference: '' }, { paymentStatus: 'unknown-malformed' }, { publicReference: 'X'.repeat(81) }]
  await cancellationPage(page, () => [cancellationRow('2026-10-08T04:00:00Z')], route => {
    writes.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
    return route.fulfill({ json: { ...cancellationReceipt, result: { ...cancellationReceipt.result, ...(malformed[writes.length - 1] || {}) } } })
  })
  await reviewCancellation(page); await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('command stays saved')
  const saved = await page.evaluate(key => localStorage.getItem(key), cancellationKey)
  for (let retry = 0; retry < 2; retry++) {
    await page.getByRole('button', { name: 'Retry pending cancellation' }).click()
    await expect.poll(() => writes.length).toBe(retry + 2)
    await expect(page.getByRole('alert')).toContainText('command stays saved')
    expect(await page.evaluate(key => localStorage.getItem(key), cancellationKey)).toBe(saved)
  }
  await page.getByRole('button', { name: 'Retry pending cancellation' }).click()
  await expect(page.getByRole('status')).toContainText('Cancellation confirmed')
  expect(writes).toHaveLength(4)
  for (const write of writes) expect(write).toEqual(writes[0])
  expect(await page.evaluate(key => localStorage.getItem(key), cancellationKey)).toBeNull()
})

test('cancellation malformed recovery is preserved and refuses a new write', async ({ page }) => {
  const writes = []
  await page.addInitScript(key => localStorage.setItem(key, '{malformed'), cancellationKey)
  await cancellationPage(page, () => [cancellationRow('2026-10-08T04:00:00Z')], route => { writes.push(route.request()); return route.fulfill({ json: cancellationReceipt }) })
  await page.getByRole('button', { name: 'Review dummy cancellation' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('cannot be restored safely')
  await expect(page.getByRole('button', { name: 'Cancel order', exact: true })).toBeDisabled()
  expect(writes).toHaveLength(0)
  expect(await page.evaluate(key => localStorage.getItem(key), cancellationKey)).toBe('{malformed')
})

const expressId = '33333333-3333-4333-8333-333333333333'
const pendingExpressKey = `k2-express-quote-pending-v1:11111111-1111-4111-8111-111111111111:${expressId}`
async function expressPage(page, handle) {
  await page.route('https://fixture.supabase.co/**', route => route.abort())
  await page.context().addCookies([{ name: 'k2_admin_csrf', value: 'synthetic-express-csrf', url: 'http://localhost:5181' }])
  await page.route('**/api/admin/delivery/express-quote*', handle)
  await page.goto('/tests/fixtures/admin-product-master-harness.html?surface=express-quote')
  await expect(page.getByText('Current quotation version 0', { exact: true })).toBeVisible()
}
async function reviewExpress(page) {
  await page.getByRole('combobox', { name: 'Courier', exact: true }).selectOption('Grab')
  await page.getByLabel('Delivery fee (₱)', { exact: true }).fill('150.25')
  const manila = offset => new Date(Date.now() + offset + 8 * 3600000).toISOString().slice(0, 16)
  await page.getByLabel('Quoted at (Manila time)').fill(manila(-60000))
  await page.getByLabel('Expires at (Manila time)').fill(manila(3600000))
  for (const [label, value] of [['Checked pickup and drop-off', 'Synthetic warehouse to dummy NCR address'],
    ['Package size, weight and handling', 'Synthetic 2 kg protected grocery parcel'],
    ['Current availability and proposed timing', 'Synthetic availability reviewed for the next hour'],
    ['Courier quotation evidence', 'synthetic:quote-evidence'], ['Quotation note', 'Synthetic readiness rehearsal only']]) await page.getByLabel(label, { exact: true }).fill(value)
  await page.getByRole('checkbox', { name: /I checked the route/ }).check()
}
const expressHead = (version = 0, eligible = true) => ({ ok: true, orderRequestId: expressId, currentVersion: version, eligible,
  quote: version ? { quoteVersion: version, courier: 'Grab', feeMinor: 15025, proposedTotal: 250.25, availabilityNote: 'Synthetic observed timing' } : null })

test('express staff quotation retains the exact lost-response command through reload and permission refusal', async ({ page }, testInfo) => {
  let version = 0
  const writes = []
  await expressPage(page, route => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: expressHead(version) })
    writes.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
    expect(route.request().headers()['x-k2-csrf']).toBe('synthetic-express-csrf')
    if (writes.length === 1) { version = 1; return route.abort('failed') }
    if (writes.length === 2) return route.fulfill({ status: 403, json: { error: { code: 'DELIVERY_ACCESS_REQUIRED' } } })
    return route.fulfill({ status: 200, json: { ok: true, receipt: { orderRequestId: expressId, quoteVersion: 1 } } })
  })
  expect(await page.getByRole('combobox', { name: 'Courier', exact: true }).inputValue()).toBe('')
  expect(await page.getByLabel('Delivery fee (₱)', { exact: true }).inputValue()).toBe('')
  await reviewExpress(page)
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`express-staff-${width}.png`), fullPage: true })
  }
  await page.getByRole('button', { name: 'Publish quotation for customer review' }).click()
  await expect(page.getByRole('button', { name: 'Retry pending quotation' })).toBeVisible()
  const held = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), pendingExpressKey)
  expect(held.body.feeMinor).toBe(15025)
  expect(Object.keys(held.body)).toHaveLength(11)
  await page.reload()
  await expect(page.getByText('Current quotation version 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Retry pending quotation' }).click()
  await expect(page.getByRole('alert')).toContainText('two-factor')
  await page.getByRole('button', { name: 'Retry pending quotation' }).click()
  await expect(page.getByRole('status')).toContainText('customer must approve')
  expect(writes).toHaveLength(3)
  expect(writes[1]).toEqual(writes[0]); expect(writes[2]).toEqual(writes[0])
  expect(await page.evaluate(key => localStorage.getItem(key), pendingExpressKey)).toBeNull()
})

test('express staff stale quote requires refresh and renewed review', async ({ page }) => {
  let version = 0
  let writes = 0
  await expressPage(page, route => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: expressHead(version) })
    writes += 1; version = 1
    return route.fulfill({ status: 409, json: { error: { code: 'EXPRESS_QUOTE_STALE' } } })
  })
  await reviewExpress(page)
  await page.getByRole('button', { name: 'Publish quotation for customer review' }).click()
  await expect(page.getByRole('alert')).toContainText('superseded')
  await expect(page.getByRole('button', { name: 'Publish quotation for customer review' })).toBeDisabled()
  expect(await page.evaluate(key => localStorage.getItem(key), pendingExpressKey)).toBeNull()
  await page.getByRole('button', { name: 'Refresh quotation' }).click()
  await expect(page.getByText('Current quotation version 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publish quotation for customer review' })).toBeDisabled()
  expect(writes).toBe(1)
})

test('express staff identity switch keeps the previous unknown command isolated', async ({ page }) => {
  let release
  const heldReply = new Promise(resolve => { release = resolve })
  const writes = []
  await expressPage(page, async route => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: expressHead() })
    writes.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
    if (writes.length === 1) { await heldReply; return route.abort('failed') }
    return route.fulfill({ status: 200, json: { ok: true, receipt: { orderRequestId: expressId, quoteVersion: 1 } } })
  })
  await reviewExpress(page)
  await page.getByRole('button', { name: 'Publish quotation for customer review' }).click()
  await expect.poll(() => writes.length).toBe(1)
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Switch synthetic staff').click())
  await expect(page.getByText('Current quotation version 0', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry pending quotation' })).toHaveCount(0)
  release()
  await page.evaluate(key => navigator.locks.request(key, () => {}), pendingExpressKey)
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).key, pendingExpressKey)).toBe(writes[0].key)
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Switch synthetic staff').click())
  await page.getByRole('button', { name: 'Retry pending quotation' }).click()
  await expect(page.getByRole('status')).toContainText('published')
  expect(writes[1]).toEqual(writes[0])
})

test('express staff corrupt saved quotation refuses before HTTP', async ({ page }) => {
  let writes = 0
  await expressPage(page, route => {
    if (route.request().method() !== 'GET') writes += 1
    return route.fulfill({ status: 200, json: expressHead() })
  })
  await page.evaluate(key => localStorage.setItem(key, '{broken'), pendingExpressKey)
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('cannot be restored safely')
  await expect(page.getByRole('button', { name: 'Publish quotation for customer review' })).toBeDisabled()
  expect(writes).toBe(0)
  expect(await page.evaluate(key => localStorage.getItem(key), pendingExpressKey)).toBe('{broken')
})

const rateAreas = ['NCR', 'Greater Luzon', 'Visayas', 'Mindanao']
const syntheticRates = () => Object.fromEntries(rateAreas.map(area => [area, { baseMinor: 9500, includedWeightG: 3000, extraKgMinor: 0, roundMinor: 500 }]))
const pendingRateKey = 'k2-customer-rates-pending-v1:11111111-1111-4111-8111-111111111111'
async function customerRatesPage(page, handle, role = 'Staff') {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.context().addCookies([{ name: 'k2_admin_csrf', value: 'synthetic-rate-csrf', url: 'http://localhost:5181' }])
  await page.route('**/api/admin/delivery/customer-rates', handle)
  await page.goto(`/tests/fixtures/admin-product-master-harness.html?surface=customer-rates&role=${role}`)
  await expect(page.getByRole('heading', { name: 'Customer delivery rates', exact: true })).toBeVisible()
}
async function reviewCustomerRates(page) {
  await page.getByLabel('Change reason', { exact: true }).fill('Synthetic reviewed regional change')
  await page.getByLabel('Evidence reference', { exact: true }).fill('synthetic:rate-evidence')
  await page.getByRole('checkbox', { name: /I reviewed all four regions/ }).check()
}

test('customer rates Staff editor retains one publication across reload permission denial and retry', async ({ page }, testInfo) => {
  let current = { policy: 'jt_current', version: 2, rates: syntheticRates(), reason: 'Synthetic saved reason', evidenceRef: 'synthetic:saved' }
  const writes = []
  await customerRatesPage(page, async route => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: { ok: true, result: { current, future: { active: false } } } })
    writes.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
    if (writes.length === 1) { current = { ...current, version: 3, rates: writes[0].body.rates }; return route.abort('failed') }
    if (writes.length === 2) return route.fulfill({ status: 403, json: { error: { code: 'CUSTOMER_TARIFF_STAFF_REQUIRED' } } })
    return route.fulfill({ status: 200, json: { ok: true, result: { policy: 'jt_current', version: 3 } } })
  })
  await expect(page.getByText('Saved customer rate version 2')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Carrier cost pilot' })).toHaveCount(0)
  const ncr = page.locator('fieldset').filter({ has: page.locator('legend', { hasText: /^NCR$/ }) }).last()
  await ncr.getByLabel('Base fee (₱)', { exact: true }).fill('95.15')
  await reviewCustomerRates(page)
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: testInfo.outputPath(`customer-rates-${width}.png`), fullPage: true })
  }
  await page.getByRole('button', { name: 'Publish customer rates', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Retry pending rate change' })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Saved customer rate version 3')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry pending rate change' })).toBeVisible()
  await page.getByRole('button', { name: 'Retry pending rate change' }).click()
  await expect(page.getByRole('alert')).toContainText('two-factor')
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).key, pendingRateKey)).toBe(writes[0].key)
  await page.getByRole('button', { name: 'Retry pending rate change' }).click()
  await expect(page.getByRole('status')).toContainText('published as version 3')
  expect(writes).toHaveLength(3)
  expect(writes[1]).toEqual(writes[0])
  expect(writes[2]).toEqual(writes[0])
  expect(writes[0].body.rates.NCR.baseMinor).toBe(9515)
  expect(writes[0].body.rates.NCR.extraKgMinor).toBe(0)
  expect(writes[0].body.expectedVersion).toBe(2)
  expect(await page.evaluate(key => localStorage.getItem(key), pendingRateKey)).toBeNull()
})

test('customer rates stale version requires refresh and fresh review before another publication', async ({ page }) => {
  let current = { policy: 'jt_current', version: 2, rates: syntheticRates() }
  const writes = []
  let failReads = false
  await customerRatesPage(page, route => {
    if (route.request().method() === 'GET') return route.fulfill(failReads ? { status: 503, json: { error: { code: 'CUSTOMER_TARIFF_UNAVAILABLE' } } } : { status: 200, json: { ok: true, result: { current } } })
    writes.push(route.request().postDataJSON())
    if (writes.length === 1) { current = { ...current, version: 3 }; return route.fulfill({ status: 409, json: { error: { code: 'CUSTOMER_TARIFF_VERSION_STALE' } } }) }
    failReads = true
    return route.fulfill({ status: 200, json: { ok: true, result: { policy: 'jt_current', version: 4 } } })
  }, 'Admin')
  await expect(page.getByText('Saved customer rate version 2')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Carrier cost pilot' })).toBeVisible()
  await reviewCustomerRates(page)
  await page.getByRole('button', { name: 'Publish customer rates', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('latest version')
  await expect(page.getByRole('button', { name: 'Publish customer rates', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Refresh saved rates' }).click()
  await expect(page.getByText('Saved customer rate version 3')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /I reviewed/ })).not.toBeChecked()
  await reviewCustomerRates(page)
  await page.getByRole('button', { name: 'Publish customer rates', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'published as version 4' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable')
  await expect(page.getByRole('button', { name: 'Publish customer rates', exact: true })).toBeDisabled()
  expect(writes[1].expectedVersion).toBe(3)
})

test('customer rates empty matrix and unavailable persistence never publish invented values', async ({ page }) => {
  let writes = 0
  await customerRatesPage(page, route => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: { ok: true, result: { current: null } } })
    writes += 1
    return route.abort('failed')
  })
  await expect(page.getByText(/No customer rates published/)).toBeVisible()
  await expect(page.getByLabel('Base fee (₱)', { exact: true }).first()).toHaveValue('')
  await reviewCustomerRates(page)
  await page.getByRole('button', { name: 'Publish customer rates', exact: true }).click()
  expect(writes).toBe(0)
  for (const label of ['Base fee (₱)', 'Each extra kg (₱)', 'Round fee up to (₱)']) {
    for (const input of await page.getByLabel(label, { exact: true }).all()) await input.fill(label === 'Each extra kg (₱)' ? '0' : '95.15')
  }
  for (const input of await page.getByLabel('Included weight (grams)', { exact: true }).all()) await input.fill('3000')
  await page.getByRole('checkbox', { name: /I reviewed/ }).check()
  await page.evaluate(key => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(name, value) { if (name === key) throw new DOMException('Synthetic denial', 'QuotaExceededError'); return original.call(this, name, value) }
  }, pendingRateKey)
  await page.getByRole('button', { name: 'Publish customer rates', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  expect(writes).toBe(0)
})

test('customer rates queued retry stops after another tab resolved the publication', async ({ page }) => {
  let writes = 0
  await customerRatesPage(page, route => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: { ok: true, result: { current: { policy: 'jt_current', version: 2, rates: syntheticRates() } } } })
    writes += 1
    return route.abort('failed')
  })
  await expect(page.getByText('Saved customer rate version 2')).toBeVisible()
  await reviewCustomerRates(page)
  await page.getByRole('button', { name: 'Publish customer rates', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Retry pending rate change' })).toBeVisible()
  await page.evaluate(key => new Promise(acquired => {
    window.syntheticRateLock = navigator.locks.request(key, () => new Promise(release => { window.syntheticRateRelease = release; acquired() }))
  }), pendingRateKey)
  await page.evaluate(key => {
    Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Retry pending rate change').click()
    localStorage.removeItem(key)
    window.syntheticRateRelease()
  }, pendingRateKey)
  await expect(page.getByRole('status').filter({ hasText: 'resolved in another tab' })).toBeVisible()
  expect(writes).toBe(1)
})

test('customer rates changed actor cannot consume a late receipt or the previous pending change', async ({ page }) => {
  let finish
  let writes = 0
  await customerRatesPage(page, async route => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: { ok: true, result: { current: { policy: 'jt_current', version: 2, rates: syntheticRates() } } } })
    writes += 1
    await new Promise(resolve => { finish = resolve })
    return route.fulfill({ status: 200, json: { ok: true, result: { policy: 'jt_current', version: 3 } } })
  })
  await expect(page.getByText('Saved customer rate version 2')).toBeVisible()
  await reviewCustomerRates(page)
  await page.getByRole('button', { name: 'Publish customer rates', exact: true }).click()
  await expect.poll(() => writes).toBe(1)
  await page.getByRole('button', { name: 'Switch synthetic staff' }).click()
  await expect(page.getByText('Saved customer rate version 2')).toBeVisible()
  finish()
  await page.evaluate(() => navigator.locks.request('k2-customer-rates-pending-v1:11111111-1111-4111-8111-111111111111', () => {}))
  await expect(page.getByText(/published as version/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Retry pending rate change' })).toHaveCount(0)
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).actorId, pendingRateKey)).toBe('11111111-1111-4111-8111-111111111111')
  expect(writes).toBe(1)
})

const product = {
  sku: 'K2-SKU-001001',
  name: 'Rigatoni di Gragnano 500g',
  short: 'Rigatoni 500g',
  barcode: '8001234567890',
  status: 'Draft',
  published: false,
  brand_id: null,
  category_id: null,
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
  total_stock: 0,
  primary_image_url: '/placeholder.png',
  is_human_reviewed: true,
  updated_at: '2026-08-26T00:00:00.000Z',
}

test('keeps secure Product Master edit, lifecycle, and delete decisions usable at 375px', async ({ page }, testInfo) => {
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
  let updatePayload = null
  await page.route('**/api/admin/product-master*', route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        ok: true,
        product,
        taxonomyReview: {
          status: 'eligible',
          brandOptions: [{ id: 'f8c1e338-e2a4-4d09-858a-1cf223400001', name: 'Existing brand' }],
          categoryOptions: [{ id: 'f8c1e338-e2a4-4d09-858a-1cf223400002', name: 'Existing category' }],
          originalBrandId: null,
          originalCategoryId: null,
        },
      }) })
    }
    const body = route.request().postDataJSON()
    const action = body?.action
    if (action === 'update') updatePayload = body.payload
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        result: action === 'delete' ? { ok: false, code: 'PRODUCT_HAS_HISTORY' } : { success: true },
      }),
    })
  })

  await page.goto('/tests/fixtures/admin-product-master-harness.html', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: 'Inventory & stock checks' })).toBeVisible()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Edit Product' })
  await expect(editor).toBeVisible()
  await expect(editor.getByText('Reason for this change')).toBeVisible()
  await expect(editor.getByText('Initial brand and category')).toBeVisible()
  await expect(editor.getByLabel('Expiry Date')).toBeDisabled()
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const descriptionToggle = editor.getByRole('button', { name: 'Product description' })
    const useToggle = editor.getByRole('button', { name: 'Use & ingredients' })
    await expect(descriptionToggle).toHaveAttribute('aria-expanded', 'false')
    await expect(useToggle).toHaveAttribute('aria-expanded', 'false')
    await descriptionToggle.focus()
    await page.keyboard.press('Enter')
    const description = editor.locator('textarea').first()
    await description.fill('Staff draft retained across sections.')
    await descriptionToggle.click()
    await useToggle.click()
    const instructions = editor.locator('textarea').first()
    await instructions.fill('Cook in boiling water.')
    await useToggle.click()
    await editor.getByRole('button', { name: 'Pricing & stock', exact: true }).click()
    await expect(editor.getByRole('button', { name: 'Website settings' })).toBeVisible()
    await expect(editor.getByRole('button', { name: 'Status & staff notes' })).toBeVisible()
    await editor.getByRole('button', { name: 'Details', exact: true }).click()
    await descriptionToggle.click()
    await expect(description).toHaveValue('Staff draft retained across sections.')
    await descriptionToggle.click()
    await useToggle.click()
    await expect(instructions).toHaveValue('Cook in boiling water.')
    await useToggle.click()
    expect(await editor.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: testInfo.outputPath(`inventory-${width}.png`), fullPage: false })
  }
  await page.setViewportSize({ width: 375, height: 812 })
  expect(await editor.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
  await page.screenshot({ path: testInfo.outputPath('product-master-edit-mobile.png'), fullPage: true })
  await editor.getByLabel('Brand').selectOption('f8c1e338-e2a4-4d09-858a-1cf223400001')
  await editor.getByLabel('Canonical category').selectOption('f8c1e338-e2a4-4d09-858a-1cf223400002')
  await editor.getByLabel('Reason for this change').fill('Assign reviewed canonical taxonomy.')
  await editor.getByRole('button', { name: 'Save Changes' }).click()
  expect(updatePayload).toMatchObject({
    sku: product.sku,
    patch: {
      brand_id: 'f8c1e338-e2a4-4d09-858a-1cf223400001',
      category_id: 'f8c1e338-e2a4-4d09-858a-1cf223400002',
    },
    reason: 'Assign reviewed canonical taxonomy.',
  })
  expect(updatePayload.patch).not.toHaveProperty('expiry_date')
  await expect(editor).toHaveCount(0)

  await page.getByRole('button', { name: 'Review', exact: true }).click()
  const statusDialog = page.getByRole('dialog', { name: 'Set Under Review' })
  await expect(statusDialog).toBeVisible()
  await statusDialog.getByLabel('Reason for the status change').fill('Reviewed package and publication evidence.')
  expect(await statusDialog.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
  await page.screenshot({ path: testInfo.outputPath('product-master-status-mobile.png'), fullPage: true })
  await statusDialog.getByRole('button', { name: 'Close status decision' }).click()

  await page.getByRole('button', { name: 'Delete product' }).click()
  const deleteDialog = page.getByRole('dialog', { name: 'Delete 1 product?' })
  await expect(deleteDialog).toBeVisible()
  await expect(deleteDialog.getByLabel('Your 4-digit delete PIN')).toBeFocused()
  await deleteDialog.getByLabel('Reason for permanent deletion').fill('Duplicate setup record with history review.')
  await deleteDialog.getByLabel('Your 4-digit delete PIN').fill('1234')
  expect(await deleteDialog.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
  await page.screenshot({ path: testInfo.outputPath('product-master-delete-mobile.png'), fullPage: true })
  await deleteDialog.getByRole('button', { name: 'Delete 1 product' }).click()
  await expect(deleteDialog).toContainText('has stock, listings, or operational history')
})

test('an unconfirmed deletion freezes the form and retries the same identity', async ({ page }) => {
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
  const keys = []
  let failOpen = true
  await page.route('**/api/admin/product-master*', route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, product }) })
    }
    keys.push(route.request().headers()['x-k2-idempotency-key'])
    if (failOpen) return route.abort('failed')
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, result: { ok: true, deleted_count: 1 } }) })
  })

  await page.goto('/tests/fixtures/admin-product-master-harness.html', { waitUntil: 'domcontentloaded' })

  await page.getByRole('button', { name: 'Delete product' }).click()
  const deleteDialog = page.getByRole('dialog', { name: 'Delete 1 product?' })
  await expect(deleteDialog).toBeVisible()
  await deleteDialog.getByLabel('Reason for permanent deletion').fill('Duplicate setup record with history review.')
  await deleteDialog.getByLabel('Your 4-digit delete PIN').fill('1234')
  await deleteDialog.getByRole('button', { name: 'Delete 1 product' }).click()
  await expect(deleteDialog).toContainText('may already have completed')
  await expect(deleteDialog.getByLabel('Reason for permanent deletion')).toBeDisabled()
  await expect(deleteDialog.getByLabel('Your 4-digit delete PIN')).toBeDisabled()
  failOpen = false
  await deleteDialog.getByRole('button', { name: 'Retry same deletion' }).click()
  await expect(deleteDialog).toHaveCount(0)
  expect(keys).toHaveLength(2)
  expect(keys[1]).toBe(keys[0])
})
