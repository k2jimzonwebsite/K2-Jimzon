-- MAP-017 prepared correction: remove only the extra PUBLIC execute grant.
-- Apply only after the production backup, exact ACL preflight, and owner gate.
begin;

do $$
begin
  if to_regprocedure('public.get_public_product_stock()') is null then
    raise exception 'MAP-017 stock grant preflight: function is absent';
  end if;
  if not exists (
    select 1 from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = 'public.get_public_product_stock()'::regprocedure
      and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'MAP-017 stock grant preflight: PUBLIC execute is already absent';
  end if;
  if not exists (
    select 1 from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    join pg_roles role on role.oid = acl.grantee
    where p.oid = 'public.get_public_product_stock()'::regprocedure
      and role.rolname = 'anon' and acl.privilege_type = 'EXECUTE'
  ) or not exists (
    select 1 from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    join pg_roles role on role.oid = acl.grantee
    where p.oid = 'public.get_public_product_stock()'::regprocedure
      and role.rolname = 'authenticated' and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'MAP-017 stock grant preflight: required explicit caller grant is absent';
  end if;
end $$;

revoke execute on function public.get_public_product_stock() from public;

do $$
begin
  if exists (
    select 1 from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = 'public.get_public_product_stock()'::regprocedure
      and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
  ) or not has_function_privilege('anon', 'public.get_public_product_stock()', 'execute')
    or not has_function_privilege('authenticated', 'public.get_public_product_stock()', 'execute')
    or not has_table_privilege('anon', 'public.v_product_stock_from_batches', 'select') then
    raise exception 'MAP-017 stock grant postflight: public boundary is incorrect';
  end if;
end $$;

commit;
