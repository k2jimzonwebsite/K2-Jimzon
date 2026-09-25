#!/usr/bin/env node
// Isolated rehearsal for 20260925_map017_stock_public_grant_revocation.sql.
// Disposable localhost PostgreSQL only; refuses any non-local target.
// Applies the correction on a live-like grant fixture, asserts PUBLIC is gone
// while anon/authenticated execute is retained, then proves the rollback
// restores the prior state. Never touches production or shared databases.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  runPsql,
  psqlEnvironment,
  validateMap017RehearsalTarget,
} from './rehearse-local-migration.mjs'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const read = (relative) => fs.readFileSync(path.join(rootDir, relative), 'utf8')
const stripTransaction = (sql) => sql.replace(/^begin\s*;/im, '').replace(/commit\s*;\s*$/i, '').trim()

const PORT = 55433
const DATABASE = 'k2_map017_rehearsal_stock'
const TARGET = `postgresql://postgres@127.0.0.1:${PORT}/${DATABASE}`
const BIN_DIR = path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin')
const DATA_DIR = path.join(rootDir, '.tools', 'map017-stock-pg-data')
const LOG_PATH = path.join(rootDir, '.tools', 'map017-stock-pg.log')

function binary(name) {
  const full = path.join(BIN_DIR, name)
  if (!fs.existsSync(full)) throw new Error(`PORTABLE_POSTGRES_RUNTIME_MISSING: ${name}`)
  return full
}

function runBinary(executable, args, label, env) {
  const result = spawnSync(executable, args, { cwd: rootDir, env, encoding: 'utf8', windowsHide: true })
  if (result.error || result.status !== 0) {
    throw new Error(`${label} failed: ${String(result.stderr || result.error?.message || 'unknown failure').trim()}`)
  }
  return String(result.stdout || '').trim()
}

export function rehearseStockGrantRevocation() {
  const check = validateMap017RehearsalTarget(TARGET)
  if (!check.isLocal) throw new Error(`SECURITY_REFUSAL: ${check.reason}`)
  const psql = binary('psql.exe')
  const env = {
    ...process.env, PGHOST: '127.0.0.1', PGPORT: String(PORT), PGUSER: 'postgres', PGDATABASE: 'postgres',
  }

  if (!fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    runBinary(binary('initdb.exe'), ['-D', DATA_DIR, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'], 'rehearsal initdb', env)
  }
  const status = spawnSync(binary('pg_ctl.exe'), ['-D', DATA_DIR, 'status'], { cwd: rootDir, env, encoding: 'utf8', windowsHide: true })
  let startedByRunner = false
  if (status.status !== 0) {
    runBinary(
      binary('pg_ctl.exe'),
      ['-D', DATA_DIR, '-l', LOG_PATH, '-o', `-p ${PORT} -h 127.0.0.1`, '-w', 'start'],
      'rehearsal PostgreSQL startup',
      env,
    )
    startedByRunner = true
  }

  try {
    runBinary(binary('dropdb.exe'), ['--if-exists', '-h', '127.0.0.1', '-p', String(PORT), '-U', 'postgres', DATABASE], 'rehearsal database reset', env)
    runBinary(binary('createdb.exe'), ['-h', '127.0.0.1', '-p', String(PORT), '-U', 'postgres', DATABASE], 'rehearsal database creation', env)
    const targetEnv = psqlEnvironment(check.parsed)

    runPsql(psql, targetEnv, ['-f', path.join(rootDir, 'supabase/tests/map017_stock_grant_revocation_setup.sql')], 'live-like grant fixture')
    const baseline = runPsql(psql, targetEnv, ['-At', '-c', "select has_function_privilege('public', 'public.get_public_product_stock()', 'execute')"], 'baseline PUBLIC grant probe')
    if (baseline !== 't') throw new Error('REHEARSAL_FIXTURE_INVALID: baseline lacks the live-like PUBLIC grant')

    const migration = stripTransaction(read('supabase/migrations/20260925_map017_stock_public_grant_revocation.sql'))
    // Idempotent replay: the correction applies cleanly twice.
    runPsql(psql, targetEnv, ['-c', migration], 'scoped PUBLIC revocation (apply 1)')
    runPsql(psql, targetEnv, ['-c', migration], 'scoped PUBLIC revocation (apply 2)')
    runPsql(psql, targetEnv, ['-f', path.join(rootDir, 'supabase/tests/map017_stock_grant_revocation_assertions.sql')], 'post-revocation assertions')

    // The existing read-only repository check now reports the grant absent.
    const checkSql = read('supabase/map017_stock_public_grant_verification.sql')
    const checkResult = runPsql(psql, targetEnv, ['-At', '-c', checkSql], 'read-only grant check after revocation')
    if (checkResult !== 't') throw new Error(`READ_ONLY_CHECK_UNEXPECTED: ${checkResult}`)

    const rollback = stripTransaction(read('supabase/migrations/20260925_map017_stock_public_grant_revocation_rollback.sql'))
    runPsql(psql, targetEnv, ['-c', rollback], 'emergency rollback')
    const restored = runPsql(psql, targetEnv, ['-At', '-c', "select has_function_privilege('public', 'public.get_public_product_stock()', 'execute') and has_function_privilege('anon', 'public.get_public_product_stock()', 'execute')"], 'rollback restoration probe')
    if (restored !== 't') throw new Error('ROLLBACK_FAILED: prior grant state not restored')

    runBinary(binary('dropdb.exe'), ['-h', '127.0.0.1', '-p', String(PORT), '-U', 'postgres', DATABASE], 'rehearsal database cleanup', env)
    console.log('Stock PUBLIC-grant revocation rehearsal passed: revoke, replay, read-only check, and rollback verified in isolation.')
  } finally {
    if (startedByRunner) {
      spawnSync(binary('pg_ctl.exe'), ['-D', DATA_DIR, '-w', 'stop'], { cwd: rootDir, env, encoding: 'utf8', windowsHide: true })
    }
  }
}

if (process.argv[1]?.endsWith('rehearse-stock-grant-revocation.mjs')) {
  rehearseStockGrantRevocation()
}
