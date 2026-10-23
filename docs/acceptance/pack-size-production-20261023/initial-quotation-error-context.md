# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-product-master-ui.spec.js >> express staff quotation retains the exact lost-response command through reload and permission refusal
- Location: tests\admin-product-master-ui.spec.js:162:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('status')
Expected substring: "customer must approve"
Error: strict mode violation: getByRole('status') resolved to 2 elements:
    1) <p role="status">Loading current quotation…</p> aka getByText('Loading current quotation…')
    2) <div role="status" class="flex items-start gap-2.5 rounded-adm-sm border p-3 text-sm leading-relaxed border-forest/35 bg-forest/10 text-forest">…</div> aka getByRole('status').filter({ hasText: 'Quotation version 1 published' })

Call log:
  - Expect "toContainText" getByRole('status') with timeout 5000ms
  - waiting for getByRole('status')

```

# Page snapshot

```yaml
- main [ref=f1e3]:
  - button "Switch synthetic staff" [ref=f1e4] [cursor=pointer]
  - dialog [ref=f1e5]:
    - heading "Express delivery quotation" [level=2] [ref=f1e6]
    - paragraph [ref=f1e7]: WEB-DUMMYEXPRESS01 · Record an observed courier quote. This does not book delivery or approve it for the customer.
    - status [ref=f1e8]:
      - generic [ref=f1e11]: Quotation version 1 published. The customer must approve the full total before payment.
    - generic [ref=f1e12]:
      - paragraph [ref=f1e13]: Current quotation version 1
      - paragraph [ref=f1e14]: Grab · Delivery ₱150.25 · Proposed total ₱250.25
      - paragraph [ref=f1e15]: Synthetic observed timing
    - group "Observed quotation facts" [ref=f1e17]:
      - generic [ref=f1e19]:
        - generic [ref=f1e20]:
          - text: Courier
          - combobox "Courier" [ref=f1e21] [cursor=pointer]:
            - option "Choose observed courier" [selected]
            - option "Lalamove"
            - option "Grab"
        - generic [ref=f1e22]:
          - text: Delivery fee (₱)
          - textbox "Delivery fee (₱)" [ref=f1e23]
        - generic [ref=f1e24]:
          - text: Quoted at (Manila time)
          - textbox "Quoted at (Manila time)" [ref=f1e25]
        - generic [ref=f1e26]:
          - text: Expires at (Manila time)
          - textbox "Expires at (Manila time)" [ref=f1e27]
      - generic [ref=f1e28]:
        - text: Checked pickup and drop-off
        - textbox "Checked pickup and drop-off" [ref=f1e29]
      - generic [ref=f1e30]:
        - text: Package size, weight and handling
        - textbox "Package size, weight and handling" [ref=f1e31]
      - generic [ref=f1e32]:
        - text: Current availability and proposed timing
        - textbox "Current availability and proposed timing" [ref=f1e33]
      - generic [ref=f1e34]:
        - text: Courier quotation evidence
        - textbox "Courier quotation evidence" [ref=f1e35]
      - generic [ref=f1e36]:
        - text: Quotation note
        - textbox "Quotation note" [ref=f1e37]
      - generic [ref=f1e38]:
        - checkbox "I checked the route, package, price, timing and quotation evidence." [ref=f1e39]
        - text: I checked the route, package, price, timing and quotation evidence.
      - button "Publish quotation for customer review" [disabled] [ref=f1e40]
    - generic [ref=f1e41]:
      - button "Refresh quotation" [ref=f1e42] [cursor=pointer]
      - button "Close" [ref=f1e43] [cursor=pointer]
```

# Test source

```ts
  91  |     if (writes.length === 1) { timestamp = '2026-10-08T04:01:00Z'; return route.fulfill({ status: 409, json: { error: { code: 'CANCELLATION_VERSION_CONFLICT' } } }) }
  92  |     return route.fulfill({ json: cancellationReceipt })
  93  |   })
  94  |   await reviewCancellation(page); await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  95  |   await expect(page.getByRole('alert')).toContainText('Refresh and review')
  96  |   expect(await page.evaluate(key => localStorage.getItem(key), cancellationKey)).toBeNull()
  97  |   await page.getByRole('button', { name: 'Refresh order' }).click()
  98  |   await expect(page.getByRole('checkbox')).not.toBeChecked()
  99  |   await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  100 |   await expect(page.getByRole('status')).toContainText('Cancellation confirmed')
  101 |   expect(writes[1].expectedUpdatedAt).toBe(timestamp)
  102 | })
  103 | 
  104 | test('cancellation malformed success receipts retain the exact command until a valid confirmation', async ({ page }) => {
  105 |   const writes = []
  106 |   const malformed = [{ publicReference: '' }, { paymentStatus: 'unknown-malformed' }, { publicReference: 'X'.repeat(81) }]
  107 |   await cancellationPage(page, () => [cancellationRow('2026-10-08T04:00:00Z')], route => {
  108 |     writes.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
  109 |     return route.fulfill({ json: { ...cancellationReceipt, result: { ...cancellationReceipt.result, ...(malformed[writes.length - 1] || {}) } } })
  110 |   })
  111 |   await reviewCancellation(page); await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  112 |   await expect(page.getByRole('alert')).toContainText('command stays saved')
  113 |   const saved = await page.evaluate(key => localStorage.getItem(key), cancellationKey)
  114 |   for (let retry = 0; retry < 2; retry++) {
  115 |     await page.getByRole('button', { name: 'Retry pending cancellation' }).click()
  116 |     await expect.poll(() => writes.length).toBe(retry + 2)
  117 |     await expect(page.getByRole('alert')).toContainText('command stays saved')
  118 |     expect(await page.evaluate(key => localStorage.getItem(key), cancellationKey)).toBe(saved)
  119 |   }
  120 |   await page.getByRole('button', { name: 'Retry pending cancellation' }).click()
  121 |   await expect(page.getByRole('status')).toContainText('Cancellation confirmed')
  122 |   expect(writes).toHaveLength(4)
  123 |   for (const write of writes) expect(write).toEqual(writes[0])
  124 |   expect(await page.evaluate(key => localStorage.getItem(key), cancellationKey)).toBeNull()
  125 | })
  126 | 
  127 | test('cancellation malformed recovery is preserved and refuses a new write', async ({ page }) => {
  128 |   const writes = []
  129 |   await page.addInitScript(key => localStorage.setItem(key, '{malformed'), cancellationKey)
  130 |   await cancellationPage(page, () => [cancellationRow('2026-10-08T04:00:00Z')], route => { writes.push(route.request()); return route.fulfill({ json: cancellationReceipt }) })
  131 |   await page.getByRole('button', { name: 'Review dummy cancellation' }).click()
  132 |   await expect(page.getByRole('dialog').getByRole('alert')).toContainText('cannot be restored safely')
  133 |   await expect(page.getByRole('button', { name: 'Cancel order', exact: true })).toBeDisabled()
  134 |   expect(writes).toHaveLength(0)
  135 |   expect(await page.evaluate(key => localStorage.getItem(key), cancellationKey)).toBe('{malformed')
  136 | })
  137 | 
  138 | const expressId = '33333333-3333-4333-8333-333333333333'
  139 | const pendingExpressKey = `k2-express-quote-pending-v1:11111111-1111-4111-8111-111111111111:${expressId}`
  140 | async function expressPage(page, handle) {
  141 |   await page.route('https://fixture.supabase.co/**', route => route.abort())
  142 |   await page.context().addCookies([{ name: 'k2_admin_csrf', value: 'synthetic-express-csrf', url: 'http://localhost:5181' }])
  143 |   await page.route('**/api/admin/delivery/express-quote*', handle)
  144 |   await page.goto('/tests/fixtures/admin-product-master-harness.html?surface=express-quote')
  145 |   await expect(page.getByText('Current quotation version 0', { exact: true })).toBeVisible()
  146 | }
  147 | async function reviewExpress(page) {
  148 |   await page.getByRole('combobox', { name: 'Courier', exact: true }).selectOption('Grab')
  149 |   await page.getByLabel('Delivery fee (₱)', { exact: true }).fill('150.25')
  150 |   const manila = offset => new Date(Date.now() + offset + 8 * 3600000).toISOString().slice(0, 16)
  151 |   await page.getByLabel('Quoted at (Manila time)').fill(manila(-60000))
  152 |   await page.getByLabel('Expires at (Manila time)').fill(manila(3600000))
  153 |   for (const [label, value] of [['Checked pickup and drop-off', 'Synthetic warehouse to dummy NCR address'],
  154 |     ['Package size, weight and handling', 'Synthetic 2 kg protected grocery parcel'],
  155 |     ['Current availability and proposed timing', 'Synthetic availability reviewed for the next hour'],
  156 |     ['Courier quotation evidence', 'synthetic:quote-evidence'], ['Quotation note', 'Synthetic readiness rehearsal only']]) await page.getByLabel(label, { exact: true }).fill(value)
  157 |   await page.getByRole('checkbox', { name: /I checked the route/ }).check()
  158 | }
  159 | const expressHead = (version = 0, eligible = true) => ({ ok: true, orderRequestId: expressId, currentVersion: version, eligible,
  160 |   quote: version ? { quoteVersion: version, courier: 'Grab', feeMinor: 15025, proposedTotal: 250.25, availabilityNote: 'Synthetic observed timing' } : null })
  161 | 
  162 | test('express staff quotation retains the exact lost-response command through reload and permission refusal', async ({ page }, testInfo) => {
  163 |   let version = 0
  164 |   const writes = []
  165 |   await expressPage(page, route => {
  166 |     if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: expressHead(version) })
  167 |     writes.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
  168 |     expect(route.request().headers()['x-k2-csrf']).toBe('synthetic-express-csrf')
  169 |     if (writes.length === 1) { version = 1; return route.abort('failed') }
  170 |     if (writes.length === 2) return route.fulfill({ status: 403, json: { error: { code: 'DELIVERY_ACCESS_REQUIRED' } } })
  171 |     return route.fulfill({ status: 200, json: { ok: true, receipt: { orderRequestId: expressId, quoteVersion: 1 } } })
  172 |   })
  173 |   expect(await page.getByRole('combobox', { name: 'Courier', exact: true }).inputValue()).toBe('')
  174 |   expect(await page.getByLabel('Delivery fee (₱)', { exact: true }).inputValue()).toBe('')
  175 |   await reviewExpress(page)
  176 |   for (const width of [375, 1440]) {
  177 |     await page.setViewportSize({ width, height: 900 })
  178 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  179 |     await page.screenshot({ path: testInfo.outputPath(`express-staff-${width}.png`), fullPage: true })
  180 |   }
  181 |   await page.getByRole('button', { name: 'Publish quotation for customer review' }).click()
  182 |   await expect(page.getByRole('button', { name: 'Retry pending quotation' })).toBeVisible()
  183 |   const held = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), pendingExpressKey)
  184 |   expect(held.body.feeMinor).toBe(15025)
  185 |   expect(Object.keys(held.body)).toHaveLength(11)
  186 |   await page.reload()
  187 |   await expect(page.getByText('Current quotation version 1', { exact: true })).toBeVisible()
  188 |   await page.getByRole('button', { name: 'Retry pending quotation' }).click()
  189 |   await expect(page.getByRole('alert')).toContainText('two-factor')
  190 |   await page.getByRole('button', { name: 'Retry pending quotation' }).click()
> 191 |   await expect(page.getByRole('status')).toContainText('customer must approve')
      |                                          ^ Error: expect(locator).toContainText(expected) failed
  192 |   expect(writes).toHaveLength(3)
  193 |   expect(writes[1]).toEqual(writes[0]); expect(writes[2]).toEqual(writes[0])
  194 |   expect(await page.evaluate(key => localStorage.getItem(key), pendingExpressKey)).toBeNull()
  195 | })
  196 | 
  197 | test('express staff stale quote requires refresh and renewed review', async ({ page }) => {
  198 |   let version = 0
  199 |   let writes = 0
  200 |   await expressPage(page, route => {
  201 |     if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: expressHead(version) })
  202 |     writes += 1; version = 1
  203 |     return route.fulfill({ status: 409, json: { error: { code: 'EXPRESS_QUOTE_STALE' } } })
  204 |   })
  205 |   await reviewExpress(page)
  206 |   await page.getByRole('button', { name: 'Publish quotation for customer review' }).click()
  207 |   await expect(page.getByRole('alert')).toContainText('superseded')
  208 |   await expect(page.getByRole('button', { name: 'Publish quotation for customer review' })).toBeDisabled()
  209 |   expect(await page.evaluate(key => localStorage.getItem(key), pendingExpressKey)).toBeNull()
  210 |   await page.getByRole('button', { name: 'Refresh quotation' }).click()
  211 |   await expect(page.getByText('Current quotation version 1', { exact: true })).toBeVisible()
  212 |   await expect(page.getByRole('button', { name: 'Publish quotation for customer review' })).toBeDisabled()
  213 |   expect(writes).toBe(1)
  214 | })
  215 | 
  216 | test('express staff identity switch keeps the previous unknown command isolated', async ({ page }) => {
  217 |   let release
  218 |   const heldReply = new Promise(resolve => { release = resolve })
  219 |   const writes = []
  220 |   await expressPage(page, async route => {
  221 |     if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: expressHead() })
  222 |     writes.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
  223 |     if (writes.length === 1) { await heldReply; return route.abort('failed') }
  224 |     return route.fulfill({ status: 200, json: { ok: true, receipt: { orderRequestId: expressId, quoteVersion: 1 } } })
  225 |   })
  226 |   await reviewExpress(page)
  227 |   await page.getByRole('button', { name: 'Publish quotation for customer review' }).click()
  228 |   await expect.poll(() => writes.length).toBe(1)
  229 |   await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Switch synthetic staff').click())
  230 |   await expect(page.getByText('Current quotation version 0', { exact: true })).toBeVisible()
  231 |   await expect(page.getByRole('button', { name: 'Retry pending quotation' })).toHaveCount(0)
  232 |   release()
  233 |   await page.evaluate(key => navigator.locks.request(key, () => {}), pendingExpressKey)
  234 |   expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).key, pendingExpressKey)).toBe(writes[0].key)
  235 |   await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Switch synthetic staff').click())
  236 |   await page.getByRole('button', { name: 'Retry pending quotation' }).click()
  237 |   await expect(page.getByRole('status').filter({ hasText: 'published' })).toBeVisible()
  238 |   expect(writes[1]).toEqual(writes[0])
  239 | })
  240 | 
  241 | test('express staff corrupt saved quotation refuses before HTTP', async ({ page }) => {
  242 |   let writes = 0
  243 |   await expressPage(page, route => {
  244 |     if (route.request().method() !== 'GET') writes += 1
  245 |     return route.fulfill({ status: 200, json: expressHead() })
  246 |   })
  247 |   await page.evaluate(key => localStorage.setItem(key, '{broken'), pendingExpressKey)
  248 |   await page.reload()
  249 |   await expect(page.getByRole('alert')).toContainText('cannot be restored safely')
  250 |   await expect(page.getByRole('button', { name: 'Publish quotation for customer review' })).toBeDisabled()
  251 |   expect(writes).toBe(0)
  252 |   expect(await page.evaluate(key => localStorage.getItem(key), pendingExpressKey)).toBe('{broken')
  253 | })
  254 | 
  255 | const rateAreas = ['NCR', 'Greater Luzon', 'Visayas', 'Mindanao']
  256 | const syntheticRates = () => Object.fromEntries(rateAreas.map(area => [area, { baseMinor: 9500, includedWeightG: 3000, extraKgMinor: 0, roundMinor: 500 }]))
  257 | const pendingRateKey = 'k2-customer-rates-pending-v1:11111111-1111-4111-8111-111111111111'
  258 | async function customerRatesPage(page, handle, role = 'Staff') {
  259 |   await page.emulateMedia({ reducedMotion: 'reduce' })
  260 |   await page.context().addCookies([{ name: 'k2_admin_csrf', value: 'synthetic-rate-csrf', url: 'http://localhost:5181' }])
  261 |   await page.route('**/api/admin/delivery/customer-rates', handle)
  262 |   await page.goto(`/tests/fixtures/admin-product-master-harness.html?surface=customer-rates&role=${role}`)
  263 |   await expect(page.getByRole('heading', { name: 'Customer delivery rates', exact: true })).toBeVisible()
  264 | }
  265 | async function reviewCustomerRates(page) {
  266 |   await page.getByLabel('Change reason', { exact: true }).fill('Synthetic reviewed regional change')
  267 |   await page.getByLabel('Evidence reference', { exact: true }).fill('synthetic:rate-evidence')
  268 |   await page.getByRole('checkbox', { name: /I reviewed all four regions/ }).check()
  269 | }
  270 | 
  271 | test('customer rates Staff editor retains one publication across reload permission denial and retry', async ({ page }, testInfo) => {
  272 |   let current = { policy: 'jt_current', version: 2, rates: syntheticRates(), reason: 'Synthetic saved reason', evidenceRef: 'synthetic:saved' }
  273 |   const writes = []
  274 |   await customerRatesPage(page, async route => {
  275 |     if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: { ok: true, result: { current, future: { active: false } } } })
  276 |     writes.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
  277 |     if (writes.length === 1) { current = { ...current, version: 3, rates: writes[0].body.rates }; return route.abort('failed') }
  278 |     if (writes.length === 2) return route.fulfill({ status: 403, json: { error: { code: 'CUSTOMER_TARIFF_STAFF_REQUIRED' } } })
  279 |     return route.fulfill({ status: 200, json: { ok: true, result: { policy: 'jt_current', version: 3 } } })
  280 |   })
  281 |   await expect(page.getByText('Saved customer rate version 2')).toBeVisible()
  282 |   await expect(page.getByRole('button', { name: 'Carrier cost pilot' })).toHaveCount(0)
  283 |   const ncr = page.locator('fieldset').filter({ has: page.locator('legend', { hasText: /^NCR$/ }) }).last()
  284 |   await ncr.getByLabel('Base fee (₱)', { exact: true }).fill('95.15')
  285 |   await reviewCustomerRates(page)
  286 |   for (const width of [375, 1440]) {
  287 |     await page.setViewportSize({ width, height: 900 })
  288 |     expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
  289 |     await page.screenshot({ path: testInfo.outputPath(`customer-rates-${width}.png`), fullPage: true })
  290 |   }
  291 |   await page.getByRole('button', { name: 'Publish customer rates', exact: true }).click()
```