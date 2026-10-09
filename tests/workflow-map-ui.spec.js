import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort())
  await page.goto('/tests/fixtures/workflow-map-harness.html')
})

test('map opens at reading scale with a focused workflow', async ({ page }) => {
  const canvas = page.getByRole('region', { name: 'Connected operations workflow canvas' })
  await expect(canvas.getByText('100%', { exact: true })).toBeVisible()
  expect(await canvas.locator('[data-node-id]').count()).toBe(8)
  const title = canvas.locator('[data-node-id="cb_1"] strong')
  expect(await title.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px')
})

test('filters show readable matches instead of dimming words', async ({ page }) => {
  const canvas = page.getByRole('region', { name: 'Connected operations workflow canvas' })
  await canvas.getByRole('button', { name: 'Actions', exact: true }).click()
  const nodes = canvas.locator('[data-node-id]')
  expect(await nodes.count()).toBe(3)
  expect(await nodes.evaluateAll(els => els.every(el => getComputedStyle(el).opacity === '1'))).toBe(true)
})

test('search results select and bring a distant step into the viewport', async ({ page }) => {
  await page.getByPlaceholder('Search steps, barcodes, roles...').fill('Website')
  const results = page.getByRole('region', { name: 'Matching workflow steps' })
  await expect(results).toBeVisible()
  await results.getByRole('button', { name: /Review product and Website eligibility/i }).click()
  const selected = page.locator('[data-node-id="np_6"]')
  await expect(selected).toHaveAttribute('aria-pressed', 'true')
  const viewport = page.getByRole('region', { name: 'Pan and zoom workflow map' })
  const [nodeBox, viewportBox] = await Promise.all([selected.boundingBox(), viewport.boundingBox()])
  expect(nodeBox.x).toBeGreaterThanOrEqual(viewportBox.x)
  expect(nodeBox.x + nodeBox.width).toBeLessThanOrEqual(viewportBox.x + viewportBox.width)
  await expect(page.getByRole('region', { name: 'Selected step details' })).toContainText('Prepared')
})

test('full map scrolls, keyboard pans and reset restores reading size', async ({ page }) => {
  await page.getByRole('button', { name: 'Full map', exact: true }).click()
  expect(await page.locator('[data-node-id]').count()).toBe(49)
  const viewport = page.getByRole('region', { name: 'Pan and zoom workflow map' })
  await viewport.focus()
  await page.keyboard.press('ArrowRight')
  expect(await viewport.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page.getByRole('button', { name: 'Reset view', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Connected operations workflow canvas' })).toContainText('100%')
})

test('keyboard search selection keeps focus on the selected map step', async ({ page }) => {
  await page.getByPlaceholder('Search steps, barcodes, roles...').fill('Website')
  const result = page.getByRole('region', { name: 'Matching workflow steps' }).getByRole('button', { name: /Review product and Website eligibility/i })
  await result.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-node-id="np_6"]')).toBeFocused()
})

test('background drag pans without selecting a step', async ({ page }) => {
  await page.getByRole('button', { name: 'Full map', exact: true }).click()
  const viewport = page.getByRole('region', { name: 'Pan and zoom workflow map' })
  const box = await viewport.boundingBox()
  const before = await viewport.evaluate(el => el.scrollLeft)
  const selected = await page.locator('[data-node-id][aria-pressed="true"]').getAttribute('data-node-id')
  await page.mouse.move(box.x + 250, box.y + 8)
  await page.mouse.down()
  await page.mouse.move(box.x + 100, box.y + 8, { steps: 5 })
  await page.mouse.up()
  expect(await viewport.evaluate(el => el.scrollLeft)).toBeGreaterThan(before)
  expect(await page.locator('[data-node-id][aria-pressed="true"]').getAttribute('data-node-id')).toBe(selected)
})

test('search focus stays in its own guide when two maps are mounted', async ({ page }) => {
  await page.goto('/tests/fixtures/workflow-map-harness.html?dual')
  await page.getByRole('button', { name: 'Full map', exact: true }).first().click()
  const second = page.locator('[aria-label="Second workflow guide"]')
  await second.getByPlaceholder('Search steps, barcodes, roles...').fill('Website')
  await second.getByRole('region', { name: 'Matching workflow steps' }).getByRole('button', { name: /Review product and Website eligibility/i }).focus()
  await page.keyboard.press('Enter')
  await expect(second.locator('[data-node-id="np_6"]')).toBeFocused()
})

test('empty search recovers and selected details retain the full text', async ({ page }) => {
  const search = page.getByPlaceholder('Search steps, barcodes, roles...')
  await search.fill('not-a-real-workflow-step')
  await expect(page.getByRole('region', { name: 'Matching workflow steps' })).toContainText('Found 0')
  await page.getByRole('button', { name: 'Show All Steps', exact: true }).click()
  await expect(page.locator('[data-node-id="cb_1"]')).toBeVisible()
  await search.fill('per-shop')
  await page.getByRole('region', { name: 'Matching workflow steps' }).getByRole('button', { name: /Verify eligible stock and per-shop offers/i }).click()
  await expect(page.getByRole('region', { name: 'Selected step details' })).toContainText('read-only')
  await page.getByRole('region', { name: 'Connected operations workflow canvas' }).screenshot({ path: 'docs/evidence/20261002-workflow-map/map-desktop.png' })
})

test('phone exploration has readable details and no document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByRole('button', { name: 'This workflow', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('region', { name: 'Connected operations workflow canvas' }).screenshot({ path: 'docs/evidence/20261002-workflow-map/map-phone.png' })
})

test('phone role filter fits wider native control text and remains usable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.addStyleTag({ content: '.workflow-map { font-family: Arial !important; } .workflow-map select { font-size: 18px !important; }' })
  const roles = page.getByRole('combobox', { name: 'Staff Role:' })
  await roles.selectOption('Inventory Manager / Owner')
  await expect(roles).toHaveValue('Inventory Manager / Owner')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('enlarged text retains full instructions and landscape stays contained', async ({ page }) => {
  await page.setViewportSize({ width: 812, height: 375 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  await expect(page.getByRole('region', { name: 'Selected step details' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('region', { name: 'Selected step details' }).screenshot({ path: 'docs/evidence/20261002-workflow-map/details-large-text.png' })
})
