import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  selectPublicKnowledge,
  getProductKnowledge,
  buildStaffHandoffContext,
  KNOWLEDGE_STATUS,
  UNAVAILABLE_TEXT,
} from '../src/lib/productKnowledge.js'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

const RECORD = {
  fields: {
    description: { status: KNOWLEDGE_STATUS.APPROVED, value: 'Approved description.' },
    preparation: { status: KNOWLEDGE_STATUS.DRAFT, value: 'Unreviewed draft text.' },
    storage: { status: KNOWLEDGE_STATUS.UNAVAILABLE, value: '' },
    packaging: { status: KNOWLEDGE_STATUS.APPROVED, value: '   ' },
  },
  faqs: [
    { status: KNOWLEDGE_STATUS.APPROVED, question: 'Approved question?', answer: 'Approved answer.' },
    { status: KNOWLEDGE_STATUS.DRAFT, question: 'Draft question?', answer: 'Draft answer.' },
    { status: KNOWLEDGE_STATUS.APPROVED, question: 'Missing answer?', answer: '' },
  ],
}

test('only approved knowledge is ever public', () => {
  const result = selectPublicKnowledge(RECORD, 'SKU-1')

  // The rule MAP-027 exists to enforce: AI drafting is not publication authority.
  expect(Object.keys(result.fields)).toEqual(['description'])
  expect(result.fields.description).toBe('Approved description.')
  expect(JSON.stringify(result)).not.toContain('Unreviewed draft text.')
  expect(JSON.stringify(result)).not.toContain('Draft answer.')

  // Approved but empty is not a claim either.
  expect(result.fields.packaging).toBeUndefined()
  expect(result.faqs.map(f => f.question)).toEqual(['Approved question?'])
})

test('a record with nothing approved reports no knowledge rather than filler', () => {
  const draftsOnly = {
    fields: { description: { status: KNOWLEDGE_STATUS.DRAFT, value: 'Draft.' } },
    faqs: [{ status: KNOWLEDGE_STATUS.DRAFT, question: 'q', answer: 'a' }],
  }
  const result = selectPublicKnowledge(draftsOnly, 'SKU-2')
  expect(result.hasAny).toBe(false)
  expect(result.hasFields).toBe(false)
  expect(result.hasFaqs).toBe(false)
})

test('missing or malformed records degrade to an honest empty state', () => {
  for (const input of [null, undefined, {}, { fields: null, faqs: 'nope' }]) {
    const result = selectPublicKnowledge(input, 'SKU-3')
    expect(result.hasAny).toBe(false)
    expect(result.faqs).toEqual([])
  }
})

test('knowledge lookup fails closed when no approved source is wired', () => {
  // Outside a Vite dev build there is no development fixture and no database
  // projection yet, so every SKU must report unavailable rather than inventing
  // content. This is the production behaviour until the Admin workspace ships.
  const result = getProductKnowledge('caffe-milano-gold')
  expect(result.hasAny).toBe(false)
  expect(getProductKnowledge('').hasAny).toBe(false)
  expect(getProductKnowledge(null).hasAny).toBe(false)
})

test('the staff handoff carries bounded product context only', () => {
  const context = buildStaffHandoffContext(
    { sku: 'SKU-9', name: 'Test Product', internal_notes: 'private', cost_price: 1 },
    '  Is this ground?  ',
  )

  expect(context).toEqual({
    sku: 'SKU-9',
    productName: 'Test Product',
    question: 'Is this ground?',
    origin: 'product-page',
  })
  // No private or commercial fields may ride along.
  expect(JSON.stringify(context)).not.toContain('private')
  expect(JSON.stringify(context)).not.toContain('cost_price')
})

test('the product page publishes no claim for an unsupported description', async () => {
  const source = await read('../src/views/MasterProduct.jsx')
  // The previous fallback asserted authenticity and Manila stock for products
  // that had no description at all.
  expect(source).not.toContain('Authentic Italian import in our Manila inventory.')
  expect(source).toContain('UNAVAILABLE_TEXT')
  expect(UNAVAILABLE_TEXT).toBe('Information not available yet.')
})

test('the staff handoff makes no availability or response-time promise', async () => {
  const source = await read('../src/components/ProductKnowledge.jsx')
  expect(source).toContain('No response time is promised.')
  expect(source).not.toMatch(/staff are online|currently online|replies within/i)
})

test('one knowledge source serves the product page, with no second FAQ system', async () => {
  const knowledge = await read('../src/components/ProductKnowledge.jsx')
  const master = await read('../src/views/MasterProduct.jsx')

  expect(knowledge).toContain("from '../lib/productKnowledge'")
  expect(master).toContain('<ProductKnowledge product={product}')
  // The component must not hold its own answer content.
  expect(knowledge).not.toMatch(/const\s+(FAQS|FAQ_LIST|QUESTIONS)\s*=/)
})
