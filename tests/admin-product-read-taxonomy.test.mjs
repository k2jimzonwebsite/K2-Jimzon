import test from 'node:test'
import assert from 'node:assert/strict'
import { readAdminProducts } from '../prepared-api/admin/products.js'

const assigned = {
  sku: 'synthetic-assigned', name: 'Synthetic assigned product', status: 'Draft',
  brand_id: '11111111-1111-4111-8111-111111111111',
  category_id: '22222222-2222-4222-8222-222222222222',
}
const unassigned = { sku: 'synthetic-unassigned', name: 'Synthetic unassigned product', status: 'Draft', brand_id: null, category_id: null }

// Model PostgREST's projection: unselected columns cannot accidentally pass by
// leaking fixture fields. Authorization is tested by the genuine local witness.
function client(stockError = null) {
  return { from(table) {
    let fields
    const query = {
      select(value) { fields = value.split(','); return query },
      order() { return query },
      async limit() {
        if (table === 'products') return { data: [assigned, unassigned].map(row => Object.fromEntries(fields.map(field => [field, row[field]]))), error: null }
        assert.equal(table, 'v_product_stock_from_batches')
        return { data: stockError ? null : [{ sku: assigned.sku, stock_from_batches: 4 }, { sku: unassigned.sku, stock_from_batches: 0 }], error: stockError }
      },
    }
    return query
  } }
}

test('protected catalog preserves canonical assigned and nullable unassigned taxonomy', async () => {
  const result = await readAdminProducts(client())
  assert.deepEqual(result.products.map(row => ({ sku: row.sku, brand_id: row.brand_id, category_id: row.category_id })), [assigned, unassigned].map(({ sku, brand_id, category_id }) => ({ sku, brand_id, category_id })))
  assert.deepEqual(result.products.map(row => row.stock_available), [4, 0])
  assert.deepEqual(result.unavailable, [])
})

test('stock failure preserves canonical taxonomy while reporting unknown stock', async () => {
  const result = await readAdminProducts(client({ code: 'synthetic-unavailable' }))
  assert.equal(result.products[0].brand_id, assigned.brand_id)
  assert.equal(result.products[0].category_id, assigned.category_id)
  assert.equal(result.products[1].brand_id, null)
  assert.equal(result.products[1].category_id, null)
  assert.ok(result.products.every(row => row.stock_available === null))
  assert.deepEqual(result.unavailable, [{ key: 'stock', code: 'QUERY_UNAVAILABLE' }])
})
