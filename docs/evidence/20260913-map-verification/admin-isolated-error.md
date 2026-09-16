# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-dashboard-redesign.spec.js >> admin command center redesign >> left-panel widgets show one workspace and preserve every dashboard destination
- Location: tests\admin-dashboard-redesign.spec.js:190:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Operations command center' })
Expected: visible
Timeout: 60000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 60000ms
  - waiting for getByRole('heading', { name: 'Operations command center' })

```

# Test source

```ts
  92  |   channel_listings: [
  93  |     { channel_source: 'website', publication_status: 'published', validation_errors: [], last_synced_at: daysAgo(0), sync_error: null },
  94  |     { channel_source: 'website', publication_status: 'published', validation_errors: [], last_synced_at: daysAgo(0), sync_error: null },
  95  |     { channel_source: 'shopee', publication_status: 'ready', validation_errors: [], last_synced_at: null, sync_error: null },
  96  |     { channel_source: 'shopee', publication_status: 'error', validation_errors: ['missing image'], last_synced_at: null, sync_error: 'Validation failed' },
  97  |     { channel_source: 'tiktok', publication_status: 'ready', validation_errors: [], last_synced_at: null, sync_error: null },
  98  |     { channel_source: 'lazada', publication_status: 'draft', validation_errors: [], last_synced_at: null, sync_error: null },
  99  |   ],
  100 |   v_channel_catalog_readiness: [
  101 |     { channel: 'shopee', publication_status: 'ready', missing_fields: [] },
  102 |     { channel: 'shopee', publication_status: 'draft', missing_fields: ['image'] },
  103 |     { channel: 'tiktok', publication_status: 'ready', missing_fields: [] },
  104 |     { channel: 'lazada', publication_status: 'draft', missing_fields: ['seller_sku'] },
  105 |   ],
  106 |   products,
  107 |   conversations,
  108 |   orders: [],
  109 | }
  110 | 
  111 | async function installSupabaseFixture(page) {
  112 |   let productIntakeSession = null
  113 |   const session = {
  114 |     access_token: 'visual-test-access-token',
  115 |     refresh_token: 'visual-test-refresh-token',
  116 |     expires_in: 3600,
  117 |     expires_at: Math.floor(Date.now() / 1000) + 3600,
  118 |     token_type: 'bearer',
  119 |     user,
  120 |   }
  121 | 
  122 |   await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: storageKey, value: session })
  123 | 
  124 |   await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }))
  125 |   await page.route('**/rest/v1/**', async route => {
  126 |     const request = route.request()
  127 |     const url = new URL(request.url())
  128 |     const table = url.pathname.split('/').pop()
  129 | 
  130 |     if (table === 'product_intake_sessions') {
  131 |       if (request.method() === 'POST') {
  132 |         productIntakeSession = {
  133 |           id: '40000000-0000-4000-8000-000000000001',
  134 |           status: 'active',
  135 |           checklist_step: 'identify',
  136 |           packaging_images: [],
  137 |           evidence_checklist: {},
  138 |           inventory_result: null,
  139 |         }
  140 |       } else if (request.method() === 'PATCH' && productIntakeSession) {
  141 |         productIntakeSession = {
  142 |           ...productIntakeSession,
  143 |           ...request.postDataJSON(),
  144 |         }
  145 |       }
  146 |       const wantsObject = (request.headers().accept || '').includes('application/vnd.pgrst.object+json')
  147 |       const body = request.method() === 'GET' && !wantsObject
  148 |         ? (productIntakeSession ? [productIntakeSession] : [])
  149 |         : productIntakeSession
  150 |       return route.fulfill({
  151 |         status: request.method() === 'POST' ? 201 : 200,
  152 |         contentType: 'application/json',
  153 |         headers: { 'content-range': productIntakeSession ? '0-0/1' : '*/0' },
  154 |         body: JSON.stringify(body),
  155 |       })
  156 |     }
  157 | 
  158 |     if (table === 'user_profiles' && (url.searchParams.get('select') || '').includes('email')) {
  159 |       return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: user.id, email: user.email, full_name: 'K2 Operations', role: 'Admin' }]) })
  160 |     }
  161 | 
  162 |     if (table === 'user_profiles') {
  163 |       return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'Admin' }) })
  164 |     }
  165 | 
  166 |     const rows = fixtures[table] || []
  167 |     if (request.method() === 'HEAD') {
  168 |       let count = rows.length
  169 |       if (table === 'order_requests' && url.searchParams.get('status') === 'eq.submitted') count = 4
  170 |       if (table === 'orders') count = 3
  171 |       if (table === 'products' && url.searchParams.has('stock_available')) count = 7
  172 |       return route.fulfill({ status: 200, headers: { 'access-control-expose-headers': 'content-range', 'content-range': count ? `0-${count - 1}/${count}` : '*/0' } })
  173 |     }
  174 | 
  175 |     return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-expose-headers': 'content-range', 'content-range': rows.length ? `0-${rows.length - 1}/${rows.length}` : '*/0' }, body: JSON.stringify(rows) })
  176 |   })
  177 | }
  178 | 
  179 | test.describe('admin command center redesign', () => {
  180 |   test.beforeEach(async ({ page }) => {
  181 |     await page.addInitScript(() => {
  182 |       window.turnstile = {
  183 |         render: (_, options) => { options.callback('verified-admin-test-token'); return 1 },
  184 |         remove: () => {},
  185 |       }
  186 |     })
  187 |     await installSupabaseFixture(page)
  188 |   })
  189 | 
  190 |   test('left-panel widgets show one workspace and preserve every dashboard destination', async ({ page }) => {
  191 |     await page.goto('/admin-portal-k2-secure')
> 192 |     await expect(page.getByRole('heading', { name: 'Operations command center' })).toBeVisible({ timeout: 60000 })
      |                                                                                    ^ Error: expect(locator).toBeVisible() failed
  193 |     const widgets = page.getByRole('navigation', { name: 'Dashboard widgets' })
  194 |     await expect(widgets.getByRole('button', { name: 'Shop & channel metrics', exact: true })).toHaveAttribute('aria-current', 'page')
  195 |     await expect(page.getByRole('heading', { name: 'Channel performance and readiness' })).toBeVisible()
  196 |     await expect(page.getByRole('heading', { name: 'Sales computation summary' })).toBeHidden()
  197 |     for (const [name, heading] of [['Sales & records', 'Sales computation summary'], ['Revenue trend', 'Verified revenue trend'], ['Priority work', 'Priority queue'], ['Inbox metrics', 'Inbox workload'], ['Pasabuy metrics', 'Pasabuy pipeline'], ['Stock metrics', 'Inventory health']]) {
  198 |       await widgets.getByRole('button', { name, exact: true }).click()
  199 |       await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  200 |       await expect(page.getByRole('heading', { name: 'Channel performance and readiness' })).toBeHidden()
  201 |     }
  202 |     await page.getByRole('button', { name: 'Inventory', exact: true }).click()
  203 |     await widgets.getByRole('button', { name: 'Shop & channel metrics', exact: true }).click()
  204 |     await expect(page.getByRole('heading', { name: 'Channel performance and readiness' })).toBeVisible()
  205 |     await expect(page.getByText('Traffic, conversion and ad spend')).toBeVisible()
  206 |     expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  207 |   })
  208 | 
  209 |   test('widget source failures stay unavailable and recover without inventing zero totals', async ({ page }) => {
  210 |     let fail = true
  211 |     await page.route('**/rest/v1/order_requests*', route => fail
  212 |       ? route.fulfill({ status: 403, json: { message: 'fixture source unavailable' } })
  213 |       : route.fallback())
  214 |     await page.goto('/admin-portal-k2-secure')
  215 |     await expect(page.getByRole('region', { name: 'Key performance indicators' }).getByText('Unavailable', { exact: true })).toHaveCount(4)
  216 |     await expect(page.getByRole('group', { name: 'Website metrics', exact: true })).toContainText('Unavailable')
  217 |     const widgets = page.getByRole('navigation', { name: 'Dashboard widgets' })
  218 |     await widgets.getByRole('button', { name: 'Sales & records', exact: true }).click()
  219 |     await expect(page.getByText('This widget is unavailable because its records could not be retrieved.', { exact: false })).toBeVisible()
  220 |     await expect(page.getByRole('button', { name: 'Review records', exact: true })).toBeHidden()
  221 |     await widgets.getByRole('button', { name: 'Inbox metrics', exact: true }).click()
  222 |     await expect(page.getByRole('heading', { name: 'Inbox workload' })).toBeVisible()
  223 |     fail = false
  224 |     await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  225 |     await widgets.getByRole('button', { name: 'Sales & records', exact: true }).click()
  226 |     await expect(page.getByRole('region', { name: 'Sales computation summary' })).toContainText('₱38,885')
  227 |   })
  228 | 
  229 |   test('unknown channels remain separate and empty records are not marketplace analytics', async ({ page }) => {
  230 |     await page.route('**/rest/v1/order_requests*', route => route.request().method() === 'HEAD'
  231 |       ? route.fallback()
  232 |       : route.fulfill({ json: [{ ...orders[0], channel_source: 'unmapped_seller', total_amount: 321 }] }))
  233 |     await page.goto('/admin-portal-k2-secure')
  234 |     await expect(page.getByRole('group', { name: 'Other / unrecognized metrics', exact: true })).toContainText('₱321')
  235 |     await expect(page.getByRole('group', { name: 'Website metrics', exact: true })).toContainText('₱0')
  236 |     await expect(page.getByText('Zero means no matching internal records were returned.', { exact: false })).toBeVisible()
  237 |   })
  238 | 
  239 |   test('phone metrics and navigation stay readable and incomplete totals cannot be exported', async ({ page }) => {
  240 |     await page.setViewportSize({ width: 375, height: 812 })
  241 |     await page.emulateMedia({ reducedMotion: 'reduce' })
  242 |     await page.goto('/admin-portal-k2-secure')
  243 |     await expect(page.getByRole('group', { name: 'Website metrics', exact: true })).toContainText('₱11,500')
  244 |     const chooser = page.getByLabel('Dashboard widget', { exact: true })
  245 |     await expect(chooser).toHaveValue('metrics')
  246 |     expect((await chooser.boundingBox()).height).toBeGreaterThanOrEqual(44)
  247 |     await chooser.focus()
  248 |     await expect(chooser).toBeFocused()
  249 |     await page.screenshot({ path: 'docs/evidence/20260906-admin-widgets/mobile-metrics.png', fullPage: true })
  250 |     await page.getByRole('button', { name: 'More', exact: true }).click()
  251 |     await page.getByRole('navigation', { name: 'Dashboard widgets' }).getByRole('button', { name: 'Stock metrics', exact: true }).click()
  252 |     await expect(chooser).toHaveValue('stock')
  253 |     await expect(page.getByRole('heading', { name: 'Inventory health' })).toBeVisible()
  254 |     await page.route('**/rest/v1/order_requests*', route => route.request().method() === 'HEAD' ? route.fallback() : route.fulfill({ headers: { 'content-range': '0-0/1001', 'access-control-expose-headers': 'content-range' }, json: [orders[0]] }))
  255 |     await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  256 |     await chooser.selectOption('sales')
  257 |     await expect(page.getByText('This widget is unavailable because its records could not be retrieved.', { exact: false })).toBeVisible()
  258 |     await expect(page.getByRole('button', { name: /Download CSV/ })).toBeHidden()
  259 |     let releaseRead
  260 |     const pendingRead = new Promise(resolve => { releaseRead = resolve })
  261 |     await page.route('**/rest/v1/order_requests*', async route => {
  262 |       if (route.request().method() === 'HEAD') return route.fallback()
  263 |       await pendingRead
  264 |       return route.fulfill({ headers: { 'content-range': '*/0', 'access-control-expose-headers': 'content-range' }, json: [] })
  265 |     })
  266 |     await page.getByRole('button', { name: '7D', exact: true }).click()
  267 |     await expect(page.getByText('Loading this widget’s records…')).toBeVisible()
  268 |     await expect(page.getByRole('button', { name: /Download CSV/ })).toBeHidden()
  269 |     releaseRead()
  270 |     expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  271 |   })
  272 | 
  273 |   test('malformed stock source stays unavailable and new stock reflects on visibility refresh', async ({ page }) => {
  274 |     let rows = { invalid: 'fixture' }
  275 |     await page.route('**/rest/v1/products*', route => {
  276 |       if (route.request().method() === 'HEAD') return route.fallback()
  277 |       return route.fulfill({ json: rows })
  278 |     })
  279 |     await page.goto('/admin-portal-k2-secure')
  280 |     await page.getByRole('navigation', { name: 'Dashboard widgets' }).getByRole('button', { name: 'Stock metrics', exact: true }).click()
  281 |     await expect(page.getByText('This widget is unavailable because its records could not be retrieved.', { exact: false })).toBeVisible()
  282 |     rows = [{ ...products[0], stock_available: 18 }]
  283 |     await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  284 |     await expect(page.getByRole('heading', { name: 'Inventory health', exact: true })).toBeVisible()
  285 |     await expect(page.getByText('Some analytics are unavailable', { exact: false })).toBeHidden()
  286 |     const skuTotal = page.getByText('Catalog SKUs', { exact: true }).locator('../..').locator('p').last()
  287 |     await expect(skuTotal).toHaveText('1')
  288 |     rows = [{ ...products[0], stock_available: 18 }, { ...products[1], stock_available: 0 }]
  289 |     await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  290 |     await expect(skuTotal).toHaveText('2')
  291 |     await expect(page.getByText('Out of stock', { exact: true }).locator('../..').locator('p').last()).toHaveText('1')
  292 |     rows = null
```