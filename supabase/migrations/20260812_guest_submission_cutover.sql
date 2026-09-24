-- Coordinated cutover only: apply after the storefront BFF endpoints and client
-- are deployed together and verified. This removes direct browser execution.
begin;

revoke execute on function public.submit_order_request(text,text,text,text,text,text,jsonb,text)
  from public, anon, authenticated;
-- The live order function gained trailing defaulted arguments after this cutover
-- was drafted. Refuse an unknown overload rather than leave a direct entry open.
do $revoke_order_overloads$
declare
  v_nine regprocedure := to_regprocedure('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text)');
  v_eleven regprocedure := to_regprocedure('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text)');
begin
  if v_nine is null and v_eleven is null then
    raise exception 'MAP020_CUTOVER: order command is missing';
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'submit_order_request_v2'
      and p.oid is distinct from v_nine::oid
      and p.oid is distinct from v_eleven::oid
  ) then
    raise exception 'MAP020_CUTOVER: unexpected order command overload';
  end if;
  if v_nine is not null then
    execute 'revoke execute on function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text) from public, anon, authenticated';
  end if;
  if v_eleven is not null then
    execute 'revoke execute on function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text) from public, anon, authenticated';
  end if;
end $revoke_order_overloads$;
revoke execute on function public.submit_pasabuy_request(text,text,text,text,text,integer,numeric,text,boolean,text)
  from public, anon, authenticated;
revoke execute on function public.validate_coupon(text,numeric)
  from public, anon, authenticated;

grant execute on function public.submit_guest_order_v1(bigint,uuid,text,text,text,text) to anon;
grant execute on function public.submit_guest_pasabuy_v1(bigint,uuid,text,text,text,text) to anon;
grant execute on function public.preview_guest_coupon_v1(bigint,uuid,text,text,text) to anon;
grant execute on function public.start_guest_conversation_v1(bigint,uuid,text,text,text,text) to anon;
grant execute on function public.list_guest_conversations_v1(bigint,uuid,text,text,text,text) to anon;
grant execute on function public.append_guest_message_v1(bigint,uuid,text,text,text,text) to anon;

notify pgrst, 'reload schema';
commit;
