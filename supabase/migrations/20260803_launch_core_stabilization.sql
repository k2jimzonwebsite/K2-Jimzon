-- K2 Jimzon launch-core stabilization
--
-- One canonical operational model for the Website, Shopee, TikTok Shop,
-- Lazada, and Pasabuy. This migration intentionally does not configure a
-- payment provider or marketplace credentials. It is additive and keeps the
-- legacy `orders` line table working while new order requests use a safe,
-- atomic server workflow.

create extension if not exists pgcrypto;

-- Required enum values may be absent when only part of the historical
-- migration chain was applied. They are used by RPCs after this migration
-- commits, so adding them here is safe and idempotent.
alter type public.user_role add value if not exists 'Staff';
alter type public.channel_type add value if not exists 'website_retail';
alter type public.order_status_enum add value if not exists 'Packed';
alter type public.order_status_enum add value if not exists 'Shipped';
alter type public.order_status_enum add value if not exists 'Cancelled';
alter type public.payment_status_enum add value if not exists 'Unpaid';
alter type public.payment_status_enum add value if not exists 'Paid';

-- ---------------------------------------------------------------------------
-- Staff authorization helpers. Browser state is never an authorization check.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role::text in ('Admin', 'Staff', 'SuperAdmin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role::text in ('Admin', 'SuperAdmin')
  );
$$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.user_profiles add column if not exists full_name text;
alter table public.user_profiles add column if not exists updated_at timestamptz default now();

create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.user_profiles;
  v_admin_count integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_role not in ('Admin', 'Staff', 'Customer') then raise exception 'Invalid role'; end if;
  select * into v_profile from public.user_profiles where id = p_user_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if v_profile.role::text = 'Admin' and p_role <> 'Admin' then
    select count(*) into v_admin_count from public.user_profiles where role::text = 'Admin';
    if v_admin_count <= 1 then raise exception 'The final Admin cannot be demoted'; end if;
  end if;
  update public.user_profiles set role = p_role::user_role, updated_at = now()
  where id = p_user_id returning * into v_profile;
  return v_profile;
end;
$$;

revoke all on function public.set_user_role(uuid,text) from public;
grant execute on function public.set_user_role(uuid,text) to authenticated;

create or replace function public.append_internal_message(
  p_conversation_id uuid,
  p_content text
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.messages;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_content, '')), '') is null then raise exception 'Message content is required'; end if;
  perform 1 from public.conversations where id = p_conversation_id for update;
  if not found then raise exception 'Conversation not found'; end if;
  insert into public.messages (conversation_id, sender_type, content, is_draft)
  values (p_conversation_id, 'Admin'::message_sender, trim(p_content), false)
  returning * into v_message;
  update public.conversations set last_message_at = now() where id = p_conversation_id;
  return v_message;
end;
$$;

revoke all on function public.append_internal_message(uuid,text) from public;
grant execute on function public.append_internal_message(uuid,text) to authenticated;

-- Remove the four known prototype testimonials inserted by 0001. Real reviews
-- are never seeded by the launch core.
delete from public.reviews
where (name, item) in (
  ('Camille D.', 'Nutella Biscuits'),
  ('Bella Vita Trading', 'Lavazza Qualità Oro'),
  ('Miguel R.', 'Pasabuy request'),
  ('Anna L.', 'Pistì pistachio cream')
);

-- Remove the deterministic prototype fixture inserted by 0010. These UUIDs
-- and PAS-TRF SKUs were created only to simulate operations.
delete from public.orders
where sku in ('PAS-TRF-001','PAS-TRF-002','PAS-TRF-003','PAS-TRF-004','PAS-TRF-005')
  and channel_source::text = 'direct_b2b';
delete from public.po_lines where po_id = '33333333-3333-3333-3333-333333333333';
delete from public.purchase_orders where id = '33333333-3333-3333-3333-333333333333';
delete from public.messages where conversation_id = '22222222-2222-2222-2222-222222222222';
delete from public.conversations where id = '22222222-2222-2222-2222-222222222222';
delete from public.products
where sku in ('PAS-TRF-001','PAS-TRF-002','PAS-TRF-003','PAS-TRF-004','PAS-TRF-005');
delete from public.suppliers where id = '11111111-1111-1111-1111-111111111111';

-- ---------------------------------------------------------------------------
-- Product compatibility and the shared master inventory balance.
-- ---------------------------------------------------------------------------
-- Some deployed environments were created from the newer product model and
-- therefore never received the legacy columns from 0002. Keep both column
-- families during the launch transition because the storefront still reads
-- the legacy names while the operations dashboard uses the newer names.
alter table public.products add column if not exists name text;
alter table public.products add column if not exists srp numeric;
alter table public.products add column if not exists wholesale_price numeric;
alter table public.products add column if not exists stock_available integer;
alter table public.products add column if not exists primary_image_url text;
alter table public.products add column if not exists title text;
alter table public.products add column if not exists retail_price numeric;
alter table public.products add column if not exists vip_price numeric;
alter table public.products add column if not exists total_stock integer;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists updated_at timestamptz default now();

update public.products
set name = coalesce(nullif(name, ''), nullif(title, ''), sku),
    title = coalesce(nullif(title, ''), nullif(name, ''), sku),
    srp = coalesce(srp, retail_price, 0),
    retail_price = coalesce(retail_price, srp, 0),
    wholesale_price = coalesce(wholesale_price, vip_price, retail_price, 0),
    vip_price = coalesce(vip_price, wholesale_price, srp, retail_price, 0),
    stock_available = coalesce(stock_available, total_stock, 0),
    total_stock = coalesce(total_stock, stock_available, 0),
    primary_image_url = coalesce(primary_image_url, image_url),
    image_url = coalesce(image_url, primary_image_url),
    updated_at = coalesce(updated_at, now());

create or replace function public.sync_product_compat_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare v_allow_stock_write boolean := coalesce(current_setting('k2.allow_stock_write', true) = 'on', false);
begin
  new.name := coalesce(nullif(new.name, ''), new.title, new.sku);
  new.title := coalesce(nullif(new.title, ''), new.name, new.sku);
  new.srp := coalesce(new.srp, new.retail_price, 0);
  new.retail_price := coalesce(new.retail_price, new.srp, 0);
  new.wholesale_price := coalesce(new.wholesale_price, new.vip_price, new.srp, 0);
  new.vip_price := coalesce(new.vip_price, new.wholesale_price, new.srp, 0);
  if tg_op = 'INSERT' and greatest(coalesce(new.stock_available, 0), coalesce(new.total_stock, 0)) > 0
     and not v_allow_stock_write then
    raise exception 'Create the product at zero stock, then record its real batches';
  end if;
  if tg_op = 'UPDATE'
     and (new.stock_available is distinct from old.stock_available
          or new.total_stock is distinct from old.total_stock)
     and not v_allow_stock_write then
    raise exception 'Stock changes must use batch reconciliation, receiving, reservation, or fulfillment';
  end if;
  if tg_op = 'UPDATE' and new.stock_available is distinct from old.stock_available then
    new.stock_available := greatest(coalesce(new.stock_available, 0), 0);
    new.total_stock := new.stock_available;
  elsif tg_op = 'UPDATE' and new.total_stock is distinct from old.total_stock then
    new.total_stock := greatest(coalesce(new.total_stock, 0), 0);
    new.stock_available := new.total_stock;
  else
    new.stock_available := greatest(coalesce(new.stock_available, new.total_stock, 0), 0);
    new.total_stock := new.stock_available;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_sync_product_compat_columns on public.products;
create trigger trg_sync_product_compat_columns
before insert or update on public.products
for each row execute function public.sync_product_compat_columns();

-- Normalize the two historical batch schemas before any receiving or
-- fulfillment function touches them.
alter table public.product_batches add column if not exists box_code text;
alter table public.product_batches add column if not exists batch_code text;
alter table public.product_batches add column if not exists quantity integer default 0;
alter table public.product_batches add column if not exists quantity_available integer default 0;
alter table public.product_batches add column if not exists expiry_date date;
alter table public.product_batches add column if not exists best_before_date date;
alter table public.product_batches add column if not exists landed_date date default current_date;
alter table public.product_batches add column if not exists hub text;
alter table public.product_batches add column if not exists custodian text;
alter table public.product_batches add column if not exists channel text;
alter table public.product_batches add column if not exists is_pinned boolean default false;
alter table public.product_batches alter column batch_code drop not null;
alter table public.product_batches alter column best_before_date drop not null;

update public.product_batches
set quantity = greatest(coalesce(quantity, 0), coalesce(quantity_available, 0)),
    quantity_available = greatest(coalesce(quantity, 0), coalesce(quantity_available, 0)),
    box_code = coalesce(box_code, batch_code),
    batch_code = coalesce(batch_code, box_code),
    expiry_date = coalesce(expiry_date, best_before_date),
    best_before_date = coalesce(best_before_date, expiry_date);

create or replace function public.sync_product_batch_compat_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.box_code := coalesce(nullif(new.box_code, ''), nullif(new.batch_code, ''));
  new.batch_code := coalesce(nullif(new.batch_code, ''), new.box_code);
  new.expiry_date := coalesce(new.expiry_date, new.best_before_date);
  new.best_before_date := coalesce(new.best_before_date, new.expiry_date);
  if tg_op = 'UPDATE' and new.quantity is distinct from old.quantity then
    new.quantity := greatest(coalesce(new.quantity, 0), 0);
    new.quantity_available := new.quantity;
  elsif tg_op = 'UPDATE' and new.quantity_available is distinct from old.quantity_available then
    new.quantity_available := greatest(coalesce(new.quantity_available, 0), 0);
    new.quantity := new.quantity_available;
  else
    new.quantity := greatest(coalesce(new.quantity, new.quantity_available, 0), 0);
    new.quantity_available := new.quantity;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_product_batch_compat_columns on public.product_batches;
create trigger trg_sync_product_batch_compat_columns
before insert or update on public.product_batches
for each row execute function public.sync_product_batch_compat_columns();

-- Staff expiry feed used by the admin notification drawer. Recreate it with
-- invoker security so the underlying product and batch RLS policies apply.
drop view if exists public.v_expiring_batches;
create view public.v_expiring_batches
with (security_invoker = true)
as
select
  b.id,
  b.sku,
  coalesce(p.name, p.title, p.sku) as product_name,
  b.box_code,
  b.hub,
  b.custodian,
  b.channel,
  greatest(coalesce(b.quantity, 0), coalesce(b.quantity_available, 0)) as quantity,
  coalesce(b.expiry_date, b.best_before_date) as expiry_date,
  b.is_pinned,
  (coalesce(b.expiry_date, b.best_before_date) - current_date) as days_left,
  case
    when coalesce(b.expiry_date, b.best_before_date) is null then 'none'
    when coalesce(b.expiry_date, b.best_before_date) < current_date then 'expired'
    when coalesce(b.expiry_date, b.best_before_date) <= current_date + 30 then 'critical'
    when coalesce(b.expiry_date, b.best_before_date) <= current_date + 90 then 'warning'
    else 'fresh'
  end as status
from public.product_batches b
join public.products p on p.sku = b.sku
where greatest(coalesce(b.quantity, 0), coalesce(b.quantity_available, 0)) > 0;

create table if not exists public.inventory_balances (
  sku text not null references public.products(sku) on delete cascade,
  location_code text not null default 'MANILA_MAIN',
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  in_transit integer not null default 0 check (in_transit >= 0),
  damaged integer not null default 0 check (damaged >= 0),
  expired integer not null default 0 check (expired >= 0),
  unaccounted integer not null default 0 check (unaccounted >= 0),
  available integer generated always as
    (greatest(on_hand - reserved - damaged - expired - unaccounted, 0)) stored,
  updated_at timestamptz not null default now(),
  primary key (sku, location_code),
  constraint inventory_reserved_not_above_on_hand check
    (reserved + damaged + expired + unaccounted <= on_hand)
);

insert into public.inventory_balances (sku, location_code, on_hand)
select sku, 'MANILA_MAIN', greatest(coalesce(stock_available, total_stock, 0), 0)
from public.products
on conflict (sku, location_code) do nothing;

create table if not exists public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku) on delete restrict,
  location_code text not null,
  event_type text not null check (event_type in (
    'received', 'reserved', 'reservation_released', 'fulfilled',
    'damaged', 'expired', 'reconciled', 'transferred'
  )),
  quantity integer not null check (quantity > 0),
  reference_type text,
  reference_id uuid,
  reason text,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Batch edits are replaced atomically and reconcile the shared master balance.
create or replace function public.replace_product_batches(
  p_sku text,
  p_batches jsonb,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch jsonb;
  v_balance public.inventory_balances;
  v_old_on_hand integer;
  v_total integer := 0;
  v_qty integer;
  v_count integer := 0;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reconciliation reason is required';
  end if;
  if jsonb_typeof(p_batches) <> 'array' or jsonb_array_length(p_batches) > 200 then
    raise exception 'Batches must be an array of at most 200 rows';
  end if;
  perform 1 from public.products where sku = p_sku for update;
  if not found then raise exception 'Product not found'; end if;

  for v_batch in select * from jsonb_array_elements(p_batches)
  loop
    v_qty := coalesce((v_batch ->> 'quantity')::integer, 0);
    if v_qty < 0 then raise exception 'Batch quantity cannot be negative'; end if;
    v_total := v_total + v_qty;
  end loop;

  insert into public.inventory_balances (sku, location_code, on_hand)
  select sku, 'MANILA_MAIN', greatest(coalesce(stock_available, total_stock, 0), 0)
  from public.products where sku = p_sku
  on conflict (sku, location_code) do nothing;
  select * into v_balance from public.inventory_balances
  where sku = p_sku and location_code = 'MANILA_MAIN' for update;
  if v_total < v_balance.reserved + v_balance.damaged + v_balance.expired + v_balance.unaccounted then
    raise exception 'Batch total cannot be lower than reserved or unavailable units';
  end if;
  v_old_on_hand := v_balance.on_hand;

  delete from public.product_batches where sku = p_sku;
  for v_batch in select * from jsonb_array_elements(p_batches)
  loop
    v_qty := coalesce((v_batch ->> 'quantity')::integer, 0);
    insert into public.product_batches (
      sku, box_code, batch_code, quantity, quantity_available,
      expiry_date, best_before_date, landed_date, hub, custodian, channel, is_pinned
    ) values (
      p_sku, nullif(trim(v_batch ->> 'box_code'), ''), nullif(trim(v_batch ->> 'box_code'), ''),
      v_qty, v_qty, nullif(v_batch ->> 'expiry_date', '')::date,
      nullif(v_batch ->> 'expiry_date', '')::date,
      coalesce(nullif(v_batch ->> 'landed_date', '')::date, current_date),
      nullif(trim(v_batch ->> 'hub'), ''), nullif(trim(v_batch ->> 'custodian'), ''),
      nullif(trim(v_batch ->> 'channel'), ''), coalesce((v_batch ->> 'is_pinned')::boolean, false)
    );
    v_count := v_count + 1;
  end loop;

  update public.inventory_balances set on_hand = v_total, updated_at = now()
  where sku = p_sku and location_code = 'MANILA_MAIN';
  select * into v_balance from public.inventory_balances
  where sku = p_sku and location_code = 'MANILA_MAIN';
  perform set_config('k2.allow_stock_write', 'on', true);
  update public.products set stock_available = v_balance.available,
    total_stock = v_balance.available where sku = p_sku;

  if v_old_on_hand <> v_total then
    insert into public.inventory_events (
      sku, location_code, event_type, quantity, reference_type,
      reason, actor_id, metadata
    ) values (
      p_sku, 'MANILA_MAIN', 'reconciled', abs(v_total - v_old_on_hand),
      'batch_editor', trim(p_reason), auth.uid(),
      jsonb_build_object('previous_on_hand', v_old_on_hand, 'new_on_hand', v_total)
    );
  end if;
  return v_count;
end;
$$;

revoke all on function public.replace_product_batches(text,jsonb,text) from public;
grant execute on function public.replace_product_batches(text,jsonb,text) to authenticated;

-- Retire the legacy batch-only deduction path. Fulfillment must update the
-- reservation ledger, batch rows, product balance, and audit event together.
create or replace function public.deduct_stock_fefo(p_sku text, p_qty integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  raise exception 'Use fulfill_order_request so FEFO and the inventory ledger stay atomic';
end;
$$;

revoke all on function public.deduct_stock_fefo(text,integer) from public;

create or replace function public.transfer_inventory_custody(
  p_to_custodian text,
  p_box_code text default null,
  p_sku text default null,
  p_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_updated integer := 0;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_to_custodian, '')), '') is null then
    raise exception 'Destination custodian is required';
  end if;
  if nullif(trim(coalesce(p_box_code, '')), '') is null
     and nullif(trim(coalesce(p_sku, '')), '') is null then
    raise exception 'Box code or SKU is required';
  end if;

  for v_row in
    select id, sku, quantity, custodian, box_code
    from public.product_batches
    where (p_box_code is null or box_code = p_box_code)
      and (p_sku is null or sku = p_sku)
      and quantity > 0
    for update
  loop
    update public.product_batches
    set custodian = trim(p_to_custodian)
    where id = v_row.id;
    insert into public.inventory_events (
      sku, location_code, event_type, quantity, reason, actor_id, metadata
    ) values (
      v_row.sku, 'MANILA_MAIN', 'transferred', v_row.quantity,
      p_reason, auth.uid(), jsonb_build_object(
        'batch_id', v_row.id, 'box_code', v_row.box_code,
        'from_custodian', v_row.custodian,
        'to_custodian', trim(p_to_custodian)
      )
    );
    v_updated := v_updated + 1;
  end loop;
  if v_updated = 0 then raise exception 'No matching stock batches found'; end if;
  return v_updated;
end;
$$;

revoke all on function public.transfer_inventory_custody(text,text,text,text) from public;
grant execute on function public.transfer_inventory_custody(text,text,text,text) to authenticated;

-- The deployed database may not include historical migration 0018. Create the
-- consignment record boundary here before functions use either table as a
-- composite return type. These are operational records, not demo manifests.
create table if not exists public.consignments (
  id uuid primary key default gen_random_uuid(),
  manifest_code text unique not null,
  flight_number text,
  departure_city text not null default 'Milan, Italy',
  destination_city text not null default 'Manila, Philippines',
  status text not null default 'Packing_Italy'
    check (status in ('Packing_Italy', 'In_Transit', 'Arrived_Manila', 'Completed')),
  packed_at timestamptz default now(),
  arrived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.consignment_items (
  id uuid primary key default gen_random_uuid(),
  consignment_id uuid not null references public.consignments(id) on delete cascade,
  sku text not null references public.products(sku) on delete restrict,
  batch_code text not null,
  best_before_date date not null,
  expected_qty integer not null default 0 check (expected_qty >= 0),
  italy_packed_qty integer not null default 0 check (italy_packed_qty >= 0),
  manila_scanned_qty integer not null default 0 check (manila_scanned_qty >= 0),
  status text not null default 'Pending'
    check (status in ('Pending', 'Matched', 'Discrepancy')),
  created_at timestamptz not null default now(),
  constraint unique_consignment_sku unique (consignment_id, sku)
);

-- Preserve compatibility with any partial consignment schema already present.
alter table public.consignments add column if not exists manifest_code text;
alter table public.consignments add column if not exists flight_number text;
alter table public.consignments add column if not exists departure_city text default 'Milan, Italy';
alter table public.consignments add column if not exists destination_city text default 'Manila, Philippines';
alter table public.consignments add column if not exists status text default 'Packing_Italy';
alter table public.consignments add column if not exists packed_at timestamptz default now();
alter table public.consignments add column if not exists arrived_at timestamptz;
alter table public.consignments add column if not exists created_at timestamptz default now();

alter table public.consignment_items add column if not exists consignment_id uuid;
alter table public.consignment_items add column if not exists sku text;
alter table public.consignment_items add column if not exists batch_code text;
alter table public.consignment_items add column if not exists best_before_date date;
alter table public.consignment_items add column if not exists expected_qty integer
  not null default 0 check (expected_qty >= 0);
alter table public.consignment_items add column if not exists italy_packed_qty integer default 0;
alter table public.consignment_items add column if not exists manila_scanned_qty integer default 0;
alter table public.consignment_items add column if not exists status text default 'Pending';
alter table public.consignment_items add column if not exists created_at timestamptz default now();
update public.consignment_items
set expected_qty = italy_packed_qty
where expected_qty = 0 and italy_packed_qty > 0;

create or replace function public.create_consignment_manifest(
  p_manifest_code text,
  p_shipment_reference text
)
returns public.consignments
language plpgsql
security definer
set search_path = public
as $$
declare v_manifest public.consignments;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_manifest_code, '')), '') is null then
    raise exception 'Manifest code is required';
  end if;
  insert into public.consignments (
    manifest_code, flight_number, departure_city, destination_city, status
  ) values (
    trim(p_manifest_code),
    coalesce(nullif(trim(p_shipment_reference), ''), 'Schedule not recorded'),
    'Milan, Italy', 'Manila, Philippines', 'Packing_Italy'
  ) returning * into v_manifest;
  return v_manifest;
end;
$$;

revoke all on function public.create_consignment_manifest(text,text) from public;
grant execute on function public.create_consignment_manifest(text,text) to authenticated;

create or replace function public.add_consignment_item(
  p_consignment_id uuid,
  p_sku text,
  p_batch_code text,
  p_best_before_date date,
  p_expected_qty integer
)
returns public.consignment_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_manifest public.consignments;
  v_item public.consignment_items;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if coalesce(p_expected_qty, 0) < 1 then raise exception 'Expected quantity must be positive'; end if;
  if nullif(trim(coalesce(p_batch_code, '')), '') is null then raise exception 'Batch code is required'; end if;
  select * into v_manifest from public.consignments where id = p_consignment_id for update;
  if not found then raise exception 'Consignment not found'; end if;
  if v_manifest.status <> 'Packing_Italy' then raise exception 'Manifest packing is closed'; end if;
  insert into public.consignment_items (
    consignment_id, sku, batch_code, best_before_date,
    expected_qty, italy_packed_qty, manila_scanned_qty
  ) values (
    p_consignment_id, p_sku, trim(p_batch_code), p_best_before_date,
    p_expected_qty, 0, 0
  ) returning * into v_item;
  return v_item;
end;
$$;

revoke all on function public.add_consignment_item(uuid,text,text,date,integer) from public;
grant execute on function public.add_consignment_item(uuid,text,text,date,integer) to authenticated;

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
  elsif p_stage = 'manila' then
    if v_manifest.status <> 'Arrived_Manila' then raise exception 'Consignment is not ready for Manila receiving'; end if;
    if v_item.manila_scanned_qty >= v_item.italy_packed_qty then
      raise exception 'Scanned quantity cannot exceed the packed manifest quantity';
    end if;
    update public.consignment_items
    set manila_scanned_qty = manila_scanned_qty + 1,
        status = case when manila_scanned_qty + 1 = italy_packed_qty then 'Matched' else 'Discrepancy' end
    where id = v_item.id returning * into v_item;
  else
    raise exception 'Stage must be milan or manila';
  end if;
  return v_item;
end;
$$;

revoke all on function public.record_consignment_scan(uuid,text,text) from public;
grant execute on function public.record_consignment_scan(uuid,text,text) to authenticated;

create or replace function public.advance_consignment(
  p_consignment_id uuid,
  p_to_status text
)
returns public.consignments
language plpgsql
security definer
set search_path = public
as $$
declare v_manifest public.consignments;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into v_manifest from public.consignments where id = p_consignment_id for update;
  if not found then raise exception 'Consignment not found'; end if;
  if not (
    (v_manifest.status = 'Packing_Italy' and p_to_status = 'In_Transit') or
    (v_manifest.status = 'In_Transit' and p_to_status = 'Arrived_Manila')
  ) then raise exception 'Invalid consignment transition'; end if;
  if p_to_status = 'In_Transit' and exists (
    select 1 from public.consignment_items
    where consignment_id = p_consignment_id
      and italy_packed_qty <> expected_qty
  ) then raise exception 'Every expected unit must be scan-packed before transit'; end if;
  update public.consignments
  set status = p_to_status,
      arrived_at = case when p_to_status = 'Arrived_Manila' then now() else arrived_at end
  where id = p_consignment_id returning * into v_manifest;
  return v_manifest;
end;
$$;

revoke all on function public.advance_consignment(uuid,text) from public;
grant execute on function public.advance_consignment(uuid,text) to authenticated;

create or replace function public.finalize_consignment_receipt(
  p_consignment_id uuid,
  p_notes text default null
)
returns public.consignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_manifest public.consignments;
  v_item public.consignment_items;
  v_balance public.inventory_balances;
  v_missing integer;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into v_manifest from public.consignments where id = p_consignment_id for update;
  if not found then raise exception 'Consignment not found'; end if;
  if v_manifest.status = 'Completed' then return v_manifest; end if;
  if v_manifest.status <> 'Arrived_Manila' then raise exception 'Consignment must be in Arrived Manila state'; end if;
  if not exists (select 1 from public.consignment_items where consignment_id = p_consignment_id) then
    raise exception 'Cannot finalize an empty manifest';
  end if;

  for v_item in select * from public.consignment_items
    where consignment_id = p_consignment_id for update
  loop
    if v_item.manila_scanned_qty > 0 then
      insert into public.product_batches (
        sku, box_code, batch_code, quantity, quantity_available,
        expiry_date, best_before_date, landed_date, hub, arrival_flight
      ) values (
        v_item.sku, v_item.batch_code, v_item.batch_code,
        v_item.manila_scanned_qty, v_item.manila_scanned_qty,
        v_item.best_before_date, v_item.best_before_date, current_date,
        'MANILA_MAIN', v_manifest.manifest_code
      );

      insert into public.inventory_balances (sku, location_code, on_hand)
      values (v_item.sku, 'MANILA_MAIN', v_item.manila_scanned_qty)
      on conflict (sku, location_code) do update
      set on_hand = inventory_balances.on_hand + excluded.on_hand,
          updated_at = now();

      select * into v_balance from public.inventory_balances
      where sku = v_item.sku and location_code = 'MANILA_MAIN';
      perform set_config('k2.allow_stock_write', 'on', true);
      update public.products
      set stock_available = v_balance.available, total_stock = v_balance.available
      where sku = v_item.sku;

      insert into public.inventory_events (
        sku, location_code, event_type, quantity, reference_type,
        reference_id, reason, actor_id, metadata
      ) values (
        v_item.sku, 'MANILA_MAIN', 'received', v_item.manila_scanned_qty,
        'consignment', v_manifest.id, p_notes, auth.uid(),
        jsonb_build_object('manifest', v_manifest.manifest_code, 'batch_code', v_item.batch_code)
      );
    end if;

    v_missing := v_item.italy_packed_qty - v_item.manila_scanned_qty;
    if v_missing > 0 then
      insert into public.inventory_events (
        sku, location_code, event_type, quantity, reference_type,
        reference_id, reason, actor_id, metadata
      ) values (
        v_item.sku, 'MANILA_MAIN', 'reconciled', v_missing,
        'consignment', v_manifest.id, p_notes, auth.uid(),
        jsonb_build_object('result', 'missing_on_arrival', 'manifest', v_manifest.manifest_code)
      );
    end if;
  end loop;

  update public.consignments set status = 'Completed', arrived_at = coalesce(arrived_at, now())
  where id = p_consignment_id returning * into v_manifest;
  return v_manifest;
end;
$$;

revoke all on function public.finalize_consignment_receipt(uuid,text) from public;
grant execute on function public.finalize_consignment_receipt(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Website checkout is an order request until staff confirms inventory and the
-- payment method. No payment is claimed or implied at submission time.
-- ---------------------------------------------------------------------------
create table if not exists public.order_requests (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique default
    ('WEB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  channel_source text not null default 'website' check (channel_source in (
    'website', 'shopee', 'tiktok', 'lazada', 'pasabuy', 'manual'
  )),
  status text not null default 'submitted' check (status in (
    'submitted', 'confirmed', 'fulfilled', 'cancelled'
  )),
  payment_status text not null default 'not_requested' check (payment_status in (
    'not_requested', 'awaiting_instructions', 'evidence_submitted',
    'verified', 'failed', 'refunded'
  )),
  customer_name text not null,
  customer_email text,
  customer_phone text,
  delivery_address text,
  fulfillment_method text not null default 'Metro Manila delivery',
  customer_note text,
  subtotal numeric not null default 0 check (subtotal >= 0),
  shipping_amount numeric not null default 0 check (shipping_amount >= 0),
  total_amount numeric not null default 0 check (total_amount >= 0),
  idempotency_key text not null unique,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_request_contact_required check (
    nullif(trim(coalesce(customer_email, '')), '') is not null
    or nullif(trim(coalesce(customer_phone, '')), '') is not null
  )
);

create table if not exists public.order_request_items (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests(id) on delete cascade,
  sku text not null references public.products(sku) on delete restrict,
  product_name text not null,
  quantity integer not null check (quantity > 0 and quantity <= 999),
  unit_price numeric not null check (unit_price >= 0),
  line_total numeric not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  unique (order_request_id, sku)
);

create table if not exists public.order_request_events (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  reason text,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists order_request_id uuid
  references public.order_requests(id) on delete set null;
alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists total_amount numeric;

create index if not exists order_requests_status_created_idx
  on public.order_requests (status, created_at desc);
create index if not exists order_request_items_request_idx
  on public.order_request_items (order_request_id);

create or replace function public.submit_order_request(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address text,
  p_fulfillment_method text,
  p_customer_note text,
  p_items jsonb,
  p_idempotency_key text
)
returns public.order_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.order_requests;
  v_item jsonb;
  v_product record;
  v_qty integer;
  v_subtotal numeric := 0;
  v_shipping numeric := 85;
begin
  if nullif(trim(coalesce(p_customer_name, '')), '') is null then
    raise exception 'Customer name is required';
  end if;
  if nullif(trim(coalesce(p_customer_email, '')), '') is null
     and nullif(trim(coalesce(p_customer_phone, '')), '') is null then
    raise exception 'Email or mobile number is required';
  end if;
  if nullif(trim(coalesce(p_delivery_address, '')), '') is null then
    raise exception 'Delivery address is required';
  end if;
  if nullif(trim(coalesce(p_idempotency_key, '')), '') is null then
    raise exception 'Request key is required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one item is required';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'A request may contain at most 50 items';
  end if;

  select * into v_order
  from public.order_requests
  where idempotency_key = p_idempotency_key;
  if found then return v_order; end if;

  insert into public.order_requests (
    customer_name, customer_email, customer_phone, delivery_address,
    fulfillment_method, customer_note, idempotency_key, shipping_amount
  ) values (
    trim(p_customer_name), nullif(trim(p_customer_email), ''),
    nullif(trim(p_customer_phone), ''), trim(p_delivery_address),
    coalesce(nullif(trim(p_fulfillment_method), ''), 'Metro Manila delivery'),
    nullif(trim(p_customer_note), ''), trim(p_idempotency_key), v_shipping
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty < 1 or v_qty > 999 then raise exception 'Invalid item quantity'; end if;

    select sku,
           coalesce(nullif(name, ''), nullif(title, ''), sku) as product_name,
           coalesce(srp, retail_price, 0) as unit_price,
           coalesce(stock_available, total_stock, 0) as available_stock,
           status::text as product_status
    into v_product
    from public.products
    where sku = v_item ->> 'sku';

    if not found then raise exception 'Product % was not found', v_item ->> 'sku'; end if;
    if v_product.product_status not in ('Live', 'Active') then
      raise exception 'Product % is not available for website orders', v_product.sku;
    end if;
    if v_product.available_stock < v_qty then
      raise exception 'Only % units of % are currently available', v_product.available_stock, v_product.product_name;
    end if;

    insert into public.order_request_items (
      order_request_id, sku, product_name, quantity, unit_price, line_total
    ) values (
      v_order.id, v_product.sku, v_product.product_name, v_qty,
      v_product.unit_price, v_product.unit_price * v_qty
    );
    v_subtotal := v_subtotal + (v_product.unit_price * v_qty);
  end loop;

  update public.order_requests
  set subtotal = v_subtotal,
      total_amount = v_subtotal + v_shipping,
      updated_at = now()
  where id = v_order.id
  returning * into v_order;

  insert into public.order_request_events (order_request_id, to_status, metadata)
  values (v_order.id, 'submitted', jsonb_build_object('channel', 'website'));
  return v_order;
end;
$$;

revoke all on function public.submit_order_request(text,text,text,text,text,text,jsonb,text) from public;
grant execute on function public.submit_order_request(text,text,text,text,text,text,jsonb,text)
  to anon, authenticated;

create or replace function public.confirm_order_request(
  p_order_request_id uuid,
  p_reason text default null
)
returns public.order_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.order_requests;
  v_line record;
  v_balance public.inventory_balances;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into v_order from public.order_requests
  where id = p_order_request_id for update;
  if not found then raise exception 'Order request not found'; end if;
  if v_order.status = 'confirmed' then return v_order; end if;
  if v_order.status <> 'submitted' then
    raise exception 'Only submitted requests can be confirmed';
  end if;

  for v_line in
    select * from public.order_request_items where order_request_id = v_order.id
  loop
    insert into public.inventory_balances (sku, location_code, on_hand)
    select p.sku, 'MANILA_MAIN', greatest(coalesce(p.stock_available, p.total_stock, 0), 0)
    from public.products p where p.sku = v_line.sku
    on conflict (sku, location_code) do nothing;

    select * into v_balance from public.inventory_balances
    where sku = v_line.sku and location_code = 'MANILA_MAIN' for update;
    if v_balance.available < v_line.quantity then
      raise exception 'Insufficient available stock for %', v_line.sku;
    end if;

    update public.inventory_balances
    set reserved = reserved + v_line.quantity, updated_at = now()
    where sku = v_line.sku and location_code = 'MANILA_MAIN';

    perform set_config('k2.allow_stock_write', 'on', true);
    update public.products
    set stock_available = v_balance.available - v_line.quantity,
        total_stock = v_balance.available - v_line.quantity
    where sku = v_line.sku;

    insert into public.inventory_events (
      sku, location_code, event_type, quantity, reference_type,
      reference_id, reason, actor_id
    ) values (
      v_line.sku, 'MANILA_MAIN', 'reserved', v_line.quantity,
      'order_request', v_order.id, p_reason, auth.uid()
    );

    insert into public.orders (
      sku, quantity, channel_source, fulfillment_method, order_status,
      payment_status, customer_name, customer_email, total_amount,
      order_request_id
    ) values (
      v_line.sku, v_line.quantity, 'website_retail'::channel_type,
      v_order.fulfillment_method, 'Pending'::order_status_enum,
      'Unpaid'::payment_status_enum, v_order.customer_name,
      v_order.customer_email, v_line.line_total, v_order.id
    );
  end loop;

  update public.order_requests
  set status = 'confirmed', confirmed_by = auth.uid(),
      confirmed_at = now(), updated_at = now()
  where id = v_order.id returning * into v_order;

  insert into public.order_request_events (
    order_request_id, from_status, to_status, reason, actor_id
  ) values (v_order.id, 'submitted', 'confirmed', p_reason, auth.uid());
  return v_order;
end;
$$;

revoke all on function public.confirm_order_request(uuid,text) from public;
grant execute on function public.confirm_order_request(uuid,text) to authenticated;

create or replace function public.mark_order_line_packed(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare v_order public.orders;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order line not found'; end if;
  if v_order.order_status::text = 'Packed' then return v_order; end if;
  if v_order.order_status::text <> 'Pending' then
    raise exception 'Only pending order lines can be packed';
  end if;
  update public.orders set order_status = 'Packed'::order_status_enum
  where id = p_order_id returning * into v_order;
  if v_order.order_request_id is not null then
    insert into public.order_request_events (
      order_request_id, from_status, to_status, actor_id, metadata
    ) values (
      v_order.order_request_id, 'confirmed', 'confirmed', auth.uid(),
      jsonb_build_object('event', 'line_packed', 'order_line_id', v_order.id, 'sku', v_order.sku)
    );
  end if;
  return v_order;
end;
$$;

revoke all on function public.mark_order_line_packed(uuid) from public;
grant execute on function public.mark_order_line_packed(uuid) to authenticated;

create or replace function public.set_order_request_payment_status(
  p_order_request_id uuid,
  p_to_status text,
  p_evidence_note text
)
returns public.order_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.order_requests;
  v_from text;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into v_order from public.order_requests
  where id = p_order_request_id for update;
  if not found then raise exception 'Order request not found'; end if;
  v_from := v_order.payment_status;
  if p_to_status = v_from then return v_order; end if;
  if not (
    (v_from = 'not_requested' and p_to_status = 'awaiting_instructions') or
    (v_from = 'awaiting_instructions' and p_to_status in ('evidence_submitted', 'failed')) or
    (v_from = 'evidence_submitted' and p_to_status in ('verified', 'failed')) or
    (v_from = 'verified' and p_to_status = 'refunded')
  ) then raise exception 'Invalid payment-status transition'; end if;
  if p_to_status in ('evidence_submitted', 'verified', 'failed', 'refunded')
     and nullif(trim(coalesce(p_evidence_note, '')), '') is null then
    raise exception 'An evidence or reconciliation note is required';
  end if;
  update public.order_requests set payment_status = p_to_status, updated_at = now()
  where id = p_order_request_id returning * into v_order;
  insert into public.order_request_events (
    order_request_id, from_status, to_status, reason, actor_id, metadata
  ) values (
    v_order.id, v_order.status, v_order.status, p_evidence_note, auth.uid(),
    jsonb_build_object('event', 'payment_status_changed', 'from', v_from, 'to', p_to_status)
  );
  return v_order;
end;
$$;

revoke all on function public.set_order_request_payment_status(uuid,text,text) from public;
grant execute on function public.set_order_request_payment_status(uuid,text,text) to authenticated;

create or replace function public.cancel_order_request(
  p_order_request_id uuid,
  p_reason text
)
returns public.order_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.order_requests;
  v_line record;
  v_balance public.inventory_balances;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'Cancellation reason is required'; end if;
  select * into v_order from public.order_requests
  where id = p_order_request_id for update;
  if not found then raise exception 'Order request not found'; end if;
  if v_order.status = 'cancelled' then return v_order; end if;
  if v_order.status not in ('submitted', 'confirmed') then
    raise exception 'This order request cannot be cancelled';
  end if;

  if v_order.status = 'confirmed' then
    for v_line in select * from public.order_request_items where order_request_id = v_order.id
    loop
      select * into v_balance from public.inventory_balances
      where sku = v_line.sku and location_code = 'MANILA_MAIN' for update;
      if not found or v_balance.reserved < v_line.quantity then
        raise exception 'Reservation mismatch for %', v_line.sku;
      end if;
      update public.inventory_balances
      set reserved = reserved - v_line.quantity, updated_at = now()
      where sku = v_line.sku and location_code = 'MANILA_MAIN';
      select * into v_balance from public.inventory_balances
      where sku = v_line.sku and location_code = 'MANILA_MAIN';
      perform set_config('k2.allow_stock_write', 'on', true);
      update public.products set stock_available = v_balance.available,
        total_stock = v_balance.available where sku = v_line.sku;
      insert into public.inventory_events (
        sku, location_code, event_type, quantity, reference_type,
        reference_id, reason, actor_id
      ) values (
        v_line.sku, 'MANILA_MAIN', 'reservation_released', v_line.quantity,
        'order_request', v_order.id, p_reason, auth.uid()
      );
    end loop;
    update public.orders set order_status = 'Cancelled'::order_status_enum
    where order_request_id = v_order.id and order_status::text <> 'Shipped';
  end if;

  update public.order_requests set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = v_order.id returning * into v_order;
  insert into public.order_request_events (
    order_request_id, from_status, to_status, reason, actor_id
  ) values (v_order.id, case when v_order.confirmed_at is null then 'submitted' else 'confirmed' end,
            'cancelled', p_reason, auth.uid());
  return v_order;
end;
$$;

revoke all on function public.cancel_order_request(uuid,text) from public;
grant execute on function public.cancel_order_request(uuid,text) to authenticated;

create or replace function public.fulfill_order_request(
  p_order_request_id uuid,
  p_handover_note text
)
returns public.order_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.order_requests;
  v_line record;
  v_batch record;
  v_balance public.inventory_balances;
  v_remaining integer;
  v_take integer;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_handover_note, '')), '') is null then
    raise exception 'Courier or handover note is required';
  end if;
  select * into v_order from public.order_requests where id = p_order_request_id for update;
  if not found then raise exception 'Order request not found'; end if;
  if v_order.status = 'fulfilled' then return v_order; end if;
  if v_order.status <> 'confirmed' then raise exception 'Order request is not confirmed'; end if;
  if v_order.payment_status <> 'verified' then raise exception 'Payment must be explicitly verified before fulfillment'; end if;
  if exists (select 1 from public.orders where order_request_id = v_order.id and order_status::text <> 'Packed') then
    raise exception 'Every order line must be packed before fulfillment';
  end if;

  for v_line in select * from public.order_request_items where order_request_id = v_order.id
  loop
    select * into v_balance from public.inventory_balances
    where sku = v_line.sku and location_code = 'MANILA_MAIN' for update;
    if not found or v_balance.reserved < v_line.quantity or v_balance.on_hand < v_line.quantity then
      raise exception 'Inventory reservation mismatch for %', v_line.sku;
    end if;
    v_remaining := v_line.quantity;
    for v_batch in select id, quantity, quantity_available from public.product_batches
      where sku = v_line.sku and greatest(coalesce(quantity, 0), coalesce(quantity_available, 0)) > 0
      order by coalesce(expiry_date, best_before_date) asc nulls last, created_at asc
      for update
    loop
      exit when v_remaining = 0;
      v_take := least(v_remaining, greatest(coalesce(v_batch.quantity, 0), coalesce(v_batch.quantity_available, 0)));
      update public.product_batches
      set quantity = greatest(coalesce(quantity, quantity_available, 0) - v_take, 0),
          quantity_available = greatest(coalesce(quantity_available, quantity, 0) - v_take, 0)
      where id = v_batch.id;
      v_remaining := v_remaining - v_take;
    end loop;
    if v_remaining > 0 then raise exception 'Batch stock mismatch for %', v_line.sku; end if;

    update public.inventory_balances
    set on_hand = on_hand - v_line.quantity,
        reserved = reserved - v_line.quantity,
        updated_at = now()
    where sku = v_line.sku and location_code = 'MANILA_MAIN';
    select * into v_balance from public.inventory_balances
    where sku = v_line.sku and location_code = 'MANILA_MAIN';
    perform set_config('k2.allow_stock_write', 'on', true);
    update public.products set stock_available = v_balance.available,
      total_stock = v_balance.available where sku = v_line.sku;
    insert into public.inventory_events (
      sku, location_code, event_type, quantity, reference_type,
      reference_id, reason, actor_id
    ) values (
      v_line.sku, 'MANILA_MAIN', 'fulfilled', v_line.quantity,
      'order_request', v_order.id, p_handover_note, auth.uid()
    );
  end loop;

  update public.orders set order_status = 'Shipped'::order_status_enum
  where order_request_id = v_order.id;
  update public.order_requests set status = 'fulfilled', fulfilled_at = now(), updated_at = now()
  where id = v_order.id returning * into v_order;
  insert into public.order_request_events (
    order_request_id, from_status, to_status, reason, actor_id
  ) values (v_order.id, 'confirmed', 'fulfilled', p_handover_note, auth.uid());
  return v_order;
end;
$$;

revoke all on function public.fulfill_order_request(uuid,text) from public;
grant execute on function public.fulfill_order_request(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Persistent Pasabuy request, quote versions, and controlled state changes.
-- ---------------------------------------------------------------------------
create table if not exists public.pasabuy_requests (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique default
    ('PB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_name text not null,
  customer_email text,
  customer_phone text,
  item_title text not null,
  reference_url text,
  quantity integer not null default 1 check (quantity > 0 and quantity <= 999),
  target_budget_php numeric check (target_budget_php is null or target_budget_php >= 0),
  shipping_preference text not null default 'sea' check (shipping_preference in ('air', 'sea', 'either')),
  alternatives_allowed boolean not null default false,
  customer_notes text,
  status text not null default 'request_received' check (status in (
    'request_received', 'researching', 'quoted', 'approved', 'purchasing',
    'purchased', 'in_transit', 'arrived', 'delivered', 'expired', 'cancelled'
  )),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pasabuy_contact_required check (
    nullif(trim(coalesce(customer_email, '')), '') is not null
    or nullif(trim(coalesce(customer_phone, '')), '') is not null
  )
);

create table if not exists public.pasabuy_quotes (
  id uuid primary key default gen_random_uuid(),
  pasabuy_request_id uuid not null references public.pasabuy_requests(id) on delete cascade,
  version integer not null,
  currency text not null default 'EUR',
  item_cost_foreign numeric not null check (item_cost_foreign >= 0),
  fx_rate numeric not null check (fx_rate > 0),
  fx_source text not null,
  fx_captured_at timestamptz not null,
  weight_kg numeric not null default 0 check (weight_kg >= 0),
  shipping_method text not null check (shipping_method in ('air', 'sea')),
  freight_rate_foreign_per_kg numeric not null check (freight_rate_foreign_per_kg >= 0),
  freight_cost_php numeric not null check (freight_cost_php >= 0),
  customs_tax_percent numeric not null default 0 check (customs_tax_percent between 0 and 100),
  customs_tax_php numeric not null default 0 check (customs_tax_php >= 0),
  handling_php numeric not null default 0 check (handling_php >= 0),
  estimated_landed_cost_php numeric not null check (estimated_landed_cost_php >= 0),
  margin_percent numeric not null default 0,
  final_price_php numeric not null check (final_price_php >= 0),
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'expired', 'withdrawn')),
  valid_until timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (pasabuy_request_id, version)
);

create table if not exists public.pasabuy_events (
  id uuid primary key default gen_random_uuid(),
  pasabuy_request_id uuid not null references public.pasabuy_requests(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  reason text,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pasabuy_requests_status_created_idx
  on public.pasabuy_requests (status, created_at desc);
create index if not exists pasabuy_quotes_request_version_idx
  on public.pasabuy_quotes (pasabuy_request_id, version desc);

create or replace function public.submit_pasabuy_request(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_item_title text,
  p_reference_url text,
  p_quantity integer,
  p_target_budget_php numeric,
  p_shipping_preference text,
  p_alternatives_allowed boolean,
  p_customer_notes text
)
returns table (id uuid, public_reference text, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare v_request public.pasabuy_requests;
begin
  if nullif(trim(coalesce(p_customer_name, '')), '') is null then
    raise exception 'Customer name is required';
  end if;
  if nullif(trim(coalesce(p_customer_email, '')), '') is null
     and nullif(trim(coalesce(p_customer_phone, '')), '') is null then
    raise exception 'Email or mobile number is required';
  end if;
  if nullif(trim(coalesce(p_item_title, '')), '') is null then
    raise exception 'Item description is required';
  end if;
  if coalesce(p_quantity, 0) < 1 or p_quantity > 999 then
    raise exception 'Quantity must be between 1 and 999';
  end if;
  if coalesce(p_shipping_preference, '') not in ('air', 'sea', 'either') then
    raise exception 'Invalid shipping preference';
  end if;

  insert into public.pasabuy_requests (
    customer_name, customer_email, customer_phone, item_title,
    reference_url, quantity, target_budget_php, shipping_preference,
    alternatives_allowed, customer_notes
  ) values (
    trim(p_customer_name), nullif(trim(p_customer_email), ''),
    nullif(trim(p_customer_phone), ''), trim(p_item_title),
    nullif(trim(p_reference_url), ''), p_quantity, p_target_budget_php,
    p_shipping_preference, coalesce(p_alternatives_allowed, false),
    nullif(trim(p_customer_notes), '')
  ) returning * into v_request;

  insert into public.pasabuy_events (pasabuy_request_id, event_type, to_status)
  values (v_request.id, 'request_submitted', 'request_received');

  return query select v_request.id, v_request.public_reference,
                      v_request.status, v_request.created_at;
end;
$$;

revoke all on function public.submit_pasabuy_request(text,text,text,text,text,integer,numeric,text,boolean,text) from public;
grant execute on function public.submit_pasabuy_request(text,text,text,text,text,integer,numeric,text,boolean,text)
  to anon, authenticated;

create or replace function public.transition_pasabuy_request(
  p_request_id uuid,
  p_to_status text,
  p_reason text default null
)
returns public.pasabuy_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.pasabuy_requests;
  v_from_status text;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into v_request from public.pasabuy_requests
  where id = p_request_id for update;
  if not found then raise exception 'Pasabuy request not found'; end if;
  if v_request.status = p_to_status then return v_request; end if;

  if not (
    (v_request.status = 'request_received' and p_to_status in ('researching', 'cancelled')) or
    (v_request.status = 'researching' and p_to_status in ('quoted', 'cancelled')) or
    (v_request.status = 'quoted' and p_to_status in ('approved', 'researching', 'expired', 'cancelled')) or
    (v_request.status = 'approved' and p_to_status in ('purchasing', 'cancelled')) or
    (v_request.status = 'purchasing' and p_to_status in ('purchased', 'cancelled')) or
    (v_request.status = 'purchased' and p_to_status = 'in_transit') or
    (v_request.status = 'in_transit' and p_to_status = 'arrived') or
    (v_request.status = 'arrived' and p_to_status = 'delivered')
  ) then
    raise exception 'Invalid Pasabuy transition: % to %', v_request.status, p_to_status;
  end if;

  v_from_status := v_request.status;

  update public.pasabuy_requests
  set status = p_to_status, updated_at = now()
  where id = p_request_id returning * into v_request;

  insert into public.pasabuy_events (
    pasabuy_request_id, event_type, from_status, to_status, reason, actor_id
  ) values (
    v_request.id, 'status_changed', v_from_status,
    p_to_status, p_reason, auth.uid()
  );
  return v_request;
end;
$$;

revoke all on function public.transition_pasabuy_request(uuid,text,text) from public;
grant execute on function public.transition_pasabuy_request(uuid,text,text) to authenticated;

create or replace function public.save_pasabuy_quote(
  p_request_id uuid,
  p_item_cost_foreign numeric,
  p_fx_rate numeric,
  p_fx_source text,
  p_fx_captured_at timestamptz,
  p_weight_kg numeric,
  p_shipping_method text,
  p_freight_rate_foreign_per_kg numeric,
  p_customs_tax_percent numeric,
  p_handling_php numeric,
  p_margin_percent numeric,
  p_final_price_php numeric,
  p_valid_until timestamptz
)
returns public.pasabuy_quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.pasabuy_quotes;
  v_version integer;
  v_freight_php numeric;
  v_tax_php numeric;
  v_landed numeric;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  perform 1 from public.pasabuy_requests where id = p_request_id for update;
  if not found then raise exception 'Pasabuy request not found'; end if;
  if nullif(trim(coalesce(p_fx_source, '')), '') is null or p_fx_captured_at is null then
    raise exception 'FX source and capture time are required';
  end if;
  if p_shipping_method not in ('air', 'sea') then raise exception 'Invalid shipping method'; end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.pasabuy_quotes where pasabuy_request_id = p_request_id;
  v_freight_php := p_weight_kg * p_freight_rate_foreign_per_kg * p_fx_rate;
  v_tax_php := ((p_item_cost_foreign * p_fx_rate) + v_freight_php)
               * (p_customs_tax_percent / 100);
  v_landed := (p_item_cost_foreign * p_fx_rate) + v_freight_php
              + v_tax_php + p_handling_php;

  insert into public.pasabuy_quotes (
    pasabuy_request_id, version, item_cost_foreign, fx_rate, fx_source,
    fx_captured_at, weight_kg, shipping_method,
    freight_rate_foreign_per_kg, freight_cost_php, customs_tax_percent,
    customs_tax_php, handling_php, estimated_landed_cost_php,
    margin_percent, final_price_php, valid_until, created_by
  ) values (
    p_request_id, v_version, p_item_cost_foreign, p_fx_rate, trim(p_fx_source),
    p_fx_captured_at, p_weight_kg, p_shipping_method,
    p_freight_rate_foreign_per_kg, v_freight_php, p_customs_tax_percent,
    v_tax_php, p_handling_php, v_landed, p_margin_percent,
    p_final_price_php, p_valid_until, auth.uid()
  ) returning * into v_quote;

  update public.pasabuy_requests
  set status = case when status in ('request_received', 'researching') then 'quoted' else status end,
      updated_at = now()
  where id = p_request_id;

  insert into public.pasabuy_events (
    pasabuy_request_id, event_type, to_status, actor_id,
    metadata
  ) values (
    p_request_id, 'quote_saved', 'quoted', auth.uid(),
    jsonb_build_object('quote_id', v_quote.id, 'version', v_version)
  );
  return v_quote;
end;
$$;

revoke all on function public.save_pasabuy_quote(uuid,numeric,numeric,text,timestamptz,numeric,text,numeric,numeric,numeric,numeric,numeric,timestamptz) from public;
grant execute on function public.save_pasabuy_quote(uuid,numeric,numeric,text,timestamptz,numeric,text,numeric,numeric,numeric,numeric,numeric,timestamptz)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Channel catalog readiness. Listings remain drafts until a real connector
-- publishes them; credentials are never stored in browser-readable tables.
-- ---------------------------------------------------------------------------
create table if not exists public.channel_listings (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku) on delete cascade,
  channel_source text not null,
  external_item_id text,
  external_sku_id text,
  channel_price numeric,
  status text not null default 'Active'
    check (status in ('Active', 'Paused', 'Unlinked')),
  publication_status text default 'draft',
  validation_errors jsonb not null default '[]'::jsonb,
  last_synced_at timestamptz,
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_sku_channel unique (sku, channel_source)
);

-- Late-stage admin tables were introduced by separate historical migrations.
-- Create them here so the security lockdown below is safe on every deployment.
create table if not exists public.channel_credentials (
  id uuid primary key default gen_random_uuid(),
  channel_code text unique not null,
  encrypted_payload text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_allocations (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku) on delete cascade,
  staff_user_id uuid references public.user_profiles(id) on delete set null,
  staff_name text not null,
  location text,
  bin text,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staff_allocations_sku_staff_uniq
  on public.staff_allocations (sku, staff_name);

create table if not exists public.product_deletions (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  product_name text,
  snapshot jsonb,
  deleted_by uuid references public.user_profiles(id) on delete set null,
  deleted_by_email text,
  deleted_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  priority text not null check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  message text not null,
  action_url text,
  read_status boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.error_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message text,
  stack text,
  url text,
  user_agent text,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'new'
);

create table if not exists public.channel_connections (
  channel text primary key,
  display_name text,
  status text not null default 'not_connected',
  last_event_at timestamptz,
  note text,
  updated_at timestamptz not null default now()
);

alter table public.channel_listings add column if not exists publication_status text
  default 'draft';
alter table public.channel_listings add column if not exists validation_errors jsonb
  not null default '[]'::jsonb;
alter table public.channel_listings add column if not exists last_synced_at timestamptz;
alter table public.channel_listings add column if not exists sync_error text;

alter table public.channel_listings drop constraint if exists channel_listings_publication_status_check;
alter table public.channel_listings add constraint channel_listings_publication_status_check
  check (publication_status in ('draft', 'ready', 'publishing', 'published', 'error', 'paused'));

insert into public.channel_connections (channel, display_name, status, note)
values
  ('website', 'K2 Jimzon Website', 'not_connected', 'Verify a real Website request before marking operational'),
  ('pasabuy', 'K2 Jimzon Pasabuy', 'not_connected', 'Verify a real Pasabuy request before marking operational'),
  ('shopee', 'Shopee Seller Center', 'not_connected', null),
  ('lazada', 'Lazada Open Platform', 'not_connected', null),
  ('tiktok', 'TikTok Shop', 'not_connected', null)
on conflict (channel) do nothing;

create or replace function public.verify_internal_channel_event(
  p_channel text,
  p_public_reference text,
  p_note text
)
returns public.channel_connections
language plpgsql
security definer
set search_path = public
as $$
declare v_connection public.channel_connections;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if p_channel not in ('website', 'pasabuy') then
    raise exception 'Only Website and Pasabuy are verified through this function';
  end if;
  if nullif(trim(coalesce(p_public_reference, '')), '') is null
     or nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'A real reference and reconciliation note are required';
  end if;
  if p_channel = 'website' and not exists (
    select 1 from public.order_requests where public_reference = trim(p_public_reference)
  ) then raise exception 'Website order reference was not found'; end if;
  if p_channel = 'pasabuy' and not exists (
    select 1 from public.pasabuy_requests where public_reference = trim(p_public_reference)
  ) then raise exception 'Pasabuy reference was not found'; end if;

  update public.channel_connections
  set status = 'live', last_event_at = now(),
      note = trim(p_note) || ' · verified reference ' || trim(p_public_reference),
      updated_at = now()
  where channel = p_channel
  returning * into v_connection;
  return v_connection;
end;
$$;

revoke all on function public.verify_internal_channel_event(text,text,text) from public;
grant execute on function public.verify_internal_channel_event(text,text,text) to authenticated;

create or replace view public.v_channel_catalog_readiness
with (security_invoker = true)
as
select
  p.sku,
  coalesce(p.name, p.title, p.sku) as product_name,
  c.channel,
  cl.publication_status,
  cl.external_item_id,
  cl.channel_price,
  cl.validation_errors,
  cl.last_synced_at,
  cc.status as connection_status,
  array_remove(array[
    case when coalesce(p.name, p.title, '') = '' then 'name' end,
    case when coalesce(p.srp, p.retail_price, 0) <= 0 then 'price' end,
    case when coalesce(p.stock_available, p.total_stock, 0) < 0 then 'stock' end,
    case when coalesce(p.primary_image_url, p.image_url, '') = '' then 'image' end
  ], null) as missing_fields
from public.products p
cross join (values ('website'), ('shopee'), ('tiktok'), ('lazada')) c(channel)
left join lateral (
  select listing.*
  from public.channel_listings listing
  where listing.sku = p.sku and (
    listing.channel_source = c.channel
    or (c.channel = 'website' and listing.channel_source in ('website_retail', 'website_vip'))
    or (c.channel = 'tiktok' and listing.channel_source = 'tiktok_shop')
    or (c.channel = 'shopee' and listing.channel_source like 'shopee%')
  )
  order by case listing.publication_status
    when 'published' then 1 when 'publishing' then 2 when 'ready' then 3 else 4 end,
    listing.updated_at desc
  limit 1
) cl on true
left join public.channel_connections cc on cc.channel = c.channel;

-- ---------------------------------------------------------------------------
-- RLS: storefront reads live products; all operational data is staff-only.
-- Anonymous writes happen only through the two validated RPCs above.
-- ---------------------------------------------------------------------------
alter table public.inventory_balances enable row level security;
alter table public.inventory_events enable row level security;
alter table public.order_requests enable row level security;
alter table public.order_request_items enable row level security;
alter table public.order_request_events enable row level security;
alter table public.pasabuy_requests enable row level security;
alter table public.pasabuy_quotes enable row level security;
alter table public.pasabuy_events enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.product_batches enable row level security;
alter table public.consignments enable row level security;
alter table public.consignment_items enable row level security;
alter table public.channel_listings enable row level security;
alter table public.channel_connections enable row level security;
alter table public.user_profiles enable row level security;
alter table public.channel_credentials enable row level security;
alter table public.globe_products enable row level security;
alter table public.reviews enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.po_lines enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.staff_allocations enable row level security;
alter table public.product_deletions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.error_reports enable row level security;

do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'products','orders','product_batches','consignments','consignment_items',
        'channel_listings','channel_connections','inventory_balances',
        'inventory_events','order_requests','order_request_items',
        'order_request_events','pasabuy_requests','pasabuy_quotes','pasabuy_events',
        'user_profiles','channel_credentials','globe_products','reviews',
        'suppliers','purchase_orders','po_lines','conversations','messages',
        'staff_allocations','product_deletions','audit_logs','notifications',
        'error_reports'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy products_public_live_read on public.products
for select to anon
using (status::text in ('Live', 'Active'));

create policy products_authenticated_read on public.products
for select to authenticated
using (status::text in ('Live', 'Active') or public.is_staff());

create policy products_staff_insert on public.products
for insert to authenticated with check (public.is_staff());
create policy products_staff_update on public.products
for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy profiles_staff_read on public.user_profiles
for select to authenticated
using (auth.uid() = id or public.is_staff());

create policy orders_staff_read on public.orders
for select to authenticated using (public.is_staff());

create policy operational_staff_inventory_balances on public.inventory_balances
for select to authenticated using (public.is_staff());
create policy operational_staff_inventory_events on public.inventory_events
for select to authenticated using (public.is_staff());
create policy operational_staff_order_requests on public.order_requests
for select to authenticated using (public.is_staff());
create policy operational_staff_order_items on public.order_request_items
for select to authenticated using (public.is_staff());
create policy operational_staff_order_events on public.order_request_events
for select to authenticated using (public.is_staff());
create policy operational_staff_pasabuy_requests on public.pasabuy_requests
for select to authenticated using (public.is_staff());
create policy operational_staff_pasabuy_quotes on public.pasabuy_quotes
for select to authenticated using (public.is_staff());
create policy operational_staff_pasabuy_events on public.pasabuy_events
for select to authenticated using (public.is_staff());
create policy operational_staff_batches on public.product_batches
for select to authenticated using (public.is_staff());
create policy operational_staff_consignments on public.consignments
for select to authenticated using (public.is_staff());
create policy operational_staff_consignment_items on public.consignment_items
for select to authenticated using (public.is_staff());
create policy operational_staff_channel_listings on public.channel_listings
for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy operational_staff_channel_connections on public.channel_connections
for select to authenticated using (public.is_staff());

create policy globe_products_public_read on public.globe_products
for select to anon, authenticated using (true);
create policy globe_products_staff_manage on public.globe_products
for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy reviews_public_read on public.reviews
for select to anon, authenticated using (true);
create policy reviews_staff_manage on public.reviews
for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy suppliers_staff_manage on public.suppliers
for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy purchase_orders_staff_manage on public.purchase_orders
for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy po_lines_staff_manage on public.po_lines
for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy conversations_staff_read on public.conversations
for select to authenticated using (public.is_staff());
create policy messages_staff_read on public.messages
for select to authenticated using (public.is_staff());
create policy product_deletions_admin_read on public.product_deletions
for select to authenticated using (public.is_admin());
create policy audit_logs_admin_read on public.audit_logs
for select to authenticated using (public.is_admin());
create policy notifications_staff_read on public.notifications
for select to authenticated using (public.is_staff());
create policy notifications_staff_update on public.notifications
for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy error_reports_public_insert on public.error_reports
for insert to anon, authenticated with check (true);
create policy error_reports_staff_read on public.error_reports
for select to authenticated using (public.is_staff());

-- Product deletion is intentionally unavailable through direct table access.
-- Only an admin with their own server-verified delete PIN may use this RPC.
create or replace function public.delete_products_with_pin(skus text[], candidate_pin text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_email text;
  v_product record;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if not public.verify_delete_pin(candidate_pin) then raise exception 'Invalid delete PIN'; end if;
  select email into v_email from public.user_profiles where id = auth.uid();
  for v_product in select * from public.products where sku = any(skus) for update
  loop
    insert into public.product_deletions (
      sku, product_name, snapshot, deleted_by, deleted_by_email
    ) values (
      v_product.sku, coalesce(v_product.name, v_product.title, v_product.sku),
      to_jsonb(v_product), auth.uid(), v_email
    );
    delete from public.products where sku = v_product.sku;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.delete_products_with_pin(text[],text) from public;
grant execute on function public.delete_products_with_pin(text[],text) to authenticated;

-- Audit/event rows are append-only, including for staff clients.
create or replace function public.reject_event_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Event history is append-only';
end;
$$;

drop trigger if exists trg_inventory_events_immutable on public.inventory_events;
create trigger trg_inventory_events_immutable before update or delete on public.inventory_events
for each row execute function public.reject_event_mutation();
drop trigger if exists trg_order_request_events_immutable on public.order_request_events;
create trigger trg_order_request_events_immutable before update or delete on public.order_request_events
for each row execute function public.reject_event_mutation();
drop trigger if exists trg_pasabuy_events_immutable on public.pasabuy_events;
create trigger trg_pasabuy_events_immutable before update or delete on public.pasabuy_events
for each row execute function public.reject_event_mutation();

grant usage on schema public to anon, authenticated;

-- Grants expose only the operations the client actually uses. RLS then decides
-- which rows are accessible. Do not rely on project-specific default grants.
revoke all on public.products, public.orders, public.product_batches,
  public.consignments, public.consignment_items, public.channel_listings,
  public.channel_connections, public.channel_credentials,
  public.inventory_balances, public.inventory_events,
  public.order_requests, public.order_request_items, public.order_request_events,
  public.pasabuy_requests, public.pasabuy_quotes, public.pasabuy_events,
  public.user_profiles, public.globe_products, public.reviews,
  public.suppliers, public.purchase_orders, public.po_lines,
  public.conversations, public.messages, public.staff_allocations,
  public.product_deletions, public.audit_logs, public.notifications,
  public.error_reports
from anon, authenticated;

grant select on public.products, public.globe_products, public.reviews
to anon;

grant select on public.products, public.orders, public.product_batches,
  public.consignments, public.consignment_items, public.channel_listings,
  public.channel_connections, public.inventory_balances, public.inventory_events,
  public.order_requests, public.order_request_items, public.order_request_events,
  public.pasabuy_requests, public.pasabuy_quotes, public.pasabuy_events,
  public.user_profiles, public.globe_products, public.reviews,
  public.suppliers, public.purchase_orders, public.po_lines,
  public.conversations, public.messages, public.product_deletions,
  public.audit_logs, public.notifications, public.error_reports
to authenticated;

grant insert on public.error_reports to anon, authenticated;
grant insert, update on public.products to authenticated;
grant insert, update, delete on public.globe_products, public.reviews to authenticated;
grant insert, update on public.suppliers to authenticated;
grant update on public.notifications to authenticated;

grant select on public.v_channel_catalog_readiness to authenticated;
grant select on public.v_expiring_batches to authenticated;

-- Public product images remain readable; only staff may write to the bucket.
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Authenticated users can update" on storage.objects;
drop policy if exists "Authenticated users can delete" on storage.objects;
drop policy if exists product_images_public_read on storage.objects;
drop policy if exists product_images_staff_insert on storage.objects;
drop policy if exists product_images_staff_update on storage.objects;
drop policy if exists product_images_staff_delete on storage.objects;
create policy product_images_public_read on storage.objects
for select to anon, authenticated using (bucket_id = 'product-images');
create policy product_images_staff_insert on storage.objects
for insert to authenticated with check (bucket_id = 'product-images' and public.is_staff());
create policy product_images_staff_update on storage.objects
for update to authenticated using (bucket_id = 'product-images' and public.is_staff())
with check (bucket_id = 'product-images' and public.is_staff());
create policy product_images_staff_delete on storage.objects
for delete to authenticated using (bucket_id = 'product-images' and public.is_staff());

notify pgrst, 'reload schema';
