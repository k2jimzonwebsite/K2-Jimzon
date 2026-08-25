\set ON_ERROR_STOP on

do $$
declare v_table record;
begin
  if to_regprocedure('public.read_admin_procurement_v1()') is null
     or to_regprocedure('public.execute_admin_supplier_command_v1(text,bigint,uuid,uuid,text,text)') is null then
    raise exception 'K2_PROCUREMENT_FUNCTION_MISSING';
  end if;
  select c.relrowsecurity,c.relforcerowsecurity into v_table
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='k2_private' and c.relname='supplier_events';
  if not found or not v_table.relrowsecurity or not v_table.relforcerowsecurity then
    raise exception 'K2_SUPPLIER_EVENT_BOUNDARY_INVALID';
  end if;
  if has_table_privilege('authenticated','public.suppliers','insert')
     or has_table_privilege('authenticated','public.suppliers','update')
     or has_table_privilege('authenticated','public.purchase_orders','insert')
     or has_table_privilege('authenticated','public.po_lines','insert')
     or has_table_privilege('anon','k2_private.supplier_events','select')
     or has_function_privilege('anon','public.read_admin_procurement_v1()','execute')
     or has_function_privilege('anon','public.execute_admin_supplier_command_v1(text,bigint,uuid,uuid,text,text)','execute')
     or not has_function_privilege('authenticated','public.read_admin_procurement_v1()','execute') then
    raise exception 'K2_PROCUREMENT_PRIVILEGE_BOUNDARY_INVALID';
  end if;
end $$;

select 'MAP020_PROCUREMENT_POSTFLIGHT_PASSED';
