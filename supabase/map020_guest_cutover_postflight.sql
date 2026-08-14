do $$
declare v_function regprocedure;
begin
  for v_function in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('submit_order_request','submit_order_request_v2','submit_pasabuy_request','validate_coupon')
  loop
    if has_function_privilege('anon',v_function,'EXECUTE')
       or has_function_privilege('authenticated',v_function,'EXECUTE') then
      raise exception 'MAP020_CUTOVER: legacy direct command remains executable: %',v_function;
    end if;
  end loop;
end $$;
