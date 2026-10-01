// Local clone only. Test barriers expose lock order; no provider calls or SQL.
import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { signedAdminCommandArguments } from '../server/admin-bff/security.js'
import { signedRpcArguments } from '../server/storefront-bff/security.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const template = 'k2_current_restore_20260929'
const database = 'k2_website_stock_locks_20261001'
const dataDirectory = path.join(root, '.tools/current-restore-20260929-pg-data').replaceAll('\\', '/')
const bin = path.join(root, '.tools/postgresql-17.11/runtime/pgsql/bin')
const signedHolds = process.argv.includes('--signed-holds')
const evidence = path.join(root, signedHolds ? 'docs/evidence/20261001-signed-purchase-holds' : 'docs/evidence/20261001-website-stock-locks')
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
    if (r.error || r.status !== 0) throw new Error(String(r.stderr || r.error?.message).slice(-3000))
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
async function controller(extraLock = '') {
  const name = `k2_stock_gate_${randomUUID()}`
  const child = spawn(path.join(bin, 'psql.exe'), args(database),
    { cwd: root, windowsHide: true, env, stdio: ['pipe', 'pipe', 'pipe'] })
  sessions.add(child)
  let output = ''; let errors = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { errors += chunk })
  const finished = new Promise(resolve => {
    child.on('error',error => { errors += error.message })
    child.on('close', status => { sessions.delete(child); resolve({ status, output, errors }) })
  })
  pending.add(finished)
  finished.finally(() => pending.delete(finished))
  child.stdin.write(`\\set ON_ERROR_STOP on\nset application_name=${literal(name)}; begin;
    select pg_advisory_xact_lock(61001,5); ${extraLock}\n\\echo GATE_HELD\n`)
  await waitFor(`select exists(select 1 from pg_stat_activity where application_name=${literal(name)}
   and state='idle in transaction');`, 'controller owns gate')
  const echoDeadline = Date.now() + 1000
  while (!output.includes('GATE_HELD') && Date.now() < echoDeadline) await sleep(10)
  if (!output.includes('GATE_HELD')) throw new Error(`CONTROLLER_NOT_READY: ${errors}`)
  return { name, release: async () => {
    child.stdin.end('commit;\n\\q\n')
    const r = await finished
    if (r.status !== 0) throw new Error(`GATE_RELEASE_FAILED: ${r.errors}`)
  } }
}
const checks = []
function check(name, condition, detail = '') {
  if (!condition) throw new Error(`ASSERTION_FAILED: ${name} ${detail}`)
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

let created = false; let templateBefore; let runError
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
if(runError) throw runError
fs.mkdirSync(evidence,{recursive:true})
fs.writeFileSync(path.join(evidence,beforeFix?'before-fix-receipt.json':'local-receipt.json'),`${JSON.stringify({
 capturedAt:new Date().toISOString(),target:`127.0.0.1:54388/${database}`,template,
 scope:signedHolds ? 'Full prepared purchase-hold migration plus actual signed purchase/last-unit/retry on disposable restored-schema clone; no provider or all-writer acceptance'
  : 'Actual prepared function bodies on disposable restored-schema clone; not full migration installation or signed purchase-hold acceptance',
 beforeFix,manifest,checks,providerWrites:false,canonicalSignedHoldIntegration: signedHolds,
 templateUnchanged:true,cloneRemoved:true },null,2)}\n`)
if(beforeFix) { console.error('EXPECTED_BEFORE_FIX_FAILURE: Website/inventory deadlock reproduced'); process.exitCode=1 }
