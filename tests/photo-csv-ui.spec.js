import { expect, test } from '@playwright/test'
import sharp from 'sharp'

const actor = '11111111-1111-4111-8111-111111111111'
const primary = 'https://media.example.test/new.png'
const initial = { sku: 'K2-PASTA', name: 'Reviewed pasta', status: 'Draft', primary_image_url: null, lifestyle_images: ['https://media.example.test/after.png'], secondary_images: [] }
const csvFile = { name: 'photos.csv', mimeType: 'text/csv', buffer: Buffer.from('sku,primary_file,after_file\nK2-PASTA,pasta.png,\n') }

async function setup(page, lost = false) {
  let product = { ...initial }, currentActor = actor
  const assignments = [], uploads = []
  const image = await sharp({ create: { width: 120, height: 150, channels: 4, background: '#92a87b' } }).png().toBuffer()
  await page.route('https://**/*', route => route.abort())
  await page.route('**/api/admin/session', route => route.fulfill({ json: { ok: true, user: { userId: currentActor, role: 'Admin' } } }))
  await page.route('**/api/admin/products', route => route.fulfill({ json: { ok: true, products: [product] } }))
  await page.route('**/api/admin/product-media', route => {
    uploads.push(route.request().headers())
    return route.fulfill({ json: { ok: true, media: { publicUrl: primary, objectPath: actor + '/product-media/test.png' } } })
  })
  await page.route('**/api/admin/product-media/assign', route => {
    const request = route.request()
    assignments.push({ body: request.postDataJSON(), key: request.headers()['x-k2-idempotency-key'], actor: request.headers()['x-k2-actor-id'] })
    product = { ...product, primary_image_url: primary }
    if (lost && assignments.length === 1) return route.abort('failed')
    return route.fulfill({ json: { ok: true } })
  })
  await page.goto('/tests/fixtures/payment-harness.html?csv=1')
  await page.getByRole('button', { name: 'Open catalog CSV review' }).click()
  await page.getByRole('button', { name: 'Upload photo files by CSV' }).click()
  await page.getByLabel('Photo mapping CSV', { exact: true }).setInputFiles(csvFile)
  await page.getByLabel('Photo files', { exact: true }).setInputFiles({ name: 'pasta.png', mimeType: 'image/png', buffer: image })
  await page.getByRole('button', { name: 'Review photo assignments' }).click()
  await expect(page.getByRole('list', { name: 'Photo assignments' })).toContainText('K2-PASTA')
  await page.getByLabel('Photo batch reason', { exact: true }).fill('Reviewed native cover for existing Draft')
  await page.getByRole('checkbox', { name: /I reviewed every SKU/ }).check()
  return { assignments, uploads, switchActor: () => { currentActor = '22222222-2222-4222-8222-222222222222' } }
}

for (const width of [375, 1440]) test(`photo CSV previews and saves missing slot at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const { assignments, uploads } = await setup(page)
  await expect(page.getByRole('img', { name: 'Primary', exact: true })).toBeVisible()
  await page.screenshot({ path: `docs/design-checkpoints/20261017-photo-csv/review-${width}.png` })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Upload and assign 1 product', exact: true }).click()
  await expect(page.getByText(/1 of 1 products verified/)).toBeVisible()
  expect(uploads).toHaveLength(1); expect(assignments).toHaveLength(1)
  expect(assignments[0].actor).toBe(actor)
  expect(assignments[0].body.lifestyle).toEqual([{ url: initial.lifestyle_images[0], objectPath: null }])
  await page.getByRole('button', { name: 'Acknowledge completed batch' }).click()
  await expect(page.getByRole('button', { name: 'Review photo assignments' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('k2-photo-csv-v1'))).toBeNull()
})

test('photo CSV lost reply restores original command across reload without repeat upload', async ({ page }) => {
  const { assignments, uploads } = await setup(page, true)
  await page.getByRole('button', { name: 'Upload and assign 1 product', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Retry the same saved command')
  await page.reload()
  await page.getByRole('button', { name: 'Open catalog CSV review' }).click()
  await page.getByRole('button', { name: 'Upload photo files by CSV' }).click()
  await expect(page.getByLabel('Photo batch reason')).toBeDisabled()
  await page.getByRole('button', { name: 'Continue saved photo batch' }).click()
  await expect(page.getByText(/1 of 1 products verified/)).toBeVisible()
  expect(uploads).toHaveLength(1)
  expect(assignments[1]).toEqual(assignments[0])
})

test('photo CSV changed actor stops before any file upload', async ({ page }) => {
  const state = await setup(page)
  state.switchActor()
  await page.getByRole('button', { name: 'Upload and assign 1 product', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('staff account changed')
  expect(state.uploads).toHaveLength(0); expect(state.assignments).toHaveLength(0)
})

test('competing tab lock refuses dispatch, then the same reviewed batch can proceed', async ({ page, context }) => {
  const { uploads, assignments } = await setup(page)
  const other = await context.newPage()
  await other.goto('/tests/fixtures/payment-harness.html?csv=1')
  await other.evaluate(async () => {
    let ready
    const acquired = new Promise(resolve => { ready = resolve })
    const held = new Promise(resolve => { window.releasePhotoLock = resolve })
    window.photoLockPromise = navigator.locks.request('k2-photo-csv-writer', async () => { ready(); await held })
    await acquired
  })
  await page.getByRole('button', { name: 'Upload and assign 1 product', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Another tab is uploading')
  expect(uploads).toHaveLength(0); expect(assignments).toHaveLength(0)
  await other.evaluate(async () => { window.releasePhotoLock(); await window.photoLockPromise })
  await page.getByRole('button', { name: 'Upload and assign 1 product', exact: true }).click()
  await expect(page.getByText(/1 of 1 products verified/)).toBeVisible()
  expect(uploads).toHaveLength(1); expect(assignments).toHaveLength(1)
  await other.close()
})
