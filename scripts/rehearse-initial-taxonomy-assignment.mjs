// IDEA-20261005-07 / MAP-018. Exact owned loopback restore; clone only.
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { spawn, spawnSync } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { signedAdminCommandArguments } from '../server/admin-bff/security.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outRelative = process.argv[2]
if (!/^docs\/evidence\/20261006-initial-taxonomy-assignment\/native-[0-9]{2}$/.test(outRelative || '')) {
  throw new Error('EXCLUSIVE_ARCHIVE_REQUIRED')
}
const out = path.join(root, outRelative)
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.mkdirSync(out, { recursive: false })
const scriptBytes = fs.readFileSync(fileURLToPath(import.meta.url))
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(out, 'executed-witness.mjs'))

const uuid = randomUUID()
const marker = `K2 initial taxonomy assignment:${uuid}`
const database = `k2_taxonomy_${uuid.replaceAll('-', '')}`
const template = 'k2_current_restore_20260929'
const baseMigrationPath = 'supabase/migrations/20260822_admin_product_master_boundary.sql'
const baseMigrationSha256 = '6b0c0bba69533fb813d8460363767c7058119433afab13a6059532fc639f1979'
const baseMasterBodySha256 = '07a353c7e9dcb09e41e784bdfb096dbc0a12fbfce98fc59f0ff6ef6602e0368a'
const actor = '42000000-0000-4000-8000-000000000051'
const dataDirectory = path.join(root, '.tools/current-restore-20260929-pg-data').replaceAll('\\', '/')
const bin = path.join(root, '.tools/postgresql-17.11/runtime/pgsql/bin')
const psql = path.join(bin, 'psql.exe')
const pgctl = path.join(bin, 'pg_ctl.exe')
const postgres = path.join(bin, 'postgres.exe')
const pgcontroldata = path.join(bin, 'pg_controldata.exe')
const env = {
  ...process.env,
  PGHOST: '127.0.0.1', PGHOSTADDR: '127.0.0.1', PGPORT: '54388', PGUSER: 'postgres',
  PGSSLMODE: 'disable', PGCLIENTENCODING: 'UTF8', PGOPTIONS: '',
}
delete env.PGSERVICE
delete env.PGSERVICEFILE

const report = {
  idea: 'IDEA-20261005-07',
  map: 'MAP-018',
  scope: 'Prepared initial taxonomy overlay and signed Admin Product Master on one disposable clone of the exact owned local restore.',
  providerWrites: false,
  projectRefUsed: false,
  database,
  template,
  marker,
  scriptSha256: createHash('sha256').update(scriptBytes).digest('hex'),
  sources: [],
  checks: [],
  cloneRemoved: null,
  templateUnchanged: null,
  runtime: { startedHere: false, stopped: false, listenerAfterStop: null },
}

const literal = value => `'${String(value).replaceAll("'", "''")}'`
const identifier = value => `"${String(value).replaceAll('"', '""')}"`
const sha256 = value => createHash('sha256').update(value).digest('hex')
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)
const previousSecret = process.env.K2_ADMIN_BFF_REQUEST_SECRET
const localSecret = randomBytes(32)
process.env.K2_ADMIN_BFF_REQUEST_SECRET = localSecret.toString('base64')
const tempSql = new Set()
let startAttempted = false
let startedHere = false
let created = false
let marked = false
let failure = null
let cleanupFailure = null
let directProcess = null

function run(executable, args, label, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: root, env, encoding: 'utf8', windowsHide: true,
    timeout: options.timeout ?? 90000, maxBuffer: options.maxBuffer ?? 16 * 1024 * 1024,
    ...options,
  })
  if (result.error || result.status !== 0) {
    const tail = String(result.stderr || result.stdout || result.error?.message || '').trim().slice(-1000)
    throw new Error(`${label}:${result.status ?? 'no-status'}:${tail || 'no diagnostic'}`)
  }
  return String(result.stdout || '').trim()
}

function pgctlStatus() {
  return spawnSync(pgctl, ['-D', dataDirectory, 'status'], {
    cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 15000,
  })
}

function clusterState() {
  const result = spawnSync(pgcontroldata, [dataDirectory], {
    cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 15000,
  })
  if (result.error || result.status !== 0) return null
  return String(result.stdout || '').match(/Database cluster state:\s+(.+)/)?.[1]?.trim() ?? null
}

function startDirectPostgres() {
  return new Promise((resolve, reject) => {
    const child = spawn(postgres, ['-D', dataDirectory, '-p', '54388', '-h', '127.0.0.1'], {
      cwd: root, env, detached: true, windowsHide: true, stdio: 'ignore',
    })
    directProcess = child
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolve(child)
    })
  })
}

function portOpen() {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port: 54388 })
    let settled = false
    const finish = value => { if (!settled) { settled = true; socket.destroy(); resolve(value) } }
    socket.setTimeout(750, () => finish(false))
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
  })
}

const guard = db => `do $guard$ begin
 if current_database() is distinct from ${literal(db)} or current_user is distinct from 'postgres'
    or inet_server_addr() is distinct from '127.0.0.1'::inet or inet_server_port() is distinct from 54388
    or replace(current_setting('data_directory'),chr(92),'/') is distinct from ${literal(dataDirectory)}
 then raise exception 'K2_TAXONOMY_WRONG_LOCAL_TARGET'; end if;
end $guard$;\n`

function query(db, sql, { timeout = 90000, guarded = true } = {}) {
  const file = path.join(root, '.tools', `taxonomy-command-${randomUUID()}.sql`)
  tempSql.add(file)
  fs.writeFileSync(file, `${guarded ? guard(db) : ''}${sql}\n`, 'utf8')
  try {
    return run(psql, ['-h', '127.0.0.1', '-p', '54388', '-U', 'postgres', '-d', db,
      '-X', '--no-psqlrc', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-f', file],
    `psql-${db}`, { timeout })
  } finally {
    if (fs.existsSync(file)) fs.unlinkSync(file)
    tempSql.delete(file)
  }
}

function check(name, passed, detail = '') {
  report.checks.push({ name, passed: !!passed, ...(detail ? { detail } : {}) })
  console.log(`[${passed ? 'pass' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`)
  if (!passed) throw new Error(`CHECK_FAILED:${name}`)
}

function metadata(db) {
  const raw = query(db, `select jsonb_build_object(
    'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text,'config',p.proconfig,
    'securityDefiner',p.prosecdef,'volatility',p.provolatile,'kind',p.prokind,
    'language',l.lanname,'identity',pg_get_function_identity_arguments(p.oid),
    'result',pg_get_function_result(p.oid),
    'bodySha256',encode(extensions.digest(convert_to(p.prosrc,'UTF8'),'sha256'),'hex'))::text
    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid='public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure;`)
  return JSON.parse(raw)
}

function productMasterSources(db) {
  const raw = query(db, `select coalesce(jsonb_agg(jsonb_build_object(
    'identityArgs',pg_catalog.pg_get_function_identity_arguments(p.oid),
    'argumentTypes',(select jsonb_agg(pg_catalog.format_type(a.type_oid,null) order by a.ordinality)
      from unnest(p.proargtypes) with ordinality a(type_oid,ordinality)),
    'result',pg_catalog.pg_get_function_result(p.oid),
    'owner',pg_catalog.pg_get_userbyid(p.proowner),'acl',p.proacl::text,
    'securityDefiner',p.prosecdef,'searchPath',p.proconfig)
    order by pg_catalog.pg_get_function_identity_arguments(p.oid)),'[]'::jsonb)::text
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='execute_admin_product_master_command_v1';`)
  return JSON.parse(raw)
}

function rowMap(db) {
  const names = JSON.parse(query(db, `select coalesce(jsonb_agg(format('%I.%I',n.nspname,c.relname)
    order by n.nspname,c.relname),'[]'::jsonb)::text from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','k2_private','storage','auth') and c.relkind in ('r','p');`))
  const values = names.map(name => `(${literal(name)},
    (select count(*)::text from ${name}),
    (select md5(coalesce(string_agg(to_jsonb(x)::text,E'\\n' order by to_jsonb(x)::text),'')) from ${name} x))`).join(',')
  return JSON.parse(query(db, `select coalesce(jsonb_object_agg(table_name,
    jsonb_build_object('rows',row_count,'md5',row_hash) order by table_name),'{}'::jsonb)::text
    from (values ${values}) rows(table_name,row_count,row_hash);`))
}

function schemaHash(db) {
  const capture = fs.readFileSync(path.join(root, 'supabase/current_install_state_capture.sql'), 'utf8')
  return sha256(query(db, capture))
}

function dataState(db) {
  return { schemaSha256: schemaHash(db), tables: rowMap(db) }
}

function product(db, sku) {
  const raw = query(db, `select to_jsonb(p)::text from public.products p where p.sku=${literal(sku)};`)
  return JSON.parse(raw.split(/\r?\n/).filter(Boolean).at(-1))
}

function signedRequest(payload, key = randomUUID()) {
  return { key, payload, args: signedAdminCommandArguments('product_master_update', actor, key, payload) }
}

function commandSql(args) {
  const ordered = ['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']
    .map(key => literal(args[key])).join(',')
  return `select set_config('request.jwt.claim.sub',${literal(actor)},false);
    select set_config('request.jwt.claims','{"aal":"aal2"}',false);
    set role authenticated;
    select public.execute_admin_product_master_command_v1(${ordered})::text;`
}

function executeSigned(args) {
  const output = query(database, commandSql(args))
  return JSON.parse(output.split(/\r?\n/).filter(Boolean).at(-1))
}

function requireRefusal(name, sku, pair, expectedError, expectedUpdatedAt = null) {
  const before = rowMap(database)
  const payload = {
    sku,
    patch: { brand_id: pair.brand, category_id: pair.category },
    expectedUpdatedAt: expectedUpdatedAt ?? product(database, sku).updated_at,
    reason: `Synthetic taxonomy refusal ${name}`,
  }
  const request = signedRequest(payload)
  let errorCode = null
  try { executeSigned(request.args) } catch (error) {
    errorCode = expectedError.split('|').find(code => String(error.message).includes(code)) || null
  }
  const after = rowMap(database)
  check(`${name} refuses with intended signed error and complete table rollback`,
    errorCode !== null && same(before, after), errorCode || 'refusal code or complete rollback missing')
}

async function main() {
  if (!fs.existsSync(path.join(dataDirectory, 'PG_VERSION'))
      || !fs.existsSync(psql) || !fs.existsSync(pgctl) || !fs.existsSync(postgres)
      || !fs.existsSync(pgcontroldata)) {
    throw new Error('OWNED_RUNTIME_FILES_MISSING')
  }
  const initialStatus = pgctlStatus()
  if (initialStatus.status === 0) throw new Error('OWNED_RUNTIME_ALREADY_RUNNING')
  if (await portOpen()) throw new Error('OWNED_PORT_ALREADY_IN_USE')
  report.runtime.clusterStateBefore = clusterState()
  check('owned PostgreSQL restore is cleanly shut down before startup',
    report.runtime.clusterStateBefore === 'shut down', report.runtime.clusterStateBefore || 'unavailable')
  startAttempted = true
  report.runtime.launcher = 'workspace postgres.exe direct start'
  directProcess = await startDirectPostgres()
  startedHere = true
  report.runtime.startedHere = true
  report.runtime.pid = directProcess.pid
  const startDeadline = Date.now() + 60000
  let runtimeReady = false
  while (Date.now() < startDeadline) {
    if (directProcess.exitCode !== null) {
      throw new Error(`OWNED_RUNTIME_PROCESS_EXIT:${directProcess.exitCode}`)
    }
    if (await portOpen()) {
      try {
        query('postgres', 'select 1;')
        runtimeReady = true
        break
      } catch (error) {
        if (!String(error.message).includes('database system is starting up')) throw error
      }
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  if (!runtimeReady) throw new Error('OWNED_RUNTIME_READY_TIMEOUT')
  check('owned PostgreSQL started on the exact isolated runtime', pgctlStatus().status === 0 && await portOpen())

  query('postgres', `select 1;`)
  const templateExists = query('postgres', `select count(*) from pg_catalog.pg_database where datname=${literal(template)};`)
  check('exact captured restore template exists', templateExists === '1')
  const templateBefore = dataState(template)
  report.templateBefore = { schemaSha256: templateBefore.schemaSha256, tables: templateBefore.tables }
  report.productMasterSourceCandidates = productMasterSources(template)
  check('captured restore does not already contain the MAP-020 Product Master boundary',
    report.productMasterSourceCandidates.length === 0, JSON.stringify(report.productMasterSourceCandidates))
  check('fresh isolated clone name does not exist',
    query('postgres', `select count(*) from pg_catalog.pg_database where datname=${literal(database)};`) === '0')

  query('postgres', `create database ${identifier(database)} with template ${identifier(template)};`)
  created = true
  query('postgres', `comment on database ${identifier(database)} is ${literal(marker)};`)
  marked = true
  check('clone owner and UUID marker verified',
    query('postgres', `select pg_get_userbyid(datdba)||'|'||shobj_description(oid,'pg_database')
      from pg_catalog.pg_database where datname=${literal(database)};`) === `postgres|${marker}`)

  const baseMigration = fs.readFileSync(path.join(root, baseMigrationPath), 'utf8')
  const baseMigrationHash = sha256(baseMigration)
  fs.copyFileSync(path.join(root, baseMigrationPath), path.join(out, 'executed-product-master-boundary.sql'))
  report.sources.push({ path: baseMigrationPath, sha256: baseMigrationHash })
  check('clone-only MAP-020 base migration matches its reviewed full-source pin',
    baseMigrationHash === baseMigrationSha256, baseMigrationHash)
  query(database, baseMigration)
  const baseSources = productMasterSources(database)
  check('clone-only base migration installs the exact signed Admin master and event table',
    baseSources.some(candidate => candidate.argumentTypes?.join(',') === 'text,bigint,uuid,uuid,text,text')
      && query(database, `select to_regclass('k2_private.product_master_events') is not null;`) === 't',
    JSON.stringify(baseSources))

  const candidatePath = 'supabase/prepared/product_master_initial_taxonomy_assignment.sql'
  const candidate = fs.readFileSync(path.join(root, candidatePath), 'utf8')
  const candidateHash = sha256(candidate)
  fs.copyFileSync(path.join(root, candidatePath), path.join(out, 'executed-overlay.sql'))
  report.sources.push({ path: candidatePath, sha256: candidateHash })
  const beforeMaster = metadata(database)
  check('clone master source matches overlay pin',
    beforeMaster.bodySha256 === baseMasterBodySha256)
  query(database, candidate)
  const afterMaster = metadata(database)
  const stableBefore = { ...beforeMaster, bodySha256: null }
  const stableAfter = { ...afterMaster, bodySha256: null }
  check('overlay changes only exact product-master body and retains metadata/ACL',
    afterMaster.bodySha256 !== beforeMaster.bodySha256 && same(stableBefore, stableAfter),
    `owner=${afterMaster.owner}; acl=${afterMaster.acl}`)
  report.productMasterBefore = beforeMaster
  report.productMasterAfter = afterMaster

  const existingTaxonomy = JSON.parse(query(database, `select jsonb_build_object(
    'brands',(select coalesce(jsonb_agg(id::text order by id),'[]'::jsonb)
      from (select id from public.brands order by id limit 2) b),
    'categories',(select coalesce(jsonb_agg(id::text order by id),'[]'::jsonb)
      from (select id from public.categories order by id limit 2) c))::text;`))
  report.canonicalOptionCountsBeforeFixtures = {
    brands: existingTaxonomy.brands.length,
    categories: existingTaxonomy.categories.length,
  }
  const syntheticBrandIds = Array.from({ length: Math.max(0, 2 - existingTaxonomy.brands.length) }, () => randomUUID())
  const syntheticCategoryIds = Array.from({ length: Math.max(0, 2 - existingTaxonomy.categories.length) }, () => randomUUID())
  const fixtureStatements = []
  if (syntheticBrandIds.length) {
    fixtureStatements.push(`insert into public.brands(id,name,origin_country) values ${syntheticBrandIds
      .map((id,index) => `(${literal(id)}::uuid,${literal(`K2 synthetic taxonomy brand ${index + 1}`)},null)`).join(',')};`)
  }
  if (syntheticCategoryIds.length) {
    fixtureStatements.push(`insert into public.categories(id,name,parent_id) values ${syntheticCategoryIds
      .map((id,index) => `(${literal(id)}::uuid,${literal(`K2 synthetic taxonomy category ${index + 1}`)},null)`).join(',')};`)
  }
  if (fixtureStatements.length) query(database, fixtureStatements.join('\n'))
  report.syntheticCanonicalOptions = {
    scope: 'Clone-only fixtures; they are not owner-approved taxonomy values and were removed with the clone.',
    brands: syntheticBrandIds.map((id,index) => ({ id, name: `K2 synthetic taxonomy brand ${index + 1}` })),
    categories: syntheticCategoryIds.map((id,index) => ({ id, name: `K2 synthetic taxonomy category ${index + 1}` })),
  }
  const taxonomy = JSON.parse(query(database, `select jsonb_build_object(
    'brands',(select coalesce(jsonb_agg(id::text order by id),'[]'::jsonb) from (select id from public.brands order by id limit 2) b),
    'categories',(select coalesce(jsonb_agg(id::text order by id),'[]'::jsonb) from (select id from public.categories order by id limit 2) c))::text;`))
  check('clone has two canonical brand/category options for assignment and reassignment cases',
    taxonomy.brands?.length === 2 && taxonomy.categories?.length === 2)
  const initial = { brand: taxonomy.brands[0], category: taxonomy.categories[0] }
  const alternative = { brand: taxonomy.brands[1], category: taxonomy.categories[1] }
  report.canonicalOptionCounts = JSON.parse(query(database, `select jsonb_build_object(
    'brands',(select count(*) from public.brands),'categories',(select count(*) from public.categories))::text;`))

  const suffix = uuid.replaceAll('-', '').slice(0, 12).toUpperCase()
  const fixtures = Object.fromEntries(['eligible','existing','non-draft','published','raw-stock','batch','balance','event']
    .map(name => [name, `TAX${suffix}-${name.toUpperCase().replaceAll('-', '_')}`]))
  const inventoryEventId = randomUUID()
  const lotId = randomUUID()
  const fixtureSql = `begin;
    insert into auth.users(id) values(${literal(actor)}) on conflict(id) do nothing;
    insert into public.user_profiles(id,role) values(${literal(actor)},'Admin')
      on conflict(id) do update set role='Admin';
    insert into k2_private.admin_bff_secrets(singleton,request_secret)
      values(true,decode('${localSecret.toString('hex')}','hex'))
      on conflict(singleton) do update set request_secret=excluded.request_secret;
    insert into public.products(sku,name,status,published,is_human_reviewed,srp,primary_image_url,
      brand_id,category_id,stock_available,total_stock) values
      (${literal(fixtures.eligible)},'Synthetic taxonomy eligible','Draft',false,false,1,'https://example.invalid/taxonomy.webp',null,null,0,0),
      (${literal(fixtures.existing)},'Synthetic taxonomy existing IDs','Draft',false,false,1,'https://example.invalid/taxonomy.webp',${literal(initial.brand)},${literal(initial.category)},0,0),
      (${literal(fixtures['non-draft'])},'Synthetic taxonomy non-Draft','Active',false,false,1,'https://example.invalid/taxonomy.webp',null,null,0,0),
      (${literal(fixtures.published)},'Synthetic taxonomy published','Live',true,false,1,'https://example.invalid/taxonomy.webp',null,null,0,0),
      (${literal(fixtures['raw-stock'])},'Synthetic taxonomy raw stock','Draft',false,false,1,'https://example.invalid/taxonomy.webp',null,null,0,0),
      (${literal(fixtures.batch)},'Synthetic taxonomy batch','Draft',false,false,1,'https://example.invalid/taxonomy.webp',null,null,0,0),
      (${literal(fixtures.balance)},'Synthetic taxonomy balance','Draft',false,false,1,'https://example.invalid/taxonomy.webp',null,null,0,0),
      (${literal(fixtures.event)},'Synthetic taxonomy event','Draft',false,false,1,'https://example.invalid/taxonomy.webp',null,null,0,0);
    insert into public.product_batches(id,sku,box_code,batch_code,quantity,quantity_available,reserved_quantity,
      expiry_date,best_before_date,inventory_status,hub,custodian)
      values(${literal(lotId)},${literal(fixtures.batch)},'TAXONOMY-TEST','TAXONOMY-TEST',1,0,0,
      current_date+365,current_date+365,'damaged',null,null);
    insert into public.inventory_balances(sku,location_code,on_hand,reserved)
      values(${literal(fixtures.balance)},'MANILA_MAIN',1,0);
    insert into public.inventory_events(sku,location_code,event_type,quantity,reference_type,reference_id)
      values(${literal(fixtures.event)},'MANILA_MAIN','received',1,'taxonomy_fixture',${literal(inventoryEventId)}::uuid);
    commit;`
  query(database, fixtureSql)
  query(database, `begin;
    set local session_replication_role='replica';
    update public.products set stock_available=1,total_stock=1 where sku=${literal(fixtures['raw-stock'])};
    commit;`)
  report.rawStockFixture = 'A deliberately inconsistent synthetic compatibility counter, injected only in the disposable clone with triggers disabled for this single transaction; no batch, balance, or event rows exist for this SKU.'
  const fixtureShapes = JSON.parse(query(database, `select jsonb_build_object(
    'eligible',(select status='Draft' and published=false and stock_available=0 and total_stock=0
      and brand_id is null and category_id is null from public.products where sku=${literal(fixtures.eligible)}),
    'existing',(select brand_id=${literal(initial.brand)}::uuid and category_id=${literal(initial.category)}::uuid
      from public.products where sku=${literal(fixtures.existing)}),
    'nonDraft',(select status<>'Draft' and published=false and stock_available=0 and total_stock=0
      from public.products where sku=${literal(fixtures['non-draft'])}),
    'published',(select published=true from public.products where sku=${literal(fixtures.published)}),
    'rawStock',(select stock_available=1 and total_stock=1
      and not exists(select 1 from public.product_batches where sku=${literal(fixtures['raw-stock'])})
      and not exists(select 1 from public.inventory_balances where sku=${literal(fixtures['raw-stock'])})
      and not exists(select 1 from public.inventory_events where sku=${literal(fixtures['raw-stock'])})
      from public.products where sku=${literal(fixtures['raw-stock'])}),
    'batch',(select count(*)=1 from public.product_batches where sku=${literal(fixtures.batch)})
      and (select stock_available=0 and total_stock=0 from public.products where sku=${literal(fixtures.batch)}),
    'balance',(select count(*)=1 and bool_and(on_hand=1 and reserved=0)
      from public.inventory_balances where sku=${literal(fixtures.balance)})
      and (select stock_available=0 and total_stock=0 from public.products where sku=${literal(fixtures.balance)}),
    'event',(select count(*)=1 from public.inventory_events where sku=${literal(fixtures.event)})
      and (select stock_available=0 and total_stock=0 from public.products where sku=${literal(fixtures.event)}))::text;`))
  check('synthetic clone fixtures meet each intended eligibility/refusal shape', Object.values(fixtureShapes).every(Boolean))
  report.fixtureShapes = fixtureShapes

  const eligibleBefore = product(database, fixtures.eligible)
  const payload = {
    sku: fixtures.eligible,
    patch: { brand_id: initial.brand, category_id: initial.category },
    expectedUpdatedAt: eligibleBefore.updated_at,
    reason: 'Synthetic initial canonical taxonomy assignment on isolated clone',
  }
  const request = signedRequest(payload)
  const beforeAssignment = rowMap(database)
  const assignedResult = executeSigned(request.args)
  const afterAssignment = rowMap(database)
  const assignedProduct = product(database, fixtures.eligible)
  check('signed eligible Draft receives the selected existing brand/category',
    assignedProduct.brand_id === initial.brand && assignedProduct.category_id === initial.category
      && assignedProduct.status === 'Draft' && assignedProduct.published === false
      && assignedProduct.stock_available === 0 && assignedProduct.total_stock === 0)
  const allowedTables = new Set(['public.products','k2_private.product_master_events',
    'k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets',
    'k2_private.admin_command_receipts'])
  const changedTables = Object.keys(beforeAssignment).filter(table => !same(beforeAssignment[table], afterAssignment[table]))
  check('signed assignment changes only product, master event, and signed-command verification tables',
    changedTables.length > 0 && changedTables.every(table => allowedTables.has(table)), changedTables.join(', '))
  const masterEvent = JSON.parse(query(database, `select jsonb_build_object('count',count(*),
    'reason',bool_and(reason=${literal(payload.reason)}),
    'beforeUnassigned',bool_and(before_state->>'brand_id' is null and before_state->>'category_id' is null),
    'afterBrand',bool_and(after_state->>'brand_id'=${literal(initial.brand)}),
    'afterCategory',bool_and(after_state->>'category_id'=${literal(initial.category)}),
    'requestMatches',bool_and(request_id=${literal(request.key)}::uuid))::text
    from k2_private.product_master_events where actor_id=${literal(actor)}::uuid
      and action='product_master_update' and request_id=${literal(request.key)}::uuid
      and sku=${literal(fixtures.eligible)};`))
  check('one reasoned master event records the initial assignment and signed request', masterEvent.count === 1
    && masterEvent.reason === true && masterEvent.beforeUnassigned === true
    && masterEvent.afterBrand === true && masterEvent.afterCategory === true
    && masterEvent.requestMatches === true)
  const receipt = JSON.parse(query(database, `select jsonb_build_object('count',count(*),
    'payloadHash',bool_and(payload_hash=${literal(createHash('sha256').update(request.args.p_payload_text).digest('hex'))}),
    'completed',bool_and(completed_at is not null))::text from k2_private.admin_command_receipts
    where actor_id=${literal(actor)}::uuid and action='product_master_update'
      and idempotency_key=${literal(request.key)}::uuid;`))
  check('signed assignment persists its exact payload receipt', receipt.count === 1
    && receipt.payloadHash === true && receipt.completed === true)
  report.assignment = { productId: assignedProduct.id, sku: fixtures.eligible,
    brandId: initial.brand, categoryId: initial.category, result: assignedResult,
    changedTables, masterEvent, receipt }

  const beforeConsumedNonceReplay = rowMap(database)
  let consumedNonceError = null
  try { executeSigned(request.args) } catch (error) {
    consumedNonceError = String(error.message).includes('K2_ADMIN_REQUEST_REPLAYED')
      ? 'K2_ADMIN_REQUEST_REPLAYED' : null
  }
  check('reusing a consumed signed nonce refuses with complete rollback',
    consumedNonceError === 'K2_ADMIN_REQUEST_REPLAYED'
      && same(beforeConsumedNonceReplay, rowMap(database)), consumedNonceError || 'nonce refusal or rollback missing')

  const retryRequest = signedRequest(payload, request.key)
  const beforeSavedReceiptRetry = rowMap(database)
  const retryResult = executeSigned(retryRequest.args)
  const afterSavedReceiptRetry = rowMap(database)
  const retryChangedTables = Object.keys(beforeSavedReceiptRetry)
    .filter(table => !same(beforeSavedReceiptRetry[table], afterSavedReceiptRetry[table]))
  const retryVerificationTables = new Set(['k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets'])
  const retryProtectedTables = ['public.products','k2_private.product_master_events','k2_private.admin_command_receipts']
  const retryProtectedUnchanged = retryProtectedTables.every(table =>
    same(beforeSavedReceiptRetry[table], afterSavedReceiptRetry[table]))
  check('freshly signed same-key retry returns the saved result without another product/event/receipt mutation',
    same(assignedResult, retryResult) && retryProtectedUnchanged
      && retryChangedTables.length > 0 && retryChangedTables.every(table => retryVerificationTables.has(table)),
    retryChangedTables.join(', '))
  report.savedReceiptRetry = { result: retryResult, changedTables: retryChangedTables,
    productEventReceiptUnchanged: retryProtectedUnchanged }
  requireRefusal('stale product version', fixtures.eligible, initial,
    'K2_ADMIN_PRODUCT_VERSION_CONFLICT', eligibleBefore.updated_at)
  requireRefusal('existing taxonomy IDs cannot be reassigned', fixtures.existing, alternative,
    'K2_PRODUCT_TAXONOMY_INITIAL_ONLY')
  requireRefusal('non-Draft product cannot receive initial taxonomy', fixtures['non-draft'], initial,
    'K2_PRODUCT_TAXONOMY_INITIAL_ONLY')
  requireRefusal('published product cannot receive initial taxonomy', fixtures.published, initial,
    'K2_PRODUCT_TAXONOMY_INITIAL_ONLY')
  requireRefusal('nonzero raw product stock blocks initial taxonomy', fixtures['raw-stock'], initial,
    'K2_PRODUCT_TAXONOMY_INITIAL_ONLY')
  requireRefusal('existing batch blocks initial taxonomy', fixtures.batch, initial,
    'K2_PRODUCT_TAXONOMY_INITIAL_ONLY')
  requireRefusal('nonzero inventory balance blocks initial taxonomy', fixtures.balance, initial,
    'K2_PRODUCT_TAXONOMY_INITIAL_ONLY')
  requireRefusal('inventory event history blocks initial taxonomy', fixtures.event, initial,
    'K2_PRODUCT_TAXONOMY_INITIAL_ONLY')
}

try {
  await main()
} catch (error) {
  failure = error.message
  report.failure = error.message.split(':')[0]
  process.exitCode = 1
  console.error(`[failed] ${report.failure}`)
} finally {
  if (created) {
    try {
      const exactMarker = query('postgres', `select pg_get_userbyid(datdba)||'|'||coalesce(shobj_description(oid,'pg_database'),'')||'|'||
        (select count(*) from pg_catalog.pg_stat_activity where datname=${literal(database)})
        from pg_catalog.pg_database where datname=${literal(database)};`)
      if (!marked || exactMarker !== `postgres|${marker}|0`) throw new Error('CLONE_DISPOSAL_REFUSED')
      query('postgres', `drop database ${identifier(database)};`)
      report.cloneRemoved = query('postgres', `select count(*) from pg_catalog.pg_database where datname=${literal(database)};`) === '0'
      check('UUID-marked clone removed', report.cloneRemoved)
    } catch (error) { cleanupFailure = error.message.split(':')[0] }
  }
  if (report.templateBefore) {
    try {
      const templateAfter = dataState(template)
      report.templateAfter = { schemaSha256: templateAfter.schemaSha256, tables: templateAfter.tables }
      report.templateUnchanged = same(report.templateBefore, report.templateAfter)
      check('original restore template schema and all row maps unchanged', report.templateUnchanged)
    } catch (error) { cleanupFailure = [cleanupFailure, error.message.split(':')[0]].filter(Boolean).join('; ') }
  } else {
    report.templateComparison = 'not-reached-before-database-became-query-ready'
  }
  if (startAttempted) {
    try {
      if (pgctlStatus().status === 0 || await portOpen()) {
        run(pgctl, ['-D', dataDirectory, '-m', 'fast', '-w', 'stop'], 'owned-runtime-stop', { timeout: 60000, stdio: 'ignore' })
      }
      report.runtime.clusterStateAfterStop = clusterState()
      report.runtime.stopped = pgctlStatus().status !== 0 && !(await portOpen())
        && report.runtime.clusterStateAfterStop === 'shut down'
      report.runtime.listenerAfterStop = await portOpen()
      if (startedHere) {
        check('owned PostgreSQL stopped with no 54388 listener', report.runtime.stopped && !report.runtime.listenerAfterStop)
      }
    } catch (error) { cleanupFailure = [cleanupFailure, error.message.split(':')[0]].filter(Boolean).join('; ') }
  }
  for (const file of tempSql) if (fs.existsSync(file)) fs.unlinkSync(file)
  if (previousSecret === undefined) delete process.env.K2_ADMIN_BFF_REQUEST_SECRET
  else process.env.K2_ADMIN_BFF_REQUEST_SECRET = previousSecret

  report.checksPassed = report.checks.filter(item => item.passed).length
  report.checksFailed = report.checks.filter(item => !item.passed).length
  report.cleanupFailure = cleanupFailure
  report.error = failure
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
  if (cleanupFailure) process.exitCode = 1
  console.log(JSON.stringify({
    database: report.database,
    passed: report.checksPassed,
    failed: report.checksFailed,
    cloneRemoved: report.cloneRemoved,
    runtimeStopped: report.runtime.stopped,
    listenerAfterStop: report.runtime.listenerAfterStop,
    templateUnchanged: report.templateUnchanged,
    failure: report.failure ?? null,
    cleanupFailure,
    evidence: `${outRelative}/result.json`,
  }, null, 2))
}
