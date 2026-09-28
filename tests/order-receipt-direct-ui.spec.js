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

test('direct checkout keeps the order conversation ready and accepts a private receipt without asking identity again', async ({ page }) => {
  let sentMessage = null
  let submittedReceipt = null
  let paymentStatus = 'not_requested'
  await page.setViewportSize({ width: 375, height: 812 })
  await page.route('https://**/*', route => route.abort())
  await page.route('**/rest/v1/**', route => {
    const endpoint = new URL(route.request().url()).pathname.split('/').pop()
    const data = route.request().postDataJSON?.() || {}
    if (endpoint === 'products') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([product]) })
    if (endpoint === 'v_product_stock_from_batches') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ sku: product.sku, stock_from_batches: 2 }]) })
    if (endpoint === 'submit_order_request_v2') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: orderId, public_reference: reference, total_amount: 735, status: 'submitted', payment_status: 'not_requested' }) })
    if (endpoint === 'get_order_conversation_v1') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, order_status: 'submitted', payment_status: paymentStatus, messages: [{ direction: 'inbound', content: `Order ${reference} received through the website.`, created_at: '2026-09-28T07:00:00Z' }] }) })
    if (endpoint === 'submit_order_message_v1') {
      sentMessage = data
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, message_id: '83841fe9-915e-45ea-9e66-a0b336ed51ef' }) })
    }
    if (endpoint === 'submit_order_payment_receipt_v1') {
      submittedReceipt = data
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt_id: 'ead6eb3c-e59d-4f80-8dc8-e3ef1846ef16' }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.goto(`/product/${product.sku}`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Add to cart · ₱735' }).click()
  await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: 'Review order request' }).click()
  await page.getByLabel('Full name').fill('Ariane Cruz')
  await page.getByLabel('Email address').fill('ariane@example.test')
  await page.getByLabel('Delivery address').fill('Makati City, Metro Manila')
  await page.getByRole('button', { name: 'Submit order request' }).click()
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
