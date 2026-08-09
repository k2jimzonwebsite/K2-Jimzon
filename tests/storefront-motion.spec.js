import { test, expect } from '@playwright/test'

test.describe('storefront interaction language', () => {
  test('interactive surfaces respond without changing the editorial layout', async ({ page }) => {
    await page.goto('/')

    const categoryTile = page.locator('.category-tile').first()
    await categoryTile.scrollIntoViewIfNeeded()
    await expect(categoryTile).toBeVisible()
    await categoryTile.hover()
    await expect.poll(() => categoryTile.locator('span').first().evaluate(element => getComputedStyle(element).transform))
      .not.toBe('none')

    const storySteps = page.locator('.story-step')
    await storySteps.nth(1).scrollIntoViewIfNeeded()
    await storySteps.nth(1).click()
    await expect(storySteps.nth(1)).toHaveAttribute('aria-pressed', 'true')
    await expect(storySteps.nth(0)).toHaveAttribute('aria-pressed', 'false')

    const faqButtons = page.locator('.faq-trigger')
    await faqButtons.nth(1).scrollIntoViewIfNeeded()
    await faqButtons.nth(1).click()
    await expect(faqButtons.nth(1)).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#faq-answer-1 .faq-answer')).toHaveCSS('opacity', '1')

    if (process.env.K2_CAPTURE_MOTION === '1') {
      await page.locator('.story-journey').screenshot({ path: 'test-results/storefront-motion-story.png' })
      await faqButtons.nth(1).locator('..').screenshot({ path: 'test-results/storefront-motion-faq.png' })
    }
  })

  test('reduced motion keeps every interaction visible and usable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const categoryTile = page.locator('.category-tile').first()
    await categoryTile.scrollIntoViewIfNeeded()
    await expect(categoryTile).toBeVisible()
    await expect(categoryTile).toHaveCSS('opacity', '1')

    const storyStep = page.locator('.story-step').nth(2)
    await storyStep.scrollIntoViewIfNeeded()
    await storyStep.click()
    await expect(storyStep).toHaveAttribute('aria-pressed', 'true')

    const faqButton = page.locator('.faq-trigger').first()
    await faqButton.scrollIntoViewIfNeeded()
    await faqButton.click()
    await expect(faqButton).toHaveAttribute('aria-expanded', 'false')
  })
})
