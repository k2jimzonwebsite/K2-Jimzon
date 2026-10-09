-- IDEA-20261003-06 / MAP-018/020. Prepared only, no provider activation.
-- Fresh flight source uses Manila calendar; stable existing inventory replay precedes date checks.
begin;
set local search_path='';
set local lock_timeout='5s';
set local statement_timeout='30s';
lock table public.product_intake_sessions,public.consignment_items in share row exclusive mode;
do $calendar$
declare v_before pg_catalog.pg_proc%rowtype; v_after pg_catalog.pg_proc%rowtype;
  v_body text := $candidate$
declare
  v_session public.product_intake_sessions%rowtype;
  v_quantity integer;
  v_expiry date;
  v_unit_cost numeric;
  v_result jsonb;
  v_batches jsonb;
  v_today date := (transaction_timestamp() at time zone 'Asia/Manila')::date;
  v_latest date := make_date(extract(year from v_today)::integer+10,
    extract(month from v_today)::integer,1)+extract(day from v_today)::integer-1;
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
$candidate$;
begin
  select * into v_before from pg_catalog.pg_proc
  where oid=pg_catalog.to_regprocedure('public.create_product_first_inventory_server(uuid,uuid,text,jsonb)');
  if not found or not v_before.prosecdef or v_before.proretset
    or v_before.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
    or v_before.proconfig is distinct from array['search_path=""']::text[]
    or md5(replace(v_before.prosrc,chr(13),'')) not in ('39dbc55e65ffb4bcdcb8b8f34955538b','1f8b31fa745a8ff858241f4bb8cf3a45') then
    raise exception 'K2_INTAKE_CALENDAR_FUNCTION_DRIFT';
  end if;
  if md5(replace(v_before.prosrc,chr(13),''))='39dbc55e65ffb4bcdcb8b8f34955538b' then
    execute replace(pg_catalog.pg_get_functiondef(v_before.oid),v_before.prosrc,v_body);
  end if;
  select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
  if md5(replace(v_after.prosrc,chr(13),''))<>'1f8b31fa745a8ff858241f4bb8cf3a45'
    or (to_jsonb(v_before)-'prosrc') is distinct from (to_jsonb(v_after)-'prosrc') then
    raise exception 'K2_INTAKE_CALENDAR_CONTRACT_CHANGED';
  end if;
end;
$calendar$;
notify pgrst,'reload schema';
commit;
