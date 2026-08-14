-- ============================================================================
-- K2 JIMZON — MAP-004 Canonical Operational Identities Migration
-- Migration: 20260812_canonical_identities.sql
-- ============================================================================

-- 1. Canonical Hubs Table
create table if not exists public.hubs (
  id          text primary key, -- e.g. HUB-MNL-CENTRAL
  name        text not null,
  code        text not null unique,
  country     text not null default 'PH',
  role        text,
  created_at  timestamptz not null default now()
);

-- Seed canonical hubs
insert into public.hubs (id, name, code, country, role) values
  ('HUB-MNL-CENTRAL', 'Manila Central Hub', 'MNL-CENTRAL', 'PH', 'Fulfillment & Receiving'),
  ('HUB-MIL-DEPOT', 'Milan Cargo Depot', 'MIL-DEPOT', 'IT', 'Packing & Export'),
  ('HUB-CEB-TRANSIT', 'Cebu Transit Hub', 'CEB-TRANSIT', 'PH', 'Regional Transit')
on conflict (id) do update set name = excluded.name, role = excluded.role;

-- 2. Canonical Custodians / Staff Table
create table if not exists public.custodians (
  id          text primary key, -- e.g. CUST-STAFF-ELENA
  name        text not null,
  role        text not null,
  hub_id      text references public.hubs(id) on delete set null,
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Seed canonical custodians
insert into public.custodians (id, name, role, hub_id) values
  ('CUST-STAFF-ELENA', 'Elena Santos', 'PH Warehouse Lead', 'HUB-MNL-CENTRAL'),
  ('CUST-STAFF-MARCO', 'Marco Rossi', 'Italy Cargo Specialist', 'HUB-MIL-DEPOT'),
  ('CUST-STAFF-MATTEO', 'Matteo Ricci', 'Manila Operations Specialist', 'HUB-MNL-CENTRAL')
on conflict (id) do update set name = excluded.name, role = excluded.role;

-- Enable RLS on canonical tables
alter table public.hubs enable row level security;
alter table public.custodians enable row level security;

drop policy if exists "Public read hubs" on public.hubs;
create policy "Public read hubs" on public.hubs for select using (true);

drop policy if exists "Authenticated read custodians" on public.custodians;
create policy "Authenticated read custodians" on public.custodians for select to authenticated using (true);
