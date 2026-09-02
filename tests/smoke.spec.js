import { test, expect } from '@playwright/test'
import sharp from 'sharp'

const openStorefront = async page => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  // Every real Storefront view owns <main>; the Suspense loading fallback does
  // not. Wait for the initial lazy Home chunk before a journey clicks or reads
  // view content, while keeping a bounded failure when rendering never settles.
  await expect(page.getByRole('main')).toBeVisible({ timeout: 60000 })
}

const contrastRatio = (foreground, background) => {
  const luminance = value => {
    const channels = value.match(/[\d.]+/g).slice(0, 3).map(Number)
    return channels
      .map(channel => channel / 255)
      .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
  }
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

test.describe('launch-critical storefront', () => {
  test.describe.configure({ timeout: 120000 })

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
    await expect(main.getByText('Business number')).toBeVisible()
    await expect(main.getByText('Not published yet')).toBeVisible()
    await expect(main.getByText('No response time is promised.')).toBeVisible()
    await expect(main.getByText(/\+?\d[\d ()-]{8,}/)).toHaveCount(0)
    await expect(main.getByText(/staff (is )?online/i)).toHaveCount(0)
    await expect(main.getByText(/replies? within \d/i)).toHaveCount(0)
    await expect(main.getByText(/respond promptly/i)).toHaveCount(0)

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
  test.describe.configure({ timeout: 120000 })

  test('a cold load of /catalog renders the catalog, not the home view', async ({ page }) => {
    await page.goto('/catalog', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('main')).toBeVisible({ timeout: 60000 })
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

test.describe('MAP-027 virtual store acceptance', () => {
  test.describe.configure({ timeout: 120000 })

  test('requests the Interactive Shop payload only after deliberate store entry', async ({ page }) => {
    const shopRequests = []
    const pageErrors = []
    const runtimeErrors = []
    page.on('request', request => {
      const pathname = new URL(request.url()).pathname
      if (/InteractiveShop|ShelfScene3D|components\/shop\//i.test(pathname)) {
        shopRequests.push(pathname)
      }
    })
    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error' && /ReferenceError|TypeError|The above error occurred/.test(message.text())) {
        runtimeErrors.push(message.text())
      }
    })

    for (const pathname of ['/', '/catalog', '/product/caffe-milano-gold']) {
      await page.goto(pathname, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('main')).toBeVisible({ timeout: 60000 })
    }

    expect(shopRequests).toEqual([])

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/store', { waitUntil: 'domcontentloaded' })
    const storeRegion = page.getByRole('main', { name: 'K2 virtual store' })
    await expect(storeRegion.or(page.getByRole('alert'))).toBeVisible({ timeout: 60000 })
    expect(pageErrors).toEqual([])
    expect(runtimeErrors).toEqual([])
    await expect(storeRegion).toBeVisible({ timeout: 60000 })
    await expect(page.locator('.k2-store-scene canvas')).toBeVisible({ timeout: 60000 })
    await expect.poll(() => shopRequests.some(pathname => /InteractiveShop/i.test(pathname))).toBe(true)
    await expect.poll(() => shopRequests.some(pathname => /ShelfScene3D/i.test(pathname))).toBe(true)
  })

  test('moves keyboard focus into the store and restores the catalog entry control', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/catalog', { waitUntil: 'domcontentloaded' })

    const enterStore = page.getByRole('button', { name: 'Enter the store' })
    await enterStore.focus()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/store$/)
    await expect(page.getByRole('heading', { name: 'The store', level: 1 })).toBeFocused()

    await page.keyboard.press('Escape')

    await expect(page).toHaveURL(/\/catalog$/)
    await expect(page.getByRole('button', { name: 'Enter the store' })).toBeFocused()
  })

  test('keeps the reduced-motion room self-contained and readable in a dark site theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/store', { waitUntil: 'domcontentloaded' })

    const shopkeeper = page.getByRole('region', { name: 'K2 shopkeeper' })
    await expect(shopkeeper).toBeVisible({ timeout: 60000 })
    const flatScene = page.locator('.k2-store-flat-scene')
    await expect.poll(() => flatScene.evaluate(element => getComputedStyle(element).backgroundImage))
      .toContain('wood-bg.jpg')
    await expect(page.locator('footer')).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Mobile storefront' })).toHaveCount(0)
    const colors = await shopkeeper.evaluate(element => {
      const label = element.querySelector('p')
      const input = element.querySelector('input')
      return {
        label: getComputedStyle(label).color,
        labelBackground: getComputedStyle(element).backgroundColor,
        placeholder: getComputedStyle(input, '::placeholder').color,
        inputBackground: getComputedStyle(input).backgroundColor,
      }
    })

    await page.screenshot({ path: 'test-results/map027-store-dark-preference.png', fullPage: false })
    expect.soft(contrastRatio(colors.label, colors.labelBackground)).toBeGreaterThanOrEqual(4.5)
    expect.soft(contrastRatio(colors.placeholder, colors.inputBackground)).toBeGreaterThanOrEqual(4.5)
  })

  test('keeps the pop-out guide, store moment, and canonical basket synchronized', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/store', { waitUntil: 'domcontentloaded' })

    const store = page.getByRole('main', { name: 'K2 virtual store' })
    const guide = store.getByRole('region', { name: 'K2 shopkeeper' })
    const guideToggle = guide.getByRole('button', { name: 'Minimize K2 shopkeeper' })
    await expect(store).toBeVisible({ timeout: 60000 })
    await expect(guide).toBeVisible({ timeout: 60000 })
    await expect(guide).toHaveAttribute('data-moment', 'welcome')
    await guideToggle.click()
    await expect(guide).toHaveAttribute('data-open', 'false')
    await guide.getByRole('button', { name: 'Open K2 shopkeeper' }).click()

    await store.getByRole('navigation', { name: 'Shelves' }).getByRole('button', { name: 'Coffee' }).click()
    await expect(guide).toHaveAttribute('data-moment', 'explore')
    await store.locator('.k2-store-rail').getByRole('button', { name: /Caffè Milano Special Reserve/ }).click()
    await expect(guide).toHaveAttribute('data-moment', 'inspect')
    await store.getByRole('region', { name: /Selected product: Caffè Milano/ })
      .getByRole('button', { name: 'Add to basket' }).click()
    await expect(guide).toHaveAttribute('data-moment', 'added')
    await expect(store.getByRole('region', { name: 'Your basket' })).toContainText('1 item')
  })

  test('completes the phone shelf-to-order-request journey through the canonical basket', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/store', { waitUntil: 'domcontentloaded' })

    const store = page.getByRole('main', { name: 'K2 virtual store' })
    await expect(store).toBeVisible({ timeout: 60000 })
    await expect(store.locator('.k2-store-scene canvas')).toBeVisible({ timeout: 60000 })

    const shelfNav = store.getByRole('navigation', { name: 'Shelves' })
    await shelfNav.getByRole('button', { name: 'Coffee' }).click()
    await expect(shelfNav.getByRole('button', { name: 'Coffee' })).toHaveAttribute('aria-current', 'true')

    await store.locator('.k2-store-rail').getByRole('button', { name: /Caffè Milano Special Reserve/ }).click()
    const productPanel = store.getByRole('region', { name: /Selected product: Caffè Milano/ })
    await expect(productPanel.getByRole('heading', { name: /Caffè Milano Special Reserve/ })).toBeVisible()
    await expect(productPanel).toContainText('What you can make')
    await expect(productPanel).toContainText('Espresso, moka pot, or long black')
    await expect(productPanel).not.toContainText('Draft text pending staff review')

    await productPanel.getByRole('button', { name: 'Add to basket' }).click()

    await expect(productPanel.getByRole('status')).toHaveText('1 in basket')
    await expect(productPanel.getByRole('button', { name: 'Add another' })).toBeVisible()

    const basket = store.getByRole('region', { name: 'Your basket' })
    await expect(basket).toContainText('1 item')
    await expect(basket).toContainText('Caffè Milano Special Reserve')
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('k2_cart_v1') || '[]')))
      .toEqual([{ id: 'caffe-milano-gold', qty: 1 }])
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/map027-store-mobile-shopping.png', fullPage: false })

    await basket.getByRole('button', { name: 'Send order request' }).click()
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByRole('heading', { name: 'Review order request', level: 1 })).toBeVisible()
  })

  test('renders a non-blank WebGL aisle with usable shelf navigation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/store', { waitUntil: 'domcontentloaded' })

    const store = page.getByRole('main', { name: 'K2 virtual store' })
    await expect(store).toBeVisible({ timeout: 60000 })
    await expect.poll(() => store.evaluate(element => getComputedStyle(element).backgroundImage))
      .toContain('wood-bg.jpg')

    const canvas = store.locator('.k2-store-scene canvas')
    await expect(canvas).toBeVisible({ timeout: 60000 })
    await expect.poll(() => canvas.evaluate(element => ({
      width: element.width,
      height: element.height,
      contextLost: element.getContext('webgl2')?.isContextLost()
        ?? element.getContext('webgl')?.isContextLost()
        ?? true,
    })), { timeout: 30000 }).toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
      contextLost: false,
    })

    const renderedFrame = await canvas.screenshot()
    const frameMetadata = await sharp(renderedFrame).metadata()
    const frameStats = await sharp(renderedFrame).stats()
    expect(frameMetadata.width).toBeGreaterThan(500)
    expect(frameMetadata.height).toBeGreaterThan(300)
    expect(Math.max(...frameStats.channels.slice(0, 3).map(channel => channel.stdev))).toBeGreaterThan(8)

    const shelfNav = store.getByRole('navigation', { name: 'Shelves' })
    await expect(shelfNav.getByRole('button', { name: 'Counter' })).toHaveAttribute('aria-current', 'true')
    await store.locator('.k2-store-steps').getByRole('button', { name: /Coffee/ }).click()
    await expect(shelfNav.getByRole('button', { name: 'Coffee' })).toHaveAttribute('aria-current', 'true')
    await expect(store.locator('.k2-store-rail button').first()).toBeVisible()

    await expect.poll(async () => {
      const frame = await sharp(await canvas.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      let darkPixels = 0
      const rows = Math.min(8, frame.info.height)
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < frame.info.width; x += 1) {
          const offset = (y * frame.info.width + x) * frame.info.channels
          if (frame.data[offset] < 72 && frame.data[offset + 1] < 72 && frame.data[offset + 2] < 72) {
            darkPixels += 1
          }
        }
      }
      return darkPixels
    }, { timeout: 15000, intervals: [250, 500, 1000] }).toBe(0)

    await page.screenshot({ path: 'test-results/map027-store-desktop.png', fullPage: false })

    await canvas.evaluate(element => {
      element.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    })
    await expect(store.locator('.k2-store-scene canvas')).toHaveCount(0)
    await expect(store.locator('.k2-store-flat-scene')).toContainText('Coffee & Drinks')
  })

  test('keeps the semantic store usable when reduced motion disables WebGL', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/store', { waitUntil: 'domcontentloaded' })

    const store = page.getByRole('main', { name: 'K2 virtual store' })
    await expect(store).toBeVisible({ timeout: 60000 })
    await expect(store.locator('.k2-store-scene canvas')).toHaveCount(0)

    const shelfNav = store.getByRole('navigation', { name: 'Shelves' })
    const shelfNavBox = await shelfNav.boundingBox()
    expect(shelfNavBox?.width).toBeGreaterThan(300)
    await shelfNav.getByRole('button', { name: 'Coffee' }).click()
    await expect(shelfNav.getByRole('button', { name: 'Coffee' })).toHaveAttribute('aria-current', 'true')
    await expect(store.locator('.k2-store-flat-scene')).toContainText('Coffee & Drinks')
    await expect(store.locator('.k2-store-flat-scene')).toContainText('Whole beans, ground')
    await expect(store.locator('.k2-store-rail button').first()).toBeVisible()
    await expect(store.getByRole('button', { name: 'Leave the store' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/map027-store-mobile-reduced-motion.png', fullPage: false })
  })

  test('keeps the reduced-motion shopping controls usable in phone landscape with enlarged text', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/store', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px' })

    const store = page.getByRole('main', { name: 'K2 virtual store' })
    await expect(store).toBeVisible({ timeout: 60000 })
    await expect(store.locator('.k2-store-scene canvas')).toHaveCount(0)
    await expect(store.getByRole('button', { name: 'Leave the store' })).toBeVisible()

    const shelfNav = store.getByRole('navigation', { name: 'Shelves' })
    await shelfNav.getByRole('button', { name: 'Coffee' }).click()
    const [flatCardBox, shelfStepsBox, productRailBox] = await Promise.all([
      store.locator('.k2-store-flat-scene-card').boundingBox(),
      store.locator('.k2-store-steps').boundingBox(),
      store.locator('.k2-store-rail').boundingBox(),
    ])
    expect(flatCardBox).not.toBeNull()
    expect(shelfStepsBox).not.toBeNull()
    expect(productRailBox).not.toBeNull()
    expect(flatCardBox.y + flatCardBox.height).toBeLessThanOrEqual(shelfStepsBox.y)
    expect(shelfStepsBox.y + shelfStepsBox.height).toBeLessThanOrEqual(productRailBox.y)
    const firstProduct = store.locator('.k2-store-rail button').first()
    await expect(firstProduct).toBeVisible()
    await firstProduct.click()
    await expect(store.getByRole('region', { name: /Selected product:/ })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/map027-store-phone-landscape-large-text.png', fullPage: false })
  })
})
