-- Coordinated cutover only: apply after the storefront BFF endpoints and client
-- are deployed together and verified. This removes direct browser execution.
begin;

do $$
declare v_function regprocedure;
begin
  for v_function in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('submit_order_request','submit_order_request_v2','submit_pasabuy_request','validate_coupon')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', v_function);
  end loop;
end $$;

grant execute on function public.submit_guest_order_v1(bigint,uuid,text,text,text,text) to anon;
grant execute on function public.submit_guest_pasabuy_v1(bigint,uuid,text,text,text,text) to anon;
grant execute on function public.preview_guest_coupon_v1(bigint,uuid,text,text,text) to anon;
grant execute on function public.list_guest_conversations_v1(bigint,uuid,text,text,text,text) to anon;
grant execute on function public.append_guest_message_v1(bigint,uuid,text,text,text,text) to anon;

notify pgrst, 'reload schema';
commit;
