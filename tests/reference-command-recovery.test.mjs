import test from 'node:test'
import assert from 'node:assert/strict'

const recovery = await import('../src/lib/referenceCommandRecovery.js').catch(() => null)
const actor = '89300000-0000-4000-8000-000000000001'
const other = '89300000-0000-4000-8000-000000000002'
const key = '89310000-0000-4000-8000-000000000001'
const next = '89310000-0000-4000-8000-000000000002'
const payload = '{ "reason":"Reviewed supplier catalogue", "name":"  Caffè\u00a0Italia  ", "parentId":null, "kind":"brand" }'
const storage = () => {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), values }
}

test('protected creation has durable actor-scoped recovery', () => {
  assert.equal(typeof recovery?.holdPendingReference, 'function', 'Durable reference recovery is missing')
})

test('reload restores exact literal request bytes and the same key', { skip: !recovery }, () => {
  const store = storage()
  const held = recovery.holdPendingReference(actor, key, payload, store)
  assert.deepEqual(recovery.readPendingReference(actor, store), held)
  assert.equal(held.payloadText, payload)
  assert.equal(held.key, key)
  assert.deepEqual(Object.keys(held).sort(), ['actorId', 'key', 'payloadText', 'state'])
  assert.equal(held.state, 'pending')
})

test('unknown outcome blocks a new key or changed request without destroying recovery', { skip: !recovery }, () => {
  const store = storage()
  recovery.holdPendingReference(actor, key, payload, store)
  assert.throws(() => recovery.holdPendingReference(actor, next, payload, store), /pending/i)
  assert.throws(() => recovery.holdPendingReference(actor, key, payload.replace('Italia', 'Roma'), store), /pending/i)
  assert.equal(recovery.readPendingReference(actor, store).payloadText, payload)
})

test('another actor cannot resume or erase the saved operation', { skip: !recovery }, () => {
  const store = storage()
  recovery.holdPendingReference(actor, key, payload, store)
  assert.equal(recovery.readPendingReference(other, store), null)
  assert.equal(recovery.clearPendingReference(other, key, store), false)
  assert.equal(recovery.readPendingReference(actor, store).key, key)
})

test('only acknowledgement of the matching operation clears it', { skip: !recovery }, () => {
  const store = storage()
  recovery.holdPendingReference(actor, key, payload, store)
  assert.equal(recovery.clearPendingReference(actor, next, store), false)
  assert.equal(recovery.clearPendingReference(actor, key, store), true)
  assert.equal(recovery.readPendingReference(actor, store), null)
})

test('corrupt or foreign-actor storage fails closed and remains available for recovery', { skip: !recovery }, () => {
  const store = storage()
  recovery.holdPendingReference(actor, key, payload, store)
  const address = [...store.values.keys()][0]
  for (const damaged of ['{', JSON.stringify({ actorId: other, key, payloadText: payload, state: 'pending' }), JSON.stringify({ actorId: actor, key, payloadText: payload, state: 'pending', token: 'fabricated' })]) {
    store.setItem(address, damaged)
    assert.throws(() => recovery.readPendingReference(actor, store), /restored safely/i)
    assert.throws(() => recovery.clearPendingReference(actor, key, store), /restored safely/i)
    assert.equal(store.getItem(address), damaged)
  }
})

test('invalid payloads or failed storage never produce a usable held command', { skip: !recovery }, () => {
  const store = storage()
  for (const body of [null, { kind: 'brand', name: 'A', parentId: other, reason: 'Reviewed brand' }, { kind: 'category', name: 'A', parentId: 'bad', reason: 'Reviewed category' }, { kind: 'brand', name: '\tA', parentId: null, reason: 'Reviewed brand' }, { kind: 'brand', name: 'A', parentId: null, reason: 'short' }, { kind: 'brand', name: 'A', parentId: null, reason: 'Reviewed brand', extra: true }]) {
    assert.throws(() => recovery.holdPendingReference(actor, key, JSON.stringify(body), store))
    assert.equal(recovery.readPendingReference(actor, store), null)
  }
  assert.throws(() => recovery.holdPendingReference(actor, key, payload, { ...store, setItem() {} }), /Nothing was sent/i)
  assert.throws(() => recovery.holdPendingReference(actor, key, '\t'.repeat(8080) + payload, store), /Nothing was sent/i)
  assert.equal(store.values.size, 0, 'An oversized escaped record must not be persisted as an unreadable operation')
  assert.throws(() => recovery.readPendingReference('', store))
})
