import { expect, test } from '@playwright/test'

for (const width of [390, 1280]) {
  for (const theme of ['light', 'dark']) {
    for (const shape of ['portrait', 'square']) {
      test(`${width} ${theme} ${shape}: complete primary stays inside comparison well`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`/tests/fixtures/product-comparison-harness.html?theme=${theme}&shape=${shape}`)
        const slider = page.getByRole('slider')
        const primary = slider.getByRole('img', { name: 'Comparison test package', exact: true })
        await expect(primary).toBeVisible()
        await expect.poll(() => primary.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
        const geometry = await primary.evaluate(img => {
          const image = img.getBoundingClientRect()
          const well = img.parentElement.parentElement.getBoundingClientRect()
          return { image: image.toJSON(), well: well.toJSON(), fit: getComputedStyle(img).objectFit }
        })
        expect(geometry.fit).toBe('contain')
        expect(geometry.image.width).toBeGreaterThan(0)
        expect(geometry.image.height).toBeGreaterThan(0)
        for (const edge of ['top', 'left']) expect(geometry.image[edge]).toBeGreaterThanOrEqual(geometry.well[edge] - 1)
        for (const edge of ['bottom', 'right']) expect(geometry.image[edge]).toBeLessThanOrEqual(geometry.well[edge] + 1)
        await expect.poll(() => slider.getByRole('img', { name: 'After use', exact: true }).evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
        await slider.focus()
        await page.keyboard.press('ArrowRight')
        await expect(slider).toHaveAttribute('aria-valuenow', '64')
        await page.keyboard.press('ArrowLeft')
        await expect(slider).toHaveAttribute('aria-valuenow', '58')
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        if (shape === 'portrait') await page.screenshot({ path: `outputs/listing-team-20261023/goal-team/detail-crop-fix-20261024/${width}-${theme}.png` })
      })
    }
    test(`${width} ${theme}: failed primary retains a contained fallback`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.route('**/comparison-missing-image.png', route => route.fulfill({ status: 404, body: '' }))
      await page.goto(`/tests/fixtures/product-comparison-harness.html?theme=${theme}&shape=broken`)
      const slider = page.getByRole('slider')
      await expect(slider.getByText('Comparison test package', { exact: true })).toBeVisible()
      const geometry = await slider.getByText('Comparison test package', { exact: true }).evaluate(label => {
        const art = label.parentElement.parentElement.getBoundingClientRect()
        const well = label.closest('[role=slider]').getBoundingClientRect()
        return { art: art.toJSON(), well: well.toJSON() }
      })
      for (const edge of ['top', 'left']) expect(geometry.art[edge]).toBeGreaterThanOrEqual(geometry.well[edge] - 1)
      for (const edge of ['bottom', 'right']) expect(geometry.art[edge]).toBeLessThanOrEqual(geometry.well[edge] + 1)
    })
  }
}
