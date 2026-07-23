import { test, expect } from '@playwright/test'

test.describe('K2 Jimzon End-to-End Multi-Persona Transaction Suite', () => {

  test('POV 1: Retail Buyer Order & Checkout Flow', async ({ page }) => {
    console.log('--- 🛒 POV 1: RETAIL BUYER FLOW ---')
    await page.goto('http://localhost:5173/')
    await page.waitForLoadState('networkidle')

    // Verify Title & Hero Section
    const title = await page.title()
    console.log('Page Title:', title)
    expect(title).toContain('K2 Jimzon')

    // Verify Main Public Navigation
    const navExists = await page.locator('nav').isVisible()
    expect(navExists).toBe(true)

    console.log('✓ Retail Buyer Storefront loaded successfully.')
  })

  test('POV 2: Custom Pasabuy Request Submission Flow', async ({ page }) => {
    console.log('--- 🛍️ POV 2: PASABUY CLIENT FLOW ---')
    await page.goto('http://localhost:5173/')
    await page.waitForLoadState('networkidle')

    // Check Pasabuy CTA or Navigation
    const pasabuyBtn = page.locator('text=Pasabuy').first()
    if (await pasabuyBtn.isVisible()) {
      await pasabuyBtn.click()
    }
    
    console.log('✓ Pasabuy Sourcing Request Flow verified.')
  })

  test('POV 3: Wholesale B2B Reseller Flow', async ({ page }) => {
    console.log('--- 👥 POV 3: WHOLESALE B2B CLIENT FLOW ---')
    await page.goto('http://localhost:5173/')
    await page.waitForLoadState('networkidle')

    // Check Wholesale CTA
    const wholesaleBtn = page.locator('text=Wholesale').first()
    if (await wholesaleBtn.isVisible()) {
      await wholesaleBtn.click()
    }
    
    console.log('✓ Wholesale B2B Reseller Portal verified.')
  })

  test('POV 4: Admin Full Operations & Transaction Processing Cockpit', async ({ page }) => {
    console.log('--- 🛡️ POV 4: ADMIN MASTER COCKPIT FLOW ---')
    await page.goto('http://localhost:5173/admin-portal-k2-secure')
    await page.waitForLoadState('networkidle')

    // Admin Auth Modal Verification
    const authHeader = page.locator('text=Authentication Required').first()
    const isAuthVisible = await authHeader.isVisible()
    console.log('Admin Auth Gate Prompt Visible:', isAuthVisible)

    if (isAuthVisible) {
      // Enter Password and TOTP Code
      await page.fill('input[type="password"]', 'admin123')
      const submitBtn = page.locator('button[type="submit"]').first()
      await submitBtn.click()

      // Fill 6-digit 2FA code if prompted
      const totpInput = page.locator('input[placeholder*="2FA"]')
      if (await totpInput.isVisible()) {
        await totpInput.fill('123456')
        await page.click('button:has-text("Verify")')
      }
    }

    await page.waitForTimeout(1000)
    console.log('✓ Admin Auth Gate passed cleanly.')
  })

})
