-- IDEA-20261002-05 / MAP-018. Fresh-only local preparation, no activation.
-- Preserve exact signed controls, completed retry and all three post-event refreshes.
do $signed_lots$
declare v_before pg_catalog.pg_proc%rowtype;v_after pg_catalog.pg_proc%rowtype;
 v_definition text;v_rule text[];
begin
 if current_user<>'postgres'
  or to_regprocedure('k2_private.start_category_lot_context_v1(integer)') is null
  or to_regprocedure('k2_private.lot_is_eligible_for_category_v1(public.product_batches,integer,timestamptz)') is null
  or to_regclass('k2_private.category_policy_command_config') is null then
  raise exception 'K2_CATEGORY_SIGNED_LOTS_TARGET_INVALID';
 end if;
 select * into v_before from pg_catalog.pg_proc where oid=to_regprocedure('public.execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)');
 if not found or pg_get_userbyid(v_before.proowner)<>'postgres' or not v_before.prosecdef
  or v_before.proisstrict or v_before.proretset or v_before.provolatile<>'v'
  or v_before.proleakproof or v_before.prokind<>'f'
  or v_before.pronargdefaults<>0 or v_before.provariadic<>0 or v_before.prosupport<>0
  or v_before.proargmodes is not null or v_before.proallargtypes is not null
  or v_before.proargnames is distinct from array['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']::text[]
  or v_before.prorettype<>'jsonb'::regtype or v_before.proparallel<>'u'
  or v_before.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
  or v_before.proconfig is distinct from array['search_path=""']::text[]
  or v_before.proacl::text[] is distinct from array['postgres=X/postgres','authenticated=X/postgres']::text[]
  or md5(replace(v_before.prosrc,chr(13),''))<>'131951453aa69b42ce5f3ae3623b9e8a' then
  raise exception 'K2_CATEGORY_SIGNED_LOTS_FUNCTION_DRIFT';
 end if;
 v_definition:=pg_catalog.pg_get_functiondef(v_before.oid);
 foreach v_rule slice 1 in array array[
  array['v_today date:=(pg_catalog.transaction_timestamp() at time zone ''Asia/Manila'')::date;',
   'v_today date;v_instant timestamptz;v_depth integer;'],
  array['  if p_action=''lots_reconcile'' then',
   '  -- Completed durable receipts above retain historical results before new policy checks.
  perform k2_private.lock_category_policy_v1(false);
  select maximum_depth into v_depth from k2_private.category_policy_command_config where singleton;
  if v_depth is null or v_depth<1 then
   raise exception using errcode=''55000'',message=''K2_CATEGORY_POLICY_NOT_CONFIGURED'';
  end if;
  if p_action=''lots_reconcile'' then'],
  array['    for v_lot in select * from jsonb_array_elements(v_payload->''lots'') loop',
   '    perform 1 from public.product_batches where sku=trim(v_payload->>''sku'') order by id for update;
    if (select k2_private.effective_category_minimum_v1(p.category_id,v_depth)
        from public.products p where p.sku=trim(v_payload->>''sku'')) is null then
     raise exception using errcode=''23514'',message=''K2_CATEGORY_POLICY_TAXONOMY_INVALID'';
    end if;
    v_instant:=k2_private.start_category_lot_context_v1(v_depth);
    v_today:=(v_instant at time zone ''Asia/Manila'')::date;
    for v_lot in select * from jsonb_array_elements(v_payload->''lots'') loop'],
  array['    select * into v_existing from public.product_batches
    where id=(v_payload->>''batchId'')::uuid and sku=v_clearance_sku for update;',
   '    perform 1 from public.product_batches where sku=v_clearance_sku order by id for update;
    select * into v_existing from public.product_batches
    where id=(v_payload->>''batchId'')::uuid and sku=v_clearance_sku for update;'],
  array['    v_expiry:=coalesce(v_existing.expiry_date,v_existing.best_before_date);',
   '    if (select k2_private.effective_category_minimum_v1(p.category_id,v_depth)
        from public.products p where p.sku=v_clearance_sku) is null then
     raise exception using errcode=''23514'',message=''K2_CATEGORY_POLICY_TAXONOMY_INVALID'';
    end if;
    v_instant:=k2_private.start_category_lot_context_v1(v_depth);
    v_today:=(v_instant at time zone ''Asia/Manila'')::date;
    v_expiry:=coalesce(v_existing.expiry_date,v_existing.best_before_date);'],
  array['clearance_approved_at=case when (v_payload->>''approved'')::boolean then now() else null end,',
   'clearance_approved_at=case when (v_payload->>''approved'')::boolean then v_instant else null end,'],
  array['batch_change_events(batch_id,sku,reason,old_data,new_data,actor_id)',
   'batch_change_events(batch_id,sku,reason,old_data,new_data,actor_id,created_at)'],
  array['null,to_jsonb(v_saved),v_actor) returning id into v_event_id;',
   'null,to_jsonb(v_saved),v_actor,v_instant) returning id into v_event_id;'],
  array['to_jsonb(v_existing),to_jsonb(v_saved),v_actor) returning id into v_event_id;',
   'to_jsonb(v_existing),to_jsonb(v_saved),v_actor,v_instant) returning id into v_event_id;'],
  array['k2_private.lot_is_eligible_v1(b)',
   'k2_private.lot_is_eligible_for_category_v1(b,v_depth,v_instant)'],
  array['  return v_result;',
   '  perform k2_private.clear_category_lot_context_v1();
  return v_result;']
 ] loop
  if strpos(v_definition,v_rule[1])=0 then raise exception 'K2_CATEGORY_SIGNED_LOTS_ANCHOR_MISSING';end if;
  -- Recount has two loops; only its first validation loop starts context.
  if v_rule[1]='    for v_lot in select * from jsonb_array_elements(v_payload->''lots'') loop' then
   v_definition:=overlay(v_definition placing v_rule[2] from strpos(v_definition,v_rule[1]) for length(v_rule[1]));
  else v_definition:=replace(v_definition,v_rule[1],v_rule[2]);end if;
 end loop;
 execute v_definition;
 select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
 if (to_jsonb(v_after)-'prosrc') is distinct from (to_jsonb(v_before)-'prosrc') then
  raise exception 'K2_CATEGORY_SIGNED_LOTS_METADATA_CHANGED';
 end if;
end $signed_lots$;
