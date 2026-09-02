# Current Task — MAP-017: Named Production Backup/Restore Point Verification Gate

**Set 26 August 2026. MAP-017 immediate execution gate.**

## Selected MAP Scope
- **MAP Item:** MAP-017 (Supabase schema truth, grants, RLS, RBAC, ownership, and RPC boundary)
- **Section:** Prepare and independently verify a named production backup/restore point.
- **Immediate Outcome:** Blocked — evidence required.

## The Gate & Current State
- `OWNER-005` in `K2 Jimzon - Brain/OWNER_QUESTIONS.md` records `Decision: Authorized`.
- However, `Backup evidence ID` and `Backup/restore verification` remain `Pending`.
- The guarded production apply script (`scripts/apply-map017-migration.mjs`) is fail-closed and strictly verifies:
  1. Project target: `pixplcjqivlfflickobf`
  2. Authorization: `OWNER-005`
  3. Artifact SHA-256: `D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62`
  4. Durable backup evidence ID matching verified `OWNER-005` entry
  5. Planned ledger version: `20260824143000`
  6. Live findings count: `55`
  7. Explicit roll-forward recovery confirmation
- In absence of verified production backup evidence, executing `apply-map017-migration.mjs --apply` fails closed with code 1:
  `[BLOCKED] OWNER-005 backup evidence must exactly match and be Verified`.

## Safe Local Preparations Verified
1. **Local Backup/Restore Rehearsal:** `scripts/rehearse-database-backup-restore.mjs` and `tests/database-backup-rehearsal.spec.js` verify custom dump extraction, AES-256-GCM authenticated encryption/decryption, isolated database restoration, and SHA-256 payload/privilege fingerprint matching.
2. **Portable MAP-017 Lifecycle:** `npm run verify:map017-portable` runs against the isolated PostgreSQL 17.11 loopback database, executing vulnerable bootstrap, preflight, rollback restoration, apply, all 12 machine-counted authorization groups, and idempotent replay.
3. **Preflight & Dry-Run:** `node scripts/apply-map017-migration.mjs --dry-run` passes all artifact validations, transaction boundaries, and ledger bindings.
4. **Contract & Security Suites:** 195/195 API and security contract tests passing, 2/2 selling-surface tests passing, 11/11 smoke tests passing, 16/16 admin UI tests passing, 3/3 customer account UI tests passing, prebuild secret/surface scans passing, and both Storefront and Admin production builds passing cleanly.

## Exact Required Owner/Provider Action
To unblock permanent production migration execution:
1. Generate an authenticated production database backup for project `pixplcjqivlfflickobf` (via Supabase Dashboard PITR / scheduled backup or server-side `pg_dump`).
2. Record its durable backup identifier (e.g., `prod-backup-20260826-pixplcjqivlfflickobf-01`) and verify the restore capability on an isolated target.
3. Update `K2 Jimzon - Brain/OWNER_QUESTIONS.md` under `OWNER-005`:
   - `**Backup evidence ID:** <exact-durable-id>`
   - `**Backup/restore verification:** Verified`
4. Run the guarded apply command with all required parameters and recovery acknowledgements.
