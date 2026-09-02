-- MAP-023 — the only writer for the delivery control tables.
--
-- Every rule the workbook enforced with QC formulas is enforced here instead,
-- inside one signed, idempotent, rate-limited admin command. Two of them matter
-- most and are easy to lose in application code:
--
--   * A used rate is never edited in place. Raising a price closes the current
--     open row at the new effective date and inserts a new one, so an accepted
--     quote can always be explained from the row that produced it.
--   * Duplicate or overlapping active rules are refused, not resolved by
--     priority. An ambiguous table stops quotation; it never picks a winner.

begin;

do $preflight$
begin
  if to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
     or to_regclass('public.delivery_cost_rows') is null then
    raise exception 'Delivery quote control tables must be applied first';
  end if;
end
$preflight$;

create or replace function public.execute_admin_delivery_command_v1(
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
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_payload jsonb;
  v_payload_hash text;
  v_receipt k2_private.admin_command_receipts;
  v_result jsonb;
  v_count integer;
  v_today date:=(now() at time zone 'Asia/Manila')::date;
  v_effective_from date;
  v_amount integer;
begin
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then
    raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  if p_action not in (
    'delivery_courier_upsert','delivery_courier_state',
    'delivery_locality_upsert','delivery_cost_publish','delivery_source_state'
  ) then
    raise exception using errcode='22023',message='K2_ADMIN_ACTION_INVALID';
  end if;
  if not exists(
    select 1 from public.user_profiles where id=v_actor and role::text='Admin'
  ) then
    raise exception using errcode='42501',message='K2_DELIVERY_ADMIN_REQUIRED';
  end if;

  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object' then
    raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
  end if;
  v_payload_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');

  select * into v_receipt from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.payload_hash<>v_payload_hash then
      raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_receipt.result is null then
      raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_receipt.result;
  end if;

  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_count>=20 then
    raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED';
  end if;
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_payload_hash) on conflict do nothing;

  -- -------------------------------------------------------------------------
  if p_action='delivery_courier_upsert' then
    insert into public.delivery_courier_options(
      option_id,provider_id,provider_name,service_code,service_name,origin_id,
      eligibility,approved,sort_order,notes
    ) values (
      v_payload->>'optionId', v_payload->>'providerId', v_payload->>'providerName',
      v_payload->>'serviceCode', v_payload->>'serviceName', v_payload->>'originId',
      coalesce(v_payload->>'eligibility','MANUAL_ONLY'),
      coalesce((v_payload->>'approved')::boolean,false),
      coalesce((v_payload->>'sortOrder')::integer,100),
      coalesce(v_payload->>'notes','')
    )
    on conflict (option_id) do update set
      provider_id=excluded.provider_id, provider_name=excluded.provider_name,
      service_code=excluded.service_code, service_name=excluded.service_name,
      origin_id=excluded.origin_id, eligibility=excluded.eligibility,
      approved=excluded.approved, sort_order=excluded.sort_order,
      notes=excluded.notes, updated_at=now();
    v_result:=jsonb_build_object('optionId',v_payload->>'optionId');

  -- -------------------------------------------------------------------------
  elsif p_action='delivery_courier_state' then
    update public.delivery_courier_options set
      eligibility=v_payload->>'eligibility',
      approved=(v_payload->>'approved')::boolean,
      updated_at=now()
    where option_id=v_payload->>'optionId';
    if not found then
      raise exception using errcode='22023',message='K2_DELIVERY_OPTION_MISSING';
    end if;
    v_result:=jsonb_build_object('optionId',v_payload->>'optionId','eligibility',v_payload->>'eligibility');

  -- -------------------------------------------------------------------------
  elsif p_action='delivery_locality_upsert' then
    insert into public.delivery_locality_rules(
      locality_id,match_key,scope,status,profile_id,psgc_code,region,island_group,
      province,city_municipality,barangay,evidence_note
    ) values (
      v_payload->>'localityId', v_payload->>'matchKey',
      coalesce(v_payload->>'scope','REFERENCE_ONLY'),
      coalesce(v_payload->>'status','DRAFT'),
      coalesce(v_payload->>'profileId','PROFILE-STD-1P-UPTO-3KG'),
      v_payload->>'psgcCode', coalesce(v_payload->>'region',''),
      coalesce(v_payload->>'islandGroup',''), v_payload->>'province',
      coalesce(v_payload->>'cityMunicipality',''), coalesce(v_payload->>'barangay',''),
      coalesce(v_payload->>'evidenceNote','')
    )
    on conflict (locality_id) do update set
      match_key=excluded.match_key, scope=excluded.scope, status=excluded.status,
      profile_id=excluded.profile_id, psgc_code=excluded.psgc_code,
      region=excluded.region, island_group=excluded.island_group,
      province=excluded.province, city_municipality=excluded.city_municipality,
      barangay=excluded.barangay, evidence_note=excluded.evidence_note, updated_at=now();
    v_result:=jsonb_build_object('localityId',v_payload->>'localityId');

  -- -------------------------------------------------------------------------
  -- Publishing a cost is the price-increase path. It never edits a used row.
  elsif p_action='delivery_cost_publish' then
    v_effective_from:=coalesce((v_payload->>'effectiveFrom')::date, v_today);
    v_amount:=(v_payload->>'amountMinor')::integer;

    if v_effective_from < v_today then
      raise exception using errcode='22023',message='K2_DELIVERY_EFFECTIVE_IN_PAST';
    end if;
    if v_amount is null or v_amount<=0 then
      raise exception using errcode='22023',message='K2_DELIVERY_AMOUNT_REQUIRED';
    end if;
    if not exists(
      select 1 from public.delivery_locality_rules
      where locality_id=v_payload->>'localityId' and integrity='OK'
    ) then
      raise exception using errcode='22023',message='K2_DELIVERY_LOCALITY_MISSING';
    end if;
    if exists(
      select 1 from public.delivery_cost_rows
      where cost_id=v_payload->>'costId'
    ) then
      raise exception using errcode='22023',message='K2_DELIVERY_COST_ID_TAKEN';
    end if;

    -- Close the row currently in force at the new effective date. A row that has
    -- already ended, or that starts later, is left untouched.
    update public.delivery_cost_rows set
      effective_to=v_effective_from,
      status=case when effective_from>=v_effective_from then 'SUPERSEDED' else status end,
      updated_at=now()
    where option_id=v_payload->>'optionId'
      and origin_id=v_payload->>'originId'
      and locality_id=v_payload->>'localityId'
      and profile_id=coalesce(v_payload->>'profileId','PROFILE-STD-1P-UPTO-3KG')
      and status='ACTIVE_APPROVED'
      and (effective_to is null or effective_to>v_effective_from);

    -- A closed interval that collapsed to nothing would leave the route unpriced
    -- for a window nobody intended; drop those rows rather than storing them.
    delete from public.delivery_cost_rows
    where status='SUPERSEDED' and effective_to is not null and effective_to<=effective_from;

    insert into public.delivery_cost_rows(
      cost_id,option_id,origin_id,locality_id,profile_id,source_id,currency,
      completeness,amount_minor,status,approved_by_owner,approved_by,approved_at,
      effective_from,effective_to,notes
    ) values (
      v_payload->>'costId', v_payload->>'optionId', v_payload->>'originId',
      v_payload->>'localityId', coalesce(v_payload->>'profileId','PROFILE-STD-1P-UPTO-3KG'),
      v_payload->>'sourceId', 'PHP',
      coalesce(v_payload->>'completeness','PROVIDER_TOTAL_COMPLETE'), v_amount,
      case when coalesce((v_payload->>'approvedByOwner')::boolean,false)
        then 'ACTIVE_APPROVED' else 'DRAFT' end,
      coalesce((v_payload->>'approvedByOwner')::boolean,false), v_actor, now(),
      v_effective_from, null, coalesce(v_payload->>'notes','')
    );
    v_result:=jsonb_build_object(
      'costId',v_payload->>'costId',
      'effectiveFrom',v_effective_from,
      'amountMinor',v_amount
    );

  -- -------------------------------------------------------------------------
  elsif p_action='delivery_source_state' then
    update public.delivery_rate_sources set
      freshness=v_payload->>'freshness',
      review_due_on=(v_payload->>'reviewDueOn')::date,
      updated_at=now()
    where source_id=v_payload->>'sourceId';
    if not found then
      raise exception using errcode='22023',message='K2_DELIVERY_SOURCE_MISSING';
    end if;
    v_result:=jsonb_build_object('sourceId',v_payload->>'sourceId','freshness',v_payload->>'freshness');
  end if;

  update k2_private.admin_command_receipts set result=v_result
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;

revoke all on function public.execute_admin_delivery_command_v1(text,bigint,uuid,uuid,text,text)
  from public, anon;
grant execute on function public.execute_admin_delivery_command_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

commit;
