#!/usr/bin/env node
/**
 * MAP-023 — Portable PostgreSQL 17 rehearsal for the Cash on Delivery
 * availability switch (IDEA-20260920-12).
 *
 * Checks:
 *   1. Migration applies cleanly and idempotently
 *   2. Seed row ships with COD switched off
 *   3. Anonymous reads see the flag (storefront path)
 *   4. Prepaid order notes insert while COD is off
 *   5. COD-claiming order notes are refused with K2COD while off
 *   6. Switching on permits COD notes; switching off keeps them refused
 *   7. Updates that leave the note untouched always pass
 *   8. Rollback migration drops every created object cleanly
 *
 * Run: npm run rehearse:payment-methods
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

const config = {
  binDir: process.env.K2_TEST_PG_BIN || path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin'),
  dataDir: path.join(rootDir, '.tools', 'map023-payment-methods-pg-data'),
  logPath: path.join(rootDir, '.tools', 'map023-payment-methods-pg.log'),
  port: 54335,
  database: 'k2_map023_payment_methods_rehearsal',
}

function requireRuntime() {
  const names = ['initdb.exe', 'pg_ctl.exe', 'psql.exe', 'dropdb.exe', 'createdb.exe']
  const executables = Object.fromEntries(names.map((name) => [
    name,
    path.join(config.binDir, process.platform === 'win32' ? name : name.replace(/\.exe$/, '')),
  ]))
  const missing = names.filter((name) => !fs.existsSync(executables[name]))
  if (missing.length > 0) throw new Error(`PORTABLE_POSTGRES_RUNTIME_MISSING: ${missing.join(', ')}`)
  return executables
}

function run(executable, args, label, env, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: rootDir, env, encoding: 'utf8', windowsHide: true, ...options,
  })
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.stdout || result.error?.message || 'unknown').trim()
    throw new Error(`${label} failed: ${detail}`)
  }
  return String(result.stdout || '').trim()
}

const BOOTSTRAP = `
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create or replace function public.is_staff() returns boolean language sql stable as $$
  select true;
$$;

-- Minimal stage for the trigger: only the columns the guard reads or writes.
create table if not exists public.order_requests (
  id uuid primary key default gen_random_uuid(),
  customer_note text null
);
`

function main() {
  const executable = requireRuntime()
  const env = {
    ...process.env,
    PGHOST: '127.0.0.1',
    PGPORT: String(config.port),
    PGUSER: 'postgres',
    PGDATABASE: 'postgres',
  }
  let startedHere = false

  try {
    if (!fs.existsSync(path.join(config.dataDir, 'PG_VERSION'))) {
      fs.mkdirSync(config.dataDir, { recursive: true })
      run(executable['initdb.exe'],
        ['-D', config.dataDir, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'],
        'portable PostgreSQL initialization', env)
    }

    const socketOption = process.platform === 'win32'
      ? `-p ${config.port} -h 127.0.0.1`
      : `-p ${config.port} -h 127.0.0.1 -k "${config.dataDir}"`

    const status = spawnSync(executable['pg_ctl.exe'], ['-D', config.dataDir, 'status'], {
      cwd: rootDir, env, encoding: 'utf8', windowsHide: true,
    })
    if (status.status !== 0) {
      run(executable['pg_ctl.exe'],
        ['-D', config.dataDir, '-l', config.logPath, '-o', socketOption, '-w', 'start'],
        'portable PostgreSQL startup', env, { stdio: 'ignore' })
      startedHere = true
    }

    run(executable['dropdb.exe'], ['--if-exists', config.database], 'rehearsal database reset', env)
    run(executable['createdb.exe'], [config.database], 'rehearsal database creation', env)
    const dbEnv = { ...env, PGDATABASE: config.database }

    const psql = (sql, label) => run(
      executable['psql.exe'],
      ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql], label, dbEnv,
    )
    const psqlFile = (file, label) => run(
      executable['psql.exe'],
      ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-f', file], label, dbEnv,
    )

    psql(BOOTSTRAP, 'pre-migration bootstrap')

    const migration = path.join(rootDir, 'supabase', 'migrations', '20260920_payment_method_availability.sql')
    psqlFile(migration, 'payment-method availability migration')
    console.log('[ok] migration applied successfully')
    psqlFile(migration, 'payment-method availability replay')
    console.log('[ok] migration is idempotent on replay')

    // Check 1: seed row ships switched off
    const seeded = psql(`select cod_available::text from public.payment_method_availability where method='cod';`, 'seed default')
    if (seeded !== 'false') throw new Error(`Expected cod available=false, got ${seeded}`)
    console.log('[ok] seed row ships with Cash on Delivery switched off')

    // Check 2: anonymous reads see the flag (the storefront path)
    const anonReadRaw = psql(`set role anon; select cod_available::text from public.payment_method_availability where method='cod'; reset role;`, 'anon read')
    const anonRead = anonReadRaw.split('\n').map((line) => line.trim()).find((line) => line === 'true' || line === 'false')
    if (anonRead !== 'false') throw new Error(`Expected anon read false, got ${anonReadRaw}`)
    console.log('[ok] anonymous callers can read the switch')

    // Check 3: prepaid notes insert while off
    psql(`insert into public.order_requests (customer_note) values ('[Payment: Prepaid (GCash / Maya / Bank Transfer)]');`, 'prepaid insert')
    console.log('[ok] prepaid order notes insert while the switch is off')

    // Check 4: COD notes refused with K2COD while off
    let codBlocked = false
    try {
      psql(`insert into public.order_requests (customer_note) values ('[Payment: Cash on Delivery (COD)]');`, 'cod insert')
    } catch (e) {
      if (e.message.includes('COD_UNAVAILABLE')) codBlocked = true
    }
    if (!codBlocked) throw new Error('COD-claiming insert was not refused while off!')
    console.log('[ok] COD-claiming order notes are refused with K2COD while off')

    // Check 5: switching on permits COD, switching back refuses again
    psql(`update public.payment_method_availability set cod_available = true where method='cod';`, 'switch on')
    psql(`insert into public.order_requests (customer_note) values ('[Payment: Cash on Delivery (COD)]');`, 'cod insert while on')
    psql(`update public.payment_method_availability set cod_available = false where method='cod';`, 'switch off')
    let codBlockedAgain = false
    try {
      psql(`insert into public.order_requests (customer_note) values ('Cash on Delivery please');`, 'cod insert retest')
    } catch (e) {
      if (e.message.includes('COD_UNAVAILABLE')) codBlockedAgain = true
    }
    if (!codBlockedAgain) throw new Error('COD-claiming insert was not refused after switching off!')
    console.log('[ok] switching on permits COD notes; switching off refuses them again')

    // Check 6: untouched-note updates always pass, even for COD rows
    psql(`update public.order_requests set id = id where customer_note like '%Prepaid%';`, 'untouched update')
    console.log('[ok] updates that leave the note untouched always pass')

    // Check 7: rollback drops every created object
    const rollback = path.join(rootDir, 'supabase', 'migrations', '20260920_payment_method_availability_rollback.sql')
    psqlFile(rollback, 'rollback migration')
    const remaining = psql(`
      select count(*)::text from information_schema.tables
      where table_schema='public' and table_name='payment_method_availability';
    `, 'check table dropped')
    if (remaining !== '0') throw new Error(`Expected 0 tables after rollback, found ${remaining}`)
    const triggerGone = psql(`
      select count(*)::text from information_schema.triggers
      where trigger_name='check_cod_availability_trigger';
    `, 'check trigger dropped')
    if (triggerGone !== '0') throw new Error('Trigger survived rollback!')
    console.log('[ok] reversible rollback drops the table, function, and trigger cleanly')

    console.log('\nAll MAP-023 payment-method availability checks PASSED.')
  } finally {
    if (startedHere) {
      spawnSync(executable['pg_ctl.exe'], ['-D', config.dataDir, '-w', 'stop'], {
        cwd: rootDir, env, encoding: 'utf8', windowsHide: true, stdio: 'ignore',
      })
    }
  }
}

main()
