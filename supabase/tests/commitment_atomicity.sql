-- MAP-023 / I-001: a failure on the second exact lot must roll back the
-- actual confirmation, coupon, compatibility orders and both commitment writes.
begin;
create function public.fixture_commitment_fault() returns trigger language plpgsql as $$
begin
  if new.event_type='stock_committed' and new.sku='COMMIT-ATOMIC'
    and exists(select 1 from public.inventory_events where reference_id=new.reference_id
      and event_type='stock_committed') then
    raise exception 'FIXTURE_SECOND_COMMITMENT_FAILURE';
  end if;
  return new;
end $$;
create trigger fixture_commitment_fault before insert on inventory_events
  for each row execute function public.fixture_commitment_fault();
do $$
declare v_order uuid; v_coupon uuid; v_events integer;
begin
  insert into products(sku,name,srp,stock_available) values('COMMIT-ATOMIC','Atomic fixture',100,3);
  insert into product_batches(sku,quantity,expiry_date) values
    ('COMMIT-ATOMIC',1,current_date+180),('COMMIT-ATOMIC',2,current_date+190);
  insert into inventory_balances(sku,location_code,on_hand,reserved)
    values('COMMIT-ATOMIC','MANILA_MAIN',3,0);
  select (submit_order_request_v2('Atomic fixture','atomic@example.test',null,
    'Fixture address','Courier delivery',null,'[{"sku":"COMMIT-ATOMIC","quantity":3}]',
    'commit-atomic',null)).id into v_order;
  insert into coupons(code,discount_type,discount_value) values('ATOMIC','fixed',10) returning id into v_coupon;
  update order_requests set coupon_id=v_coupon,discount_amount=10 where id=v_order;
  select count(*) into v_events from inventory_events where reference_id=v_order;
  begin
    perform confirm_order_request(v_order,'Atomic failure probe');
    raise exception 'Second-allocation fault was not reached';
  exception when raise_exception then
    if sqlerrm<>'FIXTURE_SECOND_COMMITMENT_FAILURE' then raise; end if;
  end;
  if (select status from order_requests where id=v_order)<>'submitted'
    or exists(select 1 from inventory_reservations where order_request_id=v_order and committed_at is not null)
    or exists(select 1 from orders where order_request_id=v_order)
    or exists(select 1 from coupon_redemptions where order_request_id=v_order)
    or (select redemption_count from coupons where id=v_coupon)<>0
    or (select count(*) from inventory_events where reference_id=v_order)<>v_events then
    raise exception 'Confirmation failure left partial order/coupon/commitment state';
  end if;
  alter table inventory_events disable trigger fixture_commitment_fault;
  perform confirm_order_request(v_order,'Same order after failure');
  perform confirm_order_request(v_order,'Confirmed replay');
  if (select count(*) from inventory_reservations where order_request_id=v_order and committed_at is not null)<>2
    or (select count(*) from inventory_events where reference_id=v_order and event_type='stock_committed')<>2
    or (select sum(quantity) from inventory_events where reference_id=v_order and event_type='stock_committed')<>3
    or (select redemption_count from coupons where id=v_coupon)<>1
    or (select count(*) from orders where order_request_id=v_order)<>1
    or (select sum(quantity) from product_batches where sku='COMMIT-ATOMIC')<>3 then
    raise exception 'Multi-lot confirmation recovery/replay did not converge exactly once';
  end if;
end $$;
rollback;
