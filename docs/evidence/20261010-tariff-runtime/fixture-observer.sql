-- MAP-018 / IDEA-20261010-08. Disposable native fixture only; never a migration.
-- Install only in the marked owned clone; archive reconstruction removes it.
create function public.k2_fixture_tariff_business_v1(p_keys text[], p_sku text)
returns jsonb language plpgsql security definer set search_path = '' as $fixture$
declare v_result jsonb;
begin
 if not public.is_admin() or coalesce(auth.jwt()->>'aal','') <> 'aal2' then
  raise exception using errcode='42501',message='K2_FIXTURE_ADMIN_AAL2_REQUIRED';
 end if;
 if p_sku is distinct from 'MAP018-TARIFF-ORDER-01' or p_keys is distinct from array[
  '76000000-0000-4000-8000-000000000001','76000000-0000-4000-8000-000000000002',
  '76000000-0000-4000-8000-000000000003']::text[] then
  raise exception using errcode='22023',message='K2_FIXTURE_SELECTION_INVALID';
 end if;
 with orders as materialized (
  select * from public.order_requests where idempotency_key=any(p_keys)
 ), snapshots as materialized (
  select * from k2_private.order_delivery_snapshots where idempotency_key=any(p_keys)
 ), items as materialized (
  select * from public.order_request_items where sku=p_sku
 ), reservations as materialized (
  select * from public.inventory_reservations where sku=p_sku
 ), events as materialized (
  select e.* from public.order_request_events e where e.order_request_id in (select id from orders)
 ), conversations as materialized (
  select c.* from public.conversations c where c.source_kind='order_request' and c.source_id in (select id from orders)
 ), messages as materialized (
  select m.* from public.messages m where m.conversation_id in (select id from conversations)
 ), batches as materialized (
  select * from public.product_batches where sku=p_sku
 ), inventory_events as materialized (
  select * from public.inventory_events where sku=p_sku
 )
 select jsonb_build_object(
  'contract','MAP018_TARIFF_BUSINESS_OBSERVER_V1','fixtureSku',p_sku,'keys',to_jsonb(p_keys),
  'relationCounts',jsonb_build_object(
   'orders',(select count(*) from orders),'snapshots',(select count(*) from snapshots),
   'items',(select count(*) from items),'reservations',(select count(*) from reservations),
   'events',(select count(*) from events),'conversations',(select count(*) from conversations),
   'messages',(select count(*) from messages),'batches',(select count(*) from batches),
   'inventoryEvents',(select count(*) from inventory_events)),
  'orphanCounts',jsonb_build_object(
   'snapshots',(select count(*) from snapshots s where not exists(select 1 from orders o where o.id=s.order_id)),
   'items',(select count(*) from items i where not exists(select 1 from orders o where o.id=i.order_request_id)),
   'reservations',(select count(*) from reservations r where not exists(select 1 from orders o where o.id=r.order_request_id)),
   'conversations',(select count(*) from conversations c where not exists(select 1 from orders o where o.id=c.source_id)),
   'messages',(select count(*) from messages m where not exists(select 1 from conversations c where c.id=m.conversation_id))),
  'orders',coalesce((select jsonb_agg(jsonb_build_object(
   'id',o.id,'idempotencyKey',o.idempotency_key,'publicReference',o.public_reference,
   'status',o.status,'createdAt',o.created_at,'acceptedAt',o.customer_delivery_confirmed_at,
   'shippingAmount',o.shipping_amount,'totalAmount',o.total_amount,
   'shippingQuoteStatus',o.shipping_quote_status,'deliveryStatus',o.delivery_status,
   'record',to_jsonb(o),'snapshot',(select to_jsonb(s) from snapshots s where s.order_id=o.id),
   'quote',(select s.quote from snapshots s where s.order_id=o.id),
   'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from items i where i.order_request_id=o.id),'[]'::jsonb),
   'reservations',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from reservations r where r.order_request_id=o.id),'[]'::jsonb),
   'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.id) from events e where e.order_request_id=o.id),'[]'::jsonb),
   'conversations',coalesce((select jsonb_agg(to_jsonb(c) order by c.id) from conversations c where c.source_id=o.id),'[]'::jsonb),
   'messages',coalesce((select jsonb_agg(to_jsonb(m) order by m.id) from messages m
    where m.conversation_id in(select c.id from conversations c where c.source_id=o.id)),'[]'::jsonb)
  ) order by o.idempotency_key) from orders o),'[]'::jsonb),
  'stock',jsonb_build_object(
   'onHand',(select b.on_hand from public.inventory_balances b where b.sku=p_sku and b.location_code='MANILA_MAIN'),
   'reserved',(select b.reserved from public.inventory_balances b where b.sku=p_sku and b.location_code='MANILA_MAIN'),
   'balance',(select to_jsonb(b) from public.inventory_balances b where b.sku=p_sku and b.location_code='MANILA_MAIN'),
   'product',(select to_jsonb(p) from public.products p where p.sku=p_sku),
   'batches',coalesce((select jsonb_agg(to_jsonb(b)||jsonb_build_object('reservedQuantity',b.reserved_quantity)
     order by b.id) from batches b),'[]'::jsonb),
   'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.id) from inventory_events e),'[]'::jsonb)
  )) into v_result;
 return v_result;
end $fixture$;
revoke all on function public.k2_fixture_tariff_business_v1(text[],text) from public,anon,authenticated;
grant execute on function public.k2_fixture_tariff_business_v1(text[],text) to authenticated;
