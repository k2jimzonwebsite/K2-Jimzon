-- IDEA-20261002-05 / MAP-018/023/026. PREPARED ONLY; no provider activation.
-- Guarded actual private receiving core. Existing signed caller/trigger/host context
-- and all-writer/public-projection acceptance remain required before installation.
do $receiving$
declare v_before pg_catalog.pg_proc%rowtype;v_definition text;
begin
 if current_user<>'postgres'
    or to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is null
    or to_regprocedure('k2_private.lot_is_eligible_for_category_v1(public.product_batches,integer,timestamptz)') is null
    or to_regclass('k2_private.category_policy_command_config') is null then
  raise exception 'K2_CATEGORY_RECEIVING_TARGET_INVALID';
 end if;
 select * into v_before from pg_catalog.pg_proc
  where oid=to_regprocedure('k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)');
 if not found or pg_catalog.pg_get_userbyid(v_before.proowner)<>'postgres'
    or not v_before.prosecdef or v_before.proretset or v_before.provolatile<>'v'
    or v_before.prorettype<>'public.consignments'::regtype
    or v_before.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
    or v_before.proconfig is distinct from array['search_path=""']::text[]
    or v_before.proacl::text[] is distinct from array['postgres=X/postgres']::text[]
    or md5(replace(v_before.prosrc,chr(13),''))<>'0df85cb01249dface47ded9d27f83212' then
  raise exception 'K2_CATEGORY_RECEIVING_FUNCTION_DRIFT';
 end if;
 v_definition:=pg_catalog.pg_get_functiondef(v_before.oid);
 v_definition:=replace(v_definition,
  'v_today date:=(pg_catalog.transaction_timestamp() at time zone ''Asia/Manila'')::date;',
  'v_today date; v_instant timestamptz; v_depth integer; v_minimum integer; v_days numeric;');
 v_definition:=replace(v_definition,
  'if not public.is_staff() then raise exception ''Staff access required''; end if;',
  'if not public.is_staff() then raise exception ''Staff access required''; end if;
  perform k2_private.lock_category_policy_v1(false);
  select maximum_depth into v_depth from k2_private.category_policy_command_config where singleton;
  if v_depth is null or v_depth<1 then
    raise exception using errcode=''55000'',message=''K2_CATEGORY_POLICY_NOT_CONFIGURED'';
  end if;');
 v_definition:=replace(v_definition,
  'for v_item in select * from public.consignment_items where consignment_id = p_consignment_id order by sku,id for update',
  'perform 1 from public.consignment_items where consignment_id=p_consignment_id order by sku,id for update;
  perform 1 from public.product_batches where sku in (
    select sku from public.consignment_items where consignment_id=p_consignment_id
  ) order by sku,id for update;
  -- One internal server instant after every existing affected resource lock.
  v_instant:=pg_catalog.clock_timestamp();
  v_today:=(v_instant at time zone ''Asia/Manila'')::date;
  for v_item in select * from public.consignment_items where consignment_id = p_consignment_id order by sku,id for update');
 v_definition:=replace(v_definition,
  'v_status := case when v_item.best_before_date >= v_today + 90 then ''available'' else ''quarantine'' end;',
  'select k2_private.effective_category_minimum_v1(p.category_id,v_depth) into v_minimum
      from public.products p where p.sku=v_item.sku;
      if v_minimum is null then
        raise exception using errcode=''23514'',message=''K2_CATEGORY_POLICY_TAXONOMY_INVALID'';
      end if;
      v_days:=null;
      if v_item.best_before_date is not null and pg_catalog.isfinite(v_item.best_before_date) then
        v_days:=(v_item.best_before_date-date ''2000-01-01'')::numeric-(v_today-date ''2000-01-01'')::numeric;
      end if;
      v_status := case when v_days>=v_minimum then ''available'' else ''quarantine'' end;');
 v_definition:=replace(v_definition,'k2_private.lot_is_eligible_v1(b)',
  'k2_private.lot_is_eligible_for_category_v1(b,v_depth,v_instant)');
 execute v_definition;
 -- CREATE OR REPLACE preserves the exact closed owner/ACL; verify no metadata expansion.
 if exists(select 1 from pg_catalog.pg_proc p where p.oid=v_before.oid and
   (p.proowner<>v_before.proowner or p.proacl is distinct from v_before.proacl
    or p.proconfig is distinct from v_before.proconfig or not p.prosecdef
    or p.prorettype<>v_before.prorettype or p.provolatile<>v_before.provolatile)) then
  raise exception 'K2_CATEGORY_RECEIVING_METADATA_CHANGED';
 end if;
end $receiving$;
