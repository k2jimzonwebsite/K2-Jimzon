import { test, expect } from '@playwright/test'

const openStorefront = async page => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  // Every real Storefront view owns <main>; the Suspense loading fallback does
  // not. Wait for the initial lazy Home chunk before a journey clicks or reads
  // view content, while keeping a bounded failure when rendering never settles.
  await expect(page.getByRole('main')).toBeVisible({ timeout: 30000 })
}

test.describe('launch-critical storefront', () => {
  test('production storefront ignores the prototype demo hash and exposes no VIP password rail', async ({ page }) => {
    test.setTimeout(90000)
    await page.goto('/#demo', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.getByRole('navigation', { name: 'Storefront' })).toBeVisible()
    await expect(page.getByText('Prototype', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'VIP Login' })).toHaveCount(0)
    await expect(page.getByText('Authenticate to unlock tier pricing.')).toHaveCount(0)
  })

  test('light mode preserves the luxury wood canvas without leaking into dark mode', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'light'))
    await openStorefront(page)

    const storefront = page.locator('.storefront-ui')
    await expect(storefront).toBeVisible()
    await expect.poll(() => storefront.evaluate(element => getComputedStyle(element).backgroundImage))
      .toContain('wood-bg.jpg')

    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect.poll(() => storefront.evaluate(element => getComputedStyle(element).backgroundImage))
      .toBe('none')
  })

  test('home and catalog render without unsafe payment claims', async ({ page }) => {
    await openStorefront(page)
    await expect(page).toHaveTitle(/K2 Jimzon/)
    await expect(page.getByRole('button', { name: /Shop the Collection/i })).toBeVisible()
    await expect(page.getByText(/Payment confirms automatically/i)).toHaveCount(0)
    await page.getByRole('button', { name: /Inventory & Catalog/i }).first().click()
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({ timeout: 15000 })
  })

  test('latest consignment keeps the featured visual free of a New Arrival overlay', async ({ page }) => {
    await openStorefront(page)
    // Copy moved from "The latest consignment" to "New Arrivals", and the
    // per-card "Current consignment" badge was removed outright. The guarantee is
    // unchanged: the featured visual must not carry a promotional overlay. The
    // section heading legitimately reads "New Arrivals", so scope the assertion to
    // the card, never the section.
    const section = page.getByRole('region', { name: 'New arrivals' })
    const heading = section.getByRole('heading', { name: 'New Arrivals' })
    const card = section.locator('[data-testid="product-card"]').first()
    await expect(heading).toBeVisible({ timeout: 15000 })
    await expect(card).toBeVisible({ timeout: 15000 })
    await expect(card.getByText(/New Arrival/i)).toHaveCount(0)
  })

  test('contact is always visible and never fabricates live staff availability', async ({ page }) => {
    await openStorefront(page)
    await page.getByRole('navigation', { name: 'Storefront' }).getByRole('button', { name: 'Contact us' }).click()

    const main = page.getByRole('main')
    // The Contact view is a lazy production chunk. A cold Vite transform on CI
    // can outlive Playwright's five-second assertion default even though the
    // navigation has succeeded, so use the same bounded view timeout as Catalog.
    await expect(main.getByRole('heading', { name: 'Ask us directly.' })).toBeVisible({ timeout: 15000 })
    await expect(main.getByText('k2jimzonwebsite@gmail.com')).toBeVisible()
    await expect(main.getByText('@k2jimzon')).toBeVisible()
    await expect(main.getByText('k2jimzononlineshop')).toBeVisible()
    // The explicit "Public business number awaiting confirmation / Not published
    // yet" row was removed when Contact was rebuilt. The point of that row was to
    // avoid publishing a number K2 cannot answer, so assert the outcome directly:
    // no phone number is advertised anywhere on the page.
    await expect(main.getByText(/\+?\d[\d ()-]{8,}/)).toHaveCount(0)
    await expect(main.getByText(/staff (is )?online/i)).toHaveCount(0)
    await expect(main.getByText(/replies? within \d/i)).toHaveCount(0)

    await page.setViewportSize({ width: 1024, height: 768 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

    await page.setViewportSize({ width: 375, height: 812 })
    const mobileContact = page.getByRole('navigation', { name: 'Mobile storefront' }).getByRole('button', { name: 'Contact' })
    await expect(mobileContact).toBeVisible()
    await expect(mobileContact).toHaveAttribute('aria-current', 'page')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  })

  test('cart closes before checkout and checkout is an order request', async ({ page }) => {
    await openStorefront(page)
    await page.getByRole('button', { name: /Inventory & Catalog/i }).first().click()
    await page.locator('button[aria-label^="Add "]:not([disabled])').first().click()
    const cart = page.getByRole('dialog', { name: 'Shopping cart' })
    await expect(cart).toBeVisible()
    await cart.getByRole('button', { name: /Review order request/i }).click()
    await expect(cart).toBeHidden()
    // Checkout's h1 is now "Review order request" and the no-charge wording was
    // rephrased. The guarantee is unchanged and must stay explicit on the page:
    // submitting collects nothing.
    await expect(page.getByRole('heading', { name: /Review order request/i })).toBeVisible()
    await expect(page.getByText(/does not charge you or require immediate payment/i)).toBeVisible()
    await expect(page.getByText(/No upfront payment is required/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Submit order request/i })).toBeVisible()
    await expect(page.getByText(/Confirm payment|Scan with any QR/i)).toHaveCount(0)
  })

  test('checkout requires a contact channel before submission', async ({ page }) => {
    await openStorefront(page)
    await page.getByRole('button', { name: /Inventory & Catalog/i }).first().click()
    await page.locator('button[aria-label^="Add "]:not([disabled])').first().click()
    await page.getByRole('dialog', { name: 'Shopping cart' }).getByRole('button', { name: /Review order request/i }).click()
    await page.getByLabel('Full name').fill('Launch Test')
    await page.getByLabel('Delivery address').fill('Makati City, Metro Manila')
    await page.getByRole('button', { name: /Submit order request/i }).click()
    await expect(page.getByRole('alert')).toContainText(/email address or mobile number/i)
  })

  test('wholesale inquiry never fabricates a receipt, approval, or response promise', async ({ page }) => {
    test.setTimeout(90000)
    await page.setViewportSize({ width: 375, height: 812 })
    await openStorefront(page)
    await page.getByRole('navigation', { name: 'Storefront' }).getByRole('button', { name: 'Wholesale' }).click()
    await expect(page.getByRole('heading', { name: /Start a traceable business-supply inquiry/i })).toBeVisible({ timeout: 15000 })
    await page.getByLabel(/Registered Company Name/i).fill('Launch Test Cafe')
    await page.getByLabel(/Contact Person Full Name/i).fill('Maria Test')
    await page.getByLabel(/Work Email/i).fill('buyer@example.com')
    await page.getByLabel(/Mobile.*WhatsApp.*Viber/i).fill('09171234567')
    await page.getByLabel(/Delivery City.*Area/i).fill('Makati City')
    await page.getByLabel(/I am authorized to make this inquiry/i).check()
    await page.getByRole('button', { name: 'Prepare Wholesale Email' }).click()
    await expect(page.getByRole('heading', { name: 'Email draft prepared — not submitted' })).toBeVisible()
    await expect(page.getByText(/has not received or recorded this inquiry yet/i)).toBeVisible()
    await expect(page.getByText(/within 1–2 business days/i)).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('k2_wholesale_applications'))).toBeNull()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/wholesale-inquiry-mobile.png', fullPage: true })
  })
})

// Deep linking shipped in e7def20 with no test coverage at all. These cover the
// client-side half — that a cold URL resolves to the right view and that browser
// history works. The production half (Vercel must rewrite unknown paths to
// index.html, or these URLs 404 before React ever loads) is asserted separately
// in security-headers-contract.spec.js, because the dev server falls back on its
// own and would hide that failure here.
test.describe('storefront deep linking', () => {
  test('a cold load of /catalog renders the catalog, not the home view', async ({ page }) => {
    await page.goto('/catalog', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('main')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({ timeout: 15000 })
    expect(new URL(page.url()).pathname).toBe('/catalog')
  })

  test('a cold load of /product/:sku opens that product and survives reload', async ({ page }) => {
    await page.goto('/product/caffe-milano-gold', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('main')).toBeVisible({ timeout: 30000 })
    expect(new URL(page.url()).pathname).toBe('/product/caffe-milano-gold')

    // The regression this guards: view state used to live only in memory, so a
    // refresh dropped the visitor back to home.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('main')).toBeVisible({ timeout: 30000 })
    expect(new URL(page.url()).pathname).toBe('/product/caffe-milano-gold')
  })

  test('browser back returns to the previous view rather than leaving the site', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('main')).toBeVisible({ timeout: 30000 })
    await page.getByRole('button', { name: /Inventory & Catalog/i }).first().click()
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15000 }).toBe('/catalog')
    await page.goBack()
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15000 }).toBe('/')
    await expect(page.getByRole('main')).toBeVisible()
  })
})
