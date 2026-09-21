# Admin Globe direct editing recovery

## Scope

IDEA-20260921-02 / MAP-020 restores a usable Globe Display command path while
the Admin BFF browser switch is off. Production Supabase has the additive direct
RPC. Admin UI transport code is local and awaits deployment.

## Production database evidence

- Before: 17 `globe_products`, zero `reviews`, published-only review read policy,
  protected Globe RPCs present, and no authenticated table-write policies.
- Applied: `20260921_admin_globe_direct_rpc.sql` to project
  `pixplcjqivlfflickobf` through the Supabase migration boundary.
- Postflight: `authenticated_execute=true`, `anon_execute=false`,
  `direct_globe_update=false`, `direct_review_insert=false`.
- No product or review row was created, changed or deleted during production
  verification.

## Local evidence

- `npm run rehearse:admin-globe-direct`: pass. Covers Admin/AAL2 save, exact
  retry, changed-payload conflict, draft-only review creation, evidence-backed
  publication, Staff denial, AAL1 denial, audit uniqueness and closed table
  grants.
- `tests/admin-globe-direct-transport.spec.js`: 3/3 pass after observed RED for
  the missing transport and migration.
- `tests/admin-logic-regressions.spec.js` plus direct transport: 21/21 pass.
- Focused Globe BFF contract: 1/1 pass.
- `npm run verify:admin-bff`: pass.
- `npm run build:admin`: pass; Admin application 201.18/300.00 kB minified.
- `git diff --check`: no whitespace errors; only existing CRLF conversion
  warnings on the two planning records.

## Remaining acceptance

The focused 375px browser case timed out before mounting Global Display because
its prerequisite `Operations command center` heading did not appear. It does
not test or disprove this change. Deploy the Admin UI code, then sign in as an
AAL2 Admin and verify load, one reasoned visibility save and reload on the exact
Admin host. Confirm a Staff account is denied. The live review register remains
empty.

## Recovery

Run `supabase/rollbacks/20260921_admin_globe_direct_rpc_rollback.sql` to remove
only the direct RPC. Reverting the UI transport or leaving it undeployed returns
the screen to its previous read-only behavior. Do not restore authenticated
table-write grants or remove audit/receipt rows.
