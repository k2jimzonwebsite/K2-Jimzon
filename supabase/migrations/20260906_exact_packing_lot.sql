-- MAP-023 H-016. Prepared only; paired signed-wrapper/browser cutover required.
begin;
create or replace function public.record_packing_scan_exact_v1(
 p_order_request_id uuid,p_scanned_code text,p_reservation_id uuid,p_lot_confirmed boolean
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_order public.order_requests; v_res public.inventory_reservations;
 v_line public.order_request_items; v_batch public.product_batches; v_scan integer; v_total integer; v_complete boolean;
begin
 if not public.is_staff() or auth.uid() is null then raise exception 'Staff access required' using errcode='42501'; end if;
 if p_lot_confirmed is distinct from true then raise exception 'K2_PACKING_LOT_CONFIRMATION_REQUIRED' using errcode='23514'; end if;
 select * into v_order from public.order_requests where id=p_order_request_id for update;
 if not found or v_order.status is distinct from 'confirmed' then raise exception 'K2_PACKING_ALLOCATION_INVALID' using errcode='23514'; end if;
 select * into v_res from public.inventory_reservations where id=p_reservation_id and order_request_id=v_order.id for update;
 if not found or v_res.status is distinct from 'active' or v_res.packed_quantity is null
   or v_res.quantity is null or v_res.quantity<=0 or v_res.packed_quantity<0 or v_res.packed_quantity>=v_res.quantity then
  raise exception 'K2_PACKING_ALLOCATION_INVALID' using errcode='23514'; end if;
 select i.* into v_line from public.order_request_items i join public.products p on p.sku=i.sku
  where i.id=v_res.order_request_item_id and i.order_request_id=v_order.id and i.sku=v_res.sku
   and (upper(i.sku)=upper(trim(p_scanned_code)) or upper(nullif(p.barcode,''))=upper(trim(p_scanned_code)));
 if not found then raise exception 'K2_PACKING_ALLOCATION_INVALID' using errcode='23514'; end if;
 select * into v_batch from public.product_batches where id=v_res.batch_id and sku=v_res.sku for update;
 if not found or v_batch.inventory_status is distinct from 'available'
   or v_batch.quantity is null or v_batch.reserved_quantity is null or v_batch.quantity<v_batch.reserved_quantity
   or v_batch.reserved_quantity<v_res.quantity
   or v_batch.reserved_quantity<(select coalesce(sum(r.quantity),0) from public.inventory_reservations r where r.batch_id=v_batch.id and r.status='active')
   or not coalesce((coalesce(v_batch.expiry_date,v_batch.best_before_date)>=current_date+90
     or (coalesce(v_batch.expiry_date,v_batch.best_before_date) between current_date+31 and current_date+89 and v_batch.clearance_approved_at is not null)),false) then
  raise exception 'K2_PACKING_ALLOCATION_INVALID' using errcode='23514'; end if;
 update public.inventory_reservations set packed_quantity=packed_quantity+1,updated_at=clock_timestamp() where id=v_res.id;
 select coalesce(max(scan_number),0)+1 into v_scan from public.packing_scan_events where order_request_item_id=v_line.id;
 insert into public.packing_scan_events(order_request_id,order_request_item_id,reservation_id,batch_id,sku,scanned_code,scan_number,actor_id)
  values(v_order.id,v_line.id,v_res.id,v_batch.id,v_line.sku,trim(p_scanned_code),v_scan,auth.uid());
 select coalesce(sum(packed_quantity),0) into v_total from public.inventory_reservations where order_request_item_id=v_line.id and status='active';
 if v_total=v_line.quantity then update public.orders set order_status='Packed' where order_request_id=v_order.id and sku=v_line.sku and order_status::text='Pending'; end if;
 select exists(select 1 from public.order_request_items where order_request_id=v_order.id)
   and not exists(select 1 from public.order_request_items i where i.order_request_id=v_order.id
    and i.quantity<>coalesce((select sum(r.packed_quantity) from public.inventory_reservations r where r.order_request_item_id=i.id and r.status='active'),0)) into v_complete;
 if v_complete then update public.order_requests set delivery_status='packed',updated_at=clock_timestamp() where id=v_order.id; end if;
 insert into public.order_request_events(order_request_id,from_status,to_status,actor_id,metadata)
  values(v_order.id,'confirmed','confirmed',auth.uid(),jsonb_build_object('event','unit_packed','sku',v_line.sku,
   'batch_id',v_batch.id,'reservation_id',v_res.id,'physical_lot_confirmed',true,'scan_number',v_scan));
 return jsonb_build_object('order_reference',v_order.public_reference,'sku',v_line.sku,'product_name',v_line.product_name,
  'packed_quantity',v_total,'required_quantity',v_line.quantity,'line_complete',v_total=v_line.quantity,'order_complete',v_complete,'batch_id',v_batch.id);
end;
$$;
revoke all on function public.record_packing_scan_exact_v1(uuid,text,uuid,boolean) from public,anon,authenticated;
revoke all on function public.record_packing_scan(uuid,text) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
