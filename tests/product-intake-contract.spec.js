import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  PRODUCT_RESEARCH_TEMPLATE,
  PRODUCT_RESEARCH_SCHEMA_VERSION,
  parseProductResearchPaste,
} from '../src/views/admin/productResearchContract.js'

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('product intake cannot fabricate browser-side product, lot, or publication success', async () => {
  const [service, modal] = await Promise.all([
    source('src/services/productIntakeService.js'),
    source('src/views/admin/ProductIntakeSessionModal.jsx'),
  ])
  expect(service).not.toMatch(/Mock Product Draft|K2-SKU-\$\{Math/)
  expect(service).not.toMatch(/\.from\(['"]products['"]\)\s*\.insert/s)
  expect(service).not.toMatch(/\.from\(['"]product_batches['"]\)\s*\.insert/s)
  expect(modal).not.toContain('placeholder.co')
  expect(service).toContain('SESSION_PATCH_FIELDS')
  expect(service).toContain('uploadProductEvidence')
  expect(service).toContain('create_product_draft_server')
  expect(service).toContain('create_product_first_inventory_server')
  expect(service).toContain('transition_product_publication_server')
})

test('database contract is staff-owned, MFA-gated, idempotent, and private', async () => {
  const [migration, postflight] = await Promise.all([
    source('supabase/migrations/20260811_product_intake_and_sku_gate.sql'),
    source('supabase/map018_product_intake_postflight.sql'),
  ])
  expect(migration).toContain('force row level security')
  expect(migration).toContain('K2_AAL2_REQUIRED')
  expect(migration).toContain('K2_REQUEST_ID_MISMATCH')
  expect(migration).toContain('K2_FIRST_INVENTORY_ALREADY_RECORDED')
  expect(migration).toContain("'product-intake-evidence'")
  expect(migration).toContain('public = false')
  expect(migration).toContain('K2_SUPPLIER_RECEIPT_WORKFLOW_UNAVAILABLE')
  expect(migration).not.toMatch(/for all to authenticated\s+using\s*\(true\)/i)
  expect(postflight).toContain('anon retains intake-table privileges')
  expect(postflight).toContain('internal SKU generator is externally executable')
})

test('current product JSON accepts content and rejects operational authority', () => {
  const payload = structuredClone(PRODUCT_RESEARCH_TEMPLATE)
  Object.assign(payload.product, {
    name: 'Test Pasta 500g', short_name: 'Test Pasta', brand_name: 'Test Brand',
    variant: '500g', category: 'Pasta', subcategory: 'Dry Pasta',
  })
  Object.assign(payload.copy, {
    card_description: 'A concise evidence-based test description.',
    full_description: 'A complete evidence-based description for contract verification.',
    key_highlights: ['Exact package identity', 'Documented preparation'],
    why_buy: 'Useful contract fixture.',
  })
  Object.assign(payload.seo, {
    seo_title: 'Test Pasta 500g',
    meta_description: 'Contract fixture for the K2 product-intake verifier.',
    page_heading: 'Test Pasta 500g',
    supporting_heading: 'Verified product-intake fixture',
    search_keywords: ['test pasta', '500g pasta', 'Italian pasta'],
  })
  payload.usage.use_cases = []
  payload.usage.instructions = []
  Object.assign(payload.media, {
    primary_alt_text: 'Front of Test Pasta package',
    primary_composition: 'Preserve the exact physical package.',
    after_alt_text: 'Prepared Test Pasta serving',
    after_scene: 'A truthful prepared serving based on the approved use case.',
  })
  payload.verification.sources = [{
    fields: ['product.name'], source_type: 'package_image',
    reference: 'upload:front', confidence: 'high',
  }]

  const normalized = parseProductResearchPaste(JSON.stringify(payload))
  expect(normalized.meta.schemaVersion).toBe(PRODUCT_RESEARCH_SCHEMA_VERSION)

  payload.product.price = 100
  expect(() => parseProductResearchPaste(JSON.stringify(payload))).toThrow(/not allowed|Unexpected field/)
})
