import { test, expect } from '@playwright/test'
import sharp from 'sharp'
import { PRODUCT_RESEARCH_TEMPLATE } from '../src/views/admin/productResearchContract.js'

test('an incomplete resume read never authorizes a new intake session', async ({ page }) => {
  let reads = 0
  let creates = 0
  const session = { id: 'e74a4161-72ca-4d72-8f59-37aa690e1869', checklist_step: 'identify', scanned_identity: 'Existing fixture session', packaging_images: [], field_decisions: {}, draft_payload: {} }
  await page.route('**/api/admin/product-intake/session*', async route => {
    if (route.request().method() === 'POST') {
      creates++
      return route.fulfill({ json: { ok: true, result: { sessionId: session.id } } })
    }
    reads++
    return route.fulfill({ json: { ok: true, data: reads === 1 ? {} : { session } } })
  })
  await page.goto('/tests/fixtures/intake-ai-harness.html?modal')
  await expect.poll(() => reads, { timeout: 90000 }).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: 'Retry session setup', exact: true })).toBeVisible()
  expect(creates).toBe(0)
  await page.getByRole('button', { name: 'Retry session setup', exact: true }).click()
  await expect(page.getByLabel('Product barcode, SKU, or name')).toHaveValue('Existing fixture session')
  expect(creates).toBe(0)
})

for (const failure of ['response loss', 'refresh failure', 'incomplete receipt', 'stale record']) {
  test(`packaging evidence retains exact file bytes and command identity after ${failure}`, async ({ page }) => {
    const session = { id: 'e74a4161-72ca-4d72-8f59-37aa690e1869', request_id: 'c32fcf68-b8fd-45cf-bc56-ac461349ba23', checklist_step: 'packaging_evidence', scanned_identity: 'Fixture Pasta', packaging_images: [], field_decisions: {}, draft_payload: {} }
    const bytes = await sharp({ create: { width: 256, height: 256, channels: 3, background: '#ccc' } }).png().toBuffer()
    const calls = []
    await page.route('**/api/admin/product-intake/**', async route => {
      const request = route.request()
      const path = new URL(request.url()).pathname.split('/').at(-1)
      if (path === 'session') {
        if (failure === 'refresh failure' && calls.length === 1) return route.fulfill({ status: 503, json: { error: { code: 'ADMIN_SERVICE_UNAVAILABLE' } } })
        return route.fulfill({ json: { ok: true, data: { session } } })
      }
      if (path === 'evidence') {
        calls.push({ bytes: request.postDataBuffer().toString('base64'), key: request.headers()['x-k2-idempotency-key'], slot: request.headers()['x-k2-evidence-slot'], session: request.headers()['x-k2-intake-session'], name: request.headers()['x-k2-file-name'] })
        if (failure === 'response loss' && calls.length === 1) return route.abort('failed')
        if (failure === 'incomplete receipt' && calls.length === 1) return route.fulfill({ json: { ok: true, result: {} } })
        session.packaging_images = [{ slot: 'PRIMARY', path: failure === 'stale record' && calls.length === 1 ? 'fixture/previous.png' : 'fixture/primary.png', upload_status: 'uploaded' }]
        return route.fulfill({ json: { ok: true, result: { sessionId: session.id, slot: 'PRIMARY', path: 'fixture/primary.png', uploadStatus: 'uploaded' } } })
      }
      throw new Error(`Unexpected fixture request: ${path}`)
    })
    await page.goto('/tests/fixtures/intake-ai-harness.html?modal')
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles({ name: 'package.png', mimeType: 'image/png', buffer: bytes })
    await expect.poll(() => calls.length).toBe(1)
    await expect(page.getByRole('alert')).toContainText('may already be saved')
    await expect(fileInput).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Close product intake' })).toBeDisabled()
    await page.getByRole('button', { name: 'Retry exact evidence upload' }).click()
    await expect(page.getByRole('img', { name: 'Front Package preview' })).toBeVisible()
    await expect(fileInput).toBeEnabled()
    expect(calls).toHaveLength(2)
    expect(calls[0].bytes).toBe(bytes.toString('base64'))
    expect(calls[0].key).toMatch(/^[0-9a-f-]{36}$/)
    expect(calls[1]).toEqual(calls[0])
  })
}

for (const failure of ['response loss', 'refresh failure', 'retry denial']) {
  test(`intake session creation retains both identities after ${failure}`, async ({ page }) => {
    const calls = []
    const session = { id: 'e74a4161-72ca-4d72-8f59-37aa690e1869', checklist_step: 'identify', scanned_identity: '', packaging_images: [], field_decisions: {}, draft_payload: {} }
    await page.route('**/api/admin/product-intake/session*', async route => {
      const request = route.request()
      if (request.method() === 'POST') {
        calls.push({ body: request.postDataJSON(), key: request.headers()['x-k2-idempotency-key'] })
        session.request_id = calls[0].body.requestId
        if (failure !== 'refresh failure' && calls.length === 1) return route.abort('failed')
        if (failure === 'retry denial' && calls.length === 2) return route.fulfill({ status: 403, json: { error: { code: 'STAFF_ACCESS_REQUIRED' } } })
        return route.fulfill({ json: { ok: true, result: { sessionId: session.id } } })
      }
      if (calls.length === 0) return route.fulfill({ json: { ok: true, data: { session: null } } })
      if (failure === 'refresh failure' && calls.length === 1) return route.fulfill({ status: 503, json: { error: { code: 'ADMIN_SERVICE_UNAVAILABLE' } } })
      return route.fulfill({ json: { ok: true, data: { session } } })
    })
    await page.goto('/tests/fixtures/intake-ai-harness.html?modal')
    await expect.poll(() => calls.length, { timeout: 90000 }).toBe(1)
    await expect(page.getByRole('alert')).toContainText('may already be saved')
    await expect(page.getByRole('button', { name: 'Close product intake' })).toBeDisabled()
    await page.getByRole('button', { name: 'Retry exact session setup' }).click()
    if (failure === 'retry denial') {
      await expect.poll(() => calls.length).toBe(2)
      await expect(page.getByRole('alert')).toContainText('may already be saved')
      await expect(page.getByRole('button', { name: 'Close product intake' })).toBeDisabled()
      await page.getByRole('button', { name: 'Retry exact session setup' }).click()
    }
    await expect(page.getByRole('button', { name: 'Close product intake' })).toBeEnabled()
    await expect(page.getByLabel('Product barcode, SKU, or name')).toBeEnabled()
    expect(calls).toHaveLength(failure === 'retry denial' ? 3 : 2)
    expect(calls[0].body.requestId).toMatch(/^[0-9a-f-]{36}$/)
    expect(calls[0].key).toMatch(/^[0-9a-f-]{36}$/)
    expect(calls[0].body.requestId).not.toBe(calls[0].key)
    expect(calls[1]).toEqual(calls[0])
    if (failure === 'retry denial') expect(calls[2]).toEqual(calls[0])
  })
}

test('publication keeps its frozen command when the receipt refresh fails', async ({ page }) => {
  const session = {
    id: 'e74a4161-72ca-4d72-8f59-37aa690e1869', request_id: 'c32fcf68-b8fd-45cf-bc56-ac461349ba23',
    checklist_step: 'publication_review', product_id: 'fixture-product', assigned_sku: 'FIXTURE-SKU',
    scanned_identity: 'Fixture Pasta', packaging_images: [], field_decisions: {}, draft_payload: {},
  }
  const calls = []
  await page.route('**/api/admin/product-intake/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname.split('/').at(-1)
    if (path === 'session') {
      if (calls.length === 1) return route.fulfill({ status: 503, json: { error: { code: 'ADMIN_SERVICE_UNAVAILABLE' } } })
      return route.fulfill({ json: { ok: true, data: { session } } })
    }
    if (path === 'publication') {
      calls.push({ body: request.postDataJSON(), key: request.headers()['x-k2-idempotency-key'] })
      return route.fulfill({ json: { ok: true, result: { success: true } } })
    }
    throw new Error(`Unexpected fixture request: ${path}`)
  })
  await page.goto('/tests/fixtures/intake-ai-harness.html?modal')
  await page.getByLabel('Publication reason').fill('Reviewed approved publication details.')
  await page.getByLabel('Publication status').selectOption('unlisted')
  await expect.poll(() => calls.length).toBe(1)
  await expect(page.getByRole('alert')).toContainText('may already be saved')
  await expect(page.getByLabel('Publication reason')).toBeDisabled()
  await expect(page.getByLabel('Publication status')).toBeDisabled()
  await page.getByRole('button', { name: 'Retry publication change' }).click()
  await expect(page.getByLabel('Publication status')).toBeEnabled()
  await expect(page.getByLabel('Publication status')).toHaveValue('unlisted')
  expect(calls).toHaveLength(2)
  expect(calls[0].key).toMatch(/^[0-9a-f-]{36}$/)
  expect(calls[1]).toEqual(calls[0])
})

test('automatic field review retains an uncertain transition for exact retry', async ({ page }) => {
  const session = { id: 'e74a4161-72ca-4d72-8f59-37aa690e1869', request_id: 'c32fcf68-b8fd-45cf-bc56-ac461349ba23', checklist_step: 'research_handoff', scanned_identity: 'Fixture Pasta', packaging_images: [], field_decisions: {}, draft_payload: {} }
  const content = structuredClone(PRODUCT_RESEARCH_TEMPLATE)
  Object.assign(content.product, { name: 'Fixture Pasta', short_name: 'Pasta', brand_name: 'Fixture', variant: '500g', category: 'Pasta', subcategory: 'Dry Pasta' })
  Object.assign(content.copy, { card_description: 'Pasta package.', full_description: 'Dry pasta in the supplied package.', key_highlights: ['Dry pasta', '500g package'], why_buy: 'Packaged pasta.' })
  Object.assign(content.seo, { seo_title: 'Pasta', meta_description: 'Dry pasta.', page_heading: 'Pasta', supporting_heading: 'Dry pasta package', search_keywords: ['dry pasta', 'pasta 500g', 'fixture pasta'] })
  Object.assign(content.media, { primary_alt_text: 'Package', primary_composition: 'Exact package', after_alt_text: 'Prepared pasta', after_scene: 'Cooked pasta' })
  content.usage.use_cases = []; content.usage.instructions = []
  const calls = []
  await page.route('**/api/admin/product-intake/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname.split('/').at(-1)
    if (path === 'session') return route.fulfill({ json: { ok: true, data: { session } } })
    if (path === 'ai') return route.fulfill({ json: { ok: true, data: { jobs: [{ id: 'fixture-content', kind: 'content', status: 'completed', result: { content } }], readiness: { ready: false, missing: ['Fixture: paid requests disabled.'], reservations: {} }, budget: {} } } })
    if (path === 'step') {
      calls.push({ body: request.postDataJSON(), key: request.headers()['x-k2-idempotency-key'] })
      if (calls.length === 1) return route.abort('failed')
      session.checklist_step = 'field_review'
      return route.fulfill({ json: { ok: true, result: { sessionId: session.id, step: 'field_review', updatedAt: '2026-09-14T00:00:00Z' } } })
    }
    throw new Error(`Unexpected fixture request: ${path}`)
  })
  await page.goto('/tests/fixtures/intake-ai-harness.html?modal')
  await page.getByRole('button', { name: 'Check readiness / Recover saved results' }).click()
  await page.getByRole('button', { name: 'Load content into field review' }).click()
  await expect.poll(() => calls.length).toBe(1)
  await expect(page.getByRole('alert')).toContainText('may already be saved')
  await expect(page.getByRole('button', { name: 'Close product intake' })).toBeDisabled()
  await page.getByRole('button', { name: 'Retry exact automatic field review' }).click()
  await expect(page.getByRole('heading', { name: 'Step 4: Smart Paste & Field Review' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /^name: Fixture Pasta$/ })).not.toBeChecked()
  expect(calls).toHaveLength(2)
  expect(calls[0].key).toMatch(/^[0-9a-f-]{36}$/)
  expect(calls[1]).toEqual(calls[0])
})

test('replacing the actor during a Draft command ignores its late receipt', async ({ page }) => {
  const session = {
    id: 'e74a4161-72ca-4d72-8f59-37aa690e1869', request_id: 'c32fcf68-b8fd-45cf-bc56-ac461349ba23',
    checklist_step: 'draft_saved', scanned_identity: 'Original fixture actor', packaging_images: [],
    field_decisions: { name: 'accepted' }, draft_payload: { product: { name: 'Fixture Pasta' } },
  }
  let pendingRoute
  await page.route('**/api/admin/product-intake/**', async route => {
    const path = new URL(route.request().url()).pathname.split('/').at(-1)
    if (path === 'session') return route.fulfill({ json: { ok: true, data: { session } } })
    if (path === 'draft') { pendingRoute = route; return }
    throw new Error(`Unexpected fixture request: ${path}`)
  })
  await page.goto('/tests/fixtures/intake-ai-harness.html?modal')
  await page.getByRole('button', { name: 'Assign SKU & Save Product Draft' }).click()
  await expect.poll(() => Boolean(pendingRoute)).toBe(true)
  session.checklist_step = 'identify'
  session.scanned_identity = 'Replacement fixture actor'
  await page.getByRole('button', { name: 'Replace fixture actor' }).evaluate(button => button.click())
  await expect(page.getByLabel('Product barcode, SKU, or name')).toHaveValue('Replacement fixture actor')
  const refreshed = page.waitForResponse(response => response.url().includes('/product-intake/session'))
  await pendingRoute.fulfill({ json: { ok: true, result: { success: true, product_id: 'original-product', sku: 'ORIGINAL-SKU' } } })
  await refreshed
  await expect(page.getByLabel('Product barcode, SKU, or name')).toHaveValue('Replacement fixture actor')
  await expect(page.getByRole('heading', { name: /Step 6:/ })).toHaveCount(0)
})

test('uncertain intake step freezes its reviewed payload and retries the same outer receipt key', async ({ page }) => {
  const session = {
    id: 'e74a4161-72ca-4d72-8f59-37aa690e1869',
    request_id: 'c32fcf68-b8fd-45cf-bc56-ac461349ba23',
    checklist_step: 'identify', scanned_identity: '', packaging_images: [],
    field_decisions: {}, field_provenance: {}, draft_payload: {}, evidence_checklist: {},
  }
  const stepCalls = []
  await page.route('**/api/admin/product-intake/**', async route => {
    const path = new URL(route.request().url()).pathname.split('/').at(-1)
    if (path === 'session') return route.fulfill({ json: { ok: true, data: { session } } })
    if (path === 'duplicates') return route.fulfill({ json: { ok: true, data: { matchType: 'none', candidates: [] } } })
    if (path === 'step') {
      stepCalls.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
      if (stepCalls.length === 1) return route.fulfill({ status: 503, json: { error: { code: 'ADMIN_SERVICE_UNAVAILABLE' } } })
      session.checklist_step = stepCalls[1].body.step
      session.scanned_identity = stepCalls[1].body.patch.scannedIdentity
      return route.fulfill({ json: { ok: true, result: { sessionId: session.id, step: session.checklist_step, updatedAt: '2026-09-09T00:00:00Z' } } })
    }
    throw new Error(`Unexpected fixture request: ${path}`)
  })

  await page.goto('/tests/fixtures/intake-ai-harness.html?modal')
  const identity = page.getByLabel('Product barcode, SKU, or name')
  await identity.fill('8001234567890')
  await page.getByRole('button', { name: 'Check Duplicate' }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  await expect(page.getByRole('alert')).toContainText('may already be saved')
  await expect(identity).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Close product intake' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Retry exact intake step' })).toBeVisible()
  await page.getByRole('button', { name: 'Retry exact intake step' }).click()

  await expect(page.getByRole('heading', { name: 'Step 2: Capture Packaging Evidence' })).toBeVisible()
  expect(stepCalls).toHaveLength(2)
  expect(stepCalls[0].key).toMatch(/^[0-9a-f-]{36}$/)
  expect(stepCalls[1]).toEqual(stepCalls[0])
})

test('pending packaging review freezes every reviewed control and allows correction only after rejection', async ({ page }) => {
  const session = {
    id: 'e74a4161-72ca-4d72-8f59-37aa690e1869', request_id: 'c32fcf68-b8fd-45cf-bc56-ac461349ba23',
    checklist_step: 'packaging_evidence', scanned_identity: 'Fixture Pasta',
    packaging_images: ['PRIMARY', 'BACK', 'BARCODE'].map(slot => ({ slot, upload_status: 'uploaded' })),
    field_decisions: {}, draft_payload: {}, evidence_checklist: { ingredients: true, allergens: true, storage: true, expiry: true },
  }
  const calls = []
  let release
  const pending = new Promise(resolve => { release = resolve })
  await page.route('**/api/admin/product-intake/**', async route => {
    const path = new URL(route.request().url()).pathname.split('/').at(-1)
    if (path === 'session') return route.fulfill({ json: { ok: true, data: { session } } })
    if (path === 'step') {
      calls.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
      if (calls.length === 1) {
        await pending
        return route.fulfill({ status: 400, json: { error: { code: 'INTAKE_PATCH_REJECTED' } } })
      }
      session.checklist_step = 'research_handoff'
      return route.fulfill({ json: { ok: true, result: { sessionId: session.id, step: session.checklist_step, updatedAt: '2026-09-09T00:00:00Z' } } })
    }
    if (path === 'ai') return route.fulfill({ json: { ok: true, data: { jobs: [], configuration: { ready: false } } } })
    throw new Error(`Unexpected fixture request: ${path}`)
  })
  await page.goto('/tests/fixtures/intake-ai-harness.html?modal')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect.poll(() => calls.length).toBe(1)
  try {
    await expect(page.getByRole('button', { name: 'Beauty Category' })).toBeDisabled()
    await expect(page.getByLabel('Allergens / Warnings verified')).toBeDisabled()
    await expect(page.getByLabel('Front Package evidence photo')).toBeDisabled()
  } finally { release() }
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Beauty Category' }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect.poll(() => calls.length).toBe(2)
  expect(calls[1].body.patch.categoryType).toBe('beauty')
  expect(calls[1].key).not.toBe(calls[0].key)
})

for (const failure of ['response loss', 'refresh failure', 'incomplete receipt']) {
test(`uncertain Draft creation after ${failure} retries the frozen reviewed Draft with the same outer receipt key`, async ({ page }) => {
  const session = {
    id: 'e74a4161-72ca-4d72-8f59-37aa690e1869',
    request_id: 'c32fcf68-b8fd-45cf-bc56-ac461349ba23',
    checklist_step: 'draft_saved', scanned_identity: 'Fixture Pasta',
    packaging_images: [], field_provenance: {}, evidence_checklist: {},
    draft_payload: { product: { name: 'Fixture Pasta' } },
    field_decisions: { name: 'accepted' },
  }
  const draftCalls = []
  await page.route('**/api/admin/product-intake/**', async route => {
    const path = new URL(route.request().url()).pathname.split('/').at(-1)
    if (path === 'session') {
      if (failure === 'refresh failure' && draftCalls.length === 1) return route.fulfill({ status: 503, json: { error: { code: 'ADMIN_SERVICE_UNAVAILABLE' } } })
      return route.fulfill({ json: { ok: true, data: { session } } })
    }
    if (path === 'draft') {
      draftCalls.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
      if (draftCalls.length === 1 && failure === 'response loss') return route.fulfill({ status: 503, json: { error: { code: 'ADMIN_SERVICE_UNAVAILABLE' } } })
      if (draftCalls.length === 1 && failure === 'incomplete receipt') return route.fulfill({ json: { ok: true, result: {} } })
      Object.assign(session, { product_id: 'fixture-product', assigned_sku: 'FIXTURE-SKU', checklist_step: 'first_inventory' })
      return route.fulfill({ json: { ok: true, result: { success: true, product_id: session.product_id, sku: session.assigned_sku } } })
    }
    if (path === 'consignments') return route.fulfill({ json: { ok: true, data: { consignments: [] } } })
    throw new Error(`Unexpected fixture request: ${path}`)
  })

  await page.goto('/tests/fixtures/intake-ai-harness.html?modal')
  await page.getByRole('button', { name: 'Assign SKU & Save Product Draft' }).click()
  await expect(page.getByRole('alert')).toContainText('may already be saved')
  await expect(page.getByRole('button', { name: 'Close product intake' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Retry exact Draft command' })).toBeVisible()
  if (failure === 'response loss') {
    await expect(page.getByRole('alert')).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: 'docs/evidence/20260909-intake-command-retry/phone.png', fullPage: true })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.screenshot({ path: 'docs/evidence/20260909-intake-command-retry/desktop.png', fullPage: true })
  }
  await page.getByRole('button', { name: 'Retry exact Draft command' }).click()

  await expect(page.getByRole('heading', { name: /Step 6:/ })).toBeVisible()
  expect(draftCalls).toHaveLength(2)
  expect(draftCalls[0].body.requestId).toBe(session.request_id)
  expect(draftCalls[1]).toEqual(draftCalls[0])
})
}

test('uncertain first inventory preserves separate inner request and outer receipt identities', async ({ page }) => {
  const session = {
    id: 'e74a4161-72ca-4d72-8f59-37aa690e1869', request_id: 'c32fcf68-b8fd-45cf-bc56-ac461349ba23',
    product_id: 'fixture-product', assigned_sku: 'FIXTURE-SKU', checklist_step: 'first_inventory',
    scanned_identity: 'Fixture Pasta', packaging_images: [], field_decisions: {}, field_provenance: {},
    draft_payload: { product: { name: 'Fixture Pasta' } }, evidence_checklist: {},
  }
  const inventoryCalls = []
  await page.route('**/api/admin/product-intake/**', async route => {
    const path = new URL(route.request().url()).pathname.split('/').at(-1)
    if (path === 'session') return route.fulfill({ json: { ok: true, data: { session } } })
    if (path === 'consignments') return route.fulfill({ json: { ok: true, data: { consignments: [] } } })
    if (path === 'inventory') {
      inventoryCalls.push({ body: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'] })
      if (inventoryCalls.length === 1) return route.fulfill({ status: 503, json: { error: { code: 'ADMIN_SERVICE_UNAVAILABLE' } } })
      session.checklist_step = 'publication_review'
      return route.fulfill({ json: { ok: true, result: { success: true, inventoryCreated: true } } })
    }
    throw new Error(`Unexpected fixture request: ${path}`)
  })

  await page.goto('/tests/fixtures/intake-ai-harness.html?modal')
  await page.getByRole('button', { name: 'Opening Balance' }).click()
  await page.getByLabel('Box / Container Code').fill('BOX-LEGACY-01')
  await page.getByLabel('Batch / Lot Code').fill('LOT-LEGACY-01')
  await page.getByLabel('Documented Non-Expiry Item').check()
  await page.getByLabel('Reconciliation reason').fill('Physical opening count independently checked by the owner.')
  await page.getByRole('button', { name: 'Record Authorized Opening Balance' }).click()

  await expect(page.getByRole('alert')).toContainText('may already be saved')
  await expect(page.getByLabel('Box / Container Code')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Close product intake' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Retry exact first-inventory command' })).toBeVisible()
  await page.getByRole('button', { name: 'Retry exact first-inventory command' }).click()

  await expect(page.getByRole('heading', { name: 'Step 7: Publication Readiness Review' })).toBeVisible()
  expect(inventoryCalls).toHaveLength(2)
  expect(inventoryCalls[0].body.inventoryRequestId).toMatch(/^[0-9a-f-]{36}$/)
  expect(inventoryCalls[0].key).toMatch(/^[0-9a-f-]{36}$/)
  expect(inventoryCalls[0].key).not.toBe(inventoryCalls[0].body.inventoryRequestId)
  expect(inventoryCalls[1]).toEqual(inventoryCalls[0])
})

test('real modal persists automatic field-review transition before saving reviewed canonical Draft', async ({ page }) => {
  const session = { id: 'e74a4161-72ca-4d72-8f59-37aa690e1869', request_id: 'c32fcf68-b8fd-45cf-bc56-ac461349ba23', checklist_step: 'research_handoff', scanned_identity: 'Fixture Pasta', packaging_images: [], field_decisions: {}, draft_payload: {} }
  const content = structuredClone(PRODUCT_RESEARCH_TEMPLATE)
  Object.assign(content.product, { name: 'Fixture Pasta', short_name: 'Pasta', brand_name: 'Fixture', variant: '500g', category: 'Pasta', subcategory: 'Dry Pasta' })
  Object.assign(content.copy, { card_description: 'Pasta package.', full_description: 'Dry pasta in the supplied package.', key_highlights: ['Dry pasta', '500g package'], why_buy: 'Packaged pasta.' })
  Object.assign(content.seo, { seo_title: 'Pasta', meta_description: 'Dry pasta.', page_heading: 'Pasta', supporting_heading: 'Dry pasta package', search_keywords: ['dry pasta', 'pasta 500g', 'fixture pasta'] })
  Object.assign(content.media, { primary_alt_text: 'Package', primary_composition: 'Exact package', after_alt_text: 'Prepared pasta', after_scene: 'Cooked pasta' })
  content.usage.use_cases = []; content.usage.instructions = []
  const steps = []
  let drafts = 0
  await page.route('**/api/admin/product-intake/**', async route => {
    const path = new URL(route.request().url()).pathname.split('/').at(-1)
    const body = route.request().method() === 'POST' ? route.request().postDataJSON() : {}
    let response
    if (path === 'session') response = { ok: true, data: { session } }
    else if (path === 'ai') {
      expect(body.action).toBe('read')
      response = { ok: true, data: { jobs: [{ id: 'fixture-content', kind: 'content', status: 'completed', result: { content } }], readiness: { ready: false, missing: ['Fixture: paid requests disabled.'], reservations: {} }, budget: {} } }
    } else if (path === 'step') {
      steps.push(body.step)
      if (body.step === 'draft_saved') {
        expect(session.checklist_step).toBe('field_review')
        expect(body.patch.fieldDecisions.name).toBe('accepted')
        session.draft_payload = body.patch.draftPayload
        session.field_decisions = body.patch.fieldDecisions
      }
      session.checklist_step = body.step
      response = { ok: true, result: { sessionId: session.id, step: session.checklist_step, updatedAt: '2026-09-09T00:00:00Z' } }
    } else if (path === 'draft') {
      expect(session.checklist_step).toBe('draft_saved')
      expect(body.reviewedPayload.product.name).toBe('Fixture Pasta')
      drafts++
      Object.assign(session, { product_id: 'fixture-product', assigned_sku: 'FIXTURE-SKU', checklist_step: 'first_inventory' })
      response = { ok: true, result: { success: true, product_id: session.product_id, sku: session.assigned_sku } }
    } else if (path === 'consignments') response = { ok: true, data: { consignments: [] } }
    else throw new Error(`Unexpected fixture request: ${path}`)
    await route.fulfill({ json: response })
  })
  await page.goto('/tests/fixtures/intake-ai-harness.html?modal')
  await expect(page.getByRole('heading', { name: 'Step 3: Manual ChatGPT Projects' })).toBeVisible()
  await page.getByRole('button', { name: 'Check readiness / Recover saved results' }).click()
  await page.getByRole('button', { name: 'Load content into field review' }).click()
  await expect(page.getByRole('heading', { name: 'Step 4: Smart Paste & Field Review' })).toBeVisible()
  const nameReview = page.getByRole('checkbox', { name: /^name: Fixture Pasta$/ })
  await expect(nameReview).not.toBeChecked()
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  await nameReview.check()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: 'Assign SKU & Save Product Draft' }).click()
  await expect(page.getByRole('heading', { name: /Step 6:/ })).toBeVisible()
  expect(steps).toEqual(['field_review', 'draft_saved'])
  expect(drafts).toBe(1)
})

test('phone recovery, missing configuration, reviewed image and canonical attachment remain deliberate', async ({ page }) => {
  const jobs = [{ id: 'ccd54646-8a4b-4b5c-a5f4-ad8f11a9d98e', kind: 'PRIMARY', status: 'completed', result: {} }]
  const image = (await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#ccc' } }).png().toBuffer()).toString('base64')
  const actions = []
  await page.route('**/api/admin/product-intake/ai', async route => {
    const body = route.request().postDataJSON(); actions.push(body.action)
    let data
    if (body.action === 'review') { jobs[0].decision = body.decision; jobs[0].review_reason = body.reason; data = { job: jobs[0] } }
    else if (body.action === 'attach') { jobs[0].attachment_result = { fixture: true }; data = { job: jobs[0] } }
    else if (body.action === 'candidate') data = { job: { ...jobs[0], result: { image } } }
    else data = { jobs, readiness: { ready: false, missing: ['The server API key is missing.'], reservations: { content: 100000, PRIMARY: 1000000, AFTER: 1000000 } }, budget: { sessionReserved: 1000000, monthReserved: 1000000, perSessionCap: 2100000, monthlyCap: 10000000 } }
    await route.fulfill({ json: { ok: true, data } })
  })
  await page.goto('/tests/fixtures/intake-ai-harness.html')
  await page.getByRole('button', { name: 'Check readiness / Recover saved results' }).click()
  await expect(page.getByText('The server API key is missing.')).toBeVisible()
  await expect(page.getByText('Manual ChatGPT Projects', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Load PRIMARY candidate for review' }).click()
  await expect(page.getByRole('img')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Accept candidate', exact: true })).toBeDisabled()
  await page.getByLabel('Review reason').fill('Fixture package fidelity, rights and composition checked.')
  await page.getByRole('button', { name: 'Accept candidate', exact: true }).click()
  await page.getByRole('button', { name: 'Attach reviewed PRIMARY to Draft' }).click()
  await expect(page.getByText('Attached through the canonical media command.')).toBeVisible()
  await page.getByRole('button', { name: 'Close / reopen intake fixture' }).click()
  await page.getByRole('button', { name: 'Close / reopen intake fixture' }).click()
  await page.getByRole('button', { name: 'Check readiness / Recover saved results' }).click()
  await page.getByRole('button', { name: 'Load PRIMARY candidate for review' }).click()
  await expect(page.getByText('Attached through the canonical media command.')).toBeVisible()
  expect(actions).not.toContain('start')
  expect(actions.filter(action => action === 'attach')).toHaveLength(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  await page.screenshot({ path: 'docs/evidence/20260906-intake-ai/phone.png', fullPage: true })
})
