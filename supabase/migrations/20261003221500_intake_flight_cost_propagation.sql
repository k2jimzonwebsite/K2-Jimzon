-- IDEA-20261003-05 / MAP-018/020. Prepared only; no provider apply/release.
-- Canonical manifest cost -> controlled received lot; historical unknown remains NULL.
begin;
set local search_path='';
set local lock_timeout='5s';
set local statement_timeout='30s';
lock table public.consignment_items,public.product_batches in share row exclusive mode;
do $cost$
declare
  v_candidate record; v_before pg_catalog.pg_proc%rowtype; v_after pg_catalog.pg_proc%rowtype;
  v_expected_constraint text; v_constraint text; v_attribute pg_catalog.pg_attribute%rowtype;
begin
  -- Refuse body/contract drift before any lasting schema or function mutation.
  for v_candidate in select * from (values
    ('public.create_product_first_inventory_server(uuid,uuid,text,jsonb)', '4904b1980a7e8561aaaeee2761a87df3', '39dbc55e65ffb4bcdcb8b8f34955538b'),
    ('k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)', 'd8d3b6eb06d2b5d0e7e4edbdeb5b5101', '0df85cb01249dface47ded9d27f83212')
  ) c(signature,before_md5,after_md5) loop
    select * into v_before from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure(v_candidate.signature);
    if not found or not v_before.prosecdef or v_before.proretset
       or v_before.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
       or v_before.proconfig is distinct from array['search_path=""']::text[]
       or md5(replace(v_before.prosrc,chr(13),'')) not in (v_candidate.before_md5,v_candidate.after_md5) then
      raise exception 'K2_FLIGHT_COST_FUNCTION_DRIFT: %',v_candidate.signature;
    end if;
  end loop;
  select * into v_attribute from pg_catalog.pg_attribute where attrelid='public.consignment_items'::regclass
    and attname='unit_cost' and not attisdropped;
  if found and (v_attribute.atttypid<>'numeric'::regtype or v_attribute.atttypmod<>-1 or v_attribute.attnotnull
      or v_attribute.attgenerated<>'' or v_attribute.attacl is not null
      or exists(select 1 from pg_catalog.pg_attrdef where adrelid=v_attribute.attrelid and adnum=v_attribute.attnum)) then
    raise exception 'K2_FLIGHT_COST_COLUMN_DRIFT';
  end if;
  -- Use PostgreSQL's own canonical check formatting; reference is transaction-local.
  create temporary table k2_flight_cost_check_reference(unit_cost numeric check(unit_cost>=0 and unit_cost<=10000000)) on commit drop;
  select pg_catalog.pg_get_constraintdef(oid) into v_expected_constraint from pg_catalog.pg_constraint
    where conrelid='pg_temp.k2_flight_cost_check_reference'::regclass and contype='c';
  select pg_catalog.pg_get_constraintdef(oid) into v_constraint from pg_catalog.pg_constraint
    where conrelid='public.consignment_items'::regclass and conname='consignment_items_unit_cost_check';
  if found and v_constraint is distinct from v_expected_constraint then raise exception 'K2_FLIGHT_COST_CONSTRAINT_DRIFT'; end if;
  alter table public.consignment_items add column if not exists unit_cost numeric;
  if v_constraint is null then
    alter table public.consignment_items add constraint consignment_items_unit_cost_check check(unit_cost>=0 and unit_cost<=10000000);
  end if;
  for v_candidate in select * from (values
    ('public.create_product_first_inventory_server(uuid,uuid,text,jsonb)', '4904b1980a7e8561aaaeee2761a87df3', '39dbc55e65ffb4bcdcb8b8f34955538b', $body0$
declare
  v_session public.product_intake_sessions%rowtype;
  v_quantity integer;
  v_expiry date;
  v_unit_cost numeric;
  v_result jsonb;
  v_batches jsonb;
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
  exception when invalid_datetime_format then
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
        when v_expiry >= current_date + 90 then 'available'
        else 'quarantine' end
    ));
    perform public.reconcile_product_batches(
      v_session.assigned_sku, v_batches, trim(p_inventory ->> 'reason')
    );
    update public.product_batches set
      unit_cost = v_unit_cost,
      owner_code = trim(p_inventory ->> 'ownerCode'),
      source_type = 'opening_balance',
      updated_at = now()
    where id = (
      select id from public.product_batches
      where sku = v_session.assigned_sku
        and box_code = trim(p_inventory ->> 'boxCode')
        and batch_code = trim(p_inventory ->> 'batchCode')
      order by created_at desc, id desc limit 1
    );
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
$body0$::text),
    ('k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)', 'd8d3b6eb06d2b5d0e7e4edbdeb5b5101', '0df85cb01249dface47ded9d27f83212', $body1$
declare v_manifest public.consignments; v_item public.consignment_items; v_balance public.inventory_balances; v_missing integer; v_status text;
  v_saved public.product_batches; v_before_balance public.inventory_balances;
  v_sku text; v_sellable integer;
  v_today date:=(pg_catalog.transaction_timestamp() at time zone 'Asia/Manila')::date;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if not exists(select 1 from public.hubs h join public.custodians c on c.hub_id=h.id
    where h.id=p_hub and h.id='HUB-MNL-CENTRAL' and h.country='PH' and c.id=p_custodian) then
    raise exception 'K2_RECEIVING_CUSTODY_INVALID'; end if;
  select * into v_manifest from public.consignments where id = p_consignment_id for update;
  if not found then raise exception 'Consignment not found'; end if;
  if v_manifest.status = 'Completed' then raise exception 'K2_RECEIVING_ALREADY_COMPLETED'; end if;
  if v_manifest.status <> 'Arrived_Manila' then raise exception 'Consignment must be in Arrived Manila state'; end if;
  if not exists (select 1 from public.consignment_items where consignment_id = p_consignment_id) then raise exception 'Cannot finalize an empty manifest'; end if;

  -- Acquire every common SKU balance before product/lot work, in SKU order.
  for v_sku in select distinct sku from public.consignment_items where consignment_id=p_consignment_id order by sku
  loop
    insert into public.inventory_balances(sku,location_code,on_hand,reserved)
    select v_sku,'MANILA_MAIN',coalesce(sum(b.quantity),0)::integer,coalesce(sum(b.reserved_quantity),0)::integer
    from public.product_batches b where b.sku=v_sku
    on conflict(sku,location_code) do nothing;
    perform 1 from public.inventory_balances where sku=v_sku and location_code='MANILA_MAIN' for update;
  end loop;
  perform 1 from public.products where sku in (select sku from public.consignment_items where consignment_id=p_consignment_id)
    order by sku for update;
  for v_item in select * from public.consignment_items where consignment_id = p_consignment_id order by sku,id for update
  loop
    select * into v_before_balance from public.inventory_balances where sku=v_item.sku and location_code='MANILA_MAIN';
    if v_item.manila_scanned_qty > 0 then
      v_status := case when v_item.best_before_date >= v_today + 90 then 'available' else 'quarantine' end;
      insert into public.product_batches (
        sku, box_code, batch_code, quantity, quantity_available, reserved_quantity,
        expiry_date, best_before_date, landed_date, hub, custodian, arrival_flight,
        inventory_status, source_consignment_item_id, unit_cost, updated_at
      ) values (
        v_item.sku, v_item.box_code, v_item.batch_code,
        v_item.manila_scanned_qty, v_item.manila_scanned_qty, 0,
        v_item.best_before_date, v_item.best_before_date, v_today,
        p_hub, p_custodian, v_manifest.manifest_code, v_status, v_item.id, v_item.unit_cost, now()
      ) returning * into v_saved;
      insert into public.inventory_balances (sku, location_code, on_hand)
      values (v_item.sku, 'MANILA_MAIN', v_item.manila_scanned_qty)
      on conflict (sku, location_code) do update set on_hand = inventory_balances.on_hand + excluded.on_hand, updated_at = now();
      select * into v_balance from public.inventory_balances where sku = v_item.sku and location_code = 'MANILA_MAIN';
      perform set_config('k2.allow_stock_write', 'on', true);
      select coalesce(sum(greatest(b.quantity-b.reserved_quantity,0)),0)::integer into v_sellable
      from public.product_batches b where b.sku=v_item.sku and k2_private.lot_is_eligible_v1(b);
      update public.products set stock_available=v_sellable,total_stock=v_sellable where sku=v_item.sku;
      insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id, metadata)
      values (v_item.sku, 'MANILA_MAIN', 'received', v_item.manila_scanned_qty, 'consignment', v_manifest.id,
        p_notes, auth.uid(), jsonb_build_object('manifest', v_manifest.manifest_code, 'batch_code', v_item.batch_code,
        'box_code', v_item.box_code, 'inventory_status', v_saved.inventory_status,
        'batch_id',v_saved.id,'source_consignment_item_id',v_item.id,'hub',v_saved.hub,'custodian',v_saved.custodian,
        'quantity_available',v_saved.quantity_available,'batch_after',to_jsonb(v_saved),
        'balance_before',to_jsonb(v_before_balance),'balance_after',to_jsonb(v_balance)));
    end if;
    v_missing := v_item.italy_packed_qty - v_item.manila_scanned_qty;
    if v_missing > 0 then
      insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id, metadata)
      values (v_item.sku, 'MANILA_MAIN', 'reconciled', v_missing, 'consignment', v_manifest.id,
        p_notes, auth.uid(), jsonb_build_object('result', 'missing_on_arrival', 'manifest', v_manifest.manifest_code,
        'batch_code', v_item.batch_code, 'box_code', v_item.box_code,
        'source_consignment_item_id',v_item.id,'hub',p_hub,'custodian',p_custodian,
        'expected_qty',v_item.expected_qty,'italy_packed_qty',v_item.italy_packed_qty,'manila_scanned_qty',v_item.manila_scanned_qty));
    end if;
  end loop;
  update public.consignments set status = 'Completed', arrived_at = coalesce(arrived_at, now())
  where id = p_consignment_id returning * into v_manifest;
  return v_manifest;
end;
$body1$::text)
  ) c(signature,before_md5,after_md5,body) loop
    select * into v_before from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure(v_candidate.signature);
    if md5(replace(v_before.prosrc,chr(13),''))=v_candidate.before_md5 then
      execute replace(pg_catalog.pg_get_functiondef(v_before.oid),v_before.prosrc,v_candidate.body);
    end if;
    select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
    if md5(replace(v_after.prosrc,chr(13),''))<>v_candidate.after_md5
       or (to_jsonb(v_before)-'prosrc') is distinct from (to_jsonb(v_after)-'prosrc') then
      raise exception 'K2_FLIGHT_COST_CONTRACT_CHANGED: %',v_candidate.signature;
    end if;
  end loop;
end;
$cost$;
notify pgrst,'reload schema';
commit;
