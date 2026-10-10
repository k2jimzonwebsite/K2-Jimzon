import { expect, test } from '@playwright/test'

const brands = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'First synthetic brand' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Second synthetic brand' },
]
const categories = [
  { id: '33333333-3333-4333-8333-333333333333', name: 'First synthetic category' },
  { id: '44444444-4444-4444-8444-444444444444', name: 'Second synthetic category' },
]
for (const [originalBrandId, originalCategoryId] of [[null, null], [brands[0].id, null], [null, categories[0].id]]) {
  test(`initial taxonomy draft choices remain correctable; saved ${originalBrandId ? 'brand' : originalCategoryId ? 'category' : 'neither'}`, async ({ page }) => {
    await page.route('https://fixture.supabase.co/**', route => route.abort())
    const product = { sku: 'synthetic-draft', name: 'Synthetic draft', status: 'Draft', published: false, brand_id: originalBrandId, category_id: originalCategoryId, stock_available: 0, total_stock: 0, updated_at: '2026-10-10T00:00:00Z' }
    await page.route('**/api/admin/products', route => route.fulfill({ json: { ok: true, products: [product] } }))
    await page.route('**/api/admin/product-master*', route => route.fulfill({ json: { ok: true, product, taxonomyReview: { status: 'eligible', originalBrandId, originalCategoryId, brandOptions: brands, categoryOptions: categories } } }))
    await page.goto('/tests/fixtures/admin-product-master-harness.html')
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    const editor = page.getByRole('dialog', { name: 'Edit Product' })
    const brand = editor.getByLabel('Brand', { exact: true })
    const category = editor.getByLabel('Canonical category', { exact: true })
    if (originalBrandId) {
      await expect(brand).toBeDisabled()
      await expect(brand).toHaveValue(originalBrandId)
    } else {
      await brand.selectOption(brands[0].id)
      await expect(brand).toBeEnabled()
      await brand.selectOption(brands[1].id)
      await expect(brand).toHaveValue(brands[1].id)
    }
    if (originalCategoryId) {
      await expect(category).toBeDisabled()
      await expect(category).toHaveValue(originalCategoryId)
    } else {
      await category.selectOption(categories[0].id)
      await expect(category).toBeEnabled()
      await category.selectOption(categories[1].id)
      await expect(category).toHaveValue(categories[1].id)
    }
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await editor.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
    }
  })
}
