import assert from 'node:assert/strict'
import test from 'node:test'

import { draftFromResearch } from '../src/lib/storeAssetPlan.js'
import {
  PRODUCT_RESEARCH_TEMPLATE, parseProductResearchPaste,
} from '../src/views/admin/productResearchContract.js'
import { KNOWLEDGE_STATUS } from '../src/lib/productKnowledge.js'
import { validateProductKnowledgeCommand } from '../server/admin-bff/product-knowledge.js'

test('parsed v3 product research becomes store asset drafts', () => {
  const response = structuredClone(PRODUCT_RESEARCH_TEMPLATE)
  Object.assign(response.product, {
    name: 'Tigullio Peperoni E Noci',
    short_name: 'Peperoni E Noci',
    brand_name: 'Tigullio',
    variant: 'Peperoni E Noci',
    category: 'Pesto and sauces',
    subcategory: 'Pesto and sauces',
  })
  Object.assign(response.copy, {
    card_description: 'A pepper and walnut pesto for pasta.',
    full_description: 'A pepper and walnut pesto for pasta.',
    key_highlights: ['Pepper and walnut pesto.', 'For pasta.'],
    why_buy: 'A pepper and walnut pesto to serve with pasta.',
  })
  Object.assign(response.seo, {
    seo_title: 'Tigullio Peperoni e Noci Pesto | K2 Jimzon',
    meta_description: 'A pepper and walnut pesto for pasta from Tigullio.',
    page_heading: 'Tigullio Peperoni E Noci',
    supporting_heading: 'Pesto for pasta',
    search_keywords: ['Tigullio Peperoni e Noci', 'pepper and walnut pesto', 'pesto for pasta'],
  })
  response.usage.summary = 'Use this pepper and walnut pesto with pasta.'
  response.usage.use_cases = []
  response.usage.instructions = [{
    title: 'Stir through pasta',
    amount_or_ratio: null,
    steps: ['Salt the pasta water lightly.', 'Mix the pesto through cooked pasta.'],
    expected_result: null,
  }]
  Object.assign(response.media, {
    primary_alt_text: 'Tigullio Peperoni E Noci packaging',
    primary_composition: 'Product packaging for Tigullio Peperoni E Noci.',
    after_alt_text: 'No after use image information provided.',
    after_scene: 'No after use scene supplied.',
  })
  response.verification.sources = [{
    fields: ['copy.card_description', 'usage.summary', 'seo.seo_title', 'seo.meta_description'],
    source_type: 'manufacturer',
    reference: 'https://example.test/tigullio-peperoni-e-noci',
    confidence: 'high',
  }]

  const parsed = parseProductResearchPaste(JSON.stringify(response))
  const drafted = draftFromResearch(parsed, { model: 'test' })

  const commandError = (() => {
    try {
      validateProductKnowledgeCommand('product_knowledge_save', {
        sku: 'k2-sku-001180',
        fields: Object.entries(drafted.fields).map(([key, field]) => ({ key, ...field })),
        faqs: drafted.faqs,
      })
      return undefined
    } catch (error) {
      return error.message
    }
  })()
  assert.equal(commandError, undefined)
  assert.equal(drafted.fields.description.status, KNOWLEDGE_STATUS.DRAFT)
  assert.equal(drafted.fields.description.value, 'A pepper and walnut pesto for pasta.')
  assert.match(drafted.fields.description.provenance.contract, /k2\.product-content\.v3/)
  assert.equal(drafted.fields.uses.value, 'Use this pepper and walnut pesto with pasta.')
  assert.equal(drafted.fields.preparation.value, 'Salt the pasta water lightly. Mix the pesto through cooked pasta.')
  assert.equal(drafted.fields.seo_title?.value, 'Tigullio Peperoni e Noci Pesto | K2 Jimzon')
  assert.equal(drafted.fields.meta_description?.value, 'A pepper and walnut pesto for pasta from Tigullio.')
  assert.equal(drafted.faqs.length, 0)
})

test('existing raw research envelopes still become drafts', () => {
  const drafted = draftFromResearch({
    copy: { card_description: 'A factual product description.' },
    usage: { summary: 'Use with pasta.' },
    seo: { seo_title: 'Product | K2 Jimzon' },
  }, { model: 'test' })

  assert.equal(drafted.fields.description.value, 'A factual product description.')
  assert.equal(drafted.fields.uses.value, 'Use with pasta.')
  assert.equal(drafted.fields.seo_title?.value, 'Product | K2 Jimzon')
})
