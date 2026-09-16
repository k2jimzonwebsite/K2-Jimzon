-- MAP-017 follow-up for seven signatures present in the 8 September export.
-- Separate from the applied phase-one payload. Future intake/publication
-- functions retain their own migration dependency. No function body changes.
begin;

revoke all on function public.prevent_conversation_event_mutation() from public, anon, authenticated;
revoke all on function public.reject_event_mutation() from public, anon, authenticated;
revoke all on function public.sync_product_batch_compat_columns() from public, anon, authenticated;
revoke all on function public.sync_product_compat_columns() from public, anon, authenticated;
revoke all on function public.touch_staff_allocations() from public, anon, authenticated;
revoke all on function public.receive_po(uuid) from public, anon, authenticated;
revoke all on function public.receive_po_scanned(uuid,jsonb) from public, anon, authenticated;

grant execute on function public.receive_po(uuid) to service_role;
grant execute on function public.receive_po_scanned(uuid,jsonb) to service_role;

commit;
