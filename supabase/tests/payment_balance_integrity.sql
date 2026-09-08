-- MAP-023 I-001/H-020. Each denial must leave payment and event history intact.
begin;
select set_config('request.actor','22222222-2222-4222-8222-222222222222',true);
select set_config('request.aal','aal2',true);
do $$
declare v_case text; v_target text; v_events integer; v_updated timestamptz;
begin
  foreach v_target in array array['evidence_submitted','verified'] loop
    foreach v_case in array array['missing','unreserved','overdrawn','null_reserved','null_on_hand'] loop
      delete from inventory_balances;
      insert into inventory_balances values ('LOCAL-SKU','MANILA_MAIN',3,1);
      update order_requests set payment_status=case when v_target='verified' then 'evidence_submitted' else 'failed' end;
      if v_target='verified' then
        insert into order_request_events(order_request_id,actor_id,metadata)
        values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',
          '{"event":"payment_status_changed","to":"evidence_submitted"}');
      end if;
      if v_case='missing' then delete from inventory_balances; end if;
      if v_case='unreserved' then update inventory_balances set reserved=0; end if;
      if v_case='overdrawn' then update inventory_balances set on_hand=0; end if;
      if v_case='null_reserved' then update inventory_balances set reserved=null; end if;
      if v_case='null_on_hand' then update inventory_balances set on_hand=null; end if;
      select count(*) into v_events from order_request_events;
      select updated_at into v_updated from order_requests;
      begin
        perform public.set_order_request_payment_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',v_target,'Balance integrity fixture');
        raise exception 'Payment accepted inconsistent balance: % / %',v_target,v_case;
      exception when check_violation then
        if sqlerrm <> 'K2_PAYMENT_STOCK_INELIGIBLE' then raise; end if;
      end;
      if (select count(*) from order_request_events)<>v_events
        or (select updated_at from order_requests) is distinct from v_updated
        or (select payment_status from order_requests)<>(case when v_target='verified' then 'evidence_submitted' else 'failed' end)
      then raise exception 'Payment denial changed state/history'; end if;
    end loop;
  end loop;
  -- A bad balance must not prevent recording an independently reconciled refund.
  update order_requests set status='cancelled',payment_status='verified';
  perform public.set_order_request_payment_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','refunded','Refund ledger reconciled');
  if (select payment_status from order_requests)<>'refunded' then raise exception 'Refund recovery blocked'; end if;
end $$;
rollback;
