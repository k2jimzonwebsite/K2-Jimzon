# Phase checkpoint: Phase 1 — MAP-016 Credential and Invitation Cutover Readiness

## Result

`Blocked — final evidence required` (production migration, active modern-key Edge
runtime, denial boundary, rollback-only receipt behavior, and current static Vercel
artifacts verified; real Admin AAL2 success, complete Vercel environment inventory,
signing-path revocation, old-token rejection, and full exposure-period logs remain).

## Scope and dependency gate

- MAP requirements addressed: MAP-016 emergency credential containment, durable staff invitation receipts, modern secret key usage, legacy service-role deprecation readiness.
- Earlier dependency evidence relied upon: Local secret scanning (729 files, Git history, separate dist bundles), Codex direct correction of `invite-staff` handler.
- Owner authorization recorded and used for the bounded deployment. Remaining owner-assisted evidence requires access to the actual K2 Vercel projects and an Admin AAL2 session for a real invitation before signing-key revocation.
- Work deliberately excluded: Direct production mutation or key revocation without live authorization.

## Current-state due diligence

- Code/schema/provider state inspected: `supabase/functions/invite-staff/handler.ts`, `supabase/functions/_shared/service-role.ts`, `supabase/migrations/20260814_invite_staff_operation_boundary.sql`, `tests/edge-function-invite-staff.spec.js`.
- Dirty-worktree preservation: All existing modified files preserved.
- Problem reconfirmed from: Legacy service-role key deprecation requires modern `sb_secret_` JSON map and durable actor/operation receipts in the database before signing key revocation.

## Changes and files

- `supabase/functions/invite-staff/handler.ts` (Injectable, deterministic handler requiring exact Origin, exact Admin role, AAL2, UUID operation key, bounded JSON <= 4096 bytes, exact redirect <= 2048 bytes).
- `supabase/functions/invite-staff/index.ts` (Edge entrypoint reading modern `SUPABASE_SECRET_KEYS`).
- `supabase/functions/_shared/service-role.ts` (Modern key map parser).
- `supabase/migrations/20260814_invite_staff_operation_boundary.sql` (Prepared durable operation receipt schema `k2_private.staff_invitation_operations`, serialized actor claims with `pg_advisory_xact_lock`, AAL2 gate).
- `tests/edge-function-invite-staff.spec.js` (11 contract tests verifying valid invite, existing user recovery, origin rejection, AAL2 rejection, replay, concurrency lock, and retry release).
- `scripts/verify-edge-function-invite-staff.mjs` (AST and source guard).

## Verification

| Exact command or provider check | Exit/result | Behavior proven | Evidence level |
| --- | --- | --- | --- |
| `npm run verify:edge-functions` | Exit 0 | Modern keys only, no wildcard CORS, AAL2 required, durable receipt in SQL | Prepared locally |
| `playwright test tests/edge-function-invite-staff.spec.js` | 11 passed | All success, denial, replay, concurrency, rate-limit, and failure-recovery paths | Prepared locally |
| `npm run security:secrets` | Exit 0 (729 files checked) | No exposed keys, tokens, or plaintext passwords in workspace | Prepared locally |
| `npm run security:history` | Exit 0 | No leaked credentials in commit history | Prepared locally |
| Production migration + permission postflight | Exit 0 | Durable receipts/functions exist; public/anon/authenticated execution denied and service role allowed | Live production |
| `supabase/map016_invite_operation_postflight.sql` | `MAP016_POSTFLIGHT_PASSED`, rolled back | Claim, replay lock, completion replay, conflict, and stale recovery | Live production, no retained fixture |
| Edge HTTP boundary | 204/403/401/403 as expected | Exact-origin CORS and unauthenticated/foreign-origin denial | Live production |

## Denial, failure, and recovery evidence

- Permission/ownership/IDOR denial: Non-Admin users and AAL1 sessions rejected with 403 `AAL2_REQUIRED` or `FORBIDDEN_ROLE`. Wrong origin rejected with 403 `FORBIDDEN_ORIGIN`.
- Invalid/unknown/oversized input: Payloads exceeding 4096 bytes rejected with 413 `REQUEST_TOO_LARGE`. Extra/unknown fields rejected with 400 `UNKNOWN_REQUEST_FIELD`. Redirect URLs exceeding 2048 bytes or with unapproved origins rejected with 400 `INVALID_REDIRECT_URL` / `INVALID_REDIRECT_ORIGIN`.
- Duplicate/concurrent/replay behavior: Same UUID key with identical payload replays prior result; changed payload with same key rejected with 409 `IDEMPOTENCY_CONFLICT`. Concurrent duplicate claims blocked by `pg_advisory_xact_lock` transaction lock returning `OPERATION_IN_PROGRESS`.
- Timeout/retry/recovery: Failed attempts release receipt lock, enabling safe retry with the same operation key up to 3 attempts per key in 10 minutes and max 10 attempts per actor across all keys in 10 minutes before returning 429 `RATE_LIMITED`.
- Transaction/data rollback: Incomplete invite/role persistence fails closed without writing invalid state; uncompleted claims are released.
- Safe errors/log redaction: No email or raw provider errors logged or returned in error payloads. Correlation IDs returned in `X-Correlation-ID` header and response body with sanitized client error codes.

## UI and accessibility evidence

`Not changed` (Edge Function backend and database migration only; UI consumed in Admin BOS).

## Provider and production truth

- Local/prepared: Handler, migration, test suite, and verification scripts are fully functional and pass all contracts.
- Provider state: Migration applied as a reviewed transaction through the linked query path; `invite-staff` version 5 is ACTIVE, configured for the exact Admin origin, and consumes modern hosted key maps. The public JWKS exposes an active ES256 signing key. The local/remote migration ledger mismatch remains for MAP-017 and was not papered over with migration-repair commands.
- Legacy API-key: Disabled via Management API (`enabled: false`), returning 401 when used as `apikey`. Old JWT Bearer still active pending consumer cutover and signing-key rotation.
- Independent refresh: both separate Vercel projects serve READY production
  artifacts of `26291bc`, and fetched bundles preserve the target split without
  a legacy JWT-shaped value or service-role variable. The connector cannot list
  environment-variable names/scopes, so this is static-consumer evidence only.
- Log evidence: capped 24-hour provider samples contain unattributed invalid-login,
  database-authentication, permission-denial, and malformed-Realtime-JWT events.
  They are not a complete exposure-period review and have not been cleared.

## Rollback

- Code/config rollback: Revert to previous handler or un-deploy Edge Function version.
- Migration/data rollback:
  ```sql
  DROP FUNCTION IF EXISTS public.claim_staff_invitation_operation(uuid, uuid, text);
  DROP FUNCTION IF EXISTS public.complete_staff_invitation_operation(uuid, uuid, text, jsonb);
  DROP FUNCTION IF EXISTS public.release_staff_invitation_operation(uuid, uuid, text);
  DROP TABLE IF EXISTS k2_private.staff_invitation_operations;
  ```
- Preserve the shared `k2_private` schema. Drop it only in a separately reviewed
  rollback when preflight evidence proves this migration created it, it is empty,
  and no other private object depends on it. Never use `CASCADE` here.
- What was actually rollback-tested: Local handler rollback-release paths and error teardown tested in unit/contract suite.

## Remaining blockers and next safe phase

- Failed or skipped checks: real Admin AAL2 successful invitation, K2 Vercel environment inventory, full API/Auth/Edge log review, signing-key revocation, and old-token rejection.
- Exact unblock condition: access the correct K2 Vercel team/projects, install/verify modern publishable configuration, complete a real Admin AAL2 invitation, respect the Auth token-expiry safety window, revoke the legacy signing path, and prove old-token rejection without recording credentials.
- Next phase safe to begin: None. Under the current owner instruction, MAP-017
  implementation and database execution begin only after MAP-016 is genuinely
  accepted.

## Truth statement

`No claim above exceeds its evidence.`
