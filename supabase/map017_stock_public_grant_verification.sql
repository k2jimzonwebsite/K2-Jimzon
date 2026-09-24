-- Read-only MAP-017 stock ACL check. Keep historical hash-bound migration files unchanged.
select
  to_regprocedure('public.get_public_product_stock()') is not null
    and has_function_privilege('anon', 'public.get_public_product_stock()', 'execute')
    and has_function_privilege('authenticated', 'public.get_public_product_stock()', 'execute')
    and not exists (
      select 1
      from pg_proc p
      cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      where p.oid = to_regprocedure('public.get_public_product_stock()')
        and a.grantee = 0
        and a.privilege_type = 'EXECUTE'
    ) as stock_public_execute_absent;
