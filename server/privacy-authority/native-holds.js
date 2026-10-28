import { canonicalJson } from './state.js'
import { createJournal } from './journal.js'
import { withAuthorityScope } from './bounds.js'

const PROJECT = 'pixplcjqivlfflickobf', UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const HASH = /^[0-9a-f]{64}$/, encoder = new TextEncoder()
const refuse = (code = 'AUTHORITY_PROOF_REQUIRED') => { throw Object.assign(new Error(code), { code }) }
const record = value => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
function exact(value, keys) { if (!record(value) || Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) refuse() }
function uuid(value) { if (typeof value !== 'string' || !UUID.test(value)) refuse() }
function origin(value) { if (value.actorId !== null || value.requestId !== null) { uuid(value.actorId); uuid(value.requestId) } }
function digest(value) { if (typeof value !== 'string' || !HASH.test(value)) refuse() }
async function hash(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(canonicalJson(value)))), b => b.toString(16).padStart(2, '0')).join('')
}
const equal = (a, b) => canonicalJson(a) === canonicalJson(b)

// Private server/Worker composition. No environment loading, bootstrap, HTTP
// authentication shortcut, erasure permission or default non-hold verifier.
export function createNativeHoldAuthority({ genesisId, databaseId, generation, proofKey, executionKey, rpc,
  bucket, witness, verifyOtherCommand, clock = Date.now, deadlineMs = 9000 } = {}) {
  if (!UUID.test(genesisId || '') || !UUID.test(databaseId || '') || !Number.isSafeInteger(generation) || generation < 1
    || !(proofKey instanceof Uint8Array) || proofKey.length !== 32 || !(executionKey instanceof Uint8Array) || executionKey.length !== 32
    || proofKey.every((b, i) => b === executionKey[i]) || typeof rpc !== 'function'
    || !Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 9000) refuse('NATIVE_AUTHORITY_CONFIG_REQUIRED')
  const namespace = { version: 2, projectRef: PROJECT, genesisId, databaseId, generation }
  const key = crypto.subtle.importKey('raw', new Uint8Array(proofKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const execution = crypto.subtle.importKey('raw', new Uint8Array(executionKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  function scoped(body) { for (const [field, value] of Object.entries(namespace)) if (body[field] !== value) refuse() }
  async function signed(body, scope) {
    const text = canonicalJson(body)
    const bytes = await scope.io(async () => crypto.subtle.sign('HMAC', await execution, encoder.encode(text)))
    return { p_capability_text: text, p_signature: Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('') }
  }
  async function verified(envelope, scope) {
    exact(envelope, ['body', 'mac'])
    if (typeof envelope.body !== 'string' || encoder.encode(envelope.body).length > 32768) refuse()
    digest(envelope.mac)
    const signature = Uint8Array.from(envelope.mac.match(/../g), x => parseInt(x, 16))
    if (!await scope.io(async () => crypto.subtle.verify('HMAC', await key, signature, encoder.encode(envelope.body)))) refuse()
    let body
    try { body = JSON.parse(envelope.body); if (canonicalJson(body) !== envelope.body) refuse() } catch { refuse() }
    return body
  }
  async function exported(input, scope) {
    let e
    try { e = JSON.parse(canonicalJson(input)) } catch { refuse() }
    exact(e, ['command', 'proof'])
    const c = e.command
    exact(c, ['version', 'projectRef', 'genesisId', 'generation', 'operationId', 'kind', 'payload'])
    if (c.version !== 2 || c.projectRef !== PROJECT || c.genesisId !== genesisId || c.generation !== generation
      || !['protect', 'release_protection'].includes(c.kind)) refuse()
    uuid(c.operationId)
    const p = c.payload, fields = ['actorId', 'customerId', 'requestId', 'protectionId', 'initiatorId', 'initiatorRole']
    exact(p, [...fields, ...(c.kind === 'protect' ? ['kind', 'nativeIntentHash'] : ['nativeResolutionHash'])])
    for (const field of ['customerId','protectionId','initiatorId']) uuid(p[field])
    origin(p)
    if (p.initiatorRole !== 'admin') refuse()
    if (c.kind === 'protect') { if (!['legal', 'refund', 'dispute', 'security'].includes(p.kind)) refuse(); digest(p.nativeIntentHash) }
    else digest(p.nativeResolutionHash)
    const body = await verified(e.proof, scope)
    exact(body, [...Object.keys(namespace), 'purpose', 'intentId', 'protectionId', 'holdId', 'eventId', 'initiatorId', 'nativeIntentHash', 'commandHash'])
    scoped(body)
    for (const field of ['intentId', 'protectionId', 'holdId', 'eventId', 'initiatorId']) uuid(body[field])
    digest(body.nativeIntentHash); digest(body.commandHash)
    if (body.purpose !== c.kind || body.protectionId !== p.protectionId || body.initiatorId !== p.initiatorId
      || body.commandHash !== await scope.io(() => hash(c)) || c.kind === 'protect' && (body.intentId !== c.operationId || body.nativeIntentHash !== p.nativeIntentHash)) refuse()
    return { export: e, body }
  }
  async function remote(name, args, scope) {
    let result
    try { result = await scope.io(() => rpc(name, args, { signal: scope.signal })) } catch { refuse('AUTHORITY_PENDING') }
    if (!result || result.error || result.data === undefined || result.data === null) refuse('AUTHORITY_PENDING')
    return result.data
  }
  const expires = () => { const now = Math.floor(clock() / 1000); if (!Number.isSafeInteger(now) || now < 0) refuse(); return now + 20 }
  async function current(e, scope) {
    const challengeId = crypto.randomUUID()
    const args = await signed({ ...namespace, purpose: 'read_hold_fact', intentId: e.body.intentId, challengeId, expiresAt: expires() }, scope)
    const f = await verified(await remote('read_customer_privacy_hold_fact_v1', args, scope), scope)
    exact(f, [...Object.keys(namespace), 'purpose', 'challengeId', 'intentId', 'actorId', 'customerId', 'requestId', 'initiatorId',
      'protectionId', 'holdId', 'creationEventId', 'nativeIntentHash', 'state', 'protectCommandHash', 'resolutionHash', 'resolverId',
      'resolutionEventId', 'releaseCommandHash', 'releaseExport', 'creationReceipt', 'refusalReceipt', 'customerActive'])
    scoped(f)
    for (const field of ['intentId', 'customerId', 'initiatorId', 'protectionId', 'holdId', 'creationEventId']) uuid(f[field])
    origin(f)
    digest(f.nativeIntentHash); digest(f.protectCommandHash)
    const p = e.export.command.payload, protect = e.export.command.kind === 'protect'
    if (f.purpose !== 'hold_fact' || f.challengeId !== challengeId || f.intentId !== e.body.intentId
      || f.protectionId !== p.protectionId || f.holdId !== e.body.holdId || f.nativeIntentHash !== e.body.nativeIntentHash
      || f.actorId !== p.actorId || f.customerId !== p.customerId || f.requestId !== p.requestId || typeof f.customerActive !== 'boolean'
      || !['pending', 'projected', 'resolved', 'refused'].includes(f.state)) refuse()
    if (['projected', 'resolved'].includes(f.state)) {
      if (!equal(f.creationReceipt, { intentId: f.intentId, protectionId: f.protectionId, holdId: f.holdId, eventId: f.creationEventId, outcome: 'projected' }) || f.refusalReceipt !== null) refuse()
    } else if (f.creationReceipt !== null) refuse()
    if (f.state === 'resolved') {
      digest(f.resolutionHash); uuid(f.resolverId); uuid(f.resolutionEventId); digest(f.releaseCommandHash)
      const resolution = await exported(f.releaseExport, scope), rp = resolution.export.command.payload
      if (resolution.export.command.kind !== 'release_protection' || resolution.body.commandHash !== f.releaseCommandHash
        || resolution.body.intentId !== f.intentId || resolution.body.holdId !== f.holdId || resolution.body.eventId !== f.resolutionEventId
        || rp.actorId !== f.actorId || rp.customerId !== f.customerId || rp.requestId !== f.requestId || rp.protectionId !== f.protectionId
        || rp.initiatorId !== f.resolverId || rp.nativeResolutionHash !== f.resolutionHash) refuse()
    } else if ([f.resolutionHash, f.resolverId, f.resolutionEventId, f.releaseCommandHash, f.releaseExport].some(value => value !== null)) refuse()
    if (f.state === 'refused') {
      exact(f.refusalReceipt, ['intentId', 'protectionId', 'outcome', 'authorizationId', 'authorizationHash'])
      uuid(f.refusalReceipt.authorizationId); digest(f.refusalReceipt.authorizationHash)
      if (f.refusalReceipt.intentId !== f.intentId || f.refusalReceipt.protectionId !== f.protectionId || f.refusalReceipt.outcome !== 'processing_started') refuse()
    } else if (f.refusalReceipt !== null) refuse()
    if (protect ? f.protectCommandHash !== e.body.commandHash || f.initiatorId !== p.initiatorId || f.creationEventId !== e.body.eventId
      : f.releaseCommandHash !== e.body.commandHash || f.resolverId !== p.initiatorId || f.resolutionHash !== p.nativeResolutionHash || f.resolutionEventId !== e.body.eventId) refuse()
    return f
  }
  const journal = createJournal({ genesisId, bucket, witness, deadlineMs,
    verifyCommand: async (c, context, evidence) => {
      if (!['protect', 'release_protection'].includes(c.kind)) return verifyOtherCommand ? verifyOtherCommand(c, context, evidence) : null
      return withAuthorityScope(async scope => {
        const e = await exported(evidence, scope)
        if (!equal(e.export.command, c) || e.body.commandHash !== context.commandHash) refuse()
        const f = await current(e, scope)
        if (context.intent === 'mutation' && (c.kind === 'protect' ? f.state !== 'pending' || !f.customerActive : f.state !== 'resolved')) refuse()
        return { verified: true, projectRef: PROJECT, genesisId, generation, purpose: c.kind, commandHash: context.commandHash,
          intent: context.intent, role: 'admin', principalId: c.payload.initiatorId, adminHoldAuthorized: true,
          holdIntentCommitted: f.state === 'pending', resolutionCommitted: f.state === 'resolved',
          protection: { ...c.payload, generation }, resolution: { ...c.payload, generation } }
      }, { deadlineMs, signal: context.signal })
    } })
  async function view(scope) {
    const result = await scope.io(() => journal.reconcile({ signal: scope.signal }))
    if (result.state.generation !== generation || result.state.mode !== 'active') refuse('AUTHORITY_PENDING')
    return result.state
  }
  function authorization(state, f) {
    return Object.entries(state.operations).find(([_id, op]) => op.receipt.kind === 'authorize'
      && (f.actorId !== null && op.receipt.subject.actorId === f.actorId || op.receipt.subject.customerId === f.customerId))
  }
  async function existing(state, f, e, scope) {
    const op = state.operations[e.export.command.operationId]
    if (!op || op.commandHash !== e.body.commandHash || op.receipt.outcome !== 'protected') refuse('AUTHORITY_INTEGRITY')
    let protection = state.protections[f.protectionId]
    if (f.state === 'projected' && protection?.state !== 'active') refuse('AUTHORITY_PENDING')
    if (f.state === 'resolved' && protection?.state === 'active') {
      await scope.io(() => journal.submit(f.releaseExport.command, f.releaseExport, { signal: scope.signal }))
      protection = (await view(scope)).protections[f.protectionId]
    }
    if (f.state === 'resolved' && protection?.state !== 'released') refuse('AUTHORITY_PENDING')
    return { receipt: f.creationReceipt, currentState: f.state }
  }
  async function transition(body, scope) {
    // An unsigned transport acknowledgement is deliberately ignored.
    await remote('transition_customer_privacy_hold_v1', await signed({ ...namespace, ...body, expiresAt: expires() }, scope), scope)
  }
  return {
    reconcile: options => journal.reconcile(options),
    submitDecision(command, evidence, options) {
      if (['protect', 'release_protection'].includes(command?.kind)) refuse()
      return journal.submit(command, evidence, options)
    },
    applyHold(input, options = {}) {
      return withAuthorityScope(async scope => {
        const e = await exported(input, scope)
        if (e.export.command.kind !== 'protect') refuse()
        for (let attempt = 0; attempt < 2; attempt++) {
          let f = await current(e, scope), state = await view(scope), authorized = authorization(state, f)
          if (f.state === 'refused') {
            if (!authorized || f.refusalReceipt.authorizationId !== authorized[0] || f.refusalReceipt.authorizationHash !== authorized[1].commandHash) refuse('AUTHORITY_INTEGRITY')
            return { receipt: f.refusalReceipt, currentState: 'refused' }
          }
          if (['projected', 'resolved'].includes(f.state)) return existing(state, f, e, scope)
          if (authorized) {
            await transition({ purpose: 'refuse_hold', intentId: f.intentId, protectionId: f.protectionId, nativeIntentHash: f.nativeIntentHash,
              authorizationId: authorized[0], authorizationHash: authorized[1].commandHash }, scope)
            f = await current(e, scope)
            if (f.state !== 'refused') refuse('AUTHORITY_PENDING')
            return { receipt: f.refusalReceipt, currentState: 'refused' }
          }
          try { await scope.io(() => journal.submit(e.export.command, e.export, { signal: scope.signal })) }
          catch (error) { if (error.code === 'PROCESSING_STARTED') continue; throw error }
          f = await current(e, scope); state = await view(scope)
          if (['projected', 'resolved'].includes(f.state)) return existing(state, f, e, scope)
          const protection = state.protections[f.protectionId]
          if (!equal(protection, { ...e.export.command.payload, state: 'active', release: null }) || f.state !== 'pending') refuse('AUTHORITY_PENDING')
          await transition({ purpose: 'project_hold', intentId: f.intentId, protectionId: f.protectionId, nativeIntentHash: f.nativeIntentHash }, scope)
          const confirmed = await current(e, scope)
          if (!['projected', 'resolved'].includes(confirmed.state)) refuse('AUTHORITY_PENDING')
          return existing(state, confirmed, e, scope)
        }
        refuse('AUTHORITY_PENDING')
      }, { deadlineMs, signal: options.signal })
    },
    releaseHold(input, options = {}) {
      return withAuthorityScope(async scope => {
        const e = await exported(input, scope)
        if (e.export.command.kind !== 'release_protection') refuse()
        const f = await current(e, scope)
        if (f.state !== 'resolved') refuse()
        const decision = await scope.io(() => journal.submit(e.export.command, e.export, { signal: scope.signal }))
        const state = await view(scope), protection = state.protections[f.protectionId]
        if (protection?.state !== 'released' || protection.release?.nativeResolutionHash !== f.resolutionHash) refuse('AUTHORITY_PENDING')
        return { receipt: f.creationReceipt, currentState: 'resolved', decisionReceipt: decision.receipt }
      }, { deadlineMs, signal: options.signal })
    },
  }
}
