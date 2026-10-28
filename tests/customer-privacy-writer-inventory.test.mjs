import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Native metadata, never row contents. The fresh owned-rehearsal artifact is
// supplied explicitly; there is no provider/credential or automatic DB access.
test('writer inventory includes the complete declared catalog rather than only selected roots',
  { skip: !process.env.K2_PRIVACY_WRITER_INVENTORY }, () => {
  const file = process.env.K2_PRIVACY_WRITER_INVENTORY
  assert.ok(file, 'K2_PRIVACY_WRITER_INVENTORY must name an owned native metadata artifact')
  const inventory = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.ok(Array.isArray(inventory.catalogRelations), 'complete native catalog names are required')
  const names = inventory.relations.map(row => `${row.schema}.${row.name}`).sort()
  assert.deepEqual(names, [...new Set(inventory.catalogRelations)].sort())
  assert.equal(names.length, new Set(names).size)
  for (const name of ['public.guest_access_grant_scopes', 'k2_private.guest_account_claim_events',
    'public.pasabuy_events', 'public.pasabuy_quotes', 'k2_private.wholesale_inquiry_events',
    'k2_private.wholesale_inquiry_receipts', 'auth.mfa_factors', 'auth.mfa_amr_claims']) {
    assert.ok(names.includes(name), `missing actual subject/parent relation ${name}`)
  }
  for (const row of inventory.relations) {
    assert.ok(Array.isArray(row.columns) && row.columns.length > 0)
    assert.ok(Array.isArray(row.foreign_keys))
    assert.ok(Array.isArray(row.triggers))
  }
})
