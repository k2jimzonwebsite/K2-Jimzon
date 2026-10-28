// Owned-loopback composition only. Never creates a production client or reads
// environment credentials. Non-hold verification is conspicuously synthetic.
import assert from 'node:assert/strict'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createNativeHoldAuthority } from '../server/privacy-authority/native-holds.js'
import { canonicalJson, createGenesisState } from '../server/privacy-authority/state.js'
import { createSqliteWitness } from '../server/privacy-authority/sqlite-witness.js'
import { withLocalRuntimeReady } from './lib/local-worker-runtime.mjs'
import { withAuthorityScope } from '../server/privacy-authority/bounds.js'
import { createCustomerPrivacyAdminHandler } from '../server/admin-bff/customer-privacy.js'

const literal = value => "'" + String(value).replaceAll("'", "''") + "'"
const digest = text => createHash('sha256').update(text).digest()
export async function proveCustomerHoldCoordinator({ bin, env, work }) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  if (env.PGHOST !== '127.0.0.1' || !/^k2_native_hold_[0-9a-f]{32}$/.test(env.PGDATABASE)
    || !/^\d+$/.test(env.PGPORT) || !resolve(work).startsWith(join(root, '.tools/privacy-current-schema') + sep)) throw new Error('OWNED_NATIVE_HOLD_CLONE_REQUIRED')
  function sql(statement) {
    const result = spawnSync(join(bin, 'psql.exe'), ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', statement],
      { env, windowsHide: true, encoding: 'utf8', timeout: 15000, maxBuffer: 2 * 1024 * 1024 })
    if (result.error || result.status !== 0) throw new Error(`Owned coordinator SQL: ${String(result.stderr || result.error?.message).slice(-1800)}`)
    return result.stdout.trim().split(/\r?\n/).at(-1)
  }
  assert.equal(sql('select current_database()'), env.PGDATABASE)
  const cfg = JSON.parse(sql("select jsonb_build_object('databaseId',database_id,'genesisId',genesis_id,'generation',generation) from k2_private.customer_privacy_authority_config where singleton"))
  const projectRef = 'pixplcjqivlfflickobf', genesisId = cfg.genesisId
  const adminKey = digest('MAP019 synthetic Admin bridge only'), proofKey = digest('MAP019 synthetic native proof only'), executionKey = digest('MAP019 synthetic execution only')
  function context(requestId) {
    return JSON.parse(sql(`select jsonb_build_object('requestId',id,'actorId',user_id,'customerId',customer_id,'adminId',assigned_to)
      from k2_private.customer_privacy_requests where id=${literal(requestId)}::uuid`))
  }
  function admin(action, payload, operation, actor) {
    const timestamp = Math.floor(Date.now() / 1000), nonce = randomUUID(), text = JSON.stringify(payload)
    const hash = createHash('sha256').update(text).digest('hex')
    const signature = createHmac('sha256', adminKey).update([action, timestamp, nonce, actor, operation, hash].join('\n')).digest('hex')
    const name = action === 'customer_privacy_hold_prepare' ? 'prepare_admin_customer_privacy_hold_v2'
      : action === 'customer_privacy_review' ? 'review_admin_customer_privacy_v1' : 'resolve_admin_customer_privacy_hold_v2'
    return JSON.parse(sql(`begin;set local statement_timeout='8s';select set_config('request.jwt.claim.sub',${literal(actor)},true);
      select set_config('request.jwt.claims',${literal(JSON.stringify({ sub: actor, role: 'authenticated', aal: 'aal2' }))},true);
      set local role authenticated;select public.${name}(${literal(action)},${timestamp},${literal(nonce)}::uuid,${literal(operation)}::uuid,${literal(text)},${literal(signature)});commit;`))
  }
  const transitions = [], checks = [], receipt = { status: 'running', checks, productionChanged: false }
  let loseReply = true, mf, storage
  const rpc = async (name, args) => {
    if (!['read_customer_privacy_hold_fact_v1', 'transition_customer_privacy_hold_v1'].includes(name)) throw new Error('FIXTURE_RPC_NOT_ALLOWED')
    const data = JSON.parse(sql(`begin;set local statement_timeout='8s';select set_config('request.jwt.claims','{"role":"service_role"}',true);
      set local role service_role;select public.${name}(${literal(args.p_capability_text)},${literal(args.p_signature)});commit;`))
    if (name === 'transition_customer_privacy_hold_v1') {
      transitions.push(structuredClone(args))
      if (loseReply && JSON.parse(args.p_capability_text).purpose === 'project_hold') { loseReply = false; throw new Error('SYNTHETIC_NATIVE_REPLY_LOSS_AFTER_COMMIT') }
    }
    return { data, error: null }
  }
  function openWitness() {
    const db = new DatabaseSync(join(work, 'hold-coordinator-witness.sqlite'))
    let open = true
    storage = { sql: { exec(statement, ...bindings) {
      const s = db.prepare(statement), rows = s.columns().length ? s.all(...bindings) : (s.run(...bindings), [])
      return { toArray: () => rows }
    } }, transactionSync(callback) {
      db.exec('BEGIN IMMEDIATE'); try { const result = callback(); db.exec('COMMIT'); return result }
      catch (error) { db.exec('ROLLBACK'); throw error }
    }, sync: async () => {}, close: () => { if (open) { db.close(); open = false } } }
    return createSqliteWitness({ storage, genesisId })
  }
  try {
    const runtimeRequire = createRequire(join(root, '.tools/closure-authority-runtime/package.json'))
    const { Miniflare, Log, LogLevel } = runtimeRequire('miniflare')
    assert.equal(runtimeRequire('miniflare/package.json').version, '4.20260730.0')
    mf = new Miniflare({ modules: true, script: "export default {fetch(){return new Response('Synthetic R2 fixture only',{status:403})}}",
      compatibilityDate: '2026-07-30', host: '127.0.0.1', port: 0, r2Buckets: ['JOURNAL'], r2Persist: join(work, 'hold-coordinator-r2'),
      log: new Log(LogLevel.ERROR), outboundService: () => new Response('External networking disabled', { status: 503 }) })
    return await withLocalRuntimeReady(mf, async () => {
      const { bucket, witness } = await withAuthorityScope(async scope => {
        const bucket = await scope.io(() => mf.getR2Bucket('JOURNAL')), witness = await scope.io(openWitness)
        const initial = await scope.io(() => createGenesisState(genesisId))
        const prefix = `${projectRef}/${genesisId}/`
        assert.ok(await scope.io(() => bucket.put(prefix + 'head.json', canonicalJson({ version: 2, projectRef, genesisId, revision: 0,
          hash: initial.hash, generation: cfg.generation, mode: 'active', revisionNonce: genesisId, eventKey: null, parentHash: null }), { onlyIf: { etagDoesNotMatch: '*' } })))
        await scope.io(() => witness.advance(initial))
        return { bucket, witness }
      })
      const command = (kind, payload) => ({ version: 2, projectRef, genesisId, generation: cfg.generation, operationId: randomUUID(), kind, payload })
      const verifyOtherCommand = (c, x) => ({ verified: true, projectRef, genesisId, generation: c.generation, commandHash: x.commandHash,
        purpose: c.kind, intent: x.intent, principalId: c.payload.actorId, role: c.kind === 'authorize' ? 'worker' : 'customer',
        identityVerified: true, freezeCommitted: true, manifestVerified: true, freeze: { ...c.payload, generation: c.generation } })
      const configuration = { ...cfg, bucket, witness, rpc, proofKey, executionKey, verifyOtherCommand }
      let authority = createNativeHoldAuthority(configuration)
      let loseResolutionReply = false, lastAdminFailure = null
      receipt.recoveryMeasurements = []
      async function finishAdmin(label, c, payload, operation) {
        const attempts = []
        for (let retry = 0; retry < 12; retry++) {
          const started = performance.now(), result = await adminRoute(c, payload, operation)
          attempts.push({ elapsedMs: Math.round(performance.now() - started), status: result.statusCode, code: lastAdminFailure?.code || null })
          if (result.statusCode !== 503) { receipt.recoveryMeasurements.push({ label, attempts }); return result }
        }
        receipt.recoveryMeasurements.push({ label, attempts })
        assert.fail(`Exact Admin retry did not complete: ${label}`)
      }
      async function finishAuthority(label, action) {
        const attempts = []
        for (let retry = 0; retry < 12; retry++) {
          const started = performance.now()
          try {
            const result = await action(); attempts.push({ elapsedMs: Math.round(performance.now() - started), outcome: 'complete' })
            receipt.recoveryMeasurements.push({ label, attempts }); return result
          } catch (error) {
            attempts.push({ elapsedMs: Math.round(performance.now() - started), outcome: error.code })
            if (error.code !== 'AUTHORITY_PENDING') throw error
          }
        }
        receipt.recoveryMeasurements.push({ label, attempts })
        assert.fail(`Exact authority retry did not complete: ${label}`)
      }
      const diagnosticAuthority = {
        async applyHold(...args) { try { return await authority.applyHold(...args) } catch (error) { lastAdminFailure = { stage: "authority_apply", code: error.code, message: error.message }; throw error } },
        async releaseHold(...args) { try { return await authority.releaseHold(...args) } catch (error) { lastAdminFailure = { stage: "authority_release", code: error.code, message: error.message }; throw error } },
      }
      async function adminRoute(c, payload, operation) {
        lastAdminFailure = null
        const previous = process.env.K2_ADMIN_BFF_REQUEST_SECRET
        process.env.K2_ADMIN_BFF_REQUEST_SECRET = adminKey.toString('base64')
        try {
          const handler = createCustomerPrivacyAdminHandler({ holdAuthority: diagnosticAuthority, authorize: async () => ({
            identity: { role: 'Admin', userId: c.adminId }, client: { rpc: async (name, args) => {
              try {
              if (!['prepare_admin_customer_privacy_hold_v2','resolve_admin_customer_privacy_hold_v2'].includes(name)) throw new Error('NO_LEGACY_FALLBACK')
              const result = JSON.parse(sql(`begin;set local statement_timeout='8s';
                select set_config('request.jwt.claim.sub',${literal(c.adminId)},true);
                select set_config('request.jwt.claims',${literal(JSON.stringify({sub:c.adminId,role:'authenticated',aal:'aal2'}))},true);
                set local role authenticated;select public.${name}(${literal(args.p_action)},${args.p_timestamp},${literal(args.p_nonce)}::uuid,
                  ${literal(args.p_idempotency_key)}::uuid,${literal(args.p_payload_text)},${literal(args.p_signature)});commit;`))
              if (loseResolutionReply && name==='resolve_admin_customer_privacy_hold_v2') { loseResolutionReply=false; throw new Error('SYNTHETIC_ADMIN_RESOLUTION_REPLY_LOSS') }
              return {data:result}
              } catch (error) { lastAdminFailure = { stage: 'admin_rpc', code: error.code, message: error.message }; throw error }
            } },
          }) })
          const response = {setHeader(){},end(text){this.body=JSON.parse(text)}}
          await handler({method:'POST',body:payload,headers:{'content-type':'application/json','x-k2-idempotency-key':operation,'x-k2-actor-id':c.adminId}},response)
          assert.equal(JSON.stringify(response.body).includes('p_signature'),false)
          assert.equal(JSON.stringify(response.body).includes('"proof"'),false)
          return response
        } finally {
          if (previous===undefined) delete process.env.K2_ADMIN_BFF_REQUEST_SECRET
          else process.env.K2_ADMIN_BFF_REQUEST_SECRET=previous
        }
      }
      const register = c => command('register', { actorId: c.actorId, requestId: c.requestId, receiptHash: 'd'.repeat(64) })
      const authorize = c => command('authorize', { actorId: c.actorId, customerId: c.customerId, requestId: c.requestId,
        freezeId: randomUUID(), policyVersion: 'account-closure-v1', manifestHash: 'e'.repeat(64), manifestKey: `manifests/${c.requestId}/${'e'.repeat(64)}.json` })
      const first = context(sql('select k2_hold_fixture.second_request()')), key = randomUUID()
      for (const action of ['add_hold','resolve_hold','add_customer_hold','resolve_customer_hold']) {
        const customerScoped = action.includes('customer'), resolving = action.startsWith('resolve')
        const oldPayload = { ...(customerScoped ? { customerId: first.customerId } : { requestId: first.requestId }),
          action, reason: 'Synthetic old route refusal', ...(resolving ? { holdId: randomUUID() } : { kind: 'legal' }) }
        assert.throws(() => admin('customer_privacy_review', oldPayload, randomUUID(), first.adminId), /K2_PRIVACY_HOLD_AUTHORITY_REQUIRED/)
      }
      checks.push('direct authenticated legacy review refuses all four hold mutations after migration five')
      const legacyContext=context(sql('select k2_hold_fixture.second_request()'))
      const legacyId = sql(`insert into k2_private.customer_privacy_holds(customer_id,kind,reason,created_by)
        values(${literal(legacyContext.customerId)}::uuid,'legal','Synthetic existing hold',${literal(legacyContext.adminId)}::uuid) returning id`)
      assert.throws(() => admin('customer_privacy_hold_resolve', { requestId:legacyContext.requestId,holdId:legacyId,reason:'Synthetic existing resolution' }, randomUUID(), legacyContext.adminId), /K2_PRIVACY_HOLD_RECONCILIATION_REQUIRED/)
      assert.equal(sql(`select count(*) from k2_private.customer_privacy_holds where id=${literal(legacyId)}::uuid and resolved_at is null`),'1')
      checks.push('an existing canonical hold without an intent remains intact and explicitly requires reconciliation')
      const payload = { requestId: first.requestId, kind: 'legal', reason: 'Synthetic coordinator hold' }
      const prepared = admin('customer_privacy_hold_prepare', payload, key, first.adminId)
      await authority.submitDecision(register(first))
      await assert.rejects(authority.applyHold(prepared), error => error.code === 'AUTHORITY_PENDING')
      const created = await authority.applyHold(prepared)
      assert.equal(created.currentState, 'projected'); assert.equal(transitions.length, 1)
      checks.push('signed authenticated Admin prepare and real nonce/HMAC service reads compose with actual R2 and native SQLite')
      checks.push('lost native projection reply reconciles its one committed hold/event without another transition')
      await authority.submitDecision(command('cancel', { actorId: first.actorId, requestId: first.requestId }))
      const replacement = randomUUID()
      sql(`update k2_private.customer_privacy_requests set state='cancelled' where id=${literal(first.requestId)}::uuid;
        insert into k2_private.customer_privacy_requests(id,user_id,customer_id,channel,receipt_hash,state,verified_at,assigned_to)
        values(${literal(replacement)}::uuid,${literal(first.actorId)}::uuid,${literal(first.customerId)}::uuid,'email',decode(repeat('e',64),'hex'),'pending',clock_timestamp(),${literal(first.adminId)}::uuid)`)
      const second = { ...first, requestId: replacement }; await authority.submitDecision(register(second))
      await assert.rejects(authority.submitDecision(authorize(second)), error => error.code === 'AUTHORITY_PROTECTED')
      const resolutionKey = randomUUID(), resolutionPayload = { requestId: replacement, holdId: created.receipt.holdId, reason: 'Synthetic coordinator resolution' }
      // Discard the resolution reply: the next read must recover its exact export.
      admin('customer_privacy_hold_resolve', resolutionPayload, resolutionKey, first.adminId)
      assert.equal((await authority.applyHold(prepared)).currentState, 'resolved')
      assert.equal((await authority.reconcile()).state.protections[prepared.command.payload.protectionId].state, 'released')
      await authority.submitDecision(authorize(second))
      checks.push('cancellation/replacement remains protected and a lost Admin resolution reply automatically exports the committed release')
      const countBefore = sql(`select count(*) from k2_private.customer_privacy_review_events where hold_id=${literal(created.receipt.holdId)}::uuid`)
      sql(`update public.customers set status='deleted' where id=${literal(first.customerId)}::uuid`)
      const late = await authority.applyHold(prepared)
      assert.deepEqual(late.receipt, created.receipt); assert.equal(late.currentState, 'resolved'); assert.equal(transitions.length, 1)
      const replay = await rpc('transition_customer_privacy_hold_v1', transitions[0])
      assert.deepEqual(replay.data.receipt, created.receipt); assert.equal(replay.data.currentState, 'resolved')
      assert.equal(sql(`select count(*) from k2_private.customer_privacy_review_events where hold_id=${literal(created.receipt.holdId)}::uuid`), countBefore)
      assert.deepEqual(admin('customer_privacy_hold_prepare', payload, key, first.adminId), prepared)
      admin('customer_privacy_hold_resolve', resolutionPayload, resolutionKey, first.adminId)
      checks.push('after fixture authorization/closed native state, delayed original projection and signed historical retries never recreate a hold/event')
      storage.close(); const reopened = openWitness()
      authority = createNativeHoldAuthority({ ...configuration, witness: reopened })
      assert.deepEqual((await authority.applyHold(prepared)).receipt, created.receipt)
      checks.push('reopened native SQLite plus actual R2 history retain the same protected/released decision and native result')
      const refusedContext = context(sql('select k2_hold_fixture.second_request()'))
      await authority.submitDecision(register(refusedContext)); await authority.submitDecision(authorize(refusedContext))
      const pending = admin('customer_privacy_hold_prepare', { requestId: refusedContext.requestId, kind: 'legal', reason: 'Synthetic authorization winner' }, randomUUID(), refusedContext.adminId)
      const refused = await authority.applyHold(pending)
      assert.equal(refused.currentState, 'refused'); assert.equal(refused.receipt.outcome, 'processing_started')
      const count = transitions.length; assert.deepEqual(await authority.applyHold(pending), refused); assert.equal(transitions.length, count)
      assert.equal(sql(`select count(*) from k2_private.customer_privacy_holds where customer_id=${literal(refusedContext.customerId)}::uuid`), '0')
      checks.push('a witnessed authorization winner permanently refuses an unaccepted native intent without any canonical hold')
      const routeContext=context(sql('select k2_hold_fixture.second_request()')),routeKey=randomUUID()
      await authority.submitDecision(register(routeContext))
      const routePayload={requestId:routeContext.requestId,action:'add_hold',kind:'legal',reason:'Synthetic actual Admin adapter'}
      loseReply=true
      assert.equal((await adminRoute(routeContext,routePayload,routeKey)).statusCode,503)
      const routeCreated=await finishAdmin('request hold after lost projection reply',routeContext,routePayload,routeKey)
      assert.equal(routeCreated.statusCode,200);assert.equal(routeCreated.body.result.currentState,'projected')
      const routeHold=routeCreated.body.result.holdId
      assert.equal(sql(`select count(*) from k2_private.customer_privacy_review_events where hold_id=${literal(routeHold)}::uuid`),'1')
      checks.push('actual Admin handler signed native prepare plus coordinator reconciles a lost projection reply with one hold/event and no browser proof export')
      const routeResolution={requestId:routeContext.requestId,action:'resolve_hold',holdId:routeHold,reason:'Synthetic adapter resolution'},routeResolutionKey=randomUUID()
      loseResolutionReply=true
      assert.equal((await adminRoute(routeContext,routeResolution,routeResolutionKey)).statusCode,503)
      const routeReleased=await finishAdmin('request resolution after lost native reply',routeContext,routeResolution,routeResolutionKey)
      assert.equal(routeReleased.statusCode,200);assert.equal(routeReleased.body.result.currentState,'resolved')
      assert.equal(sql(`select count(*) from k2_private.customer_privacy_review_events where hold_id=${literal(routeHold)}::uuid`),'2')
      const routeState=(await finishAuthority('request released history',()=>authority.reconcile())).state
      assert.equal(Object.values(routeState.protections).find(p=>p.requestId===routeContext.requestId).state,'released')
      const historical=await finishAdmin('historical request hold',routeContext,routePayload,routeKey)
      assert.equal(historical.statusCode,409);assert.equal(historical.body.error.code,'PRIVACY_HOLD_ALREADY_RESOLVED')
      checks.push('actual Admin adapter recovers committed native resolution and verified release then refuses historical creation as a current saved hold')
      const refusedRouteKey=randomUUID(),refusedRoutePayload={requestId:refusedContext.requestId,action:'add_hold',kind:'security',reason:'Synthetic adapter cutoff'}
      const routeRefused=await finishAdmin('authorization refusal',refusedContext,refusedRoutePayload,refusedRouteKey)
      assert.equal(routeRefused.statusCode,409);assert.equal(routeRefused.body.error.code,'PRIVACY_PROCESSING_STARTED')
      assert.equal(sql(`select count(*) from k2_private.customer_privacy_holds where customer_id=${literal(refusedContext.customerId)}::uuid`),'0')
      checks.push('actual Admin adapter returns processing-started refusal without a canonical hold or false success')
      const guest=sql("insert into public.customers(display_name,created_source) values('Synthetic customer before signup','website_guest') returning id")
      const guestContext={customerId:guest,adminId:first.adminId},guestKey=randomUUID()
      const guestPayload={customerId:guest,action:'add_customer_hold',kind:'security',reason:'Synthetic pre-request protection'}
      const startedBaselineScan=performance.now(), baselineScan=await finishAuthority('customer scope baseline history',()=>authority.reconcile())
      receipt.customerScopeMeasurement={historyRevision:baselineScan.state.revision, baselineScanMs:Math.round(performance.now()-startedBaselineScan)}
      const registeredBefore=Object.keys(baselineScan.state.requests).length
      loseReply=true
      const startedGuestFirst=performance.now(), firstGuestAttempt=await adminRoute(guestContext,guestPayload,guestKey)
      receipt.customerScopeMeasurement.firstAttemptMs=Math.round(performance.now()-startedGuestFirst)
      receipt.customerScopeMeasurement.firstAttemptStatus=firstGuestAttempt.statusCode
      receipt.customerScopeMeasurement.firstAttemptFailure=lastAdminFailure
      receipt.customerScopeMeasurement.firstAttemptReachedLostReply=!loseReply
      assert.equal(firstGuestAttempt.statusCode,503)
      let guestSaved
      receipt.customerScopeMeasurement.retries=[]
      for(let attempt=0;attempt<6;attempt++){
        const started=performance.now()
        guestSaved=await adminRoute(guestContext,guestPayload,guestKey)
        receipt.customerScopeMeasurement.retries.push({elapsedMs:Math.round(performance.now()-started),status:guestSaved.statusCode,failure:lastAdminFailure})
        if(guestSaved.statusCode===200)break
        assert.equal(guestSaved.statusCode,503)
      }
      if(guestSaved.statusCode!==200){
        const diagnostic={lastAdminFailure,response:guestSaved.body,native:JSON.parse(sql(`select jsonb_build_object('state',state,'nullUser',user_id is null,'nullRequest',request_id is null) from k2_private.customer_privacy_hold_intents where id=${literal(guestKey)}::uuid`))}
        try { const direct=await authority.applyHold(admin('customer_privacy_hold_prepare',{customerId:guest,kind:guestPayload.kind,reason:guestPayload.reason},guestKey,first.adminId)); diagnostic.direct={currentState:direct.currentState,receipt:direct.receipt} }
        catch(error){diagnostic.direct={code:error.code,message:error.message}}
        receipt.customerScopeFailure=diagnostic
      }
      receipt.customerScopeMeasurement.eventualLostReplyReached=!loseReply
      assert.equal(guestSaved.statusCode,200,JSON.stringify(receipt.customerScopeFailure));assert.equal(loseReply,false,'the synthetic lost projection reply must actually occur');assert.equal(guestSaved.body.result.currentState,'projected');assert.equal(guestSaved.body.result.customerId,guest)
      const guestHold=guestSaved.body.result.holdId
      assert.equal(sql(`select count(*) from k2_private.customer_privacy_requests where customer_id=${literal(guest)}::uuid`),'0')
      assert.equal(sql(`select count(*) from public.customer_accounts where customer_id=${literal(guest)}::uuid`),'0')
      assert.equal(sql(`select count(*) from k2_private.customer_privacy_hold_intents where hold_id=${literal(guestHold)}::uuid and request_id is null and user_id is null`),'1')
      assert.equal(Object.keys((await authority.reconcile()).state.requests).length,registeredBefore)
      storage.close();authority=createNativeHoldAuthority({...configuration,witness:openWitness()})
      const guestProtection=Object.values((await authority.reconcile()).state.protections).find(p=>p.customerId===guest)
      assert.equal(guestProtection.state,'active');assert.equal(guestProtection.actorId,null);assert.equal(guestProtection.requestId,null)
      checks.push('actual customer-only Admin hold predates signup or request, reconciles loss and survives SQLite reopen with no invented origin')
      // A real account link is immutable: create a new synthetic subject and
      // verified contact directly on the pre-existing guest, never rebind an
      // already-linked account to manufacture the test scope.
      const later={actorId:randomUUID(),requestId:randomUUID(),customerId:guest,adminId:first.adminId}, contactId=randomUUID()
      const syntheticEmail=`native-guest-${later.actorId}@example.invalid`
      sql(`begin;
        insert into auth.users(id,email,email_confirmed_at,created_at,updated_at,aud,role,raw_app_meta_data,raw_user_meta_data)
          values(${literal(later.actorId)}::uuid,${literal(syntheticEmail)},clock_timestamp(),clock_timestamp(),clock_timestamp(),'authenticated','authenticated','{}','{}');
        insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,verification_status,verified_at,source)
          values(${literal(contactId)}::uuid,${literal(guest)}::uuid,'email',${literal(syntheticEmail)},extensions.digest(${literal(later.actorId)},'sha256'),'verified',clock_timestamp(),'website_account');
        insert into public.customer_accounts(user_id,customer_id,verified_contact_point_id) values(${literal(later.actorId)}::uuid,${literal(guest)}::uuid,${literal(contactId)}::uuid);
        insert into k2_private.customer_privacy_requests(id,user_id,customer_id,channel,receipt_hash,state,verified_at,assigned_to)
          values(${literal(later.requestId)}::uuid,${literal(later.actorId)}::uuid,${literal(guest)}::uuid,'email',extensions.digest(${literal(later.requestId)},'sha256'),'pending',clock_timestamp(),${literal(first.adminId)}::uuid);commit;`)
      await authority.submitDecision(register(later))
      await assert.rejects(authority.submitDecision(authorize(later)),error=>error.code==='AUTHORITY_PROTECTED')
      const independent=context(sql('select k2_hold_fixture.second_request()'))
      await authority.submitDecision(register(independent));await authority.submitDecision(authorize(independent))
      const guestResolutionKey=randomUUID(),guestResolution={requestId:later.requestId,action:'resolve_hold',holdId:guestHold,reason:'Synthetic later-request resolution'}
      sql(`update k2_private.customer_privacy_requests set assigned_to=null where id=${literal(later.requestId)}::uuid`)
      const notAssigned=await adminRoute(later,guestResolution,guestResolutionKey)
      assert.equal(notAssigned.statusCode,409);assert.equal(notAssigned.body.error.code,'PRIVACY_ASSIGNMENT_REQUIRED')
      sql(`update k2_private.customer_privacy_requests set assigned_to=${literal(first.adminId)}::uuid where id=${literal(later.requestId)}::uuid`)
      loseResolutionReply=true
      assert.equal((await adminRoute(later,guestResolution,guestResolutionKey)).statusCode,503)
      assert.equal((await authority.reconcile()).state.protections[guestProtection.protectionId].state,'active')
      let guestReleased
      receipt.customerScopeMeasurement.resolutionRetries=[]
      for(let attempt=0;attempt<6;attempt++){
        const started=performance.now()
        guestReleased=await adminRoute(later,guestResolution,guestResolutionKey)
        receipt.customerScopeMeasurement.resolutionRetries.push({elapsedMs:Math.round(performance.now()-started),status:guestReleased.statusCode,failure:lastAdminFailure})
        if(guestReleased.statusCode===200)break
        assert.equal(guestReleased.statusCode,503)
      }
      assert.equal(loseResolutionReply,false,'the synthetic lost resolution reply must actually occur')
      assert.equal(guestReleased.statusCode,200,'the original resolution must complete within the bounded local retries');assert.equal(guestReleased.body.result.requestId,later.requestId)
      const guestReleaseExport=admin('customer_privacy_hold_resolve',{requestId:later.requestId,holdId:guestHold,reason:guestResolution.reason},guestResolutionKey,first.adminId)
      assert.equal(guestReleaseExport.command.payload.actorId,null);assert.equal(guestReleaseExport.command.payload.requestId,null)
      await authority.submitDecision(authorize(later))
      let guestLate
      for(let attempt=0;attempt<6;attempt++){
        guestLate=await adminRoute(guestContext,guestPayload,guestKey)
        if(guestLate.statusCode!==503)break
      }
      assert.equal(guestLate.statusCode,409);assert.equal(guestLate.body.error.code,'PRIVACY_HOLD_ALREADY_RESOLVED')
      assert.equal(sql(`select count(*) from k2_private.customer_privacy_review_events where hold_id=${literal(guestHold)}::uuid`),'2')
      checks.push('later real request respects pre-request customer protection while unrelated customer proceeds; assignment and lost resolution preserve original null scope and one-shot outcome')
      Object.assign(receipt, { status: 'passed', nonHoldProof: 'synthetic register/cancel/freeze/authorize and native customer status setup only; not genuine erasure/Auth',
        r2: 'actual isolated Miniflare R2 binding', witness: 'actual Node SQLite using maintained witness adapter', transitions: transitions.length,
      })
      return receipt
    }, { onStop: value => { receipt.shutdown = value } })
  } catch (error) {
    receipt.status = 'failed'; receipt.error = { message: error.message, code: error.code }
    throw error
  } finally {
    let cleanupError
    try { storage?.close() } catch (error) { cleanupError = error; receipt.sqliteCloseError = error.message }
    if (cleanupError) { receipt.status = 'failed'; receipt.cleanupError = cleanupError.message }
    writeFileSync(join(work, 'hold-coordinator.json'), JSON.stringify(receipt, null, 2) + '\n')
    if (cleanupError) throw cleanupError
  }
}
