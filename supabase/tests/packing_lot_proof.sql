begin;
alter table products add column if not exists barcode text;
alter table order_requests add column if not exists public_reference text default 'LOCAL-PACK';
create table if not exists packing_scan_events (
 id uuid default gen_random_uuid(),order_request_id uuid,order_request_item_id uuid,
 reservation_id uuid,batch_id uuid,sku text,scanned_code text,scan_number integer,actor_id uuid
);
do $$ declare v_order uuid; v_line uuid; v_batch_a uuid; v_batch_b uuid; v_res_a uuid; v_res_b uuid; v_result jsonb; v_other_line uuid; begin
 insert into products(sku,name,srp,stock_available,barcode) values('SKU-LOT-PROOF','Local lot proof',100,2,'SAME-BARCODE');
 insert into product_batches(sku,quantity,reserved_quantity,expiry_date) values('SKU-LOT-PROOF',1,1,current_date+120) returning id into v_batch_a;
 insert into product_batches(sku,quantity,reserved_quantity,expiry_date) values('SKU-LOT-PROOF',1,1,current_date+180) returning id into v_batch_b;
 insert into order_requests(status) values('confirmed') returning id into v_order;
 insert into order_request_items(order_request_id,sku,quantity,line_total) values(v_order,'SKU-LOT-PROOF',2,200) returning id into v_line;
 insert into inventory_reservations(order_request_id,order_request_item_id,batch_id,sku,quantity,expires_at) values(v_order,v_line,v_batch_a,'SKU-LOT-PROOF',1,now()+interval '30 minutes') returning id into v_res_a;
 insert into inventory_reservations(order_request_id,order_request_item_id,batch_id,sku,quantity,expires_at) values(v_order,v_line,v_batch_b,'SKU-LOT-PROOF',1,now()+interval '30 minutes') returning id into v_res_b;
 v_result:=public.record_packing_scan_exact_v1(v_order,'SAME-BARCODE',v_res_b,true);
 if not exists(select 1 from packing_scan_events where order_request_id=v_order and batch_id=v_batch_b)
   or (select packed_quantity from inventory_reservations where id=v_res_a)<>0 then raise exception 'Scan credited the wrong physical lot'; end if;
 begin
   perform public.record_packing_scan_exact_v1(v_order,'SAME-BARCODE',v_res_a,false);
   raise exception 'Missing physical confirmation accepted';
 exception when check_violation then if sqlerrm<>'K2_PACKING_LOT_CONFIRMATION_REQUIRED' then raise; end if; end;
 begin
   perform public.record_packing_scan_exact_v1(v_order,'WRONG-CODE',v_res_a,true);
   raise exception 'Wrong product accepted';
 exception when check_violation then if sqlerrm<>'K2_PACKING_ALLOCATION_INVALID' then raise; end if; end;
 begin
   perform public.record_packing_scan_exact_v1(v_order,'SAME-BARCODE',v_res_b,true);
   raise exception 'Excess unit accepted';
 exception when check_violation then if sqlerrm<>'K2_PACKING_ALLOCATION_INVALID' then raise; end if; end;
 insert into order_request_items(order_request_id,sku,quantity,line_total) values(v_order,'SKU-LOT-PROOF',1,100) returning id into v_other_line;
 insert into inventory_reservations(order_request_id,order_request_item_id,batch_id,sku,quantity,expires_at)
  values(v_order,v_other_line,v_batch_a,'SKU-LOT-PROOF',1,now()+interval '30 minutes');
 begin
   perform public.record_packing_scan_exact_v1(v_order,'SAME-BARCODE',v_res_a,true);
   raise exception 'Overcommitted lot accepted';
 exception when check_violation then if sqlerrm<>'K2_PACKING_ALLOCATION_INVALID' then raise; end if; end;
 delete from inventory_reservations where batch_id=v_batch_a and id<>v_res_a;
 update product_batches set expiry_date=current_date+30 where id=v_batch_a;
 begin
   perform public.record_packing_scan_exact_v1(v_order,'SAME-BARCODE',v_res_a,true);
   raise exception 'Short-life lot accepted';
 exception when check_violation then if sqlerrm<>'K2_PACKING_ALLOCATION_INVALID' then raise; end if; end;
 if (select count(*) from packing_scan_events where order_request_id=v_order)<>1 then raise exception 'Denied scan wrote an event'; end if;
end $$;
rollback;
