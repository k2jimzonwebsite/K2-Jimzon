-- Recovery gate for 20260912_guest_order_conversation_seed.sql (prepared only).
-- The old script replayed the entire 20260812 guest security boundary, replacing
-- ten functions and reissuing table/function ACLs. It was not a scoped rollback
-- and could overwrite later hardening. Never use that migration as seed recovery.
--
-- Before applying the seed migration, capture the current definitions, owners
-- and ACLs of exactly these functions from the target database:
--   public.submit_guest_order_v1(bigint,uuid,text,text,text,text)
--   public.submit_guest_pasabuy_v1(bigint,uuid,text,text,text,text)
-- Rehearse a transaction that restores those captured definitions and verifies
-- their original ACLs plus unchanged unrelated functions. Retain existing seeded
-- messages and conversations as audit history. Review later dependencies before
-- restoring; otherwise roll forward. MAP-019 owns this unfinished recovery gate.
-- No production application or automatic rollback is authorized by this file.

\set ON_ERROR_STOP on
do $$ begin
  raise exception 'K2_GUEST_SEED_CAPTURED_RECOVERY_REQUIRED';
end $$;
