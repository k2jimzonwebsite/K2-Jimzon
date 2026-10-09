-- IDEA-20261002-05 / MAP-018. PREPARED ONLY; not a complete installer.
-- Preserve signed wrapper and closed canonical metadata; exact-body drift/replay refusal.
do $intake$
begin
declare b pg_catalog.pg_proc%rowtype;a pg_catalog.pg_proc%rowtype;v_body text:=$body$
declare
  v_payload jsonb;
  v_existing public.product_batches;
  v_saved public.product_batches;
  v_id uuid;
  v_qty integer;
  v_status text;
  v_expiry date;
  v_total integer;
  v_sellable integer;
  v_count integer := 0;
  v_depth integer;v_instant timestamptz;v_today date;
  v_context k2_private.category_lot_command_context;
  v_owned_context boolean:=false;v_event_id uuid;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'A reconciliation reason is required'; end if;
  if jsonb_typeof(p_batches) <> 'array' or jsonb_array_length(p_batches) > 200 then raise exception 'Batches must be an array of at most 200 rows'; end if;
  perform k2_private.lock_category_policy_v1(false);
  select maximum_depth into v_depth from k2_private.category_policy_command_config where singleton;
  if v_depth is null or v_depth<1 then raise exception using errcode='55000',message='K2_CATEGORY_POLICY_NOT_CONFIGURED';end if;
  -- K2_RECONCILIATION_BALANCE_FIRST_V1
  -- Conflict checks also lock: take the balance before product/FK or lot locks.
  insert into public.inventory_balances(sku,location_code,on_hand,reserved)
  select p.sku,'MANILA_MAIN',coalesce(sum(b.quantity),0)::integer,
    coalesce(sum(b.reserved_quantity),0)::integer
  from public.products p left join public.product_batches b on b.sku=p.sku
  where p.sku=p_sku group by p.sku
  on conflict(sku,location_code) do nothing;
  perform 1 from public.inventory_balances where sku=p_sku and location_code='MANILA_MAIN' for update;
  perform 1 from public.products where sku = p_sku for update;
  if not found then raise exception 'Product not found'; end if;
  perform 1 from public.product_batches where sku=p_sku order by id for update;
  if (select k2_private.effective_category_minimum_v1(p.category_id,v_depth) from public.products p where p.sku=p_sku) is null then
    raise exception using errcode='23514',message='K2_CATEGORY_POLICY_TAXONOMY_INVALID';end if;
  if exists(select 1 from k2_private.category_lot_command_context where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.pg_current_xact_id()) then
    v_context:=k2_private.current_category_lot_context_v1();
    if v_context.maximum_depth<>v_depth then raise exception using errcode='55000',message='K2_CATEGORY_CONTEXT_DEPTH_MISMATCH';end if;
    v_instant:=v_context.evaluation_instant;
  else v_instant:=k2_private.start_category_lot_context_v1(v_depth);v_owned_context:=true;end if;
  v_today:=(v_instant at time zone 'Asia/Manila')::date;

  if exists (
    select 1 from public.product_batches b where b.sku = p_sku
      and not exists (
        select 1 from jsonb_array_elements(p_batches) x
        where nullif(x ->> 'id', '')::uuid = b.id
      )
  ) then raise exception 'Existing lots cannot be removed. Set the physical count to zero with a reason so history is preserved.'; end if;

  for v_payload in select * from jsonb_array_elements(p_batches)
  loop
    begin v_qty := coalesce((v_payload ->> 'quantity')::integer, 0);
    exception when invalid_text_representation then raise exception 'Batch quantity must be a whole number'; end;
    if v_qty < 0 then raise exception 'Batch quantity cannot be negative'; end if;
    v_expiry := nullif(v_payload ->> 'expiry_date', '')::date;
    v_status := coalesce(nullif(v_payload ->> 'inventory_status', ''),
      case when v_qty = 0 then 'depleted'
           when v_expiry is null or v_expiry <= v_today + 30 then 'quarantine'
           else 'available' end);
    if v_status not in ('available', 'quarantine', 'damaged', 'expired', 'unaccounted', 'depleted') then raise exception 'Invalid inventory status'; end if;
    if v_qty > 0 and nullif(trim(coalesce(v_payload ->> 'box_code', '')), '') is null then raise exception 'Every physical lot needs a box code'; end if;

    v_id := nullif(v_payload ->> 'id', '')::uuid;
    if v_id is null then
      insert into public.product_batches (
        sku, box_code, batch_code, quantity, quantity_available, reserved_quantity,
        expiry_date, best_before_date, landed_date, hub, custodian, channel,
        is_pinned, inventory_status, updated_at
      ) values (
        p_sku, nullif(trim(v_payload ->> 'box_code'), ''), nullif(trim(v_payload ->> 'batch_code'), ''),
        v_qty, v_qty, 0, v_expiry, v_expiry,
        coalesce(nullif(v_payload ->> 'landed_date', '')::date, v_today),
        nullif(trim(v_payload ->> 'hub'), ''), nullif(trim(v_payload ->> 'custodian'), ''),
        nullif(trim(v_payload ->> 'channel'), ''), coalesce((v_payload ->> 'is_pinned')::boolean, false),
        v_status, v_instant
      ) returning * into v_saved;
      insert into public.batch_change_events (batch_id, sku, reason, old_data, new_data, actor_id,created_at)
      values (v_saved.id, p_sku, trim(p_reason), null, to_jsonb(v_saved), auth.uid(),v_instant) returning id into v_event_id;
    else
      select * into v_existing from public.product_batches where id = v_id and sku = p_sku for update;
      if not found then raise exception 'Batch % does not belong to %', v_id, p_sku; end if;
      if v_qty < v_existing.reserved_quantity then raise exception 'Batch quantity cannot be lower than its reserved quantity'; end if;
      update public.product_batches set
        box_code = nullif(trim(v_payload ->> 'box_code'), ''),
        batch_code = coalesce(nullif(trim(v_payload ->> 'batch_code'), ''), nullif(trim(v_payload ->> 'box_code'), '')),
        quantity = v_qty, quantity_available = v_qty,
        expiry_date = v_expiry, best_before_date = v_expiry,
        landed_date = coalesce(nullif(v_payload ->> 'landed_date', '')::date, landed_date),
        hub = nullif(trim(v_payload ->> 'hub'), ''), custodian = nullif(trim(v_payload ->> 'custodian'), ''),
        channel = nullif(trim(v_payload ->> 'channel'), ''),
        is_pinned = coalesce((v_payload ->> 'is_pinned')::boolean, false),
        inventory_status = v_status, updated_at = v_instant
      where id = v_id returning * into v_saved;
      insert into public.batch_change_events (batch_id, sku, reason, old_data, new_data, actor_id,created_at)
      values (v_saved.id, p_sku, trim(p_reason), to_jsonb(v_existing), to_jsonb(v_saved), auth.uid(),v_instant) returning id into v_event_id;
    end if;
    -- Event insertion can invalidate an older clearance epoch; refresh afterward.
    update public.product_batches b set quantity_available=case when k2_private.lot_is_eligible_for_category_v1(b,v_depth,v_instant) then greatest(b.quantity-b.reserved_quantity,0) else 0 end
    where b.id=v_saved.id returning * into v_saved;
    update public.batch_change_events set new_data=to_jsonb(v_saved) where id=v_event_id;
    v_count := v_count + 1;
  end loop;

  select coalesce(sum(quantity), 0)::integer,
         coalesce(sum(quantity - reserved_quantity) filter (
           where k2_private.lot_is_eligible_for_category_v1(product_batches,v_depth,v_instant)
         ), 0)::integer
  into v_total, v_sellable from public.product_batches where sku = p_sku;

  insert into public.inventory_balances (sku, location_code, on_hand)
  values (p_sku, 'MANILA_MAIN', v_total)
  on conflict (sku, location_code) do update set on_hand = excluded.on_hand, updated_at = v_instant;
  perform set_config('k2.allow_stock_write', 'on', true);
  update public.products set stock_available = v_sellable, total_stock = v_sellable where sku = p_sku;
  if v_owned_context then perform k2_private.clear_category_lot_context_v1();end if;
  return v_count;
end;
$body$;
begin
 if current_user<>'postgres' or to_regprocedure('k2_private.start_category_lot_context_v1(integer)') is null or to_regclass('k2_private.category_policy_command_config') is null then raise exception 'K2_CATEGORY_INTAKE_TARGET_INVALID';end if;
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.reconcile_product_batches(text,jsonb,text)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f' or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0 or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null or b.proallargtypes is not null or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql') or b.prorettype<>'integer'::regtype or b.proargnames is distinct from array['p_sku','p_batches','p_reason']::text[] or b.proacl::text[] is distinct from array['postgres=X/postgres']::text[] or b.proconfig is distinct from array['search_path=public']::text[] or md5(replace(b.prosrc,chr(13),''))<>'4088272efae42db31bc97c392ada82a1' then raise exception 'K2_CATEGORY_INTAKE_FUNCTION_DRIFT';end if;
 execute replace(pg_catalog.pg_get_functiondef(b.oid),b.prosrc,v_body);
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc') or a.prosrc<>v_body then raise exception 'K2_CATEGORY_INTAKE_METADATA_CHANGED';end if;
end;
declare b pg_catalog.pg_proc%rowtype;a pg_catalog.pg_proc%rowtype;v_body text:=$body$
declare
  v_session public.product_intake_sessions%rowtype;
  v_quantity integer;
  v_expiry date;
  v_unit_cost numeric;
  v_result jsonb;
  v_batches jsonb;
  v_today date;v_latest date;v_depth integer;v_instant timestamptz;
  v_batch public.product_batches;v_event_id uuid;v_event_count integer;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception using errcode = '42501', message = 'K2_STAFF_REQUIRED';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception using errcode = '42501', message = 'K2_AAL2_REQUIRED';
  end if;
  if p_source not in ('flight', 'receipt', 'reconciliation')
     or jsonb_typeof(p_inventory) <> 'object' then
    raise exception using errcode = '22023', message = 'K2_INVENTORY_SOURCE_INVALID';
  end if;

  -- Preserve authorized historical business retry before fresh entry/configuration.
  select * into v_session from public.product_intake_sessions where id=p_session_id and status='active'
    and product_id is not null and (created_by=auth.uid() or public.is_admin());
  if found and v_session.inventory_request_id=p_request_id and v_session.inventory_result is not null then
    select * into v_session from public.product_intake_sessions where id=p_session_id and status='active'
      and product_id is not null and (created_by=auth.uid() or public.is_admin()) for update;
    if not found then raise exception using errcode='42501',message='K2_INTAKE_PRODUCT_NOT_FOUND';end if;
    if v_session.inventory_request_id=p_request_id and v_session.inventory_result is not null then
      return v_session.inventory_result||jsonb_build_object('idempotent',true);end if;
    raise exception using errcode='55000',message='K2_INTAKE_RETRY_STATE_CHANGED';
  end if;
  perform k2_private.lock_category_policy_v1(false);
  select * into v_session
  from public.product_intake_sessions
  where id = p_session_id
    and status = 'active'
    and product_id is not null
    and (created_by = auth.uid() or public.is_admin())
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'K2_INTAKE_PRODUCT_NOT_FOUND';
  end if;
  if v_session.inventory_request_id = p_request_id and v_session.inventory_result is not null then
    return v_session.inventory_result || jsonb_build_object('idempotent', true);
  end if;
  if v_session.inventory_request_id is not null then
    raise exception using errcode = '23505', message = 'K2_FIRST_INVENTORY_ALREADY_RECORDED';
  end if;
  if v_session.checklist_step <> 'first_inventory' then
    raise exception using errcode = '23514', message = 'K2_INVENTORY_GATE_INCOMPLETE';
  end if;

  begin
    v_quantity := (p_inventory ->> 'quantity')::integer;
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'K2_QUANTITY_INVALID';
  end;
  if coalesce(v_quantity, 0) < 1 or v_quantity > 100000 then
    raise exception using errcode = '22023', message = 'K2_QUANTITY_INVALID';
  end if;
  begin
    v_expiry := nullif(p_inventory ->> 'expiryDate', '')::date;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception using errcode = '22023', message = 'K2_EXPIRY_INVALID';
  end;
  begin
    v_unit_cost := coalesce(nullif(p_inventory ->> 'unitCost', '')::numeric, 0);
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'K2_UNIT_COST_INVALID';
  end;
  if v_unit_cost < 0 or v_unit_cost > 10000000 then
    raise exception using errcode = '22023', message = 'K2_UNIT_COST_INVALID';
  end if;

  if p_source = 'flight' then
    if nullif(p_inventory ->> 'consignmentId', '') is null
       or nullif(trim(p_inventory ->> 'boxCode'), '') is null
       or nullif(trim(p_inventory ->> 'batchCode'), '') is null
       or v_expiry is null then
      raise exception using errcode = '22023', message = 'K2_FLIGHT_FIELDS_REQUIRED';
    end if;
    -- The manifest lock must precede this flight calendar capture.
    perform 1 from public.consignments where id=(p_inventory->>'consignmentId')::uuid for update;
    if not found then raise exception 'Consignment not found';end if;
    v_today:=(pg_catalog.clock_timestamp() at time zone 'Asia/Manila')::date;
    v_latest:=make_date(extract(year from v_today)::integer+10,extract(month from v_today)::integer,1)+extract(day from v_today)::integer-1;
    if (p_inventory ->> 'expiryDate') !~ '^\d{4}-\d{2}-\d{2}$'
       or v_expiry < v_today or v_expiry > v_latest then
      raise exception using errcode = '22023', message = 'K2_EXPIRY_INVALID';
    end if;
    select to_jsonb(public.add_consignment_item_v2(
      (p_inventory ->> 'consignmentId')::uuid,
      v_session.assigned_sku,
      trim(p_inventory ->> 'batchCode'),
      trim(p_inventory ->> 'boxCode'),
      v_expiry,
      v_quantity
    )) into v_result;
    update public.consignment_items set unit_cost = v_unit_cost
    where id = (v_result ->> 'id')::uuid;
    select to_jsonb(item) into v_result from public.consignment_items item
    where item.id = (v_result ->> 'id')::uuid;
    v_result := jsonb_build_object(
      'success', true, 'idempotent', false, 'action', 'flight_manifest_line_added',
      'manifest_line', v_result
    );
  elsif p_source = 'reconciliation' then
    if not public.is_admin() then
      raise exception using errcode = '42501', message = 'K2_ADMIN_RECONCILIATION_REQUIRED';
    end if;
    if nullif(trim(p_inventory ->> 'reason'), '') is null
       or nullif(trim(p_inventory ->> 'boxCode'), '') is null
       or nullif(trim(p_inventory ->> 'batchCode'), '') is null
       or nullif(trim(p_inventory ->> 'ownerCode'), '') is null then
      raise exception using errcode = '22023', message = 'K2_RECONCILIATION_FIELDS_REQUIRED';
    end if;
    if not exists (
         select 1 from public.hubs h
         where h.id = trim(p_inventory ->> 'hubLocation')
       ) or not exists (
         select 1 from public.custodians c
         where c.id = trim(p_inventory ->> 'custodian')
           and c.hub_id = trim(p_inventory ->> 'hubLocation')
       ) then
      raise exception using errcode = '22023', message = 'K2_RECONCILIATION_IDENTITY_INVALID';
    end if;
    select maximum_depth into v_depth from k2_private.category_policy_command_config where singleton;
    if v_depth is null or v_depth<1 then raise exception using errcode='55000',message='K2_CATEGORY_POLICY_NOT_CONFIGURED';end if;
    insert into public.inventory_balances(sku,location_code,on_hand,reserved)
      select p.sku,'MANILA_MAIN',coalesce(sum(b.quantity),0)::integer,coalesce(sum(b.reserved_quantity),0)::integer
      from public.products p left join public.product_batches b on b.sku=p.sku where p.sku=v_session.assigned_sku group by p.sku
      on conflict(sku,location_code) do nothing;
    perform 1 from public.inventory_balances where sku=v_session.assigned_sku and location_code='MANILA_MAIN' for update;
    perform 1 from public.products where sku=v_session.assigned_sku for update;
    if not found then raise exception using errcode='P0002',message='K2_PRODUCT_NOT_FOUND';end if;
    perform 1 from public.product_batches where sku=v_session.assigned_sku order by id for update;
    if (select k2_private.effective_category_minimum_v1(p.category_id,v_depth) from public.products p where p.sku=v_session.assigned_sku) is null then
      raise exception using errcode='23514',message='K2_CATEGORY_POLICY_TAXONOMY_INVALID';end if;
    v_instant:=k2_private.start_category_lot_context_v1(v_depth);
    v_today:=(v_instant at time zone 'Asia/Manila')::date;
    v_batches := jsonb_build_array(jsonb_build_object(
      'box_code', trim(p_inventory ->> 'boxCode'),
      'batch_code', trim(p_inventory ->> 'batchCode'),
      'quantity', v_quantity,
      'expiry_date', case when coalesce(p_inventory ->> 'isNonExpiry', '') = 'true'
        then null else v_expiry end,
      'hub', nullif(trim(p_inventory ->> 'hubLocation'), ''),
      'custodian', nullif(trim(p_inventory ->> 'custodian'), ''),
      'channel', 'opening_balance',
      'inventory_status', case
        when coalesce(p_inventory ->> 'isNonExpiry', '') = 'true' then 'quarantine'
        when v_expiry is not null then 'available'
        else 'quarantine' end
    ));
    perform public.reconcile_product_batches(
      v_session.assigned_sku, v_batches, trim(p_inventory ->> 'reason')
    );
    update public.product_batches set
      unit_cost = v_unit_cost,
      owner_code = trim(p_inventory ->> 'ownerCode'),
      source_type = 'opening_balance',
      updated_at = v_instant
    where id = (
      select id from public.product_batches
      where sku = v_session.assigned_sku
        and box_code = trim(p_inventory ->> 'boxCode')
        and batch_code = trim(p_inventory ->> 'batchCode')
      order by created_at desc, id desc limit 1
    ) returning * into v_batch;
    select count(*)::integer into v_event_count from public.batch_change_events where batch_id=v_batch.id and sku=v_batch.sku and actor_id=auth.uid() and created_at=v_instant;
    if v_event_count<>1 then raise exception using errcode='55000',message='K2_INTAKE_EVENT_IDENTITY_INVALID';end if;
    select id into v_event_id from public.batch_change_events where batch_id=v_batch.id and sku=v_batch.sku and actor_id=auth.uid() and created_at=v_instant;
    update public.batch_change_events set new_data=to_jsonb(v_batch) where id=v_event_id;
    perform k2_private.clear_category_lot_context_v1();
    v_result := jsonb_build_object(
      'success', true, 'idempotent', false, 'action', 'opening_balance_reconciled',
      'quantity', v_quantity
    );
  else
    raise exception using errcode = '0A000', message = 'K2_SUPPLIER_RECEIPT_WORKFLOW_UNAVAILABLE';
  end if;

  update public.product_intake_sessions set
    inventory_request_id = p_request_id,
    inventory_result = v_result,
    checklist_step = 'publication_review'
  where id = p_session_id;

  insert into public.audit_logs (
    table_name, record_id, action, old_data, new_data, user_id
  ) values (
    'product_intake_sessions', p_session_id::text, 'UPDATE',
    null,
    jsonb_build_object('operation', 'CREATE_FIRST_INVENTORY_SOURCE',
      'product_id', v_session.product_id, 'sku', v_session.assigned_sku,
      'source', p_source, 'inventory_request_id', p_request_id,
      'inventory', p_inventory, 'result', v_result),
    auth.uid()
  );
  return v_result;
end;
$body$;
begin
 if current_user<>'postgres' or to_regprocedure('k2_private.start_category_lot_context_v1(integer)') is null or to_regclass('k2_private.category_policy_command_config') is null then raise exception 'K2_CATEGORY_INTAKE_TARGET_INVALID';end if;
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.create_product_first_inventory_server(uuid,uuid,text,jsonb)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f' or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0 or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null or b.proallargtypes is not null or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql') or b.prorettype<>'jsonb'::regtype or b.proargnames is distinct from array['p_session_id','p_request_id','p_source','p_inventory']::text[] or b.proacl::text[] is distinct from array['postgres=X/postgres']::text[] or b.proconfig is distinct from array['search_path=""']::text[] or md5(replace(b.prosrc,chr(13),''))<>'1f8b31fa745a8ff858241f4bb8cf3a45' then raise exception 'K2_CATEGORY_INTAKE_FUNCTION_DRIFT';end if;
 execute replace(pg_catalog.pg_get_functiondef(b.oid),b.prosrc,v_body);
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc') or a.prosrc<>v_body then raise exception 'K2_CATEGORY_INTAKE_METADATA_CHANGED';end if;
end;
end $intake$;
