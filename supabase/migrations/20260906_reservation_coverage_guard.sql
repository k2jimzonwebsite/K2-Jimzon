-- MAP-023 H-019. Prepared guard: reconcile partial/expired allocations instead
-- of silently confirming them. Preserve exact existing RPC ACLs.
begin;
do $patch$
declare v_definition text; v_old text; v_new text;
begin
  select pg_get_functiondef('public.reserve_order_request_lots_v1(uuid,text)'::regprocedure) into v_definition;
  if position('K2_RESERVATION_RECONCILIATION_REQUIRED' in v_definition)>0 then return; end if;
  v_old := 'if v_existing > 0 then return 0; end if;';
  v_new := $guard$
  if v_existing > 0 then
    perform 1 from public.inventory_balances b where b.location_code='MANILA_MAIN'
      and b.sku in (select sku from public.order_request_items where order_request_id=v_order.id)
      order by b.sku for update;
    perform 1 from public.inventory_reservations r where r.order_request_id=v_order.id
      order by r.sku,r.batch_id,r.id for update;
    perform 1 from public.product_batches b where b.id in (
      select batch_id from public.inventory_reservations where order_request_id=v_order.id and status='active'
    ) order by b.sku,b.id for update;
    if not exists(select 1 from public.order_request_items where order_request_id=v_order.id)
      or exists (
        select 1 from public.order_request_items i where i.order_request_id=v_order.id
          and i.quantity <> coalesce((select sum(r.quantity) from public.inventory_reservations r
            join public.product_batches b on b.id=r.batch_id and b.sku=r.sku
            where r.order_request_item_id=i.id and r.order_request_id=v_order.id and r.sku=i.sku
              and r.status='active' and r.quantity>0
              and (r.expires_at>clock_timestamp() or (r.expires_at is null and v_order.channel_source<>'website'))
              and b.inventory_status='available' and b.quantity>=b.reserved_quantity
              and b.reserved_quantity >= (select sum(a.quantity) from public.inventory_reservations a where a.batch_id=b.id and a.status='active')
              and (coalesce(b.expiry_date,b.best_before_date)>=current_date+90
                or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89 and b.clearance_approved_at is not null))
          ),0)
      ) or exists (
        select 1 from public.inventory_reservations r
        left join public.order_request_items i on i.id=r.order_request_item_id and i.order_request_id=v_order.id and i.sku=r.sku
        where r.order_request_id=v_order.id and r.status='active' and i.id is null
      ) or exists (
        select 1 from public.inventory_reservations r
        left join public.inventory_balances b on b.sku=r.sku and b.location_code='MANILA_MAIN'
        where r.order_request_id=v_order.id and r.status='active'
          and (b.sku is null or b.reserved < (select sum(a.quantity) from public.inventory_reservations a where a.order_request_id=v_order.id and a.sku=r.sku and a.status='active'))
      ) then
      raise exception 'K2_RESERVATION_RECONCILIATION_REQUIRED' using errcode='23514';
    end if;
    return 0;
  end if;
  $guard$;
  if position(v_old in v_definition)=0 then raise exception 'Reservation helper changed; review before applying coverage guard'; end if;
  execute replace(v_definition,v_old,v_new);
end;
$patch$;
notify pgrst,'reload schema';
commit;
