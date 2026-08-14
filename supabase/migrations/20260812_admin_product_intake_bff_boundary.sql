-- K2 Jimzon Admin BOS: signed phone-first product-intake command boundary.
-- Prepared only. Depends on the MAP-018 intake migration and Admin BFF
-- foundation. Private evidence upload/decode validation remains a separate gate.

begin;

do $preflight$
begin
  if to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
     or to_regclass('k2_private.admin_command_receipts') is null then
    raise exception 'Admin BFF foundation must be applied first';
  end if;
  if to_regclass('public.product_intake_sessions') is null
     or to_regprocedure('public.create_product_draft_server(uuid,uuid,jsonb,jsonb)') is null
     or to_regprocedure('public.create_product_first_inventory_server(uuid,uuid,text,jsonb)') is null
     or to_regprocedure('public.transition_product_publication_server(uuid,text)') is null then
    raise exception 'MAP-018 product intake foundation must be applied first';
  end if;
end
$preflight$;

create or replace function public.execute_admin_product_intake_command_v1(
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
  v_patch jsonb;
  v_payload_hash text;
  v_existing k2_private.admin_command_receipts;
  v_session public.product_intake_sessions;
  v_result jsonb;
  v_recent_count integer;
  v_inserted integer;
  v_limit integer;
  v_source text;
  v_inventory jsonb;
  v_quantity integer;
  v_unit_cost numeric;
begin
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then
    raise exception using errcode='28000', message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  if p_action not in (
    'intake_session_create','intake_session_step','intake_draft',
    'intake_inventory','intake_publication','intake_evidence_register'
  ) then
    raise exception using errcode='22023', message='K2_ADMIN_ACTION_INVALID';
  end if;
  v_payload := p_payload_text::jsonb;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
  end if;
  v_payload_hash := encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');

  select * into v_existing from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash <> v_payload_hash then
      raise exception using errcode='22023', message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.result is null then
      raise exception using errcode='55000', message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_existing.result;
  end if;

  v_limit := case when p_action='intake_session_step' then 120 else 30 end;
  select count(*)::integer into v_recent_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_recent_count>=v_limit then
    raise exception using errcode='54000', message='K2_ADMIN_RATE_LIMITED';
  end if;

  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_payload_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_existing from k2_private.admin_command_receipts
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
    if v_existing.payload_hash<>v_payload_hash then
      raise exception using errcode='22023', message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.result is null then
      raise exception using errcode='55000', message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_existing.result;
  end if;

  if p_action='intake_evidence_register' then
    if (v_payload-array[
      'sessionId','slot','path','fileName','size','type','width','height','sha256'
    ])<>'{}'::jsonb
       or coalesce(v_payload->>'slot','') not in ('PRIMARY','BACK','BARCODE')
       or coalesce(v_payload->>'type','') not in ('image/jpeg','image/png','image/webp')
       or (v_payload->>'size')::integer not between 1 and 10485760
       or (v_payload->>'width')::integer not between 100 and 12000
       or (v_payload->>'height')::integer not between 100 and 12000
       or (v_payload->>'width')::bigint*(v_payload->>'height')::bigint>40000000
       or coalesce(v_payload->>'sha256','')!~'^[0-9a-f]{64}$'
       or coalesce(v_payload->>'sessionId','')!~'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or length(coalesce(v_payload->>'fileName',''))>120
       or v_payload->>'path' !~ ('^'||v_actor::text||'/'||(v_payload->>'sessionId')||'/'||lower(v_payload->>'slot')||'-[0-9a-f-]{36}-[0-9a-f]{16}[.](jpg|png|webp)$') then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_session from public.product_intake_sessions
    where id=(v_payload->>'sessionId')::uuid and status='active'
      and (created_by=v_actor or public.is_admin()) for update;
    if not found then
      raise exception using errcode='42501', message='K2_INTAKE_SESSION_NOT_FOUND';
    end if;
    update public.product_intake_sessions set packaging_images=(
      select coalesce(jsonb_agg(item),'[]'::jsonb)
      from jsonb_array_elements(packaging_images) item
      where item->>'slot'<>v_payload->>'slot'
    )||jsonb_build_array(jsonb_build_object(
      'slot',v_payload->>'slot','path',v_payload->>'path','name',v_payload->>'fileName',
      'size',(v_payload->>'size')::integer,'type',v_payload->>'type',
      'width',(v_payload->>'width')::integer,'height',(v_payload->>'height')::integer,
      'sha256',v_payload->>'sha256','upload_status','uploaded','uploaded_at',now()
    )) where id=v_session.id returning * into v_session;
    v_result:=jsonb_build_object(
      'sessionId',v_session.id,'slot',v_payload->>'slot','path',v_payload->>'path',
      'size',(v_payload->>'size')::integer,'type',v_payload->>'type',
      'width',(v_payload->>'width')::integer,'height',(v_payload->>'height')::integer,
      'sha256',v_payload->>'sha256','uploadStatus','uploaded'
    );

  elsif p_action='intake_session_create' then
    if (v_payload-array['requestId','barcode','scannedIdentity'])<>'{}'::jsonb
       or length(coalesce(v_payload->>'barcode',''))>32
       or length(coalesce(v_payload->>'scannedIdentity',''))>240 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    insert into public.product_intake_sessions(
      request_id,barcode,scanned_identity,checklist_step,packaging_images,
      draft_payload,field_decisions,field_provenance,unknown_fields,created_by
    ) values (
      (v_payload->>'requestId')::uuid,nullif(v_payload->>'barcode',''),
      coalesce(v_payload->>'scannedIdentity',''),'identify','[]'::jsonb,
      '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::text[],v_actor
    ) on conflict(request_id) do nothing;
    select * into v_session from public.product_intake_sessions
    where request_id=(v_payload->>'requestId')::uuid
      and (created_by=v_actor or public.is_admin());
    if not found then
      raise exception using errcode='23505', message='K2_INTAKE_REQUEST_CONFLICT';
    end if;
    v_result:=jsonb_build_object(
      'sessionId',v_session.id,'requestId',v_session.request_id,
      'step',v_session.checklist_step,'status',v_session.status
    );

  elsif p_action='intake_session_step' then
    if (v_payload-array['sessionId','step','patch'])<>'{}'::jsonb
       or coalesce(v_payload->>'step','') not in (
         'identify','packaging_evidence','research_handoff','field_review',
         'draft_saved','first_inventory','publication_review','completed'
       ) or jsonb_typeof(v_payload->'patch')<>'object' then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_patch:=v_payload->'patch';
    if (v_patch-array[
      'barcode','scannedIdentity','categoryType','evidenceChecklist',
      'draftPayload','fieldDecisions','fieldProvenance','unknownFields'
    ])<>'{}'::jsonb
       or (v_patch?'barcode' and length(coalesce(v_patch->>'barcode',''))>32)
       or (v_patch?'scannedIdentity' and length(coalesce(v_patch->>'scannedIdentity',''))>240)
       or (v_patch?'categoryType' and nullif(coalesce(v_patch->>'categoryType',''),'') is not null
         and coalesce(v_patch->>'categoryType','') not in ('food','beauty','household'))
       or (v_patch?'evidenceChecklist' and (jsonb_typeof(v_patch->'evidenceChecklist')<>'object' or octet_length((v_patch->'evidenceChecklist')::text)>8192))
       or (v_patch?'draftPayload' and (jsonb_typeof(v_patch->'draftPayload')<>'object' or octet_length((v_patch->'draftPayload')::text)>131072))
       or (v_patch?'fieldDecisions' and (jsonb_typeof(v_patch->'fieldDecisions')<>'object' or octet_length((v_patch->'fieldDecisions')::text)>32768))
       or (v_patch?'fieldProvenance' and (jsonb_typeof(v_patch->'fieldProvenance')<>'object' or octet_length((v_patch->'fieldProvenance')::text)>32768))
       or (v_patch?'unknownFields' and (
         jsonb_typeof(v_patch->'unknownFields')<>'array'
         or jsonb_array_length(v_patch->'unknownFields')>100
         or exists(select 1 from jsonb_array_elements_text(v_patch->'unknownFields') item where length(item)>200)
       )) then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_session from public.product_intake_sessions
    where id=(v_payload->>'sessionId')::uuid and status='active'
      and (created_by=v_actor or public.is_admin()) for update;
    if not found then
      raise exception using errcode='42501', message='K2_INTAKE_SESSION_NOT_FOUND';
    end if;
    if not (
      v_session.checklist_step=v_payload->>'step'
      or (v_session.checklist_step,v_payload->>'step') in (
        ('identify','packaging_evidence'),
        ('packaging_evidence','research_handoff'),
        ('research_handoff','field_review'),
        ('field_review','draft_saved')
      )
    ) then
      raise exception using errcode='23514', message='K2_INTAKE_STEP_INVALID';
    end if;
    update public.product_intake_sessions set
      checklist_step=v_payload->>'step',
      barcode=case when v_patch?'barcode' then nullif(v_patch->>'barcode','') else barcode end,
      scanned_identity=case when v_patch?'scannedIdentity' then coalesce(v_patch->>'scannedIdentity','') else scanned_identity end,
      category_type=case when v_patch?'categoryType' then nullif(v_patch->>'categoryType','') else category_type end,
      evidence_checklist=case when v_patch?'evidenceChecklist' then v_patch->'evidenceChecklist' else evidence_checklist end,
      draft_payload=case when v_patch?'draftPayload' then v_patch->'draftPayload' else draft_payload end,
      field_decisions=case when v_patch?'fieldDecisions' then v_patch->'fieldDecisions' else field_decisions end,
      field_provenance=case when v_patch?'fieldProvenance' then v_patch->'fieldProvenance' else field_provenance end,
      unknown_fields=case when v_patch?'unknownFields' then array(select jsonb_array_elements_text(v_patch->'unknownFields')) else unknown_fields end
    where id=v_session.id returning * into v_session;
    v_result:=jsonb_build_object('sessionId',v_session.id,'step',v_session.checklist_step,'updatedAt',v_session.updated_at);

  elsif p_action='intake_draft' then
    if (v_payload-array['sessionId','requestId','reviewedPayload','fieldDecisions'])<>'{}'::jsonb
       or jsonb_typeof(v_payload->'reviewedPayload')<>'object'
       or jsonb_typeof(v_payload->'fieldDecisions')<>'object'
       or octet_length((v_payload->'reviewedPayload')::text)>131072
       or octet_length((v_payload->'fieldDecisions')::text)>32768 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_result:=public.create_product_draft_server(
      (v_payload->>'sessionId')::uuid,(v_payload->>'requestId')::uuid,
      v_payload->'reviewedPayload',v_payload->'fieldDecisions'
    );

  elsif p_action='intake_inventory' then
    if (v_payload-array['sessionId','inventoryRequestId','source','inventory'])<>'{}'::jsonb
       or coalesce(v_payload->>'source','') not in ('flight','reconciliation')
       or jsonb_typeof(v_payload->'inventory')<>'object' then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_source:=v_payload->>'source';
    v_inventory:=v_payload->'inventory';
    if (v_source='flight' and (v_inventory-array[
         'quantity','boxCode','batchCode','expiryDate','isNonExpiry','unitCost','consignmentId'
       ])<>'{}'::jsonb)
       or (v_source='reconciliation' and (v_inventory-array[
         'quantity','boxCode','batchCode','expiryDate','isNonExpiry','unitCost',
         'ownerCode','hubLocation','custodian','reason'
       ])<>'{}'::jsonb) then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_quantity:=(v_inventory->>'quantity')::integer;
    v_unit_cost:=(v_inventory->>'unitCost')::numeric;
    if v_quantity not between 1 and 100000
       or v_unit_cost not between 0 and 10000000
       or jsonb_typeof(v_inventory->'isNonExpiry')<>'boolean'
       or length(trim(coalesce(v_inventory->>'boxCode',''))) not between 1 and 120
       or length(trim(coalesce(v_inventory->>'batchCode',''))) not between 1 and 120
       or (coalesce((v_inventory->>'isNonExpiry')::boolean,false)=false and nullif(v_inventory->>'expiryDate','') is null)
       or (v_source='flight' and (v_inventory->>'isNonExpiry')::boolean=true)
       or (v_source='reconciliation' and (
         length(trim(coalesce(v_inventory->>'ownerCode',''))) not between 1 and 120
         or length(trim(coalesce(v_inventory->>'hubLocation',''))) not between 1 and 120
         or length(trim(coalesce(v_inventory->>'custodian',''))) not between 1 and 120
         or length(trim(coalesce(v_inventory->>'reason',''))) not between 1 and 1000
       )) then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_result:=public.create_product_first_inventory_server(
      (v_payload->>'sessionId')::uuid,(v_payload->>'inventoryRequestId')::uuid,
      v_source,v_inventory
    );

  else
    if (v_payload-array['sessionId','requestedStatus','reason'])<>'{}'::jsonb
       or coalesce(v_payload->>'requestedStatus','') not in ('draft','under_review','live','unlisted','discontinued')
       or length(trim(coalesce(v_payload->>'reason',''))) not between 1 and 500 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_result:=public.transition_product_publication_server(
      (v_payload->>'sessionId')::uuid,v_payload->>'requestedStatus'
    );
    insert into public.audit_logs(table_name,record_id,action,old_data,new_data,user_id)
    values(
      'products',v_result->>'product_id','PRODUCT_PUBLICATION_REASON',null,
      jsonb_build_object(
        'intake_session_id',v_payload->>'sessionId',
        'requested_status',v_payload->>'requestedStatus',
        'reason',trim(v_payload->>'reason')
      ),v_actor
    );
  end if;

  update k2_private.admin_command_receipts set result=v_result,completed_at=now()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;

revoke all on function public.execute_admin_product_intake_command_v1(text,bigint,uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.execute_admin_product_intake_command_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

notify pgrst,'reload schema';
commit;
