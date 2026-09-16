-- I-001 / OWNER-002: execute real confirmation, not an inferred source contract.
begin;
do $$
declare v_order uuid;
begin
  insert into products(sku,name,srp,stock_available)
    values('COMMIT-LIFECYCLE','Commitment lifecycle fixture',100,3);
  insert into product_batches(sku,quantity,expiry_date)
    values('COMMIT-LIFECYCLE',3,current_date+180);
  insert into inventory_balances(sku,location_code,on_hand,reserved)
    values('COMMIT-LIFECYCLE','MANILA_MAIN',3,0);
  select (submit_order_request_v2('Commitment fixture','commit@example.test',null,
    'Fixture address','Courier delivery',null,
    '[{"sku":"COMMIT-LIFECYCLE","quantity":2}]'::jsonb,'commit-lifecycle',null)).id
    into v_order;
  if exists(select 1 from inventory_events where reference_id=v_order and event_type='stock_committed') then
    raise exception 'Purchase hold was falsely recorded as sold stock';
  end if;
  perform confirm_order_request(v_order,'Staff confirms the exact purchase');
  if coalesce((select sum(quantity) from inventory_events
    where reference_id=v_order and event_type='stock_committed'),0)<>2 then
    raise exception 'OWNER002_MISSING_CONFIRMATION_OWNERSHIP_DEDUCTION';
  end if;
  if (select quantity from product_batches where sku='COMMIT-LIFECYCLE')<>3
    or (select on_hand from inventory_balances where sku='COMMIT-LIFECYCLE')<>3 then
    raise exception 'Confirmation invented physical dispatch';
  end if;
  perform confirm_order_request(v_order,'Retry same confirmation');
  if (select count(*) from inventory_events where reference_id=v_order and event_type='stock_committed')<>1 then
    raise exception 'Confirmation replay deducted ownership twice';
  end if;
end $$;
rollback;
