-- MAP-023 / I-001 / IDEA-20260908-01. Prepared only.
-- Compose OWNER-002 commitment with signed payment and physical handover.
-- Requires confirmation commitment, reservation coverage/lock ordering,
-- payment evidence/balance integrity, and complete handover coverage.
-- Preserve installed ACLs, wrappers, original commitment and physical counters.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

do $patch$
declare v_definition text; v_old text; v_new text;
begin
  if to_regprocedure('public.commit_order_request_stock_v1(uuid,text,text)') is null then
    raise exception 'Apply confirmation stock commitment before payment/handover composition';
  end if;

  select pg_get_functiondef('public.set_order_request_payment_status(uuid,text,text)'::regprocedure) into v_definition;
  if position('K2_PAYMENT_STOCK_COMMITMENT_V1' in v_definition)=0 then
    if position('K2_PAYMENT_BALANCE_INTEGRITY_V1' in v_definition)=0
      or position('K2_PAYMENT_INDEPENDENT_REVIEW_REQUIRED' in v_definition)=0 then
      raise exception 'Apply/review payment evidence and balance integrity before commitment';
    end if;
    v_old:=$old$or r.expires_at is null or r.expires_at<=clock_timestamp()$old$;
    v_new:=$new$or ((r.committed_at is not null or r.committed_by is not null or r.commit_cause is not null)
              and not coalesce(r.committed_at is not null and r.committed_by is not null
                and r.commit_cause in ('confirmation','payment_verification'),false))
            or (r.committed_at is null and (r.expires_at is null or r.expires_at<=clock_timestamp()))$new$;
    if position(v_old in v_definition)=0 then raise exception 'Payment expiry refusal shape changed'; end if;
    v_definition:=replace(v_definition,v_old,v_new);
    v_old:=$old$and r.expires_at>clock_timestamp()$old$;
    v_new:=$new$and (r.committed_at is not null or r.expires_at>clock_timestamp())$new$;
    if position(v_old in v_definition)=0 then raise exception 'Payment coverage shape changed'; end if;
    v_definition:=replace(v_definition,v_old,v_new);
    v_old:=$old$  update public.order_requests set payment_status=p_to_status,updated_at=clock_timestamp()$old$;
    v_new:=$new$  -- K2_PAYMENT_STOCK_COMMITMENT_V1: only after eligibility and independent review.
  if p_to_status='verified' then
    perform public.commit_order_request_stock_v1(v_order.id,'payment_verification',p_evidence_note);
  end if;
  update public.order_requests set payment_status=p_to_status,updated_at=clock_timestamp()$new$;
    if position(v_old in v_definition)=0 then raise exception 'Payment write shape changed'; end if;
    execute replace(v_definition,v_old,v_new);
  end if;

  -- A paid purchase can be confirmed after its old temporary deadline.
  -- Exact line, lot, balance and shelf-life guards still apply under their locks.
  select pg_get_functiondef('public.reserve_order_request_lots_v1(uuid,text)'::regprocedure) into v_definition;
  if position('K2_RESERVATION_COMMITTED_COVERAGE_V1' in v_definition)=0 then
    if position('K2_PURCHASE_BALANCE_LOCK_ORDER_V1' in v_definition)=0 then
      raise exception 'Apply/review reservation coverage and lock ordering before commitment';
    end if;
    v_old:=$old$and (r.expires_at>clock_timestamp() or (r.expires_at is null and v_order.channel_source<>'website'))$old$;
    v_new:=$new$-- K2_RESERVATION_COMMITTED_COVERAGE_V1
              and ((r.committed_at is not null and r.committed_by is not null
                    and r.commit_cause in ('confirmation','payment_verification'))
                or (r.committed_at is null and r.committed_by is null and r.commit_cause is null
                  and (r.expires_at>clock_timestamp() or (r.expires_at is null and v_order.channel_source<>'website'))))$new$;
    if position(v_old in v_definition)=0 then raise exception 'Reservation commitment coverage shape changed'; end if;
    execute replace(v_definition,v_old,v_new);
  end if;

  select pg_get_functiondef('public.fulfill_order_request(uuid,text)'::regprocedure) into v_definition;
  if position('K2_HANDOVER_STOCK_COMMITMENT_V1' in v_definition)=0 then
    if position('v_handover_reservation_ids' in v_definition)=0 then
      raise exception 'Apply/review handover coverage before commitment';
    end if;
    v_old:=$old$  if exists (select 1 from public.inventory_reservations where order_request_id = v_order.id and status = 'active' and packed_quantity <> quantity) then$old$;
    v_new:=$new$  -- K2_HANDOVER_STOCK_COMMITMENT_V1
  -- Locked exact allocations must already carry attributable ownership evidence.
  -- Never backfill a historical sale or deduct ownership for the first time at dispatch.
  if exists(select 1 from public.inventory_reservations r where r.id=any(v_handover_reservation_ids)
    and (r.committed_at is null or r.committed_by is null
      or not coalesce(r.commit_cause in ('confirmation','payment_verification'),false))) then
    raise exception 'K2_RESERVATION_RECONCILIATION_REQUIRED' using errcode='23514';
  end if;
  if exists (select 1 from public.inventory_reservations where order_request_id = v_order.id and status = 'active' and packed_quantity <> quantity) then$new$;
    if position(v_old in v_definition)=0 then raise exception 'Handover commitment guard shape changed'; end if;
    execute replace(v_definition,v_old,v_new);
  end if;

  select pg_get_functiondef('public.extend_reservation_v1(uuid,integer,text)'::regprocedure) into v_definition;
  if position('K2_EXTEND_COMMITTED_RESERVATION_GUARD_V1' in v_definition)=0 then
    v_old:=$old$  if v_row.expires_at is null then
    raise exception 'RESERVATION_HAS_NO_DEADLINE' using errcode = '22023';
  end if;$old$;
    v_new:=$new$  if v_row.expires_at is null then
    raise exception 'RESERVATION_HAS_NO_DEADLINE' using errcode = '22023';
  end if;
  -- K2_EXTEND_COMMITTED_RESERVATION_GUARD_V1: committed reservations are owned stock and never expire.
  if v_row.committed_at is not null then
    raise exception 'RESERVATION_ALREADY_COMMITTED' using errcode = '22023';
  end if;$new$;
    if position(v_old in v_definition)=0 then raise exception 'Reservation extension guard shape changed'; end if;
    execute replace(v_definition,v_old,v_new);
  end if;

  create or replace view public.v_reservations_due
  with (security_invoker = true)
  as
  select
    r.id,
    r.order_request_id,
    r.sku,
    r.quantity,
    r.expires_at,
    r.extension_count,
    greatest(0, floor(extract(epoch from (r.expires_at - now())) / 60)::integer) as minutes_remaining,
    (r.expires_at <= now()) as is_overdue
  from public.inventory_reservations r
  where r.status = 'active' and r.expires_at is not null and r.committed_at is null;
  revoke all on public.v_reservations_due from public, anon;
  grant select on public.v_reservations_due to authenticated;
end;
$patch$;
notify pgrst,'reload schema';
commit;
