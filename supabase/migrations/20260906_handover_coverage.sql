-- MAP-023 H-023 containment, prepared only. Does not change deduction timing.
begin;
do $patch$
declare v_definition text; v_anchor text;
begin
 select pg_get_functiondef('public.fulfill_order_request(uuid,text)'::regprocedure) into v_definition;
 if position('v_handover_reservation_ids' in v_definition)>0 then return; end if;
 v_anchor:=$old$  if exists (select 1 from public.inventory_reservations where order_request_id = v_order.id and status = 'active' and packed_quantity <> quantity) then$old$;
 if position(v_anchor in v_definition)=0
  or position('v_balance public.inventory_balances;' in v_definition)=0
  or position('from public.inventory_reservations where order_request_id = v_order.id group by sku' in v_definition)=0 then
  raise exception 'Handover definition changed; review before applying'; end if;
 v_definition:=replace(v_definition,'v_balance public.inventory_balances;', 'v_balance public.inventory_balances; v_handover_reservation_ids uuid[];');
 v_definition:=replace(v_definition,v_anchor,$new$
  -- Lock all affected rows before validating, in the prepared release order.
  perform 1 from public.inventory_balances b where b.location_code='MANILA_MAIN'
   and b.sku in(select sku from public.order_request_items where order_request_id=v_order.id)
   order by b.sku for update;
  perform 1 from public.inventory_reservations r where r.order_request_id=v_order.id
   order by r.sku,r.batch_id,r.id for update;
  perform 1 from public.product_batches b where b.id in(
   select batch_id from public.inventory_reservations where order_request_id=v_order.id and status='active')
   order by b.sku,b.id for update;
  select array_agg(id) into v_handover_reservation_ids from public.inventory_reservations
   where order_request_id=v_order.id and status='active';
  if not exists(select 1 from public.order_request_items where order_request_id=v_order.id)
   or exists(select 1 from public.order_request_items i where i.order_request_id=v_order.id
    and (i.quantity is null or i.quantity<=0 or i.quantity<>coalesce((select sum(r.quantity)
      from public.inventory_reservations r where r.order_request_id=v_order.id
      and r.order_request_item_id=i.id and r.sku=i.sku and r.status='active'
      and r.packed_quantity=r.quantity),0)))
   or exists(select 1 from public.inventory_reservations r
    left join public.order_request_items i on i.id=r.order_request_item_id and i.order_request_id=v_order.id and i.sku=r.sku
    left join public.product_batches b on b.id=r.batch_id and b.sku=r.sku
    left join public.inventory_balances bal on bal.sku=r.sku and bal.location_code='MANILA_MAIN'
    where r.id=any(v_handover_reservation_ids) and (i.id is null or b.id is null or bal.sku is null
     or r.quantity<=0 or r.packed_quantity is distinct from r.quantity
     or b.inventory_status is distinct from 'available'
     or b.quantity<b.reserved_quantity or b.reserved_quantity<(select sum(x.quantity) from public.inventory_reservations x where x.batch_id=b.id and x.status='active')
     or bal.on_hand<bal.reserved or bal.reserved<(select sum(x.quantity) from public.inventory_reservations x where x.order_request_id=v_order.id and x.sku=r.sku and x.status='active')
     or not coalesce((coalesce(b.expiry_date,b.best_before_date)>=current_date+90
       or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89 and b.clearance_approved_at is not null)),false))) then
   raise exception 'K2_RESERVATION_RECONCILIATION_REQUIRED' using errcode='23514';
  end if;
  if exists (select 1 from public.inventory_reservations where order_request_id = v_order.id and status = 'active' and packed_quantity <> quantity) then$new$);
 v_definition:=replace(v_definition,'from public.inventory_reservations where order_request_id = v_order.id group by sku',
  'from public.inventory_reservations where id = any(v_handover_reservation_ids) group by sku');
 v_definition:=replace(v_definition,$old$v_order.payment_status <> 'verified'$old$,$new$v_order.payment_status is distinct from 'verified'$new$);
 v_definition:=replace(v_definition,$old$v_order.shipping_quote_status not in ('platform_charged', 'customer_confirmed', 'waived')$old$, $new$coalesce(v_order.shipping_quote_status,'') not in ('platform_charged', 'customer_confirmed', 'waived')$new$);
 execute v_definition;
end;
$patch$;
notify pgrst,'reload schema';
commit;
