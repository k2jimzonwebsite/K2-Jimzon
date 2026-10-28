// Local workerd/Miniflare fixture only. Never reads .env or calls a provider.
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createRequire } from 'node:module'
import { stopLocalRuntime, waitForLocalRuntime, localRuntimeIo } from './lib/local-worker-runtime.mjs'
import { withAuthorityScope } from '../server/privacy-authority/bounds.js'
import { build } from 'esbuild'
import { canonicalJson } from '../server/privacy-authority/state.js'

const root = resolve('.'), runId = randomUUID(), folder = join(root, '.tools', 'closure-authority-runs', runId)
const historyOption = process.argv.slice(2)
if (historyOption.length > 1 || (historyOption.length && !/^--history-target=(16|32|64|128)$/.test(historyOption[0]))) throw new Error('Use only --history-target=16|32|64|128')
const historyTarget = historyOption.length ? Number(historyOption[0].split('=')[1]) : 16
await mkdir(folder, { recursive: true })
const receipt = { runId, historyTarget, scope: 'local workerd R2/SQLite fixture; no production', status: 'running', checks: [], timings: [], sourcePins: [] }
const runtimeRequire = createRequire(join(root, '.tools', 'closure-authority-runtime', 'package.json'))
let mf
async function stopRuntime() {
  const owned = mf
  if (!owned) return
  const result = await stopLocalRuntime(owned)
  ;(receipt.shutdowns ||= []).push(result)
  if (result.disposed) mf = undefined
  if (!result.ok) throw new Error('Owned runtime shutdown is unverified; inspect shutdown receipt')
}
try {
  const { Miniflare, Log, LogLevel } = runtimeRequire('miniflare')
  const runtimeVersion = runtimeRequire('miniflare/package.json').version
  assert.equal(runtimeVersion, '4.20260730.0', 'Requalify an intentional runtime version change')
  receipt.miniflareVersion = runtimeVersion
  const fixturePath = join(root, 'tests', 'fixtures', 'customer-closure-authority-worker.mjs')
  const scriptPath = join(folder, 'worker.mjs')
  await build({ entryPoints: [fixturePath], outfile: scriptPath, bundle: true, format: 'esm', platform: 'browser',
    external: ['cloudflare:workers'], logLevel: 'silent' })
  for (const path of [fixturePath, join(root, 'scripts/rehearse-customer-closure-authority.mjs'),
    join(root, 'scripts/lib/local-worker-runtime.mjs'),
    join(root, 'tests/fixtures/customer-closure-authority-wrangler.toml'),
    join(root, '.tools/closure-authority-runtime/package-lock.json'),
    ...['state.js', 'journal.js', 'sqlite-witness.js', 'bounds.js'].map(file => join(root, 'server/privacy-authority', file))]) {
    receipt.sourcePins.push({ path, sha256: createHash('sha256').update(await readFile(path)).digest('hex') })
  }
  const start = async () => { mf = new Miniflare({ modules: true, scriptPath, compatibilityDate: '2026-07-30',
    bindings: { LOCAL_FIXTURE_ONLY: 'synthetic-only-v2' }, r2Buckets: ['JOURNAL'],
    durableObjects: { AUTHORITY: { className: 'LocalClosureAuthority', useSQLite: true } },
    durableObjectsPersist: join(folder, 'do'), r2Persist: join(folder, 'r2'),
    host: '127.0.0.1', port: 0, log: new Log(LogLevel.ERROR),
    outboundService: () => new Response('External networking disabled in local fixture', { status: 503 }) })
    await waitForLocalRuntime(mf); return mf }
  mf = await start()
  async function call(path, payload, { deny = false } = {}) {
    return withAuthorityScope(async scope => {
    const response = await scope.io(() => mf.dispatchFetch(`http://authority.test${path}`, { method: payload === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'x-k2-local-closure-fixture': 'synthetic-only-v2', ...(deny ? { 'x-fixture-deny-proof': '1' } : {}) },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) }))
    return { status: response.status, data: await scope.io(() => response.json()) }
    })
  }
  const projectRef = 'pixplcjqivlfflickobf', genesisId = '90000000-0000-4000-8000-000000000002'
  const actorId = randomUUID(), requestId = randomUUID()
  const command = (kind, payload, generation = 1) => ({ version: 2, projectRef, genesisId, operationId: randomUUID(), generation, kind, payload })
  const registration = command('register', { actorId, requestId, receiptHash: 'a'.repeat(64) })
  assert.equal((await call('/submit', registration)).data.code, 'AUTHORITY_INTEGRITY')
  assert.equal((await call('/bootstrap', {})).status, 200)
  receipt.checks.push('normal request cannot bootstrap absent head')
  const getBucket = () => withAuthorityScope(scope => scope.io(() => mf.getR2Bucket('JOURNAL')))
  let bucket = await getBucket()
  const created = await localRuntimeIo(() => bucket.put('primitive-only', 'one', { onlyIf: { etagDoesNotMatch: '*' } }))
  assert.ok(created)
  assert.equal(await localRuntimeIo(() => bucket.put('primitive-only', 'two', { onlyIf: { etagDoesNotMatch: '*' } })), null)
  assert.equal(await localRuntimeIo(() => bucket.put('primitive-only', 'two', { onlyIf: { etagMatches: 'wrong-etag' } })), null)
  assert.ok(await localRuntimeIo(() => bucket.put('primitive-only', 'two', { onlyIf: { etagMatches: created.etag } })))
  assert.equal(await localRuntimeIo(() => bucket.put('primitive-only', 'three', { onlyIf: { etagMatches: created.etag } })), null)
  receipt.checks.push('actual local R2 create-once and stale ETag CAS return null')
  assert.equal((await call('/submit', registration, { deny: true })).data.code, 'AUTHORITY_PROOF_REQUIRED')
  const registered = await call('/submit', registration)
  assert.equal(registered.status, 200, canonicalJson(registered.data))
  assert.equal(registered.data.receipt.outcome, 'undecided')
  assert.deepEqual(registered.data.execution, { allowed: false })
  receipt.checks.push('qualified fixture proof and real SQLite witness compose; denied proof creates no decision')
  const stalled = command('register', { actorId: randomUUID(), requestId: randomUUID(), receiptHash: 'd'.repeat(64) })
  const beforeStall = (await call('/state')).data.state.revision
  const stalledResponse = await call('/fixture/hung-proof', stalled)
  assert.equal(stalledResponse.status, 503); assert.equal(stalledResponse.data.code, 'AUTHORITY_PENDING')
  assert.equal((await call('/state')).data.state.revision, beforeStall)
  assert.equal(await localRuntimeIo(() => bucket.get(`${projectRef}/${genesisId}/commands/${stalled.operationId}`)), null)
  assert.equal((await call('/submit', stalled)).status, 200)
  receipt.checks.push('actual workerd deadline returns pending before immutable writes and identical healthy retry succeeds')
  const cancellation = command('cancel', { actorId, requestId })
  const expiry = command('expire', { actorId, requestId })
  const authorization = command('authorize', { actorId, requestId, customerId: null, freezeId: randomUUID(),
    policyVersion: 'account-closure-v1', manifestHash: 'b'.repeat(64), manifestKey: `manifests/${requestId}/${'b'.repeat(64)}.json` })
  const contenders = [cancellation, expiry, authorization]
  const raced = await Promise.all(contenders.map(c => call('/submit', c)))
  assert.equal(raced.filter(result => result.status === 200).length, 1, canonicalJson(raced))
  assert.equal(raced.filter(result => result.data.code === 'DECISION_FINAL').length, 2)
  const winner = raced.findIndex(result => result.status === 200)
  assert.deepEqual((await call('/submit', contenders[winner])).data.receipt, raced[winner].data.receipt)
  receipt.checks.push('serialized native Durable Object terminal race and exact receipt retry')
  const beforeRestart = (await call('/state')).data.state
  await stopRuntime()
  mf = await start()
  bucket = await getBucket()
  assert.equal(canonicalJson((await call('/state')).data.state), canonicalJson(beforeRestart))
  receipt.checks.push('full runtime dispose/restart preserves actual R2 and SQLite state')
  assert.equal((await call('/fixture/erase-witness', {})).status, 200)
  assert.equal(canonicalJson((await call('/state')).data.state), canonicalJson(beforeRestart))
  receipt.checks.push('actual empty SQLite witness reconstructs from full R2 history')
  assert.equal((await call('/fixture/bounded-state')).status, 503, 'The first one-event scan must remain pending')
  await stopRuntime(); mf = await start(); bucket = await getBucket()
  assert.equal((await call('/fixture/bounded-state')).status, 503, 'A cold coordinator must start from genesis again')
  let resumed
  for (let pass = 0; pass < beforeRestart.revision + 2; pass++) {
    const result = await call('/fixture/bounded-state')
    if (result.status === 200) { resumed = result.data; break }
    assert.equal(result.status, 503); assert.equal(result.data.code, 'AUTHORITY_PENDING')
  }
  assert.ok(resumed, 'Stable bounded passes must finish')
  assert.equal(canonicalJson(resumed.state), canonicalJson(beforeRestart))
  receipt.checks.push('actual workerd bounded calls resume and cold restart repeats genesis before identical completion')
  const prefix = `${projectRef}/${genesisId}/`, headKey = `${prefix}head.json`
  const head = await localRuntimeIo(() => bucket.get(headKey)), savedHead = await localRuntimeIo(() => head.text())
  const initialHead = (await call('/fixture/genesis')).data.head
  await localRuntimeIo(() => bucket.put(headKey, canonicalJson(initialHead), { onlyIf: { etagMatches: head.etag } }))
  assert.equal((await call('/state')).data.code, 'AUTHORITY_INTEGRITY')
  const rolledBack = await localRuntimeIo(() => bucket.get(headKey))
  await localRuntimeIo(() => bucket.put(headKey, savedHead, { onlyIf: { etagMatches: rolledBack.etag } }))
  assert.equal((await call('/state')).status, 200)
  receipt.checks.push('actual local head rollback refuses against marker/witness and exact restoration reconciles')
  for (const target of [4, 8, 16, 32, 64, 128].filter(value => value <= historyTarget)) {
    let state = (await call('/state')).data.state
    while (state.revision < target) {
      const c = command('register', { actorId: randomUUID(), requestId: randomUUID(), receiptHash: 'c'.repeat(64) })
      const response = await call('/submit', c)
      assert.equal(response.status, 200, canonicalJson(response.data))
      state = (await call('/state')).data.state
      if (state.revision % 8 === 0) console.log(JSON.stringify({ stage: 'history-progress', revision: state.revision, target }))
    }
    const started = performance.now(), response = await call('/state')
    assert.equal(response.status, 200)
    receipt.timings.push({ revision: target, reconciliationMs: Math.round(performance.now() - started) })
    console.log(JSON.stringify({ stage: 'history-measurement', ...receipt.timings.at(-1) }))
  }
  receipt.checks.push('increasing-history local measurements recorded, not production capacity')
  const subject = randomUUID(), customer = randomUUID(), origin = randomUUID(), replacement = randomUUID(), initiator = randomUUID()
  assert.equal((await call('/submit', command('register', { actorId: subject, requestId: origin, receiptHash: 'e'.repeat(64) }))).status, 200)
  const protection = command('protect', { actorId: subject, requestId: origin, customerId: customer, protectionId: randomUUID(),
    kind: 'legal', nativeIntentHash: 'f'.repeat(64), initiatorId: initiator, initiatorRole: 'admin' })
  assert.equal((await call('/submit', protection)).status, 200)
  assert.equal((await call('/submit', command('cancel', { actorId: subject, requestId: origin }))).status, 200)
  assert.equal((await call('/submit', command('register', { actorId: subject, requestId: replacement, receiptHash: 'e'.repeat(64) }))).status, 200)
  const nextAuthorization = command('authorize', { actorId: subject, requestId: replacement, customerId: customer, freezeId: randomUUID(),
    policyVersion: 'account-closure-v1', manifestHash: 'a'.repeat(64), manifestKey: `manifests/${replacement}/${'a'.repeat(64)}.json` })
  assert.equal((await call('/submit', nextAuthorization)).data.code, 'AUTHORITY_PROTECTED')
  receipt.checks.push('v2 global protection survives origin cancellation and blocks replacement authorization')
  const protectedSnapshot = (await call('/state')).data.state
  await stopRuntime(); mf = await start(); bucket = await getBucket()
  assert.equal(canonicalJson((await call('/state')).data.state), canonicalJson(protectedSnapshot))
  assert.equal((await call('/fixture/erase-witness', {})).status, 200)
  assert.equal(canonicalJson((await call('/state')).data.state), canonicalJson(protectedSnapshot))
  assert.equal((await call('/submit', nextAuthorization)).data.code, 'AUTHORITY_PROTECTED')
  receipt.checks.push('v2 protection persists in native SQLite and reconstructs from R2 after runtime/witness loss')
  const release = command('release_protection', { actorId: subject, requestId: origin, customerId: customer,
    protectionId: protection.payload.protectionId, nativeResolutionHash: 'b'.repeat(64), initiatorId: initiator, initiatorRole: 'admin' })
  assert.equal((await call('/submit', release)).status, 200)
  assert.equal((await call('/state')).data.state.requests[origin].status, 'cancelled')
  assert.equal((await call('/submit', nextAuthorization)).status, 200)
  const late = command('protect', { ...protection.payload, protectionId: randomUUID() })
  assert.equal((await call('/submit', late)).data.code, 'PROCESSING_STARTED')
  receipt.checks.push('v2 verified synthetic release preserves cancellation and late protection cannot use its historic outcome after authorization')
  receipt.authorityFormat = 2
  receipt.genesisId = genesisId
  receipt.status = 'passed'
} catch (error) {
  receipt.status = 'failed'; receipt.error = { name: error.name, message: error.message, code: error.code, causeCode: error.cause?.code }
  process.exitCode = 1
} finally {
  if (mf) {
    try { await stopRuntime(); receipt.runtimeDisposed = true }
    catch (error) { receipt.status = 'failed'; receipt.cleanupError = { message: error.message, code: error.code }; process.exitCode = 1 }
  }
  await writeFile(join(folder, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n')
  console.log(JSON.stringify({ runId, status: receipt.status, checks: receipt.checks.length, timings: receipt.timings, receipt: join(folder, 'receipt.json'), error: receipt.error }))
}
