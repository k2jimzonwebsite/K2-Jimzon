import test from 'node:test'
import assert from 'node:assert/strict'
import { readAdminProducts } from '../prepared-api/admin/products.js'

const product = { sku: 'synthetic-internal-draft', name: 'Synthetic internal Draft', status: 'Draft', category_id: '22222222-2222-4222-8222-222222222222' }
function client(stock = { data: [{ sku: product.sku, stock_from_batches: 6 }], error: null }) {
  return {
    from(table) {
      const query = { select() { return query }, order() { return query }, async limit() {
        if (table === 'products') return { data: [product], error: null }
        assert.equal(table, 'v_product_stock_from_batches')
        // Correct public behavior: unpublished Drafts are not Website offers.
        return { data: [], error: null }
      } }
      return query
    },
    async rpc(name, args) {
      assert.equal(name, 'read_admin_product_stock_v1')
      assert.deepEqual(args, { p_skus: [product.sku] })
      return stock
    },
  }
}
test('internal Draft receives canonical staff stock even when public offer is absent', async () => {
  const result = await readAdminProducts(client())
  assert.equal(result.products[0].stock_available, 6)
  assert.deepEqual(result.unavailable, [])
})
test('a complete no-lot staff row proves zero without inferring it from an absent public offer', async () => {
  const result = await readAdminProducts(client({ data: [{ sku: product.sku, stock_from_batches: 0 }], error: null }))
  assert.equal(result.products[0].stock_available, 0)
  assert.deepEqual(result.unavailable, [])
})
for (const [name, stock] of [
  ['missing row', { data: [], error: null }],
  ['unreadable taxonomy', { data: [{ sku: product.sku, stock_from_batches: null }], error: null }],
  ['fractional quantity', { data: [{ sku: product.sku, stock_from_batches: 1.5 }], error: null }],
  ['duplicate row', { data: [{ sku: product.sku, stock_from_batches: 6 }, { sku: product.sku, stock_from_batches: 7 }], error: null }],
  ['query failure', { data: null, error: { code: 'synthetic-unavailable' } }],
]) test(`${name} preserves product discovery and explicit unknown stock`, async () => {
  const result = await readAdminProducts(client(stock))
  assert.equal(result.products[0].sku, product.sku)
  assert.equal(result.products[0].stock_available, null)
  assert.deepEqual(result.unavailable, [{ key: 'stock', code: 'QUERY_UNAVAILABLE' }])
})
