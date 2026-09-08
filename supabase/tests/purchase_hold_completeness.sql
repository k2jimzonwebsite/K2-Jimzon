begin;
do $$ declare v_order uuid; v_count integer; begin
  insert into products(sku,name,srp,stock_available) values('SKU-COVERAGE-A','Coverage A',100,2),('SKU-COVERAGE-B','Coverage B',100,2);
  insert into product_batches(sku,quantity,expiry_date) values('SKU-COVERAGE-A',2,current_date+180),('SKU-COVERAGE-B',2,current_date+180);
  select (public.submit_order_request_v2('Coverage fixture','coverage@example.invalid',null,'Local address','pickup',null,
    '[{"sku":"SKU-COVERAGE-A","quantity":1},{"sku":"SKU-COVERAGE-B","quantity":1}]'::jsonb,'coverage-order',null)).id into v_order;
  -- Simulate a historical partial release, retaining the other active line.
  update product_batches set reserved_quantity=0 where sku='SKU-COVERAGE-B';
  update inventory_balances set reserved=0 where sku='SKU-COVERAGE-B';
  update inventory_reservations set status='released',release_cause='staff_released',released_at=now()
    where order_request_id=v_order and sku='SKU-COVERAGE-B';
  select count(*) into v_count from orders;
  begin
    perform public.confirm_order_request(v_order,'Confirm incomplete order');
    raise exception 'Partial reservation coverage was confirmed';
  exception when check_violation then
    if sqlerrm<>'K2_RESERVATION_RECONCILIATION_REQUIRED' then raise; end if;
  end;
  if (select status from order_requests where id=v_order)<>'submitted'
    or (select count(*) from orders)<>v_count then raise exception 'Coverage refusal partially confirmed'; end if;
  -- All rows active but expired must also be refused, not revived.
  update product_batches set reserved_quantity=1 where sku='SKU-COVERAGE-B';
  update inventory_balances set reserved=1 where sku='SKU-COVERAGE-B';
  update inventory_reservations set status='active',release_cause=null,released_at=null,expires_at=now()-interval '1 second'
    where order_request_id=v_order;
  begin
    perform public.confirm_order_request(v_order,'Confirm expired order');
    raise exception 'Expired reservation coverage was confirmed';
  exception when check_violation then
    if sqlerrm<>'K2_RESERVATION_RECONCILIATION_REQUIRED' then raise; end if;
  end;
end $$;
rollback;
