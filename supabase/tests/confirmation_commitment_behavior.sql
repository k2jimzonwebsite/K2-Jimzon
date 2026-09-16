-- I-001 / OWNER-002: committed allocations survive the temporary-hold sweep
-- and cancel with retained commitment evidence. Runs after
-- supabase/tests/order_stock_commitment.sql in the purchase-time rehearsal.
begin;
do $$
declare v_order uuid; v_other uuid;
begin
  insert into products(sku,name,srp,stock_available)
    values('COMMIT-GUARD','Commitment guard fixture',100,2);
  insert into product_batches(sku,quantity,expiry_date)
    values('COMMIT-GUARD',2,current_date+180);
  insert into inventory_balances(sku,location_code,on_hand,reserved)
    values('COMMIT-GUARD','MANILA_MAIN',2,0);
  select (submit_order_request_v2('Guard fixture','guard@example.test',null,
    'Fixture address','Courier delivery',null,
    '[{"sku":"COMMIT-GUARD","quantity":1}]'::jsonb,'commit-guard',null)).id
    into v_order;
  perform confirm_order_request(v_order,'Staff confirms the exact purchase');

  -- The temporary-hold sweep must not touch owned stock, even when the
  -- surrounding order row looks sweepable.
  update order_requests set status='submitted',payment_status='unpaid' where id=v_order;
  update inventory_reservations set expires_at=now()-interval '1 minute'
    where order_request_id=v_order;
  perform public.release_expired_reservations_v1(500);
  if not exists(select 1 from inventory_reservations where order_request_id=v_order
    and status='active' and committed_at is not null) then
    raise exception 'Sweep released committed ownership';
  end if;

  -- Unknown causes are refused rather than recorded as vague history.
  begin
    perform public.commit_order_request_stock_v1(v_order,'gift','Guard probe');
    raise exception 'Unknown commitment cause was accepted';
  exception when raise_exception then
    if sqlerrm <> 'Unknown stock commitment cause' then raise; end if;
  end;

  -- The helper is idempotent on its own: committed rows are skipped and no
  -- second sale event is written.
  if public.commit_order_request_stock_v1(v_order,'confirmation','Guard replay') <> 0 then
    raise exception 'Commitment helper re-deducted committed stock';
  end if;
  if (select count(*) from inventory_events where reference_id=v_order
    and event_type='stock_committed') <> 1 then
    raise exception 'Commitment replay duplicated sale evidence';
  end if;

  -- Cancellation releases the allocation but retains the commitment facts.
  update order_requests set status='confirmed' where id=v_order;
  perform cancel_order_request(v_order,'Customer requested cancellation');
  if exists(select 1 from inventory_reservations where order_request_id=v_order
    and status='active') then
    raise exception 'Cancelled committed order still holds stock';
  end if;
  if not exists(select 1 from inventory_reservations where order_request_id=v_order
    and status='released' and release_cause='cancelled'
    and committed_at is not null and commit_cause='confirmation') then
    raise exception 'Cancellation erased commitment evidence';
  end if;
  if (select reserved from inventory_balances where sku='COMMIT-GUARD') <> 0
    or (select sum(reserved_quantity) from product_batches where sku='COMMIT-GUARD') <> 0
    or (select stock_available from products where sku='COMMIT-GUARD') <> 2 then
    raise exception 'Cancellation did not restore exact stock';
  end if;
  if (select count(*) from inventory_events where reference_id=v_order
    and event_type='stock_committed') <> 1 then
    raise exception 'Cancellation removed sale evidence';
  end if;

  -- Uncommitted holds still expire exactly as before.
  insert into products(sku,name,srp,stock_available)
    values('COMMIT-PLAIN','Uncommitted expiry fixture',100,1);
  insert into product_batches(sku,quantity,expiry_date)
    values('COMMIT-PLAIN',1,current_date+180);
  insert into inventory_balances(sku,location_code,on_hand,reserved)
    values('COMMIT-PLAIN','MANILA_MAIN',1,0);
  select (submit_order_request_v2('Plain fixture','plain@example.test',null,
    'Fixture address','Courier delivery',null,
    '[{"sku":"COMMIT-PLAIN","quantity":1}]'::jsonb,'commit-plain',null)).id
    into v_other;
  update inventory_reservations set expires_at=now()-interval '1 minute'
    where order_request_id=v_other;
  perform public.release_expired_reservations_v1(500);
  if exists(select 1 from inventory_reservations where order_request_id=v_other
    and status='active') then
    raise exception 'Sweep exemption leaked onto uncommitted holds';
  end if;
end $$;
rollback;
