import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  getProductKnowledge, primeProductKnowledge, resetProductKnowledge,
} from '../src/lib/productKnowledge.js'
import { groupKnowledgeRows } from '../src/lib/productKnowledgeSource.js'
import { validateProductKnowledgeCommand } from '../server/admin-bff/product-knowledge.js'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test.afterEach(() => resetProductKnowledge())

test('database rows become one record per SKU, with FAQs in stored order', () => {
  const records = groupKnowledgeRows(
    [
      { sku: 'a', field_key: 'uses', status: 'approved', value: 'Espresso.' },
      { sku: 'a', field_key: 'storage', status: 'draft', value: 'Unreviewed.' },
      { sku: 'b', field_key: 'uses', status: 'approved', value: 'Pasta.' },
    ],
    [
      { sku: 'a', position: 2, status: 'approved', question: 'Third?', answer: '3' },
      { sku: 'a', position: 0, status: 'approved', question: 'First?', answer: '1' },
      { sku: 'a', position: 1, status: 'draft', question: 'Second?', answer: '2' },
    ],
  )

  expect(records).toHaveLength(2)
  const first = records.find(record => record.sku === 'a')
  expect(Object.keys(first.fields).sort()).toEqual(['storage', 'uses'])
  // Position, not insertion order: staff decided the sequence and the reader
  // must not reshuffle it.
  expect(first.faqs.map(faq => faq.question)).toEqual(['First?', 'Second?', 'Third?'])
})

test('the approval gate still applies to everything the database returns', () => {
  primeProductKnowledge(groupKnowledgeRows(
    [
      { sku: 'sku-1', field_key: 'uses', status: 'approved', value: 'Approved use.' },
      { sku: 'sku-1', field_key: 'storage', status: 'draft', value: 'Draft storage.' },
    ],
    [
      { sku: 'sku-1', position: 0, status: 'approved', question: 'Public?', answer: 'Yes.' },
      { sku: 'sku-1', position: 1, status: 'draft', question: 'Private?', answer: 'No.' },
    ],
  ))

  const knowledge = getProductKnowledge('sku-1')
  expect(knowledge.fields).toEqual({ uses: 'Approved use.' })
  expect(knowledge.faqs).toEqual([{ question: 'Public?', answer: 'Yes.' }])
  expect(JSON.stringify(knowledge)).not.toContain('Draft storage.')
  expect(JSON.stringify(knowledge)).not.toContain('Private?')
})

test('an unprimed cache reports unavailable rather than inventing content', () => {
  expect(getProductKnowledge('caffe-milano-gold').hasAny).toBe(false)
  expect(getProductKnowledge('').hasAny).toBe(false)
})

test('priming replaces the snapshot so unapproved copy actually disappears', () => {
  primeProductKnowledge([{ sku: 'sku-1', fields: { uses: { status: 'approved', value: 'Old.' } }, faqs: [] }])
  expect(getProductKnowledge('sku-1').fields.uses).toBe('Old.')

  // Staff unapprove it; the next load must not leave the old copy behind.
  primeProductKnowledge([])
  expect(getProductKnowledge('sku-1').hasAny).toBe(false)
})

test('the save command accepts an exact record and rejects everything else', () => {
  const valid = validateProductKnowledgeCommand('product_knowledge_save', {
    sku: 'caffe-milano-gold',
    fields: [{ key: 'uses', status: 'approved', value: 'Espresso.', provenance: { source: 'generated-edited' } }],
    faqs: [{ question: 'Ground?', answer: 'No.', status: 'approved', provenance: {} }],
  })
  expect(valid.fields[0]).toEqual({
    key: 'uses', status: 'approved', value: 'Espresso.', provenance: { source: 'generated-edited' },
  })

  const reject = body => expect(() => validateProductKnowledgeCommand('product_knowledge_save', body)).toThrow('REQUEST_INVALID')
  reject({ sku: 'a', fields: [], faqs: [], extra: 1 })
  reject({ sku: '', fields: [], faqs: [] })
  reject({ sku: 'a', fields: [{ key: 'Uses', status: 'approved', value: 'x', provenance: {} }], faqs: [] })
  reject({ sku: 'a', fields: [{ key: 'uses', status: 'published', value: 'x', provenance: {} }], faqs: [] })
  // Approving empty text would render an empty section instead of the honest
  // unavailable state.
  reject({ sku: 'a', fields: [{ key: 'uses', status: 'approved', value: '  ', provenance: {} }], faqs: [] })
  // Two rows for one field key would make the stored value order-dependent.
  reject({
    sku: 'a',
    fields: [
      { key: 'uses', status: 'approved', value: 'x', provenance: {} },
      { key: 'uses', status: 'draft', value: 'y', provenance: {} },
    ],
    faqs: [],
  })
  reject({ sku: 'a', fields: [], faqs: [{ question: 'q', answer: '', status: 'approved', provenance: {} }] })
  reject({
    sku: 'a',
    fields: Array.from({ length: 21 }, (_, index) => ({
      key: 'field_' + index, status: 'draft', value: 'x', provenance: {},
    })),
    faqs: [],
  })
})

test('only staff may write knowledge, and no client role may write the tables directly', async () => {
  const migration = await read('../supabase/migrations/20260828_product_knowledge_boundary.sql')

  expect(migration).toContain('K2_STAFF_ACCESS_REQUIRED')
  expect(migration).toContain('security definer')
  expect(migration).toContain("using (status = 'approved')")
  // No write policy exists for any client role, so the command is the one way in.
  expect(migration).not.toMatch(/for (insert|update|delete) to (anon|authenticated)/)
  expect(migration).toContain('revoke all on table public.product_knowledge from public, anon, authenticated')
  expect(migration).toContain('grant select on table public.product_knowledge to anon, authenticated')
  // The command carries the same replay, idempotency and rate controls as every
  // other customer-facing admin write.
  expect(migration).toContain('K2_ADMIN_REQUEST_REPLAYED')
  expect(migration).toContain('K2_ADMIN_IDEMPOTENCY_CONFLICT')
  expect(migration).toContain('K2_ADMIN_RATE_LIMITED')
  expect(migration).toContain('verify_admin_bff_request')
})

test('approving in the Store Asset Studio writes through the signed command', async () => {
  const studio = await read('../src/views/admin/StoreAssetStudio.jsx')
  const service = await read('../src/services/adminBffService.js')
  const handler = await read('../prepared-api/admin/product-knowledge/save.js')

  expect(studio).toContain('saveProductKnowledgeBff')
  expect(studio).toContain('Publish to the store')
  expect(service).toContain("boundedAdminCommandRoute('product-knowledge', 'save')")
  expect(handler).toContain("handleProductKnowledgeCommand(req, res, 'product_knowledge_save')")

  // The old screen said approvals were session-only. That claim must not
  // survive the change that made them durable.
  expect(studio).not.toContain('held for this session')
  expect(studio).not.toContain('does not write product truth')
})

test('the development seed is loaded lazily so it cannot ship as bundled text', async () => {
  const source = await read('../src/lib/productKnowledgeSource.js')
  const knowledge = await read('../src/lib/productKnowledge.js')

  // The exact expression Vite folds. An optional-chained variant is not
  // substituted, which is what left the previous fixture in the bundle.
  expect(source).toContain('if (!import.meta.env.DEV) return []')
  expect(source).toContain("await import('./productKnowledgeDevSeed.js')")
  // The knowledge module itself no longer carries any sample content.
  expect(knowledge).not.toContain('cocoa-forward')
  expect(knowledge).not.toContain('DEV_FIXTURE')
})
