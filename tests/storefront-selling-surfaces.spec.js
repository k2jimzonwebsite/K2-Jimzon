import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', (route) => route.abort())
  await page.route('http://localhost:5191/**', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue()
    const response = await route.fetch()
    const body = (await response.text()).replace(
      /<link[^>]+href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/g,
      '',
    )
    return route.fulfill({ response, body })
  })
})

const product = {
  sku: 'pistachio-cream',
  name: 'Pistì spreadable pistachio cream',
  status: 'Live',
  srp: 735,
  wholesale_price: 620,
  primary_image_url: '/images/placeholder.svg',
  secondary_images: [],
  lifestyle_images: [],
  description: 'Italian pistachio cream prepared for a verified storefront test.',
  country_of_origin: 'Italy',
  brand_id: 'Pistì',
}

test('product detail renders canonical price and stock, then enforces the cart limit', async ({ page }) => {
  await page.route('**/rest/v1/**', async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').pop()
    if (table === 'products') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([product]) })
    }
    if (table === 'v_product_stock_from_batches') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ sku: product.sku, stock_from_batches: 2 }]),
      })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.goto(`/product/${product.sku}`, { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible({ timeout: 60000 })
  await expect(page.locator('h1 + div').getByText('₱735', { exact: true })).toBeVisible()
  await expect(page.getByTestId('stock-count').first()).toHaveAttribute('aria-label', '2 units available')
  await expect(page).toHaveTitle(`${product.name} — K2 Jimzon`)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `http://localhost:5191/product/${product.sku}`)
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'product')
  const structuredProduct = JSON.parse(await page.locator('script[data-k2-product-jsonld]').textContent())
  expect(structuredProduct).toMatchObject({
    '@type': 'Product',
    name: product.name,
    offers: {
      '@type': 'Offer',
      price: '735.00',
      priceCurrency: 'PHP',
      availability: 'https://schema.org/InStock',
    },
  })

  await page.getByRole('button', { name: 'Increase quantity' }).click()
  const addToCart = page.getByRole('button', { name: 'Add to cart · ₱1,470' })
  await expect(addToCart).toBeEnabled()
  await addToCart.click()

  const cart = page.getByRole('dialog', { name: 'Shopping cart' })
  // CartDrawer is deliberately code-split; source-mode Vite may need a cold
  // transform before the dialog can mount on slower CI/Windows runners.
  await expect(cart).toBeVisible({ timeout: 30000 })
  await expect(cart.getByText(product.name, { exact: true })).toBeVisible()
  await expect(cart.getByText('Your cart (2)', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close cart' }).click()
  await expect(page.getByRole('button', { name: 'Stock limit reached' })).toBeDisabled()
})

test('guest message start and reply paths preserve scoped behavioral receipts', async ({ page }) => {
  let conversationCreated = false
  let conversationPayload = null
  let replyPayload = null
  const reference = 'CV-0123456789ABCDEF'
  const conversation = () => ({
    conversation_reference: reference,
    channel: 'Website',
    status: 'Open',
    messages: conversationCreated ? [{
      direction: 'inbound',
      content: 'Do you have this item in Manila?',
      created_at: '2026-08-26T00:10:00Z',
    }] : [],
  })

  await page.addInitScript(() => {
    window.turnstile = {
      render: (_, options) => {
        window.__turnstileRendered = true
        options.callback('verified-selling-surface-token')
        return 1
      },
      remove: () => {},
    }
  })

  await page.route('**/api/storefront/messages', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, conversations: conversationCreated ? [conversation()] : [] }),
  }))
  await page.route('**/api/storefront/conversation', async (route) => {
    conversationPayload = route.request().postDataJSON()
    conversationCreated = true
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, receipt: { conversation_reference: reference, status: 'Open' } }),
    })
  })
  await page.route('**/api/storefront/message', async (route) => {
    replyPayload = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, receipt: { conversation_reference: reference, accepted: true } }),
    })
  })

  await page.goto('/messages', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Message K2' })).toBeVisible({ timeout: 60000 })
  await expect(page.getByText(/There is no self-service cancellation or return/i)).toBeVisible()
  await expect(page.getByText(/each request is reviewed case by case/i)).toBeVisible()
  await page.getByLabel('Full name').fill('Ariane Cruz')
  await page.getByLabel('Email').fill('ariane@example.test')
  await page.getByLabel('How can we help?').fill('Do you have this item in Manila?')
  await page.waitForFunction(() => window.__turnstileRendered === true)
  await page.getByRole('button', { name: 'Send message' }).click()

  await expect(page.getByText(reference, { exact: true })).toBeVisible()
  expect(conversationPayload).toMatchObject({
    customerName: 'Ariane Cruz',
    email: 'ariane@example.test',
    message: 'Do you have this item in Manila?',
    botToken: 'verified-selling-surface-token',
  })
  expect(conversationPayload.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)

  await page.getByLabel('Reply to K2').fill('Please reserve two if available.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('status')).toHaveText('Message received by K2 staff.')
  expect(replyPayload).toMatchObject({
    conversationReference: reference,
    message: 'Please reserve two if available.',
  })
  expect(replyPayload.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)
})


test('order confirmation explains the staff-reviewed exception path without an SLA promise', async ({ page }) => {
  let statusReads = 0
  await page.setViewportSize({ width: 375, height: 812 })
  await page.addInitScript(() => {
    window.turnstile = {
      render: (_, options) => {
        window.__orderTurnstileRendered = true
        options.callback('verified-order-token')
        return 1
      },
      remove: () => {},
    }
  })
  await page.route('**/rest/v1/**', async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').pop()
    if (table === 'products') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([product]) })
    }
    if (table === 'v_product_stock_from_batches') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ sku: product.sku, stock_from_batches: 2 }]),
      })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/api/storefront/order', (route) => route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, receipt: {
      public_reference: 'WEB-0123456789ABCDEF',
      total_amount: 735,
      status: 'Submitted',
      payment_status: 'Unpaid',
    } }),
  }))
  await page.route('**/api/storefront/order/status', (route) => {
    statusReads += 1
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, orders: [{
        public_reference: 'WEB-0123456789ABCDEF',
        total_amount: 735,
        item_count: 1,
        status: 'submitted',
        payment_status: 'not_requested',
        created_at: '2026-08-31T08:00:00Z',
      }] }),
    })
  })

  await page.goto(`/product/${product.sku}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible({ timeout: 60000 })
  await page.getByRole('button', { name: 'Add to cart · ₱735' }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: 'Review order request' }).click()
  await page.getByLabel('Full name').fill('Ariane Cruz')
  await page.getByLabel('Email address').fill('ariane@example.test')
  await page.getByLabel('Delivery address').fill('Makati City, Metro Manila')
  await page.waitForFunction(() => window.__orderTurnstileRendered === true)
  await page.getByRole('button', { name: 'Submit order request' }).click()

  await expect(page.getByRole('heading', { name: 'Order request received' })).toBeVisible({ timeout: 60000 })
  await expect(page).toHaveURL(/\/confirmation$/)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Order request received' })).toBeVisible({ timeout: 60000 })
  await expect(page.getByText(/WEB-0123456789ABCDEF/)).toBeVisible()
  expect(statusReads).toBeGreaterThan(0)
  await expect(page.getByText(/There is no self-service cancellation or return/i)).toBeVisible()
  await expect(page.getByText(/each request is reviewed case by case/i)).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/within\s+\d+\s+(?:business\s+)?(?:minutes?|hours?|days?)/i)
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(hasHorizontalOverflow).toBe(false)
  await page.goBack({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible()
  await page.goForward({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Order request received' })).toBeVisible()
  await expect(page.getByText(/WEB-0123456789ABCDEF/)).toBeVisible()
})

test('cold confirmation handles an expired guest grant with a useful recovery state', async ({ page }) => {
  await page.route('**/rest/v1/**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: '[]',
  }))
  await page.route('**/api/storefront/order/status', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'GUEST_ACCESS_EXPIRED' } }),
  }))

  await page.goto('/confirmation', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Order request status unavailable' })).toBeVisible({ timeout: 60000 })
  await expect(page.getByRole('alert')).toContainText('reference number')
  await expect(page).toHaveURL(/\/confirmation$/)
})

test('unknown storefront and product URLs render explicit recovery pages', async ({ page }) => {
  await page.route('**/rest/v1/**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: '[]',
  }))

  await page.goto('/this-page-does-not-exist', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible({ timeout: 60000 })
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')

  await page.goto('/product/NOT-A-REAL-SKU', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Product unavailable' })).toBeVisible({ timeout: 60000 })
  await expect(page.getByText('Loading product details…')).toHaveCount(0)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
})
