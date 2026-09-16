-- Must fail on the original function: failed has no exit.
select set_config('request.actor', '11111111-1111-4111-8111-111111111111', false);
select set_config('request.aal', 'aal2', false);
select public.set_order_request_payment_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','evidence_submitted','Corrected reference from payer');
do $$ begin
  if (select count(*) from order_request_events) <> 2 then raise exception 'Attempt history lost or duplicated'; end if;
  begin
    perform public.set_order_request_payment_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','verified','Same actor');
    raise exception 'Self-verification accepted';
  exception when insufficient_privilege then
    if sqlerrm <> 'K2_PAYMENT_INDEPENDENT_REVIEW_REQUIRED' then raise; end if;
  end;
end $$;
select set_config('request.actor', '22222222-2222-4222-8222-222222222222', false);
select public.set_order_request_payment_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','verified','Receiving ledger independently reconciled');
do $$ begin
  if (select payment_status from order_requests) <> 'verified' then raise exception 'Independent verification failed'; end if;
  if (select count(*) from order_request_events) <> 3 then raise exception 'Unexpected event count'; end if;
end $$;
-- Denials roll back all evidence/state changes.
do $$ declare v_case text; begin
  foreach v_case in array array['cancelled','expired','coverage','quarantine','short_life','split_overcommit'] loop
    update order_requests set status='confirmed',payment_status='failed';
    update inventory_reservations set status='active',expires_at=now()+interval '30 minutes';
    update product_batches set inventory_status='available',expiry_date=current_date+120;
    if v_case='cancelled' then update order_requests set status='cancelled'; end if;
    if v_case='expired' then update inventory_reservations set expires_at=now()-interval '1 second'; end if;
    if v_case='coverage' then update inventory_reservations set status='released'; end if;
    if v_case='quarantine' then update product_batches set inventory_status='quarantined'; end if;
    if v_case='short_life' then update product_batches set expiry_date=current_date+30; end if;
    if v_case='split_overcommit' then
      update order_request_items set quantity=2;
      insert into inventory_reservations select 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid,order_request_id,order_request_item_id,batch_id,sku,quantity,status,expires_at from inventory_reservations;
    end if;
    begin
      perform public.set_order_request_payment_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','evidence_submitted','Corrected evidence');
      raise exception 'Unsafe recovery accepted: %',v_case;
    exception when check_violation then
      if sqlerrm not in ('K2_PAYMENT_ORDER_INELIGIBLE','K2_PAYMENT_STOCK_INELIGIBLE') then raise; end if;
    end;
    if (select count(*) from order_request_events) <> 3 then raise exception 'Denial wrote an event'; end if;
  end loop;
  delete from inventory_reservations where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  update order_request_items set quantity=1;
end $$;

-- Structured payment evidence assertions
select set_config('request.actor', '11111111-1111-4111-8111-111111111111', false);
select set_config('request.aal', 'aal2', false);
update order_requests set status='confirmed', payment_status='awaiting_instructions' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- Test invalid structured evidence rejection
do $$ begin
  -- Invalid method
  begin
    perform public.set_order_request_payment_status(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'evidence_submitted', 'Invalid method',
      jsonb_build_object('method','crypto','amount',100,'payer_name','Tester','payment_reference','REF-1')
    );
    raise exception 'Invalid payment method accepted';
  exception when invalid_parameter_value then
    if sqlerrm <> 'K2_PAYMENT_METHOD_INVALID' then raise; end if;
  end;

  -- Invalid amount (zero/negative)
  begin
    perform public.set_order_request_payment_status(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'evidence_submitted', 'Invalid amount',
      jsonb_build_object('method','gcash','amount',0,'payer_name','Tester','payment_reference','REF-1')
    );
    raise exception 'Zero payment amount accepted';
  exception when invalid_parameter_value then
    if sqlerrm <> 'K2_PAYMENT_AMOUNT_INVALID' then raise; end if;
  end;

  -- Invalid currency
  begin
    perform public.set_order_request_payment_status(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'evidence_submitted', 'Invalid currency',
      jsonb_build_object('method','gcash','amount',100,'currency','USD','payer_name','Tester','payment_reference','REF-1')
    );
    raise exception 'Non-PHP payment currency accepted';
  exception when invalid_parameter_value then
    if sqlerrm <> 'K2_PAYMENT_CURRENCY_INVALID' then raise; end if;
  end;

  -- Blank payer name
  begin
    perform public.set_order_request_payment_status(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'evidence_submitted', 'Blank payer',
      jsonb_build_object('method','gcash','amount',100,'payer_name','   ','payment_reference','REF-1')
    );
    raise exception 'Blank payer name accepted';
  exception when invalid_parameter_value then
    if sqlerrm <> 'K2_PAYMENT_PAYER_INVALID' then raise; end if;
  end;

  -- Blank payment reference
  begin
    perform public.set_order_request_payment_status(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'evidence_submitted', 'Blank reference',
      jsonb_build_object('method','gcash','amount',100,'payer_name','Tester','payment_reference','  ')
    );
    raise exception 'Blank payment reference accepted';
  exception when invalid_parameter_value then
    if sqlerrm <> 'K2_PAYMENT_REFERENCE_INVALID' then raise; end if;
  end;
end $$;

-- Valid structured evidence submission
select public.set_order_request_payment_status(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'evidence_submitted',
  'GCash payment for provisions',
  jsonb_build_object(
    'method', 'gcash',
    'amount', 1250.50,
    'currency', 'PHP',
    'payer_name', 'Maria Santos',
    'payment_reference', 'GCASH-1234567890',
    'proof_asset_ref', 'evidence/gcash-receipt-1.jpg'
  )
);

do $$ declare v_ev jsonb; begin
  select payment_evidence into v_ev from order_requests where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  if v_ev->>'method' <> 'gcash' then raise exception 'Payment method not stored'; end if;
  if (v_ev->>'amount')::numeric <> 1250.50 then raise exception 'Payment amount not stored'; end if;
  if v_ev->>'currency' <> 'PHP' then raise exception 'Payment currency not stored'; end if;
  if v_ev->>'payer_name' <> 'Maria Santos' then raise exception 'Payer name not stored'; end if;
  if v_ev->>'payment_reference' <> 'GCASH-1234567890' then raise exception 'Payment reference not stored'; end if;
  if v_ev->>'proof_asset_ref' <> 'evidence/gcash-receipt-1.jpg' then raise exception 'Proof asset ref not stored'; end if;
  if v_ev->>'submitted_by' <> '11111111-1111-4111-8111-111111111111' then raise exception 'Submitter ID not stored'; end if;
end $$;

-- Verify with distinct staff actor
select set_config('request.actor', '22222222-2222-4222-8222-222222222222', false);
select public.set_order_request_payment_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'verified', 'Reconciled with merchant GCash account');

do $$ declare v_ev jsonb; begin
  select payment_evidence into v_ev from order_requests where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  if (select payment_status from order_requests where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 'verified' then
    raise exception 'Payment not verified';
  end if;
  if v_ev->>'verified_by' <> '22222222-2222-4222-8222-222222222222' then raise exception 'Verifier ID not stored'; end if;
  if v_ev->>'verification_note' <> 'Reconciled with merchant GCash account' then raise exception 'Verification note not stored'; end if;
end $$;

