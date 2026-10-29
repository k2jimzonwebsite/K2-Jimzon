import test from 'node:test'
import assert from 'node:assert/strict'
import { readAdminProducts } from '../prepared-api/admin/products.js'

const assigned = {
  sku: 'synthetic-assigned', name: 'Synthetic assigned product', status: 'Draft', is_human_reviewed: true,
  brand_id: '11111111-1111-4111-8111-111111111111',
  category_id: '22222222-2222-4222-8222-222222222222',
  categories: { name: 'Pasta' },
  primary_image_url: 'https://media.example/primary.png',
  lifestyle_images: ['https://media.example/after.png'],
  secondary_images: ['https://media.example/side.png', 'https://media.example/back.png'],
}
const unassigned = { sku: 'synthetic-unassigned', name: 'Synthetic unassigned product', status: 'Draft', brand_id: null, category_id: null }

// Model PostgREST's projection: unselected columns cannot accidentally pass by
// leaking fixture fields. Authorization is tested by the genuine local witness.
function client(stockError = null) {
  return { async rpc(name) {
    assert.equal(name, 'read_admin_product_stock_v1')
    return { data: stockError ? null : [{ sku: assigned.sku, stock_from_batches: 4 }, { sku: unassigned.sku, stock_from_batches: 0 }], error: stockError }
  }, from(table) {
    let fields
    const query = {
      select(value) { fields = value.split(',').map(field => field === 'categories(name)' ? 'categories' : field); return query },
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

test('packing warnings use the canonical human-review flag instead of warning on every product', async () => {
  const { products } = await readAdminProducts(client())
  assert.equal(products[0].is_human_reviewed, true)
  assert.equal(products[1].is_human_reviewed, false)
})

test('category filters can use the canonical name when no store label is assigned', async () => {
  const { products } = await readAdminProducts(client())
  assert.equal(products[0].category_name, 'Pasta')
  assert.equal(products[1].category_name, null)
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

test('protected catalog retains every saved photo slot for reopening the photo manager', async () => {
  const { products } = await readAdminProducts(client())
  assert.equal(products[0].primary_image_url, assigned.primary_image_url)
  assert.deepEqual(products[0].lifestyle_images, assigned.lifestyle_images)
  assert.deepEqual(products[0].secondary_images, assigned.secondary_images)
  assert.equal(products[1].primary_image_url, null)
  assert.deepEqual(products[1].lifestyle_images, [])
  assert.deepEqual(products[1].secondary_images, [])
})

test('stock failure does not hide saved after-use or supporting photos', async () => {
  const { products, unavailable } = await readAdminProducts(client({ code: 'synthetic-unavailable' }))
  assert.deepEqual(products[0].lifestyle_images, assigned.lifestyle_images)
  assert.deepEqual(products[0].secondary_images, assigned.secondary_images)
  assert.deepEqual(unavailable, [{ key: 'stock', code: 'QUERY_UNAVAILABLE' }])
})
