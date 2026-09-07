import { test, expect } from '@playwright/test'
import sharp from 'sharp'
import { PRODUCT_RESEARCH_TEMPLATE } from '../src/views/admin/productResearchContract.js'

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
      response = { ok: true, result: { success: true } }
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
