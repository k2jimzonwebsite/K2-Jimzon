# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hero-enhancement.spec.js >> additive hero preserves the original content and supports keyboard shopping
- Location: tests\hero-enhancement.spec.js:21:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('section').filter({ has: locator('h1') }).first().getByRole('heading', { level: 1 })
Expected substring: "Italy, chosen well."
Timeout: 60000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 60000ms
  - waiting for locator('section').filter({ has: locator('h1') }).first().getByRole('heading', { level: 1 })

```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | import fs from 'node:fs'
  3  | 
  4  | const evidence = 'docs/evidence/20260906-hero-additions'
  5  | const products = [
  6  |   ['preview-coffee', 'Italian whole-bean coffee', 550, 'luxury_coffee_bag.jpg'],
  7  |   ['preview-pistachio', 'Spreadable pistachio cream', 735, 'luxury_pistachio.jpg'],
  8  |   ['preview-biscuits', 'Chocolate-filled Italian biscuits', 295, 'luxury_biscuit_pouch.jpg'],
  9  | ].map(([sku, name, srp, image]) => ({ sku, name, srp, wholesale_price: srp - 50, status: 'Live', primary_image_url: `/images/mock/${image}`, secondary_images: [], lifestyle_images: [] }))
  10 | 
  11 | test.beforeEach(async ({ page }) => {
  12 |   fs.mkdirSync(evidence, { recursive: true })
  13 |   await page.emulateMedia({ reducedMotion: 'reduce' })
  14 |   await page.route('https://**/*', route => route.abort())
  15 |   await page.route('**/rest/v1/**', route => {
  16 |     const table = new URL(route.request().url()).pathname.split('/').pop()
  17 |     return route.fulfill({ json: table === 'products' ? products : table === 'v_product_stock_from_batches' ? products.map(p => ({ sku: p.sku, stock_from_batches: 5 })) : [] })
  18 |   })
  19 | })
  20 | 
  21 | test('additive hero preserves the original content and supports keyboard shopping', async ({ page }) => {
  22 |   const errors = []
  23 |   page.on('pageerror', error => errors.push(error.message))
  24 |   await page.goto('/', { waitUntil: 'domcontentloaded' })
  25 |   const hero = page.locator('section').filter({ has: page.locator('h1') }).first()
> 26 |   await expect(hero.getByRole('heading', { level: 1 })).toContainText('Italy, chosen well.', { timeout: 60000 })
     |                                                         ^ Error: expect(locator).toContainText(expected) failed
  27 |   for (const text of ['Delivered to Manila.', 'Milano to Manila', 'Genuine catalog', 'Personal confirmation', 'No payment required at checkout. We verify stock first.']) {
  28 |     await expect(hero.getByText(text, { exact: false }).first()).toBeVisible()
  29 |   }
  30 |   await expect(hero.getByRole('button', { name: 'Shop the Collection' })).toBeVisible()
  31 |   await expect(hero.getByRole('button', { name: 'Request from Italy' })).toBeVisible()
  32 |   const items = hero.locator('.hero-collection-item')
  33 |   await expect(items).toHaveCount(3)
  34 |   await expect(items.first()).toContainText('₱550')
  35 |   for (const width of [375, 768, 1440]) {
  36 |     await page.setViewportSize({ width, height: 900 })
  37 |     await hero.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode().catch(() => {}))))
  38 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  39 |     for (const item of await items.all()) {
  40 |       const box = await item.boundingBox()
  41 |       expect(box.width).toBeGreaterThanOrEqual(44)
  42 |       expect(box.height).toBeGreaterThanOrEqual(44)
  43 |     }
  44 |     await hero.screenshot({ path: `${evidence}/hero-${width}-light.png` })
  45 |     await page.evaluate(() => document.documentElement.classList.add('dark'))
  46 |     await hero.screenshot({ path: `${evidence}/hero-${width}-dark.png` })
  47 |     await page.evaluate(() => document.documentElement.classList.remove('dark'))
  48 |     if (width === 375) {
  49 |       await page.locator('.hero-collection').evaluate(element => element.scrollIntoView({ block: 'center' }))
  50 |       await page.screenshot({ path: `${evidence}/hero-375-shopping-viewport.png` })
  51 |     }
  52 |   }
  53 |   await page.setViewportSize({ width: 812, height: 375 })
  54 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  55 |   await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  56 |   expect(await page.locator('.hero-collection').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  57 |   await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  58 |   await page.setViewportSize({ width: 1440, height: 900 })
  59 |   await items.first().focus()
  60 |   await expect(items.first()).toBeFocused()
  61 |   await page.keyboard.press('Enter')
  62 |   await expect(page).toHaveURL(/\/product\/preview-coffee$/)
  63 |   await expect(page.getByRole('heading', { level: 1, name: products[0].name })).toBeVisible({ timeout: 60000 })
  64 |   expect(errors).toEqual([])
  65 | })
  66 | 
  67 | test('unavailable product images fall back without losing the product link', async ({ page }) => {
  68 |   await page.route('**/images/mock/**', route => route.abort())
  69 |   await page.setViewportSize({ width: 375, height: 900 })
  70 |   await page.goto('/', { waitUntil: 'domcontentloaded' })
  71 |   const first = page.locator('.hero-collection-item').first()
  72 |   await expect(first).toBeVisible({ timeout: 60000 })
  73 |   await expect(first.locator('img')).toHaveAttribute('src', '/images/placeholder.svg')
  74 |   await first.click()
  75 |   await expect(page).toHaveURL(/\/product\/preview-coffee$/)
  76 | })
  77 | 
  78 | test('loading and empty collection keep both original shopping routes available', async ({ page }) => {
  79 |   let release
  80 |   const hold = new Promise(resolve => { release = resolve })
  81 |   await page.route('**/rest/v1/products*', async route => {
  82 |     await hold
  83 |     await route.fulfill({ json: [{ ...products[0], status: 'Unlisted' }] })
  84 |   })
  85 |   await page.goto('/', { waitUntil: 'domcontentloaded' })
  86 |   await expect(page.locator('.hero-collection')).toHaveAttribute('aria-busy', 'true', { timeout: 60000 })
  87 |   await expect(page.locator('.hero-collection-item')).toHaveCount(0)
  88 |   await expect(page.getByText('Loading the collection…', { exact: true })).toBeVisible()
  89 |   release()
  90 |   await expect(page.locator('.hero-collection')).toHaveAttribute('aria-busy', 'false')
  91 |   await expect(page.locator('.hero-collection-item')).toHaveCount(0)
  92 |   await expect(page.getByText('Explore the collection or request a favorite from Italy.', { exact: true })).toBeVisible()
  93 |   await page.getByRole('button', { name: 'Request from Italy', exact: true }).click()
  94 |   await expect(page).toHaveURL(/\/pasabuy$/)
  95 |   await page.goto('/')
  96 |   await page.getByRole('button', { name: 'Shop the Collection', exact: true }).click()
  97 |   await expect(page).toHaveURL(/\/catalog$/)
  98 | })
  99 | 
```