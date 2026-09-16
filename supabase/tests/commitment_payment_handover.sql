-- Actual signed commands; fabricated data, local actors and local signing key.
begin;
create function public.fixture_payment_commitment_fault() returns trigger language plpgsql as $$
begin
  if new.event_type='stock_committed' and current_setting('fixture.commitment_fault',true)='on'
    and exists(select 1 from public.inventory_events where reference_id=new.reference_id and event_type='stock_committed') then
    raise exception 'FIXTURE_PAYMENT_COMMITMENT_FAILURE';
  end if;
  return new;
end $$;
create trigger fixture_payment_commitment_fault before insert on inventory_events
  for each row execute function public.fixture_payment_commitment_fault();
insert into k2_private.admin_bff_secrets(singleton,request_secret)
  values(true,decode(repeat('ab',32),'hex'));
create function public.fixture_commitment_command(p_action text,p_payload jsonb,p_key uuid default gen_random_uuid())
returns jsonb language plpgsql as $$
declare v_text text:=p_payload::text; v_time bigint:=extract(epoch from clock_timestamp())::bigint;
  v_nonce uuid:=gen_random_uuid(); v_hash text; v_signature text;
begin
  v_hash:=encode(extensions.digest(convert_to(v_text,'UTF8'),'sha256'),'hex');
  v_signature:=encode(extensions.hmac(convert_to(p_action||E'\n'||v_time||E'\n'||v_nonce||E'\n'||auth.uid()||E'\n'||p_key||E'\n'||v_hash,'UTF8'),
    decode(repeat('ab',32),'hex'),'sha256'),'hex');
  return public.execute_admin_fulfillment_command_v1(p_action,v_time,v_nonce,p_key,v_text,v_signature);
end $$;
create function public.fixture_commitment_payment(p_order uuid,p_status text) returns jsonb language sql as $$
  select public.fixture_commitment_command('payment_status',jsonb_build_object(
    'orderRequestId',id,'toStatus',p_status,'evidenceNote','Local independently reviewed proof',
    'expectedPaymentStatus',payment_status,'expectedUpdatedAt',updated_at))
  from public.order_requests where id=p_order
$$;
do $$
declare v_order uuid; v_flow text; v_sku text; v_res record; v_key uuid; v_payload jsonb;
  v_result jsonb; v_evidence jsonb; v_events integer; v_receipts integer; v_fault text; v_nonces integer;
begin
  foreach v_flow in array array['payment-first','confirmation-first'] loop
    v_sku:='COMMIT-'||v_flow;
    insert into products(sku,name,srp,stock_available) values(v_sku,'Lifecycle fixture',100,4);
    insert into product_batches(sku,quantity,expiry_date) values
      (v_sku,1,current_date+180),(v_sku,3,current_date+190);
    insert into inventory_balances(sku,location_code,on_hand,reserved) values(v_sku,'MANILA_MAIN',4,0);
    select (submit_order_request_v2('Lifecycle fixture','lifecycle@example.test',null,
      'Fixture address','Courier delivery',null,jsonb_build_array(jsonb_build_object('sku',v_sku,'quantity',3)),
      v_flow,null)).id into v_order;
    -- Delivery quote approval is a separate workflow, explicitly synthetic here.
    update order_requests set payment_status='not_requested',shipping_quote_status='customer_confirmed' where id=v_order;
    perform set_config('request.actor','11111111-1111-4111-8111-111111111111',true);
    if v_flow='confirmation-first' then
      perform fixture_commitment_command('confirm_order',jsonb_build_object('orderRequestId',v_order,'reason','Local confirmation'));
      -- A committed sale no longer depends on the temporary purchase deadline.
      update inventory_reservations set expires_at=now()-interval '1 minute' where order_request_id=v_order;
    end if;
    perform fixture_commitment_payment(v_order,'awaiting_instructions');
    if v_flow='payment-first' then
      begin
        update inventory_reservations set expires_at=now()-interval '1 minute' where order_request_id=v_order;
        perform fixture_commitment_payment(v_order,'evidence_submitted');
        raise exception 'Expired uncommitted hold accepted as payment evidence';
      exception when check_violation then
        if sqlerrm<>'K2_PAYMENT_STOCK_INELIGIBLE' then raise; end if;
      end;
    end if;
    perform fixture_commitment_payment(v_order,'evidence_submitted');
    begin
      perform fixture_commitment_payment(v_order,'verified');
      raise exception 'Submitter verified their own evidence';
    exception when insufficient_privilege then
      if sqlerrm<>'K2_PAYMENT_INDEPENDENT_REVIEW_REQUIRED' then raise; end if;
    end;
    perform set_config('request.actor','22222222-2222-4222-8222-222222222222',true);
    select jsonb_build_object('orderRequestId',id,'toStatus','verified','evidenceNote','Local independent verifier',
      'expectedPaymentStatus',payment_status,'expectedUpdatedAt',updated_at) into v_payload from order_requests where id=v_order;
    v_key:=gen_random_uuid();
    select count(*) into v_receipts from k2_private.admin_command_receipts;
    select count(*) into v_nonces from k2_private.admin_request_nonces;
    if v_flow='payment-first' then
      perform set_config('fixture.commitment_fault','on',true);
      begin
        perform fixture_commitment_command('payment_status',v_payload,v_key);
        raise exception 'Payment did not reach second commitment fault';
      exception when raise_exception then
        if sqlerrm<>'FIXTURE_PAYMENT_COMMITMENT_FAILURE' then raise; end if;
      end;
      perform set_config('fixture.commitment_fault','off',true);
      if (select payment_status from order_requests where id=v_order)<>'evidence_submitted'
        or exists(select 1 from inventory_reservations where order_request_id=v_order and committed_at is not null)
        or exists(select 1 from inventory_events where reference_id=v_order and event_type='stock_committed')
        or (select count(*) from k2_private.admin_command_receipts)<>v_receipts
        or (select count(*) from k2_private.admin_request_nonces)<>v_nonces then
        raise exception 'Failed signed payment left partial state, receipt or nonce';
      end if;
    else
      foreach v_fault in array array['timestamp','actor','cause','unknown-cause'] loop
        begin
          update inventory_reservations set
            committed_at=case when v_fault='timestamp' then null else committed_at end,
            committed_by=case when v_fault='actor' then null else committed_by end,
            commit_cause=case when v_fault='cause' then null when v_fault='unknown-cause' then 'gift' else commit_cause end
            where id=(select id from inventory_reservations where order_request_id=v_order limit 1);
          perform fixture_commitment_command('payment_status',v_payload,v_key);
          raise exception 'Payment accepted incomplete commitment proof';
        exception when check_violation then
          if sqlerrm<>'K2_PAYMENT_STOCK_INELIGIBLE' then raise; end if;
        end;
      end loop;
    end if;
    v_result:=fixture_commitment_command('payment_status',v_payload,v_key);
    if (select sum(quantity) from inventory_events where reference_id=v_order and event_type='stock_committed') is distinct from 3::bigint
      or (select count(*) from inventory_reservations where order_request_id=v_order and committed_at is not null)<>2 then
      raise exception 'OWNER002_MISSING_PAYMENT_OWNERSHIP_DEDUCTION';
    end if;
    select jsonb_agg(jsonb_build_array(id,committed_at,committed_by,commit_cause,commit_reason) order by id)
      into v_evidence from inventory_reservations where order_request_id=v_order;
    if exists(select 1 from inventory_reservations where order_request_id=v_order and
      (committed_by is distinct from (case when v_flow='payment-first' then '22222222-2222-4222-8222-222222222222'
        else '11111111-1111-4111-8111-111111111111' end)::uuid
       or commit_cause is distinct from (case when v_flow='payment-first' then 'payment_verification' else 'confirmation' end))) then
      raise exception 'Commitment lost original actor/cause';
    end if;
    select count(*) into v_receipts from k2_private.admin_command_receipts;
    if fixture_commitment_command('payment_status',v_payload,v_key)<>v_result
      or (select count(*) from k2_private.admin_command_receipts)<>v_receipts then
      raise exception 'Lost-response retry changed payment receipt';
    end if;
    begin
      perform fixture_commitment_command('payment_status',v_payload||'{"evidenceNote":"Different review"}',v_key);
      raise exception 'Changed payment payload accepted on retained key';
    exception when invalid_parameter_value then
      if sqlerrm<>'K2_ADMIN_IDEMPOTENCY_CONFLICT' then raise; end if;
    end;
    if v_flow='payment-first' then
      update inventory_reservations set expires_at=now()-interval '1 minute' where order_request_id=v_order;
      perform release_expired_reservations_v1(500);
      perform fixture_commitment_command('confirm_order',jsonb_build_object('orderRequestId',v_order,'reason','Confirm paid purchase'));
    end if;
    if (select sum(quantity) from product_batches where sku=v_sku)<>4
      or (select on_hand from inventory_balances where sku=v_sku)<>4
      or (select reserved from inventory_balances where sku=v_sku)<>3
      or (select stock_available from products where sku=v_sku)<>1
      or (select count(*) from inventory_events where reference_id=v_order and event_type='stock_committed')<>2 then
      raise exception 'Confirmation/payment duplicated ownership or changed physical custody';
    end if;
    for v_res in select * from inventory_reservations where order_request_id=v_order order by id loop
      for v_events in 1..v_res.quantity loop
        perform fixture_commitment_command('packing_scan',jsonb_build_object('orderRequestId',v_order,
          'scannedCode',v_sku,'reservationId',v_res.id,'lotConfirmed',true));
      end loop;
    end loop;
    -- Complete packed stock without commitment is unresolved historical stock.
    select count(*) into v_receipts from k2_private.admin_command_receipts;
    foreach v_fault in array array['timestamp','actor','cause','unknown-cause'] loop
      begin
        update inventory_reservations set
          committed_at=case when v_fault='timestamp' then null else committed_at end,
          committed_by=case when v_fault='actor' then null else committed_by end,
          commit_cause=case when v_fault='cause' then null when v_fault='unknown-cause' then 'gift' else commit_cause end
          where id=(select id from inventory_reservations where order_request_id=v_order limit 1);
        perform fixture_commitment_command('fulfill_order',jsonb_build_object('orderRequestId',v_order,'handoverNote','Missing commitment probe'));
        raise exception 'Handover accepted missing ownership commitment';
      exception when check_violation then
        if sqlerrm<>'K2_RESERVATION_RECONCILIATION_REQUIRED' then raise; end if;
      end;
    end loop;
    if (select count(*) from k2_private.admin_command_receipts)<>v_receipts
      or (select sum(quantity) from product_batches where sku=v_sku)<>4 then
      raise exception 'Denied handover wrote receipt or moved stock';
    end if;
    v_payload:=jsonb_build_object('orderRequestId',v_order,'handoverNote','Exact local courier handover');
    v_key:=gen_random_uuid();
    v_result:=fixture_commitment_command('fulfill_order',v_payload,v_key);
    select count(*) into v_events from inventory_events where reference_id=v_order;
    if fixture_commitment_command('fulfill_order',v_payload,v_key)<>v_result
      or (select count(*) from inventory_events where reference_id=v_order)<>v_events
      or (select sum(quantity) from product_batches where sku=v_sku)<>1
      or (select on_hand from inventory_balances where sku=v_sku)<>1
      or (select reserved from inventory_balances where sku=v_sku)<>0
      or exists(select 1 from inventory_reservations where order_request_id=v_order and status<>'fulfilled') then
      raise exception 'Handover/replay failed physical custody reconciliation';
    end if;
    perform fixture_commitment_payment(v_order,'refunded');
    if (select sum(quantity) from product_batches where sku=v_sku)<>1
      or (select count(*) from inventory_events where reference_id=v_order)<>v_events
      or (select jsonb_agg(jsonb_build_array(id,committed_at,committed_by,commit_cause,commit_reason) order by id)
        from inventory_reservations where order_request_id=v_order)<>v_evidence then
      raise exception 'Refund invented returned stock or changed ownership evidence';
    end if;
  end loop;
end $$;
do $$
declare v_order uuid; v_committed jsonb; v_events integer;
begin
  insert into products(sku,name,srp,stock_available) values('COMMIT-CANCEL','Refund/cancel fixture',100,3);
  insert into product_batches(sku,quantity,expiry_date) values
    ('COMMIT-CANCEL',1,current_date+180),('COMMIT-CANCEL',2,current_date+190);
  insert into inventory_balances(sku,location_code,on_hand,reserved) values('COMMIT-CANCEL','MANILA_MAIN',3,0);
  select (submit_order_request_v2('Refund fixture','refund@example.test',null,
    'Fixture address','Courier delivery',null,'[{"sku":"COMMIT-CANCEL","quantity":3}]',
    'commit-cancel',null)).id into v_order;
  update order_requests set payment_status='not_requested' where id=v_order;
  perform set_config('request.actor','11111111-1111-4111-8111-111111111111',true);
  perform fixture_commitment_payment(v_order,'awaiting_instructions');
  perform fixture_commitment_payment(v_order,'evidence_submitted');
  perform set_config('request.actor','22222222-2222-4222-8222-222222222222',true);
  perform fixture_commitment_payment(v_order,'verified');
  select jsonb_agg(jsonb_build_array(id,committed_at,committed_by,commit_cause,commit_reason) order by id)
    into v_committed from inventory_reservations where order_request_id=v_order;
  select count(*) into v_events from inventory_events where reference_id=v_order;
  perform fixture_commitment_payment(v_order,'refunded');
  if (select reserved from inventory_balances where sku='COMMIT-CANCEL')<>3
    or (select on_hand from inventory_balances where sku='COMMIT-CANCEL')<>3
    or (select stock_available from products where sku='COMMIT-CANCEL')<>0
    or (select count(*) from inventory_events where reference_id=v_order)<>v_events then
    raise exception 'Refund before dispatch changed stock instead of leaving cancellation separate';
  end if;
  perform cancel_order_request(v_order,'Customer cancellation after refund review');
  select count(*) into v_events from inventory_events where reference_id=v_order;
  perform cancel_order_request(v_order,'Same cancellation retry');
  if (select reserved from inventory_balances where sku='COMMIT-CANCEL')<>0
    or (select stock_available from products where sku='COMMIT-CANCEL')<>3
    or (select sum(quantity) from product_batches where sku='COMMIT-CANCEL')<>3
    or exists(select 1 from inventory_reservations where order_request_id=v_order
      and (status<>'released' or release_cause<>'cancelled'))
    or (select count(*) from inventory_events where reference_id=v_order)<>v_events
    or (select jsonb_agg(jsonb_build_array(id,committed_at,committed_by,commit_cause,commit_reason) order by id)
      from inventory_reservations where order_request_id=v_order)<>v_committed then
    raise exception 'Paid cancellation did not restore exact stock once with retained commitment';
  end if;
end $$;
-- Real PostgreSQL role denial, distinct from the synthetic staff/Auth identities.
do $$ begin
  begin
    set local role authenticated;
    perform public.commit_order_request_stock_v1(gen_random_uuid(),'confirmation','Direct helper probe');
    raise exception 'Authenticated caller reached the internal commitment helper';
  exception when insufficient_privilege then
    if sqlerrm<>'permission denied for function commit_order_request_stock_v1' then raise; end if;
  end;
  begin
    set local role anon;
    perform public.commit_order_request_stock_v1(gen_random_uuid(),'confirmation','Anonymous helper probe');
    raise exception 'Anonymous caller reached the internal commitment helper';
  exception when insufficient_privilege then
    if sqlerrm<>'permission denied for function commit_order_request_stock_v1' then raise; end if;
  end;
end $$;
rollback;
