#!/usr/bin/env node
// Isolated rehearsal for 20260929_published_requires_human_review.sql.
// Disposable localhost PostgreSQL only; refuses any non-local target.
//
// Reproduces the live shape, including the rows that already violate the rule:
// 22 K2 products are published with is_human_reviewed = false, and that is
// exactly why the constraint must land NOT VALID. This rehearses the property
// that matters -- the guard refuses a new unreviewed publish while leaving the
// legacy rows readable and unpublishable -- then proves the rollback restores the
// prior behaviour. Never touches production or a shared database.
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

const PORT = 55441
// The shared rehearsal guard only sanctions a `k2_map017_rehearsal*` database
// name, and that guard is not loosened here. This is a MAP-018 rehearsal riding
// the sanctioned prefix, on its own port and its own data directory.
const DATABASE = 'k2_map017_rehearsal_published_review'
const TARGET = `postgresql://postgres@127.0.0.1:${PORT}/${DATABASE}`
const BIN_DIR = path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin')
const DATA_DIR = path.join(rootDir, '.tools', 'published-review-guard-pg-data')
const LOG_PATH = path.join(rootDir, '.tools', 'published-review-guard-pg.log')

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

export function rehearsePublishedReviewGuard() {
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
  // Windows sandboxing can hide a running postmaster from pg_ctl status, so
  // confirm the connected server is this runner's data directory before use.
  const probe = spawnSync(psql, ['-h', '127.0.0.1', '-p', String(PORT), '-U', 'postgres', '-d', 'postgres', '-At', '-c', 'show data_directory'], {
    cwd: rootDir, env, encoding: 'utf8', windowsHide: true,
  })
  const runningDirectory = String(probe.stdout || '').trim()
  if (probe.status === 0 && path.resolve(runningDirectory).toLowerCase() !== path.resolve(DATA_DIR).toLowerCase()) {
    throw new Error(`SECURITY_REFUSAL: port ${PORT} belongs to a different PostgreSQL data directory`)
  }
  let startedByRunner = false
  if (probe.status !== 0) {
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

    runPsql(psql, targetEnv, ['-f', path.join(rootDir, 'supabase/tests/published_review_guard_bootstrap.sql')], 'live-like publication fixture')
    const baseline = runPsql(psql, targetEnv, ['-At', '-c', "select count(*) from public.products where published and not is_human_reviewed"], 'baseline legacy row probe')
    if (baseline !== '2') throw new Error(`REHEARSAL_FIXTURE_INVALID: expected 2 legacy unreviewed rows, found ${baseline}`)

    const migration = stripTransaction(read('supabase/migrations/20260929_published_requires_human_review.sql'))
    // Verbatim apply, then a re-apply after a drop, so a rerun is proven clean.
    runPsql(psql, targetEnv, ['-c', migration], 'publication review guard (apply 1)')
    runPsql(psql, targetEnv, ['-c', 'alter table public.products drop constraint if exists products_published_requires_human_review;'], 'constraint drop for replay')
    runPsql(psql, targetEnv, ['-c', migration], 'publication review guard (apply 2)')

    runPsql(psql, targetEnv, ['-f', path.join(rootDir, 'supabase/tests/published_review_guard_assertions.sql')], 'post-guard assertions')

    const rollback = stripTransaction(read('supabase/migrations/20260929_published_requires_human_review_rollback.sql'))
    runPsql(psql, targetEnv, ['-c', rollback], 'emergency rollback')
    // After rollback an unreviewed publish is permitted again, which is the
    // behaviour the rollback exists to restore.
    const restored = runPsql(psql, targetEnv, ['-At', '-c', "select count(*) from pg_constraint where conname = 'products_published_requires_human_review'"], 'rollback restoration probe')
    if (restored !== '0') throw new Error('ROLLBACK_FAILED: the constraint was not dropped')
    runPsql(psql, targetEnv, ['-c', "update public.products set published = true where sku = 'K2-DRAFT-1'"], 'unreviewed publish after rollback')
    const afterRollback = runPsql(psql, targetEnv, ['-At', '-c', "select published from public.products where sku = 'K2-DRAFT-1'"], 'unreviewed publish probe')
    if (afterRollback !== 't') throw new Error('ROLLBACK_FAILED: unreviewed publish is still refused after rollback')

    runBinary(binary('dropdb.exe'), ['-h', '127.0.0.1', '-p', String(PORT), '-U', 'postgres', DATABASE], 'rehearsal database cleanup', env)
    console.log('Publication review guard rehearsal passed: NOT VALID tolerated the legacy rows, unreviewed publish refused, reviewed publish allowed, unpublish allowed, and rollback restored the prior behaviour.')
  } finally {
    if (startedByRunner) {
      spawnSync(binary('pg_ctl.exe'), ['-D', DATA_DIR, '-w', 'stop'], { cwd: rootDir, env, encoding: 'utf8', windowsHide: true })
    }
  }
}

if (process.argv[1]?.endsWith('rehearse-published-review-guard.mjs')) {
  rehearsePublishedReviewGuard()
}
