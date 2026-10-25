# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-product-master-ui.spec.js >> customer rates queued retry stops after another tab resolved the publication
- Location: tests\admin-product-master-ui.spec.js:364:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Customer delivery rates', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Customer delivery rates', exact: true }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Customer delivery rates', exact: true })

```

# Test source

```ts
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
  191 |   await expect(page.getByRole('status').filter({ hasText: 'customer must approve' })).toBeVisible()
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
> 263 |   await expect(page.getByRole('heading', { name: 'Customer delivery rates', exact: true })).toBeVisible()
      |                                                                                             ^ Error: expect(locator).toBeVisible() failed
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
  292 |   await expect(page.getByRole('button', { name: 'Retry pending rate change' })).toBeVisible()
  293 |   await page.reload()
  294 |   await expect(page.getByText('Saved customer rate version 3')).toBeVisible()
  295 |   await expect(page.getByRole('button', { name: 'Retry pending rate change' })).toBeVisible()
  296 |   await page.getByRole('button', { name: 'Retry pending rate change' }).click()
  297 |   await expect(page.getByRole('alert')).toContainText('two-factor')
  298 |   expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).key, pendingRateKey)).toBe(writes[0].key)
  299 |   await page.getByRole('button', { name: 'Retry pending rate change' }).click()
  300 |   await expect(page.getByRole('status').filter({ hasText: 'published as version 3' })).toBeVisible()
  301 |   expect(writes).toHaveLength(3)
  302 |   expect(writes[1]).toEqual(writes[0])
  303 |   expect(writes[2]).toEqual(writes[0])
  304 |   expect(writes[0].body.rates.NCR.baseMinor).toBe(9515)
  305 |   expect(writes[0].body.rates.NCR.extraKgMinor).toBe(0)
  306 |   expect(writes[0].body.expectedVersion).toBe(2)
  307 |   expect(await page.evaluate(key => localStorage.getItem(key), pendingRateKey)).toBeNull()
  308 | })
  309 | 
  310 | test('customer rates stale version requires refresh and fresh review before another publication', async ({ page }) => {
  311 |   let current = { policy: 'jt_current', version: 2, rates: syntheticRates() }
  312 |   const writes = []
  313 |   let failReads = false
  314 |   await customerRatesPage(page, route => {
  315 |     if (route.request().method() === 'GET') return route.fulfill(failReads ? { status: 503, json: { error: { code: 'CUSTOMER_TARIFF_UNAVAILABLE' } } } : { status: 200, json: { ok: true, result: { current } } })
  316 |     writes.push(route.request().postDataJSON())
  317 |     if (writes.length === 1) { current = { ...current, version: 3 }; return route.fulfill({ status: 409, json: { error: { code: 'CUSTOMER_TARIFF_VERSION_STALE' } } }) }
  318 |     failReads = true
  319 |     return route.fulfill({ status: 200, json: { ok: true, result: { policy: 'jt_current', version: 4 } } })
  320 |   }, 'Admin')
  321 |   await expect(page.getByText('Saved customer rate version 2')).toBeVisible()
  322 |   await expect(page.getByRole('button', { name: 'Carrier cost pilot' })).toBeVisible()
  323 |   await reviewCustomerRates(page)
  324 |   await page.getByRole('button', { name: 'Publish customer rates', exact: true }).click()
  325 |   await expect(page.getByRole('alert')).toContainText('latest version')
  326 |   await expect(page.getByRole('button', { name: 'Publish customer rates', exact: true })).toBeDisabled()
  327 |   await page.getByRole('button', { name: 'Refresh saved rates' }).click()
  328 |   await expect(page.getByText('Saved customer rate version 3')).toBeVisible()
  329 |   await expect(page.getByRole('checkbox', { name: /I reviewed/ })).not.toBeChecked()
  330 |   await reviewCustomerRates(page)
  331 |   await page.getByRole('button', { name: 'Publish customer rates', exact: true }).click()
  332 |   await expect(page.getByRole('status').filter({ hasText: 'published as version 4' })).toBeVisible()
  333 |   await expect(page.getByRole('alert')).toContainText('temporarily unavailable')
  334 |   await expect(page.getByRole('button', { name: 'Publish customer rates', exact: true })).toBeDisabled()
  335 |   expect(writes[1].expectedVersion).toBe(3)
  336 | })
  337 | 
  338 | test('customer rates empty matrix and unavailable persistence never publish invented values', async ({ page }) => {
  339 |   let writes = 0
  340 |   await customerRatesPage(page, route => {
  341 |     if (route.request().method() === 'GET') return route.fulfill({ status: 200, json: { ok: true, result: { current: null } } })
  342 |     writes += 1
  343 |     return route.abort('failed')
  344 |   })
  345 |   await expect(page.getByText(/No customer rates published/)).toBeVisible()
  346 |   await expect(page.getByLabel('Base fee (₱)', { exact: true }).first()).toHaveValue('')
  347 |   await reviewCustomerRates(page)
  348 |   await page.getByRole('button', { name: 'Publish customer rates', exact: true }).click()
  349 |   expect(writes).toBe(0)
  350 |   for (const label of ['Base fee (₱)', 'Each extra kg (₱)', 'Round fee up to (₱)']) {
  351 |     for (const input of await page.getByLabel(label, { exact: true }).all()) await input.fill(label === 'Each extra kg (₱)' ? '0' : '95.15')
  352 |   }
  353 |   for (const input of await page.getByLabel('Included weight (grams)', { exact: true }).all()) await input.fill('3000')
  354 |   await page.getByRole('checkbox', { name: /I reviewed/ }).check()
  355 |   await page.evaluate(key => {
  356 |     const original = Storage.prototype.setItem
  357 |     Storage.prototype.setItem = function(name, value) { if (name === key) throw new DOMException('Synthetic denial', 'QuotaExceededError'); return original.call(this, name, value) }
  358 |   }, pendingRateKey)
  359 |   await page.getByRole('button', { name: 'Publish customer rates', exact: true }).click()
  360 |   await expect(page.getByRole('alert')).toBeVisible()
  361 |   expect(writes).toBe(0)
  362 | })
  363 | 
```