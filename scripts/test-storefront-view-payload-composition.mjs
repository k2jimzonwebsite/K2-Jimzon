// Pure qualification of real generated inputs; stops before any fixture write.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { storefrontViewSource } from './storefront-view-source.mjs'
import { providerOperatingReplayPackage } from '../docs/evidence/20261004-category-shelf-life/operating-replay-package.mjs'
const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const source = fs.readFileSync(root + '/prepare-oci-imported74.mjs', 'utf8')
assert.equal(hash(source), 'a58147e7e808596e2bcd3a2702ed4291a05f173f00071ab274a123902218d0b8')
const anchor = 'const pkg=providerOperatingReplayPackage('
assert.equal(source.split(anchor).length, 2)
assert.ok(source.indexOf(anchor) < source.indexOf('fs.mkdirSync'))
let captured
globalThis.captureViewInputs = input => { captured = input; throw Error('PURE_INPUT_CAPTURED') }
try {
  await import('data:text/javascript;base64,' + Buffer.from(source.replace(anchor, 'const pkg=globalThis.captureViewInputs(')).toString('base64'))
  assert.fail('Must stop before fixture preparation')
} catch (error) {
  assert.equal(error.message, 'PURE_INPUT_CAPTURED')
} finally {
  delete globalThis.captureViewInputs
}
assert.equal(captured.fragments.length, 14)
assert.equal(hash(captured.fragments.slice(0, -1).join('\n')), '71f0b7b7a4e7b9471276f32f78334804a33daa05f53bbd1914cee9819a79fae3')
assert.equal(hash(captured.fragments.join('\n')), 'dbe948fa5a92302dfd7a53691254f2029ba5164baa39b0cc1a9277d088b4e236')
assert.equal(captured.fragments.at(-1), storefrontViewSource(fs.readFileSync('supabase/migrations/20260929_channel_listing_slices.sql', 'utf8')))
assert.deepEqual(captured.after, JSON.parse(fs.readFileSync(root + '/oci-imported73/execution01/calibrated-catalog.json')))
const next = providerOperatingReplayPackage(captured)
const base = providerOperatingReplayPackage({ ...captured, fragments: captured.fragments.slice(0, -1),
  after: JSON.parse(fs.readFileSync(root + '/oci-imported56/execution01/after-catalog.json')) })
assert.equal(hash(base.sql), 'e6eda8085254f27f0dd30c01f77c3a53bfc4a1652c59ad472a68558079bab052')
assert.deepEqual(next.cutoverTables, base.cutoverTables)
assert.deepEqual(next.protectedPlatformTables, base.protectedPlatformTables)
assert.ok(next.sql.includes("set local lock_timeout='2s';set local statement_timeout='10s';"))
assert.throws(() => providerOperatingReplayPackage({ ...captured, fragments: [...captured.fragments, '-- unreviewed'] }), /CONTENTS_DRIFT/)
assert.throws(() => providerOperatingReplayPackage({ ...captured, fragments: captured.fragments.slice(0, -1).concat(captured.fragments.at(-1).replace('p.published is true', 'true')) }), /CONTENTS_DRIFT/)
console.log(JSON.stringify({ passed: true, fragments: 14, defaultSqlByteIdentical: true,
  contentsSha256: hash(captured.fragments.join('\n')), sqlSha256: hash(next.sql), sqlBytes: Buffer.byteLength(next.sql), providerWrites: false }))
