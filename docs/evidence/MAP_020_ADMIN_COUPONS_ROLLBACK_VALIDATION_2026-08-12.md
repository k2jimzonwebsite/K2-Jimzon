# MAP-020 Admin coupons rollback validation — 12 August 2026

## Scope

This evidence covers a prepared, inactive Admin BFF coupon-administration
boundary. It does not claim that cookie authentication, the signed wrapper,
direct-write cutover, feature flag, domain, or production workflow is live.

## Production truth inspected

- The live `coupons` columns, constraints, policies, grants, triggers, related
  functions, and row counts were inspected read-only.
- The table has RLS enabled and currently contains zero coupons.
- Authenticated staff currently have direct SELECT, INSERT, and UPDATE grants.
- Existing constraints cover normalized unique codes, percentage at most 100,
  positive discounts, nonnegative minimum spend/redemptions, positive optional
  limits, and valid date windows.
- The existing audit trigger stores row before/after values in `audit_logs`, but
  no operator reason is part of that event.
- `validate_coupon` is a live SECURITY DEFINER function callable by anon and
  authenticated roles. Its storefront cutover remains governed by the separate
  guest-commerce boundary; this slice does not claim that public path is secure.

## Prepared boundary and interface

- `GET /api/admin/coupons` returns at most 500 rows through one fixed projection
  and omits creator identity and generic row selection.
- Create, activate/pause, and archive mutations require an exact Admin BFF
  session, AAL2, CSRF, allowed origin/project, a signed five-minute command, a
  nonce, and a payload-bound operation key.
- Only the live `Admin` role may mutate campaigns. `Staff` may not change
  financial promotion rules while capability-level authorization is unfinished.
- Codes accept only 3–40 normalized letters, digits, `_`, and `-`. Percentage,
  fixed amount, minimum spend, redemption limit, start/end, hunt clue, and reason
  values are independently bounded in the server and database.
- Every accepted change requires a 10–500 character reason and writes one
  immutable `coupon_change_events` before/after record tied to actor and operation.
- Archive is non-destructive. Archived, expired, exhausted, and unchanged
  campaigns cannot be activated through the command boundary.
- The coordinated migration revokes authenticated direct INSERT/UPDATE/DELETE;
  SELECT remains RLS staff-scoped because the BFF restores the staff JWT.
- The interface uses the existing Admin Source Sans/tokens, fixed loading and
  recovery states, 44px controls, labeled reason fields, desktop register plus
  phone cards, and no raw provider errors, emoji, decorative motion, or browser
  confirm/prompt.

## Rollback-only behavior verified

The exact coupon migration compiled against production with a transaction-local
foundation/verifier stub. A second rollback-only transaction used a real Admin
identity and exercised representative commands:

1. Created an inactive percentage coupon and wrote one immutable event.
2. Retried the exact command and returned its durable receipt without a second
   coupon or event.
3. Reused the operation key with changed content and received
   `K2_ADMIN_IDEMPOTENCY_CONFLICT`.
4. Activated the campaign and wrote exactly one new event; exact retry wrote no
   duplicate event.
5. Archived the campaign, forced it inactive, and wrote one archive event.
6. Re-activation of the archived campaign was denied with
   `K2_COUPON_STATE_CONFLICT`.
7. Where a live Staff identity was available, its mutation attempt was denied
   with `K2_COUPON_ADMIN_REQUIRED`.
8. The transaction rolled back. Production again reported zero coupons, the
   original authenticated INSERT/UPDATE grants, and no wrapper or event table.

## Local verification

- 35 BFF and regression contracts pass.
- The isolated Admin production build passes with 21 manifest modules and
  bundle-content isolation.
- The Admin BFF foundation verifier passes.
- The secret scan passes across 696 files.
- `git diff --check` passes; line-ending notices are informational.

## Remaining before activation

- Complete MAP-016/MAP-017 credential, identity, grant, and denial prerequisites.
- Install the matching private/server request secret and apply the foundation,
  coupon migration, routes, UI flag, and direct-write cutover together.
- Run deployed denials for roles, AAL, CSRF, origin/project, replay,
  idempotency, rate, IDs, codes, bounds, windows, states, and reasons.
- Prove storefront coupon preview plus confirmation-time redemption against the
  same campaign records without exposing internal configuration.
- Rehearse scheduled/active/paused/expired/exhausted/archive behavior and obtain
  Admin phone/laptop acceptance.
- Keep `VITE_ADMIN_BFF_ENABLED=false` until every required Admin surface no
  longer depends on browser Supabase Auth or privileged direct operations.
