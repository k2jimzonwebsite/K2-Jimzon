begin;
do $$ declare v_order uuid; v_batch uuid; v_result record; v_count integer; v_case text; begin
  insert into products(sku,name,srp,stock_available) values('SKU-EXPIRY','Expiry fixture',100,4);
  insert into product_batches(sku,quantity,expiry_date) values('SKU-EXPIRY',4,current_date+180) returning id into v_batch;
  insert into inventory_balances(sku,location_code,on_hand,reserved) values('SKU-EXPIRY','MANILA_MAIN',4,0);
  select (public.submit_order_request_v2('Expiry fixture','expiry@example.invalid',null,'Local fixture address','pickup',null,
    '[{"sku":"SKU-EXPIRY","quantity":1}]'::jsonb,'expiry-confirmed',null)).id into v_order;
  perform public.confirm_order_request(v_order,'Confirm fixture');
  update inventory_reservations set expires_at=now()-interval '1 minute' where order_request_id=v_order;
  select * into v_result from public.release_expired_reservations_v1(500);
  if not exists(select 1 from inventory_reservations where order_request_id=v_order and status='active') then
    raise exception 'Expiry released confirmed stock';
  end if;
  foreach v_case in array array['verified','evidence_submitted','packed','unknown_deadline'] loop
    update order_requests set status='submitted',payment_status='unpaid' where id=v_order;
    update inventory_reservations set packed_quantity=0,expires_at=now()-interval '1 minute' where order_request_id=v_order;
    if v_case in ('verified','evidence_submitted') then update order_requests set payment_status=v_case where id=v_order; end if;
    if v_case='packed' then update inventory_reservations set packed_quantity=1 where order_request_id=v_order; end if;
    if v_case='unknown_deadline' then update inventory_reservations set expires_at=null where order_request_id=v_order; end if;
    perform public.release_expired_reservations_v1(500);
    if not exists(select 1 from inventory_reservations where order_request_id=v_order and status='active') then
      raise exception 'Expiry released protected commitment: %',v_case;
    end if;
  end loop;
  update order_requests set status='confirmed' where id=v_order;
  -- A submitted two-line order has mixed deadlines. Its whole hold expires
  -- together, never a partial line merely because the batch limit was reached.
  insert into products(sku,name,srp,stock_available) values('SKU-EXPIRY-B','Second fixture',100,2);
  insert into product_batches(sku,quantity,expiry_date) values('SKU-EXPIRY-B',2,current_date+180);
  insert into inventory_balances(sku,location_code,on_hand,reserved) values('SKU-EXPIRY-B','MANILA_MAIN',2,0);
  select (public.submit_order_request_v2('Expiry fixture','expiry@example.invalid',null,'Local fixture address','pickup',null,
    '[{"sku":"SKU-EXPIRY","quantity":1},{"sku":"SKU-EXPIRY-B","quantity":1}]'::jsonb,'expiry-mixed',null)).id into v_order;
  update inventory_reservations set expires_at=now()-interval '1 minute' where order_request_id=v_order and sku='SKU-EXPIRY';
  select * into v_result from public.release_expired_reservations_v1(1);
  if v_result.released_count<>2 or exists(select 1 from inventory_reservations where order_request_id=v_order and status='active') then
    raise exception 'Expiry left partial order coverage';
  end if;
  if (select stock_available from products where sku='SKU-EXPIRY-B')<>2 then raise exception 'Expiry left stale public stock'; end if;
  if not exists(select 1 from inventory_events where reference_id=v_order and event_type='reservation_released') then raise exception 'Expiry lacks inventory evidence'; end if;
  select * into v_result from public.release_expired_reservations_v1(500);
  if v_result.released_count<>0 then raise exception 'Expiry replay released again'; end if;
  -- Real bad counters must fail with no partial change.
  select (public.submit_order_request_v2('Expiry fixture','expiry@example.invalid',null,'Local fixture address','pickup',null,
    '[{"sku":"SKU-EXPIRY-B","quantity":1}]'::jsonb,'expiry-bad-counter',null)).id into v_order;
  update inventory_reservations set expires_at=now()-interval '1 minute' where order_request_id=v_order;
  update inventory_balances set reserved=0 where sku='SKU-EXPIRY-B';
  select count(*) into v_count from inventory_events;
  begin
    perform public.release_expired_reservations_v1(500);
    raise exception 'Expiry silently clamped mismatched counter';
  exception when check_violation then
    if sqlerrm<>'K2_RESERVATION_BALANCE_MISMATCH' then raise; end if;
  end;
  if not exists(select 1 from inventory_reservations where order_request_id=v_order and status='active')
    or (select count(*) from inventory_events)<>v_count then raise exception 'Expiry mismatch partially committed'; end if;
  update inventory_balances set reserved=1 where sku='SKU-EXPIRY-B';
  update product_batches set reserved_quantity=0 where sku='SKU-EXPIRY-B';
  begin
    perform public.release_expired_reservations_v1(500);
    raise exception 'Expiry silently clamped mismatched lot';
  exception when check_violation then
    if sqlerrm<>'K2_RESERVATION_LOT_MISMATCH' then raise; end if;
  end;
  if (select reserved from inventory_balances where sku='SKU-EXPIRY-B')<>1 then raise exception 'Lot failure committed balance decrement'; end if;
end $$;
rollback;
