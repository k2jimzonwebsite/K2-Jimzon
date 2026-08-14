-- MAP-017 phase-1 postflight. Raises on any failed invariant.
do $postflight$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'brands', 'categories', 'warehouses', 'product_drafts', 'products_old',
    'channel_credentials', 'staff_allocations'
  ] loop
    if has_table_privilege('anon', format('public.%I', relation_name), 'insert')
      or has_table_privilege('anon', format('public.%I', relation_name), 'update')
      or has_table_privilege('anon', format('public.%I', relation_name), 'delete') then
      raise exception 'MAP-017 postflight: anon DML remains on public.%', relation_name;
    end if;
  end loop;

  if has_table_privilege('anon', 'public.products_old', 'select')
    or has_table_privilege('authenticated', 'public.products_old', 'select') then
    raise exception 'MAP-017 postflight: legacy products_old remains exposed';
  end if;

  if has_table_privilege('anon', 'public.v_channel_catalog_readiness', 'select')
    or has_table_privilege('anon', 'public.v_expiring_batches', 'select') then
    raise exception 'MAP-017 postflight: operational view remains anon-readable';
  end if;

  if not has_table_privilege('anon', 'public.brands', 'select')
    or not has_table_privilege('anon', 'public.categories', 'select') then
    raise exception 'MAP-017 postflight: intended public catalog lookup read is missing';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('brands', 'categories', 'warehouses', 'product_drafts', 'products_old')
      and (roles @> array['public']::name[])
      and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'MAP-017 postflight: public write policy remains';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_drafts'
      and policyname = 'product_drafts_staff_manage'
      and cmd = 'ALL' and qual like '%is_staff%'
      and with_check like '%is_staff%'
  ) then
    raise exception 'MAP-017 postflight: product_drafts is not staff-scoped';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in ('Anyone can upload', 'Anyone can update', 'Anyone can delete')
  ) then
    raise exception 'MAP-017 postflight: legacy public Storage write policy remains';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'product-images'
      and file_size_limit = 10485760
      and allowed_mime_types @> array[
        'image/jpeg', 'image/png', 'image/webp', 'image/avif'
      ]::text[]
  ) then
    raise exception 'MAP-017 postflight: product-images limits are not enforced';
  end if;

  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'products_old'
  ) then
    raise exception 'MAP-017 postflight: products_old remains in Realtime';
  end if;
end
$postflight$;

select 'MAP-017 public write boundary postflight passed' as result;
