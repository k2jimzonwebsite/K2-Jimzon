-- =============================================================================
-- Migration: 20260929_channel_listing_slices.sql
-- MAP-026 / IDEA-20260929-06 - channel listing slices for the single master
-- inventory rule: shop seeds, website visibility view, lot weight, oversell guard.
--
-- Locked owner logic this serves:
--   1 SKU = 1 master product = sum of its warehouse slices. Browse shows a
--   Live SKU listed for Website (zero stock flips the action to Request
--   instead of Add to cart). Unlisted stays out of browse but may remain
--   directly reachable only through its Website assignment. Marketplace
--   allocations stay Admin-visible. Warehouse means storage place plus holder.
--   Price is website-only for now.
--
-- Applies after 20260829 (channels + channel_shops) and 20260917 (allocations
-- + transfers) in the ordered chain. Prepared only: needs MAP-017 gate, fresh
-- backup/preflight, and explicit owner authorization naming the exact chain
-- before any production apply.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Prereqs fail closed: this slice hangs off the earlier chain, never recreates it.
-- ---------------------------------------------------------------------------
do $prereq$
begin
  if to_regclass('public.channel_shops') is null
     or to_regclass('public.channel_shop_allocations') is null
     or to_regclass('public.channel_listings') is null
     or to_regclass('public.product_batches') is null
     or to_regclass('public.products') is null
     or to_regclass('public.inventory_balances') is null then
    raise exception 'K2_SLICE_PREREQ_MISSING: apply launch core, 20260829, and 20260917 first';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'published'
  ) then
    raise exception 'K2_SLICE_PREREQ_MISSING: products.published is required';
  end if;
end
$prereq$;

-- ---------------------------------------------------------------------------
-- A. Shop seeds: the six footer shops. Status not_connected (no approved
-- marketplace app yet); external ids stay null until seller authorization.
-- Seeds only: never overwrite a shop a staff member already operationalized.
-- ---------------------------------------------------------------------------
insert into public.channel_shops (shop_code, channel_code, display_name, status) values
  ('pasabuy-lazada', 'lazada', 'Pasabuy Italy by K2 - Lazada', 'not_connected'),
  ('pasabuy-shopee', 'shopee', 'Pasabuy Italy by K2 - Shopee', 'not_connected'),
  ('pasabuy-tiktok', 'tiktok', 'Pasabuy Italy by K2 - TikTok', 'not_connected'),
  ('jworld-lazada',  'lazada', 'Jworldbasket - Lazada',         'not_connected'),
  ('jworld-shopee',  'shopee', 'Jworldbasket - Shopee',         'not_connected'),
  ('jworld-tiktok',  'tiktok', 'Jworldbasket - TikTok',         'not_connected')
on conflict (shop_code) do nothing;

-- ---------------------------------------------------------------------------
-- B. Website visibility view: published, Website-listed Live/Active/Unlisted.
-- The Storefront browse filter excludes Unlisted; direct SKU lookup still
-- requires Website membership. Zero stock flips to Request, not here.
-- ---------------------------------------------------------------------------
-- This is a deliberately narrow public projection. The base channel_listings
-- table is staff-only, so the view owner applies the explicit safe predicates
-- and exposes only SKU. Keep its barrier and grants paired with these filters.
create or replace view public.v_storefront_visible_skus
with (security_invoker = false, security_barrier = true)
as
select p.sku
from public.products p
join public.channel_listings l on l.sku = p.sku
  and l.channel_source = 'website'
  and l.status = 'Active'
where p.status in ('Live', 'Active', 'Unlisted')
  and p.published is true;

comment on view public.v_storefront_visible_skus is
  'IDEA-20260929-06: Narrow public projection of published, Website-listed Live/Active/Unlisted SKUs. Unlisted remains excluded from browse but direct lookup requires Website membership. The staff-only base channel_listings table remains private; this view carries no product details or stock.';

revoke all on table public.v_storefront_visible_skus from public, anon, authenticated;
grant select on table public.v_storefront_visible_skus to anon, authenticated;

-- ---------------------------------------------------------------------------
-- C. Lot weight: grams may differ per warehouse lot, so it lives on the
-- sub-SKU row, not the product. Null means unweighed.
-- ---------------------------------------------------------------------------
alter table public.product_batches
  add column if not exists net_weight_g integer;

do $weight$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_batches_net_weight_g_check') then
    alter table public.product_batches
      add constraint product_batches_net_weight_g_check
      check (net_weight_g is null or (net_weight_g > 0 and net_weight_g <= 100000));
  end if;
end
$weight$;

comment on column public.product_batches.net_weight_g is
  'IDEA-20260929-06: lot-level grams for warehouse slices that differ. Null means unweighed.';

-- ---------------------------------------------------------------------------
-- D. Oversell guard: the sum of shop offers for one SKU must never exceed
-- the master available slice. The rebalance RPC already grants within bounds;
-- this closes direct writes. Fail closed when no balance row exists.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_shop_allocation_within_master()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_available integer := 0;
  v_others integer := 0;
  v_lock_sku_one text;
  v_lock_sku_two text;
begin
  -- Serialize every writer for a SKU. Two shops may otherwise both read the
  -- same old aggregate, pass independently, and commit an oversell.
  if TG_OP = 'UPDATE' then
    v_lock_sku_one := least(old.sku, new.sku);
    v_lock_sku_two := greatest(old.sku, new.sku);
  else
    v_lock_sku_one := new.sku;
    v_lock_sku_two := null;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_lock_sku_one, 0));
  if v_lock_sku_two is not null and v_lock_sku_two <> v_lock_sku_one then
    perform pg_advisory_xact_lock(hashtextextended(v_lock_sku_two, 0));
  end if;

  if to_regclass('public.inventory_balances') is not null then
    select coalesce(available, 0) into v_available
    from public.inventory_balances
    where sku = new.sku and location_code = 'MANILA_MAIN';
    v_available := coalesce(v_available, 0);
  end if;

  select coalesce(sum(allocated_units), 0) into v_others
  from public.channel_shop_allocations
  where sku = new.sku
    and (TG_OP = 'INSERT' or id <> new.id);

  if v_others + coalesce(new.allocated_units, 0) > v_available then
    raise exception using errcode = '23514', message = 'K2_SHOP_OVERSELL_REFUSED';
  end if;
  return new;
end;
$$;

-- A trigger function callable by anyone is a surface, not a helper.
revoke all on function public.enforce_shop_allocation_within_master()
  from public, anon, authenticated;

drop trigger if exists channel_shop_allocations_oversell_guard
  on public.channel_shop_allocations;
create trigger channel_shop_allocations_oversell_guard
  before insert or update of sku, allocated_units on public.channel_shop_allocations
  for each row execute function public.enforce_shop_allocation_within_master();

-- The invariant must hold after stock corrections too. This AFTER trigger can
-- read the generated available value; it refuses reductions until shop offers
-- are lowered first. It uses the same per-SKU lock as allocation writes.
create or replace function public.enforce_master_stock_not_below_shop_offers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allocated integer := 0;
  v_lock_sku_one text;
  v_lock_sku_two text;
begin
  if TG_OP = 'DELETE' then
    if old.location_code = 'MANILA_MAIN' then
      perform pg_advisory_xact_lock(hashtextextended(old.sku, 0));
      select coalesce(sum(allocated_units), 0) into v_allocated
      from public.channel_shop_allocations where sku = old.sku;
      if v_allocated > 0 then
        raise exception using errcode = '23514', message = 'K2_MASTER_STOCK_BELOW_SHOP_OFFERS';
      end if;
    end if;
    return old;
  end if;

  if TG_OP = 'UPDATE' and old.location_code = 'MANILA_MAIN'
     and (old.sku is distinct from new.sku or new.location_code <> 'MANILA_MAIN') then
    v_lock_sku_one := least(old.sku, new.sku);
    v_lock_sku_two := greatest(old.sku, new.sku);
    perform pg_advisory_xact_lock(hashtextextended(v_lock_sku_one, 0));
    if v_lock_sku_two <> v_lock_sku_one then
      perform pg_advisory_xact_lock(hashtextextended(v_lock_sku_two, 0));
    end if;
    select coalesce(sum(allocated_units), 0) into v_allocated
    from public.channel_shop_allocations where sku = old.sku;
    if v_allocated > 0 then
      raise exception using errcode = '23514', message = 'K2_MASTER_STOCK_BELOW_SHOP_OFFERS';
    end if;
  end if;

  if new.location_code = 'MANILA_MAIN' then
    perform pg_advisory_xact_lock(hashtextextended(new.sku, 0));
    select coalesce(sum(allocated_units), 0) into v_allocated
    from public.channel_shop_allocations where sku = new.sku;
    if v_allocated > coalesce(new.available, 0) then
      raise exception using errcode = '23514', message = 'K2_MASTER_STOCK_BELOW_SHOP_OFFERS';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_master_stock_not_below_shop_offers()
  from public, anon, authenticated;

drop trigger if exists inventory_balances_shop_allocation_guard
  on public.inventory_balances;
create trigger inventory_balances_shop_allocation_guard
  after insert or update or delete on public.inventory_balances
  for each row execute function public.enforce_master_stock_not_below_shop_offers();

notify pgrst, 'reload schema';
commit;
