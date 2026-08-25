\set ON_ERROR_STOP on

-- All behavioral fixtures run in one transaction and leave no test rows.
begin;

-- K2_ASSERTION_GROUP: explicit_privilege_inventory
do $$
begin
  if has_table_privilege('anon', 'public.brands', 'insert')
    or has_table_privilege('anon', 'public.categories', 'update')
    or has_table_privilege('anon', 'public.warehouses', 'delete')
    or has_table_privilege('anon', 'public.product_drafts', 'insert')
    or has_table_privilege('anon', 'public.products_old', 'select')
    or has_table_privilege('authenticated', 'public.products_old', 'select')
    or has_table_privilege('anon', 'public.channel_credentials', 'select')
    or has_table_privilege('anon', 'public.staff_allocations', 'select') then
    raise exception 'authorization: anonymous, authenticated, or legacy privilege remains';
  end if;
  if has_table_privilege('anon', 'public.product_batches', 'select') then
    raise exception 'authorization: anonymous caller can read private lot rows';
  end if;
  if not has_table_privilege('anon', 'public.v_product_stock_from_batches', 'select')
    or not has_function_privilege('anon', 'public.get_public_product_stock()', 'execute') then
    raise exception 'authorization: public stock projection is unavailable';
  end if;
end $$;

-- K2_ASSERTION_GROUP: anonymous_write_and_legacy_read_denial
set role anon;
do $$
begin
  begin
    insert into public.brands(name) values ('anon-write-must-fail');
    raise exception 'authorization: anonymous insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.products_old;
    raise exception 'authorization: anonymous legacy read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- K2_ASSERTION_GROUP: minimal_public_stock_projection
set role anon;
do $$
begin
  if (select count(*) from public.v_product_stock_from_batches) <> 2 then
    raise exception 'authorization: stock projection exposed a non-public product or lost a public product';
  end if;
  if (select stock_from_batches from public.v_product_stock_from_batches where sku = 'LIVE-001') <> 7 then
    raise exception 'authorization: stock projection returned the wrong aggregate';
  end if;
  if exists (select 1 from public.v_product_stock_from_batches where sku = 'DRAFT-001') then
    raise exception 'authorization: stock projection exposed Draft inventory';
  end if;
end $$;
reset role;

-- K2_ASSERTION_GROUP: customer_write_denial
select set_config('request.jwt.claims', '{"app_role":"Customer"}', false);
set role authenticated;
do $$
begin
  begin
    insert into public.brands(name) values ('customer-write-must-fail');
    raise exception 'authorization: customer insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- K2_ASSERTION_GROUP: unsupported_staff_role_denial
set role authenticated;
do $$
declare
  candidate_role text;
begin
  foreach candidate_role in array array[
    'Support', 'Warehouse', 'Receiving', 'Catalog', 'Finance', 'Operations'
  ] loop
    perform set_config(
      'request.jwt.claims',
      jsonb_build_object('app_role', candidate_role)::text,
      false
    );
    begin
      insert into public.brands(name) values ('unsupported-role-write-must-fail');
      raise exception 'authorization: unsupported role % unexpectedly received staff access', candidate_role;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;
reset role;

-- K2_ASSERTION_GROUP: staff_and_admin_allowance
select set_config('request.jwt.claims', '{"app_role":"Staff"}', false);
set role authenticated;
insert into public.brands(name) values ('staff-brand');
insert into public.categories(name) values ('staff-category');
insert into public.warehouses(name) values ('staff-warehouse');
insert into public.product_drafts(title) values ('staff-draft');
reset role;
select set_config('request.jwt.claims', '{"app_role":"Admin"}', false);
set role authenticated;
insert into public.brands(name) values ('admin-brand');
reset role;

do $$
begin
  if (select count(*) from public.brands where name = 'staff-brand') <> 1
    or (select count(*) from public.brands where name = 'admin-brand') <> 1
    or (select count(*) from public.categories where name = 'staff-category') <> 1
    or (select count(*) from public.warehouses where name = 'staff-warehouse') <> 1
    or (select count(*) from public.product_drafts where title = 'staff-draft') <> 1 then
    raise exception 'authorization: staff or Admin scoped writes did not persist in the test transaction';
  end if;
end $$;

-- K2_ASSERTION_GROUP: legacy_table_denied_to_every_browser_role
set role authenticated;
do $$
declare
  candidate_role text;
begin
  foreach candidate_role in array array['Customer', 'Staff', 'Admin'] loop
    perform set_config(
      'request.jwt.claims',
      jsonb_build_object('app_role', candidate_role)::text,
      false
    );
    begin
      perform count(*) from public.products_old;
      raise exception 'authorization: role % unexpectedly read products_old', candidate_role;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;
reset role;

-- K2_ASSERTION_GROUP: operational_view_rls
select set_config('request.jwt.claims', '{"app_role":"Customer"}', false);
set role authenticated;
do $$
begin
  if (select count(*) from public.v_expiring_batches) <> 0 then
    raise exception 'authorization: customer read private lot rows through operational view';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims', '{"app_role":"Staff"}', false);
set role authenticated;
do $$
begin
  if (select count(*) from public.v_expiring_batches) <> 4 then
    raise exception 'authorization: staff operational view lost authorized lot rows';
  end if;
end $$;
reset role;

-- K2_ASSERTION_GROUP: storage_write_denial
set role anon;
do $$
begin
  begin
    insert into storage.objects(bucket_id, name) values ('product-images', 'anon-must-fail.jpg');
    raise exception 'authorization: anonymous Storage insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims', '{"app_role":"Admin"}', false);
set role authenticated;
do $$
begin
  begin
    insert into storage.objects(bucket_id, name) values ('product-images', 'browser-admin-must-fail.jpg');
    raise exception 'authorization: browser Admin Storage insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- K2_ASSERTION_GROUP: storage_bucket_configuration
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in ('Anyone can upload', 'Anyone can update', 'Anyone can delete')
  ) then
    raise exception 'authorization: public Storage policy remains';
  end if;
  if not exists (
    select 1 from storage.buckets
    where id = 'product-images'
      and file_size_limit = 10485760
      and allowed_mime_types @> array[
        'image/jpeg', 'image/png', 'image/webp', 'image/avif'
      ]::text[]
  ) then
    raise exception 'authorization: product-images bucket limits are not enforced';
  end if;
end $$;

-- K2_ASSERTION_GROUP: realtime_legacy_exclusion
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'products_old'
  ) then
    raise exception 'authorization: products_old remains in Realtime';
  end if;
end $$;

-- K2_ASSERTION_GROUP: future_object_default_denial
do $$
begin
  if exists (
    select 1
    from pg_default_acl d
    join pg_roles owner_role on owner_role.oid = d.defaclrole
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a
    left join pg_roles grantee_role on grantee_role.oid = a.grantee
    where n.nspname = 'public'
      and owner_role.rolname = 'postgres'
      and coalesce(grantee_role.rolname, 'public') in ('public', 'anon', 'authenticated')
      and (
        (d.defaclobjtype = 'f' and a.privilege_type = 'EXECUTE')
        or d.defaclobjtype in ('r', 'S')
      )
  ) then
    raise exception 'authorization: unsafe repository-owned defaults remain';
  end if;

  create table public.map017_future_default_probe(id integer);
  if has_table_privilege('anon', 'public.map017_future_default_probe', 'select')
    or has_table_privilege('authenticated', 'public.map017_future_default_probe', 'insert') then
    raise exception 'authorization: future public object inherited browser privileges';
  end if;
end $$;

select 'MAP017_AUTHORIZATION_ASSERTIONS_PASSED' as result;
rollback;
