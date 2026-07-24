-- ===========================================================================
-- K2 Jimzon — Batch & Expiry (FEFO) tracking + staff expiry notifications
-- ===========================================================================
-- The same product (same SKU) can arrive in several boxes with DIFFERENT
-- expiry dates. Each of those is a "batch". This tracks every batch, sums them
-- into total stock, feeds a staff expiry-alert list, and deducts first-expired-
-- first-out when orders ship.
--
-- Safe to run as-is (idempotent). Run in the Supabase SQL editor.
-- ===========================================================================

-- 1) The batch bank -----------------------------------------------------------
create table if not exists public.product_batches (
  id          uuid primary key default gen_random_uuid(),
  sku         text not null references public.products(sku) on delete cascade,
  box_code    text,                        -- which cargo box it arrived in
  quantity    integer not null default 0 check (quantity >= 0),
  expiry_date date,                         -- best-before / expiration for THIS batch
  landed_date date default current_date,    -- when it was received at the hub
  hub         text,                         -- which warehouse / hub holds it
  custodian   text,                         -- which staff member holds it (per-staff custody)
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- If you previously ran 0016_fefo_batch_tracking, make sure the columns exist:
alter table public.product_batches add column if not exists box_code    text;
alter table public.product_batches add column if not exists quantity    integer default 0;
alter table public.product_batches add column if not exists expiry_date date;
alter table public.product_batches add column if not exists landed_date date default current_date;
alter table public.product_batches add column if not exists hub         text;
alter table public.product_batches add column if not exists custodian   text;
alter table public.product_batches add column if not exists is_pinned   boolean default false;

create index if not exists product_batches_sku_idx    on public.product_batches (sku);
create index if not exists product_batches_expiry_idx on public.product_batches (expiry_date);

alter table public.product_batches enable row level security;
drop policy if exists "Public read product_batches" on public.product_batches;
create policy "Public read product_batches" on public.product_batches for select using (true);
drop policy if exists "Staff manage product_batches" on public.product_batches;
create policy "Staff manage product_batches" on public.product_batches for all to authenticated using (true) with check (true);

-- Live updates in the dashboard
do $$ begin
  alter publication supabase_realtime add table public.product_batches;
exception when duplicate_object then null; end $$;

-- 2) Total stock per SKU = sum of its batches ---------------------------------
create or replace view public.v_product_stock_from_batches as
select sku, coalesce(sum(quantity), 0) as stock_from_batches
from public.product_batches
group by sku;

-- 3) Expiry-alert feed for staff (soonest first) ------------------------------
create or replace view public.v_expiring_batches as
select b.id, b.sku, p.name as product_name, b.box_code, b.hub, b.custodian,
       b.quantity, b.expiry_date, b.is_pinned,
       (b.expiry_date - current_date) as days_left,
       case
         when b.expiry_date is null                       then 'none'
         when b.expiry_date <  current_date               then 'expired'
         when b.expiry_date <= current_date + 30          then 'critical'
         when b.expiry_date <= current_date + 90          then 'warning'
         else 'fresh'
       end as status
from public.product_batches b
left join public.products p on p.sku = b.sku
where b.quantity > 0
order by b.expiry_date asc nulls last;

-- 4) FEFO deduction: ship from the soonest-expiring batch first ---------------
create or replace function public.deduct_stock_fefo(p_sku text, p_qty integer)
returns void language plpgsql as $$
declare rec record; remaining integer := p_qty;
begin
  for rec in
    select id, quantity from public.product_batches
    where sku = p_sku and quantity > 0
    order by is_pinned desc, expiry_date asc nulls last
  loop
    exit when remaining <= 0;
    if rec.quantity <= remaining then
      update public.product_batches set quantity = 0 where id = rec.id;
      remaining := remaining - rec.quantity;
    else
      update public.product_batches set quantity = quantity - remaining where id = rec.id;
      remaining := 0;
    end if;
  end loop;
end $$;
