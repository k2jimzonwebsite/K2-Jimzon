-- =============================================================================
-- Migration Rollback: 20260929_channel_listing_slices_rollback.sql
-- Emergency reversal for the IDEA-20260929-06 channel listing slices.
--
-- Seeds are removed only while still not_connected: a shop a staff member
-- already operationalized is live truth and must never vanish in a rollback.
-- Dropping net_weight_g discards recorded lot grams; that loss is the reason
-- this rollback is rehearsed before any production apply.
-- =============================================================================

begin;

drop trigger if exists channel_shop_allocations_oversell_guard
  on public.channel_shop_allocations;
drop function if exists public.enforce_shop_allocation_within_master();
drop trigger if exists inventory_balances_shop_allocation_guard
  on public.inventory_balances;
drop function if exists public.enforce_master_stock_not_below_shop_offers();

drop view if exists public.v_storefront_visible_skus;

delete from public.channel_shops
where shop_code in (
  'pasabuy-lazada', 'pasabuy-shopee', 'pasabuy-tiktok',
  'jworld-lazada', 'jworld-shopee', 'jworld-tiktok'
) and status = 'not_connected';

alter table public.product_batches drop column if exists net_weight_g;
alter table public.product_batches
  drop constraint if exists product_batches_net_weight_g_check;

commit;
