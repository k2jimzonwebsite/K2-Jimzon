import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  PRODUCT_RESEARCH_TEMPLATE,
  PRODUCT_RESEARCH_SCHEMA_VERSION,
  parseProductResearchPaste,
} from '../src/views/admin/productResearchContract.js'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [service, modal, migration, preflight, postflight] = await Promise.all([
  read('src/services/productIntakeService.js'),
  read('src/views/admin/ProductIntakeSessionModal.jsx'),
  read('supabase/migrations/20260811_product_intake_and_sku_gate.sql'),
  read('supabase/map018_product_intake_preflight.sql'),
  read('supabase/map018_product_intake_postflight.sql'),
])

for (const forbidden of [
  /Mock Product Draft/i,
  /K2-SKU-\$\{Math\./,
  /\.from\(['"]products['"]\)\s*\.insert/s,
  /\.from\(['"]product_batches['"]\)\s*\.insert/s,
  /placeholder\.co/i,
]) {
  assert.equal(forbidden.test(`${service}\n${modal}`), false, `Forbidden intake fallback remains: ${forbidden}`)
}

for (const required of [
  'uploadProductEvidence',
  'create_product_draft_server',
  'create_product_first_inventory_server',
  'transition_product_publication_server',
  'SESSION_PATCH_FIELDS',
]) assert.equal(service.includes(required), true, `Missing browser boundary: ${required}`)

for (const required of [
  'force row level security',
  'K2_AAL2_REQUIRED',
  'K2_DUPLICATE_BARCODE',
  'K2_DRAFT_REVIEW_GATE_INCOMPLETE',
  'K2_EVIDENCE_GATE_INCOMPLETE',
  'K2_SUPPLIER_RECEIPT_WORKFLOW_UNAVAILABLE',
  "'product-intake-evidence'",
  'revoke all on function public.generate_k2_sku_internal()',
]) assert.equal(migration.includes(required), true, `Missing database boundary: ${required}`)

assert.equal(/for all to authenticated\s+using\s*\(true\)/i.test(migration), false, 'Blanket intake RLS policy returned')
assert.equal(preflight.includes('MAP-018 product-intake preflight passed'), true)
assert.equal(postflight.includes('MAP-018 product-intake postflight passed'), true)

const payload = structuredClone(PRODUCT_RESEARCH_TEMPLATE)
payload.product.name = 'Test Pasta 500g'
payload.product.short_name = 'Test Pasta'
payload.product.brand_name = 'Test Brand'
payload.product.variant = '500g'
payload.product.category = 'Pasta'
payload.product.subcategory = 'Dry Pasta'
payload.copy.card_description = 'A concise evidence-based test description.'
payload.copy.full_description = 'A complete evidence-based description for contract verification.'
payload.copy.key_highlights = ['Exact package identity', 'Documented preparation']
payload.copy.why_buy = 'Useful contract fixture.'
payload.seo.seo_title = 'Test Pasta 500g'
payload.seo.meta_description = 'Contract fixture for the K2 product-intake verifier.'
payload.seo.page_heading = 'Test Pasta 500g'
payload.seo.supporting_heading = 'Verified product-intake fixture'
payload.seo.search_keywords = ['test pasta', '500g pasta', 'Italian pasta']
payload.usage.use_cases = []
payload.usage.instructions = []
payload.media.primary_alt_text = 'Front of Test Pasta package'
payload.media.primary_composition = 'Preserve the exact physical package.'
payload.media.after_alt_text = 'Prepared Test Pasta serving'
payload.media.after_scene = 'A truthful prepared serving based on the approved use case.'
payload.verification.sources = [{
  fields: ['product.name'], source_type: 'package_image',
  reference: 'upload:front', confidence: 'high',
}]

const normalized = parseProductResearchPaste(JSON.stringify(payload))
assert.equal(normalized.meta.schemaVersion, PRODUCT_RESEARCH_SCHEMA_VERSION)
assert.equal(normalized.product.name, 'Test Pasta 500g')

const prohibited = structuredClone(payload)
prohibited.product.sku = 'BROWSER-SKU'
assert.throws(
  () => parseProductResearchPaste(JSON.stringify(prohibited)),
  /not allowed|Unexpected field/,
  'Operational fields must be rejected from ChatGPT output',
)

console.log('MAP-018 static intake contract passed (live behavior remains gated on migration activation).')
