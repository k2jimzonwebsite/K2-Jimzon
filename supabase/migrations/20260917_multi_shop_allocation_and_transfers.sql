-- =============================================================================
-- Migration: 20260917_multi_shop_allocation_and_transfers.sql
-- Description: MAP-026 Multi-Shop Channel Allocation & Custody Transfer Engine
--
-- Authoritative operating rules:
-- 1. Master Inventory is the Philippines-wide physical truth across warehouse lots.
--    Master Inventory never shrinks when stock is allocated to a channel shop;
--    shop allocation is a sellable-availability projection over that master stock.
-- 2. Target coverage is 2 sellable units per active individual shop account.
-- 3. Product-shop status values: 'Covered', 'Thin', 'Skipped', 'Out', 'Needs review'.
-- 4. Physical stock moves on a staff-request, admin-approval, receiver-acceptance workflow.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Table: public.channel_shop_allocations
-- -----------------------------------------------------------------------------
create table if not exists public.channel_shop_allocations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.channel_shops(id) on delete cascade,
  sku text not null references public.products(sku) on delete cascade,
  target_units integer not null default 2 check (target_units >= 0),
  allocated_units integer not null default 0 check (allocated_units >= 0),
  reserved_units integer not null default 0 check (reserved_units >= 0),
  is_skipped boolean not null default false,
  priority integer not null default 100,
  status text not null default 'Out'
    check (status in ('Covered', 'Thin', 'Skipped', 'Out', 'Needs review')),
  last_rebalanced_at timestamptz not null default now(),
  constraint channel_shop_allocations_shop_sku_unique unique (shop_id, sku)
);

create index if not exists idx_channel_shop_allocations_sku
  on public.channel_shop_allocations (sku);

create index if not exists idx_channel_shop_allocations_shop
  on public.channel_shop_allocations (shop_id);

comment on table public.channel_shop_allocations is
  'MAP-026: Availability allocation projection per product and shop account. Does not duplicate physical master stock.';

-- -----------------------------------------------------------------------------
-- 2. Table: public.inventory_transfer_requests
-- -----------------------------------------------------------------------------
create table if not exists public.inventory_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku) on delete restrict,
  batch_id uuid references public.product_batches(id) on delete set null,
  source_custodian_id uuid references public.user_profiles(id) on delete set null,
  destination_custodian_id uuid references public.user_profiles(id) on delete set null,
  source_hub text not null default 'MANILA_MAIN',
  destination_hub text not null default 'MANILA_MAIN',
  target_shop_id uuid references public.channel_shops(id) on delete set null,
  quantity integer not null check (quantity > 0),
  reason text not null check (length(trim(reason)) > 0),
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'approved', 'rejected', 'in_transit', 'completed', 'cancelled')),
  rejection_reason text,
  requested_by uuid references public.user_profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.user_profiles(id) on delete set null,
  reviewed_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_inventory_transfer_requests_sku
  on public.inventory_transfer_requests (sku);

create index if not exists idx_inventory_transfer_requests_status
  on public.inventory_transfer_requests (status);

comment on table public.inventory_transfer_requests is
  'MAP-026: Staff-request and admin-approval physical custody movement records.';

-- -----------------------------------------------------------------------------
-- 3. Stored Procedure: request_inventory_transfer
-- -----------------------------------------------------------------------------
create or replace function public.request_inventory_transfer(
  p_sku text,
  p_quantity integer,
  p_reason text,
  p_source_hub text default 'MANILA_MAIN',
  p_destination_hub text default 'MANILA_MAIN',
  p_batch_id uuid default null,
  p_destination_custodian_id uuid default null,
  p_target_shop_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid;
  v_batch_avail integer;
  v_request_id uuid;
begin
  v_caller := auth.uid();
  if p_quantity is null or p_quantity <= 0 then
    raise exception using errcode = '23514', message = 'K2_TRANSFER_QUANTITY_INVALID';
  end if;

  if p_sku is null or trim(p_sku) = '' then
    raise exception using errcode = '23514', message = 'K2_TRANSFER_SKU_REQUIRED';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception using errcode = '23514', message = 'K2_TRANSFER_REASON_REQUIRED';
  end if;

  -- If an exact batch was specified, ensure it holds sufficient unreserved stock
  if p_batch_id is not null then
    select coalesce(quantity, 0) into v_batch_avail
    from public.product_batches
    where id = p_batch_id and sku = p_sku;

    if v_batch_avail is null or v_batch_avail < p_quantity then
      raise exception using errcode = '23514', message = 'K2_INSUFFICIENT_BATCH_STOCK';
    end if;
  end if;

  insert into public.inventory_transfer_requests (
    sku,
    batch_id,
    source_custodian_id,
    destination_custodian_id,
    source_hub,
    destination_hub,
    target_shop_id,
    quantity,
    reason,
    status,
    requested_by,
    requested_at
  ) values (
    p_sku,
    p_batch_id,
    v_caller,
    p_destination_custodian_id,
    coalesce(p_source_hub, 'MANILA_MAIN'),
    coalesce(p_destination_hub, 'MANILA_MAIN'),
    p_target_shop_id,
    p_quantity,
    trim(p_reason),
    'pending_approval',
    v_caller,
    now()
  )
  returning id into v_request_id;

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'sku', p_sku,
    'quantity', p_quantity,
    'status', 'pending_approval'
  );
end;
$$;

do $$ begin
  revoke all on function public.request_inventory_transfer(text, integer, text, text, text, uuid, uuid, uuid) from public, anon;
  grant execute on function public.request_inventory_transfer(text, integer, text, text, text, uuid, uuid, uuid) to authenticated;
exception when undefined_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 4. Stored Procedure: review_inventory_transfer
-- -----------------------------------------------------------------------------
create or replace function public.review_inventory_transfer(
  p_request_id uuid,
  p_approve boolean,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid;
  v_req record;
  v_new_status text;
begin
  v_caller := auth.uid();

  -- Enforce admin authorization
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'K2_ADMIN_AUTHORIZATION_REQUIRED';
  end if;

  select * into v_req
  from public.inventory_transfer_requests
  where id = p_request_id
  for update;

  if v_req is null then
    raise exception using errcode = 'P0002', message = 'K2_TRANSFER_NOT_FOUND';
  end if;

  if v_req.status <> 'pending_approval' then
    raise exception using errcode = '23514', message = 'K2_TRANSFER_ALREADY_REVIEWED';
  end if;

  if p_approve then
    v_new_status := 'approved';
    -- If batch is linked, update batch custodian/hub
    if v_req.batch_id is not null and v_req.destination_hub is not null then
      update public.product_batches
      set hub = v_req.destination_hub
      where id = v_req.batch_id;
    end if;

    -- Record transfer event
    if to_regclass('public.inventory_events') is not null then
      insert into public.inventory_events (
        sku,
        location_code,
        event_type,
        quantity,
        reference_type,
        reference_id,
        reason
      ) values (
        v_req.sku,
        v_req.destination_hub,
        'transferred',
        v_req.quantity,
        'transfer_request',
        v_req.id,
        coalesce(v_req.reason, 'Admin approved transfer')
      );
    end if;
  else
    v_new_status := 'rejected';
    if p_rejection_reason is null or trim(p_rejection_reason) = '' then
      raise exception using errcode = '23514', message = 'K2_REJECTION_REASON_REQUIRED';
    end if;
  end if;

  update public.inventory_transfer_requests
  set
    status = v_new_status,
    reviewed_by = v_caller,
    reviewed_at = now(),
    rejection_reason = case when not p_approve then trim(p_rejection_reason) else null end
  where id = p_request_id;

  return jsonb_build_object(
    'ok', true,
    'request_id', p_request_id,
    'status', v_new_status,
    'reviewed_by', v_caller,
    'reviewed_at', now()
  );
end;
$$;

do $$ begin
  revoke all on function public.review_inventory_transfer(uuid, boolean, text) from public, anon;
  grant execute on function public.review_inventory_transfer(uuid, boolean, text) to authenticated;
exception when undefined_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 5. Stored Procedure: rebalance_shop_allocations_v1
-- -----------------------------------------------------------------------------
create or replace function public.rebalance_shop_allocations_v1(
  p_sku text,
  p_location_code text default 'MANILA_MAIN'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_master_avail integer := 0;
  v_target integer := 2;
  v_remaining integer;
  v_shop record;
  v_grant integer;
  v_status text;
  v_allocated_count integer := 0;
  v_total_granted integer := 0;
begin
  -- 1. Read available sellable master stock for this SKU
  if to_regclass('public.inventory_balances') is not null then
    select coalesce(available, 0) into v_master_avail
    from public.inventory_balances
    where sku = p_sku and location_code = coalesce(p_location_code, 'MANILA_MAIN');
  end if;

  if v_master_avail is null then
    v_master_avail := 0;
  end if;

  v_remaining := v_master_avail;

  -- 2. Iterate through all active candidate shops in priority order
  for v_shop in (
    select
      s.id as shop_id,
      s.shop_code,
      s.channel_code,
      s.display_name,
      coalesce(a.is_skipped, false) as is_skipped,
      coalesce(a.priority, 100) as priority,
      coalesce(a.target_units, v_target) as target_units
    from public.channel_shops s
    left join public.channel_shop_allocations a on a.shop_id = s.id and a.sku = p_sku
    where s.status in ('operational', 'pending')
    order by coalesce(a.is_skipped, false) asc, coalesce(a.priority, 100) asc, s.shop_code asc
  ) loop
    if v_shop.is_skipped then
      v_grant := 0;
      v_status := 'Skipped';
    else
      v_grant := least(v_remaining, v_shop.target_units);
      v_remaining := v_remaining - v_grant;

      if v_grant >= 2 then
        v_status := 'Covered';
      elsif v_grant = 1 then
        v_status := 'Thin';
      else
        v_status := 'Out';
      end if;
    end if;

    insert into public.channel_shop_allocations (
      shop_id,
      sku,
      target_units,
      allocated_units,
      reserved_units,
      is_skipped,
      priority,
      status,
      last_rebalanced_at
    ) values (
      v_shop.shop_id,
      p_sku,
      v_shop.target_units,
      v_grant,
      0,
      v_shop.is_skipped,
      v_shop.priority,
      v_status,
      now()
    )
    on conflict (shop_id, sku) do update
    set
      allocated_units = excluded.allocated_units,
      status = excluded.status,
      last_rebalanced_at = now();

    v_allocated_count := v_allocated_count + 1;
    v_total_granted := v_total_granted + v_grant;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'sku', p_sku,
    'location_code', coalesce(p_location_code, 'MANILA_MAIN'),
    'master_available', v_master_avail,
    'total_allocated', v_total_granted,
    'unallocated_stock', v_master_avail - v_total_granted,
    'shops_rebalanced', v_allocated_count
  );
end;
$$;

do $$ begin
  revoke all on function public.rebalance_shop_allocations_v1(text, text) from public, anon;
  grant execute on function public.rebalance_shop_allocations_v1(text, text) to authenticated;
exception when undefined_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 6. Views: v_multi_shop_stock_projection
-- -----------------------------------------------------------------------------
create or replace view public.v_multi_shop_stock_projection as
select
  p.sku,
  p.name as product_name,
  coalesce(b.available, 0) as master_available,
  coalesce(b.on_hand, 0) as master_on_hand,
  coalesce(b.reserved, 0) as master_reserved,
  s.id as shop_id,
  s.shop_code,
  s.channel_code,
  s.display_name as shop_name,
  coalesce(a.target_units, 2) as target_units,
  coalesce(a.allocated_units, 0) as allocated_units,
  coalesce(a.status, 'Out') as allocation_status,
  coalesce(a.is_skipped, false) as is_skipped
from public.products p
cross join public.channel_shops s
left join public.inventory_balances b on b.sku = p.sku and b.location_code = 'MANILA_MAIN'
left join public.channel_shop_allocations a on a.sku = p.sku and a.shop_id = s.id;

comment on view public.v_multi_shop_stock_projection is
  'MAP-026: Matrix projection of Master Inventory alongside per-shop availability allocations.';

-- -----------------------------------------------------------------------------
-- 7. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.channel_shop_allocations enable row level security;
alter table public.channel_shop_allocations force row level security;

alter table public.inventory_transfer_requests enable row level security;
alter table public.inventory_transfer_requests force row level security;

do $$ begin
  revoke all on table public.channel_shop_allocations from public, anon;
  revoke all on table public.inventory_transfer_requests from public, anon;

  grant select on table public.channel_shop_allocations to authenticated;
  grant select, insert, update on table public.inventory_transfer_requests to authenticated;

  drop policy if exists channel_shop_allocations_staff_read on public.channel_shop_allocations;
  create policy channel_shop_allocations_staff_read
    on public.channel_shop_allocations for select to authenticated
    using (public.is_staff());

  drop policy if exists channel_shop_allocations_admin_write on public.channel_shop_allocations;
  create policy channel_shop_allocations_admin_write
    on public.channel_shop_allocations for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

  drop policy if exists inventory_transfer_requests_staff_read on public.inventory_transfer_requests;
  create policy inventory_transfer_requests_staff_read
    on public.inventory_transfer_requests for select to authenticated
    using (public.is_staff());

  drop policy if exists inventory_transfer_requests_staff_insert on public.inventory_transfer_requests;
  create policy inventory_transfer_requests_staff_insert
    on public.inventory_transfer_requests for insert to authenticated
    with check (public.is_staff() and requested_by = auth.uid());

  drop policy if exists inventory_transfer_requests_admin_update on public.inventory_transfer_requests;
  create policy inventory_transfer_requests_admin_update
    on public.inventory_transfer_requests for update to authenticated
    using (public.is_admin())
    with check (public.is_admin());
exception when undefined_object then null; end $$;

commit;
