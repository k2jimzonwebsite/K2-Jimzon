// Executed by the genuine image Node/package in a no-NIC guest; no DB client.
const fs = require('node:fs')
const assert = require('node:assert/strict')
const { loadMigrationFiles } = require('postgres-migrations')
const { validateMigrationHashes } = require('postgres-migrations/dist/validation')
;(async () => {
  const captured = JSON.parse(fs.readFileSync('/k2-storage-ledger.json'))
  const intended = await loadMigrationFiles('./migrations/tenant')
  const compared = intended.map(row => ({ id:row.id, name:row.name, hash:row.hash, capturedHash:captured[row.id]?.hash, nameMatches:captured[row.id]?.name === row.name }))
  const mismatch = compared.filter(row => row.hash !== row.capturedHash || !row.nameMatches)
  const ahead = captured.filter(row => row.id > intended.at(-1).id).map(row => ({ id:row.id, name:row.name }))
  assert.equal(captured.length,73)
  assert.equal(intended.length,70)
  assert.deepEqual(mismatch.map(row => row.id),[65])
  assert.equal(mismatch[0].nameMatches,true)
  assert.equal(mismatch[0].hash,'603c1c55658e982d35839001e2c2b59a50703904')
  assert.equal(mismatch[0].capturedHash,'da319c4b89ba800ce795d1b699f3a70675138058')
  assert.deepEqual(ahead.map(row => row.id),[70,71,72])
  let refusal
  try { validateMigrationHashes(intended,captured.slice(0,70)) } catch (error) { refusal=error.message }
  assert.match(refusal||'',/Hashes don't match/)
  assert.match(refusal,/0065-objects-key-version-index\.sql/)
  const output={capturedCount:captured.length,imageCount:intended.length,matchingCount:69,mismatch,ahead,validatorRefused:true,refusal,compared,scope:'Actual package migration loading/hash validation only; no connection, service startup, writes or schema compatibility acceptance'}
  console.log('K2_STORAGE_MIGRATION_AUDIT '+JSON.stringify(output))
  console.log('K2_STORAGE_MIGRATION_AUDIT_OK')
})().catch(error => { console.error(error.message); process.exitCode=1 })
