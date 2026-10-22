import test from 'node:test'
import assert from 'node:assert/strict'
import { fixedVariantDetails } from '../src/lib/productVariantOptions.js'

const api = await import('../src/lib/productFamilies.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {}
  throw error
})
const id = '11111111-1111-4111-8111-111111111111'
const products = ['a', 'b', 'c', 'hidden'].map((sku, index) => ({
  id: sku, sku, name: `Coffee ${sku}`, status: 'Live', published: true,
  srp: 200 + index * 100, stock: index === 2 ? 0 : 3,
}))
const rows = [
  { family_id: id, family_name: 'Coffee', axes: ['Flavour', 'Weight', 'Pack'], sku: 'a', options: { Flavour: 'Classic', Weight: '250 g', Pack: 'Bag' } },
  { family_id: id, family_name: 'Coffee', axes: ['Flavour', 'Weight', 'Pack'], sku: 'b', options: { Flavour: 'Classic', Weight: '500 g', Pack: 'Bag' } },
  { family_id: id, family_name: 'Coffee', axes: ['Flavour', 'Weight', 'Pack'], sku: 'c', options: { Flavour: 'Vanilla', Weight: '250 g', Pack: 'Bag' } },
]
function grouped(eligible = products.slice(0, 3), metadata = rows) {
  assert.equal(typeof api.attachProductFamilies, 'function', 'family linking is missing')
  return api.attachProductFamilies(eligible, metadata)
}
const payload = {
  familyId: id, expectedVersion: 0, name: 'Coffee', axes: ['Flavour', 'Weight'],
  members: [{ sku: 'a', options: { Flavour: 'Classic', Weight: '250 g' } }, { sku: 'b', options: { Flavour: 'Classic', Weight: '500 g' } }],
}

test('shows only dimensions with multiple actual values, and supports another real dimension', () => {
  const [product] = grouped()
  assert.deepEqual(api.variantDimensions(product).map(axis => axis.label), ['Flavour', 'Weight'])
  assert.deepEqual(fixedVariantDetails(product), [{ label: 'Pack', value: 'Bag' }])
  const extra = rows.map((row, i) => ({ ...row, options: { ...row.options, Pack: i === 2 ? 'Box' : 'Bag' } }))
  assert.deepEqual(api.variantDimensions(grouped(undefined, extra)[0]).map(axis => axis.label), ['Flavour', 'Weight', 'Pack'])
  assert.deepEqual(fixedVariantDetails(grouped(undefined, extra)[0]), [])
})

test('single visible variant and ordinary products have no variation controls', () => {
  const single = grouped(products.slice(0, 1))[0]
  assert.deepEqual(api.variantDimensions(single), [])
  assert.deepEqual(fixedVariantDetails(single), [
    { label: 'Flavour', value: 'Classic' },
    { label: 'Weight', value: '250 g' },
    { label: 'Pack', value: 'Bag' },
  ])
  assert.deepEqual(api.variantDimensions({ sku: 'ordinary' }), [])
})

test('metadata cannot introduce an unpublished or non-Website SKU', () => {
  const eligible = grouped(products.slice(0, 2), [...rows, { ...rows[0], sku: 'hidden', options: { Flavour: 'Secret', Weight: '1 kg', Pack: 'Box' } }])
  assert.deepEqual(eligible[0].family.members.map(member => member.sku), ['a', 'b'])
  assert.deepEqual(api.variantDimensions(eligible[0]).map(axis => axis.label), ['Weight'])
})

test('sparse choices name changed dimensions before selecting a different flavour', () => {
  const linked = grouped()
  const vanilla = linked.find(product => product.sku === 'c')
  const choice = api.variantDimensions(vanilla).find(axis => axis.label === 'Weight').choices.find(option => option.value === '500 g')
  assert.equal(choice.sku, 'b')
  assert.equal(choice.label, '500 g · Classic')
  assert.equal(choice.changedOtherDimensions, true)
  assert.equal(api.variantSummary(vanilla), 'Vanilla · 250 g · Bag')
})

test('search result grouping preserves the exact matching representative and complete family', () => {
  const linked = grouped()
  const direct = api.groupFamilyResults([linked[1], linked[0]])
  assert.equal(direct.length, 1)
  assert.equal(direct[0].sku, 'b')
  assert.equal(direct[0].family.members.length, 3)
  const seen = new Set()
  assert.equal(api.groupFamilyResults([linked[1]], seen).length, 1)
  assert.equal(api.groupFamilyResults([linked[0], linked[2]], seen).length, 0)
  assert.deepEqual(api.familyPriceRange(linked[1], linked, false), { min: 200, max: 400 })
})

test('malformed or duplicate family mappings fall back to separate existing products', () => {
  const linked = grouped(undefined, [rows[0], { ...rows[1], options: rows[0].options }])
  assert.ok(linked.every(product => !product.family))
  assert.deepEqual(products.map(product => product.sku), ['a', 'b', 'c', 'hidden'])
})

test('canonical commands reject fake axes, duplicate combinations and visually duplicate labels', () => {
  assert.equal(typeof api.validateFamilyPayload, 'function', 'family validator is missing')
  assert.deepEqual(api.validateFamilyPayload(payload), payload)
  for (const invalid of [
    { ...payload, stock: 20 }, { ...payload, expectedVersion: -1 },
    { ...payload, axes: ['Flavour', 'flavour'] },
    { ...payload, axes: ['Flavour', ' Weight'] },
    { ...payload, members: [payload.members[0], payload.members[0]] },
    { ...payload, members: [payload.members[0], { ...payload.members[1], options: payload.members[0].options }] },
    { ...payload, members: [{ ...payload.members[0], options: { Flavour: 'Classic' } }] },
    { ...payload, members: [{ ...payload.members[0], options: { Flavour: 'Classic', Weight: '250 g', Colour: 'Red' } }] },
    { ...payload, members: [payload.members[0], { ...payload.members[1], options: { Flavour: 'classic', Weight: '500 g' } }] },
  ]) assert.throws(() => api.validateFamilyPayload(invalid), /FAMILY_INVALID/)
  assert.doesNotThrow(() => api.validateFamilyPayload({ ...payload, members: [], axes: [] }))
})

test('joining families never changes SKU-specific facts, price or stock', () => {
  const before = structuredClone(products.slice(0, 3))
  const linked = grouped()
  for (const [i, product] of linked.entries()) {
    const { family, variantOptions, ...original } = product
    assert.deepEqual(original, before[i])
  }
  assert.deepEqual(products.slice(0, 3), before)
})
