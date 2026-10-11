import assert from 'node:assert/strict'
import { test } from 'node:test'
let parseStorageMigrationLedger
let qualifyStorageMigrationBoundary
try { ({ parseStorageMigrationLedger, qualifyStorageMigrationBoundary } = await import('../scripts/storage-migration-ledger.mjs')) } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error }
const row = (id, name) => `${id}\t${name}\t${'a'.repeat(40)}\t2026-01-01 00:00:00`
const dump = rows => `COPY storage.migrations (id, name, hash, executed_at) FROM stdin;\n${rows.join('\n')}\n\\.\nCOPY auth.users FROM stdin;\nprivate-data\n\\.\n`
test('extracts only ordered migration metadata from captured dump', () => {
  assert.equal(typeof parseStorageMigrationLedger, 'function')
  assert.deepEqual(parseStorageMigrationLedger(dump([row(1,'initialmigration'),row(0,'create-migrations-table')])), [{id:0,name:'create-migrations-table',hash:'a'.repeat(40)},{id:1,name:'initialmigration',hash:'a'.repeat(40)}])
})
const captured=[{id:0,name:'zero',hash:'a'.repeat(40)},{id:1,name:'one',hash:'b'.repeat(40)}]
test('admits only a complete matching captured boundary and reports later migrations',()=>{
  assert.equal(typeof qualifyStorageMigrationBoundary,'function')
  assert.deepEqual(qualifyStorageMigrationBoundary(captured,[...captured,{id:2,name:'later',hash:'c'.repeat(40)}],'one'),{freezeAt:'one',capturedCount:2,pending:[{id:2,name:'later'}]})
})
for(const [name,intended,freeze] of [
  ['lower boundary',captured,'zero'],
  ['missing captured migration',captured.slice(0,1),'one'],
  ['changed historical hash',[captured[0],{...captured[1],hash:'c'.repeat(40)}],'one'],
  ['changed historical name',[captured[0],{...captured[1],name:'renamed'}],'one'],
])test(`boundary refuses ${name}`,()=>{
  assert.equal(typeof qualifyStorageMigrationBoundary,'function')
  assert.throws(()=>qualifyStorageMigrationBoundary(captured,intended,freeze))
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
