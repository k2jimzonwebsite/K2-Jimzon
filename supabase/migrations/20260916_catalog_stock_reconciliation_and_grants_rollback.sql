-- ===========================================================================
-- Rollback for 20260916_catalog_stock_reconciliation_and_grants.sql
-- ===========================================================================

begin;

-- 1. Revoke grants on stock function and view
revoke execute on function public.get_public_product_stock() from anon, authenticated;
revoke select on public.v_product_stock_from_batches from anon, authenticated;

-- 2. Restore RLS policies without 'Unlisted' status
drop policy if exists "products_public_live_read" on public.products;
create policy "products_public_live_read" on public.products
  for select
  to anon
  using ((status)::text = any (array['Live'::text, 'Active'::text]));

drop policy if exists "products_authenticated_read" on public.products;
create policy "products_authenticated_read" on public.products
  for select
  to authenticated
  using (((status)::text = any (array['Live'::text, 'Active'::text])) or is_staff());

-- 3. Reset product stock to zero and unpublish
select set_config('k2.allow_stock_write', 'on', true);

update public.products
set 
  stock_available = 0,
  total_stock = 0,
  published = false,
  updated_at = now()
where sku in (select distinct sku from public.product_batches);

commit;
