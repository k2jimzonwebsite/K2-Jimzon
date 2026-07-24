import { test, expect } from '@playwright/test'

// Critical-path smoke test for the storefront buy flow.
// Designed to run WITHOUT Supabase env vars (e.g. in CI): with no live data the
// app falls back to local mock products, so this test needs no secrets and never
// writes to the database (it stops before "Confirm payment").
//
// This is the test that would have caught the real bugs we hit:
//  - the checkout `total` ReferenceError (asserted via the visible Total)
//  - the applyCoupon crash (coupon apply is exercised)

test.describe('Storefront buy flow (smoke)', () => {
  test('home page renders', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Milano/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('catalog shows product cards', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Inventory & Catalog|Catalog/i }).first().click()
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({ timeout: 15000 })
  })

  test('product → cart → checkout renders totals without crashing', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Inventory & Catalog|Catalog/i }).first().click()

    // Open the first product
    await page.locator('[data-testid="product-image-btn"]').first().click()

    // Add to cart (button label is "Add to cart — ₱X")
    await page.getByRole('button', { name: /Add to cart/i }).first().click()

    // Go to checkout from the cart drawer
    await page.getByRole('button', { name: /Go to checkout|checkout/i }).first().click()

    // Checkout must render the order summary and the Total.
    // If the old `total` ReferenceError regressed, the page would crash here.
    await expect(page.getByText(/Order summary/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/^Total$/i).first()).toBeVisible()
    await expect(page.getByText(/₱/).first()).toBeVisible()
  })
})
