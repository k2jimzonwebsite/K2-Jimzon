import { expect, test } from '@playwright/test'
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
})

for (const query of ['quote=pending', 'quote=quoted', 'quote=unrecognized', 'nullTotal=1']) {
  test(`pending final charge blocks positive payment steps: ${query}`, async ({ page }, testInfo) => {
    if (query === 'quote=pending') await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/tests/fixtures/payment-harness.html?${query}&state=not_requested`)
    await page.getByRole('button', { name: 'Review local payment' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('final total need buyer acceptance')
    await expect(dialog.getByRole('button', { name: 'Record transition' })).toHaveCount(0)
    await expect(dialog.getByLabel('Next valid state')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (query === 'quote=pending' || query === 'quote=unrecognized') await page.screenshot({ path: testInfo.outputPath('pending-payment.png'), fullPage: true })
  })
}

test('pending final charge still permits refund recovery', async ({ page }) => {
  await page.goto('/tests/fixtures/payment-harness.html?quote=pending&state=verified')
  await page.getByRole('button', { name: 'Review local payment' }).click()
  await expect(page.getByLabel('Next valid state')).toHaveValue('refunded')
  await expect(page.getByLabel('Next valid state').locator('option')).toHaveCount(1)
})

for (const viewport of [{ width: 375, height: 812 }, { width: 844, height: 390 }, { width: 1280, height: 900 }]) {
  test(`correct rejected evidence safely at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/tests/fixtures/payment-harness.html')
    await page.getByRole('button', { name: 'Review local payment' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Next valid state')).toHaveValue('evidence_submitted')
    await expect(dialog).toContainText('different staff member')
    await dialog.getByLabel('Payment reference number').fill('GCash reference reconciled with payer')
    await dialog.getByRole('button', { name: 'Record transition' }).click()
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => window.finishPayment())
    await expect(dialog).not.toBeVisible()
    await expect(page.getByRole('status')).toContainText('evidence_submitted')
    await expect(page.getByRole('button', { name: 'Review local payment' })).toBeFocused()
  })
}
test('legacy failure stays blocked until the protected recovery boundary is active', async ({ page }) => {
  await page.goto('/tests/fixtures/payment-harness.html?legacy=1')
  await page.getByRole('button', { name: 'Review local payment' }).click()
  await expect(page.getByRole('dialog')).toContainText('protected payment workflow')
  await expect(page.getByRole('button', { name: 'Record transition' })).toHaveCount(0)
})
test('uncertain outcome keeps evidence and shows reconciliation feedback', async ({ page }) => {
  await page.goto('/tests/fixtures/payment-harness.html?uncertain=1')
  await page.getByRole('button', { name: 'Review local payment' }).click()
  await page.getByLabel('Payment reference number').fill('Corrected GCash reference')
  await page.getByRole('button', { name: 'Record transition' }).click()
  await page.evaluate(() => window.finishPayment())
  await expect(page.getByRole('dialog')).toContainText('Reconcile before retrying')
  await expect(page.getByLabel('Payment reference number')).toHaveValue('Corrected GCash reference')
})

test('submits structured payment evidence with method, amount, payer and reference', async ({ page }) => {
  await page.goto('/tests/fixtures/payment-harness.html')
  await page.getByRole('button', { name: 'Review local payment' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Payment method').selectOption('maya')
  await dialog.getByLabel('Payment amount (PHP)').fill('2500.50')
  await dialog.getByLabel('Payer name').fill('Maria Santos')
  await dialog.getByLabel('Payment reference number').fill('MAYA-REF-9988')
  await dialog.getByLabel('Proof asset reference (optional)').fill('https://receipts.example.test/proof.png')
  await dialog.getByLabel('Evidence notes / remarks (optional)').fill('Transferred via Maya app')
  await dialog.getByRole('button', { name: 'Record transition' }).click()
  await page.evaluate(() => window.finishPayment())
  const evidence = await page.evaluate(() => window.lastEvidence)
  expect(evidence).toEqual({
    method: 'maya',
    amount: 2500.5,
    currency: 'PHP',
    payerName: 'Maria Santos',
    paymentReference: 'MAYA-REF-9988',
    proofAssetRef: 'https://receipts.example.test/proof.png',
  })
})

test('independent verification displays submitted evidence and enforces merchant receipt confirmation', async ({ page }) => {
  await page.goto('/tests/fixtures/payment-harness.html?state=evidence_submitted&evidence=1')
  await page.getByRole('button', { name: 'Review local payment' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Next valid state')).toHaveValue('verified')
  await expect(dialog).toContainText('Submitted Payment Evidence for Review')
  await expect(dialog).toContainText('GCASH')
  await expect(dialog).toContainText('₱1,250.00 PHP')
  await expect(dialog).toContainText('Juan dela Cruz')
  await expect(dialog).toContainText('GCASH-REF-001')
  await dialog.getByRole('button', { name: 'Record transition' }).click()
  await expect(dialog).toContainText('Confirm that you checked the merchant receiving account before verifying')
  await dialog.getByRole('checkbox').check()
  await dialog.getByLabel('Reconciliation note').fill('Reconciled with merchant GCash account statement')
  await dialog.getByRole('button', { name: 'Record transition' }).click()
  await page.evaluate(() => window.finishPayment())
  await expect(page.getByRole('status')).toContainText('verified: Reconciled with merchant GCash account statement')
})

test('authorized staff can retrieve the buyer e-receipt from the order payment review', async ({ page }) => {
  await page.route('**/rest/v1/rpc/list_order_payment_receipts_v1', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([{ id: 'ead6eb3c-e59d-4f80-8dc8-e3ef1846ef16', payment_reference: 'GC-123456', media_type: 'image/png', byte_size: 12345, submitted_at: '2026-09-28T07:00:00Z' }]),
  }))
  await page.route('**/rest/v1/rpc/get_order_payment_receipt_v1', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, media_type: 'image/png', contents_base64: 'iVBORw0KGgo=', sha256: 'a'.repeat(64), payment_reference: 'GC-123456' }),
  }))
  await page.goto('/tests/fixtures/payment-harness.html?state=evidence_submitted&evidence=1')
  await page.getByRole('button', { name: 'Review local payment' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('GC-123456', { exact: true })).toBeVisible()
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download buyer receipt GC-123456' }).click()
  expect((await download).suggestedFilename()).toMatch(/GC-123456.*\.png$/)
  await expect(dialog).toContainText('buyer-submitted proof')
})

test('physical lot selection resets confirmation and blocks missing identity on phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/tests/fixtures/payment-harness.html?packing=1')
  const allocation = page.getByRole('combobox', { name: 'Physical lot allocation' })
  const proof = page.getByRole('checkbox')
  await expect(proof).toBeDisabled()
  await allocation.selectOption('B')
  await expect(page.getByText(/Batch BATCH-B/)).toContainText('BOX-B')
  await proof.check()
  await allocation.selectOption('A')
  await expect(proof).not.toBeChecked()
  await allocation.selectOption('UNKNOWN')
  await expect(proof).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

for (const kind of ['handover', 'delivery', 'custody', 'supplier']) {
  test(`${kind} freezes pending details and retries the same uncertain command`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/tests/fixtures/payment-harness.html?fulfillment=${kind}`)
    const opener = page.getByRole('button', { name: 'Review local command' })
    await opener.click()
    const dialog = page.getByRole('dialog')
    if (kind === 'handover') await dialog.getByRole('textbox').fill('COURIER-RECEIPT-123')
    else if (kind === 'delivery') {
      await dialog.getByLabel('Courier', { exact: true }).fill('Courier fixture')
      await dialog.getByLabel('Delivery amount').fill('125.50')
      await dialog.getByLabel('Communication / reconciliation note').fill('Customer agreed to the actual quote')
    }
    else if (kind === 'supplier') {
      await dialog.getByLabel('Supplier name').fill('Local Italian Supplier')
      await dialog.getByLabel('Reason and source').fill('Verified catalog contact')
    }
    if (kind === 'custody') {
      await expect(dialog).toContainText('BOX-123 · LOT-ABC')
      await expect(dialog).toContainText('3 × SKU-123 to Receiving staff')
      await expect(dialog.getByRole('button', { name: 'Confirm command' })).toBeDisabled()
      await dialog.getByLabel('Reason (audit record)').fill('Verified physical transfer to receiving staff')
    }
    await dialog.getByRole('button', { name: kind === 'handover' ? 'Confirm handover' : kind === 'delivery' ? 'Save delivery details' : kind === 'supplier' ? 'Save supplier' : 'Confirm command' }).click()
    for (const field of await dialog.locator('input, textarea').all()) await expect(field).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await page.evaluate(() => window.finishCommand({ ok: false, code: 'REQUEST_TIMEOUT', error: 'Timed out' }))
    await expect(dialog).toContainText('may already be saved')
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
    for (const field of await dialog.locator('input, textarea').all()) await expect(field).toBeDisabled()
    await dialog.getByRole('button', { name: 'Retry same command' }).click()
    const commands = await page.evaluate(() => window.commands)
    expect(commands).toHaveLength(2)
    expect(commands[0].key).toMatch(/^[0-9a-f-]{36}$/)
    expect(commands[1]).toEqual(commands[0])
    if (kind === 'custody') expect(commands[0].payload.reason).toBe('Verified physical transfer to receiving staff')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => window.finishCommand({ ok: true }))
    await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()
  })
}

test('handover denial permits correction and actor change discards late completion', async ({ page }) => {
  await page.goto('/tests/fixtures/payment-harness.html?fulfillment=handover')
  await page.getByRole('button', { name: 'Review local command' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill('REFERENCE-ONE')
  await dialog.getByRole('button', { name: 'Confirm handover' }).click()
  await dialog.evaluate(form => { form.requestSubmit(); form.requestSubmit() })
  expect(await page.evaluate(() => window.commands.length)).toBe(1)
  await page.evaluate(() => window.finishCommand({ ok: false, code: 'INVALID_REFERENCE', error: 'Review the dispatch reference.' }))
  await expect(dialog.getByRole('textbox')).toBeEnabled()
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeEnabled()
  await dialog.getByRole('textbox').fill('REFERENCE-TWO')
  await dialog.getByRole('button', { name: 'Confirm handover' }).click()
  const commands = await page.evaluate(() => window.commands)
  expect(commands[1].key).not.toBe(commands[0].key)
  await page.evaluate(() => { window.oldCompletion = window.finishCommand; window.switchActor() })
  await expect(dialog.getByRole('textbox')).toHaveValue('')
  await page.evaluate(() => window.oldCompletion({ ok: true }))
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('textbox')).toHaveValue('')
})

for (const kind of ['handover', 'delivery']) {
  test(`${kind} legacy uncertainty requires reconciliation on a short viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await page.goto(`/tests/fixtures/payment-harness.html?fulfillment=${kind}&legacy=1`)
    await page.getByRole('button', { name: 'Review local command' }).click()
    const dialog = page.getByRole('dialog')
    if (kind === 'handover') await dialog.getByRole('textbox').fill('LONG-COURIER-REFERENCE-1234567890')
    else {
      await dialog.getByLabel('Courier', { exact: true }).fill('Courier fixture')
      await dialog.getByLabel('Communication / reconciliation note').fill('Customer confirmed the quote')
    }
    await dialog.getByRole('button', { name: kind === 'handover' ? 'Confirm handover' : 'Save delivery details' }).click()
    await page.evaluate(() => window.finishCommand({ ok: false, code: 'REQUEST_TIMEOUT' }))
    await expect(dialog).toContainText('Safe receipt retry requires the protected workflow')
    await expect(dialog.getByRole('button', { name: 'Reconcile order first' })).toBeDisabled()
    await dialog.evaluate(form => form.requestSubmit())
    expect(await page.evaluate(() => window.commands.length)).toBe(1)
    await dialog.getByRole('button', { name: 'Cancel' }).scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/evidence/20260908-fulfillment-retry/${kind}-legacy-landscape.png`, fullPage: true })
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toHaveCount(0)
  })
}
