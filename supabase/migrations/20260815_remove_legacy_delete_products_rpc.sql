-- The Admin production bundle now calls delete_products_with_pin_v2.
-- Remove the transition-only legacy endpoint so stale clients fail closed.

begin;
drop function if exists public.delete_products_with_pin(text[],text);
notify pgrst,'reload schema';
commit;
