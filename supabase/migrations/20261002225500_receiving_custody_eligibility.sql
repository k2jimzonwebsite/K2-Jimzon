-- IDEA-20261002-10 / MAP-018/023/017/020. Prepared only; no provider apply/release.
-- Exact current receiving after recount/release/compatibility preparation.
-- Signed explicit custody for fresh finalization; historical exact receipts replay first.
-- Lot hub is canonical custody; balance/event location stays MANILA_MAIN.
-- No existing lot, physical count, reservation, publication or history is rewritten.
-- Caller UI, input-calendar parity, final installer/provider captures and recovery remain gates.
begin;
set local search_path='';
set local lock_timeout='5s';
set local statement_timeout='30s';
lock table public.consignments,public.consignment_items,public.inventory_balances,public.product_batches,
  public.products,public.hubs,public.custodians in share row exclusive mode;
do $install$
declare
  v_old pg_catalog.pg_proc%rowtype; v_cmd pg_catalog.pg_proc%rowtype; v_after pg_catalog.pg_proc%rowtype;
  v_private pg_catalog.pg_proc%rowtype; v_dependency record; v_definition text;
  v_body text:='
declare v_manifest public.consignments; v_item public.consignment_items; v_balance public.inventory_balances; v_missing integer; v_status text;
  v_saved public.product_batches; v_before_balance public.inventory_balances;
  v_sku text; v_sellable integer;
  v_today date:=(pg_catalog.transaction_timestamp() at time zone ''Asia/Manila'')::date;
begin
  if not public.is_staff() then raise exception ''Staff access required''; end if;
  if not exists(select 1 from public.hubs h join public.custodians c on c.hub_id=h.id
    where h.id=p_hub and h.id=''HUB-MNL-CENTRAL'' and h.country=''PH'' and c.id=p_custodian) then
    raise exception ''K2_RECEIVING_CUSTODY_INVALID''; end if;
  select * into v_manifest from public.consignments where id = p_consignment_id for update;
  if not found then raise exception ''Consignment not found''; end if;
  if v_manifest.status = ''Completed'' then raise exception ''K2_RECEIVING_ALREADY_COMPLETED''; end if;
  if v_manifest.status <> ''Arrived_Manila'' then raise exception ''Consignment must be in Arrived Manila state''; end if;
  if not exists (select 1 from public.consignment_items where consignment_id = p_consignment_id) then raise exception ''Cannot finalize an empty manifest''; end if;

  -- Acquire every common SKU balance before product/lot work, in SKU order.
  for v_sku in select distinct sku from public.consignment_items where consignment_id=p_consignment_id order by sku
  loop
    insert into public.inventory_balances(sku,location_code,on_hand,reserved)
    select v_sku,''MANILA_MAIN'',coalesce(sum(b.quantity),0)::integer,coalesce(sum(b.reserved_quantity),0)::integer
    from public.product_batches b where b.sku=v_sku
    on conflict(sku,location_code) do nothing;
    perform 1 from public.inventory_balances where sku=v_sku and location_code=''MANILA_MAIN'' for update;
  end loop;
  perform 1 from public.products where sku in (select sku from public.consignment_items where consignment_id=p_consignment_id)
    order by sku for update;
  for v_item in select * from public.consignment_items where consignment_id = p_consignment_id order by sku,id for update
  loop
    select * into v_before_balance from public.inventory_balances where sku=v_item.sku and location_code=''MANILA_MAIN'';
    if v_item.manila_scanned_qty > 0 then
      v_status := case when v_item.best_before_date >= v_today + 90 then ''available'' else ''quarantine'' end;
      insert into public.product_batches (
        sku, box_code, batch_code, quantity, quantity_available, reserved_quantity,
        expiry_date, best_before_date, landed_date, hub, custodian, arrival_flight,
        inventory_status, source_consignment_item_id, updated_at
      ) values (
        v_item.sku, v_item.box_code, v_item.batch_code,
        v_item.manila_scanned_qty, v_item.manila_scanned_qty, 0,
        v_item.best_before_date, v_item.best_before_date, v_today,
        p_hub, p_custodian, v_manifest.manifest_code, v_status, v_item.id, now()
      ) returning * into v_saved;
      insert into public.inventory_balances (sku, location_code, on_hand)
      values (v_item.sku, ''MANILA_MAIN'', v_item.manila_scanned_qty)
      on conflict (sku, location_code) do update set on_hand = inventory_balances.on_hand + excluded.on_hand, updated_at = now();
      select * into v_balance from public.inventory_balances where sku = v_item.sku and location_code = ''MANILA_MAIN'';
      perform set_config(''k2.allow_stock_write'', ''on'', true);
      select coalesce(sum(greatest(b.quantity-b.reserved_quantity,0)),0)::integer into v_sellable
      from public.product_batches b where b.sku=v_item.sku and k2_private.lot_is_eligible_v1(b);
      update public.products set stock_available=v_sellable,total_stock=v_sellable where sku=v_item.sku;
      insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id, metadata)
      values (v_item.sku, ''MANILA_MAIN'', ''received'', v_item.manila_scanned_qty, ''consignment'', v_manifest.id,
        p_notes, auth.uid(), jsonb_build_object(''manifest'', v_manifest.manifest_code, ''batch_code'', v_item.batch_code,
        ''box_code'', v_item.box_code, ''inventory_status'', v_saved.inventory_status,
        ''batch_id'',v_saved.id,''source_consignment_item_id'',v_item.id,''hub'',v_saved.hub,''custodian'',v_saved.custodian,
        ''quantity_available'',v_saved.quantity_available,''batch_after'',to_jsonb(v_saved),
        ''balance_before'',to_jsonb(v_before_balance),''balance_after'',to_jsonb(v_balance)));
    end if;
    v_missing := v_item.italy_packed_qty - v_item.manila_scanned_qty;
    if v_missing > 0 then
      insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id, metadata)
      values (v_item.sku, ''MANILA_MAIN'', ''reconciled'', v_missing, ''consignment'', v_manifest.id,
        p_notes, auth.uid(), jsonb_build_object(''result'', ''missing_on_arrival'', ''manifest'', v_manifest.manifest_code,
        ''batch_code'', v_item.batch_code, ''box_code'', v_item.box_code,
        ''source_consignment_item_id'',v_item.id,''hub'',p_hub,''custodian'',p_custodian,
        ''expected_qty'',v_item.expected_qty,''italy_packed_qty'',v_item.italy_packed_qty,''manila_scanned_qty'',v_item.manila_scanned_qty));
    end if;
  end loop;
  update public.consignments set status = ''Completed'', arrived_at = coalesce(arrived_at, now())
  where id = p_consignment_id returning * into v_manifest;
  return v_manifest;
end;
';
  v_command_body text:='
declare
  v_actor uuid := auth.uid();
  v_payload jsonb;
  v_payload_hash text;
  v_existing k2_private.admin_command_receipts;
  v_manifest public.consignments;
  v_item public.consignment_items;
  v_result jsonb;
  v_count integer;
  v_inserted integer;
  v_limit integer;
  v_before jsonb;
begin
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then
    raise exception using errcode=''28000'',message=''K2_ADMIN_REQUEST_REPLAYED'';
  end if;
  if p_action not in (
    ''consignment_create'',''consignment_add_line'',''consignment_scan'',
    ''consignment_advance'',''consignment_finalize''
  ) then
    raise exception using errcode=''22023'',message=''K2_ADMIN_ACTION_INVALID'';
  end if;

  v_payload := p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>''object'' then
    raise exception using errcode=''22023'',message=''K2_ADMIN_PAYLOAD_INVALID'';
  end if;
  v_payload_hash := encode(extensions.digest(convert_to(p_payload_text,''UTF8''),''sha256''),''hex'');

  select * into v_existing from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash<>v_payload_hash then
      raise exception using errcode=''22023'',message=''K2_ADMIN_IDEMPOTENCY_CONFLICT'';
    end if;
    if v_existing.result is null then
      raise exception using errcode=''55000'',message=''K2_ADMIN_COMMAND_IN_PROGRESS'';
    end if;
    return v_existing.result;
  end if;

  v_limit := case when p_action=''consignment_scan'' then 300 else 30 end;
  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval ''1 minute'';
  if v_count>=v_limit then
    raise exception using errcode=''54000'',message=''K2_ADMIN_RATE_LIMITED'';
  end if;

  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_payload_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_existing from k2_private.admin_command_receipts
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
    if v_existing.payload_hash<>v_payload_hash then
      raise exception using errcode=''22023'',message=''K2_ADMIN_IDEMPOTENCY_CONFLICT'';
    end if;
    if v_existing.result is null then
      raise exception using errcode=''55000'',message=''K2_ADMIN_COMMAND_IN_PROGRESS'';
    end if;
    return v_existing.result;
  end if;

  if p_action=''consignment_create'' then
    if (v_payload-array[''manifestCode'',''shipmentReference''])<>''{}''::jsonb
       or length(trim(coalesce(v_payload->>''manifestCode'',''''))) not between 3 and 80
       or length(trim(coalesce(v_payload->>''shipmentReference'',''''))) > 120 then
      raise exception using errcode=''22023'',message=''K2_ADMIN_PAYLOAD_INVALID'';
    end if;
    select * into v_manifest from public.create_consignment_manifest(
      trim(v_payload->>''manifestCode''),nullif(trim(v_payload->>''shipmentReference''),'''')
    );
    insert into public.audit_logs(table_name,record_id,action,new_data,user_id)
    values(''consignments'',v_manifest.id::text,''INSERT'',jsonb_build_object(
      ''manifest_code'',v_manifest.manifest_code,''shipment_reference'',v_manifest.flight_number,
      ''status'',v_manifest.status,''source'',''admin_bff''
    ),v_actor);
    v_result:=jsonb_build_object(
      ''consignmentId'',v_manifest.id,''manifestCode'',v_manifest.manifest_code,''status'',v_manifest.status
    );

  elsif p_action=''consignment_add_line'' then
    if (v_payload-array[''consignmentId'',''sku'',''batchCode'',''boxCode'',''bestBeforeDate'',''expectedQty''])<>''{}''::jsonb
       or coalesce(v_payload->>''consignmentId'','''') !~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$''
       or length(trim(coalesce(v_payload->>''sku'',''''))) not between 1 and 120
       or length(trim(coalesce(v_payload->>''batchCode'',''''))) not between 1 and 120
       or length(trim(coalesce(v_payload->>''boxCode'',''''))) not between 1 and 120
       or coalesce(v_payload->>''bestBeforeDate'','''') !~ ''^\d{4}-\d{2}-\d{2}$''
       or (v_payload->>''bestBeforeDate'')::date < current_date
       or (v_payload->>''bestBeforeDate'')::date > current_date+3653
       or jsonb_typeof(v_payload->''expectedQty'')<>''number''
       or (v_payload->>''expectedQty'')::numeric<>trunc((v_payload->>''expectedQty'')::numeric)
       or (v_payload->>''expectedQty'')::integer not between 1 and 100000
       or not exists(select 1 from public.products p where p.sku=trim(v_payload->>''sku'')) then
      raise exception using errcode=''22023'',message=''K2_ADMIN_PAYLOAD_INVALID'';
    end if;
    select * into v_item from public.add_consignment_item_v2(
      (v_payload->>''consignmentId'')::uuid,trim(v_payload->>''sku''),
      trim(v_payload->>''batchCode''),trim(v_payload->>''boxCode''),
      (v_payload->>''bestBeforeDate'')::date,(v_payload->>''expectedQty'')::integer
    );
    insert into public.audit_logs(table_name,record_id,action,new_data,user_id)
    values(''consignment_items'',v_item.id::text,''INSERT'',jsonb_build_object(
      ''consignment_id'',v_item.consignment_id,''sku'',v_item.sku,''batch_code'',v_item.batch_code,
      ''box_code'',v_item.box_code,''best_before_date'',v_item.best_before_date,
      ''expected_qty'',v_item.expected_qty,''source'',''admin_bff''
    ),v_actor);
    v_result:=jsonb_build_object(
      ''itemId'',v_item.id,''consignmentId'',v_item.consignment_id,''sku'',v_item.sku,
      ''expectedQty'',v_item.expected_qty
    );

  elsif p_action=''consignment_scan'' then
    if (v_payload-array[''consignmentId'',''itemId'',''stage'',''scannedCode''])<>''{}''::jsonb
       or coalesce(v_payload->>''consignmentId'','''') !~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$''
       or coalesce(v_payload->>''itemId'','''') !~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$''
       or coalesce(v_payload->>''stage'','''') not in (''milan'',''manila'')
       or length(trim(coalesce(v_payload->>''scannedCode'',''''))) not between 1 and 120 then
      raise exception using errcode=''22023'',message=''K2_ADMIN_PAYLOAD_INVALID'';
    end if;
    select * into v_item from public.consignment_items
    where id=(v_payload->>''itemId'')::uuid and consignment_id=(v_payload->>''consignmentId'')::uuid;
    if not found then
      raise exception using errcode=''22023'',message=''K2_ADMIN_PAYLOAD_INVALID'';
    end if;
    if lower(trim(v_payload->>''scannedCode''))<>lower(v_item.sku)
       and not exists(
         select 1 from public.products p where p.sku=v_item.sku
         and nullif(trim(p.barcode),'''') is not null
         and lower(trim(p.barcode))=lower(trim(v_payload->>''scannedCode''))
       ) then
      raise exception using errcode=''22023'',message=''K2_SCAN_CODE_MISMATCH'';
    end if;
    select * into v_item from public.record_consignment_item_scan(
      v_item.consignment_id,v_item.id,v_payload->>''stage''
    );
    v_result:=jsonb_build_object(
      ''itemId'',v_item.id,''consignmentId'',v_item.consignment_id,''sku'',v_item.sku,
      ''stage'',v_payload->>''stage'',''expectedQty'',v_item.expected_qty,
      ''italyPackedQty'',v_item.italy_packed_qty,''manilaScannedQty'',v_item.manila_scanned_qty,
      ''status'',v_item.status
    );

  elsif p_action=''consignment_advance'' then
    if (v_payload-array[''consignmentId'',''toStatus'',''reason''])<>''{}''::jsonb
       or coalesce(v_payload->>''consignmentId'','''') !~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$''
       or coalesce(v_payload->>''toStatus'','''') not in (''In_Transit'',''Arrived_Manila'')
       or length(trim(coalesce(v_payload->>''reason'',''''))) not between 10 and 500 then
      raise exception using errcode=''22023'',message=''K2_ADMIN_PAYLOAD_INVALID'';
    end if;
    select to_jsonb(c) into v_before from public.consignments c
    where c.id=(v_payload->>''consignmentId'')::uuid;
    select * into v_manifest from public.advance_consignment(
      (v_payload->>''consignmentId'')::uuid,v_payload->>''toStatus''
    );
    insert into public.audit_logs(table_name,record_id,action,old_data,new_data,user_id)
    values(''consignments'',v_manifest.id::text,''UPDATE'',v_before,jsonb_build_object(
      ''status'',v_manifest.status,''reason'',trim(v_payload->>''reason''),''source'',''admin_bff''
    ),v_actor);
    v_result:=jsonb_build_object(
      ''consignmentId'',v_manifest.id,''status'',v_manifest.status,''reasonRecorded'',true
    );

  else
    if (v_payload-array[''consignmentId'',''notes'',''hub'',''custodian''])<>''{}''::jsonb
       or jsonb_typeof(v_payload->''notes'') is distinct from ''string''
       or jsonb_typeof(v_payload->''hub'') is distinct from ''string''
       or jsonb_typeof(v_payload->''custodian'') is distinct from ''string''
       or length(trim(coalesce(v_payload->>''hub'',''''))) not between 1 and 120
       or length(trim(coalesce(v_payload->>''custodian'',''''))) not between 1 and 120
       or coalesce(v_payload->>''consignmentId'','''') !~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$''
       or length(trim(coalesce(v_payload->>''notes'',''''))) not between 10 and 1000 then
      raise exception using errcode=''22023'',message=''K2_ADMIN_PAYLOAD_INVALID'';
    end if;
    select to_jsonb(c) into v_before from public.consignments c
    where c.id=(v_payload->>''consignmentId'')::uuid;
    select * into v_manifest from k2_private.finalize_consignment_receipt_v1(
      (v_payload->>''consignmentId'')::uuid,trim(v_payload->>''notes''),trim(v_payload->>''hub''),trim(v_payload->>''custodian'')
    );
    insert into public.audit_logs(table_name,record_id,action,old_data,new_data,user_id)
    values(''consignments'',v_manifest.id::text,''UPDATE'',v_before,jsonb_build_object(
      ''status'',v_manifest.status,''receipt_notes'',trim(v_payload->>''notes''),''hub'',trim(v_payload->>''hub''),''custodian'',trim(v_payload->>''custodian''),''source'',''admin_bff''
    ),v_actor);
    v_result:=jsonb_build_object(
      ''consignmentId'',v_manifest.id,''status'',v_manifest.status,''inventoryFinalized'',true
    );
  end if;

  update k2_private.admin_command_receipts set result=v_result,completed_at=now()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end;
';
begin
  for v_dependency in select * from (values
    ('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)','a2c5d46930f6a7b69fa731c46f9358ba','{"proacl":["postgres=X/postgres"],"probin":null,"procost":100,"prokind":"f","proname":"verify_admin_bff_request","prorows":0,"pronargs":6,"proconfig":["search_path=\"\""],"proretset":false,"prosecdef":true,"prosqlbody":null,"prosupport":"-","proargmodes":null,"proargnames":["p_action","p_timestamp","p_nonce","p_idempotency_key","p_payload_text","p_signature"],"proisstrict":false,"proparallel":"u","protrftypes":null,"provariadic":"0","provolatile":"v","proleakproof":false,"proargdefaults":null,"pronargdefaults":0}'::jsonb,'plpgsql'),
    ('public.sync_product_batch_compat_columns()','7b85feb02792af76d287ba1c2114324f','{"proacl":null,"probin":null,"procost":100,"prokind":"f","proname":"sync_product_batch_compat_columns","prorows":0,"pronargs":0,"proconfig":["search_path=public, pg_temp"],"proretset":false,"prosecdef":false,"prosqlbody":null,"prosupport":"-","proargmodes":null,"proargnames":null,"proisstrict":false,"proparallel":"u","protrftypes":null,"provariadic":"0","provolatile":"v","proleakproof":false,"proargdefaults":null,"pronargdefaults":0}'::jsonb,'plpgsql'),
    ('k2_private.lot_is_eligible_v1(public.product_batches)','2339bbb8c55024babf0ea1d873e46413','{"proacl":["postgres=X/postgres"],"probin":null,"procost":100,"prokind":"f","proname":"lot_is_eligible_v1","prorows":0,"pronargs":1,"proconfig":["search_path=\"\""],"proretset":false,"prosecdef":false,"prosqlbody":null,"prosupport":"-","proargmodes":null,"proargnames":["p_lot"],"proisstrict":false,"proparallel":"u","protrftypes":null,"provariadic":"0","provolatile":"s","proleakproof":false,"proargdefaults":null,"pronargdefaults":0}'::jsonb,'sql')
  ) x(signature,body_md5,catalog,language) loop
    if not exists(select 1 from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure(v_dependency.signature)
      and pg_catalog.md5(replace(prosrc,chr(13),''))=v_dependency.body_md5 and proowner='postgres'::pg_catalog.regrole
      and (pg_catalog.to_jsonb(pg_proc)-array['prosrc','oid','pronamespace','prolang','proowner','prorettype','proargtypes','proallargtypes'])=v_dependency.catalog
      and (select lanname from pg_catalog.pg_language where oid=prolang)=v_dependency.language) then
      raise exception 'MAP-023 receiving: unfamiliar dependency'; end if;
  end loop;
  if (select count(*) from pg_catalog.pg_trigger where tgfoid=pg_catalog.to_regprocedure('public.sync_product_batch_compat_columns()'))<>1
    or not exists(select 1 from pg_catalog.pg_trigger where tgfoid=pg_catalog.to_regprocedure('public.sync_product_batch_compat_columns()')
      and tgrelid='public.product_batches'::regclass and tgname='trg_sync_product_batch_compat_columns'
      and tgtype=23 and tgenabled='O' and not tgisinternal and tgnargs=0 and tgqual is null
      and pg_catalog.octet_length(tgargs)=0 and tgconstraint=0 and not tgdeferrable and not tginitdeferred
      and pg_catalog.cardinality(tgattr::smallint[])=0 and tgnewtable is null and tgoldtable is null) then
    raise exception 'MAP-023 receiving: unfamiliar trigger binding'; end if;
  select * into v_old from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('public.finalize_consignment_receipt(uuid,text)');
  if v_old.oid is null or v_old.proowner<>'postgres'::pg_catalog.regrole
      or not v_old.prosecdef or v_old.proretset or v_old.proisstrict or v_old.proleakproof
      or v_old.prorettype<>'public.consignments'::pg_catalog.regtype
      or v_old.provolatile<>'v' or v_old.proparallel<>'u' or v_old.prosupport<>0
      or v_old.prokind<>'f' or v_old.provariadic<>0 or v_old.procost<>100 or v_old.prorows<>0
      or v_old.probin is not null or v_old.prosqlbody is not null or v_old.protrftypes is not null
      or v_old.pronargdefaults<>1 or v_old.proargmodes is not null or v_old.proallargtypes is not null
      or v_old.proconfig is distinct from array['search_path=public']::text[]
      or v_old.proargnames is distinct from array['p_consignment_id','p_notes']::text[]
      or (select lanname from pg_catalog.pg_language where oid=v_old.prolang)<>'plpgsql'
      or pg_catalog.md5(replace(v_old.prosrc,chr(13),''))<>'8fed7df5d2a6dd480afb304724ad1b8f'
      or pg_catalog.pg_get_expr(v_old.proargdefaults,0) is distinct from 'NULL::text'
      or exists(select 1 from pg_catalog.aclexplode(coalesce(v_old.proacl,pg_catalog.acldefault('f',v_old.proowner))) a
        where a.grantee not in (0,v_old.proowner) or a.grantor<>v_old.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable) then
    raise exception 'MAP-023 receiving: unfamiliar legacy finalizer'; end if;
  select * into v_cmd from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('public.execute_admin_consignment_command_v1(text,bigint,uuid,uuid,text,text)');
  if v_cmd.oid is null or v_cmd.proowner<>'postgres'::pg_catalog.regrole
      or not v_cmd.prosecdef or v_cmd.proretset or v_cmd.proisstrict or v_cmd.proleakproof
      or v_cmd.prorettype<>'jsonb'::pg_catalog.regtype
      or v_cmd.provolatile<>'v' or v_cmd.proparallel<>'u' or v_cmd.prosupport<>0
      or v_cmd.prokind<>'f' or v_cmd.provariadic<>0 or v_cmd.procost<>100 or v_cmd.prorows<>0
      or v_cmd.probin is not null or v_cmd.prosqlbody is not null or v_cmd.protrftypes is not null
      or v_cmd.pronargdefaults<>0 or v_cmd.proargmodes is not null or v_cmd.proallargtypes is not null
      or v_cmd.proconfig is distinct from array['search_path=""']::text[]
      or v_cmd.proargnames is distinct from array['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']::text[]
      or (select lanname from pg_catalog.pg_language where oid=v_cmd.prolang)<>'plpgsql' or v_cmd.proargdefaults is not null
      or pg_catalog.md5(replace(v_cmd.prosrc,chr(13),'')) not in ('7bc970a52accb40df1465ad73cc0a1cc','e59075a67c643cdc6a6a86a4f6c9eb69')
      or v_cmd.proacl is null or (select count(*) from pg_catalog.aclexplode(v_cmd.proacl))<>2
      or not exists(select 1 from pg_catalog.aclexplode(v_cmd.proacl) a where a.grantee=v_cmd.proowner)
      or not exists(select 1 from pg_catalog.aclexplode(v_cmd.proacl) a where a.grantee='authenticated'::pg_catalog.regrole)
      or exists(select 1 from pg_catalog.aclexplode(v_cmd.proacl) a
        where a.grantee not in (v_cmd.proowner,'authenticated'::pg_catalog.regrole) or a.grantor<>v_cmd.proowner
        or a.privilege_type<>'EXECUTE' or a.is_grantable) then
    raise exception 'MAP-023 receiving: unfamiliar signed command'; end if;
  select * into v_private from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)');
  if v_private.oid is not null and (v_private.proowner<>'postgres'::pg_catalog.regrole
      or not v_private.prosecdef or v_private.proretset or v_private.proisstrict or v_private.proleakproof
      or v_private.prorettype<>'public.consignments'::pg_catalog.regtype
      or v_private.provolatile<>'v' or v_private.proparallel<>'u' or v_private.prosupport<>0
      or v_private.prokind<>'f' or v_private.provariadic<>0 or v_private.procost<>100 or v_private.prorows<>0
      or v_private.probin is not null or v_private.prosqlbody is not null or v_private.protrftypes is not null
      or v_private.pronargdefaults<>0 or v_private.proargmodes is not null or v_private.proallargtypes is not null
      or v_private.proconfig is distinct from array['search_path=""']::text[]
      or v_private.proargnames is distinct from array['p_consignment_id','p_notes','p_hub','p_custodian']::text[]
      or (select lanname from pg_catalog.pg_language where oid=v_private.prolang)<>'plpgsql' or v_private.proargdefaults is not null
      or pg_catalog.md5(replace(v_private.prosrc,chr(13),''))<>'d8d3b6eb06d2b5d0e7e4edbdeb5b5101'
      or v_private.proacl is null or (select count(*) from pg_catalog.aclexplode(v_private.proacl))<>1
      or exists(select 1 from pg_catalog.aclexplode(v_private.proacl) a where a.grantee<>v_private.proowner
        or a.grantor<>v_private.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable)) then
    raise exception 'MAP-023 receiving: unfamiliar private finalizer'; end if;
  if v_private.oid is null then
    execute 'create function k2_private.finalize_consignment_receipt_v1(p_consignment_id uuid,p_notes text,p_hub text,p_custodian text)
      returns public.consignments language plpgsql security definer set search_path='''' as '||pg_catalog.quote_literal(v_body);
  end if;
  execute 'revoke all on function k2_private.finalize_consignment_receipt_v1(uuid,text,text,text) from public,anon,authenticated,service_role';
  execute 'revoke all on function public.finalize_consignment_receipt(uuid,text) from public,anon,authenticated,service_role';
  if pg_catalog.md5(replace(v_cmd.prosrc,chr(13),''))='7bc970a52accb40df1465ad73cc0a1cc' then
    v_definition:=pg_catalog.pg_get_functiondef(v_cmd.oid);
    if (length(v_definition)-length(replace(v_definition,v_cmd.prosrc,'')))/length(v_cmd.prosrc)<>1 then
      raise exception 'MAP-023 receiving: unfamiliar command body placement'; end if;
    execute replace(v_definition,v_cmd.prosrc,v_command_body);
  end if;
  select * into v_after from pg_catalog.pg_proc where oid=v_cmd.oid;
  if (pg_catalog.to_jsonb(v_after)-'prosrc') is distinct from (pg_catalog.to_jsonb(v_cmd)-'prosrc')
    or pg_catalog.md5(replace(v_after.prosrc,chr(13),''))<>'e59075a67c643cdc6a6a86a4f6c9eb69' then
    raise exception 'MAP-023 receiving: unfamiliar signed postflight'; end if;
  select * into v_after from pg_catalog.pg_proc where oid=v_old.oid;
  if (pg_catalog.to_jsonb(v_after)-'proacl') is distinct from (pg_catalog.to_jsonb(v_old)-'proacl')
    or v_after.proacl is null or (select count(*) from pg_catalog.aclexplode(v_after.proacl))<>1
    or exists(select 1 from pg_catalog.aclexplode(v_after.proacl) a where a.grantee<>v_after.proowner
      or a.grantor<>v_after.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable) then
    raise exception 'MAP-023 receiving: unfamiliar legacy ACL postflight'; end if;
  select * into v_private from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)');
  if v_private.oid is null or v_private.proowner<>'postgres'::pg_catalog.regrole
      or not v_private.prosecdef or v_private.proretset or v_private.proisstrict or v_private.proleakproof
      or v_private.prorettype<>'public.consignments'::pg_catalog.regtype
      or v_private.provolatile<>'v' or v_private.proparallel<>'u' or v_private.prosupport<>0
      or v_private.prokind<>'f' or v_private.provariadic<>0 or v_private.procost<>100 or v_private.prorows<>0
      or v_private.probin is not null or v_private.prosqlbody is not null or v_private.protrftypes is not null
      or v_private.pronargdefaults<>0 or v_private.proargmodes is not null or v_private.proallargtypes is not null
      or v_private.proconfig is distinct from array['search_path=""']::text[]
      or v_private.proargnames is distinct from array['p_consignment_id','p_notes','p_hub','p_custodian']::text[]
      or (select lanname from pg_catalog.pg_language where oid=v_private.prolang)<>'plpgsql' or v_private.proargdefaults is not null
    or pg_catalog.md5(replace(v_private.prosrc,chr(13),''))<>'d8d3b6eb06d2b5d0e7e4edbdeb5b5101'
    or v_private.proacl is null or (select count(*) from pg_catalog.aclexplode(v_private.proacl))<>1
    or exists(select 1 from pg_catalog.aclexplode(v_private.proacl) a where a.grantee<>v_private.proowner
      or a.grantor<>v_private.proowner or a.privilege_type<>'EXECUTE' or a.is_grantable) then
    raise exception 'MAP-023 receiving: unfamiliar private postflight'; end if;
end;
$install$;
commit;
