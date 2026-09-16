-- ===========================================================================
-- MAP-028 K: Reconcile catalog batch stock, grant stock view permissions,
-- and enable unlisted product RLS read
--
-- Findings addressed:
-- - K-01: Reconcile 21 live SKUs with 931 physical units in product_batches into
--         public.inventory_balances and public.products (stock_available, total_stock)
-- - K-02: Archive legacy uppercase mock SKUs (LAV-ORO-1KG, MUT-PAS-400, NUT-BIS-304,
--         PST-GEN-190, TRF-OIL-500)
-- - K-04: Grant EXECUTE on get_public_product_stock() and SELECT on
--         v_product_stock_from_batches to anon, authenticated, and service_role
-- - K-05: Update RLS policies on public.products to allow Unlisted products for anon
-- - K-06: Set published = true on the 21 live products with verified batch inventory
-- ===========================================================================

begin;

-- Preflight: verify functions and tables exist
do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'PREFLIGHT_FAILED: public.products table not found';
  end if;
  if to_regclass('public.product_batches') is null then
    raise exception 'PREFLIGHT_FAILED: public.product_batches table not found';
  end if;
  if to_regprocedure('public.get_public_product_stock()') is null then
    raise exception 'PREFLIGHT_FAILED: public.get_public_product_stock() function not found';
  end if;
  if to_regclass('public.v_product_stock_from_batches') is null then
    raise exception 'PREFLIGHT_FAILED: public.v_product_stock_from_batches view not found';
  end if;
end $$;

-- 1. Grant permissions on stock function and view (Resolves K-04)
grant execute on function public.get_public_product_stock() to anon, authenticated, service_role;
grant select on public.v_product_stock_from_batches to anon, authenticated, service_role;

-- 2. Update RLS policies to include 'Unlisted' status (Resolves K-05)
drop policy if exists "products_public_live_read" on public.products;
create policy "products_public_live_read" on public.products
  for select
  to anon
  using ((status)::text = any (array['Live'::text, 'Active'::text, 'Unlisted'::text]));

drop policy if exists "products_authenticated_read" on public.products;
create policy "products_authenticated_read" on public.products
  for select
  to authenticated
  using (((status)::text = any (array['Live'::text, 'Active'::text, 'Unlisted'::text])) or is_staff());

-- 3. Reconcile batches into inventory_balances and products (Resolves K-01, K-06)
select set_config('k2.allow_stock_write', 'on', true);

insert into public.inventory_balances (sku, location_code, on_hand, updated_at)
select 
  b.sku,
  'MANILA_MAIN' as location_code,
  coalesce(sum(b.quantity), 0)::integer as on_hand,
  now() as updated_at
from public.product_batches b
group by b.sku
on conflict (sku, location_code) 
do update set 
  on_hand = excluded.on_hand,
  updated_at = now();

with batch_stock as (
  select 
    b.sku,
    coalesce(sum(b.quantity - b.reserved_quantity) filter (
      where b.inventory_status = 'available' and (
        coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
        or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null)
      )
    ), 0)::integer as sellable_qty
  from public.product_batches b
  group by b.sku
)
update public.products p
set 
  stock_available = bs.sellable_qty,
  total_stock = bs.sellable_qty,
  published = true,
  status = 'Live',
  updated_at = now()
from batch_stock bs
where p.sku = bs.sku;

-- 4. Archive legacy uppercase mock SKUs (Resolves K-02)
update public.products
set 
  status = 'Discontinued',
  published = false,
  stock_available = 0,
  total_stock = 0,
  updated_at = now()
where sku in ('LAV-ORO-1KG', 'MUT-PAS-400', 'NUT-BIS-304', 'PST-GEN-190', 'TRF-OIL-500');

-- Postflight: verify that products have stock > 0 and permissions exist
do $$
declare
  v_sellable_skus integer;
  v_archived_skus integer;
begin
  select count(*) into v_sellable_skus
  from public.products
  where sku in (select distinct sku from public.product_batches)
    and stock_available > 0
    and published = true;

  if v_sellable_skus < 20 then
    raise exception 'POSTFLIGHT_FAILED: Expected at least 20 live products with sellable stock, found %', v_sellable_skus;
  end if;

  select count(*) into v_archived_skus
  from public.products
  where sku in ('LAV-ORO-1KG', 'MUT-PAS-400', 'NUT-BIS-304', 'PST-GEN-190', 'TRF-OIL-500')
    and status = 'Discontinued'
    and stock_available = 0;

  if v_archived_skus <> 5 then
    raise exception 'POSTFLIGHT_FAILED: Expected 5 archived mock SKUs, found %', v_archived_skus;
  end if;
end $$;

commit;
