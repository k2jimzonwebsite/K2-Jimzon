import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'

const modulePath = new URL('./storefront-view-source.mjs', import.meta.url)
assert.ok(fs.existsSync(modulePath), 'Narrow Website source extraction is not implemented')
const { storefrontViewSource } = await import(modulePath.href)
const migration = fs.readFileSync('supabase/migrations/20260929_channel_listing_slices.sql', 'utf8')
const source = storefrontViewSource(migration)
assert.equal(Buffer.byteLength(source), 852)
assert.equal(createHash('sha256').update(source).digest('hex'), 'e53121367315cf371b3effc67b83b444d2ea16bf75335bce0b976f0694b856a6')
assert.ok(!/channel_shops|channel_shop_allocations|net_weight_g|trigger|begin;|commit;/i.test(source))
assert.throws(() => storefrontViewSource(migration.replace('p.published is true', 'true')), /SOURCE_DRIFT/)
assert.throws(() => storefrontViewSource(migration + source), /UNIQUE_ANCHORS/)
assert.throws(() => storefrontViewSource(migration.replace('create or replace view public.v_storefront_visible_skus', '-- omitted view')), /UNIQUE_ANCHORS/)
assert.throws(() => storefrontViewSource(migration.replace('grant select on table public.v_storefront_visible_skus to anon, authenticated;', '-- omitted grant')), /UNIQUE_ANCHORS/)
console.log(JSON.stringify({ checks: 7, passed: 7, providerWrites: false }))
