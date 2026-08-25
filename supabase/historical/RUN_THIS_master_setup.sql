-- ============================================================================
-- K2 JIMZON — MASTER SETUP (run this ONE file)
-- ============================================================================
-- This is everything the current app needs, in the right order.
-- It is IDEMPOTENT: safe to run on your existing database, and safe to run
-- more than once. Nothing here deletes data — it only adds what's missing.
--
-- HOW TO RUN:  Supabase  →  SQL Editor  →  paste all of this  →  Run.
-- If you get an enum error on section 1, run ONLY section 1 first, then run
-- the rest. (Postgres won't let a brand-new enum value be used in the same
-- run it was created — this file never does that, so a single Run is fine.)
-- ============================================================================


-- ============================================================================
-- SECTION 1 — ENUM READINESS  (fixes: invalid input value for enum channel_type)
-- ============================================================================
-- Order channel (orders.channel_source) — add the marketplace values the
-- connectors will write. 'lazada' / 'tiktok_shop' may already exist; IF NOT
-- EXISTS makes this safe.
alter type channel_type add value if not exists 'shopee';
alter type channel_type add value if not exists 'lazada';
alter type channel_type add value if not exists 'tiktok';
alter type channel_type add value if not exists 'tiktok_shop';
alter type channel_type add value if not exists 'website';

-- Message platform (conversations.platform) — the labels the Inbox expects.
alter type chat_platform add value if not exists 'Instagram';
alter type chat_platform add value if not exists 'TikTok';
alter type chat_platform add value if not exists 'Shopee';
alter type chat_platform add value if not exists 'Lazada';
alter type chat_platform add value if not exists 'Website';
alter type chat_platform add value if not exists 'Pasabuy';


-- ============================================================================
-- SECTION 2 — ORDER ATTRIBUTION  (buyer name + email + line total on orders)
-- ============================================================================
alter table public.orders
  add column if not exists customer_name  text,
  add column if not exists customer_email text,
  add column if not exists total_amount   numeric;

update public.orders
set customer_name = coalesce(customer_name, 'Website Guest')
where customer_name is null;


-- ============================================================================
-- SECTION 3 — BATCH BANK + EXPIRY TRACKING (FEFO)
-- ============================================================================
-- Same product (same SKU) can arrive in several boxes with DIFFERENT expiry
-- dates. Each is a "batch". This tracks every batch, sums them into total
-- stock, feeds the staff expiry-alert bell, and ships first-expired-first-out.

create table if not exists public.product_batches (
  id          uuid primary key default gen_random_uuid(),
  sku         text not null references public.products(sku) on delete cascade,
  box_code    text,                        -- which cargo box it arrived in
  quantity    integer not null default 0 check (quantity >= 0),
  expiry_date date,                         -- best-before / expiration for THIS batch
  landed_date date default current_date,    -- when it was received at the hub
  hub         text,                         -- which warehouse / hub holds it
  custodian   text,                         -- which staff member holds it
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- If an older batch table already existed, make sure every column is present:
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

-- Total stock per SKU = sum of its batches
create or replace view public.v_product_stock_from_batches as
select sku, coalesce(sum(quantity), 0) as stock_from_batches
from public.product_batches
group by sku;

-- Expiry-alert feed for staff (soonest first) — this is what the 🔔 bell reads
create or replace view public.v_expiring_batches as
select b.id, b.sku, p.name as product_name, b.box_code, b.hub, b.custodian,
       b.quantity, b.expiry_date, b.is_pinned,
       (b.expiry_date - current_date) as days_left,
       case
         when b.expiry_date is null              then 'none'
         when b.expiry_date <  current_date      then 'expired'
         when b.expiry_date <= current_date + 30 then 'critical'
         when b.expiry_date <= current_date + 90 then 'warning'
         else 'fresh'
       end as status
from public.product_batches b
left join public.products p on p.sku = b.sku
where b.quantity > 0
order by b.expiry_date asc nulls last;

-- FEFO deduction: ship from the soonest-expiring batch first
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


-- ============================================================================
-- SECTION 4 — ERROR REPORTING (client crashes land here instead of dying silently)
-- ============================================================================
-- Non-recursive staff check (SECURITY DEFINER so the policy can read
-- user_profiles without tripping its own RLS). Safe to re-create.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid()
      and (role::text ilike 'Admin' or role::text ilike 'Staff')
  );
$$;

create table if not exists public.error_reports (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  message     text,
  stack       text,
  url         text,
  user_agent  text,
  context     jsonb default '{}'::jsonb,
  status      text default 'new'
);

alter table public.error_reports enable row level security;

drop policy if exists "Anyone can log errors" on public.error_reports;
create policy "Anyone can log errors"
  on public.error_reports for insert to anon, authenticated with check (true);

drop policy if exists "Staff read errors" on public.error_reports;
create policy "Staff read errors"
  on public.error_reports for select to authenticated using (public.is_staff());


-- ============================================================================
-- DONE. Verify quickly (optional):
--   select * from v_expiring_batches;                       -- expiry feed
--   select * from v_product_stock_from_batches;             -- stock per SKU
--   select unnest(enum_range(null::channel_type));          -- order channels
--   select unnest(enum_range(null::chat_platform));         -- message platforms
-- ============================================================================
