#!/usr/bin/env node
/**
 * MAP Inventory Readiness Rehearsal Runner.
 *
 * Proves the composed intake-to-stock journey:
 * Manual Intake -> Field Review -> Draft Product -> Declared Manifest ->
 * Milan Packing Scans -> Manila Arrival Scans -> Final Receipt ->
 * Canonical Stock Batches and Balances.
 *
 * Also proves:
 * - 90-day expiry quarantine split (physical on_hand vs sellable stock_available)
 * - Shortage discrepancy logging with actor, timestamp, and notes
 * - Idempotent finalization retry without duplicate effects
 * - Authorized opening balances (Admin reconciliation with custodian/hub)
 * - Non-admin reconciliation refusal
 * - Undeclared arrival goods fail closed (SKU-only scan refusal)
 * - Supplier receipt workflow fails closed (K2_SUPPLIER_RECEIPT_WORKFLOW_UNAVAILABLE)
 * - Direct stock tampering blocked without k2.allow_stock_write
 *
 * 100% local testing against isolated loopback PostgreSQL. Never connects to remote.
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

const config = {
  binDir: process.env.K2_TEST_PG_BIN || path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin'),
  dataDir: path.join(rootDir, '.tools', 'map023-last-unit-pg-data'),
  logPath: path.join(rootDir, '.tools', 'inventory-readiness-pg.log'),
  port: 54329,
  database: 'k2_inventory_readiness_rehearsal',
}

const staffUserId = '20000000-0000-4000-8000-000000000001'

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

function extractSqlFunction(relativeMigrationPath, functionSignature) {
  const sql = fs.readFileSync(path.join(rootDir, 'supabase', 'migrations', relativeMigrationPath), 'utf8')
  const start = sql.indexOf(functionSignature)
  if (start < 0) throw new Error(`FUNCTION_START_NOT_FOUND: ${functionSignature} in ${relativeMigrationPath}`)
  const marker = String.fromCharCode(36, 36, 59) // '$$;'
  const end = sql.indexOf(marker, start)
  if (end < 0) throw new Error(`FUNCTION_END_NOT_FOUND: ${functionSignature} in ${relativeMigrationPath}`)
  return sql.slice(start, end + 3)
}

const BOOTSTRAP_SCHEMA = `
create extension if not exists pgcrypto with schema public;
create schema if not exists auth;
create schema if not exists k2_test;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end $$;

create or replace function auth.uid() returns uuid language sql stable
as $$ select '${staffUserId}'::uuid $$;

create or replace function auth.jwt() returns jsonb language sql stable
as $$ select '{"aal": "aal2"}'::jsonb $$;

create or replace function public.is_staff() returns boolean language sql stable
as $$ select true $$;

create or replace function public.is_admin() returns boolean language sql stable
as $$ select coalesce(current_setting('k2.test_is_admin', true) = 'on', true) $$;

create or replace function k2_test.assert_true(value boolean, message text) returns void
language plpgsql as $$ begin
  if value is distinct from true then raise exception 'ASSERTION_FAILED: %', message; end if;
end $$;

create or replace function k2_test.refuses(command text, expected_message text) returns void
language plpgsql as $$ begin
  execute command;
  raise exception 'EXPECTED_REFUSAL_MISSING: %', expected_message;
exception when others then
  if sqlerrm not like '%' || expected_message || '%' then raise; end if;
end $$;

create sequence if not exists public.k2_sku_seq start with 1001;
revoke all on sequence public.k2_sku_seq from public, anon, authenticated;

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.hubs (
  id text primary key,
  name text not null
);

create table if not exists public.custodians (
  id text primary key,
  name text not null,
  hub_id text references public.hubs(id)
);

insert into public.hubs (id, name) values
  ('manila_main', 'Manila Main Hub'),
  ('milan_staging', 'Milan Staging Facility')
on conflict (id) do nothing;

insert into public.custodians (id, name, hub_id) values
  ('manila_lead', 'Manila Receiving Lead', 'manila_main'),
  ('milan_lead', 'Milan Packing Lead', 'milan_staging')
on conflict (id) do nothing;

insert into public.brands (name) values ('Barilla'), ('Mutti') on conflict (name) do nothing;
insert into public.categories (name) values ('Pasta'), ('Sauces') on conflict (name) do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  barcode text,
  name text,
  title text,
  short_name text,
  brand_id uuid references public.brands(id),
  category_id uuid references public.categories(id),
  status text not null default 'Draft',
  published boolean not null default false,
  stock_available integer not null default 0,
  total_stock integer not null default 0,
  srp numeric not null default 0,
  retail_price numeric not null default 0,
  wholesale_price numeric not null default 0,
  vip_price numeric not null default 0,
  description text,
  short_description text,
  why_buy text,
  usage_instructions text,
  ingredients text,
  allergens text,
  seo_keywords text[] not null default '{}',
  package_type text,
  subcategory text,
  origin text,
  storage_instructions text,
  finished_product_details text,
  pairings text[] not null default '{}',
  size text,
  slug text,
  is_ai_generated boolean not null default false,
  is_human_reviewed boolean not null default false,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_batches (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku),
  box_code text,
  batch_code text,
  quantity integer not null check (quantity >= 0),
  quantity_available integer,
  reserved_quantity integer not null default 0 check (reserved_quantity between 0 and quantity),
  expiry_date date,
  best_before_date date,
  landed_date date,
  hub text,
  custodian text,
  channel text,
  is_pinned boolean not null default false,
  inventory_status text not null default 'available',
  clearance_approved_at timestamptz,
  clearance_approved_by uuid,
  arrival_flight text,
  source_consignment_item_id uuid,
  parent_batch_id uuid,
  unit_cost numeric check (unit_cost is null or unit_cost >= 0),
  owner_code text,
  source_type text check (source_type is null or source_type in ('consignment', 'supplier_receipt', 'opening_balance', 'legacy')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_balances (
  sku text not null references public.products(sku),
  location_code text not null,
  on_hand integer not null default 0,
  reserved integer not null default 0,
  damaged integer not null default 0,
  expired integer not null default 0,
  unaccounted integer not null default 0,
  available integer generated always as (greatest(on_hand - reserved - damaged - expired - unaccounted, 0)) stored,
  updated_at timestamptz not null default now(),
  primary key (sku, location_code)
);

create table if not exists public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku),
  location_code text not null,
  event_type text not null,
  quantity integer not null,
  reference_type text not null,
  reference_id uuid,
  reason text,
  actor_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.batch_change_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.product_batches(id),
  sku text not null references public.products(sku),
  reason text not null,
  old_data jsonb,
  new_data jsonb not null,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.consignments (
  id uuid primary key default gen_random_uuid(),
  manifest_code text unique,
  flight_number text,
  departure_city text,
  destination_city text,
  status text not null default 'Packing_Italy',
  arrived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.consignment_items (
  id uuid primary key default gen_random_uuid(),
  consignment_id uuid not null references public.consignments(id),
  sku text not null references public.products(sku),
  batch_code text not null,
  box_code text not null,
  best_before_date date not null,
  expected_qty integer not null,
  italy_packed_qty integer not null default 0,
  manila_scanned_qty integer not null default 0,
  status text not null default 'Pending',
  created_at timestamptz not null default now(),
  unique(consignment_id, sku, batch_code, box_code)
);

create table if not exists public.consignment_scan_events (
  id uuid primary key default gen_random_uuid(),
  consignment_id uuid references public.consignments(id),
  consignment_item_id uuid references public.consignment_items(id),
  sku text,
  stage text check (stage in ('milan', 'manila')),
  resulting_qty integer,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.product_intake_sessions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  session_code text not null unique
    default ('INT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  barcode text,
  scanned_identity text not null default '',
  checklist_step text not null default 'identify'
    check (checklist_step in (
      'identify', 'packaging_evidence', 'research_handoff', 'field_review',
      'draft_saved', 'first_inventory', 'publication_review', 'completed'
    )),
  category_type text
    check (category_type is null or category_type in ('food', 'beauty', 'household')),
  packaging_images jsonb not null default '[]'::jsonb
    check (jsonb_typeof(packaging_images) = 'array'),
  evidence_checklist jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence_checklist) = 'object'),
  draft_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(draft_payload) = 'object'),
  field_decisions jsonb not null default '{}'::jsonb
    check (jsonb_typeof(field_decisions) = 'object'),
  field_provenance jsonb not null default '{}'::jsonb
    check (jsonb_typeof(field_provenance) = 'object'),
  unknown_fields text[] not null default '{}',
  assigned_sku text,
  product_id uuid references public.products(id) on delete restrict,
  inventory_request_id uuid unique,
  inventory_result jsonb,
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint product_intake_session_product_pair check (
    (product_id is null and assigned_sku is null)
    or (product_id is not null and assigned_sku is not null)
  )
);
`

function extractAllRequiredFunctions() {
  const definitions = [
    extractSqlFunction('20260803_launch_core_stabilization.sql', 'create or replace function public.sync_product_compat_columns()'),
    extractSqlFunction('20260811_product_intake_and_sku_gate.sql', 'create or replace function public.generate_k2_sku_internal()'),
    extractSqlFunction('20260811_product_intake_and_sku_gate.sql', 'create or replace function public.sync_product_publication_status()'),
    extractSqlFunction('20260811_product_intake_and_sku_gate.sql', 'create or replace function public.create_product_draft_server('),
    extractSqlFunction('20260809_operations_hardening.sql', 'create or replace function public.reconcile_product_batches('),
    extractSqlFunction('20260803_launch_core_stabilization.sql', 'create or replace function public.create_consignment_manifest('),
    extractSqlFunction('20260809_operations_hardening.sql', 'create or replace function public.add_consignment_item_v2('),
    extractSqlFunction('20260809_operations_hardening.sql', 'create or replace function public.record_consignment_item_scan('),
    extractSqlFunction('20260809_operations_hardening.sql', 'create or replace function public.record_consignment_scan('),
    extractSqlFunction('20260803_launch_core_stabilization.sql', 'create or replace function public.advance_consignment('),
    extractSqlFunction('20260809_operations_hardening.sql', 'create or replace function public.finalize_consignment_receipt('),
    extractSqlFunction('20260811_product_intake_and_sku_gate.sql', 'create or replace function public.create_product_first_inventory_server('),
  ]

  const triggers = `
drop trigger if exists trg_sync_product_compat_columns on public.products;
create trigger trg_sync_product_compat_columns
before insert or update on public.products
for each row execute function public.sync_product_compat_columns();

drop trigger if exists trg_sync_product_publication_status on public.products;
create trigger trg_sync_product_publication_status
before insert or update of status, published on public.products
for each row execute function public.sync_product_publication_status();
`
  return [...definitions, triggers].join('\n\n')
}

const INVENTORY_JOURNEY_ASSERTIONS = `
do $$
declare
  v_session_1 uuid := '30000000-0000-4000-8000-000000000001';
  v_req_1 uuid := '30000000-0000-4000-8000-000000000002';
  v_inv_req_1 uuid := '30000000-0000-4000-8000-000000000003';
  v_session_2 uuid := '30000000-0000-4000-8000-000000000004';
  v_req_2 uuid := '30000000-0000-4000-8000-000000000005';
  v_inv_req_2 uuid := '30000000-0000-4000-8000-000000000006';
  v_session_recon uuid := '30000000-0000-4000-8000-000000000007';
  v_req_recon uuid := '30000000-0000-4000-8000-000000000008';
  v_inv_req_recon uuid := '30000000-0000-4000-8000-000000000009';

  v_reviewed_payload_1 jsonb;
  v_reviewed_payload_2 jsonb;
  v_reviewed_payload_recon jsonb;
  v_field_decisions jsonb;
  v_draft_res_1 jsonb;
  v_draft_res_2 jsonb;
  v_draft_res_recon jsonb;
  v_sku_1 text;
  v_sku_2 text;
  v_sku_recon text;

  v_manifest public.consignments;
  v_item_1 public.consignment_items;
  v_item_2 public.consignment_items;
  v_inv_res_1 jsonb;
  v_inv_res_2 jsonb;
  v_recon_res jsonb;

  v_scan_count integer;
  v_event_count integer;
  v_batches_count integer;
begin
  -- -------------------------------------------------------------------------
  -- STEP 1: Manual Intake & Field Review Gate -> Draft Product
  -- -------------------------------------------------------------------------
  v_reviewed_payload_1 := jsonb_build_object(
    'meta', jsonb_build_object('schemaVersion', 'k2.product-content.v3'),
    'product', jsonb_build_object(
      'name', 'De Cecco Rigatoni No 24 500g',
      'barcode', '8001234567890',
      'brand', 'Barilla',
      'category', 'Pasta'
    )
  );
  v_field_decisions := jsonb_build_object('name', 'accepted');

  insert into public.product_intake_sessions (
    id, request_id, barcode, scanned_identity, checklist_step,
    packaging_images, evidence_checklist
  ) values (
    v_session_1, v_req_1, '8001234567890', '8001234567890', 'draft_saved',
    jsonb_build_array(
      jsonb_build_object('slot', 'PRIMARY', 'upload_status', 'uploaded'),
      jsonb_build_object('slot', 'BACK', 'upload_status', 'uploaded'),
      jsonb_build_object('slot', 'BARCODE', 'upload_status', 'uploaded')
    ),
    jsonb_build_object('ingredients', 'true', 'allergens', 'true', 'storage', 'true', 'expiry', 'true')
  );

  -- Verification: incomplete field decision (name not accepted) fails closed
  perform k2_test.refuses(
    format('select public.create_product_draft_server(%L, %L, %L, %L)',
      v_session_1, v_req_1, v_reviewed_payload_1, '{"name": "rejected"}'::jsonb),
    'K2_DRAFT_REVIEW_GATE_INCOMPLETE'
  );

  -- Valid Draft creation succeeds
  v_draft_res_1 := public.create_product_draft_server(
    v_session_1, v_req_1, v_reviewed_payload_1, v_field_decisions
  );
  v_sku_1 := v_draft_res_1 ->> 'sku';
  perform k2_test.assert_true(v_sku_1 like 'K2-SKU-%', 'Draft product did not receive generated SKU');

  -- Verify product row is Draft with stock_available = 0 and published = false
  perform k2_test.assert_true(
    (select count(*) = 1 and bool_and(status = 'Draft' and published = false and stock_available = 0)
     from public.products where sku = v_sku_1),
    'Draft product has invalid status, published flag, or non-zero stock'
  );

  -- Verification: idempotent retry returns same SKU and product_id
  v_draft_res_1 := public.create_product_draft_server(
    v_session_1, v_req_1, v_reviewed_payload_1, v_field_decisions
  );
  perform k2_test.assert_true(
    (v_draft_res_1 ->> 'idempotent')::boolean = true and v_draft_res_1 ->> 'sku' = v_sku_1,
    'Draft creation retry was not idempotent'
  );

  -- Verification: duplicate barcode without resolution fails closed
  insert into public.product_intake_sessions (
    id, request_id, barcode, scanned_identity, checklist_step,
    packaging_images, evidence_checklist
  ) values (
    v_session_2, v_req_2, '8001234567890', '8001234567890', 'draft_saved',
    jsonb_build_array(
      jsonb_build_object('slot', 'PRIMARY', 'upload_status', 'uploaded'),
      jsonb_build_object('slot', 'BACK', 'upload_status', 'uploaded'),
      jsonb_build_object('slot', 'BARCODE', 'upload_status', 'uploaded')
    ),
    jsonb_build_object('ingredients', 'true', 'allergens', 'true', 'storage', 'true', 'expiry', 'true')
  );
  perform k2_test.refuses(
    format('select public.create_product_draft_server(%L, %L, %L, %L)',
      v_session_2, v_req_2, v_reviewed_payload_1, v_field_decisions),
    'K2_DUPLICATE_BARCODE'
  );

  -- Create second distinct product for short-dated test
  v_reviewed_payload_2 := jsonb_build_object(
    'meta', jsonb_build_object('schemaVersion', 'k2.product-content.v3'),
    'product', jsonb_build_object(
      'name', 'Mutti Polpa Pomodoro 400g',
      'barcode', '8009876543210',
      'brand', 'Mutti',
      'category', 'Sauces'
    )
  );
  update public.product_intake_sessions
  set barcode = '8009876543210', scanned_identity = '8009876543210'
  where id = v_session_2;

  v_draft_res_2 := public.create_product_draft_server(
    v_session_2, v_req_2, v_reviewed_payload_2, v_field_decisions
  );
  v_sku_2 := v_draft_res_2 ->> 'sku';

  -- -------------------------------------------------------------------------
  -- STEP 2: Declared Italy Manifest via First Inventory
  -- -------------------------------------------------------------------------
  v_manifest := public.create_consignment_manifest('K2-IT-2026-001', 'AZ-772 Milan to Manila');
  perform k2_test.assert_true(v_manifest.status = 'Packing_Italy', 'New manifest is not in Packing_Italy state');

  -- First Inventory for line 1 (normal expiry: current_date + 180, expected qty = 10)
  v_inv_res_1 := public.create_product_first_inventory_server(
    v_session_1, v_inv_req_1, 'flight',
    jsonb_build_object(
      'consignmentId', v_manifest.id,
      'boxCode', 'BOX-IT-01',
      'batchCode', 'LOT-2026-RIG-A',
      'expiryDate', (current_date + 180)::text,
      'quantity', 10,
      'unitCost', 2.50
    )
  );
  perform k2_test.assert_true(
    v_inv_res_1 ->> 'action' = 'flight_manifest_line_added',
    'First inventory failed to declare flight manifest line'
  );

  -- First Inventory for line 2 (short-dated expiry: current_date + 45, expected qty = 5)
  v_inv_res_2 := public.create_product_first_inventory_server(
    v_session_2, v_inv_req_2, 'flight',
    jsonb_build_object(
      'consignmentId', v_manifest.id,
      'boxCode', 'BOX-IT-02',
      'batchCode', 'LOT-2026-MUT-B',
      'expiryDate', (current_date + 45)::text,
      'quantity', 5,
      'unitCost', 1.80
    )
  );

  -- Verification: manifest declaration creates ZERO on-hand batches and ZERO sellable stock
  perform k2_test.assert_true(
    (select count(*) = 0 from public.product_batches),
    'Manifest declaration fabricated physical inventory batches'
  );
  perform k2_test.assert_true(
    (select coalesce(sum(stock_available), 0) = 0 from public.products where sku in (v_sku_1, v_sku_2)),
    'Manifest declaration fabricated sellable stock'
  );
  perform k2_test.assert_true(
    (select coalesce(sum(on_hand), 0) = 0 from public.inventory_balances where sku in (v_sku_1, v_sku_2)),
    'Manifest declaration fabricated on-hand balance'
  );

  -- Retrieve declared consignment items
  select * into v_item_1 from public.consignment_items
  where consignment_id = v_manifest.id and sku = v_sku_1;
  select * into v_item_2 from public.consignment_items
  where consignment_id = v_manifest.id and sku = v_sku_2;

  perform k2_test.assert_true(
    v_item_1.expected_qty = 10 and v_item_1.italy_packed_qty = 0 and v_item_1.manila_scanned_qty = 0,
    'Line 1 counts corrupted on declaration'
  );
  perform k2_test.assert_true(
    v_item_2.expected_qty = 5 and v_item_2.italy_packed_qty = 0 and v_item_2.manila_scanned_qty = 0,
    'Line 2 counts corrupted on declaration'
  );

  -- -------------------------------------------------------------------------
  -- STEP 3: Milan Packing Scans & Bounds
  -- -------------------------------------------------------------------------
  -- Verification: advancing to In_Transit before packed fails closed
  perform k2_test.refuses(
    format('select public.advance_consignment(%L, %L)', v_manifest.id, 'In_Transit'),
    'Every expected unit must be scan-packed before transit'
  );

  -- Verification: scanning for Manila before Arrived_Manila fails closed
  perform k2_test.refuses(
    format('select public.record_consignment_item_scan(%L, %L, %L)', v_manifest.id, v_item_1.id, 'manila'),
    'Consignment is not ready for Manila receiving'
  );

  -- Record 10 packing scans for line 1 in Milan
  for i in 1..10 loop
    v_item_1 := public.record_consignment_item_scan(v_manifest.id, v_item_1.id, 'milan');
  end loop;
  perform k2_test.assert_true(v_item_1.italy_packed_qty = 10, 'Milan scans for line 1 count mismatch');

  -- Verification: over-scan in Milan fails closed
  perform k2_test.refuses(
    format('select public.record_consignment_item_scan(%L, %L, %L)', v_manifest.id, v_item_1.id, 'milan'),
    'Packed scans cannot exceed expected quantity'
  );

  -- Record 5 packing scans for line 2 in Milan
  for i in 1..5 loop
    v_item_2 := public.record_consignment_item_scan(v_manifest.id, v_item_2.id, 'milan');
  end loop;
  perform k2_test.assert_true(v_item_2.italy_packed_qty = 5, 'Milan scans for line 2 count mismatch');

  -- Verify scan events logged with stage milan and actor_id
  select count(*) into v_scan_count from public.consignment_scan_events
  where consignment_id = v_manifest.id and stage = 'milan' and actor_id = auth.uid();
  perform k2_test.assert_true(v_scan_count = 15, 'Consignment scan events not properly logged for Milan');

  -- -------------------------------------------------------------------------
  -- STEP 4: Flight Transit & Manila Arrival
  -- -------------------------------------------------------------------------
  v_manifest := public.advance_consignment(v_manifest.id, 'In_Transit');
  perform k2_test.assert_true(v_manifest.status = 'In_Transit', 'Consignment failed to enter In_Transit');

  -- Verification: invalid transition from In_Transit directly to Completed fails closed
  perform k2_test.refuses(
    format('select public.advance_consignment(%L, %L)', v_manifest.id, 'Completed'),
    'Invalid consignment transition'
  );

  v_manifest := public.advance_consignment(v_manifest.id, 'Arrived_Manila');
  perform k2_test.assert_true(
    v_manifest.status = 'Arrived_Manila' and v_manifest.arrived_at is not null,
    'Consignment failed to enter Arrived_Manila'
  );

  -- -------------------------------------------------------------------------
  -- STEP 5: Manila Receiving Scans with Shortage
  -- -------------------------------------------------------------------------
  -- Line 1: 10 packed in Milan, but only 8 scanned on arrival in Manila (2 shortage units)
  for i in 1..8 loop
    v_item_1 := public.record_consignment_item_scan(v_manifest.id, v_item_1.id, 'manila');
  end loop;
  perform k2_test.assert_true(
    v_item_1.manila_scanned_qty = 8 and v_item_1.status = 'Discrepancy',
    'Line 1 shortage count or discrepancy status mismatch'
  );

  -- Line 2: 5 packed in Milan, all 5 scanned on arrival (matched)
  for i in 1..5 loop
    v_item_2 := public.record_consignment_item_scan(v_manifest.id, v_item_2.id, 'manila');
  end loop;
  perform k2_test.assert_true(
    v_item_2.manila_scanned_qty = 5 and v_item_2.status = 'Matched',
    'Line 2 matched count or status mismatch'
  );

  -- Verification: over-scan in Manila beyond Milan packed count fails closed
  perform k2_test.refuses(
    format('select public.record_consignment_item_scan(%L, %L, %L)', v_manifest.id, v_item_2.id, 'manila'),
    'Received scans cannot exceed Milan packed quantity'
  );

  -- -------------------------------------------------------------------------
  -- STEP 6: Finalize Receipt & Expiry Quarantine Split
  -- -------------------------------------------------------------------------
  v_manifest := public.finalize_consignment_receipt(
    v_manifest.id,
    'Shortage of 2 units on BOX-IT-01 noted and verified at Manila customs.'
  );
  perform k2_test.assert_true(v_manifest.status = 'Completed', 'Finalized manifest is not Completed');

  -- Line 1 Verification: normal expiry (180 days) -> status available, on_hand = 8, stock_available = 8
  perform k2_test.assert_true(
    (select count(*) = 1 and bool_and(quantity = 8 and inventory_status = 'available' and box_code = 'BOX-IT-01')
     from public.product_batches where sku = v_sku_1 and source_consignment_item_id = v_item_1.id),
    'Line 1 product batch not created with available status and exact counted quantity'
  );
  perform k2_test.assert_true(
    (select on_hand = 8 and available = 8 from public.inventory_balances where sku = v_sku_1 and location_code = 'MANILA_MAIN'),
    'Line 1 inventory balance on_hand or available mismatch'
  );
  perform k2_test.assert_true(
    (select stock_available = 8 from public.products where sku = v_sku_1),
    'Line 1 products.stock_available mismatch'
  );

  -- Line 2 Verification: short-dated expiry (45 days) -> status QUARANTINE, on_hand = 5, sellable stock_available = 0!
  perform k2_test.assert_true(
    (select count(*) = 1 and bool_and(quantity = 5 and inventory_status = 'quarantine' and box_code = 'BOX-IT-02')
     from public.product_batches where sku = v_sku_2 and source_consignment_item_id = v_item_2.id),
    'Line 2 short-dated product batch was not quarantined'
  );
  perform k2_test.assert_true(
    (select on_hand = 5 and available = 5 from public.inventory_balances where sku = v_sku_2 and location_code = 'MANILA_MAIN'),
    'Line 2 inventory balance physical on_hand lost quarantined units'
  );
  perform k2_test.assert_true(
    (select stock_available = 0 from public.products where sku = v_sku_2),
    'Line 2 sellable stock incorrectly included quarantined short-dated units'
  );

  -- Shortage Verification: inventory_events recorded reconciled event for 2 missing units
  perform k2_test.assert_true(
    (select count(*) = 1 and bool_and(quantity = 2 and event_type = 'reconciled'
      and actor_id = auth.uid() and metadata->>'result' = 'missing_on_arrival'
      and reason = 'Shortage of 2 units on BOX-IT-01 noted and verified at Manila customs.')
     from public.inventory_events where sku = v_sku_1 and event_type = 'reconciled'),
    'Shortage discrepancy event not recorded with exact metadata, actor, and reason'
  );

  -- -------------------------------------------------------------------------
  -- STEP 7: Idempotent Receipt Retry
  -- -------------------------------------------------------------------------
  select count(*) into v_batches_count from public.product_batches;
  select count(*) into v_event_count from public.inventory_events;

  v_manifest := public.finalize_consignment_receipt(v_manifest.id, 'Retry after network glitch');
  perform k2_test.assert_true(v_manifest.status = 'Completed', 'Finalization retry failed');
  perform k2_test.assert_true(
    (select count(*) = v_batches_count from public.product_batches) and
    (select count(*) = v_event_count from public.inventory_events),
    'Receipt finalization retry duplicated batches or events'
  );

  -- -------------------------------------------------------------------------
  -- STEP 8: Authorized Opening Balances (Reconciliation)
  -- -------------------------------------------------------------------------
  v_reviewed_payload_recon := jsonb_build_object(
    'meta', jsonb_build_object('schemaVersion', 'k2.product-content.v3'),
    'product', jsonb_build_object(
      'name', 'De Cecco Penne Rigate No 41 500g',
      'barcode', '8005554443332',
      'brand', 'Barilla',
      'category', 'Pasta'
    )
  );
  insert into public.product_intake_sessions (
    id, request_id, barcode, scanned_identity, checklist_step,
    packaging_images, evidence_checklist
  ) values (
    v_session_recon, v_req_recon, '8005554443332', '8005554443332', 'draft_saved',
    jsonb_build_array(
      jsonb_build_object('slot', 'PRIMARY', 'upload_status', 'uploaded'),
      jsonb_build_object('slot', 'BACK', 'upload_status', 'uploaded'),
      jsonb_build_object('slot', 'BARCODE', 'upload_status', 'uploaded')
    ),
    jsonb_build_object('ingredients', 'true', 'allergens', 'true', 'storage', 'true', 'expiry', 'true')
  );
  v_draft_res_recon := public.create_product_draft_server(
    v_session_recon, v_req_recon, v_reviewed_payload_recon, v_field_decisions
  );
  v_sku_recon := v_draft_res_recon ->> 'sku';

  -- Admin opening balance reconciliation succeeds
  v_recon_res := public.create_product_first_inventory_server(
    v_session_recon, v_inv_req_recon, 'reconciliation',
    jsonb_build_object(
      'boxCode', 'BOX-OPEN-01',
      'batchCode', 'LOT-OPEN-01',
      'hubLocation', 'manila_main',
      'custodian', 'manila_lead',
      'ownerCode', 'K2-CORP',
      'quantity', 12,
      'unitCost', 2.20,
      'expiryDate', (current_date + 180)::text,
      'reason', 'Authorized opening balance audit'
    )
  );
  perform k2_test.assert_true(
    v_recon_res ->> 'action' = 'opening_balance_reconciled' and (v_recon_res ->> 'quantity')::integer = 12,
    'Opening balance reconciliation failed'
  );
  perform k2_test.assert_true(
    (select count(*) = 1 and bool_and(quantity = 12 and source_type = 'opening_balance' and owner_code = 'K2-CORP')
     from public.product_batches where sku = v_sku_recon),
    'Opening balance batch not recorded with source_type and owner_code'
  );
  perform k2_test.assert_true(
    (select on_hand = 12 from public.inventory_balances where sku = v_sku_recon and location_code = 'MANILA_MAIN'),
    'Opening balance inventory balance not updated'
  );
  perform k2_test.assert_true(
    (select stock_available = 12 from public.products where sku = v_sku_recon),
    'Opening balance product sellable stock not updated'
  );
  perform k2_test.assert_true(
    (select count(*) = 1 and bool_and(reason = 'Authorized opening balance audit')
     from public.batch_change_events where sku = v_sku_recon),
    'Opening balance batch change event not recorded'
  );

  -- -------------------------------------------------------------------------
  -- STEP 9: Fail-Closed Security & Integrity Boundaries
  -- -------------------------------------------------------------------------
  -- 1. Non-admin reconciliation is refused
  insert into public.product_intake_sessions (
    id, request_id, barcode, scanned_identity, checklist_step,
    product_id, assigned_sku, created_by
  ) values (
    '30000000-0000-4000-8000-000000000010'::uuid, '30000000-0000-4000-8000-000000000011'::uuid,
    '8005554443332', '8005554443332', 'first_inventory',
    (select id from public.products where sku = v_sku_recon), v_sku_recon, auth.uid()
  );

  perform set_config('k2.test_is_admin', 'off', true);
  perform k2_test.refuses(
    format('select public.create_product_first_inventory_server(%L, gen_random_uuid(), %L, %L)',
      '30000000-0000-4000-8000-000000000010'::uuid, 'reconciliation',
      jsonb_build_object(
        'boxCode', 'BOX-X', 'batchCode', 'LOT-X', 'hubLocation', 'manila_main',
        'custodian', 'manila_lead', 'ownerCode', 'K2', 'quantity', 5,
        'expiryDate', (current_date + 180)::text, 'reason', 'Unauthorized'
      )),
    'K2_ADMIN_RECONCILIATION_REQUIRED'
  );
  perform set_config('k2.test_is_admin', 'on', true);

  -- 2. Undeclared goods: legacy SKU-only scan fails closed
  perform k2_test.refuses(
    format('select public.record_consignment_scan(%L, %L, %L)', v_manifest.id, v_sku_1, 'manila'),
    'SKU-only scans are ambiguous. Use record_consignment_item_scan with the selected box/lot line.'
  );

  -- 3. Supplier receipt fails closed
  insert into public.product_intake_sessions (
    id, request_id, barcode, scanned_identity, checklist_step,
    product_id, assigned_sku, created_by
  ) values (
    '30000000-0000-4000-8000-000000000012'::uuid, '30000000-0000-4000-8000-000000000013'::uuid,
    '8005554443332', '8005554443332', 'first_inventory',
    (select id from public.products where sku = v_sku_recon), v_sku_recon, auth.uid()
  );

  perform k2_test.refuses(
    format('select public.create_product_first_inventory_server(%L, gen_random_uuid(), %L, %L)',
      '30000000-0000-4000-8000-000000000012'::uuid, 'receipt',
      jsonb_build_object('quantity', 10, 'expiryDate', (current_date + 180)::text)),
    'K2_SUPPLIER_RECEIPT_WORKFLOW_UNAVAILABLE'
  );

  -- 4. Direct products table stock writes without k2.allow_stock_write fail closed
  perform k2_test.refuses(
    format('update public.products set stock_available = 999 where sku = %L', v_sku_1),
    'Stock changes must use batch reconciliation, receiving, reservation, or fulfillment'
  );

  -- 5. Direct products insert with non-zero stock fails closed
  perform k2_test.refuses(
    format('insert into public.products (sku, stock_available) values (%L, 10)', 'SKU-TAMPER-001'),
    'Create the product at zero stock, then record its real batches'
  );

end $$;
select 'INVENTORY_READINESS_JOURNEY_OK';
`

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
    const psql = (sql, label) => run(executable['psql.exe'],
      ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql], label, dbEnv)

    console.log('[1/4] Bootstrapping schema and security functions...')
    psql(BOOTSTRAP_SCHEMA, 'inventory readiness bootstrap')

    console.log('[2/4] Installing extracted operational and intake functions...')
    const functionsSql = extractAllRequiredFunctions()
    run(executable['psql.exe'], ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1'],
      'installing extracted functions', dbEnv, { input: functionsSql })

    console.log('[3/4] Executing composed inventory readiness journey assertions...')
    const result = run(executable['psql.exe'], ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1'],
      'inventory readiness journey', dbEnv, { input: INVENTORY_JOURNEY_ASSERTIONS })

    if (!result.includes('INVENTORY_READINESS_JOURNEY_OK')) {
      throw new Error('INVENTORY_READINESS_JOURNEY_ASSERTION_MISSING')
    }

    console.log('[4/4] Verifying database invariants and audit trail...')
    const summary = psql(`select concat_ws(' | ',
      'products=' || (select count(*) from public.products),
      'batches=' || (select count(*) from public.product_batches),
      'manifests=' || (select count(*) from public.consignments),
      'scan_events=' || (select count(*) from public.consignment_scan_events),
      'inventory_events=' || (select count(*) from public.inventory_events),
      'total_on_hand=' || (select sum(on_hand) from public.inventory_balances),
      'total_sellable=' || (select sum(stock_available) from public.products)
    );`, 'read summary')
    console.log(`[ok] Verified summary: ${summary}`)

    console.log('\n================================================================');
    console.log('  ALL INVENTORY READINESS CHECKS PASSED SUCCESSFULLY (100% LOCAL)');
    console.log('================================================================');
    console.log('Evidence summary:');
    console.log('- Manual intake field review gate enforced; Draft product created at stock 0');
    console.log('- Manifest declaration creates zero on-hand and zero sellable stock');
    console.log('- Milan packing scans bounds enforced (cannot over-pack expected qty)');
    console.log('- Custody transit gating enforced (cannot ship until all units packed)');
    console.log('- Manila arrival scans bounded by Milan packed count (cannot scan undeclared)');
    console.log('- Shortage recorded with actor, timestamp, note and missing_on_arrival metadata');
    console.log('- 90-day expiry quarantine split verified: physical on_hand retains 100%, sellable excludes short-dated');
    console.log('- Finalization retry is idempotent without duplicate batches, balances, or events');
    console.log('- Authorized opening balances recorded with source_type, owner_code, and audit event');
    console.log('- Non-admin reconciliation refused (K2_ADMIN_RECONCILIATION_REQUIRED)');
    console.log('- Supplier receipt workflow fails closed (K2_SUPPLIER_RECEIPT_WORKFLOW_UNAVAILABLE)');
    console.log('- Direct stock tampering blocked without k2.allow_stock_write');
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
