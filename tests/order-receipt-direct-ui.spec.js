import { expect, test } from '@playwright/test'

const orderId = '7cdd8a0d-4ed9-4bfb-8408-8d95d373f61e'
const conversationId = '8498595d-7280-49ed-8d8c-c40be34ce6ee'
const reference = 'WEB-ORDER-RECEIPT-01'
const product = {
  sku: 'receipt-test-item', name: 'K2 order receipt test item', status: 'Live',
  srp: 735, wholesale_price: 620, primary_image_url: '/images/placeholder.svg',
  secondary_images: [], lifestyle_images: [], description: 'Fixture only.',
  country_of_origin: 'Italy', brand_id: 'K2',
}

test('direct saved order conversation accepts a private receipt after fresh instructions without asking identity again', async ({ page }) => {
  let sentMessage = null
  let submittedReceipt = null
  let paymentStatus = 'not_requested'
  await page.setViewportSize({ width: 375, height: 812 })
  await page.addInitScript(({ orderId, reference }) => localStorage.setItem('k2-last-order-receipt-v1', JSON.stringify({
    id: orderId, reference, accessKey: 'synthetic-order-access-key-00000000001', total: 735, count: 1,
    paymentMethod: 'gcash', paymentStatus: 'not_requested', shippingQuoteStatus: 'customer_confirmed', status: 'submitted',
  })), { orderId, reference })
  await page.route('https://**/*', route => route.abort())
  await page.route('**/rest/v1/**', route => {
    const endpoint = new URL(route.request().url()).pathname.split('/').pop()
    const data = route.request().postDataJSON?.() || {}
    if (endpoint === 'products') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([product]) })
    if (endpoint === 'v_storefront_visible_skus') return route.fulfill({ json: [{ sku: product.sku }] })
    if (endpoint === 'v_product_stock_from_batches') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ sku: product.sku, stock_from_batches: 2 }]) })
    if (endpoint === 'submit_order_request_v2') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: orderId, public_reference: reference, total_amount: 735, status: 'submitted', payment_status: 'not_requested' }) })
    if (endpoint === 'get_order_conversation_v1') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, public_reference: reference, order_status: 'submitted', payment_status: paymentStatus, shipping_quote_status: 'customer_confirmed', total_amount: 735, delivery_review_required: false, messages: [{ direction: 'inbound', content: `Order ${reference} received through the website.`, created_at: '2026-09-28T07:00:00Z' }] }) })
    if (endpoint === 'submit_order_message_v1') {
      sentMessage = data
      paymentStatus = 'awaiting_instructions'
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, message_id: '83841fe9-915e-45ea-9e66-a0b336ed51ef' }) })
    }
    if (endpoint === 'submit_order_payment_receipt_v1') {
      submittedReceipt = data
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt_id: 'ead6eb3c-e59d-4f80-8dc8-e3ef1846ef16' }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.goto('/confirmation', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Order request received' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your order conversation' })).toBeVisible()
  await expect(page.getByLabel('Message K2 about this order')).toBeVisible()
  await expect(page.getByLabel('Your name')).toHaveCount(0)
  await expect(page.getByLabel('Email address')).toHaveCount(0)
  await expect(page.getByText(`Order ${reference} received through the website.`)).toBeVisible()

  await page.getByLabel('Message K2 about this order').fill('Please confirm the exact total before I transfer.')
  await page.getByRole('button', { name: 'Send order message' }).click()
  await expect.poll(() => sentMessage).toMatchObject({ p_order_id: orderId, p_message: 'Please confirm the exact total before I transfer.' })

  await page.getByLabel('Payment reference').fill('GC-123456')
  await page.getByLabel('Upload e-receipt').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a0000000000000000', 'hex') })
  await page.getByRole('button', { name: 'Submit receipt for staff review' }).click()
  await expect.poll(() => submittedReceipt).toMatchObject({ p_order_id: orderId, p_payment_reference: 'GC-123456', p_media_type: 'image/png' })
  await expect(page.getByRole('status').filter({ hasText: 'Receipt received for staff review' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Payment remains pending' })).toBeVisible()
  paymentStatus = 'verified'
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your order conversation' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pay by QR transfer' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Send your e-receipt' })).toHaveCount(0)
})

test('direct saved legacy receipt waits for fresh charge and keeps messages after review or refresh failure', async ({ page }) => {
  const key = 'synthetic-order-access-key-00000000001'
  await page.addInitScript(({ orderId, reference, key }) => {
    localStorage.setItem('k2-last-order-receipt-v1', JSON.stringify({ id: orderId, reference, accessKey: key,
      total: 107, count: 1, paymentMethod: 'gcash', paymentStatus: 'awaiting_instructions', shippingQuoteStatus: 'customer_confirmed' }))
  }, { orderId, reference, key })
  let mode = 'initial', release
  await page.route('https://**/*', route => route.abort())
  await page.route('**/rest/v1/**', async route => {
    const endpoint = new URL(route.request().url()).pathname.split('/').pop()
    if (endpoint !== 'get_order_conversation_v1') return route.fulfill({ status: 200, json: [] })
    if (mode === 'initial') await new Promise(resolve => { release = resolve })
    if (mode === 'failed') return route.fulfill({ status: 503, json: { message: 'Synthetic read unavailable' } })
    return route.fulfill({ status: 200, json: { ok: true, public_reference: reference, order_status: 'submitted',
      payment_status: 'awaiting_instructions', shipping_quote_status: 'customer_confirmed',
      total_amount: mode === 'canonical' ? 107 : null, delivery_review_required: mode !== 'canonical',
      messages: [{ id: conversationId, direction: 'outbound', content: 'Synthetic staff review message', created_at: '2026-09-28T07:00:00Z' }] } })
  })
  await page.goto('/confirmation', { waitUntil: 'domcontentloaded' })
  await expect.poll(() => Boolean(release)).toBe(true)
  await expect(page.getByRole('heading', { name: 'Pay by QR transfer' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Send your e-receipt' })).toHaveCount(0)
  mode = 'legacy'; release()
  await expect(page.getByText(/Total needs staff review/)).toBeVisible()
  await expect(page.getByLabel('Message K2 about this order')).toBeVisible()
  mode = 'canonical'
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pay by QR transfer' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Send your e-receipt' })).toBeVisible()
  mode = 'failed'
  // Existing polling read must revoke upload/QR authority while retaining messages.
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('heading', { name: 'Pay by QR transfer' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Send your e-receipt' })).toHaveCount(0)
  await expect(page.getByLabel('Message K2 about this order')).toBeVisible()
  await expect(page.getByText('Synthetic staff review message')).toBeVisible()
})
