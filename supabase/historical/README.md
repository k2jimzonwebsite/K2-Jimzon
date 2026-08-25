# Historical bootstrap SQL — already applied, not an upgrade path

These five `RUN_THIS_*.sql` files are the original manual setup scripts for K2
Jimzon. **Every one of them has already been run on the live database.** They are
kept for two reasons only: they explain how the current schema came to exist, and
they are the bootstrap order for standing up a genuinely fresh database.

They previously lived in `supabase/migrations/`, which was wrong in two ways:

1. Any tool that walks the migration directory would try to apply them, on top of
   the 70 dated and numbered migrations that are the real upgrade path. This is
   part of the 75-file / 5-entry migration ledger drift recorded as AUD-008.
2. `scripts/audit-security-surfaces.mjs` had to skip them by filename prefix to
   avoid double-counting. That exclusion meant their `SECURITY DEFINER`
   functions, RLS enablement, and policies on `user_profiles`, `product_batches`,
   `error_reports`, `product_drafts`, and `channel_connections` were never
   inventoried by the security surface gate.

Moving them here fixes the first problem. The audit script now scans this
directory explicitly, which fixes the second: the content is still inventoried,
it is simply no longer mistaken for pending migration work.

## Do not run these against the deployed project

For the live database, use the dated additive migrations. Never rerun a
consolidated bootstrap script to pick up a newer feature — see
`K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md`, "Migration source of truth".

## Fresh-database bootstrap order

Only for standing up a new, empty database. Run the numbered migrations
`0001`–`0018` and the `20260722`/`20260723` RLS files first, then, in the
Supabase SQL editor, in this exact order:

1. `RUN_THIS_master_setup.sql` — enums, order fields, batch bank, expiry, error
   reports, and `is_staff()`.
2. `RUN_THIS_batch_location_channel.sql` — adds `channel` to lots plus the
   by-hub / by-holder / by-channel views.
3. `RUN_THIS_channel_connections.sql` — the Live / Not-connected status table.
4. `RUN_THIS_auth_roles.sql` — staff logins: `is_admin()`, RLS on
   `user_profiles`, and the anti-role-escalation trigger. Then bootstrap the
   first admin: sign in once, then
   `update user_profiles set role='Admin' where email='…'`.
5. `RUN_THIS_product_drafts.sql` — the AI Sourcing review-queue table.

## Security note

Every `SECURITY DEFINER` function in these files declares a fixed
`search_path`, verified 25 August 2026. If you edit anything here, the security
surface gate now scans it — keep it that way rather than re-adding an exclusion.
