-- ============================================================================
-- K2 JIMZON — Product location / holder / channel per batch
-- ============================================================================
-- Same product, many lots. Each lot already carries expiry, box, hub and
-- custodian. This adds `channel` (which platform that lot is for) and roll-up
-- views so you can see stock by location, by holder, and by channel.
-- Idempotent — safe to run once. Run in the Supabase SQL editor.
-- ============================================================================

alter table public.product_batches add column if not exists channel text;  -- Shopee / Lazada / TikTok / Website / Warehouse-hold ...

-- Stock split by WHERE it is (hub)
create or replace view public.v_stock_by_hub as
select b.sku, p.name as product_name, coalesce(b.hub, 'Unassigned') as hub,
       sum(b.quantity) as quantity
from public.product_batches b
left join public.products p on p.sku = b.sku
where b.quantity > 0
group by b.sku, p.name, coalesce(b.hub, 'Unassigned')
order by b.sku;

-- Stock split by WHO holds it (custodian / staff)
create or replace view public.v_stock_by_custodian as
select coalesce(b.custodian, 'Unassigned') as custodian, b.sku,
       p.name as product_name, sum(b.quantity) as quantity
from public.product_batches b
left join public.products p on p.sku = b.sku
where b.quantity > 0
group by coalesce(b.custodian, 'Unassigned'), b.sku, p.name
order by custodian, b.sku;

-- Stock split by CHANNEL / platform it's allocated to
create or replace view public.v_stock_by_channel as
select coalesce(b.channel, 'Unassigned') as channel, b.sku,
       p.name as product_name, sum(b.quantity) as quantity
from public.product_batches b
left join public.products p on p.sku = b.sku
where b.quantity > 0
group by coalesce(b.channel, 'Unassigned'), b.sku, p.name
order by channel, b.sku;

-- Refresh the expiry-alert feed so the 🔔 bell can also show the channel.
-- (Dropped first because adding a column mid-list isn't allowed by REPLACE.)
drop view if exists public.v_expiring_batches;
create view public.v_expiring_batches as
select b.id, b.sku, p.name as product_name, b.box_code, b.hub, b.custodian, b.channel,
       b.quantity, b.expiry_date, b.is_pinned,
       (b.expiry_date - current_date) as days_left,
       case
         when b.expiry_date is null              then 'none'
         when b.expiry_date <  current_date      then 'expired'
         when b.expiry_date <= current_date + 30 then 'critical'
         when b.expiry_date <= current_date + 90 then 'warning'
         else 'fresh'
       end as status
from public.product_batches b
left join public.products p on p.sku = b.sku
where b.quantity > 0
order by b.expiry_date asc nulls last;

-- One row per lot with everything visible (where / who / channel / expiry)
create or replace view public.v_batch_allocations as
select b.id, b.sku, p.name as product_name, b.box_code, b.quantity,
       coalesce(b.hub, 'Unassigned')       as hub,
       coalesce(b.custodian, 'Unassigned') as custodian,
       coalesce(b.channel, 'Unassigned')   as channel,
       b.expiry_date, b.landed_date, b.is_pinned
from public.product_batches b
left join public.products p on p.sku = b.sku
where b.quantity > 0
order by b.sku, b.expiry_date asc nulls last;
