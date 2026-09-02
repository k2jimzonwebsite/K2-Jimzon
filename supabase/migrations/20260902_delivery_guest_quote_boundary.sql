-- MAP-023 — the customer-facing delivery estimate.
--
-- The storefront BFF holds a publishable key, so it cannot read
-- public.delivery_cost_rows and must not: what a courier charges K2 is
-- commercial data. The quote is therefore resolved here, inside the database,
-- and only the outcome and the final customer charge cross the boundary. No
-- cost, no courier identity, no source, and no margin is ever returned.
--
-- DRIFT WARNING. This function is the SQL twin of resolveDeliveryQuote() in
-- src/lib/deliveryQuote.js. The two must agree. It is deliberately written as a
-- narrow allowlist: the ONLY path that returns STANDARD_FEE is the exact
-- owner-approved pilot shape, and everything else — every unknown, every
-- exception, every integrity problem — collapses to MANUAL_COURIER_QUOTE. A
-- disagreement between the two implementations can therefore only ever make the
-- customer path more conservative than the staff path, never less.
--
-- tests/delivery-quote-parity.spec.js pins the shared constants so a change to
-- one implementation without the other fails the build.

begin;

do $preflight$
begin
  if to_regprocedure('k2_private.verify_guest_bff_request(text,bigint,uuid,text,text,text)') is null
     or to_regclass('public.delivery_cost_rows') is null then
    raise exception 'Guest BFF foundation and delivery control tables must be applied first';
  end if;
end
$preflight$;

create or replace function public.quote_guest_delivery_v1(
  p_timestamp bigint,
  p_nonce uuid,
  p_payload_text text,
  p_ip_hash text,
  p_signature text
)
returns table(
  ok boolean, error_code text, retry_after_seconds integer,
  outcome text, fee_minor integer, currency text, customer_visible boolean, message_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_ip bytea;
  v_rate record;
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_locality public.delivery_locality_rules;
  v_channel text;
  v_service text;
  v_parcels integer;
  v_weight integer;
  v_subtotal integer;
  v_qualified integer;
  v_costed integer;
  v_max integer;
  v_fee integer;
  -- The owner-approved pilot boundary. Kept as named constants so the parity
  -- test can pin them against the JavaScript implementation.
  c_origin constant text := 'WAREHOUSE_A';
  c_max_parcels constant integer := 1;
  c_max_weight_g constant integer := 3000;
  c_max_subtotal_minor constant integer := 200000;
  c_rounding_minor constant integer := 500;
begin
  if not k2_private.verify_guest_bff_request(
    'delivery_quote', p_timestamp, p_nonce, p_payload_text, p_ip_hash, p_signature
  ) then
    return query select false,'REQUEST_REPLAYED',0,'UNAVAILABLE',null::integer,'PHP',false,'UNAVAILABLE'::text;
    return;
  end if;

  v_ip := decode(p_ip_hash,'hex');
  select * into v_rate from k2_private.consume_guest_rate('delivery_quote','ip',v_ip,900,60);
  if not v_rate.allowed then
    return query select false,'RATE_LIMITED',v_rate.retry_after_seconds,
      'UNAVAILABLE',null::integer,'PHP',false,'RATE_LIMITED'::text;
    return;
  end if;

  v_payload := p_payload_text::jsonb;
  v_channel := v_payload->>'channel';
  v_service := v_payload->>'service';

  -- Platform-priced channels never run K2 rating; running it would double-charge.
  if v_channel = 'Marketplace' or v_service = 'Platform Delivery' then
    return query select true,null::text,0,'PLATFORM_CHARGED_EXTERNAL',null::integer,'PHP',false,
      'PLATFORM_CHARGED_EXTERNAL'::text;
    return;
  end if;

  -- A confirmed pickup is the only path to a zero charge.
  if v_service = 'K2 Pickup' then
    return query select true,null::text,0,'PICKUP_ZERO',0,'PHP',true,'PICKUP_ZERO'::text;
    return;
  end if;

  -- From here on, every refusal is the same conservative outcome. Checkout falls
  -- back to the existing "quoted after review" request model on any of them.
  if v_service is distinct from 'K2 Standard Delivery'
     or v_channel is null
     or v_channel not in ('Website','Pasabuy') then
    return query select true,null::text,0,'MANUAL_COURIER_QUOTE',null::integer,'PHP',false,
      'OUTSIDE_PILOT'::text;
    return;
  end if;

  v_parcels := nullif(v_payload->>'parcelCount','')::integer;
  v_weight := nullif(v_payload->>'weightG','')::integer;
  v_subtotal := nullif(v_payload->>'merchandiseSubtotalMinor','')::integer;

  -- Blank means unknown, and an unknown never becomes a charge. Note that the
  -- exception flags must each be an explicit false; a missing flag is unknown.
  if v_parcels is null or v_weight is null or v_subtotal is null
     or v_parcels < 1 or v_weight < 1 or v_subtotal < 0
     or v_parcels > c_max_parcels
     or v_weight > c_max_weight_g
     or v_subtotal > c_max_subtotal_minor
     or (v_payload->>'oversize') is distinct from 'false'
     or (v_payload->>'remoteArea') is distinct from 'false'
     or (v_payload->>'specialProtection') is distinct from 'false' then
    return query select true,null::text,0,'MANUAL_COURIER_QUOTE',null::integer,'PHP',false,
      'OUTSIDE_PILOT'::text;
    return;
  end if;

  -- Exactly one approved exact locality, or nothing. There is no regional
  -- fallback and no planning floor on this path.
  select * into v_locality from public.delivery_locality_rules
  where locality_id = v_payload->>'localityId'
    and scope = 'EXACT_PILOT'
    and status = 'PILOT_APPROVED'
    and integrity = 'OK';
  if not found then
    return query select true,null::text,0,'MANUAL_COURIER_QUOTE',null::integer,'PHP',false,
      'OUTSIDE_PILOT'::text;
    return;
  end if;

  -- Count the selectable couriers, and how many of them carry exactly one
  -- current, complete, owner-approved cost backed by a current source.
  select count(*)::integer into v_qualified
  from public.delivery_courier_options o
  where o.eligibility = 'AUTO_QUOTE_ELIGIBLE'
    and o.approved
    and o.integrity = 'OK'
    and o.origin_id = c_origin;

  select count(*)::integer, coalesce(max(c.amount_minor),0)
    into v_costed, v_max
  from public.delivery_courier_options o
  join public.delivery_cost_rows c
    on c.option_id = o.option_id
   and c.origin_id = c_origin
   and c.locality_id = v_locality.locality_id
   and c.profile_id = v_locality.profile_id
   and c.status = 'ACTIVE_APPROVED'
   and c.completeness = 'PROVIDER_TOTAL_COMPLETE'
   and c.approved_by_owner
   and c.currency = 'PHP'
   and c.amount_minor is not null
   and c.effective_from <= v_today
   and (c.effective_to is null or c.effective_to > v_today)
  join public.delivery_rate_sources s
    on s.source_id = c.source_id
   and s.freshness = 'CURRENT'
   and s.integrity = 'OK'
  where o.eligibility = 'AUTO_QUOTE_ELIGIBLE'
    and o.approved
    and o.integrity = 'OK'
    and o.origin_id = c_origin;

  -- A selectable courier without a current cost means K2 cannot bound its own
  -- cost on this route, so automatic quoting stops rather than under-charging.
  if v_qualified = 0 or v_costed <> v_qualified or v_max <= 0 then
    return query select true,null::text,0,'MANUAL_COURIER_QUOTE',null::integer,'PHP',false,
      'MANUAL_COURIER_QUOTE'::text;
    return;
  end if;

  -- The loss-control rule: charge the worst qualified option, rounded upward.
  v_fee := ceil(v_max::numeric / c_rounding_minor)::integer * c_rounding_minor;

  return query select true,null::text,0,'STANDARD_FEE',v_fee,'PHP',true,'STANDARD_FEE'::text;
end;
$$;

revoke all on function public.quote_guest_delivery_v1(bigint,uuid,text,text,text) from public;
grant execute on function public.quote_guest_delivery_v1(bigint,uuid,text,text,text)
  to anon, authenticated;

commit;
