import { test, expect } from '@playwright/test'

test.describe('Pasabuy and wholesale truthfulness', () => {
  test('Pasabuy validates contact and explains attachment limitation', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Storefront' }).getByRole('button', { name: 'Pasabuy', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: /Pasabuy, straight from Italy/i })).toBeVisible({ timeout: 60000 })
    await expect(page.getByLabel(/Product link or reference photo URL/i)).toBeVisible()
    await expect(page.locator('input[type="file"]')).toHaveCount(0)
    await page.getByLabel('Full name').fill('Pasabuy Test')
    await page.getByLabel(/Item name, brand, and exact size/i).fill('Exact Italian product test')
    await page.getByRole('button', { name: /Submit Pasabuy request/i }).click()
    await expect(page.getByRole('alert')).toContainText(/email address or mobile number/i)
  })

  test('wholesale page has no demo credential bypass', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Storefront' }).getByRole('button', { name: 'Wholesale', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Start a traceable business-supply inquiry/i })).toBeVisible({ timeout: 60000 })
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
    await expect(page.getByText(/any credentials work/i)).toHaveCount(0)
  })

  test('mobile primary actions meet the 44px interaction target', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const cartButton = page.getByRole('button', { name: /Open cart/i })
    const box = await cartButton.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })
})
