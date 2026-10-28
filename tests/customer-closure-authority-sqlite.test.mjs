import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createGenesisState, createDecisionCore, canonicalJson } from '../server/privacy-authority/state.js'
import { createSqliteWitness } from '../server/privacy-authority/sqlite-witness.js'

const genesisId = '90000000-0000-4000-8000-000000000002', projectRef = 'pixplcjqivlfflickobf'
const actorId = '10000000-0000-4000-8000-000000000001', requestId = '60000000-0000-4000-8000-000000000001'
// Native SQLite exercises the actual SQL/transactions. This thin facade maps
// Node's API to the documented synchronous Durable Object SQL surface only.
function nativeStorage(file) {
  const db = new DatabaseSync(file)
  const storage = {
    sql: { exec(sql, ...bindings) {
      if (storage.beforeExec) storage.beforeExec(sql)
      const statement = db.prepare(sql)
      const rows = statement.columns().length ? statement.all(...bindings) : (statement.run(...bindings), [])
      return { toArray: () => rows }
    } },
    transactionSync(callback) {
      if (storage.beforeTransaction) storage.beforeTransaction()
      db.exec('BEGIN IMMEDIATE')
      try { const result = callback(); db.exec('COMMIT'); return result }
      catch (error) { db.exec('ROLLBACK'); throw error }
    },
    close: () => db.close(),
    sync: async () => {},
  }
  return storage
}
function fixture(t) {
  const folder = mkdtempSync(join(tmpdir(), 'k2-closure-witness-')), file = join(folder, 'witness.sqlite')
  const opened = []
  t.after(() => { for (const storage of opened) storage.close(); rmSync(folder, { recursive: true, force: true }) })
  return { open() { const storage = nativeStorage(file); opened.push(storage); return storage } }
}
async function registered(actor = actorId, request = requestId) {
  const core = createDecisionCore({ genesisId, commandStore: { claim: async (_key, bytes) => bytes },
    verifyCommand: (c, x) => ({ verified: true, projectRef, genesisId, purpose: c.kind, commandHash: x.commandHash,
      intent: x.intent, generation: c.generation, role: 'customer', principalId: actor, identityVerified: true }) })
  const initial = await createGenesisState(genesisId)
  const prepared = await core.prepare(initial, { version: 2, projectRef, genesisId, generation: 1,
    operationId: '70000000-0000-4000-8000-000000000001', kind: 'register', payload: { actorId: actor, requestId: request, receiptHash: 'a'.repeat(64) } })
  return { core, initial, current: await core.applyCommitted(initial, prepared.candidate) }
}

test('native SQLite witness persists complete exact state and receipt across a new connection', async t => {
  const f = fixture(t), first = createSqliteWitness({ storage: f.open(), genesisId })
  assert.equal(await first.read(), null)
  const { current } = await registered()
  await first.advance(current)
  const reopened = createSqliteWitness({ storage: f.open(), genesisId })
  assert.equal(canonicalJson(await reopened.read()), canonicalJson(current))
})

test('native transaction rollback cannot publish partial maps with a newer control head', async t => {
  const f = fixture(t), storage = f.open(), witness = createSqliteWitness({ storage, genesisId })
  const { initial, current } = await registered(); await witness.advance(initial)
  storage.beforeExec = sql => { if (sql.startsWith('INSERT INTO closure_operations')) throw new Error('Synthetic disk failure') }
  await assert.rejects(witness.advance(current))
  storage.beforeExec = undefined
  const reopened = createSqliteWitness({ storage: f.open(), genesisId })
  assert.equal(canonicalJson(await reopened.read()), canonicalJson(initial))
  await reopened.advance(current)
  assert.equal(canonicalJson(await witness.read()), canonicalJson(current))
})

test('native witness refuses forks, namespace changes and derived-state corruption; stale advance cannot roll back', async t => {
  const f = fixture(t), witness = createSqliteWitness({ storage: f.open(), genesisId })
  const { initial, current } = await registered(); await witness.advance(current)
  assert.deepEqual(await witness.advance(initial), current)
  await assert.rejects(witness.advance({ ...current, hash: 'f'.repeat(64) }))
  await assert.rejects(witness.advance({ ...current, requests: {} }))
  await assert.rejects(witness.advance({ ...current, projectRef: 'unrelated' }))
  const wrongNamespace = createSqliteWitness({ storage: f.open(), genesisId: '90000000-0000-4000-8000-000000000003' })
  await assert.rejects(wrongNamespace.read())
  assert.deepEqual(await witness.read(), current)
})

test('a newer internally valid fork cannot replace the witnessed history', async t => {
  const f = fixture(t), witness = createSqliteWitness({ storage: f.open(), genesisId })
  const original = await registered(); await witness.advance(original.current)
  const otherActor = randomUUID(), otherRequest = randomUUID(), fork = await registered(otherActor, otherRequest)
  const decision = await fork.core.prepare(fork.current, { version: 2, projectRef, genesisId, generation: 1,
    operationId: randomUUID(), kind: 'cancel', payload: { actorId: otherActor, requestId: otherRequest } })
  const newer = await fork.core.applyCommitted(fork.current, decision.candidate)
  await assert.rejects(witness.advance(newer))
  assert.deepEqual(await witness.read(), original.current)
})

test('a corrupt existing witness is not silently replaced by a valid newer state', async t => {
  const f = fixture(t), storage = f.open(), witness = createSqliteWitness({ storage, genesisId })
  const { initial, current } = await registered(); await witness.advance(initial)
  storage.sql.exec('UPDATE closure_control SET body = ? WHERE id = 1', canonicalJson({ ...initial, checksum: 'f'.repeat(64) }))
  await assert.rejects(witness.advance(current))
  await assert.rejects(witness.read())
})

test('legitimate advancement during checkpoint validation returns pending without a false fork', async t => {
  const f = fixture(t), storage = f.open(), witness = createSqliteWitness({ storage, genesisId })
  const { core, initial, current } = await registered(); await witness.advance(initial)
  const prepared = await core.prepare(current, { version: 2, projectRef, genesisId, generation: 1,
    operationId: randomUUID(), kind: 'cancel', payload: { actorId, requestId } })
  const next = await core.applyCommitted(current, prepared.candidate)
  let transactions = 0
  storage.beforeTransaction = () => {
    if (++transactions !== 2) return
    const other = f.open()
    other.transactionSync(() => {
      const { requests, actors, operations, protections, ...control } = current
      other.sql.exec('UPDATE closure_control SET body = ? WHERE id = 1', canonicalJson(control))
      for (const [table, rows] of [['closure_requests', requests], ['closure_actors', actors], ['closure_operations', operations], ['closure_protections', protections]]) {
        for (const [id, body] of Object.entries(rows)) other.sql.exec(`INSERT INTO ${table} (id, body) VALUES (?, ?)`, id, canonicalJson(body))
      }
    })
  }
  await assert.rejects(witness.advance(next), error => error.code === 'AUTHORITY_PENDING')
  storage.beforeTransaction = undefined
  assert.deepEqual(await witness.read(), current)
  await witness.advance(next)
  assert.deepEqual(await witness.read(), next)
})

test('native protection rows persist across reopen and roll back atomically with their head', async t => {
  const f = fixture(t), storage = f.open(), witness = createSqliteWitness({ storage, genesisId })
  const { current } = await registered(); await witness.advance(current)
  const payload = { actorId, requestId, customerId: randomUUID(), protectionId: randomUUID(), kind: 'legal',
    nativeIntentHash: 'a'.repeat(64), initiatorId: randomUUID(), initiatorRole: 'admin' }
  const core = createDecisionCore({ genesisId, commandStore: { claim: async (_key, bytes) => bytes },
    verifyCommand: (c, x) => ({ verified: true, projectRef, genesisId, commandHash: x.commandHash, generation: 1,
      purpose: c.kind, intent: x.intent, principalId: payload.initiatorId, role: 'admin', adminHoldAuthorized: true,
      holdIntentCommitted: true, protection: { ...payload, generation: 1 } }) })
  const prepared = await core.prepare(current, { version: 2, projectRef, genesisId, generation: 1,
    operationId: randomUUID(), kind: 'protect', payload })
  const protectedState = await core.applyCommitted(current, prepared.candidate)
  storage.beforeExec = sql => { if (sql.startsWith('INSERT INTO closure_protections')) throw new Error('Synthetic protection-table disk failure') }
  await assert.rejects(witness.advance(protectedState))
  storage.beforeExec = undefined
  assert.deepEqual(await witness.read(), current)
  await witness.advance(protectedState)
  const reopened = createSqliteWitness({ storage: f.open(), genesisId })
  assert.deepEqual(await reopened.read(), protectedState)
})
