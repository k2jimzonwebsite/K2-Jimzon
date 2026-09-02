#!/usr/bin/env node
/**
 * MAP-023 — isolated last-unit reservation concurrency rehearsal.
 *
 * This runner extracts the repository's actual confirm_order_request function,
 * executes it against a minimal compatible PostgreSQL schema, and races two
 * submitted orders for one eligible unit. It never connects to production.
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20260809_operations_hardening.sql')

const config = {
  binDir: path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin'),
  dataDir: path.join(rootDir, '.tools', 'map023-last-unit-pg-data'),
  logPath: path.join(rootDir, '.tools', 'map023-last-unit-pg.log'),
  port: 54329,
  database: 'k2_map023_last_unit_rehearsal',
}

const winnerOrderId = '10000000-0000-4000-8000-000000000001'
const loserOrderId = '10000000-0000-4000-8000-000000000002'
const actorId = '20000000-0000-4000-8000-000000000001'

function requireRuntime() {
  const names = ['initdb.exe', 'pg_ctl.exe', 'psql.exe', 'dropdb.exe', 'createdb.exe']
  const executables = Object.fromEntries(names.map((name) => [name, path.join(config.binDir, name)]))
  const missing = names.filter((name) => !fs.existsSync(executables[name]))
  if (missing.length > 0) throw new Error(`PORTABLE_POSTGRES_RUNTIME_MISSING: ${missing.join(', ')}`)
  return executables
}

function run(executable, args, label, env, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: rootDir,
    env,
    encoding: 'utf8',
    windowsHide: true,
    ...options,
  })
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.stdout || result.error?.message || 'unknown').trim()
    throw new Error(`${label} failed: ${detail}`)
  }
  return String(result.stdout || '').trim()
}

function runAsync(executable, args, env) {
  return new Promise((resolve) => {
    const child = spawn(executable, args, {
      cwd: rootDir,
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => resolve({ status: null, stdout, stderr, error }))
    child.on('close', (status) => resolve({ status, stdout, stderr, error: null }))
  })
}

function extractConfirmationFunction() {
  const migration = fs.readFileSync(migrationPath, 'utf8').replace(/\r\n/g, '\n')
  const startMarker = 'create or replace function public.confirm_order_request('
  const endMarker = 'grant execute on function public.confirm_order_request(uuid,text) to authenticated;'
  const start = migration.indexOf(startMarker)
  const end = migration.indexOf(endMarker, start)
  if (start < 0 || end < 0) throw new Error('CONFIRM_ORDER_FUNCTION_NOT_FOUND')
  return migration.slice(start, end + endMarker.length)
}

const BOOTSTRAP = `
create extension if not exists pgcrypto with schema public;
create schema if not exists auth;

do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then
    create role authenticated nologin;
  end if;
end $$;

create type public.channel_type as enum ('website_retail','shopee','lazada','tiktok');
create type public.order_status_enum as enum ('Pending','Packed','Completed','Cancelled');
create type public.payment_status_enum as enum ('Unpaid','Paid','Refunded');

create or replace function auth.uid() returns uuid language sql stable
as $$ select '${actorId}'::uuid $$;
create or replace function public.is_staff() returns boolean language sql stable
as $$ select true $$;

create table public.products (
  sku text primary key,
  stock_available integer not null default 0
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default true,
  archived_at timestamptz,
  starts_at timestamptz not null default now() - interval '1 day',
  ends_at timestamptz,
  max_redemptions integer,
  redemption_count integer not null default 0
);

create table public.order_requests (
  id uuid primary key,
  status text not null default 'submitted',
  coupon_id uuid references public.coupons(id),
  discount_amount numeric not null default 0,
  channel_source text not null default 'website',
  fulfillment_method text not null default 'pickup',
  payment_status text not null default 'unpaid',
  customer_name text not null default 'Concurrency fixture',
  customer_email text not null default 'fixture@example.test',
  total_amount numeric not null default 100,
  shipping_quote_status text not null default 'waived',
  delivery_status text not null default 'awaiting_quote',
  confirmed_by uuid,
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.order_request_items (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests(id),
  sku text not null references public.products(sku),
  product_name text not null default 'Last unit fixture',
  quantity integer not null check (quantity > 0),
  line_total numeric not null,
  created_at timestamptz not null default now()
);

create table public.product_batches (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku),
  quantity integer not null check (quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity between 0 and quantity),
  inventory_status text not null default 'available',
  expiry_date date,
  best_before_date date,
  clearance_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_balances (
  sku text not null references public.products(sku),
  location_code text not null,
  on_hand integer not null default 0,
  reserved integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (sku, location_code)
);

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests(id),
  order_request_item_id uuid not null references public.order_request_items(id),
  batch_id uuid not null references public.product_batches(id),
  sku text not null references public.products(sku),
  quantity integer not null check (quantity > 0),
  packed_quantity integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_request_item_id, batch_id)
);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id),
  order_request_id uuid not null references public.order_requests(id),
  discount_amount numeric not null,
  status text not null default 'reserved'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku),
  quantity integer not null,
  channel_source public.channel_type not null,
  fulfillment_method text not null,
  order_status public.order_status_enum not null,
  payment_status public.payment_status_enum not null,
  customer_name text,
  customer_email text,
  total_amount numeric not null,
  order_request_id uuid not null references public.order_requests(id)
);

create table public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku),
  location_code text not null,
  event_type text not null,
  quantity integer not null,
  reference_type text not null,
  reference_id uuid not null,
  reason text,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create table public.order_request_events (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests(id),
  from_status text,
  to_status text not null,
  reason text,
  actor_id uuid,
  created_at timestamptz not null default now()
);

insert into public.products (sku, stock_available) values ('SKU-LAST-1', 1);
insert into public.product_batches (sku, quantity, reserved_quantity, expiry_date)
values ('SKU-LAST-1', 1, 0, current_date + 180);
insert into public.inventory_balances (sku, location_code, on_hand, reserved)
values ('SKU-LAST-1', 'MANILA_MAIN', 1, 0);
insert into public.order_requests (id) values ('${winnerOrderId}'), ('${loserOrderId}');
insert into public.order_request_items (order_request_id, sku, quantity, line_total)
values ('${winnerOrderId}', 'SKU-LAST-1', 1, 100),
       ('${loserOrderId}', 'SKU-LAST-1', 1, 100);
`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
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

    const status = spawnSync(executable['pg_ctl.exe'], ['-D', config.dataDir, 'status'], {
      cwd: rootDir, env, encoding: 'utf8', windowsHide: true,
    })
    if (status.status !== 0) {
      run(executable['pg_ctl.exe'],
        ['-D', config.dataDir, '-l', config.logPath, '-o', `-p ${config.port} -h 127.0.0.1`, '-w', 'start'],
        'portable PostgreSQL startup', env, { stdio: 'ignore' })
      startedHere = true
    }

    run(executable['dropdb.exe'], ['--if-exists', config.database], 'rehearsal database reset', env)
    run(executable['createdb.exe'], [config.database], 'rehearsal database creation', env)
    const dbEnv = { ...env, PGDATABASE: config.database }
    const psqlArgs = (sql) => ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql]
    const psql = (sql, label) => run(executable['psql.exe'], psqlArgs(sql), label, dbEnv)

    psql(BOOTSTRAP, 'last-unit bootstrap')
    psql(extractConfirmationFunction(), 'actual confirmation function install')
    console.log('[ok] repository confirm_order_request function installed')

    const winnerSql = `set application_name='k2_last_unit_winner';
      begin;
      select (public.confirm_order_request('${winnerOrderId}', 'Last-unit concurrency rehearsal.')).status;
      select pg_sleep(2);
      commit;`
    const winner = runAsync(executable['psql.exe'], psqlArgs(winnerSql), dbEnv)

    let winnerIsHoldingLock = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const activity = psql(`select count(*)::text from pg_stat_activity
        where application_name='k2_last_unit_winner' and state='active' and query like '%pg_sleep%';`,
      'winner lock-state probe')
      if (activity.split('\n').at(-1)?.trim() === '1') {
        winnerIsHoldingLock = true
        break
      }
      await sleep(100)
    }
    if (!winnerIsHoldingLock) throw new Error('WINNER_DID_NOT_HOLD_LAST_UNIT_LOCK')
    console.log('[ok] winning transaction holds the reserved lot lock')

    const loserSql = `set application_name='k2_last_unit_loser';
      select (public.confirm_order_request('${loserOrderId}', 'Competing last-unit rehearsal.')).status;`
    const loserStartedAt = Date.now()
    const loser = await runAsync(executable['psql.exe'], psqlArgs(loserSql), dbEnv)
    const loserWaitMs = Date.now() - loserStartedAt
    const winnerResult = await winner

    if (winnerResult.status !== 0) {
      throw new Error(`WINNER_FAILED: ${String(winnerResult.stderr || winnerResult.stdout).trim()}`)
    }
    const loserDetail = String(loser.stderr || loser.stdout)
    if (loser.status === 0 || !loserDetail.includes('Insufficient sellable lot stock')) {
      throw new Error(`LOSER_WAS_NOT_REFUSED: ${loserDetail.trim() || 'no error'}`)
    }
    if (loserWaitMs < 750) throw new Error(`LOSER_DID_NOT_WAIT_FOR_LOCK: ${loserWaitMs}ms`)
    console.log(`[ok] competing order waited ${loserWaitMs}ms and was refused for insufficient stock`)

    const ambiguousResponseBaseline = psql(`select concat_ws('|',
      'confirmed=' || (select count(*) from public.order_requests where status='confirmed'),
      'submitted=' || (select count(*) from public.order_requests where status='submitted'),
      'batch=' || (select quantity || '/' || reserved_quantity from public.product_batches),
      'reservations=' || (select count(*) from public.inventory_reservations where status='active'),
      'orders=' || (select count(*) from public.orders),
      'events=' || (select count(*) from public.inventory_events where event_type='reserved'),
      'balance=' || (select on_hand || '/' || reserved from public.inventory_balances)
    );`, 'ambiguous-response baseline')
    const actual = ambiguousResponseBaseline.split('\n').map((line) => line.trim()).filter(Boolean).at(-1)
    const expected = 'confirmed=1|submitted=1|batch=1/1|reservations=1|orders=1|events=1|balance=1/1'
    if (actual !== expected) throw new Error(`FINAL_INVARIANT_MISMATCH: expected ${expected}, got ${actual}`)

    console.log('[ok] exactly one confirmed order owns the one active reservation')
    console.log(`[ok] final state ${actual}`)

    const retryResult = psql(`set application_name='k2_ambiguous_confirmation_retry';
      select (confirmed).id || '|' || (confirmed).status
      from (select public.confirm_order_request(
        '${winnerOrderId}', 'Retry after an ambiguous confirmation response.'
      ) as confirmed) retried;`, 'ambiguous confirmation retry')
    const retryActual = retryResult.split('\n').map((line) => line.trim()).filter(Boolean).at(-1)
    const retryExpected = `${winnerOrderId}|confirmed`
    if (retryActual !== retryExpected) {
      throw new Error(`AMBIGUOUS_RETRY_RESULT_MISMATCH: expected ${retryExpected}, got ${retryActual}`)
    }

    const retryState = psql(`select concat_ws('|',
      'confirmed=' || (select count(*) from public.order_requests where status='confirmed'),
      'submitted=' || (select count(*) from public.order_requests where status='submitted'),
      'batch=' || (select quantity || '/' || reserved_quantity from public.product_batches),
      'reservations=' || (select count(*) from public.inventory_reservations where status='active'),
      'orders=' || (select count(*) from public.orders),
      'events=' || (select count(*) from public.inventory_events where event_type='reserved'),
      'balance=' || (select on_hand || '/' || reserved from public.inventory_balances)
    );`, 'ambiguous retry invariant read')
    const retryStateActual = retryState.split('\n').map((line) => line.trim()).filter(Boolean).at(-1)
    if (retryStateActual !== actual) {
      throw new Error(`AMBIGUOUS_RETRY_INVARIANT_MISMATCH: expected ${actual}, got ${retryStateActual}`)
    }
    console.log('[ok] same confirmed order returned without duplicate effects')

    console.log('\nAll MAP-023 last-unit concurrency checks passed against isolated PostgreSQL.')
    console.log('This is local rehearsal evidence. It is not a production migration or channel activation.')
  } finally {
    if (startedHere) {
      spawnSync(executable['pg_ctl.exe'], ['-D', config.dataDir, '-m', 'fast', '-w', 'stop'], {
        cwd: rootDir, env, encoding: 'utf8', windowsHide: true,
      })
    }
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
