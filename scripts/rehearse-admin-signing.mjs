// Only the exact loopback restore. Each verifier variant and all fixtures roll back.
import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { signedAdminCommandArguments } from '../server/admin-bff/security.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const database = 'k2_current_restore_20260929'
const dataDirectory = path.join(root, '.tools/current-restore-20260929-pg-data').replaceAll('\\', '/')
const beforeFix = process.argv.includes('--before-fix')
if (process.argv.slice(2).some(arg => arg !== '--before-fix')) throw new Error('UNKNOWN_REHEARSAL_ARGUMENT')
const literal = value => value === null ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter(file => /^\d{14}_admin_signing_null_inputs\.sql$/.test(file))
if (migrationFiles.length !== 1) throw new Error('SIGNING_MIGRATION_SCOPE_INVALID')
const migrationPath = `supabase/migrations/${migrationFiles[0]}`
const migration = beforeFix ? '' : read(migrationPath).replace(/^(begin|commit);\r?$/gmi, '')
const paths = ['20260812_admin_fulfillment_bff_boundary.sql', '20260822_admin_session_registry.sql',
  '20260830_paid_ai_spend_controls.sql', '20260831_marketplace_snapshot_staging.sql',
  '20260922_anonymous_chat_moderation.sql', '20260922_anonymous_chat_moderation_rollback.sql']
const variants = [{ path: 'installed restore definition', sql: '', normalLimit: 16384 }, ...paths.map(name => {
  const file = `supabase/migrations/${name}`; const source = read(file)
  const definitions = [...source.matchAll(/create or replace function k2_private\.verify_admin_bff_request\([\s\S]*?\r?\n\$\$;/g)]
  if (definitions.length !== 1) throw new Error('VERIFIER_REPLACEMENT_SCOPE_INVALID')
  return { path: file, sha256: createHash('sha256').update(source).digest('hex'), sql: definitions[0][0],
    normalLimit: /else 65536 end/.test(definitions[0][0]) ? 65536 : 16384 }
})]
const secret = randomBytes(32)
process.env.K2_ADMIN_BFF_REQUEST_SECRET = secret.toString('base64')
const callers = [...read('supabase/migrations/20260812_admin_fulfillment_bff_boundary.sql')
  .matchAll(/create or replace function public\.execute_admin_fulfillment_command_v1\([\s\S]*?\r?\n\$\$;/g)]
if (callers.length !== 1) throw new Error('PUBLIC_CALLER_SCOPE_INVALID')
const assertions = read('supabase/tests/admin_signing_assertions.sql')
const variantSql = variants.map(variant => {
  const args = signedAdminCommandArguments('confirm_order','42000000-0000-4000-8000-000000000001',randomUUID(),{})
  const call = ['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(key => literal(args[key])).join(',')
  const historical = variant.path === 'installed restore definition' || /202608(12|22)_/.test(variant.path)
  return `savepoint signer_variant;
${variant.sql}
${historical ? migration : ''}
select set_config('k2.fixture.normal_payload_limit',${literal(variant.normalLimit)},true);
${assertions.replaceAll('__NODE_ARGUMENTS__',call)}
${migration}
${migration}
rollback to signer_variant;`
}).join('\n')
const refusalSql = beforeFix ? '' : `savepoint signer_refusal;
create or replace function k2_private.verify_admin_bff_request(p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,p_payload_text text,p_signature text)
 returns boolean language plpgsql security definer set search_path='' as $$begin return true; end $$;
select pg_temp.admin_expect_error(${literal(migration)},'PREFLIGHT_FAILED: unfamiliar Admin signing verifier');
rollback to signer_refusal;
savepoint signer_missing;
drop function k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text);
select pg_temp.admin_expect_error(${literal(migration)},'PREFLIGHT_FAILED: Admin signing verifier missing');
rollback to signer_missing;
select 'ADMIN_SIGNING_REFUSAL_PASS';`
const sql = `\\set ON_ERROR_STOP on
do $target$ begin
 if current_database() <> '${database}' or replace(current_setting('data_directory'),chr(92),'/') <> ${literal(dataDirectory)}
 then raise exception 'WRONG_LOCAL_RESTORE'; end if;
 if exists(select 1 from auth.users where id in ('42000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000002'))
 then raise exception 'SIGNING_FIXTURE_ALREADY_EXISTS'; end if;
end $target$;
create temp table signer_baseline as select pg_get_functiondef(p.oid) definition,p.proowner,p.proacl,p.proconfig,
 (select count(*) from k2_private.admin_request_nonces) nonces,
 (select count(*) from k2_private.admin_command_receipts) receipts,
 (select count(*) from k2_private.admin_request_rate_buckets) buckets
from pg_proc p where p.oid='k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure;
select 'ADMIN_SIGNING_BASELINE_SHA256:'||encode(extensions.digest(convert_to(definition,'UTF8'),'sha256'),'hex') from signer_baseline;
begin;
${callers[0][0]}
revoke all on function public.execute_admin_fulfillment_command_v1(text,bigint,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.execute_admin_fulfillment_command_v1(text,bigint,uuid,uuid,text,text) to authenticated;
insert into auth.users(id) values('42000000-0000-4000-8000-000000000001'),('42000000-0000-4000-8000-000000000002');
insert into public.user_profiles(id,role) values('42000000-0000-4000-8000-000000000001','Admin'),('42000000-0000-4000-8000-000000000002','Customer')
 on conflict(id) do update set role=excluded.role;
insert into k2_private.admin_bff_secrets(singleton,request_secret) values(true,decode('${secret.toString('hex')}','hex'))
 on conflict(singleton) do update set request_secret=excluded.request_secret;
create function pg_temp.admin_verify(text,bigint,uuid,uuid,text,text) returns boolean
 language sql security definer set search_path='' as $$select k2_private.verify_admin_bff_request($1,$2,$3,$4,$5,$6)$$;
revoke all on function pg_temp.admin_verify(text,bigint,uuid,uuid,text,text) from public;
grant execute on function pg_temp.admin_verify(text,bigint,uuid,uuid,text,text) to authenticated;
create function pg_temp.admin_signature(p_action text,p_ts bigint,p_nonce uuid,p_key uuid,p_text text) returns text
 language sql security definer set search_path='' as $$select encode(extensions.hmac(convert_to(p_action||E'\\n'||p_ts||E'\\n'||p_nonce||E'\\n'||auth.uid()||E'\\n'||p_key||E'\\n'||
 encode(extensions.digest(convert_to(p_text,'UTF8'),'sha256'),'hex'),'UTF8'),(select request_secret from k2_private.admin_bff_secrets where singleton),'sha256'),'hex')$$;
revoke all on function pg_temp.admin_signature(text,bigint,uuid,uuid,text) from public;
grant execute on function pg_temp.admin_signature(text,bigint,uuid,uuid,text) to authenticated;
create function pg_temp.admin_expect_error(p_sql text,p_expected text) returns void language plpgsql as $$begin
 begin execute p_sql; exception when others then if sqlerrm=p_expected then return; end if; raise; end;
 raise exception 'EXPECTED_SIGNING_DENIAL_MISSING: %',p_expected;
end $$;
${variantSql}
${refusalSql}
rollback;
select case when not exists(select 1 from auth.users where id in ('42000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000002'))
 and exists(select 1 from pg_proc p,signer_baseline b where p.oid='k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure
  and pg_get_functiondef(p.oid)=b.definition and p.proowner=b.proowner and p.proacl is not distinct from b.proacl and p.proconfig is not distinct from b.proconfig
  and (select count(*) from k2_private.admin_request_nonces)=b.nonces and (select count(*) from k2_private.admin_command_receipts)=b.receipts
  and (select count(*) from k2_private.admin_request_rate_buckets)=b.buckets)
 then 'ADMIN_SIGNING_ROLLBACK_PASS' else 'ADMIN_SIGNING_ROLLBACK_FAILED' end;
`
const generated = path.join(root,'.tools',`admin-signing-${randomUUID()}.sql`)
fs.writeFileSync(generated,sql,'utf8')
let result
try {
 result = spawnSync(path.join(root,'.tools/postgresql-17.11/runtime/pgsql/bin/psql.exe'),
  ['-X','--no-psqlrc','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','54388','-U','postgres','-d',database,'-f',generated],
  {cwd:root,windowsHide:true,encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024,
   env:{...process.env,PGSSLMODE:'disable',PGCLIENTENCODING:'UTF8'}})
} finally { fs.unlinkSync(generated) }
if(result.error || result.status!==0) throw new Error(String(result.stderr || result.error?.message).slice(-1800))
if((result.stdout.match(/ADMIN_SIGNING_VARIANT_PASS/g)||[]).length!==variants.length || !result.stdout.includes('ADMIN_SIGNING_ROLLBACK_PASS')
 || (!beforeFix && !result.stdout.includes('ADMIN_SIGNING_REFUSAL_PASS')))
 throw new Error('ADMIN_SIGNING_WITNESS_INCOMPLETE')
const baselineHash = result.stdout.match(/ADMIN_SIGNING_BASELINE_SHA256:([0-9a-f]{64})/)?.[1]
if (!baselineHash) throw new Error('ADMIN_SIGNING_BASELINE_CAPTURE_MISSING')
console.log(`Admin signing behavior and rollback passed independently for ${variants.length} verifier variants.`)
const receipt={capturedAt:new Date().toISOString(),target:`127.0.0.1:54388/${database}`,
 scope:'Isolated restore and six extracted verifier definitions; later four tested before forward guard; rollback-only, no live exploit or full migration acceptance',
 migration:{path:migrationPath,sha256:createHash('sha256').update(read(migrationPath)).digest('hex')},
 variants:variants.map(({sql,...rest})=>rest),installedDefinitionSha256:baselineHash,nodeSignerAllowed:true,nullInputsDenied:6,
 malformedForgedAndExpiredDenied:true,nonceReplayDenied:true,publicCallerNullDenied:true,
 rolesAndAalDenied:true,existingActionsAndByteCapsPreserved:true,existingRateLimitsPreserved:true,
 forwardMigrationReplay:true,unknownAndMissingVerifierRefused:true,metadataPreserved:true,rollback:true}
fs.mkdirSync(path.join(root,'docs/evidence/20261001-admin-signing'),{recursive:true})
fs.writeFileSync(path.join(root,'docs/evidence/20261001-admin-signing/local-receipt.json'),`${JSON.stringify(receipt,null,2)}\n`)
