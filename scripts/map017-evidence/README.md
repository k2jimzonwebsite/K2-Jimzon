# MAP-017 live schema-truth evidence

`export-live-schema-metadata.mjs` runs the repository's own
`supabase/export-schema-metadata.sql` against the linked project through the
Supabase Management API query endpoint and writes the resulting inventory.

It is **read-only by construction**: it refuses to send the file unless it begins
with `WITH`/`SELECT`, refuses if any write verb appears in the final projection,
and sends `read_only: true`. The export SQL selects catalog metadata only — no
business rows, credentials, or customer data.

This is deliberately separate from `scripts/export-schema-metadata.mjs`, which
refuses non-local **connection strings** because it is the path intended for
migration rehearsal against an isolated database.

## Usage

```bash
node scripts/map017-evidence/export-live-schema-metadata.mjs live-schema-metadata.json
node scripts/schema-truth-audit.mjs --export=live-schema-metadata.json
```

Requires `SUPABASE_ACCESS_TOKEN` in `.env.local`.

For the complete local artifact and database lifecycle on this Windows
workspace, run:

```powershell
npm.cmd run verify:map017-portable
```

The portable runner is pinned to the ignored PostgreSQL 17.11 runtime,
`127.0.0.1:55432`, and the dedicated `k2_map017_rehearsal_local` database. It
resets only that rehearsal database, runs rollback restoration, the exact
payload-bound production-apply SQL, its atomic ledger receipt, independent
post-commit verification, authorization assertions, and idempotent replay, and stops PostgreSQL in a
`finally` block when it started the server. The existing target-parameterized
commands remain available for CI and other explicitly configured loopback
databases.

## Why the export SQL was wrong before 22 August 2026

The SQL had never been executed. Running it exposed six defects, all fixed:

| Defect | Effect |
| --- | --- |
| `c.rowsecurity` on `pg_class` | Query aborted; `pg_class` has `relrowsecurity` |
| `p.relnamespace` on `pg_proc` | Query aborted; `pg_proc` has `pronamespace` |
| `inserted_at` on the migration ledger | Query aborted; the column does not exist |
| `information_schema` for grants/constraints/triggers/sequences | Returned **0 grants, 0 constraints, 0 triggers** — those views only expose objects the current role owns, and the export role is not the owner |
| `pg_get_function_identity_arguments` for the signature key | Included parameter names, so `set_user_role(uuid,text)` never matched |
| `pg_type.typname` for return type | Yielded `bool`, never matching a reviewed contract of `boolean` |

The fourth is the dangerous one: it produced a structurally complete export whose
grant, constraint and trigger sections were silently empty, which audits as clean
while proving nothing.

## Expected result as of 24 August 2026

`NON_CONFORMANT_CRITICAL`, 55 findings (47 critical, 7 high, 1 medium), captured
in `MAP_017_EXHAUSTIVE_AUTHORIZATION_AUDIT_2026-08-22.md`. The earlier
`MAP_017_LIVE_SCHEMA_AUDIT_2026-08-22.md` remains the narrower 21-finding
phase-one contract comparison. The prepared phase-one migration resolves a
substantial subset and is gated on owner authorization; other findings require
coordinated BFF/logging cutovers, guarded-RPC idempotency, and a provider-supported path for
`supabase_admin` default privileges.

The 24 August refresh reproduced the same 55 findings and 12/14 anonymous
behavior. The production rollback-only rehearsal passed with 9/9 restoration
checks, and the isolated PostgreSQL 17 lifecycle passed all 12 machine-counted
authorization groups plus idempotent replay. This is evidence that the prepared
artifacts have not drifted; it is not evidence that production was remediated.
The new `verify:map017-portable` command reproduced that entire local lifecycle
from a stopped-server state and shut the server down afterward; its focused
configuration/refusal regressions, all 20 schema-truth tool tests, and all 11
authorization contract tests pass. The generated artifact hash is
`8AF7C69ABFBE6694302AC8AFD30A177EBEEA8461BD7B0963CD3AE23570DFC5F1`; the
planned ledger version is `20260824143000`. These values are evidence and apply
gates, not authorization. OWNER-005 remains undecided and no production apply
was attempted.

The export omits function bodies but includes boolean-only signals for live
staff/Admin/AAL2 references and explicit exception paths. These signals back the
24-function matrix without leaking implementation text.
