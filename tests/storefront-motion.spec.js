import { test, expect } from '@playwright/test'

test.describe('storefront interaction language', () => {
  test('interactive surfaces respond without changing the editorial layout', async ({ page }) => {
    test.setTimeout(90000)
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.getByRole('main')).toBeVisible({ timeout: 30000 })

    const categoryTile = page.getByRole('region', { name: 'The Italian Cabinet' })
      .getByRole('button', { name: /Dolci & Biscotti/i })
    await categoryTile.scrollIntoViewIfNeeded()
    await expect(categoryTile).toBeVisible()
    const categoryIcon = categoryTile.locator('span').first()
    const idleBackground = await categoryIcon.evaluate(element => getComputedStyle(element).backgroundColor)
    await categoryTile.hover()
    await expect.poll(() => categoryIcon.evaluate(element => getComputedStyle(element).backgroundColor))
      .not.toBe(idleBackground)

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
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.getByRole('main')).toBeVisible({ timeout: 30000 })

    const categoryTile = page.getByRole('region', { name: 'The Italian Cabinet' })
      .getByRole('button', { name: /Dolci & Biscotti/i })
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

  test('Three.js globe chunk is not requested until the section is scrolled near', async ({ page }) => {
    test.setTimeout(90000)
    const requestedUrls = []
    page.on('request', request => {
      requestedUrls.push(request.url())
    })

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.getByRole('main')).toBeVisible({ timeout: 30000 })

    // Landing must not pull the largest artifact in the build. This is the half
    // of the deferral that saves bandwidth.
    expect(requestedUrls.filter(url => /GlobeSection/i.test(url))).toHaveLength(0)

    const globeHeading = page.getByRole('heading', { name: 'Reviews, mapped to the products.' })
    await globeHeading.scrollIntoViewIfNeeded()

    // The other half: it must actually load once scrolled near, or the section is
    // permanently broken. Assert on the network request, not on the heading or the
    // "Interactive review globe" region — GlobeSectionPlaceholder renders both of
    // those itself, so a visibility check here passes even when the
    // IntersectionObserver never fires and the globe never mounts.
    await expect
      .poll(() => requestedUrls.filter(url => /GlobeSection/i.test(url)).length, { timeout: 30000 })
      .toBeGreaterThan(0)
  })
})
