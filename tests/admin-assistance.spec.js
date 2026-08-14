import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { ADMIN_SHORTCUTS, GO_TO_SHORTCUTS, SCAN_WORKFLOWS } from '../src/views/admin/adminOperations.js'
import { answerQuestion, searchGuide, TOPICS } from '../src/views/admin/adminGuide.js'
import {
  buildAfterImagePrompt,
  buildPrimaryImagePrompt,
  buildProductJsonPrompt,
  K2_PRODUCT_IMAGE_PROJECT_INSTRUCTIONS,
  K2_PRODUCT_JSON_PROJECT_INSTRUCTIONS,
  PRODUCT_RESEARCH_SCHEMA_VERSION,
} from '../src/views/admin/productResearchPrompt.js'
import {
  parseProductResearchPaste,
  PRODUCT_RESEARCH_TEMPLATE,
} from '../src/views/admin/productResearchContract.js'

test('admin shortcut registry exposes safe high-frequency operations', () => {
  expect(ADMIN_SHORTCUTS.some(item => item.id === 'scan' && item.keys.join(' ') === 'Alt S')).toBeTruthy()
  expect(ADMIN_SHORTCUTS.some(item => item.id === 'guide')).toBeTruthy()
  expect(GO_TO_SHORTCUTS.f).toBe('consignment')
  expect(SCAN_WORKFLOWS.map(item => item.id)).toEqual(expect.arrayContaining(['new_product', 'pack_order', 'milan_box', 'manila_box']))
})

test('operations retrieval cites the rulebook and prefers the active context', () => {
  const result = answerQuestion('How do I recount a box when it arrives in Manila?', { section: 'consignment' })
  expect(result.ok).toBeTruthy()
  expect(result.topic.id).toBe('manila_scanning')
  expect(result.topic.source).toContain('Operations Rulebook')
  expect(searchGuide('waybill')[0].id).toBe('waybills')
  expect(TOPICS.every(topic => topic.source && topic.how.length)).toBeTruthy()
})

test('adaptive product prompt requests only the strict final-content JSON', () => {
  const prompt = buildProductJsonPrompt({
    barcode: '8005110060027',
    productName: 'Example Pasta 500g',
    researchMode: 'usage',
  })

  expect(prompt.startsWith('PRODUCT_JSON')).toBeTruthy()
  expect(prompt).toContain(PRODUCT_RESEARCH_SCHEMA_VERSION)
  expect(prompt).toContain('one JSON object and nothing else')
  expect(prompt).toContain('verification.unknown_fields')
  expect(prompt).toContain('Do not generate an image, SKU, slug, price, stock, expiry, batch, status')
  expect(K2_PRODUCT_JSON_PROJECT_INSTRUCTIONS).toContain('USAGE VERSUS INSTRUCTIONS')
  expect(K2_PRODUCT_JSON_PROJECT_INSTRUCTIONS).toContain('seo.meta_description')
  expect(K2_PRODUCT_JSON_PROJECT_INSTRUCTIONS).not.toContain('PRIMARY_REJECTED')
})

test('image project has unified primary rules and product-specific handoff prompts', () => {
  const product = { name: 'Example Pasta 500g', brand: 'Example', size: '500 g pack', net_weight: '500 g', package_type: 'Bag' }
  const media = {
    primary_alt_text: 'Front of the Example Pasta 500 g package.',
    primary_composition: 'Keep the complete package visible.',
    after_alt_text: 'Cooked Example Pasta served with tomato sauce.',
    after_scene: 'A restrained serving of cooked pasta with tomato sauce.',
    after_truth_constraints: ['Do not show a larger package or invented garnish.'],
  }

  expect(K2_PRODUCT_IMAGE_PROJECT_INSTRUCTIONS).toContain('PRIMARY_REJECTED')
  expect(K2_PRODUCT_IMAGE_PROJECT_INSTRUCTIONS).toContain('#F3EDE0')
  expect(K2_PRODUCT_IMAGE_PROJECT_INSTRUCTIONS).toContain('never a collage')
  expect(buildPrimaryImagePrompt(product, media)).toContain('Keep the complete package visible.')
  expect(buildAfterImagePrompt(product, media)).toContain('Do not show a larger package')
})

test('v3 product content JSON validates and flattens uses and procedures for the current product draft', () => {
  const response = structuredClone(PRODUCT_RESEARCH_TEMPLATE)
  response.product.barcode = '8005110060027'
  response.product.name = 'Example Pasta 500g'
  response.product.short_name = 'Example Pasta'
  response.product.brand_name = 'Example'
  response.product.category = 'Pantry'
  response.product.subcategory = 'Pasta'
  response.product.variant = '500 g pack'
  response.product.net_weight = '500 g'
  response.product.package_type = 'Bag'
  response.product.origin = 'Italy'
  response.product.ingredients = ['Durum wheat semolina']
  response.product.allergens = ['Wheat']
  response.copy.card_description = 'Italian dried pasta for dependable everyday meals.'
  response.copy.full_description = 'Italian dried pasta in a 500 g package. Its exact cooking guidance remains on the package.'
  response.copy.key_highlights = ['500 g package', 'Made in Italy']
  response.copy.why_buy = 'A versatile pantry pasta with package-backed cooking directions.'
  response.seo.seo_title = 'Example Pasta 500g | K2 Jimzon'
  response.seo.meta_description = 'Shop Example Pasta 500g, an Italian dried pasta for dependable everyday meals.'
  response.seo.page_heading = 'Example Pasta 500g'
  response.seo.supporting_heading = 'Italian dried pasta for everyday sauces and meals'
  response.seo.search_keywords = ['Example pasta 500g', 'Italian dried pasta', 'pasta Philippines']
  response.usage.summary = 'Cook before serving.'
  response.usage.use_cases = [{
    title: 'Everyday pasta meals',
    best_for: 'A main meal',
  }]
  response.usage.instructions = [{
    title: 'Stovetop pasta',
    amount_or_ratio: 'Use the package serving guidance',
    steps: ['Bring water to a boil.', 'Cook for the package time.', 'Drain and serve.'],
    expected_result: 'Cooked pasta with a firm texture.',
  }]
  response.usage.pairings = ['Tomato sauce']
  response.media.primary_alt_text = 'Front of the Example Pasta 500 g package.'
  response.media.primary_composition = 'Keep the complete package visible.'
  response.media.after_alt_text = 'Cooked Example Pasta served with tomato sauce.'
  response.media.after_scene = 'A restrained serving of cooked pasta with tomato sauce.'
  response.media.after_truth_constraints = ['Do not show a larger package or invented garnish.']

  const parsed = parseProductResearchPaste(JSON.stringify(response))

  expect(parsed.meta.schemaVersion).toBe(PRODUCT_RESEARCH_SCHEMA_VERSION)
  expect(parsed.meta.legacy).toBeFalsy()
  expect(parsed.product.barcode).toBe('8005110060027')
  expect(parsed.product.subcategory).toBe('Pasta')
  expect(parsed.product.usage_instructions).toContain('Stovetop pasta')
  expect(parsed.product.usage_instructions).toContain('1. Bring water to a boil.')
  expect(parsed.product.finished_product_details).toContain('firm texture')
  expect(parsed.product.seo_keywords).toContain('Italian dried pasta')
})

test('v3 content JSON rejects operational fields and malformed instruction steps', () => {
  const withSku = structuredClone(PRODUCT_RESEARCH_TEMPLATE)
  withSku.product.name = 'Example Product'
  withSku.product.short_name = 'Example'
  withSku.product.brand_name = 'Example'
  withSku.product.variant = '100 ml bottle'
  withSku.product.category = 'Personal care'
  withSku.product.subcategory = 'Body care'
  withSku.copy.card_description = 'A factual card description.'
  withSku.copy.full_description = 'A factual product description.'
  withSku.copy.key_highlights = ['100 ml bottle', 'Exact reviewed variant']
  withSku.copy.why_buy = 'A concise factual reason.'
  withSku.seo.seo_title = 'Example Product 100ml | K2 Jimzon'
  withSku.seo.meta_description = 'Review Example Product in its exact 100 ml bottle variant from K2 Jimzon.'
  withSku.seo.page_heading = 'Example Product 100ml'
  withSku.seo.supporting_heading = 'The exact 100 ml reviewed product variant'
  withSku.seo.search_keywords = ['Example Product 100ml', 'Example body care', '100 ml bottle']
  withSku.usage.use_cases[0].title = 'Everyday use'
  withSku.usage.instructions[0].title = 'Apply as directed'
  withSku.media.primary_alt_text = 'Front of the Example Product bottle.'
  withSku.media.primary_composition = 'Keep the bottle fully visible.'
  withSku.media.after_alt_text = 'Example Product shown in ordinary use.'
  withSku.media.after_scene = 'A restrained ordinary-use scene.'
  withSku.product.sku = 'AI-MUST-NOT-ASSIGN'

  expect(() => parseProductResearchPaste(JSON.stringify(withSku))).toThrow(/not allowed/)

  const malformedInstructions = structuredClone(withSku)
  delete malformedInstructions.product.sku
  malformedInstructions.usage.instructions[0].steps = 'Use it somehow'
  expect(() => parseProductResearchPaste(JSON.stringify(malformedInstructions))).toThrow(/must be a JSON array/)
})

test('legacy product JSON is accepted only with an explicit compatibility warning', () => {
  const parsed = parseProductResearchPaste('{"id":"legacy-product","name":"Legacy Product"}')
  expect(parsed.meta.legacy).toBeTruthy()
  expect(parsed.warnings[0]).toContain('Legacy JSON accepted for compatibility')
})

test('keyboard shortcuts do not bypass operational safeguards', async () => {
  const source = await readFile(new URL('../src/views/admin/Admin.jsx', import.meta.url), 'utf8')
  const scanCenter = await readFile(new URL('../src/views/admin/UniversalScanLauncher.jsx', import.meta.url), 'utf8')

  expect(source).toContain('isTextEntryTarget(event.target)')
  expect(source).toContain("event.altKey && key === 's'")
  expect(scanCenter).toContain('Select the order, flight, or box before unit scans')
  expect(scanCenter).toContain('never silently accepted')
})
