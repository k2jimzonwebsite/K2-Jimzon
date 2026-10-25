import test from 'node:test'
import assert from 'node:assert/strict'

const recovery = await import('../src/lib/productMasterCommandRecovery.js').catch(() => null)
const actor = '89300000-0000-4000-8000-000000000001'
const other = '89300000-0000-4000-8000-000000000002'
const key = '89310000-0000-4000-8000-000000000001'
const next = '89310000-0000-4000-8000-000000000002'
const body = { action: 'update', payload: { sku: 'DUMMY-REVIEW', patch: { name: ' Caffè Italia ', is_human_reviewed: true }, expectedUpdatedAt: '2026-10-12T00:00:00Z', reason: 'Reviewed current product facts' } }
const payloadText = ' ' + JSON.stringify(body, null, 1) + '\n'
const storage = () => {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), values }
}

test('Product Master updates have durable actor-scoped recovery', () => {
  assert.equal(typeof recovery?.holdPendingProductMaster, 'function', 'Durable Product Master recovery is missing')
})
test('reload preserves literal bytes version reason and original key', { skip: !recovery }, () => {
  const store = storage(), held = recovery.holdPendingProductMaster(actor, key, payloadText, store)
  assert.deepEqual(recovery.readPendingProductMaster(actor, store), held)
  assert.equal(held.payloadText, payloadText); assert.equal(held.key, key)
  assert.deepEqual(Object.keys(held).sort(), ['actorId','key','payloadText','state'])
  assert.equal(held.state, 'pending')
})
test('changed key payload version or review decision cannot replace unknown request', { skip: !recovery }, () => {
  const store = storage(); recovery.holdPendingProductMaster(actor, key, payloadText, store)
  for (const [k,p] of [[next,payloadText], [key,payloadText.replace('true','false')], [key,payloadText.replace('00:00:00','00:00:01')], [key,payloadText.trim()]]) {
    assert.throws(() => recovery.holdPendingProductMaster(actor,k,p,store), /pending/i)
    assert.equal(recovery.readPendingProductMaster(actor,store).payloadText, payloadText)
  }
})
test('actor and operation identity isolate reading and acknowledgement', { skip: !recovery }, () => {
  const store=storage(); recovery.holdPendingProductMaster(actor,key,payloadText,store)
  assert.equal(recovery.readPendingProductMaster(other,store),null)
  assert.equal(recovery.clearPendingProductMaster(other,key,store),false)
  assert.equal(recovery.clearPendingProductMaster(actor,next,store),false)
  assert.equal(recovery.clearPendingProductMaster(actor,key,store),true)
  assert.equal(recovery.readPendingProductMaster(actor,store),null)
})
test('corruption foreign actor secret field and oversize storage remain untouched', { skip: !recovery }, () => {
  const store=storage(), held=recovery.holdPendingProductMaster(actor,key,payloadText,store)
  const address=recovery.productMasterRecoveryKey(actor)
  for (const raw of ['{', JSON.stringify({...held,actorId:other}), JSON.stringify({...held,token:'synthetic'}), ' '.repeat(65537)]) {
    store.setItem(address,raw)
    assert.throws(() => recovery.readPendingProductMaster(actor,store),/restored safely/i)
    assert.throws(() => recovery.clearPendingProductMaster(actor,key,store),/restored safely/i)
    assert.equal(store.getItem(address),raw)
  }
})
test('malformed or non-update commands cannot be held or sent', { skip: !recovery }, () => {
  const store=storage()
  const invalid=[null,{...body,extra:true},{...body,action:'status'}, {...body,payload:{...body.payload,reason:'short'}}, {...body,payload:{...body.payload,sku:'bad sku'}}, {...body,payload:{...body.payload,expectedUpdatedAt:'bad'}}, {...body,payload:{...body.payload,patch:{is_human_reviewed:'true'}}}, {...body,payload:{...body.payload,patch:{published:true}}}, {...body,payload:{...body.payload,patch:{brand_id:other}}}, {...body,payload:{...body.payload,patch:{srp:1000001}}}, {...body,payload:{...body.payload,patch:{pairings:[1]}}}]
  for(const item of invalid) {
    assert.throws(() => recovery.holdPendingProductMaster(actor,key,JSON.stringify(item),store))
    assert.equal(store.values.size,0)
  }
  assert.throws(() => recovery.holdPendingProductMaster(actor,key,' '.repeat(16385)+payloadText,store))
  assert.throws(() => recovery.holdPendingProductMaster(actor,key,payloadText,{...store,setItem(){}}), /Nothing was sent/i)
  assert.throws(() => recovery.holdPendingProductMaster(actor,'',payloadText,store))
  assert.throws(() => recovery.readPendingProductMaster('',store))
})

test('approved merge commands have durable actor-scoped recovery', { skip: !recovery }, () => {
  const store = storage()
  const mergeBody = { action: 'merge', payload: { groupId: 'borella-prosciutto', expectedStateHash: 'a'.repeat(64), reason: 'Owner-confirmed same sellable item' } }
  const text = JSON.stringify(mergeBody)
  const held = recovery.holdPendingProductMaster(actor, key, text, store)
  assert.deepEqual(recovery.readPendingProductMaster(actor, store), held)
  assert.equal(held.payloadText, text)
  assert.equal(held.key, key)
  assert.equal(held.state, 'pending')
})
