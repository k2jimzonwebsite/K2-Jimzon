-- Coordinated cutover only: apply after the storefront BFF endpoints and client
-- are deployed together and verified. This removes direct browser execution.
begin;

revoke execute on function public.submit_order_request(text,text,text,text,text,text,jsonb,text)
  from public, anon, authenticated;
revoke execute on function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text)
  from public, anon, authenticated;
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
