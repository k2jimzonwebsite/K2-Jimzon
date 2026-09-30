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
const legacyConversation = randomUUID()
const withModeration = process.argv.includes('--with-moderation')
const withOrigin = withModeration || process.argv.includes('--with-origin')
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
const candidate = assembly.slice(0,startIndex)+from+'\n'+body+'\n'+assembly.slice(endIndex)
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
${candidateWithFixture.replace(/rollback;\s*$/i, '')}
${origin}
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
rollback;
select case when to_regprocedure('public.start_guest_conversation_v1(bigint,uuid,text,text,text,text)') is null
  and not exists(select 1 from public.conversations where customer_id='${fakeCustomer}')
  ${preserveLegacy ? `and not exists(select 1 from public.conversations where id='${legacyConversation}')` : ''}
  then 'LOCAL_GUEST_GRANT_ROLLBACK_PASS' else 'LOCAL_GUEST_GRANT_ROLLBACK_FAILED' end;
`
const result = spawnSync(psql, ['-X','--no-psqlrc','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','54388','-U','postgres','-d',database], {
  cwd: root, env: { ...process.env, PGSSLMODE: 'disable' }, input: sql,
  encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 4*1024*1024,
})
if (result.error || result.status !== 0) throw new Error(String(result.stderr || result.error?.message).slice(-1500))
if (!result.stdout.includes('LOCAL_GUEST_GRANT_CONTINUITY_PASS') || !result.stdout.includes('LOCAL_GUEST_GRANT_ROLLBACK_PASS')) throw new Error('WITNESS_MARKER_MISSING')
const receipt = { capturedAt: new Date().toISOString(), target: `127.0.0.1:54388/${database}`,
  assemblySha256: hash, candidateBoundarySha256: boundaryHash, candidateOriginSha256: originHash,
  candidateModerationSha256: moderationHash, moderationWrapperRetained: withModeration,
  actualAnonStartAndRead: true, existingGrantReused: true, conversationOriginPreserved: true,
  freshGuestStarted: true, validIdentityProvenance: true, bothConversationsReopened: true,
  ...(preserveLegacy ? { excludedLegacyRowUnchanged: true, excludedLegacyStillUnclaimed: true } : {}),
  missingAndDifferentGrantDenied: true, otherActiveGrantExcluded: true, rollbackConfirmed: true,
  boundary: 'Isolated restored application schema; no PostgREST, browser, Turnstile, managed-role or production proof.' }
fs.writeFileSync(path.join(root,`.tools/current-production-backups/guest-grant-continuity${withModeration ? '-moderation' : withOrigin ? '-origin' : ''}${preserveLegacy ? '-legacy' : ''}-20260930.json`),JSON.stringify(receipt,null,2)+'\n')
console.log(JSON.stringify(receipt,null,2))
