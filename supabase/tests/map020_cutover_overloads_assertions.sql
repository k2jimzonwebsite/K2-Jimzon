do $$
declare
  v_function regprocedure;
begin
  for v_function in
    select p.oid::regprocedure from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('submit_order_request', 'submit_order_request_v2',
        'submit_pasabuy_request', 'validate_coupon')
  loop
    if has_function_privilege('anon', v_function, 'execute')
       or has_function_privilege('authenticated', v_function, 'execute') then
      raise exception 'CUTOVER_OVERLOAD_STILL_PUBLIC: %', v_function;
    end if;
  end loop;
  if not has_function_privilege('anon', 'public.submit_guest_order_v1(bigint,uuid,text,text,text,text)', 'execute')
     or not has_function_privilege('anon', 'public.start_guest_conversation_v1(bigint,uuid,text,text,text,text)', 'execute') then
    raise exception 'CUTOVER_SIGNED_ROUTE_MISSING';
  end if;
end $$;
select 'MAP020_CUTOVER_OVERLOADS_PASSED';
