import { AUTHORITY_FORMAT_VERSION, canonicalJson, createDecisionCore, createGenesisState, validateCheckpoint } from './state.js'
import { withAuthorityScope } from './bounds.js'

const PROJECT = 'pixplcjqivlfflickobf'
function refuse(code) { throw Object.assign(new Error(code), { code }) }
const same = (a, b) => canonicalJson(a) === canonicalJson(b)

// Pure protocol over injected direct R2 operations and an atomic monotonic
// witness. No bootstrap, HTTP route, credential, provider mutation or permit.
export function createJournal({ genesisId, bucket, witness, verifyCommand, maxPages = 32, maxEventsPerPass = 128, maxAttempts = 5, deadlineMs = 9000 } = {}) {
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || !Number.isSafeInteger(maxAttempts) || maxAttempts < 1
    || !Number.isSafeInteger(maxEventsPerPass) || maxEventsPerPass < 1
    || !Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 9000) refuse('COMMAND_INVALID')
  const prefix = `${PROJECT}/${genesisId}/`, headKey = `${prefix}head.json`
  let progress = null, scanBusy = false
  const markerKey = revision => `${prefix}commits/${String(revision).padStart(16, '0')}`
  const eventKey = candidate => `${prefix}candidates/${candidate.attemptId}`
  const markerFor = candidate => ({ version: AUTHORITY_FORMAT_VERSION, projectRef: PROJECT, genesisId, revision: candidate.revision,
    hash: candidate.hash, parentHash: candidate.parentHash, generation: candidate.generation, eventKey: eventKey(candidate) })
  const headFor = (state, candidate) => ({ version: AUTHORITY_FORMAT_VERSION, projectRef: PROJECT, genesisId, revision: state.revision,
    hash: state.hash, generation: state.generation, mode: state.mode, revisionNonce: candidate ? candidate.revisionNonce : genesisId,
    eventKey: candidate ? eventKey(candidate) : null, parentHash: candidate ? candidate.parentHash : null })

  async function bounded(operation, { signal } = {}) {
    return withAuthorityScope(async scope => {
    const core = createDecisionCore({ genesisId,
      verifyCommand: (command, context, evidence) => scope.io(() => verifyCommand ? verifyCommand(command, { ...context, signal: scope.signal }, evidence) : null),
      commandStore: { claim: (key, bytes) => putImmutable(scope, key, bytes) } })
    return operation(scope, core)
    }, { deadlineMs, signal })
  }

  async function read(scope, key) {
    let object, bytes
    try {
      object = await scope.io(() => bucket.get(key))
      if (!object) return null
      bytes = await scope.io(() => object.text())
    } catch { refuse('AUTHORITY_PENDING') }
    if (typeof bytes !== 'string' || new TextEncoder().encode(bytes).length > 65536) refuse('AUTHORITY_INTEGRITY')
    let body
    try { body = JSON.parse(bytes); if (canonicalJson(body) !== bytes) refuse('AUTHORITY_INTEGRITY') }
    catch { refuse('AUTHORITY_INTEGRITY') }
    return { body, bytes, etag: object.etag }
  }
  async function putImmutable(scope, key, bytes) {
    let saved
    try { saved = await scope.io(() => bucket.put(key, bytes, { onlyIf: { etagDoesNotMatch: '*' } })) }
    catch { refuse('AUTHORITY_PENDING') }
    if (saved) return bytes
    const existing = await read(scope, key)
    if (!existing) refuse('AUTHORITY_PENDING') // absence cannot settle an in-flight write
    return existing.bytes
  }
  async function exactImmutable(scope, key, body) {
    const bytes = canonicalJson(body)
    if (await putImmutable(scope, key, bytes) !== bytes) refuse('AUTHORITY_INTEGRITY')
  }

  async function readHead(scope) {
    const result = await read(scope, headKey), head = result?.body
    if (!head || typeof result.etag !== 'string' || !result.etag
      || head.projectRef !== PROJECT || head.genesisId !== genesisId || head.version !== AUTHORITY_FORMAT_VERSION
      || !Number.isSafeInteger(head.revision) || head.revision < 0) refuse('AUTHORITY_INTEGRITY')
    return result
  }
  async function newScan(scope, head) {
    let checkpoint
    try { checkpoint = await scope.io(() => witness.read()) }
    catch { refuse('AUTHORITY_PENDING') }
    const state = await createGenesisState(genesisId)
    let witnessed = checkpoint === null
    if (checkpoint?.revision === 0) {
      if (!same(checkpoint, state)) refuse('AUTHORITY_INTEGRITY')
      witnessed = true
    }
    return { head, checkpoint, state, witnessed, cursor: null, seenCursors: [], pendingKeys: [],
      listed: 0, listDone: false, lastCandidate: null, missingSeal: null }
  }

  async function scanPass(scope, core, scan, budget) {
    const head = scan.head.body
    while (true) {
      if (!scan.pendingKeys.length && !scan.listDone) {
        if (budget.pages === maxPages) return false
        let result
        try { result = await scope.io(() => bucket.list({ prefix: `${prefix}commits/`, ...(scan.cursor ? { cursor: scan.cursor } : {}) })) }
        catch { refuse('AUTHORITY_PENDING') }
        if (!result || !Array.isArray(result.objects) || typeof result.truncated !== 'boolean') refuse('AUTHORITY_INTEGRITY')
        for (const object of result.objects) {
          if (object.key !== markerKey(scan.listed + 1) || scan.listed >= head.revision) refuse('AUTHORITY_INTEGRITY')
          scan.pendingKeys.push(object.key); scan.listed++
        }
        scan.listDone = !result.truncated
        if (result.truncated) {
          if (typeof result.cursor !== 'string' || !result.cursor || scan.seenCursors.includes(result.cursor)) refuse('AUTHORITY_INTEGRITY')
          scan.seenCursors.push(result.cursor); scan.cursor = result.cursor
        }
        budget.pages++
      }
      if (!scan.pendingKeys.length && !scan.listDone) continue
      const revision = scan.state.revision + 1
      if (!scan.pendingKeys.length && scan.listDone && scan.state.revision === head.revision) {
        if (!same(head, headFor(scan.state, scan.lastCandidate)) || !scan.witnessed) refuse('AUTHORITY_INTEGRITY')
        return true
      }
      if (budget.events === maxEventsPerPass) return false
      const hasMarker = scan.pendingKeys.length > 0
      if (!hasMarker && (!scan.listDone || scan.listed !== head.revision - 1 || revision !== head.revision)) refuse('AUTHORITY_INTEGRITY')
      const key = hasMarker ? scan.pendingKeys[0] : markerKey(revision)
      if (key !== markerKey(revision)) refuse('AUTHORITY_INTEGRITY')
      const marker = hasMarker ? (await read(scope, key))?.body : null
      const candidateKey = hasMarker ? marker?.eventKey : head.eventKey
      if (typeof candidateKey !== 'string' || !candidateKey.startsWith(`${prefix}candidates/`)
        || !/^[0-9a-f]{64}$/.test(candidateKey.slice(`${prefix}candidates/`.length))) refuse('AUTHORITY_INTEGRITY')
      const candidate = (await read(scope, candidateKey))?.body
      if (!candidate || eventKey(candidate) !== candidateKey) refuse('AUTHORITY_INTEGRITY')
      try { scan.state = await core.applyCommitted(scan.state, candidate) }
      catch { refuse('AUTHORITY_INTEGRITY') }
      if (candidate.revision !== revision) refuse('AUTHORITY_INTEGRITY')
      const logical = await read(scope, `${prefix}commands/${candidate.command.operationId}`)
      if (!logical || !same(logical.body, candidate.command)) refuse('AUTHORITY_INTEGRITY')
      const expectedMarker = markerFor(candidate)
      if (hasMarker && !same(marker, expectedMarker)) refuse('AUTHORITY_INTEGRITY')
      if (!hasMarker) scan.missingSeal = expectedMarker
      if (scan.checkpoint?.revision === revision) {
        if (!same(scan.checkpoint, scan.state)) refuse('AUTHORITY_INTEGRITY')
        scan.witnessed = true
      }
      scan.lastCandidate = candidate
      if (hasMarker) scan.pendingKeys.shift()
      budget.events++
    }
  }

  async function reconcile(scope, core) {
    if (scanBusy) refuse('AUTHORITY_PENDING')
    scanBusy = true
    const budget = { pages: 0, events: 0 }
    try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const before = await readHead(scope)
      let scan, complete, failure
      // Delay a corruption diagnosis until a fresh unchanged head rules out a
      // legitimate advance during the paginated, multi-object read.
      try {
        scan = progress && progress.head.etag === before.etag && same(progress.head.body, before.body)
          ? structuredClone(progress) : await newScan(scope, before)
        complete = await scanPass(scope, core, scan, budget)
      }
      catch (error) { failure = error }
      const after = await readHead(scope)
      if (before.etag !== after.etag || !same(before.body, after.body)) { progress = null; continue }
      if (failure) { progress = null; throw failure }
      if (!complete) { progress = scan; refuse('AUTHORITY_PENDING') }
      let latestWitness
      try { latestWitness = await scope.io(() => witness.read()) }
      catch { refuse('AUTHORITY_PENDING') }
      const finalHead = await readHead(scope)
      if (finalHead.etag !== after.etag || !same(finalHead.body, after.body)) { progress = null; continue }
      if (latestWitness !== null) {
        try { await validateCheckpoint(latestWitness, genesisId) }
        catch { progress = null; refuse('AUTHORITY_INTEGRITY') }
        if (latestWitness.revision > scan.state.revision
          || Object.entries(latestWitness.operations).some(([id, result]) => !scan.state.operations[id] || !same(result, scan.state.operations[id]))) {
          progress = null; refuse('AUTHORITY_INTEGRITY')
        }
      }
      if (scan.missingSeal) await exactImmutable(scope, markerKey(scan.state.revision), scan.missingSeal)
      let saved
      try { saved = await scope.io(() => witness.advance(scan.state)) }
      catch { refuse('AUTHORITY_PENDING') }
      if (!same(saved, scan.state)) {
        progress = null
        if (saved?.revision > scan.state.revision) continue
        refuse('AUTHORITY_INTEGRITY')
      }
      progress = null
      return { state: scan.state, head: after.body, etag: after.etag }
    }
    refuse('AUTHORITY_PENDING')
    } finally { scanBusy = false }
  }

  return {
    reconcile: options => bounded(reconcile, options),
    async submit(rawCommand, evidence, options) {
      const command = JSON.parse(canonicalJson(rawCommand))
      return bounded(async (scope, core) => {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const current = await reconcile(scope, core)
          const prepared = await core.prepare(current.state, command, evidence)
          if (prepared.kind === 'historical') return { receipt: prepared.receipt, execution: { allowed: false } }
          const candidate = prepared.candidate
          await exactImmutable(scope, eventKey(candidate), candidate)
          const nextState = await core.applyCommitted(current.state, candidate)
          let won
          try { won = await scope.io(() => bucket.put(headKey, canonicalJson(headFor(nextState, candidate)), { onlyIf: { etagMatches: current.etag } })) }
          catch { refuse('AUTHORITY_PENDING') }
          if (!won) continue
          const committed = await reconcile(scope, core)
          const result = await core.prepare(committed.state, command, evidence)
          if (result.kind !== 'historical') refuse('AUTHORITY_PENDING')
          return { receipt: result.receipt, execution: { allowed: false } }
        }
        refuse('AUTHORITY_PENDING')
      }, options)
    },
  }
}
