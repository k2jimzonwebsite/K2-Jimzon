-- K2 Jimzon Admin BOS: signed flight/consignment command boundary.
-- Prepared only. Apply with the Admin BFF cutover after MAP-016/MAP-017.
-- Depends on 20260812_admin_fulfillment_bff_boundary.sql.

begin;

do $preflight$
begin
  if to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
     or to_regclass('k2_private.admin_command_receipts') is null then
    raise exception 'Admin BFF foundation must be applied first';
  end if;
  if to_regprocedure('public.create_consignment_manifest(text,text)') is null
     or to_regprocedure('public.add_consignment_item_v2(uuid,text,text,text,date,integer)') is null
     or to_regprocedure('public.record_consignment_item_scan(uuid,uuid,text)') is null
     or to_regprocedure('public.advance_consignment(uuid,text)') is null
     or to_regprocedure('public.finalize_consignment_receipt(uuid,text)') is null then
    raise exception 'Live consignment workflow functions are incomplete';
  end if;
end
$preflight$;

create or replace function public.execute_admin_consignment_command_v1(
  p_action text,
  p_timestamp bigint,
  p_nonce uuid,
  p_idempotency_key uuid,
  p_payload_text text,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
    raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  if p_action not in (
    'consignment_create','consignment_add_line','consignment_scan',
    'consignment_advance','consignment_finalize'
  ) then
    raise exception using errcode='22023',message='K2_ADMIN_ACTION_INVALID';
  end if;

  v_payload := p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object' then
    raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
  end if;
  v_payload_hash := encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');

  select * into v_existing from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash<>v_payload_hash then
      raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.result is null then
      raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_existing.result;
  end if;

  v_limit := case when p_action='consignment_scan' then 300 else 30 end;
  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_count>=v_limit then
    raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED';
  end if;

  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_payload_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_existing from k2_private.admin_command_receipts
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
    if v_existing.payload_hash<>v_payload_hash then
      raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.result is null then
      raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_existing.result;
  end if;

  if p_action='consignment_create' then
    if (v_payload-array['manifestCode','shipmentReference'])<>'{}'::jsonb
       or length(trim(coalesce(v_payload->>'manifestCode',''))) not between 3 and 80
       or length(trim(coalesce(v_payload->>'shipmentReference',''))) > 120 then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_manifest from public.create_consignment_manifest(
      trim(v_payload->>'manifestCode'),nullif(trim(v_payload->>'shipmentReference'),'')
    );
    insert into public.audit_logs(table_name,record_id,action,new_data,user_id)
    values('consignments',v_manifest.id::text,'INSERT',jsonb_build_object(
      'manifest_code',v_manifest.manifest_code,'shipment_reference',v_manifest.flight_number,
      'status',v_manifest.status,'source','admin_bff'
    ),v_actor);
    v_result:=jsonb_build_object(
      'consignmentId',v_manifest.id,'manifestCode',v_manifest.manifest_code,'status',v_manifest.status
    );

  elsif p_action='consignment_add_line' then
    if (v_payload-array['consignmentId','sku','batchCode','boxCode','bestBeforeDate','expectedQty'])<>'{}'::jsonb
       or coalesce(v_payload->>'consignmentId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or length(trim(coalesce(v_payload->>'sku',''))) not between 1 and 120
       or length(trim(coalesce(v_payload->>'batchCode',''))) not between 1 and 120
       or length(trim(coalesce(v_payload->>'boxCode',''))) not between 1 and 120
       or coalesce(v_payload->>'bestBeforeDate','') !~ '^\d{4}-\d{2}-\d{2}$'
       or (v_payload->>'bestBeforeDate')::date < current_date
       or (v_payload->>'bestBeforeDate')::date > current_date+3653
       or jsonb_typeof(v_payload->'expectedQty')<>'number'
       or (v_payload->>'expectedQty')::numeric<>trunc((v_payload->>'expectedQty')::numeric)
       or (v_payload->>'expectedQty')::integer not between 1 and 100000
       or not exists(select 1 from public.products p where p.sku=trim(v_payload->>'sku')) then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_item from public.add_consignment_item_v2(
      (v_payload->>'consignmentId')::uuid,trim(v_payload->>'sku'),
      trim(v_payload->>'batchCode'),trim(v_payload->>'boxCode'),
      (v_payload->>'bestBeforeDate')::date,(v_payload->>'expectedQty')::integer
    );
    insert into public.audit_logs(table_name,record_id,action,new_data,user_id)
    values('consignment_items',v_item.id::text,'INSERT',jsonb_build_object(
      'consignment_id',v_item.consignment_id,'sku',v_item.sku,'batch_code',v_item.batch_code,
      'box_code',v_item.box_code,'best_before_date',v_item.best_before_date,
      'expected_qty',v_item.expected_qty,'source','admin_bff'
    ),v_actor);
    v_result:=jsonb_build_object(
      'itemId',v_item.id,'consignmentId',v_item.consignment_id,'sku',v_item.sku,
      'expectedQty',v_item.expected_qty
    );

  elsif p_action='consignment_scan' then
    if (v_payload-array['consignmentId','itemId','stage','scannedCode'])<>'{}'::jsonb
       or coalesce(v_payload->>'consignmentId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or coalesce(v_payload->>'itemId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or coalesce(v_payload->>'stage','') not in ('milan','manila')
       or length(trim(coalesce(v_payload->>'scannedCode',''))) not between 1 and 120 then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_item from public.consignment_items
    where id=(v_payload->>'itemId')::uuid and consignment_id=(v_payload->>'consignmentId')::uuid;
    if not found then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    if lower(trim(v_payload->>'scannedCode'))<>lower(v_item.sku)
       and not exists(
         select 1 from public.products p where p.sku=v_item.sku
         and nullif(trim(p.barcode),'') is not null
         and lower(trim(p.barcode))=lower(trim(v_payload->>'scannedCode'))
       ) then
      raise exception using errcode='22023',message='K2_SCAN_CODE_MISMATCH';
    end if;
    select * into v_item from public.record_consignment_item_scan(
      v_item.consignment_id,v_item.id,v_payload->>'stage'
    );
    v_result:=jsonb_build_object(
      'itemId',v_item.id,'consignmentId',v_item.consignment_id,'sku',v_item.sku,
      'stage',v_payload->>'stage','expectedQty',v_item.expected_qty,
      'italyPackedQty',v_item.italy_packed_qty,'manilaScannedQty',v_item.manila_scanned_qty,
      'status',v_item.status
    );

  elsif p_action='consignment_advance' then
    if (v_payload-array['consignmentId','toStatus','reason'])<>'{}'::jsonb
       or coalesce(v_payload->>'consignmentId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or coalesce(v_payload->>'toStatus','') not in ('In_Transit','Arrived_Manila')
       or length(trim(coalesce(v_payload->>'reason',''))) not between 10 and 500 then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select to_jsonb(c) into v_before from public.consignments c
    where c.id=(v_payload->>'consignmentId')::uuid;
    select * into v_manifest from public.advance_consignment(
      (v_payload->>'consignmentId')::uuid,v_payload->>'toStatus'
    );
    insert into public.audit_logs(table_name,record_id,action,old_data,new_data,user_id)
    values('consignments',v_manifest.id::text,'UPDATE',v_before,jsonb_build_object(
      'status',v_manifest.status,'reason',trim(v_payload->>'reason'),'source','admin_bff'
    ),v_actor);
    v_result:=jsonb_build_object(
      'consignmentId',v_manifest.id,'status',v_manifest.status,'reasonRecorded',true
    );

  else
    if (v_payload-array['consignmentId','notes'])<>'{}'::jsonb
       or coalesce(v_payload->>'consignmentId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or length(trim(coalesce(v_payload->>'notes',''))) not between 10 and 1000 then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select to_jsonb(c) into v_before from public.consignments c
    where c.id=(v_payload->>'consignmentId')::uuid;
    select * into v_manifest from public.finalize_consignment_receipt(
      (v_payload->>'consignmentId')::uuid,trim(v_payload->>'notes')
    );
    insert into public.audit_logs(table_name,record_id,action,old_data,new_data,user_id)
    values('consignments',v_manifest.id::text,'UPDATE',v_before,jsonb_build_object(
      'status',v_manifest.status,'receipt_notes',trim(v_payload->>'notes'),'source','admin_bff'
    ),v_actor);
    v_result:=jsonb_build_object(
      'consignmentId',v_manifest.id,'status',v_manifest.status,'inventoryFinalized',true
    );
  end if;

  update k2_private.admin_command_receipts set result=v_result,completed_at=now()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;

revoke all on function public.execute_admin_consignment_command_v1(text,bigint,uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.execute_admin_consignment_command_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

-- Coordinated cutover: direct browser mutations must no longer bypass the
-- signed command, durable receipt, and rate boundary.
revoke execute on function public.create_consignment_manifest(text,text) from authenticated;
revoke execute on function public.add_consignment_item_v2(uuid,text,text,text,date,integer) from authenticated;
revoke execute on function public.record_consignment_item_scan(uuid,uuid,text) from authenticated;
revoke execute on function public.advance_consignment(uuid,text) from authenticated;
revoke execute on function public.finalize_consignment_receipt(uuid,text) from authenticated;

notify pgrst,'reload schema';
commit;
