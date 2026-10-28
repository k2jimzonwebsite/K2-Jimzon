import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, randomBytes, createHash, createHmac } from 'node:crypto'
import { canonicalJson, createGenesisState } from '../server/privacy-authority/state.js'
import { createNativeHoldAuthority } from '../server/privacy-authority/native-holds.js'
import { createJournal } from '../server/privacy-authority/journal.js'

const projectRef = 'pixplcjqivlfflickobf', genesisId = '90000000-0000-4000-8000-000000000002'
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : canonicalJson(value)).digest('hex')
const mac = (key, text) => createHmac('sha256', key).update(text).digest('hex')
const refuses = (promise, code) => assert.rejects(promise, error => error.code === code)

async function fixture(overrides = {}) {
  const { customerOnly = false, ...configurationOverrides } = overrides
  const databaseId = randomUUID(), proofKey = randomBytes(32), executionKey = randomBytes(32)
  const actorId = customerOnly ? null : randomUUID(), customerId = randomUUID(), requestId = customerOnly ? null : randomUUID(), initiatorId = randomUUID(), intentId = randomUUID()
  const scope = { version: 2, projectRef, genesisId, databaseId, generation: 1 }
  const facts = { ...scope, purpose: 'hold_fact', challengeId: randomUUID(), intentId, actorId, customerId, requestId, initiatorId,
    protectionId: randomUUID(), holdId: randomUUID(), creationEventId: randomUUID(), nativeIntentHash: hash('synthetic literal'),
    state: 'pending', protectCommandHash: '', resolutionHash: null, resolverId: null, resolutionEventId: null,
    releaseCommandHash: null, releaseExport: null, creationReceipt: null, refusalReceipt: null, customerActive: true }
  const command = (kind, payload, operationId = randomUUID()) => ({ version: 2, projectRef, genesisId, generation: 1, operationId, kind, payload })
  function exported(c) {
    const body = { ...scope, purpose: c.kind, intentId, protectionId: facts.protectionId, holdId: facts.holdId,
      eventId: c.kind === 'protect' ? facts.creationEventId : facts.resolutionEventId,
      initiatorId: c.payload.initiatorId, nativeIntentHash: facts.nativeIntentHash, commandHash: hash(c) }
    const text = canonicalJson(body)
    return { command: c, proof: { body: text, mac: mac(proofKey, text) } }
  }
  const protect = exported(command('protect', { actorId, customerId, requestId, initiatorId, initiatorRole: 'admin',
    protectionId: facts.protectionId, kind: 'legal', nativeIntentHash: facts.nativeIntentHash }, intentId))
  facts.protectCommandHash = hash(protect.command)
  const native = { facts, calls: [], transitions: 0, creations: 0, transformFact: null, beforeRpc: null, lostReply: false, phantom: false }
  const rpc = async (name, args, options) => {
    native.calls.push(name)
    if (native.beforeRpc) await native.beforeRpc(name, options)
    const body = JSON.parse(args.p_capability_text)
    assert.equal(args.p_signature, mac(executionKey, args.p_capability_text), 'fixture also verifies request signatures')
    if (name === 'read_customer_privacy_hold_fact_v1') {
      assert.equal(body.purpose, 'read_hold_fact')
      let fact = { ...facts, challengeId: body.challengeId }
      if (native.transformFact) fact = native.transformFact(fact)
      const text = canonicalJson(fact)
      return { data: { body: text, mac: mac(proofKey, text) }, error: null }
    }
    assert.equal(name, 'transition_customer_privacy_hold_v1'); native.transitions++
    if (!native.phantom && facts.state === 'pending') {
      if (body.purpose === 'project_hold') {
        facts.state = 'projected'; native.creations++
        facts.creationReceipt = { intentId, protectionId: facts.protectionId, holdId: facts.holdId, eventId: facts.creationEventId, outcome: 'projected' }
      } else {
        assert.equal(body.purpose, 'refuse_hold'); facts.state = 'refused'
        facts.refusalReceipt = { intentId, protectionId: facts.protectionId, outcome: 'processing_started',
          authorizationId: body.authorizationId, authorizationHash: body.authorizationHash }
      }
    }
    if (native.lostReply) { native.lostReply = false; throw new Error('Synthetic lost native acknowledgement') }
    return { data: { ignored: 'An unsigned acknowledgement never proves native state' }, error: null }
  }
  let state = await createGenesisState(genesisId), etag = 0
  const objects = new Map(), prefix = `${projectRef}/${genesisId}/`, writes = []
  const save = (key, text) => { const row = { text, etag: String(++etag) }; objects.set(key, row); return { etag: row.etag } }
  save(prefix + 'head.json', canonicalJson({ version: 2, projectRef, genesisId, revision: 0, hash: state.hash, generation: 1,
    mode: 'active', revisionNonce: genesisId, eventKey: null, parentHash: null }))
  const bucket = {
    async get(key) { const row = objects.get(key); return row ? { etag: row.etag, text: async () => row.text } : null },
    async put(key, text, { onlyIf }) {
      const row = objects.get(key)
      if (onlyIf.etagDoesNotMatch === '*' && row || onlyIf.etagMatches !== undefined && row?.etag !== onlyIf.etagMatches) return null
      writes.push(key); return save(key, text)
    },
    async list({ prefix: p }) { return { objects: [...objects.keys()].filter(key => key.startsWith(p)).sort().map(key => ({ key })), truncated: false } },
  }
  const witness = { async read() { return structuredClone(state) }, async advance(next) { state = structuredClone(next); return structuredClone(state) } }
  // Non-hold identities/freezes are deliberately synthetic ONLY in this fixture.
  const verifyOtherCommand = (c, x) => ({ verified: true, projectRef, genesisId, commandHash: x.commandHash, generation: c.generation,
    purpose: c.kind, intent: x.intent, principalId: c.payload.actorId || c.payload.operatorId,
    role: c.kind === 'authorize' ? 'worker' : 'customer', identityVerified: true, freezeCommitted: true, manifestVerified: true,
    freeze: { ...c.payload, generation: c.generation } })
  const configuration = { genesisId, databaseId, generation: 1, proofKey, executionKey, rpc, bucket, witness, verifyOtherCommand, ...configurationOverrides }
  const authority = createNativeHoldAuthority(configuration)
  const register = (request = requestId) => command('register', { actorId, requestId: request, receiptHash: hash('synthetic receipt') })
  const authorize = (request = requestId) => command('authorize', { actorId, customerId, requestId: request, freezeId: randomUUID(),
    policyVersion: 'account-closure-v1', manifestHash: hash('manifest'), manifestKey: `manifests/${request}/${hash('manifest')}.json` })
  function resolve() {
    facts.state = 'resolved'; facts.resolutionHash = hash('synthetic committed resolution')
    facts.resolverId = randomUUID(); facts.resolutionEventId = randomUUID()
    const release = exported(command('release_protection', { actorId, customerId, requestId, protectionId: facts.protectionId,
      nativeResolutionHash: facts.resolutionHash, initiatorId: facts.resolverId, initiatorRole: 'admin' }))
    facts.releaseCommandHash = hash(release.command)
    facts.releaseExport = release
    return release
  }
  return { authority, configuration, native, protect, facts, register, authorize, resolve, command, writes, objects }
}

test('a fence during the post-submit native read prevents projection', async () => {
  const f = await fixture({ customerOnly: true })
  const other = createJournal({ ...f.configuration, verifyCommand: (command, context) => ({
    verified: true, projectRef: command.projectRef, genesisId: command.genesisId,
    commandHash: context.commandHash, generation: command.generation, purpose: command.kind,
    intent: context.intent, principalId: command.payload.operatorId, role: 'operator',
  }) })
  let fenced = false
  f.native.beforeRpc = async name => {
    if (!fenced && name === 'read_customer_privacy_hold_fact_v1'
      && f.native.calls.filter(value => value === name).length === 4) {
      fenced = true
      await other.submit(f.command('fence', { operatorId: randomUUID(), nextGeneration: 2 }))
    }
  }
  await refuses(f.authority.applyHold(f.protect), 'AUTHORITY_PENDING')
  assert.equal(fenced, true)
  assert.equal(f.native.creations, 0)
  assert.equal(f.native.transitions, 0)
  const state = (await f.authority.reconcile()).state
  assert.equal(state.generation, 2)
  assert.equal(state.mode, 'recovering')
})

test('missing native keys and caller-selected proof cannot enable a hold', async () => {
  const f = await fixture()
  assert.throws(() => createNativeHoldAuthority({ ...f.configuration, proofKey: null }))
  await refuses(f.authority.applyHold({ ...f.protect, proof: { verified: true } }), 'AUTHORITY_PROOF_REQUIRED')
  assert.equal(f.native.transitions, 0); assert.equal(f.writes.length, 0)
})

test('native customer-only protection needs no origin request and preserves null scope through release/replay',async()=>{
 const f=await fixture({customerOnly:true})
 f.native.lostReply=true
 await refuses(f.authority.applyHold(f.protect),'AUTHORITY_PENDING')
 const saved=await f.authority.applyHold(f.protect)
 assert.equal(saved.currentState,'projected');assert.equal(f.native.creations,1)
 const actorId=randomUUID(),requestId=randomUUID()
 await f.authority.submitDecision(f.command('register',{actorId,requestId,receiptHash:hash('later genuine scope fixture')}))
 const authorization=f.command('authorize',{actorId,requestId,customerId:f.facts.customerId,freezeId:randomUUID(),policyVersion:'account-closure-v1',manifestHash:hash('manifest'),manifestKey:`manifests/${requestId}/${hash('manifest')}.json`})
 await refuses(f.authority.submitDecision(authorization),'AUTHORITY_PROTECTED')
 const release=f.resolve();assert.equal(release.command.payload.actorId,null);assert.equal(release.command.payload.requestId,null)
 await f.authority.releaseHold(release);await f.authority.submitDecision(authorization)
 const reopened=createNativeHoldAuthority(f.configuration)
 assert.equal((await reopened.applyHold(f.protect)).currentState,'resolved')
 assert.equal(f.native.creations,1);assert.equal(f.native.transitions,1)
})
test('a signed current fact cannot mix null origin with an invented actor or request',async()=>{
 const f=await fixture({customerOnly:true})
 for(const change of [{actorId:randomUUID()},{requestId:randomUUID()}]){
  f.native.transformFact=fact=>({...fact,...change})
  await refuses(f.authority.applyHold(f.protect),'AUTHORITY_PROOF_REQUIRED')
 }
 assert.equal(f.native.transitions,0);assert.equal(f.writes.length,0)
})

test('proof MAC, command bytes and closed fields reject before a native write', async () => {
  const f = await fixture(); await f.authority.submitDecision(f.register())
  for (const exported of [
    { ...f.protect, proof: { ...f.protect.proof, mac: '0'.repeat(64) } },
    { ...f.protect, command: { ...f.protect.command, payload: { ...f.protect.command.payload, kind: 'refund' } } },
    { ...f.protect, extra: true },
  ]) await refuses(f.authority.applyHold(exported), 'AUTHORITY_PROOF_REQUIRED')
  assert.equal(f.native.transitions, 0)
})

test('a fresh native challenge and exact current record are required', async () => {
  const f = await fixture(); await f.authority.submitDecision(f.register())
  for (const change of [{ challengeId: randomUUID() }, { databaseId: randomUUID() }, { generation: 2 },
    { actorId: randomUUID() }, { protectCommandHash: hash('wrong command') }]) {
    f.native.transformFact = fact => ({ ...fact, ...change })
    await refuses(f.authority.applyHold(f.protect), 'AUTHORITY_PROOF_REQUIRED')
  }
  assert.equal(f.native.transitions, 0)
})

test('complete hold lifecycle retains cancellation and never reprojects after release and authorization', async () => {
  const f = await fixture(); await f.authority.submitDecision(f.register())
  const created = await f.authority.applyHold(f.protect)
  assert.equal(created.currentState, 'projected'); assert.equal(f.native.creations, 1)
  await f.authority.submitDecision(f.command('cancel', { actorId: f.facts.actorId, requestId: f.facts.requestId }))
  const replacement = randomUUID(); await f.authority.submitDecision(f.register(replacement))
  await refuses(f.authority.submitDecision(f.authorize(replacement)), 'AUTHORITY_PROTECTED')
  const released = await f.authority.releaseHold(f.resolve())
  assert.equal(released.currentState, 'resolved')
  await f.authority.submitDecision(f.authorize(replacement))
  const late = await f.authority.applyHold(f.protect)
  assert.deepEqual(late.receipt, created.receipt); assert.equal(late.currentState, 'resolved')
  assert.equal(f.native.transitions, 1); assert.equal(f.native.creations, 1)
})

test('a committed native resolution resumes release without another Admin or contact confirmation', async () => {
  const f = await fixture(); await f.authority.submitDecision(f.register()); await f.authority.applyHold(f.protect)
  f.resolve() // The native response was lost; no release call reaches the coordinator.
  const result = await f.authority.applyHold(f.protect)
  assert.equal(result.currentState, 'resolved')
  assert.equal((await f.authority.reconcile()).state.protections[f.facts.protectionId].state, 'released')
  assert.equal(f.native.transitions, 1)
})

test('a delayed projected fact cannot report an active hold after a known release and authorization', async () => {
  const f = await fixture(); await f.authority.submitDecision(f.register()); await f.authority.applyHold(f.protect)
  const oldSnapshot = structuredClone(f.facts)
  await f.authority.releaseHold(f.resolve()); await f.authority.submitDecision(f.authorize())
  f.native.transformFact = fact => ({ ...oldSnapshot, challengeId: fact.challengeId })
  await refuses(f.authority.applyHold(f.protect), 'AUTHORITY_PENDING')
  assert.equal(f.native.transitions, 1)
})

test('an authorization winner closes the still-unaccepted intent without creating a hold', async () => {
  const f = await fixture(); await f.authority.submitDecision(f.register()); await f.authority.submitDecision(f.authorize())
  const result = await f.authority.applyHold(f.protect)
  assert.equal(result.currentState, 'refused'); assert.equal(result.receipt.outcome, 'processing_started')
  assert.equal(f.native.creations, 0)
  const count = f.native.transitions; assert.deepEqual(await f.authority.applyHold(f.protect), result)
  assert.equal(f.native.transitions, count)
})

test('lost native acknowledgement stays pending and reconciles the original fixed result', async () => {
  const f = await fixture(); await f.authority.submitDecision(f.register()); f.native.lostReply = true
  await refuses(f.authority.applyHold(f.protect), 'AUTHORITY_PENDING')
  const result = await f.authority.applyHold(f.protect)
  assert.equal(result.currentState, 'projected'); assert.equal(f.native.creations, 1); assert.equal(f.native.transitions, 1)
})

test('an unsigned projection acknowledgement cannot report a saved hold', async () => {
  const f = await fixture(); await f.authority.submitDecision(f.register()); f.native.phantom = true
  await refuses(f.authority.applyHold(f.protect), 'AUTHORITY_PENDING')
  assert.equal(f.native.creations, 0)
})

test('a coordinator deadline stops later projection calls when a read finishes late', async () => {
  const f = await fixture({ deadlineMs: 40 }); await f.authority.submitDecision(f.register())
  let unblock, entered
  const started = new Promise(resolve => { entered = resolve }), waiting = new Promise(resolve => { unblock = resolve })
  f.native.beforeRpc = async name => { if (name === 'read_customer_privacy_hold_fact_v1') { entered(); await waiting } }
  const pending = f.authority.applyHold(f.protect); await started
  await refuses(pending, 'AUTHORITY_PENDING'); unblock()
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(f.native.transitions, 0)
})

test('unconfigured non-hold proof remains denied rather than inheriting native hold authority', async () => {
  const f = await fixture({ verifyOtherCommand: undefined })
  await refuses(f.authority.submitDecision(f.register(), { verified: true }), 'AUTHORITY_PROOF_REQUIRED')
  assert.equal(f.writes.length, 0)
})

test('stable slow hold retries progress through complete initial, submit and fresh confirmation scans', async () => {
  const f = await fixture({ deadlineMs: 220 })
  for (let index = 0; index < 4; index++) {
    const requestId = index === 0 ? f.facts.requestId : randomUUID()
    await f.authority.submitDecision(f.register(requestId))
    await f.authority.submitDecision(f.command('cancel', { actorId: f.facts.actorId, requestId }))
  }
  const get = f.configuration.bucket.get
  f.configuration.bucket.get = async key => {
    if (/\/(commits|candidates|commands)\//.test(key)) await new Promise(resolve => setTimeout(resolve, 6))
    return get(key)
  }
  const finish = async action => {
    let pending = 0
    for (let retry = 0; retry < 40; retry++) {
      try { return { result: await action(), pending } }
      catch (error) { assert.equal(error.code, 'AUTHORITY_PENDING'); pending++; await new Promise(resolve => setTimeout(resolve, 1)) }
    }
    assert.fail('Stable slow exact retry did not complete')
  }
  const applied = await finish(() => f.authority.applyHold(f.protect))
  assert.ok(applied.pending > 0); assert.equal(applied.result.currentState, 'projected')
  assert.equal(f.native.creations, 1)
  const release = f.resolve(), released = await finish(() => f.authority.releaseHold(release))
  assert.ok(released.pending > 0); assert.equal(released.result.currentState, 'resolved')
  assert.equal(released.result.decisionReceipt.outcome, 'protection_released')
  assert.equal(f.native.creations, 1)
})

test('a resumed confirmation still rejects a fence after the first call expired', async () => {
  const f = await fixture({ deadlineMs: 90, customerOnly: true })
  let unblock, entered
  const waiting = new Promise(resolve => { unblock = resolve }), started = new Promise(resolve => { entered = resolve })
  f.native.beforeRpc = async name => {
    if (name === 'read_customer_privacy_hold_fact_v1' && f.native.calls.filter(value => value === name).length === 4) {
      entered(); await waiting
    }
  }
  const first = f.authority.applyHold(f.protect); await started
  await refuses(first, 'AUTHORITY_PENDING'); unblock()
  await new Promise(resolve => setTimeout(resolve, 5))
  f.native.beforeRpc = null
  const other = createJournal({ ...f.configuration, verifyCommand: (command, context) => ({
    verified: true, projectRef, genesisId, generation: command.generation, purpose: command.kind,
    commandHash: context.commandHash, intent: context.intent, principalId: command.payload.operatorId, role: 'operator',
  }) })
  await other.submit(f.command('fence', { operatorId: randomUUID(), nextGeneration: 2 }))
  await refuses(f.authority.applyHold(f.protect), 'AUTHORITY_PENDING')
  assert.equal(f.native.transitions, 0); assert.equal(f.native.creations, 0)
})

test('a lost native resolution resumes derived release under the same steady slow history', async () => {
  const f = await fixture({ deadlineMs: 220, customerOnly: true })
  await f.authority.applyHold(f.protect)
  for (let index = 0; index < 4; index++) {
    const actorId = randomUUID(), requestId = randomUUID()
    await f.authority.submitDecision(f.command('register', { actorId, requestId, receiptHash: hash('synthetic history') }))
    await f.authority.submitDecision(f.command('cancel', { actorId, requestId }))
  }
  f.resolve()
  const get = f.configuration.bucket.get
  f.configuration.bucket.get = async key => {
    if (/\/(commits|candidates|commands)\//.test(key)) await new Promise(resolve => setTimeout(resolve, 6))
    return get(key)
  }
  let result, pending = 0
  for (let retry = 0; retry < 40; retry++) {
    try { result = await f.authority.applyHold(f.protect); break }
    catch (error) { assert.equal(error.code, 'AUTHORITY_PENDING'); pending++; await new Promise(resolve => setTimeout(resolve, 1)) }
  }
  assert.ok(pending > 0); assert.equal(result?.currentState, 'resolved'); assert.equal(f.native.creations, 1)
  assert.equal(f.native.transitions, 1)
})
