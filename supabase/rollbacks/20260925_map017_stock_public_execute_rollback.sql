-- MAP-017 recovery only: restore the previously observed PUBLIC execute grant.
-- Run only when reversing this exact scoped correction.
begin;

do $$
begin
  if to_regprocedure('public.get_public_product_stock()') is null
    or not has_function_privilege('anon', 'public.get_public_product_stock()', 'execute')
    or not has_function_privilege('authenticated', 'public.get_public_product_stock()', 'execute') then
    raise exception 'MAP-017 stock grant rollback preflight: function or caller grant is absent';
  end if;
  if exists (
    select 1 from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = 'public.get_public_product_stock()'::regprocedure
      and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'MAP-017 stock grant rollback preflight: PUBLIC already has execute';
  end if;
end $$;

grant execute on function public.get_public_product_stock() to public;

do $$
begin
  if not exists (
    select 1 from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = 'public.get_public_product_stock()'::regprocedure
      and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'MAP-017 stock grant rollback postflight: PUBLIC execute was not restored';
  end if;
end $$;

commit;
