-- ===========================================================================
-- MAP-017: scoped revocation of the extra PostgreSQL PUBLIC execute grant on
-- public.get_public_product_stock(). Retains explicit anon/authenticated access.
--
-- Production received a direct GRANT TO PUBLIC during the K-04 live fix on
-- 16 September 2026. The repository 20260916 migration grants only named
-- roles, so this correction closes the remaining gap without changing who
-- can read stock. Unapplied; activation belongs to the MAP-017 window with
-- backup, preflight, rollback and exact-host checks per the database runbook.
-- ===========================================================================

begin;

-- Preflight: the function and both required named grants must exist first.
-- Revoking PUBLIC while a named grant is missing would break the storefront.
do $$
begin
  if to_regprocedure('public.get_public_product_stock()') is null then
    raise exception 'PREFLIGHT_FAILED: public.get_public_product_stock() function not found';
  end if;
  if not has_function_privilege('anon', 'public.get_public_product_stock()', 'execute') then
    raise exception 'PREFLIGHT_FAILED: anon execute grant missing before PUBLIC revocation';
  end if;
  if not has_function_privilege('authenticated', 'public.get_public_product_stock()', 'execute') then
    raise exception 'PREFLIGHT_FAILED: authenticated execute grant missing before PUBLIC revocation';
  end if;
end $$;

-- The only privilege change in this correction.
revoke execute on function public.get_public_product_stock() from public;

-- Postflight: PUBLIC is gone, both named roles still execute.
do $$
begin
  if has_function_privilege('public', 'public.get_public_product_stock()', 'execute') then
    raise exception 'POSTFLIGHT_FAILED: PUBLIC execute grant remains on get_public_product_stock()';
  end if;
  if not has_function_privilege('anon', 'public.get_public_product_stock()', 'execute') then
    raise exception 'POSTFLIGHT_FAILED: anon execute grant lost by PUBLIC revocation';
  end if;
  if not has_function_privilege('authenticated', 'public.get_public_product_stock()', 'execute') then
    raise exception 'POSTFLIGHT_FAILED: authenticated execute grant lost by PUBLIC revocation';
  end if;
end $$;

commit;
