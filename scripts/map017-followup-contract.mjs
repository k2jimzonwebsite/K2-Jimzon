import crypto from 'node:crypto'
import fs from 'node:fs'

const literal = (value) => `'${String(value).replaceAll("'", "''")}'`
export const followupVersion = '20260909023000'
export const followupName = 'map017_existing_functions_and_error_reports'
const read = (name) => fs.readFileSync(new URL(`../supabase/${name}`, import.meta.url), 'utf8').trim()

export function loadMap017FollowupContract() {
  const verification = read('map017_followup_verification.sql').replace(/;$/, '')
  const migrations = [
    read('migrations/20260909_map017_existing_function_lockdown.sql'),
    read('migrations/20260826_map017_error_report_boundary.sql'),
  ]
  const bodies = migrations.map((sql) => {
    const normalized = sql.replace(/^(?:\s*--[^\n]*(?:\n|$))+/, '').trim()
    if (!normalized.startsWith('begin;') || !normalized.endsWith('commit;')) {
      throw new Error('FOLLOWUP_TRANSACTION_REQUIRED')
    }
    return normalized.slice(6, -7)
  })
  // Bind the transaction builder (gates, version and receipt rules) as well as SQL.
  const hash = crypto.createHash('sha256').update(fs.readFileSync(new URL(import.meta.url)))
    .update('\0').update([...migrations, verification].join('\0')).digest('hex').toUpperCase()
  const key = `sha256:${hash}`
  const receiptPredicate = `version=${literal(followupVersion)} and name=${literal(followupName)} and idempotency_key=${literal(key)}`
  const checks = `select verification from (${verification}) checks`
  const applySql = `begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
select pg_advisory_xact_lock(hashtextextended('k2-map017-followup',0));
do $gate$
declare checks jsonb;
begin
  if not exists(select 1 from supabase_migrations.schema_migrations
    where version='20260824143000' and name='map017_public_write_boundary_hardening'
    and idempotency_key='sha256:D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62') then
    raise exception 'FOLLOWUP_PHASE_ONE_RECEIPT_REQUIRED';
  end if;
  if exists(select 1 from supabase_migrations.schema_migrations
    where (version=${literal(followupVersion)} or name=${literal(followupName)})
      and (${receiptPredicate}) is not true) then
    raise exception 'FOLLOWUP_RECEIPT_CONFLICT';
  end if;
  select verification into checks from (${verification}) q;
  if exists(select 1 from jsonb_each(checks) where key in
    ('seven_signatures_present','expected_function_types','functions_owned_by_postgres',
     'error_reports_rls_enabled','error_reports_staff_read_preserved','public_stock_view_select_preserved')
    and value<>'true'::jsonb) then
    raise exception 'FOLLOWUP_APPLICABILITY_FAILED: %',checks;
  end if;
end $gate$;
${bodies.join('\n')}
do $post$
declare checks jsonb;
begin
  select verification into checks from (${verification}) q;
  if exists(select 1 from jsonb_each(checks) where value<>'true'::jsonb) then
    raise exception 'FOLLOWUP_POSTFLIGHT_FAILED: %',checks;
  end if;
end $post$;
set local role anon;
select count(*) from public.v_product_stock_from_batches;
reset role;
insert into supabase_migrations.schema_migrations(version,name,statements,created_by,idempotency_key)
select ${literal(followupVersion)},${literal(followupName)},
  array[${migrations.map(literal).join(',')}], 'owner-authorized-map017-followup',${literal(key)}
where not exists(select 1 from supabase_migrations.schema_migrations where ${receiptPredicate});
commit;`
  return {
    project: 'pixplcjqivlfflickobf', version: followupVersion, name: followupName,
    artifactSha256: hash, applySql,
    verificationSql: `select (${checks}) || jsonb_build_object('exact_followup_receipt',exists(
      select 1 from supabase_migrations.schema_migrations where ${receiptPredicate})) as verification;`,
  }
}
