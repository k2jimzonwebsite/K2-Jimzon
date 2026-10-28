import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { canonicalJson, createDecisionCore, createGenesisState } from '../server/privacy-authority/state.js'

const projectRef = 'pixplcjqivlfflickobf', genesisId = '90000000-0000-4000-8000-000000000002'
const actorId = '10000000-0000-4000-8000-000000000001', customerId = '20000000-0000-4000-8000-000000000001'
const requestId = '60000000-0000-4000-8000-000000000001', initiatorId = '30000000-0000-4000-8000-000000000001'
const command = (kind, payload, generation = 1) => ({ version: 2, projectRef, genesisId, operationId: randomUUID(), generation, kind, payload })
const register = (request = requestId, actor = actorId) => command('register', { actorId: actor, requestId: request, receiptHash: 'a'.repeat(64) })
const authorize = (request = requestId, actor = actorId, customer = customerId) => command('authorize', { actorId: actor, requestId: request,
  customerId: customer, freezeId: randomUUID(), policyVersion: 'account-closure-v1', manifestHash: 'b'.repeat(64),
  manifestKey: `manifests/${request}/${'b'.repeat(64)}.json` })
const protect = () => command('protect', { actorId, requestId, customerId, protectionId: randomUUID(), kind: 'legal',
  nativeIntentHash: 'c'.repeat(64), initiatorId, initiatorRole: 'admin' })
const release = protection => command('release_protection', { actorId, requestId, customerId, protectionId: protection.payload.protectionId,
  nativeResolutionHash: 'd'.repeat(64), initiatorId, initiatorRole: 'admin' })
// Explicit synthetic adapter facts only. These are not HMAC/native/provider proof.
function verified(c, x) {
  const protection = ['protect', 'release_protection'].includes(c.kind)
  return { verified: true, projectRef, genesisId, commandHash: x.commandHash, generation: c.generation,
    purpose: c.kind, intent: x.intent, principalId: protection ? c.payload.initiatorId : c.payload.actorId || c.payload.operatorId,
    role: protection ? c.payload.initiatorRole : ['fence', 'activate'].includes(c.kind) ? 'operator' : c.kind === 'authorize' ? 'worker' : 'customer',
    identityVerified: true, freezeCommitted: true, manifestVerified: true, freeze: { ...c.payload, generation: c.generation },
    adminHoldAuthorized: true, workerAuthorityVerified: true, holdIntentCommitted: true, holdCommitted: true,
    protection: { ...c.payload, generation: c.generation }, resolutionCommitted: true,
    resolution: { ...c.payload, generation: c.generation }, reconciliationVerified: true,
    reconciliationHash: c.payload.reconciliationHash, reconciledFenceHash: c.payload.fencedHeadHash }
}
function fixture(verifyCommand = verified) {
  const logical = new Map(), commandStore = { async claim(key, bytes) { if (!logical.has(key)) logical.set(key, bytes); return logical.get(key) } }
  return { core: createDecisionCore({ genesisId, verifyCommand, commandStore }), logical, commandStore }
}
async function commit(core, state, c) {
  const prepared = await core.prepare(state, c)
  assert.deepEqual(prepared.execution, { allowed: false })
  return { state: await core.applyCommitted(state, prepared.candidate), receipt: prepared.receipt }
}
async function registered() {
  const f = fixture(), initial = await createGenesisState(genesisId)
  return { ...f, initial, state: (await commit(f.core, initial, register())).state }
}
const refuses = (promise, code) => assert.rejects(promise, error => error.code === code)

test('v2 has a fresh namespace/state contract and refuses old v1 commands', async () => {
  const state = await createGenesisState(genesisId), { core, logical } = fixture()
  assert.equal(state.version, 2); assert.deepEqual(state.protections, {})
  await assert.rejects(core.prepare(state, { ...register(), version: 1 }))
  assert.equal(logical.size, 0)
})

const customerProtection=()=>{const p=protect();p.payload.actorId=null;p.payload.requestId=null;return p}
const customerRelease=p=>{const r=release(p);r.payload.actorId=null;r.payload.requestId=null;return r}
test('customer-only protection precedes any registration and matches only its real customer',async()=>{
 const {core}=fixture(),initial=await createGenesisState(genesisId),p=customerProtection()
 let current=(await commit(core,initial,p)).state
 assert.deepEqual(current.actors,{});assert.deepEqual(current.requests,{})
 current=(await commit(core,current,register())).state
 await refuses(core.prepare(current,authorize()),'AUTHORITY_PROTECTED')
 const otherActor=randomUUID(),otherRequest=randomUUID()
 current=(await commit(core,current,register(otherRequest,otherActor))).state
 await commit(core,current,authorize(otherRequest,otherActor,randomUUID()))
 current=(await commit(core,current,customerRelease(p))).state
 await commit(core,current,authorize())
 assert.equal(current.protections[p.payload.protectionId].requestId,null)
})
test('customer-only protection survives cancellation/replacement and neither race permits both winners',async()=>{
 const {core,state}=await registered(),p=customerProtection()
 const protection=await core.prepare(state,p),authorization=await core.prepare(state,authorize())
 const protectedState=await core.applyCommitted(state,protection.candidate)
 await refuses(core.applyCommitted(protectedState,authorization.candidate),'STALE_PARENT')
 const authorized=await core.applyCommitted(state,authorization.candidate)
 await refuses(core.prepare(authorized,p),'PROCESSING_STARTED')
 let current=(await commit(core,protectedState,command('cancel',{actorId,requestId}))).state
 const replacement=randomUUID();current=(await commit(core,current,register(replacement))).state
 await refuses(core.prepare(current,authorize(replacement)),'AUTHORITY_PROTECTED')
 current=(await commit(core,current,customerRelease(p))).state
 await commit(core,current,authorize(replacement))
})
test('missing or mixed customer-only origin identities never claim an operation',async()=>{
 for(const change of [{actorId:null},{requestId:null},{actorId:undefined,requestId:null},{actorId:null,requestId:undefined}]){
  const {core,logical}=fixture(),state=await createGenesisState(genesisId),p=protect()
  p.payload={...p.payload,...change}
  await refuses(core.prepare(state,p),'COMMAND_INVALID');assert.equal(logical.size,0)
 }
})

test('accepted global protection survives cancellation and blocks a replacement request', async () => {
  const { core, state } = await registered(), p = protect()
  const protectedState = (await commit(core, state, p)).state
  await refuses(core.prepare(protectedState, authorize()), 'AUTHORITY_PROTECTED')
  const cancelled = (await commit(core, protectedState, command('cancel', { actorId, requestId }))).state
  const replacement = randomUUID(), pending = (await commit(core, cancelled, register(replacement))).state
  await refuses(core.prepare(pending, authorize(replacement)), 'AUTHORITY_PROTECTED')
  assert.equal(pending.protections[p.payload.protectionId].state, 'active')
  assert.equal(pending.requests[requestId].status, 'cancelled')
})

test('protection matches original subject OR customer without blocking unrelated scopes', async () => {
  const { core, state } = await registered()
  const protectedState = (await commit(core, state, protect())).state
  await refuses(core.prepare(protectedState, authorize(requestId, actorId, randomUUID())), 'AUTHORITY_PROTECTED')
  const otherActor = randomUUID(), otherRequest = randomUUID()
  const second = (await commit(core, protectedState, register(otherRequest, otherActor))).state
  await refuses(core.prepare(second, authorize(otherRequest, otherActor, customerId)), 'AUTHORITY_PROTECTED')
  await commit(core, second, authorize(otherRequest, otherActor, randomUUID()))
})

test('an old cancellation cannot authorize a protection after replacement processing wins', async () => {
  const { core, state } = await registered()
  const cancelled = (await commit(core, state, command('cancel', { actorId, requestId }))).state
  const replacement = randomUUID(), next = (await commit(core, cancelled, register(replacement))).state
  const authorized = (await commit(core, next, authorize(replacement))).state
  await refuses(core.prepare(authorized, protect()), 'PROCESSING_STARTED')
  assert.equal(Object.keys(authorized.protections).length, 0)
})

test('a fresh protection after cancellation blocks the new request until verified release', async () => {
  const { core, state } = await registered(), p = protect()
  const cancelled = (await commit(core, state, command('cancel', { actorId, requestId }))).state
  const protectedState = (await commit(core, cancelled, p)).state
  const replacement = randomUUID(), next = (await commit(core, protectedState, register(replacement))).state
  await refuses(core.prepare(next, authorize(replacement)), 'AUTHORITY_PROTECTED')
  const released = (await commit(core, next, release(p))).state
  assert.equal(released.requests[requestId].status, 'cancelled')
  assert.equal(released.protections[p.payload.protectionId].state, 'released')
  await commit(core, released, authorize(replacement))
})

test('protection and authorization from one head have a single winner', async () => {
  const { core, state } = await registered()
  const p = await core.prepare(state, protect()), a = await core.prepare(state, authorize())
  const protectedState = await core.applyCommitted(state, p.candidate)
  await refuses(core.applyCommitted(protectedState, a.candidate), 'STALE_PARENT')
  const authorized = await core.applyCommitted(state, a.candidate)
  await refuses(core.applyCommitted(authorized, p.candidate), 'STALE_PARENT')
})

test('initiator role, principal and exact native scope cannot be chosen through caller evidence', async () => {
  const f = await registered(), p = protect()
  for (const change of [{ role: 'customer' }, { principalId: actorId }, { adminHoldAuthorized: false }, { protection: {} }]) {
    const core = createDecisionCore({ genesisId, commandStore: f.commandStore, verifyCommand: (c, x) => ({ ...verified(c, x), ...change }) })
    await refuses(core.prepare(f.state, p, { verified: true }), 'AUTHORITY_PROOF_REQUIRED')
  }
  const denied = createDecisionCore({ genesisId, commandStore: f.commandStore })
  await refuses(denied.prepare(f.state, p, verified(p, { commandHash: 'f'.repeat(64), intent: 'mutation' })), 'AUTHORITY_PROOF_REQUIRED')
})

test('worker mirror requires a real committed hold and release requires its exact resolution', async () => {
  const f = await registered(), p = protect(); p.payload.initiatorRole = 'worker'
  const denied = createDecisionCore({ genesisId, commandStore: f.commandStore,
    verifyCommand: (c, x) => ({ ...verified(c, x), holdCommitted: false, resolutionCommitted: false }) })
  await refuses(denied.prepare(f.state, p), 'AUTHORITY_PROOF_REQUIRED')
  const protectedState = (await commit(f.core, f.state, p)).state
  await refuses(denied.prepare(protectedState, release(p)), 'AUTHORITY_PROOF_REQUIRED')
  const wrong = release(p); wrong.payload.customerId = randomUUID()
  await assert.rejects(f.core.prepare(protectedState, wrong))
})

test('changed IDs and duplicate protection attempts cannot rewrite accepted protection', async () => {
  const { core, state } = await registered(), p = protect()
  const accepted = await commit(core, state, p)
  const retry = await core.prepare(accepted.state, p)
  assert.deepEqual(retry.receipt, accepted.receipt)
  await refuses(core.prepare(accepted.state, { ...p, payload: { ...p.payload, kind: 'refund' } }), 'OPERATION_CONFLICT')
  await refuses(core.prepare(accepted.state, { ...p, operationId: randomUUID() }), 'PROTECTION_EXISTS')
  const resolved = await commit(core, accepted.state, release(p))
  await refuses(core.prepare(resolved.state, release(p)), 'PROTECTION_FINAL')
})

test('receipt replay preserves global protection even when an index is missing after restoration', async () => {
  const { core, state } = await registered(), p = protect()
  const protectedState = (await commit(core, state, p)).state
  const corrupt = structuredClone(protectedState); corrupt.protections = {}
  const { checksum: _old, ...body } = corrupt
  corrupt.checksum = createHash('sha256').update(canonicalJson(body)).digest('hex')
  await refuses(core.prepare(corrupt, authorize()), 'STATE_INTEGRITY')
  const restored = JSON.parse(JSON.stringify(protectedState))
  await refuses(core.prepare(restored, authorize()), 'AUTHORITY_PROTECTED')
})

test('the last independent protection still blocks after another protection is released', async () => {
  const { core, state } = await registered(), first = protect(), second = protect()
  second.payload.kind = 'refund'; second.payload.nativeIntentHash = 'e'.repeat(64)
  let current = (await commit(core, state, first)).state
  current = (await commit(core, current, second)).state
  current = (await commit(core, current, release(first))).state
  await refuses(core.prepare(current, authorize()), 'AUTHORITY_PROTECTED')
  current = (await commit(core, current, release(second))).state
  await commit(core, current, authorize())
})

test('generation fencing retains active protection and refuses stale protection mutations', async () => {
  const { core, state } = await registered(), p = protect()
  const protectedState = (await commit(core, state, p)).state
  const fenced = (await commit(core, protectedState, command('fence', { operatorId: initiatorId, nextGeneration: 2 }))).state
  await refuses(core.prepare(fenced, protect()), 'STALE_GENERATION')
  await refuses(core.prepare(fenced, release(p)), 'STALE_GENERATION')
  await refuses(core.prepare(fenced, { ...release(p), generation: 2 }), 'AUTHORITY_RECOVERING')
  const active = (await commit(core, fenced, command('activate', { operatorId: initiatorId,
    reconciliationHash: 'f'.repeat(64), fencedHeadHash: fenced.hash }, 2))).state
  const restored = JSON.parse(JSON.stringify(active)), authorization = { ...authorize(), generation: 2 }
  await refuses(core.prepare(restored, authorization), 'AUTHORITY_PROTECTED')
  const historical = await core.prepare(restored, p)
  assert.equal(historical.receipt.committedGeneration, 1)
  assert.deepEqual(historical.execution, { allowed: false })
  const released = (await commit(core, restored, { ...release(p), generation: 2 })).state
  await commit(core, released, authorization)
})
