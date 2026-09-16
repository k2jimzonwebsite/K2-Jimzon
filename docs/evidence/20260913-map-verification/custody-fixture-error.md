# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payment-recovery-ui.spec.js >> custody freezes pending details and retries the same uncertain command
- Location: tests\payment-recovery-ui.spec.js:58:3

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByRole('dialog').getByRole('button', { name: 'Confirm command' })
    - locator resolved to <button disabled type="submit" class="adm-btn bg-blue text-white transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-blue-deep active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70 flex-1">Confirm command</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    229 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- main [ref=e3]:
  - button "Review local command" [ref=e4] [cursor=pointer]
  - status
  - dialog "Transfer exact lot custody" [ref=e6]:
    - heading "Transfer exact lot custody" [level=2] [ref=e7]
    - paragraph [ref=e8]: BOX-123 · LOT-ABC
    - paragraph [ref=e9]: 3 × SKU-123 to Receiving staff
    - paragraph [ref=e10]: Reserved units cannot move.
    - generic [ref=e11]:
      - text: Reason (audit record)
      - textbox "Reason (audit record)" [active] [ref=e12]:
        - /placeholder: Why is this custody or state changing?
    - generic [ref=e13]:
      - button "Cancel" [ref=e14] [cursor=pointer]
      - button "Confirm command" [disabled] [ref=e15]
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test'
  2   | test.beforeEach(async ({ page }) => {
  3   |   await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  4   | })
  5   | 
  6   | for (const viewport of [{ width: 375, height: 812 }, { width: 844, height: 390 }, { width: 1280, height: 900 }]) {
  7   |   test(`correct rejected evidence safely at ${viewport.width}x${viewport.height}`, async ({ page }) => {
  8   |     await page.setViewportSize(viewport)
  9   |     await page.goto('/tests/fixtures/payment-harness.html')
  10  |     await page.getByRole('button', { name: 'Review local payment' }).click()
  11  |     const dialog = page.getByRole('dialog')
  12  |     await expect(dialog.getByRole('combobox')).toHaveValue('evidence_submitted')
  13  |     await expect(dialog).toContainText('different staff member')
  14  |     await dialog.getByRole('textbox').fill('GCash reference reconciled with payer')
  15  |     await dialog.getByRole('button', { name: 'Record transition' }).click()
  16  |     await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeDisabled()
  17  |     await page.keyboard.press('Escape')
  18  |     await expect(dialog).toBeVisible()
  19  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  20  |     await page.evaluate(() => window.finishPayment())
  21  |     await expect(page.getByRole('status')).toContainText('evidence_submitted')
  22  |     await expect(page.getByRole('button', { name: 'Review local payment' })).toBeFocused()
  23  |   })
  24  | }
  25  | test('legacy failure stays blocked until the protected recovery boundary is active', async ({ page }) => {
  26  |   await page.goto('/tests/fixtures/payment-harness.html?legacy=1')
  27  |   await page.getByRole('button', { name: 'Review local payment' }).click()
  28  |   await expect(page.getByRole('dialog')).toContainText('protected payment workflow')
  29  |   await expect(page.getByRole('button', { name: 'Record transition' })).toHaveCount(0)
  30  | })
  31  | test('uncertain outcome keeps evidence and shows reconciliation feedback', async ({ page }) => {
  32  |   await page.goto('/tests/fixtures/payment-harness.html?uncertain=1')
  33  |   await page.getByRole('button', { name: 'Review local payment' }).click()
  34  |   await page.getByRole('textbox').fill('Corrected GCash reference')
  35  |   await page.getByRole('button', { name: 'Record transition' }).click()
  36  |   await page.evaluate(() => window.finishPayment())
  37  |   await expect(page.getByRole('dialog')).toContainText('Reconcile before retrying')
  38  |   await expect(page.getByRole('textbox')).toHaveValue('Corrected GCash reference')
  39  | })
  40  | 
  41  | test('physical lot selection resets confirmation and blocks missing identity on phone', async ({ page }) => {
  42  |   await page.setViewportSize({ width: 375, height: 812 })
  43  |   await page.goto('/tests/fixtures/payment-harness.html?packing=1')
  44  |   const allocation = page.getByRole('combobox', { name: 'Physical lot allocation' })
  45  |   const proof = page.getByRole('checkbox')
  46  |   await expect(proof).toBeDisabled()
  47  |   await allocation.selectOption('B')
  48  |   await expect(page.getByText(/Batch BATCH-B/)).toContainText('BOX-B')
  49  |   await proof.check()
  50  |   await allocation.selectOption('A')
  51  |   await expect(proof).not.toBeChecked()
  52  |   await allocation.selectOption('UNKNOWN')
  53  |   await expect(proof).toBeDisabled()
  54  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  55  | })
  56  | 
  57  | for (const kind of ['handover', 'delivery', 'custody', 'supplier']) {
  58  |   test(`${kind} freezes pending details and retries the same uncertain command`, async ({ page }) => {
  59  |     await page.setViewportSize({ width: 375, height: 812 })
  60  |     await page.goto(`/tests/fixtures/payment-harness.html?fulfillment=${kind}`)
  61  |     const opener = page.getByRole('button', { name: 'Review local command' })
  62  |     await opener.click()
  63  |     const dialog = page.getByRole('dialog')
  64  |     if (kind === 'handover') await dialog.getByRole('textbox').fill('COURIER-RECEIPT-123')
  65  |     else if (kind === 'delivery') {
  66  |       await dialog.getByLabel('Courier', { exact: true }).fill('Courier fixture')
  67  |       await dialog.getByLabel('Delivery amount').fill('125.50')
  68  |       await dialog.getByLabel('Communication / reconciliation note').fill('Customer agreed to the actual quote')
  69  |     }
  70  |     else if (kind === 'supplier') {
  71  |       await dialog.getByLabel('Supplier name').fill('Local Italian Supplier')
  72  |       await dialog.getByLabel('Reason and source').fill('Verified catalog contact')
  73  |     }
  74  |     if (kind === 'custody') {
  75  |       await expect(dialog).toContainText('BOX-123 · LOT-ABC')
  76  |       await expect(dialog).toContainText('3 × SKU-123 to Receiving staff')
  77  |     }
> 78  |     await dialog.getByRole('button', { name: kind === 'handover' ? 'Confirm handover' : kind === 'delivery' ? 'Save delivery details' : kind === 'supplier' ? 'Save supplier' : 'Confirm command' }).click()
      |                                                                                                                                                                                                      ^ Error: locator.click: Test timeout of 120000ms exceeded.
  79  |     for (const field of await dialog.locator('input, textarea').all()) await expect(field).toBeDisabled()
  80  |     await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
  81  |     await page.keyboard.press('Escape')
  82  |     await expect(dialog).toBeVisible()
  83  |     await page.evaluate(() => window.finishCommand({ ok: false, code: 'REQUEST_TIMEOUT', error: 'Timed out' }))
  84  |     await expect(dialog).toContainText('may already be saved')
  85  |     await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
  86  |     for (const field of await dialog.locator('input, textarea').all()) await expect(field).toBeDisabled()
  87  |     await dialog.getByRole('button', { name: 'Retry same command' }).click()
  88  |     const commands = await page.evaluate(() => window.commands)
  89  |     expect(commands).toHaveLength(2)
  90  |     expect(commands[0].key).toMatch(/^[0-9a-f-]{36}$/)
  91  |     expect(commands[1]).toEqual(commands[0])
  92  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  93  |     await page.evaluate(() => window.finishCommand({ ok: true }))
  94  |     await expect(dialog).toHaveCount(0)
  95  |     await expect(opener).toBeFocused()
  96  |   })
  97  | }
  98  | 
  99  | test('handover denial permits correction and actor change discards late completion', async ({ page }) => {
  100 |   await page.goto('/tests/fixtures/payment-harness.html?fulfillment=handover')
  101 |   await page.getByRole('button', { name: 'Review local command' }).click()
  102 |   const dialog = page.getByRole('dialog')
  103 |   await dialog.getByRole('textbox').fill('REFERENCE-ONE')
  104 |   await dialog.getByRole('button', { name: 'Confirm handover' }).click()
  105 |   await dialog.evaluate(form => { form.requestSubmit(); form.requestSubmit() })
  106 |   expect(await page.evaluate(() => window.commands.length)).toBe(1)
  107 |   await page.evaluate(() => window.finishCommand({ ok: false, code: 'INVALID_REFERENCE', error: 'Review the dispatch reference.' }))
  108 |   await expect(dialog.getByRole('textbox')).toBeEnabled()
  109 |   await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeEnabled()
  110 |   await dialog.getByRole('textbox').fill('REFERENCE-TWO')
  111 |   await dialog.getByRole('button', { name: 'Confirm handover' }).click()
  112 |   const commands = await page.evaluate(() => window.commands)
  113 |   expect(commands[1].key).not.toBe(commands[0].key)
  114 |   await page.evaluate(() => { window.oldCompletion = window.finishCommand; window.switchActor() })
  115 |   await expect(dialog.getByRole('textbox')).toHaveValue('')
  116 |   await page.evaluate(() => window.oldCompletion({ ok: true }))
  117 |   await expect(dialog).toBeVisible()
  118 |   await expect(dialog.getByRole('textbox')).toHaveValue('')
  119 | })
  120 | 
  121 | for (const kind of ['handover', 'delivery']) {
  122 |   test(`${kind} legacy uncertainty requires reconciliation on a short viewport`, async ({ page }) => {
  123 |     await page.setViewportSize({ width: 844, height: 390 })
  124 |     await page.goto(`/tests/fixtures/payment-harness.html?fulfillment=${kind}&legacy=1`)
  125 |     await page.getByRole('button', { name: 'Review local command' }).click()
  126 |     const dialog = page.getByRole('dialog')
  127 |     if (kind === 'handover') await dialog.getByRole('textbox').fill('LONG-COURIER-REFERENCE-1234567890')
  128 |     else {
  129 |       await dialog.getByLabel('Courier', { exact: true }).fill('Courier fixture')
  130 |       await dialog.getByLabel('Communication / reconciliation note').fill('Customer confirmed the quote')
  131 |     }
  132 |     await dialog.getByRole('button', { name: kind === 'handover' ? 'Confirm handover' : 'Save delivery details' }).click()
  133 |     await page.evaluate(() => window.finishCommand({ ok: false, code: 'REQUEST_TIMEOUT' }))
  134 |     await expect(dialog).toContainText('Safe receipt retry requires the protected workflow')
  135 |     await expect(dialog.getByRole('button', { name: 'Reconcile order first' })).toBeDisabled()
  136 |     await dialog.evaluate(form => form.requestSubmit())
  137 |     expect(await page.evaluate(() => window.commands.length)).toBe(1)
  138 |     await dialog.getByRole('button', { name: 'Cancel' }).scrollIntoViewIfNeeded()
  139 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  140 |     await page.screenshot({ path: `docs/evidence/20260908-fulfillment-retry/${kind}-legacy-landscape.png`, fullPage: true })
  141 |     await dialog.getByRole('button', { name: 'Cancel' }).click()
  142 |     await expect(dialog).toHaveCount(0)
  143 |   })
  144 | }
  145 | 
```