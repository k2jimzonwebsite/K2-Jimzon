-- K2 Jimzon operations hardening
--
-- Additive follow-up to 20260803_launch_core_stabilization.sql and
-- 20260804_restore_coupons_and_consignment_scanning.sql. This migration is
-- intentionally based on the deployed schema and does not recreate either
-- application or remove operational history.

-- ---------------------------------------------------------------------------
-- 1. Repair the canonical product boundary used by order lines.
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_sku_fkey;
alter table public.orders
  add constraint orders_sku_fkey foreign key (sku)
  references public.products(sku) on delete restrict;

-- ---------------------------------------------------------------------------
-- 2. Add explicit delivery, marketplace, coupon, and exception fields.
-- ---------------------------------------------------------------------------
alter table public.order_requests add column if not exists external_order_id text;
alter table public.order_requests add column if not exists source_account text;
alter table public.order_requests add column if not exists raw_source_payload jsonb not null default '{}'::jsonb;
alter table public.order_requests add column if not exists coupon_id uuid references public.coupons(id) on delete set null;
alter table public.order_requests add column if not exists coupon_code text;
alter table public.order_requests add column if not exists discount_amount numeric not null default 0;
alter table public.order_requests add column if not exists shipping_quote_status text not null default 'pending_quote';
alter table public.order_requests add column if not exists courier_name text;
alter table public.order_requests add column if not exists tracking_number text;
alter table public.order_requests add column if not exists waybill_url text;
alter table public.order_requests add column if not exists delivery_status text not null default 'awaiting_quote';
alter table public.order_requests add column if not exists customer_delivery_confirmed_at timestamptz;
alter table public.order_requests add column if not exists exception_status text not null default 'none';
alter table public.order_requests add column if not exists exception_note text;

alter table public.order_requests drop constraint if exists order_requests_discount_amount_check;
alter table public.order_requests add constraint order_requests_discount_amount_check
  check (discount_amount >= 0 and discount_amount <= subtotal);
alter table public.order_requests drop constraint if exists order_requests_shipping_quote_status_check;
alter table public.order_requests add constraint order_requests_shipping_quote_status_check
  check (shipping_quote_status in ('platform_charged', 'pending_quote', 'quoted', 'customer_confirmed', 'waived'));
alter table public.order_requests drop constraint if exists order_requests_delivery_status_check;
alter table public.order_requests add constraint order_requests_delivery_status_check
  check (delivery_status in ('awaiting_quote', 'awaiting_customer', 'ready_to_pack', 'packed', 'handed_to_courier', 'delivered', 'failed', 'returned', 'cancelled'));
alter table public.order_requests drop constraint if exists order_requests_exception_status_check;
alter table public.order_requests add constraint order_requests_exception_status_check
  check (exception_status in ('none', 'open', 'resolved'));

create unique index if not exists order_requests_channel_external_uniq
  on public.order_requests (channel_source, external_order_id)
  where external_order_id is not null;
create index if not exists order_requests_delivery_work_idx
  on public.order_requests (delivery_status, created_at desc)
  where status not in ('fulfilled', 'cancelled');

-- ---------------------------------------------------------------------------
-- 3. Preserve lot identity and make shelf-life eligibility explicit.
-- ---------------------------------------------------------------------------
alter table public.product_batches add column if not exists arrival_flight text;
alter table public.product_batches add column if not exists inventory_status text not null default 'available';
alter table public.product_batches add column if not exists reserved_quantity integer not null default 0;
alter table public.product_batches add column if not exists clearance_approved_at timestamptz;
alter table public.product_batches add column if not exists clearance_approved_by uuid references auth.users(id) on delete set null;
alter table public.product_batches add column if not exists source_consignment_item_id uuid references public.consignment_items(id) on delete set null;
alter table public.product_batches add column if not exists parent_batch_id uuid references public.product_batches(id) on delete restrict;
alter table public.product_batches add column if not exists updated_at timestamptz not null default now();

alter table public.product_batches drop constraint if exists product_batches_inventory_status_check;
alter table public.product_batches add constraint product_batches_inventory_status_check
  check (inventory_status in ('available', 'quarantine', 'damaged', 'expired', 'unaccounted', 'depleted'));
alter table public.product_batches drop constraint if exists product_batches_reserved_quantity_check;
alter table public.product_batches add constraint product_batches_reserved_quantity_check
  check (reserved_quantity >= 0 and reserved_quantity <= quantity);

update public.product_batches
set inventory_status = case
      when coalesce(expiry_date, best_before_date) is null then 'quarantine'
      when coalesce(expiry_date, best_before_date) <= current_date + 30 then 'quarantine'
      else inventory_status
    end,
    updated_at = now()
where inventory_status = 'available';

create index if not exists product_batches_fefo_work_idx
  on public.product_batches (sku, inventory_status, expiry_date, created_at)
  where quantity > reserved_quantity;

create table if not exists public.batch_change_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.product_batches(id) on delete restrict,
  sku text not null references public.products(sku) on delete restrict,
  reason text not null,
  old_data jsonb,
  new_data jsonb not null,
  actor_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Reserve exact lots and count every packing scan.
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests(id) on delete restrict,
  order_request_item_id uuid not null references public.order_request_items(id) on delete restrict,
  batch_id uuid not null references public.product_batches(id) on delete restrict,
  sku text not null references public.products(sku) on delete restrict,
  quantity integer not null check (quantity > 0),
  packed_quantity integer not null default 0 check (packed_quantity >= 0 and packed_quantity <= quantity),
  status text not null default 'active' check (status in ('active', 'released', 'fulfilled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_request_item_id, batch_id)
);

create table if not exists public.packing_scan_events (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests(id) on delete restrict,
  order_request_item_id uuid not null references public.order_request_items(id) on delete restrict,
  reservation_id uuid not null references public.inventory_reservations(id) on delete restrict,
  batch_id uuid not null references public.product_batches(id) on delete restrict,
  sku text not null references public.products(sku) on delete restrict,
  scanned_code text not null,
  scan_number integer not null check (scan_number > 0),
  actor_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (order_request_item_id, scan_number)
);

create index if not exists inventory_reservations_order_idx
  on public.inventory_reservations (order_request_id, status);
create index if not exists packing_scan_events_order_idx
  on public.packing_scan_events (order_request_id, created_at);

-- A coupon is counted only after staff confirms the order. Cancellation
-- releases the count; fulfillment turns it into a completed redemption.
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  order_request_id uuid not null references public.order_requests(id) on delete restrict,
  discount_amount numeric not null check (discount_amount >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'redeemed', 'released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coupon_id, order_request_id)
);

-- ---------------------------------------------------------------------------
-- 5. Website submission: shipping is quoted after address review, not guessed.
-- ---------------------------------------------------------------------------
create or replace function public.submit_order_request_v2(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address text,
  p_fulfillment_method text,
  p_customer_note text,
  p_items jsonb,
  p_idempotency_key text,
  p_coupon_code text default null
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
  v_coupon public.coupons;
  v_qty integer;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
begin
  if nullif(trim(coalesce(p_customer_name, '')), '') is null then raise exception 'Customer name is required'; end if;
  if nullif(trim(coalesce(p_customer_email, '')), '') is null
     and nullif(trim(coalesce(p_customer_phone, '')), '') is null then
    raise exception 'Email or mobile number is required';
  end if;
  if nullif(trim(coalesce(p_delivery_address, '')), '') is null then raise exception 'Delivery address is required'; end if;
  if nullif(trim(coalesce(p_idempotency_key, '')), '') is null then raise exception 'Request key is required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one item is required'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'A request may contain at most 50 items'; end if;

  select * into v_order from public.order_requests where idempotency_key = trim(p_idempotency_key);
  if found then return v_order; end if;

  insert into public.order_requests (
    customer_name, customer_email, customer_phone, delivery_address,
    fulfillment_method, customer_note, idempotency_key,
    shipping_amount, shipping_quote_status, delivery_status
  ) values (
    trim(p_customer_name), nullif(trim(p_customer_email), ''), nullif(trim(p_customer_phone), ''),
    trim(p_delivery_address), coalesce(nullif(trim(p_fulfillment_method), ''), 'Courier delivery'),
    nullif(trim(p_customer_note), ''), trim(p_idempotency_key),
    0, 'pending_quote', 'awaiting_quote'
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_qty := (v_item ->> 'quantity')::integer;
    exception when invalid_text_representation then
      raise exception 'Invalid item quantity';
    end;
    if v_qty < 1 or v_qty > 999 then raise exception 'Invalid item quantity'; end if;

    select sku, coalesce(nullif(name, ''), nullif(title, ''), sku) product_name,
           coalesce(srp, retail_price, 0) unit_price, status::text product_status
    into v_product from public.products where sku = v_item ->> 'sku';
    if not found then raise exception 'Product % was not found', v_item ->> 'sku'; end if;
    if v_product.product_status not in ('Live', 'Active') then raise exception 'Product % is not available for website orders', v_product.sku; end if;

    insert into public.order_request_items (order_request_id, sku, product_name, quantity, unit_price, line_total)
    values (v_order.id, v_product.sku, v_product.product_name, v_qty, v_product.unit_price, v_product.unit_price * v_qty);
    v_subtotal := v_subtotal + (v_product.unit_price * v_qty);
  end loop;

  if nullif(upper(trim(coalesce(p_coupon_code, ''))), '') is not null then
    select * into v_coupon from public.coupons
    where code = upper(trim(p_coupon_code))
      and is_active and archived_at is null
      and starts_at <= now() and (ends_at is null or ends_at > now())
      and (max_redemptions is null or redemption_count < max_redemptions);
    if not found then raise exception 'Coupon is invalid, inactive, expired, or fully redeemed'; end if;
    if v_subtotal < v_coupon.min_spend then raise exception 'Coupon minimum spend is not met'; end if;
    v_discount := case when v_coupon.discount_type = 'percentage'
      then round(v_subtotal * v_coupon.discount_value / 100, 2)
      else least(v_coupon.discount_value, v_subtotal) end;
  end if;

  update public.order_requests
  set subtotal = v_subtotal,
      coupon_id = case when v_coupon.id is null then null else v_coupon.id end,
      coupon_code = case when v_coupon.id is null then null else v_coupon.code end,
      discount_amount = v_discount,
      total_amount = v_subtotal - v_discount,
      updated_at = now()
  where id = v_order.id returning * into v_order;

  insert into public.order_request_events (order_request_id, to_status, metadata)
  values (v_order.id, 'submitted', jsonb_build_object(
    'channel', 'website', 'shipping', 'pending_quote',
    'coupon_code', v_order.coupon_code, 'discount_amount', v_order.discount_amount
  ));
  return v_order;
end;
$$;

revoke all on function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text) from public;
grant execute on function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text) to anon, authenticated;

create or replace function public.set_order_delivery_details(
  p_order_request_id uuid,
  p_shipping_amount numeric,
  p_courier_name text,
  p_tracking_number text,
  p_waybill_url text,
  p_customer_confirmed boolean,
  p_note text
)
returns public.order_requests
language plpgsql
security definer
set search_path = public
as $$
declare v_order public.order_requests; v_quote_status text; v_delivery_status text;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if coalesce(p_shipping_amount, -1) < 0 then raise exception 'Shipping amount cannot be negative'; end if;
  if nullif(trim(coalesce(p_courier_name, '')), '') is null then raise exception 'Courier name is required'; end if;
  if nullif(trim(coalesce(p_note, '')), '') is null then raise exception 'A delivery communication note is required'; end if;
  select * into v_order from public.order_requests where id = p_order_request_id for update;
  if not found then raise exception 'Order request not found'; end if;
  if v_order.status in ('fulfilled', 'cancelled') then raise exception 'Delivery details are closed for this order'; end if;

  if v_order.channel_source in ('shopee', 'tiktok', 'lazada') then
    v_quote_status := 'platform_charged';
    v_delivery_status := case when v_order.status = 'confirmed' then 'ready_to_pack' else v_order.delivery_status end;
  elsif coalesce(p_customer_confirmed, false) then
    v_quote_status := 'customer_confirmed';
    v_delivery_status := case when v_order.status = 'confirmed' then 'ready_to_pack' else 'awaiting_quote' end;
  else
    v_quote_status := 'quoted';
    v_delivery_status := 'awaiting_customer';
  end if;

  update public.order_requests set
    shipping_amount = p_shipping_amount,
    total_amount = subtotal - discount_amount + p_shipping_amount,
    shipping_quote_status = v_quote_status,
    courier_name = trim(p_courier_name),
    tracking_number = nullif(trim(p_tracking_number), ''),
    waybill_url = nullif(trim(p_waybill_url), ''),
    customer_delivery_confirmed_at = case when v_quote_status in ('platform_charged', 'customer_confirmed') then now() else null end,
    delivery_status = v_delivery_status,
    updated_at = now()
  where id = v_order.id returning * into v_order;
  insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id, metadata)
  values (v_order.id, v_order.status, v_order.status, trim(p_note), auth.uid(), jsonb_build_object(
    'event', 'delivery_details_updated', 'shipping_amount', p_shipping_amount,
    'courier_name', trim(p_courier_name), 'shipping_quote_status', v_quote_status,
    'tracking_number', v_order.tracking_number, 'waybill_url', v_order.waybill_url
  ));
  return v_order;
end;
$$;

revoke all on function public.set_order_delivery_details(uuid,numeric,text,text,text,boolean,text) from public;
grant execute on function public.set_order_delivery_details(uuid,numeric,text,text,text,boolean,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Confirmation allocates eligible lots in FEFO order.
-- ---------------------------------------------------------------------------
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
  v_line public.order_request_items;
  v_batch public.product_batches;
  v_balance public.inventory_balances;
  v_coupon public.coupons;
  v_remaining integer;
  v_take integer;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into v_order from public.order_requests where id = p_order_request_id for update;
  if not found then raise exception 'Order request not found'; end if;
  if v_order.status = 'confirmed' then return v_order; end if;
  if v_order.status <> 'submitted' then raise exception 'Only submitted requests can be confirmed'; end if;

  if v_order.coupon_id is not null then
    select * into v_coupon from public.coupons where id = v_order.coupon_id for update;
    if not found or not v_coupon.is_active or v_coupon.archived_at is not null
       or v_coupon.starts_at > now() or (v_coupon.ends_at is not null and v_coupon.ends_at <= now())
       or (v_coupon.max_redemptions is not null and v_coupon.redemption_count >= v_coupon.max_redemptions) then
      raise exception 'The coupon is no longer available';
    end if;
    update public.coupons set redemption_count = redemption_count + 1 where id = v_coupon.id;
    insert into public.coupon_redemptions (coupon_id, order_request_id, discount_amount)
    values (v_coupon.id, v_order.id, v_order.discount_amount);
  end if;

  for v_line in select * from public.order_request_items where order_request_id = v_order.id order by created_at
  loop
    insert into public.inventory_balances (sku, location_code, on_hand)
    select p.sku, 'MANILA_MAIN', greatest(coalesce(sum(b.quantity), 0), 0)::integer
    from public.products p left join public.product_batches b on b.sku = p.sku
    where p.sku = v_line.sku group by p.sku
    on conflict (sku, location_code) do nothing;

    select * into v_balance from public.inventory_balances
    where sku = v_line.sku and location_code = 'MANILA_MAIN' for update;

    v_remaining := v_line.quantity;
    for v_batch in
      select * from public.product_batches
      where sku = v_line.sku
        and inventory_status = 'available'
        and quantity > reserved_quantity
        and (
          coalesce(expiry_date, best_before_date) >= current_date + 90
          or (
            coalesce(expiry_date, best_before_date) between current_date + 31 and current_date + 89
            and clearance_approved_at is not null
          )
        )
      order by coalesce(expiry_date, best_before_date), created_at
      for update
    loop
      exit when v_remaining = 0;
      v_take := least(v_remaining, v_batch.quantity - v_batch.reserved_quantity);
      update public.product_batches set reserved_quantity = reserved_quantity + v_take, updated_at = now()
      where id = v_batch.id;
      insert into public.inventory_reservations (
        order_request_id, order_request_item_id, batch_id, sku, quantity
      ) values (v_order.id, v_line.id, v_batch.id, v_line.sku, v_take);
      v_remaining := v_remaining - v_take;
    end loop;
    if v_remaining > 0 then raise exception 'Insufficient sellable lot stock for %. Check expiry, quarantine, and clearance approval.', v_line.sku; end if;

    if v_balance.reserved + v_line.quantity > v_balance.on_hand then raise exception 'Inventory balance mismatch for %', v_line.sku; end if;
    update public.inventory_balances set reserved = reserved + v_line.quantity, updated_at = now()
    where sku = v_line.sku and location_code = 'MANILA_MAIN';

    perform set_config('k2.allow_stock_write', 'on', true);
    update public.products set
      stock_available = (
        select coalesce(sum(b.quantity - b.reserved_quantity), 0)::integer from public.product_batches b
        where b.sku = v_line.sku and b.inventory_status = 'available'
          and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
            or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null))
      )
    where sku = v_line.sku;

    insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id)
    values (v_line.sku, 'MANILA_MAIN', 'reserved', v_line.quantity, 'order_request', v_order.id, p_reason, auth.uid());

    insert into public.orders (
      sku, quantity, channel_source, fulfillment_method, order_status,
      payment_status, customer_name, customer_email, total_amount, order_request_id
    ) values (
      v_line.sku, v_line.quantity,
      case v_order.channel_source
        when 'shopee' then 'shopee'::channel_type
        when 'lazada' then 'lazada'::channel_type
        when 'tiktok' then 'tiktok'::channel_type
        else 'website_retail'::channel_type end,
      v_order.fulfillment_method, 'Pending'::order_status_enum, 'Unpaid'::payment_status_enum,
      v_order.customer_name, v_order.customer_email, v_line.line_total, v_order.id
    );
  end loop;

  update public.order_requests
  set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now(),
      delivery_status = case when shipping_quote_status in ('platform_charged', 'customer_confirmed', 'waived') then 'ready_to_pack' else delivery_status end,
      updated_at = now()
  where id = v_order.id returning * into v_order;
  insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id)
  values (v_order.id, 'submitted', 'confirmed', p_reason, auth.uid());
  return v_order;
end;
$$;

revoke all on function public.confirm_order_request(uuid,text) from public;
grant execute on function public.confirm_order_request(uuid,text) to authenticated;

-- Order-first scanning: the operator must choose the exact order. One scan
-- increments one unit and uses the already-reserved FEFO lot.
create or replace function public.record_packing_scan(
  p_order_request_id uuid,
  p_scanned_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.order_requests;
  v_line public.order_request_items;
  v_reservation public.inventory_reservations;
  v_scan_number integer;
  v_total_packed integer;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_scanned_code, '')), '') is null then raise exception 'Barcode or SKU is required'; end if;
  select * into v_order from public.order_requests where id = p_order_request_id for update;
  if not found then raise exception 'Order request not found'; end if;
  if v_order.status <> 'confirmed' then raise exception 'Select a confirmed order before scanning'; end if;

  select i.* into v_line
  from public.order_request_items i join public.products p on p.sku = i.sku
  where i.order_request_id = v_order.id
    and (upper(i.sku) = upper(trim(p_scanned_code)) or upper(coalesce(p.barcode, '')) = upper(trim(p_scanned_code)))
  order by i.created_at limit 1;
  if not found then raise exception 'Scanned item is not part of selected order %', v_order.public_reference; end if;

  select r.* into v_reservation from public.inventory_reservations r
  join public.product_batches b on b.id = r.batch_id
  where r.order_request_item_id = v_line.id and r.status = 'active' and r.packed_quantity < r.quantity
  order by coalesce(b.expiry_date, b.best_before_date), r.created_at
  limit 1 for update of r;
  if not found then raise exception 'Required quantity is already fully scanned for %', v_line.product_name; end if;

  update public.inventory_reservations set packed_quantity = packed_quantity + 1, updated_at = now()
  where id = v_reservation.id returning * into v_reservation;
  select coalesce(max(scan_number), 0) + 1 into v_scan_number
  from public.packing_scan_events where order_request_item_id = v_line.id;
  insert into public.packing_scan_events (
    order_request_id, order_request_item_id, reservation_id, batch_id, sku, scanned_code, scan_number, actor_id
  ) values (
    v_order.id, v_line.id, v_reservation.id, v_reservation.batch_id, v_line.sku,
    trim(p_scanned_code), v_scan_number, auth.uid()
  );

  select coalesce(sum(packed_quantity), 0)::integer into v_total_packed
  from public.inventory_reservations where order_request_item_id = v_line.id and status = 'active';
  if v_total_packed = v_line.quantity then
    update public.orders set order_status = 'Packed'::order_status_enum
    where order_request_id = v_order.id and sku = v_line.sku and order_status::text = 'Pending';
  end if;
  if not exists (
    select 1 from public.inventory_reservations r where r.order_request_id = v_order.id
    and r.status = 'active' and r.packed_quantity < r.quantity
  ) then
    update public.order_requests set delivery_status = 'packed', updated_at = now() where id = v_order.id;
  end if;

  insert into public.order_request_events (order_request_id, from_status, to_status, actor_id, metadata)
  values (v_order.id, 'confirmed', 'confirmed', auth.uid(), jsonb_build_object(
    'event', 'unit_packed', 'sku', v_line.sku, 'scan_number', v_scan_number,
    'packed_quantity', v_total_packed, 'required_quantity', v_line.quantity,
    'batch_id', v_reservation.batch_id
  ));
  return jsonb_build_object(
    'order_reference', v_order.public_reference, 'sku', v_line.sku,
    'product_name', v_line.product_name, 'packed_quantity', v_total_packed,
    'required_quantity', v_line.quantity, 'line_complete', v_total_packed = v_line.quantity,
    'order_complete', not exists (
      select 1 from public.inventory_reservations r where r.order_request_id = v_order.id
      and r.status = 'active' and r.packed_quantity < r.quantity
    )
  );
end;
$$;

revoke all on function public.record_packing_scan(uuid,text) from public;
grant execute on function public.record_packing_scan(uuid,text) to authenticated;

create or replace function public.mark_order_line_packed(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  raise exception 'Order-line shortcuts are disabled. Select the order and record each unit with record_packing_scan.';
end;
$$;
revoke all on function public.mark_order_line_packed(uuid) from public;

-- ---------------------------------------------------------------------------
-- 7. Cancellation and fulfillment release/consume the exact reservations.
-- ---------------------------------------------------------------------------
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
  v_res public.inventory_reservations;
  v_summary record;
  v_balance public.inventory_balances;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'Cancellation reason is required'; end if;
  select * into v_order from public.order_requests where id = p_order_request_id for update;
  if not found then raise exception 'Order request not found'; end if;
  if v_order.status = 'cancelled' then return v_order; end if;
  if v_order.status not in ('submitted', 'confirmed') then raise exception 'This order request cannot be cancelled'; end if;

  if v_order.status = 'confirmed' then
    for v_res in select * from public.inventory_reservations where order_request_id = v_order.id and status = 'active' for update
    loop
      update public.product_batches set reserved_quantity = reserved_quantity - v_res.quantity, updated_at = now()
      where id = v_res.batch_id and reserved_quantity >= v_res.quantity;
      if not found then raise exception 'Lot reservation mismatch for %', v_res.sku; end if;
      update public.inventory_reservations set status = 'released', updated_at = now() where id = v_res.id;
    end loop;

    for v_summary in select sku, sum(quantity)::integer quantity
      from public.inventory_reservations where order_request_id = v_order.id group by sku
    loop
      update public.inventory_balances set reserved = reserved - v_summary.quantity, updated_at = now()
      where sku = v_summary.sku and location_code = 'MANILA_MAIN' and reserved >= v_summary.quantity;
      if not found then raise exception 'Inventory reservation mismatch for %', v_summary.sku; end if;
      select * into v_balance from public.inventory_balances where sku = v_summary.sku and location_code = 'MANILA_MAIN';
      perform set_config('k2.allow_stock_write', 'on', true);
      update public.products set stock_available = (
        select coalesce(sum(b.quantity - b.reserved_quantity), 0)::integer from public.product_batches b
        where b.sku = v_summary.sku and b.inventory_status = 'available'
          and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
            or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null))
      ) where sku = v_summary.sku;
      insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id)
      values (v_summary.sku, 'MANILA_MAIN', 'reservation_released', v_summary.quantity, 'order_request', v_order.id, p_reason, auth.uid());
    end loop;
    update public.orders set order_status = 'Cancelled'::order_status_enum
    where order_request_id = v_order.id and order_status::text <> 'Shipped';
  end if;

  if v_order.coupon_id is not null then
    update public.coupon_redemptions set status = 'released', updated_at = now()
    where order_request_id = v_order.id and status = 'reserved';
    if found then update public.coupons set redemption_count = greatest(redemption_count - 1, 0) where id = v_order.coupon_id; end if;
  end if;
  update public.order_requests
  set status = 'cancelled', delivery_status = 'cancelled', exception_status = 'resolved',
      exception_note = trim(p_reason), cancelled_at = now(), updated_at = now()
  where id = v_order.id returning * into v_order;
  insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id)
  values (v_order.id, case when v_order.confirmed_at is null then 'submitted' else 'confirmed' end, 'cancelled', p_reason, auth.uid());
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
  v_res public.inventory_reservations;
  v_summary record;
  v_balance public.inventory_balances;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_handover_note, '')), '') is null then raise exception 'Courier or handover note is required'; end if;
  select * into v_order from public.order_requests where id = p_order_request_id for update;
  if not found then raise exception 'Order request not found'; end if;
  if v_order.status = 'fulfilled' then return v_order; end if;
  if v_order.status <> 'confirmed' then raise exception 'Order request is not confirmed'; end if;
  if v_order.payment_status <> 'verified' then raise exception 'Payment must be explicitly verified before fulfillment'; end if;
  if v_order.shipping_quote_status not in ('platform_charged', 'customer_confirmed', 'waived') then
    raise exception 'Delivery charge or customer confirmation is still pending';
  end if;
  if exists (select 1 from public.inventory_reservations where order_request_id = v_order.id and status = 'active' and packed_quantity <> quantity) then
    raise exception 'Every required unit must be scanned before fulfillment';
  end if;
  if exists (
    select 1 from public.inventory_reservations r join public.product_batches b on b.id = r.batch_id
    where r.order_request_id = v_order.id and r.status = 'active'
      and (b.inventory_status <> 'available' or coalesce(b.expiry_date, b.best_before_date) <= current_date + 30)
  ) then raise exception 'A reserved lot is no longer sellable; resolve the inventory exception first'; end if;

  for v_res in select * from public.inventory_reservations where order_request_id = v_order.id and status = 'active' for update
  loop
    update public.product_batches
    set quantity = quantity - v_res.quantity,
        reserved_quantity = reserved_quantity - v_res.quantity,
        inventory_status = case when quantity - v_res.quantity = 0 then 'depleted' else inventory_status end,
        updated_at = now()
    where id = v_res.batch_id and quantity >= v_res.quantity and reserved_quantity >= v_res.quantity;
    if not found then raise exception 'Exact lot quantity mismatch for %', v_res.sku; end if;
    update public.inventory_reservations set status = 'fulfilled', updated_at = now() where id = v_res.id;
  end loop;

  for v_summary in select sku, sum(quantity)::integer quantity
    from public.inventory_reservations where order_request_id = v_order.id group by sku
  loop
    update public.inventory_balances
    set on_hand = on_hand - v_summary.quantity, reserved = reserved - v_summary.quantity, updated_at = now()
    where sku = v_summary.sku and location_code = 'MANILA_MAIN'
      and on_hand >= v_summary.quantity and reserved >= v_summary.quantity;
    if not found then raise exception 'Inventory balance mismatch for %', v_summary.sku; end if;
    select * into v_balance from public.inventory_balances where sku = v_summary.sku and location_code = 'MANILA_MAIN';
    perform set_config('k2.allow_stock_write', 'on', true);
    update public.products set stock_available = (
      select coalesce(sum(b.quantity - b.reserved_quantity), 0)::integer from public.product_batches b
      where b.sku = v_summary.sku and b.inventory_status = 'available'
        and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
          or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null))
    ) where sku = v_summary.sku;
    insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id)
    values (v_summary.sku, 'MANILA_MAIN', 'fulfilled', v_summary.quantity, 'order_request', v_order.id, p_handover_note, auth.uid());
  end loop;

  update public.orders set order_status = 'Shipped'::order_status_enum where order_request_id = v_order.id;
  update public.coupon_redemptions set status = 'redeemed', updated_at = now()
  where order_request_id = v_order.id and status = 'reserved';
  update public.order_requests
  set status = 'fulfilled', delivery_status = 'handed_to_courier', fulfilled_at = now(), updated_at = now()
  where id = v_order.id returning * into v_order;
  insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id)
  values (v_order.id, 'confirmed', 'fulfilled', p_handover_note, auth.uid());
  return v_order;
end;
$$;

revoke all on function public.fulfill_order_request(uuid,text) from public;
grant execute on function public.fulfill_order_request(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Non-destructive batch reconciliation and exact custody transfers.
-- ---------------------------------------------------------------------------
create or replace function public.reconcile_product_batches(
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
  v_payload jsonb;
  v_existing public.product_batches;
  v_saved public.product_batches;
  v_id uuid;
  v_qty integer;
  v_status text;
  v_expiry date;
  v_total integer;
  v_sellable integer;
  v_count integer := 0;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'A reconciliation reason is required'; end if;
  if jsonb_typeof(p_batches) <> 'array' or jsonb_array_length(p_batches) > 200 then raise exception 'Batches must be an array of at most 200 rows'; end if;
  perform 1 from public.products where sku = p_sku for update;
  if not found then raise exception 'Product not found'; end if;

  if exists (
    select 1 from public.product_batches b where b.sku = p_sku
      and not exists (
        select 1 from jsonb_array_elements(p_batches) x
        where nullif(x ->> 'id', '')::uuid = b.id
      )
  ) then raise exception 'Existing lots cannot be removed. Set the physical count to zero with a reason so history is preserved.'; end if;

  for v_payload in select * from jsonb_array_elements(p_batches)
  loop
    begin v_qty := coalesce((v_payload ->> 'quantity')::integer, 0);
    exception when invalid_text_representation then raise exception 'Batch quantity must be a whole number'; end;
    if v_qty < 0 then raise exception 'Batch quantity cannot be negative'; end if;
    v_expiry := nullif(v_payload ->> 'expiry_date', '')::date;
    v_status := coalesce(nullif(v_payload ->> 'inventory_status', ''),
      case when v_qty = 0 then 'depleted'
           when v_expiry is null or v_expiry <= current_date + 30 then 'quarantine'
           else 'available' end);
    if v_status not in ('available', 'quarantine', 'damaged', 'expired', 'unaccounted', 'depleted') then raise exception 'Invalid inventory status'; end if;
    if v_qty > 0 and nullif(trim(coalesce(v_payload ->> 'box_code', '')), '') is null then raise exception 'Every physical lot needs a box code'; end if;

    v_id := nullif(v_payload ->> 'id', '')::uuid;
    if v_id is null then
      insert into public.product_batches (
        sku, box_code, batch_code, quantity, quantity_available, reserved_quantity,
        expiry_date, best_before_date, landed_date, hub, custodian, channel,
        is_pinned, inventory_status, updated_at
      ) values (
        p_sku, nullif(trim(v_payload ->> 'box_code'), ''), nullif(trim(v_payload ->> 'batch_code'), ''),
        v_qty, v_qty, 0, v_expiry, v_expiry,
        coalesce(nullif(v_payload ->> 'landed_date', '')::date, current_date),
        nullif(trim(v_payload ->> 'hub'), ''), nullif(trim(v_payload ->> 'custodian'), ''),
        nullif(trim(v_payload ->> 'channel'), ''), coalesce((v_payload ->> 'is_pinned')::boolean, false),
        v_status, now()
      ) returning * into v_saved;
      insert into public.batch_change_events (batch_id, sku, reason, old_data, new_data, actor_id)
      values (v_saved.id, p_sku, trim(p_reason), null, to_jsonb(v_saved), auth.uid());
    else
      select * into v_existing from public.product_batches where id = v_id and sku = p_sku for update;
      if not found then raise exception 'Batch % does not belong to %', v_id, p_sku; end if;
      if v_qty < v_existing.reserved_quantity then raise exception 'Batch quantity cannot be lower than its reserved quantity'; end if;
      update public.product_batches set
        box_code = nullif(trim(v_payload ->> 'box_code'), ''),
        batch_code = coalesce(nullif(trim(v_payload ->> 'batch_code'), ''), nullif(trim(v_payload ->> 'box_code'), '')),
        quantity = v_qty, quantity_available = v_qty,
        expiry_date = v_expiry, best_before_date = v_expiry,
        landed_date = coalesce(nullif(v_payload ->> 'landed_date', '')::date, landed_date),
        hub = nullif(trim(v_payload ->> 'hub'), ''), custodian = nullif(trim(v_payload ->> 'custodian'), ''),
        channel = nullif(trim(v_payload ->> 'channel'), ''),
        is_pinned = coalesce((v_payload ->> 'is_pinned')::boolean, false),
        inventory_status = v_status, updated_at = now()
      where id = v_id returning * into v_saved;
      insert into public.batch_change_events (batch_id, sku, reason, old_data, new_data, actor_id)
      values (v_saved.id, p_sku, trim(p_reason), to_jsonb(v_existing), to_jsonb(v_saved), auth.uid());
    end if;
    v_count := v_count + 1;
  end loop;

  select coalesce(sum(quantity), 0)::integer,
         coalesce(sum(quantity - reserved_quantity) filter (
           where inventory_status = 'available' and (
             coalesce(expiry_date, best_before_date) >= current_date + 90
             or (coalesce(expiry_date, best_before_date) between current_date + 31 and current_date + 89 and clearance_approved_at is not null)
           )
         ), 0)::integer
  into v_total, v_sellable from public.product_batches where sku = p_sku;

  insert into public.inventory_balances (sku, location_code, on_hand)
  values (p_sku, 'MANILA_MAIN', v_total)
  on conflict (sku, location_code) do update set on_hand = excluded.on_hand, updated_at = now();
  perform set_config('k2.allow_stock_write', 'on', true);
  update public.products set stock_available = v_sellable, total_stock = v_sellable where sku = p_sku;
  return v_count;
end;
$$;

revoke all on function public.reconcile_product_batches(text,jsonb,text) from public;
grant execute on function public.reconcile_product_batches(text,jsonb,text) to authenticated;

create or replace function public.set_batch_clearance_approval(
  p_batch_id uuid,
  p_approved boolean,
  p_reason text
)
returns public.product_batches
language plpgsql
security definer
set search_path = public
as $$
declare v_batch public.product_batches; v_expiry date; v_sellable integer;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'Approval or reversal reason is required'; end if;
  select * into v_batch from public.product_batches where id = p_batch_id for update;
  if not found then raise exception 'Inventory lot not found'; end if;
  v_expiry := coalesce(v_batch.expiry_date, v_batch.best_before_date);
  if coalesce(p_approved, false) and (v_expiry is null or v_expiry < current_date + 31 or v_expiry > current_date + 89) then
    raise exception 'Clearance approval applies only to lots with 31 to 89 days remaining';
  end if;
  update public.product_batches set
    clearance_approved_at = case when p_approved then now() else null end,
    clearance_approved_by = case when p_approved then auth.uid() else null end,
    inventory_status = case when p_approved then 'available' else 'quarantine' end,
    updated_at = now()
  where id = v_batch.id returning * into v_batch;
  insert into public.batch_change_events (batch_id, sku, reason, old_data, new_data, actor_id)
  values (v_batch.id, v_batch.sku, trim(p_reason), null,
    jsonb_build_object('clearance_approved', p_approved, 'expiry_date', v_expiry), auth.uid());
  select coalesce(sum(quantity - reserved_quantity), 0)::integer into v_sellable
  from public.product_batches b where b.sku = v_batch.sku and b.inventory_status = 'available'
    and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
      or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null));
  perform set_config('k2.allow_stock_write', 'on', true);
  update public.products set stock_available = v_sellable, total_stock = v_sellable where sku = v_batch.sku;
  return v_batch;
end;
$$;

revoke all on function public.set_batch_clearance_approval(uuid,boolean,text) from public;
grant execute on function public.set_batch_clearance_approval(uuid,boolean,text) to authenticated;

create or replace function public.replace_product_batches(p_sku text, p_batches jsonb, p_reason text)
returns integer language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  raise exception 'Replace-all batch editing is disabled. Use reconcile_product_batches to preserve lot history.';
end;
$$;
revoke all on function public.replace_product_batches(text,jsonb,text) from public;

create or replace function public.transfer_inventory_custody_exact(
  p_batch_id uuid,
  p_quantity integer,
  p_to_custodian text,
  p_to_location text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.product_batches;
  v_new public.product_batches;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if coalesce(p_quantity, 0) < 1 then raise exception 'Transfer quantity must be positive'; end if;
  if nullif(trim(coalesce(p_to_custodian, '')), '') is null then raise exception 'Destination custodian is required'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'Transfer reason is required'; end if;
  select * into v_batch from public.product_batches where id = p_batch_id for update;
  if not found then raise exception 'Inventory lot not found'; end if;
  if p_quantity > v_batch.quantity - v_batch.reserved_quantity then raise exception 'Cannot move reserved or unavailable units'; end if;

  if p_quantity = v_batch.quantity and v_batch.reserved_quantity = 0 then
    update public.product_batches set custodian = trim(p_to_custodian),
      hub = coalesce(nullif(trim(p_to_location), ''), hub), updated_at = now()
    where id = v_batch.id returning * into v_new;
  else
    update public.product_batches set quantity = quantity - p_quantity,
      quantity_available = quantity_available - p_quantity, updated_at = now()
    where id = v_batch.id;
    insert into public.product_batches (
      sku, box_code, batch_code, quantity, quantity_available, reserved_quantity,
      expiry_date, best_before_date, landed_date, hub, custodian, channel,
      is_pinned, inventory_status, clearance_approved_at, clearance_approved_by,
      arrival_flight, source_consignment_item_id, parent_batch_id, updated_at
    ) values (
      v_batch.sku, v_batch.box_code, v_batch.batch_code, p_quantity, p_quantity, 0,
      v_batch.expiry_date, v_batch.best_before_date, v_batch.landed_date,
      coalesce(nullif(trim(p_to_location), ''), v_batch.hub), trim(p_to_custodian), v_batch.channel,
      v_batch.is_pinned, v_batch.inventory_status, v_batch.clearance_approved_at,
      v_batch.clearance_approved_by, v_batch.arrival_flight,
      v_batch.source_consignment_item_id, v_batch.id, now()
    ) returning * into v_new;
  end if;
  insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id, metadata)
  values (v_batch.sku, coalesce(nullif(trim(p_to_location), ''), 'MANILA_MAIN'), 'transferred', p_quantity,
    'product_batch', v_new.id, trim(p_reason), auth.uid(), jsonb_build_object(
      'source_batch_id', v_batch.id, 'destination_batch_id', v_new.id,
      'from_custodian', v_batch.custodian, 'to_custodian', trim(p_to_custodian)
    ));
  return v_new.id;
end;
$$;

revoke all on function public.transfer_inventory_custody_exact(uuid,integer,text,text,text) from public;
grant execute on function public.transfer_inventory_custody_exact(uuid,integer,text,text,text) to authenticated;

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
declare v_updated integer;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_to_custodian, '')), '') is null then raise exception 'Destination custodian is required'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'Transfer reason is required'; end if;
  if p_sku is not null then raise exception 'Whole-SKU custody moves are disabled. Choose an exact lot and quantity.'; end if;
  if nullif(trim(coalesce(p_box_code, '')), '') is null then raise exception 'Box code is required'; end if;
  update public.product_batches set custodian = trim(p_to_custodian), updated_at = now()
  where box_code = trim(p_box_code) and quantity > 0;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then raise exception 'No matching stock batches found'; end if;
  return v_updated;
end;
$$;

revoke all on function public.transfer_inventory_custody(text,text,text,text) from public;
grant execute on function public.transfer_inventory_custody(text,text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. A flight may contain the same SKU in multiple boxes/lots.
-- ---------------------------------------------------------------------------
alter table public.consignment_items add column if not exists box_code text;
update public.consignment_items set box_code = batch_code where box_code is null;
alter table public.consignment_items alter column box_code set not null;
alter table public.consignment_items drop constraint if exists unique_consignment_sku;
create unique index if not exists consignment_items_manifest_lot_box_uniq
  on public.consignment_items (consignment_id, sku, batch_code, box_code);

create or replace function public.add_consignment_item_v2(
  p_consignment_id uuid,
  p_sku text,
  p_batch_code text,
  p_box_code text,
  p_best_before_date date,
  p_expected_qty integer
)
returns public.consignment_items
language plpgsql
security definer
set search_path = public
as $$
declare v_manifest public.consignments; v_item public.consignment_items;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if coalesce(p_expected_qty, 0) < 1 then raise exception 'Expected quantity must be positive'; end if;
  if nullif(trim(coalesce(p_batch_code, '')), '') is null then raise exception 'Batch code is required'; end if;
  if nullif(trim(coalesce(p_box_code, '')), '') is null then raise exception 'Box code is required'; end if;
  if p_best_before_date is null then raise exception 'Best-before date is required'; end if;
  select * into v_manifest from public.consignments where id = p_consignment_id for update;
  if not found then raise exception 'Consignment not found'; end if;
  if v_manifest.status <> 'Packing_Italy' then raise exception 'Manifest packing is closed'; end if;
  insert into public.consignment_items (
    consignment_id, sku, batch_code, box_code, best_before_date,
    expected_qty, italy_packed_qty, manila_scanned_qty
  ) values (
    p_consignment_id, p_sku, trim(p_batch_code), trim(p_box_code), p_best_before_date,
    p_expected_qty, 0, 0
  ) returning * into v_item;
  return v_item;
end;
$$;

revoke all on function public.add_consignment_item_v2(uuid,text,text,text,date,integer) from public;
grant execute on function public.add_consignment_item_v2(uuid,text,text,text,date,integer) to authenticated;

create or replace function public.record_consignment_item_scan(
  p_consignment_id uuid,
  p_consignment_item_id uuid,
  p_stage text
)
returns public.consignment_items
language plpgsql
security definer
set search_path = public
as $$
declare v_manifest public.consignments; v_item public.consignment_items; v_result integer;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into v_manifest from public.consignments where id = p_consignment_id for update;
  if not found then raise exception 'Consignment not found'; end if;
  select * into v_item from public.consignment_items
  where id = p_consignment_item_id and consignment_id = p_consignment_id for update;
  if not found then raise exception 'Manifest line not found'; end if;
  if p_stage = 'milan' then
    if v_manifest.status <> 'Packing_Italy' then raise exception 'Milan packing is closed'; end if;
    if v_item.italy_packed_qty >= v_item.expected_qty then raise exception 'Packed scans cannot exceed expected quantity'; end if;
    update public.consignment_items set italy_packed_qty = italy_packed_qty + 1
    where id = v_item.id returning * into v_item;
    v_result := v_item.italy_packed_qty;
  elsif p_stage = 'manila' then
    if v_manifest.status <> 'Arrived_Manila' then raise exception 'Consignment is not ready for Manila receiving'; end if;
    if v_item.manila_scanned_qty >= v_item.italy_packed_qty then raise exception 'Received scans cannot exceed Milan packed quantity'; end if;
    update public.consignment_items set manila_scanned_qty = manila_scanned_qty + 1,
      status = case when manila_scanned_qty + 1 = italy_packed_qty then 'Matched' else 'Discrepancy' end
    where id = v_item.id returning * into v_item;
    v_result := v_item.manila_scanned_qty;
  else raise exception 'Stage must be milan or manila';
  end if;
  insert into public.consignment_scan_events (
    consignment_id, consignment_item_id, sku, stage, resulting_qty, actor_id
  ) values (v_manifest.id, v_item.id, v_item.sku, p_stage, v_result, auth.uid());
  return v_item;
end;
$$;

revoke all on function public.record_consignment_item_scan(uuid,uuid,text) from public;
grant execute on function public.record_consignment_item_scan(uuid,uuid,text) to authenticated;

create or replace function public.add_consignment_item(
  p_consignment_id uuid, p_sku text, p_batch_code text,
  p_best_before_date date, p_expected_qty integer
)
returns public.consignment_items language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  raise exception 'Use add_consignment_item_v2 and record the physical box code.';
end;
$$;
revoke all on function public.add_consignment_item(uuid,text,text,date,integer) from public;

create or replace function public.record_consignment_scan(
  p_consignment_id uuid, p_sku text, p_stage text
)
returns public.consignment_items language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  raise exception 'SKU-only scans are ambiguous. Use record_consignment_item_scan with the selected box/lot line.';
end;
$$;
revoke all on function public.record_consignment_scan(uuid,text,text) from public;

-- Finalization now retains the physical box and source manifest line, and only
-- makes 90+ day stock immediately sellable.
create or replace function public.finalize_consignment_receipt(
  p_consignment_id uuid,
  p_notes text default null
)
returns public.consignments
language plpgsql
security definer
set search_path = public
as $$
declare v_manifest public.consignments; v_item public.consignment_items; v_balance public.inventory_balances; v_missing integer; v_status text;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into v_manifest from public.consignments where id = p_consignment_id for update;
  if not found then raise exception 'Consignment not found'; end if;
  if v_manifest.status = 'Completed' then return v_manifest; end if;
  if v_manifest.status <> 'Arrived_Manila' then raise exception 'Consignment must be in Arrived Manila state'; end if;
  if not exists (select 1 from public.consignment_items where consignment_id = p_consignment_id) then raise exception 'Cannot finalize an empty manifest'; end if;

  for v_item in select * from public.consignment_items where consignment_id = p_consignment_id for update
  loop
    if v_item.manila_scanned_qty > 0 then
      v_status := case when v_item.best_before_date >= current_date + 90 then 'available' else 'quarantine' end;
      insert into public.product_batches (
        sku, box_code, batch_code, quantity, quantity_available, reserved_quantity,
        expiry_date, best_before_date, landed_date, hub, arrival_flight,
        inventory_status, source_consignment_item_id, updated_at
      ) values (
        v_item.sku, v_item.box_code, v_item.batch_code,
        v_item.manila_scanned_qty, v_item.manila_scanned_qty, 0,
        v_item.best_before_date, v_item.best_before_date, current_date,
        'MANILA_MAIN', v_manifest.manifest_code, v_status, v_item.id, now()
      );
      insert into public.inventory_balances (sku, location_code, on_hand)
      values (v_item.sku, 'MANILA_MAIN', v_item.manila_scanned_qty)
      on conflict (sku, location_code) do update set on_hand = inventory_balances.on_hand + excluded.on_hand, updated_at = now();
      select * into v_balance from public.inventory_balances where sku = v_item.sku and location_code = 'MANILA_MAIN';
      perform set_config('k2.allow_stock_write', 'on', true);
      update public.products set stock_available = (
        select coalesce(sum(b.quantity - b.reserved_quantity), 0)::integer from public.product_batches b
        where b.sku = v_item.sku and b.inventory_status = 'available'
          and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
            or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null))
      ) where sku = v_item.sku;
      insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id, metadata)
      values (v_item.sku, 'MANILA_MAIN', 'received', v_item.manila_scanned_qty, 'consignment', v_manifest.id,
        p_notes, auth.uid(), jsonb_build_object('manifest', v_manifest.manifest_code, 'batch_code', v_item.batch_code,
        'box_code', v_item.box_code, 'inventory_status', v_status));
    end if;
    v_missing := v_item.italy_packed_qty - v_item.manila_scanned_qty;
    if v_missing > 0 then
      insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id, metadata)
      values (v_item.sku, 'MANILA_MAIN', 'reconciled', v_missing, 'consignment', v_manifest.id,
        p_notes, auth.uid(), jsonb_build_object('result', 'missing_on_arrival', 'manifest', v_manifest.manifest_code,
        'batch_code', v_item.batch_code, 'box_code', v_item.box_code));
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
-- 10. Connector inbox: signed events are durable before order normalization.
-- ---------------------------------------------------------------------------
create table if not exists public.channel_event_inbox (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('shopee', 'tiktok', 'lazada')),
  external_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received', 'processing', 'processed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, external_event_id)
);

create index if not exists channel_event_inbox_work_idx
  on public.channel_event_inbox (channel, status, received_at)
  where status in ('received', 'failed');

-- ---------------------------------------------------------------------------
-- 11. Security: event tables are append-only through server functions.
-- ---------------------------------------------------------------------------
alter table public.batch_change_events enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.packing_scan_events enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.channel_event_inbox enable row level security;

drop policy if exists batch_change_events_staff_read on public.batch_change_events;
create policy batch_change_events_staff_read on public.batch_change_events for select to authenticated using (public.is_staff());
drop policy if exists inventory_reservations_staff_read on public.inventory_reservations;
create policy inventory_reservations_staff_read on public.inventory_reservations for select to authenticated using (public.is_staff());
drop policy if exists packing_scan_events_staff_read on public.packing_scan_events;
create policy packing_scan_events_staff_read on public.packing_scan_events for select to authenticated using (public.is_staff());
drop policy if exists coupon_redemptions_staff_read on public.coupon_redemptions;
create policy coupon_redemptions_staff_read on public.coupon_redemptions for select to authenticated using (public.is_staff());
drop policy if exists channel_event_inbox_staff_read on public.channel_event_inbox;
create policy channel_event_inbox_staff_read on public.channel_event_inbox for select to authenticated using (public.is_staff());

revoke all on public.batch_change_events, public.inventory_reservations,
  public.packing_scan_events, public.coupon_redemptions,
  public.channel_event_inbox from anon, authenticated;
grant select on public.batch_change_events, public.inventory_reservations,
  public.packing_scan_events, public.coupon_redemptions,
  public.channel_event_inbox to authenticated;

notify pgrst, 'reload schema';
