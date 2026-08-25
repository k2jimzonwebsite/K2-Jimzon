\set ON_ERROR_STOP on

do $$
declare
  v_table record;
begin
  if to_regprocedure('public.execute_admin_product_media_command_v1(text,bigint,uuid,uuid,text,text)') is null
     or to_regprocedure('public.execute_admin_product_media_assignment_v1(text,bigint,uuid,uuid,text,text)') is null
     or to_regprocedure('public.complete_admin_product_media_cleanup_v1(text,bigint,uuid,uuid,text,text)') is null
     or to_regprocedure('public.read_admin_product_media_orphans_v1(integer)') is null
     or to_regprocedure('public.prepare_admin_product_media_orphan_cleanup_v1(text,bigint,uuid,uuid,text,text)') is null
     or to_regprocedure('public.complete_admin_product_media_orphan_cleanup_v1(text,bigint,uuid,uuid,text,text)') is null
     or to_regprocedure('k2_private.validate_product_media_item(uuid,jsonb,text[])') is null then
    raise exception 'K2_PRODUCT_MEDIA_FUNCTION_MISSING';
  end if;
  select c.relrowsecurity,c.relforcerowsecurity into v_table
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='k2_private' and c.relname='product_media_events';
  if not found or not v_table.relrowsecurity or not v_table.relforcerowsecurity then
    raise exception 'K2_PRODUCT_MEDIA_EVENT_BOUNDARY_INVALID';
  end if;
  select c.relrowsecurity,c.relforcerowsecurity into v_table
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='k2_private' and c.relname='product_media_orphan_events';
  if not found or not v_table.relrowsecurity or not v_table.relforcerowsecurity then
    raise exception 'K2_PRODUCT_MEDIA_ORPHAN_EVENT_BOUNDARY_INVALID';
  end if;
  if has_table_privilege('anon','k2_private.product_media_events','select')
     or has_table_privilege('authenticated','k2_private.product_media_events','select')
     or has_function_privilege('anon','public.execute_admin_product_media_assignment_v1(text,bigint,uuid,uuid,text,text)','execute')
     or has_function_privilege('anon','public.complete_admin_product_media_cleanup_v1(text,bigint,uuid,uuid,text,text)','execute')
     or has_function_privilege('anon','public.read_admin_product_media_orphans_v1(integer)','execute')
     or has_table_privilege('authenticated','k2_private.product_media_orphan_events','select')
     or not has_function_privilege('authenticated','public.execute_admin_product_media_assignment_v1(text,bigint,uuid,uuid,text,text)','execute') then
    raise exception 'K2_PRODUCT_MEDIA_PRIVILEGE_BOUNDARY_INVALID';
  end if;
end $$;

select 'MAP019_PRODUCT_MEDIA_POSTFLIGHT_PASSED';
