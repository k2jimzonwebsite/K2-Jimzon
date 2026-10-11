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
