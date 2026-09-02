#!/usr/bin/env node
/**
 * MAP-027 — portable rehearsal for the product knowledge boundary.
 *
 * The migration cannot be applied to production until the OWNER-005 backup gate
 * clears, which is exactly why this exists: it proves the DDL is correct now,
 * against an isolated PostgreSQL 17.11 loopback, so the eventual production
 * apply is a known quantity rather than a first attempt.
 *
 * What it actually checks is the boundary, not just that the SQL parses:
 *
 *   1. the migration applies, and applies again idempotently
 *   2. an anonymous reader sees approved rows and cannot see drafts
 *   3. a signed-in non-staff account cannot write knowledge
 *   4. staff writes land, and replace the previous record rather than merging
 *   5. approving empty text is refused by the table, not only by the client
 *   6. knowledge for a SKU the catalog does not carry is refused
 *
 * Run: npm run rehearse:product-knowledge
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

const config = {
  binDir: path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin'),
  dataDir: path.join(rootDir, '.tools', 'map027-knowledge-pg-data'),
  logPath: path.join(rootDir, '.tools', 'map027-knowledge-pg.log'),
  port: 54327,
  database: 'k2_map027_knowledge_rehearsal',
}

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

/**
 * The smallest environment the migration legitimately depends on.
 *
 * Deliberately minimal: anything invented here that production does not have
 * would make the rehearsal pass for the wrong reason.
 */
const BOOTSTRAP = `
create extension if not exists pgcrypto with schema public;
create schema if not exists extensions;
create schema if not exists k2_private;
create schema if not exists auth;
create or replace function extensions.digest(bytea, text) returns bytea
  language sql immutable as $$ select public.digest($1, $2) $$;

create table if not exists public.products (sku text primary key, name text);
insert into public.products(sku, name) values ('caffe-milano-gold', 'Caffe Milano')
  on conflict do nothing;

create table if not exists k2_private.admin_command_receipts (
  actor_id uuid, action text, idempotency_key uuid, payload_hash text,
  result jsonb, created_at timestamptz not null default now(), completed_at timestamptz,
  primary key (actor_id, action, idempotency_key)
);

create or replace function k2_private.verify_admin_bff_request(
  text, bigint, uuid, uuid, text, text
) returns boolean language sql stable as $$ select true $$;

-- Staff identity, driven by a setting so the rehearsal can switch roles.
create or replace function public.is_staff() returns boolean
  language sql stable as $$ select coalesce(current_setting('k2.staff', true), 'off') = 'on' $$;
create or replace function auth.uid() returns uuid
  language sql stable as $$ select '00000000-0000-4000-8000-000000000001'::uuid $$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
grant usage on schema public, extensions to anon, authenticated;
`

/** Each check returns a single word so a mismatch is unambiguous. */
const CHECKS = [
  {
    name: 'staff can publish approved knowledge',
    sql: `set k2.staff = 'on';
      select (public.save_product_knowledge_v1('caffe-milano-gold',
        '[{"key":"uses","status":"approved","value":"Espresso."},
          {"key":"storage","status":"draft","value":"Unreviewed."}]'::jsonb,
        '[{"question":"Ground?","answer":"No.","status":"approved"}]'::jsonb
      ))->>'approvedFields';`,
    expect: '1',
  },
  {
    name: 'an anonymous reader sees approved rows only',
    sql: `set k2.staff = 'off'; set role anon;
      select count(*)::text from public.product_knowledge;`,
    expect: '1',
  },
  {
    name: 'an anonymous reader cannot see a draft answer',
    sql: `set k2.staff = 'off'; set role anon;
      select coalesce(string_agg(value, ','), 'none') from public.product_knowledge;`,
    expect: 'Espresso.',
  },
  {
    name: 'an anonymous reader cannot write knowledge',
    sql: `set role anon;
      do $$ begin
        insert into public.product_knowledge(sku, field_key, status, value)
        values ('caffe-milano-gold', 'uses', 'approved', 'Injected.');
        raise exception 'ANON_WRITE_SUCCEEDED';
      exception when insufficient_privilege or others then
        if sqlerrm = 'ANON_WRITE_SUCCEEDED' then raise; end if;
      end $$;
      select 'refused';`,
    expect: 'refused',
  },
  {
    name: 'a signed-in non-staff account cannot publish',
    sql: `set k2.staff = 'off';
      do $$ begin
        perform public.save_product_knowledge_v1('caffe-milano-gold', '[]'::jsonb, '[]'::jsonb);
        raise exception 'NON_STAFF_WRITE_SUCCEEDED';
      exception when others then
        if sqlerrm = 'NON_STAFF_WRITE_SUCCEEDED' then raise; end if;
      end $$;
      select 'refused';`,
    expect: 'refused',
  },
  {
    name: 'approving empty text is refused by the table',
    sql: `set k2.staff = 'on';
      do $$ begin
        perform public.save_product_knowledge_v1('caffe-milano-gold',
          '[{"key":"uses","status":"approved","value":"   "}]'::jsonb, '[]'::jsonb);
        raise exception 'EMPTY_APPROVAL_SUCCEEDED';
      exception when others then
        if sqlerrm = 'EMPTY_APPROVAL_SUCCEEDED' then raise; end if;
      end $$;
      select 'refused';`,
    expect: 'refused',
  },
  {
    name: 'knowledge for an unknown SKU is refused',
    sql: `set k2.staff = 'on';
      do $$ begin
        perform public.save_product_knowledge_v1('not-a-real-sku', '[]'::jsonb, '[]'::jsonb);
        raise exception 'UNKNOWN_SKU_SUCCEEDED';
      exception when others then
        if sqlerrm = 'UNKNOWN_SKU_SUCCEEDED' then raise; end if;
      end $$;
      select 'refused';`,
    expect: 'refused',
  },
  {
    name: 'a save replaces the record rather than merging into it',
    sql: `set k2.staff = 'on';
      select public.save_product_knowledge_v1('caffe-milano-gold',
        '[{"key":"pairings","status":"approved","value":"Biscuits."}]'::jsonb,
        '[]'::jsonb);
      select coalesce(string_agg(field_key, ',' order by field_key), 'none')
      from public.product_knowledge where sku = 'caffe-milano-gold';`,
    expect: 'pairings',
  },
  {
    name: 'a removed FAQ actually disappears',
    sql: `set k2.staff = 'on';
      select count(*)::text from public.product_knowledge_faqs;`,
    expect: '0',
  },
]

function main() {
  const executable = requireRuntime()
  const env = {
    ...process.env,
    PGHOST: '127.0.0.1', PGPORT: String(config.port),
    PGUSER: 'postgres', PGDATABASE: 'postgres',
  }
  let startedHere = false

  try {
    if (!fs.existsSync(path.join(config.dataDir, 'PG_VERSION'))) {
      fs.mkdirSync(config.dataDir, { recursive: true })
      run(executable['initdb.exe'],
        ['-D', config.dataDir, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'],
        'portable PostgreSQL initialization', env)
    }

    const status = spawnSync(executable['pg_ctl.exe'], ['-D', config.dataDir, 'status'], {
      cwd: rootDir, env, encoding: 'utf8', windowsHide: true,
    })
    if (status.status !== 0) {
      run(executable['pg_ctl.exe'],
        ['-D', config.dataDir, '-l', config.logPath,
          '-o', `-p ${config.port} -h 127.0.0.1`, '-w', 'start'],
        'portable PostgreSQL startup', env, { stdio: 'ignore' })
      startedHere = true
    }

    run(executable['dropdb.exe'], ['--if-exists', config.database], 'rehearsal database reset', env)
    run(executable['createdb.exe'], [config.database], 'rehearsal database creation', env)
    const dbEnv = { ...env, PGDATABASE: config.database }

    const psql = (sql, label) => run(
      executable['psql.exe'],
      ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql],
      label, dbEnv,
    )
    const psqlFile = (file, label) => run(
      executable['psql.exe'],
      ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-f', file],
      label, dbEnv,
    )

    psql(BOOTSTRAP, 'rehearsal bootstrap')

    const migration = path.join(rootDir, 'supabase', 'migrations', '20260828_product_knowledge_boundary.sql')
    psqlFile(migration, 'product knowledge migration')
    console.log('[ok] migration applied')
    psqlFile(migration, 'product knowledge migration replay')
    console.log('[ok] migration is idempotent on replay')

    let failures = 0
    for (const check of CHECKS) {
      const output = psql(check.sql, check.name)
      const actual = output.split('\n').map((line) => line.trim()).filter(Boolean).pop() || ''
      if (actual === check.expect) {
        console.log(`[ok] ${check.name}`)
      } else {
        failures += 1
        console.error(`[FAIL] ${check.name}: expected "${check.expect}", got "${actual}"`)
      }
    }

    if (failures > 0) {
      console.error(`\n${failures} of ${CHECKS.length} boundary checks failed.`)
      process.exitCode = 1
      return
    }
    console.log(`\nAll ${CHECKS.length} boundary checks passed against isolated PostgreSQL.`)
    console.log('This rehearses the migration. It is not a production apply.')
  } finally {
    if (startedHere) {
      spawnSync(executable['pg_ctl.exe'], ['-D', config.dataDir, '-w', 'stop'], {
        cwd: rootDir, env, encoding: 'utf8', windowsHide: true, stdio: 'ignore',
      })
    }
  }
}

main()
