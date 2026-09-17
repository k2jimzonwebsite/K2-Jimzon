-- =============================================================================
-- Migration Rollback: 20260917_multi_shop_allocation_and_transfers_rollback.sql
-- Description: Reversible rollback for MAP-026 multi-shop allocations & transfers
-- =============================================================================

begin;

drop view if exists public.v_multi_shop_stock_projection cascade;
drop function if exists public.rebalance_shop_allocations_v1(text, text);
drop function if exists public.review_inventory_transfer(uuid, boolean, text);
drop function if exists public.request_inventory_transfer(text, integer, text, text, text, uuid, uuid, uuid);
drop table if exists public.inventory_transfer_requests cascade;
drop table if exists public.channel_shop_allocations cascade;

commit;
