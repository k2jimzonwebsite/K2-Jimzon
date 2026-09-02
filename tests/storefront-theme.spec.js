import { test, expect } from '@playwright/test'

function contrastRatio(foreground, background) {
  const channels = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number)
  const luminance = (value) => {
    const [red, green, blue] = channels(value).map(channel => {
      const normalized = channel / 255
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
  }

  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

async function surfaceColors(locator) {
  return locator.evaluate(element => {
    const style = getComputedStyle(element)
    return { color: style.color, backgroundColor: style.backgroundColor }
  })
}

test.describe('storefront theme contract', () => {
  test('saved theme is applied before render and persists after toggling', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('theme', 'light'))
    await page.reload()

    const storefront = page.locator('.storefront-ui')
    const announcement = page.locator('header > div').first()
    const footer = page.locator('footer')
    await expect(storefront).toBeVisible()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await expect.poll(() => storefront.evaluate(element => getComputedStyle(element).backgroundImage))
      .toContain('wood-bg.jpg')

    const lightAnnouncement = await surfaceColors(announcement)
    const lightFooter = await surfaceColors(footer)
    expect(contrastRatio(lightAnnouncement.color, lightAnnouncement.backgroundColor)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(lightFooter.color, lightFooter.backgroundColor)).toBeGreaterThanOrEqual(4.5)
    if (process.env.K2_CAPTURE_THEMES === '1') {
      await expect(page.getByRole('button', { name: /Shop the Collection/i })).toBeVisible({ timeout: 45000 })
      await page.screenshot({ path: 'test-results/storefront-theme-light.png', fullPage: true })
    }

    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark')
    await expect.poll(() => storefront.evaluate(element => getComputedStyle(element).backgroundImage)).toBe('none')
    await expect(page.locator('#theme-color')).toHaveAttribute('content', '#090C15')

    const darkAnnouncement = await surfaceColors(announcement)
    const darkFooter = await surfaceColors(footer)
    expect(contrastRatio(darkAnnouncement.color, darkAnnouncement.backgroundColor)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(darkFooter.color, darkFooter.backgroundColor)).toBeGreaterThanOrEqual(4.5)
    if (process.env.K2_CAPTURE_THEMES === '1') {
      await page.screenshot({ path: 'test-results/storefront-theme-dark.png', fullPage: true })
    }

    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible()
  })

  test('first visit follows the operating-system preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.addInitScript(() => localStorage.removeItem('theme'))
    await page.goto('/')

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('.storefront-ui')).toHaveCSS('color-scheme', 'dark')
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible()
  })
})
