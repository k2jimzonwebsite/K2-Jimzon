-- MAP-018 / IDEA-20261011-01. Prepared only; no provider activation.
-- Caller arms <=10s statement / <=2s lock timers and wraps the transaction.
-- This adds a read boundary, never a second stock balance or eligibility rule.
-- Match the accepted catalog's fully qualified function deparser context.
set local search_path='';
do $preflight$
begin
 raise notice 'K2_ADMIN_STOCK_READ_DEPENDENCIES user=% version=% minimum=% lot=% existing=%',
  current_user,current_setting('server_version_num'),
  md5(replace(pg_catalog.pg_get_functiondef('k2_private.effective_category_minimum_v1(uuid,integer)'::regprocedure),chr(13)||chr(10),chr(10))),
  md5(replace(pg_catalog.pg_get_functiondef('k2_private.lot_is_eligible_for_minimum_v1(public.product_batches,integer,timestamptz)'::regprocedure),chr(13)||chr(10),chr(10))),
  to_regprocedure('public.read_admin_product_stock_v1(text[])');
 if current_user<>'postgres' or current_setting('server_version_num')<>'170006'
  or to_regprocedure('public.read_admin_product_stock_v1(text[])') is not null
  or to_regprocedure('public.read_admin_lot_snapshot_v1(text)') is not null
  or md5(replace(pg_catalog.pg_get_functiondef('k2_private.effective_category_minimum_v1(uuid,integer)'::regprocedure),chr(13)||chr(10),chr(10)))
     <> '26ce6255f014a870f8a358f3de2638a8'
  or md5(replace(pg_catalog.pg_get_functiondef('k2_private.lot_is_eligible_for_minimum_v1(public.product_batches,integer,timestamptz)'::regprocedure),chr(13)||chr(10),chr(10)))
     <> 'a54b62fb4502c063bdcb608b6cde20f9' then
  raise exception 'K2_ADMIN_STOCK_READ_TARGET_INVALID';
 end if;
end $preflight$;

create function public.read_admin_product_stock_v1(p_skus text[])
returns table(sku text,stock_from_batches bigint)
language plpgsql stable security definer set search_path=''
as $stock$
declare v_depth integer; v_instant timestamptz:=pg_catalog.statement_timestamp();
begin
 if auth.uid() is null or not coalesce(public.is_staff(),false)
  or coalesce(auth.jwt()->>'aal','')<>'aal2' then
  raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
 end if;
 if p_skus is null or pg_catalog.cardinality(p_skus)>500
  or pg_catalog.array_ndims(p_skus)>1
  or exists(select 1 from pg_catalog.unnest(p_skus) s(value)
   where s.value is null or pg_catalog.length(s.value)>120
    or pg_catalog.btrim(s.value)='')
  or (select count(*) from pg_catalog.unnest(p_skus))
     <> (select count(distinct s.value) from pg_catalog.unnest(p_skus) s(value)) then
  raise exception using errcode='22023',message='K2_ADMIN_STOCK_READ_INVALID';
 end if;
 select c.maximum_depth into v_depth from k2_private.category_policy_command_config c where c.singleton;
 if v_depth is null or v_depth<1 then
  raise exception using errcode='55000',message='K2_CATEGORY_POLICY_NOT_CONFIGURED';
 end if;
 return query
 with staff_products as materialized (
  select p.sku,k2_private.effective_category_minimum_v1(p.category_id,v_depth) as minimum
  from public.products p where p.sku=any(p_skus)
 ), eligible_lots as materialized (
  select b.sku,(b.quantity-b.reserved_quantity)::bigint as units
  from public.product_batches b join staff_products p on p.sku=b.sku
  where b.reserved_quantity<b.quantity
   and k2_private.lot_is_eligible_for_minimum_v1(b,p.minimum,v_instant)
 )
 select p.sku::text,
  case when p.minimum is null and exists(
   select 1 from public.product_batches b where b.sku=p.sku and b.quantity>0
  ) then null::bigint else coalesce(pg_catalog.sum(e.units),0)::bigint end
 from staff_products p left join eligible_lots e on e.sku=p.sku
 group by p.sku,p.minimum order by p.sku;
end $stock$;
revoke all on function public.read_admin_product_stock_v1(text[]) from public,anon,authenticated,service_role;
grant execute on function public.read_admin_product_stock_v1(text[]) to authenticated;

-- Physical custody and allocations must share a statement snapshot. Cap+1
-- refuses incomplete scopes; the single JSON row cannot be PostgREST-truncated.
create function public.read_admin_lot_snapshot_v1(p_sku text)
returns jsonb language plpgsql stable security definer set search_path=''
as $lots$
declare v_result jsonb; v_limit integer;
begin
 if auth.uid() is null or not coalesce(public.is_staff(),false)
  or coalesce(auth.jwt()->>'aal','')<>'aal2' then
  raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
 end if;
 if p_sku is null or length(p_sku)>120 or p_sku<>btrim(p_sku) then
  raise exception using errcode='22023',message='K2_ADMIN_LOT_READ_INVALID';
 end if;
 v_limit:=case when p_sku='' then 500 else 200 end;
 with lots as materialized (
  select b.id,b.sku,b.box_code,b.batch_code,b.quantity,b.quantity_available,
   b.reserved_quantity,b.expiry_date,b.best_before_date,
   b.landed_date,b.hub,b.custodian,b.channel,b.is_pinned,b.inventory_status,
   b.clearance_approved_at,b.clearance_approved_by,b.created_at,b.updated_at
  from public.product_batches b where p_sku='' or b.sku=p_sku
  order by b.expiry_date nulls last,b.id limit v_limit+1
 ), reservations as materialized (
  select r.id,r.order_request_id,r.sku,r.batch_id,r.quantity,r.packed_quantity,
   r.status,r.expires_at,r.committed_at,r.committed_by,r.commit_cause,
   r.commit_reason,r.created_at
  from public.inventory_reservations r
  where r.status='active' and (p_sku='' or r.sku=p_sku) order by r.id limit 1001
 ), skus as materialized (select l.sku from lots l union select r.sku from reservations r),
 products as materialized (
  select p.sku,p.name,p.title from public.products p join skus s on s.sku=p.sku
  order by p.sku limit 501
 ), orders as materialized (
  select o.id,o.status,o.payment_status from public.order_requests o
  where exists(select 1 from reservations r where r.order_request_id=o.id)
  order by o.id limit 1001
 )
 select jsonb_build_object('schemaVersion','k2.admin-lot-snapshot.v1',
  'complete',true,'asOf',pg_catalog.statement_timestamp(),
  'lots',coalesce((select jsonb_agg(l) from lots l),'[]'::jsonb),
  'products',coalesce((select jsonb_agg(p) from products p),'[]'::jsonb),
  'reservations',coalesce((select jsonb_agg(r) from reservations r),'[]'::jsonb),
  'orders',coalesce((select jsonb_agg(o) from orders o),'[]'::jsonb)) into v_result;
 if jsonb_array_length(v_result->'lots')>v_limit
  or jsonb_array_length(v_result->'products')>500
  or jsonb_array_length(v_result->'reservations')>1000
  or jsonb_array_length(v_result->'orders')>1000 then
  raise exception using errcode='54000',message='K2_ADMIN_LOT_READ_SCOPE_TOO_LARGE';
 end if;
 return v_result;
end $lots$;
revoke all on function public.read_admin_lot_snapshot_v1(text) from public,anon,authenticated,service_role;
grant execute on function public.read_admin_lot_snapshot_v1(text) to authenticated;
