-- MAP-023 I-001/H-015/H-020. Prepared only; no change to deduction timing.
-- After 20260906_payment_evidence_recovery.sql. Preserve exact RPC permissions.
begin;
do $patch$
declare v_definition text; v_old text; v_new text;
begin
  if to_regclass('public.inventory_balances') is null then
    raise exception 'Payment balance integrity requires inventory_balances';
  end if;
  select pg_get_functiondef('public.set_order_request_payment_status(uuid,text,text)'::regprocedure)
    into v_definition;
  if position('K2_PAYMENT_BALANCE_INTEGRITY_V1' in v_definition)>0 then return; end if;
  v_old := $old$    perform 1 from public.order_request_items where order_request_id=v_order.id order by id for update;
    perform 1 from public.inventory_reservations where order_request_id=v_order.id order by id for update;
    perform 1 from public.product_batches b where b.id in (
      select batch_id from public.inventory_reservations where order_request_id=v_order.id and status='active'
    ) order by b.id for update;$old$;
  v_new := $new$    -- K2_PAYMENT_BALANCE_INTEGRITY_V1
    perform 1 from public.order_request_items where order_request_id=v_order.id order by id for update;
    perform 1 from public.inventory_balances b where b.location_code='MANILA_MAIN'
      and b.sku in (select sku from public.order_request_items where order_request_id=v_order.id)
      order by b.sku for update;
    perform 1 from public.inventory_reservations where order_request_id=v_order.id order by sku,batch_id,id for update;
    perform 1 from public.product_batches b where b.id in (
      select batch_id from public.inventory_reservations where order_request_id=v_order.id and status='active'
    ) order by b.sku,b.id for update;
    if exists (
      select 1 from public.order_request_items i
      left join public.inventory_balances b on b.sku=i.sku and b.location_code='MANILA_MAIN'
      where i.order_request_id=v_order.id and (
        b.sku is null or b.reserved is null or b.on_hand is null
        or b.reserved<0 or b.reserved>b.on_hand
        or b.reserved<(select coalesce(sum(r.quantity),0) from public.inventory_reservations r
          where r.order_request_id=v_order.id and r.sku=i.sku and r.status='active')
      )
    ) then
      raise exception using errcode='23514',message='K2_PAYMENT_STOCK_INELIGIBLE';
    end if;$new$;
  if position(v_old in v_definition)=0
    or position('K2_PAYMENT_INDEPENDENT_REVIEW_REQUIRED' in v_definition)=0 then
    raise exception 'Payment function changed; apply/review evidence recovery before balance integrity';
  end if;
  execute replace(v_definition,v_old,v_new);
end;
$patch$;
notify pgrst,'reload schema';
commit;
