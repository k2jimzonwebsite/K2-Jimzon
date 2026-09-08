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
