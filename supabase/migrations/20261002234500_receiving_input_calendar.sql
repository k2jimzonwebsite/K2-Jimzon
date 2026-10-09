-- IDEA-20261002-10 / MAP-018/023/017/020. Prepared only; unapplied/unreleased.
-- Align fresh signed receiving input with Manila today and the existing BFF ten-year
-- ceiling (February 29 rolls to March 1). Exact historical receipts still replay first.
-- Body-only guarded replacement; no stock, custody, history, cache or publication rewrite.
begin;
set local search_path='';
set local lock_timeout='5s';
set local statement_timeout='30s';
lock table public.consignments,public.consignment_items in share row exclusive mode;
do $install$
declare
  v_command pg_catalog.pg_proc%rowtype; v_after pg_catalog.pg_proc%rowtype;
  v_dependency record; v_definition text;
  v_body text := '
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
  v_today date := (transaction_timestamp() at time zone ''Asia/Manila'')::date;
  v_latest date := make_date(extract(year from v_today)::integer+10,
    extract(month from v_today)::integer,1)+extract(day from v_today)::integer-1;
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
       or (v_payload->>''bestBeforeDate'')::date < v_today
       or (v_payload->>''bestBeforeDate'')::date > v_latest
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
    ('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)','a2c5d46930f6a7b69fa731c46f9358ba','{"proacl":["postgres=X/postgres"],"probin":null,"procost":100,"prokind":"f","proname":"verify_admin_bff_request","prorows":0,"pronargs":6,"proconfig":["search_path=\"\""],"proretset":false,"prosecdef":true,"prosqlbody":null,"prosupport":"-","proargmodes":null,"proargnames":["p_action","p_timestamp","p_nonce","p_idempotency_key","p_payload_text","p_signature"],"proisstrict":false,"proparallel":"u","protrftypes":null,"provariadic":"0","provolatile":"v","proleakproof":false,"proargdefaults":null,"pronargdefaults":0}'::jsonb,'boolean','plpgsql'),
    ('public.add_consignment_item_v2(uuid,text,text,text,date,integer)','c51e7370ce51dff34fad1a79f2600fe5','{"proacl":["postgres=X/postgres"],"probin":null,"procost":100,"prokind":"f","proname":"add_consignment_item_v2","prorows":0,"pronargs":6,"proconfig":["search_path=public"],"proretset":false,"prosecdef":true,"prosqlbody":null,"prosupport":"-","proargmodes":null,"proargnames":["p_consignment_id","p_sku","p_batch_code","p_box_code","p_best_before_date","p_expected_qty"],"proisstrict":false,"proparallel":"u","protrftypes":null,"provariadic":"0","provolatile":"v","proleakproof":false,"proargdefaults":null,"pronargdefaults":0}'::jsonb,'public.consignment_items','plpgsql'),
    ('public.sync_product_batch_compat_columns()','7b85feb02792af76d287ba1c2114324f','{"proacl":null,"probin":null,"procost":100,"prokind":"f","proname":"sync_product_batch_compat_columns","prorows":0,"pronargs":0,"proconfig":["search_path=public, pg_temp"],"proretset":false,"prosecdef":false,"prosqlbody":null,"prosupport":"-","proargmodes":null,"proargnames":null,"proisstrict":false,"proparallel":"u","protrftypes":null,"provariadic":"0","provolatile":"v","proleakproof":false,"proargdefaults":null,"pronargdefaults":0}'::jsonb,'trigger','plpgsql'),
    ('k2_private.lot_is_eligible_v1(public.product_batches)','2339bbb8c55024babf0ea1d873e46413','{"proacl":["postgres=X/postgres"],"probin":null,"procost":100,"prokind":"f","proname":"lot_is_eligible_v1","prorows":0,"pronargs":1,"proconfig":["search_path=\"\""],"proretset":false,"prosecdef":false,"prosqlbody":null,"prosupport":"-","proargmodes":null,"proargnames":["p_lot"],"proisstrict":false,"proparallel":"u","protrftypes":null,"provariadic":"0","provolatile":"s","proleakproof":false,"proargdefaults":null,"pronargdefaults":0}'::jsonb,'boolean','sql'),
    ('k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)','d8d3b6eb06d2b5d0e7e4edbdeb5b5101','{"proacl":["postgres=X/postgres"],"probin":null,"procost":100,"prokind":"f","proname":"finalize_consignment_receipt_v1","prorows":0,"pronargs":4,"proconfig":["search_path=\"\""],"proretset":false,"prosecdef":true,"prosqlbody":null,"prosupport":"-","proargmodes":null,"proargnames":["p_consignment_id","p_notes","p_hub","p_custodian"],"proisstrict":false,"proparallel":"u","protrftypes":null,"provariadic":"0","provolatile":"v","proleakproof":false,"proargdefaults":null,"pronargdefaults":0}'::jsonb,'public.consignments','plpgsql')
  ) x(signature,body_md5,catalog,return_type,language) loop
    if not exists(select 1 from pg_catalog.pg_proc p where oid=pg_catalog.to_regprocedure(v_dependency.signature)
      and pg_catalog.md5(replace(prosrc,chr(13),''))=v_dependency.body_md5
      and proowner='postgres'::pg_catalog.regrole and prorettype=pg_catalog.to_regtype(v_dependency.return_type)
      and (pg_catalog.to_jsonb(p)-array['prosrc','oid','pronamespace','prolang','proowner','prorettype','proargtypes','proallargtypes'])=v_dependency.catalog
      and (select lanname from pg_catalog.pg_language where oid=prolang)=v_dependency.language) then
      raise exception 'MAP-023 calendar: unfamiliar dependency'; end if;
  end loop;
  select * into v_command from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('public.execute_admin_consignment_command_v1(text,bigint,uuid,uuid,text,text)');
  if v_command.oid is null or v_command.proowner<>'postgres'::pg_catalog.regrole
    or v_command.prorettype<>'jsonb'::pg_catalog.regtype
    or (select lanname from pg_catalog.pg_language where oid=v_command.prolang)<>'plpgsql'
    or (pg_catalog.to_jsonb(v_command)-array['prosrc','oid','pronamespace','prolang','proowner','prorettype','proargtypes','proallargtypes'])<>'{"proacl":["postgres=X/postgres","authenticated=X/postgres"],"probin":null,"procost":100,"prokind":"f","proname":"execute_admin_consignment_command_v1","prorows":0,"pronargs":6,"proconfig":["search_path=\"\""],"proretset":false,"prosecdef":true,"prosqlbody":null,"prosupport":"-","proargmodes":null,"proargnames":["p_action","p_timestamp","p_nonce","p_idempotency_key","p_payload_text","p_signature"],"proisstrict":false,"proparallel":"u","protrftypes":null,"provariadic":"0","provolatile":"v","proleakproof":false,"proargdefaults":null,"pronargdefaults":0}'::jsonb
    or pg_catalog.md5(replace(v_command.prosrc,chr(13),'')) not in ('e59075a67c643cdc6a6a86a4f6c9eb69','623e5ab404618196ac98a043134d7071') then
    raise exception 'MAP-023 calendar: unfamiliar signed command'; end if;
  if pg_catalog.md5(replace(v_command.prosrc,chr(13),''))='e59075a67c643cdc6a6a86a4f6c9eb69' then
    v_definition:=pg_catalog.pg_get_functiondef(v_command.oid);
    if (length(v_definition)-length(replace(v_definition,v_command.prosrc,'')))/length(v_command.prosrc)<>1 then
      raise exception 'MAP-023 calendar: unfamiliar body placement'; end if;
    execute replace(v_definition,v_command.prosrc,v_body);
  end if;
  select * into v_after from pg_catalog.pg_proc where oid=v_command.oid;
  if (pg_catalog.to_jsonb(v_after)-'prosrc') is distinct from (pg_catalog.to_jsonb(v_command)-'prosrc')
    or pg_catalog.md5(replace(v_after.prosrc,chr(13),''))<>'623e5ab404618196ac98a043134d7071' then
    raise exception 'MAP-023 calendar: unfamiliar postflight'; end if;
end;
$install$;
commit;
