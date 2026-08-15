# Phase checkpoint: MAP-017 live schema and authorization truth

## Result

`Partially implemented`

Prepared SQL, a schema-comparison core, CLI guards, fixtures, and static
contracts exist. MAP-017 remains queued behind MAP-016 because no connected
schema export, isolated database execution, authorization behavior suite, or
faithful captured-baseline recovery has been completed.

## Changes and verification

- Codex restored the test requirement that privileged functions use
  `set search_path = ''`; `public` is not allowed.
- `npm run test:contracts`: 69 passed, including nine MAP-017 source/fixture
  assertions.
- `node scripts/rehearse-local-migration.mjs`: exit 1,
  `BLOCKED_LOCAL_DATABASE_UNAVAILABLE`; no SQL executed.
- `node scripts/run-local-database-authorization-suite.mjs`: exit 1,
  `BLOCKED_LOCAL_DATABASE_UNAVAILABLE`; zero database behavior tests executed.

## Evidence boundary

The passing tests are `Prepared locally`. They do not prove live grants, RLS,
roles, ownership, RPC permissions, Storage, Realtime, IDOR denial, concurrency,
or rollback. Any earlier rollback-only production transaction is historical and
does not replace a current schema export or isolated rehearsal.

## Next safe action

After MAP-016, provision an isolated local Supabase/PostgreSQL target; execute a
real metadata export, exhaustive diff, migration, positive/negative role matrix,
and captured-baseline recovery transaction. Permanent production DDL remains
unauthorized.

`No claim above exceeds its evidence.`
