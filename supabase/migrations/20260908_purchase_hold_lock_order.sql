-- MAP-023 / MAP-028 I-001 H-020. Prepared only, after the coverage guard.
-- Claim every balance in SKU order before taking any lot locks. Preserve the
-- installed coverage checks and exact RPC ACLs; reject an unexpected definition.
begin;
do $patch$
declare v_definition text; v_old text; v_new text;
begin
  select pg_get_functiondef('public.reserve_order_request_lots_v1(uuid,text)'::regprocedure)
    into v_definition;
  if position('K2_PURCHASE_BALANCE_LOCK_ORDER_V1' in v_definition)>0 then return; end if;
  if position('K2_RESERVATION_RECONCILIATION_REQUIRED' in v_definition)=0 then
    raise exception 'Apply reservation coverage guard before purchase lock ordering';
  end if;
  v_old := $old$  for v_line in
    select * from public.order_request_items
    where order_request_id = v_order.id order by created_at
  loop
    insert into public.inventory_balances (sku, location_code, on_hand)
    select p.sku, 'MANILA_MAIN', greatest(coalesce(sum(b.quantity), 0), 0)::integer
    from public.products p left join public.product_batches b on b.sku = p.sku
    where p.sku = v_line.sku group by p.sku
    on conflict (sku, location_code) do nothing;$old$;
  v_new := $new$  -- K2_PURCHASE_BALANCE_LOCK_ORDER_V1
  -- Conflict checks can acquire locks too, so initialize in the same order.
  insert into public.inventory_balances (sku, location_code, on_hand)
  select p.sku, 'MANILA_MAIN', greatest(coalesce(sum(b.quantity), 0), 0)::integer
  from public.products p left join public.product_batches b on b.sku=p.sku
  where p.sku in (select sku from public.order_request_items where order_request_id=v_order.id)
  group by p.sku order by p.sku
  on conflict (sku, location_code) do nothing;
  perform 1 from public.inventory_balances b
  where b.location_code='MANILA_MAIN'
    and b.sku in (select sku from public.order_request_items where order_request_id=v_order.id)
  order by b.sku for update;

  for v_line in
    select * from public.order_request_items
    where order_request_id = v_order.id order by sku, created_at, id
  loop$new$;
  if position(v_old in v_definition)=0 then
    raise exception 'Purchase hold definition changed; review lock-order patch';
  end if;
  execute replace(v_definition,v_old,v_new);
end;
$patch$;
notify pgrst,'reload schema';
commit;
