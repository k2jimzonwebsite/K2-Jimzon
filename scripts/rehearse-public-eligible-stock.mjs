// Owned loopback-only restored-schema clone. Never connects to a provider.
import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { signedAdminCommandArguments } from '../server/admin-bff/security.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const template = 'k2_current_restore_20260929'
const database = `k2_public_stock_20261002_${randomUUID().slice(0, 8)}`
const marker = randomUUID()
const actor = '42000000-0000-4000-8000-000000000051'
const dataDirectory = path.join(root, '.tools/current-restore-20260929-pg-data').replaceAll('\\', '/')
const bin = path.join(root, '.tools/postgresql-17.11/runtime/pgsql/bin')
const beforeFix = process.argv.includes('--before-fix')
const runAdvisors = process.argv.includes('--advisors')
const fullLotInstall = process.argv.includes('--full-lot-install')
if (process.argv.slice(2).some(argument => !['--before-fix','--advisors','--full-lot-install'].includes(argument))) throw new Error('UNKNOWN_ARGUMENT')
if (beforeFix && runAdvisors) throw new Error('ADVISORS_REQUIRE_CANDIDATE')
if (beforeFix && fullLotInstall) throw new Error('FULL_LOT_INSTALL_REQUIRES_ELIGIBLE_PROJECTION')
const evidence = path.join(root, fullLotInstall ? 'docs/evidence/20261002-complete-lot-installation' : 'docs/evidence/20261002-public-eligible-stock')
const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: '54388', PGUSER: 'postgres',
  PGHOSTADDR: '127.0.0.1', PGSSLMODE: 'disable', PGCLIENTENCODING: 'UTF8', PGOPTIONS: '' }
delete env.PGSERVICE
delete env.PGSERVICEFILE
const literal = value => `'${String(value).replaceAll("'", "''")}'`
const manifest = []; const checks = []
const advisors = []
const sha256 = text => createHash('sha256').update(text).digest('hex')
const witnessSha256 = sha256(fs.readFileSync(fileURLToPath(import.meta.url)))
const previousSecret = process.env.K2_ADMIN_BFF_REQUEST_SECRET
const localSecret = randomBytes(32)
process.env.K2_ADMIN_BFF_REQUEST_SECRET = localSecret.toString('base64')
const guard = db => `do $$ begin
 if current_database() is distinct from ${literal(db)} or host(inet_server_addr()) is distinct from '127.0.0.1'
 or inet_server_port() is distinct from 54388
 or replace(current_setting('data_directory'),chr(92),'/') is distinct from ${literal(dataDirectory)}
 then raise exception 'WRONG_LOCAL_TARGET'; end if; end $$;`
function query(db, sql) {
  const file = path.join(root, '.tools', `public-stock-${randomUUID()}.sql`)
  fs.writeFileSync(file, `\\set ON_ERROR_STOP on\n${guard(db)}\n${sql}`, 'utf8')
  try {
    const result = spawnSync(path.join(bin, 'psql.exe'), ['-X', '--no-psqlrc', '-q', '-t', '-A', '-d', db, '-f', file],
      { cwd: root, windowsHide: true, env, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 })
    if (result.error || result.status !== 0) throw new Error(String(result.stderr || result.error?.message).slice(-2500))
    return result.stdout.trim()
  } finally { fs.unlinkSync(file) }
}
const value = sql => query(database, sql).split('\n').at(-1).trim()
function source(file, functionName) {
  const sql = fs.readFileSync(path.join(root, file), 'utf8')
  if (functionName) {
    const start = sql.indexOf(`create or replace function ${functionName}(`)
    const end = sql.indexOf('\n$$;', start)
    if (start < 0 || end < 0) throw new Error('FUNCTION_SOURCE_SCOPE_INVALID')
    const body = sql.slice(start, end + 4)
    manifest.push({ path: file, sha256: sha256(sql), scope: functionName, appliedSha256: sha256(body) })
    return body
  }
  manifest.push({ path: file, sha256: sha256(sql), scope: 'whole source' })
  return sql
}
function check(name, passed, detail = '') {
  checks.push({ name, passed, detail })
  console.log(`[${passed ? 'pass' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`)
}
const fingerprint = db => query(db, `select jsonb_build_object(
 'products',md5(coalesce((select string_agg(to_jsonb(p)::text,'|' order by sku) from public.products p),'')),
 'lots',md5(coalesce((select string_agg(to_jsonb(b)::text,'|' order by id) from public.product_batches b),'')),
 'listings',md5(coalesce((select string_agg(to_jsonb(l)::text,'|' order by id) from public.channel_listings l),'')),
 'events',md5(coalesce((select string_agg(to_jsonb(e)::text,'|' order by id) from public.inventory_events e),'')),
 'functions',md5((select string_agg(pg_get_functiondef(oid)||coalesce(proacl::text,''),'|' order by oid)
 from pg_proc where pronamespace in ('public'::regnamespace,'k2_private'::regnamespace))))::text;`)
const metadata = () => value(`select jsonb_build_object('owner',proowner,'acl',proacl,'config',proconfig,
 'definer',prosecdef,'volatile',provolatile,'returns',prorettype,'set',proretset,
 'language',prolang,'names',proargnames,'modes',proargmodes,'args',proallargtypes,'defaults',proargdefaults::text)::text
 from pg_proc where oid='public.get_public_product_stock()'::regprocedure;`)
const withoutTransaction = sql => sql.replace(/^(begin|commit);\r?$/gmi, '')
function advisor(stage) {
  if (!runAdvisors) return
  const cli = process.env.K2_LOCAL_SUPABASE_CLI
  if (!cli || !fs.existsSync(cli)) throw new Error('EXPLICIT_LOCAL_CLI_REQUIRED')
  if (value(`select marker::text from k2_public_stock_fixture.owner;`) !== marker) throw new Error('CLONE_OWNER_MISMATCH')
  // A separate CLI working directory avoids reading the application's private
  // env files or linked-project metadata for an explicit loopback-only audit.
  const cliDirectory = path.join(root,'.tools/public-stock-cli')
  fs.mkdirSync(path.join(cliDirectory,'supabase'), { recursive: true })
  fs.writeFileSync(path.join(cliDirectory,'supabase/config.toml'), 'project_id="k2-local-public-stock"\n')
  const result = spawnSync(cli, ['db','advisors','--db-url',`postgresql://postgres@127.0.0.1:54388/${database}?sslmode=disable`,
    '--type','all','--fail-on','none','--output','json','--workdir',cliDirectory], { cwd: cliDirectory, windowsHide: true,
    env: { ...env, SUPABASE_HOME: path.join(root,'.tools/listing-stock-cli-home'), SUPABASE_TELEMETRY_DISABLED: '1' },
    encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 })
  fs.mkdirSync(evidence, { recursive: true })
  const report = { stage, cliSha256: sha256(fs.readFileSync(cli)), status: result.status,
    error: result.error?.message, stdout: result.stdout, stderr: result.stderr }
  fs.writeFileSync(path.join(evidence,`advisors-${stage}.json`), JSON.stringify(report,null,2)+'\n')
  advisors.push({ stage, status: result.status, error: result.error?.message,
    report: path.relative(root, path.join(evidence, `advisors-${stage}.json`)).replaceAll('\\', '/') })
  console.log(`[advisor] ${stage}: ${result.status === 0 ? 'completed; findings require classification' : 'unavailable; see retained report'}`)
}
const fixture = (name, options = {}) => {
  const sku = `LOCAL-PUBLIC-${name}`; const lot = randomUUID()
  const { days = 180, quantity = 9, reserved = 2, status = 'available',
    hub = 'HUB-MNL-CENTRAL', custodian = 'CUST-STAFF-ELENA', clearance = false,
    clearanceActor = true, audit = true, auditReason = 'Isolated reviewed clearance',
    productStatus = 'Live', published = true, reviewed = true, price = 100,
    image = 'https://example.invalid/fixture.webp', assigned = true,
    listingStatus = 'Active', publicationStatus = 'ready', validationErrors = [],
    bestBeforeOnly = false, approvalDays = days } = options
  const date = days === null ? 'null' : `(transaction_timestamp() at time zone 'Asia/Manila')::date+${days}`
  query(database, `begin; insert into public.products(sku,name,status,srp,primary_image_url,is_human_reviewed,published)
   values(${literal(sku)},'Isolated public stock',${literal(productStatus)},${price},${literal(image)},${reviewed},${published});
   insert into public.product_batches(id,sku,box_code,batch_code,quantity,quantity_available,reserved_quantity,
    expiry_date,best_before_date,inventory_status,hub,custodian,clearance_approved_at,clearance_approved_by)
   values('${lot}',${literal(sku)},'LOCAL','LOCAL',${quantity},${quantity},${reserved},
    ${bestBeforeOnly ? 'null' : date},${date},${literal(status)},${hub === null ? 'null' : literal(hub)},
    ${custodian === null ? 'null' : literal(custodian)},${clearance ? 'transaction_timestamp()' : 'null'},
    ${clearance && clearanceActor ? literal(actor) : 'null'});
   ${assigned ? `insert into public.channel_listings(sku,channel_source,status,publication_status,validation_errors)
    values(${literal(sku)},'website',${literal(listingStatus)},${literal(publicationStatus)},${literal(JSON.stringify(validationErrors))}::jsonb);` : ''}
   ${clearance && audit ? `insert into public.batch_change_events(batch_id,sku,reason,actor_id,old_data,new_data)
    values('${lot}',${literal(sku)},${literal(auditReason)},'${actor}','{}',jsonb_build_object(
     'clearance_approved',true,'expiry_date',((transaction_timestamp() at time zone 'Asia/Manila')::date+${approvalDays})::text));` : ''}
   commit;`)
  return { sku, lot }
}
const stock = (sku, role = 'anon', timezone = 'Asia/Manila') => Number(value(`begin;
 set local timezone=${literal(timezone)}; set local role ${role};
 select coalesce(sum(stock_from_batches),0) from public.v_product_stock_from_batches where sku=${literal(sku)}; rollback;`))
const staff = `set local timezone='Asia/Manila'; set local role authenticated;
 select set_config('request.jwt.claim.sub','${actor}',true);
 select set_config('request.jwt.claims','{"aal":"aal2"}',true);`
const legacyApproval = (f, approved = true) => query(database, `begin; ${staff}
 select public.set_batch_clearance_approval('${f.lot}',${approved},'Clearance'); commit;`)
const recount = (f, days, status = 'available', quantity = 9) => query(database, `begin; ${staff}
 select public.reconcile_product_batches(${literal(f.sku)},jsonb_build_array(jsonb_build_object(
  'id','${f.lot}','quantity',${quantity},'box_code','LOCAL','batch_code','LOCAL',
  'expiry_date',((transaction_timestamp() at time zone 'Asia/Manila')::date+${days})::text,
  'inventory_status',${literal(status)},'hub','HUB-MNL-CENTRAL','custodian','CUST-STAFF-ELENA')),
  'Isolated clearance invalidation recount'); commit;`)
const currentApproval = f => {
  const command = signedAdminCommandArguments('lot_clearance', actor, randomUUID(),
    { batchId: f.lot, approved: true, reason: 'Isolated current clearance approval' })
  const args = ['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']
    .map(key => literal(command[key])).join(',')
  return query(database, `begin; ${staff} select public.execute_admin_lot_command_v1(${args}); commit;`)
}

let created = false; let original; let failure; let cleanupFailure; let correctionPath
try {
  original = fingerprint(template)
  const creation = spawnSync(path.join(bin, 'createdb.exe'), ['-T', template, database],
    { cwd: root, windowsHide: true, env, encoding: 'utf8', timeout: 30000 })
  if (creation.error || creation.status !== 0) throw new Error(String(creation.stderr || creation.error?.message))
  created = true
  query(database, `create schema k2_public_stock_fixture;
   create table k2_public_stock_fixture.owner(marker uuid not null); insert into k2_public_stock_fixture.owner values('${marker}');`)
  for (const file of ['20260812_canonical_identities.sql', '20260829_channel_vocabulary_and_shops.sql',
    '20260822_admin_channel_readiness_boundary.sql', '20261001065252_admin_signing_null_inputs.sql']) {
    query(database, source(`supabase/migrations/${file}`))
  }
  // The source restore omits original ACLs. Rehearse the reviewed narrow stock
  // contract explicitly; this overlay is not a claim about all restored grants.
  query(database, `revoke all on function public.get_public_product_stock() from public,anon,authenticated;
   grant execute on function public.get_public_product_stock() to anon,authenticated,service_role;
   grant select on public.v_product_stock_from_batches to anon,authenticated,service_role;
   insert into auth.users(id) values('${actor}');
   insert into public.user_profiles(id,role) values('${actor}','Admin')
    on conflict(id) do update set role=excluded.role;
   insert into k2_private.admin_bff_secrets(singleton,request_secret)
    values(true,decode('${localSecret.toString('hex')}','hex'))
    on conflict(singleton) do update set request_secret=excluded.request_secret;`)
  query(database, source('supabase/migrations/20260812_admin_lots_bff_boundary.sql', 'public.execute_admin_lot_command_v1'))
  query(database, `revoke all on function public.execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)
   from public,anon,authenticated;
   grant execute on function public.execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text) to authenticated;`)
  source('server/admin-bff/security.js')
  const beforeMetadata = metadata()
  if (!beforeFix) {
    const files = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(file => /^\d+_public_eligible_website_stock\.sql$/.test(file))
    if (files.length !== 1) throw new Error('PUBLIC_STOCK_CORRECTION_SCOPE_INVALID')
    correctionPath = `supabase/migrations/${files[0]}`
    const correction = source(correctionPath)
    const beforeData = fingerprint(database)
    advisor('before')
    query(database, correction)
    advisor('after')
    const installed = value(`select md5(pg_get_functiondef('public.get_public_product_stock()'::regprocedure));`)
    query(database, correction)
    check('forward correction preserves metadata and is idempotent', metadata() === beforeMetadata
      && value(`select md5(pg_get_functiondef('public.get_public_product_stock()'::regprocedure));`) === installed)
    const afterData = JSON.parse(fingerprint(database)); const priorData = JSON.parse(beforeData)
    delete afterData.functions; delete priorData.functions
    check('installation changes no product, physical lot, listing or inventory event', JSON.stringify(afterData) === JSON.stringify(priorData))
    const currentDefinition = query(database, `select pg_get_functiondef('public.get_public_product_stock()'::regprocedure);`)
    const variants = [
      `drop function public.get_public_product_stock() cascade;`,
      `alter function public.get_public_product_stock() set search_path=public;`,
      `grant execute on function public.get_public_product_stock() to public;`,
      `alter function public.get_public_product_stock() volatile;`,
      `alter function public.get_public_product_stock() owner to anon;`,
      currentDefinition.replace("Asia/Manila", "UTC") + ';',
      `drop table public.custodians cascade;`,
      `create or replace view public.v_product_stock_from_batches with(security_invoker=true)
       as select sku,(stock_from_batches*2)::bigint as stock_from_batches from public.get_public_product_stock();`,
      `create or replace view public.v_product_stock_from_batches with(security_invoker=true)
       as select sku,sum(quantity_available)::bigint as stock_from_batches from public.product_batches group by sku;`,
      `alter view public.v_product_stock_from_batches owner to anon;`,
      `grant select on public.v_product_stock_from_batches to public;`,
      `grant select(sku) on public.v_product_stock_from_batches to public;`,
    ]
    for (let i = 0; i < variants.length; i++) {
      let refused = false
      try { query(database, `begin; ${variants[i]} ${withoutTransaction(correction)} rollback;`) }
      catch (error) { refused = /MAP-018 public stock:/.test(error.message) }
      check(`installation refuses drift variant ${i + 1} without overwriting metadata/body`, refused
        && metadata() === beforeMetadata
        && value(`select md5(pg_get_functiondef('public.get_public_product_stock()'::regprocedure));`) === installed)
    }
  }
  const cases = [
    ['physical-minus-reserved', {}, 7], ['expired', { days: -1 }, 0], ['today', { days: 0 }, 0],
    ['thirty', { days: 30, clearance: true }, 0], ['thirty-one-unapproved', { days: 31 }, 0],
    ['eighty-nine-unapproved', { days: 89 }, 0], ['thirty-one-approved', { days: 31, clearance: true }, 7],
    ['eighty-nine-approved', { days: 89, clearance: true }, 7], ['ninety', { days: 90 }, 7],
    ['unknown-expiry', { days: null }, 0], ['best-before-only', { days: 90, bestBeforeOnly: true }, 7],
    ['all-reserved', { reserved: 9 }, 0], ['damaged', { status: 'damaged' }, 0],
    ['quarantine', { status: 'quarantine' }, 0], ['zero-physical', { quantity: 0, reserved: 0 }, 0],
    ['missing-hub', { hub: null }, 0], ['unknown-hub', { hub: 'UNKNOWN' }, 0],
    ['milan', { hub: 'HUB-MIL-DEPOT', custodian: 'CUST-STAFF-MARCO' }, 0],
    ['cebu-transit', { hub: 'HUB-CEB-TRANSIT' }, 0], ['missing-custodian', { custodian: null }, 0],
    ['unknown-custodian', { custodian: 'UNKNOWN' }, 0], ['wrong-custody', { custodian: 'CUST-STAFF-MARCO' }, 0],
    ['no-membership', { assigned: false }, 0], ['paused-membership', { listingStatus: 'Paused', publicationStatus: 'paused' }, 0],
    ['error-membership', { publicationStatus: 'error' }, 0], ['invalid-membership', { validationErrors: ['Review required'] }, 0],
    ['draft-product', { productStatus: 'Draft' }, 0], ['unpublished-product', { published: false }, 0],
    ['unreviewed-product', { reviewed: false }, 0], ['unpriced-product', { price: 0 }, 0],
    ['missing-photo', { image: '' }, 0], ['unlisted-direct-offer', { productStatus: 'Unlisted', published: false }, 7],
    ['clearance-missing-actor', { days: 45, clearance: true, clearanceActor: false }, 0],
    ['clearance-missing-audit', { days: 45, clearance: true, audit: false }, 0],
    ['clearance-empty-reason', { days: 45, clearance: true, auditReason: '' }, 0],
    ['clearance-legacy-short-reason', { days: 45, clearance: true, auditReason: 'Clearance' }, 7],
    ['clearance-changed-expiry', { days: 45, clearance: true, approvalDays: 46 }, 0],
  ]
  for (const [name, options, expected] of cases) {
    const f = fixture(name, options); const observed = stock(f.sku)
    check(`public stock ${name}`, observed === expected, `expected ${expected}; observed ${observed}`)
  }
  const calendar = fixture('manila-calendar', { days: 90 })
  const otherTimezone = value(`select case when extract(hour from transaction_timestamp() at time zone 'Asia/Manila')>=18
    then 'Pacific/Kiritimati' else 'Etc/GMT+12' end;`)
  check('Manila expiry calendar is independent of caller timezone', stock(calendar.sku, 'anon', otherTimezone) === 7,
    `caller timezone ${otherTimezone}`)
  check('authenticated and service-role reads retain the two-column contract',
    stock(calendar.sku, 'authenticated') === 7 && stock(calendar.sku, 'service_role') === 7
    && value(`select array_agg(attname order by attnum)=array['sku','stock_from_batches']::name[] from pg_attribute
      where attrelid='public.v_product_stock_from_batches'::regclass and attnum>0 and not attisdropped;`) === 't')
  const mixed = fixture('mixed-lots')
  query(database, `insert into public.product_batches(sku,box_code,batch_code,quantity,quantity_available,reserved_quantity,
    expiry_date,best_before_date,inventory_status,hub,custodian)
   values(${literal(mixed.sku)},'LOCAL','LOCAL-EXPIRED',5,5,0,
    (transaction_timestamp() at time zone 'Asia/Manila')::date-1,
    (transaction_timestamp() at time zone 'Asia/Manila')::date-1,'available','HUB-MNL-CENTRAL','CUST-STAFF-ELENA');`)
  check('multi-lot aggregate excludes an ineligible lot without changing physical totals', stock(mixed.sku) === 7
    && value(`select sum(quantity) from public.product_batches where sku=${literal(mixed.sku)};`) === '14')
  const empty = fixture('no-physical-lots')
  query(database, `delete from public.product_batches where id='${empty.lot}';`)
  check('eligible product with no lots has an explicit zero row', value(`begin; set local role anon;
   select count(*)=1 and coalesce(sum(stock_from_batches),-1)=0 from public.v_product_stock_from_batches
   where sku=${literal(empty.sku)}; rollback;`) === 't')
  const expiryChanged = fixture('legacy-expiry-history', { days: 45 })
  legacyApproval(expiryChanged)
  check('actual legacy approval with a short reason makes clearance stock eligible', stock(expiryChanged.sku) === 7)
  recount(expiryChanged, 45, 'available', 11)
  check('quantity-only recount retains valid approval and subtracts reservations', stock(expiryChanged.sku) === 9)
  recount(expiryChanged, 50)
  check('actual legacy expiry change invalidates preserved clearance markers', stock(expiryChanged.sku) === 0)
  recount(expiryChanged, 45)
  check('restoring the original expiry does not revive old approval', stock(expiryChanged.sku) === 0)
  legacyApproval(expiryChanged)
  check('fresh legacy approval restores stock after expiry invalidation', stock(expiryChanged.sku) === 7)
  const dispositionChanged = fixture('legacy-disposition-history', { days: 45 })
  legacyApproval(dispositionChanged)
  recount(dispositionChanged, 45, 'quarantine')
  recount(dispositionChanged, 45)
  check('quarantine and return to available does not revive old approval', stock(dispositionChanged.sku) === 0)
  // Compose the current writer with its actual trigger body only after proving
  // the restored legacy writers. The historical whole migration also rewrites
  // the public view and normalizes every row, so it is deliberately not applied.
  query(database, source('supabase/migrations/20260812_admin_lots_bff_boundary.sql', 'public.sync_product_batch_compat_columns'))
  currentApproval(dispositionChanged)
  check('fresh signed current approval restores stock after disposition invalidation', stock(dispositionChanged.sku) === 7,
    `expected 7; observed ${stock(dispositionChanged.sku)}`)
  const currentAudit = fixture('current-clearance-audit', { days: 45 })
  currentApproval(currentAudit)
  check('actual signed current full-snapshot approval makes clearance stock eligible', stock(currentAudit.sku) === 7,
    `expected 7; observed ${stock(currentAudit.sku)}`)
  check('signed approval evidence remains valid in a different caller timezone', stock(currentAudit.sku, 'anon', otherTimezone) === 7)
  legacyApproval(currentAudit, false)
  check('actual legacy reversal removes clearance eligibility', stock(currentAudit.sku) === 0)
  currentApproval(currentAudit)
  check('fresh signed current approval restores stock after reversal', stock(currentAudit.sku) === 7)
  check('signed clearance writer preserves physical and reserved units', value(`select quantity=9 and reserved_quantity=2
   from public.product_batches where id='${currentAudit.lot}';`) === 't')
  const ambiguous = fixture('same-transaction-clearance', { days: 45 })
  query(database, `begin; ${staff}
   select public.set_batch_clearance_approval('${ambiguous.lot}',true,'Clearance');
   select public.set_batch_clearance_approval('${ambiguous.lot}',false,'Reversal');
   select public.set_batch_clearance_approval('${ambiguous.lot}',true,'Clearance'); commit;`)
  check('same-transaction approval and reversal ambiguity fails closed', stock(ambiguous.sku) === 0)
  currentApproval(ambiguous)
  check('separate-transaction approval recovers ambiguous clearance history', stock(ambiguous.sku) === 7)
  if (fullLotInstall) {
    const publicBoundary = () => value(`select jsonb_build_object(
      'function',pg_get_functiondef('public.get_public_product_stock()'::regprocedure),
      'metadata',${literal(metadata())}::jsonb,
      'view',pg_get_viewdef(c.oid),'owner',c.relowner,'acl',c.relacl,'options',c.reloptions,
      'columns',(select jsonb_agg(jsonb_build_array(attname,atttypid,atttypmod,attacl) order by attnum)
        from pg_attribute where attrelid=c.oid and attnum>0 and not attisdropped))::text
      from pg_class c where c.oid='public.v_product_stock_from_batches'::regclass;`)
    const physical = () => value(`select jsonb_build_object(
      'lots',(select jsonb_agg(jsonb_build_array(id,sku,quantity,reserved_quantity,hub,custodian) order by id) from public.product_batches),
      'balances',(select jsonb_agg(to_jsonb(b) order by sku,location_code) from public.inventory_balances b),
      'events',(select jsonb_agg(to_jsonb(e) order by id) from public.inventory_events e),
      'listings',(select jsonb_agg(to_jsonb(l) order by id) from public.channel_listings l),
      'publication',(select jsonb_agg(jsonb_build_array(sku,status,published) order by sku) from public.products))::text;`)
    const offers = () => value(`select coalesce(jsonb_agg(to_jsonb(v) order by sku),'[]'::jsonb)::text
      from public.v_product_stock_from_batches v;`)
    const beforeBoundary = publicBoundary(), beforePhysical = physical(), beforeOffers = offers()
    const wholeLotMigration = source('supabase/migrations/20260812_admin_lots_bff_boundary.sql')
    query(database, wholeLotMigration)
    check('complete lot installation preserves public helper/view/security metadata', publicBoundary() === beforeBoundary)
    check('complete lot installation preserves physical/reserved/custody/balance/event/listing/publication facts', physical() === beforePhysical)
    check('complete lot installation preserves every eligible Website offer result', offers() === beforeOffers)
    let publicRead = false
    try { publicRead = stock(currentAudit.sku) === 7 && stock(ambiguous.sku) === 7 } catch { /* denial is a failed boundary check */ }
    check('anonymous eligible stock remains readable after complete lot installation', publicRead)
    check('complete lot installation closes legacy authenticated lot writers', value(`select
      not has_function_privilege('authenticated','public.reconcile_product_batches(text,jsonb,text)','EXECUTE')
      and not has_function_privilege('authenticated','public.set_batch_clearance_approval(uuid,boolean,text)','EXECUTE')
      and has_function_privilege('authenticated','public.execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)','EXECUTE');`) === 't')
    let legacyDenied = false
    try { query(database, `begin; ${staff} select public.set_batch_clearance_approval('${currentAudit.lot}',false,'Blocked legacy reversal'); rollback;`) }
    catch (error) { legacyDenied = /permission denied for function set_batch_clearance_approval/.test(error.message) }
    check('complete lot installation denies an actual authenticated legacy command before execution', legacyDenied)
    check('internal lot cache remains independent of Website membership', value(`select stock_available=7 and total_stock=7
      from public.products where sku='LOCAL-PUBLIC-no-membership';`) === 't')
    currentApproval(currentAudit)
    let signedRead = false
    try { signedRead = stock(currentAudit.sku) === 7 } catch { /* readable projected stock is required */ }
    check('signed current lot command composes after whole installation', signedRead)
    query(database, wholeLotMigration)
    check('complete lot installation replay preserves public boundary and physical facts', publicBoundary() === beforeBoundary
      && physical() === beforePhysical && offers() === beforeOffers)
    advisor('complete-lot')
  }
  check('public readers have no private lot or clearance-event table access', value(`select
    not has_table_privilege('anon','public.product_batches','SELECT')
    and not has_table_privilege('anon','public.batch_change_events','SELECT');`) === 't')
} catch (error) { failure = error.message }
finally {
  if (previousSecret === undefined) delete process.env.K2_ADMIN_BFF_REQUEST_SECRET
  else process.env.K2_ADMIN_BFF_REQUEST_SECRET = previousSecret
  if (created) {
    try {
      if (value(`select marker::text from k2_public_stock_fixture.owner;`) !== marker) throw new Error('CLONE_OWNER_MISMATCH')
      const dropped = spawnSync(path.join(bin, 'dropdb.exe'), [database],
        { cwd: root, windowsHide: true, env, encoding: 'utf8', timeout: 30000 })
      if (dropped.error || dropped.status !== 0) throw new Error(String(dropped.stderr || dropped.error?.message))
      check('owned disposable clone removed', query(template, `select not exists(select 1 from pg_database where datname=${literal(database)});`) === 't')
    } catch (error) { cleanupFailure = error.message }
  }
  if (original) {
    try { check('original restore full product/lot/listing/event and function/ACL fingerprint unchanged', fingerprint(template) === original) }
    catch (error) { cleanupFailure = [cleanupFailure, error.message].filter(Boolean).join('; ') }
  }
  fs.mkdirSync(evidence, { recursive: true })
  const result = { recordedAt: new Date().toISOString(), idea: fullLotInstall ? 'IDEA-20261002-07' : 'IDEA-20261002-05', beforeFix, fullLotInstall,
    target: `127.0.0.1:54388/${database}`, template, correctionPath,
    witnessSha256, manifest, advisors, checks,
    passed: checks.filter(check => check.passed).length, failed: checks.filter(check => !check.passed).length,
    failure, cleanupFailure, originalFingerprint: original, cloneOwnedAndRemoved: created && !cleanupFailure,
    limits: 'Local restored-schema SQL with isolated fixtures and reviewed named-grant overlay; no provider write, full writer parity, real custody/count proof or deployment.' }
  fs.writeFileSync(path.join(evidence, beforeFix ? 'original-receipt.json' : 'local-receipt.json'), JSON.stringify(result, null, 2) + '\n')
  console.log(`${result.passed} passed; ${result.failed} failed${failure ? `; ${failure}` : ''}${cleanupFailure ? `; cleanup ${cleanupFailure}` : ''}`)
  if (failure || cleanupFailure || result.failed) process.exitCode = 1
}
