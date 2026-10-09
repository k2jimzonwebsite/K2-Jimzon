-- IDEA-20261002-05 / MAP-018. PREPARED ONLY, no activation.
-- Resolve once per offered product; reuse exact reviewed lot eligibility body.
-- Statement snapshot/instant, closed helpers, no staff context or inventory writes.
do $public_category$
declare v_before pg_catalog.pg_proc%rowtype;v_after pg_catalog.pg_proc%rowtype;
 v_lot pg_catalog.pg_proc%rowtype;v_definition text;v_body text;v_rule text[];
 v_view jsonb;v_view_after jsonb;
 v_query text:=$query$
  with evaluation as materialized (
    select pg_catalog.statement_timestamp() as instant
  ), website_products as materialized (
    select p.sku,k2_private.public_category_minimum_v1(p.category_id) as minimum
    from public.products p
  where p.is_human_reviewed is true
    and nullif(pg_catalog.btrim(p.name),'') is not null
    and nullif(pg_catalog.btrim(p.primary_image_url),'') is not null
    and coalesce(p.srp,p.retail_price,0)>0
    and (p.status::text='Unlisted' or (p.status::text in ('Live','Active') and p.published is true))
    and exists (
      select 1 from public.channel_listings l
      where l.sku=p.sku and l.channel_source='website' and l.shop_id is null
        and l.status='Active' and l.publication_status in ('ready','published')
        and l.validation_errors='[]'::jsonb
    )

  ), eligible_lots as materialized (
    select b.sku,(b.quantity-b.reserved_quantity)::bigint as units
    from public.product_batches b join website_products p on p.sku=b.sku
    cross join evaluation d
    where b.reserved_quantity<b.quantity
      and k2_private.lot_is_eligible_for_minimum_v1(b,p.minimum,d.instant)
  )
  select p.sku::text,coalesce(pg_catalog.sum(b.units),0)::bigint
  from website_products p left join eligible_lots b on b.sku=p.sku
  group by p.sku
$query$;
begin
 if current_user<>'postgres'
  or to_regclass('k2_private.category_policy_command_config') is null
  or to_regprocedure('k2_private.public_category_minimum_v1(uuid)') is not null
  or to_regprocedure('k2_private.lot_is_eligible_for_minimum_v1(public.product_batches,integer,timestamptz)') is not null then
  raise exception 'K2_PUBLIC_CATEGORY_TARGET_INVALID';
 end if;
 select * into v_before from pg_catalog.pg_proc where oid=to_regprocedure('public.get_public_product_stock()');
 if not found or pg_get_userbyid(v_before.proowner)<>'postgres' or not v_before.prosecdef
  or v_before.provolatile<>'s' or v_before.prolang<>(select oid from pg_catalog.pg_language where lanname='sql')
  or v_before.proconfig is distinct from array['search_path=""']::text[]
  or v_before.proacl is null or md5(replace(v_before.prosrc,chr(13),''))<>'818cda070015a7ddc4218203b94807f1'
  or exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a where
   a.grantee not in (v_before.proowner,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
   or a.privilege_type<>'EXECUTE' or a.is_grantable) then
  raise exception 'K2_PUBLIC_CATEGORY_FUNCTION_DRIFT';
 end if;
 select * into v_lot from pg_catalog.pg_proc where oid=to_regprocedure('k2_private.lot_is_eligible_for_category_v1(public.product_batches,integer,timestamptz)');
 if not found or md5(replace(v_lot.prosrc,chr(13),''))<>'6a31b0f7794d99ded02cfe72eda6c5a2'
  or pg_get_userbyid(v_lot.proowner)<>'postgres' or not v_lot.prosecdef
  or v_lot.provolatile<>'s' or v_lot.proconfig is distinct from array['search_path=""']::text[]
  or v_lot.proacl::text[] is distinct from array['postgres=X/postgres']::text[] then
  raise exception 'K2_PUBLIC_CATEGORY_PREDICATE_DRIFT';
 end if;
 select jsonb_build_object('relation',to_jsonb(c),'definition',pg_get_viewdef(c.oid,false),
  'columns',(select jsonb_agg(to_jsonb(a) order by attnum) from pg_attribute a where a.attrelid=c.oid))
  into v_view from pg_class c where c.oid='public.v_product_stock_from_batches'::regclass;
 v_body:=replace(v_lot.prosrc,chr(13),'');
 foreach v_rule slice 1 in array array[
  array[' v_category uuid;',''],
  array[' v_minimum integer;',' v_minimum integer:=p_minimum;'],
  array[$old$ select p.category_id into v_category from public.products p where p.sku=p_lot.sku;
 if not found or v_category is null then return false; end if;
 v_minimum:=k2_private.effective_category_minimum_v1(v_category,p_max_depth);
 if v_minimum is null then return false; end if;$old$,
  ' if v_minimum is null or v_minimum<90 then return false; end if;']
 ] loop
  if (length(v_body)-length(replace(v_body,v_rule[1],'')))<>length(v_rule[1]) then
   raise exception 'K2_PUBLIC_CATEGORY_PREDICATE_SCOPE_INVALID';
  end if;
  v_body:=replace(v_body,v_rule[1],v_rule[2]);
 end loop;
 execute 'create function k2_private.lot_is_eligible_for_minimum_v1(p_lot public.product_batches,p_minimum integer,p_evaluation_instant timestamptz) returns boolean language plpgsql stable security definer set search_path='''''||' as '||quote_literal(v_body);
 execute $helper$create function k2_private.public_category_minimum_v1(p_category uuid)
 returns integer language plpgsql stable security definer set search_path='' as $minimum$
 declare v_depth integer;v_minimum integer;
 begin
  select maximum_depth into v_depth from k2_private.category_policy_command_config where singleton;
  if v_depth is null or v_depth<1 then
   raise exception using errcode='55000',message='K2_CATEGORY_POLICY_NOT_CONFIGURED';
  end if;
  v_minimum:=k2_private.effective_category_minimum_v1(p_category,v_depth);
  if v_minimum is null then
   raise exception using errcode='23514',message='K2_CATEGORY_POLICY_TAXONOMY_INVALID';
  end if;
  return v_minimum;
 end $minimum$;$helper$;
 revoke all on function k2_private.lot_is_eligible_for_minimum_v1(public.product_batches,integer,timestamptz),
  k2_private.public_category_minimum_v1(uuid) from public,anon,authenticated,service_role;
 v_definition:=pg_catalog.pg_get_functiondef(v_before.oid);
 if (length(v_definition)-length(replace(v_definition,v_before.prosrc,'')))<>length(v_before.prosrc) then
  raise exception 'K2_PUBLIC_CATEGORY_SCOPE_INVALID';
 end if;
 execute replace(v_definition,v_before.prosrc,v_query);
 select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
 if v_after.prosrc is distinct from v_query or (to_jsonb(v_after)-'prosrc') is distinct from (to_jsonb(v_before)-'prosrc') then
  raise exception 'K2_PUBLIC_CATEGORY_METADATA_CHANGED';
 end if;
 select jsonb_build_object('relation',to_jsonb(c),'definition',pg_get_viewdef(c.oid,false),
  'columns',(select jsonb_agg(to_jsonb(a) order by attnum) from pg_attribute a where a.attrelid=c.oid))
  into v_view_after from pg_class c where c.oid='public.v_product_stock_from_batches'::regclass;
 if v_view_after is distinct from v_view then raise exception 'K2_PUBLIC_CATEGORY_VIEW_CHANGED'; end if;
end $public_category$;
