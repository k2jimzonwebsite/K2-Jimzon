import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { createGenesisState, createDecisionCore, canonicalJson } from '../server/privacy-authority/state.js'

const projectRef = 'pixplcjqivlfflickobf'
const genesisId = '90000000-0000-4000-8000-000000000002'
const actorId = '10000000-0000-4000-8000-000000000001'
const otherActor = '10000000-0000-4000-8000-000000000002'
const requestId = '60000000-0000-4000-8000-000000000001'
const manifestHash = 'a'.repeat(64)
const command = (kind, payload, generation = 1) => ({ version: 2, projectRef, genesisId, operationId: randomUUID(), generation, kind, payload })
const register = (actor = actorId, request = requestId) => command('register', { actorId: actor, requestId: request, receiptHash: 'b'.repeat(64) })
const authorize = () => command('authorize', { actorId, requestId, customerId: null, freezeId: randomUUID(),
  policyVersion: 'account-closure-v1', manifestHash, manifestKey: `manifests/${requestId}/${manifestHash}.json` })
function verified(c, context) {
  return { verified: true, projectRef, genesisId, commandHash: context.commandHash, generation: c.generation,
    purpose: c.kind, intent: context.intent, principalId: c.payload.actorId || c.payload.operatorId,
    role: ['fence', 'activate'].includes(c.kind) ? 'operator' : ['authorize', 'expire'].includes(c.kind) ? 'worker' : 'customer',
    identityVerified: true, unverifiedExpiryCommitted: true, freezeCommitted: true, manifestVerified: true,
    freeze: { ...c.payload, generation: c.generation }, reconciliationVerified: true,
    reconciliationHash: c.payload.reconciliationHash, reconciledFenceHash: c.payload.fencedHeadHash }
}
function fixture(verifyCommand = verified) {
  const logical = new Map()
  const commandStore = { async claim(key, bytes) { if (!logical.has(key)) logical.set(key, bytes); return logical.get(key) } }
  const core = createDecisionCore({ genesisId, verifyCommand, commandStore })
  return { core, logical, commandStore }
}
async function commit(core, state, c) {
  const prepared = await core.prepare(state, c)
  assert.equal(prepared.kind, 'candidate')
  assert.deepEqual(prepared.execution, { allowed: false })
  return { state: await core.applyCommitted(state, prepared.candidate), prepared }
}
async function registered() {
  const f = fixture()
  const original = await createGenesisState(genesisId)
  const { state } = await commit(f.core, original, register())
  return { ...f, state }
}
const refuses = (promise, code) => assert.rejects(promise, error => error.code === code)

test('unqualified adapters deny commands even with caller-selected proof', async () => {
  const state = await createGenesisState(genesisId)
  const core = createDecisionCore({ genesisId })
  await refuses(core.prepare(state, register(), { verified: true, role: 'operator' }), 'AUTHORITY_PROOF_REQUIRED')
  assert.equal(state.revision, 0)
})

test('strict namespace, fields, policy and scope reject before writing a logical command', async () => {
  const { core, logical } = fixture()
  const state = await createGenesisState(genesisId)
  for (const c of [
    { ...register(), projectRef: 'unrelated-project' }, { ...register(), genesisId: randomUUID() },
    { ...register(), email: 'private@example.invalid' },
    { ...register(), generation: NaN },
    { ...authorize(), payload: { ...authorize().payload, policyVersion: 'unknown-policy' } },
    { ...authorize(), payload: { ...authorize().payload, manifestKey: 'https://untrusted.invalid/file' } },
  ]) await assert.rejects(core.prepare(state, c))
  assert.equal(logical.size, 0)
})

test('canonical command identity ignores property order and preparation mutates no state', async () => {
  const { core } = fixture(); const state = await createGenesisState(genesisId)
  const c = register(), before = canonicalJson(state)
  const first = await core.prepare(state, c)
  const reordered = { payload: { receiptHash: c.payload.receiptHash, requestId, actorId }, kind: c.kind,
    generation: 1, operationId: c.operationId, genesisId, projectRef, version: 2 }
  const second = await core.prepare(state, reordered)
  assert.deepEqual(second, first)
  assert.equal(canonicalJson(state), before)
  assert.equal(first.receipt.outcome, 'undecided')
  assert.deepEqual(first.execution, { allowed: false })
})

test('one actor has one open request and request IDs cannot bind a different actor', async () => {
  const { core, state } = await registered()
  await refuses(core.prepare(state, register(actorId, randomUUID())), 'REQUEST_ALREADY_OPEN')
  await refuses(core.prepare(state, register(otherActor)), 'REQUEST_EXISTS')
  const other = await commit(core, state, register(otherActor, randomUUID()))
  assert.equal(other.state.requests[requestId].actorId, actorId)
  assert.equal(state.revision, 1)
})

test('cancel and authorize candidates from the same parent cannot both commit', async () => {
  const { core, state } = await registered()
  const cancelled = await core.prepare(state, command('cancel', { actorId, requestId }))
  const authorized = await core.prepare(state, authorize())
  const cancelWinner = await core.applyCommitted(state, cancelled.candidate)
  await refuses(core.applyCommitted(cancelWinner, authorized.candidate), 'STALE_PARENT')
  assert.equal(cancelWinner.requests[requestId].status, 'cancelled')
  const authWinner = await core.applyCommitted(state, authorized.candidate)
  await refuses(core.applyCommitted(authWinner, cancelled.candidate), 'STALE_PARENT')
  assert.equal(authWinner.requests[requestId].status, 'authorized')
})

test('exact terminal retry returns its original receipt; changed logical bytes refuse', async () => {
  const { core, state } = await registered()
  const c = command('cancel', { actorId, requestId })
  const result = await commit(core, state, c)
  const retry = await core.prepare(result.state, c)
  assert.equal(retry.kind, 'historical')
  assert.deepEqual(retry.receipt, result.prepared.receipt)
  assert.deepEqual(retry.execution, { allowed: false })
  await refuses(core.prepare(result.state, { ...c, payload: { actorId: otherActor, requestId } }), 'OPERATION_CONFLICT')
  await refuses(core.prepare(result.state, authorize()), 'DECISION_FINAL')
})

test('a prepared but uncommitted logical command cannot change its payload', async () => {
  const { core } = fixture(); const state = await createGenesisState(genesisId); const c = register()
  await core.prepare(state, c)
  await refuses(core.prepare(state, { ...c, payload: { ...c.payload, receiptHash: 'c'.repeat(64) } }), 'OPERATION_CONFLICT')
  assert.equal(state.revision, 0)
})

test('an unrelated winner permits a new attempt for the same immutable logical command', async () => {
  const { core } = fixture(); const state = await createGenesisState(genesisId); const c = register()
  const oldAttempt = await core.prepare(state, c)
  const unrelated = await commit(core, state, register(otherActor, randomUUID()))
  const rebased = await core.prepare(unrelated.state, c)
  assert.equal(rebased.candidate.commandHash, oldAttempt.candidate.commandHash)
  assert.notEqual(rebased.candidate.attemptId, oldAttempt.candidate.attemptId)
  await refuses(core.applyCommitted(unrelated.state, oldAttempt.candidate), 'STALE_PARENT')
  const final = await core.applyCommitted(unrelated.state, rebased.candidate)
  assert.equal(final.requests[requestId].actorId, actorId)
  assert.equal(Object.keys(final.actors).length, 2)
})

test('historical authorization after fencing grants no current execution permission', async () => {
  const { core, state } = await registered(); const c = authorize()
  const authorized = await commit(core, state, c)
  const fenced = await commit(core, authorized.state, command('fence', { operatorId: otherActor, nextGeneration: 2 }))
  const retry = await core.prepare(fenced.state, c)
  assert.deepEqual(retry.receipt, authorized.prepared.receipt)
  assert.equal(retry.receipt.committedGeneration, 1)
  assert.deepEqual(retry.execution, { allowed: false })
  await refuses(core.prepare(fenced.state, register(otherActor, randomUUID())), 'STALE_GENERATION')
  await refuses(core.prepare(fenced.state, { ...register(otherActor, randomUUID()), generation: 2 }), 'AUTHORITY_RECOVERING')
})

test('activation binds the exact fenced head and retains original authorized identities', async () => {
  const { core, state } = await registered()
  const closed = await commit(core, state, authorize())
  const fenced = await commit(core, closed.state, command('fence', { operatorId: otherActor, nextGeneration: 2 }))
  const payload = { operatorId: otherActor, reconciliationHash: 'd'.repeat(64), fencedHeadHash: fenced.state.hash }
  await refuses(core.prepare(fenced.state, command('activate', { ...payload, fencedHeadHash: state.hash }, 2)), 'FENCE_MISMATCH')
  const active = await commit(core, fenced.state, command('activate', payload, 2))
  await refuses(core.prepare(active.state, { ...register(actorId, randomUUID()), generation: 2 }), 'ACCOUNT_ALREADY_AUTHORIZED')
  await commit(core, active.state, { ...register(otherActor, randomUUID()), generation: 2 })
})

test('expiry requires a native unverified-expiry decision; cancellation permits a fresh request', async () => {
  const f = await registered(); const expiry = command('expire', { actorId, requestId })
  const guarded = createDecisionCore({ genesisId, commandStore: f.commandStore,
    verifyCommand: (c, x) => ({ ...verified(c, x), unverifiedExpiryCommitted: false }) })
  await refuses(guarded.prepare(f.state, expiry), 'AUTHORITY_PROOF_REQUIRED')
  const expired = await commit(f.core, f.state, expiry)
  assert.equal(expired.state.requests[requestId].status, 'expired')
  await commit(f.core, expired.state, register(actorId, randomUUID()))
})

test('wrong proof principal, purpose, command hash or role never persists a logical command', async () => {
  const state = await createGenesisState(genesisId)
  for (const changed of [{ principalId: otherActor }, { purpose: 'fence' }, { commandHash: 'f'.repeat(64) }, { role: 'operator' }]) {
    const { core, logical } = fixture((c, x) => ({ ...verified(c, x), ...changed }))
    await refuses(core.prepare(state, register()), 'AUTHORITY_PROOF_REQUIRED')
    assert.equal(logical.size, 0)
  }
})

test('authorization and activation fail closed without their qualified matching proofs', async () => {
  const f = await registered()
  const denied = createDecisionCore({ genesisId, commandStore: f.commandStore,
    verifyCommand: (c, x) => ({ ...verified(c, x), freezeCommitted: false, reconciliationVerified: false }) })
  await refuses(denied.prepare(f.state, authorize()), 'AUTHORITY_PROOF_REQUIRED')
  const frozen = await commit(f.core, f.state, command('fence', { operatorId: otherActor, nextGeneration: 2 }))
  await refuses(denied.prepare(frozen.state, command('activate', { operatorId: otherActor, reconciliationHash: 'd'.repeat(64), fencedHeadHash: frozen.state.hash }, 2)), 'AUTHORITY_PROOF_REQUIRED')
})

test('unknown logical-store acknowledgment stays pending and identical retry reconciles', async () => {
  const f = fixture(); const state = await createGenesisState(genesisId); const c = register(); let lose = true
  const core = createDecisionCore({ genesisId, verifyCommand: verified, commandStore: { async claim(key, bytes) {
    const stored = await f.commandStore.claim(key, bytes)
    if (lose) { lose = false; throw new Error('Synthetic lost write acknowledgment; never a definitive refusal') }
    return stored
  } } })
  await refuses(core.prepare(state, c), 'AUTHORITY_PENDING')
  const result = await commit(core, state, c)
  assert.equal(result.state.requests[requestId].status, 'undecided')
  assert.equal(state.revision, 0)
})

test('tampered candidates and corrupt cached state cannot be replayed', async () => {
  const { core } = fixture(); const state = await createGenesisState(genesisId)
  const prepared = await core.prepare(state, register())
  await refuses(core.applyCommitted(state, { ...prepared.candidate, receipt: { ...prepared.receipt, outcome: 'authorized' } }), 'CANDIDATE_INVALID')
  await refuses(core.prepare({ ...state, generation: 2 }, register()), 'STATE_INTEGRITY')
  assert.equal(state.revision, 0)
})

test('the command is copied before the first await, so caller mutation cannot change its identity', async () => {
  const { core } = fixture(); const state = await createGenesisState(genesisId); const c = register()
  const pending = core.prepare(state, c)
  c.payload.actorId = otherActor
  assert.equal((await pending).candidate.command.payload.actorId, actorId)
})

test('a logical command refused by current state still cannot be changed on retry', async () => {
  const { core, state } = await registered(); const c = register(actorId, randomUUID())
  await refuses(core.prepare(state, c), 'REQUEST_ALREADY_OPEN')
  await refuses(core.prepare(state, { ...c, payload: { ...c.payload, actorId: otherActor } }), 'OPERATION_CONFLICT')
})

test('a self-checksummed checkpoint still requires valid association maps and exact genesis', async () => {
  const { core, state } = await registered()
  function checksum(value) {
    const { checksum: _old, ...body } = value
    return { ...body, checksum: createHash('sha256').update(canonicalJson(body)).digest('hex') }
  }
  const bad = structuredClone(state); delete bad.actors[actorId]
  await refuses(core.prepare(checksum(bad), register(actorId, randomUUID())), 'STATE_INTEGRITY')
  const missing = structuredClone(state); missing.requests = {}; missing.actors = {}
  await refuses(core.prepare(checksum(missing), register(actorId, randomUUID())), 'STATE_INTEGRITY')
  const genesis = await createGenesisState(genesisId)
  await refuses(core.prepare(checksum({ ...genesis, mode: 'recovering', generation: 50 }), register()), 'STATE_INTEGRITY')
})
