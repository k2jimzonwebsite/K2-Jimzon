-- ===========================================================================
-- K2 Jimzon — Staff custody & multi-location stock allocation
-- ===========================================================================
-- Stock does not sit in one warehouse. A SKU is split across staff custodians
-- (Makati hub, QC hub, a courier, a box still in Milan transit). This is the
-- record of WHO physically holds HOW MANY units of a SKU, and WHERE.
--
-- Before this migration the custody UI kept allocations in React state only:
-- pressing "Save Staff Inventory Allocations" persisted nothing and the data
-- vanished on refresh. 20260723_master_security_rls.sql already expected a
-- `staff_allocations` table to exist and silently skipped it.
--
-- Safe to run as-is (idempotent). Run in the Supabase SQL editor.
-- ===========================================================================

create table if not exists public.staff_allocations (
  id           uuid primary key default gen_random_uuid(),
  sku          text not null references public.products(sku) on delete cascade,

  -- Who holds it. staff_user_id links to a real account when we have one;
  -- staff_name is kept denormalised so history survives an account deletion.
  staff_user_id uuid references public.user_profiles(id) on delete set null,
  staff_name   text not null,

  location     text,                                  -- hub / city / transit leg
  bin          text,                                  -- shelf or bin within the hub
  stock        integer not null default 0 check (stock >= 0),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One custody row per staff member per SKU — prevents the same person showing
-- up twice with divergent counts.
create unique index if not exists staff_allocations_sku_staff_uniq
  on public.staff_allocations (sku, staff_name);

create index if not exists staff_allocations_sku_idx
  on public.staff_allocations (sku);

-- Keep updated_at honest.
create or replace function public.touch_staff_allocations()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists staff_allocations_touch on public.staff_allocations;
create trigger staff_allocations_touch
  before update on public.staff_allocations
  for each row execute function public.touch_staff_allocations();

-- Convenience view: allocated vs. on-hand, so a variance is visible in SQL too.
create or replace view public.staff_allocation_variance as
select
  p.sku,
  p.name,
  coalesce(p.stock_available, 0)                as stock_available,
  coalesce(sum(a.stock), 0)::int                as stock_allocated,
  coalesce(p.stock_available, 0) - coalesce(sum(a.stock), 0)::int as variance
from public.products p
left join public.staff_allocations a on a.sku = p.sku
group by p.sku, p.name, p.stock_available;

alter table public.staff_allocations enable row level security;

drop policy if exists "Staff read allocations" on public.staff_allocations;
create policy "Staff read allocations"
  on public.staff_allocations for select to authenticated using (true);

drop policy if exists "Staff write allocations" on public.staff_allocations;
create policy "Staff write allocations"
  on public.staff_allocations for all to authenticated
  using (true) with check (true);
