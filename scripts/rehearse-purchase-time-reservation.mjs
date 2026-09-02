#!/usr/bin/env node
/**
 * MAP-023 / IDEA-20260902-04 — purchase-time reservation rehearsal.
 *
 * Installs the repository's real 20260809 order functions onto a minimal
 * compatible schema, applies 20260902_purchase_time_reservation.sql verbatim on
 * top of them, and then proves the five properties that decide whether payment
 * can safely be taken at checkout:
 *
 *   1. Submitting an order holds its stock immediately.
 *   2. Two customers racing for one unit produce exactly one order.
 *   3. The loser's order does not exist at all, rather than existing unfillable.
 *   4. Confirming a purchase-held order does not claim the units a second time.
 *   5. An order that predates the hold still reserves at confirm, so every row
 *      already in the table keeps working.
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

// The reservation-expiry columns this migration depends on. Mirrors
// 20260902_reservation_expiry_policy.sql, including the website-only deadline
// trigger, so the rehearsal exercises the same shape production will have.
const EXPIRY_COLUMNS = `
alter table public.inventory_reservations
  add column if not exists expires_at timestamptz,
  add column if not exists hold_minutes integer,
  add column if not exists released_at timestamptz,
  add column if not exists release_cause text;

create or replace function public.set_reservation_deadline() returns trigger
language plpgsql as $$
declare v_channel text;
begin
  if new.expires_at is not null then return new; end if;
  select o.channel_source into v_channel from public.order_requests o where o.id = new.order_request_id;
  if v_channel is distinct from 'website' then return new; end if;
  new.hold_minutes := coalesce(new.hold_minutes, 30);
  new.expires_at := now() + make_interval(mins => new.hold_minutes);
  return new;
end $$;

drop trigger if exists inventory_reservations_set_deadline on public.inventory_reservations;
create trigger inventory_reservations_set_deadline
  before insert on public.inventory_reservations
  for each row execute function public.set_reservation_deadline();
`

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
    psqlScript(EXPIRY_COLUMNS, 'reservation expiry columns')
    psqlScript(originalSubmit(), 'original submit_order_request_v2 install')
    psqlScript(originalConfirm(), 'original confirm_order_request install')
    psqlScript(LEGACY_ORDER, 'pre-migration order fixture')
    console.log('[ok] repository 20260809 order functions installed')

    // The migration must apply verbatim on top of the real prior state.
    psqlScript(holdMigration(), 'purchase-time reservation migration')
    console.log('[ok] 20260902_purchase_time_reservation.sql applied')

    // Idempotent replay.
    psqlScript(holdMigration(), 'purchase-time reservation replay')
    console.log('[ok] migration replays without error')

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
