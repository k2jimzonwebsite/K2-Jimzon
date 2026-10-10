// MAP-018 / IDEA-20261007-01. Owned disposable clone only; never a provider runner.
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { signedAdminCommandArguments } from '../server/admin-bff/security.js'
import { CATALOG_COLUMNS, buildCatalogCommitPayload } from '../server/admin-bff/catalog-spreadsheet.js'
import { signedRpcArguments } from '../server/storefront-bff/security.js'
import { validateFulfillmentCommand } from '../server/admin-bff/fulfillment.js'

const root = process.argv.find(a => a.startsWith('--recovery-root='))?.slice(16)
if (!root || !fs.existsSync(path.join(root, 'native-rehearsal-copy-manifest.json'))) throw Error('OWNED_RECOVERY_ROOT_REQUIRED')
const baselineOnly = process.argv.includes('--baseline-only')
const taxonomyAccessOnly = process.argv.includes('--qualify-taxonomy-access')
if (taxonomyAccessOnly && (baselineOnly || process.argv.includes('--qualify-installation') || process.argv.includes('--qualify-writers'))) throw Error('TAXONOMY_ACCESS_MODE_MUST_BE_SCOPED')
const out = path.join(root, 'imported-draft-' + randomUUID())
fs.mkdirSync(out)
const dir = path.join(root, 'native-rehearsal/current-restore-20260929-pg-data').replaceAll('\\', '/')
const bin = path.resolve('.tools/postgresql-17.11/runtime/pgsql/bin')
const cloneId = randomUUID()
const db = 'k2_category_foundation_' + cloneId.replaceAll('-', '')
const marker = 'K2 category foundation:' + cloneId
const actor = 'ed000000-0000-4000-8000-000000000001'
const admin = 'ed000000-0000-4000-8000-000000000002'
const category = 'ed000000-0000-4000-8000-000000000003'
const brand = 'ed000000-0000-4000-8000-000000000004'
const q = v => "'" + String(v).replaceAll("'", "''") + "'"
const sha = v => createHash('sha256').update(v).digest('hex')
const report = { scope: 'Synthetic owned PG17.11 clone, no provider/Auth/media acceptance', out, db, marker, checks: [] }
const runnerSource = fs.readFileSync(new URL(import.meta.url))
report.runnerSha256 = sha(runnerSource)
fs.writeFileSync(path.join(out,'executed-rehearsal.mjs'),runnerSource,{flag:'wx'})
let n = 0, started = false, created = false
const pendingSql = new Set(), asyncErrors = []
const ctl = args => spawnSync(path.join(bin, 'pg_ctl.exe'), args, { windowsHide: true, stdio: 'ignore' }).status
function sql(database, text) {
  const file = path.join(out, 'command-' + (++n) + '.sql')
  fs.writeFileSync(file, text, { flag: 'wx' })
  const r = spawnSync(path.join(bin, 'psql.exe'), ['-h','127.0.0.1','-p','54391','-U','postgres','-d',database,'-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-v','VERBOSITY=terse','-f',file], { windowsHide: true, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
  fs.writeFileSync(path.join(out, 'stderr-' + n + '.txt'), r.stderr || '', { flag: 'wx' })
  return { exit: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() }
}
const good = (database, text) => { const r = sql(database, text); if (r.exit !== 0) throw Error(r.stderr); return r.stdout }
const parsed = s => JSON.parse(s.split('\n').at(-1))
const nativeReceipt = (stdout, key) => {
  const replies = stdout.split('\n').filter(line => line.startsWith('{')).map(line => JSON.parse(line)).filter(value => Object.hasOwn(value,key))
  if (replies.length !== 1) throw Error('NATIVE_COMMAND_RECEIPT_SHAPE_INVALID')
  return replies[0]
}
const check = (label, pass) => { report.checks.push({ label, pass: !!pass }); if (!pass) throw Error(label) }
const context = (user = actor, aal = 'aal2') => `begin; set local search_path=''; set local lock_timeout='2s'; set local statement_timeout='10s'; select set_config('request.jwt.claim.sub',${q(user)},true); select set_config('request.jwt.claims',${q(JSON.stringify({ aal }))},true);set local role authenticated;`
function commandSql(action, payload, key = randomUUID(), user = actor, aal = 'aal2', beforeCommit = '') {
  const a = signedAdminCommandArguments(action, user, key, payload)
  const fn = action === 'catalog_import_chunk' ? 'execute_admin_catalog_import_v1'
    : action.startsWith('product_master_') || action.startsWith('category_policy_') ? 'execute_admin_product_master_command_v1'
    : action === 'website_listing_set' ? 'execute_admin_website_listing_command_v1'
    : action.startsWith('intake_ai_') ? 'execute_admin_intake_ai_v1'
    : ['payment_status','confirm_order','packing_scan','fulfill_order'].includes(action) ? 'execute_admin_fulfillment_command_v1'
    : 'execute_admin_product_intake_command_v1'
  return context(user, aal) + `select public.${fn}(${['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(k => q(a[k])).join(',')});${beforeCommit}commit;`
}
const command=(action,payload,key,user,aal)=>sql(db,commandSql(action,payload,key,user,aal))
function asyncSql(text) {
  const number=++n,file=path.join(out,'command-'+number+'.sql')
  fs.writeFileSync(file,text,{flag:'wx'})
  const pending = new Promise((resolve,reject)=>{
    const child=spawn(path.join(bin,'psql.exe'),['-h','127.0.0.1','-p','54391','-U','postgres','-d',db,'-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-v','VERBOSITY=terse','-f',file],{windowsHide:true})
    let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('error',reject)
    child.on('close',exit=>{try { fs.writeFileSync(path.join(out,'stderr-'+number+'.txt'),stderr,{flag:'wx'});resolve({exit,stdout:stdout.trim(),stderr:stderr.trim()}) } catch(error) { reject(error) }})
  })
  pendingSql.add(pending)
  // Attach rejection handling immediately, even if an observation fails before
  // the caller reaches its await. All children settle before clone disposal.
  pending.then(() => pendingSql.delete(pending), error => { pendingSql.delete(pending); asyncErrors.push(error.message) })
  return pending
}
const saved = (action, payload, key, user = actor) => { const r = command(action, payload, key, user); if (r.exit !== 0) throw Error(r.stderr); return parsed(r.stdout) }
const productRead = id => parsed(good(db, 'select to_jsonb(p) from public.products p where id=' + q(id) + ';'))
const sessionRead = id => parsed(good(db, 'select to_jsonb(s) from public.product_intake_sessions s where id=' + q(id) + ';'))
try {
  check('private mirror starts stopped', ctl(['status','-D',dir]) === 3)
  check('private mirror starts', ctl(['start','-w','-t','20','-D',dir,'-l',path.join(out,'runtime.log'),'-o','-p 54391 -h 127.0.0.1']) === 0); started = true
  report.identity = parsed(good('postgres', "select jsonb_build_object('directory',current_setting('data_directory'),'version',current_setting('server_version_num'),'port',inet_server_port(),'host',host(inet_server_addr()),'user',current_user);"))
  check('exact owned mirror identity', report.identity.directory.replaceAll('\\','/') === dir && report.identity.version === '170011' && report.identity.port === 54391 && report.identity.host === '127.0.0.1' && report.identity.user === 'postgres')
  good('postgres', 'create database ' + db + ' with template k2_current_restore_20260929 owner postgres;'); created = true
  good('postgres', 'comment on database ' + db + ' is ' + q(marker) + ';')
  const source = 'docs/evidence/20261004-category-shelf-life/foundation-qualified-schema-full-delivery-lifecycle01/full65-delivery-install.sql'
  const original = fs.readFileSync(source, 'utf8')
  check('accepted joined foundation source unchanged', sha(original) === '21806dca9d28b2d76f5aa80c790bb2260942ba533f36919822cbb371c679d440')
  const target = "current_setting('data_directory') is distinct from 'C:/Users/jerze/K2 JImzon/.tools/current-restore-20260929-pg-data'", port = 'inet_server_port() is distinct from 54388'
  check('four owned-local target literals only', original.split(target).length === 2 && original.split(target.replaceAll("'","''")).length === 2 && original.split(port).length === 3)
  const adapted = original.replace(target, () => "current_setting('data_directory') is distinct from " + q(dir)).replace(target.replaceAll("'","''"), () => "current_setting(''data_directory'') is distinct from ''" + dir + "''").replaceAll(port, 'inet_server_port() is distinct from 54391')
  report.foundation = { source, sourceSha256: sha(original), adaptedSha256: sha(adapted) }
  if (taxonomyAccessOnly) {
    const acceptedPath = path.join(root,'imported-draft-025b3682-3b76-465e-bd2a-5c2c0c597314/combined-imported-install.sql')
    const accepted = fs.readFileSync(acceptedPath,'utf8')
    check('taxonomy access uses exact accepted combined package', sha(accepted) === 'abc2abd5d685913d07508bd704aa1ecc0a29c6b0bae0f870cb47cb5ca82f85d5')
    good(db,accepted)
    report.installation = { scope:'Single installation of retained local package for new permission evidence; prior cold/replay/recovery proof reused', path:acceptedPath, sha256:sha(accepted) }
  } else if (process.argv.includes('--qualify-installation')) {
    if (baselineOnly) throw Error('INSTALL_QUALIFICATION_REQUIRES_IMPORTED_FRAGMENT')
    const { qualifyImportedInstallation } = await import('./qualify-imported-installation.mjs')
    qualifyImportedInstallation({ db, dir, bin, out, adapted, good, sql, check, report })
  } else {
    good(db, adapted)
    if (!baselineOnly) good(db, fs.readFileSync('supabase/prepared/imported_draft_continuation.sql', 'utf8'))
  }
  good(db, `insert into auth.users(id) values(${q(actor)});insert into public.user_profiles(id,role) values(${q(actor)},'Staff') on conflict(id) do update set role=excluded.role;insert into k2_private.admin_bff_secrets(singleton,request_secret) values(true,decode(repeat('01',32),'hex')) on conflict(singleton) do update set request_secret=excluded.request_secret;`)
  process.env.K2_ADMIN_BFF_REQUEST_SECRET = Buffer.alloc(32,1).toString('base64')
  good(db, `insert into auth.users(id) values(${q(admin)});update public.user_profiles set role='Admin' where id=${q(admin)};
    insert into public.categories(id,name) values(${q(category)},'Synthetic imported category');
    insert into public.brands(id,name) values(${q(brand)},'Synthetic imported brand');
    insert into k2_private.category_policy_command_config(singleton,maximum_depth) values(true,10) on conflict(singleton) do update set maximum_depth=excluded.maximum_depth;
    insert into k2_private.category_shelf_life_policy(category_id,minimum_days,version,actor_id,reason) values(${q(category)},150,1,${q(admin)},'Explicit synthetic shelf-life policy');
    insert into public.hubs(id,name,code,country,role) values('HUB-MNL-CENTRAL','Synthetic imported workflow hub','SYN-IMPORT','PH','Synthetic test');
    insert into public.custodians(id,name,role,hub_id) values('CUST-STAFF-ELENA','Synthetic imported custodian','Synthetic test','HUB-MNL-CENTRAL');`)
  const tableNames = parsed(good(db, "select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname) order by n.nspname,c.relname) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in ('public','k2_private');"))
  const qi = s => '"' + s.replaceAll('"','""') + '"'
  const rowsQuery = 'select jsonb_agg(x order by x->>\'table\') from (' + tableNames.map(t => `select jsonb_build_object('table',${q(t.schema+'.'+t.table)},'count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' order by to_jsonb(t)::text collate "C"),''))) x from ${qi(t.schema)}.${qi(t.table)} t`).join(' union all ') + ') snapshots;'
  const fingerprint = () => ({ rows: parsed(good(db, rowsQuery)), metadata: sha(good(db, fs.readFileSync('supabase/current_install_state_capture.sql','utf8'))) })
  if (taxonomyAccessOnly) {
    const before = fingerprint()
    report.taxonomyAccess = { scope:'Actual native authenticated role with synthetic Staff/Admin claims; not JWT, PostgREST or HTTP BFF acceptance', attempts:[], nativeOptionsUsable:true, directMutationDenied:true }
    for (const [user, profile] of [[actor,'Staff'],[admin,'Admin']]) {
      const privileges = parsed(good(db,context(user) + "select jsonb_build_object('role',current_user,'actor',current_setting('request.jwt.claim.sub'),'staff',public.is_staff(),'admin',public.is_admin(),'schemaUsage',has_schema_privilege(current_user,'public','USAGE'),'authSchemaUsage',has_schema_privilege(current_user,'auth','USAGE'),'tables',(select jsonb_agg(jsonb_build_object('table',t,'select',has_table_privilege(current_user,t,'SELECT'),'insert',has_table_privilege(current_user,t,'INSERT'),'idSelect',has_column_privilege(current_user,t,'id','SELECT'),'nameSelect',has_column_privilege(current_user,t,'name','SELECT')) order by t) from unnest(array['public.brands','public.categories']) t));commit;"))
      check(profile + ' native permission observation binds exact authenticated actor and profile',privileges.role === 'authenticated' && privileges.actor === user && privileges.staff === true && privileges.admin === (profile === 'Admin'))
      for (const table of ['brands','categories']) {
        const options = sql(db,context(user) + 'select id,name from public.' + table + ' order by name asc limit 501;select count(*) from public.' + table + ';commit;')
        const insert = sql(db,context(user) + 'insert into public.' + table + "(name) values('Synthetic permission probe') returning id,name;rollback;")
        const granted = privileges.tables.find(t => t.table === 'public.' + table)
        const optionsUsable = options.exit === 0
        const mutationDenied = insert.exit === 3 && insert.stderr.includes('permission denied for table ' + table)
        report.taxonomyAccess.nativeOptionsUsable &&= optionsUsable
        report.taxonomyAccess.directMutationDenied &&= mutationDenied
        check(profile + ' ' + table + ' options refusal agrees with actual effective SELECT predicates',!optionsUsable && options.exit === 3 && options.stderr.includes('permission denied for table ' + table) && granted.select === false && granted.idSelect === false && granted.nameSelect === false)
        check(profile + ' ' + table + ' direct browser insertion is denied without INSERT privilege',mutationDenied && granted.insert === false)
        report.taxonomyAccess.attempts.push({ profile,table,privileges,options:{exit:options.exit,stderr:options.stderr},insert:{exit:insert.exit,stderr:insert.stderr} })
      }
    }
    const after = fingerprint()
    report.taxonomyAccess.conservation = { scope:'Every ordinary public/k2_private table row and captured metadata; not auth/storage row or sequence-value conservation',before,after }
    check('all taxonomy observations preserve scoped application rows and captured metadata',isDeepStrictEqual(before,after))
    report.taxonomyAccess.productReady = false
  } else {
  const values = Object.fromEntries(CATALOG_COLUMNS.map(k => [k, '']))
  Object.assign(values, { template_version: 'k2-catalog-v1', name: 'Synthetic imported pantry review', description: 'Imported description to preserve', ingredients: 'Synthetic label ingredients',country_of_origin:'Spain', primary_image_url: 'https://example.invalid/imported-supplied.jpg', internal_notes: 'Synthetic CSV provenance' })
  const csv = Object.keys(values).join(',') + '\n' + Object.values(values).join(',')
  const client = { from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: [], count: 0, error: null }) }) }) }) }
  const payload = await buildCatalogCommitPayload(client, { csvText: csv, fileSha256: sha(csv), operationId: randomUUID(), selectedRowNumbers: [2], chunkIndex: 0, finalChunk: true, reason: 'Explicit synthetic imported Draft test' })
  const imported = saved('catalog_import_chunk', payload)
  const id = good(db, 'select id from public.products where sku=' + q(imported.rows[0].sku) + ';')
  const baseline = productRead(id)
  check('CSV creates zero-stock unpublished Draft with supplied photo', baseline.status === 'Draft' && baseline.published === false && baseline.primary_image_url === values.primary_image_url)
  const existingProduct = { productId: id, recordVersion: String(baseline.catalog_record_version) }
  const requestId = randomUUID(), createKey = randomUUID()
  const createPayload = { requestId, barcode: null, scannedIdentity: '', existingProduct }
  const r = command('intake_session_create', createPayload, createKey)
  report.selection = { exit: r.exit, refusal: r.stderr }
  check('signed intake selects imported Draft without new identity', r.exit === 0)
  const sessionId = parsed(r.stdout).sessionId
  check('selection does not mark product reviewed or linked', sessionRead(sessionId).product_id === null && isDeepStrictEqual(productRead(id), baseline))
  check('same-key create receipt retains exact target session', saved('intake_session_create', createPayload, createKey).sessionId === sessionId)
  const refuse = (label, action, body, code, user = actor, aal = 'aal2') => {
    const before = fingerprint(), failure = command(action, body, randomUUID(), user, aal)
    check(label, failure.exit === 3 && failure.stderr.includes(code))
    check(label + ' retains every application row and full metadata after committed readback', isDeepStrictEqual(before, fingerprint()))
  }
  const draft = { sessionId, requestId, reviewedPayload: { meta: { schemaVersion:'k2.product-content.v3' }, product: { name: baseline.name, description: 'Staff accepted correction', ingredients: 'Rejected AI suggestion',origin:'Italy', brand:'Synthetic imported brand',category:'Synthetic imported category' } }, fieldDecisions: { name:'accepted', description:'accepted', ingredients:'rejected',origin:'accepted',brand:'accepted',category:'accepted' } }
  refuse('incomplete review refuses association', 'intake_draft', draft, 'K2_DRAFT_REVIEW_GATE_INCOMPLETE')
  refuse('stale catalog version refuses new selection', 'intake_session_create', { ...createPayload, requestId: randomUUID(), existingProduct: { ...existingProduct, recordVersion:'999' } }, 'K2_IMPORTED_DRAFT_VERSION_CONFLICT')
  refuse('non-AAL2 selection refuses', 'intake_session_create', { ...createPayload, requestId: randomUUID() }, 'K2_ADMIN_AAL2_REQUIRED', actor, 'aal1')
  refuse('unauthorized actor refuses selection', 'intake_session_create', { ...createPayload, requestId: randomUUID() }, 'K2_ADMIN_ACCESS_REQUIRED', 'ed000000-0000-4000-8000-000000000099')
  refuse('review patch cannot change target', 'intake_session_step', { sessionId, step:'identify', patch:{ fieldProvenance:{ imported_draft_target:null } } }, 'K2_IMPORTED_DRAFT_TARGET_IMMUTABLE')
  const secondRequest = randomUUID()
  const second = saved('intake_session_create', { ...createPayload, requestId:secondRequest }).sessionId
  const step = (sid, next, patch = {}) => saved('intake_session_step', { sessionId:sid, step:next, patch })
  const review = (sid, candidate = draft) => {
    step(sid,'packaging_evidence')
    for (const [i, slot] of ['PRIMARY','BACK','BARCODE'].entries()) {
      const key = randomUUID(), hash = String(i+1).repeat(64)
      saved('intake_evidence_register', { sessionId:sid, slot, path:actor+'/'+sid+'/'+slot.toLowerCase()+'-'+key+'-'+hash.slice(0,16)+'.png', fileName:'Explicit synthetic '+slot, size:1000, type:'image/png', width:100, height:100, sha256:hash }, key)
    }
    step(sid,'research_handoff',{ evidenceChecklist:{ ingredients:true,allergens:true,storage:true,expiry:true }, categoryType:'food' })
    step(sid,'field_review')
    step(sid,'draft_saved',{ draftPayload:candidate.reviewedPayload, fieldDecisions:candidate.fieldDecisions, fieldProvenance:{ sources:[] } })
  }
  review(sessionId); review(second)
  refuse('signed imported PRIMARY claim refuses without budget or job mutation','intake_ai_claim',{sessionId,kind:'PRIMARY',confirmation:'CONFIRM_PAID_INTAKE',version:'k2.intake-ai.2026-09-06',brief:'Synthetic image claim must be refused'},'AI_REVIEW_REQUIRED')
  refuse('signed imported attachment refuses before media changes','intake_ai_attach',{sessionId,jobId:randomUUID()},'AI_REVIEW_REQUIRED')
  check('normal review patch retains exact immutable target', sessionRead(sessionId).field_provenance.imported_draft_target.productId === id)
  const draftKey = randomUUID()
  const winner=asyncSql(commandSql('intake_draft',draft,draftKey,actor,'aal2',"select pg_sleep(1);"))
  let sleeping=false
  for(let attempt=0;attempt<30 && !sleeping;attempt++)sleeping=good(db,"select exists(select 1 from pg_stat_activity where datname="+q(db)+" and wait_event='PgSleep');")==='t'
  check('first reviewed save holds its transaction while second session races',sleeping)
  if (process.argv.includes('--writer-observation-failure')) throw Error('EXPLICIT_WRITER_OBSERVATION_FAILURE')
  const loser=command('intake_draft',{...draft,sessionId:second,requestId:secondRequest})
  const winning=await winner
  check('concurrent reviewed saves have exactly one winner',winning.exit===0 && loser.exit===3 && loser.stderr.includes('K2_IMPORTED_DRAFT_VERSION_CONFLICT'))
  // The explicit sleep adds one empty output row; select the command receipt.
  const receipt=winning.stdout.split('\n').filter(line=>line.startsWith('{')).map(line=>JSON.parse(line)).find(value=>value.product_id)
  const reviewed = productRead(id)
  check('review associates original identity and SKU', receipt.product_id === id && receipt.sku === baseline.sku && sessionRead(sessionId).product_id === id)
  check('only accepted correction changes, absent and rejected facts preserved', reviewed.description === 'Staff accepted correction' && reviewed.ingredients === baseline.ingredients && reviewed.storage_instructions === baseline.storage_instructions)
  check('supplied media, source notes and original catalog identity preserved', reviewed.primary_image_url === baseline.primary_image_url && reviewed.internal_notes === baseline.internal_notes && reviewed.catalog_id === baseline.catalog_id)
  check('catalog version advances once on reviewed correction', Number(reviewed.catalog_record_version) === Number(baseline.catalog_record_version)+1)
  check('explicit staff review assigns previously absent existing brand and category', baseline.brand_id === null && baseline.category_id === null && reviewed.brand_id === brand && reviewed.category_id === category)
  check('accepted origin correction remains coherent in intake and spreadsheet fields',reviewed.origin==='Italy' && reviewed.country_of_origin==='Italy')
  check('saved association retry returns original command receipt', isDeepStrictEqual(saved('intake_draft',draft,draftKey),receipt) && isDeepStrictEqual(productRead(id),reviewed))
  refuse('second reviewed session cannot claim product', 'intake_draft', { ...draft, sessionId:second, requestId:secondRequest }, 'K2_IMPORTED_DRAFT_VERSION_CONFLICT')
  check('exact before and after audit exists once', Number(good(db, "select count(*) from public.audit_logs where record_id="+q(id)+" and new_data->>'operation'='REVIEW_IMPORTED_DRAFT';")) === 1)
  const beforeReplay = fingerprint()
  good(db, fs.readFileSync('supabase/prepared/imported_draft_continuation.sql','utf8'))
  check('guarded fragment exact replay preserves rows and complete metadata', isDeepStrictEqual(beforeReplay,fingerprint()))
  const inventory = { sessionId, inventoryRequestId:randomUUID(),source:'reconciliation',inventory:{quantity:6,boxCode:'SYN-IMPORT-BOX',batchCode:'SYN-IMPORT-LOT',expiryDate:good(db,"select ((clock_timestamp() at time zone 'Asia/Manila')::date+180)::text;"),isNonExpiry:false,unitCost:40,ownerCode:'SYNTHETIC-OWNER',hubLocation:'HUB-MNL-CENTRAL',custodian:'CUST-STAFF-ELENA',reason:'Explicit dummy opening stock, not physical inventory'} }
  refuse('Staff cannot perform Admin opening reconciliation','intake_inventory',inventory,'K2_ADMIN_RECONCILIATION_REQUIRED')
  const inventoryKey=randomUUID(), stockReceipt=saved('intake_inventory',inventory,inventoryKey,admin)
  check('reviewed imported identity enters first stock intake',stockReceipt.success===true && sessionRead(sessionId).checklist_step==='publication_review')
  check('same-key first stock receipt does not add stock twice',isDeepStrictEqual(saved('intake_inventory',inventory,inventoryKey,admin),stockReceipt) && Number(good(db,'select sum(quantity) from public.product_batches where sku='+q(baseline.sku)+';'))===6)
  saved('intake_publication',{sessionId,requestedStatus:'under_review',reason:'Synthetic staff package review'})
  refuse('Live refuses missing human review and price','intake_publication',{sessionId,requestedStatus:'live',reason:'Synthetic gate refusal'},'K2_PUBLICATION_NOT_READY')
  saved('product_master_update',{sku:baseline.sku,patch:{srp:100,is_human_reviewed:true},expectedUpdatedAt:productRead(id).updated_at,reason:'Explicit synthetic Admin pricing and human review'},randomUUID(),admin)
  saved('intake_publication',{sessionId,requestedStatus:'live',reason:'Synthetic final publication review'})
  check('same imported product reaches Live after existing review gates',productRead(id).status==='Live' && sessionRead(sessionId).status==='completed')
  saved('website_listing_set',{sku:baseline.sku,assigned:true,expectedUpdatedAt:null,reason:'Explicit synthetic Website assignment'},randomUUID(),admin)
  check('canonical Website listing refers to original imported SKU',good(db,"select status from public.channel_listings where sku="+q(baseline.sku)+" and channel_source='website';")==='Active')
  process.env.K2_GUEST_BFF_SECRET=Buffer.alloc(32,1).toString('base64')
  good(db,"insert into k2_private.guest_bff_secrets(singleton,request_secret,contact_secret) values(true,decode(repeat('01',32),'hex'),decode(repeat('01',32),'hex')) on conflict(singleton) do update set request_secret=excluded.request_secret,contact_secret=excluded.contact_secret;")
  const guest=(fn,action,payload)=>{const a=signedRpcArguments({headers:{},socket:{remoteAddress:'127.0.8.2'}},action,payload);return parsed(good(db,`begin;set local search_path='';set local lock_timeout='2s';set local statement_timeout='10s';select set_config('request.jwt.claim.sub','',true);select set_config('request.jwt.claims','{}',true);set local role anon;select to_jsonb(x) from public.${fn}(${['p_timestamp','p_nonce','p_payload_text','p_ip_hash','p_signature'].map(k=>q(a[k])).join(',')}${fn==='submit_guest_order_v1'?',null':''}) x;reset role;commit;`))}
  const quote=guest('quote_customer_delivery_v1','delivery_quote',{service:'pickup',items:[{sku:baseline.sku,quantity:1}],destination:null})
  check('imported Website SKU receives signed guest pickup quote',quote.ok===true)
  const orderBody={customerName:'Synthetic imported workflow customer',email:'imported-workflow@example.invalid',phone:'',address:'Synthetic pickup',fulfillmentMethod:'Pickup',note:'Explicit dummy order',items:[{sku:baseline.sku,quantity:1}],idempotencyKey:randomUUID(),couponCode:'',delivery:{service:'pickup',destination:null,acceptance:{inputFingerprint:quote.quote.inputFingerprint,rateVersion:quote.quote.rateVersion}}}
  const order=guest('submit_guest_order_v1','order',orderBody)
  check('imported Website SKU creates canonical dummy order',order.ok===true && order.total_amount===100)
  report.connectedOrder={publicReference:order.public_reference,sku:baseline.sku}
  good(db,fs.readFileSync('supabase/prepared/payment_verdict_role_lock_authority.sql','utf8'))
  const orderId=good(db,'select id from public.order_requests where public_reference='+q(order.public_reference)+';')
  const fulfill=(action,body,user=actor,key=randomUUID())=>saved(action,validateFulfillmentCommand(action,body),key,user)
  const payment=(toStatus,user=actor,extra={})=>{
    const state=parsed(good(db,'select jsonb_build_object(\'expectedPaymentStatus\',payment_status,\'expectedUpdatedAt\',updated_at) from public.order_requests where id='+q(orderId)+';'))
    return fulfill('payment_status',{orderRequestId:orderId,toStatus,evidenceNote:'Explicit dummy payment, no real funds',...state,...extra},user)
  }
  check('Staff issues payment instructions for imported-product order',payment('awaiting_instructions').paymentStatus==='awaiting_instructions')
  const proof=parsed(good(db,`begin;set local search_path='';set local role anon;select public.submit_order_payment_receipt_v1(${q(orderId)},${q(orderBody.idempotencyKey)},'Explicit synthetic workflow proof','application/pdf',${q(Buffer.from('%PDF-1.7\nDummy proof, no real payment').toString('base64'))},${q(randomUUID())});reset role;commit;`))
  check('dummy proof is accepted only after instructions',proof.ok===true)
  check('canonical order confirmation preserves imported-product ownership',fulfill('confirm_order',{orderRequestId:orderId,reason:'Explicit dummy order confirmation'}).status==='confirmed')
  check('Staff submits structured dummy payment evidence',payment('evidence_submitted',actor,{paymentMethod:'bank_transfer',paymentAmount:100,paymentCurrency:'PHP',payerName:'Synthetic payer',paymentReference:'SYNTHETIC-IMPORT-PAYMENT',proofAssetRef:proof.receipt_id}).paymentStatus==='evidence_submitted')
  check('independent Admin verifies dummy payment',payment('verified',admin).paymentStatus==='verified')
  const reservationId=good(db,"select id from public.inventory_reservations where order_request_id="+q(orderId)+" and status='active';")
  const packed=fulfill('packing_scan',{orderRequestId:orderId,scannedCode:baseline.sku,reservationId,lotConfirmed:true})
  check('exact original imported SKU and reserved lot pack once',packed.packed_quantity===1 && packed.order_complete===true)
  const handoverKey=randomUUID(),handover={orderRequestId:orderId,handoverNote:'Explicit dummy pickup handover'}
  const delivered=fulfill('fulfill_order',handover,actor,handoverKey)
  check('imported-product order reaches fulfilled',delivered.status==='fulfilled')
  check('same-key handover returns original receipt',isDeepStrictEqual(fulfill('fulfill_order',handover,actor,handoverKey),delivered))
  const final=parsed(good(db,`select jsonb_build_object('physical',(select sum(quantity) from public.product_batches where sku=${q(baseline.sku)}),'reserved',(select sum(reserved_quantity) from public.product_batches where sku=${q(baseline.sku)}),'ownershipEvents',(select count(*) from public.inventory_events where reference_id=${q(orderId)} and event_type='stock_committed'));`))
  check('complete imported chain consumes exactly one unit and one ownership event',final.physical===5 && final.reserved===0 && final.ownershipEvents===1)
  report.connectedOrder={...report.connectedOrder,finalStock:final,scope:'Actual signed native commands and maintained validators; synthetic actor, media registration, payment and physical inventory'}
  if (process.argv.includes('--qualify-writers')) {
    const pair = async (firstSql, secondSql, policyModes = null) => {
      const firstName = 'k2import_first_' + randomUUID(), secondName = 'k2import_second_' + randomUUID()
      let boundary = null
      if (policyModes) {
        const now = Number(good(db, 'select extract(epoch from clock_timestamp());'))
        const edge = (Math.floor(now / 60) + 1) * 60
        console.log(JSON.stringify({ phase:'policy admission at genuine minute edge', secondsUntilAdmission:Math.max(0, edge - now - 0.7) }))
        await new Promise(resolve => setTimeout(resolve, Math.max(1, (edge - now - 0.7) * 1000)))
        boundary = { edge, admissionEpoch:Number(good(db, 'select extract(epoch from clock_timestamp());')) }
        check('policy schedule admits holder in preceding genuine signer minute', Math.floor(boundary.admissionEpoch / 60) === Math.floor(edge / 60) - 1)
      }
      const first = asyncSql('set application_name=' + q(firstName) + ';' + (typeof firstSql === 'function' ? firstSql() : firstSql))
      let held = false
      for (let i = 0; i < 30 && !held; i++) held = good(db, 'select exists(select 1 from pg_stat_activity where datname=' + q(db) + ' and application_name=' + q(firstName) + " and wait_event='PgSleep');") === 't'
      check('actual signed writer has completed its body while retaining transaction locks', held)
      if (boundary) {
        const now = Number(good(db, 'select extract(epoch from clock_timestamp());'))
        if (now < boundary.edge) await new Promise(resolve => setTimeout(resolve, (boundary.edge - now) * 1000 + 30))
        boundary.contenderEpoch = Number(good(db, 'select extract(epoch from clock_timestamp());'))
        check('policy contender uses a distinct genuine signer minute', Math.floor(boundary.contenderEpoch / 60) > Math.floor(boundary.admissionEpoch / 60))
      }
      const second = asyncSql('set application_name=' + q(secondName) + ';' + (typeof secondSql === 'function' ? secondSql() : secondSql))
      let observation = null
      for (let i = 0; i < 30 && !observation; i++) {
        const seen = good(db, 'select jsonb_build_object(\'heldPid\',a.pid,\'waitingPid\',b.pid,\'waitType\',b.wait_event_type,\'waitEvent\',b.wait_event,\'blockingPids\',pg_blocking_pids(b.pid)) from pg_stat_activity a cross join pg_stat_activity b where a.datname=' + q(db) + ' and b.datname=' + q(db) + ' and a.application_name=' + q(firstName) + ' and b.application_name=' + q(secondName) + " and a.wait_event='PgSleep' and b.wait_event_type='Lock' and a.pid=any(pg_blocking_pids(b.pid));")
        if (seen) observation = JSON.parse(seen)
      }
      check('independent contender is observed waiting on the exact held writer PID', observation?.heldPid > 0 && observation?.waitingPid > 0 && observation.waitType === 'Lock' && observation.blockingPids.includes(observation.heldPid))
      if (policyModes) {
        observation.policyLocks = parsed(good(db, `select coalesce(jsonb_agg(jsonb_build_object('pid',pid,'mode',mode,'granted',granted,'classid',classid,'objid',objid,'objsubid',objsubid) order by pid,mode),'[]'::jsonb) from pg_catalog.pg_locks where pid in(${observation.heldPid},${observation.waitingPid}) and locktype='advisory' and classid=1261585232::oid and objid=1347374169::oid and objsubid=2;`))
        check('policy wait is actual advisory contention with exact holder/waiter modes', observation.waitEvent === 'advisory' && observation.policyLocks.some(l => l.pid === observation.heldPid && l.granted && l.mode === policyModes[0]) && observation.policyLocks.some(l => l.pid === observation.waitingPid && !l.granted && l.mode === policyModes[1]))
      }
      const [firstResult, secondResult] = await Promise.all([first, second])
      return { firstResult, secondResult, observation, boundary }
    }
    const fixture = name => {
      const requestId = randomUUID()
      const created = saved('catalog_import_chunk', { ...payload, operationId:randomUUID(), rows:[{ ...payload.rows[0], values:{ ...payload.rows[0].values, name } }] })
      const product = productRead(good(db, 'select id from public.products where sku=' + q(created.rows[0].sku) + ';'))
      const sid = saved('intake_session_create', { requestId, barcode:null, scannedIdentity:'', existingProduct:{ productId:product.id, recordVersion:String(product.catalog_record_version) } }).sessionId
      const candidate = { ...draft, sessionId:sid, requestId, reviewedPayload:{ ...draft.reviewedPayload, product:{ ...draft.reviewedPayload.product, name } } }
      review(sid, candidate)
      const catalog = { ...payload, operationId:randomUUID(), rows:[{ ...payload.rows[0], kind:'update', catalogId:product.catalog_id, sku:product.sku, expectedVersion:product.catalog_record_version, expectedUpdatedAt:product.updated_at, values:{ ...payload.rows[0].values, name, description:'Concurrent catalog correction' } }] }
      const taxonomy = { sku:product.sku, patch:{ brand_id:brand, category_id:category }, expectedUpdatedAt:product.updated_at, reason:'Explicit synthetic concurrent taxonomy assignment' }
      return { product, sid, candidate, catalog, taxonomy }
    }
    report.writerRaces = []
    for (const [kind, name] of [['catalog','Amber lentil'],['taxonomy','Blue cocoa']]) {
      const f = fixture(name), action = kind === 'catalog' ? 'catalog_import_chunk' : 'product_master_update'
      const race = await pair(commandSql(action, f[kind], randomUUID(), admin, 'aal2', 'select pg_sleep(1);'), commandSql('intake_draft', f.candidate))
      const writerResult = race.firstResult, reviewResult = race.secondResult
      check(kind + ' writer commits before queued stale review refuses', writerResult.exit === 0 && reviewResult.exit === 3 && reviewResult.stderr.includes('K2_IMPORTED_DRAFT_VERSION_CONFLICT'))
      check(kind + ' writer winner leaves review unassociated and version advances once', sessionRead(f.sid).product_id === null && Number(productRead(f.product.id).catalog_record_version) === Number(f.product.catalog_record_version) + 1)
      check(kind + ' stale review records no review audit', good(db, "select count(*) from public.audit_logs where record_id=" + q(f.product.id) + " and new_data->>'operation'='REVIEW_IMPORTED_DRAFT';") === '0')
      report.writerRaces.push({ kind, direction:'writer before review', writerExit:writerResult.exit, reviewExit:reviewResult.exit, observation:race.observation })
    }
    for (const [kind, name] of [['catalog','Cedar rice'],['taxonomy','Dahlia pepper']]) {
      const f = fixture(name), race = await pair(commandSql('intake_draft', f.candidate, randomUUID(), actor, 'aal2', 'select pg_sleep(1);'), commandSql(kind === 'catalog' ? 'catalog_import_chunk' : 'product_master_update', f[kind], randomUUID(), admin))
      const result = race.secondResult, reviewedResult = race.firstResult
      check('review commits before queued stale ' + kind + ' writer refuses', reviewedResult.exit === 0 && result.exit === 3 && result.stderr.includes(kind === 'catalog' ? 'K2_CATALOG_STALE_CONFLICT' : 'K2_ADMIN_PRODUCT_VERSION_CONFLICT'))
      check('winning review retains original SKU and one catalog-version change ' + kind, sessionRead(f.sid).product_id === f.product.id && productRead(f.product.id).sku === f.product.sku && Number(productRead(f.product.id).catalog_record_version) === Number(f.product.catalog_record_version) + 1)
      report.writerRaces.push({ kind, direction:'review before writer', reviewExit:reviewedResult.exit, writerExit:result.exit, observation:race.observation })
    }
    const f = fixture('Emerald coffee')
    const stock = { ...inventory, sessionId:f.sid, inventoryRequestId:randomUUID(), inventory:{ ...inventory.inventory, boxCode:'SYN-RACE-BOX', batchCode:'SYN-RACE-LOT' } }
    const race = await pair(commandSql('intake_draft', f.candidate, randomUUID(), actor, 'aal2', 'select pg_sleep(1);'), commandSql('intake_inventory', stock, randomUUID(), admin))
    const stockResult = race.secondResult, reviewResult = race.firstResult
    check('queued first inventory proceeds only after reviewed association commits', reviewResult.exit === 0 && stockResult.exit === 0 && sessionRead(f.sid).product_id === f.product.id)
    const duplicateBefore = fingerprint(), duplicateResult = command('intake_inventory', { ...stock, inventoryRequestId:randomUUID() }, randomUUID(), admin)
    check('second first-inventory request refuses without any committed application mutation', duplicateResult.exit === 3 && duplicateResult.stderr.includes('K2_FIRST_INVENTORY_ALREADY_RECORDED') && isDeepStrictEqual(duplicateBefore, fingerprint()))
    check('queued inventory records exactly six units once', Number(good(db, 'select sum(quantity) from public.product_batches where sku=' + q(f.product.sku) + ';')) === 6)
    report.writerRaces.push({ kind:'inventory', direction:'review before first inventory', reviewExit:reviewResult.exit, inventoryExit:stockResult.exit, duplicateExit:duplicateResult.exit, observation:race.observation })
    const policyRead = () => parsed(good(db, `select jsonb_build_object('minimum',minimum_days,'version',version::text,'events',(select count(*) from k2_private.category_shelf_life_events where category_id=${q(category)})) from k2_private.category_shelf_life_policy where category_id=${q(category)};`))
    const policyPayload = minimumDays => ({ categoryId:category, minimumDays, expectedVersion:policyRead().version, reason:'Explicit synthetic concurrent policy qualification' })
    const signingTables = ['k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets','k2_private.admin_command_receipts']
    const policyTables = ['k2_private.category_shelf_life_policy','k2_private.category_shelf_life_events']
    const unrelatedFilters = (f, policyBefore) => ({
      ...Object.fromEntries(signingTables.map(table => [table,'false'])),
      'public.products':'id is distinct from ' + q(f.product.id),
      'public.product_intake_sessions':'id is distinct from ' + q(f.sid),
      'public.audit_logs':'record_id is distinct from ' + q(f.product.id) + ' and record_id is distinct from ' + q(f.sid),
      'public.product_batches':'sku is distinct from ' + q(f.product.sku),
      'public.batch_change_events':'sku is distinct from ' + q(f.product.sku),
      'public.inventory_balances':'sku is distinct from ' + q(f.product.sku),
      'k2_private.category_shelf_life_policy':'category_id is distinct from ' + q(category),
      // Only the expected new event is excluded; old target-category history remains.
      'k2_private.category_shelf_life_events':'not(category_id=' + q(category) + ' and version=' + (BigInt(policyBefore.version) + 1n) + ')',
    })
    const unrelatedRows = filters => {
      let query = rowsQuery
      for (const [table, condition] of Object.entries(filters)) {
        const [schema, name] = table.split('.'), anchor = ' from ' + qi(schema) + '.' + qi(name) + ' t'
        if (query.split(anchor).length !== 2) throw Error('UNRELATED_ROW_PROJECTION_ANCHOR_DRIFT')
        query = query.replace(anchor, anchor + ' where ' + condition)
      }
      return parsed(good(db,query))
    }
    const conserve = (before, allowed, label) => {
      const after = fingerprint(), changed = after.rows.filter((row, i) => !isDeepStrictEqual(row, before.rows[i])).map(row => row.table)
      check(label + ' retains full metadata and every unrelated application row', before.metadata === after.metadata && changed.every(table => allowed.includes(table)))
      return changed
    }
    for (const policyFirst of [true,false]) {
      const f = fixture(policyFirst ? 'Fennel policy review' : 'Ginger review policy')
      const before = fingerprint(), policyBefore = policyRead(), body = policyPayload(155), policyKey = randomUUID(), reviewKey = randomUUID()
      const filters = unrelatedFilters(f,policyBefore), unrelatedBefore = unrelatedRows(filters)
      const policySql = hold => commandSql('category_policy_set', body, policyKey, admin, 'aal2', hold ? 'select pg_sleep(1.5);' : '')
      const reviewSql = hold => commandSql('intake_draft', f.candidate, reviewKey, actor, 'aal2', hold ? 'select pg_sleep(1.5);' : '')
      const race = await pair(() => policyFirst ? policySql(true) : reviewSql(true), () => policyFirst ? reviewSql(false) : policySql(false), ['ExclusiveLock','ExclusiveLock'])
      check('policy and imported review each commit once in ' + (policyFirst ? 'policy-first' : 'review-first') + ' order', race.firstResult.exit === 0 && race.secondResult.exit === 0)
      const afterPolicy = policyRead(), afterProduct = productRead(f.product.id)
      check('policy/review preserves imported identity and one association/version', sessionRead(f.sid).product_id === f.product.id && afterProduct.sku === f.product.sku && afterProduct.catalog_id === f.product.catalog_id && afterProduct.primary_image_url === f.product.primary_image_url && Number(afterProduct.catalog_record_version) === Number(f.product.catalog_record_version) + 1)
      check('policy/review writes exactly one current policy version/event', afterPolicy.minimum === 155 && BigInt(afterPolicy.version) === BigInt(policyBefore.version) + 1n && afterPolicy.events === policyBefore.events + 1)
      const changedTables = conserve(before, [...signingTables,...policyTables,'public.products','public.product_intake_sessions','public.audit_logs'], 'policy/review')
      const unrelatedAfter = unrelatedRows(filters)
      check('policy/review retains every row outside exact synthetic identities and original event history', isDeepStrictEqual(unrelatedBefore,unrelatedAfter))
      const prior = fingerprint(), result = saved('category_policy_set', body, policyKey, admin)
      const originalReceipt = nativeReceipt((policyFirst ? race.firstResult : race.secondResult).stdout,'categoryId')
      check('genuine saved policy retry retains entire original receipt and exact event', isDeepStrictEqual(result,originalReceipt) && result.version === afterPolicy.version && isDeepStrictEqual(policyRead(),afterPolicy))
      conserve(prior, signingTables, 'saved policy retry')
      refuse('stale policy after imported review refuses', 'category_policy_set', { ...body, reason:'Explicit synthetic stale policy request' }, 'K2_CATEGORY_POLICY_VERSION_CONFLICT', admin)
      report.writerRaces.push({ kind:'policy/review', direction:policyFirst ? 'policy before review' : 'review before policy', firstExit:race.firstResult.exit, secondExit:race.secondResult.exit, boundary:race.boundary, observation:race.observation, changedTables, conservation:{ filters,before:unrelatedBefore,after:unrelatedAfter }, policyBefore, policyAfter:afterPolicy })
    }
    for (const policyFirst of [true,false]) {
      saved('category_policy_set', policyPayload(150), randomUUID(), admin)
      const f = fixture(policyFirst ? 'Hazelnut policy stock' : 'Iris stock policy')
      saved('intake_draft', f.candidate)
      const stock = { ...inventory, sessionId:f.sid, inventoryRequestId:randomUUID(), inventory:{ ...inventory.inventory, boxCode:'SYN-POLICY-' + (policyFirst ? 'FIRST' : 'SECOND'), batchCode:'SYN-POLICY-LOT' } }
      const before = fingerprint(), policyBefore = policyRead(), body = policyPayload(210), policyKey = randomUUID(), stockKey = randomUUID()
      const filters = unrelatedFilters(f,policyBefore), unrelatedBefore = unrelatedRows(filters)
      const policySql = hold => commandSql('category_policy_set', body, policyKey, admin, 'aal2', hold ? 'select pg_sleep(1.5);' : '')
      const stockSql = hold => commandSql('intake_inventory', stock, stockKey, admin, 'aal2', hold ? 'select pg_sleep(1.5);' : '')
      const race = await pair(() => policyFirst ? policySql(true) : stockSql(true), () => policyFirst ? stockSql(false) : policySql(false), policyFirst ? ['ExclusiveLock','ShareLock'] : ['ShareLock','ExclusiveLock'])
      check('policy and first stock each commit once in ' + (policyFirst ? 'policy-first' : 'stock-first') + ' order', race.firstResult.exit === 0 && race.secondResult.exit === 0)
      const state = parsed(good(db, `select jsonb_build_object('physical',(select sum(quantity) from public.product_batches where sku=${q(f.product.sku)}),'reserved',(select sum(reserved_quantity) from public.product_batches where sku=${q(f.product.sku)}),'balance',(select on_hand from public.inventory_balances where sku=${q(f.product.sku)} and location_code='MANILA_MAIN'),'eligible',(select coalesce(sum(case when k2_private.lot_is_eligible_for_category_v1(b,10,statement_timestamp()) then quantity-reserved_quantity else 0 end),0) from public.product_batches b where sku=${q(f.product.sku)}),'stockSources',(select count(*) from public.audit_logs where record_id=${q(f.sid)} and new_data->>'operation'='CREATE_FIRST_INVENTORY_SOURCE'));`))
      check('policy/stock preserves six physical units and one source while stricter current policy excludes sale', state.physical === 6 && state.reserved === 0 && state.balance === 6 && state.eligible === 0 && state.stockSources === 1)
      check('first stock projection reflects the policy admitted before its own command', Number(productRead(f.product.id).stock_available) === (policyFirst ? 0 : 6))
      check('anonymous stock reader excludes prior published imported product under current stricter policy', good(db, 'begin;set local role anon;select stock_from_batches from public.get_public_product_stock() where sku=' + q(baseline.sku) + ';commit;') === '0')
      const afterPolicy = policyRead()
      check('policy/stock retains exact stricter version/event', afterPolicy.minimum === 210 && BigInt(afterPolicy.version) === BigInt(policyBefore.version) + 1n && afterPolicy.events === policyBefore.events + 1)
      const changedTables = conserve(before, [...signingTables,...policyTables,'public.products','public.product_batches','public.batch_change_events','public.inventory_balances','public.product_intake_sessions','public.audit_logs'], 'policy/stock')
      const unrelatedAfter = unrelatedRows(filters)
      check('policy/stock retains every row outside exact synthetic identities and original event history', isDeepStrictEqual(unrelatedBefore,unrelatedAfter))
      const prior = fingerprint(), originalReceipt = nativeReceipt((policyFirst ? race.secondResult : race.firstResult).stdout,'success')
      check('genuine saved first-stock retry retains original receipt', isDeepStrictEqual(saved('intake_inventory',stock,stockKey,admin),originalReceipt))
      conserve(prior, signingTables, 'saved first-stock retry')
      refuse('second policy-qualified first-stock request refuses', 'intake_inventory', { ...stock, inventoryRequestId:randomUUID() }, 'K2_FIRST_INVENTORY_ALREADY_RECORDED', admin)
      report.writerRaces.push({ kind:'policy/inventory', direction:policyFirst ? 'policy before first inventory' : 'first inventory before policy', firstExit:race.firstResult.exit, secondExit:race.secondResult.exit, boundary:race.boundary, observation:race.observation, changedTables, conservation:{ filters,before:unrelatedBefore,after:unrelatedAfter }, stock:state, policyBefore, policyAfter:afterPolicy })
    }
  }
  }
} catch (error) { report.error = error.message; process.exitCode = 1 }
finally {
  const settled = await Promise.allSettled([...pendingSql])
  report.asyncChildrenSettled = pendingSql.size === 0 && settled.every(r => r.status === 'fulfilled') && asyncErrors.length === 0
  if (!report.asyncChildrenSettled) { report.asyncErrors = asyncErrors; process.exitCode = 1 }
  try { if (created) {
    const actual = good('postgres', 'select shobj_description(oid,\'pg_database\') from pg_database where datname=' + q(db) + ';')
    if (actual !== marker) throw Error('CLEANUP_MARKER_MISMATCH')
    good('postgres', 'drop database ' + db + ';'); report.cloneRemoved = true
  } } catch (error) { report.cleanupError = error.message; process.exitCode = 1 }
  if (started) ctl(['stop','-m','fast','-w','-t','20','-D',dir])
  report.mirrorStopped = ctl(['status','-D',dir]) === 3
  const pins = JSON.parse(fs.readFileSync(path.join(root,'native-rehearsal-copy-manifest.json')))
  const original = path.resolve('.tools/current-restore-20260929-pg-data')
  report.originalAllFilesRetained = pins.every(p => { const b = fs.readFileSync(path.join(original,p.Name)); return b.length === p.Bytes && sha(b).toUpperCase() === p.SHA256 })
  report.originalStopped = ctl(['status','-D',original]) === 3
  fs.writeFileSync(path.join(out,'result.json'), JSON.stringify(report,null,2), { flag: 'wx' })
  console.log(JSON.stringify({ out, checks: report.checks.length, failed: report.checks.filter(c => !c.pass).length, error: report.error, cloneRemoved: report.cloneRemoved, mirrorStopped: report.mirrorStopped, originalAllFilesRetained: report.originalAllFilesRetained }))
}
