import { expect, test } from '@playwright/test'

const product = { sku: 'READINESS-COFFEE', name: 'Test espresso beans 250g', status: 'Live', srp: 845,
  primary_image_url: '/images/placeholder.svg', secondary_images: [], lifestyle_images: [],
  description: 'Synthetic product for local verification.', country_of_origin: 'Italy', subcategory: 'Coffee & Drinks' }

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort())
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop()
    return route.fulfill({ json: table === 'products' ? [product]
      : table === 'v_product_stock_from_batches' ? [{ sku: product.sku, stock_from_batches: 8 }] : [] })
  })
  await page.route('**/api/guest/**', route => route.fulfill({ json: { conversations: [], orders: [] } }))
})

for (const width of [390, 1440]) for (const dark of [false, true]) {
  test(`customer pages readable at ${width}px ${dark ? 'dark' : 'light'}`, async ({ page }) => {
    test.setTimeout(240000)
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: dark ? 'dark' : 'light' })
    const routes = ['/', '/catalog', `/product/${product.sku}`, '/pasabuy', '/wholesale', '/contact', '/privacy', '/terms', '/account', '/messages', '/confirmation']
    const problems = []
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('main')).toBeVisible({ timeout: 60000 })
      await expect(page.locator('main h1').first()).toBeVisible({ timeout: 60000 })
      const result = await page.locator('main').evaluate(main => {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        const rgba = value => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].map((v, i) => i === 3 ? v / 255 : v) }
        const blend = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3])).concat(1)
        const lum = rgb => rgb.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0)
        const issues = []
        for (const el of main.querySelectorAll('label, input:not([type=checkbox]):not([type=radio]), textarea, select, .text-crimson, .text-forest, .text-blue')) {
          if (!el.getClientRects().length || !el.textContent.trim() && !el.matches('input,textarea,select') || el.closest('svg') || el.disabled) continue
          const style = getComputedStyle(el)
          const size = parseFloat(style.fontSize)
          const min = el.matches('input,textarea,select') ? 16 : 14
          if (size < min) issues.push(`${el.tagName} ${el.textContent.trim().slice(0, 32)} font ${size}`)
          const chain = []
          for (let parent = el; parent; parent = parent.parentElement) chain.unshift(parent)
          let bg = [255, 255, 255, 1]
          for (const parent of chain) bg = blend(rgba(getComputedStyle(parent).backgroundColor), bg)
          const fg = blend(rgba(style.color), bg)
          const ratio = (Math.max(lum(fg), lum(bg)) + .05) / (Math.min(lum(fg), lum(bg)) + .05)
          const limit = size >= 24 || size >= 18.66 && Number(style.fontWeight) >= 700 ? 3 : 4.5
          if (ratio < limit) issues.push(`${el.tagName} ${el.textContent.trim().slice(0, 32)} contrast ${ratio.toFixed(2)}`)
        }
        if (document.documentElement.scrollWidth > innerWidth) issues.push('document overflows')
        return issues
      })
      problems.push(...result.map(issue => `${route}: ${issue}`))
      await page.screenshot({ path: `docs/evidence/20260921-storefront-readiness/${route.replaceAll('/', '_') || 'home'}-${width}-${dark ? 'dark' : 'light'}.png` })
    }
    expect(problems).toEqual([])
  })
}

test('checkout explains manual payment without advertising unapproved providers', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto(`/product/${product.sku}`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.getByRole('button', { name: 'Review order request', exact: true }).click()
  await expect(page.getByText('Pay after staff confirmation', { exact: true })).toBeVisible()
  await expect(page.getByText('GCash / Maya / Bank', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Submit order request', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
