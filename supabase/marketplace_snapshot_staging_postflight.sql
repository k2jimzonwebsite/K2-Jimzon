do $postflight$
declare v_table text;
begin
  foreach v_table in array array[
    'marketplace_snapshot_imports','marketplace_snapshot_rows',
    'marketplace_product_aliases','marketplace_listing_observations',
    'marketplace_snapshot_events','owner_close_sessions',
    'owner_close_session_shops','marketplace_coverage_overrides',
    'marketplace_coverage_override_events','owner_close_order_imports',
    'owner_close_order_facts','owner_close_fee_estimates','owner_close_stock_reviews',
    'owner_close_pasabuy_reviews','owner_close_bookkeeping_handoffs',
    'owner_close_session_events'
  ] loop
    if to_regclass('k2_private.'||v_table) is null then
      raise exception 'missing private table: %',v_table;
    end if;
    if not exists(
      select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='k2_private' and c.relname=v_table
        and c.relrowsecurity and c.relforcerowsecurity
    ) then
      raise exception 'private RLS/force-RLS missing: %',v_table;
    end if;
  end loop;
  if to_regprocedure('public.execute_admin_marketplace_snapshot_v1(text,bigint,uuid,uuid,text,text)') is null
     or to_regprocedure('public.read_admin_marketplace_snapshot_status_v1(uuid)') is null
     or to_regprocedure('public.read_admin_marketplace_snapshot_row_v1(uuid,uuid)') is null
     or to_regprocedure('public.read_admin_owner_close_session_v1(uuid)') is null
     or to_regprocedure('public.read_admin_owner_close_order_import_v1(uuid)') is null
     or to_regprocedure('public.read_admin_owner_close_fee_input_v1(uuid)') is null
     or to_regprocedure('public.read_admin_owner_close_stock_input_v1(uuid)') is null
     or to_regprocedure('public.read_admin_owner_close_pasabuy_input_v1(uuid)') is null
     or to_regprocedure('public.read_admin_owner_close_bookkeeping_handoff_v1(uuid)') is null
     or to_regprocedure('public.read_admin_marketplace_shop_options_v1()') is null
     or to_regprocedure('public.read_admin_marketplace_coverage_input_v1(uuid)') is null then
    raise exception 'marketplace snapshot functions are incomplete';
  end if;
  if has_table_privilege('anon','k2_private.marketplace_snapshot_imports','select')
     or has_table_privilege('authenticated','k2_private.marketplace_snapshot_rows','insert') then
    raise exception 'private staging table privilege leak';
  end if;
end
$postflight$;
select 'MARKETPLACE_SNAPSHOT_POSTFLIGHT_OK';
