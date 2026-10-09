// Local clone only. Test barriers expose lock order; no provider calls or SQL.
import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { signedAdminCommandArguments } from '../server/admin-bff/security.js'
import { signedRpcArguments } from '../server/storefront-bff/security.js'
import { rehearseCurrentPayment } from './rehearse-current-payment.mjs'
import { rehearseEligibleLotComposition } from './rehearse-eligible-lot-composition.mjs'
import { rehearsePaymentLotParity } from './rehearse-payment-lot-parity.mjs'
import { rehearseCurrentWriterConcurrency, currentWriterWitnessSha256 } from './rehearse-current-writer-concurrency.mjs'
import { rehearseCurrentReleaseConcurrency, releaseWitnessSha256 } from './rehearse-current-release-concurrency.mjs'
import { rehearseCatalogCurrentChain, catalogCurrentChainWitnessSha256 } from './rehearse-catalog-current-chain.mjs'
import { rehearseIntakeFoundation, intakeFoundationWitnessSha256 } from './rehearse-intake-foundation.mjs'
import { rehearseIntakeDependencies, intakeDependenciesWitnessSha256 } from './rehearse-intake-dependencies.mjs'
import { rehearseIntakeLifecycle, intakeLifecycleWitnessSha256 } from './rehearse-intake-lifecycle.mjs'
import { rehearseIntakeFlight, intakeFlightWitnessSha256 } from './rehearse-intake-flight.mjs'
import { rehearseIntakeFlightCost, intakeFlightCostWitnessSha256 } from './rehearse-intake-flight-cost.mjs'
import { rehearseIntakeCalendar, intakeCalendarWitnessSha256 } from './rehearse-intake-calendar.mjs'
import { rehearseIntakePublication, intakePublicationWitnessSha256 } from './rehearse-intake-publication.mjs'
import { rehearseIntakeCleanup, intakeCleanupWitnessSha256 } from './rehearse-intake-cleanup.mjs'
import { rehearseIntakeDisabledAi, intakeDisabledAiWitnessSha256 } from './rehearse-intake-disabled-ai.mjs'
import { rehearseReleaseCurrentChain, releaseCurrentChainWitnessSha256 } from './rehearse-release-current-chain.mjs'
import { rehearseReleaseLotParity, releaseLotWitnessSha256 } from './rehearse-release-lot-parity.mjs'
import { rehearseLotCompatibility, lotCompatibilityWitnessSha256 } from './rehearse-lot-compatibility.mjs'
import { rehearseCurrentReceiving, receivingWitnessSha256 } from './rehearse-current-receiving.mjs'
import { rehearseReceivingCalendar, receivingCalendarWitnessSha256 } from './rehearse-receiving-calendar.mjs'
import { rehearseReceivingRetry, receivingRetryWitnessSha256 } from './rehearse-receiving-retry.mjs'
import { rehearseReceivingWriters, receivingWritersWitnessSha256 } from './rehearse-receiving-writers.mjs'
import { rehearseClearanceConcurrency, clearanceConcurrencyWitnessSha256 } from './rehearse-clearance-concurrency.mjs'
import { rehearseReceivingFinalizer, receivingFinalizerWitnessSha256 } from './rehearse-receiving-finalizer.mjs'
import { rehearseReceivingPurchase, receivingPurchaseWitnessSha256 } from './rehearse-receiving-purchase.mjs'
import { rehearseClearanceRecount, clearanceRecountWitnessSha256 } from './rehearse-clearance-recount.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const witnessBytes=fs.readFileSync(fileURLToPath(import.meta.url))
const witnessSha256=createHash('sha256').update(witnessBytes).digest('hex')
const paymentWitnessSha256=createHash('sha256').update(fs.readFileSync(path.join(root,'scripts/rehearse-current-payment.mjs'))).digest('hex')
const template = 'k2_current_restore_20260929'
const database = 'k2_website_stock_locks_20261001'
const dataDirectory = path.join(root, '.tools/current-restore-20260929-pg-data').replaceAll('\\', '/')
const bin = path.join(root, '.tools/postgresql-17.11/runtime/pgsql/bin')
const signedHolds = process.argv.includes('--signed-holds')
const couponLifecycle = process.argv.includes('--coupon-lifecycle')
const paymentLifecycle = process.argv.includes('--payment-lifecycle')
const eligibleLots = process.argv.includes('--eligible-lots')
const paymentLotParity=process.argv.includes('--payment-lot-parity')
const currentWriters=process.argv.includes('--current-writers')
const releaseRaces=process.argv.includes('--release-races')
const catalogCurrentChain=process.argv.includes('--catalog-current-chain')
const catalogIntakeFoundation=process.argv.includes('--catalog-intake-foundation')
const intakeLifecycle=process.argv.includes('--intake-lifecycle')
const intakeFlight=process.argv.includes('--intake-flight')
const intakeCalendar=process.argv.includes('--intake-calendar')
const intakePublication=process.argv.includes('--intake-publication')
const intakeCleanup=process.argv.includes('--intake-cleanup')
const intakeDisabledAi=process.argv.includes('--intake-disabled-ai')
if(intakeDisabledAi&&!intakeLifecycle)throw Error('INTAKE_DISABLED_AI_REQUIRES_NATIVE_LIFECYCLE')
const beforeCleanupFix=process.argv.includes('--cleanup-null-baseline')
if(intakeCleanup&&!intakeLifecycle)throw Error('INTAKE_CLEANUP_REQUIRES_NATIVE_LIFECYCLE')
if(beforeCleanupFix&&!intakeCleanup)throw Error('CLEANUP_BASELINE_REQUIRES_CLEANUP')
if(intakePublication&&!intakeLifecycle)throw Error('INTAKE_PUBLICATION_REQUIRES_NATIVE_LIFECYCLE')
if(intakeCalendar&&!intakeFlight)throw Error('INTAKE_CALENDAR_REQUIRES_NATIVE_FLIGHT')
if(intakeFlight&&!intakeLifecycle)throw Error('INTAKE_FLIGHT_REQUIRES_NATIVE_LIFECYCLE')
if(intakeLifecycle&&!catalogIntakeFoundation)throw Error('INTAKE_LIFECYCLE_REQUIRES_FULL_FOUNDATION')
if(catalogIntakeFoundation&&!catalogCurrentChain)throw Error('INTAKE_FOUNDATION_REQUIRES_CURRENT_CATALOG')
if(catalogCurrentChain&&!process.argv.includes('--release-current-chain'))throw Error('CATALOG_CURRENT_CHAIN_REQUIRES_CURRENT_RELEASE')
const releaseCurrentChain=process.argv.includes('--release-current-chain')
if(releaseCurrentChain&&(!releaseRaces||process.argv.includes('--release-witness-failure')))throw new Error('RELEASE_CURRENT_CHAIN_REQUIRES_CORRECTED_RELEASE')
const releaseWitnessFailure=process.argv.includes('--release-witness-failure')
const releaseEligibility=process.argv.includes('--release-eligibility')
const beforeReleaseLotFix=process.argv.includes('--before-release-eligible-fix')
const lotCompatibility=process.argv.includes('--lot-compatibility')
const beforeLotCompatFix=process.argv.includes('--before-lot-compat-fix')
const receivingParity=process.argv.includes('--receiving-parity')
const beforeReceivingFix=process.argv.includes('--before-receiving-fix')
const receivingCalendar=process.argv.includes('--receiving-calendar')
const beforeReceivingCalendarFix=process.argv.includes('--before-receiving-calendar-fix')
const receivingRetry=process.argv.includes('--receiving-retry')
const beforeReceivingRetryFix=process.argv.includes('--before-receiving-retry-fix')
const writerReverse=process.argv.includes('--writer-reverse')
const writerControllerFailure=process.argv.includes('--writer-controller-failure')
const beforeControllerCleanup=process.argv.includes('--before-controller-cleanup')
const recountInitialization=process.argv.includes('--recount-initialization')
const beforeRecountLockFix=process.argv.includes('--before-recount-lock-fix')
const writerWitnessFailure=process.argv.includes('--writer-witness-failure')
const receivingWriters=process.argv.includes('--receiving-writers')
const beforeClearanceLockFix=process.argv.includes('--before-clearance-lock-fix')
const clearanceRecount=process.argv.includes('--clearance-recount')
const clearanceEdges=process.argv.includes('--clearance-edges')
if(clearanceEdges&&(!clearanceRecount||beforeClearanceLockFix))throw new Error('CLEARANCE_EDGES_REQUIRES_CORRECTED_CLEARANCE')
if(beforeClearanceLockFix&&!clearanceRecount)throw new Error('CLEARANCE_LOCK_BASELINE_REQUIRES_CLEARANCE_RECOUNT')
if(clearanceRecount&&(!currentWriters||!signedHolds||!couponLifecycle||!paymentLifecycle||!eligibleLots||!paymentLotParity
  ||receivingWriters||process.argv.some(arg=>['--receiving-purchase','--receiving-finalizer','--clearance-concurrency','--receiving-retry','--receiving-calendar','--receiving-parity','--release-races','--release-eligibility','--lot-compatibility','--writer-reverse','--writer-controller-failure','--recount-initialization','--writer-witness-failure','--release-witness-failure'].includes(arg)||(arg.startsWith('--before-')&&arg!=='--before-clearance-lock-fix'))))throw new Error('CLEARANCE_RECOUNT_REQUIRES_CORRECTED_CURRENT_CHAIN')
const receivingPurchase=process.argv.includes('--receiving-purchase')
if(receivingPurchase&&(!currentWriters||!signedHolds||!couponLifecycle||!paymentLifecycle||!eligibleLots||!paymentLotParity
  ||receivingWriters||process.argv.includes('--receiving-finalizer')||process.argv.includes('--clearance-concurrency')
  ||receivingRetry||receivingCalendar||receivingParity||releaseRaces||releaseEligibility||lotCompatibility||writerReverse
  ||writerControllerFailure||recountInitialization||writerWitnessFailure||releaseWitnessFailure
  ||process.argv.some(arg=>arg.startsWith('--before-'))))throw new Error('RECEIVING_PURCHASE_REQUIRES_CORRECTED_CURRENT_CHAIN')
const clearanceConcurrency=process.argv.includes('--clearance-concurrency')
if(clearanceConcurrency&&(!currentWriters||!signedHolds||!couponLifecycle||!paymentLifecycle||!eligibleLots||!paymentLotParity
  ||receivingWriters||process.argv.includes('--receiving-finalizer')||receivingRetry||receivingCalendar||receivingParity||releaseRaces||releaseEligibility||lotCompatibility
  ||writerReverse||writerControllerFailure||recountInitialization||writerWitnessFailure||releaseWitnessFailure
  ||process.argv.some(arg=>arg.startsWith('--before-'))))throw new Error('CLEARANCE_CONCURRENCY_REQUIRES_CORRECTED_CURRENT_CHAIN')
const receivingFinalizer=process.argv.includes('--receiving-finalizer')
if(receivingFinalizer&&(!currentWriters||!signedHolds||!couponLifecycle||!paymentLifecycle||!eligibleLots||!paymentLotParity
  ||receivingWriters||receivingRetry||receivingCalendar||receivingParity||releaseRaces||releaseEligibility||lotCompatibility
  ||writerReverse||writerControllerFailure||recountInitialization||writerWitnessFailure||releaseWitnessFailure
  ||process.argv.some(arg=>arg.startsWith('--before-'))))throw new Error('RECEIVING_FINALIZER_REQUIRES_CORRECTED_CURRENT_CHAIN')
if(receivingWriters&&(!currentWriters||!signedHolds||!couponLifecycle||!paymentLifecycle||!eligibleLots||!paymentLotParity
  ||receivingRetry||receivingCalendar||receivingParity||releaseRaces||releaseEligibility||lotCompatibility
  ||writerControllerFailure||recountInitialization||writerWitnessFailure||releaseWitnessFailure
  ||process.argv.some(arg=>arg.startsWith('--before-'))))throw new Error('RECEIVING_WRITERS_REQUIRE_CORRECTED_CURRENT_CHAIN')
if(receivingRetry&&(!currentWriters||receivingCalendar||receivingParity||releaseRaces||releaseEligibility||lotCompatibility
  ||writerReverse||writerControllerFailure||recountInitialization||writerWitnessFailure||releaseWitnessFailure
  ||process.argv.some(arg=>arg.startsWith('--before-')&&arg!=='--before-receiving-retry-fix'))
  ||beforeReceivingRetryFix&&!receivingRetry)throw new Error('RECEIVING_RETRY_REQUIRES_CORRECTED_CURRENT_CHAIN')
if(receivingCalendar&&(!currentWriters||receivingParity||releaseRaces||releaseEligibility||lotCompatibility||writerReverse||writerControllerFailure
  ||recountInitialization||writerWitnessFailure||releaseWitnessFailure
  ||process.argv.some(arg=>arg.startsWith('--before-')&&arg!=='--before-receiving-calendar-fix'))
  ||beforeReceivingCalendarFix&&!receivingCalendar)throw new Error('RECEIVING_CALENDAR_REQUIRES_CORRECTED_CURRENT_CHAIN')
if(receivingParity&&(!currentWriters||releaseRaces||releaseEligibility||lotCompatibility||writerReverse||writerControllerFailure
  ||recountInitialization||writerWitnessFailure||releaseWitnessFailure
  ||process.argv.some(arg=>arg.startsWith('--before-')&&arg!=='--before-receiving-fix'))
  ||beforeReceivingFix&&!receivingParity)throw new Error('RECEIVING_REQUIRES_CORRECTED_CURRENT_CHAIN')
if(lotCompatibility&&(!currentWriters||releaseRaces||releaseEligibility||writerReverse||writerControllerFailure
  ||recountInitialization||writerWitnessFailure||releaseWitnessFailure
  ||process.argv.some(arg=>arg.startsWith('--before-')&&arg!=='--before-lot-compat-fix'))
  ||beforeLotCompatFix&&!lotCompatibility)throw new Error('LOT_COMPATIBILITY_REQUIRES_CORRECTED_CURRENT_CHAIN')
if(releaseEligibility&&(!currentWriters||releaseRaces||writerReverse||writerControllerFailure||recountInitialization||writerWitnessFailure
  ||process.argv.some(arg=>arg.startsWith('--before-')&&arg!=='--before-release-eligible-fix'))
  ||beforeReleaseLotFix&&!releaseEligibility)throw new Error('RELEASE_ELIGIBILITY_REQUIRES_CORRECTED_CURRENT_CHAIN')
if(releaseRaces&&(!currentWriters||writerReverse||writerControllerFailure||recountInitialization||beforeRecountLockFix||writerWitnessFailure
  ||process.argv.some(arg=>arg.startsWith('--before-')))
  ||releaseWitnessFailure&&!releaseRaces)throw new Error('RELEASE_RACES_REQUIRE_CORRECTED_CURRENT_WRITERS')
if(currentWriters&&!paymentLotParity||(!currentWriters&&(beforeRecountLockFix||writerWitnessFailure)))
  throw new Error('CURRENT_WRITERS_REQUIRES_PAYMENT_LOT_PARITY')
if(recountInitialization&&(!currentWriters||writerWitnessFailure))throw new Error('RECOUNT_INITIALIZATION_MODE_INVALID')
if((writerReverse||writerControllerFailure)&&(!currentWriters||recountInitialization||writerWitnessFailure)
  ||(writerReverse&&writerControllerFailure)||(beforeControllerCleanup&&!writerControllerFailure))
  throw new Error('WRITER_CONTINUATION_MODE_INVALID')
const beforePaymentLotFix=process.argv.includes('--before-payment-lot-fix')
if(beforePaymentLotFix && !paymentLotParity)throw new Error('PAYMENT_LOT_BASELINE_REQUIRES_PARITY_MODE')
if(paymentLotParity && (!eligibleLots || process.argv.includes('--before-eligible-fix'))) throw new Error('PAYMENT_LOT_PARITY_REQUIRES_CORRECTED_ELIGIBILITY')
const paymentLotWitnessSha256=createHash('sha256').update(fs.readFileSync(path.join(root,'scripts/rehearse-payment-lot-parity.mjs'))).digest('hex')
const beforeEligibleFix = process.argv.includes('--before-eligible-fix')
const runEligibleAdvisors=process.argv.includes('--advisors')
if(runEligibleAdvisors && !eligibleLots) throw new Error('ADVISORS_REQUIRE_ELIGIBLE_CHAIN')
const eligibleWitnessSha256=createHash('sha256').update(fs.readFileSync(path.join(root,'scripts/rehearse-eligible-lot-composition.mjs'))).digest('hex')
if (eligibleLots && !paymentLifecycle) throw new Error('ELIGIBLE_LOTS_REQUIRES_CURRENT_PAYMENT_CHAIN')
if (beforeEligibleFix && !eligibleLots) throw new Error('ELIGIBLE_BASELINE_REQUIRES_ELIGIBLE_CHAIN')
const beforeStructuredCommitment = process.argv.includes('--before-structured-commitment')
const beforePaymentBodyGuard = process.argv.includes('--before-payment-body-guard')
if (beforePaymentBodyGuard && (!paymentLifecycle || beforeStructuredCommitment)) throw new Error('PAYMENT_BODY_BASELINE_REQUIRES_CORRECTED_PAYMENT_CHAIN')
if (beforeStructuredCommitment && !paymentLifecycle) throw new Error('STRUCTURED_BASELINE_REQUIRES_PAYMENT_CHAIN')
if (paymentLifecycle && !couponLifecycle) throw new Error('PAYMENT_LIFECYCLE_REQUIRES_COUPON_CHAIN')
const beforeCommitment = process.argv.includes('--before-commitment')
const beforeEventType = process.argv.includes('--before-event-type')
const beforeKeyLock = process.argv.includes('--before-key-lock')
if (beforeKeyLock && !signedHolds) throw new Error('KEY_LOCK_REGRESSION_REQUIRES_SIGNED_HOLDS')
if ((couponLifecycle && !signedHolds) || (beforeCommitment && !couponLifecycle)
    || (beforeEventType && (!couponLifecycle || beforeCommitment))
    || (couponLifecycle && (beforeKeyLock || process.argv.includes('--before-fix')))) {
  throw new Error('COUPON_LIFECYCLE_MODE_INVALID')
}
const clearanceRuns=process.argv.filter(arg=>arg.startsWith('--clearance-run='))
const clearanceRun=clearanceRuns[0]?.slice('--clearance-run='.length)??'original'
if(clearanceRuns.length>1||(!clearanceConcurrency&&!clearanceRecount&&clearanceRuns.length)
  ||!/^[a-z][a-z0-9-]{0,79}$/.test(clearanceRun))throw new Error('CLEARANCE_EVIDENCE_RUN_INVALID')
const purchaseRuns=process.argv.filter(arg=>arg.startsWith('--purchase-run='))
const purchaseRun=purchaseRuns[0]?.slice('--purchase-run='.length)??'original'
if(purchaseRuns.length>1||(!receivingPurchase&&purchaseRuns.length)
  ||!/^[a-z][a-z0-9-]{0,79}$/.test(purchaseRun))throw new Error('PURCHASE_EVIDENCE_RUN_INVALID')
const receivingRuns=process.argv.filter(arg=>arg.startsWith('--receiving-run='))
const releaseRuns=process.argv.filter(arg=>arg.startsWith('--release-run='))
const receivingRun=receivingRuns[0]?.slice('--receiving-run='.length)??(beforeReceivingFix?'before-fix':'after-fix')
const releaseRun=releaseRuns[0]?.slice('--release-run='.length)??(beforeReleaseLotFix?'before-fix':releaseWitnessFailure?'witness-failure':'after-fix')
if(receivingRuns.length>1||releaseRuns.length>1||(!receivingParity&&receivingRuns.length)
  ||(!releaseRaces&&!releaseEligibility&&releaseRuns.length)
  ||!/^[a-z][a-z0-9-]{0,79}$/.test(receivingRun)||!/^[a-z][a-z0-9-]{0,79}$/.test(releaseRun))throw new Error('REHEARSAL_EVIDENCE_RUN_INVALID')
const evidence = path.join(root, clearanceRecount ? `docs/evidence/20261003-clearance-recount/${clearanceRun}` : receivingPurchase ? `docs/evidence/20261003-receiving-purchase/${purchaseRun}`
  : clearanceConcurrency ? `docs/evidence/20261003-clearance-concurrency/${clearanceRun}`
  : receivingFinalizer ? 'docs/evidence/20261003-receiving-finalizer/after-fix'
  : receivingWriters ? `docs/evidence/20261003-receiving-writers/${writerReverse?'writer-first':'recount-first'}`
  : receivingRetry ? `docs/evidence/20261003-receiving-retry/${beforeReceivingRetryFix?'before-fix':'after-fix'}`
  : receivingCalendar ? `docs/evidence/20261002-receiving-calendar/${beforeReceivingCalendarFix?'before-fix':'after-fix'}`
  : receivingParity ? `docs/evidence/20261002-current-receiving/${receivingRun}`
  : lotCompatibility ? `docs/evidence/20261002-lot-compatibility/${beforeLotCompatFix?'before-fix':'after-fix'}`
  : releaseEligibility ? `docs/evidence/20261002-release-lot-parity/${releaseRun}`
  : releaseRaces ? `docs/evidence/20261002-current-release-races/${releaseRun}`
  : writerControllerFailure ? `docs/evidence/20261002-recount-reverse/controller-${beforeControllerCleanup?'before-fix':'after-fix'}`
  : writerReverse ? `docs/evidence/20261002-recount-reverse/${beforeRecountLockFix?'before-fix':'after-fix'}`
  : recountInitialization ? `docs/evidence/20261002-recount-initialization/${beforeRecountLockFix?'before-fix':'after-fix'}` : currentWriters ? `docs/evidence/20261002-recount-lock-order/${writerWitnessFailure?'witness-failure':beforeRecountLockFix?'before-fix':'after-fix'}` : paymentLotParity ? 'docs/evidence/20261002-payment-lot-parity' : eligibleLots ? 'docs/evidence/20261002-purchase-lot-parity'
  : paymentLifecycle ? 'docs/evidence/20261002-current-payment-handover'
  : couponLifecycle ? 'docs/evidence/20261002-current-coupon-holds'
  : signedHolds ? 'docs/evidence/20261001-signed-purchase-holds' : 'docs/evidence/20261001-website-stock-locks')
if(clearanceRecount||clearanceConcurrency||receivingPurchase||receivingParity||releaseRaces||releaseEligibility) {
  fs.mkdirSync(path.dirname(evidence),{recursive:true})
  try{fs.mkdirSync(evidence)}catch(error){
    if(error.code==='EEXIST')throw new Error(receivingPurchase?'PURCHASE_EVIDENCE_ALREADY_EXISTS':clearanceRecount||clearanceConcurrency?'CLEARANCE_EVIDENCE_ALREADY_EXISTS':'REHEARSAL_EVIDENCE_ALREADY_EXISTS')
    throw error
  }
}else fs.mkdirSync(evidence,{recursive:true})
if(currentWriters)fs.writeFileSync(path.join(evidence,'executed-root.mjs'),witnessBytes)
const beforeFix = process.argv.includes('--before-fix')
const actor = '42000000-0000-4000-8000-000000000001'
const marker = randomUUID()
const adminSecret = randomBytes(32)
const guestSecret = randomBytes(32)
process.env.K2_ADMIN_BFF_REQUEST_SECRET = adminSecret.toString('base64')
process.env.K2_GUEST_BFF_SECRET = guestSecret.toString('base64')
const literal = value => `'${String(value).replaceAll("'", "''")}'`
const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: '54388', PGUSER: 'postgres',
  PGSSLMODE: 'disable', PGCLIENTENCODING: 'UTF8' }
const args = db => ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-d', db]
const manifest = []
const advisors=[]
function source(file, functionName) {
  const sql = fs.readFileSync(path.join(root, file), 'utf8')
  manifest.push({ path: file, sha256: createHash('sha256').update(sql).digest('hex'),
    scope: functionName ? `function body: ${functionName}` : 'whole source' })
  if (!functionName) return sql
  const start = `create or replace function ${functionName}(`
  const offset = sql.indexOf(start)
  const end = sql.indexOf('\n$$;', offset)
  if (offset < 0 || end < 0 || sql.indexOf(start, offset + 1) !== -1) throw new Error('FUNCTION_SOURCE_SCOPE_INVALID')
  return sql.slice(offset, end + 4)
}
const withoutTransaction = sql => sql.replace(/^(begin(?: transaction read only)?|commit|rollback);\r?$/gmi, '')
  .replace(/^\\set ON_ERROR_STOP on\r?$/gm, '')
function sync(db, sql) {
  const file = path.join(root, '.tools', `website-stock-${randomUUID()}.sql`)
  fs.writeFileSync(file, `\\set ON_ERROR_STOP on\n${sql}`, 'utf8')
  try {
    const r = spawnSync(path.join(bin, 'psql.exe'), [...args(db), '-f', file],
      { cwd: root, windowsHide: true, env, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 })
    if (r.error || r.status !== 0) {
      const cause=String(r.stderr || r.error?.message)
      if(clearanceRecount||receivingPurchase||clearanceConcurrency||receivingFinalizer||receivingWriters||receivingParity||receivingCalendar||receivingRetry)fs.writeFileSync(path.join(evidence,`sql-error-${randomUUID()}.txt`),cause)
      throw new Error((receivingPurchase||clearanceConcurrency||receivingFinalizer||receivingWriters||receivingParity||receivingCalendar||receivingRetry)&&cause.length>3000
        ?cause.slice(0,1400)+'\n[long SQL context omitted here; full cause archived]\n'+cause.slice(-1400)
        :cause.slice(-3000))
    }
    return r.stdout.trim()
  } finally { fs.unlinkSync(file) }
}
const value = sql => sync(database, sql).split('\n').at(-1).trim()
const staff = `select set_config('request.jwt.claim.sub','${actor}',false);
 select set_config('request.jwt.claims','{"aal":"aal2"}',false);`
const targetGuard = db => `do $$ begin
 if current_database() is distinct from ${literal(db)} or host(inet_server_addr()) is distinct from '127.0.0.1'
 or inet_server_port() is distinct from 54388 or replace(current_setting('data_directory'),chr(92),'/') is distinct from ${literal(dataDirectory)}
 then raise exception 'WRONG_LOCAL_TARGET'; end if; end $$;`
function eligibleAdvisor(stage) {
  if(!runEligibleAdvisors) return
  sync(database,`${targetGuard(database)} do $$ begin
    if (select marker from k2_stock_fixture.owner) is distinct from '${marker}'::uuid
    then raise exception 'CLONE_OWNERSHIP_MISMATCH'; end if; end $$;`)
  const cli=path.join(root,'.tools/complete-lot-cli/runtime/supabase.exe')
  const cliSha256=createHash('sha256').update(fs.readFileSync(cli)).digest('hex')
  if(cliSha256!=='971f439cc4b774f43181593551e0e34e29f399d5e82cbe3508e87537ec13e29f') throw new Error('LOCAL_CLI_HASH_CHANGED')
  const cliDirectory=path.join(root,'.tools/public-stock-cli')
  const result=spawnSync(cli,['db','advisors','--db-url',`postgresql://postgres@127.0.0.1:54388/${database}?sslmode=disable`,
    '--type','all','--fail-on','none','--output','json','--workdir',cliDirectory],
    {cwd:cliDirectory,windowsHide:true,env:{...env,SUPABASE_HOME:path.join(root,'.tools/listing-stock-cli-home'),
      SUPABASE_TELEMETRY_DISABLED:'1'},encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024})
  const report={stage,cliSha256,status:result.status,error:result.error?.message,stdout:result.stdout,stderr:result.stderr}
  fs.writeFileSync(path.join(evidence,`advisors-${stage}.json`),JSON.stringify(report,null,2)+'\n')
  advisors.push({stage,status:result.status,report:path.relative(root,path.join(evidence,`advisors-${stage}.json`)).replaceAll('\\','/')})
  if(result.error || result.status!==0) throw new Error('LOCAL_ADVISORS_FAILED_SEE_REPORT')
}
const baselineState = () => sync(template, `select json_build_object(
 'products',(select count(*) from public.products),'listings',(select count(*) from public.channel_listings),
 'orders',(select count(*) from public.order_requests),'lots',(select count(*) from public.product_batches),
 'balances',(select count(*) from public.inventory_balances),'reservations',(select count(*) from public.inventory_reservations),
 'functions',md5((select string_agg(pg_get_functiondef(oid)||coalesce(proacl::text,''),'|' order by oid)
 from pg_proc where pronamespace in ('public'::regnamespace,'k2_private'::regnamespace))))::text;`)
const sessions = new Set()
const pending = new Set()
const completed = new Map()
function session(name, sql) {
  const child = spawn(path.join(bin, 'psql.exe'), [...args(database), '-c',
    `set application_name=${literal(name)}; set statement_timeout='15s'; set deadlock_timeout='100ms'; ${staff} ${sql}`],
  { cwd: root, windowsHide: true, env, stdio: ['ignore', 'pipe', 'pipe'] })
  sessions.add(child)
  let stdout = ''; let stderr = ''
  child.stdout.on('data', chunk => { stdout += chunk })
  child.stderr.on('data', chunk => { stderr += chunk })
  const result = new Promise(resolve => {
    child.on('error', error => { resolve({ status: -1, stdout, stderr: error.message }) })
    child.on('close', status => { sessions.delete(child); completed.set(name,{status,stdout,stderr}); resolve({ status, stdout, stderr }) })
  })
  result.peek=()=>({stdout,stderr})
  pending.add(result)
  result.finally(() => pending.delete(result))
  return result
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function waitFor(sql, label) {
  const deadline = Date.now() + 7000
  while (Date.now() < deadline) {
    if (value(sql) === 't') return
    await sleep(40)
    for (const [name,result] of completed) {
      if (result.status !== 0) throw new Error(`SESSION_FAILED_BEFORE_BARRIER: ${name}: ${result.stderr}`)
    }
  }
  throw new Error(`BARRIER_NOT_OBSERVED: ${label}`)
}
const blockedBy = (waiter, blocker) => `select exists(select 1 from pg_stat_activity a
 where a.application_name=${literal(waiter)} and exists(select 1 from pg_stat_activity b
 where b.application_name=${literal(blocker)} and b.pid=any(pg_blocking_pids(a.pid))));`
const waitsForOrderKey = (waiter, blocker, key) => `select exists(
 select 1 from pg_stat_activity a join pg_locks w on w.pid=a.pid
 join pg_stat_activity b on b.application_name=${literal(blocker)}
 join pg_locks h on h.pid=b.pid and h.locktype=w.locktype and h.classid=w.classid
  and h.objid=w.objid and h.objsubid=w.objsubid
 where a.application_name=${literal(waiter)} and w.locktype='advisory' and not w.granted and h.granted
 and w.objsubid=1 and w.classid::bigint=((hashtextextended('k2.website-order:'||${literal(key)},0)>>32)&4294967295::bigint)
 and w.objid::bigint=(hashtextextended('k2.website-order:'||${literal(key)},0)&4294967295::bigint)
 and b.pid=any(pg_blocking_pids(a.pid)));`
async function controller(extraLock = '', injectSetupFailure = false) {
  const name = `k2_stock_gate_${randomUUID()}`
  const child = spawn(path.join(bin, 'psql.exe'), args(database),
    { cwd: root, windowsHide: true, env, stdio: ['pipe', 'pipe', 'pipe'] })
  sessions.add(child)
  let output = ''; let errors = ''
  child.stdin.on('error',error => { errors += error.message })
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { errors += chunk })
  const finished = new Promise(resolve => {
    child.on('error',error => { errors += error.message })
    child.on('close', status => { sessions.delete(child); resolve({ status, output, errors }) })
  })
  pending.add(finished)
  finished.finally(() => pending.delete(finished))
  try {
    child.stdin.write(`\\set ON_ERROR_STOP on\nset application_name=${literal(name)}; begin;
      select pg_advisory_xact_lock(61001,5); ${extraLock}\n\\echo GATE_HELD\n`)
    await waitFor(`select exists(select 1 from pg_stat_activity where application_name=${literal(name)}
     and state='idle in transaction');`, 'controller owns gate')
    const echoDeadline = Date.now() + 1000
    while (!output.includes('GATE_HELD') && Date.now() < echoDeadline) await sleep(10)
    if (!output.includes('GATE_HELD')) throw new Error(`CONTROLLER_NOT_READY: ${errors}`)
    if(injectSetupFailure)throw new Error('INJECTED_CONTROLLER_SETUP_FAILURE')
  }catch(error) {
    // Controlled red mode preserves the original setup leak only in this local witness.
    if(beforeControllerCleanup)throw error
    if(child.exitCode===null&&!child.stdin.destroyed) {
      sync(database,`select pg_cancel_backend(pid) from pg_stat_activity where datname=current_database()
        and application_name=${literal(name)};`)
      child.stdin.end('rollback;\n\\q\n')
    }
    await finished
    throw error
  }
  return { name, release: async () => {
    child.stdin.end('commit;\n\\q\n')
    const r = await finished
    if (r.status !== 0) throw new Error(`GATE_RELEASE_FAILED: ${r.errors}`)
  } }
}
const checks = []
const fixtureSkus = new Set()
function check(name, condition, detail = '') {
  if (!condition) {
    if (couponLifecycle) checks.push({ name, passed: false, detail })
    throw new Error(`ASSERTION_FAILED: ${name} ${detail}`)
  }
  checks.push({ name, passed: true, detail })
  console.log(`[pass] ${name}${detail ? ` — ${detail}` : ''}`)
}
function fixture(suffix, quantity = 2) {
  const sku = `LOCAL-STOCK-${suffix}`; const lot = randomUUID()
  const oldOrder = randomUUID(); const newOrder = randomUUID()
  sync(database, `begin; insert into public.products(sku,name,status,srp,primary_image_url,is_human_reviewed,published)
   values(${literal(sku)},'Isolated stock fixture','Live',100,'https://example.test/fixture.jpg',true,true);
   insert into public.product_batches(id,sku,box_code,batch_code,quantity,quantity_available,reserved_quantity,
    inventory_status,expiry_date,best_before_date) values('${lot}',${literal(sku)},'LOCAL','LOCAL',${quantity},${quantity},0,
    'available',current_date+180,current_date+180);
   insert into public.inventory_balances(sku,location_code,on_hand,reserved) values(${literal(sku)},'MANILA_MAIN',${quantity},0);
   select set_config('k2.allow_stock_write','on',true);
   update public.products set stock_available=${quantity} where sku=${literal(sku)};
   insert into public.channel_listings(sku,channel_source,status,publication_status,validation_errors)
    values(${literal(sku)},'website','Active','ready','[]');
   insert into public.order_requests(id,idempotency_key,customer_name,customer_email,channel_source,fulfillment_method)
    values('${oldOrder}','${oldOrder}','Local old','old@example.test','website','Pickup'),
     ('${newOrder}','${newOrder}','Local new','new@example.test','website','Pickup');
   insert into public.order_request_items(order_request_id,sku,product_name,quantity,unit_price,line_total)
    values('${oldOrder}',${literal(sku)},'Fixture',1,100,100),('${newOrder}',${literal(sku)},'Fixture',1,100,100); commit;`)
  fixtureSkus.add(sku)
  return { sku, lot, oldOrder, newOrder, items: JSON.stringify([{ sku, quantity: 1 }]) }
}
const websiteReserve = f => `select k2_private.require_website_order_items(${literal(f.items)}::jsonb);
 select public.reserve_order_request_lots_v1('${f.newOrder}','Local Website lock witness');`
const invariant = f => value(`select concat_ws('|',
 (select on_hand||'/'||reserved from public.inventory_balances where sku=${literal(f.sku)}),
 (select quantity||'/'||reserved_quantity from public.product_batches where id='${f.lot}'),
 (select stock_available from public.products where sku=${literal(f.sku)}),
 (select coalesce(sum(quantity),0) from public.inventory_reservations where sku=${literal(f.sku)} and status='active'));`)
const reserveOld = f => sync(database, `${staff} select public.reserve_order_request_lots_v1('${f.oldOrder}','Local prior hold');`)
const guestPayload = (f,extra={}) => ({ customerName:'Local signed hold',email:`hold-${randomUUID()}@example.test`,
  phone:'',address:'Local test address',fulfillmentMethod:'Pickup',note:'',
  items:[{sku:f.sku,quantity:1}],idempotencyKey:randomUUID(),couponCode:'',...extra })
function guestCall(payload,ip='192.0.2.10') {
  const a=signedRpcArguments({headers:{},socket:{remoteAddress:ip}},'order',payload)
  return `public.submit_guest_order_v1(${['p_timestamp','p_nonce','p_payload_text','p_ip_hash','p_signature']
    .map(key=>literal(a[key])).join(',')},null)`
}
const canonicalCall = p => `public.submit_order_request_v2(${[
 p.customerName,p.email,null,p.address,p.fulfillmentMethod,p.note,JSON.stringify(p.items),p.idempotencyKey,p.couponCode,
].map((x,i)=>x===null?'null':`${literal(x)}${i===6?'::jsonb':''}`).join(',')},95::numeric,'customer_confirmed')`
const records = () => value(`select jsonb_build_object(
 'orders',(select count(*) from public.order_requests),'items',(select count(*) from public.order_request_items),
 'customers',(select count(*) from public.customers),'grants',(select count(*) from public.guest_access_grants),
 'contacts',(select count(*) from public.customer_contact_points),'identities',(select count(*) from public.channel_identities),
 'scopes',(select count(*) from public.guest_access_grant_scopes),'conversations',(select count(*) from public.conversations),
 'messages',(select count(*) from public.messages),'allocations',(select count(*) from public.inventory_reservations),
 'order_events',(select count(*) from public.order_request_events),'conversation_events',(select count(*) from public.conversation_events),
 'inventory_events',(select count(*) from public.inventory_events))::text;`)
const controls = () => value(`select jsonb_build_object('nonces',(select count(*) from k2_private.guest_request_nonces),
 'rate_rows',(select count(*) from k2_private.guest_rate_buckets),'rate_hits',(select coalesce(sum(hit_count),0) from k2_private.guest_rate_buckets))::text;`)

async function rehearseCouponLifecycle() {
  const confirmationMetadata = () => value(`select jsonb_build_object('owner',proowner,'acl',proacl,
    'config',proconfig,'definer',prosecdef,'returns',prorettype,'defaults',proargdefaults::text)::text
    from pg_proc where oid='public.confirm_order_request(uuid,text)'::regprocedure;`)
  const metadataBefore = confirmationMetadata()
  let commitmentMigration
  const eventConstraint = value(`select pg_get_constraintdef(oid) from pg_constraint
    where conrelid='public.inventory_events'::regclass and conname='inventory_events_event_type_check';`)
  if (!beforeCommitment) {
    const migration = source('supabase/migrations/20260912_confirmation_stock_commitment.sql')
    commitmentMigration = migration
    sync(database, migration)
    sync(database, migration)
    check('whole confirmation commitment migration installs and replays with metadata preserved',
      confirmationMetadata() === metadataBefore)
    if (beforeEventType) sync(database, `alter table public.inventory_events drop constraint inventory_events_event_type_check;
      alter table public.inventory_events add constraint inventory_events_event_type_check ${eventConstraint};`)
    else {
      const reviewed = value(`select pg_get_constraintdef(oid) from pg_constraint
        where conrelid='public.inventory_events'::regclass and conname='inventory_events_event_type_check';`)
      let literalDriftRefused = false
      try { sync(database, `begin; alter table public.inventory_events drop constraint inventory_events_event_type_check;
        alter table public.inventory_events add constraint inventory_events_event_type_check
          ${reviewed.replace("'stock_committed'", "'stock_committed '")};
        ${withoutTransaction(migration)} rollback;`) }
      catch (error) { literalDriftRefused = /MAP-023 stock commitment: unfamiliar inventory event constraint/.test(error.message) }
      check('quoted event-name whitespace drift refuses rather than normalizing away', literalDriftRefused)

      // Queue owner DDL ahead of installation behind an existing writer lock.
      // Inspection must occur only after the owner replacement is committed.
      const ddlGate = await controller('lock table public.inventory_events in row exclusive mode;')
      const replacement = session('k2_event_constraint_owner', `begin;
        alter table public.inventory_events drop constraint inventory_events_event_type_check;
        alter table public.inventory_events add constraint inventory_events_event_type_check check(event_type<>'LOCAL_FORBIDDEN'); commit;`)
      await waitFor(blockedBy('k2_event_constraint_owner', ddlGate.name), 'owner DDL waits behind current writer')
      const installation = session('k2_event_constraint_install', `begin; ${withoutTransaction(migration)} commit;`)
      await waitFor(blockedBy('k2_event_constraint_install', 'k2_event_constraint_owner'), 'installation queues behind owner DDL')
      await ddlGate.release()
      const ddlResults = await Promise.all([replacement, installation])
      completed.delete('k2_event_constraint_owner'); completed.delete('k2_event_constraint_install')
      const changed = value(`select pg_get_constraintdef(oid) from pg_constraint
        where conrelid='public.inventory_events'::regclass and conname='inventory_events_event_type_check';`)
      check('queued installation refuses the newly committed unfamiliar constraint without overwriting it',
        ddlResults[0].status === 0 && ddlResults[1].status !== 0
        && /MAP-023 stock commitment: unfamiliar inventory event constraint/.test(ddlResults[1].stderr)
        && changed.includes('LOCAL_FORBIDDEN') && confirmationMetadata() === metadataBefore)
      sync(database, `alter table public.inventory_events drop constraint inventory_events_event_type_check;
        alter table public.inventory_events add constraint inventory_events_event_type_check ${reviewed};`)
    }
  }
  const coupon = (suffix, columns = '', values = '') => {
    const code = `LOCAL-${suffix}`
    const id = randomUUID()
    sync(database, `insert into public.coupons(id,code,discount_type,discount_value,is_active${columns})
      values('${id}',${literal(code)},'fixed',10,true${values});`)
    return { id, code }
  }
  // Independent fixture buyers use documentation-range IPs so accumulated
  // successful cases do not accidentally test the existing IP rate limit.
  let requestIp = 100
  const request = payload => guestCall(payload, `192.0.2.${requestIp++}`)
  const submit = (f, c, extra = {}) => {
    const payload = guestPayload(f, { couponCode: c.code, shippingAmount: 95,
      shippingQuoteStatus: 'customer_confirmed', ...extra })
    const result = JSON.parse(value(`set role anon; select json_build_object('ok',ok,'code',error_code)::text from ${request(payload)};`))
    check(`signed coupon submission accepts ${c.code}`, result.ok === true, result.code ?? '')
    return { payload, id: value(`select id from public.order_requests where idempotency_key=${literal(payload.idempotencyKey)};`) }
  }
  const confirm = id => sync(database, `${staff} select public.confirm_order_request('${id}','Local coupon lifecycle');`)
  const snapshot = id => value(`select jsonb_build_object('order',to_jsonb(o),
    'allocations',(select jsonb_agg(to_jsonb(r) order by r.id) from public.inventory_reservations r where r.order_request_id=o.id),
    'legacy_orders',(select count(*) from public.orders where order_request_id=o.id),
    'redemptions',(select jsonb_agg(to_jsonb(c) order by c.id) from public.coupon_redemptions c where c.order_request_id=o.id),
    'coupon_count',(select redemption_count from public.coupons where id=o.coupon_id),
    'events',(select count(*) from public.inventory_events where reference_id=o.id),
    'order_events',(select count(*) from public.order_request_events where order_request_id=o.id))::text
    from public.order_requests o where o.id='${id}';`)
  const f = fixture('coupon-fixed', 2); const c = coupon('FIXED')
  const order = submit(f, c)
  check('current writer snapshots fixed discount and existing shipping without early redemption', value(`select
    subtotal=100 and discount_amount=10 and shipping_amount=95 and total_amount=185
    and coupon_id='${c.id}' and coupon_code=${literal(c.code)}
    and (select redemption_count from public.coupons where id='${c.id}')=0
    and not exists(select 1 from public.coupon_redemptions where order_request_id=o.id)
    from public.order_requests o where id='${order.id}';`) === 't' && invariant(f) === '2/1|2/1|1|1')
  const beforeRetry = snapshot(order.id); const beforeRecords = records()
  check('signed coupon replay returns the accepted snapshot without another hold',
    value(`set role anon; select ok from ${request(order.payload)};`) === 't'
    && snapshot(order.id) === beforeRetry && records() === beforeRecords)
  const beforeConfirmation = snapshot(order.id)
  const confirmation = await session('k2_coupon_first_confirmation', `select public.confirm_order_request('${order.id}','Local coupon confirmation');`)
  completed.delete('k2_coupon_first_confirmation')
  if (confirmation.status !== 0) check('refused constrained confirmation leaves the whole accepted order untouched',
    snapshot(order.id) === beforeConfirmation)
  check('current coupon confirmation commits without a constrained event refusal', confirmation.status === 0,
    confirmation.status === 0 ? '' : confirmation.stderr)
  check('confirmation redeems and commits the exact hold once while preserving physical custody', value(`select
    status='confirmed' and total_amount=185 and shipping_amount=95
    and (select redemption_count from public.coupons where id='${c.id}')=1
    and (select count(*) from public.coupon_redemptions where order_request_id=o.id and status='reserved')=1
    and (select count(*) from public.inventory_reservations r where r.order_request_id=o.id
      and to_jsonb(r)->>'committed_at' is not null and to_jsonb(r)->>'commit_cause'='confirmation'
      and to_jsonb(r)->>'committed_by'='${actor}')=1
    and (select count(*) from public.inventory_events where reference_id=o.id and event_type='stock_committed')=1
    from public.order_requests o where id='${order.id}';`) === 't' && invariant(f) === '2/1|2/1|1|1')
  const confirmed = snapshot(order.id)
  confirm(order.id)
  check('confirmation replay preserves coupon, commitment attribution and events exactly', snapshot(order.id) === confirmed)
  if (!beforeCommitment) {
    for (const role of ['anon', 'authenticated']) {
      const name = `k2_commit_denial_${role}`
      const result = await session(name, `set role ${role}; select public.commit_order_request_stock_v1('${order.id}','confirmation','Local denial');`)
      completed.delete(name)
      check(`commitment helper denies direct ${role} execution`, result.status !== 0
        && /permission denied for function commit_order_request_stock_v1/.test(result.stderr))
    }
  }
  sync(database, `update public.inventory_reservations set expires_at=now()-interval '1 minute' where order_request_id='${order.id}';
    update public.order_requests set status='submitted',payment_status='not_requested' where id='${order.id}';`)
  sync(database, `${staff} select * from public.release_expired_reservations_v1(500);`)
  check('committed allocation survives the temporary sweep even with a submitted shell', invariant(f) === '2/1|2/1|1|1')
  sync(database, `${staff} select public.cancel_order_request('${order.id}','Local committed cancellation');`)
  check('cancellation releases commitment and coupon once while retaining attribution', value(`select
    (select status='cancelled' from public.order_requests where id='${order.id}')
    and (select redemption_count=0 from public.coupons where id='${c.id}')
    and (select count(*)=1 from public.coupon_redemptions where order_request_id='${order.id}' and status='released')
    and count(*)=1 and bool_and(status='released' and release_cause='cancelled' and committed_at is not null)
    from public.inventory_reservations where order_request_id='${order.id}';`) === 't' && invariant(f) === '2/0|2/0|2|0')
  const cancelled = snapshot(order.id)
  sync(database, `${staff} select public.cancel_order_request('${order.id}','Local cancellation replay');`)
  check('cancellation replay retains all history without another coupon release', snapshot(order.id) === cancelled)

  const eventCheck = () => value(`select pg_get_constraintdef(oid) from pg_constraint
    where conrelid='public.inventory_events'::regclass and conname='inventory_events_event_type_check';`)
  const reviewedEventCheck = eventCheck()
  check('extended vocabulary preserves all eight existing inventory event types', value(`with accepted as (
    insert into public.inventory_events(sku,location_code,event_type,quantity,reference_type,reference_id)
      select ${literal(f.sku)},'MANILA_MAIN',event_type,1,'local_fixture','${randomUUID()}'::uuid
      from unnest(array['received','reserved','reservation_released','fulfilled','damaged','expired','reconciled','transferred']) event_type
      returning id) select count(*)=8 from accepted;`) === 't')
  for (const [name, constraint] of [
    ['unfamiliar', "check(event_type<>'LOCAL_FORBIDDEN')"],
    ['unvalidated', `${reviewedEventCheck} not valid`]
  ]) {
    let refused = false
    try { sync(database, `begin; alter table public.inventory_events drop constraint inventory_events_event_type_check;
      alter table public.inventory_events add constraint inventory_events_event_type_check ${constraint};
      ${withoutTransaction(commitmentMigration)} rollback;`) }
    catch (error) { refused = /MAP-023 stock commitment: unfamiliar inventory event constraint/.test(error.message) }
    check(`${name} event constraint refuses whole migration and rolls back`, refused
      && eventCheck() === reviewedEventCheck && snapshot(order.id) === cancelled)
  }
  const invalidEvent = await session('k2_unknown_inventory_event', `insert into public.inventory_events
    (sku,location_code,event_type,quantity,reference_type,reference_id)
    values(${literal(f.sku)},'MANILA_MAIN','LOCAL_UNREVIEWED',1,'order_request','${order.id}');`)
  completed.delete('k2_unknown_inventory_event')
  check('extended event vocabulary still refuses unknown events without side effects', invalidEvent.status !== 0
    && /inventory_events_event_type_check/.test(invalidEvent.stderr) && snapshot(order.id) === cancelled)

  for (const [suffix, type, amount, discount, total] of [
    ['PERCENT', 'percentage', 33.33, 33.33, 161.67], ['CAPPED', 'fixed', 200, 100, 95]
  ]) {
    const discountCoupon = coupon(suffix)
    sync(database, `update public.coupons set discount_type=${literal(type)},discount_value=${amount} where id='${discountCoupon.id}';`)
    const discountOrder = submit(fixture(`coupon-${suffix}`), discountCoupon)
    check(`${type} coupon uses canonical subtotal and preserves shipping`, value(`select subtotal=100
      and discount_amount=${discount} and shipping_amount=95 and total_amount=${total}
      from public.order_requests where id='${discountOrder.id}';`) === 't')
  }

  for (const [suffix, columns, values, error] of [
    ['MISSING', null, null, /Coupon is invalid/],
    ['INACTIVE', '', '', /Coupon is invalid/],
    ['ARCHIVED', ',archived_at', ',now()', /Coupon is invalid/],
    ['FUTURE', ',starts_at', ",now()+interval '1 day'", /Coupon is invalid/],
    ['EXPIRED', ',starts_at,ends_at', ",now()-interval '2 days',now()-interval '1 day'", /Coupon is invalid/],
    ['EXHAUSTED', ',max_redemptions,redemption_count', ',1,1', /Coupon is invalid/],
    ['MINIMUM', ',min_spend', ',101', /Coupon minimum spend/]
  ]) {
    const rejectedCoupon = columns === null ? { code: 'LOCAL-MISSING' } : coupon(suffix, columns, values)
    if (suffix === 'INACTIVE') sync(database, `update public.coupons set is_active=false where id='${rejectedCoupon.id}';`)
    const rejectedFixture = fixture(`coupon-${suffix}`)
    const businessBefore = records(); const controlBefore = controls()
    const name = `k2_coupon_${suffix}`
    const result = await session(name, `set role anon; select * from ${request(guestPayload(rejectedFixture,
      { couponCode: rejectedCoupon.code }))};`)
    completed.delete(name)
    check(`${suffix.toLowerCase()} coupon refusal rolls back business, holds and request controls`, result.status !== 0
      && error.test(result.stderr) && records() === businessBefore && controls() === controlBefore
      && invariant(rejectedFixture) === '2/0|2/0|2|0', result.status === 0 ? 'unexpected acceptance' : '')
  }

  const raceCoupon = coupon('LIMIT', ',max_redemptions', ',1')
  const raceOne = submit(fixture('coupon-limit-one'), raceCoupon)
  const raceTwo = submit(fixture('coupon-limit-two'), raceCoupon)
  const gate = await controller()
  const winner = session('k2_coupon_limit_one', `begin; select public.confirm_order_request('${raceOne.id}','Local limit winner');
    select pg_advisory_xact_lock(61001,5); commit;`)
  await waitFor(blockedBy('k2_coupon_limit_one', gate.name), 'coupon winner holds redemption')
  const loserBefore = snapshot(raceTwo.id)
  const loser = session('k2_coupon_limit_two', `select public.confirm_order_request('${raceTwo.id}','Local limit loser');`)
  await waitFor(blockedBy('k2_coupon_limit_two', 'k2_coupon_limit_one'), 'second confirmation waits for coupon')
  await gate.release()
  const results = await Promise.all([winner, loser])
  completed.delete('k2_coupon_limit_one'); completed.delete('k2_coupon_limit_two')
  // The coupon counter belongs to both orders; compare the losing order separately.
  const stripCouponCount = text => { const result = JSON.parse(text); delete result.coupon_count; return JSON.stringify(result) }
  check('concurrent confirmations redeem the final coupon once and roll back the loser', results[0].status === 0
    && results[1].status !== 0 && /coupon is no longer available/.test(results[1].stderr)
    && stripCouponCount(snapshot(raceTwo.id)) === stripCouponCount(loserBefore)
    && value(`select redemption_count=1 and (select count(*) from public.coupon_redemptions where coupon_id='${raceCoupon.id}')=1
      from public.coupons where id='${raceCoupon.id}';`) === 't')

  const atomic = fixture('coupon-atomic', 1)
  sync(database, `insert into public.product_batches(sku,box_code,batch_code,quantity,quantity_available,reserved_quantity,
    inventory_status,expiry_date,best_before_date) values(${literal(atomic.sku)},'LOCAL','LOCAL-LATE',1,1,0,'available',current_date+190,current_date+190);
    update public.inventory_balances set on_hand=2 where sku=${literal(atomic.sku)};
    select set_config('k2.allow_stock_write','on',false); update public.products set stock_available=2 where sku=${literal(atomic.sku)};`)
  const atomicCoupon = coupon('ATOMIC')
  const atomicOrder = submit(atomic, atomicCoupon, { items: [{ sku: atomic.sku, quantity: 2 }] })
  sync(database, `create function k2_stock_fixture.commitment_fault() returns trigger language plpgsql as $$ begin
    if new.reference_id='${atomicOrder.id}'::uuid and new.event_type='stock_committed'
      and exists(select 1 from public.inventory_events where reference_id=new.reference_id and event_type='stock_committed')
    then raise exception 'LOCAL_SECOND_COMMITMENT_FAILURE'; end if; return new; end $$;
    create trigger local_commitment_fault before insert on public.inventory_events
      for each row execute function k2_stock_fixture.commitment_fault();`)
  const atomicBefore = snapshot(atomicOrder.id)
  const failed = await session('k2_coupon_atomic', `select public.confirm_order_request('${atomicOrder.id}','Local atomic failure');`)
  completed.delete('k2_coupon_atomic')
  check('second-lot commitment fault rolls back confirmation, coupon, legacy rows and events', failed.status !== 0
    && /LOCAL_SECOND_COMMITMENT_FAILURE/.test(failed.stderr) && snapshot(atomicOrder.id) === atomicBefore)
  sync(database, 'drop trigger local_commitment_fault on public.inventory_events;')
  confirm(atomicOrder.id); const atomicAccepted = snapshot(atomicOrder.id); confirm(atomicOrder.id)
  check('same-order recovery commits both lots and redeems once without changing the accepted charge',
    snapshot(atomicOrder.id) === atomicAccepted && value(`select status='confirmed' and shipping_amount=95 and total_amount=285
      and (select redemption_count from public.coupons where id='${atomicCoupon.id}')=1
      and (select count(*) from public.inventory_reservations where order_request_id=o.id and committed_at is not null)=2
      and (select count(*) from public.inventory_events where reference_id=o.id and event_type='stock_committed')=2
      from public.order_requests o where id='${atomicOrder.id}';`) === 't')
}

let created = false; let templateBefore; let runError; let keyLockRegression; let preservedVerifierSha256; let verifierAclTransition; let paymentDiagnosticSha256
try {
  sync(template, targetGuard(template))
  templateBefore = baselineState()
  if (sync(template, `select exists(select 1 from pg_database where datname=${literal(database)});`) !== 'f') {
    throw new Error('DISPOSABLE_CLONE_ALREADY_EXISTS_REQUIRES_REVIEW')
  }
  const r = spawnSync(path.join(bin, 'createdb.exe'), ['-T', template, database],
    { cwd: root, windowsHide: true, env, encoding: 'utf8', timeout: 30000 })
  if (r.error || r.status !== 0) throw new Error(String(r.stderr || r.error?.message))
  created = true
  sync(database, `${targetGuard(database)} create schema k2_stock_fixture;
    create table k2_stock_fixture.owner(marker uuid not null); insert into k2_stock_fixture.owner values('${marker}');`)
  const prior = JSON.parse(fs.readFileSync(path.join(root,
    'docs/evidence/20260930-guest-continuity-rehearsal/local-dependencies-receipt.json'), 'utf8'))
  const guestSources = ['supabase/migrations/20260829_channel_vocabulary_and_shops.sql',
    'supabase/migrations/20260822_admin_channel_readiness_boundary.sql',
    ...prior.dependencyManifest.map(item => item.path), 'supabase/migrations/20261001065252_admin_signing_null_inputs.sql']
  if (guestSources.length !== 21 || new Set(guestSources).size !== 21
      || guestSources.some(file=>!/^supabase\/[a-zA-Z0-9_/-]+\.sql$/.test(file))) throw new Error('GUEST_SOURCE_ORDER_INVALID')
  if (paymentLifecycle) {
    // Install the whole historical wrapper foundation without downgrading the
    // actual restored shared verifier. Later guest/channel patches follow it.
    const verifierSignature='k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'
    const verifierDefinition=sync(database,`select replace(pg_get_functiondef('${verifierSignature}'::regprocedure),chr(13),'');`)
    const verifierMetadata=()=>value(`select jsonb_build_object('owner',proowner,
      'config',proconfig,'definer',prosecdef,'returns',prorettype,'defaults',proargdefaults::text)::text
      from pg_proc where oid='${verifierSignature}'::regprocedure;`)
    const verifierBefore=verifierMetadata()
    const verifierAcl=()=>value(`select coalesce(proacl::text,'DEFAULT') from pg_proc
      where oid='${verifierSignature}'::regprocedure;`)
    const aclBefore=verifierAcl()
    preservedVerifierSha256=createHash('sha256').update(verifierDefinition).digest('hex')
    sync(database,`begin; ${withoutTransaction(source('supabase/migrations/20260812_admin_fulfillment_bff_boundary.sql'))}
      ${verifierDefinition}; commit;`)
    check('historical fulfillment foundation retains the captured current verifier body and non-ACL metadata',
      sync(database,`select replace(pg_get_functiondef('${verifierSignature}'::regprocedure),chr(13),'');`)===verifierDefinition
      && verifierMetadata()===verifierBefore,verifierMetadata()===verifierBefore?'':'security metadata differs')
    verifierAclTransition={before:aclBefore,after:verifierAcl()}
    check('foundation intentionally tightens verifier execute to its owner without restoring default grants',value(`select
      proacl is not null and not exists(select 1 from aclexplode(proacl) a where a.grantee<>p.proowner)
      and has_function_privilege(p.proowner,p.oid,'EXECUTE')
      and not has_function_privilege('anon',p.oid,'EXECUTE')
      and not has_function_privilege('authenticated',p.oid,'EXECUTE')
      from pg_proc p where oid='${verifierSignature}'::regprocedure;`)==='t')
  }
  sync(database, `begin; ${guestSources.map(file => withoutTransaction(source(file))).join('\n')} commit;`)
  const stock = [source('supabase/migrations/20260902_reservation_expiry_policy.sql'),
    source('supabase/migrations/20260902_purchase_time_reservation.sql',signedHolds ? null : 'public.reserve_order_request_lots_v1'),
    source('supabase/migrations/20260906_reservation_coverage_guard.sql'),
    source('supabase/migrations/20260908_purchase_hold_lock_order.sql'),
    source('supabase/migrations/20260905_purchase_hold_cancellation.sql'),
    source('supabase/migrations/20260906_atomic_order_hold_expiry.sql'),
    source('supabase/migrations/20260809_operations_hardening.sql','public.reconcile_product_batches'),
    source('supabase/migrations/20260908_reconciliation_lock_order.sql')]
  const canonicalMetadataSql=`select jsonb_build_object('owner',p.proowner,'acl',p.proacl,'config',p.proconfig,
    'definer',p.prosecdef,'returns',p.prorettype,'defaults',p.proargdefaults::text)::text from pg_proc p
    where p.oid='public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text)'::regprocedure;`
  const canonicalBefore=value(canonicalMetadataSql)
  sync(database, `begin; ${stock.map(withoutTransaction).join('\n')} commit;
   insert into auth.users(id) values('${actor}');
   insert into public.user_profiles(id,role) values('${actor}','Admin') on conflict(id) do update set role=excluded.role;
   insert into k2_private.admin_bff_secrets(singleton,request_secret) values(true,decode('${adminSecret.toString('hex')}','hex'))
    on conflict(singleton) do update set request_secret=excluded.request_secret;
   insert into k2_private.guest_bff_secrets(singleton,request_secret,contact_secret)
    values(true,decode('${guestSecret.toString('hex')}','hex'),extensions.gen_random_bytes(32))
    on conflict(singleton) do update set request_secret=excluded.request_secret,contact_secret=excluded.contact_secret;
   create function k2_stock_fixture.balance_barrier() returns trigger language plpgsql as $$ begin
    if current_setting('k2.fixture.balance_barrier',true)='on' then perform pg_advisory_xact_lock(61001,5); end if;
    return new; end $$;
   create trigger local_balance_barrier before update on public.inventory_balances
    for each row execute function k2_stock_fixture.balance_barrier();`)
  if(signedHolds) {
    check('current writer owner/ACL/settings/defaults preserved by full installation',value(canonicalMetadataSql)===canonicalBefore)
    for(const role of ['anon','authenticated']) {
      const denied=await session(`k2_hold_direct_${role}`,`set role ${role}; select public.reserve_order_request_lots_v1(gen_random_uuid(),'Local direct denial');`)
      completed.delete(`k2_hold_direct_${role}`)
      check(`internal hold helper denies direct ${role} execution`,denied.status!==0 && /permission denied for function reserve_order_request_lots_v1/.test(denied.stderr))
    }
    const installed=value(`select md5(pg_get_functiondef('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text)'::regprocedure));`)
    sync(database,`begin; ${stock.slice(0,6).map(withoutTransaction).join('\n')} commit;`)
    check('full hold/coverage/cancel/expiry preparation replays without replacing current behavior',
      value(canonicalMetadataSql)===canonicalBefore && value(`select md5(pg_get_functiondef('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text)'::regprocedure));`)===installed)
    const badConfigurations=[
      `drop function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text);`,
      `alter function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text) set search_path='public,pg_temp';`,
      `create function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text)
        returns public.order_requests language sql as 'select null::public.order_requests';`,
      `create or replace function public.submit_order_request_v2(p_customer_name text,p_customer_email text,p_customer_phone text,
       p_delivery_address text,p_fulfillment_method text,p_customer_note text,p_items jsonb,p_idempotency_key text,
       p_coupon_code text default null::text,p_shipping_amount numeric default 0,p_shipping_quote_status text default null::text)
       returns public.order_requests language plpgsql security definer set search_path=public as $$ begin return null; end $$;`
    ]
    for(let i=0;i<badConfigurations.length;i+=1) {
      let refused=false
      try { sync(database,`begin; ${badConfigurations[i]} ${withoutTransaction(stock[1])} rollback;`) }
      catch(error) { refused=/MAP-023/.test(error.message) }
      check(`hold preparation refuses invalid target variant ${i+1} and rolls back`,refused
        && value(canonicalMetadataSql)===canonicalBefore
        && value(`select md5(pg_get_functiondef('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text)'::regprocedure));`)===installed)
    }
  }

  for (const kind of ['cancel','expiry','recount']) {
    const f = fixture(kind); reserveOld(f)
    if (kind === 'expiry') sync(database, `update public.inventory_reservations set expires_at=now()-interval '1 minute' where order_request_id='${f.oldOrder}';`)
    const gate = await controller(kind === 'recount'
      ? `select 1 from public.product_batches where id='${f.lot}' for update;` : '')
    const writerName = `k2_stock_${kind}`; const websiteName = `k2_stock_website_${kind}`
    const writerSql = kind === 'recount' ? `select public.reconcile_product_batches(${literal(f.sku)},
      jsonb_build_array(jsonb_build_object('id','${f.lot}','quantity',2,'box_code','LOCAL',
        'expiry_date',(current_date+180)::text,'inventory_status','available')),'Local counted fixture');`
      : kind === 'cancel' ? `select (public.cancel_order_request('${f.oldOrder}','Local cancellation')).status;`
        : 'select * from public.release_expired_reservations_v1(500);'
    const writer = session(writerName, `begin; set local k2.fixture.balance_barrier='${kind === 'recount' ? 'off' : 'on'}'; ${writerSql} commit;`)
    await waitFor(blockedBy(writerName,gate.name), `${kind} owns balance before product`)
    const website = session(websiteName, `begin; ${websiteReserve(f)} commit;`)
    await waitFor(blockedBy(websiteName,writerName), 'Website waits for writer')
    await gate.release()
    const [w,b] = await Promise.all([writer,website])
    completed.delete(writerName); completed.delete(websiteName)
    if (beforeFix) {
      check('before-fix real cancellation/Website cycle raises deadlock',
        [w,b].some(item => item.status !== 0 && /deadlock detected/.test(item.stderr)))
      break
    }
    check(`Website and ${kind} serialize without deadlock`, w.status === 0 && b.status === 0, `${w.stderr}${b.stderr}`.trim())
    check(`${kind} preserves exact stock counters`, invariant(f) === (kind === 'recount' ? '2/2|2/2|0|2' : '2/1|2/1|1|1'), invariant(f))
    if (kind !== 'recount') check(`${kind} retains attributed old release`,
      value(`select count(*)=1 from public.inventory_reservations where order_request_id='${f.oldOrder}'
       and status='released' and release_cause=${literal(kind === 'cancel' ? 'cancelled' : 'expired')};`) === 't')
  }
  if (!beforeFix) {
    const f = fixture('last-unit',1); const gate = await controller()
    const winner = session('k2_stock_winner', `begin; ${websiteReserve(f)} select pg_advisory_xact_lock(61001,5); commit;`)
    await waitFor(blockedBy('k2_stock_winner',gate.name),'winner holds unit')
    const loser = session('k2_stock_loser', `begin; select k2_private.require_website_order_items(${literal(f.items)}::jsonb);
      select public.reserve_order_request_lots_v1('${f.oldOrder}','Local competing hold'); commit;`)
    await waitFor(blockedBy('k2_stock_loser','k2_stock_winner'),'loser waits for unit')
    await gate.release()
    const [w,l] = await Promise.all([winner,loser])
    completed.delete('k2_stock_winner'); completed.delete('k2_stock_loser')
    check('last-unit winner commits and loser is refused',w.status===0 && l.status!==0 && /Insufficient sellable lot stock/.test(l.stderr),l.stderr.trim())
    check('last unit has exactly one hold and no oversell',invariant(f)==='1/1|1/1|0|1',invariant(f))
    check('refused claimant has no allocation',value(`select count(*)=0 from public.inventory_reservations where order_request_id='${f.oldOrder}';`)==='t')

    const assigned = fixture('assignment'); const assignGate = await controller()
    const version = value(`select to_char(updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
      from public.channel_listings where sku=${literal(assigned.sku)};`)
    const command = signedAdminCommandArguments('website_listing_set',actor,randomUUID(),
      { sku:assigned.sku,assigned:false,expectedUpdatedAt:version,reason:'Local assignment race' })
    const call = `public.execute_admin_website_listing_command_v1(${['p_action','p_timestamp','p_nonce',
      'p_idempotency_key','p_payload_text','p_signature'].map(key=>literal(command[key])).join(',')})`
    const pauser = session('k2_stock_assignment', `begin; set local role authenticated; select ${call};
      select pg_advisory_xact_lock(61001,5); commit;`)
    await waitFor(blockedBy('k2_stock_assignment',assignGate.name),'assignment holds product/listing')
    const rejected = session('k2_stock_assigned_buyer',`begin; ${websiteReserve(assigned)} commit;`)
    await waitFor(blockedBy('k2_stock_assigned_buyer','k2_stock_assignment'),'buyer waits for current assignment')
    await assignGate.release()
    const [p,b] = await Promise.all([pauser,rejected])
    check('concurrent pause commits and buyer sees current denial',p.status===0 && b.status!==0 && /K2_PRODUCT_NOT_OFFERED_ON_WEBSITE/.test(b.stderr),`${p.stderr}${b.stderr}`.trim())
    check('paused offer has no reservation effect',invariant(assigned)==='2/0|2/0|2|0',invariant(assigned))
    completed.delete('k2_stock_assignment'); completed.delete('k2_stock_assigned_buyer')

    const first = fixture('basket-A'); const second = fixture('basket-B')
    sync(database, `insert into public.order_request_items(order_request_id,sku,product_name,quantity,unit_price,line_total)
      values('${first.oldOrder}',${literal(second.sku)},'Fixture',1,100,100),
       ('${first.newOrder}',${literal(second.sku)},'Fixture',1,100,100);`)
    const reverse = JSON.stringify([{sku:second.sku,quantity:1},{sku:first.sku,quantity:1}])
    const forward = JSON.stringify([{sku:first.sku,quantity:1},{sku:second.sku,quantity:1}])
    const basketGate = await controller()
    const basketOne = session('k2_stock_basket_one', `begin; ${websiteReserve({...first,items:reverse})}
      select pg_advisory_xact_lock(61001,5); commit;`)
    await waitFor(blockedBy('k2_stock_basket_one',basketGate.name),'first basket holds both SKU balances')
    const basketTwo = session('k2_stock_basket_two', `begin;
      select k2_private.require_website_order_items(${literal(forward)}::jsonb);
      select public.reserve_order_request_lots_v1('${first.oldOrder}','Local opposite basket'); commit;`)
    await waitFor(blockedBy('k2_stock_basket_two','k2_stock_basket_one'),'opposite basket waits in common SKU order')
    await basketGate.release()
    const baskets = await Promise.all([basketOne,basketTwo])
    check('opposite basket order commits without deadlock',baskets.every(item=>item.status===0),baskets.map(item=>item.stderr).join('').trim())
    check('both basket balances and lots match exact allocations',
      invariant(first)==='2/2|2/2|0|2' && invariant(second)==='2/2|2/2|0|2',`${invariant(first)};${invariant(second)}`)
    completed.delete('k2_stock_basket_one'); completed.delete('k2_stock_basket_two')

    const missing = fixture('missing-balance'); reserveOld(missing)
    sync(database, `delete from public.inventory_balances where sku=${literal(missing.sku)};`)
    sync(database, `begin; ${websiteReserve(missing)} commit;`)
    check('missing balance derives physical and reserved counts from canonical lots',
      invariant(missing)==='2/2|2/2|0|2',invariant(missing))

    // Record the remaining overload/hold integration gap, rather than hiding it
    // behind the extracted reservation helper used in these concurrency checks.
    check('restored canonical writer uses 11 arguments; old hold prerequisite absent',
      value(`select to_regprocedure('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text)') is null
       and to_regprocedure('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text)') is not null;`)==='t')
    const gap = fixture('signed-gap',1)
    if(signedHolds) {
      const payload=guestPayload(gap,{shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
      const response=JSON.parse(value(`set role anon; select row_to_json(r)::text from ${guestCall(payload)} r;`))
      check('actual signed purchase succeeds and returns its grant',response.ok===true && typeof response.guest_grant_token==='string')
      check('signed purchase creates the exact 30-minute last-unit hold',invariant(gap)==='1/1|1/1|0|1'
        && value(`select count(*)=1 from public.inventory_reservations r join public.order_requests o on o.id=r.order_request_id
          where o.idempotency_key=${literal(payload.idempotencyKey)} and r.status='active'
          and r.hold_minutes=30 and r.expires_at>clock_timestamp()+interval '25 minutes'
          and r.expires_at<=clock_timestamp()+interval '31 minutes';`)==='t',invariant(gap))
      const continuity=JSON.parse(value(`select jsonb_build_object('subtotal',o.subtotal,'shipping',o.shipping_amount,
         'total',o.total_amount,'quote',o.shipping_quote_status,'customer',o.customer_id is not null,
         'conversations',(select count(*) from public.conversations c where c.source_kind='order_request' and c.source_id=o.id),
         'messages',(select count(*) from public.messages m join public.conversations c on c.id=m.conversation_id
           where c.source_kind='order_request' and c.source_id=o.id),
         'scopes',(select count(*) from public.guest_access_grant_scopes s where s.scope_kind='order_request' and s.scope_id=o.id))::text
         from public.order_requests o where o.idempotency_key=${literal(payload.idempotencyKey)};`))
      check('canonical totals and single linked conversation seed are preserved',
        continuity.subtotal===100 && continuity.shipping===95 && continuity.total===195
        && continuity.quote==='customer_confirmed' && continuity.customer===true
        && continuity.conversations===1 && continuity.messages===1 && continuity.scopes===1,JSON.stringify(continuity))
      const afterWinner=records()
      const controlsAfterWinner=controls()
      const refused=await session('k2_signed_refused',`set role anon; select * from ${guestCall(guestPayload(gap),'192.0.2.11')};`)
      completed.delete('k2_signed_refused')
      check('second actual signed last-unit purchase is refused with full record rollback',
        refused.status!==0 && /Insufficient sellable lot stock/.test(refused.stderr)
        && records()===afterWinner && controls()===controlsAfterWinner && invariant(gap)==='1/1|1/1|0|1')
      const replay=JSON.parse(value(`set role anon; select row_to_json(r)::text from ${guestCall(payload)} r;`))
      check('exact signed retry returns the same order without duplicate effects',
        replay.ok===true && replay.public_reference===response.public_reference && replay.guest_grant_token===null && records()===afterWinner)
      const conflict=JSON.parse(value(`set role anon; select row_to_json(r)::text from ${guestCall({...payload,note:'Changed payload'})} r;`))
      check('same key with changed signed payload is refused without records',conflict.ok===false && conflict.error_code==='IDEMPOTENCY_CONFLICT' && records()===afterWinner)

      const partialA=fixture('partial-A',1); const partialB=fixture('partial-B',0)
      const beforePartial=records()
      const controlsBeforePartial=controls()
      const partial=await session('k2_signed_partial',`set role anon; select * from ${guestCall(guestPayload(partialA,
        {items:[{sku:partialA.sku,quantity:1},{sku:partialB.sku,quantity:1}]}),'192.0.2.12')};`)
      completed.delete('k2_signed_partial')
      check('later-item stock failure rolls back earlier hold and all new records',partial.status!==0
        && /Insufficient sellable lot stock/.test(partial.stderr) && records()===beforePartial && controls()===controlsBeforePartial
        && invariant(partialA)==='1/0|1/0|1|0' && invariant(partialB)==='0/0|0/0|0|0')

      const race=fixture('signed-race',1); const raceGate=await controller()
      const raceOnePayload=guestPayload(race); const raceTwoPayload=guestPayload(race)
      const one=session('k2_signed_winner',`begin; set local role anon;
        select * from ${guestCall(raceOnePayload,'192.0.2.20')}; select pg_advisory_xact_lock(61001,5); commit;`)
      await waitFor(blockedBy('k2_signed_winner',raceGate.name),'signed winner holds its unit')
      const two=session('k2_signed_loser',`set role anon; select * from ${guestCall(raceTwoPayload,'192.0.2.21')};`)
      await waitFor(blockedBy('k2_signed_loser','k2_signed_winner'),'independent signed buyer waits for stock')
      await raceGate.release()
      const raceResults=await Promise.all([one,two])
      completed.delete('k2_signed_winner'); completed.delete('k2_signed_loser')
      check('concurrent actual signed buyers preserve one winner and refuse the loser',raceResults[0].status===0
        && raceResults[1].status!==0 && /Insufficient sellable lot stock/.test(raceResults[1].stderr)
        && invariant(race)==='1/1|1/1|0|1'
        && value(`select count(*)=1 from public.order_requests where idempotency_key in
         (${literal(raceOnePayload.idempotencyKey)},${literal(raceTwoPayload.idempotencyKey)});`)==='t')

      const keyRace=fixture('same-key',1); const keyPayload=guestPayload(keyRace); const keyGate=await controller()
      const keyOne=session('k2_signed_key_one',`begin; set local role anon; select * from ${guestCall(keyPayload,'192.0.2.30')};
        select pg_advisory_xact_lock(61001,5); commit;`)
      await waitFor(blockedBy('k2_signed_key_one',keyGate.name),'same-key first request holds result')
      const keyTwo=session('k2_signed_key_two',`set role anon; select * from ${guestCall(keyPayload,'192.0.2.31')};`)
      await waitFor(blockedBy('k2_signed_key_two','k2_signed_key_one'),'same-key second request waits')
      await keyGate.release()
      const keyResults=await Promise.all([keyOne,keyTwo])
      completed.delete('k2_signed_key_one'); completed.delete('k2_signed_key_two')
      check('concurrent same-key signed requests return one canonical result',keyResults.every(r=>r.status===0)
        && invariant(keyRace)==='1/1|1/1|0|1'
        && value(`select count(*)=1 from public.order_requests where idempotency_key=${literal(keyPayload.idempotencyKey)};`)==='t')

      if(beforeKeyLock) {
        // Controlled diagnostic variant on this clone only; repository SQL stays intact.
        const signature='public.submit_guest_order_v1(bigint,uuid,text,text,text,text)'
        const current=sync(database,`select pg_get_functiondef(${literal(signature)}::regprocedure);`)
        const statement="  perform pg_advisory_xact_lock(hashtextextended('k2.website-order:'||trim(v_payload->>'idempotencyKey'),0));"
        if(current.split(statement).length!==2) throw new Error('SIGNED_KEY_REGRESSION_SHAPE_CHANGED')
        const changed=current.replace(statement,'  -- Local regression: signed key lock deliberately omitted.')
        sync(database,changed)
        keyLockRegression={ scope:'Controlled local signed-entry variant: only its pre-inventory advisory statement omitted',
          originalSha256:createHash('sha256').update(current).digest('hex'),
          variantSha256:createHash('sha256').update(changed).digest('hex') }
      }
      for(const first of ['signed','canonical']) {
        const mixed=fixture(`mixed-${first}`,1)
        const mixedPayload=guestPayload(mixed,{shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
        const mixedGate=await controller(`select sku from public.products where sku=${literal(mixed.sku)} for update;`)
        const firstName=`k2_mixed_${first}_first`; const secondName=`k2_mixed_${first}_second`
        const signedSql=`select row_to_json(r)::text from ${guestCall(mixedPayload,first==='signed'?'192.0.2.40':'192.0.2.41')} r;`
        const canonicalSql=`select row_to_json(r)::text from ${canonicalCall(mixedPayload)} r;`
        const firstResult=session(firstName,`set role anon; ${first==='signed'?signedSql:canonicalSql}`)
        await waitFor(blockedBy(firstName,mixedGate.name),'first mixed path owns balance and waits for product')
        const secondResult=session(secondName,`set role anon; ${first==='signed'?canonicalSql:signedSql}`)
        await waitFor(blockedBy(secondName,firstName),'second mixed path waits for first')
        const exactKey=value(waitsForOrderKey(secondName,firstName,mixedPayload.idempotencyKey))==='t'
        if(!beforeKeyLock) check(`${first}-first mixed retry waits on the exact advisory order key`,exactKey)
        await mixedGate.release()
        const mixedResults=await Promise.all([firstResult,secondResult])
        completed.delete(firstName); completed.delete(secondName)
        if(beforeKeyLock) {
          check('omitted signed key reproduces the mixed canonical/signed deadlock',!exactKey
            && mixedResults.some(r=>r.status!==0 && /deadlock detected/.test(r.stderr)))
          break
        }
        check(`${first}-first mixed retry commits with one order, hold and conversation`,mixedResults.every(r=>r.status===0)
          && invariant(mixed)==='1/1|1/1|0|1'
          && value(`select count(*)=1 and bool_and(shipping_amount=95 and total_amount=195)
           and (select count(*) from public.conversations c join public.order_requests o on o.id=c.source_id
            where c.source_kind='order_request' and o.idempotency_key=${literal(mixedPayload.idempotencyKey)})=1
           from public.order_requests where idempotency_key=${literal(mixedPayload.idempotencyKey)};`)==='t')
        const signedResult=JSON.parse(mixedResults[first==='signed'?0:1].stdout.trim().split('\n').at(-1))
        const directResult=JSON.parse(mixedResults[first==='signed'?1:0].stdout.trim().split('\n').at(-1))
        check(`${first}-first mixed retry preserves guest ownership`,first==='signed'
          ? signedResult.ok===true && typeof signedResult.guest_grant_token==='string'
            && signedResult.public_reference===directResult.public_reference
          : signedResult.ok===false && signedResult.error_code==='IDEMPOTENCY_CONFLICT'
            && signedResult.guest_grant_token===null
            && value(`select count(*)=0 from public.guest_access_grant_scopes s join public.order_requests o on o.id=s.scope_id
              where s.scope_kind='order_request' and o.idempotency_key=${literal(mixedPayload.idempotencyKey)};`)==='t')
      }
    } else {
    for (let i=0;i<2;i+=1) {
      const payload={ customerName:'Local signed gap',email:`gap${i}@example.test`,phone:'',address:'Local test address',
        fulfillmentMethod:'Pickup',note:'',items:[{sku:gap.sku,quantity:1}],idempotencyKey:randomUUID(),couponCode:'' }
      const a=signedRpcArguments({headers:{},socket:{remoteAddress:'127.0.0.1'}},'order',payload)
      const call=`public.submit_guest_order_v1(${['p_timestamp','p_nonce','p_payload_text','p_ip_hash','p_signature']
        .map(key=>literal(a[key])).join(',')},null)`
      check(`prepared signed order ${i+1} currently accepts without a hold`,value(`set role anon; select ok from ${call};`)==='t')
    }
    check('remaining signed-purchase gap is reproduced: zero holds for two accepted orders',
      value(`select count(*)=0 from public.inventory_reservations where sku=${literal(gap.sku)};`)==='t'
      && invariant(gap)==='1/0|1/0|1|0',invariant(gap))
    }
  }
  if (couponLifecycle) await rehearseCouponLifecycle()
  if (paymentLifecycle) await rehearseCurrentPayment({ sync:sql=>sync(database,sql),value,source,
    check,fixture,guestPayload,guestCall,actor,literal,invariant,withoutTransaction,beforeStructuredCommitment,beforePaymentBodyGuard,
    recordDiagnostic:sql=>{paymentDiagnosticSha256=createHash('sha256').update(sql).digest('hex')} })
  if (eligibleLots) await rehearseEligibleLotComposition({sync:sql=>sync(database,sql),value,source,
    check,fixture,guestPayload,guestCall,canonicalCall,actor,literal,staff,beforeEligibleFix,withoutTransaction,
    captureMetadata:metadata=>fs.writeFileSync(path.join(evidence,'function-preflight.json'),metadata+'\n'),advisor:eligibleAdvisor,
    captureDefinition:(name,sql)=>fs.writeFileSync(path.join(evidence,`${name}-before.sql`),sql+'\n')})
  if(paymentLotParity) await rehearsePaymentLotParity({sync:sql=>sync(database,sql),value,check,fixture,
    guestPayload,guestCall,actor,literal,source,withoutTransaction,beforePaymentLotFix,advisor:eligibleAdvisor,
    captureMetadata:(name,metadata)=>fs.writeFileSync(path.join(evidence,`payment-metadata-${name}.json`),metadata+'\n'),
    captureDefinition:(name,sql)=>fs.writeFileSync(path.join(evidence,`${name}-before.sql`),sql+'\n')})
  if(currentWriters&&!receivingWriters&&!receivingFinalizer&&!clearanceConcurrency&&!receivingPurchase&&!clearanceRecount) await rehearseCurrentWriterConcurrency({sync:sql=>sync(database,sql),value,check,fixture,
    guestPayload,guestCall,actor,literal,source,withoutTransaction,session,controller,blockedBy,waitFor,invariant,
    completed,evidence,beforeRecountLockFix,writerWitnessFailure,recountInitialization,writerReverse,writerControllerFailure})
  if(releaseCurrentChain)await rehearseReleaseCurrentChain({sync:sql=>sync(database,sql),value,check,literal,source,evidence})
  if(releaseRaces)await rehearseCurrentReleaseConcurrency({sync:sql=>sync(database,sql),value,check,fixture,
    guestPayload,guestCall,actor,literal,session,controller,blockedBy,waitFor,invariant,completed,evidence,releaseWitnessFailure,fixtureSkus,releaseCurrentChain})
  if(catalogIntakeFoundation)await rehearseIntakeFoundation({sync:sql=>sync(database,sql),value,check,literal,source,evidence,marker,dataDirectory})
  if(catalogIntakeFoundation)await rehearseIntakeDependencies({sync:sql=>sync(database,sql),value,check,literal,source,evidence,marker,dataDirectory})
  if(catalogCurrentChain)await rehearseCatalogCurrentChain({sync:sql=>sync(database,sql),value,check,literal,source,evidence,fixture,actor})
  const recoverFlightCost=intakeFlight?await rehearseIntakeFlightCost({sync:sql=>sync(database,sql),value,check,literal,source,evidence,marker,dataDirectory}):null
  if(intakeLifecycle)await rehearseIntakeLifecycle({value,check,literal,evidence,actor,publication:intakePublication})
  if(intakeCleanup)await rehearseIntakeCleanup({sync:sql=>sync(database,sql),value,check,literal,source,evidence,marker,dataDirectory,actor,beforeFix:beforeCleanupFix})
  if(intakeCalendar&&recoverFlightCost)await recoverFlightCost()
  const recoverIntakeCalendar=intakeCalendar?await rehearseIntakeCalendar({sync:sql=>sync(database,sql),value,check,literal,source,evidence,marker,dataDirectory}):null
  if(intakeFlight)await rehearseIntakeFlight({value,check,literal,evidence,actor,calendar:intakeCalendar})
  if(recoverFlightCost&&!intakeCalendar)await recoverFlightCost()
  if(recoverIntakeCalendar)await recoverIntakeCalendar()
  if(intakePublication)await rehearseIntakePublication({value,check,literal,evidence,actor})
  if(intakeDisabledAi)await rehearseIntakeDisabledAi({value,check,literal,evidence,actor})
  if(releaseEligibility)await rehearseReleaseLotParity({sync:sql=>sync(database,sql),value,check,fixture,
    guestPayload,guestCall,actor,literal,source,withoutTransaction,evidence,beforeReleaseLotFix})
  if(lotCompatibility)await rehearseLotCompatibility({sync:sql=>sync(database,sql),value,check,fixture,
    guestPayload,guestCall,literal,source,withoutTransaction,evidence,beforeLotCompatFix})
  if(receivingCalendar||receivingRetry)await rehearseReceivingCalendar({sync:sql=>sync(database,sql),value,check,fixture,
    literal,source,withoutTransaction,evidence,beforeReceivingCalendarFix})
  if(receivingRetry)await rehearseReceivingRetry({sync:sql=>sync(database,sql),value,check,fixture,
    literal,evidence,beforeReceivingRetryFix})
  if(receivingParity)await rehearseCurrentReceiving({sync:sql=>sync(database,sql),value,check,fixture,
    literal,source,withoutTransaction,evidence,beforeReceivingFix,guestPayload,guestCall})
  if(receivingWriters||receivingFinalizer||clearanceConcurrency||receivingPurchase||clearanceRecount) {
    sync(database,source('supabase/migrations/20261002102000_signed_recount_balance_lock_order.sql'))
    await rehearseReceivingCalendar({sync:sql=>sync(database,sql),value,check,fixture,literal,source,withoutTransaction,evidence})
    await (clearanceRecount?rehearseClearanceRecount:receivingPurchase?rehearseReceivingPurchase:clearanceConcurrency?rehearseClearanceConcurrency:receivingFinalizer?rehearseReceivingFinalizer:rehearseReceivingWriters)({sync:sql=>sync(database,sql),value,check,fixture,
      guestPayload,guestCall,actor,literal,source,withoutTransaction,session,controller,blockedBy,waitFor,invariant,
      completed,evidence,writerReverse,beforeClearanceLockFix,clearanceEdges})
  }
} catch(error) { runError=error }
finally {
  for(const child of sessions) child.kill()
  await Promise.allSettled([...pending])
  if(created) {
    // A failed early setup may have no marker. Preserve that clone for review.
    try {
      sync(database, `${targetGuard(database)} do $$ begin
       if (select marker from k2_stock_fixture.owner) is distinct from '${marker}'::uuid
       then raise exception 'CLONE_OWNERSHIP_MISMATCH'; end if; end $$;`)
      const r=spawnSync(path.join(bin,'dropdb.exe'),[database],{cwd:root,windowsHide:true,env,encoding:'utf8',timeout:15000})
      if(r.error || r.status!==0) throw new Error(String(r.stderr || r.error?.message))
      check('owned disposable clone removed',sync(template,`select not exists(select 1 from pg_database where datname=${literal(database)});`)==='t')
    } catch(error) { runError ??=error }
  }
  if(templateBefore) {
    try { check('original restore counts and function/ACL fingerprint unchanged',baselineState()===templateBefore) }
    catch(error) { runError ??=error }
  }
}
if(runError && !couponLifecycle) throw runError
fs.mkdirSync(evidence,{recursive:true})
fs.writeFileSync(path.join(evidence,beforePaymentBodyGuard?'before-payment-body-guard-receipt.json':beforeStructuredCommitment?'before-structured-commitment-receipt.json':beforeEventType?'before-event-type-receipt.json':beforeCommitment?'before-commitment-receipt.json':beforeKeyLock?'before-key-lock-receipt.json':beforeFix?'before-fix-receipt.json':'local-receipt.json'),`${JSON.stringify({
 capturedAt:new Date().toISOString(),target:`127.0.0.1:54388/${database}`,template,
 ...(currentWriters?{currentWriterIdea:'IDEA-20261002-10',currentWriters,beforeRecountLockFix,writerWitnessFailure,recountInitialization,
   writerReverse,writerControllerFailure,beforeControllerCleanup,releaseRaces,releaseWitnessFailure,releaseWitnessSha256,releaseCurrentChain,releaseCurrentChainWitnessSha256,catalogCurrentChain,catalogCurrentChainWitnessSha256,catalogIntakeFoundation,intakeFoundationWitnessSha256,intakeDependenciesWitnessSha256,intakeLifecycle,intakeLifecycleWitnessSha256,intakeFlight,intakeFlightWitnessSha256,intakeFlightCostWitnessSha256,intakeCalendar,intakeCalendarWitnessSha256,intakePublication,intakePublicationWitnessSha256,intakeCleanup,beforeCleanupFix,intakeCleanupWitnessSha256,intakeDisabledAi,intakeDisabledAiWitnessSha256,
   releaseEligibility,beforeReleaseLotFix,releaseLotWitnessSha256,lotCompatibility,beforeLotCompatFix,lotCompatibilityWitnessSha256,
   receivingParity,beforeReceivingFix,receivingWitnessSha256,receivingCalendar,beforeReceivingCalendarFix,receivingCalendarWitnessSha256,
   receivingRetry,beforeReceivingRetryFix,receivingRetryWitnessSha256,
   receivingWriters,receivingWritersWitnessSha256,
   receivingFinalizer,receivingFinalizerWitnessSha256,clearanceConcurrency,clearanceConcurrencyWitnessSha256,
   receivingPurchase,receivingPurchaseWitnessSha256,clearanceRecount,clearanceRecountWitnessSha256,beforeClearanceLockFix,clearanceEdges,
   currentWriterWitnessSha256}:{}),
 ...(paymentLotParity ? {paymentLotParity,beforePaymentLotFix,paymentLotWitnessSha256,paymentLotIdea:'IDEA-20261002-09'} : {}),
 ...(eligibleLots ? {idea:clearanceRecount||receivingPurchase||clearanceConcurrency||receivingFinalizer||receivingWriters||receivingRetry||receivingCalendar||receivingParity||lotCompatibility?'IDEA-20261002-10':paymentLotParity?'IDEA-20261002-09':'IDEA-20261002-08',eligibleLots,beforeEligibleFix,eligibleWitnessSha256,advisors,
   passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length} : {}),
 scope:catalogIntakeFoundation ? 'Whole prepared intake/SKU/publication and signed boundary while preserving full existing restored storage, explicit local legacy ACL closure, current release and signed catalog CSV composition; excludes full cold installer, hosted storage/provider ownership/API, global production RLS, real inventory and live acceptance' : releaseCurrentChain ? 'Current prepared release/compatibility/receiving/calendar/clearance body composition with exact local legacy ACL overlay; two-SKU release/purchase/nonempty expiry isolation/refusal; excludes complete installer/provider/real acceptance' : releaseRaces ? 'Historical pre-release-eligibility cancellation/expiry versus signed two-SKU purchase; exact rapid no-pruning guest replay controls/durable result; excludes later receiving/calendar/clearance/full-chain, provider/BFF release reachability and real acceptance' : clearanceRecount ? 'Actual signed clearance/recount across real minute buckets; early product boundary diagnostic; excludes complete listing/production acceptance' : receivingPurchase ? 'Actual signed purchase versus owner-only receiving finalizer; two reverse-input SKUs and three source lines; both orders and contended later-SKU fault/recovery; excludes provider/browser/full acceptance' : clearanceConcurrency ? 'Actual signed clearance approval/reversal versus owner-only receiving finalizer; four single-SKU schedules on owned restore; excludes provider/browser/full acceptance' : receivingFinalizer ? 'Actual owner-only receiving finalizer versus signed recount after corrected receiving/calendar installation on owned restore; two single-SKU starting orders and stale-state recovery; excludes provider/browser reachability, remaining writers/full installer/real acceptance' : receivingWriters ? 'Actual payment/confirmation/handover versus signed recount after receiving/calendar installation on owned restore; excludes receiving-finalizer overlap, remaining writers, full installer/provider/real acceptance' : receivingRetry ? 'Actual protected handler/HMAC/consignment SQL cross-day receipt replay on owned restore with synthetic provider auth and controlled date clocks; excludes real-host/provider/full writer/installer acceptance' : receivingCalendar ? 'Actual signed receiving add-line Manila calendar after full prepared chain on owned restore; excludes UI/full writer/installer/provider/real acceptance' : receivingParity ? 'Actual signed receiving lifecycle after historical custody with prepared lot/release chain on owned restored-schema clone; excludes later calendar/retry/clearance composition, caller UI/full-writer/installer/provider/real acceptance' : lotCompatibility ? 'Actual release-corrected trigger and signed lot command compatibility/calendar/history on disposable restored-schema clone; excludes complete receiving, post-correction writers and provider/real acceptance' : paymentLotParity ? 'Actual signed newly-ineligible payment and confirmed packed handover after reservation eligibility installation; disposable restored-schema clone; excludes untested remaining writers, shipping and provider/human acceptance' : paymentLifecycle ? 'Current signed coupons, structured payment and exact packing/handover on disposable restored-schema clone; excludes shipping authority, remaining-writer and provider/human acceptance'
  : couponLifecycle ? 'Current signed coupons and prepared confirmation commitment on disposable restored-schema clone; excludes payment/handover, shipping authority and all-writer/provider acceptance'
  : signedHolds ? 'Full prepared purchase-hold migration plus actual signed purchase/last-unit/retry on disposable restored-schema clone; no provider or all-writer acceptance'
  : 'Actual prepared function bodies on disposable restored-schema clone; not full migration installation or signed purchase-hold acceptance',
 beforeFix,beforeKeyLock,keyLockRegression,...(couponLifecycle ? {beforeCommitment,beforeEventType,error:runError?.message ?? null} : {}),
 witnessSha256,templateFingerprint:templateBefore ? JSON.parse(templateBefore) : null,
 manifest,checks,providerWrites:false,canonicalSignedHoldIntegration: signedHolds && !beforeKeyLock,
 ...(couponLifecycle ? {couponConfirmationIntegration:!runError && !beforeCommitment && !beforeEventType} : {}),
 ...(paymentLifecycle ? {beforeStructuredCommitment,beforePaymentBodyGuard,preservedVerifierSha256,verifierAclTransition,paymentHandoverIntegration:!runError && !beforeStructuredCommitment && !beforePaymentBodyGuard,
   paymentWitnessSha256,...(beforePaymentBodyGuard ? {paymentDiagnosticSha256} : {})} : {}),
 templateUnchanged:checks.some(c=>c.name==='original restore counts and function/ACL fingerprint unchanged' && c.passed),
 cloneRemoved:checks.some(c=>c.name==='owned disposable clone removed' && c.passed) },null,2)}\n`)
if(runError) throw runError
if(beforeFix) { console.error('EXPECTED_BEFORE_FIX_FAILURE: Website/inventory deadlock reproduced'); process.exitCode=1 }
if(beforeKeyLock) { console.error('EXPECTED_BEFORE_KEY_LOCK_FAILURE: mixed canonical/signed deadlock reproduced'); process.exitCode=1 }
