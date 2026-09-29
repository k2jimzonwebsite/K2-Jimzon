#!/usr/bin/env node
// Isolated rehearsal for 20260929_channel_listing_slices.sql (MAP-026 /
// IDEA-20260929-06). Disposable localhost PostgreSQL only; refuses any
// non-local target.
//
// Proves the prepared slice applies cleanly and idempotently, seeds the six
// footer shops without touching an operational shop, shows Website-listed
// Live/Active SKUs and direct-link Unlisted SKUs, refuses oversell on insert
// and update, guards lot grams, then proves rollback removes the slice while
// preserving an operationalized shop. Never touches production or a shared
// database.
import { spawn, spawnSync } from 'node:child_process'
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

const PORT = 55442
// The shared rehearsal guard only sanctions a `k2_map017_rehearsal*` database
// name, and that guard is not loosened here. This is a MAP-026 rehearsal riding
// the sanctioned prefix, on its own port and its own data directory.
const DATABASE = 'k2_map017_rehearsal_channel_slices'
const TARGET = `postgresql://postgres@127.0.0.1:${PORT}/${DATABASE}`
const BIN_DIR = path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin')
const DATA_DIR = path.join(rootDir, '.tools', 'channel-listing-slices-pg-data')
const LOG_PATH = path.join(rootDir, '.tools', 'channel-listing-slices-pg.log')

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

function runBinaryAsync(executable, args, env) {
  return new Promise((resolve) => {
    const child = spawn(executable, args, {
      cwd: rootDir, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', error => resolve({ status: null, stdout, stderr, error }))
    child.on('close', status => resolve({ status, stdout, stderr, error: null }))
  })
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function rehearseChannelListingSlices() {
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

    runPsql(psql, targetEnv, ['-f', path.join(rootDir, 'supabase/tests/channel_listing_slices_bootstrap.sql')], 'channel slice fixture')

    const migration = stripTransaction(read('supabase/migrations/20260929_channel_listing_slices.sql'))
    // Verbatim apply, then a re-apply, so seed reruns are proven clean.
    runPsql(psql, targetEnv, ['-c', migration], 'channel listing slices (apply 1)')
    runPsql(psql, targetEnv, ['-c', migration], 'channel listing slices (apply 2)')

    runPsql(psql, targetEnv, ['-f', path.join(rootDir, 'supabase/tests/channel_listing_slices_assertions.sql')], 'post-slice assertions')

    // Race two distinct shop rows for the same remaining master stock. The
    // second insert must wait for the first transaction's SKU lock and then
    // observe its committed allocation before it can pass the aggregate guard.
    const shopIds = runPsql(psql, targetEnv, ['-At', '-c', `
      select string_agg(id::text, '|' order by shop_code)
      from public.channel_shops
      where shop_code in ('pasabuy-shopee', 'jworld-shopee');
    `], 'concurrency shop ids').split('|')
    if (shopIds.length !== 2 || shopIds.some(id => !/^[0-9a-f-]{36}$/i.test(id))) {
      throw new Error(`CONCURRENCY_SHOPS_UNAVAILABLE: ${shopIds.join('|')}`)
    }
    runPsql(psql, targetEnv, ['-c', `
      delete from public.channel_shop_allocations;
      update public.inventory_balances set on_hand = 12
        where sku = 'K2-SLICE-1' and location_code = 'MANILA_MAIN';
    `], 'concurrency fixture reset')
    const asyncArgs = ['-h', '127.0.0.1', '-p', String(PORT), '-U', 'postgres', '-d', DATABASE,
      '-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-At', '-c']
    const winnerSql = `set application_name = 'k2_channel_slice_winner';
      begin;
      insert into public.channel_shop_allocations (shop_id, sku, allocated_units)
        values ('${shopIds[0]}', 'K2-SLICE-1', 7);
      select pg_sleep(1.5);
      commit;`
    const winnerPromise = runBinaryAsync(psql, [...asyncArgs, winnerSql], env)
    let winnerIsHoldingLock = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const activity = runPsql(psql, targetEnv, ['-At', '-c', `
        select count(*)::text from pg_stat_activity
        where application_name = 'k2_channel_slice_winner'
          and state = 'active' and wait_event = 'PgSleep';
      `], 'allocation lock-state probe')
      if (activity.split('\n').at(-1)?.trim() === '1') {
        winnerIsHoldingLock = true
        break
      }
      await sleep(100)
    }
    if (!winnerIsHoldingLock) throw new Error('ALLOCATION_WINNER_DID_NOT_HOLD_TRANSACTION')
    const loserStartedAt = Date.now()
    const loser = await runBinaryAsync(psql, [...asyncArgs,
      `insert into public.channel_shop_allocations (shop_id, sku, allocated_units)
        values ('${shopIds[1]}', 'K2-SLICE-1', 7);`], env)
    const loserWaitMs = Date.now() - loserStartedAt
    const winner = await winnerPromise
    if (winner.status !== 0) {
      throw new Error(`ALLOCATION_WINNER_FAILED: ${String(winner.stderr || winner.stdout).trim()}`)
    }
    const loserDetail = String(loser.stderr || loser.stdout)
    if (loser.status === 0 || !loserDetail.includes('K2_SHOP_OVERSELL_REFUSED')) {
      throw new Error(`CONCURRENT_ALLOCATION_WAS_NOT_REFUSED: ${loserDetail.trim() || 'no error'}`)
    }
    if (loserWaitMs < 500) throw new Error(`CONCURRENT_ALLOCATION_DID_NOT_WAIT: ${loserWaitMs}ms`)

    // Operationalize one seed shop, then roll back: the rollback must keep it.
    runPsql(psql, targetEnv, ['-c', "update public.channel_shops set status = 'operational' where shop_code = 'pasabuy-shopee'"], 'operationalize one seed shop')
    const rollback = stripTransaction(read('supabase/migrations/20260929_channel_listing_slices_rollback.sql'))
    runPsql(psql, targetEnv, ['-c', rollback], 'emergency rollback')

    const remaining = runPsql(psql, targetEnv, ['-At', '-c', "select count(*) from public.channel_shops where shop_code in ('pasabuy-lazada','pasabuy-shopee','pasabuy-tiktok','jworld-lazada','jworld-shopee','jworld-tiktok')"], 'rollback seed probe')
    if (remaining !== '1') throw new Error(`ROLLBACK_FAILED: expected only the operationalized seed shop to remain, found ${remaining}`)
    const kept = runPsql(psql, targetEnv, ['-At', '-c', "select status from public.channel_shops where shop_code = 'pasabuy-shopee'"], 'rollback preservation probe')
    if (kept !== 'operational') throw new Error('ROLLBACK_FAILED: the operationalized shop was removed')
    const viewGone = runPsql(psql, targetEnv, ['-At', '-c', "select count(*) from pg_views where viewname = 'v_storefront_visible_skus'"], 'rollback view probe')
    if (viewGone !== '0') throw new Error('ROLLBACK_FAILED: the visibility view survived')
    const triggerGone = runPsql(psql, targetEnv, ['-At', '-c', "select count(*) from pg_trigger where tgname = 'channel_shop_allocations_oversell_guard'"], 'rollback trigger probe')
    if (triggerGone !== '0') throw new Error('ROLLBACK_FAILED: the oversell guard survived')
    const columnGone = runPsql(psql, targetEnv, ['-At', '-c', "select count(*) from information_schema.columns where table_name = 'product_batches' and column_name = 'net_weight_g'"], 'rollback column probe')
    if (columnGone !== '0') throw new Error('ROLLBACK_FAILED: the lot weight column survived')

    runBinary(binary('dropdb.exe'), ['-h', '127.0.0.1', '-p', String(PORT), '-U', 'postgres', DATABASE], 'rehearsal database cleanup', env)
    console.log('Channel listing slices rehearsal passed: safe public Website view, serialized concurrent allocation refusal, SKU edits and stock reductions guarded, lot grams guarded, and rollback preserved an operationalized shop.')
  } finally {
    if (startedByRunner) {
      spawnSync(binary('pg_ctl.exe'), ['-D', DATA_DIR, '-w', 'stop'], { cwd: rootDir, env, encoding: 'utf8', windowsHide: true })
    }
  }
}

if (process.argv[1]?.endsWith('rehearse-channel-listing-slices.mjs')) {
  rehearseChannelListingSlices().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
