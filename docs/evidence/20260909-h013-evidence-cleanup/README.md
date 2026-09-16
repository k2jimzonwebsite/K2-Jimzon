# MAP-028 H-013 evidence-cleanup receipt validation

Date: 9 September 2026  
Owner: MAP-028 H-013 / MAP-018 / MAP-021  
State: locally prepared and verified; not provider-applied or deployed

## Request and scope

Continue the Master Action Plan from the interrupted H-013 evidence-registration
recovery work. This is continuation of accepted MAP scope, not a new idea. The
change is limited to the Admin BFF cleanup receipt boundary and its regression
tests. No database, Storage, provider, deployment, or customer record changed.

## Root cause and correction

`reconcilePendingEvidenceCleanup` previously accepted every claim status other
than `completed` as if it were `pending`, so a valid-looking path/hash attached
to an unexpected state could reach Storage deletion. After deletion it treated
the absence of an RPC error as completion even when the database returned no
matching completion receipt.

The BFF now:

- requires the claim cleanup ID to equal the requested ID;
- permits only explicit `pending` or `completed` claim states before proceeding;
- reaches Storage deletion only from the exact `pending` state; and
- clears `cleanupPending` only for the same cleanup ID with explicit
  `completed` status.

## Failing-first evidence

Command:

```text
npx playwright test --config=playwright.api.config.js tests/admin-bff-contract.spec.js --grep "unexpected cleanup claim state|cleanup stays pending without an exact completion receipt"
```

Before the implementation guard, both cases failed. The unexpected claim state
resolved with `cleanupPending: false` after attempting removal, and the missing
completion receipt also resolved with `cleanupPending: false`. After the guard,
the same command passed 2/2.

## Fresh verification

- `npx playwright test --config=playwright.api.config.js tests/evidence-cleanup-policy.spec.js tests/admin-bff-contract.spec.js tests/product-intake-contract.spec.js` — 75/75 passed.
- `npm run verify:map018-intake` — static intake contract passed; live behavior remains activation-gated.
- `npm run verify:map018-cleanup-portable` — isolated PostgreSQL migration, private lifecycle, privileges, and replay passed. The first restricted run could not start the loopback `pg_ctl` process; the approved identical rerun passed.
- `npm run build:admin` — prebuild security/import gates and Admin production build passed; application chunk 188.92 kB of 300 kB.

The fixtures cover unknown registration outcome retention, provider cleanup
failure remaining pending, unexpected claim-state refusal before removal, and
missing completion-receipt retention. They do not constitute authenticated
Supabase Storage/RPC or deployed-host acceptance.

## Remaining work and recovery

H-013 remains active until its dependency-ordered migration/BFF activation and
authenticated real-provider failure/recovery acceptance are recorded. Do not
use destructive evidence against real product files. Roll back this local slice
by reverting only the `reconcilePendingEvidenceCleanup` guard, its two tests,
and the matching 9 September documentation additions; preserve all earlier
H-013 cleanup policy and unrelated dirty work.
