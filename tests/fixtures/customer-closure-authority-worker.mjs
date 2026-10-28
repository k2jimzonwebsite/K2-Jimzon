// SYNTHETIC LOCAL QUALIFICATION ONLY. This fixture has no authenticated
// production endpoint. Never deploy it or reuse its deliberately trusted proof.
import { DurableObject } from 'cloudflare:workers'
import { canonicalJson, createGenesisState } from '../../server/privacy-authority/state.js'
import { createJournal } from '../../server/privacy-authority/journal.js'
import { createSqliteWitness } from '../../server/privacy-authority/sqlite-witness.js'

const projectRef = 'pixplcjqivlfflickobf', genesisId = '90000000-0000-4000-8000-000000000002'
async function genesisHead() {
  const state = await createGenesisState(genesisId)
  return { state, head: { version: 2, projectRef, genesisId, revision: 0, hash: state.hash,
    generation: 1, mode: 'active', revisionNonce: genesisId, eventKey: null, parentHash: null } }
}
function syntheticProof(c, x) {
  const protection = ['protect', 'release_protection'].includes(c.kind)
  return { verified: true, projectRef, genesisId, commandHash: x.commandHash, generation: c.generation,
    purpose: c.kind, intent: x.intent, principalId: protection ? c.payload.initiatorId : c.payload.actorId || c.payload.operatorId,
    role: protection ? c.payload.initiatorRole : ['fence', 'activate'].includes(c.kind) ? 'operator' : ['authorize', 'expire'].includes(c.kind) ? 'worker' : 'customer',
    identityVerified: true, unverifiedExpiryCommitted: true, freezeCommitted: true, manifestVerified: true,
    freeze: { ...c.payload, generation: c.generation }, reconciliationVerified: true,
    reconciliationHash: c.payload.reconciliationHash, reconciledFenceHash: c.payload.fencedHeadHash,
    adminHoldAuthorized: true, workerAuthorityVerified: true, holdIntentCommitted: true, holdCommitted: true,
    protection: { ...c.payload, generation: c.generation }, resolutionCommitted: true, resolution: { ...c.payload, generation: c.generation } }
}
export class LocalClosureAuthority extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.ctx = ctx; this.env = env
    this.witness = createSqliteWitness({ storage: ctx.storage, genesisId })
    this.boundedJournal = null
  }
  async fetch(request) {
    // Exercise actual input exclusion over the whole remote-I/O decision, not
    // an assumption that a JavaScript call chain cannot interleave.
    return this.ctx.blockConcurrencyWhile(async () => {
      try {
        const path = new URL(request.url).pathname
        const journal = createJournal({ genesisId, bucket: this.env.JOURNAL, witness: this.witness,
          deadlineMs: path === '/fixture/hung-proof' ? 75 : 9000,
          verifyCommand: path === '/fixture/hung-proof' ? () => new Promise(() => {}) : request.headers.get('x-fixture-deny-proof') ? undefined : syntheticProof })
        if (path === '/bootstrap' && request.method === 'POST') {
          await request.arrayBuffer()
          const { head, state } = await genesisHead()
          const saved = await this.env.JOURNAL.put(`${projectRef}/${genesisId}/head.json`, canonicalJson(head), { onlyIf: { etagDoesNotMatch: '*' } })
          if (!saved) return Response.json({ code: 'FIXTURE_ALREADY_BOOTSTRAPPED' }, { status: 409 })
          await this.witness.advance(state)
          return Response.json({ fixture: true })
        }
        if (path === '/fixture/erase-witness' && request.method === 'POST') {
          await request.arrayBuffer()
          await this.ctx.storage.deleteAll()
          this.witness = createSqliteWitness({ storage: this.ctx.storage, genesisId })
          this.boundedJournal = null
          return Response.json({ fixture: true })
        }
        if (path === '/fixture/genesis') return Response.json(await genesisHead())
        if (path === '/fixture/bounded-state') {
          this.boundedJournal ||= createJournal({ genesisId, bucket: this.env.JOURNAL, witness: this.witness,
            verifyCommand: syntheticProof, maxPages: 1, maxEventsPerPass: 1 })
          return Response.json(await this.boundedJournal.reconcile())
        }
        if (path === '/state') return Response.json(await journal.reconcile())
        if (['/submit', '/fixture/hung-proof'].includes(path) && request.method === 'POST') return Response.json(await journal.submit(await request.json()))
        return Response.json({ code: 'FIXTURE_ROUTE_UNKNOWN' }, { status: 404 })
      } catch (error) {
        return Response.json({ code: error.code || 'FIXTURE_ERROR', message: error.message }, { status: error.code === 'AUTHORITY_PENDING' ? 503 : 409 })
      }
    })
  }
}
export default {
  fetch(request, env) {
    if (env.LOCAL_FIXTURE_ONLY !== 'synthetic-only-v2' || request.headers.get('x-k2-local-closure-fixture') !== 'synthetic-only-v2') {
      return Response.json({ code: 'LOCAL_FIXTURE_DISABLED' }, { status: 403 })
    }
    return env.AUTHORITY.get(env.AUTHORITY.idFromName('synthetic-only-v2')).fetch(request)
  },
}
