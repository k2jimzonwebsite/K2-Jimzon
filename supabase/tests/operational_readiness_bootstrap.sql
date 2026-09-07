-- Minimal schema extension for extracted receiving/payment functions.
-- Runs inside a rolled-back transaction in the last-unit rehearsal database.
-- Auth is the runner's synthetic staff identity; this is not an RLS/BFF test.
create table public.consignments (
  id uuid primary key default gen_random_uuid(), manifest_code text unique,
  flight_number text, departure_city text, destination_city text,
  status text not null default 'Packing_Italy', arrived_at timestamptz
);
create table public.consignment_items (
  id uuid primary key default gen_random_uuid(),
  consignment_id uuid not null references public.consignments(id),
  sku text not null references public.products(sku), batch_code text, box_code text,
  best_before_date date, expected_qty integer not null,
  italy_packed_qty integer not null default 0, manila_scanned_qty integer not null default 0,
  status text not null default 'Pending',
  unique(consignment_id,sku,batch_code,box_code,best_before_date)
);
create table public.consignment_scan_events (
  id uuid primary key default gen_random_uuid(), consignment_id uuid,
  consignment_item_id uuid, sku text, stage text, resulting_qty integer,
  actor_id uuid, created_at timestamptz not null default now()
);
alter table public.product_batches
  add column box_code text, add column batch_code text,
  add column quantity_available integer, add column landed_date date,
  add column hub text, add column arrival_flight text,
  add column source_consignment_item_id uuid;
alter table public.inventory_events add column metadata jsonb not null default '{}';
alter table public.order_request_events add column metadata jsonb not null default '{}';
create schema k2_test;
create function k2_test.assert_true(value boolean, message text) returns void
language plpgsql as $$ begin
  if value is distinct from true then raise exception 'ASSERTION_FAILED: %', message; end if;
end $$;
create function k2_test.refuses(command text, expected_message text) returns void
language plpgsql as $$ begin
  execute command;
  raise exception 'EXPECTED_REFUSAL_MISSING: %', expected_message;
exception when others then
  if sqlerrm <> expected_message then raise; end if;
end $$;
