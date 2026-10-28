// Local decision component only. No provider I/O or executable deletion permits.
const PROJECT = 'pixplcjqivlfflickobf'
export const AUTHORITY_FORMAT_VERSION = 2
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const HASH = /^[0-9a-f]{64}$/
const encoder = new TextEncoder()

function refuse(code) { throw Object.assign(new Error(code), { code }) }
function record(value) { return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype }
function exact(value, keys) {
  if (!record(value) || Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) refuse('COMMAND_INVALID')
}
function uuid(value) { if (typeof value !== 'string' || !UUID.test(value)) refuse('COMMAND_INVALID') }
function hash(value) { if (typeof value !== 'string' || !HASH.test(value)) refuse('COMMAND_INVALID') }
function counter(value) { if (!Number.isSafeInteger(value) || value < 1) refuse('COMMAND_INVALID') }

export function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${Array.from(value, canonicalJson).join(',')}]`
  if (record(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  refuse('COMMAND_INVALID')
}
async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalJson(value)))
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}
async function seal(state) {
  const { checksum: _checksum, ...body } = state
  return { ...body, checksum: await digest(body) }
}
export async function createGenesisState(genesisId) {
  uuid(genesisId)
  const namespace = { version: AUTHORITY_FORMAT_VERSION, projectRef: PROJECT, genesisId }
  return seal({ ...namespace, revision: 0, hash: await digest(namespace), generation: 1, mode: 'active',
    requests: {}, actors: {}, operations: {}, protections: {} })
}

function validateCommand(raw, genesisId) {
  // A JSON round trip copies the caller's object before any async adapter runs.
  const bytes = canonicalJson(raw)
  if (encoder.encode(bytes).length > 32768) refuse('COMMAND_INVALID')
  const c = JSON.parse(bytes)
  exact(c, ['version', 'projectRef', 'genesisId', 'operationId', 'generation', 'kind', 'payload'])
  if (c.version !== AUTHORITY_FORMAT_VERSION || c.projectRef !== PROJECT || c.genesisId !== genesisId) refuse('COMMAND_INVALID')
  uuid(c.operationId); counter(c.generation)
  const p = c.payload
  switch (c.kind) {
    case 'register':
      exact(p, ['actorId', 'requestId', 'receiptHash']); uuid(p.actorId); uuid(p.requestId); hash(p.receiptHash)
      break
    case 'cancel': case 'expire':
      exact(p, ['actorId', 'requestId']); uuid(p.actorId); uuid(p.requestId)
      break
    case 'authorize':
      exact(p, ['actorId', 'requestId', 'customerId', 'freezeId', 'policyVersion', 'manifestHash', 'manifestKey'])
      uuid(p.actorId); uuid(p.requestId); uuid(p.freezeId); hash(p.manifestHash)
      if (p.customerId !== null) uuid(p.customerId)
      if (p.policyVersion !== 'account-closure-v1' || p.manifestKey !== `manifests/${p.requestId}/${p.manifestHash}.json`) refuse('COMMAND_INVALID')
      break
    case 'protect': case 'release_protection': {
      const shared = ['actorId', 'requestId', 'customerId', 'protectionId', 'initiatorId', 'initiatorRole']
      exact(p, [...shared, ...(c.kind === 'protect' ? ['kind', 'nativeIntentHash'] : ['nativeResolutionHash'])])
      for (const field of ['customerId', 'protectionId', 'initiatorId']) uuid(p[field])
      if (p.actorId !== null || p.requestId !== null) { uuid(p.actorId); uuid(p.requestId) }
      if (!['admin', 'worker'].includes(p.initiatorRole)) refuse('COMMAND_INVALID')
      if (c.kind === 'protect') {
        if (!['legal', 'refund', 'dispute', 'security'].includes(p.kind)) refuse('COMMAND_INVALID')
        hash(p.nativeIntentHash)
      } else hash(p.nativeResolutionHash)
      break
    }
    case 'fence':
      exact(p, ['operatorId', 'nextGeneration']); uuid(p.operatorId); counter(p.nextGeneration)
      break
    case 'activate':
      exact(p, ['operatorId', 'reconciliationHash', 'fencedHeadHash'])
      uuid(p.operatorId); hash(p.reconciliationHash); hash(p.fencedHeadHash)
      break
    default: refuse('COMMAND_INVALID')
  }
  return { command: c, bytes }
}

export async function validateCheckpoint(state, genesisId) {
  try {
    exact(state, ['version', 'projectRef', 'genesisId', 'revision', 'hash', 'generation', 'mode', 'requests', 'actors', 'operations', 'protections', 'checksum'])
    if (state.version !== AUTHORITY_FORMAT_VERSION || state.projectRef !== PROJECT || state.genesisId !== genesisId
      || !Number.isSafeInteger(state.revision) || state.revision < 0
      || !['active', 'recovering'].includes(state.mode)
      || ![state.requests, state.actors, state.operations, state.protections].every(record)) refuse('STATE_INTEGRITY')
    counter(state.generation); hash(state.hash)
    if ((await seal(state)).checksum !== state.checksum) refuse('STATE_INTEGRITY')
    // Rebuild from the retained exact receipts, rather than trusting separately
    // checksummed indexes. This proves internal consistency, not provenance:
    // the journal must still verify its independent immutable history/witness.
    let rebuilt = await createGenesisState(genesisId)
    const operations = Object.entries(state.operations).sort((a, b) => a[1]?.receipt?.committedRevision - b[1]?.receipt?.committedRevision)
    if (operations.length !== state.revision) refuse('STATE_INTEGRITY')
    for (const [operationId, operation] of operations) {
      uuid(operationId); exact(operation, ['commandHash', 'receipt']); hash(operation.commandHash)
      const r = operation.receipt
      exact(r, ['operationId', 'commandHash', 'kind', 'outcome', 'committedRevision', 'committedGeneration', 'subject'])
      counter(r.committedRevision); counter(r.committedGeneration)
      if (r.operationId !== operationId || r.commandHash !== operation.commandHash
        || r.committedRevision !== rebuilt.revision + 1) refuse('STATE_INTEGRITY')
      const c = { version: AUTHORITY_FORMAT_VERSION, projectRef: PROJECT, genesisId, operationId, kind: r.kind, payload: r.subject,
        generation: r.kind === 'fence' ? r.committedGeneration - 1 : r.committedGeneration }
      validateCommand(c, genesisId)
      const { candidate, next } = await candidateFor(rebuilt, c, await digest(c))
      if (canonicalJson(candidate.receipt) !== canonicalJson(r)) refuse('STATE_INTEGRITY')
      next.revision = candidate.revision; next.hash = candidate.hash
      next.operations[operationId] = structuredClone(operation)
      rebuilt = next
    }
    if (canonicalJson(await seal(rebuilt)) !== canonicalJson(state)) refuse('STATE_INTEGRITY')
  } catch { refuse('STATE_INTEGRITY') }
}

function transition(state, c) {
  if (c.generation !== state.generation) refuse('STALE_GENERATION')
  if (state.mode === 'recovering' && !['fence', 'activate'].includes(c.kind)) refuse('AUTHORITY_RECOVERING')
  const next = structuredClone(state), p = c.payload
  let outcome
  if (c.kind === 'register') {
    if (next.requests[p.requestId]) refuse('REQUEST_EXISTS')
    const actor = next.actors[p.actorId] || { openRequestId: null, authorizedRequestId: null }
    if (actor.authorizedRequestId) refuse('ACCOUNT_ALREADY_AUTHORIZED')
    if (actor.openRequestId) refuse('REQUEST_ALREADY_OPEN')
    next.requests[p.requestId] = { ...p, status: 'undecided' }
    next.actors[p.actorId] = { ...actor, openRequestId: p.requestId }
    outcome = 'undecided'
  } else if (['cancel', 'expire', 'authorize'].includes(c.kind)) {
    const request = next.requests[p.requestId]
    if (!request) refuse('REQUEST_UNKNOWN')
    if (request.actorId !== p.actorId) refuse('ACTOR_MISMATCH')
    if (request.status !== 'undecided') refuse('DECISION_FINAL')
    if (c.kind === 'authorize' && Object.values(next.protections).some(protection => protection.state === 'active'
      && (protection.actorId !== null && protection.actorId === p.actorId || protection.customerId === p.customerId))) refuse('AUTHORITY_PROTECTED')
    outcome = { cancel: 'cancelled', expire: 'expired', authorize: 'authorized' }[c.kind]
    request.status = outcome
    next.actors[p.actorId].openRequestId = null
    if (c.kind === 'authorize') {
      request.authorization = { ...p }
      next.actors[p.actorId].authorizedRequestId = p.requestId
    }
  } else if (c.kind === 'protect' || c.kind === 'release_protection') {
    if (p.requestId !== null) {
      const origin = next.requests[p.requestId]
      if (!origin) refuse('REQUEST_UNKNOWN')
      if (origin.actorId !== p.actorId) refuse('ACTOR_MISMATCH')
    }
    if (c.kind === 'protect') {
      if (next.protections[p.protectionId]) refuse('PROTECTION_EXISTS')
      if (Object.values(next.requests).some(request => request.status === 'authorized'
        && (p.actorId !== null && request.actorId === p.actorId || request.authorization.customerId === p.customerId))) refuse('PROCESSING_STARTED')
      next.protections[p.protectionId] = { ...p, state: 'active', release: null }
      outcome = 'protected'
    } else {
      const protection = next.protections[p.protectionId]
      if (!protection || protection.actorId !== p.actorId || protection.customerId !== p.customerId
        || protection.requestId !== p.requestId) refuse('PROTECTION_SCOPE')
      if (protection.state !== 'active') refuse('PROTECTION_FINAL')
      protection.state = 'released'; protection.release = { ...p }; outcome = 'protection_released'
    }
  } else if (c.kind === 'fence') {
    if (p.nextGeneration !== state.generation + 1) refuse('STALE_GENERATION')
    next.generation = p.nextGeneration; next.mode = 'recovering'; outcome = 'recovering'
  } else {
    if (state.mode !== 'recovering' || p.fencedHeadHash !== state.hash) refuse('FENCE_MISMATCH')
    next.mode = 'active'; outcome = 'active'
  }
  if (!Number.isSafeInteger(state.revision + 1)) refuse('STATE_INTEGRITY')
  return { next, outcome }
}

async function candidateFor(state, c, commandHash) {
  const { next, outcome } = transition(state, c)
  const attemptId = await digest({ commandHash, parentHash: state.hash })
  const receipt = { operationId: c.operationId, commandHash, kind: c.kind, outcome,
    committedRevision: state.revision + 1, committedGeneration: next.generation,
    subject: structuredClone(c.payload) }
  const body = { version: AUTHORITY_FORMAT_VERSION, projectRef: PROJECT, genesisId: c.genesisId,
    command: c, commandHash, attemptId, parentRevision: state.revision, parentHash: state.hash,
    parentGeneration: state.generation, revision: state.revision + 1, revisionNonce: attemptId,
    generation: next.generation, mode: next.mode, receipt }
  return { candidate: { ...body, hash: await digest(body) }, next }
}

async function verifyProof(verifyCommand, c, commandHash, intent, evidence) {
  let proof
  try { proof = await verifyCommand(structuredClone(c), { commandHash, intent }, evidence) }
  catch (error) { if (error?.code === 'AUTHORITY_PENDING') throw error; refuse('AUTHORITY_PROOF_REQUIRED') }
  const protectionCommand = ['protect', 'release_protection'].includes(c.kind)
  const role = protectionCommand ? c.payload.initiatorRole : ['fence', 'activate'].includes(c.kind) ? 'operator' : ['authorize', 'expire'].includes(c.kind) ? 'worker' : 'customer'
  const principal = protectionCommand ? c.payload.initiatorId : c.payload.actorId || c.payload.operatorId
  if (!proof || proof.verified !== true || proof.projectRef !== PROJECT || proof.genesisId !== c.genesisId
    || proof.commandHash !== commandHash || proof.generation !== c.generation || proof.purpose !== c.kind
    || proof.intent !== intent || proof.role !== role || proof.principalId !== principal) refuse('AUTHORITY_PROOF_REQUIRED')
  // A historical receipt is read-only: do not require a new freeze or re-expire a request.
  if (intent === 'receipt') return
  if (c.kind === 'register' && proof.identityVerified !== true) refuse('AUTHORITY_PROOF_REQUIRED')
  if (c.kind === 'expire' && proof.unverifiedExpiryCommitted !== true) refuse('AUTHORITY_PROOF_REQUIRED')
  if (protectionCommand) {
    let scopeMatches = false
    try { scopeMatches = canonicalJson(c.kind === 'protect' ? proof.protection : proof.resolution)
      === canonicalJson({ ...c.payload, generation: c.generation }) } catch { /* malformed proof denies */ }
    if (!scopeMatches || (role === 'admin' ? proof.adminHoldAuthorized !== true : proof.workerAuthorityVerified !== true)) refuse('AUTHORITY_PROOF_REQUIRED')
    if (c.kind === 'protect' && (role === 'admin' ? proof.holdIntentCommitted !== true : proof.holdCommitted !== true)) refuse('AUTHORITY_PROOF_REQUIRED')
    if (c.kind === 'release_protection' && proof.resolutionCommitted !== true) refuse('AUTHORITY_PROOF_REQUIRED')
  }
  if (c.kind === 'authorize' && (proof.freezeCommitted !== true || proof.manifestVerified !== true
    || canonicalJson(proof.freeze) !== canonicalJson({ ...c.payload, generation: c.generation }))) refuse('AUTHORITY_PROOF_REQUIRED')
  if (c.kind === 'activate' && (proof.reconciliationVerified !== true
    || proof.reconciliationHash !== c.payload.reconciliationHash
    || proof.reconciledFenceHash !== c.payload.fencedHeadHash)) refuse('AUTHORITY_PROOF_REQUIRED')
}

export function createDecisionCore({ genesisId, verifyCommand = async () => null, commandStore } = {}) {
  uuid(genesisId)
  return {
    async prepare(inputState, rawCommand, evidence) {
      const state = structuredClone(inputState)
      const { command: c, bytes } = validateCommand(rawCommand, genesisId)
      await validateCheckpoint(state, genesisId)
      const commandHash = await digest(c), existing = state.operations[c.operationId]
      if (existing && existing.commandHash !== commandHash) refuse('OPERATION_CONFLICT')
      await verifyProof(verifyCommand, c, commandHash, existing ? 'receipt' : 'mutation', evidence)
      if (existing) return { kind: 'historical', receipt: structuredClone(existing.receipt), execution: { allowed: false } }
      let stored
      try { stored = await commandStore.claim(`${PROJECT}/${genesisId}/commands/${c.operationId}`, bytes) }
      catch { refuse('AUTHORITY_PENDING') }
      if (stored !== bytes) refuse('OPERATION_CONFLICT')
      const { candidate } = await candidateFor(state, c, commandHash)
      return { kind: 'candidate', candidate, receipt: structuredClone(candidate.receipt), execution: { allowed: false } }
    },
    // Caller must first establish this exact event's journal commit and seal.
    // Applying a reducer result is never itself proof of durability or execution permission.
    async applyCommitted(inputState, rawCandidate) {
      const state = structuredClone(inputState), candidate = structuredClone(rawCandidate)
      await validateCheckpoint(state, genesisId)
      if (!candidate || candidate.parentHash !== state.hash || candidate.parentRevision !== state.revision
        || candidate.parentGeneration !== state.generation) refuse('STALE_PARENT')
      let expected, next
      try {
        const { command: c } = validateCommand(candidate.command, genesisId)
        if (state.operations[c.operationId]) refuse('CANDIDATE_INVALID')
        ;({ candidate: expected, next } = await candidateFor(state, c, await digest(c)))
        if (canonicalJson(expected) !== canonicalJson(candidate)) refuse('CANDIDATE_INVALID')
      } catch { refuse('CANDIDATE_INVALID') }
      next.revision = candidate.revision; next.hash = candidate.hash
      next.operations[candidate.command.operationId] = { commandHash: candidate.commandHash, receipt: candidate.receipt }
      return seal(next)
    },
  }
}
