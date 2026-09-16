# Independent MAP handoff verification — 13 September 2026

Owner request: verify the combined recent handoff, follow the active MAP and
check whether work is actually applied. Owning scope: IDEA-20260913-01, MAP-028 J,
with MAP-017/019/021/023/024 retaining their dependencies. This is an evidence
record; MASTER_ACTION_PLAN.md remains the only active backlog.

## Scope and provenance

Owner confirmed all other K2 coding sessions stopped. Verification preserved
dirty `main` at `41d96df012997cc98751ca405ab632f95ae8806f` and the existing
release-integration stash. No stash, reset, merge, commit, push, deployment,
production migration, business write, message, or owner policy change occurred.
Local browsers used one worker and isolated servers. Browser/PostgreSQL startup
and public network reads required execution outside the filesystem sandbox;
the initial sandbox `spawn EPERM` is not a product defect.

`verified-source-sha256.json` records the source/config/test/migration bytes
verified here, including uncommitted work. It does not include secret values
or business records and is not a deployment receipt.

Skills applied: using-superpowers, verification-before-completion,
systematic-debugging, receiving-code-review, test-driven-development,
andrej-karpathy, the mandatory four UI skills (ui-ux-pro-max, impeccable,
design-taste-frontend, emil-design-eng), K2 commerce operations, Supabase,
and Vercel verification. Existing product/brand and operational rules governed
the review; no visual redesign was introduced.
Existing operational requirements were preserved; the application corrections
bring behavior into alignment with them. The guest and security runbooks record
the recovery/scanner details affected by this verification.

## Corrections verified in this session

| Before | After | Why / evidence |
| --- | --- | --- |
| Overview passed `1` to a reporting helper supporting only 7/30/90, throwing before the command center mounted. | Uses all bounds from `manilaReportingWindow(reportingRange)`. | Direct helper execution reproduced the exception; isolated browser run failed before correction and passed 32/32 afterward. The prior attribution to environmental flakiness was incomplete. |
| CSV treated marketplace-like unknown sources as marketplaces, while the dashboard used exact aliases. | CSV and Overview share `normalizeSalesChannel`. | New CSV regression failed first. Exact aliases (`web`, `tiktok_shop`) are retained; `shopee-ph` and unknown suffixes remain Other. Focused reporting tests pass. |
| Prepared guest-seed rollback replayed the whole 20260812 security boundary while claiming to restore only two functions. | Script stops with `K2_GUEST_SEED_CAPTURED_RECOVERY_REQUIRED` before any write. | The include contains ten function replacements and table/function ACL statements. Local PostgreSQL returns expected psql exit 3. This is a safety refusal, not completed recovery. |
| Newly broadened history scanning flagged three historical documentation values. | Recognizes exactly `your_shopee_partner_key`, `MY_GEMINI_API_KEY`, and the specific Required-for prose line. | Failing-first regression plus negative variants; complete security gate/history now passes. No historical credential was removed or rotated. |
| Custody recovery fixture tried to submit without the newly required audit reason. | Test asserts the blank-reason block, supplies a reason, and verifies the exact reason survives retry. | Initial aggregate run: 32 recovery tests passed, custody timed out on the correctly disabled button. No production guard was weakened; see `custody-fixture-error.md`. |

Changed application files: `src/views/admin/Overview.jsx`,
`src/lib/salesCalculations.js`. Supporting changes:
`tests/overview-availability.spec.js`, `tests/admin-sales-calculation.spec.js`,
`supabase/guest_order_conversation_seed_rollback.sql`,
`tests/guest-conversation-seed-contract.spec.js`,
`scripts/secret-scan-core.mjs`, `scripts/test-secret-scan.mjs`,
`tests/payment-recovery-ui.spec.js`.
These were applied on top of pre-existing dirty work; a whole-file revert would
discard other sessions' changes.

## Fresh local evidence

| Command / scope | Result | Evidence |
| --- | --- | --- |
| Focused BFF, guest-seed, storefront truth, reporting and CI contracts | 105 passed before the corrections | `focused-contracts.log` |
| Reporting/CSV/Admin logic regression files with API config | 39 passed after correction | `dashboard-green.log`; failing-first `channel-red.log` |
| Final reporting/Admin logic/guest-seed contracts with separate output directory | 44 passed, including the added recovery guard | `final-contracts.log` |
| `npm run test:admin-ui -- --max-failures=1 --retries=0 --trace=retain-on-failure` with CI=1 | 32 passed, 3.2 min | `admin-after-fix.log`; prior failure `admin-isolated.log` |
| `npm test` with CI=1 | Base 764, orientation 2, Storefront 31 and Admin 32 passed; stopped at the outdated custody fixture (32 passed, 1 failed in recovery) | `full-test.log` |
| Sequential continuation from corrected recovery through remaining npm-test groups | Per-group exit receipts and full output retained; see final receipts for completion | `remaining-suites.log`, `remaining-suite-results.json` |
| `node scripts/rehearse-purchase-time-reservation.mjs` | 37/37 property groups passed in disposable PostgreSQL | `stock-lifecycle.log` |
| `node scripts/rehearse-map017-portable.mjs` | 12 authorization groups plus apply/replay/restore passed locally | `map017-local.log` |
| Guest recovery script against loopback rehearsal database | Expected refusal, exit 3 | `guest-recovery-refusal.log` |
| `npm run build:storefront` | Passed, JS 150.16/150.50 kB gzip; CSS 27.52/30 | `build-storefront.log` |
| `npm run build:admin` | Passed, application 188.96/300 kB; Admin head emitted | `build-admin.log` |
| `npm run security:gate` | Passed after exact placeholder correction | `security-gate-after-fix.log`; initial findings `security-gate.log`; failing-first `scanner-red.log` |
| `npm audit --audit-level=low` | 0 vulnerabilities | `dependency-audit.log` |
| `npm run verify:admin-bff` and `npm run verify:guest-bff` | Both passed; activation remains gated | `admin-bff-verifier.log`, `guest-bff-verifier.log` |

The existing Storefront budget calibration was preserved, not loosened in this
verification. Browser screenshots are fixture evidence, not authenticated live
staff acceptance. The stock rehearsal covers composed payment, confirmation,
handover, retry, rollback, exact release, lock ordering and old-body negative
controls; its minimal schema does not prove every current production RLS policy,
writer race or owned-stock read consumer. See the sibling stock-lifecycle record
for those limits. The prior chat's guest seed scratch apply/replay claim was not
independently reproduced as a full signed composed journey in this session;
source checks and recovery refusal do not substitute for that evidence.

Final sequence coverage: **915 passing cases across 12 npm-test groups**:
base 764, orientation 2, Storefront 31, Admin 32, payment/recovery 33, Inbox 27,
product-master 1, owner-close 1, account/wholesale 3, selling 8, workflow 4,
intake 9. All eight continuation commands exited 0. The initial aggregate
command exited 1 at the outdated custody fixture; this report does not call it
one uninterrupted passing `npm test`. The final targeted 44-case run additionally
covers the subsequently added guest rollback guard. No remaining test failure
was observed in the corrected continuation.

`evidence-preservation.json` records 14 previous PNGs restored byte-for-byte
after copying fresh captures into this folder's `screenshots/` subtree. The
baseline comparison shows only this session's intended source/test/docs changes;
no baseline file is missing. `git diff --check` passes. The initial baseline
hashes were captured after the new FUTURE_IDEAS/MAP verification entry, so those
initial documentation additions are also part of this session's change.

## Actually applied and deployed

Read-only K2 metadata export (`pixplcjqivlfflickobf`) at
**2026-09-13 03:27:29 UTC** shows six ledger entries, latest
`20260824143000 map017_public_write_boundary_hardening`. Neither newer guest
submission function nor `commit_order_request_stock_v1` exists in that export.
The current guest-seed/commitment work is therefore prepared, not permanently
applied. Sanitized provenance and metadata SHA-256 are in
`live-schema-summary.json`; the full metadata is retained only in ignored
`.tools/map-verification-20260913/live-schema-metadata.json`.

`schema-audit.log` still reports 26 critical policy findings across 42 public
tables, 9 public views and 54 public functions. These include overlapping ACL
and policy findings and trigger-function grants; this is not a claim of 26
independently exploitable vulnerabilities. The prepared MAP-017 follow-up
`20260909023000` is still required. Do not reapply phase one to address it.

Public GET evidence in `live-hosts.json` confirms distinct Storefront/Admin
target markers. Live Admin still has the Storefront title and canonical URL;
the new Admin head emitter is verified only locally. `live-discovery.json`
passes homepage/robots/sitemap checks (two URLs, intentionally no product URLs);
this does not verify product indexing, authenticated orders, payments or staff
operations.

Remote main and local HEAD remain `41d96df`. GitHub
[CI run 34247173491](https://github.com/k2jimzonwebsite/K2-Jimzon/actions/runs/34247173491)
succeeded on 8 September for that commit. It does not cover the dirty handoff.
The connected Supabase/Vercel connector inventories did not contain K2, so they
were not used as authority for another project's state. Public host checks and
the repository's K2-specific read-only metadata exporter provide the stated
evidence; current private Vercel project settings were not independently read.

## Remaining ownership and recovery

MAP-017 owns the follow-up apply prerequisites and fresh authorized role/restore
acceptance. MAP-019 owns exact captured seed recovery plus full signed seed,
replay, grants and composed-path verification before activation. MAP-023/I-001
still owns complete writer/read-consumer lifecycle and real-host acceptance.
MAP-024/I-014 owns publication/exact-commit host evidence. Unlisted policy remains
an existing commercial decision; no allowlist or sales restriction was invented.
OWNER-004 already records an approved phone number, but real-device link/account
acceptance remains required before publication. No whole MAP item was closed.

Starting file hashes are retained in ignored
`.tools/map-verification-20260913/baseline-hashes.json`; prior evidence bytes in
`evidence-before/`. Preserve all pre-existing dirty work and the original stash.
To undo this session's application correction, reverse only its window/import,
normalizer and corresponding test hunks. Restoring the old reporting call
reintroduces the crash; restoring the old broad guest rollback is unsafe.
For deployment or database recovery, follow the existing owning MAP/runbook
gates and captured target definitions rather than this local source checkpoint.
