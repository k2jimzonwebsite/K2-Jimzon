-- ===========================================================================
-- Rollback for 20260925_map017_stock_public_grant_revocation.sql.
--
-- Emergency use only: restores the pre-correction PUBLIC execute grant after
-- a failed apply leaves the storefront unable to read stock through both
-- named roles. Reapplying the correction afterwards requires the full
-- MAP-017 backup, preflight and exact-host verification again. Never use
-- this rollback to widen access beyond the previously verified live state.
-- ===========================================================================

begin;

do $$
begin
  if to_regprocedure('public.get_public_product_stock()') is null then
    raise exception 'PREFLIGHT_FAILED: public.get_public_product_stock() function not found';
  end if;
end $$;

grant execute on function public.get_public_product_stock() to public;

commit;
