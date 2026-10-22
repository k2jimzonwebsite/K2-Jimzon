import test from 'node:test'
import assert from 'node:assert/strict'
import { getStoreCategory, storeCategoryEntries, resolveStoreCategoryName, applyStoreCategoryBatch } from '../src/lib/storeCategories.js'

const rows = [{ sku: 'a', name: 'Pasta', subcategory: 'Old' }, { sku: 'b', name: 'Sauce', subcategory: 'Old' }]
const version = '2026-10-22T00:00:00Z'
test('display categories preserve staff labels and fall back only to real taxonomy', () => {
  assert.equal(getStoreCategory({ subcategory: ' Fragrances ', categories: { name: 'Personal care' } }), 'Fragrances')
  assert.equal(getStoreCategory({ categories: { name: 'Pasta' } }), 'Pasta')
  assert.equal(getStoreCategory({ origin: 'Shopee|Imaginary' }), 'Uncategorised')
  assert.deepEqual(storeCategoryEntries([{ category: 'Pasta', stock: 0 }, { category: 'Pasta' }, {}]), [{ name: 'Pasta', count: 2 }])
  assert.deepEqual(storeCategoryEntries([]), [])
  assert.equal(resolveStoreCategoryName(' pasta ', [{ name: 'Pasta' }]), 'Pasta')
  assert.throws(() => resolveStoreCategoryName('All', []))
})
test('bulk updates are sequential, use current versions and send only the display field', async () => {
  const calls = []
  const result = await applyStoreCategoryBatch({ products: rows, category: 'New',
    read: async sku => ({ ok: true, product: { ...rows.find(p => p.sku === sku), updated_at: version } }),
    save: async payload => { calls.push(payload); return { ok: true } },
  })
  assert.equal(result.saved.length, 2)
  assert.equal(result.remaining.length, 0)
  assert.deepEqual(calls.map(p => p.patch), [{ subcategory: 'New' }, { subcategory: 'New' }])
  assert.deepEqual(calls.map(p => p.expectedUpdatedAt), [version, version])
})
test('uncertain write stops before later products and preserves unsent work', async () => {
  let calls = 0
  const result = await applyStoreCategoryBatch({ products: [...rows, { sku: 'c' }], category: 'New',
    read: async sku => ({ ok: true, product: { sku, subcategory: 'Old', updated_at: version } }),
    save: async () => ({ ok: ++calls === 1, error: 'Unconfirmed' }),
  })
  assert.equal(calls, 2)
  assert.deepEqual(result.saved, ['a'])
  assert.deepEqual(result.remaining.map(p => p.sku), ['b', 'c'])
  assert.match(result.error, /Unconfirmed/)
})
test('changed category, unreadable version and actor/unmount cancellation refuse further saves', async () => {
  for (const options of [
    { read: async sku => ({ ok: true, product: { sku, subcategory: 'Changed', updated_at: version } }) },
    { read: async sku => ({ ok: true, product: { sku, subcategory: 'Old', updated_at: null } }) },
    { isCurrent: () => false, read: async () => { throw Error('must not read') } },
  ]) {
    let saves = 0
    const result = await applyStoreCategoryBatch({ products: rows, category: 'New', save: async () => { saves++; return { ok: true } }, ...options })
    assert.equal(saves, 0)
    assert.equal(result.remaining.length, 2)
    assert.ok(result.error)
  }
})
