-- Restore production-backed coupon management without reintroducing the old
-- browser-local demo state. Coupon codes are private records; customers may
-- validate a single code through an RPC but cannot enumerate the table.

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null default '',
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  min_spend numeric(12,2) not null default 0 check (min_spend >= 0),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default false,
  is_hunt boolean not null default false,
  clue text,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupon_code_normalized check (code = upper(trim(code)) and length(code) between 3 and 40),
  constraint coupon_percentage_limit check (discount_type <> 'percentage' or discount_value <= 100),
  constraint coupon_window_valid check (ends_at is null or ends_at > starts_at),
  constraint coupon_redemptions_valid check (max_redemptions is null or redemption_count <= max_redemptions)
);

create index if not exists coupons_active_window_idx
  on public.coupons (is_active, starts_at, ends_at)
  where archived_at is null;

alter table public.coupons enable row level security;

drop policy if exists coupons_staff_read on public.coupons;
create policy coupons_staff_read on public.coupons
for select to authenticated using (public.is_staff());

drop policy if exists coupons_staff_insert on public.coupons;
create policy coupons_staff_insert on public.coupons
for insert to authenticated with check (public.is_staff());

drop policy if exists coupons_staff_update on public.coupons;
create policy coupons_staff_update on public.coupons
for update to authenticated using (public.is_staff()) with check (public.is_staff());

create or replace function public.touch_coupon_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.code := upper(trim(new.code));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists coupons_touch_updated_at on public.coupons;
create trigger coupons_touch_updated_at
before insert or update on public.coupons
for each row execute function public.touch_coupon_updated_at();

create or replace function public.audit_coupon_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
    values ('coupons', new.id::text, tg_op, null, to_jsonb(new), auth.uid());
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
    values ('coupons', new.id::text, tg_op, to_jsonb(old), to_jsonb(new), auth.uid());
    return new;
  end if;
  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
  values ('coupons', old.id::text, tg_op, to_jsonb(old), null, auth.uid());
  return old;
end;
$$;

drop trigger if exists coupons_audit_change on public.coupons;
create trigger coupons_audit_change
after insert or update or delete on public.coupons
for each row execute function public.audit_coupon_change();

create or replace function public.validate_coupon(
  p_code text,
  p_subtotal numeric
)
returns table (
  coupon_id uuid,
  normalized_code text,
  discount_type text,
  discount_value numeric,
  discount_amount numeric,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons;
  v_subtotal numeric := greatest(coalesce(p_subtotal, 0), 0);
  v_discount numeric;
begin
  select * into v_coupon
  from public.coupons
  where code = upper(trim(coalesce(p_code, '')))
    and is_active = true
    and archived_at is null
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
    and (max_redemptions is null or redemption_count < max_redemptions)
  limit 1;

  if not found then raise exception 'Coupon is invalid, inactive, expired, or fully redeemed'; end if;
  if v_subtotal < v_coupon.min_spend then
    raise exception 'Coupon requires a minimum spend of PHP %', v_coupon.min_spend;
  end if;

  v_discount := case
    when v_coupon.discount_type = 'percentage'
      then round(v_subtotal * v_coupon.discount_value / 100, 2)
    else least(v_coupon.discount_value, v_subtotal)
  end;

  return query select
    v_coupon.id,
    v_coupon.code,
    v_coupon.discount_type,
    v_coupon.discount_value,
    v_discount,
    'Coupon validated; redemption is recorded only when an order is confirmed'::text;
end;
$$;

revoke all on table public.coupons from anon;
revoke all on table public.coupons from authenticated;
grant select, insert, update on table public.coupons to authenticated;
revoke all on function public.validate_coupon(text,numeric) from public;
grant execute on function public.validate_coupon(text,numeric) to anon, authenticated;

-- Keep every accepted Milan and Manila +1 scan as an immutable custody event.
create table if not exists public.consignment_scan_events (
  id uuid primary key default gen_random_uuid(),
  consignment_id uuid not null references public.consignments(id) on delete restrict,
  consignment_item_id uuid not null references public.consignment_items(id) on delete restrict,
  sku text not null,
  stage text not null check (stage in ('milan', 'manila')),
  resulting_qty integer not null check (resulting_qty > 0),
  actor_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists consignment_scan_events_manifest_idx
  on public.consignment_scan_events (consignment_id, created_at);

alter table public.consignment_scan_events enable row level security;

drop policy if exists consignment_scan_events_staff_read on public.consignment_scan_events;
create policy consignment_scan_events_staff_read on public.consignment_scan_events
for select to authenticated using (public.is_staff());

create or replace function public.record_consignment_scan(
  p_consignment_id uuid,
  p_sku text,
  p_stage text
)
returns public.consignment_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_manifest public.consignments;
  v_item public.consignment_items;
  v_resulting_qty integer;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into v_manifest from public.consignments
  where id = p_consignment_id for update;
  if not found then raise exception 'Consignment not found'; end if;

  select * into v_item from public.consignment_items
  where consignment_id = p_consignment_id and sku = p_sku for update;
  if not found then raise exception 'SKU is not on this manifest'; end if;

  if p_stage = 'milan' then
    if v_manifest.status <> 'Packing_Italy' then raise exception 'Milan packing is closed'; end if;
    if v_item.italy_packed_qty >= v_item.expected_qty then
      raise exception 'Packed scans cannot exceed the expected manifest quantity';
    end if;
    update public.consignment_items
    set italy_packed_qty = italy_packed_qty + 1
    where id = v_item.id returning * into v_item;
    v_resulting_qty := v_item.italy_packed_qty;
  elsif p_stage = 'manila' then
    if v_manifest.status <> 'Arrived_Manila' then raise exception 'Consignment is not ready for Manila receiving'; end if;
    if v_item.manila_scanned_qty >= v_item.italy_packed_qty then
      raise exception 'Scanned quantity cannot exceed the packed manifest quantity';
    end if;
    update public.consignment_items
    set manila_scanned_qty = manila_scanned_qty + 1,
        status = case when manila_scanned_qty + 1 = italy_packed_qty then 'Matched' else 'Discrepancy' end
    where id = v_item.id returning * into v_item;
    v_resulting_qty := v_item.manila_scanned_qty;
  else
    raise exception 'Stage must be milan or manila';
  end if;

  insert into public.consignment_scan_events (
    consignment_id, consignment_item_id, sku, stage, resulting_qty, actor_id
  ) values (
    p_consignment_id, v_item.id, v_item.sku, p_stage, v_resulting_qty, auth.uid()
  );

  return v_item;
end;
$$;

revoke all on table public.consignment_scan_events from anon;
revoke all on table public.consignment_scan_events from authenticated;
grant select on table public.consignment_scan_events to authenticated;
revoke all on function public.record_consignment_scan(uuid,text,text) from public;
grant execute on function public.record_consignment_scan(uuid,text,text) to authenticated;

notify pgrst, 'reload schema';
