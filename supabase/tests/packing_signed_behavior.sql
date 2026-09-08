select set_config('request.actor','11111111-1111-4111-8111-111111111111',false);
select set_config('request.aal','aal2',false);
create function public.fixture_packing(p_payload jsonb, p_key uuid) returns jsonb
language plpgsql as $$
declare v_text text:=p_payload::text; v_time bigint:=extract(epoch from clock_timestamp())::bigint;
 v_nonce uuid:=gen_random_uuid(); v_hash text; v_signature text;
begin
 v_hash:=encode(extensions.digest(convert_to(v_text,'UTF8'),'sha256'),'hex');
 v_signature:=encode(extensions.hmac(convert_to('packing_scan'||E'\n'||v_time||E'\n'||v_nonce||E'\n'||auth.uid()||E'\n'||p_key||E'\n'||v_hash,'UTF8'),decode(repeat('ab',32),'hex'),'sha256'),'hex');
 return public.execute_admin_fulfillment_command_v1('packing_scan',v_time,v_nonce,p_key,v_text,v_signature);
end $$;
do $$ declare v_key uuid:=gen_random_uuid(); v_result jsonb;
 v_payload jsonb:='{"orderRequestId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","scannedCode":"LOCAL-BARCODE","reservationId":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","lotConfirmed":true}';
begin
 v_result:=public.fixture_packing(v_payload,v_key);
 if public.fixture_packing(v_payload,v_key)<>v_result then raise exception 'Packing receipt changed'; end if;
 if (select count(*) from packing_scan_events)<>1 then raise exception 'Packing replay duplicated unit'; end if;
 begin
  perform public.fixture_packing(v_payload||'{"lotConfirmed":false}'::jsonb,v_key);
  raise exception 'Packing key accepted changed payload';
 exception when invalid_parameter_value then
  if sqlerrm<>'K2_ADMIN_IDEMPOTENCY_CONFLICT' then raise; end if;
 end;
 if has_function_privilege('authenticated','public.record_packing_scan_exact_v1(uuid,text,uuid,boolean)','execute')
  or has_function_privilege('anon','public.record_packing_scan(uuid,text)','execute') then
  raise exception 'Unsigned packing exposed'; end if;
 if position('K2_PAYMENT_VERSION_CONFLICT' in pg_get_functiondef('public.execute_admin_fulfillment_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure))=0 then
  raise exception 'Packing composition lost payment version guard'; end if;
end $$;
