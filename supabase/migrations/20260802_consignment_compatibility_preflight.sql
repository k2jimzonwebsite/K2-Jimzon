-- K2 launch preflight: create the consignment record boundary when historical
-- migration 0018 was not applied. Safe to rerun and locked by RLS immediately.

begin;

create table if not exists public.consignments (
  id uuid primary key default gen_random_uuid(),
  manifest_code text unique not null,
  flight_number text,
  departure_city text not null default 'Milan, Italy',
  destination_city text not null default 'Manila, Philippines',
  status text not null default 'Packing_Italy'
    check (status in ('Packing_Italy', 'In_Transit', 'Arrived_Manila', 'Completed')),
  packed_at timestamptz default now(),
  arrived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.consignment_items (
  id uuid primary key default gen_random_uuid(),
  consignment_id uuid not null references public.consignments(id) on delete cascade,
  sku text not null references public.products(sku) on delete restrict,
  batch_code text not null,
  best_before_date date not null,
  expected_qty integer not null default 0 check (expected_qty >= 0),
  italy_packed_qty integer not null default 0 check (italy_packed_qty >= 0),
  manila_scanned_qty integer not null default 0 check (manila_scanned_qty >= 0),
  status text not null default 'Pending'
    check (status in ('Pending', 'Matched', 'Discrepancy')),
  created_at timestamptz not null default now(),
  constraint unique_consignment_sku unique (consignment_id, sku)
);

alter table public.consignments enable row level security;
alter table public.consignment_items enable row level security;

commit;

notify pgrst, 'reload schema';
