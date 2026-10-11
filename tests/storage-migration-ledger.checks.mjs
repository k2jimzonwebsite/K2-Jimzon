import assert from 'node:assert/strict'
import { test } from 'node:test'
let parseStorageMigrationLedger
try { ({ parseStorageMigrationLedger } = await import('../scripts/storage-migration-ledger.mjs')) } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error }
const row = (id, name) => `${id}\t${name}\t${'a'.repeat(40)}\t2026-01-01 00:00:00`
const dump = rows => `COPY storage.migrations (id, name, hash, executed_at) FROM stdin;\n${rows.join('\n')}\n\\.\nCOPY auth.users FROM stdin;\nprivate-data\n\\.\n`
test('extracts only ordered migration metadata from captured dump', () => {
  assert.equal(typeof parseStorageMigrationLedger, 'function')
  assert.deepEqual(parseStorageMigrationLedger(dump([row(1,'initialmigration'),row(0,'create-migrations-table')])), [{id:0,name:'create-migrations-table',hash:'a'.repeat(40)},{id:1,name:'initialmigration',hash:'a'.repeat(40)}])
})
for (const [name, source] of [
  ['missing ledger', 'SELECT 1;'],
  ['repeated ledger', dump([row(0,'zero')])+dump([row(0,'zero')])],
  ['unterminated ledger', dump([row(0,'zero')]).replaceAll('\\.\n','')],
  ['duplicate IDs', dump([row(0,'zero'),row(0,'other')])],
  ['gap in IDs', dump([row(0,'zero'),row(2,'two')])],
  ['malformed hash', dump([row(0,'zero').replace('a'.repeat(40),'invalid')])],
]) test(`refuses ${name}`, () => {
  assert.equal(typeof parseStorageMigrationLedger, 'function')
  assert.throws(() => parseStorageMigrationLedger(source))
})
