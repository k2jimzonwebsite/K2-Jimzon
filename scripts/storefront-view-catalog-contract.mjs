// MAP-018 / IDEA-20261009-11. Constrain actual metadata, without new listing logic.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { catalogValueHash } from './reference-catalog-contract.mjs'
import { storefrontViewSource } from './storefront-view-source.mjs'

export function assertStorefrontViewCatalogDelta(before, after, contract, migration) {
  const name = 'public.v_storefront_visible_skus'
  assert.equal(contract.version, 1)
  assert.equal(contract.source.file, 'supabase/migrations/20260929_channel_listing_slices.sql')
  const source = storefrontViewSource(migration)
  assert.equal(contract.source.sha256, createHash('sha256').update(source).digest('hex'))
  assert.equal(contract.source.bytes, Buffer.byteLength(source))
  assert.equal(catalogValueHash(before), contract.beforeCanonicalSha256, 'Exact accepted installer56 catalog required')
  assert.deepEqual({ ...before, relations: null, types: null }, { ...after, relations: null, types: null },
    'Every other catalog field retained')
  for (const field of ['relations', 'types']) {
    const old = new Map(before[field].map(value => [value.name, value]))
    const next = new Map(after[field].map(value => [value.name, value]))
    assert.equal(old.size, before[field].length, 'Duplicate starting identities refused')
    assert.equal(next.size, after[field].length, 'Duplicate target identities refused')
    const additions = field === 'types' ? ['public._v_storefront_visible_skus', name] : [name]
    assert.deepEqual([...next.keys()].filter(key => !old.has(key)).sort(), additions, 'Only the approved view/composite/array added')
    for (const [identity, original] of old) assert.deepEqual(next.get(identity), original, identity)
    assert.deepEqual(Object.keys(contract[field]).sort(), additions, 'Only the approved additions may be pinned')
    for (const identity of additions) {
      assert.equal(catalogValueHash(next.get(identity)), contract[field][identity], 'Exact native addition metadata required')
    }
  }
  const view = after.relations.find(value => value.name === name)
  assert.equal(view.kind, 'v'); assert.equal(view.owner, 'postgres')
  assert.deepEqual(view.options, ['security_invoker=false', 'security_barrier=true'])
  assert.deepEqual(view.acl, ['anon=r/postgres', 'authenticated=r/postgres',
    'postgres=arwdDxtm/postgres', 'service_role=arwdDxtm/postgres'])
  assert.deepEqual(view.columns.map(column => [column.name, column.type]), [['sku', 'character varying']])
  for (const field of ['policies', 'rules', 'triggers', 'internalTriggers', 'indexes', 'constraints', 'parents']) {
    assert.deepEqual(view[field], [], field)
  }
  assert.equal(view.rls, false); assert.equal(view.forceRls, false)
  const type = after.types.find(value => value.name === name)
  assert.equal(type.owner, 'postgres'); assert.equal(type.relation, name); assert.equal(type.catalog.typtype, 'c')
  const array = after.types.find(value => value.name === 'public._v_storefront_visible_skus')
  assert.equal(array.owner, 'postgres'); assert.equal(array.element, name); assert.equal(array.catalog.typtype, 'b')
  assert.equal(type.array, name + '[]')
  assert.equal(catalogValueHash(after), contract.afterCanonicalSha256, 'Complete calibrated target required')
  return structuredClone(after)
}
