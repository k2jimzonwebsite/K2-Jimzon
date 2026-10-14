import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { classifyInstalledPermissions } from '../scripts/k2-installed-readiness.mjs'
import { classifyAdminPreauthDependency } from '../scripts/admin-preauth-readiness.mjs'
const current = JSON.parse(fs.readFileSync('docs/evidence/20261014-installed-readiness-permissions.json', 'utf8')).functions
const rate = { signature: 'public.consume_admin_preauth_rate_v1(p_action text, p_timestamp bigint, p_nonce uuid, p_ip_hash text, p_contact_hash text, p_signature text)', owner: 'postgres', definer: true, result: 'jsonb', publicExecute: false }
const triggers = current.filter(row => row.publicExecute)
test('only the approved signed pre-auth rate RPC may extend the installed permission profile', () => {
  const next = [...current, rate]
  assert.equal(classifyInstalledPermissions(next, triggers, next).state, 'verified')
  for (const drift of [{ signature: rate.signature + 'altered' }, { owner: 'anon' }, { definer: false }, { result: 'text' }, { publicExecute: true }]) {
    const changed = [...current, { ...rate, ...drift }]
    assert.equal(classifyInstalledPermissions(changed, triggers, changed).state, 'blocked')
  }
})
const bodySha256 = 'a'.repeat(64)
const privateTable = { owner: 'postgres', rls: true, forceRls: true, anonAccess: false, authenticatedAccess: false }
const routine = { ...rate, bodySha256, emptySearchPath: true, anonExecute: true, authenticatedExecute: false }
const snapshot = { routine, nonces: privateTable, buckets: privateTable }
test('normal readiness blocks the completely missing login dependency', () => {
  const absent = { routine: null, nonces: null, buckets: null }
  assert.equal(classifyAdminPreauthDependency(absent, bodySha256).state, 'blocked')
  assert.equal(classifyAdminPreauthDependency(absent, bodySha256, { preparedAbsent: true }).state, 'owner')
})
test('preparation mode cannot admit partial installation or grant/body drift', () => {
  for (const changed of [{ ...snapshot, routine: null }, { ...snapshot, nonces: null }, { ...snapshot, buckets: null }]) {
    assert.equal(classifyAdminPreauthDependency(changed, bodySha256, { preparedAbsent: true }).state, 'blocked')
  }
  for (const drift of [{ owner: 'anon' }, { definer: false }, { bodySha256: 'b'.repeat(64) }, { anonExecute: false }, { authenticatedExecute: true }, { publicExecute: true }, { emptySearchPath: false }]) {
    assert.equal(classifyAdminPreauthDependency({ ...snapshot, routine: { ...routine, ...drift } }, bodySha256, { preparedAbsent: true }).state, 'blocked')
  }
})
test('only exact installed rate authority and private forced RLS classify verified', () => {
  assert.equal(classifyAdminPreauthDependency(snapshot, bodySha256).state, 'verified')
  for (const drift of [{ owner: 'anon' }, { rls: false }, { forceRls: false }, { anonAccess: true }, { authenticatedAccess: true }]) {
    assert.equal(classifyAdminPreauthDependency({ ...snapshot, buckets: { ...privateTable, ...drift } }, bodySha256).state, 'blocked')
  }
})
test('incomplete metadata and invalid source hashes do not pass', () => {
  for (const value of [null, {}, { routine: null }, { routine: false, nonces: null, buckets: null }]) {
    assert.equal(classifyAdminPreauthDependency(value, bodySha256).state, 'blocked')
  }
  assert.equal(classifyAdminPreauthDependency(snapshot, '').state, 'blocked')
})
