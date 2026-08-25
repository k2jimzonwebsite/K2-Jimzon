\set ON_ERROR_STOP on

do $$
begin
  if not exists (
    select 1
    from pg_default_acl d
    join pg_roles owner_role on owner_role.oid = d.defaclrole
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a
    left join pg_roles grantee_role on grantee_role.oid = a.grantee
    where n.nspname = 'public'
      and owner_role.rolname = 'supabase_admin'
      and coalesce(grantee_role.rolname, 'public') = 'anon'
      and d.defaclobjtype = 'r'
      and a.privilege_type = 'INSERT'
  ) then
    raise exception 'baseline: expected supabase_admin anonymous table default';
  end if;
  if not has_table_privilege('anon', 'public.brands', 'insert') then
    raise exception 'baseline: expected anonymous brands insert grant';
  end if;
  if not has_table_privilege('anon', 'public.products_old', 'select') then
    raise exception 'baseline: expected anonymous products_old read grant';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products_old'
  ) then
    raise exception 'baseline: expected products_old Realtime membership';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Anyone can upload'
  ) then
    raise exception 'baseline: expected public Storage upload policy';
  end if;
  if not exists (
    select 1 from storage.buckets
    where id = 'product-images' and file_size_limit is null and allowed_mime_types is null
  ) then
    raise exception 'baseline: expected unrestricted Storage bucket';
  end if;
end $$;

select 'MAP017_BASELINE_RESTORED' as result;
