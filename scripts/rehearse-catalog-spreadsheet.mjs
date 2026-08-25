#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateLocalTarget } from './rehearse-local-migration.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const lifecycle = [
  ['bootstrap', 'supabase/tests/catalog_spreadsheet_rehearsal_bootstrap.sql'],
  ['identity migration', 'supabase/migrations/20260822_catalog_spreadsheet_identity.sql'],
  ['commit migration', 'supabase/migrations/20260822_catalog_spreadsheet_commit.sql'],
  ['behavior assertions', 'supabase/tests/catalog_spreadsheet_rehearsal_assertions.sql'],
  ['security-event migration', 'supabase/migrations/20260822_security_event_boundary.sql'],
  ['security-event assertions', 'supabase/tests/security_event_rehearsal_assertions.sql'],
  ['emergency rollback', 'supabase/catalog_spreadsheet_rollback.sql'],
]

export function validateCatalogRehearsalTarget(target) {
  const local = validateLocalTarget(target)
  if (!local.isLocal) return local
  let parsed
  try { parsed = new URL(target) } catch { return { isLocal: false, reason: 'TARGET_URL_INVALID' } }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    return { isLocal: false, reason: 'TARGET_PROTOCOL_INVALID' }
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  if (!/^k2_catalog_rehearsal[a-z0-9_-]*$/.test(database)) {
    return { isLocal: false, reason: 'REHEARSAL_DATABASE_NAME_REQUIRED' }
  }
  return { ...local, database, parsed }
}

function psqlEnvironment(parsed) {
  return {
    ...process.env,
    PGHOST: parsed.hostname.replace(/^\[|\]$/g, ''),
    PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username || 'postgres'),
    PGPASSWORD: decodeURIComponent(parsed.password || ''),
    PGDATABASE: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
  }
}

function runPsql(executable, env, args, label) {
  const result = spawnSync(executable, ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', ...args], {
    cwd: root, env, encoding: 'utf8', windowsHide: true,
  })
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.error?.message || 'unknown psql failure').trim()
    throw new Error(`${label} failed: ${detail}`)
  }
  return String(result.stdout || '').trim()
}

export function runCatalogSpreadsheetRehearsal({ target, psql = process.env.PSQL_BIN || 'psql' }) {
  const check = validateCatalogRehearsalTarget(target)
  if (!check.isLocal) throw new Error(`SECURITY_REFUSAL: ${check.reason}`)
  const env = psqlEnvironment(check.parsed)
  for (const [label, relative] of lifecycle) {
    runPsql(psql, env, ['-f', path.join(root, relative)], label)
    console.log(`Catalog PostgreSQL rehearsal: ${label} passed.`)
  }
  const rollback = runPsql(psql, env, ['-Atc', `select
    not has_function_privilege('authenticated','public.execute_admin_catalog_import_v1(text,bigint,uuid,uuid,text,text)','EXECUTE')
    and not has_function_privilege('authenticated','public.read_admin_catalog_import_status_v1(uuid)','EXECUTE')
    and has_table_privilege('authenticated','public.products','INSERT')
    and has_table_privilege('authenticated','public.products','UPDATE')
    and to_regclass('k2_private.catalog_import_row_events') is not null;`], 'rollback assertions')
  if (rollback !== 't') throw new Error('rollback assertions failed')
  console.log('Catalog PostgreSQL rehearsal: rollback assertions passed.')
}

async function main() {
  const target = process.argv.slice(2).find((arg) => arg.startsWith('--target='))?.slice(9)
    || process.env.K2_CATALOG_REHEARSAL_URL
  if (!target) {
    console.error('BLOCKED_LOCAL_DATABASE_UNAVAILABLE: set K2_CATALOG_REHEARSAL_URL.')
    process.exit(2)
  }
  try { runCatalogSpreadsheetRehearsal({ target }) }
  catch (error) { console.error(error.message); process.exit(2) }
}

if (process.argv[1]?.endsWith('rehearse-catalog-spreadsheet.mjs')) main()
