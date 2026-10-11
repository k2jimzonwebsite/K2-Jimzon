-- Appended to the existing owned rollback fixture's actor/product/lot setup.
-- Synthetic cardinality fixtures; no canonical writer acceptance.
reset role;
set local session_replication_role=replica;
-- Isolate global cardinality from the 21 archived baseline lots. These local
-- deletions share the enclosing rollback and full151 physical conservation.
delete from public.inventory_reservations where sku is distinct from 'SYN-STOCK-BOUNDARY';
delete from public.product_batches where sku is distinct from 'SYN-STOCK-BOUNDARY';
insert into public.product_batches(sku,quantity,reserved_quantity,quantity_available)
select 'SYN-STOCK-BOUNDARY',0,0,0 from generate_series(1,500);
set local session_replication_role=origin;
set local role authenticated;
do $global_lots$ begin
 begin perform public.read_admin_lot_snapshot_v1('');raise exception 'GLOBAL_PARTIAL_LOTS_ADMITTED';
 exception when program_limit_exceeded then if sqlerrm<>'K2_ADMIN_LOT_READ_SCOPE_TOO_LARGE' then raise;end if;end;
end $global_lots$;
reset role;
set local session_replication_role=replica;
delete from public.product_batches where sku='SYN-STOCK-BOUNDARY' and id<>'89500000-0000-4000-8000-000000000003';
create temporary table cap_identities as select n,gen_random_uuid() order_id,gen_random_uuid() item_id,gen_random_uuid() reservation_id from generate_series(1,1001) n;
grant select on pg_temp.cap_identities to authenticated;
insert into public.order_requests(id,customer_name,customer_email,idempotency_key)
select order_id,'Synthetic cap customer','stock-cap@dummy.example.test','stock-cap-'||order_id from cap_identities;
insert into public.order_request_items(id,order_request_id,sku,product_name,quantity,unit_price,line_total)
select item_id,order_id,'SYN-STOCK-BOUNDARY','Synthetic cap product',1,1,1 from cap_identities;
insert into public.inventory_reservations(id,order_request_id,order_request_item_id,batch_id,sku,quantity)
select reservation_id,order_id,item_id,'89500000-0000-4000-8000-000000000003','SYN-STOCK-BOUNDARY',1 from cap_identities where n<=1000;
set local session_replication_role=origin;
set local role authenticated;
do $at_limit$ declare j jsonb;begin
 j:=public.read_admin_lot_snapshot_v1('SYN-STOCK-BOUNDARY');
 if j->>'complete' is distinct from 'true' or jsonb_array_length(j->'reservations') is distinct from 1000
  or jsonb_array_length(j->'orders') is distinct from 1000 then raise exception 'RESERVATION_ORDER_LIMIT_INCOMPLETE';end if;
 if (select jsonb_agg(jsonb_build_array(r->>'id',r->>'order_request_id',r->>'sku',r->>'batch_id',r->>'quantity') order by r->>'id') from jsonb_array_elements(j->'reservations') r)
  is distinct from (select jsonb_agg(jsonb_build_array(reservation_id::text,order_id::text,'SYN-STOCK-BOUNDARY','89500000-0000-4000-8000-000000000003','1') order by reservation_id::text) from pg_temp.cap_identities where n<=1000)
  or (select jsonb_agg(o->>'id' order by o->>'id') from jsonb_array_elements(j->'orders') o)
  is distinct from (select jsonb_agg(order_id::text order by order_id::text) from pg_temp.cap_identities where n<=1000) then raise exception 'RESERVATION_ORDER_IDENTITIES_INVALID';end if;
end $at_limit$;
reset role;
set local session_replication_role=replica;
insert into public.inventory_reservations(id,order_request_id,order_request_item_id,batch_id,sku,quantity)
select reservation_id,order_id,item_id,'89500000-0000-4000-8000-000000000003','SYN-STOCK-BOUNDARY',1 from cap_identities where n=1001;
set local session_replication_role=origin;
set local role authenticated;
do $overflow$ begin
 begin perform public.read_admin_lot_snapshot_v1('SYN-STOCK-BOUNDARY');raise exception 'PARTIAL_RESERVATIONS_ADMITTED';
 exception when program_limit_exceeded then if sqlerrm<>'K2_ADMIN_LOT_READ_SCOPE_TOO_LARGE' then raise;end if;end;
end $overflow$;
reset role;
set local session_replication_role=replica;
delete from public.inventory_reservations where id=(select reservation_id from pg_temp.cap_identities where n=1001);
insert into public.products(sku,name,category_id,status,published)
select 'SYN-STOCK-CAP-'||n,'Synthetic cardinality product','89500000-0000-4000-8000-000000000002','Draft',false from generate_series(1,500) n;
update public.inventory_reservations r set sku='SYN-STOCK-CAP-'||c.n from pg_temp.cap_identities c where r.id=c.reservation_id and c.n<=500;
set local session_replication_role=origin;
set local role authenticated;
do $products_overflow$ begin
 begin perform public.read_admin_lot_snapshot_v1('');raise exception 'PARTIAL_PRODUCTS_ADMITTED';
 exception when program_limit_exceeded then if sqlerrm<>'K2_ADMIN_LOT_READ_SCOPE_TOO_LARGE' then raise;end if;end;
end $products_overflow$;
reset role;
set local session_replication_role=replica;
update public.inventory_reservations set sku='SYN-STOCK-BOUNDARY' where id=(select reservation_id from pg_temp.cap_identities where n=500);
set local session_replication_role=origin;
set local role authenticated;
do $products_limit$ declare j jsonb;begin
 j:=public.read_admin_lot_snapshot_v1('');
 if j->>'complete' is distinct from 'true' or jsonb_array_length(j->'products') is distinct from 500
  or jsonb_array_length(j->'lots') is distinct from 1 or jsonb_array_length(j->'reservations') is distinct from 1000
  or jsonb_array_length(j->'orders') is distinct from 1000 then raise exception 'PRODUCT_LIMIT_INCOMPLETE';end if;
 if (select jsonb_agg(p->>'sku' order by p->>'sku') from jsonb_array_elements(j->'products') p)
  is distinct from (select jsonb_agg(sku order by sku) from (select 'SYN-STOCK-BOUNDARY' sku union all select 'SYN-STOCK-CAP-'||n from generate_series(1,499) n) s) then raise exception 'PRODUCT_LIMIT_IDENTITIES_INVALID';end if;
end $products_limit$;
rollback;
select 'K2_ADMIN_STOCK_BOUNDARY_CHECKS_OK';
select 'K2_ADMIN_STOCK_GLOBAL_CAPS_OK';
