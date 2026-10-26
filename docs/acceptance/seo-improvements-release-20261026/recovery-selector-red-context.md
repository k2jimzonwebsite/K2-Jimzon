# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: storefront-recovery-ui.spec.js >> a failed batch-stock read keeps the product visible but hides the stale row count
- Location: tests\storefront-recovery-ui.spec.js:180:1

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.click: Test timeout of 180000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'Catalog', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]: Italy-sourced goods, fulfilled in Manila · Final stock and delivery are confirmed by K2 staff
    - generic [ref=e6]:
      - link "K2 Jimzon home" [ref=e7] [cursor=pointer]:
        - /url: /
        - generic [ref=e14]:
          - text: K2 Jimzon
          - generic [ref=e15]: Direct Italian imports
      - button "Open cart, 0 items" [ref=e16] [cursor=pointer]
      - button "Switch to dark mode" [ref=e19] [cursor=pointer]
    - generic [ref=e23]:
      - generic [ref=e24]: Search the catalog
      - searchbox "Search the catalog" [ref=e25]
  - main [ref=e26]:
    - generic [ref=e27]:
      - navigation [ref=e28]:
        - button "Home" [ref=e29] [cursor=pointer]
        - generic [ref=e30]: /
        - button "3D Store" [ref=e31] [cursor=pointer]
        - generic [ref=e32]: /
        - button "Catalog" [ref=e33] [cursor=pointer]
        - generic [ref=e34]: /
        - generic [ref=e35]: Audit pantry item
      - button "Back to 3D Store" [ref=e36] [cursor=pointer]:
        - generic [aria-hidden] [ref=e37]: ←
        - text: Back to 3D Store
    - generic [ref=e38]:
      - generic [ref=e39]:
        - img "Audit pantry item - View 1" [ref=e43]
        - generic [ref=e44]:
          - button "Go to slide 1" [ref=e45] [cursor=pointer]
          - button "Go to slide 2" [ref=e47] [cursor=pointer]
      - generic [ref=e49]:
        - generic [ref=e50]:
          - generic [ref=e51]: "Origin: Italy"
          - generic "Stock check pending" [ref=e54]
          - generic [ref=e56]: Uncategorised
        - heading "Audit pantry item" [level=1] [ref=e57]
        - generic [ref=e58]: ₱735
        - generic [ref=e60]:
          - generic [ref=e61]: Live availability could not be confirmed. Adding this product is paused until stock is known.
          - button "Stock check pending" [disabled] [ref=e64]
        - paragraph [ref=e65]: Synthetic product.
        - generic [ref=e67]:
          - generic [ref=e68]: Product Details
          - generic [ref=e73]:
            - generic [ref=e74]:
              - term [ref=e75]: Origin
              - definition [ref=e76]: Italy
            - generic [ref=e77]:
              - term [ref=e78]: Manila Stock
              - definition [ref=e79]: Stock check pending
        - generic [ref=e80]:
          - paragraph [ref=e81]: Product specifications
          - generic [ref=e82]: Product specifications are not available yet.
      - generic [ref=e84]:
        - generic [ref=e85]:
          - generic [ref=e86]:
            - button "Ingredients" [ref=e87] [cursor=pointer]
            - button "Instructions" [ref=e88] [cursor=pointer]
          - generic [ref=e90]:
            - heading "What you'll need" [level=4] [ref=e91]
            - paragraph [ref=e92]: Ingredient details are not available yet. Check the package or ask K2 staff.
        - region [ref=e93]:
          - heading "Product details" [level=2] [ref=e94]
          - paragraph [ref=e95]: Information not available yet. Ask staff to clarify missing product details before ordering.
          - heading "Common questions" [level=2] [ref=e96]
          - paragraph [ref=e97]: No reviewed questions for this product yet. Ask below and staff will answer directly.
          - generic [ref=e98]:
            - paragraph [ref=e99]: Ask K2 staff
            - generic [ref=e100]:
              - generic [ref=e101] [cursor=pointer]: Ask about this product and staff will reply in your messages.
              - generic [ref=e102]:
                - textbox "Ask about this product and staff will reply in your messages." [ref=e103]:
                  - /placeholder: "For example: is this the whole bean or ground?"
                - button "Send to staff" [disabled] [ref=e104]
              - status [ref=e105]: Messages are reviewed during Manila business hours. No response time is promised.
  - complementary "Store concierge chat" [ref=e106]:
    - button "Chat with K2 staff" [ref=e107] [cursor=pointer]
  - contentinfo [ref=e111]:
    - generic [ref=e112]:
      - generic [ref=e113]:
        - generic [ref=e114]:
          - generic [ref=e119]:
            - text: K2 Jimzon
            - generic [ref=e120]: Direct Italian imports
          - paragraph [ref=e121]: Italian goods for homes and businesses in the Philippines. Shop what is in stock or ask us to source something from Italy.
          - paragraph [ref=e122]: Website · Shopee · TikTok Shop · Lazada · Pasabuy
        - generic [ref=e123]:
          - heading "Shop" [level=3] [ref=e124]
          - list
        - generic [ref=e125]:
          - heading "Services" [level=3] [ref=e126]
          - list [ref=e127]:
            - listitem [ref=e128]:
              - link "Request from Italy" [ref=e129] [cursor=pointer]:
                - /url: /pasabuy
            - listitem [ref=e130]:
              - link "Wholesale orders" [ref=e131] [cursor=pointer]:
                - /url: /trade
            - listitem [ref=e132]:
              - link "Browse products" [ref=e133] [cursor=pointer]:
                - /url: /catalog
            - listitem [ref=e134]:
              - button "Review your basket" [ref=e135] [cursor=pointer]
        - generic [ref=e136]:
          - heading "Contact" [level=3] [ref=e137]
          - list [ref=e138]:
            - listitem [ref=e139]:
              - link "Contact us" [ref=e140] [cursor=pointer]:
                - /url: /contact
            - listitem [ref=e141]:
              - link "Call 0931 864 9654" [ref=e142] [cursor=pointer]:
                - /url: tel:09318649654
                - generic [ref=e145]: 0931 864 9654
            - listitem [ref=e148]:
              - link "Email K2 Jimzon" [ref=e149] [cursor=pointer]:
                - /url: mailto:k2jimzonwebsite@gmail.com
            - listitem [ref=e155]:
              - link "Facebook · Family Pin Italy" [ref=e156] [cursor=pointer]:
                - /url: https://www.facebook.com/FamilyPinItaly
            - listitem [ref=e162]:
              - link "Instagram · @kaikiko8" [ref=e163] [cursor=pointer]:
                - /url: https://www.instagram.com/kaikiko8/
            - listitem [ref=e170]:
              - generic [ref=e171]: Manila, Philippines
      - region [ref=e175]:
        - heading "Find our shops" [level=3] [ref=e176]
        - paragraph [ref=e177]: These links open our marketplace shops. Stock and messages there stay in each marketplace until a connector is approved.
        - generic [ref=e178]:
          - generic [ref=e179]:
            - paragraph [ref=e180]: Pasabuy Italy by K2
            - list [ref=e181]:
              - listitem [ref=e182]:
                - link "Lazada" [ref=e183] [cursor=pointer]:
                  - /url: https://s.lazada.com.ph/s.Z777zD?c=x
              - listitem [ref=e186]:
                - link "Shopee" [ref=e187] [cursor=pointer]:
                  - /url: https://s.shopee.ph/9V1fXWQ0gK
              - listitem [ref=e190]:
                - link "TikTok" [ref=e191] [cursor=pointer]:
                  - /url: https://vt.tiktok.com/ZS9Afhgs231Wm-Zj3hN/
          - generic [ref=e194]:
            - paragraph [ref=e195]: Jworldbasket
            - list [ref=e196]:
              - listitem [ref=e197]:
                - link "Lazada" [ref=e198] [cursor=pointer]:
                  - /url: https://s.lazada.com.ph/s.Z77ieU?c=x
              - listitem [ref=e201]:
                - link "Shopee" [ref=e202] [cursor=pointer]:
                  - /url: https://s.shopee.ph/5fowyVvX1R
              - listitem [ref=e205]:
                - link "TikTok" [ref=e206] [cursor=pointer]:
                  - /url: https://vt.tiktok.com/ZS9AfhVYjAJUb-HhBEF/
      - generic [ref=e209]:
        - link "Privacy & Data" [ref=e210] [cursor=pointer]:
          - /url: /privacy
        - link "Terms of Service" [ref=e211] [cursor=pointer]:
          - /url: /terms
        - link "Returns & Replacements" [ref=e212] [cursor=pointer]:
          - /url: /returns
        - button "Analytics choices" [ref=e213] [cursor=pointer]
      - generic [ref=e214]:
        - paragraph [ref=e215]: GCash and MariBank orders are paid before dispatch. Follow your order payment details and upload your receipt for funds verification. Pasabuy requests receive a custom quote.
        - paragraph [ref=e216]: © 2026 K2 Jimzon · Direct Italian imports
        - paragraph [ref=e217]: "Development preview: fallback products and reviews are illustrative. Production displays database-backed published records."
  - navigation "Mobile storefront" [ref=e219]:
    - generic [ref=e220]:
      - link "Home" [ref=e221] [cursor=pointer]:
        - /url: /
      - link "Inventory & Catalog" [ref=e225] [cursor=pointer]:
        - /url: /catalog
        - generic [ref=e228]: Shop
      - link "Pasabuy" [ref=e230] [cursor=pointer]:
        - /url: /pasabuy
      - link "Wholesale" [ref=e234] [cursor=pointer]:
        - /url: /trade
      - link "Contact" [ref=e238] [cursor=pointer]:
        - /url: /contact
  - region "Optional analytics" [ref=e242]:
    - button "Close analytics choices" [ref=e243] [cursor=pointer]
    - heading "Optional analytics" [level=2] [ref=e246]
    - paragraph [ref=e247]: With your permission, Google Analytics helps us understand visits to our public pages. We exclude your search terms, forms and private account or order pages.
    - generic [ref=e248]:
      - button "Accept analytics" [ref=e249] [cursor=pointer]
      - button "Decline" [ref=e250] [cursor=pointer]
    - button "Privacy & Data" [ref=e251] [cursor=pointer]
```

# Test source

```ts
  83  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  84  |     await page.screenshot({ path: test.info().outputPath(`express-review-${width}.png`), fullPage: true })
  85  |   }
  86  |   await review.getByRole('button', { name: 'Accept final total' }).click()
  87  |   await expect(review.getByRole('button', { name: 'Retry saved approval' })).toBeVisible()
  88  |   const held = await page.evaluate(ref => JSON.parse(localStorage.getItem(`k2-express-acceptance-v1:${ref}`)), reference)
  89  |   expect(held.state).toBe('pending'); expect(held.body).toEqual(requests[0]); expect(held.identity).toBe('guest')
  90  |   await page.reload()
  91  |   await expect(review.getByRole('button', { name: 'Retry saved approval' })).toBeVisible()
  92  |   await review.getByRole('button', { name: 'Retry saved approval' }).click()
  93  |   await expect(review.getByText(/Delivery accepted. Final total/)).toBeVisible()
  94  |   expect(requests).toHaveLength(2); expect(requests[1]).toEqual(requests[0])
  95  |   expect(Object.keys(requests[0]).sort()).toEqual(['idempotencyKey', 'orderReference', 'quoteVersion'])
  96  |   const resolved = await page.evaluate(ref => JSON.parse(localStorage.getItem(`k2-express-acceptance-v1:${ref}`)), reference)
  97  |   expect(resolved.state).toBe('resolved'); expect(resolved.receipt.totalAmount).toBe(250)
  98  |   await expect(page.getByRole('heading', { name: 'Pay by QR transfer' })).toHaveCount(0)
  99  | })
  100 |
  101 | test('express buyer malformed recovery refuses before sending approval', async ({ page }) => {
  102 |   await catalog(page)
  103 |   const reference = 'WEB-DUMMYEXPRESS02'; let calls = 0
  104 |   await page.route('**/api/storefront/order/status', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true,
  105 |     orders: [{ public_reference: reference, status: 'submitted', payment_status: 'not_requested', shipping_quote_status: 'pending_quote', total_amount: null,
  106 |       express_quote: { quoteVersion: 1, courier: 'Grab', feeMinor: 0, subtotal: 100, discountAmount: 0, proposedTotal: 100,
  107 |         quotedAt: new Date(Date.now() - 60000).toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString(), availabilityNote: 'Synthetic zero-fee quote', accepted: false } }] }) }))
  108 |   await page.route('**/api/storefront/order/delivery-accept', route => { calls++; return route.abort() })
  109 |   await page.evaluate(ref => localStorage.setItem(`k2-express-acceptance-v1:${ref}`, '{invalid'), reference)
  110 |   await page.goto('/confirmation')
  111 |   const review = page.getByRole('region', { name: `Express delivery review for ${reference}` })
  112 |   await expect(review.getByRole('alert')).toContainText('could not be restored safely')
  113 |   await review.getByRole('checkbox').check(); await review.getByRole('button', { name: 'Accept final total' }).click()
  114 |   await expect(review.getByRole('alert')).toContainText('could not be restored safely'); expect(calls).toBe(0)
  115 |   expect(await page.evaluate(ref => localStorage.getItem(`k2-express-acceptance-v1:${ref}`), reference)).toBe('{invalid')
  116 | })
  117 |
  118 | async function catalog(page, { sku = 'audit-product', stock = 5, stockReadFails = false, websiteReadFails = false, websiteEmpty = false } = {}) {
  119 |   let gallery = ['/images/placeholder.svg?second']
  120 |   await page.route('**/*', async route => {
  121 |     const url = new URL(route.request().url())
  122 |     if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort()
  123 |     if (url.pathname === '/api/storefront/delivery/locations') {
  124 |       const sourceVersion = 'psgc-2026-06-30'
  125 |       const parent = url.searchParams.get('parent')
  126 |       const place = parent === null ? { code: '1300000000', name: 'Synthetic NCR', level: 'Reg' }
  127 |         : parent === '1300000000' ? { code: '1380100000', name: 'Synthetic Caloocan', level: 'City' }
  128 |           : { code: '1380100001', name: 'Synthetic Barangay', level: 'Bgy' }
  129 |       return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, sourceVersion, children: [{ ...place, sourceVersion }] }) })
  130 |     }
  131 |     if (url.pathname === '/api/storefront/delivery/quote') {
  132 |       const { service } = route.request().postDataJSON()
  133 |       const quote = { service, status: service === 'express' ? 'pending_quote' : 'customer_confirmed', feeMinor: service === 'express' ? null : service === 'pickup' ? 0 : 9500,
  134 |         currency: 'PHP', inputFingerprint: 'a'.repeat(64), rateVersion: service === 'standard' ? 1 : null,
  135 |         weightG: service === 'pickup' ? null : 500, weightBasis: service === 'pickup' ? 'not_applicable' : 'estimated',
  136 |         area: service === 'pickup' ? null : 'NCR', sourceVersion: service === 'pickup' ? null : 'psgc-2026-06-30' }
  137 |       return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, quote }) })
  138 |     }
  139 |     if (url.pathname.startsWith('/rest/v1/')) {
  140 |       const table = url.pathname.split('/').pop()
  141 |       if (table === 'v_storefront_visible_skus' && websiteReadFails) {
  142 |         return route.fulfill({ status: 404, json: { code: 'PGRST205', message: 'synthetic missing Website view' } })
  143 |       }
  144 |       if (table === 'v_product_stock_from_batches' && stockReadFails) {
  145 |         return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'synthetic projection unavailable' }) })
  146 |       }
  147 |       const body = table === 'products' ? [{ sku, name: 'Audit pantry item', status: 'Live', published: true,
  148 |         srp: 735, stock_available: 47, primary_image_url: '/images/placeholder.svg', secondary_images: gallery, country_of_origin: 'Italy', description: 'Synthetic product.' }]
  149 |         : table === 'v_storefront_visible_skus' ? (websiteEmpty ? [] : [{ sku }]) : table === 'v_product_stock_from_batches' ? [{ sku, stock_from_batches: stock }] : []
  150 |       return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  151 |     }
  152 |     return route.continue()
  153 |   })
  154 |   await page.addInitScript(() => {
  155 |     let token = 0
  156 |     window.turnstile = { render: (_, options) => { queueMicrotask(() => options.callback(`synthetic-token-${++token}`)); return token }, remove: () => {} }
  157 |   })
  158 |   await page.goto(`/product/${sku}`, { waitUntil: 'domcontentloaded' })
  159 |   if (!websiteReadFails && !websiteEmpty) await expect(page.getByRole('heading', { level: 1, name: 'Audit pantry item' })).toBeVisible({ timeout: 90000 })
  160 |   return {
  161 |     shrink() { gallery = [] },
  162 |     failStock() { stockReadFails = true },
  163 |     restoreStock() { stockReadFails = false },
  164 |   }
  165 | }
  166 |
  167 | for (const failure of ['missing', 'unassigned']) test(`activated commerce hides a published product with ${failure} Website membership`, async ({ page }) => {
  168 |   await catalog(page, { websiteReadFails: failure === 'missing', websiteEmpty: failure === 'unassigned' })
  169 |   await expect(page.getByRole('heading', { level: 1, name: 'Product unavailable' })).toBeVisible({ timeout: 30000 })
  170 |   await expect(page.getByRole('heading', { level: 1, name: 'Audit pantry item' })).toHaveCount(0)
  171 | })
  172 |
  173 | async function acceptStandardDelivery(page) {
  174 |   await page.getByLabel('Region', { exact: true }).selectOption('1300000000')
  175 |   await page.getByLabel('City, municipality or area', { exact: true }).selectOption('1380100000')
  176 |   await page.getByLabel('Barangay', { exact: true }).selectOption('1380100001')
  177 |   await page.getByRole('checkbox', { name: /I accept/ }).check()
  178 | }
  179 |
  180 | test('a failed batch-stock read keeps the product visible but hides the stale row count', async ({ page }) => {
  181 |   page.on('pageerror', error => console.error(`Stock fixture browser error: ${error.message}`))
  182 |   const fixture = await catalog(page, { sku: 'projection-failure', stockReadFails: true })
> 183 |   await page.getByRole('link', { name: 'Catalog', exact: true }).click()
      |                                                                  ^ Error: locator.click: Test timeout of 180000ms exceeded.
  184 |   await expect(page.getByRole('heading', { level: 1, name: 'Explore the Italian cabinet.' })).toBeVisible()
  185 |
  186 |   const card = page.getByTestId('product-card')
  187 |   await expect(page.getByRole('heading', { level: 3, name: 'Audit pantry item' })).toBeVisible({ timeout: 90000 })
  188 |   await expect(page.getByText('Showing the last updated list. Stock may differ.', { exact: true })).toBeVisible()
  189 |   await expect(card.getByTestId('stock-count')).toHaveAttribute('aria-label', 'Stock check pending')
  190 |   await expect(card.getByRole('button', { name: 'Stock check pending for Audit pantry item' })).toBeDisabled()
  191 |   await expect(card.getByText('47 available', { exact: true })).toHaveCount(0)
  192 |
  193 |   fixture.restoreStock()
  194 |   await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  195 |   await expect(card.getByRole('button', { name: 'Add Audit pantry item to cart' })).toBeEnabled()
  196 |   await expect(card.getByTestId('stock-count')).toContainText('5')
  197 |   await expect(page.getByText('Showing the last updated list. Stock may differ.', { exact: true })).toHaveCount(0)
  198 |
  199 |   fixture.failStock()
  200 |   await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  201 |   await expect(card.getByTestId('stock-count')).toHaveAttribute('aria-label', 'Stock check pending')
  202 |   await expect(card.getByRole('button', { name: 'Stock check pending for Audit pantry item' })).toBeDisabled()
  203 |   await expect(card.getByText('47 available', { exact: true })).toHaveCount(0)
  204 |
  205 |   for (const width of [390, 1440]) {
  206 |     await page.setViewportSize({ width, height: 900 })
  207 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  208 |     await page.screenshot({ path: test.info().outputPath(`stock-read-failure-${width}.png`), fullPage: true })
  209 |   }
  210 | })
  211 |
  212 | test('reviewed delivery still requires contact before any order transport', async ({ page }) => {
  213 |   await catalog(page)
  214 |   const submissions = []
  215 |   page.on('request', request => { if (new URL(request.url()).pathname === '/api/storefront/order') submissions.push(request) })
  216 |   await page.getByRole('button', { name: /Add to cart/ }).click()
  217 |   await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  218 |   await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
  219 |   await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic Manila address')
  220 |   await acceptStandardDelivery(page)
  221 |   await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  222 |   await expect(page.getByRole('alert')).toContainText(/email address or mobile number/i)
  223 |   expect(submissions).toHaveLength(0)
  224 | })
  225 |
  226 | test('uncertain checkout freezes details and retries the same payload with a fresh challenge', async ({ page }) => {
  227 |   await catalog(page)
  228 |   const submissions = []
  229 |   await page.route('**/api/storefront/order', async route => {
  230 |     submissions.push(route.request().postDataJSON())
  231 |     if (submissions.length === 1) return route.abort('failed')
  232 |     return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: { public_reference: 'AUDIT-1', total_amount: 735, status: 'submitted' } }) })
  233 |   })
  234 |   await page.getByRole('button', { name: /Add to cart/ }).click()
  235 |   await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  236 |   await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
  237 |   await page.getByLabel('Email address', { exact: true }).fill('audit@example.test')
  238 |   await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic Manila address')
  239 |   await acceptStandardDelivery(page)
  240 |   await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  241 |   await expect(page.getByRole('alert')).toBeVisible()
  242 |   await expect(page.getByLabel('Full name', { exact: true })).toBeDisabled()
  243 |   expect(await page.evaluate(() => {
  244 |     const event = new Event('beforeunload', { cancelable: true })
  245 |     window.dispatchEvent(event)
  246 |     return event.defaultPrevented
  247 |   })).toBe(true)
  248 |   await page.getByRole('button', { name: /Retry order request/ }).click()
  249 |   await expect(page.getByText('AUDIT-1', { exact: false }).first()).toBeVisible({ timeout: 30000 })
  250 |   expect(submissions).toHaveLength(2)
  251 |   const { botToken: firstToken, ...first } = submissions[0]
  252 |   const { botToken: secondToken, ...second } = submissions[1]
  253 |   expect(second).toEqual(first)
  254 |   expect(secondToken).not.toBe(firstToken)
  255 |   expect(await page.evaluate(() => {
  256 |     const event = new Event('beforeunload', { cancelable: true })
  257 |     window.dispatchEvent(event)
  258 |     return event.defaultPrevented
  259 |   })).toBe(false)
  260 | })
  261 |
  262 | test('definite server rejection unlocks form and submits with fresh idempotency key', async ({ page }) => {
  263 |   await catalog(page)
  264 |   const submissions = []
  265 |   await page.route('**/api/storefront/order', async route => {
  266 |     submissions.push(route.request().postDataJSON())
  267 |     if (submissions.length === 1) {
  268 |       return route.fulfill({
  269 |         status: 400,
  270 |         contentType: 'application/json',
  271 |         body: JSON.stringify({ ok: false, error: { code: 'CONTACT_REQUIRED', message: 'Valid contact details are required.' } }),
  272 |       })
  273 |     }
  274 |     return route.fulfill({
  275 |       status: 201,
  276 |       contentType: 'application/json',
  277 |       body: JSON.stringify({ ok: true, receipt: { public_reference: 'AUDIT-CONTACT-FIXED', total_amount: 735, status: 'submitted' } }),
  278 |     })
  279 |   })
  280 |   await page.getByRole('button', { name: /Add to cart/ }).click()
  281 |   await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  282 |   await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
  283 |   await page.getByLabel('Email address', { exact: true }).fill('audit@example.test')
```
