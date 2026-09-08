-- Real HMAC verifier + real receipt wrapper; the secret is a local fixture only.
insert into k2_private.admin_bff_secrets(singleton,request_secret)
values(true,decode(repeat('ab',32),'hex'));
create function public.fixture_payment(p_payload jsonb, p_key uuid) returns jsonb
language plpgsql as $$
declare v_text text:=p_payload::text; v_time bigint:=extract(epoch from clock_timestamp())::bigint;
  v_nonce uuid:=gen_random_uuid(); v_hash text; v_signature text;
begin
  v_hash:=encode(extensions.digest(convert_to(v_text,'UTF8'),'sha256'),'hex');
  v_signature:=encode(extensions.hmac(convert_to('payment_status'||E'\n'||v_time||E'\n'||v_nonce||E'\n'||auth.uid()||E'\n'||p_key||E'\n'||v_hash,'UTF8'),decode(repeat('ab',32),'hex'),'sha256'),'hex');
  return public.execute_admin_fulfillment_command_v1('payment_status',v_time,v_nonce,p_key,v_text,v_signature);
end $$;
select set_config('request.actor','11111111-1111-4111-8111-111111111111',false);
select set_config('request.aal','aal2',false);
update order_requests set status='confirmed',payment_status='failed',updated_at=clock_timestamp();
update inventory_reservations set status='active',expires_at=now()+interval '30 minutes';
update product_batches set inventory_status='available',expiry_date=current_date+120;
do $$ declare v_payload jsonb; v_result jsonb; v_key uuid:=gen_random_uuid(); v_count integer; begin
  select jsonb_build_object('orderRequestId',id,'toStatus','evidence_submitted',
    'evidenceNote','Corrected reference signed fixture','expectedPaymentStatus',payment_status,'expectedUpdatedAt',updated_at)
    into v_payload from order_requests;
  v_result:=public.fixture_payment(v_payload,v_key);
  select count(*) into v_count from order_request_events;
  if public.fixture_payment(v_payload,v_key)<>v_result then raise exception 'Replay result changed'; end if;
  if (select count(*) from order_request_events)<>v_count then raise exception 'Replay duplicated event'; end if;
  begin
    perform public.fixture_payment(v_payload,gen_random_uuid());
    raise exception 'Stale review accepted';
  exception when serialization_failure then
    if sqlerrm<>'K2_PAYMENT_VERSION_CONFLICT' then raise; end if;
  end;
  begin
    perform public.fixture_payment(v_payload||'{"evidenceNote":"changed"}'::jsonb,v_key);
    raise exception 'Changed payload accepted on old key';
  exception when invalid_parameter_value then
    if sqlerrm<>'K2_ADMIN_IDEMPOTENCY_CONFLICT' then raise; end if;
  end;
  if (select count(*) from k2_private.admin_command_receipts)<>1 then raise exception 'Failed commands left receipts'; end if;
  if has_function_privilege('authenticated','public.set_order_request_payment_status(uuid,text,text)','execute')
    or has_function_privilege('anon','public.set_order_request_payment_status(uuid,text,text)','execute') then
    raise exception 'Unsigned payment mutation exposed';
  end if;
end $$;
