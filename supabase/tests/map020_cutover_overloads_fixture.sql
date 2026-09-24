-- Add the other direct commands and signed replacements to the current
-- eleven-argument order fixture before testing the prepared cutover.
create function public.submit_order_request(text,text,text,text,text,text,jsonb,text)
returns boolean language sql as $$ select true $$;
create function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text)
returns public.order_requests language sql as $$ select null::public.order_requests $$;
create function public.validate_coupon(text,numeric)
returns boolean language sql as $$ select true $$;
create function public.submit_guest_order_v1(bigint,uuid,text,text,text,text)
returns boolean language sql as $$ select true $$;
create function public.submit_guest_pasabuy_v1(bigint,uuid,text,text,text,text)
returns boolean language sql as $$ select true $$;
create function public.preview_guest_coupon_v1(bigint,uuid,text,text,text)
returns boolean language sql as $$ select true $$;
create function public.list_guest_conversations_v1(bigint,uuid,text,text,text,text)
returns boolean language sql as $$ select true $$;

grant execute on function public.submit_order_request(text,text,text,text,text,text,jsonb,text) to anon;
grant execute on function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text) to anon;
grant execute on function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text) to anon;
grant execute on function public.submit_pasabuy_request(text,text,text,text,text,integer,numeric,text,boolean,text) to anon;
grant execute on function public.validate_coupon(text,numeric) to anon;
