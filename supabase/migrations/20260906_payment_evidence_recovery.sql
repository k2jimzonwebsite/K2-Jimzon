-- MAP-023 H-015. Prepared only; MAP-017/OWNER-005 and coordinated BFF cutover required.
begin;

create or replace function public.set_order_request_payment_status(
  p_order_request_id uuid, p_to_status text, p_evidence_note text
)
returns public.order_requests
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.order_requests;
  v_from text;
  v_submitter uuid;
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
     (p_to_status <> 'awaiting_instructions' and nullif(trim(coalesce(p_evidence_note,'')),'') is null) then
    raise exception using errcode='23514', message='K2_PAYMENT_EVIDENCE_REQUIRED';
  end if;
  -- Refund reconciliation remains available for a verified cancelled/fulfilled
  -- order; all new attempts and collection/verification require an open order.
  if p_to_status <> 'refunded' and v_order.status not in ('submitted','confirmed') then
    raise exception using errcode='23514', message='K2_PAYMENT_ORDER_INELIGIBLE';
  end if;
  if p_to_status in ('evidence_submitted','verified') then
    perform 1 from public.order_request_items where order_request_id=v_order.id order by id for update;
    perform 1 from public.inventory_reservations where order_request_id=v_order.id order by id for update;
    perform 1 from public.product_batches b where b.id in (
      select batch_id from public.inventory_reservations where order_request_id=v_order.id and status='active'
    ) order by b.id for update;
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
  if p_to_status='verified' then
    select actor_id into v_submitter from public.order_request_events
      where order_request_id=v_order.id and metadata->>'event'='payment_status_changed'
        and metadata->>'to'='evidence_submitted'
      order by created_at desc, id desc limit 1;
    if v_submitter is null or v_submitter=auth.uid() then
      raise exception using errcode='42501', message='K2_PAYMENT_INDEPENDENT_REVIEW_REQUIRED';
    end if;
  end if;
  update public.order_requests set payment_status=p_to_status,updated_at=clock_timestamp()
    where id=v_order.id returning * into v_order;
  insert into public.order_request_events(order_request_id,from_status,to_status,reason,actor_id,metadata,created_at)
    values(v_order.id,v_order.status,v_order.status,trim(p_evidence_note),auth.uid(),
      jsonb_build_object('event','payment_status_changed','from',v_from,'to',p_to_status,
        'corrected_attempt',v_from='failed'),clock_timestamp());
  return v_order;
end;
$$;
-- The signed wrapper owns expected-version checks and durable receipts.
revoke all on function public.set_order_request_payment_status(uuid,text,text) from public,anon,authenticated;

-- Alter only the payment branch of the installed wrapper, preserving other
-- composed fulfillment changes. Fail closed on an unexpected definition.
do $patch$
declare v_definition text; v_old text; v_new text;
begin
  select pg_get_functiondef('public.execute_admin_fulfillment_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure) into v_definition;
  if position('K2_PAYMENT_VERSION_CONFLICT' in v_definition)>0 then return; end if;
  v_old := $old$if (v_payload - array['orderRequestId','toStatus','evidenceNote']) <> '{}'::jsonb$old$;
  v_new := $new$if (v_payload - array['orderRequestId','toStatus','evidenceNote','expectedPaymentStatus','expectedUpdatedAt']) <> '{}'::jsonb$new$;
  if position(v_old in v_definition)=0 then raise exception 'Payment wrapper shape changed; review before applying'; end if;
  v_definition := replace(v_definition,v_old,v_new);
  v_old := $old$select * into v_order from public.set_order_request_payment_status($old$;
  v_new := $new$select * into v_order from public.order_requests
      where id=(v_payload->>'orderRequestId')::uuid for update;
    if not found or nullif(v_payload->>'expectedUpdatedAt','') is null
       or nullif(v_payload->>'expectedPaymentStatus','') is null
       or v_order.payment_status is distinct from v_payload->>'expectedPaymentStatus'
       or v_order.updated_at is distinct from (v_payload->>'expectedUpdatedAt')::timestamptz then
      raise exception using errcode='40001', message='K2_PAYMENT_VERSION_CONFLICT';
    end if;
    select * into v_order from public.set_order_request_payment_status($new$;
  if position(v_old in v_definition)=0 then raise exception 'Payment dispatch shape changed; review before applying'; end if;
  execute replace(v_definition,v_old,v_new);
end;
$patch$;
notify pgrst,'reload schema';
commit;
