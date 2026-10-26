// Own disposable PostgreSQL only. No K2 env, credentials or production rows.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawnSync, spawn } from 'node:child_process'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const migration = path.join(root, 'supabase/migrations/20261025_product_sku_merge.sql')
assert.ok(fs.existsSync(migration), 'The signed lot-preserving merge migration is missing')
const captured = JSON.parse(fs.readFileSync(path.join(root, 'docs/acceptance/20261025-sku-merge-schema.json')))
const work = path.join(root, '.tools/sku-merge-rehearsals', randomUUID())
const bin = path.join(root, '.tools/postgresql-17.11/runtime/pgsql/bin')
const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: '55329', PGUSER: 'postgres', PGDATABASE: 'postgres', PGPASSWORD: '', PGOPTIONS: '', PGSSLMODE: 'disable' }
const actor = '11111111-1111-4111-8111-111111111111', category = '22222222-2222-4222-8222-222222222222'
const canonical = 'K2-SKU-001020', source = 'K2-SKU-001021', secret = Buffer.alloc(32, 73), checks = []
const literal = value => "'" + String(value).replaceAll("'", "''") + "'"
fs.mkdirSync(work, { recursive: true })
let started = false, failure, holderCompletion
function run(name, args, options = {}) {
  const r = spawnSync(path.join(bin, name + '.exe'), args, { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 60000, ...options })
  if (r.error || r.status !== 0) throw Error(String(r.stderr || r.stdout || r.error?.message).slice(-4500))
  return String(r.stdout || '').trim()
}
const sql = text => run('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', text])
const session = `set statement_timeout='10s';set lock_timeout='2s';set role authenticated;set k2.staff='on';set k2.admin='on';set request.jwt.claim.sub='${actor}';set request.jwt.claim.aal='aal2';`
const definition = name => captured.functions.find(row => row.name === name).definition
const preview = () => JSON.parse(sql(session + "select public.read_admin_product_sku_merge_v1('borella-prosciutto');").split(/\r?\n/).pop())
function signed(payload, key = randomUUID(), signature) {
  const text = JSON.stringify(payload), timestamp = Math.round(Date.now() / 1000), nonce = randomUUID()
  const hash = createHash('sha256').update(text).digest('hex')
  const mac = signature ?? createHmac('sha256', secret).update(['product_sku_merge', timestamp, nonce, actor, key, hash].join('\n')).digest('hex')
  return `public.execute_admin_product_master_command_v1('product_sku_merge',${timestamp},${literal(nonce)},${literal(key)},${literal(text)},${literal(mac)})`
}
function check(name, query) {
  assert.equal(sql(query).split(/\r?\n/).filter(Boolean).pop(), 't', name)
  checks.push(name); console.log('[ok]', name)
}
const refusal = (call, message) => `do $$ begin perform ${call};raise exception 'UNEXPECTED_SUCCESS';exception when others then if sqlerrm <> '${message}' then raise;end if;end $$;select true;`
const payload = state => ({ groupId: 'borella-prosciutto', expectedStateHash: state.stateHash, reason: 'Owner-confirmed same sellable item' })
try {
  run('initdb', ['-D', path.join(work, 'data'), '-U', 'postgres', '--auth=trust', '--encoding=UTF8'])
  run('pg_ctl', ['-D', path.join(work, 'data'), '-l', path.join(work, 'postgres.log'), '-o', `-p ${env.PGPORT} -h 127.0.0.1`, '-w', 'start'], { stdio: 'ignore' }); started = true
  sql(`create schema extensions;create extension pgcrypto with schema extensions;create schema auth;create schema k2_private;
    create role anon nologin;create role authenticated nologin;create role service_role nologin;
    grant usage on schema public,auth,extensions to anon,authenticated;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.jwt.claim.aal',true))$$;
    create function public.is_admin() returns boolean language sql stable as $$select current_setting('k2.admin',true)='on'$$;
    create function public.is_staff() returns boolean language sql stable as $$select current_setting('k2.staff',true)='on'$$;
    create table k2_private.admin_bff_secrets(singleton boolean primary key,request_secret bytea);
    insert into k2_private.admin_bff_secrets values(true,decode('${secret.toString('hex')}','hex'));
    create table k2_private.admin_request_rate_buckets(scope text,subject text,bucket_start timestamptz,hit_count int,primary key(scope,subject,bucket_start));
    create table k2_private.admin_request_nonces(actor_id uuid,action text,nonce uuid,expires_at timestamptz,verified_backend_pid int,verified_transaction_id xid8,primary key(actor_id,action,nonce));
    create table k2_private.admin_command_receipts(actor_id uuid,action text,idempotency_key uuid,payload_hash text,result jsonb,created_at timestamptz default now(),completed_at timestamptz,primary key(actor_id,action,idempotency_key));
    create table k2_private.product_master_events(id bigint generated always as identity primary key,actor_id uuid not null,action text not null check(action in ('product_master_update','product_master_status')),request_id uuid not null,sku text not null,reason text not null,before_state jsonb not null,after_state jsonb not null,created_at timestamptz not null default now(),unique(actor_id,action,request_id,sku));
    create table k2_private.website_listing_events(id bigint generated always as identity primary key,actor_id uuid not null,request_id uuid not null,sku text not null,assigned boolean not null,reason text not null,before_state jsonb not null,after_state jsonb not null,created_at timestamptz not null default now(),unique(actor_id,request_id));
    create table k2_private.category_policy_command_config(singleton boolean primary key,maximum_depth int);insert into k2_private.category_policy_command_config values(true,10);
    create table k2_private.category_lot_command_context(backend_pid int,transaction_id xid8,actor_id uuid,maximum_depth int,evaluation_instant timestamptz,authority_kind text,guest_nonce uuid,primary key(backend_pid,transaction_id));
    create table k2_private.category_shelf_life_policy(category_id uuid,minimum_days int);
    create table public.categories(id uuid,parent_id uuid);insert into public.categories values('${category}',null);
    create table public.hubs(id text,country text);insert into public.hubs values('HUB-MNL-CENTRAL','PH');
    create table public.custodians(id text,hub_id text);insert into public.custodians values('owner','HUB-MNL-CENTRAL');`)
  // Complete captured columns for each touched/dependency table; enums are text
  // in this synthetic fixture. Actual compatibility triggers run unchanged.
  const tables = ['products','product_batches','inventory_balances','batch_change_events','channel_listings','inventory_reservations','order_request_items','orders','product_family_members','staff_allocations','consignment_items','product_intake_sessions','po_lines']
  const parents = captured.related[0].jsonb_build_object.columns
  for (const table of [...tables, 'order_requests','consignments','purchase_orders']) {
    const columns = (tables.includes(table) ? captured.columns : parents).filter(c => c.table_name === table)
    assert.ok(columns.length, table)
    const type = c => c.data_type === 'USER-DEFINED' ? 'text' : c.data_type === 'ARRAY' ? 'text[]' : c.data_type
    sql(`create table public.${table}(${columns.map(c => '"'+c.column_name+'" '+type(c)
      + (table === 'inventory_balances' && c.column_name === 'available' ? ' generated always as (greatest(on_hand-reserved-damaged-expired-unaccounted,0)) stored' : '')).join(',')});`)
  }
  sql(`alter table public.products add primary key(id);alter table public.products add unique(sku);alter table public.product_batches add primary key(id);alter table public.inventory_balances add primary key(sku,location_code);
    ${definition('verify_admin_bff_request')};${definition('execute_admin_product_master_command_v1')};
    revoke all on function k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text) from public,anon,authenticated;
    grant execute on function public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text) to authenticated;`)
  for (const name of ['lock_category_policy_v1','start_category_lot_context_v1','current_category_lot_context_v1','clear_category_lot_context_v1','effective_category_minimum_v1','lot_is_eligible_for_category_v1']) sql(definition(name))
  for (const trigger of captured.triggers.filter(t => ['products','product_batches'].includes(t.relation))) sql(trigger.function_definition + ';' + trigger.definition + ';')
  sql(`set k2.allow_stock_write='on';insert into public.products(id,sku,name,brand_id,category_id,net_weight,unit_of_measure,package_type,size,status,published,stock_available,total_stock,catalog_record_version)
    select gen_random_uuid(),s,'Synthetic same package','${category}','${category}',250,'g','bag','250 g','Live',true,case when s='${canonical}' then 42 when s='${source}' then 22 else 0 end,case when s='${canonical}' then 42 when s='${source}' then 22 else 0 end,1 from unnest(array['${canonical}','K2-SKU-001019','${source}']) s;
    insert into public.inventory_balances(sku,location_code,on_hand,reserved,in_transit,damaged,expired,unaccounted,updated_at) select sku,'MANILA_MAIN',total_stock,0,0,0,0,0,now() from public.products;
    insert into public.channel_listings(id,sku,channel_source,status,publication_status,updated_at)select gen_random_uuid(),sku,'website','Active','published',now() from public.products;
    begin;set k2.staff='on';set request.jwt.claim.sub='${actor}';set request.jwt.claim.aal='aal2';set lock_timeout='2s';set statement_timeout='10s';select k2_private.lock_category_policy_v1(false);select k2_private.start_category_lot_context_v1(10);
    insert into public.product_batches(id,sku,quantity,reserved_quantity,quantity_available,box_code,batch_code,expiry_date,best_before_date,hub,custodian,inventory_status,unit_cost,owner_code,source_type,created_at,updated_at)
      select gen_random_uuid(),sku,total_stock,0,total_stock,'SYNTHETIC-BOX','SYNTHETIC-BOX',current_date+365,current_date+365,'HUB-MNL-CENTRAL','owner','available',12.5,'owner','opening_balance',now(),now() from public.products where total_stock>0;
    select k2_private.clear_category_lot_context_v1();commit;`)
  sql("update public.products set is_human_reviewed=true,primary_image_url='https://example.test/synthetic.webp',srp=99;update public.channel_listings set validation_errors='[]'::jsonb;")
  const before = sql('select jsonb_agg(to_jsonb(b)-\'sku\'-\'updated_at\' order by id) from public.product_batches b;')
  const migrationBody = fs.readFileSync(migration,'utf8').replace(/^[\s\S]*?\bbegin;/i,'').replace(/commit;\s*$/i,'')
  assert.throws(()=>sql(`begin;alter table k2_private.website_listing_events drop constraint website_listing_events_actor_id_request_id_key;${migrationBody};rollback;`),/K2_SKU_MERGE_WEBSITE_AUDIT_DRIFT/)
  checks.push('missing original Website audit uniqueness refuses the whole migration')
  const auditHolderName='sku-audit-ddl-holder-'+randomUUID()
  const auditHolder=spawn(path.join(bin,'psql.exe'),['-X','-q','-v','ON_ERROR_STOP=1','-c',`begin;lock table k2_private.website_listing_events in access exclusive mode;select pg_sleep(5);rollback;`],{cwd:root,env:{...env,PGAPPNAME:auditHolderName},windowsHide:true,stdio:'pipe'})
  let auditHolderOutput='';auditHolder.stderr.on('data',x=>{auditHolderOutput+=x})
  holderCompletion=new Promise(resolve=>{auditHolder.on('error',error=>resolve({code:-1,error:error.message}));auditHolder.on('exit',code=>resolve({code,error:auditHolderOutput}))})
  let auditLocked=false
  for(let attempt=0;attempt<60;attempt++){
    auditLocked=sql(`select exists(select 1 from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name=${literal(auditHolderName)} and l.relation='k2_private.website_listing_events'::regclass and l.mode='AccessExclusiveLock' and l.granted);`)==='t'
    if(auditLocked)break
    await new Promise(resolve=>setTimeout(resolve,25))
  }
  assert.ok(auditLocked,'competing audit DDL lock must be observed')
  assert.throws(()=>sql(`begin;set local lock_timeout='2s';set local statement_timeout='10s';${migrationBody};rollback;`),/could not obtain lock/)
  const auditHolderResult=await holderCompletion;assert.equal(auditHolderResult.code,0,auditHolderResult.error)
  check('competing audit DDL refuses before inspecting or replacing its constraint',"select count(*)=1 from pg_constraint where conrelid='k2_private.website_listing_events'::regclass and conname='website_listing_events_actor_id_request_id_key' and pg_get_constraintdef(oid)='UNIQUE (actor_id, request_id)';")
  run('psql', ['-X','-q','-v','ON_ERROR_STOP=1','-f',migration])
  const initial = preview(); assert.equal(initial.blocker, null)
  check('unready canonical website listing refuses', `begin;update public.channel_listings set publication_status='error' where sku='${canonical}';` + session + refusal(signed(payload(initial)), 'K2_SKU_MERGE_BLOCKED') + 'rollback;')
  check('unknown source lifecycle refuses', `begin;update public.products set status='Unexpected' where sku='${source}';` + session + refusal(signed(payload(initial)), 'K2_SKU_MERGE_BLOCKED') + 'rollback;')
  check('Staff cannot merge', session + "set k2.admin='off';" + refusal(signed(payload(initial)), 'K2_ADMIN_REQUIRED'))
  check('AAL1 cannot merge', session + "set request.jwt.claim.aal='aal1';" + refusal(signed(payload(initial)), 'K2_ADMIN_REQUIRED'))
  check('invalid signature refuses', session + refusal(signed(payload(initial), randomUUID(), '0'.repeat(64)), 'K2_ADMIN_SIGNATURE_INVALID'))
  check('unknown group refuses', session + refusal(signed({ ...payload(initial), groupId: 'arbitrary' }), 'K2_SKU_MERGE_INVALID'))
  check('stale preview refuses atomically', session + refusal(signed({ ...payload(initial), expectedStateHash: '0'.repeat(64) }), 'K2_SKU_MERGE_VERSION_CONFLICT'))
  for (const [name, mutate] of [
    ['active reservation', `insert into public.inventory_reservations(id,sku,status)values(gen_random_uuid(),'${source}','active');`],
    ['stock allocation', `insert into public.staff_allocations(id,sku,stock)values(gen_random_uuid(),'${source}',1);`],
    ['family membership', `insert into public.product_family_members(product_id)select id from public.products where sku='${source}';`],
    ['active order', `with o as(insert into public.order_requests(id,status)values(gen_random_uuid(),'submitted')returning id)insert into public.order_request_items(id,sku,order_request_id)select gen_random_uuid(),'${source}',id from o;`],
    ['incomplete package identity', `update public.products set size=null where sku='${source}';`],
  ]) check(name + ' refuses without changing lots', 'begin;' + mutate + session + refusal(signed(payload(initial)), 'K2_SKU_MERGE_BLOCKED') + 'rollback;')
  // Hold a real uncommitted dependency insertion. The merge must refuse its
  // NOWAIT table lock, leave no receipt/stock changes, and observe the row after
  // the other writer commits. No timing-only race assumption.
  const holderName='sku-merge-holder-'+randomUUID()
  const holder=spawn(path.join(bin,'psql.exe'),['-X','-q','-v','ON_ERROR_STOP=1','-c',`begin;insert into public.inventory_reservations(id,sku,status)values(gen_random_uuid(),'${source}','active');select pg_sleep(5);commit;`],{cwd:root,env:{...env,PGAPPNAME:holderName},windowsHide:true,stdio:'pipe'})
  let holderOutput='';holder.stderr.on('data',x=>{holderOutput+=x})
  holderCompletion=new Promise(resolve=>{holder.on('error',error=>resolve({code:-1,error:error.message}));holder.on('exit',code=>resolve({code,error:holderOutput}))})
  let locked=false
  for(let attempt=0;attempt<60;attempt++){
    locked=sql(`select exists(select 1 from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name=${literal(holderName)} and l.relation='public.inventory_reservations'::regclass and l.mode='RowExclusiveLock' and l.granted);`)==='t'
    if(locked)break
    await new Promise(resolve=>setTimeout(resolve,25))
  }
  assert.ok(locked,'real dependency writer lock must be observed before merge')
  check('concurrent dependency insertion refuses without waiting or partial merge',session+`do $$begin perform ${signed(payload(initial))};raise exception 'UNEXPECTED_SUCCESS';exception when lock_not_available then null;end $$;reset role;select not exists(select 1 from k2_private.admin_command_receipts where action='product_sku_merge');`)
  const holderResult=await holderCompletion;assert.equal(holderResult.code,0,holderResult.error)
  check('committed concurrent reservation is observed and refused',session+refusal(signed(payload(initial)),'K2_SKU_MERGE_BLOCKED'))
  sql('delete from public.inventory_reservations;')
  assert.equal(sql('select jsonb_agg(to_jsonb(b)-\'sku\'-\'updated_at\' order by id) from public.product_batches b;'),before)
  const key = randomUUID(), call = signed(payload(initial), key)
  check('signed merge conserves 64 units in canonical SKU', session + `select (${call}->>'quantity')::int=64;`)
  check('exact lost-reply retry returns the original receipt', session + `select (${signed(payload(initial), key)}->>'quantity')::int=64;`)
  check('one Website audit per source retains the real shared request without retry duplicates', `select count(*)=2 and count(distinct sku)=2 and bool_and(request_id='${key}') from k2_private.website_listing_events;`)
  check('same request and same SKU cannot duplicate a Website audit', `do $$begin insert into k2_private.website_listing_events(actor_id,request_id,sku,assigned,reason,before_state,after_state,created_at) select actor_id,request_id,sku,assigned,reason,before_state,after_state,created_at from k2_private.website_listing_events limit 1;raise exception 'UNEXPECTED_SUCCESS';exception when unique_violation then null;end $$;select true;`)
  check('same key with altered body refuses', session + refusal(signed({ ...payload(initial), reason: 'Different decision bytes' }, key), 'K2_ADMIN_IDEMPOTENCY_CONFLICT'))
  assert.equal(sql('select jsonb_agg(to_jsonb(b)-\'sku\'-\'updated_at\' order by id) from public.product_batches b;'), before)
  check('all original lot IDs and metadata remain', `select count(*)=2 and sum(quantity)=64 and bool_and(sku='${canonical}') from public.product_batches;`)
  check('source rows remain discontinued with no Website assignment', "select count(*)=2 and bool_and(status='Discontinued' and published=false and stock_available=0) from public.products where sku<>'"+canonical+"';")
  check('balances and product projections conserve physical and sellable totals', `select (select sum(on_hand) from public.inventory_balances)=64 and (select on_hand from public.inventory_balances where sku='${canonical}')=64 and (select stock_available from public.products where sku='${canonical}')=64;`)
  check('one audit and one receipt, original snapshots retained', "select (select count(*) from k2_private.product_sku_merge_events)=1 and (select count(*) from k2_private.admin_command_receipts where action='product_sku_merge')=1;")
  check('a new request cannot merge the group twice', session + refusal(signed(payload(initial)), 'K2_SKU_MERGE_ALREADY_RECORDED'))
  check('command context is cleared', 'select not exists(select 1 from k2_private.category_lot_command_context);')
} catch (error) { failure = error; console.error(error.message); process.exitCode = 1 }
finally {
  if(holderCompletion)await holderCompletion
  if (started) run('pg_ctl', ['-D',path.join(work,'data'),'-m','fast','-w','stop'])
  fs.writeFileSync(path.join(work,'receipt.json'),JSON.stringify({ status: failure ? 'failed' : 'passed',checks,error:failure?.message,stopped:started,scope:'isolated synthetic rows/Auth; captured real verifier and product/lot triggers; no production or full provider claim' },null,2))
  console.log('Receipt:',path.join(work,'receipt.json'))
}
