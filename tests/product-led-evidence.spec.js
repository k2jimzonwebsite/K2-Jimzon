import { test, expect } from '@playwright/test'

test('captures product-led related provisions and mobile 2-col catalog', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/product/baiocchi', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#related-provisions-heading')).toBeVisible({ timeout: 30000 })
  const relatedSection = page.locator('section[aria-labelledby="related-provisions-heading"]')
  await relatedSection.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'docs/evidence/20260915-product-led-catalog/desktop-product-related.png', fullPage: false })

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/product/baiocchi', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#related-provisions-heading')).toBeVisible({ timeout: 30000 })
  await page.locator('#related-provisions-heading').scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'docs/evidence/20260915-product-led-catalog/mobile-product-related.png', fullPage: false })

  await page.goto('/catalog', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#catalog')).toBeVisible({ timeout: 30000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'docs/evidence/20260915-product-led-catalog/mobile-catalog-2col.png', fullPage: false })
})
