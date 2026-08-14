-- K2 Jimzon Admin BOS: signed Pasabuy transition and quote boundary.
-- Prepared only. This preserves the current live state machine, makes owner
-- pricing rationale mandatory, and does not mark a quote sent or paid.
-- Depends on 20260812_admin_fulfillment_bff_boundary.sql.

begin;

do $preflight$
begin
  if to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
     or to_regclass('k2_private.admin_command_receipts') is null then
    raise exception 'Admin BFF foundation must be applied first';
  end if;
  if to_regprocedure('public.transition_pasabuy_request(uuid,text,text)') is null
     or to_regprocedure('public.save_pasabuy_quote(uuid,numeric,numeric,text,timestamp with time zone,numeric,text,numeric,numeric,numeric,numeric,numeric,timestamp with time zone)') is null then
    raise exception 'Live Pasabuy workflow functions are incomplete';
  end if;
end
$preflight$;

create or replace function public.execute_admin_pasabuy_command_v1(
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
  v_request public.pasabuy_requests;
  v_quote public.pasabuy_quotes;
  v_result jsonb;
  v_count integer;
  v_inserted integer;
  v_item_cost numeric;
  v_fx_rate numeric;
  v_weight numeric;
  v_freight_rate numeric;
  v_customs numeric;
  v_handling numeric;
  v_margin numeric;
  v_final numeric;
  v_landed numeric;
  v_fx_captured_at timestamptz;
  v_valid_until timestamptz;
begin
  if not k2_private.verify_admin_bff_request(
    p_action, p_timestamp, p_nonce, p_idempotency_key, p_payload_text, p_signature
  ) then
    raise exception using errcode='28000', message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  if p_action not in ('pasabuy_transition', 'pasabuy_quote') then
    raise exception using errcode='22023', message='K2_ADMIN_ACTION_INVALID';
  end if;

  v_payload := p_payload_text::jsonb;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
  end if;
  v_payload_hash := encode(extensions.digest(convert_to(p_payload_text, 'UTF8'), 'sha256'), 'hex');

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

  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at > now()-interval '1 minute';
  if v_count >= 30 then
    raise exception using errcode='54000', message='K2_ADMIN_RATE_LIMITED';
  end if;

  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_payload_hash) on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then
    select * into v_existing from k2_private.admin_command_receipts
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
    if v_existing.payload_hash <> v_payload_hash then
      raise exception using errcode='22023', message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.result is null then
      raise exception using errcode='55000', message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_existing.result;
  end if;

  if p_action='pasabuy_transition' then
    if (v_payload-array['requestId','toStatus','reason']) <> '{}'::jsonb
       or coalesce(v_payload->>'toStatus','') not in (
         'researching','quoted','approved','purchasing','purchased',
         'in_transit','arrived','delivered','expired','cancelled'
       )
       or length(trim(coalesce(v_payload->>'reason',''))) not between 1 and 500 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_request from public.transition_pasabuy_request(
      (v_payload->>'requestId')::uuid, v_payload->>'toStatus', trim(v_payload->>'reason')
    );
    v_result := jsonb_build_object(
      'requestId',v_request.id,'status',v_request.status,'updatedAt',v_request.updated_at
    );
  else
    if (v_payload-array[
      'requestId','itemCostForeign','fxRate','fxSource','fxCapturedAt','weightKg',
      'shippingMethod','freightRateForeignPerKg','customsTaxPercent','handlingPhp',
      'marginPercent','finalPricePhp','validUntil','priceRationale'
    ]) <> '{}'::jsonb
       or coalesce(v_payload->>'shippingMethod','') not in ('air','sea')
       or length(trim(coalesce(v_payload->>'fxSource',''))) not between 1 and 200
       or length(trim(coalesce(v_payload->>'priceRationale',''))) not between 1 and 500 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;

    v_item_cost := (v_payload->>'itemCostForeign')::numeric;
    v_fx_rate := (v_payload->>'fxRate')::numeric;
    v_weight := (v_payload->>'weightKg')::numeric;
    v_freight_rate := (v_payload->>'freightRateForeignPerKg')::numeric;
    v_customs := (v_payload->>'customsTaxPercent')::numeric;
    v_handling := (v_payload->>'handlingPhp')::numeric;
    v_margin := (v_payload->>'marginPercent')::numeric;
    v_final := (v_payload->>'finalPricePhp')::numeric;
    v_fx_captured_at := (v_payload->>'fxCapturedAt')::timestamptz;
    v_valid_until := (v_payload->>'validUntil')::timestamptz;

    if v_item_cost not between 0 and 10000000
       or v_fx_rate <= 0 or v_fx_rate > 10000
       or v_weight not between 0 and 10000
       or v_freight_rate not between 0 and 100000
       or v_customs not between 0 and 100
       or v_handling not between 0 and 100000000
       or v_margin not between 0 and 1000
       or v_final not between 0 and 100000000
       or v_fx_captured_at > now()+interval '5 minutes'
       or v_valid_until <= now() or v_valid_until > now()+interval '31 days' then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;

    v_landed := (v_item_cost*v_fx_rate)
      + (v_weight*v_freight_rate*v_fx_rate)
      + (((v_item_cost*v_fx_rate)+(v_weight*v_freight_rate*v_fx_rate))*v_customs/100)
      + v_handling;
    if v_final < v_landed then
      raise exception using errcode='22023', message='K2_ADMIN_QUOTE_BELOW_LANDED_COST';
    end if;

    select * into v_quote from public.save_pasabuy_quote(
      (v_payload->>'requestId')::uuid, v_item_cost, v_fx_rate,
      trim(v_payload->>'fxSource'), v_fx_captured_at, v_weight,
      v_payload->>'shippingMethod', v_freight_rate, v_customs,
      v_handling, v_margin, v_final, v_valid_until
    );

    insert into public.pasabuy_events(
      pasabuy_request_id,event_type,reason,actor_id,metadata
    ) values (
      v_quote.pasabuy_request_id,'quote_price_rationale',trim(v_payload->>'priceRationale'),v_actor,
      jsonb_build_object(
        'quote_id',v_quote.id,'quote_version',v_quote.version,
        'estimated_landed_cost_php',v_quote.estimated_landed_cost_php,
        'final_price_php',v_quote.final_price_php,
        'suggestion_is_advisory',true,'sent',false,'paid',false
      )
    );
    v_result := jsonb_build_object(
      'requestId',v_quote.pasabuy_request_id,'quoteId',v_quote.id,
      'version',v_quote.version,'status',v_quote.status,
      'estimatedLandedCostPhp',v_quote.estimated_landed_cost_php,
      'finalPricePhp',v_quote.final_price_php,'sent',false,'paid',false
    );
  end if;

  update k2_private.admin_command_receipts set result=v_result,completed_at=now()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;

revoke all on function public.execute_admin_pasabuy_command_v1(text,bigint,uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.execute_admin_pasabuy_command_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

notify pgrst,'reload schema';
commit;
