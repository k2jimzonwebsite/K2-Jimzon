-- MAP-017 phase 1: remove confirmed alternate public write paths.
-- Prepared from the live 11 August 2026 catalog. Apply only after MAP-016 key
-- disablement and after the matching preflight returns ready_to_apply = true.

begin;

do $preflight$
declare
  required_relation text;
begin
  foreach required_relation in array array[
    'brands', 'categories', 'warehouses', 'product_drafts', 'products_old',
    'channel_credentials', 'staff_allocations',
    'v_channel_catalog_readiness', 'v_expiring_batches',
    'v_product_stock_from_batches'
  ] loop
    if to_regclass(format('public.%I', required_relation)) is null then
      raise exception 'MAP-017 preflight: missing public.%', required_relation;
    end if;
  end loop;

  if to_regprocedure('public.is_staff()') is null then
    raise exception 'MAP-017 preflight: missing public.is_staff()';
  end if;

  if not exists (select 1 from storage.buckets where id = 'product-images') then
    raise exception 'MAP-017 preflight: missing product-images bucket';
  end if;
end
$preflight$;

revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.warehouses enable row level security;
alter table public.product_drafts enable row level security;
alter table public.products_old enable row level security;
alter table public.channel_credentials enable row level security;
alter table public.staff_allocations enable row level security;

revoke all on table public.brands from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.warehouses from anon, authenticated;
revoke all on table public.product_drafts from anon, authenticated;
revoke all on table public.products_old from anon, authenticated;
revoke all on table public.channel_credentials from anon, authenticated;
revoke all on table public.staff_allocations from anon, authenticated;

grant select on table public.brands, public.categories to anon, authenticated;
grant insert, update, delete on table public.brands, public.categories to authenticated;
grant select, insert, update, delete on table public.warehouses to authenticated;
grant select, insert, update, delete on table public.product_drafts to authenticated;

drop policy if exists "Admin Full Access" on public.brands;
drop policy if exists "Public Read Access" on public.brands;
drop policy if exists brands_public_read on public.brands;
drop policy if exists brands_staff_manage on public.brands;
create policy brands_public_read on public.brands
  for select to anon, authenticated using (true);
create policy brands_staff_manage on public.brands
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Admin Full Access" on public.categories;
drop policy if exists "Public Read Access" on public.categories;
drop policy if exists categories_public_read on public.categories;
drop policy if exists categories_staff_manage on public.categories;
create policy categories_public_read on public.categories
  for select to anon, authenticated using (true);
create policy categories_staff_manage on public.categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Admin Full Access" on public.warehouses;
drop policy if exists warehouses_staff_manage on public.warehouses;
create policy warehouses_staff_manage on public.warehouses
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Staff manage product_drafts" on public.product_drafts;
drop policy if exists product_drafts_staff_manage on public.product_drafts;
create policy product_drafts_staff_manage on public.product_drafts
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Admins manage products" on public.products_old;
drop policy if exists "Public read Live products" on public.products_old;

alter view public.v_channel_catalog_readiness set (security_invoker = true);
alter view public.v_expiring_batches set (security_invoker = true);
revoke all on table public.v_channel_catalog_readiness from anon, authenticated;
revoke all on table public.v_expiring_batches from anon, authenticated;
grant select on table public.v_channel_catalog_readiness to authenticated;
grant select on table public.v_expiring_batches to authenticated;

-- Keep the public stock projection readable without granting anonymous callers
-- access to private lot rows. A security-invoker view alone would require direct
-- SELECT on product_batches, so the exact two-column projection crosses a fixed-
-- search-path SECURITY DEFINER function and the browser receives only the view.
create or replace function public.get_public_product_stock()
returns table(sku text, stock_from_batches bigint)
language sql
stable
security definer
set search_path = ''
as $function$
  select b.sku::text, coalesce(sum(b.quantity_available), 0)::bigint
  from public.product_batches b
  join public.products p on p.sku::text = b.sku
  where p.status in ('Live', 'Active', 'Unlisted')
  group by b.sku
$function$;

revoke all on function public.get_public_product_stock() from public, anon, authenticated;
grant execute on function public.get_public_product_stock() to anon, authenticated;

create or replace view public.v_product_stock_from_batches
with (security_invoker = true)
as
select stock.sku, stock.stock_from_batches
from public.get_public_product_stock() stock;

revoke all on table public.v_product_stock_from_batches from public, anon, authenticated;
grant select on table public.v_product_stock_from_batches to anon, authenticated;

drop policy if exists "Anyone can upload" on storage.objects;
drop policy if exists "Anyone can update" on storage.objects;
drop policy if exists "Anyone can delete" on storage.objects;

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif'
    ]::text[]
where id = 'product-images';

do $realtime$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'products_old'
  ) then
    alter publication supabase_realtime drop table public.products_old;
  end if;
end
$realtime$;

notify pgrst, 'reload schema';

commit;
