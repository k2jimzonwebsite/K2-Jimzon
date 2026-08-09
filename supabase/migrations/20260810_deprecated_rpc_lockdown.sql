-- K2 Jimzon deprecated RPC lockdown
--
-- Remove browser access to obsolete mutation paths that bypass the canonical
-- order, reservation, batch, and exact-scan workflows.

create or replace function public.decrement_stock(p_sku text, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Direct product stock deduction is disabled. Use order reservations and fulfillment.';
end;
$$;

revoke all on function public.decrement_stock(text,integer) from public, anon, authenticated;
revoke all on function public.deduct_stock_fefo(text,integer) from public, anon, authenticated;
revoke all on function public.mark_order_line_packed(uuid) from public, anon, authenticated;
revoke all on function public.replace_product_batches(text,jsonb,text) from public, anon, authenticated;
revoke all on function public.add_consignment_item(uuid,text,text,date,integer) from public, anon, authenticated;
revoke all on function public.record_consignment_scan(uuid,text,text) from public, anon, authenticated;

-- Trigger functions execute through their triggers and are never client RPCs.
revoke all on function public.audit_coupon_change() from public, anon, authenticated;
revoke all on function public.guard_role_change() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.process_audit_log() from public, anon, authenticated;
revoke all on function public.touch_coupon_updated_at() from public, anon, authenticated;

notify pgrst, 'reload schema';
