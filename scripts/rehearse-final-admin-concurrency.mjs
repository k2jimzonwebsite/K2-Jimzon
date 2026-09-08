#!/usr/bin/env node
/**
 * MAP-028 H-014 — isolated final-Admin concurrency rehearsal.
 *
 * Two sessions demote two different Admins at the same moment. With only a
 * per-row `for update` lock, both can observe two Admins and both can commit,
 * leaving the project with none. This runner reproduces that against a minimal
 * compatible schema, then installs the repository's prepared serialization
 * migration and proves the same race now leaves at least one Admin standing and
 * refuses the losing operation clearly.
 *
 * It never connects to production and never touches real staff records.
 *
 *   node scripts/rehearse-final-admin-concurrency.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const migrationPath = path.join(
  rootDir, 'supabase', 'migrations', '20260905_privileged_membership_serialization.sql',
)

const config = {
  binDir: path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin'),
  dataDir: path.join(rootDir, '.tools', 'final-admin-pg-data'),
  logPath: path.join(rootDir, '.tools', 'final-admin-pg.log'),
  port: 54331,
  database: 'k2_final_admin_rehearsal',
}

const ACTOR = '30000000-0000-4000-8000-000000000001'
const ADMIN_A = '30000000-0000-4000-8000-00000000000a'
const ADMIN_B = '30000000-0000-4000-8000-00000000000b'

function requireRuntime() {
  const names = ['initdb.exe', 'pg_ctl.exe', 'psql.exe', 'dropdb.exe', 'createdb.exe']
  const executables = Object.fromEntries(names.map((name) => [name, path.join(config.binDir, name)]))
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

function runAsync(executable, args, env) {
  return new Promise((resolve) => {
    const child = spawn(executable, args, { cwd: rootDir, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => resolve({ status: null, stdout, stderr, error }))
    child.on('close', (status) => resolve({ status, stdout, stderr, error: null }))
  })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The current shape: lock the target row, count Admins, demote. */
const VULNERABLE_GUARD = `
create or replace function public.demote_admin(p_user_id uuid, p_serialize boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_before public.user_profiles;
  v_admin_count integer;
begin
  if p_serialize then perform k2_private.lock_privileged_membership(); end if;
  select * into v_before from public.user_profiles where id = p_user_id for update;
  if not found then raise exception 'K2_ADMIN_STAFF_NOT_FOUND'; end if;
  if v_before.role = 'Admin' then
    select count(*)::integer into v_admin_count from public.user_profiles where role = 'Admin';
    if v_admin_count <= 1 then raise exception 'K2_ADMIN_FINAL_ADMIN'; end if;
  end if;
  perform pg_catalog.pg_sleep(1.5);
  update public.user_profiles set role = 'Staff' where id = p_user_id;
  return 'demoted';
end; $$;
`

const BOOTSTRAP = `
create schema if not exists k2_private;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable
as $$ select '${ACTOR}'::uuid $$;

create table public.user_profiles (
  id uuid primary key,
  email text not null,
  role text not null,
  updated_at timestamptz not null default now()
);

insert into public.user_profiles (id, email, role) values
  ('${ADMIN_A}', 'admin-a@example.test', 'Admin'),
  ('${ADMIN_B}', 'admin-b@example.test', 'Admin');

-- Placeholder so the vulnerable run can call the same function signature.
create or replace function k2_private.lock_privileged_membership()
returns void language plpgsql as $$ begin end; $$;
`

function extractLockFunction() {
  const migration = fs.readFileSync(migrationPath, 'utf8').replace(/\r\n/g, '\n')
  const start = migration.indexOf('create or replace function k2_private.lock_privileged_membership()')
  const end = migration.indexOf('revoke all on function k2_private.lock_privileged_membership()', start)
  if (start < 0 || end < 0) throw new Error('LOCK_FUNCTION_NOT_FOUND_IN_MIGRATION')
  return migration.slice(start, end)
}

async function raceDemotions(executable, dbEnv, psqlArgs, { serialize }) {
  const call = (id, name) => `set application_name='${name}';
    select public.demote_admin('${id}', ${serialize});`
  const first = runAsync(executable['psql.exe'], psqlArgs(call(ADMIN_A, 'k2_final_admin_first')), dbEnv)
  await sleep(250)
  const second = runAsync(executable['psql.exe'], psqlArgs(call(ADMIN_B, 'k2_final_admin_second')), dbEnv)
  return { first: await first, second: await second }
}

async function main() {
  const executable = requireRuntime()
  const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: String(config.port), PGUSER: 'postgres', PGDATABASE: 'postgres' }
  let startedHere = false

  try {
    if (!fs.existsSync(path.join(config.dataDir, 'PG_VERSION'))) {
      fs.mkdirSync(config.dataDir, { recursive: true })
      run(executable['initdb.exe'], ['-D', config.dataDir, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'],
        'portable PostgreSQL initialization', env)
    }
    const status = spawnSync(executable['pg_ctl.exe'], ['-D', config.dataDir, 'status'], {
      cwd: rootDir, env, encoding: 'utf8', windowsHide: true,
    })
    if (status.status !== 0) {
      run(executable['pg_ctl.exe'],
        ['-D', config.dataDir, '-l', config.logPath, '-o', `-p ${config.port} -h 127.0.0.1`, '-w', 'start'],
        'portable PostgreSQL startup', env, { stdio: 'ignore' })
      startedHere = true
    }

    const dbEnv = { ...env, PGDATABASE: config.database }
    const psqlArgs = (sql) => ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql]
    const psql = (sql, label) => run(executable['psql.exe'], psqlArgs(sql), label, dbEnv)
    const adminCount = () => Number(psql(
      "select count(*)::text from public.user_profiles where role='Admin';", 'admin count',
    ).split('\n').at(-1).trim())

    // 1. Reproduce the defect with the current per-row guard.
    run(executable['dropdb.exe'], ['--if-exists', config.database], 'database reset', env)
    run(executable['createdb.exe'], [config.database], 'database creation', env)
    psql(BOOTSTRAP, 'bootstrap')
    psql(VULNERABLE_GUARD, 'current guard install')

    const vulnerable = await raceDemotions(executable, dbEnv, psqlArgs, { serialize: false })
    const vulnerableAdmins = adminCount()
    const bothSucceeded = vulnerable.first.status === 0 && vulnerable.second.status === 0
    if (!bothSucceeded || vulnerableAdmins !== 0) {
      throw new Error(
        `DEFECT_NOT_REPRODUCED: expected both demotions to commit and 0 Admins to remain, got ` +
        `first=${vulnerable.first.status} second=${vulnerable.second.status} admins=${vulnerableAdmins}`,
      )
    }
    console.log('[reproduced] two concurrent demotions both committed and left 0 Admins')

    // 2. Install the prepared serialization and race again.
    run(executable['dropdb.exe'], ['--if-exists', config.database], 'database reset', env)
    run(executable['createdb.exe'], [config.database], 'database creation', env)
    psql(BOOTSTRAP, 'bootstrap')
    psql(extractLockFunction(), 'repository lock function install')
    psql(VULNERABLE_GUARD, 'guarded function install')

    const serialized = await raceDemotions(executable, dbEnv, psqlArgs, { serialize: true })
    const remainingAdmins = adminCount()
    const outcomes = [serialized.first, serialized.second]
    const succeeded = outcomes.filter((result) => result.status === 0).length
    const refused = outcomes.filter((result) => String(result.stderr).includes('K2_ADMIN_FINAL_ADMIN')).length

    if (remainingAdmins !== 1) throw new Error(`RECOVERY_INVARIANT_BROKEN: ${remainingAdmins} Admins remain, expected 1`)
    if (succeeded !== 1) throw new Error(`EXPECTED_EXACTLY_ONE_SUCCESS: got ${succeeded}`)
    if (refused !== 1) throw new Error(`EXPECTED_ONE_CLEAR_REFUSAL: got ${refused}`)

    console.log('[ok] serialized: one demotion committed, one was refused with K2_ADMIN_FINAL_ADMIN')
    console.log('[ok] one recoverable authorized Admin remains')

    // 3. No partial state: the refused session changed nothing.
    const roles = psql(
      "select string_agg(role, ',' order by email) from public.user_profiles;", 'final roles',
    ).split('\n').at(-1).trim()
    if (roles !== 'Admin,Staff' && roles !== 'Staff,Admin') {
      throw new Error(`PARTIAL_STATE_COMMITTED: roles=${roles}`)
    }
    console.log(`[ok] final roles ${roles}`)
    console.log('[pass] MAP-028 H-014 final-Admin concurrency rehearsal')
  } finally {
    if (startedHere) {
      spawnSync(path.join(config.binDir, 'pg_ctl.exe'), ['-D', config.dataDir, '-m', 'fast', 'stop'], {
        cwd: rootDir, env: { ...process.env, PGHOST: '127.0.0.1', PGPORT: String(config.port), PGUSER: 'postgres' },
        encoding: 'utf8', windowsHide: true,
      })
    }
  }
}

main().catch((error) => {
  console.error(`[fail] ${error.message}`)
  process.exitCode = 1
})
