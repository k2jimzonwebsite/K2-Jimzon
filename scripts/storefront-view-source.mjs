// MAP-018 / IDEA-20261009-11. Reuse the sole migration-defined listing projection.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export function storefrontViewSource(migration) {
  const start = 'create or replace view public.v_storefront_visible_skus'
  const end = 'grant select on table public.v_storefront_visible_skus to anon, authenticated;'
  assert.equal(migration.split(start).length, 2, 'WEBSITE_VIEW_UNIQUE_ANCHORS_REQUIRED')
  assert.equal(migration.split(end).length, 2, 'WEBSITE_VIEW_UNIQUE_ANCHORS_REQUIRED')
  const source = migration.slice(migration.indexOf(start), migration.indexOf(end) + end.length)
  assert.equal(createHash('sha256').update(source).digest('hex'),
    'e53121367315cf371b3effc67b83b444d2ea16bf75335bce0b976f0694b856a6', 'WEBSITE_VIEW_SOURCE_DRIFT')
  return source
}
