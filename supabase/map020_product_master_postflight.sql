\set ON_ERROR_STOP on
do $$
begin
  if to_regprocedure('public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)') is null
     or to_regclass('k2_private.product_master_events') is null then
    raise exception 'PRODUCT_MASTER_BOUNDARY_MISSING';
  end if;
  if has_function_privilege('authenticated','public.delete_products_with_pin_v2(text[],text,text,uuid)','EXECUTE') then
    raise exception 'LEGACY_PRODUCT_DELETE_STILL_BROWSER_EXECUTABLE';
  end if;
  if not has_function_privilege('authenticated','public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)','EXECUTE') then
    raise exception 'PRODUCT_MASTER_COMMAND_NOT_EXECUTABLE';
  end if;
end $$;
