-- MAP-023 / E1-E6. Fresh-only, coordinated preparation; not live activation.
do $$begin
 if to_regprocedure('k2_private.resolve_customer_delivery_quote_v1(jsonb)') is null
  or to_regclass('k2_private.order_delivery_snapshots') is not null then
  raise exception using errcode='55000',message='K2_ORDER_DELIVERY_PREREQUISITE_OR_EXISTING';
 end if;
end $$;

create table k2_private.order_delivery_snapshots(
 order_id uuid primary key references public.order_requests(id),
 idempotency_key text not null,request_fingerprint bytea not null,
 delivery_request jsonb not null,quote jsonb not null,
 fulfillment_method text not null,delivery_address text,
 subtotal numeric not null,discount_amount numeric not null,total_amount numeric not null,
 accepted_at timestamptz,created_at timestamptz not null default clock_timestamp()
);
alter table k2_private.order_delivery_snapshots enable row level security;
alter table k2_private.order_delivery_snapshots force row level security;
revoke all on k2_private.order_delivery_snapshots from public,anon,authenticated,service_role;

create function k2_private.guard_order_delivery_history_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_context k2_private.category_lot_command_context;
begin
 if tg_op<>'INSERT' then raise exception using errcode='55000',message='K2_ORDER_DELIVERY_HISTORY_IMMUTABLE';end if;
 v_context:=k2_private.current_category_lot_context_v1();
 if v_context.authority_kind is distinct from 'guest' then
  raise exception using errcode='42501',message='K2_ORDER_DELIVERY_CONTEXT_REQUIRED';
 end if;
 return new;
end $$;
revoke all on function k2_private.guard_order_delivery_history_v1() from public,anon,authenticated,service_role;
create trigger order_delivery_history_guard before insert or update or delete on k2_private.order_delivery_snapshots
 for each row execute function k2_private.guard_order_delivery_history_v1();
create trigger order_delivery_history_truncate before truncate on k2_private.order_delivery_snapshots
 for each statement execute function k2_private.guard_order_delivery_history_v1();

create function k2_private.guard_order_delivery_charge_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_snapshot k2_private.order_delivery_snapshots;v_order public.order_requests;
begin
 if tg_op='UPDATE' then
  select * into v_snapshot from k2_private.order_delivery_snapshots where order_id=old.id;
  if not found then
   if old.channel_source is distinct from 'website' and new.channel_source='website' then
    raise exception using errcode='22023',message='K2_DELIVERY_REVIEW_REQUIRED';
   end if;
   return new;
  end if;
  if new.id is distinct from old.id or new.channel_source is distinct from old.channel_source
   or new.shop_id is distinct from old.shop_id then
   raise exception using errcode='22023',message='K2_ORDER_CHARGE_IMMUTABLE';
  end if;
  v_order:=new;
 else
  -- Deferred INSERT: original and persisted admission identity both matter.
  select * into v_order from public.order_requests where id=new.id;
  if not found then
   if new.channel_source='website' then raise exception using errcode='22023',message='K2_DELIVERY_REVIEW_REQUIRED';end if;
   return null;
  end if;
  if new.channel_source<>'website' and v_order.channel_source<>'website' then return null;end if;
  select * into v_snapshot from k2_private.order_delivery_snapshots where order_id=v_order.id;
  if not found then raise exception using errcode='22023',message='K2_DELIVERY_REVIEW_REQUIRED';end if;
 end if;
 if v_order.idempotency_key is distinct from v_snapshot.idempotency_key
  or v_order.request_fingerprint is distinct from v_snapshot.request_fingerprint
  or v_order.fulfillment_method is distinct from v_snapshot.fulfillment_method
  or v_order.delivery_address is distinct from v_snapshot.delivery_address
  or v_order.subtotal is distinct from v_snapshot.subtotal
  or v_order.discount_amount is distinct from v_snapshot.discount_amount
  or v_order.total_amount is distinct from v_snapshot.total_amount
  or v_order.customer_delivery_confirmed_at is distinct from v_snapshot.accepted_at then
  raise exception using errcode='22023',message='K2_ORDER_CHARGE_IMMUTABLE';
 end if;
 if v_snapshot.quote->>'service'='express' then
  if v_order.shipping_amount<>0 or v_order.shipping_quote_status<>'pending_quote'
   or v_order.payment_status not in ('not_requested','unpaid','failed') then
   raise exception using errcode='22023',message='K2_DELIVERY_ACCEPTANCE_REQUIRED';
  end if;
 else
  if v_order.shipping_quote_status<>'customer_confirmed'
   or v_order.shipping_amount is distinct from (v_snapshot.quote->>'feeMinor')::numeric/100 then
   raise exception using errcode='22023',message='K2_ORDER_CHARGE_IMMUTABLE';
  end if;
 end if;
 if tg_op='UPDATE' then return new;end if;
 return null;
end $$;
revoke all on function k2_private.guard_order_delivery_charge_v1() from public,anon,authenticated,service_role;
create trigger order_delivery_charge_guard before update on public.order_requests
 for each row execute function k2_private.guard_order_delivery_charge_v1();
create constraint trigger order_delivery_snapshot_required after insert on public.order_requests
 deferrable initially deferred for each row execute function k2_private.guard_order_delivery_charge_v1();

create function k2_private.guard_order_delivery_items_v1() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='TRUNCATE' then
  if exists(select 1 from k2_private.order_delivery_snapshots) then raise exception using errcode='22023',message='K2_ORDER_CHARGE_IMMUTABLE';end if;
  return null;
 end if;
 if (tg_op in ('UPDATE','DELETE') and exists(select 1 from k2_private.order_delivery_snapshots where order_id=old.order_request_id))
  or (tg_op in ('INSERT','UPDATE') and exists(select 1 from k2_private.order_delivery_snapshots where order_id=new.order_request_id)) then
  raise exception using errcode='22023',message='K2_ORDER_CHARGE_IMMUTABLE';
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
revoke all on function k2_private.guard_order_delivery_items_v1() from public,anon,authenticated,service_role;
create trigger order_delivery_items_guard before insert or update or delete on public.order_request_items
 for each row execute function k2_private.guard_order_delivery_items_v1();
create trigger order_delivery_items_truncate before truncate on public.order_request_items
 for each statement execute function k2_private.guard_order_delivery_items_v1();

-- @@EXACT_ORDER_BODY_CORRECTIONS@@
