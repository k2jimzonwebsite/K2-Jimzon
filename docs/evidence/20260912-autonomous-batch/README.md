# Autonomous batch — 12 September 2026 (local verification + prepared work)

Owner: MAP-017 through MAP-028 remainders. This is locally prepared and
verified work only. No production migration ran, no code was deployed, no
paid provider call was made, no credential or channel was activated, and no
MAP item is closed by this record. Authenticated real-host acceptance,
owner inputs, and the MAP-017 follow-up production apply remain gated in
their owning MAP items.

Skills applied: `using-superpowers` (routing), `k2-pasabuy-commerce-operations`
(domain truth), `andrej-karpathy` (surgical changes, explicit assumptions,
verify-to-green), and all four design skills (`ui-ux-pro-max`, `impeccable`,
`design-taste-frontend`, `emil-design-eng`) for the UI-touching batches. No
UI source changed in this batch, so the design gate reviewed but altered
nothing: the passing suites already meet the 44px, contrast, keyboard, zoom
and reduced-motion contracts the MAP records.

## Code changes (4 files + 4 new files)

1. `package.json` / `package-lock.json`: `sharp` 0.35.0 → 0.35.4 (GHSA
   libheif high advisory; `npm audit` now 0 vulnerabilities). Lockfile churn
   is sharp platform binaries + libvips 1.3.0 → 1.3.3 only. Verified by
   dependency policy (pass) and the real-image intake-evidence contract.
2. `supabase/migrations/20260912_confirmation_stock_commitment.sql` (new):
   OWNER-002 ownership deduction at first confirmation. See the Guest
   Commerce BFF runbook section "Confirmation stock commitment" and
   `docs/evidence/20260909-stock-commitment/README.md`.
3. `supabase/confirmation_stock_commitment_rollback.sql` (new): re-applies
   the two prior migrations verbatim, drops the helper, retains evidence
   columns. Executed on a scratch loopback database and verified.
4. `supabase/tests/confirmation_commitment_behavior.sql` (new): sweep
   exemption, cause allowlist, helper idempotency, cancellation retention,
   uncommitted-expiry control.
5. `tests/confirmation-commitment-contract.spec.js` (new, registered in
   `test:contracts`): additivity, internal-only helper, custody preservation,
   dual-pass sweep guard, rollback shape, runner wiring.
6. `scripts/rehearse-purchase-time-reservation.mjs`: applies the commitment
   migration with replay before the ownership assertions.

## Verification log (executed checks; unrun dependencies below)

| Batch | Command | Result |
| --- | --- | --- |
| MAP-017 | `npm run verify:map017-portable` | pass: 12 auth groups, replay, rollback, encrypted backup + isolated restore |
| MAP-018 | `verify:map018-intake`, `verify:map018-cleanup-portable`, `rehearse:intake-ai`, `test:intake-ai-ui` | pass, 9/9 browser |
| MAP-019/028 recovery | 88 focused contracts; `test:inbox-ui` 27/27; `test:payment-ui` 33/33; `test:admin-ui` 32/32; `build:admin` 188.92/300 kB | pass |
| MAP-020/021 | `prebuild` (both builds), `security:surfaces` zero gaps, `security:dependency-audit` 0 vulns after sharp fix, `security:dependency-policy` pass | pass |
| MAP-023 | `rehearse:purchase-hold` 30/30 (was failing on ownership deduction); `rehearse:map023-last-unit`; `rehearse:payment-recovery` | pass |
| MAP-019/020/022 | `rehearse:final-admin`; staff-invite, MFA-replacement, preauth-rate, storefront-auth-rate, shopee-ingress, account-claim rehearsals | pass |
| MAP-024/026 | `rehearse:product-knowledge` 9/9; `rehearse:marketplace-snapshots`; `rehearse:channel-vocabulary` 13/13; 38 discovery/sitemap/catalog contracts | pass |
| MAP-027/028 shop | `build:storefront` (JS 149.85/150, CSS 27.48/30 kB gzip); `test:store-orientation` 2/2; `test:workflow-api` 4/4; owner-close 1/1; product-master 1/1; customer-account 3/3; selling 8/8; storefront-ui 31/31; `test:base` 742/742 | pass |

## Deliberately not run / blocked behind env (by design)

- `rehearse:catalog-spreadsheet`: `BLOCKED_LOCAL_DATABASE_UNAVAILABLE`
  (needs `K2_CATALOG_REHEARSAL_URL`; CI provides it).
- `rehearse:database-backup-restore`: needs `K2_*` rehearsal URLs. Backup +
  isolated-restore evidence is covered by the MAP-017 portable rehearsal in
  this same batch.
- Any `evidence:map0*` provider/live command, any production apply, any
  deployment, any paid call.

## Remaining autonomous-ineligible work (unchanged ownership)

MAP-017 follow-up production apply (exact-payload authorization); BFF
activation; paid intake provider/model/caps; marketplace credentials and
real reconciliation; real inventory/content/media-rights/delivery/payment
inputs; staff enrollment; OWNER-003 scope; Unlisted policy choice;
launch-timing choice; Queue 13 mount-vs-delete decision; final acceptance.
The I-001 remainder at this historical checkpoint was payment-verification
commitment, handover coverage and owned-stock reads. The 13 September composition
evidence supersedes the first two; follow the current owning MAP remainder.

## Recovery

- Sharp: revert the `package.json`/`package-lock.json` hunks and reinstall.
- Commitment: `psql -f supabase/confirmation_stock_commitment_rollback.sql`
  from the repo root (executed and verified on loopback).
- All other batches changed no source: nothing to revert.
