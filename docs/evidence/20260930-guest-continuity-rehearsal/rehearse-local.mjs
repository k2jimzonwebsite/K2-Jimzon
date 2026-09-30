// Local rollback-only witness; never reads credentials or connects to Supabase.
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { signedRpcArguments } from '../../../server/storefront-bff/security.js'

const root = process.cwd()
const database = 'k2_current_restore_20260929'
const psql = path.join(root, '.tools/postgresql-17.11/runtime/pgsql/bin/psql.exe')
const assemblyPath = path.join(root, '.tools/current-production-backups/guest-current-20260929-rollback.sql')
const assembly = fs.readFileSync(assemblyPath, 'utf8')
const hash = createHash('sha256').update(assembly).digest('hex').toUpperCase()
if (hash !== '18F9D58BA00797461FA19FE0BC0C0DF4AF0B9F2B3506023BAC8E1485DC7F741B') throw new Error('ASSEMBLY_CHANGED')
if (!/rollback;\s*$/i.test(assembly)) throw new Error('ROLLBACK_MARKER_MISSING')
const boundary = fs.readFileSync(path.join(root,'supabase/migrations/20260812_guest_submission_boundary.sql'),'utf8')
const boundaryHash = createHash('sha256').update(boundary).digest('hex')
const preserveLegacy = process.argv.includes('--preserve-legacy')
const withDependencies = process.argv.includes('--with-dependencies')
const installationSteps = [
  'supabase/migrations/20260812_guest_account_identity_and_messaging.sql',
  'supabase/map019_identity_postflight.sql',
  'supabase/map020_guest_boundary_preflight.sql',
  'supabase/migrations/20260812_guest_submission_boundary.sql',
  'supabase/map020_guest_boundary_postflight.sql',
  'supabase/migrations/20260822_guest_account_claim_boundary.sql',
  'supabase/map019_account_claim_postflight.sql',
  'supabase/migrations/20260825_storefront_customer_auth_boundary.sql',
  'supabase/map020_storefront_auth_rate_postflight.sql',
  'supabase/migrations/20260831_guest_order_status_boundary.sql',
  'supabase/migrations/20260924_customer_account_settings_notifications.sql',
  'supabase/migrations/20260828_store_conversation_origin.sql',
  'supabase/migrations/20260822_wholesale_inquiry_boundary.sql',
  'supabase/map019_wholesale_inquiry_postflight.sql',
  'supabase/migrations/20260902_delivery_quote_control.sql',
  'supabase/migrations/20260902_delivery_guest_quote_boundary.sql',
  'supabase/migrations/20260912_guest_order_conversation_seed.sql',
  'supabase/migrations/20260916_automated_delivery_quotation.sql',
]
const dependencySources = withDependencies ? installationSteps.map(file => ({ path: file, sql: fs.readFileSync(path.join(root,file),'utf8') })) : []
const dependencyManifest = dependencySources.map(({path: file,sql}) => ({path: file,sha256:createHash('sha256').update(sql).digest('hex')}))
const installation = dependencySources.map(({path: file,sql}) => `-- STEP ${file}\n${sql
  .replace(/^(begin(?: transaction read only)?|commit|rollback);\r?$/gmi,'')
  .replace(/^\\set ON_ERROR_STOP on\r?$/gm,'')}`).join('\n')
const legacyConversation = randomUUID()
const withModeration = process.argv.includes('--with-moderation')
if (withDependencies && withModeration) throw new Error('INSTALLATION_AND_CUTOVER_MUST_BE_SEPARATE')
const withOrigin = withDependencies || withModeration || process.argv.includes('--with-origin')
const origin = withOrigin ? fs.readFileSync(path.join(root,'supabase/migrations/20260828_store_conversation_origin.sql'),'utf8') : ''
const originHash = withOrigin ? createHash('sha256').update(origin).digest('hex') : null
const moderation = withModeration ? fs.readFileSync(path.join(root,'supabase/migrations/20260922_anonymous_chat_moderation.sql'),'utf8') : ''
const moderationHash = withModeration ? createHash('sha256').update(moderation).digest('hex') : null
const moderationBody = withModeration ? moderation.slice(0,moderation.lastIndexOf('commit;')).replace('begin;','') : ''
const body = boundary.slice(0,boundary.lastIndexOf('commit;')).replace('begin;','')
const from = '-- STEP supabase/migrations/20260812_guest_submission_boundary.sql'
const until = '-- STEP supabase/map020_guest_boundary_postflight.sql'
const startIndex = assembly.indexOf(from)
const endIndex = assembly.indexOf(until,startIndex)
if (startIndex < 0 || endIndex < startIndex) throw new Error('ASSEMBLY_STEP_MISSING')
const candidate = withDependencies ? `begin;\n${installation}\nrollback;` : assembly.slice(0,startIndex)+from+'\n'+body+'\n'+assembly.slice(endIndex)
const key = randomBytes(32)
process.env.K2_GUEST_BFF_SECRET = key.toString('base64')
const token = 'a'.repeat(64)
const fakeCustomer = randomUUID()
const req = cookie => ({ headers: { cookie }, socket: { remoteAddress: '127.0.0.1' } })
const startPayload = (message, surface = 'storefront') => ({ customerName: 'Continuity fixture', email: 'continuity@example.test', phone: '',
  message, idempotencyKey: randomUUID(), origin: surface })
const sqlLiteral = value => value === null || value === undefined ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const rpc = (name, action, payload, cookie) => {
  const args = signedRpcArguments(req(cookie), action, payload)
  return `public.${name}(${['p_timestamp', 'p_nonce', 'p_payload_text', 'p_ip_hash', 'p_signature', 'p_guest_grant_hash'].map(k => sqlLiteral(args[k])).join(',')})`
}
const validCookie = `k2_guest_access=${token}`
const fixtureSku = `LOCAL${randomUUID().slice(0,8)}`
const orderPayload = { customerName:'Order continuity fixture',email:'order-continuity@example.test',phone:'',
  address:'Isolated local fixture',fulfillmentMethod:'Courier delivery',note:'',items:[{sku:fixtureSku,quantity:1}],
  idempotencyKey:randomUUID(),couponCode:'' }
const orderCall = rpc('submit_guest_order_v1','order',orderPayload,validCookie)
const orderReplay = rpc('submit_guest_order_v1','order',orderPayload,validCookie)
const dependencyWitness = withDependencies ? `
do $surface$
declare v_name text; v_function regprocedure; v_anon boolean;
begin
  foreach v_name in array array['submit_guest_order_v1','submit_guest_pasabuy_v1','preview_guest_coupon_v1',
    'start_guest_conversation_v1','list_guest_conversations_v1','append_guest_message_v1','read_guest_order_status_v1',
    'quote_guest_delivery_v1','submit_wholesale_inquiry_v1','claim_guest_customer_account_v1',
    'list_customer_account_history_v1','append_customer_account_message_v1','read_customer_account_settings_v1',
    'save_customer_account_settings_v1','read_customer_account_notification_v1','consume_storefront_customer_auth_rate_v1'] loop
    select p.oid::regprocedure into v_function from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=v_name;
    v_anon := v_name not in ('claim_guest_customer_account_v1','list_customer_account_history_v1',
      'append_customer_account_message_v1','read_customer_account_settings_v1','save_customer_account_settings_v1','read_customer_account_notification_v1');
    if v_function is null or not exists(select 1 from pg_proc where oid=v_function and prosecdef
      and 'search_path=""'=any(proconfig))
      or has_function_privilege('anon',v_function,'EXECUTE') is distinct from v_anon
      or has_function_privilege('authenticated',v_function,'EXECUTE') is distinct from (not v_anon or v_name='quote_guest_delivery_v1')
      or exists(select 1 from pg_proc p,lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        where p.oid=v_function and a.grantee=0 and a.privilege_type='EXECUTE') then
      raise exception 'SIGNED_ROUTE_SURFACE_INVALID: %',v_name;
    end if;
  end loop;
  if (select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'acl',p.proacl::text) order by p.oid::regprocedure::text)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
    ('submit_order_request','submit_order_request_v2','submit_pasabuy_request','validate_coupon','get_storefront_chat_v1','submit_storefront_chat_v1'))
    is distinct from (select acl from legacy_rpc_baseline) then raise exception 'LEGACY_PRODUCTION_RPC_GRANTS_CHANGED'; end if;
end $surface$;
insert into public.products(sku,name,status,srp) values('${fixtureSku}','Local rollback fixture','Live',100);
set local role anon;
insert into fixture_receipts select 'order',to_jsonb(r) from ${orderCall} r;
insert into fixture_receipts select 'order-replay',to_jsonb(r) from ${orderReplay} r;
insert into fixture_receipts select 'order-history',to_jsonb(r) from ${rpc('read_guest_order_status_v1','guest_read',{},validCookie)} r;
insert into fixture_receipts select 'order-thread',to_jsonb(r) from ${rpc('list_guest_conversations_v1','guest_read',{},validCookie)} r;
insert into fixture_receipts select 'order-missing',to_jsonb(r) from ${rpc('read_guest_order_status_v1','guest_read',{},'')} r;
insert into fixture_receipts select 'order-different',to_jsonb(r) from ${rpc('read_guest_order_status_v1','guest_read',{},`k2_guest_access=${'b'.repeat(64)}`)} r;
insert into fixture_receipts select 'fresh-order',to_jsonb(r) from ${rpc('submit_guest_order_v1','order',{...orderPayload,email:'fresh-order@example.test',idempotencyKey:randomUUID()},'')} r;
reset role;
do $order$
declare v_order jsonb; v_history jsonb; v_thread uuid;
begin
  select result into v_order from fixture_receipts where label='order';
  if (v_order->>'ok')::boolean is distinct from true then raise exception 'SIGNED_ORDER_FAILED'; end if;
  if exists(select 1 from fixture_receipts where label in ('order-missing','order-different') and
    ((result->>'ok')::boolean is distinct from false or result->'orders'<>'[]'::jsonb)) then raise exception 'UNSCOPED_ORDER_HISTORY_EXPOSED'; end if;
  if not exists(select 1 from fixture_receipts where label='fresh-order'
    and (result->>'ok')::boolean=true and result->>'guest_grant_token' ~ '^[0-9a-f]{64}$') then raise exception 'FRESH_ORDER_GRANT_MISSING'; end if;
  if (select result from fixture_receipts where label='order-replay') is distinct from v_order then raise exception 'SIGNED_ORDER_REPLAY_CHANGED'; end if;
  select c.id into v_thread from public.conversations c join public.order_requests o on o.id=c.source_id
    where c.source_kind='order_request' and o.public_reference=v_order->>'public_reference';
  if (select count(*) from public.messages where conversation_id=v_thread)<>1 then raise exception 'SIGNED_ORDER_DUPLICATE_SEED'; end if;
  select result into v_history from fixture_receipts where label='order-history';
  if (v_history->>'ok')::boolean is distinct from true or not exists (
    select 1 from jsonb_array_elements(v_history->'orders') o where o->>'public_reference'=v_order->>'public_reference'
  ) then raise exception 'SIGNED_ORDER_HISTORY_MISSING'; end if;
  if not exists (
    select 1 from fixture_receipts r,jsonb_array_elements(r.result->'conversations') c
    where r.label='order-thread' and c->>'conversation_reference'=(select guest_reference from public.conversations where id=v_thread)
  ) then raise exception 'SIGNED_ORDER_THREAD_MISSING'; end if;
end $order$;
select 'LOCAL_GUEST_DEPENDENCIES_PASS';
` : ''
const otherRead = rpc('list_guest_conversations_v1','guest_read',{},'').replace(/,null\)$/,",(select hash from active_fixture_hash))")
const expectedDataDirectory = path.join(root,'.tools/current-restore-20260929-pg-data').replaceAll('\\','/')
const legacyFixture = preserveLegacy ? `
insert into public.conversations(id,customer_name,customer_email,platform,status,source_kind,unread_count)
values('${legacyConversation}','Excluded local history','excluded@example.test','Website','Open','website_message',1);
create temp table excluded_legacy_baseline as
select id,ctid::text as row_location,to_jsonb(c) as row_values
from public.conversations c where id='${legacyConversation}';
` : ''
const candidateWithFixture = preserveLegacy ? candidate.replace(/^begin;/i, 'begin;'+legacyFixture) : candidate
const sql = `do $target$
begin
  if current_database()<>${sqlLiteral(database)}
    or lower(replace(current_setting('data_directory'),chr(92),'/'))<>lower(${sqlLiteral(expectedDataDirectory)}) then
    raise exception 'LOCAL_RESTORE_TARGET_MISMATCH';
  end if;
end $target$;
${withDependencies ? `begin;
create temp table legacy_rpc_baseline as select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'acl',p.proacl::text) order by p.oid::regprocedure::text) as acl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
('submit_order_request','submit_order_request_v2','submit_pasabuy_request','validate_coupon','get_storefront_chat_v1','submit_storefront_chat_v1');` : ''}
${(withDependencies ? candidateWithFixture.replace(/^begin;/i,'') : candidateWithFixture).replace(/rollback;\s*$/i, '')}
${withDependencies ? '' : origin}
${moderationBody}
${preserveLegacy ? `do $legacy$
begin
  if not exists (
    select 1 from public.conversations c join excluded_legacy_baseline b using(id)
    where c.guest_reference is null and c.customer_id is null
      and c.ctid::text=b.row_location and b.row_values <@ to_jsonb(c)
  ) then raise exception 'EXCLUDED_LEGACY_CONVERSATION_CHANGED'; end if;
end $legacy$;` : ''}
insert into k2_private.guest_bff_secrets(singleton,request_secret,contact_secret)
values(true,decode('${key.toString('hex')}','hex'),decode('${randomBytes(32).toString('hex')}','hex'))
on conflict(singleton) do update set request_secret=excluded.request_secret,contact_secret=excluded.contact_secret;
insert into public.customers(id,display_name,created_source) values('${fakeCustomer}','Continuity fixture','website_guest');
insert into public.guest_access_grants(customer_id,token_hash,expires_at,max_uses)
values('${fakeCustomer}',extensions.digest('${token}','sha256'),now()+interval '1 day',10000);
create temp table fixture_baseline as select count(*) as grants from public.guest_access_grants;
create temp table fixture_receipts(label text primary key,result jsonb);
grant select,insert on fixture_receipts to anon;
set local role anon;
insert into fixture_receipts select 'fresh',to_jsonb(r) from ${rpc('start_guest_conversation_v1','guest_start',startPayload('Fresh local fixture.'),'')} r;
insert into fixture_receipts select 'first',to_jsonb(r) from ${rpc('start_guest_conversation_v1','guest_start',startPayload('First local fixture.'),validCookie)} r;
insert into fixture_receipts select 'second',to_jsonb(r) from ${rpc('start_guest_conversation_v1','guest_start',startPayload('Second local fixture.',withOrigin ? 'virtual_store' : 'storefront'),validCookie)} r;
insert into fixture_receipts select 'reopen',to_jsonb(r) from ${rpc('list_guest_conversations_v1','guest_read',{},validCookie)} r;
insert into fixture_receipts select 'missing',to_jsonb(r) from ${rpc('list_guest_conversations_v1','guest_read',{},'')} r;
insert into fixture_receipts select 'different',to_jsonb(r) from ${rpc('list_guest_conversations_v1','guest_read',{},`k2_guest_access=${'b'.repeat(64)}`)} r;
reset role;
create temp table active_fixture_hash as select encode(extensions.digest(result->>'guest_grant_token','sha256'),'hex') as hash from fixture_receipts where label='fresh';
grant select on active_fixture_hash to anon;
set local role anon;
insert into fixture_receipts select 'other-active',to_jsonb(r) from ${otherRead} r;
reset role;
do $assert$
declare v_read jsonb; v_first text; v_second text; v_fresh jsonb; v_other jsonb;
begin
  select result into v_fresh from fixture_receipts where label='fresh';
  if (v_fresh->>'ok')::boolean is distinct from true or v_fresh->>'guest_grant_token' !~ '^[0-9a-f]{64}$'
    or not exists(select 1 from public.conversations c join public.customers u on u.id=c.customer_id
      join public.customer_contact_points p on p.customer_id=u.id
      where c.guest_reference=v_fresh->>'conversation_reference' and c.source_kind='website_message'
        and u.created_source='website_guest' and p.source='website_guest') then
    raise exception 'FRESH_GUEST_IDENTITY_FAILED';
  end if;
  if exists(select 1 from fixture_receipts where label in ('first','second') and
    ((result->>'ok')::boolean is distinct from true or result->>'guest_grant_token' is not null)) then
    raise exception 'EXISTING_GRANT_NOT_REUSED';
  end if;
  if (select count(*) from public.guest_access_grants)<>(select grants+1 from fixture_baseline) then
    raise exception 'EXTRA_GRANT_CREATED';
  end if;
  if not exists(select 1 from public.conversations c join fixture_receipts r
    on c.guest_reference=r.result->>'conversation_reference'
    where r.label='second' and c.source_kind='${withOrigin ? 'virtual_store_message' : 'website_message'}'
      and c.platform='Website' and c.customer_id='${fakeCustomer}') then
    raise exception 'ORIGIN_OR_IDENTITY_CHANGED';
  end if;
  ${withModeration ? `if (select count(*) from k2_private.anonymous_chat_principals)<>3
    or has_function_privilege('anon','public.start_guest_conversation_without_moderation_v1(bigint,uuid,text,text,text,text)','EXECUTE') then
    raise exception 'MODERATION_WRAPPER_BYPASSED';
  end if;` : ''}
  select result->>'conversation_reference' into v_first from fixture_receipts where label='first';
  select result->>'conversation_reference' into v_second from fixture_receipts where label='second';
  select result into v_read from fixture_receipts where label='reopen';
  if (v_read->>'ok')::boolean is distinct from true or jsonb_array_length(v_read->'conversations')<>2
    or not exists(select 1 from jsonb_array_elements(v_read->'conversations') c where c->>'conversation_reference'=v_first)
    or not exists(select 1 from jsonb_array_elements(v_read->'conversations') c where c->>'conversation_reference'=v_second) then
    raise exception 'SAME_GRANT_REOPEN_FAILED';
  end if;
  if exists(select 1 from fixture_receipts where label in ('missing','different') and
    ((result->>'ok')::boolean is distinct from false or result->'conversations'<>'[]'::jsonb)) then
    raise exception 'UNSCOPED_HISTORY_EXPOSED';
  end if;
  select result into v_other from fixture_receipts where label='other-active';
  if (v_other->>'ok')::boolean is distinct from true or jsonb_array_length(v_other->'conversations')<>1
    or exists(select 1 from jsonb_array_elements(v_other->'conversations') c
      where c->>'conversation_reference' in (v_first,v_second)) then
    raise exception 'CROSS_GUEST_HISTORY_EXPOSED';
  end if;
end $assert$;
select 'LOCAL_GUEST_GRANT_CONTINUITY_PASS';
${dependencyWitness}
rollback;
select case when to_regprocedure('public.start_guest_conversation_v1(bigint,uuid,text,text,text,text)') is null
  and not exists(select 1 from public.conversations where customer_id='${fakeCustomer}')
  ${preserveLegacy ? `and not exists(select 1 from public.conversations where id='${legacyConversation}')` : ''}
  ${withDependencies ? `and not exists(select 1 from public.products where sku='${fixtureSku}')
    and not exists(select 1 from public.order_requests where idempotency_key='${orderPayload.idempotencyKey}')` : ''}
  then 'LOCAL_GUEST_GRANT_ROLLBACK_PASS' else 'LOCAL_GUEST_GRANT_ROLLBACK_FAILED' end;
`
const result = spawnSync(psql, ['-X','--no-psqlrc','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','54388','-U','postgres','-d',database], {
  cwd: root, env: { ...process.env, PGSSLMODE: 'disable' }, input: sql,
  encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 4*1024*1024,
})
if (result.error || result.status !== 0) throw new Error(String(result.stderr || result.error?.message).slice(-1500))
if (!result.stdout.includes('LOCAL_GUEST_GRANT_CONTINUITY_PASS') || !result.stdout.includes('LOCAL_GUEST_GRANT_ROLLBACK_PASS')) throw new Error('WITNESS_MARKER_MISSING')
if (withDependencies && !result.stdout.includes('LOCAL_GUEST_DEPENDENCIES_PASS')) throw new Error('DEPENDENCY_WITNESS_MARKER_MISSING')
const receipt = { capturedAt: new Date().toISOString(), target: `127.0.0.1:54388/${database}`,
  assemblySha256: hash, candidateBoundarySha256: boundaryHash, candidateOriginSha256: originHash,
  candidateModerationSha256: moderationHash, moderationWrapperRetained: withModeration,
  actualAnonStartAndRead: true, existingGrantReused: true, conversationOriginPreserved: true,
  freshGuestStarted: true, validIdentityProvenance: true, bothConversationsReopened: true,
  ...(preserveLegacy ? { excludedLegacyRowUnchanged: true, excludedLegacyStillUnclaimed: true } : {}),
  ...(withDependencies ? { dependencyManifest, all16RouteRpcGrantsAndHardening:true, legacyRpcAclPreserved:true,
    signedOrderAndReplay:true, freshOrderGrantIssued:true, singleOrderSeed:true, sameGrantOrderAndThreadRecovery:true,
    missingAndDifferentOrderGrantDenied:true, directWriterCutoverApplied:false } : {}),
  missingAndDifferentGrantDenied: true, otherActiveGrantExcluded: true, rollbackConfirmed: true,
  boundary: 'Isolated restored application schema; no PostgREST, browser, Turnstile, managed-role or production proof.' }
fs.writeFileSync(path.join(root,`.tools/current-production-backups/guest-grant-continuity${withDependencies ? '-dependencies' : withModeration ? '-moderation' : withOrigin ? '-origin' : ''}${preserveLegacy ? '-legacy' : ''}-20260930.json`),JSON.stringify(receipt,null,2)+'\n')
console.log(JSON.stringify(receipt,null,2))
