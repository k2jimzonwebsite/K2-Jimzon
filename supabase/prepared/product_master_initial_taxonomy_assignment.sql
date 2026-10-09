-- IDEA-20261005-07 / MAP-018. Fresh-only prepared overlay; not a migration.
-- Extends the MAP-020 base migration's already-signed Product Master update
-- only for initial canonical
-- brand/category assignment on unpublished, zero-stock Drafts with no inventory
-- history. Existing non-NULL identity values cannot be reassigned.
do $preflight$
begin
 if current_user<>'postgres'
    or to_regclass('public.products') is null
    or to_regclass('public.brands') is null
    or to_regclass('public.categories') is null
    or to_regclass('public.product_batches') is null
    or to_regclass('public.inventory_balances') is null
    or to_regclass('public.inventory_events') is null
    or to_regprocedure('public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)') is null then
  raise exception 'K2_PRODUCT_TAXONOMY_TARGET_INVALID';
 end if;
 if exists(
   select 1 from (values
     ('public.products'::regclass,array['id','sku','status','published','brand_id','category_id','stock_available','total_stock','updated_at']::name[]),
     ('public.product_batches'::regclass,array['sku']::name[]),
     ('public.inventory_balances'::regclass,array['sku','on_hand','reserved','in_transit','damaged','expired','unaccounted']::name[]),
     ('public.inventory_events'::regclass,array['sku']::name[]),
     ('public.brands'::regclass,array['id','name']::name[]),
     ('public.categories'::regclass,array['id','name']::name[])
   ) required(relation_id,column_names)
   where cardinality(column_names)<>(
     select count(*) from pg_catalog.pg_attribute a
     where a.attrelid=relation_id and a.attname=any(column_names)
       and a.attnum>0 and not a.attisdropped)) then
  raise exception 'K2_PRODUCT_TAXONOMY_COLUMN_DRIFT';
 end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid='public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure
    and (pg_catalog.pg_get_userbyid(p.proowner)<>'postgres' or not p.prosecdef
      or p.proconfig is distinct from array['search_path=""']
      or l.lanname<>'plpgsql' or p.provolatile<>'v' or p.prokind<>'f'
      or p.proacl::text[] is distinct from array['postgres=X/postgres','authenticated=X/postgres'])) then
  raise exception 'K2_PRODUCT_TAXONOMY_METADATA_DRIFT';
 end if;
 if (select encode(extensions.digest(convert_to(prosrc,'UTF8'),'sha256'),'hex')
     from pg_catalog.pg_proc where oid='public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure)
    is distinct from '07a353c7e9dcb09e41e784bdfb096dbc0a12fbfce98fc59f0ff6ef6602e0368a' then
  raise exception 'K2_PRODUCT_TAXONOMY_SOURCE_DRIFT';
 end if;
end $preflight$;

-- Preserve the complete current signed boundary; replace only the master field
-- allowlist, initial-identity guard, and the two corresponding assignments.
do $compose$
declare
 v_definition text;
 v_anchor text;
begin
 v_definition:=pg_catalog.pg_get_functiondef(
   'public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure);

 v_anchor:=$allow_anchor$  v_allowed text[]:=array[
    'name','short','barcode','subcategory','country_of_origin','origin','net_weight',
    'package_type','size','description','why_buy','why_rare','usage_instructions',$allow_anchor$;
 if (length(v_definition)-length(replace(v_definition,v_anchor,'')))/length(v_anchor)<>1 then
  raise exception 'K2_PRODUCT_TAXONOMY_ALLOWLIST_ANCHOR_INVALID';
 end if;
 v_definition:=replace(v_definition,v_anchor,$allow_replacement$  v_allowed text[]:=array[
    'name','short','barcode','subcategory','country_of_origin','origin','net_weight','brand_id','category_id',
    'package_type','size','description','why_buy','why_rare','usage_instructions',$allow_replacement$);

 v_anchor:=$guard_anchor$    if v_product.updated_at is distinct from (v_payload->>'expectedUpdatedAt')::timestamptz then
      raise exception using errcode='40001',message='K2_ADMIN_PRODUCT_VERSION_CONFLICT';
    end if;
    v_next:=jsonb_populate_record(v_product,v_patch);$guard_anchor$;
 if (length(v_definition)-length(replace(v_definition,v_anchor,'')))/length(v_anchor)<>1 then
  raise exception 'K2_PRODUCT_TAXONOMY_GUARD_ANCHOR_INVALID';
 end if;
 v_definition:=replace(v_definition,v_anchor,$guard_replacement$    if v_product.updated_at is distinct from (v_payload->>'expectedUpdatedAt')::timestamptz then
      raise exception using errcode='40001',message='K2_ADMIN_PRODUCT_VERSION_CONFLICT';
    end if;
    if v_patch ? 'brand_id' or v_patch ? 'category_id' then
      if not (v_patch ?& array['brand_id','category_id'])
         or jsonb_typeof(v_patch->'brand_id') is distinct from 'string'
         or jsonb_typeof(v_patch->'category_id') is distinct from 'string' then
        raise exception using errcode='22023',message='K2_ADMIN_PRODUCT_INVALID';
      end if;
      if (v_product.status is distinct from 'Draft' or v_product.published is distinct from false
          or v_product.brand_id is not null and v_product.brand_id is distinct from (v_patch->>'brand_id')::uuid
          or v_product.category_id is not null and v_product.category_id is distinct from (v_patch->>'category_id')::uuid
          or v_product.brand_id is not null and v_product.category_id is not null
          or v_product.stock_available is distinct from 0 or v_product.total_stock is distinct from 0
          or exists(select 1 from public.product_batches b where b.sku=v_sku)
          or exists(select 1 from public.inventory_balances b where b.sku=v_sku and (
            b.on_hand is distinct from 0 or b.reserved is distinct from 0 or b.in_transit is distinct from 0
            or b.damaged is distinct from 0 or b.expired is distinct from 0 or b.unaccounted is distinct from 0))
          or exists(select 1 from public.inventory_events e where e.sku=v_sku)) then
        raise exception using errcode='23514',message='K2_PRODUCT_TAXONOMY_INITIAL_ONLY';
      end if;
    end if;
    v_next:=jsonb_populate_record(v_product,v_patch);$guard_replacement$);

 v_anchor:=$update_anchor$      country_of_origin=v_next.country_of_origin,origin=v_next.origin,net_weight=v_next.net_weight,
      package_type=v_next.package_type,size=v_next.size,description=v_next.description,$update_anchor$;
 if (length(v_definition)-length(replace(v_definition,v_anchor,'')))/length(v_anchor)<>1 then
  raise exception 'K2_PRODUCT_TAXONOMY_UPDATE_ANCHOR_INVALID';
 end if;
 v_definition:=replace(v_definition,v_anchor,$update_replacement$      country_of_origin=v_next.country_of_origin,origin=v_next.origin,net_weight=v_next.net_weight,
      brand_id=v_next.brand_id,category_id=v_next.category_id,
      package_type=v_next.package_type,size=v_next.size,description=v_next.description,$update_replacement$);

 execute v_definition;
end $compose$;
