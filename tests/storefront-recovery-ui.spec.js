import { test, expect } from '@playwright/test'

test('legacy charge review withholds cached payment and survives failed or late refresh', async ({ page }) => {
  await catalog(page)
  const reference = 'SYNTHETIC-LEGACY-CHARGE'
  const saved = { public_reference: reference, total_amount: 107, shipping_quote_status: 'customer_confirmed',
    status: 'submitted', payment_status: 'awaiting_instructions', item_count: 1 }
  let reads = 0, mode = 'initial', releaseOlder
  const initialReads = []
  await page.route('**/api/storefront/order/status', async route => {
    reads += 1
    const stage = mode
    if (stage === 'initial') await new Promise(resolve => { initialReads.push(resolve) })
    if (stage === 'older') await new Promise(resolve => { releaseOlder = resolve })
    if (stage === 'failed') return route.abort('failed')
    return route.fulfill({ status: 200, json: { ok: true, orders: [{ ...saved,
      status: stage === 'cancelled' ? 'cancelled' : saved.status,
      delivery_review_required: stage === 'initial', total_amount: stage === 'initial' ? null : 107 }] } })
  })
  await page.route('**/api/storefront/order', route => route.fulfill({ status: 201, json: { ok: true, receipt: saved } }))
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
  await page.getByLabel('Email address', { exact: true }).fill('audit@example.test')
  await page.getByRole('radio', { name: /K2 Warehouse Pickup/ }).check()
  await page.getByRole('checkbox', { name: /I accept/ }).check()
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect.poll(() => initialReads.length).toBeGreaterThan(0)
  await expect(page.getByRole('heading', { name: 'Pay by QR transfer' })).toHaveCount(0)
  initialReads.forEach(resolve => resolve())
  await expect(page.getByText(/Total needs staff review/)).toBeVisible()
  await expect(page.getByText(/Your recorded payment history is kept/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'View your messages' })).toBeVisible()
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/evidence/20261001-authoritative-delivery/m-legacy-charge-review-${width}.png`, fullPage: true })
  }
  mode = 'canonical'
  await page.getByRole('button', { name: 'Refresh order status' }).click()
  await expect(page.getByRole('heading', { name: 'Pay by QR transfer' })).toBeVisible()
  mode = 'older'
  await page.getByRole('button', { name: 'Refresh order status' }).click()
  await expect.poll(() => Boolean(releaseOlder)).toBe(true)
  await expect(page.getByRole('heading', { name: 'Pay by QR transfer' })).toHaveCount(0)
  mode = 'failed'
  await page.getByRole('button', { name: 'Refresh order status' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  releaseOlder()
  expect(reads).toBeGreaterThanOrEqual(4)
  await expect(page.getByRole('heading', { name: 'Pay by QR transfer' })).toHaveCount(0)
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText(reference, { exact: true })).toBeVisible()
  mode = 'cancelled'
  await page.getByRole('button', { name: 'Refresh order status' }).click()
  await expect(page.getByText(/total ₱107/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pay by QR transfer' })).toHaveCount(0)
})

test('express buyer approval keeps exact unknown request through reload and accepted refresh', async ({ page }) => {
  await catalog(page)
  const reference = 'WEB-DUMMYEXPRESS01', requests = []
  let accepted = false
  const quote = { quoteVersion: 1, courier: 'Lalamove', feeMinor: 15000, subtotal: 100, discountAmount: 0,
    proposedTotal: 250, quotedAt: new Date(Date.now() - 60000).toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString(),
    availabilityNote: 'Synthetic courier availability; no booking', accepted: false }
  await page.route('**/api/storefront/order/status', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true,
    orders: [{ public_reference: reference, status: 'submitted', payment_status: 'not_requested', shipping_quote_status: accepted ? 'customer_confirmed' : 'pending_quote',
      total_amount: accepted ? 250 : null, item_count: 1, express_quote: { ...quote, accepted } }] }) }))
  await page.route('**/api/storefront/order/delivery-accept', async route => {
    requests.push(route.request().postDataJSON()); accepted = true
    if (requests.length === 1) return route.abort('failed')
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: {
      orderReference: reference, quoteVersion: 1, shippingQuoteStatus: 'customer_confirmed', totalAmount: 250, acceptedAt: '2026-10-08T05:00:00.000Z' } }) })
  })
  await page.goto('/confirmation')
  const review = page.getByRole('region', { name: `Express delivery review for ${reference}` })
  await expect(review.getByText('Complete total', { exact: true })).toBeVisible()
  await expect(review.getByRole('button', { name: 'Accept final total' })).toBeDisabled()
  await review.getByRole('checkbox').check()
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`express-review-${width}.png`), fullPage: true })
  }
  await review.getByRole('button', { name: 'Accept final total' }).click()
  await expect(review.getByRole('button', { name: 'Retry saved approval' })).toBeVisible()
  const held = await page.evaluate(ref => JSON.parse(localStorage.getItem(`k2-express-acceptance-v1:${ref}`)), reference)
  expect(held.state).toBe('pending'); expect(held.body).toEqual(requests[0]); expect(held.identity).toBe('guest')
  await page.reload()
  await expect(review.getByRole('button', { name: 'Retry saved approval' })).toBeVisible()
  await review.getByRole('button', { name: 'Retry saved approval' }).click()
  await expect(review.getByText(/Delivery accepted. Final total/)).toBeVisible()
  expect(requests).toHaveLength(2); expect(requests[1]).toEqual(requests[0])
  expect(Object.keys(requests[0]).sort()).toEqual(['idempotencyKey', 'orderReference', 'quoteVersion'])
  const resolved = await page.evaluate(ref => JSON.parse(localStorage.getItem(`k2-express-acceptance-v1:${ref}`)), reference)
  expect(resolved.state).toBe('resolved'); expect(resolved.receipt.totalAmount).toBe(250)
  await expect(page.getByRole('heading', { name: 'Pay by QR transfer' })).toHaveCount(0)
})

test('express buyer malformed recovery refuses before sending approval', async ({ page }) => {
  await catalog(page)
  const reference = 'WEB-DUMMYEXPRESS02'; let calls = 0
  await page.route('**/api/storefront/order/status', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true,
    orders: [{ public_reference: reference, status: 'submitted', payment_status: 'not_requested', shipping_quote_status: 'pending_quote', total_amount: null,
      express_quote: { quoteVersion: 1, courier: 'Grab', feeMinor: 0, subtotal: 100, discountAmount: 0, proposedTotal: 100,
        quotedAt: new Date(Date.now() - 60000).toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString(), availabilityNote: 'Synthetic zero-fee quote', accepted: false } }] }) }))
  await page.route('**/api/storefront/order/delivery-accept', route => { calls++; return route.abort() })
  await page.evaluate(ref => localStorage.setItem(`k2-express-acceptance-v1:${ref}`, '{invalid'), reference)
  await page.goto('/confirmation')
  const review = page.getByRole('region', { name: `Express delivery review for ${reference}` })
  await expect(review.getByRole('alert')).toContainText('could not be restored safely')
  await review.getByRole('checkbox').check(); await review.getByRole('button', { name: 'Accept final total' }).click()
  await expect(review.getByRole('alert')).toContainText('could not be restored safely'); expect(calls).toBe(0)
  expect(await page.evaluate(ref => localStorage.getItem(`k2-express-acceptance-v1:${ref}`), reference)).toBe('{invalid')
})

async function catalog(page, { sku = 'audit-product', stock = 5, stockReadFails = false, websiteReadFails = false, websiteEmpty = false } = {}) {
  let gallery = ['/images/placeholder.svg?second']
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort()
    if (url.pathname === '/api/storefront/delivery/locations') {
      const sourceVersion = 'psgc-2026-06-30'
      const parent = url.searchParams.get('parent')
      const place = parent === null ? { code: '1300000000', name: 'Synthetic NCR', level: 'Reg' }
        : parent === '1300000000' ? { code: '1380100000', name: 'Synthetic Caloocan', level: 'City' }
          : { code: '1380100001', name: 'Synthetic Barangay', level: 'Bgy' }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, sourceVersion, children: [{ ...place, sourceVersion }] }) })
    }
    if (url.pathname === '/api/storefront/delivery/quote') {
      const { service } = route.request().postDataJSON()
      const quote = { service, status: service === 'express' ? 'pending_quote' : 'customer_confirmed', feeMinor: service === 'express' ? null : service === 'pickup' ? 0 : 9500,
        currency: 'PHP', inputFingerprint: 'a'.repeat(64), rateVersion: service === 'standard' ? 1 : null,
        weightG: service === 'pickup' ? null : 500, weightBasis: service === 'pickup' ? 'not_applicable' : 'estimated',
        area: service === 'pickup' ? null : 'NCR', sourceVersion: service === 'pickup' ? null : 'psgc-2026-06-30' }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, quote }) })
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.split('/').pop()
      if (table === 'v_storefront_visible_skus' && websiteReadFails) {
        return route.fulfill({ status: 404, json: { code: 'PGRST205', message: 'synthetic missing Website view' } })
      }
      if (table === 'v_product_stock_from_batches' && stockReadFails) {
        return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'synthetic projection unavailable' }) })
      }
      const body = table === 'products' ? [{ sku, name: 'Audit pantry item', status: 'Live', published: true,
        srp: 735, stock_available: 47, primary_image_url: '/images/placeholder.svg', secondary_images: gallery, country_of_origin: 'Italy', description: 'Synthetic product.' }]
        : table === 'v_storefront_visible_skus' ? (websiteEmpty ? [] : [{ sku }]) : table === 'v_product_stock_from_batches' ? [{ sku, stock_from_batches: stock }] : []
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    }
    return route.continue()
  })
  await page.addInitScript(() => {
    let token = 0
    window.turnstile = { render: (_, options) => { queueMicrotask(() => options.callback(`synthetic-token-${++token}`)); return token }, remove: () => {} }
  })
  await page.goto(`/product/${sku}`, { waitUntil: 'domcontentloaded' })
  if (!websiteReadFails && !websiteEmpty) await expect(page.getByRole('heading', { level: 1, name: 'Audit pantry item' })).toBeVisible({ timeout: 90000 })
  return {
    shrink() { gallery = [] },
    failStock() { stockReadFails = true },
    restoreStock() { stockReadFails = false },
  }
}

for (const failure of ['missing', 'unassigned']) test(`activated commerce hides a published product with ${failure} Website membership`, async ({ page }) => {
  await catalog(page, { websiteReadFails: failure === 'missing', websiteEmpty: failure === 'unassigned' })
  await expect(page.getByRole('heading', { level: 1, name: 'Product unavailable' })).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Audit pantry item' })).toHaveCount(0)
})

async function acceptStandardDelivery(page) {
  await page.getByLabel('Region', { exact: true }).selectOption('1300000000')
  await page.getByLabel('City, municipality or area', { exact: true }).selectOption('1380100000')
  await page.getByLabel('Barangay', { exact: true }).selectOption('1380100001')
  await page.getByRole('checkbox', { name: /I accept/ }).check()
}

test('a failed batch-stock read keeps the product visible but hides the stale row count', async ({ page }) => {
  page.on('pageerror', error => console.error(`Stock fixture browser error: ${error.message}`))
  const fixture = await catalog(page, { sku: 'projection-failure', stockReadFails: true })
  await page.getByRole('button', { name: 'Catalog', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Explore the Italian cabinet.' })).toBeVisible()

  const card = page.getByTestId('product-card')
  await expect(page.getByRole('heading', { level: 3, name: 'Audit pantry item' })).toBeVisible({ timeout: 90000 })
  await expect(page.getByText('Showing the last updated list. Stock may differ.', { exact: true })).toBeVisible()
  await expect(card.getByTestId('stock-count')).toHaveAttribute('aria-label', 'Stock check pending')
  await expect(card.getByRole('button', { name: 'Stock check pending for Audit pantry item' })).toBeDisabled()
  await expect(card.getByText('47 available', { exact: true })).toHaveCount(0)

  fixture.restoreStock()
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(card.getByRole('button', { name: 'Add Audit pantry item to cart' })).toBeEnabled()
  await expect(card.getByTestId('stock-count')).toContainText('5')
  await expect(page.getByText('Showing the last updated list. Stock may differ.', { exact: true })).toHaveCount(0)

  fixture.failStock()
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(card.getByTestId('stock-count')).toHaveAttribute('aria-label', 'Stock check pending')
  await expect(card.getByRole('button', { name: 'Stock check pending for Audit pantry item' })).toBeDisabled()
  await expect(card.getByText('47 available', { exact: true })).toHaveCount(0)

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`stock-read-failure-${width}.png`), fullPage: true })
  }
})

test('reviewed delivery still requires contact before any order transport', async ({ page }) => {
  await catalog(page)
  const submissions = []
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/storefront/order') submissions.push(request) })
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
  await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic Manila address')
  await acceptStandardDelivery(page)
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(/email address or mobile number/i)
  expect(submissions).toHaveLength(0)
})

test('uncertain checkout freezes details and retries the same payload with a fresh challenge', async ({ page }) => {
  await catalog(page)
  const submissions = []
  await page.route('**/api/storefront/order', async route => {
    submissions.push(route.request().postDataJSON())
    if (submissions.length === 1) return route.abort('failed')
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: { public_reference: 'AUDIT-1', total_amount: 735, status: 'submitted' } }) })
  })
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
  await page.getByLabel('Email address', { exact: true }).fill('audit@example.test')
  await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic Manila address')
  await acceptStandardDelivery(page)
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('Full name', { exact: true })).toBeDisabled()
  expect(await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    return event.defaultPrevented
  })).toBe(true)
  await page.getByRole('button', { name: /Retry order request/ }).click()
  await expect(page.getByText('AUDIT-1', { exact: false }).first()).toBeVisible({ timeout: 30000 })
  expect(submissions).toHaveLength(2)
  const { botToken: firstToken, ...first } = submissions[0]
  const { botToken: secondToken, ...second } = submissions[1]
  expect(second).toEqual(first)
  expect(secondToken).not.toBe(firstToken)
  expect(await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    return event.defaultPrevented
  })).toBe(false)
})

test('definite server rejection unlocks form and submits with fresh idempotency key', async ({ page }) => {
  await catalog(page)
  const submissions = []
  await page.route('**/api/storefront/order', async route => {
    submissions.push(route.request().postDataJSON())
    if (submissions.length === 1) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: { code: 'CONTACT_REQUIRED', message: 'Valid contact details are required.' } }),
      })
    }
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, receipt: { public_reference: 'AUDIT-CONTACT-FIXED', total_amount: 735, status: 'submitted' } }),
    })
  })
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
  await page.getByLabel('Email address', { exact: true }).fill('audit@example.test')
  await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic Manila address')
  await acceptStandardDelivery(page)
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('Full name', { exact: true })).toBeEnabled()
  await expect(page.getByLabel('Mobile number', { exact: true })).toBeEnabled()
  await page.getByLabel('Mobile number', { exact: true }).fill('+63 917 123 4567')
  await page.getByRole('checkbox', { name: /I accept/ }).check()

  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByText('AUDIT-CONTACT-FIXED', { exact: false }).first()).toBeVisible({ timeout: 30000 })

  expect(submissions).toHaveLength(2)
  expect(submissions[1].phone).toBe('+63 917 123 4567')
  expect(submissions[1].idempotencyKey).not.toBe(submissions[0].idempotencyKey)
})

test('uncertain checkout contact navigation preserves original request identity', async ({ page }) => {
  await catalog(page)
  const submissions = []
  await page.route('**/api/storefront/order', async route => {
    submissions.push(route.request().postDataJSON())
    if (submissions.length === 1) return route.abort('failed')
    if (submissions.length === 2) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: { code: 'INSUFFICIENT_STOCK' } }) })
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: { public_reference: 'AUDIT-HELD', total_amount: 830, status: 'submitted', shipping_quote_status: 'customer_confirmed' } }) })
  })
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
  await page.getByLabel('Email address', { exact: true }).fill('audit@example.test')
  await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic Manila address')
  await acceptStandardDelivery(page)
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByRole('button', { name: /Retry order request/ })).toBeVisible()
  await page.getByRole('button', { name: 'Contact K2 about this request' }).click()
  await expect(page.getByRole('heading', { name: 'Your K2 conversations' })).toBeVisible()
  await page.goBack()
  await expect(page.getByLabel('Full name', { exact: true })).toBeDisabled()
  await page.getByRole('button', { name: /Retry order request/ }).click()
  await expect(page.getByLabel('Full name', { exact: true })).toBeEnabled()
  await acceptStandardDelivery(page)
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByText('AUDIT-HELD', { exact: false }).first()).toBeVisible()
  const { botToken: ignoredFirst, ...first } = submissions[0]
  const { botToken: ignoredSecond, ...second } = submissions[1]
  expect(second).toEqual(first)
  expect(submissions[2].idempotencyKey).not.toBe(submissions[0].idempotencyKey)
})

test('server rejection on retry unlocks form for editing with fresh idempotency key', async ({ page }) => {
  await catalog(page)
  const submissions = []
  await page.route('**/api/storefront/order', async route => {
    submissions.push(route.request().postDataJSON())
    if (submissions.length === 1) {
      return route.abort('failed')
    }
    if (submissions.length === 2) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: { code: 'INSUFFICIENT_STOCK', message: 'The requested quantity is no longer available.' } }),
      })
    }
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, receipt: { public_reference: 'AUDIT-STOCK-RECOVERED', total_amount: 735, status: 'submitted' } }),
    })
  })
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
  await page.getByLabel('Email address', { exact: true }).fill('audit@example.test')
  await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic Manila address')
  await acceptStandardDelivery(page)
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()

  await expect(page.getByRole('button', { name: /Retry order request/ })).toBeVisible()
  await page.getByRole('button', { name: /Retry order request/ }).click()

  await expect(page.getByRole('alert')).toContainText('Someone else just took the last of one item in your cart')
  await expect(page.getByLabel('Full name', { exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Submit order request', exact: true })).toBeVisible()
  await page.getByRole('checkbox', { name: /I accept/ }).check()

  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByText('AUDIT-STOCK-RECOVERED', { exact: false }).first()).toBeVisible({ timeout: 30000 })
  expect(submissions).toHaveLength(3)
  expect(submissions[2].idempotencyKey).not.toBe(submissions[0].idempotencyKey)
})

test('held checkout blocks cart changes and retries the same basket and key', async ({ page }) => {
  await catalog(page, { stock: 10 })
  const submissions = []
  await page.route('**/api/storefront/order', async route => {
    submissions.push(route.request().postDataJSON())
    if (submissions.length === 1) return route.abort('failed')
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: { public_reference: 'AUDIT-CART-HELD', total_amount: 830, status: 'submitted' } }) })
  })
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
  await page.getByLabel('Email address', { exact: true }).fill('audit@example.test')
  await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic Manila address')
  await acceptStandardDelivery(page)
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByRole('button', { name: /Retry order request/ })).toBeVisible()
  await page.getByRole('button', { name: /Open cart/i }).click()
  const cartDialog = page.getByRole('dialog', { name: 'Shopping cart' })
  await expect(cartDialog.getByText('Held for your pending order request')).toBeVisible()
  await expect(cartDialog.getByRole('button', { name: 'Remove from cart' })).toBeDisabled()
  await expect(cartDialog.getByRole('button', { name: /Increase quantity/i })).toHaveCount(0)
  await cartDialog.getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByRole('button', { name: /Retry order request/ }).click()
  await expect(page.getByText('AUDIT-CART-HELD', { exact: false }).first()).toBeVisible()
  expect(submissions).toHaveLength(2)
  expect(submissions[1].items).toEqual(submissions[0].items)
  expect(submissions[1].idempotencyKey).toBe(submissions[0].idempotencyKey)
})

for (const routeName of ['pasabuy', 'messages']) {
  test(`${routeName} renews its challenge after a failed submission`, async ({ page }) => {
    await catalog(page)
    const submissions = []
    const endpoint = routeName === 'pasabuy' ? 'pasabuy' : 'conversation'
    await page.route(`**/api/storefront/${endpoint}`, async route => {
      submissions.push(route.request().postDataJSON())
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE' } }) })
    })
    await page.route('**/api/storefront/messages', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, conversations: [] }) }))
    await page.goto(`/${routeName}`, { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
    await page.getByLabel(routeName === 'pasabuy' ? 'Email address' : 'Email', { exact: true }).fill('audit@example.test')
    if (routeName === 'pasabuy') await page.getByLabel('Item name, brand, and exact size', { exact: true }).fill('Synthetic item, 100g')
    else await page.getByLabel('How can we help?', { exact: true }).fill('Synthetic product question')
    const submit = page.getByRole('button', { name: routeName === 'pasabuy' ? 'Submit Pasabuy request' : 'Send message', exact: true })
    await submit.click()
    await expect.poll(() => submissions.length).toBe(1)
    await expect(submit).toBeEnabled()
    await submit.click()
    await expect.poll(() => submissions.length).toBe(2)
    expect(submissions[1].botToken).not.toBe(submissions[0].botToken)
    expect(submissions[1].idempotencyKey).toBe(submissions[0].idempotencyKey)
  })
}

test('product facts and availability remain honest when canonical fields are missing', async ({ page }) => {
  await catalog(page, { sku: 'caffe-milano-gold', stock: null })
  await expect(page.getByText('Direct import to Manila', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Authentic Import', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Available on Pasabuy request', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Ingredients verified on label', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Specifications verified upon batch arrival', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Stock check pending', { exact: true }).first()).toBeVisible()
  await expect(page.locator('main img[src*="/images/mock/"]')).toHaveCount(0)
})

test('phone product identity precedes supporting content and controls have usable targets', async ({ page }) => {
  await catalog(page)
  const heading = await page.getByRole('heading', { level: 1, name: 'Audit pantry item' }).boundingBox()
  const ingredients = page.getByRole('button', { name: 'Ingredients', exact: true })
  const tab = await ingredients.boundingBox()
  expect(heading.y).toBeLessThan(tab.y)
  expect(tab.height).toBeGreaterThanOrEqual(44)
  const home = await page.locator('main nav').getByRole('button', { name: 'Home', exact: true }).boundingBox()
  expect(home.height).toBeGreaterThanOrEqual(44)
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if ([390, 1440].includes(width)) {
      await page.screenshot({ path: `docs/evidence/20260914-map-remediation/product-${width}.png`, fullPage: true })
    }
  }
})

test('gallery shrinking during refresh preserves the product and its buying context', async ({ page }) => {
  const fixture = await catalog(page)
  await page.getByRole('button', { name: 'Go to slide 2' }).click()
  fixture.shrink()
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByRole('button', { name: 'Go to slide 2' })).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1, name: 'Audit pantry item' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Add to cart/ })).toBeEnabled()
})

for (const failure of [false, true]) {
  test(`review globe does not fabricate feedback when the review source is ${failure ? 'unavailable' : 'empty'}`, async ({ page }) => {
    await catalog(page)
    const seedRequests = []
    page.on('request', request => {
      if (request.url().includes('globeSeedReviews')) seedRequests.push(request.url())
    })
    await page.route('**/rest/v1/reviews*', route => route.fulfill({
      status: failure ? 503 : 200, json: failure ? { message: 'Synthetic source failure' } : [],
    }))
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const heading = page.getByRole('heading', { name: 'Reviews, mapped to the products.' })
    await heading.scrollIntoViewIfNeeded({ timeout: 90000 })
    await expect(page.getByRole('status').filter({ hasText: failure
      ? 'Published review details are unavailable. Please try again later.'
      : 'No published customer reviews are available yet.' })).toBeVisible({ timeout: 30000 })
    expect(seedRequests).toEqual([])
  })
}

test('private guest journeys stay noindex while public browsing stays indexable', async ({ page }) => {
  await catalog(page)
  for (const path of ['/account', '/messages', '/checkout', '/confirmation']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow', { timeout: 30000 })
  }
  await page.goto('/catalog', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow', { timeout: 30000 })
})

test('the wholesale alias publishes the established trade canonical', async ({ page }) => {
  await catalog(page)
  await page.goto('/wholesale', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/trade$/, { timeout: 30000 })
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', /\/trade$/)
})


test('canonical express stays unpriced through submission and confirmation with no payment QR', async ({ page }) => {
  await catalog(page)
  let submitted
  await page.route('**/api/storefront/order', async route => {
    submitted = route.request().postDataJSON()
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: {
      public_reference: 'SYNTHETIC-EXPRESS', total_amount: null, shipping_quote_status: 'pending_quote', status: 'submitted', payment_status: 'not_requested' } }) })
  })
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
  await page.getByLabel('Email address', { exact: true }).fill('audit@example.test')
  await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic Manila address')
  await page.getByRole('radio', { name: /Metro Manila Express Dispatch/ }).check()
  await page.getByLabel('Region', { exact: true }).selectOption('1300000000')
  await page.getByLabel('City, municipality or area', { exact: true }).selectOption('1380100000')
  await page.getByLabel('Barangay', { exact: true }).selectOption('1380100001')
  await expect(page.getByText('Not final yet', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit order request', exact: true })).toBeEnabled()
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`canonical-express-${width}.png`), fullPage: true })
  }
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByText(/Delivery quote pending — no final total yet/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pay by QR transfer' })).toHaveCount(0)
  expect(submitted.delivery).toEqual({ service: 'express', destination: { sourceVersion: 'psgc-2026-06-30', path: ['1300000000','1380100000','1380100001'] }, acceptance: null })
  expect(submitted).not.toHaveProperty('shippingAmount')
})

test('canonical pickup needs acceptance and no delivery address or browser price', async ({ page }) => {
  await catalog(page)
  let submitted
  await page.route('**/api/storefront/order', async route => {
    submitted = route.request().postDataJSON()
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: { public_reference: 'SYNTHETIC-PICKUP', total_amount: 735, shipping_quote_status: 'customer_confirmed', status: 'submitted' } }) })
  })
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
  await page.getByLabel('Email address', { exact: true }).fill('audit@example.test')
  await page.getByRole('radio', { name: /K2 Warehouse Pickup/ }).check()
  await expect(page.getByRole('button', { name: 'Submit order request', exact: true })).toBeDisabled()
  await page.getByRole('checkbox', { name: /I accept/ }).check()
  await expect(page.getByLabel('Delivery address', { exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByText('SYNTHETIC-PICKUP', { exact: false }).first()).toBeVisible()
  expect(submitted.delivery).toEqual({ service: 'pickup', destination: null, acceptance: { inputFingerprint: 'a'.repeat(64), rateVersion: null } })
  expect(submitted).not.toHaveProperty('shippingAmount')
})

test('canonical changed address removes accepted quote until the new quote is reviewed', async ({ page }) => {
  await catalog(page)
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic first address')
  await acceptStandardDelivery(page)
  await expect(page.getByRole('button', { name: 'Submit order request', exact: true })).toBeEnabled()
  const quoteRequests = []
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/storefront/delivery/quote') quoteRequests.push(request) })
  await page.getByRole('textbox', { name: 'Delivery address', exact: true }).pressSequentially(' Synthetic changed address with a long street and unit description', { delay: 10 })
  await expect(page.getByRole('button', { name: 'Submit order request', exact: true })).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: /I accept/ })).not.toBeChecked()
  expect(quoteRequests.length).toBeLessThanOrEqual(2)
  await page.getByRole('checkbox', { name: /I accept/ }).check()
  await expect(page.getByRole('button', { name: 'Submit order request', exact: true })).toBeEnabled()
})

test('lost order response then pre-receipt rate refusal preserves exact retry identity', async ({ page }) => {
  await catalog(page)
  const submissions = []
  await page.route('**/api/storefront/order', async route => {
    submissions.push(route.request().postDataJSON())
    if (submissions.length === 1) return route.abort('failed')
    if (submissions.length === 2) return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { code: 'RATE_LIMITED' } }) })
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: { public_reference: 'SYNTHETIC-ORIGINAL', total_amount: 830, status: 'submitted', shipping_quote_status: 'customer_confirmed' } }) })
  })
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic Customer')
  await page.getByLabel('Email address', { exact: true }).fill('audit@example.test')
  await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic Manila address')
  await acceptStandardDelivery(page)
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await page.getByRole('button', { name: /Retry order request/ }).click()
  await expect(page.getByLabel('Full name', { exact: true })).toBeDisabled()
  await page.getByRole('button', { name: /Retry order request/ }).click()
  await expect(page.getByText('SYNTHETIC-ORIGINAL', { exact: false }).first()).toBeVisible()
  expect(submissions).toHaveLength(3)
  const withoutBot = ({ botToken, ...payload }) => payload
  expect(submissions.map(withoutBot)).toEqual([withoutBot(submissions[0]), withoutBot(submissions[0]), withoutBot(submissions[0])])
})


async function readyRestartCheckout(page) {
  await catalog(page)
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic Restart Customer')
  await page.getByLabel('Email address', { exact: true }).fill('restart@example.test')
  await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic restart address')
  await acceptStandardDelivery(page)
}

test('restart recovery refresh and reopened tabs retry one identity and consume terminal receipt', async ({ page, context }) => {
  await readyRestartCheckout(page)
  const submissions = []
  const orderRoute = async route => {
    submissions.push(route.request().postDataJSON())
    if (submissions.length === 1) return route.abort('failed')
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: {
      public_reference: 'SYNTHETIC-RESTART', total_amount: 830, shipping_quote_status: 'customer_confirmed', status: 'submitted' } }) })
  }
  await page.route('**/api/storefront/order', orderRoute)
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByRole('button', { name: /Retry order request/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: /Retry order request/ })).toBeVisible()
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Synthetic Restart Customer')
  await page.close()
  const reopened = await context.newPage()
  await catalog(reopened)
  await reopened.goto('/checkout')
  await reopened.route('**/api/storefront/order', orderRoute)
  const another = await context.newPage()
  await catalog(another)
  await another.goto('/checkout')
  await another.route('**/api/storefront/order', orderRoute)
  await expect(reopened.getByRole('button', { name: /Retry order request/ })).toBeVisible()
  await expect(another.getByRole('button', { name: /Retry order request/ })).toBeVisible()
  await Promise.all([
    reopened.evaluate(() => document.querySelector('form').requestSubmit()),
    another.evaluate(() => document.querySelector('form').requestSubmit()),
  ])
  await expect(reopened.getByText('SYNTHETIC-RESTART', { exact: false }).first()).toBeVisible()
  await expect(another.getByText('SYNTHETIC-RESTART', { exact: false }).first()).toBeVisible()
  expect(submissions).toHaveLength(2)
  const payloadOnly = ({ botToken, ...payload }) => payload
  expect(payloadOnly(submissions[1])).toEqual(payloadOnly(submissions[0]))
  const record = await reopened.evaluate(() => JSON.parse(localStorage.getItem('k2-checkout-recovery-v1')))
  expect(record.state).toBe('resolved')
  expect(record).not.toHaveProperty('payload')
  await another.reload()
  await expect(another.getByText('SYNTHETIC-RESTART', { exact: false }).first()).toBeVisible()
  expect(submissions).toHaveLength(2)
})

test('restart recovery queued retry consumes a receipt already reconciled by its tab', async ({ page }) => {
  await readyRestartCheckout(page)
  let sent = 0
  await page.route('**/api/storefront/order', route => { sent += 1; return route.abort('failed') })
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByRole('button', { name: /Retry order request/ })).toBeVisible()
  await page.evaluate(() => new Promise(acquired => {
    window.syntheticLock = navigator.locks.request('k2-checkout-request-v1', () => new Promise(release => {
      window.syntheticRelease = release
      acquired()
    }))
  }))
  await page.evaluate(() => {
    const key = 'k2-checkout-recovery-v1'
    const pending = JSON.parse(localStorage.getItem(key))
    localStorage.setItem(key, JSON.stringify({ version: 1, state: 'resolved', key: pending.key,
      receipt: { public_reference: 'SYNTHETIC-QUEUED', total_amount: 830, shipping_quote_status: 'customer_confirmed', status: 'submitted' } }))
    window.dispatchEvent(new StorageEvent('storage', { key }))
    document.querySelector('form').requestSubmit()
    window.syntheticRelease()
  })
  await expect(page.getByText('SYNTHETIC-QUEUED', { exact: false }).first()).toBeVisible()
  await page.evaluate(() => navigator.locks.request('k2-checkout-request-v1', () => {}))
  expect(sent).toBe(1)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('k2-checkout-recovery-v1')).state)).toBe('resolved')
})

test('restart recovery refuses unavailable or corrupt persistence before HTTP', async ({ page }) => {
  await readyRestartCheckout(page)
  let sent = 0
  await page.route('**/api/storefront/order', route => { sent += 1; return route.abort('failed') })
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (key === 'k2-checkout-recovery-v1') throw new DOMException('Synthetic storage denial', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('safely save or restore')
  expect(sent).toBe(0)
  await page.reload()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic Restart Customer')
  await page.getByLabel('Email address', { exact: true }).fill('restart@example.test')
  await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic restart address')
  await acceptStandardDelivery(page)
  await page.evaluate(() => localStorage.setItem('k2-checkout-recovery-v1', '{synthetic-corrupt'))
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('safely save or restore')
  expect(sent).toBe(0)
  await page.evaluate(() => localStorage.setItem('k2-checkout-recovery-v1', JSON.stringify({ version: 1, state: 'pending', key: '11111111-1111-4111-8111-111111111111', payload: { idempotencyKey: '11111111-1111-4111-8111-111111111111', items: [{ sku: 'audit-product', quantity: 1 }] }, lines: [null] })))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Review order request' })).toBeVisible()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic Restart Customer')
  await page.getByLabel('Email address', { exact: true }).fill('restart@example.test')
  await page.getByLabel('Delivery address', { exact: true }).fill('Synthetic restart address')
  await acceptStandardDelivery(page)
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('safely save or restore')
  expect(sent).toBe(0)
})

test('restart recovery terminal write failure retains pending request and excludes receipt secrets', async ({ page }) => {
  await readyRestartCheckout(page)
  const submissions = []
  await page.route('**/api/storefront/order', route => {
    submissions.push(route.request().postDataJSON())
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: {
      public_reference: 'SYNTHETIC-TERMINAL', total_amount: 830, shipping_quote_status: 'customer_confirmed', status: 'submitted', guest_grant_token: 'synthetic-secret-must-not-persist' } }) })
  })
  await page.evaluate(() => {
    window.syntheticTerminalFailure = true
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (key === 'k2-checkout-recovery-v1' && JSON.parse(value).state === 'resolved' && window.syntheticTerminalFailure) throw new DOMException('Synthetic terminal denial', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('safely save or restore')
  await expect(page.getByRole('button', { name: /Retry order request/ })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('k2-checkout-recovery-v1')).state)).toBe('pending')
  await page.evaluate(() => { window.syntheticTerminalFailure = false })
  await page.getByRole('button', { name: /Retry order request/ }).click()
  await expect(page.getByText('SYNTHETIC-TERMINAL', { exact: false }).first()).toBeVisible()
  expect(submissions[1].idempotencyKey).toBe(submissions[0].idempotencyKey)
  const raw = await page.evaluate(() => localStorage.getItem('k2-checkout-recovery-v1'))
  expect(raw).not.toContain('guest_grant_token')
  expect(raw).not.toContain('botToken')
  expect(raw).not.toContain('restart@example.test')
})
