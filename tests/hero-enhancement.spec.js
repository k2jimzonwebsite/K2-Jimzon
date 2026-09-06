import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const evidence = 'docs/evidence/20260906-hero-additions'
const products = [
  ['preview-coffee', 'Italian whole-bean coffee', 550, 'luxury_coffee_bag.jpg'],
  ['preview-pistachio', 'Spreadable pistachio cream', 735, 'luxury_pistachio.jpg'],
  ['preview-biscuits', 'Chocolate-filled Italian biscuits', 295, 'luxury_biscuit_pouch.jpg'],
].map(([sku, name, srp, image]) => ({ sku, name, srp, wholesale_price: srp - 50, status: 'Live', primary_image_url: `/images/mock/${image}`, secondary_images: [], lifestyle_images: [] }))

test.beforeEach(async ({ page }) => {
  fs.mkdirSync(evidence, { recursive: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('https://**/*', route => route.abort())
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop()
    return route.fulfill({ json: table === 'products' ? products : table === 'v_product_stock_from_batches' ? products.map(p => ({ sku: p.sku, stock_from_batches: 5 })) : [] })
  })
})

test('additive hero preserves the original content and supports keyboard shopping', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const hero = page.locator('section').filter({ has: page.locator('h1') }).first()
  await expect(hero.getByRole('heading', { level: 1 })).toContainText('Italy, chosen well.', { timeout: 60000 })
  for (const text of ['Delivered to Manila.', 'Milano to Manila', 'Genuine catalog', 'Personal confirmation', 'No payment required at checkout. We verify stock first.']) {
    await expect(hero.getByText(text, { exact: false }).first()).toBeVisible()
  }
  await expect(hero.getByRole('button', { name: 'Shop the Collection' })).toBeVisible()
  await expect(hero.getByRole('button', { name: 'Request from Italy' })).toBeVisible()
  const items = hero.locator('.hero-collection-item')
  await expect(items).toHaveCount(3)
  await expect(items.first()).toContainText('₱550')
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await hero.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode().catch(() => {}))))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    for (const item of await items.all()) {
      const box = await item.boundingBox()
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
    await hero.screenshot({ path: `${evidence}/hero-${width}-light.png` })
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await hero.screenshot({ path: `${evidence}/hero-${width}-dark.png` })
    await page.evaluate(() => document.documentElement.classList.remove('dark'))
    if (width === 375) {
      await page.locator('.hero-collection').evaluate(element => element.scrollIntoView({ block: 'center' }))
      await page.screenshot({ path: `${evidence}/hero-375-shopping-viewport.png` })
    }
  }
  await page.setViewportSize({ width: 812, height: 375 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  expect(await page.locator('.hero-collection').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  await page.setViewportSize({ width: 1440, height: 900 })
  await items.first().focus()
  await expect(items.first()).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/product\/preview-coffee$/)
  await expect(page.getByRole('heading', { level: 1, name: products[0].name })).toBeVisible({ timeout: 60000 })
  expect(errors).toEqual([])
})

test('unavailable product images fall back without losing the product link', async ({ page }) => {
  await page.route('**/images/mock/**', route => route.abort())
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const first = page.locator('.hero-collection-item').first()
  await expect(first).toBeVisible({ timeout: 60000 })
  await expect(first.locator('img')).toHaveAttribute('src', '/images/placeholder.svg')
  await first.click()
  await expect(page).toHaveURL(/\/product\/preview-coffee$/)
})

test('loading and empty collection keep both original shopping routes available', async ({ page }) => {
  let release
  const hold = new Promise(resolve => { release = resolve })
  await page.route('**/rest/v1/products*', async route => {
    await hold
    await route.fulfill({ json: [{ ...products[0], status: 'Unlisted' }] })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.hero-collection')).toHaveAttribute('aria-busy', 'true', { timeout: 60000 })
  await expect(page.locator('.hero-collection-item')).toHaveCount(0)
  await expect(page.getByText('Loading the collection…', { exact: true })).toBeVisible()
  release()
  await expect(page.locator('.hero-collection')).toHaveAttribute('aria-busy', 'false')
  await expect(page.locator('.hero-collection-item')).toHaveCount(0)
  await expect(page.getByText('Explore the collection or request a favorite from Italy.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Request from Italy', exact: true }).click()
  await expect(page).toHaveURL(/\/pasabuy$/)
  await page.goto('/')
  await page.getByRole('button', { name: 'Shop the Collection', exact: true }).click()
  await expect(page).toHaveURL(/\/catalog$/)
})
