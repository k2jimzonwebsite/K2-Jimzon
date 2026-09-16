-- Rollback for 20260912_confirmation_stock_commitment.sql (prepared only).
--
-- Restores the hold-migration confirmation body and the pre-commitment sweep
-- body by re-applying their own replayable migrations verbatim, then drops
-- the commitment helper. Both source migrations are idempotent
-- create-or-replace batches, so re-applying them changes no other behavior.
-- The commitment evidence columns stay in place deliberately: released rows
-- may already carry committed_at audit facts, and dropping the columns would
-- erase that history. A future cleanup may drop them only after verifying no
-- released row references commitment evidence.
--
-- Run from the repository root against the target database owner session:
--   psql -f supabase/confirmation_stock_commitment_rollback.sql
-- Isolated loopback rehearsal only until MAP-017 gates pass. Each included
-- file manages its own transaction; do not wrap this script in one.

-- Payment composition depends on the helper and on the tightened hold body.
-- Refuse before any included migration commits. Restore a reviewed exact
-- function snapshot or roll forward; never reload the old broad hold chain.
\set ON_ERROR_STOP on
do $$ begin
  if exists(select 1 from pg_proc where oid=to_regprocedure('public.set_order_request_payment_status(uuid,text,text)')
    and position('commit_order_request_stock_v1' in pg_get_functiondef(oid))>0) then
    raise exception 'K2_COMPOSED_COMMITMENT_RECOVERY_REQUIRED';
  end if;
end $$;

\ir migrations/20260902_purchase_time_reservation.sql
\ir migrations/20260906_atomic_order_hold_expiry.sql
drop function if exists public.commit_order_request_stock_v1(uuid,text,text);
notify pgrst,'reload schema';
