import { test, expect } from '@playwright/test'
import fs from 'node:fs'

const id = '22222222-2222-4222-8222-222222222222'
const catalog = ['a', 'b', 'c', 'ordinary'].map((sku, index) => ({
  id: `33333333-3333-4333-8333-${String(index + 1).padStart(12, '0')}`, sku, name: `Coffee ${sku}`,
  published: true, status: 'Live', srp: 200 + index * 100, wholesale_price: 150 + index * 100,
  categories: { id: id, name: 'Coffee' }, brands: { name: 'Fixture roaster' },
  brand_id: id, category_id: id, primary_image_url: '/images/placeholder.svg',
  description: `Synthetic description for ${sku}.`, allergens: sku === 'b' ? 'Milk' : 'None declared in this synthetic fixture',
}))
const options = [
  { Flavour: 'Classic', Weight: '250 g', Pack: 'Bag' },
  { Flavour: 'Classic', Weight: '500 g', Pack: 'Bag' },
  { Flavour: 'Vanilla', Weight: '250 g', Pack: 'Bag' },
]
const rows = options.map((value, i) => ({ family_id: id, family_name: 'Coffee Blend', axes: ['Flavour', 'Weight', 'Pack'], sku: catalog[i].sku, options: value }))

async function fixture(page, { familyRows = rows, products = catalog, groupingAvailable = true, websiteSkus = products.map(p => p.sku) } = {}) {
  await page.route('**/rest/v1/**', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop()
    if (name === 'products') return route.fulfill({ json: products })
    if (name === 'v_storefront_visible_skus') return route.fulfill({ json: websiteSkus.map(sku => ({ sku })) })
    if (name === 'v_product_stock_from_batches') return route.fulfill({ json: products.map(p => ({ sku: p.sku, stock_from_batches: p.sku === 'c' ? 0 : 3 })) })
    if (name === 'read_storefront_product_families_v1') return groupingAvailable ? route.fulfill({ json: familyRows }) : route.fulfill({ status: 404, json: { message: 'function missing' } })
    return route.fulfill({ json: [] })
  })
  await page.route('https://fonts.**/*', route => route.abort())
}

test('other-channel variants do not contribute public choices even in a malformed grouping response', async ({ page }) => {
  await fixture(page, { websiteSkus: ['a', 'b'] })
  await page.goto('/product/a')
  await expect(page.getByRole('group', { name: 'Weight', exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Flavour', exact: true })).toHaveCount(0)
})

test('a large real option set uses one compact native select', async ({ page }) => {
  const products = Array.from({ length: 7 }, (_, i) => ({ ...catalog[0], sku: `pack-${i}`, name: `Coffee pack ${i}` }))
  const familyRows = products.map((product, i) => ({ family_id: id, family_name: 'Coffee', axes: ['Pack size'], sku: product.sku, options: { 'Pack size': `${i + 1} bags` } }))
  await fixture(page, { products, familyRows })
  await page.goto('/product/pack-0')
  await expect(page.getByRole('combobox', { name: 'Pack size' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Pack size' }).selectOption('7 bags')
  await expect(page).toHaveURL(/\/product\/pack-6/)
  await expect(page.getByRole('region', { name: 'Product options' }).getByRole('button')).toHaveCount(0)
})

test('a slow optional grouping read does not block SKU price and availability', async ({ page }) => {
  await fixture(page)
  let release
  const held = new Promise(resolve => { release = resolve })
  await page.route('**/rest/v1/rpc/read_storefront_product_families_v1', async route => { await held; await route.fulfill({ json: rows }) })
  await page.goto('/product/a')
  await expect(page.getByRole('button', { name: 'Add to cart · ₱200' })).toBeEnabled({ timeout: 2000 })
  release()
  await expect(page.getByRole('region', { name: 'Product options' })).toBeVisible()
})

test('existing Montegrappa listings demonstrate Flavour only without invented weight options', async ({ page }) => {
  // 21 October listing receipts establish these names, copy and displayed price.
  // Grouping is proposed/local only; availability is intentionally unknown here.
  const products = [
    { ...catalog[0], sku: 'K2-SKU-001131', name: 'Montegrappa Tortellini Carne', srp: 274, wholesale_price: null, categories: { name: 'Pasta' },
      primary_image_url: '/outputs/product-media-20261016/assets/K2-SKU-001131/primary-recovery-20261019-v1.png', allergens: null,
      description: 'Montegrappa Tortellini Carne are dry filled egg pasta with a meat filling. Check the package for ingredients, allergens and cooking directions.' },
    { ...catalog[1], sku: 'K2-SKU-001132', name: 'Montegrappa Tortellini Prosciutto', srp: 274, wholesale_price: null, categories: { name: 'Pasta' },
      primary_image_url: '/outputs/product-media-20261016/assets/K2-SKU-001132/primary-recovery-20261019-v1.png', allergens: null,
      description: 'Montegrappa Prosciutto tortellini are dry filled egg pasta with a prosciutto crudo filling. Check the package for ingredients, allergens and cooking directions.' },
  ]
  const familyRows = products.map((product, i) => ({ family_id: id, family_name: 'Montegrappa Tortellini', axes: ['Flavour'], sku: product.sku, options: { Flavour: i === 0 ? 'Carne' : 'Prosciutto' } }))
  await fixture(page, { products, familyRows })
  await page.route('**/rest/v1/v_product_stock_from_batches*', route => route.fulfill({ json: products.map(p => ({ sku: p.sku, stock_from_batches: null })) }))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/product/K2-SKU-001131?example=montegrappa')
  await expect(page.getByRole('group', { name: 'Flavour', exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Weight', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Prosciutto', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Montegrappa Tortellini Prosciutto', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Stock check pending', exact: true })).toBeDisabled()
  fs.mkdirSync('docs/design-checkpoints/20261021-product-families', { recursive: true })
  await page.getByRole('region', { name: 'Product options' }).screenshot({ path: 'docs/design-checkpoints/20261021-product-families/montegrappa-flavour-example.png' })
  await page.screenshot({ path: 'docs/design-checkpoints/20261021-product-families/montegrappa-example-desktop.png', fullPage: false })
})

test('one mother card keeps complete choices after an exact-variant search', async ({ page }) => {
  await fixture(page)
  await page.goto('/catalog')
  await expect(page.getByTestId('product-card')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Choose options' })).toHaveCount(1)
  await page.getByPlaceholder(/Search/i).first().fill('Coffee b')
  await page.getByRole('button', { name: 'Choose options' }).click()
  await expect(page).toHaveURL(/\/product\/b/)
  await expect(page.getByRole('group', { name: 'Flavour' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Weight' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Pack', exact: true })).toHaveCount(0)
})

for (const query of ['b', '500 g']) test(`SKU and option searches open their matching family member: ${query}`, async ({ page }) => {
  await fixture(page)
  await page.goto('/catalog')
  await page.getByPlaceholder(/Search/i).first().fill(query)
  await page.getByRole('button', { name: 'Choose options' }).click()
  await expect(page).toHaveURL(/\/product\/b/)
  await expect(page.getByRole('group', { name: 'Weight' })).toBeVisible()
  await expect(page.getByRole('button', { name: '250 g', exact: true })).toBeVisible()
})

test('size selection updates exact SKU facts and retains scroll and keyboard focus', async ({ page }) => {
  await fixture(page)
  await page.goto('/product/a')
  const weight = page.getByRole('group', { name: 'Weight', exact: true })
  const size = weight.getByRole('button', { name: '500 g', exact: true })
  await expect(size).toBeVisible()
  await size.focus()
  const before = await page.evaluate(() => window.scrollY)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Coffee b', exact: true })).toBeVisible()
  await expect(size).toBeFocused()
  expect(Math.abs(await page.evaluate(() => window.scrollY) - before)).toBeLessThan(8)
  await expect(page.getByRole('button', { name: 'Add to cart · ₱300' })).toBeEnabled()
  await expect(page.getByRole('alert')).toContainText('Milk')
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Coffee a', exact: true })).toBeVisible()
})

test('sparse choices explicitly label a flavour change and respect selected sold-out stock', async ({ page }) => {
  await fixture(page)
  await page.goto('/product/c')
  await expect(page.getByRole('button', { name: 'Request via Pasabuy', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Add to cart/ })).toHaveCount(0)
  await page.getByRole('group', { name: 'Weight' }).getByRole('button', { name: '500 g · Classic', exact: true }).click()
  await expect(page).toHaveURL(/\/product\/b/)
  await expect(page.getByRole('button', { name: 'Add to cart · ₱300' })).toBeEnabled()
})

test('unused selectors stay absent; a real additional type appears', async ({ page }) => {
  await fixture(page, { familyRows: rows.map((row, i) => ({ ...row, options: { ...row.options, Pack: i === 2 ? 'Box' : 'Bag' } })) })
  await page.goto('/product/a')
  await expect(page.getByRole('group', { name: 'Pack', exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Colour', exact: true })).toHaveCount(0)
  await page.goto('/product/ordinary')
  await expect(page.getByRole('heading', { name: 'Coffee ordinary', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Product options' })).toHaveCount(0)
})

test('a single-value family dimension stays visible as a product detail', async ({ page }) => {
  await fixture(page)
  await page.goto('/product/a')
  await expect(page.locator('[aria-label="Shared product details"]')).toContainText('Pack')
  await expect(page.locator('[aria-label="Shared product details"]')).toContainText('Bag')
  await expect(page.getByRole('group', { name: 'Pack', exact: true })).toHaveCount(0)
})

test('a single eligible member has no selectors and missing grouping falls back to separate SKUs', async ({ page }) => {
  await fixture(page, { products: catalog.slice(0, 1) })
  await page.goto('/product/a')
  await expect(page.getByRole('heading', { name: 'Coffee a', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Product options' })).toHaveCount(0)
  const facts = page.locator('[aria-label="Shared product details"]')
  await expect(facts).toContainText('Flavour')
  await expect(facts).toContainText('Classic')
  await expect(facts).toContainText('Weight')
  await expect(facts).toContainText('250 g')
  await expect(facts).toContainText('Pack')
  await expect(facts).toContainText('Bag')
  await page.unrouteAll({ behavior: 'wait' })
  await fixture(page, { groupingAvailable: false })
  await page.goto('/catalog')
  await expect(page.getByTestId('product-card')).toHaveCount(4)
})

for (const width of [375, 1440]) test(`compact options fit ${width}px and preserve SKU-specific basket lines`, async ({ page }) => {
  await fixture(page)
  await page.setViewportSize({ width, height: 1000 })
  await page.goto('/product/a')
  await page.getByRole('button', { name: 'Add to cart · ₱200' }).click()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('group', { name: 'Weight' }).getByRole('button', { name: '500 g', exact: true }).click()
  await page.getByRole('button', { name: 'Add to cart · ₱300' }).click()
  await expect(page.getByText('Classic · 250 g · Bag · a', { exact: true })).toBeVisible()
  await expect(page.getByText('Classic · 500 g · Bag · b', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  const region = page.getByRole('region', { name: 'Product options' })
  for (const button of await region.getByRole('button').all()) {
    const box = await button.boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(44)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  fs.mkdirSync('docs/design-checkpoints/20261021-product-families', { recursive: true })
  await region.screenshot({ path: `docs/design-checkpoints/20261021-product-families/options-${width}.png` })
})

const actor = '11111111-1111-4111-8111-111111111111'
async function adminFixture(page, write, read = () => ({ family: null, products: catalog.slice(0, 2) })) {
  await page.context().addCookies([{ name: 'k2_admin_csrf', value: 'synthetic-family-csrf', url: 'http://127.0.0.1:5219' }])
  await page.route('**/api/admin/session', route => route.fulfill({ json: { ok: true, user: { userId: actor, role: 'Admin' } } }))
  await page.route('**/api/admin/products', route => route.fulfill({ json: { ok: true, products: catalog.slice(0, 2) } }))
  await page.route('**/api/admin/lots*', route => route.fulfill({ json: { ok: true, data: { lots: [], derivedStock: {}, complete: true } } }))
  await page.route('**/api/admin/product-families*', route => {
    if (route.request().method() === 'POST') return write(route)
    const url = new URL(route.request().url())
    if (!url.searchParams.get('familyId') && !url.searchParams.get('skus')) return route.fulfill({ status: 400, json: { error: { code: 'FAMILY_INVALID' } } })
    const result = read(route)
    const withState = row => ({ ...row, status: row.status || 'Live', websiteStatus: row.websiteStatus || 'Assigned · published' })
    return route.fulfill({ json: { ok: true, ...result,
      family: result.family ? { ...result.family, members: result.family.members.map(withState) } : null,
      products: result.products.map(withState),
    } })
  })
  await page.goto('/tests/fixtures/product-families.html?surface=admin')
}
async function newFamily(page) {
  await page.getByRole('checkbox', { name: /Select visible/ }).check()
  await page.getByRole('button', { name: 'Manage variations', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Product variations', exact: true })
  await dialog.getByLabel('Mother product name', { exact: true }).fill('Coffee Blend')
  await dialog.getByLabel('Variation type', { exact: true }).fill('Weight')
  await dialog.getByRole('button', { name: 'Add type', exact: true }).click()
  await dialog.getByLabel('Weight for a', { exact: true }).fill('250 g')
  await dialog.getByLabel('Weight for b', { exact: true }).fill('500 g')
  return dialog
}

test('Admin asks before discarding an unsaved variation draft from Close or Escape', async ({ page }) => {
  await adminFixture(page, route => route.fulfill({ json: { ok: true, result: { familyId: id, version: 1, memberCount: 2 } } }))
  const dialog = await newFamily(page)
  await dialog.getByLabel('Mother product name', { exact: true }).fill('Unsaved mother name')
  let closeMessage = ''
  page.once('dialog', async confirm => { closeMessage = confirm.message(); await confirm.dismiss() })
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  expect(closeMessage).toContain('Discard your unsaved product variation edits')
  await expect(dialog).toBeVisible()
  let escapeMessage = ''
  page.once('dialog', async confirm => { escapeMessage = confirm.message(); await confirm.accept() })
  await page.keyboard.press('Escape')
  expect(escapeMessage).toContain('Discard your unsaved product variation edits')
  await expect(dialog).toHaveCount(0)
})

test('Admin shows each family member’s current Live and Website status', async ({ page }) => {
  const family = { id, version: 2, name: 'Coffee Blend', axes: ['Weight'], taxonomyConsistent: true,
    members: [
      { sku: 'a', name: 'Coffee a', options: { Weight: '250 g' }, status: 'Active', websiteStatus: 'Assigned · published' },
      { sku: 'b', name: 'Coffee b', options: { Weight: '500 g' }, status: 'Draft', websiteStatus: 'Not assigned' },
    ] }
  await adminFixture(page, route => route.fulfill({ json: { ok: true, result: { familyId: id, version: 3, memberCount: 2 } } }), () => ({ family, products: catalog.slice(0, 2) }))
  await page.getByRole('checkbox', { name: /Select visible/ }).check()
  await page.getByRole('button', { name: 'Manage variations', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Product variations', exact: true })
  await expect(dialog.getByText('Live · Website Assigned · published')).toBeVisible()
  await expect(dialog.getByText('Draft · Website Not assigned')).toBeVisible()
})

test('Admin preserves selected new members’ lifecycle and Website labels', async ({ page }) => {
  await adminFixture(page, route => route.fulfill({ json: { ok: true } }), () => ({ family: null, products: [
    { ...catalog[0], status: 'Active', websiteStatus: 'Assigned · published' },
    { ...catalog[1], status: 'Draft', websiteStatus: 'Not assigned' },
  ] }))
  await page.getByRole('checkbox', { name: /Select visible/ }).check()
  await page.getByRole('button', { name: 'Manage variations', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Product variations', exact: true })
  await expect(dialog.getByText('Live · Website Assigned · published')).toBeVisible()
  await expect(dialog.getByText('Draft · Website Not assigned')).toBeVisible()
})

test('Admin confirms ungroup before saving an empty family membership', async ({ page }) => {
  const writes = []
  const family = { id, version: 2, name: 'Coffee Blend', axes: ['Weight'], taxonomyConsistent: true,
    members: [
      { sku: 'a', name: 'Coffee a', options: { Weight: '250 g' } },
      { sku: 'b', name: 'Coffee b', options: { Weight: '500 g' } },
    ] }
  await adminFixture(page, route => {
    writes.push(route.request().postDataJSON())
    return route.fulfill({ json: { ok: true, result: { familyId: id, version: 3, memberCount: 0 } } })
  }, () => ({ family, products: catalog.slice(0, 2) }))
  await page.getByRole('checkbox', { name: /Select visible/ }).check()
  await page.getByRole('button', { name: 'Manage variations', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Product variations', exact: true })
  let message = ''
  page.once('dialog', async confirm => { message = confirm.message(); await confirm.dismiss() })
  await dialog.getByRole('button', { name: 'Ungroup all members', exact: true }).click()
  expect(message).toContain('Remove this grouping for 2 SKUs')
  expect(writes).toHaveLength(0)
  let acceptedMessage = ''
  page.once('dialog', async confirm => { acceptedMessage = confirm.message(); await confirm.accept() })
  await dialog.getByRole('button', { name: 'Ungroup all members', exact: true }).click()
  expect(acceptedMessage).toContain('Product facts, prices, stock and order history stay with each SKU')
  await expect(dialog).toHaveCount(0)
  expect(writes).toHaveLength(1)
  expect(writes[0]).toMatchObject({ familyId: id, expectedVersion: 2, name: 'Coffee Blend', axes: [], members: [] })
})

test('Admin saves only explicit dimensions and existing SKU membership with no typed audit reason', async ({ page }) => {
  const writes = []
  await adminFixture(page, route => {
    const body = route.request().postDataJSON(); writes.push(body)
    return route.fulfill({ json: { ok: true, result: { familyId: body.familyId, version: 1, memberCount: 2 } } })
  })
  const dialog = await newFamily(page)
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    fs.mkdirSync('docs/design-checkpoints/20261021-product-families', { recursive: true })
    await dialog.screenshot({ path: `docs/design-checkpoints/20261021-product-families/admin-${width}.png` })
  }
  await expect(dialog.getByLabel(/Reason/)).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Save variations', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(writes).toHaveLength(1)
  expect(writes[0].axes).toEqual(['Weight'])
  expect(writes[0].members).toEqual([{ sku: 'a', options: { Weight: '250 g' } }, { sku: 'b', options: { Weight: '500 g' } }])
})

test('stale saved grouping after reload opens complete fresh membership before a new decision', async ({ page }) => {
  const body = { familyId: id, expectedVersion: 1, name: 'Old mother name', axes: ['Weight'], members: [{ sku: 'a', options: { Weight: '250 g' } }] }
  await page.addInitScript(({ actor, body }) => localStorage.setItem(`k2-product-family-pending-v1:${actor}`, JSON.stringify({ actorId: actor, key: actor, payloadText: JSON.stringify(body), state: 'pending' })), { actor, body })
  const family = { id, version: 2, name: 'Latest mother name', axes: ['Weight'], taxonomyConsistent: true,
    members: [{ sku: 'a', name: 'Coffee a', options: { Weight: '250 g' } }, { sku: 'b', name: 'Coffee b', options: { Weight: '500 g' } }] }
  await adminFixture(page, route => route.fulfill({ status: 409, json: { error: { code: 'FAMILY_VERSION_CONFLICT' } } }), () => ({ family, products: catalog.slice(0, 1) }))
  await page.getByRole('button', { name: 'Review pending product variations', exact: true }).click()
  await page.getByRole('button', { name: 'Retry saved variations', exact: true }).click()
  await page.getByRole('button', { name: 'Review latest grouping', exact: true }).click()
  await expect(page.getByLabel('Mother product name', { exact: true })).toHaveValue('Latest mother name')
  await expect(page.getByLabel('Weight for b', { exact: true })).toHaveValue('500 g')
  await expect(page.getByRole('button', { name: 'Save variations', exact: true })).toBeEnabled()
})

test('a first-save version conflict retains its request until complete latest membership is reviewed', async ({ page }) => {
  const writes = []
  let reads = 0
  const family = { id, version: 1, name: 'Original mother', axes: ['Weight'], taxonomyConsistent: true,
    members: [{ sku: 'a', name: 'Coffee a', options: { Weight: '250 g' } }, { sku: 'b', name: 'Coffee b', options: { Weight: '500 g' } }] }
  await adminFixture(page, route => {
    const body = route.request().postDataJSON(), headers = route.request().headers()
    writes.push({ text: route.request().postData(), actor: headers['x-k2-actor-id'], key: headers['x-k2-idempotency-key'] })
    return body.expectedVersion === 1
      ? route.fulfill({ status: 409, json: { error: { code: 'FAMILY_VERSION_CONFLICT' } } })
      : route.fulfill({ json: { ok: true, result: { familyId: id, version: 3, memberCount: 3 } } })
  }, () => {
    reads++
    return { family: reads === 1 ? family : { ...family, version: 2, name: 'Latest mother',
      members: [...family.members, { sku: 'c', name: 'Coffee c', options: { Weight: '750 g' } }] }, products: catalog.slice(0, 2) }
  })
  await page.getByRole('checkbox', { name: /Select visible/ }).check()
  await page.getByRole('button', { name: 'Manage variations', exact: true }).click()
  await page.getByLabel('Mother product name', { exact: true }).fill('Unsaved local mother')
  await page.getByRole('button', { name: 'Save variations', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Retry saved variations', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save variations', exact: true })).toHaveCount(0)
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    const dialog = page.getByRole('dialog', { name: 'Product variations', exact: true })
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await dialog.screenshot({ path: `docs/acceptance/product-families-review-20261021/conflict-${width}.png` })
  }
  await page.getByRole('button', { name: 'Retry saved variations', exact: true }).click()
  await page.getByRole('button', { name: 'Review latest grouping', exact: true }).click()
  await expect(page.getByLabel('Mother product name', { exact: true })).toHaveValue('Latest mother')
  await expect(page.getByLabel('Weight for c', { exact: true })).toHaveValue('750 g')
  expect(reads).toBe(2)
  expect(writes).toHaveLength(3)
  expect(writes[1]).toEqual(writes[0])
  expect(writes[2]).toEqual(writes[0])
  await page.getByRole('button', { name: 'Save variations', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Product variations' })).toHaveCount(0)
  expect(JSON.parse(writes[3].text).expectedVersion).toBe(2)
  expect(JSON.parse(writes[3].text).members).toHaveLength(3)
  expect(writes[3].key).not.toBe(writes[0].key)
})

test('version-conflict recovery can review an ungrouped mother product and restore pending SKU candidates', async ({ page }) => {
  const body = { familyId: id, expectedVersion: 1, name: 'Old mother', axes: ['Weight'], members: [
    { sku: 'a', options: { Weight: '250 g' } }, { sku: 'b', options: { Weight: '500 g' } },
  ] }
  await page.addInitScript(({ actor, body }) => localStorage.setItem(`k2-product-family-pending-v1:${actor}`, JSON.stringify({ actorId: actor, key: actor, payloadText: JSON.stringify(body), state: 'pending' })), { actor, body })
  const writes = []
  const readQueries = []
  const currentFamily = { id, version: 2, name: 'Coffee Blend', axes: [], taxonomyConsistent: true, members: [] }
  await adminFixture(page, route => {
    writes.push(route.request().postDataJSON())
    return route.fulfill({ status: 409, json: { error: { code: 'FAMILY_VERSION_CONFLICT' } } })
  }, route => {
    readQueries.push(new URL(route.request().url()).searchParams.get('skus'))
    return { family: currentFamily, products: catalog.slice(0, 2) }
  })
  await page.getByRole('button', { name: 'Review pending product variations', exact: true }).click()
  await page.getByRole('button', { name: 'Retry saved variations', exact: true }).click()
  await page.getByRole('button', { name: 'Review latest grouping', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Product variations', exact: true })
  await expect(dialog.getByLabel('Mother product name', { exact: true })).toHaveValue('Coffee Blend')
  await expect(dialog.getByLabel('Variation type', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Coffee a', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Coffee b', { exact: true })).toBeVisible()
  expect(readQueries).toEqual(['a,b'])
  expect(writes).toHaveLength(2)
  expect(writes[1]).toEqual(writes[0])
})

test('Admin lost reply survives reload and retries the exact original actor, body and key', async ({ page }) => {
  const writes = []
  await adminFixture(page, route => {
    const headers = route.request().headers(), body = route.request().postDataJSON()
    writes.push({ body: route.request().postData(), actor: headers['x-k2-actor-id'], key: headers['x-k2-idempotency-key'] })
    return writes.length === 1 ? route.abort() : route.fulfill({ json: { ok: true, result: { familyId: body.familyId, version: 1, memberCount: 2 } } })
  })
  const dialog = await newFamily(page)
  await dialog.getByRole('button', { name: 'Save variations', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Retry saved variations', exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Review pending product variations', exact: true }).click()
  await page.getByRole('button', { name: 'Retry saved variations', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Product variations' })).toHaveCount(0)
  expect(writes).toHaveLength(2)
  expect(writes[1]).toEqual(writes[0])
  expect(writes[0].actor).toBe(actor)
})


for (const { width, theme, size } of [
  { width: 375, theme: 'light', size: '1 L bottle' },
  { width: 1440, theme: 'dark', size: '1 L bottle' },
  { width: 375, theme: 'dark', size: '750 ml bottle' },
  { width: 1440, theme: 'light', size: '750 ml bottle' },
]) {
  test(`recorded pack size remains visible without invented gram weight at ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 })
    await fixture(page, { familyRows: [], products: [{ ...catalog[3], sku: 'recorded-volume', name: 'Recorded volume fixture', size, package_type: 'Bottle', net_weight: null }] })
    await page.goto('/product/recorded-volume')
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme)
    await expect(page.getByRole('term').filter({ hasText: /^Pack size$/ })).toBeVisible()
    await expect(page.getByRole('definition').filter({ hasText: new RegExp('^' + size + '$') })).toBeVisible()
    await expect(page.getByText('Net Weight', { exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByText('Pack size', { exact: true }).scrollIntoViewIfNeeded()
    fs.mkdirSync('docs/design-checkpoints/20261023-pack-size', { recursive: true })
    await page.screenshot({ path: `docs/design-checkpoints/20261023-pack-size/${width}-${theme}.png` })
  })
}
