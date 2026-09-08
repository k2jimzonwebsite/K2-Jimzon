#!/usr/bin/env node
/**
 * MAP-023 / IDEA-20260902-04 — purchase-time reservation rehearsal.
 *
 * Installs the repository's real 20260809 order functions onto a minimal
 * compatible schema, applies 20260902_purchase_time_reservation.sql verbatim on
 * top of them, and then proves the properties that decide whether payment can
 * safely be taken at checkout:
 *
 *   1. Submitting an order holds its stock immediately, with the OWNER-002
 *      30-minute deadline.
 *   2. Two customers racing for one unit produce exactly one order.
 *   3. The loser's order does not exist at all, rather than existing unfillable.
 *   4. Confirming a purchase-held order does not claim the units a second time,
 *      and still writes its order row and advances status.
 *   5. An order that predates the hold still reserves at confirm, so every row
 *      already in the table keeps working.
 *   6. Two confirmations racing for one unit still serialize and refuse the
 *      loser. `rehearse-map023-last-unit-concurrency.mjs` proves this for the
 *      20260809 function it installs, which cannot speak for this one: the
 *      reservation block now sits inside a called function, so the race is
 *      re-proven here rather than assumed to have survived the extraction.
 *
 * It never connects to production.
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const basePath = path.join(rootDir, 'supabase', 'migrations', '20260809_operations_hardening.sql')
const holdPath = path.join(rootDir, 'supabase', 'migrations', '20260902_purchase_time_reservation.sql')

const config = {
  binDir: path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin'),
  dataDir: path.join(rootDir, '.tools', 'purchase-hold-pg-data'),
  logPath: path.join(rootDir, '.tools', 'purchase-hold-pg.log'),
  port: 54331,
  database: 'k2_purchase_hold_rehearsal',
}

const legacyOrderId = '30000000-0000-4000-8000-000000000001'
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

function slice(file, startMarker, endMarker, label) {
  const sql = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const start = sql.indexOf(startMarker)
  if (start < 0) throw new Error(`${label}_START_NOT_FOUND`)
  const end = sql.indexOf(endMarker, start)
  if (end < 0) throw new Error(`${label}_END_NOT_FOUND`)
  return sql.slice(start, end + endMarker.length)
}

const originalSubmit = () => slice(
  basePath,
  'create or replace function public.submit_order_request_v2(',
  'grant execute on function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text) to anon, authenticated;',
  'ORIGINAL_SUBMIT',
)

const originalConfirm = () => slice(
  basePath,
  'create or replace function public.confirm_order_request(',
  'grant execute on function public.confirm_order_request(uuid,text) to authenticated;',
  'ORIGINAL_CONFIRM',
)

const holdMigration = () => fs.readFileSync(holdPath, 'utf8').replace(/\r\n/g, '\n')

// Install the actual expiry migration below; do not mirror its constraints or trigger.
const BOOTSTRAP = `
create extension if not exists pgcrypto with schema public;
create schema if not exists auth;

do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
end $$;

create type public.channel_type as enum ('website_retail','shopee','lazada','tiktok');
create type public.order_status_enum as enum ('Pending','Packed','Completed','Cancelled');
create type public.payment_status_enum as enum ('Unpaid','Paid','Refunded');

create or replace function auth.uid() returns uuid language sql stable as $$ select '${actorId}'::uuid $$;
create or replace function public.is_staff() returns boolean language sql stable as $$ select true $$;

create table public.products (
  sku text primary key,
  name text,
  title text,
  srp numeric,
  retail_price numeric,
  status text not null default 'Live',
  stock_available integer not null default 0
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique, discount_type text, discount_value numeric, min_spend numeric not null default 0,
  is_active boolean not null default true, archived_at timestamptz,
  starts_at timestamptz not null default now() - interval '1 day', ends_at timestamptz,
  max_redemptions integer, redemption_count integer not null default 0
);

create table public.order_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'submitted',
  coupon_id uuid references public.coupons(id), coupon_code text,
  subtotal numeric not null default 0, discount_amount numeric not null default 0,
  channel_source text not null default 'website',
  fulfillment_method text not null default 'pickup',
  payment_status text not null default 'unpaid',
  customer_name text not null default 'Fixture', customer_email text, customer_phone text,
  delivery_address text, customer_note text, idempotency_key text unique,
  total_amount numeric not null default 0, shipping_amount numeric not null default 0,
  shipping_quote_status text not null default 'waived',
  delivery_status text not null default 'awaiting_quote',
  confirmed_by uuid, confirmed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.order_request_items (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests(id),
  sku text not null references public.products(sku),
  product_name text not null default 'Fixture',
  quantity integer not null check (quantity > 0),
  unit_price numeric not null default 0,
  line_total numeric not null,
  created_at timestamptz not null default now()
);

create table public.product_batches (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku),
  quantity integer not null check (quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity between 0 and quantity),
  inventory_status text not null default 'available',
  expiry_date date, best_before_date date, clearance_approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.inventory_balances (
  sku text not null references public.products(sku), location_code text not null,
  on_hand integer not null default 0, reserved integer not null default 0,
  updated_at timestamptz not null default now(), primary key (sku, location_code)
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
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (order_request_item_id, batch_id)
);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id),
  order_request_id uuid not null references public.order_requests(id),
  discount_amount numeric not null, status text not null default 'reserved'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku), quantity integer not null,
  channel_source public.channel_type not null, fulfillment_method text not null,
  order_status public.order_status_enum not null, payment_status public.payment_status_enum not null,
  customer_name text, customer_email text, total_amount numeric not null,
  order_request_id uuid not null references public.order_requests(id)
);

create table public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku), location_code text not null,
  event_type text not null, quantity integer not null,
  reference_type text not null, reference_id uuid not null,
  reason text, actor_id uuid, created_at timestamptz not null default now()
);

create table public.order_request_events (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests(id),
  from_status text, to_status text not null, reason text, metadata jsonb,
  actor_id uuid, created_at timestamptz not null default now()
);

insert into public.products (sku, name, srp, stock_available) values ('SKU-LAST-1', 'Last jar', 100, 1);
insert into public.product_batches (sku, quantity, reserved_quantity, expiry_date)
values ('SKU-LAST-1', 1, 0, current_date + 180);
insert into public.inventory_balances (sku, location_code, on_hand, reserved)
values ('SKU-LAST-1', 'MANILA_MAIN', 1, 0);

insert into public.products (sku, name, srp, stock_available) values ('SKU-LEGACY', 'Legacy jar', 100, 1);
insert into public.product_batches (sku, quantity, reserved_quantity, expiry_date)
values ('SKU-LEGACY', 1, 0, current_date + 180);
insert into public.inventory_balances (sku, location_code, on_hand, reserved)
values ('SKU-LEGACY', 'MANILA_MAIN', 1, 0);
`

// An order created before the hold existed: rows present, nothing reserved.
const LEGACY_ORDER = `
insert into public.order_requests (id, idempotency_key) values ('${legacyOrderId}', 'legacy-key');
insert into public.order_request_items (order_request_id, sku, quantity, unit_price, line_total)
values ('${legacyOrderId}', 'SKU-LEGACY', 1, 100, 100);
`

const submitCall = (key) => `select (public.submit_order_request_v2(
  'Buyer ${key}', 'buyer${key}@example.test', null, '1 Test Street, Manila',
  'Courier delivery', null, '[{"sku":"SKU-LAST-1","quantity":1}]'::jsonb, '${key}', null)).id;`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const checks = []
function check(name, passed, detail = '') {
  checks.push({ name, passed, detail })
  console.log(`${passed ? '[pass]' : '[FAIL]'} ${name}${detail ? ` — ${detail}` : ''}`)
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

    run(executable['dropdb.exe'], ['--if-exists', config.database], 'rehearsal database reset', env)
    run(executable['createdb.exe'], [config.database], 'rehearsal database creation', env)
    const dbEnv = { ...env, PGDATABASE: config.database }
    const psqlArgs = (sql) => ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql]
    const psql = (sql, label) => run(executable['psql.exe'], psqlArgs(sql), label, dbEnv)
    const value = (sql, label) => psql(sql, label).split('\n').at(-1)?.trim()

    // Large SQL goes through a UTF-8 file rather than the command line. Windows
    // re-encodes process arguments, which turns an em-dash in a migration
    // comment into a byte PostgreSQL rejects outright.
    let scratchIndex = 0
    const psqlScript = (sql, label) => {
      const file = path.join(config.dataDir, `rehearsal-${scratchIndex += 1}.sql`)
      fs.writeFileSync(file, sql, 'utf8')
      try {
        return run(executable['psql.exe'],
          ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-f', file], label, dbEnv)
      } finally {
        fs.rmSync(file, { force: true })
      }
    }

    psqlScript(BOOTSTRAP, 'bootstrap')
    psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/tests/legacy_release_bootstrap.sql'), 'utf8'), 'legacy released hold fixture')
    psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/migrations/20260902_reservation_expiry_policy.sql'), 'utf8'), 'real reservation expiry migration')
    psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/tests/legacy_release_behavior.sql'), 'utf8'), 'legacy release attribution assertions')
    check('legacy unknown releases survive while new unattributed releases are refused', true)
    psqlScript(originalSubmit(), 'original submit_order_request_v2 install')
    psqlScript(originalConfirm(), 'original confirm_order_request install')
    psqlScript(slice(basePath,
      'create or replace function public.cancel_order_request(',
      'grant execute on function public.cancel_order_request(uuid,text) to authenticated;',
      'ORIGINAL_CANCEL'), 'original cancellation install')
    psqlScript(`alter table public.order_requests add column exception_status text,
      add column exception_note text, add column cancelled_at timestamptz;
      alter table public.coupon_redemptions add column updated_at timestamptz;`, 'cancellation fixture fields')
    psqlScript(LEGACY_ORDER, 'pre-migration order fixture')
    console.log('[ok] repository 20260809 order functions installed')

    // The migration must apply verbatim on top of the real prior state.
    psqlScript(holdMigration(), 'purchase-time reservation migration')
    console.log('[ok] 20260902_purchase_time_reservation.sql applied')

    // Idempotent replay.
    psqlScript(holdMigration(), 'purchase-time reservation replay')
    console.log('[ok] migration replays without error')
    const coverageCorrection = path.join(rootDir, 'supabase/migrations/20260906_reservation_coverage_guard.sql')
    if (!process.argv.includes('--baseline-coverage')) {
      psqlScript(fs.readFileSync(coverageCorrection, 'utf8'), 'reservation coverage correction')
      psqlScript(fs.readFileSync(coverageCorrection, 'utf8'), 'reservation coverage replay')
    }
    const lockCorrection = path.join(rootDir, 'supabase/migrations/20260908_purchase_hold_lock_order.sql')
    const applyLockCorrection = !process.argv.includes('--baseline-lock-order') && !process.argv.includes('--baseline-coverage')
    psqlScript(`create table public.fixture_hold_recovery as
      select pg_get_functiondef(oid) definition, proacl::text acl from pg_proc
      where oid='public.reserve_order_request_lots_v1(uuid,text)'::regprocedure;`, 'capture local function recovery')
    if (applyLockCorrection) {
      psqlScript(fs.readFileSync(lockCorrection, 'utf8'), 'purchase lock order correction')
      psqlScript(fs.readFileSync(lockCorrection, 'utf8'), 'purchase lock order correction replay')
    }

    // --- 1. Submitting holds stock immediately -----------------------------
    psql(submitCall('buyer-one'), 'first submission')
    const heldAfterSubmit = value(
      `select count(*)::text from public.inventory_reservations where sku='SKU-LAST-1' and status='active';`,
      'hold count')
    const batchReserved = value(
      `select reserved_quantity::text from public.product_batches where sku='SKU-LAST-1';`, 'batch reserved')
    const stockAfter = value(
      `select stock_available::text from public.products where sku='SKU-LAST-1';`, 'stock available')
    check('submitting an order holds its stock immediately',
      heldAfterSubmit === '1' && batchReserved === '1' && stockAfter === '0',
      `reservations=${heldAfterSubmit} batch.reserved=${batchReserved} stock_available=${stockAfter}`)

    // The 30-minute website deadline is stamped by the trigger.
    const deadline = value(
      `select case when expires_at is not null
         and expires_at > now() + interval '25 minutes'
         and expires_at <= now() + interval '31 minutes' then 'ok' else 'bad' end
       from public.inventory_reservations where sku='SKU-LAST-1' limit 1;`, 'deadline probe')
    check('the hold carries the OWNER-002 30-minute deadline', deadline === 'ok', `probe=${deadline}`)

    // --- 2/3. The second buyer is refused, and leaves no order -------------
    const second = await runAsync(executable['psql.exe'], psqlArgs(submitCall('buyer-two')), dbEnv)
    const refused = second.status !== 0 && /Insufficient sellable lot stock/i.test(second.stderr)
    check('a second buyer for the last unit is refused at purchase', refused,
      refused ? 'raised Insufficient sellable lot stock' : `status=${second.status}`)

    const orderCount = value(`select count(*)::text from public.order_requests where idempotency_key='buyer-two';`,
      'loser order count')
    check('the refused purchase leaves no order behind', orderCount === '0', `order_requests=${orderCount}`)

    const stockStillZero = value(
      `select stock_available::text from public.products where sku='SKU-LAST-1';`, 'stock after refusal')
    const reservedStillOne = value(
      `select count(*)::text from public.inventory_reservations where sku='SKU-LAST-1' and status='active';`,
      'holds after refusal')
    check('the refusal does not disturb the winning hold',
      stockStillZero === '0' && reservedStillOne === '1',
      `stock_available=${stockStillZero} reservations=${reservedStillOne}`)

    // --- 4. Confirming a held order does not double-claim ------------------
    const heldOrderId = value(
      `select id::text from public.order_requests where idempotency_key='buyer-one';`, 'winner id')
    psql(`select (public.confirm_order_request('${heldOrderId}', 'rehearsal confirm')).status;`, 'confirm held order')
    const afterConfirm = value(
      `select count(*)::text from public.inventory_reservations where order_request_id='${heldOrderId}' and status='active';`,
      'holds after confirm')
    const balanceAfterConfirm = value(
      `select reserved::text from public.inventory_balances where sku='SKU-LAST-1';`, 'balance after confirm')
    check('confirming a purchase-held order does not claim the units twice',
      afterConfirm === '1' && balanceAfterConfirm === '1',
      `reservations=${afterConfirm} balance.reserved=${balanceAfterConfirm}`)

    const legacyOrdersRow = value(
      `select count(*)::text from public.orders where order_request_id='${heldOrderId}';`, 'orders row')
    const confirmedStatus = value(
      `select status from public.order_requests where id='${heldOrderId}';`, 'confirmed status')
    check('confirmation still writes its order row and advances status',
      legacyOrdersRow === '1' && confirmedStatus === 'confirmed',
      `orders=${legacyOrdersRow} status=${confirmedStatus}`)

    // --- 5. An order predating the hold still reserves at confirm ----------
    psql(`select (public.confirm_order_request('${legacyOrderId}', 'legacy confirm')).status;`, 'confirm legacy order')
    const legacyHold = value(
      `select count(*)::text from public.inventory_reservations where order_request_id='${legacyOrderId}' and status='active';`,
      'legacy holds')
    const legacyStock = value(
      `select stock_available::text from public.products where sku='SKU-LEGACY';`, 'legacy stock')
    check('an order created before the hold still reserves at confirm',
      legacyHold === '1' && legacyStock === '0',
      `reservations=${legacyHold} stock_available=${legacyStock}`)

    // --- 6. Two confirmations racing for one unit, through the NEW function ---
    // The existing last-unit rehearsal installs the 20260809 confirm and proves
    // the original locking. It cannot speak for this one. The reservation block
    // moved inside a called function here, so the race is re-proven rather than
    // assumed to have survived the extraction.
    psqlScript(`
      insert into public.products (sku, name, srp, stock_available) values ('SKU-RACE', 'Race jar', 100, 1);
      insert into public.product_batches (sku, quantity, reserved_quantity, expiry_date)
      values ('SKU-RACE', 1, 0, current_date + 180);
      insert into public.inventory_balances (sku, location_code, on_hand, reserved)
      values ('SKU-RACE', 'MANILA_MAIN', 1, 0);
      insert into public.order_requests (id, idempotency_key, channel_source) values
        ('40000000-0000-4000-8000-000000000001','race-a','pasabuy'),
        ('40000000-0000-4000-8000-000000000002','race-b','pasabuy');
      insert into public.order_request_items (order_request_id, sku, quantity, unit_price, line_total) values
        ('40000000-0000-4000-8000-000000000001','SKU-RACE',1,100,100),
        ('40000000-0000-4000-8000-000000000002','SKU-RACE',1,100,100);
    `, 'confirm-race fixture')

    const winnerId = '40000000-0000-4000-8000-000000000001'
    const loserId = '40000000-0000-4000-8000-000000000002'
    const winner = runAsync(executable['psql.exe'], psqlArgs(
      `set application_name='k2_confirm_race_winner';
       begin;
       select (public.confirm_order_request('${winnerId}', 'race winner')).status;
       select pg_sleep(2);
       commit;`), dbEnv)

    let holding = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const active = value(`select count(*)::text from pg_stat_activity
        where application_name='k2_confirm_race_winner' and state='active' and query like '%pg_sleep%';`,
      'confirm-race lock probe')
      if (active === '1') { holding = true; break }
      await sleep(100)
    }
    check('the winning confirmation holds the lot lock', holding)

    const startedAt = Date.now()
    const loser = await runAsync(executable['psql.exe'], psqlArgs(
      `set application_name='k2_confirm_race_loser';
       select (public.confirm_order_request('${loserId}', 'race loser')).status;`), dbEnv)
    const waitedMs = Date.now() - startedAt
    await winner

    const blocked = waitedMs > 1000
    const loserRefused = loser.status !== 0 && /Insufficient sellable lot stock/i.test(loser.stderr)
    check('a second confirmation blocks on the lock, then is refused', blocked && loserRefused,
      `waited ${waitedMs}ms, ${loserRefused ? 'refused' : `status=${loser.status}`}`)

    const raceHolds = value(
      `select count(*)::text from public.inventory_reservations where sku='SKU-RACE' and status='active';`,
      'race holds')
    const raceConfirmed = value(
      `select count(*)::text from public.order_requests where idempotency_key in ('race-a','race-b') and status='confirmed';`,
      'race confirmed')
    check('exactly one confirmation owns the single unit',
      raceHolds === '1' && raceConfirmed === '1',
      `reservations=${raceHolds} confirmed=${raceConfirmed}`)

    const cancellationCorrection = path.join(rootDir, 'supabase/migrations/20260905_purchase_hold_cancellation.sql')
    if (!process.argv.includes('--baseline-cancellation') && fs.existsSync(cancellationCorrection)) {
      psqlScript(fs.readFileSync(cancellationCorrection, 'utf8'), 'cancellation correction')
      psqlScript(fs.readFileSync(cancellationCorrection, 'utf8'), 'cancellation correction replay')
    }
    psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/tests/purchase_hold_cancellation.sql'), 'utf8'), 'purchase hold cancellation assertions')
    check('submitted and confirmed cancellations release exact active lots once', true)

    const expiryCorrection = path.join(rootDir, 'supabase/migrations/20260906_atomic_order_hold_expiry.sql')
    if (!process.argv.includes('--baseline-expiry') && fs.existsSync(expiryCorrection)) {
      psqlScript(fs.readFileSync(expiryCorrection, 'utf8'), 'atomic expiry correction')
      psqlScript(fs.readFileSync(expiryCorrection, 'utf8'), 'atomic expiry correction replay')
    }
    psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/tests/purchase_hold_expiry.sql'), 'utf8'), 'composed expiry assertions')
    check('expiry preserves confirmed commitments, releases whole orders and reconciles stock', true)
    psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/tests/purchase_hold_completeness.sql'), 'utf8'), 'reservation completeness assertions')
    check('confirmation refuses partial or expired purchase coverage without side effects', true)
    psqlScript(slice(basePath, 'create or replace function public.record_packing_scan(',
      'grant execute on function public.record_packing_scan(uuid,text) to authenticated;', 'ORIGINAL_PACKING'), 'original packing function')
    if (process.argv.includes('--baseline-packing')) {
      psqlScript(`create function public.record_packing_scan_exact_v1(uuid,text,uuid,boolean) returns jsonb language sql as
        'select public.record_packing_scan($1,$2)';`, 'baseline packing adapter')
    } else {
      psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/migrations/20260906_exact_packing_lot.sql'), 'utf8'), 'exact packing function')
    }
    psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/tests/packing_lot_proof.sql'), 'utf8'), 'physical lot proof assertions')
    check('packing credits only the explicitly confirmed physical lot', true)

    psqlScript("alter type public.order_status_enum add value if not exists 'Shipped';", 'handover enum fixture')
    psqlScript(slice(basePath, 'create or replace function public.fulfill_order_request(',
      'grant execute on function public.fulfill_order_request(uuid,text) to authenticated;', 'ORIGINAL_HANDOVER'), 'original handover function')
    const handoverCorrection = path.join(rootDir, 'supabase/migrations/20260906_handover_coverage.sql')
    if (!process.argv.includes('--baseline-handover') && fs.existsSync(handoverCorrection)) {
      psqlScript(fs.readFileSync(handoverCorrection, 'utf8'), 'handover coverage correction')
      psqlScript(fs.readFileSync(handoverCorrection, 'utf8'), 'handover coverage correction replay')
    }
    psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/tests/handover_coverage.sql'), 'utf8'), 'handover coverage assertions')
    check('handover requires complete packed coverage and preserves reservation history', true)

    // Opposing basket order must not determine inventory lock order. The local
    // trigger pauses after a lot is claimed to expose the historical A/B vs B/A
    // deadlock; it does not replace any production reservation behavior.
    psqlScript(`
      insert into public.products (sku,name,srp,stock_available) values
        ('LOCK-A','Lock fixture A',100,2),('LOCK-B','Lock fixture B',100,2);
      insert into public.product_batches (sku,quantity,expiry_date) values
        ('LOCK-A',2,current_date+180),('LOCK-B',2,current_date+180);
      insert into public.inventory_balances (sku,location_code,on_hand) values
        ('LOCK-A','MANILA_MAIN',2),('LOCK-B','MANILA_MAIN',2);
      insert into public.order_requests (id,idempotency_key,channel_source) values
        ('80000000-0000-4000-8000-000000000001','lock-ab','pasabuy'),
        ('80000000-0000-4000-8000-000000000002','lock-ba','pasabuy');
      insert into public.order_request_items (order_request_id,sku,quantity,unit_price,line_total,created_at) values
        ('80000000-0000-4000-8000-000000000001','LOCK-A',1,100,100,now()),
        ('80000000-0000-4000-8000-000000000001','LOCK-B',1,100,100,now()+interval '1 second'),
        ('80000000-0000-4000-8000-000000000002','LOCK-B',1,100,100,now()),
        ('80000000-0000-4000-8000-000000000002','LOCK-A',1,100,100,now()+interval '1 second');
      create function public.fixture_slow_hold() returns trigger language plpgsql as $$
      begin if new.sku in ('LOCK-A','LOCK-B') then perform pg_sleep(1); end if; return new; end $$;
      create trigger fixture_slow_hold before insert on public.inventory_reservations
        for each row execute function public.fixture_slow_hold();
    `, 'opposing basket fixture')
    const opposing = await Promise.all(['000001', '000002'].map(suffix =>
      runAsync(executable['psql.exe'], psqlArgs(`set statement_timeout='15s';
        select public.reserve_order_request_lots_v1('80000000-0000-4000-8000-000000${suffix}','opposing basket');`), dbEnv)))
    check('opposing A/B and B/A baskets both reserve without a deadlock',
      opposing.every(result => result.status === 0),
      opposing.map(result => result.status === 0 ? 'committed' : result.stderr.trim()).join(' | '))
    psql('drop trigger fixture_slow_hold on public.inventory_reservations; drop function public.fixture_slow_hold();', 'remove local delay')
    const lockState = value(`select (
      (select count(*)=4 from public.inventory_reservations where sku in ('LOCK-A','LOCK-B') and status='active')
      and (select bool_and(reserved=2 and on_hand=2) from public.inventory_balances where sku in ('LOCK-A','LOCK-B'))
      and (select bool_and(quantity=2 and reserved_quantity=2) from public.product_batches where sku in ('LOCK-A','LOCK-B'))
      and (select bool_and(stock_available=0) from public.products where sku in ('LOCK-A','LOCK-B'))
      and (select count(*)=4 from public.inventory_events where sku in ('LOCK-A','LOCK-B'))
    )::text;`, 'opposing basket ledger')
    check('opposing baskets retain exact lot, balance, catalog and event totals', lockState === 'true', lockState)
    if (applyLockCorrection) {
      const replayCount = value(`select public.reserve_order_request_lots_v1(
        '80000000-0000-4000-8000-000000000001','replay')::text;`, 'opposing basket replay')
      check('replaying an opposing basket adds no reservations or inventory events', replayCount === '0'
        && value("select count(*)::text from inventory_events where sku in ('LOCK-A','LOCK-B');", 'replay events') === '4')
      const aclPreserved = value(`select (p.proacl::text is not distinct from f.acl)::text
        from pg_proc p cross join fixture_hold_recovery f
        where p.oid='public.reserve_order_request_lots_v1(uuid,text)'::regprocedure;`, 'preserved RPC grants')
      check('lock-order correction preserves exact installed RPC grants', aclPreserved === 'true')
      psqlScript(`do $$ begin execute (select definition from fixture_hold_recovery); end $$;`, 'restore captured local function')
      const restored = value(`select (pg_get_functiondef(p.oid)=f.definition
        and p.proacl::text is not distinct from f.acl)::text
        from pg_proc p cross join fixture_hold_recovery f
        where p.oid='public.reserve_order_request_lots_v1(uuid,text)'::regprocedure;`, 'exact function recovery')
      check('captured function recovery restores definition and ACL without changing inventory', restored === 'true'
        && value("select count(*)::text from inventory_events where sku in ('LOCK-A','LOCK-B');", 'recovery events') === '4')
      psqlScript(fs.readFileSync(lockCorrection, 'utf8'), 'reapply after recovery')
    }

    psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/tests/purchase_reconciliation_bootstrap.sql'), 'utf8'), 'reconciliation fixture')
    psqlScript(slice(basePath, 'create or replace function public.reconcile_product_batches(',
      'grant execute on function public.reconcile_product_batches(text,jsonb,text) to authenticated;', 'RECONCILE'), 'actual reconciliation function')
    const reconcileCorrection = path.join(rootDir, 'supabase/migrations/20260908_reconciliation_lock_order.sql')
    psqlScript(`create table fixture_reconcile_recovery as select pg_get_functiondef(oid) definition,proacl::text acl
      from pg_proc where oid='public.reconcile_product_batches(text,jsonb,text)'::regprocedure;`, 'capture reconciliation recovery')
    if (!process.argv.includes('--baseline-reconciliation') && fs.existsSync(reconcileCorrection)) {
      psqlScript(fs.readFileSync(reconcileCorrection, 'utf8'), 'reconciliation lock correction')
      psqlScript(fs.readFileSync(reconcileCorrection, 'utf8'), 'reconciliation lock correction replay')
    }
    const purchasing = runAsync(executable['psql.exe'], psqlArgs(`set statement_timeout='15s';
      set application_name='k2_reconciliation_purchase';
      select public.reserve_order_request_lots_v1('90000000-0000-4000-8000-000000000002','race purchase');`), dbEnv)
    let purchasePaused = false
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (value("select count(*)::text from pg_stat_activity where application_name='k2_reconciliation_purchase' and wait_event='PgSleep';", 'purchase pause probe') === '1') {
        purchasePaused = true; break
      }
      await sleep(50)
    }
    if (!purchasePaused) { await purchasing; throw new Error('Reconciliation race purchase pause not observed') }
    const recount = await runAsync(executable['psql.exe'], psqlArgs(`set statement_timeout='15s';
      select public.reconcile_product_batches('RECON-RACE',jsonb_build_array(jsonb_build_object(
        'id','90000000-0000-4000-8000-000000000001','quantity',2,'box_code','RACE-BOX',
        'expiry_date',current_date+180,'inventory_status','available')),'Physical recount');`), dbEnv)
    const purchaseResult = await purchasing
    check('purchase and physical reconciliation both commit without lock inversion',
      purchaseResult.status === 0 && recount.status === 0,
      JSON.stringify({ purchase: purchaseResult.status, recount: recount.status, errors: [purchaseResult.stderr, recount.stderr] }))
    const reconciled = value(`select (
      (select quantity=2 and reserved_quantity=1 from product_batches where sku='RECON-RACE')
      and (select on_hand=2 and reserved=1 from inventory_balances where sku='RECON-RACE')
      and (select stock_available=1 from products where sku='RECON-RACE')
      and (select count(*)=1 from inventory_events where sku='RECON-RACE')
      and (select count(*)=1 from batch_change_events where sku='RECON-RACE')
    )::text;`, 'recount ledger')
    check('concurrent recount preserves purchase holds, sellable projection and both audit events', reconciled === 'true', reconciled)
    psql('drop trigger fixture_pause_recon_purchase on inventory_reservations; drop function fixture_pause_recon_purchase();', 'remove recount pause')
    psqlScript(slice(basePath, 'create or replace function public.set_batch_clearance_approval(',
      'grant execute on function public.set_batch_clearance_approval(uuid,boolean,text) to authenticated;', 'CLEARANCE'), 'actual clearance function')
    psqlScript(`create function fixture_pause_clearance() returns trigger language plpgsql as $$
      begin if current_setting('application_name')='k2_recount_clearance' then perform pg_sleep(2); end if; return new; end $$;
      create trigger fixture_pause_clearance before update on product_batches for each row execute function fixture_pause_clearance();`, 'clearance race pause')
    const clearing = runAsync(executable['psql.exe'], psqlArgs(`set statement_timeout='15s';
      set application_name='k2_recount_clearance';
      select public.set_batch_clearance_approval('90000000-0000-4000-8000-000000000001',false,'Withdraw clearance');`), dbEnv)
    let clearancePaused = false
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (value("select count(*)::text from pg_stat_activity where application_name='k2_recount_clearance' and wait_event='PgSleep';", 'clearance pause probe') === '1') {
        clearancePaused = true; break
      }
      await sleep(50)
    }
    if (!clearancePaused) { await clearing; throw new Error('Clearance pause not observed') }
    const recountAfterClearance = await runAsync(executable['psql.exe'], psqlArgs(`set statement_timeout='15s';
      select public.reconcile_product_batches('RECON-RACE',jsonb_build_array(jsonb_build_object(
        'id','90000000-0000-4000-8000-000000000001','quantity',2,'box_code','RACE-BOX',
        'expiry_date',current_date+180,'inventory_status','quarantine')),'Physical quarantine recount');`), dbEnv)
    const clearanceResult = await clearing
    check('clearance and recount serialize without a batch/product deadlock',
      clearanceResult.status === 0 && recountAfterClearance.status === 0,
      JSON.stringify({ clearance: clearanceResult.status, recount: recountAfterClearance.status }))
    check('quarantine recount retains held units while removing them from sale',
      value("select (stock_available=0)::text from products where sku='RECON-RACE';", 'quarantine projection') === 'true'
      && value("select (quantity=2 and reserved_quantity=1 and inventory_status='quarantine')::text from product_batches where sku='RECON-RACE';", 'quarantine holds') === 'true')
    psql('drop trigger fixture_pause_clearance on product_batches; drop function fixture_pause_clearance();', 'remove clearance pause')
    if (!process.argv.includes('--baseline-reconciliation')) {
      psql("update product_batches set inventory_status='available' where sku='RECON-RACE'; update products set stock_available=1 where sku='RECON-RACE';", 'reset local disposition for denial assertions')
      psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/tests/purchase_reconciliation_behavior.sql'), 'utf8'), 'recount safety assertions')
      check('recount preserves holds/history, missing-balance commitments and first-count creation', true)
      psqlScript(`do $$ begin
        if exists(select 1 from pg_proc p cross join fixture_reconcile_recovery f
          where p.oid='public.reconcile_product_batches(text,jsonb,text)'::regprocedure
          and p.proacl::text is distinct from f.acl) then raise exception 'Recount ACL changed'; end if;
        execute (select definition from fixture_reconcile_recovery);
        if exists(select 1 from pg_proc p cross join fixture_reconcile_recovery f
          where p.oid='public.reconcile_product_batches(text,jsonb,text)'::regprocedure
          and (pg_get_functiondef(p.oid)<>f.definition or p.proacl::text is distinct from f.acl))
          then raise exception 'Recount recovery mismatch'; end if;
      end $$;`, 'recount permission and recovery assertions')
      psqlScript(fs.readFileSync(reconcileCorrection, 'utf8'), 'reapply recount correction')
      check('recount patch preserves RPC permissions and exact captured-definition recovery', true)
    }

    const failed = checks.filter((entry) => !entry.passed)
    console.log(`\n${checks.length - failed.length}/${checks.length} properties held.`)
    if (failed.length > 0) {
      console.error(`FAILED: ${failed.map((entry) => entry.name).join('; ')}`)
      process.exitCode = 1
      return
    }
    console.log('Purchase-time reservation rehearsal passed. Nothing was applied to production.')
  } finally {
    if (startedHere) {
      spawnSync(path.join(config.binDir, 'pg_ctl.exe'), ['-D', config.dataDir, '-w', '-m', 'fast', 'stop'], {
        cwd: rootDir, env, encoding: 'utf8', windowsHide: true, stdio: 'ignore',
      })
    }
  }
}

main().catch((error) => {
  console.error(String(error?.message || error))
  process.exitCode = 1
})
