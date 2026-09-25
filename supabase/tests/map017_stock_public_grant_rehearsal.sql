\set ON_ERROR_STOP on

-- Recreate the named live ACL finding on the isolated phase-one fixture.
grant execute on function public.get_public_product_stock() to public, service_role;

do $$
begin
  if not has_function_privilege('supabase_admin', 'public.get_public_product_stock()', 'execute') then
    raise exception 'stock grant fixture: PUBLIC execute is absent';
  end if;
end $$;

\ir ../migrations/20260925_map017_stock_public_execute.sql

do $$
begin
  if exists (
    select 1 from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = 'public.get_public_product_stock()'::regprocedure
      and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
  ) or has_function_privilege('supabase_admin', 'public.get_public_product_stock()', 'execute') then
    raise exception 'stock grant correction: PUBLIC execute remains';
  end if;
  if not has_function_privilege('anon', 'public.get_public_product_stock()', 'execute')
    or not has_function_privilege('authenticated', 'public.get_public_product_stock()', 'execute')
    or not has_function_privilege('service_role', 'public.get_public_product_stock()', 'execute') then
    raise exception 'stock grant correction: an explicit role lost execute';
  end if;
end $$;

set role anon;
do $$
begin
  if (select count(*) from public.v_product_stock_from_batches) <> 2
    or (select stock_from_batches from public.v_product_stock_from_batches where sku = 'LIVE-001') <> 7 then
    raise exception 'stock grant correction: anonymous catalog projection changed';
  end if;
end $$;
reset role;
set role authenticated;
do $$
begin
  if (select count(*) from public.v_product_stock_from_batches) <> 2 then
    raise exception 'stock grant correction: authenticated catalog projection changed';
  end if;
end $$;
reset role;

\ir ../rollbacks/20260925_map017_stock_public_execute_rollback.sql

do $$
begin
  if not has_function_privilege('supabase_admin', 'public.get_public_product_stock()', 'execute')
    or not has_function_privilege('anon', 'public.get_public_product_stock()', 'execute')
    or not has_function_privilege('authenticated', 'public.get_public_product_stock()', 'execute')
    or not has_function_privilege('service_role', 'public.get_public_product_stock()', 'execute') then
    raise exception 'stock grant rollback: baseline execute was not restored';
  end if;
end $$;

-- Leave the portable fixture in its original hardened phase-one state.
revoke execute on function public.get_public_product_stock() from public, service_role;
select 'MAP017_STOCK_PUBLIC_GRANT_REHEARSAL_PASSED' as result;
