# Audit remediation — 13 September 2026

## Production follow-up, authorized and verified

This dated section supersedes the pre-authorization statements later in this
record for the exact MAP-017 correction only. Owner explicitly said “yes proceed”
after the scope and live-database effect were explained. Applied once to K2
`pixplcjqivlfflickobf`, version `20260909023000`, artifact SHA-256
`7BA3F473C3313890F57899A657CD1234FEDAFEEB43DB7465819919EF1FB71E05`.

- [Independent receipt/postflight](map017-applied-receipt.json): exact ledger
  identity plus all eleven checks true, 2026-09-13T15:24:53.942Z.
- [Fresh schema audit](schema-after-audit.log): **10 critical policy findings**,
  reduced from 26; seven migration ledger entries in the fresh metadata export.
- [Live anonymous read checks](anon-after-apply.log): **14/14 pass**. Public
  catalog/stock readable; the ten tested private tables deny anonymous access.
  Empty-table results prove grants/denial, not populated business journeys.
- The exact transaction contains actual anonymous stock SELECT before commit.
  Existing local rehearsal proves real trigger behavior and receiving permissions;
  no production receiving/business mutation was performed for verification.

Executed the unchanged reviewed transaction through Management API, with one
independent read before it and another after it. No blind retry. Fresh commands:
`node scripts/map017-evidence/export-live-schema-metadata.mjs .tools/audit-remediation-20260913/live-schema-after-apply.json`,
`node scripts/schema-truth-audit.mjs --export=.tools/audit-remediation-20260913/live-schema-after-apply.json`
(expected exit 1 for remaining findings), and
`node scripts/map017-evidence/verify-anon-read-boundary.mjs .env.local` (exit 0).
Credentials were read from the existing environment and never printed.

Remaining: four legacy anonymous guest/coupon RPC grants require the coordinated
guest cutover; six supabase_admin default privilege groups require a supported
provider-authorized path. No further production changes were made under this
approval. Application code remains locally prepared; payment, delivery, inventory,
guest activation and full launch acceptance are not established by these checks.

Recovery: transaction errors roll back. Post-commit recovery is reviewed
roll-forward or the recorded verified backup/restore procedure. Do not regrant
broad browser rights. Prior backup/restoration and owner recovery access were
verified in OWNER-005 and were reviewed before execution. The MAP now retains
only the outstanding security work, not another instruction to apply this payload.

Owner request: apply the full-audit findings under the Master Action Plan rules.
Decision register: IDEA-20260913-02. This records implementation evidence; remaining
work belongs only in the owning MAP items. No production write or deployment has
occurred in this remediation.

## Local changes and verified results

| Audit / MAP | Change | Evidence |
| --- | --- | --- |
| AUD3-004 / MAP-018/020 | Intake rejects boolean, array, object and blank numeric inputs before conversion; supported numeric strings and omitted optional cost remain valid. | intake-red.log reproduces true becoming 1; intake-green.log: 9 pass. |
| AUD3-001 / MAP-021 | Secret scanner uses complete reviewed placeholder values rather than substring exemptions. | scanner-red.log reproduces bypass; scanner-green.log passes all fixtures including 18 internal-fragment cases; scanner-tree.log and scanner-history.log pass. |
| AUD3-005 / MAP-023 | Drawer and lot editor use the Manila calendar day. | admin-facts-red.log reproduces midnight discrepancy; admin-facts-green.log: 17 pass. |
| AUD3-006 / MAP-023 | Clearance success reads the selected canonical lot instead of inventing approval time/quantity; failed read retains prior data and receipt key. | focused-green.log verifies read failure then same-key recovery, exact lot and unrelated row preservation. |
| AUD3-007 / MAP-024 | Separate deployment configurations invoke their respective gated target build scripts. | release-red.log then release-green.log; both isolated builds pass. No provider execution claimed. |
| AUD3-008 / MAP-025 | Dedicated CI PostgreSQL 17 job executes real stock/payment/final-Admin rehearsals; runners support native executable suffixes and K2_TEST_PG_BIN. | release contract passes; sql-results.json: all three runners exit 0. Stock 37/37 properties. Remote Ubuntu execution still requires CI receipt. |

Commands: `npx playwright test --config=playwright.api.config.js tests/admin-logic-regressions.spec.js tests/product-intake-contract.spec.js tests/release-ci-contract.spec.js`
passed **35** tests. `npm run test:admin-ui` passed **32**; `npm run test:base`
passed **770**. Counts overlap; do not add focused cases to base as unique coverage.

`npm run build:storefront`: JS 150.16/150.50 kB gzip, CSS 27.52/30 kB gzip,
31 manifest modules, boundary and secret gates passed. `npm run build:admin`:
189.65/300 kB minified, 40 manifest modules, head rewrite/boundary/secret gates
passed. acceptance-results.json retains exit codes. Browser tests use fixtures,
not authenticated production records.

SQL commands, sequential and loopback only: `node scripts/rehearse-purchase-time-reservation.mjs`,
`node scripts/rehearse-payment-recovery.mjs`, `node scripts/rehearse-final-admin-concurrency.mjs`.
Their matching logs retain real SQL assertions, including vulnerable-baseline
negative controls. Local PostgreSQL processes were stopped by their runners.

## Production and decision gates

Additional prepared recovery: `supabase/guest_order_conversation_seed_capture.sql`
and `scripts/guest-seed-recovery.mjs` capture/reconstruct exactly two reviewed
functions, bound to database/cluster identity, with owner/ACL equality and refusal
after later changes. `node scripts/rehearse-guest-seed-recovery.mjs` passes against
real migration definitions; guest-seed-recovery.log retains the result. Six guest
contracts passed before the final cluster guard; final regression results follow
in final-focused.log. The first launcher timed out after starting local PostgreSQL;
it was stopped, the inherited-output handling corrected, and the full rehearsal
rerun successfully. No production contact occurred in this rehearsal. Full signed
submission, unrelated functions and message history acceptance remain MAP-019.

Final focused rerun: **41/41 passed**. Final working-tree secret scan: **1236
files, pass**. `git diff --check` passes. Prior screenshots overwritten by Admin
tests are preserved under this remediation's screenshots folder and restored
from the original snapshot; preserved-screenshots.json records the paths.

Fresh read-only K2 metadata export and audit still show **26 critical policy
findings**, not 26 demonstrated exploits. schema-export.log/schema-audit.log and
map017-readiness.json retain fresh evidence. The seven functions and ownership/
staff-read/catalog prerequisites are present; exact follow-up receipt is absent.
Prepared version 20260909023000, project pixplcjqivlfflickobf, artifact SHA-256
7BA3F473C3313890F57899A657CD1234FEDAFEEB43DB7465819919EF1FB71E05 is unchanged.
Exact-payload owner authorization was requested; no answer is recorded yet.
The transaction is expected to resolve 16 findings; only postflight can prove it.

Unlisted choice remains with the owner under MAP-023 queue item 12. No status
policy or purchase allowlist has changed. Captured guest-seed recovery remains
MAP-019; the safe refusal guard remains in place until exact recovery is verified.
The original audit's UNCONFIRMED register remains an assurance boundary, not a
set of proven bugs to change blindly. No production migration, deployment,
provider activation or exhaustive launch acceptance is claimed.

## UI correction rationale

| Before | After | Why |
| --- | --- | --- |
| Prior UTC day in expiry labels | Manila business day | Staff day boundaries must agree. |
| Browser-generated clearance timestamp and calculated receipt | Canonical selected-lot refresh | Approval facts belong to the database. |
| Success projection before canonical read | Preserve prior projection and key if read fails | Lost read must not fabricate updated evidence. |

Existing K2 layout, tokens, typography and motion remain. Full actor/dismissal/
uncertain-write handling for this caller stays in I-002; the focused correction
does not claim that broader lifecycle complete.

## Traceability and recovery

Changed records: rulebook, System Brain, FUTURE_IDEAS decision register, owning MAP
sections, PROJECT_MAP, ARCHITECTURE, intake/security/Admin-BFF/deployment runbooks.
Recover local code by reversing only this remediation's hunks while preserving
the existing combined checkout changes and stash. No production rollback is
needed. Do not rerun MAP-017 phase one or replace the guest guard with broad SQL.

CI installation source checked against the official
[PostgreSQL Ubuntu installation instructions](https://www.postgresql.org/download/linux/ubuntu/).
The dedicated job installs 17 explicitly because the
[Ubuntu 24.04 runner inventory](https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md)
lists PostgreSQL 16; local Windows success is not Ubuntu execution evidence.
