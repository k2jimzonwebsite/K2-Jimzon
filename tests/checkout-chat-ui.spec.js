import { expect, test } from '@playwright/test'

const product = { sku: 'CHECKOUT-PISTACCHIO', name: 'Synthetic Pistacchio Crunchy 200g', status: 'Live', srp: 499,
  primary_image_url: '/images/placeholder.svg', secondary_images: [], lifestyle_images: [], subcategory: 'Spreads' }

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort())
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop()
    return route.fulfill({ json: table === 'products' ? [product]
      : table === 'v_storefront_visible_skus' ? [{ sku: product.sku }]
      : table === 'v_product_stock_from_batches' ? [{ sku: product.sku, stock_from_batches: 7 }] : [] })
  })
  await page.route('**/api/guest/**', route => route.fulfill({ json: { conversations: [], orders: [] } }))
})

for (const width of [320, 390, 430, 1440]) for (const theme of ['light', 'dark']) {
  test(`checkout chat leaves submission clear at ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme })
    await page.addInitScript(value => localStorage.setItem('theme', value), theme)
    await page.goto(`/product/${product.sku}`)
    // The ordinary floating opener still works outside checkout.
    await expect(page.getByRole('button', { name: 'Chat with K2 staff' })).toBeVisible()
    await page.getByRole('button', { name: /Add to cart/ }).click()
    await page.getByRole('button', { name: 'Review order request', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Review order request', exact: true })).toBeVisible()
    const submit = page.getByRole('button', { name: 'Submit order request', exact: true })
    await submit.evaluate(el => window.scrollTo(0, scrollY + el.getBoundingClientRect().bottom - (innerHeight - 96)))
    const chat = page.getByRole('button', { name: 'Chat with K2 staff' })
    const submitBox = await submit.boundingBox()
    const chatBox = await chat.boundingBox()
    const overlapWidth = Math.max(0, Math.min(submitBox.x + submitBox.width, chatBox.x + chatBox.width) - Math.max(submitBox.x, chatBox.x))
    const overlapHeight = Math.max(0, Math.min(submitBox.y + submitBox.height, chatBox.y + chatBox.height) - Math.max(submitBox.y, chatBox.y))
    expect(overlapWidth * overlapHeight).toBe(0)
    await expect(page.locator('main').getByRole('button', { name: 'Chat with K2 staff' })).toHaveCount(1)
    expect(chatBox.height).toBeGreaterThanOrEqual(44)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/acceptance/shopper-fixes-20261024/checkout-submit-${width}-${theme}.png` })
    await chat.scrollIntoViewIfNeeded()
    await chat.focus()
    await chat.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Storefront live chat' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(chat).toBeFocused()
    await expect(page.getByRole('heading', { name: 'Review order request', exact: true })).toBeVisible()
    await page.screenshot({ path: `docs/acceptance/shopper-fixes-20261024/checkout-help-${width}-${theme}.png` })
  })
}

test('empty checkout retains accessible chat help', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Your cart is empty', exact: true })).toBeVisible()
  const chat = page.locator('main').getByRole('button', { name: 'Chat with K2 staff' })
  await chat.click()
  await expect(page.getByRole('dialog', { name: 'Storefront live chat' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(chat).toBeFocused()
})

test('English pistachio finds the Italian listing in the rendered catalog', async ({ page }) => {
  await page.goto('/catalog?q=pistachio')
  await expect(page.getByTestId('product-card')).toHaveCount(1)
  await expect(page.locator('main').getByText('1 products', { exact: true })).toBeVisible()
  await expect(page.getByTestId('product-card')).toContainText(product.name)
  await page.getByLabel('Search products', { exact: true }).fill('pistacchio')
  await expect(page.locator('main').getByText('1 products', { exact: true })).toBeVisible()
  await expect(page.getByTestId('product-card')).toContainText(product.name)
  await page.getByLabel('Search products', { exact: true }).fill('CHECKOUT')
  await expect(page.getByTestId('product-card')).toHaveCount(1)
})
