import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { catalogValueHash } from './reference-catalog-contract.mjs'

export function assertAdminStockCatalogDelta(before, after, contract, source) {
  assert.equal(contract.version, 1)
  assert.equal(catalogValueHash(before), contract.beforeCanonicalSha256, 'Exact accepted base required')
  assert.equal(createHash('sha256').update(source).digest('hex'), contract.source.sha256, 'Exact read source required')
  assert.deepEqual({ ...before, functions: null }, { ...after, functions: null }, 'All other catalog fields retained')
  const old = new Map(before.functions.map(f => [f.identity, f]))
  const next = new Map(after.functions.map(f => [f.identity, f]))
  assert.equal(old.size, before.functions.length)
  assert.equal(next.size, after.functions.length)
  const signatures = ['public.read_admin_lot_snapshot_v1(p_sku text)', 'public.read_admin_product_stock_v1(p_skus text[])']
  assert.deepEqual(Object.keys(contract.functions).sort(), signatures)
  assert.deepEqual([...next.keys()].filter(key => !old.has(key)).sort(), signatures, 'Only both approved reads added')
  for (const [identity, original] of old) assert.deepEqual(next.get(identity), original, identity)
  for (const identity of signatures) {
    const f = next.get(identity)
    assert.equal(catalogValueHash(f), contract.functions[identity], identity)
    assert.equal(f.owner, 'postgres'); assert.equal(f.language, 'plpgsql')
    assert.equal(f.catalog.prosecdef, true); assert.equal(f.catalog.provolatile, 's')
    assert.deepEqual(f.catalog.proacl, ['postgres=X/postgres', 'authenticated=X/postgres'])
    assert.deepEqual(f.catalog.proconfig, ['search_path=""'])
  }
  assert.equal(catalogValueHash(after), contract.afterCanonicalSha256, 'Complete calibrated target required')
  return structuredClone(after)
}
