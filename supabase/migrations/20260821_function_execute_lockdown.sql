-- MAP-020 repository-target privilege correction.
-- This migration is prepared local state only until the provider migration gate is approved.

revoke all on function public.prevent_conversation_event_mutation() from public, anon, authenticated;
revoke all on function public.reject_event_mutation() from public, anon, authenticated;
revoke all on function public.sync_product_batch_compat_columns() from public, anon, authenticated;
revoke all on function public.sync_product_compat_columns() from public, anon, authenticated;
revoke all on function public.sync_product_publication_status() from public, anon, authenticated;
revoke all on function public.touch_product_intake_session() from public, anon, authenticated;
revoke all on function public.touch_staff_allocations() from public, anon, authenticated;

-- These legacy purchase-order receiving commands have no current browser/BFF caller.
-- Keep them behind the server boundary until MAP-023 replaces them with the canonical,
-- reasoned, idempotent supplier receipt command.
revoke all on function public.receive_po(uuid) from public, anon, authenticated;
revoke all on function public.receive_po_scanned(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.receive_po(uuid) to service_role;
grant execute on function public.receive_po_scanned(uuid,jsonb) to service_role;
