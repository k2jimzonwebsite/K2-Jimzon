import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { canonicalJson, createGenesisState } from '../server/privacy-authority/state.js'
import { createJournal } from '../server/privacy-authority/journal.js'

const projectRef = 'pixplcjqivlfflickobf', genesisId = '90000000-0000-4000-8000-000000000002'
const actorId = '10000000-0000-4000-8000-000000000001', requestId = '60000000-0000-4000-8000-000000000001'
const prefix = `${projectRef}/${genesisId}/`
const headKey = `${prefix}head.json`
const command = (kind, payload, generation = 1) => ({ version: 2, projectRef, genesisId, operationId: randomUUID(), generation, kind, payload })
const register = () => command('register', { actorId, requestId, receiptHash: 'b'.repeat(64) })
const cancel = () => command('cancel', { actorId, requestId })
const authorize = () => command('authorize', { actorId, requestId, customerId: null, freezeId: randomUUID(),
  policyVersion: 'account-closure-v1', manifestHash: 'a'.repeat(64), manifestKey: `manifests/${requestId}/${'a'.repeat(64)}.json` })
function verified(c, x) {
  const protection = ['protect', 'release_protection'].includes(c.kind)
  return { verified: true, projectRef, genesisId, commandHash: x.commandHash, generation: c.generation,
    purpose: c.kind, intent: x.intent, principalId: protection ? c.payload.initiatorId : c.payload.actorId || c.payload.operatorId,
    role: protection ? c.payload.initiatorRole : ['fence', 'activate'].includes(c.kind) ? 'operator' : ['authorize', 'expire'].includes(c.kind) ? 'worker' : 'customer',
    identityVerified: true, unverifiedExpiryCommitted: true, freezeCommitted: true, manifestVerified: true,
    freeze: { ...c.payload, generation: c.generation }, adminHoldAuthorized: true, workerAuthorityVerified: true,
    holdIntentCommitted: true, holdCommitted: true, resolutionCommitted: true,
    protection: { ...c.payload, generation: c.generation }, resolution: { ...c.payload, generation: c.generation } }
}
// Only object I/O and transactional persistence are doubles. All state, hashes,
// journal replay, conditional decisions and reconciliation use the real modules.
async function fixture(options = {}) {
  const objects = new Map(), calls = [], snapshots = []
  let etag = 0, witnessState = await createGenesisState(genesisId)
  const persist = (key, body) => { const value = { body, etag: String(++etag) }; objects.set(key, value); return value }
  persist(headKey, canonicalJson({ version: 2, projectRef, genesisId, revision: 0, hash: witnessState.hash,
    generation: 1, mode: 'active', revisionNonce: genesisId, eventKey: null, parentHash: null }))
  const bucket = {
    async get(key) {
      calls.push(['get', key]); if (bucket.beforeGet) await bucket.beforeGet(key)
      const value = objects.get(key)
      return value ? { etag: value.etag, text: async () => value.body } : null
    },
    async put(key, body, opts) {
      calls.push(['put', key, opts]); if (bucket.beforePut) await bucket.beforePut(key, body, opts)
      const current = objects.get(key), condition = opts?.onlyIf
      assert.ok(condition, 'every write is conditional')
      if (condition.etagDoesNotMatch === '*' && current) return null
      if (condition.etagMatches !== undefined && condition.etagMatches !== current?.etag) return null
      const saved = persist(key, body)
      if (bucket.afterPut) await bucket.afterPut(key, body, opts)
      return { etag: saved.etag }
    },
    async list({ prefix: listPrefix, cursor }) {
      calls.push(['list', listPrefix, cursor]); if (bucket.beforeList) await bucket.beforeList(cursor)
      const keys = [...objects.keys()].filter(key => key.startsWith(listPrefix)).sort()
      const offset = cursor ? Number(cursor) : 0, size = options.pageSize || 1000
      const page = keys.slice(offset, offset + size), truncated = offset + size < keys.length
      return { objects: page.map(key => ({ key })), truncated, ...(truncated ? { cursor: String(offset + size) } : {}) }
    },
  }
  const witness = {
    async read() { return structuredClone(witnessState) },
    async advance(state) {
      if (witness.beforeAdvance) await witness.beforeAdvance(state)
      if (witnessState && witnessState.revision > state.revision) return structuredClone(witnessState)
      if (witnessState && witnessState.revision === state.revision && witnessState.hash !== state.hash) throw new Error('conflicting witness')
      witnessState = structuredClone(state); snapshots.push(structuredClone(state))
      if (witness.afterAdvance) await witness.afterAdvance(state)
      return structuredClone(witnessState)
    },
  }
  const journal = (overrides = {}) => createJournal({ genesisId, bucket, witness, verifyCommand: verified, ...options, ...overrides })
  return { objects, calls, bucket, witness, journal, persist, snapshots,
    setWitness: value => { witnessState = structuredClone(value) }, getWitness: () => structuredClone(witnessState) }
}
const refuses = (promise, code) => assert.rejects(promise, error => error.code === code)

test('normal requests never bootstrap an absent head or bypass an unqualified proof', async () => {
  const f = await fixture(); f.objects.delete(headKey)
  await refuses(f.journal().submit(register()), 'AUTHORITY_INTEGRITY')
  assert.equal(f.calls.filter(c => c[0] === 'put').length, 0)
  const other = await fixture()
  await refuses(other.journal({ verifyCommand: undefined }).submit(register()), 'AUTHORITY_PROOF_REQUIRED')
  assert.equal(other.calls.filter(c => c[0] === 'put').length, 0)
})

test('a reported decision has its exact marker and witness and returns no execution permit', async () => {
  const f = await fixture(); const c = register(), result = await f.journal().submit(c)
  assert.equal(result.receipt.outcome, 'undecided'); assert.deepEqual(result.execution, { allowed: false })
  const head = JSON.parse(f.objects.get(headKey).body)
  assert.equal(head.revision, 1)
  assert.ok(f.objects.has(`${prefix}commits/0000000000000001`))
  assert.equal(f.getWitness().hash, head.hash)
  assert.deepEqual((await f.journal().submit(c)).receipt, result.receipt)
  assert.equal(JSON.parse(f.objects.get(headKey).body).revision, 1)
})

test('concurrent cancellation and authorization have exactly one terminal winner', async () => {
  const f = await fixture(); await f.journal().submit(register())
  const results = await Promise.allSettled([f.journal().submit(cancel()), f.journal().submit(authorize())])
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1)
  assert.equal(results.find(x => x.status === 'rejected').reason.code, 'DECISION_FINAL')
  assert.equal(JSON.parse(f.objects.get(headKey).body).revision, 2)
  assert.ok(['cancelled', 'authorized'].includes(f.getWitness().requests[requestId].status))
})

test('an unrelated CAS winner rebases the same immutable command rather than overwriting its attempt', async () => {
  const f = await fixture(); const first = register(), second = register()
  second.payload.actorId = randomUUID(); second.payload.requestId = randomUUID()
  await Promise.all([f.journal().submit(first), f.journal().submit(second)])
  assert.equal(Object.keys(f.getWitness().requests).length, 2)
  assert.equal([...f.objects.keys()].filter(k => k.includes('/commands/')).length, 2)
  assert.ok([...f.objects.keys()].filter(k => k.includes('/candidates/')).length >= 3)
})

for (const gap of ['commands', 'candidates', 'head', 'commits', 'witness']) {
  test(`lost ${gap} acknowledgment reconciles an identical operation after restart`, async () => {
    const f = await fixture(); const c = register(); let lose = true
    const loss = () => { if (lose) { lose = false; throw new Error('Synthetic crash after durable write') } }
    if (gap === 'witness') f.witness.afterAdvance = state => { if (state.revision > 0) loss() }
    else f.bucket.afterPut = async key => { if (key === headKey ? gap === 'head' : key.includes(`/${gap}/`)) loss() }
    await refuses(f.journal().submit(c), 'AUTHORITY_PENDING')
    assert.equal(JSON.parse(f.objects.get(headKey).body).revision, ['head', 'commits', 'witness'].includes(gap) ? 1 : 0)
    f.bucket.afterPut = undefined; f.witness.afterAdvance = undefined
    const retried = await f.journal().submit(c)
    assert.equal(retried.receipt.outcome, 'undecided')
    assert.equal(f.getWitness().revision, 1)
    assert.equal(JSON.parse(f.objects.get(headKey).body).revision, 1)
  })
}

test('a negative read during an in-flight head write never reports a definitive failure', async () => {
  const f = await fixture(); const c = register(); let release, entered
  const pending = new Promise(resolve => { entered = resolve })
  f.bucket.beforePut = async key => { if (key === headKey) { entered(); await new Promise(resolve => { release = resolve }) } }
  const submitted = f.journal().submit(c)
  await pending
  assert.equal(f.getWitness().revision, 0)
  assert.equal(JSON.parse(f.objects.get(headKey).body).revision, 0)
  const read = await f.journal().reconcile()
  assert.equal(read.state.revision, 0) // an observation, not a command refusal
  release(); await submitted
  assert.equal((await f.journal().submit(c)).receipt.outcome, 'undecided')
})

test('a stalled read returns bounded uncertainty without bootstrapping or writing later', async () => {
  const f = await fixture(); let release
  f.bucket.beforeGet = async () => { await new Promise(resolve => { release = resolve }) }
  const observed = await Promise.race([
    f.journal({ deadlineMs: 15 }).reconcile().then(() => 'unexpected-success', error => error.code),
    new Promise(resolve => setTimeout(() => resolve('unbounded'), 150)),
  ])
  assert.equal(observed, 'AUTHORITY_PENDING')
  f.bucket.beforeGet = undefined; release()
  await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(f.calls.filter(c => c[0] === 'put').length, 0)
})

test('a stalled head write returns uncertainty, then the same operation reconciles its late commit', async () => {
  const f = await fixture(); const c = register(); let release
  f.bucket.beforePut = async key => { if (key === headKey) await new Promise(resolve => { release = resolve }) }
  const observed = await Promise.race([
    f.journal({ deadlineMs: 100 }).submit(c).then(() => 'unexpected-success', error => error.code),
    new Promise(resolve => setTimeout(() => resolve('unbounded'), 800)),
  ])
  assert.equal(observed, 'AUTHORITY_PENDING')
  f.bucket.beforePut = undefined; release()
  await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(f.getWitness().revision, 0)
  const result = await f.journal().submit(c)
  assert.equal(result.receipt.outcome, 'undecided')
  assert.equal(f.getWitness().revision, 1)
})

test('a conflicting commit marker or missing committed candidate refuses without overwriting evidence', async () => {
  for (const corruption of ['marker', 'candidate']) {
    const f = await fixture(); await f.journal().submit(register())
    const head = JSON.parse(f.objects.get(headKey).body)
    if (corruption === 'marker') f.persist(`${prefix}commits/0000000000000001`, canonicalJson({ corrupted: true }))
    else f.objects.delete(head.eventKey)
    const before = canonicalJson([...f.objects])
    await refuses(f.journal().reconcile(), 'AUTHORITY_INTEGRITY')
    assert.equal(canonicalJson([...f.objects]), before)
  }
})

test('rolled-back head is detected by both later immutable markers and independent witness', async () => {
  for (const keepMarkers of [true, false]) {
    const f = await fixture(); const old = f.objects.get(headKey).body
    await f.journal().submit(register()); f.persist(headKey, old)
    if (!keepMarkers) for (const key of f.objects.keys()) if (key.includes('/commits/')) f.objects.delete(key)
    await refuses(f.journal().reconcile(), 'AUTHORITY_INTEGRITY')
  }
})

test('full paginated history rebuilds a lost derived index; incomplete budget never reports ready', async () => {
  const f = await fixture({ pageSize: 1 }); await f.journal().submit(register()); await f.journal().submit(cancel())
  f.setWitness(null)
  await refuses(f.journal({ maxPages: 1 }).reconcile(), 'AUTHORITY_PENDING')
  assert.equal(f.getWitness(), null)
  const rebuilt = await f.journal().reconcile()
  assert.equal(rebuilt.state.revision, 2); assert.equal(f.getWitness().requests[requestId].status, 'cancelled')
})

test('a legitimate head advance during pagination restarts rather than declaring corruption', async () => {
  const f = await fixture({ pageSize: 1 }); await f.journal().submit(register())
  let advanced = false
  f.bucket.beforeList = async () => {
    if (!advanced) { advanced = true; await f.journal().submit(cancel()) }
  }
  const result = await f.journal().reconcile()
  assert.equal(result.state.revision, 2); assert.equal(result.state.requests[requestId].status, 'cancelled')
})

test('generation fencing prevents a previously prepared old-generation head from winning later', async () => {
  const f = await fixture(); await f.journal().submit(register())
  let release, entered, hold = true
  const waiting = new Promise(resolve => { entered = resolve })
  f.bucket.beforePut = async (key, body) => {
    if (key === headKey && JSON.parse(body).generation === 1 && hold) {
      hold = false; entered(); await new Promise(resolve => { release = resolve })
    }
  }
  const oldWrite = f.journal().submit(authorize()); await waiting
  await f.journal().submit(command('fence', { operatorId: randomUUID(), nextGeneration: 2 }))
  release(); await refuses(oldWrite, 'STALE_GENERATION')
  assert.equal(f.getWitness().mode, 'recovering'); assert.equal(f.getWitness().requests[requestId].status, 'undecided')
})

test('unsealed head blocks a later command until its exact marker and witness can be persisted', async () => {
  const f = await fixture(); let refuseMarkers = true
  f.bucket.beforePut = async key => { if (key.includes('/commits/') && refuseMarkers) throw new Error('marker offline') }
  await refuses(f.journal().submit(register()), 'AUTHORITY_PENDING')
  await refuses(f.journal().submit(cancel()), 'AUTHORITY_PENDING')
  assert.equal(JSON.parse(f.objects.get(headKey).body).revision, 1)
  assert.equal(f.getWitness().revision, 0)
  refuseMarkers = false
  await f.journal().submit(cancel())
  assert.equal(f.getWitness().requests[requestId].status, 'cancelled')
})

test('cancel, expiry and authorization racing together produce one terminal receipt', async () => {
  const f = await fixture(); await f.journal().submit(register())
  const results = await Promise.allSettled([cancel(), command('expire', { actorId, requestId }), authorize()].map(c => f.journal().submit(c)))
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(results.filter(result => result.status === 'rejected' && result.reason.code === 'DECISION_FINAL').length, 2)
  assert.equal(f.getWitness().revision, 2)
})

test('different logical commands racing on the same operation ID preserve one immutable binding', async () => {
  const f = await fixture(), first = register(), changed = { ...register(), operationId: first.operationId }
  changed.payload.actorId = randomUUID(); changed.payload.requestId = randomUUID()
  const results = await Promise.allSettled([first, changed].map(c => f.journal().submit(c)))
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'OPERATION_CONFLICT')
  assert.equal(f.getWitness().revision, 1)
})

test('an unresponsive proof verifier returns pending and creates no command or candidate', async () => {
  const f = await fixture()
  await refuses(f.journal({ deadlineMs: 40, verifyCommand: () => new Promise(() => {}) }).submit(register()), 'AUTHORITY_PENDING')
  assert.equal(f.calls.filter(c => c[0] === 'put').length, 0)
})

test('a coordinator abort stops a waiting proof before any later immutable write', async () => {
  const f = await fixture(), controller = new AbortController()
  let release, entered
  const started = new Promise(resolve => { entered = resolve })
  const gate = new Promise(resolve => { release = resolve })
  const journal = f.journal({ verifyCommand: async (c, x) => { entered(); await gate; return verified(c, x) } })
  const pending = journal.submit(register(), undefined, { signal: controller.signal })
  await started; controller.abort(); release()
  await refuses(pending, 'AUTHORITY_PENDING')
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(f.calls.filter(c => c[0] === 'put').length, 0)
})

test('an already aborted coordinator starts no journal I/O', async () => {
  const f = await fixture(), controller = new AbortController(); controller.abort()
  await refuses(f.journal().reconcile({ signal: controller.signal }), 'AUTHORITY_PENDING')
  assert.equal(f.calls.length, 0)
})

async function finishScan(journal, limit = 12) {
  for (let attempt = 0; attempt < limit; attempt++) {
    try { return await journal.reconcile() }
    catch (error) { if (error.code !== 'AUTHORITY_PENDING') throw error }
  }
  assert.fail('Bounded scan never progressed to the complete result')
}

test('event-limited passes resume without incomplete witness, seal or command writes', async () => {
  const f = await fixture(); await f.journal().submit(register()); await f.journal().submit(cancel())
  f.setWitness(null); const journal = f.journal({ maxEventsPerPass: 1 })
  f.calls.length = 0
  await refuses(journal.reconcile(), 'AUTHORITY_PENDING')
  assert.equal(f.getWitness(), null); assert.equal(f.calls.filter(call => call[0] === 'put').length, 0)
  const result = await finishScan(journal)
  assert.equal(result.state.revision, 2); assert.equal(result.state.requests[requestId].status, 'cancelled')
})

test('page-limited passes retain their cursor and a new coordinator starts from genesis', async () => {
  const f = await fixture({ pageSize: 1 }); await f.journal().submit(register()); await f.journal().submit(cancel())
  f.setWitness(null)
  const first = f.journal({ maxPages: 1, maxEventsPerPass: 1 })
  await refuses(first.reconcile(), 'AUTHORITY_PENDING')
  const restarted = f.journal({ maxPages: 1, maxEventsPerPass: 1 })
  f.calls.length = 0; await refuses(restarted.reconcile(), 'AUTHORITY_PENDING')
  assert.equal(f.calls.find(call => call[0] === 'list')[2], undefined)
  const result = await finishScan(restarted)
  assert.equal(result.state.revision, 2)
  assert.ok(f.calls.some(call => call[0] === 'list' && call[2] === '1'))
})

test('head changes between passes reset checked progress and include the new terminal result', async () => {
  const f = await fixture(); await f.journal().submit(register()); await f.journal().submit(cancel())
  const journal = f.journal({ maxEventsPerPass: 1 })
  await refuses(journal.reconcile(), 'AUTHORITY_PENDING')
  const second = register(); second.payload.requestId = randomUUID()
  await f.journal().submit(second)
  const result = await finishScan(journal)
  assert.equal(result.state.revision, 3); assert.equal(result.state.requests[second.payload.requestId].status, 'undecided')
})

test('a corrupt later record cannot turn an incomplete prefix into readiness', async () => {
  const f = await fixture(); await f.journal().submit(register()); await f.journal().submit(cancel())
  f.setWitness(null); const journal = f.journal({ maxEventsPerPass: 1 })
  await refuses(journal.reconcile(), 'AUTHORITY_PENDING')
  const head = JSON.parse(f.objects.get(headKey).body)
  f.objects.delete(head.eventKey)
  await refuses(journal.reconcile(), 'AUTHORITY_INTEGRITY')
  assert.equal(f.getWitness(), null)
})

test('competing calls do not publish or overwrite another bounded scan pass', async () => {
  const f = await fixture(); await f.journal().submit(register()); await f.journal().submit(cancel())
  const journal = f.journal({ maxEventsPerPass: 1 }); let release, entered, held = false
  const waiting = new Promise(resolve => { entered = resolve })
  f.bucket.beforeList = async () => { if (!held) { held = true; entered(); await new Promise(resolve => { release = resolve }) } }
  const pending = journal.reconcile().then(value => ({ value }), error => ({ error })); await waiting
  try { await refuses(journal.reconcile(), 'AUTHORITY_PENDING') }
  finally { release(); const result = await pending; assert.equal(result.error?.code, 'AUTHORITY_PENDING') }
  assert.equal((await finishScan(journal)).state.revision, 2)
})

test('completion rechecks a witness changed after the first partial pass', async () => {
  const f = await fixture(); await f.journal().submit(register()); await f.journal().submit(cancel())
  const journal = f.journal({ maxEventsPerPass: 1 })
  await refuses(journal.reconcile(), 'AUTHORITY_PENDING')
  const corrupt = f.getWitness(); corrupt.hash = 'f'.repeat(64); f.setWitness(corrupt)
  await refuses(journal.reconcile(), 'AUTHORITY_INTEGRITY')
  assert.equal(f.getWitness().hash, corrupt.hash)
})

test('a timed-out resumed pass cannot overwrite progress after its delayed I/O returns', async () => {
  const f = await fixture(); await f.journal().submit(register()); await f.journal().submit(cancel())
  const journal = f.journal({ maxEventsPerPass: 1, deadlineMs: 150 })
  await refuses(journal.reconcile(), 'AUTHORITY_PENDING')
  let release, entered
  const waiting = new Promise(resolve => { entered = resolve })
  f.bucket.beforeGet = async key => { if (key === `${prefix}commits/0000000000000002`) { entered(); await new Promise(resolve => { release = resolve }) } }
  const lost = refuses(journal.reconcile(), 'AUTHORITY_PENDING'); await waiting; await lost
  f.bucket.beforeGet = undefined
  const complete = await finishScan(journal)
  release(); await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(complete.state.revision, 2)
  assert.equal((await finishScan(journal)).state.hash, complete.state.hash)
})

test('a repeated pagination cursor refuses after resuming instead of looping or becoming ready', async () => {
  const f = await fixture({ pageSize: 1 }); await f.journal().submit(register()); await f.journal().submit(cancel())
  const journal = f.journal({ maxPages: 1, maxEventsPerPass: 1 })
  await refuses(journal.reconcile(), 'AUTHORITY_PENDING')
  f.bucket.list = async () => ({ objects: [], truncated: true, cursor: '1' })
  await refuses(journal.reconcile(), 'AUTHORITY_INTEGRITY')
})

test('head-change retries share one event allowance for the reconciliation call', async () => {
  const f = await fixture(); await f.journal().submit(register()); await f.journal().submit(cancel())
  const journal = f.journal({ maxEventsPerPass: 1 })
  let advanced = false, otherCall = false, ownCandidates = 0
  f.bucket.beforeGet = async key => {
    if (!key.includes('/candidates/') || otherCall) return
    ownCandidates++
    if (!advanced) {
      advanced = true; otherCall = true
      const later = register(); later.payload.requestId = randomUUID()
      try { await f.journal().submit(later) } finally { otherCall = false }
    }
  }
  await refuses(journal.reconcile(), 'AUTHORITY_PENDING')
  assert.equal(ownCandidates, 1)
  assert.equal((await finishScan(journal)).state.revision, 3)
})

test('a protection with lost head acknowledgement survives exact retry and lost witness reconstruction', async () => {
  const f = await fixture(); await f.journal().submit(register())
  const p = command('protect', { actorId, requestId, customerId: randomUUID(), protectionId: randomUUID(), kind: 'legal',
    nativeIntentHash: 'c'.repeat(64), initiatorId: randomUUID(), initiatorRole: 'admin' })
  let lose = true
  f.bucket.afterPut = async key => { if (key === headKey && lose) { lose = false; throw new Error('lost protection acknowledgment') } }
  await refuses(f.journal().submit(p), 'AUTHORITY_PENDING')
  f.bucket.afterPut = undefined
  const receipt = (await f.journal().submit(p)).receipt
  assert.equal(receipt.outcome, 'protected')
  f.setWitness(null)
  const restored = await f.journal().reconcile()
  assert.equal(restored.state.protections[p.payload.protectionId].state, 'active')
  assert.deepEqual((await f.journal().submit(p)).receipt, receipt)
})

test('v1 head bytes are refused without mutation in a v2 namespace', async () => {
  const f = await fixture(), head = JSON.parse(f.objects.get(headKey).body)
  f.persist(headKey, canonicalJson({ ...head, version: 1 }))
  await refuses(f.journal().reconcile(), 'AUTHORITY_INTEGRITY')
  assert.equal(f.calls.filter(call => call[0] === 'put').length, 0)
})

test('independent protection and authorization coordinator calls commit only one applicable winner', async () => {
  const f = await fixture(); await f.journal().submit(register())
  const auth = authorize(); auth.payload.customerId = randomUUID()
  const p = command('protect', { actorId, requestId, customerId: auth.payload.customerId, protectionId: randomUUID(), kind: 'refund',
    nativeIntentHash: 'e'.repeat(64), initiatorId: randomUUID(), initiatorRole: 'admin' })
  const results = await Promise.allSettled([f.journal().submit(p), f.journal().submit(auth)])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.ok(['AUTHORITY_PROTECTED', 'PROCESSING_STARTED'].includes(results.find(result => result.status === 'rejected').reason.code))
  assert.equal(f.getWitness().revision, 2)
})
