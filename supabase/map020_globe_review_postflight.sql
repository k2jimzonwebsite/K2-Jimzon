\set ON_ERROR_STOP on

do $$
declare v_table record;
begin
  if to_regprocedure('public.read_admin_globe_cms_v1()') is null
     or to_regprocedure('public.execute_admin_globe_review_command_v1(text,bigint,uuid,uuid,text,text)') is null then
    raise exception 'K2_GLOBE_REVIEW_FUNCTION_MISSING';
  end if;
  select c.relrowsecurity,c.relforcerowsecurity into v_table
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='k2_private' and c.relname='globe_review_events';
  if not found or not v_table.relrowsecurity or not v_table.relforcerowsecurity then
    raise exception 'K2_GLOBE_REVIEW_EVENT_BOUNDARY_INVALID';
  end if;
  if has_table_privilege('anon','k2_private.globe_review_events','select')
     or has_table_privilege('authenticated','public.reviews','insert')
     or has_table_privilege('authenticated','public.globe_products','update')
     or has_column_privilege('anon','public.reviews','source_reference','select')
     or not has_column_privilege('anon','public.reviews','text','select')
     or has_function_privilege('anon','public.read_admin_globe_cms_v1()','execute')
     or has_function_privilege('anon','public.execute_admin_globe_review_command_v1(text,bigint,uuid,uuid,text,text)','execute')
     or not has_function_privilege('authenticated','public.read_admin_globe_cms_v1()','execute') then
    raise exception 'K2_GLOBE_REVIEW_PRIVILEGE_BOUNDARY_INVALID';
  end if;
end $$;

select 'MAP020_GLOBE_REVIEW_POSTFLIGHT_PASSED';
