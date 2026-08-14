import { test, expect } from '@playwright/test'

test.describe('launch-critical storefront', () => {
  test('light mode preserves the luxury wood canvas without leaking into dark mode', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'light'))
    await page.goto('/')

    const storefront = page.locator('.storefront-ui')
    await expect(storefront).toBeVisible()
    await expect.poll(() => storefront.evaluate(element => getComputedStyle(element).backgroundImage))
      .toContain('wood-bg.jpg')

    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect.poll(() => storefront.evaluate(element => getComputedStyle(element).backgroundImage))
      .toBe('none')
  })

  test('home and catalog render without unsafe payment claims', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/K2 Jimzon/)
    await expect(page.getByRole('button', { name: /Shop the Drop/i })).toBeVisible()
    await expect(page.getByText(/Payment confirms automatically/i)).toHaveCount(0)
    await page.getByRole('button', { name: /Inventory & Catalog/i }).first().click()
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({ timeout: 15000 })
  })

  test('latest consignment keeps the featured visual free of a New Arrival overlay', async ({ page }) => {
    await page.goto('/')
    const heading = page.getByRole('heading', { name: 'The latest consignment' })
    const card = page.locator('[data-testid="product-card"]').filter({ hasText: 'Current consignment' })
    await expect(heading).toBeVisible()
    await expect(card).toBeVisible({ timeout: 15000 })
    await expect(card.getByText(/New Arrival/i)).toHaveCount(0)
  })

  test('contact is always visible and never fabricates live staff availability', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Storefront' }).getByRole('button', { name: 'Contact us' }).click()

    const main = page.getByRole('main')
    await expect(main.getByRole('heading', { name: 'Ask us directly.' })).toBeVisible()
    await expect(main.getByText('k2jimzonwebsite@gmail.com')).toBeVisible()
    await expect(main.getByText('@k2jimzon')).toBeVisible()
    await expect(main.getByText('k2jimzononlineshop')).toBeVisible()
    await expect(main.getByText(/Public business number awaiting confirmation/i)).toBeVisible()
    await expect(main.getByText(/Not published yet/i)).toBeVisible()
    await expect(main.getByText(/staff (is )?online/i)).toHaveCount(0)

    await page.setViewportSize({ width: 1024, height: 768 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

    await page.setViewportSize({ width: 375, height: 812 })
    const mobileContact = page.getByRole('navigation', { name: 'Mobile storefront' }).getByRole('button', { name: 'Contact' })
    await expect(mobileContact).toBeVisible()
    await expect(mobileContact).toHaveAttribute('aria-current', 'page')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  })

  test('cart closes before checkout and checkout is an order request', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Inventory & Catalog/i }).first().click()
    await page.locator('button[aria-label^="Add "]:not([disabled])').first().click()
    const cart = page.getByRole('dialog', { name: 'Shopping cart' })
    await expect(cart).toBeVisible()
    await cart.getByRole('button', { name: /Go to checkout/i }).click()
    await expect(cart).toBeHidden()
    await expect(page.getByRole('heading', { name: /Submit an order request/i })).toBeVisible()
    await expect(page.getByText(/No online payment is collected yet/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Submit order request/i })).toBeVisible()
    await expect(page.getByText(/Confirm payment|Scan with any QR/i)).toHaveCount(0)
  })

  test('checkout requires a contact channel before submission', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Inventory & Catalog/i }).first().click()
    await page.locator('button[aria-label^="Add "]:not([disabled])').first().click()
    await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /Go to checkout/i }).click()
    await page.getByLabel('Full name').fill('Launch Test')
    await page.getByLabel('Delivery address').fill('Makati City, Metro Manila')
    await page.getByRole('button', { name: /Submit order request/i }).click()
    await expect(page.getByRole('alert')).toContainText(/email address or mobile number/i)
  })
})
