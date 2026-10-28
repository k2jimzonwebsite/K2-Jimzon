import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { provePrivacyConcurrency } from './customer-privacy-concurrency.mjs'
import { diagnosePrivacyRestore } from './customer-privacy-restore-diagnostic.mjs'

// Entirely isolated synthetic database. Never read owner environment files.
const root = fileURLToPath(new URL('..', import.meta.url))
const bin = path.join(root, '.tools/postgresql-17.11/runtime/pgsql/bin')
const data = path.join(root, '.tools/customer-privacy-pg-data')
const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: '55449', PGUSER: 'postgres', PGDATABASE: 'k2_privacy_fixture' }
function run(exe, args, options = {}) {
  const result = spawnSync(path.join(bin, `${exe}.exe`), args, { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 30000, ...options })
  if (result.error || result.status !== 0) throw new Error(`${exe}: ${result.stderr || result.stdout || result.error?.message}`)
  return result.stdout || ''
}
const psql = (...args) => run('psql', ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', ...args])
try {
  if (!fs.existsSync(path.join(data, 'PG_VERSION'))) run('initdb', ['-D', data, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'])
  run('pg_ctl', ['-D', data, '-l', path.join(root, '.tools/customer-privacy-pg.log'), '-o', '-p 55449 -h 127.0.0.1', '-w', 'start'], { stdio: 'ignore' })
  run('dropdb', ['--if-exists', 'k2_privacy_fixture'], { env: { ...env, PGDATABASE: 'postgres' } })
  run('createdb', ['k2_privacy_fixture'], { env: { ...env, PGDATABASE: 'postgres' } })
  for (const file of [
    'supabase/tests/map019_account_claim_bootstrap.sql',
    'supabase/migrations/20260822_guest_account_claim_boundary.sql',
    'supabase/migrations/20260924_customer_account_settings_notifications.sql',
    'supabase/tests/customer_privacy_fixture.sql',
    'supabase/migrations/20260928_order_payment_receipt_chat.sql',
  ]) psql('-f', file)
  // Install the latest repository Admin signer, rather than the simplified
  // bootstrap verifier. Its isolated rate table models the declared dependency.
  const signerSource=fs.readFileSync(path.join(root,'supabase/migrations/20260922_anonymous_chat_moderation.sql'),'utf8')
  const signer=signerSource.match(/create or replace function k2_private\.verify_admin_bff_request\([\s\S]*?\n\$\$;/i)?.[0]
  if(!signer)throw new Error('LATEST_ADMIN_SIGNER_SOURCE_MISSING')
  psql('-c',"create table k2_private.admin_request_rate_buckets(scope text not null,subject text not null,bucket_start timestamptz not null,hit_count integer not null default 1,primary key(scope,subject,bucket_start))")
  psql('-c',signer)
  psql('-c','revoke all on function k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text) from public,anon,authenticated')
  const files=['supabase/migrations/20261027_customer_account_portfolio.sql','supabase/migrations/20261027_customer_privacy_automation.sql','supabase/migrations/20261027_customer_privacy_admin.sql']
  const fingerprint=`select jsonb_build_object('functions',(select md5(coalesce(string_agg(p.oid::regprocedure::text||pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'')||p.proowner::text||coalesce(p.proconfig::text,''),'|' order by p.oid::regprocedure::text),''))
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','k2_private') and p.prokind='f'),
    'customers',(select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text,'[]')) from public.customers x),
    'contacts',(select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text,'[]')) from public.customer_contact_points x),
    'accounts',(select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.user_id)::text,'[]')) from public.customer_accounts x),
    'orders',(select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text,'[]')) from public.order_requests x),
    'privacy',to_regclass('k2_private.customer_privacy_requests'),
    'portfolio',to_regprocedure('public.read_customer_portfolio_v1(bigint,uuid,text,text,text)'),
    'guardTriggers',(select count(*) from pg_trigger where tgname='privacy_open_customer' and not tgisinternal))::text`
  const beforeTransaction=psql('-At','-c',fingerprint).trim()
  const strip=sql=>sql.replace(/(^|\r?\n)begin;(?=\r?\n)/i,'$1').replace(/\r?\ncommit;\s*$/i,'\n')
  const transactionSql=['begin;',...files.map(file=>strip(fs.readFileSync(path.join(root,file),'utf8'))),'rollback;'].join('\n')
  run('psql',['-X','--no-psqlrc','-v','ON_ERROR_STOP=1'],{input:transactionSql})
  if(psql('-At','-c',fingerprint).trim()!==beforeTransaction)throw new Error('PRIVACY_TRANSACTION_ROLLBACK_DRIFT')
  console.log('CUSTOMER_PRIVACY_ATOMIC_PREACTIVATION_ROLLBACK_PASSED')
  const migration = 'supabase/migrations/20261027_customer_account_portfolio.sql'
  if (fs.existsSync(path.join(root, migration))) psql('-f', migration)
  console.log(psql('-f', 'supabase/tests/customer_portfolio_assertions.sql'))
  const privacyMigration='supabase/migrations/20261027_customer_privacy_automation.sql'
  if(fs.existsSync(path.join(root,privacyMigration)))psql('-f',privacyMigration)
  console.log(psql('-f','supabase/tests/customer_privacy_assertions.sql'))
  const adminMigration='supabase/migrations/20261027_customer_privacy_admin.sql'
  if(fs.existsSync(path.join(root,adminMigration))) {
    // Unknown signer vocabulary must stop the migration rather than silently
    // installing an unsafe or incomplete verifier. Only the fixture is changed.
    const driftedSigner=signer.replace("'wholesale_inquiry_review',", "'fixture_unknown_action',")
    if(driftedSigner===signer)throw new Error('LATEST_SIGNER_DRIFT_FIXTURE_MISSING')
    psql('-c',driftedSigner)
    let refusedDrift=false
    try { psql('-f',adminMigration) } catch(error) { if(String(error).includes('K2_PRIVACY_ADMIN_SIGNER_DRIFT'))refusedDrift=true;else throw error }
    if(!refusedDrift)throw new Error('ADMIN_SIGNER_DRIFT_NOT_REJECTED')
    psql('-c',signer)
    console.log('CUSTOMER_PRIVACY_ADMIN_SIGNER_DRIFT_REJECTED')
    psql('-f',adminMigration)
    console.log(psql('-f','supabase/tests/customer_privacy_admin_assertions.sql'))
  }
  diagnosePrivacyRestore({ bin, env })
  await provePrivacyConcurrency({bin,env})
  psql('-f',migration);psql('-f',privacyMigration)
  if(fs.existsSync(path.join(root,adminMigration)))psql('-f',adminMigration)
  console.log('CUSTOMER_PRIVACY_MIGRATION_REPLAY_PASSED')
} finally {
  if (fs.existsSync(path.join(data, 'PG_VERSION'))) spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', data, '-m', 'fast', '-w', 'stop'], { env, windowsHide: true, stdio: 'ignore' })
}
