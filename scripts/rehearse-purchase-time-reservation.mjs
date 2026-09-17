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
const launchBasePath = path.join(rootDir, 'supabase', 'migrations', '20260803_launch_core_stabilization.sql')

const config = {
  binDir: process.env.K2_TEST_PG_BIN || path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin'),
  dataDir: path.join(rootDir, '.tools', 'purchase-hold-pg-data'),
  logPath: path.join(rootDir, '.tools', 'purchase-hold-pg.log'),
  port: 54331,
  database: 'k2_purchase_hold_rehearsal',
}

const legacyOrderId = '30000000-0000-4000-8000-000000000001'
const actorId = '20000000-0000-4000-8000-000000000001'

function requireRuntime() {
  const names = ['initdb.exe', 'pg_ctl.exe', 'psql.exe', 'dropdb.exe', 'createdb.exe']
  const executables = Object.fromEntries(names.map((name) => [name, path.join(config.binDir, process.platform === 'win32' ? name : name.replace(/\.exe$/, ''))]))
  const missing = names.filter((name) => !fs.existsSync(executables[name]))
  if (missing.length > 0) throw new Error(`PORTABLE_POSTGRES_RUNTIME_MISSING: ${missing.join(', ')}`)
  return executables
}

function run(executable, args, label, env, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: rootDir, env, encoding: 'utf8', windowsHide: true, ...options,
  })
  if (result.error || result.status !== 0) {
    let detail = String(result.stderr || result.stdout || result.error?.message || '').trim()
    if (!detail && config?.logPath && fs.existsSync(config.logPath)) {
      try {
        detail = fs.readFileSync(config.logPath, 'utf8').trim()
      } catch {}
    }
    throw new Error(`${label} failed: ${detail || 'unknown'}`)
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

const custodyTransferFunction = () => slice(
  basePath,
  'create or replace function public.transfer_inventory_custody_exact(',
  'grant execute on function public.transfer_inventory_custody_exact(uuid,integer,text,text,text) to authenticated;',
  'CUSTODY_TRANSFER',
)

const consignmentManifestFunctions = () => [
  slice(launchBasePath, 'create or replace function public.create_consignment_manifest(', 'grant execute on function public.create_consignment_manifest(text,text) to authenticated;', 'CREATE_CONSIGNMENT'),
  slice(launchBasePath, 'create or replace function public.advance_consignment(', 'grant execute on function public.advance_consignment(uuid,text) to authenticated;', 'ADVANCE_CONSIGNMENT'),
  slice(basePath, 'create or replace function public.add_consignment_item_v2(', 'grant execute on function public.add_consignment_item_v2(uuid,text,text,text,date,integer) to authenticated;', 'ADD_CONSIGNMENT_ITEM_V2'),
  slice(basePath, 'create or replace function public.record_consignment_item_scan(', 'grant execute on function public.record_consignment_item_scan(uuid,uuid,text) to authenticated;', 'RECORD_CONSIGNMENT_SCAN'),
  slice(basePath, 'create or replace function public.finalize_consignment_receipt(', 'grant execute on function public.finalize_consignment_receipt(uuid,text) to authenticated;', 'FINALIZE_CONSIGNMENT'),
].join('\n')

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
      const socketOpt = process.platform === 'win32' ? '' : `-k "${config.dataDir}" `
      run(executable['pg_ctl.exe'],
        ['-D', config.dataDir, '-l', config.logPath, '-o', `${socketOpt}-p ${config.port} -h 127.0.0.1`, '-w', 'start'],
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

    // OWNER-002 ownership deduction (I-001): first confirmation deducts owned
    // stock once while physical custody stays put. The migration applies
    // verbatim with replay, exactly like the earlier corrections above.
    const commitmentCorrection = path.join(rootDir, 'supabase/migrations/20260912_confirmation_stock_commitment.sql')
    psqlScript(fs.readFileSync(commitmentCorrection, 'utf8'), 'confirmation stock commitment')
    psqlScript(fs.readFileSync(commitmentCorrection, 'utf8'), 'confirmation stock commitment replay')
    psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/tests/order_stock_commitment.sql'), 'utf8'), 'confirmation ownership deduction assertions')
    check('confirmation deducts owned stock while preserving physical custody', true)
    psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/tests/confirmation_commitment_behavior.sql'), 'utf8'), 'commitment sweep and cancellation assertions')
    check('committed rows survive expiry and cancel with retained evidence', true)

    psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/tests/commitment_atomicity.sql'), 'utf8'), 'multi-lot commitment fault and recovery')
    check('second-lot failure rolls back confirmation/coupon/commitment and retry commits exactly once', true)

    psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/tests/commitment_lifecycle_bootstrap.sql'), 'utf8'), 'signed lifecycle fixture fields')
    for (const name of ['20260812_admin_fulfillment_bff_boundary.sql', '20260906_payment_evidence_recovery.sql',
      '20260908_payment_balance_integrity.sql', '20260906_exact_packing_wrapper.sql']) {
      psqlScript(fs.readFileSync(path.join(rootDir, 'supabase/migrations', name), 'utf8'), `composed lifecycle ${name}`)
    }
    const lifecycleCorrection = path.join(rootDir, 'supabase/migrations/20260913_payment_handover_commitment.sql')
    psqlScript(`create table public.fixture_commitment_recovery as select oid::regprocedure::text signature,
      pg_get_functiondef(oid) definition,proacl::text acl from pg_proc
      where oid in ('public.set_order_request_payment_status(uuid,text,text)'::regprocedure,
        'public.reserve_order_request_lots_v1(uuid,text)'::regprocedure,
        'public.fulfill_order_request(uuid,text)'::regprocedure);`, 'capture composed lifecycle recovery')
    if (!process.argv.includes('--baseline-commitment-lifecycle') && fs.existsSync(lifecycleCorrection)) {
      psqlScript(fs.readFileSync(lifecycleCorrection, 'utf8'), 'payment/handover commitment')
      psqlScript(fs.readFileSync(lifecycleCorrection, 'utf8'), 'payment/handover commitment replay')
    }
    const lifecycleAssertions = fs.readFileSync(path.join(rootDir, 'supabase/tests/commitment_payment_handover.sql'), 'utf8')
    psqlScript(lifecycleAssertions, 'signed payment/confirmation/handover/refund commitment lifecycle')
    check('signed payment and confirmation commit once; handover requires evidence and refund preserves stock', true)

    // Prove each corrected boundary matters by restoring just its old body in
    // a transaction. The expected assertion error closes/rolls back that session.
    for (const [signature, expected] of [
      ['set_order_request_payment_status(uuid,text,text)', 'Payment did not reach second commitment fault'],
      ['reserve_order_request_lots_v1(uuid,text)', 'K2_RESERVATION_RECONCILIATION_REQUIRED'],
      ['fulfill_order_request(uuid,text)', 'Handover accepted missing ownership commitment'],
    ]) {
      let detected = false
      try {
        psqlScript(`begin; do $$ begin execute (select definition from fixture_commitment_recovery
          where signature::regprocedure='public.${signature}'::regprocedure); end $$;\n`
          + lifecycleAssertions.replace(/^begin;$/m, ''), `negative control ${signature}`)
      } catch (error) {
        if (!error.message.includes(expected)) throw error
        detected = true
      }
      check(`lifecycle assertions reject the old ${signature} body`, detected)
    }

    psqlScript(`do $$ declare f record; begin
      for f in select * from fixture_commitment_recovery loop
        if (select proacl::text from pg_proc where oid=f.signature::regprocedure) is distinct from f.acl then
          raise exception 'Commitment composition changed an RPC ACL'; end if;
        execute f.definition;
        if (select pg_get_functiondef(oid) from pg_proc where oid=f.signature::regprocedure)<>f.definition
          or (select proacl::text from pg_proc where oid=f.signature::regprocedure) is distinct from f.acl then
          raise exception 'Commitment function recovery did not restore exact definition/ACL'; end if;
      end loop;
    end $$;`, 'exact lifecycle function recovery')
    psqlScript(fs.readFileSync(lifecycleCorrection, 'utf8'), 'reapply recovered lifecycle')
    check('lifecycle composition preserves ACLs and exact captured-definition recovery', true)

    // The earlier rollback reloads broad hold definitions and drops a helper
    // that the composed payment function now needs. It must refuse this chain
    // before executing any included SQL, leaving every installed function intact.
    const rollbackFingerprint = () => value(`select md5(string_agg(pg_get_functiondef(oid)
      ||coalesce(proacl::text,''),E'\\n' order by oid)) from pg_proc where pronamespace='public'::regnamespace
      and prokind='f';`, 'rollback function fingerprint')
    const beforeRollback = rollbackFingerprint()
    let rollbackRefused = false
    try {
      run(executable['psql.exe'], ['-X', '-v', 'ON_ERROR_STOP=1', '-f',
        path.join(rootDir, 'supabase/confirmation_stock_commitment_rollback.sql')], 'legacy commitment rollback refusal', dbEnv)
    } catch (error) {
      if (!error.message.includes('K2_COMPOSED_COMMITMENT_RECOVERY_REQUIRED')) throw error
      rollbackRefused = true
    }
    check('old confirmation rollback refuses composed callers before changing functions',
      rollbackRefused && rollbackFingerprint() === beforeRollback)

    // -----------------------------------------------------------------------
    // STEP 2 & 3: 8 CONCURRENT WRITER RACES & DEADLINE EXTENSION (I-001)
    // -----------------------------------------------------------------------

    // Install DDL and functions for custody and consignment writers
    psqlScript(`
      create table if not exists public.consignments (
        id uuid primary key default gen_random_uuid(), manifest_code text unique,
        flight_number text, departure_city text, destination_city text,
        status text not null default 'Packing_Italy', arrived_at timestamptz
      );
      create table if not exists public.consignment_items (
        id uuid primary key default gen_random_uuid(),
        consignment_id uuid not null references public.consignments(id),
        sku text not null references public.products(sku), batch_code text, box_code text,
        best_before_date date, expected_qty integer not null,
        italy_packed_qty integer not null default 0, manila_scanned_qty integer not null default 0,
        status text not null default 'Pending',
        unique(consignment_id,sku,batch_code,box_code,best_before_date)
      );
      create table if not exists public.consignment_scan_events (
        id uuid primary key default gen_random_uuid(), consignment_id uuid,
        consignment_item_id uuid, sku text, stage text, resulting_qty integer,
        actor_id uuid, created_at timestamptz not null default now()
      );
      alter table public.product_batches
        add column if not exists box_code text,
        add column if not exists batch_code text,
        add column if not exists quantity_available integer,
        add column if not exists landed_date date,
        add column if not exists hub text,
        add column if not exists custodian text,
        add column if not exists channel text,
        add column if not exists is_pinned boolean not null default false,
        add column if not exists clearance_approved_by uuid,
        add column if not exists arrival_flight text,
        add column if not exists source_consignment_item_id uuid,
        add column if not exists parent_batch_id uuid references public.product_batches(id);
      update public.product_batches set quantity_available = quantity where quantity_available is null;
      alter table public.inventory_events add column if not exists metadata jsonb not null default '{}';
    `, 'races bootstrap schema')

    psqlScript(custodyTransferFunction(), 'install transfer_inventory_custody_exact')
    psqlScript(consignmentManifestFunctions(), 'install consignment manifest functions')

    // --- Race 1: Confirmation vs Payment Verification Race ----------------
    psqlScript(`
      insert into public.products (sku, name, srp, stock_available) values ('SKU-RACE-CONF-PAY', 'Race 1 Item', 100, 1);
      insert into public.product_batches (sku, quantity, reserved_quantity, expiry_date, inventory_status)
        values ('SKU-RACE-CONF-PAY', 1, 1, current_date + 180, 'available');
      insert into public.inventory_balances (sku, location_code, on_hand, reserved)
        values ('SKU-RACE-CONF-PAY', 'MANILA_MAIN', 1, 1);
      insert into public.order_requests (id, idempotency_key, status, payment_status, shipping_quote_status, total_amount)
        values ('50000000-0000-4000-8000-000000000001', 'race-1', 'submitted', 'not_requested', 'customer_confirmed', 100);
      insert into public.order_request_items (id, order_request_id, sku, quantity, unit_price, line_total)
        values ('50000000-0000-4000-8000-000000000011', '50000000-0000-4000-8000-000000000001', 'SKU-RACE-CONF-PAY', 1, 100, 100);
      insert into public.inventory_reservations (id, order_request_id, order_request_item_id, batch_id, sku, quantity, status, expires_at)
        values ('50000000-0000-4000-8000-000000000021', '50000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000011',
          (select id from public.product_batches where sku='SKU-RACE-CONF-PAY'), 'SKU-RACE-CONF-PAY', 1, 'active', now() + interval '30 minutes');
    `, 'race 1 fixture')

    psql(`
      select set_config('request.actor', '11111111-1111-4111-8111-111111111111', false);
      select public.set_order_request_payment_status('50000000-0000-4000-8000-000000000001', 'awaiting_instructions', 'Instructions issued');
      select public.set_order_request_payment_status('50000000-0000-4000-8000-000000000001', 'evidence_submitted', 'Evidence submitted by actor 1');
    `, 'race 1 payment advance')

    const r1Conf = runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_conf_pay_conf';
      begin;
      select (public.confirm_order_request('50000000-0000-4000-8000-000000000001', 'race 1 confirm')).status;
      select pg_sleep(1.5);
      commit;
    `), dbEnv)

    let r1Holding = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const active = value(`select count(*)::text from pg_stat_activity
        where application_name='k2_race_conf_pay_conf' and state='active' and query like '%pg_sleep%';`,
        'r1 lock probe')
      if (active === '1') { r1Holding = true; break }
      await sleep(100)
    }
    check('race 1: confirmation holds order/reservation lock', r1Holding)

    const r1Pay = await runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_conf_pay_verif';
      select set_config('request.actor', '22222222-2222-4222-8222-222222222222', false);
      select (public.set_order_request_payment_status('50000000-0000-4000-8000-000000000001', 'verified', 'Payment verified by actor 2')).payment_status;
    `), dbEnv)
    const r1ConfRes = await r1Conf

    const r1Events = value(`select count(*)::text from public.inventory_events
      where reference_id='50000000-0000-4000-8000-000000000001' and event_type='stock_committed';`, 'r1 events')
    const r1Committed = value(`select (committed_at is not null)::text from public.inventory_reservations
      where order_request_id='50000000-0000-4000-8000-000000000001';`, 'r1 committed')
    const r1Batch = value(`select (quantity=1 and reserved_quantity=1)::text from public.product_batches
      where sku='SKU-RACE-CONF-PAY';`, 'r1 batch')
    check('race 1: confirmation vs payment verification commits exactly once with single event',
      r1ConfRes.status === 0 && r1Pay.status === 0 && r1Events === '1' && r1Committed === 'true' && r1Batch === 'true',
      `events=${r1Events} conf=${r1ConfRes.status} pay=${r1Pay.status}`)

    // --- Race 2: Payment Verification vs Cancellation Race ----------------
    psqlScript(`
      insert into public.products (sku, name, srp, stock_available) values ('SKU-RACE-PAY-CANC', 'Race 2 Item', 100, 1);
      insert into public.product_batches (sku, quantity, reserved_quantity, expiry_date, inventory_status)
        values ('SKU-RACE-PAY-CANC', 1, 1, current_date + 180, 'available');
      insert into public.inventory_balances (sku, location_code, on_hand, reserved)
        values ('SKU-RACE-PAY-CANC', 'MANILA_MAIN', 1, 1);
      insert into public.order_requests (id, idempotency_key, status, payment_status, shipping_quote_status, total_amount)
        values ('50000000-0000-4000-8000-000000000002', 'race-2', 'submitted', 'not_requested', 'customer_confirmed', 100);
      insert into public.order_request_items (id, order_request_id, sku, quantity, unit_price, line_total)
        values ('50000000-0000-4000-8000-000000000012', '50000000-0000-4000-8000-000000000002', 'SKU-RACE-PAY-CANC', 1, 100, 100);
      insert into public.inventory_reservations (id, order_request_id, order_request_item_id, batch_id, sku, quantity, status, expires_at)
        values ('50000000-0000-4000-8000-000000000022', '50000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000012',
          (select id from public.product_batches where sku='SKU-RACE-PAY-CANC'), 'SKU-RACE-PAY-CANC', 1, 'active', now() + interval '30 minutes');
    `, 'race 2 fixture')

    psql(`
      select set_config('request.actor', '11111111-1111-4111-8111-111111111111', false);
      select public.set_order_request_payment_status('50000000-0000-4000-8000-000000000002', 'awaiting_instructions', 'Instructions issued');
      select public.set_order_request_payment_status('50000000-0000-4000-8000-000000000002', 'evidence_submitted', 'Evidence submitted by actor 1');
    `, 'race 2 payment advance')

    const r2Pay = runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_pay_cancel_pay';
      select set_config('request.actor', '22222222-2222-4222-8222-222222222222', false);
      begin;
      select (public.set_order_request_payment_status('50000000-0000-4000-8000-000000000002', 'verified', 'Payment verified in race 2')).payment_status;
      select pg_sleep(1.5);
      commit;
    `), dbEnv)

    let r2Holding = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const active = value(`select count(*)::text from pg_stat_activity
        where application_name='k2_race_pay_cancel_pay' and state='active' and query like '%pg_sleep%';`,
        'r2 lock probe')
      if (active === '1') { r2Holding = true; break }
      await sleep(100)
    }

    const r2Cancel = await runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_pay_cancel_canc';
      select (public.cancel_order_request('50000000-0000-4000-8000-000000000002', 'race 2 cancel')).status;
    `), dbEnv)
    const r2PayRes = await r2Pay

    const r2Status = value(`select status from public.order_requests where id='50000000-0000-4000-8000-000000000002';`, 'r2 status')
    const r2ResState = value(`select (status='released' and release_cause='cancelled' and committed_at is not null and commit_cause='payment_verification')::text
      from public.inventory_reservations where order_request_id='50000000-0000-4000-8000-000000000002';`, 'r2 res state')
    const r2Balance = value(`select (reserved=0 and on_hand=1)::text from public.inventory_balances where sku='SKU-RACE-PAY-CANC';`, 'r2 balance')
    check('race 2: payment verification vs cancellation restores stock while preserving commitment audit',
      r2PayRes.status === 0 && r2Cancel.status === 0 && r2Status === 'cancelled' && r2ResState === 'true' && r2Balance === 'true',
      `status=${r2Status} res=${r2ResState} bal=${r2Balance}`)

    // --- Race 3: Payment Verification vs Expiry Sweep Race ----------------
    psqlScript(`
      insert into public.products (sku, name, srp, stock_available) values ('SKU-RACE-PAY-SWEEP', 'Race 3 Item', 100, 1);
      insert into public.product_batches (sku, quantity, reserved_quantity, expiry_date, inventory_status)
        values ('SKU-RACE-PAY-SWEEP', 1, 1, current_date + 180, 'available');
      insert into public.inventory_balances (sku, location_code, on_hand, reserved)
        values ('SKU-RACE-PAY-SWEEP', 'MANILA_MAIN', 1, 1);
      insert into public.order_requests (id, idempotency_key, status, payment_status, shipping_quote_status, total_amount)
        values ('50000000-0000-4000-8000-000000000003', 'race-3', 'submitted', 'not_requested', 'customer_confirmed', 100);
      insert into public.order_request_items (id, order_request_id, sku, quantity, unit_price, line_total)
        values ('50000000-0000-4000-8000-000000000013', '50000000-0000-4000-8000-000000000003', 'SKU-RACE-PAY-SWEEP', 1, 100, 100);
      insert into public.inventory_reservations (id, order_request_id, order_request_item_id, batch_id, sku, quantity, status, expires_at)
        values ('50000000-0000-4000-8000-000000000023', '50000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000013',
          (select id from public.product_batches where sku='SKU-RACE-PAY-SWEEP'), 'SKU-RACE-PAY-SWEEP', 1, 'active', now() + interval '10 seconds');
    `, 'race 3 fixture')

    psql(`
      select set_config('request.actor', '11111111-1111-4111-8111-111111111111', false);
      select public.set_order_request_payment_status('50000000-0000-4000-8000-000000000003', 'awaiting_instructions', 'Instructions issued');
      select public.set_order_request_payment_status('50000000-0000-4000-8000-000000000003', 'evidence_submitted', 'Evidence submitted by actor 1');
    `, 'race 3 payment advance')

    const r3Pay = runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_pay_sweep_pay';
      select set_config('request.actor', '22222222-2222-4222-8222-222222222222', false);
      begin;
      select (public.set_order_request_payment_status('50000000-0000-4000-8000-000000000003', 'verified', 'Payment verified in race 3')).payment_status;
      select pg_sleep(1.5);
      commit;
    `), dbEnv)

    let r3Holding = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const active = value(`select count(*)::text from pg_stat_activity
        where application_name='k2_race_pay_sweep_pay' and state='active' and query like '%pg_sleep%';`,
        'r3 lock probe')
      if (active === '1') { r3Holding = true; break }
      await sleep(100)
    }

    const r3Sweep = await runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_pay_sweep_sweep';
      select released_count from public.release_expired_reservations_v1(100);
    `), dbEnv)
    const r3PayRes = await r3Pay

    // Backdate reservation past expiry and re-run sweep: committed hold must still survive
    psql(`update public.inventory_reservations set expires_at=now() - interval '10 minutes' where id='50000000-0000-4000-8000-000000000023';`, 'r3 expire')
    const r3SweepAfter = value(`select released_count::text from public.release_expired_reservations_v1(100);`, 'r3 second sweep')
    const r3StillActive = value(`select (status='active' and committed_at is not null)::text from public.inventory_reservations where id='50000000-0000-4000-8000-000000000023';`, 'r3 still active')

    check('race 3: payment verification vs expiry sweep protects committed hold from release',
      r3PayRes.status === 0 && r3Sweep.status === 0 && r3SweepAfter === '0' && r3StillActive === 'true',
      `pay=${r3PayRes.status} sweep=${r3Sweep.status} after=${r3SweepAfter} active=${r3StillActive}`)

    // --- Race 4: Recount vs Payment Verification Race ---------------------
    psqlScript(`
      insert into public.products (sku, name, srp, stock_available) values ('SKU-RACE-RECON-PAY', 'Race 4 Item', 100, 1);
      insert into public.product_batches (id, sku, quantity, reserved_quantity, expiry_date, inventory_status)
        values ('50000000-0000-4000-8000-000000000034', 'SKU-RACE-RECON-PAY', 2, 1, current_date + 180, 'available');
      insert into public.inventory_balances (sku, location_code, on_hand, reserved)
        values ('SKU-RACE-RECON-PAY', 'MANILA_MAIN', 2, 1);
      insert into public.order_requests (id, idempotency_key, status, payment_status, shipping_quote_status, total_amount)
        values ('50000000-0000-4000-8000-000000000004', 'race-4', 'submitted', 'not_requested', 'customer_confirmed', 100);
      insert into public.order_request_items (id, order_request_id, sku, quantity, unit_price, line_total)
        values ('50000000-0000-4000-8000-000000000014', '50000000-0000-4000-8000-000000000004', 'SKU-RACE-RECON-PAY', 1, 100, 100);
      insert into public.inventory_reservations (id, order_request_id, order_request_item_id, batch_id, sku, quantity, status, expires_at)
        values ('50000000-0000-4000-8000-000000000024', '50000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000014',
          '50000000-0000-4000-8000-000000000034', 'SKU-RACE-RECON-PAY', 1, 'active', now() + interval '30 minutes');
    `, 'race 4 fixture')

    psql(`
      select set_config('request.actor', '11111111-1111-4111-8111-111111111111', false);
      select public.set_order_request_payment_status('50000000-0000-4000-8000-000000000004', 'awaiting_instructions', 'Instructions issued');
      select public.set_order_request_payment_status('50000000-0000-4000-8000-000000000004', 'evidence_submitted', 'Evidence submitted by actor 1');
    `, 'race 4 payment advance')

    const r4Pay = runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_recon_pay_pay';
      select set_config('request.actor', '22222222-2222-4222-8222-222222222222', false);
      begin;
      select (public.set_order_request_payment_status('50000000-0000-4000-8000-000000000004', 'verified', 'Payment verified in race 4')).payment_status;
      select pg_sleep(1.5);
      commit;
    `), dbEnv)

    let r4Holding = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const active = value(`select count(*)::text from pg_stat_activity
        where application_name='k2_race_recon_pay_pay' and state='active' and query like '%pg_sleep%';`,
        'r4 lock probe')
      if (active === '1') { r4Holding = true; break }
      await sleep(100)
    }

    const r4Recon = await runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_recon_pay_rec';
      select public.reconcile_product_batches('SKU-RACE-RECON-PAY', jsonb_build_array(jsonb_build_object(
        'id', '50000000-0000-4000-8000-000000000034', 'quantity', 2, 'box_code', 'BOX-R4',
        'expiry_date', current_date + 180, 'inventory_status', 'available'
      )), 'Race 4 physical recount');
    `), dbEnv)
    const r4PayRes = await r4Pay

    const r4Batch = value(`select (quantity=2 and reserved_quantity=1)::text from public.product_batches
      where id='50000000-0000-4000-8000-000000000034';`, 'r4 batch')
    const r4Committed = value(`select (committed_at is not null)::text from public.inventory_reservations
      where id='50000000-0000-4000-8000-000000000024';`, 'r4 committed')
    check('race 4: recount vs payment verification serializes cleanly without deadlock',
      r4PayRes.status === 0 && r4Recon.status === 0 && r4Batch === 'true' && r4Committed === 'true',
      `pay=${r4PayRes.status} recon=${r4Recon.status} batch=${r4Batch}`)

    // --- Race 5: Custody Transfer vs Confirmation Race -------------------
    psqlScript(`
      insert into public.products (sku, name, srp, stock_available) values ('SKU-RACE-CUSTODY', 'Race 5 Item', 100, 2);
      insert into public.product_batches (id, sku, quantity, quantity_available, reserved_quantity, expiry_date, inventory_status, custodian, hub)
        values ('50000000-0000-4000-8000-000000000035', 'SKU-RACE-CUSTODY', 2, 2, 0, current_date + 180, 'available', 'Warehouse Team', 'MANILA_MAIN');
      insert into public.inventory_balances (sku, location_code, on_hand, reserved)
        values ('SKU-RACE-CUSTODY', 'MANILA_MAIN', 2, 0);
      insert into public.order_requests (id, idempotency_key, status, channel_source)
        values ('50000000-0000-4000-8000-000000000005', 'race-5', 'submitted', 'website');
      insert into public.order_request_items (id, order_request_id, sku, quantity, unit_price, line_total)
        values ('50000000-0000-4000-8000-000000000015', '50000000-0000-4000-8000-000000000005', 'SKU-RACE-CUSTODY', 2, 100, 200);
    `, 'race 5 fixture')

    const r5Custody = runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_custody_move';
      begin;
      select public.transfer_inventory_custody_exact('50000000-0000-4000-8000-000000000035', 1, 'Driver Juan', 'MANILA_HUB2', 'Custody handover to transit hub');
      select pg_sleep(1.5);
      commit;
    `), dbEnv)

    let r5Holding = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const active = value(`select count(*)::text from pg_stat_activity
        where application_name='k2_race_custody_move' and state='active' and query like '%pg_sleep%';`,
        'r5 lock probe')
      if (active === '1') { r5Holding = true; break }
      await sleep(100)
    }

    const r5Conf = await runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_custody_conf';
      select (public.confirm_order_request('50000000-0000-4000-8000-000000000005', 'race 5 confirm')).status;
    `), dbEnv)
    const r5CustodyRes = await r5Custody

    const r5CustodyCount = value(`select count(*)::text from public.product_batches where sku='SKU-RACE-CUSTODY';`, 'r5 batch count')
    const r5ConfRefused = r5Conf.status !== 0 && /Insufficient sellable lot stock/i.test(r5Conf.stderr)
    check('race 5: custody transfer serializes against confirmation and refuses over-allocation',
      r5CustodyRes.status === 0 && r5ConfRefused && r5CustodyCount === '2',
      `custody=${r5CustodyRes.status} confRefused=${r5ConfRefused} batchCount=${r5CustodyCount}`)

    // --- Race 6: Consignment Receiving vs Confirmation Race --------------
    psqlScript(`
      insert into public.products (sku, name, srp, stock_available) values ('SKU-RACE-RECEIVE', 'Race 6 Item', 100, 0);
      insert into public.inventory_balances (sku, location_code, on_hand, reserved) values ('SKU-RACE-RECEIVE', 'MANILA_MAIN', 0, 0);
      insert into public.consignments (id, manifest_code, flight_number, departure_city, destination_city, status)
        values ('50000000-0000-4000-8000-000000000050', 'MANILA-FLIGHT-001', 'PR101', 'Milan, Italy', 'Manila, Philippines', 'Arrived_Manila');
      insert into public.consignment_items (id, consignment_id, sku, batch_code, box_code, best_before_date, expected_qty, italy_packed_qty, manila_scanned_qty, status)
        values ('50000000-0000-4000-8000-000000000051', '50000000-0000-4000-8000-000000000050', 'SKU-RACE-RECEIVE', 'LOT-REC-1', 'BOX-REC-1', current_date + 180, 5, 5, 5, 'Matched');
      insert into public.order_requests (id, idempotency_key, status, channel_source)
        values ('50000000-0000-4000-8000-000000000006', 'race-6', 'submitted', 'website');
      insert into public.order_request_items (id, order_request_id, sku, quantity, unit_price, line_total)
        values ('50000000-0000-4000-8000-000000000016', '50000000-0000-4000-8000-000000000006', 'SKU-RACE-RECEIVE', 2, 100, 200);
    `, 'race 6 fixture')

    const r6Fin = runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_receive_fin';
      begin;
      select (public.finalize_consignment_receipt('50000000-0000-4000-8000-000000000050', 'Receiving race finalization')).status;
      select pg_sleep(1.5);
      commit;
    `), dbEnv)

    let r6Holding = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const active = value(`select count(*)::text from pg_stat_activity
        where application_name='k2_race_receive_fin' and state='active' and query like '%pg_sleep%';`,
        'r6 lock probe')
      if (active === '1') { r6Holding = true; break }
      await sleep(100)
    }

    const r6Conf = await runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_receive_conf';
      select (public.confirm_order_request('50000000-0000-4000-8000-000000000006', 'race 6 confirm')).status;
    `), dbEnv)
    const r6FinRes = await r6Fin

    const r6Balances = value(`select (on_hand=5 and reserved=2)::text from public.inventory_balances where sku='SKU-RACE-RECEIVE';`, 'r6 balance')
    const r6StockAvail = value(`select stock_available::text from public.products where sku='SKU-RACE-RECEIVE';`, 'r6 stock')
    check('race 6: consignment receiving serializes with confirmation and makes stock immediately available',
      r6FinRes.status === 0 && r6Conf.status === 0 && r6Balances === 'true' && r6StockAvail === '3',
      `fin=${r6FinRes.status} conf=${r6Conf.status} bal=${r6Balances} stock=${r6StockAvail}`)

    // --- Race 7: Handover vs Cancellation Race ----------------------------
    psqlScript(`
      insert into public.products (sku, name, srp, stock_available) values ('SKU-RACE-HAND-CANCEL', 'Race 7 Item', 100, 0);
      insert into public.product_batches (id, sku, quantity, quantity_available, reserved_quantity, expiry_date, inventory_status)
        values ('50000000-0000-4000-8000-000000000037', 'SKU-RACE-HAND-CANCEL', 1, 1, 1, current_date + 180, 'available');
      insert into public.inventory_balances (sku, location_code, on_hand, reserved)
        values ('SKU-RACE-HAND-CANCEL', 'MANILA_MAIN', 1, 1);
      insert into public.order_requests (id, idempotency_key, status, payment_status, shipping_quote_status, total_amount, public_reference)
        values ('50000000-0000-4000-8000-000000000007', 'race-7', 'confirmed', 'verified', 'customer_confirmed', 100, 'REF-RACE-7');
      insert into public.order_request_items (id, order_request_id, sku, quantity, unit_price, line_total, product_name)
        values ('50000000-0000-4000-8000-000000000017', '50000000-0000-4000-8000-000000000007', 'SKU-RACE-HAND-CANCEL', 1, 100, 100, 'Race 7 Item');
      insert into public.inventory_reservations (id, order_request_id, order_request_item_id, batch_id, sku, quantity, packed_quantity, status, committed_at, committed_by, commit_cause)
        values ('50000000-0000-4000-8000-000000000027', '50000000-0000-4000-8000-000000000007', '50000000-0000-4000-8000-000000000017',
          '50000000-0000-4000-8000-000000000037', 'SKU-RACE-HAND-CANCEL', 1, 0, 'active', now(), '${actorId}', 'confirmation');
      insert into public.orders (order_request_id, sku, quantity, channel_source, fulfillment_method, order_status, payment_status, total_amount)
        values ('50000000-0000-4000-8000-000000000007', 'SKU-RACE-HAND-CANCEL', 1, 'website_retail', 'pickup', 'Pending', 'Paid', 100);
    `, 'race 7 fixture')

    // Perform exact packing scan
    psql(`select public.record_packing_scan_exact_v1('50000000-0000-4000-8000-000000000007', 'SKU-RACE-HAND-CANCEL', '50000000-0000-4000-8000-000000000027', true);`, 'r7 pack scan')

    const r7Hand = runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_hand_canc_hand';
      begin;
      select (public.fulfill_order_request('50000000-0000-4000-8000-000000000007', 'Race 7 handover dispatch')).status;
      select pg_sleep(1.5);
      commit;
    `), dbEnv)

    let r7Holding = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const active = value(`select count(*)::text from pg_stat_activity
        where application_name='k2_race_hand_canc_hand' and state='active' and query like '%pg_sleep%';`,
        'r7 lock probe')
      if (active === '1') { r7Holding = true; break }
      await sleep(100)
    }

    const r7Canc = await runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_hand_canc_canc';
      select (public.cancel_order_request('50000000-0000-4000-8000-000000000007', 'Race 7 cancellation')).status;
    `), dbEnv)
    const r7HandRes = await r7Hand

    const r7Status = value(`select status from public.order_requests where id='50000000-0000-4000-8000-000000000007';`, 'r7 order status')
    const r7CancRefused = r7Canc.status !== 0 && /This order request cannot be cancelled/i.test(r7Canc.stderr)
    const r7BatchQty = value(`select (quantity=0 and reserved_quantity=0)::text from public.product_batches where id='50000000-0000-4000-8000-000000000037';`, 'r7 batch')
    check('race 7: handover vs cancellation serializes and refuses cancellation once dispatched',
      r7HandRes.status === 0 && r7CancRefused && r7Status === 'fulfilled' && r7BatchQty === 'true',
      `hand=${r7HandRes.status} cancRefused=${r7CancRefused} status=${r7Status} batch=${r7BatchQty}`)

    // --- Race 8: Channel Allocation vs Confirmation Race -----------------
    psqlScript(`
      insert into public.products (sku, name, srp, stock_available) values ('SKU-RACE-CHAN', 'Race 8 Item', 100, 1);
      insert into public.product_batches (sku, quantity, reserved_quantity, expiry_date, inventory_status)
        values ('SKU-RACE-CHAN', 1, 0, current_date + 180, 'available');
      insert into public.inventory_balances (sku, location_code, on_hand, reserved)
        values ('SKU-RACE-CHAN', 'MANILA_MAIN', 1, 0);
      insert into public.order_requests (id, idempotency_key, status, channel_source) values
        ('50000000-0000-4000-8000-000000000008', 'race-8-shopee', 'submitted', 'shopee'),
        ('50000000-0000-4000-8000-000000000009', 'race-8-web', 'submitted', 'website');
      insert into public.order_request_items (order_request_id, sku, quantity, unit_price, line_total) values
        ('50000000-0000-4000-8000-000000000008', 'SKU-RACE-CHAN', 1, 100, 100),
        ('50000000-0000-4000-8000-000000000009', 'SKU-RACE-CHAN', 1, 100, 100);
    `, 'race 8 fixture')

    const r8Shopee = runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_chan_shopee';
      begin;
      select (public.confirm_order_request('50000000-0000-4000-8000-000000000008', 'Shopee channel confirm')).status;
      select pg_sleep(1.5);
      commit;
    `), dbEnv)

    let r8Holding = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const active = value(`select count(*)::text from pg_stat_activity
        where application_name='k2_race_chan_shopee' and state='active' and query like '%pg_sleep%';`,
        'r8 lock probe')
      if (active === '1') { r8Holding = true; break }
      await sleep(100)
    }

    const r8Web = await runAsync(executable['psql.exe'], psqlArgs(`
      set statement_timeout='15s';
      set application_name='k2_race_chan_web';
      select (public.confirm_order_request('50000000-0000-4000-8000-000000000009', 'Web channel confirm')).status;
    `), dbEnv)
    const r8ShopeeRes = await r8Shopee

    const r8ConfirmedCount = value(`select count(*)::text from public.order_requests
      where id in ('50000000-0000-4000-8000-000000000008','50000000-0000-4000-8000-000000000009') and status='confirmed';`, 'r8 confirmed count')
    const r8WebRefused = r8Web.status !== 0 && /Insufficient sellable lot stock/i.test(r8Web.stderr)
    check('race 8: channel allocation vs confirmation serializes and awards unit to exactly one channel',
      r8ShopeeRes.status === 0 && r8WebRefused && r8ConfirmedCount === '1',
      `shopee=${r8ShopeeRes.status} webRefused=${r8WebRefused} confirmed=${r8ConfirmedCount}`)

    // --- Step 3: Deadline Extension and Due-Queue Verification ------------
    psqlScript(`
      insert into public.products (sku, name, srp, stock_available) values ('SKU-TEST-DUE-EXT', 'Due/Extend Item', 100, 1);
      insert into public.product_batches (id, sku, quantity, reserved_quantity, expiry_date, inventory_status)
        values ('50000000-0000-4000-8000-000000000097', 'SKU-TEST-DUE-EXT', 1, 1, current_date + 180, 'available');
      insert into public.inventory_balances (sku, location_code, on_hand, reserved)
        values ('SKU-TEST-DUE-EXT', 'MANILA_MAIN', 1, 1);
      insert into public.order_requests (id, idempotency_key, status, channel_source)
        values ('50000000-0000-4000-8000-000000000099', 'due-test', 'submitted', 'website');
      insert into public.order_request_items (id, order_request_id, sku, quantity, unit_price, line_total)
        values ('50000000-0000-4000-8000-000000000096', '50000000-0000-4000-8000-000000000099', 'SKU-TEST-DUE-EXT', 1, 100, 100);
      insert into public.inventory_reservations (id, order_request_id, order_request_item_id, batch_id, sku, quantity, status, expires_at)
        values ('50000000-0000-4000-8000-000000000098', '50000000-0000-4000-8000-000000000099', '50000000-0000-4000-8000-000000000096',
          '50000000-0000-4000-8000-000000000097', 'SKU-TEST-DUE-EXT', 1, 'active', now() + interval '5 minutes');
    `, 'due test fixture')

    const dueBefore = value(`select count(*)::text from public.v_reservations_due where id='50000000-0000-4000-8000-000000000098';`, 'due before')
    psql(`select public.extend_reservation_v1('50000000-0000-4000-8000-000000000098', 30, 'Staff approved 30 min extension');`, 'extend uncommitted')

    // Confirm the order to commit the reservation
    psql(`select (public.confirm_order_request('50000000-0000-4000-8000-000000000099', 'Confirm due test')).status;`, 'confirm due order')
    const dueAfterConfirm = value(`select count(*)::text from public.v_reservations_due where id='50000000-0000-4000-8000-000000000098';`, 'due after confirm')

    // Attempting to extend committed reservation must be refused
    let extendCommittedRefused = false
    try {
      psql(`select public.extend_reservation_v1('50000000-0000-4000-8000-000000000098', 30, 'Staff approved 30 min extension');`, 'extend committed probe')
    } catch (error) {
      if (error.message.includes('RESERVATION_ALREADY_COMMITTED')) extendCommittedRefused = true
    }

    // Set expires_at in the past; sweep must still refuse to touch it
    psql(`update public.inventory_reservations set expires_at=now() - interval '1 hour' where id='50000000-0000-4000-8000-000000000098';`, 'backdate committed expiry')
    const sweepCount = value(`select released_count::text from public.release_expired_reservations_v1(100);`, 'sweep committed probe')
    const resStillCommitted = value(`select (status='active' and committed_at is not null)::text from public.inventory_reservations where id='50000000-0000-4000-8000-000000000098';`, 'committed intact')

    check('due queue and deadline extension refuse committed reservations and sweep ignores them',
      dueBefore === '1' && dueAfterConfirm === '0' && extendCommittedRefused && sweepCount === '0' && resStillCommitted === 'true',
      `dueBefore=${dueBefore} dueAfter=${dueAfterConfirm} refused=${extendCommittedRefused} sweep=${sweepCount} intact=${resStillCommitted}`)

    // --- MAP-023 Queue item 12: 'Unlisted' products ordering rehearsal -----
    psqlScript(`
      insert into public.products (sku, name, srp, status, stock_available) values
        ('SKU-UNLISTED', 'Unlisted Item', 150, 'Unlisted', 5),
        ('SKU-DRAFT', 'Draft Item', 120, 'Draft', 5);
      insert into public.product_batches (sku, quantity, reserved_quantity, expiry_date, inventory_status) values
        ('SKU-UNLISTED', 5, 0, current_date + 180, 'available'),
        ('SKU-DRAFT', 5, 0, current_date + 180, 'available');
      insert into public.inventory_balances (sku, location_code, on_hand, reserved) values
        ('SKU-UNLISTED', 'MANILA_MAIN', 5, 0),
        ('SKU-DRAFT', 'MANILA_MAIN', 5, 0);
    `, 'unlisted and draft products fixture')

    let unlistedFailedBefore = false
    try {
      psql(`select (public.submit_order_request_v2(
        'Buyer Unlisted Before', 'buyer@unlisted.test', null, '1 Street, Manila',
        'Courier delivery', null, '[{"sku":"SKU-UNLISTED","quantity":1}]'::jsonb, 'unlisted-before', null)).id;`, 'unlisted submit before migration')
    } catch (error) {
      if (error.message.includes('not available for website orders')) unlistedFailedBefore = true
    }

    const unlistedMigration = path.join(rootDir, 'supabase/migrations/20260916_allow_unlisted_product_orders.sql')
    psqlScript(fs.readFileSync(unlistedMigration, 'utf8'), 'allow unlisted product orders migration')
    psqlScript(fs.readFileSync(unlistedMigration, 'utf8'), 'allow unlisted product orders migration replay')

    const unlistedOrderId = value(`select (public.submit_order_request_v2(
      'Buyer Unlisted After', 'buyer@unlisted.test', null, '1 Street, Manila',
      'Courier delivery', null, '[{"sku":"SKU-UNLISTED","quantity":1}]'::jsonb, 'unlisted-after', null)).id::text;`, 'unlisted submit after migration')
    const unlistedOrderCount = value(`select count(*)::text from public.order_requests where idempotency_key='unlisted-after';`, 'unlisted order count')

    let draftFailedAfter = false
    try {
      psql(`select (public.submit_order_request_v2(
        'Buyer Draft After', 'buyer@draft.test', null, '1 Street, Manila',
        'Courier delivery', null, '[{"sku":"SKU-DRAFT","quantity":1}]'::jsonb, 'draft-after', null)).id;`, 'draft submit after migration')
    } catch (error) {
      if (error.message.includes('not available for website orders')) draftFailedAfter = true
    }

    const unlistedRollback = path.join(rootDir, 'supabase/migrations/20260916_allow_unlisted_product_orders_rollback.sql')
    psqlScript(fs.readFileSync(unlistedRollback, 'utf8'), 'allow unlisted product orders rollback')
    let unlistedFailedAfterRollback = false
    try {
      psql(`select (public.submit_order_request_v2(
        'Buyer Unlisted Rollback', 'buyer@unlisted.test', null, '1 Street, Manila',
        'Courier delivery', null, '[{"sku":"SKU-UNLISTED","quantity":1}]'::jsonb, 'unlisted-rollback', null)).id;`, 'unlisted submit after rollback')
    } catch (error) {
      if (error.message.includes('not available for website orders')) unlistedFailedAfterRollback = true
    }

    psqlScript(fs.readFileSync(unlistedMigration, 'utf8'), 'reapply allow unlisted product orders')

    check('unlisted products can be ordered after migration while draft products remain forbidden (with rollback tested)',
      unlistedFailedBefore && Boolean(unlistedOrderId) && unlistedOrderCount === '1' && draftFailedAfter && unlistedFailedAfterRollback,
      `unlistedBeforeRefused=${unlistedFailedBefore} unlistedOrderId=${unlistedOrderId} draftRefused=${draftFailedAfter} unlistedRollbackRefused=${unlistedFailedAfterRollback}`)


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
