import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runPsql, psqlEnvironment, validateMap017RehearsalTarget } from './rehearse-local-migration.mjs'
import { loadMap017FollowupContract } from './map017-followup-contract.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

// Execute repository function bodies; the fixture supplies only their tables.
const sources = [
  ['20260803_launch_core_stabilization.sql', 'reject_event_mutation'],
  ['20260803_launch_core_stabilization.sql', 'sync_product_compat_columns'],
  ['20260803_launch_core_stabilization.sql', 'sync_product_batch_compat_columns'],
  ['20260803_phase_2_unified_inbox.sql', 'prevent_conversation_event_mutation'],
  ['20260725_staff_custody_allocations.sql', 'touch_staff_allocations'],
  ['0006_supply_chain.sql', 'receive_po'],
  ['0007_scan_receive.sql', 'receive_po_scanned'],
]

export function runMap017FunctionLockdown({ target, psql, baseline = false }) {
  const checked = validateMap017RehearsalTarget(target)
  if (!checked.isLocal) throw new Error(`SECURITY_REFUSAL: ${checked.reason}`)
  const definitions = sources.map(([file, name]) => {
    const matches = [...read(`supabase/migrations/${file}`).matchAll(new RegExp(
      `create or replace function (?:public\\.)?${name}\\([\\s\\S]*?\\$\\$;`, 'gi',
    ))]
    if (matches.length !== 1) throw new Error(`FUNCTION_EXTRACTION_AMBIGUOUS: ${name}`)
    return matches[0][0]
  }).join('\n')
  const migration = baseline ? '' : read('supabase/migrations/20260909_map017_existing_function_lockdown.sql')
    .replace(/^begin;$/m, '').replace(/^commit;$/m, '')
  const setup = [
    'begin; set local search_path = public, pg_temp;',
    "create type public.po_status as enum ('Draft','Sent','Received','Cancelled');",
    definitions,
    read('supabase/tests/map017_function_lockdown_setup.sql'),
  ].join('\n')
  const env = psqlEnvironment(checked.parsed)
  const fingerprintSql = `select md5(coalesce(string_agg(
    oid::text || ':' || pg_get_functiondef(oid) || ':' || coalesce(proacl::text,''),
    E'\\n' order by oid),'')) from pg_proc where pronamespace='public'::regnamespace`
  const before = runPsql(psql, env, ['-At', '-c', fingerprintSql], 'function snapshot')
  if (!baseline) {
    let refused = false
    try {
      runPsql(psql, env, ['-c', `${setup}\ndrop function public.receive_po_scanned(uuid,jsonb);\n${migration}\nrollback;`], 'missing signature refusal')
    } catch (error) {
      if (!/function public\.receive_po_scanned\(uuid, jsonb\) does not exist/.test(error.message)) throw error
      refused = true
    }
    if (!refused) throw new Error('MISSING_SIGNATURE_NOT_REFUSED')
    const restored = runPsql(psql, env, ['-At', '-c', fingerprintSql], 'failed migration recovery')
    if (restored !== before) throw new Error('FAILED_MIGRATION_CHANGED_FUNCTIONS')
  }
  const contract = loadMap017FollowupContract()
  const contractBody = contract.applySql.replace(/^begin;/, '').replace(/commit;$/, '')
  if (!baseline) {
    let refused = false
    try {
      runPsql(psql, env, ['-f', '-'], 'conflicting receipt refusal', `${setup}
        insert into supabase_migrations.schema_migrations(version,name,idempotency_key)
        values ('${contract.version}','${contract.name}','conflicting-payload');
        ${contractBody}
        rollback;`)
    } catch (error) {
      if (!error.message.includes('FOLLOWUP_RECEIPT_CONFLICT')) throw error
      refused = true
    }
    if (!refused) throw new Error('CONFLICTING_RECEIPT_NOT_REFUSED')
  }
  const sql = [
    setup, migration, migration,
    read('supabase/tests/map017_function_lockdown_assertions.sql'),
    `do $verify$ declare checks jsonb; begin
      select verification into checks from (${read('supabase/map017_followup_verification.sql').trim().replace(/;$/, '')}) q;
      if exists(select 1 from jsonb_each(checks) where value<>'true'::jsonb) then
        raise exception 'MAP017_FOLLOWUP_VERIFICATION_FAILED: %',checks;
      end if;
    end $verify$;`,
    contractBody, contractBody,
    `do $receipt$ declare checks jsonb; begin
      select verification into checks from (${contract.verificationSql.replace(/;$/, '')}) q;
      if exists(select 1 from jsonb_each(checks) where value<>'true'::jsonb) then
        raise exception 'FOLLOWUP_RECEIPT_VERIFICATION_FAILED: %',checks;
      end if;
      if (select count(*) from supabase_migrations.schema_migrations where version='${contract.version}')<>1 then
        raise exception 'FOLLOWUP_DUPLICATE_RECEIPT';
      end if;
    end $receipt$;`,
    'rollback;',
  ].join('\n')
  const output = runPsql(psql, env, ['-f', '-'], 'function-lockdown rehearsal', sql)
  if (!output.includes('MAP017_FUNCTION_LOCKDOWN_PASSED')) throw new Error('FUNCTION_LOCKDOWN_MARKER_MISSING')
  const after = runPsql(psql, env, ['-At', '-c', fingerprintSql], 'successful rehearsal recovery')
  if (after !== before) throw new Error('REHEARSAL_CHANGED_FUNCTIONS')
  console.log('MAP-017 function lockdown: seven exact ACLs, browser denial, service entry, real trigger behavior, replay, missing-signature refusal and exact function/ACL rollback passed.')
}
