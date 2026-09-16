-- MAP-023 §16 / AUD-OPS-001. Prepared only; MAP-017/OWNER-005 and coordinated BFF cutover required.
-- Sequence: after 20260908_payment_balance_integrity.sql.
begin;

alter table public.order_requests
  add column if not exists payment_evidence jsonb not null default '{}'::jsonb;

create or replace function public.set_order_request_payment_status(
  p_order_request_id uuid,
  p_to_status text,
  p_evidence_note text,
  p_payment_evidence jsonb
)
returns public.order_requests
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.order_requests;
  v_from text;
  v_submitter uuid;
  v_structured_evidence jsonb := '{}'::jsonb;
  v_method text;
  v_amount numeric;
  v_currency text;
  v_payer_name text;
  v_payment_reference text;
  v_proof_asset_ref text;
begin
  if not public.is_staff() or auth.uid() is null
     or coalesce(auth.jwt()->>'aal','') <> 'aal2' then
    raise exception using errcode='42501', message='K2_ADMIN_AAL2_REQUIRED';
  end if;

  select * into v_order from public.order_requests where id=p_order_request_id for update;
  if not found then raise exception using errcode='23514', message='K2_PAYMENT_ORDER_INELIGIBLE'; end if;
  v_from := v_order.payment_status;
  if p_to_status = v_from then return v_order; end if;

  if not coalesce((
    (v_from='not_requested' and p_to_status='awaiting_instructions') or
    (v_from='awaiting_instructions' and p_to_status in ('evidence_submitted','failed')) or
    (v_from='evidence_submitted' and p_to_status in ('verified','failed')) or
    (v_from='failed' and p_to_status='evidence_submitted') or
    (v_from='verified' and p_to_status='refunded')
  ), false) then
    raise exception using errcode='23514', message='K2_PAYMENT_TRANSITION_INVALID';
  end if;

  if length(trim(coalesce(p_evidence_note,''))) > 1000 or
     (p_to_status not in ('awaiting_instructions', 'evidence_submitted') and nullif(trim(coalesce(p_evidence_note,'')),'') is null) then
    raise exception using errcode='23514', message='K2_PAYMENT_EVIDENCE_REQUIRED';
  end if;

  -- Refund reconciliation remains available for a verified cancelled/fulfilled order;
  -- all new attempts and collection/verification require an open order.
  if p_to_status <> 'refunded' and v_order.status not in ('submitted','confirmed') then
    raise exception using errcode='23514', message='K2_PAYMENT_ORDER_INELIGIBLE';
  end if;

  if p_to_status in ('evidence_submitted','verified') then
    -- K2_PAYMENT_BALANCE_INTEGRITY_V1
    perform 1 from public.order_request_items where order_request_id=v_order.id order by id for update;
    perform 1 from public.inventory_balances b where b.location_code='MANILA_MAIN'
      and b.sku in (select sku from public.order_request_items where order_request_id=v_order.id)
      order by b.sku for update;
    perform 1 from public.inventory_reservations where order_request_id=v_order.id order by sku,batch_id,id for update;
    perform 1 from public.product_batches b where b.id in (
      select batch_id from public.inventory_reservations where order_request_id=v_order.id and status='active'
    ) order by b.sku,b.id for update;

    if exists (
      select 1 from public.order_request_items i
      left join public.inventory_balances b on b.sku=i.sku and b.location_code='MANILA_MAIN'
      where i.order_request_id=v_order.id and (
        b.sku is null or b.reserved is null or b.on_hand is null
        or b.reserved<0 or b.reserved>b.on_hand
        or b.reserved<(select coalesce(sum(r.quantity),0) from public.inventory_reservations r
          where r.order_request_id=v_order.id and r.sku=i.sku and r.status='active')
      )
    ) then
      raise exception using errcode='23514', message='K2_PAYMENT_STOCK_INELIGIBLE';
    end if;

    if not exists(select 1 from public.order_request_items where order_request_id=v_order.id)
      or exists (
        select 1 from public.inventory_reservations r
        left join public.order_request_items i on i.id=r.order_request_item_id and i.order_request_id=v_order.id and i.sku=r.sku
        left join public.product_batches b on b.id=r.batch_id and b.sku=r.sku
        where r.order_request_id=v_order.id and r.status='active'
          and (i.id is null or b.id is null or r.quantity<=0
            or r.expires_at is null or r.expires_at<=clock_timestamp()
            or b.reserved_quantity < (select sum(r2.quantity) from public.inventory_reservations r2 where r2.batch_id=b.id and r2.status='active'))
      )
      or exists (
        select 1 from public.order_request_items i where i.order_request_id=v_order.id
        and i.quantity <> coalesce((
          select sum(r.quantity) from public.inventory_reservations r
          join public.product_batches b on b.id=r.batch_id and b.sku=r.sku
          where r.order_request_id=v_order.id and r.order_request_item_id=i.id and r.sku=i.sku
            and r.status='active' and r.quantity>0
            and r.expires_at>clock_timestamp()
            and b.inventory_status='available'
            and b.quantity>=b.reserved_quantity and b.reserved_quantity>=r.quantity
            and (coalesce(b.expiry_date,b.best_before_date)>=current_date+90
              or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89
                and b.clearance_approved_at is not null))
        ),0)
      ) then
      raise exception using errcode='23514', message='K2_PAYMENT_STOCK_INELIGIBLE';
    end if;
  end if;

  if p_to_status = 'evidence_submitted' then
    if p_payment_evidence is not null and p_payment_evidence <> '{}'::jsonb then
      v_method := p_payment_evidence->>'method';
      if v_method not in ('gcash', 'bank_transfer', 'maya', 'cash', 'other') then
        raise exception using errcode='22023', message='K2_PAYMENT_METHOD_INVALID';
      end if;

      begin
        v_amount := (p_payment_evidence->>'amount')::numeric;
      exception when others then
        raise exception using errcode='22023', message='K2_PAYMENT_AMOUNT_INVALID';
      end;
      if v_amount is null or v_amount <= 0 or v_amount > 10000000 then
        raise exception using errcode='22023', message='K2_PAYMENT_AMOUNT_INVALID';
      end if;

      v_currency := coalesce(p_payment_evidence->>'currency', 'PHP');
      if v_currency <> 'PHP' then
        raise exception using errcode='22023', message='K2_PAYMENT_CURRENCY_INVALID';
      end if;

      v_payer_name := trim(coalesce(p_payment_evidence->>'payer_name', ''));
      if length(v_payer_name) not between 1 and 140 then
        raise exception using errcode='22023', message='K2_PAYMENT_PAYER_INVALID';
      end if;

      v_payment_reference := trim(coalesce(p_payment_evidence->>'payment_reference', ''));
      if length(v_payment_reference) not between 1 and 100 then
        raise exception using errcode='22023', message='K2_PAYMENT_REFERENCE_INVALID';
      end if;

      v_proof_asset_ref := trim(coalesce(p_payment_evidence->>'proof_asset_ref', ''));
      if length(v_proof_asset_ref) > 500 then
        raise exception using errcode='22023', message='K2_PAYMENT_PROOF_INVALID';
      end if;

      v_structured_evidence := jsonb_build_object(
        'method', v_method,
        'amount', v_amount,
        'currency', v_currency,
        'payer_name', v_payer_name,
        'payment_reference', v_payment_reference,
        'proof_asset_ref', nullif(v_proof_asset_ref, ''),
        'submitted_at', clock_timestamp(),
        'submitted_by', auth.uid()
      );
    else
      -- If structured fields omitted, note must be present
      if nullif(trim(coalesce(p_evidence_note, '')), '') is null then
        raise exception using errcode='23514', message='K2_PAYMENT_EVIDENCE_REQUIRED';
      end if;
      v_structured_evidence := jsonb_build_object(
        'legacy_note', trim(p_evidence_note),
        'submitted_at', clock_timestamp(),
        'submitted_by', auth.uid()
      );
    end if;

    update public.order_requests
    set payment_status = p_to_status,
        payment_evidence = v_structured_evidence,
        updated_at = clock_timestamp()
    where id = v_order.id
    returning * into v_order;

    insert into public.order_request_events(
      order_request_id, from_status, to_status, reason, actor_id, metadata, created_at
    )
    values(
      v_order.id, v_order.status, v_order.status, trim(coalesce(p_evidence_note, v_payment_reference, '')),
      auth.uid(),
      jsonb_build_object(
        'event', 'payment_status_changed',
        'from', v_from,
        'to', p_to_status,
        'corrected_attempt', v_from = 'failed',
        'payment_evidence', v_structured_evidence
      ),
      clock_timestamp()
    );

  elsif p_to_status = 'verified' then
    select actor_id into v_submitter from public.order_request_events
      where order_request_id = v_order.id and metadata->>'event' = 'payment_status_changed'
        and metadata->>'to' = 'evidence_submitted'
      order by created_at desc, id desc limit 1;

    if v_submitter is null or v_submitter = auth.uid() then
      raise exception using errcode='42501', message='K2_PAYMENT_INDEPENDENT_REVIEW_REQUIRED';
    end if;

    v_structured_evidence := coalesce(v_order.payment_evidence, '{}'::jsonb) || jsonb_build_object(
      'verified_at', clock_timestamp(),
      'verified_by', auth.uid(),
      'verification_note', trim(p_evidence_note)
    );

    update public.order_requests
    set payment_status = p_to_status,
        payment_evidence = v_structured_evidence,
        updated_at = clock_timestamp()
    where id = v_order.id
    returning * into v_order;

    insert into public.order_request_events(
      order_request_id, from_status, to_status, reason, actor_id, metadata, created_at
    )
    values(
      v_order.id, v_order.status, v_order.status, trim(p_evidence_note),
      auth.uid(),
      jsonb_build_object(
        'event', 'payment_status_changed',
        'from', v_from,
        'to', p_to_status,
        'corrected_attempt', false,
        'verification', jsonb_build_object(
          'verified_by', auth.uid(),
          'verified_at', clock_timestamp(),
          'note', trim(p_evidence_note)
        )
      ),
      clock_timestamp()
    );

  else
    update public.order_requests
    set payment_status = p_to_status,
        updated_at = clock_timestamp()
    where id = v_order.id
    returning * into v_order;

    insert into public.order_request_events(
      order_request_id, from_status, to_status, reason, actor_id, metadata, created_at
    )
    values(
      v_order.id, v_order.status, v_order.status, trim(coalesce(p_evidence_note, '')),
      auth.uid(),
      jsonb_build_object(
        'event', 'payment_status_changed',
        'from', v_from,
        'to', p_to_status,
        'corrected_attempt', v_from = 'failed'
      ),
      clock_timestamp()
    );
  end if;

  return v_order;
end;
$$;

-- Backward-compatible overload
create or replace function public.set_order_request_payment_status(
  p_order_request_id uuid, p_to_status text, p_evidence_note text
)
returns public.order_requests
language plpgsql security definer set search_path = ''
as $$
begin
  return public.set_order_request_payment_status(p_order_request_id, p_to_status, p_evidence_note, '{}'::jsonb);
end;
$$;

revoke all on function public.set_order_request_payment_status(uuid,text,text) from public,anon,authenticated;
revoke all on function public.set_order_request_payment_status(uuid,text,text,jsonb) from public,anon,authenticated;

-- Patch execute_admin_fulfillment_command_v1 to accept structured payment payload fields
do $patch$
declare v_definition text; v_old text; v_new text;
begin
  select pg_get_functiondef('public.execute_admin_fulfillment_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure) into v_definition;
  if position('paymentMethod' in v_definition) > 0 then return; end if;

  v_old := $old$if (v_payload - array['orderRequestId','toStatus','evidenceNote','expectedPaymentStatus','expectedUpdatedAt']) <> '{}'::jsonb$old$;
  v_new := $new$if (v_payload - array['orderRequestId','toStatus','evidenceNote','expectedPaymentStatus','expectedUpdatedAt','paymentMethod','paymentAmount','paymentCurrency','payerName','paymentReference','proofAssetRef']) <> '{}'::jsonb$new$;
  if position(v_old in v_definition) = 0 then raise exception 'Payment wrapper shape changed; review before applying'; end if;
  v_definition := replace(v_definition, v_old, v_new);

  v_old := $old$select * into v_order from public.set_order_request_payment_status(
      (v_payload->>'orderRequestId')::uuid, v_payload->>'toStatus', nullif(v_payload->>'evidenceNote','')
    );$old$;

  v_new := $new$select * into v_order from public.set_order_request_payment_status(
      (v_payload->>'orderRequestId')::uuid,
      v_payload->>'toStatus',
      nullif(v_payload->>'evidenceNote',''),
      case when v_payload ? 'paymentMethod' then
        jsonb_build_object(
          'method', v_payload->>'paymentMethod',
          'amount', v_payload->>'paymentAmount',
          'currency', coalesce(v_payload->>'paymentCurrency', 'PHP'),
          'payer_name', v_payload->>'payerName',
          'payment_reference', v_payload->>'paymentReference',
          'proof_asset_ref', v_payload->>'proofAssetRef'
        )
      else '{}'::jsonb end
    );$new$;

  if position(v_old in v_definition) = 0 then raise exception 'Payment dispatch shape changed; review before applying'; end if;
  execute replace(v_definition, v_old, v_new);
end;
$patch$;

notify pgrst,'reload schema';
commit;
