import { test, expect } from '@playwright/test'

async function catalog(page, { sku = 'audit-product', stock = 5 } = {}) {
  let gallery = ['/images/placeholder.svg?second']
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort()
    if (url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.split('/').pop()
      const body = table === 'products' ? [{ sku, name: 'Audit pantry item', status: 'Live', published: true,
        srp: 735, primary_image_url: '/images/placeholder.svg', secondary_images: gallery, country_of_origin: 'Italy', description: 'Synthetic product.' }]
        : table === 'v_product_stock_from_batches' ? [{ sku, stock_from_batches: stock }] : []
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    }
    return route.continue()
  })
  await page.addInitScript(() => {
    let token = 0
    window.turnstile = { render: (_, options) => { queueMicrotask(() => options.callback(`synthetic-token-${++token}`)); return token }, remove: () => {} }
  })
  await page.goto(`/product/${sku}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Audit pantry item' })).toBeVisible({ timeout: 90000 })
  return { shrink() { gallery = [] } }
}

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
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('Full name', { exact: true })).toBeEnabled()
  await expect(page.getByLabel('Mobile number', { exact: true })).toBeEnabled()
  await page.getByLabel('Mobile number', { exact: true }).fill('+63 917 123 4567')

  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByText('AUDIT-CONTACT-FIXED', { exact: false }).first()).toBeVisible({ timeout: 30000 })

  expect(submissions).toHaveLength(2)
  expect(submissions[1].phone).toBe('+63 917 123 4567')
  expect(submissions[1].idempotencyKey).not.toBe(submissions[0].idempotencyKey)
})

test('uncertain checkout allows modifying details, preserving entered form content and assigning fresh idempotency key', async ({ page }) => {
  await catalog(page)
  const submissions = []
  await page.route('**/api/storefront/order', async route => {
    submissions.push(route.request().postDataJSON())
    if (submissions.length === 1) {
      return route.abort('failed')
    }
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, receipt: { public_reference: 'AUDIT-MODIFIED', total_amount: 735, status: 'submitted' } }),
    })
  })
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Full name', { exact: true }).fill('Initial Name')
  await page.getByLabel('Email address', { exact: true }).fill('initial@example.test')
  await page.getByLabel('Delivery address', { exact: true }).fill('Original Manila address')
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('Full name', { exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: /Retry order request/ })).toBeVisible()

  const modifyButton = page.getByRole('button', { name: /Edit order or contact details/i })
  await expect(modifyButton).toBeVisible()
  await modifyButton.click()

  await expect(page.getByLabel('Full name', { exact: true })).toBeEnabled()
  expect(await page.getByLabel('Full name', { exact: true }).inputValue()).toBe('Initial Name')
  expect(await page.getByLabel('Email address', { exact: true }).inputValue()).toBe('initial@example.test')
  expect(await page.getByRole('textbox', { name: 'Delivery address' }).inputValue()).toBe('Original Manila address')

  await page.getByRole('textbox', { name: 'Delivery address' }).fill('Updated Makati address')
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByText('AUDIT-MODIFIED', { exact: false }).first()).toBeVisible({ timeout: 30000 })

  expect(submissions).toHaveLength(2)
  expect(submissions[1].address).toBe('Updated Makati address')
  expect(submissions[1].idempotencyKey).not.toBe(submissions[0].idempotencyKey)
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
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()

  await expect(page.getByRole('button', { name: /Retry order request/ })).toBeVisible()
  await page.getByRole('button', { name: /Retry order request/ }).click()

  await expect(page.getByRole('alert')).toContainText('Someone else just took the last of one item in your cart')
  await expect(page.getByLabel('Full name', { exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Submit order request', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByText('AUDIT-STOCK-RECOVERED', { exact: false }).first()).toBeVisible({ timeout: 30000 })
  expect(submissions).toHaveLength(3)
  expect(submissions[2].idempotencyKey).not.toBe(submissions[0].idempotencyKey)
})

test('editing cart quantity after uncertain checkout updates order lines and generates fresh idempotency key', async ({ page }) => {
  await catalog(page, { stock: 10 })
  const submissions = []
  await page.route('**/api/storefront/order', async route => {
    submissions.push(route.request().postDataJSON())
    if (submissions.length === 1) {
      return route.abort('failed')
    }
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, receipt: { public_reference: 'AUDIT-CART-EDITED', total_amount: 1470, status: 'submitted' } }),
    })
  })
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /checkout|review|request/i }).last().click()
  await page.getByLabel('Full name', { exact: true }).fill('Cart Edit Customer')
  await page.getByLabel('Email address', { exact: true }).fill('cartedit@example.test')
  await page.getByRole('textbox', { name: 'Delivery address' }).fill('Manila delivery address')
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()

  // 1st attempt fails with timeout
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: /Retry order request/ })).toBeVisible()

  // Click edit details
  const modifyButton = page.getByRole('button', { name: /Edit order or contact details/i })
  await modifyButton.click()

  // Open cart drawer from header and increase quantity to 2
  await page.getByRole('button', { name: /Open cart/i }).click()
  const cartDialog = page.getByRole('dialog', { name: 'Shopping cart' })
  await expect(cartDialog).toBeVisible()
  await cartDialog.getByRole('button', { name: /Increase quantity/i }).click()
  // Close cart drawer or click proceed to checkout
  await cartDialog.getByRole('button', { name: /checkout|review|request/i }).last().click()

  // Verify updated products total in order summary (2 * 735 = 1470)
  await expect(page.getByText('₱1,470').first()).toBeVisible()

  // Submit order request with updated cart
  await page.getByRole('button', { name: 'Submit order request', exact: true }).click()
  await expect(page.getByText('AUDIT-CART-EDITED', { exact: false }).first()).toBeVisible({ timeout: 30000 })

  expect(submissions).toHaveLength(2)
  expect(submissions[0].items[0].quantity).toBe(1)
  expect(submissions[1].items[0].quantity).toBe(2)
  expect(submissions[1].idempotencyKey).not.toBe(submissions[0].idempotencyKey)
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
