begin;
alter table order_requests add column if not exists fulfilled_at timestamptz;
alter table coupon_redemptions add column if not exists updated_at timestamptz;
alter table products add column if not exists barcode text;
alter table order_requests add column if not exists public_reference text default 'LOCAL-HANDOVER';
create table if not exists packing_scan_events (
 order_request_id uuid,order_request_item_id uuid,reservation_id uuid,batch_id uuid,
 sku text,scanned_code text,scan_number integer,actor_id uuid
);
do $$ declare v_order uuid; v_line uuid; v_batch uuid; v_res uuid; v_old_batch uuid; v_events integer; begin
 insert into products(sku,name,srp,stock_available) values('SKU-HANDOVER','Local handover fixture',100,1);
 insert into order_requests(status,payment_status,shipping_quote_status)
  values('confirmed','verified','customer_confirmed') returning id into v_order;
 insert into order_request_items(order_request_id,sku,quantity,line_total) values(v_order,'SKU-HANDOVER',1,100);
 begin
  perform public.fulfill_order_request(v_order,'Local courier proof');
  raise exception 'Handover accepted missing allocations';
 exception when check_violation then
  if sqlerrm<>'K2_RESERVATION_RECONCILIATION_REQUIRED' then raise; end if;
 end;
 if (select status from order_requests where id=v_order)<>'confirmed'
  or exists(select 1 from order_request_events where order_request_id=v_order) then
  raise exception 'Denied handover changed order or events'; end if;

 insert into products(sku,name,srp,stock_available) values('SKU-HANDOVER-VALID','Local lifecycle fixture',100,2);
 insert into product_batches(sku,quantity,expiry_date) values('SKU-HANDOVER-VALID',2,current_date+180) returning id into v_batch;
 insert into inventory_balances(sku,location_code,on_hand,reserved) values('SKU-HANDOVER-VALID','MANILA_MAIN',2,0);
 select (submit_order_request_v2('Fixture','fixture@example.test',null,'Fixture address','Courier delivery',null,
  '[{"sku":"SKU-HANDOVER-VALID","quantity":1}]'::jsonb,'handover-valid',null)).id into v_order;
 perform confirm_order_request(v_order,'Local confirmation');
 -- Payment verification is separately rehearsed through its real signed path.
 update order_requests set payment_status='verified',shipping_quote_status='customer_confirmed' where id=v_order;
 select id,order_request_item_id into v_res,v_line from inventory_reservations where order_request_id=v_order and status='active';
 begin
  perform fulfill_order_request(v_order,'Not yet packed');
  raise exception 'Handover accepted unpacked allocation';
 exception when check_violation then if sqlerrm<>'K2_RESERVATION_RECONCILIATION_REQUIRED' then raise; end if; end;
 perform record_packing_scan_exact_v1(v_order,'SKU-HANDOVER-VALID',v_res,true);
 insert into product_batches(sku,quantity,expiry_date) values('SKU-HANDOVER-VALID',0,current_date+180) returning id into v_old_batch;
 insert into inventory_reservations(order_request_id,order_request_item_id,batch_id,sku,quantity,status,release_cause)
  values(v_order,v_line,v_old_batch,'SKU-HANDOVER-VALID',1,'released','superseded');
 update inventory_balances set reserved=0 where sku='SKU-HANDOVER-VALID';
 begin
  perform fulfill_order_request(v_order,'Corrupt balance');
  raise exception 'Handover accepted missing reserved balance';
 exception when check_violation then if sqlerrm<>'K2_RESERVATION_RECONCILIATION_REQUIRED' then raise; end if; end;
 if (select quantity from product_batches where id=v_batch)<>2
  or (select status from inventory_reservations where id=v_res)<>'active' then
  raise exception 'Denied handover partially deducted stock'; end if;
 update inventory_balances set reserved=1 where sku='SKU-HANDOVER-VALID';
 perform fulfill_order_request(v_order,'Local courier handover');
 select count(*) into v_events from inventory_events where reference_id=v_order;
 perform fulfill_order_request(v_order,'Local courier handover replay');
 if (select quantity from product_batches where id=v_batch)<>1
  or (select reserved_quantity from product_batches where id=v_batch)<>0
  or (select on_hand from inventory_balances where sku='SKU-HANDOVER-VALID')<>1
  or (select reserved from inventory_balances where sku='SKU-HANDOVER-VALID')<>0
  or (select stock_available from products where sku='SKU-HANDOVER-VALID')<>1
  or (select status from order_requests where id=v_order)<>'fulfilled'
  or (select status from inventory_reservations where id=v_res)<>'fulfilled'
  or (select status from inventory_reservations where batch_id=v_old_batch)<>'released'
  or (select count(*) from inventory_events where reference_id=v_order)<>v_events then
  raise exception 'Handover or replay changed exact stock/history incorrectly'; end if;
end $$;
rollback;
