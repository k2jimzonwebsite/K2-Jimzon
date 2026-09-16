# K2 Jimzon — audit evidence, 2026-09-13

This is an audit register, not an implementation plan or a release approval. Application code and MAP were not changed during this audit. The starting checkout already contained earlier sessions' combined work, including the preceding verification session's fixes. HEAD was `41d96df012997cc98751ca405ab632f95ae8806f`; these results concern the working tree, not that commit's deployed behavior.

The 12-group local acceptance run passed **916 tests**. The separate contracts invocation passed its 559 source tests but failed one subsequent hero browser test; all eight selling-surface tests passed in the later aggregate run. Both isolated builds, dependency audit, source security gates, and the local database rehearsals below passed. These results do not establish production readiness. Seven reproduced local findings and one existing recovery gate are recorded below. Further concerns are explicitly UNCONFIRMED.

## Authority and method

The owner requested audit-only work: no production writes, deployments, paid calls, activation, credential changes, or MAP edits. Local probes, browser tests, builds and loopback PostgreSQL rehearsals were permitted. No application fixes were made. The existing stash was preserved.

Applied skills: using-superpowers; systematic-debugging; verification-before-completion; K2 Pasabuy commerce operations; andrej-karpathy; ui-ux-pro-max, impeccable (audit), design-taste-frontend and emil-design-eng. Operational truth takes precedence over optional design suggestions. Authority was consulted in the requested order: operations rulebook, System Brain, MAP, PROJECT_MAP, ARCHITECTURE. PRODUCT and DESIGN were also consulted for visible surfaces. The evidence follows MAP-017 through MAP-028; backend evidence precedes UI conclusions. Read-only inventories and local checks are not substitutes for real-host permission or operational proof.

Commands below run from the repository root. `.log` files are retained output, not instructions. Failing assertion probes deliberately exit 1 when they reproduce a fault. Scanner fixtures contain fabricated values only. No actual credentials are included.

## Ranked findings register

### AUD3-001 — High — credential scanner exempts arbitrary values containing placeholder fragments

- **Owner:** MAP-021, with MAP-020 security-boundary relevance.
- **Source:** `scripts/secret-scan-core.mjs:74` placeholder fragments, `:85` the `example` fragment, and `:153` substring exemption.
- **Reproduce:** `node docs/evidence/20260913-full-audit/probes/scanner-bypass.mjs`.
- **Output:** [scanner-bypass.log](scanner-bypass.log): `expectedDetected:true, actualFindings:[]`; assertion fails. The probe feeds the real scanner a fabricated assigned BFF secret containing `example` inside an otherwise credential-shaped value.
- **Target vs actual:** approved exact documentation placeholders may be exempt; a credential is not a placeholder merely because it contains one of those words. The working-tree gate currently accepts this case. This proves a detection gap, not an actual leaked credential.
- **Smallest safe fix:** narrow placeholder recognition to explicit complete values or tightly defined template syntax; retain the existing exact historical exceptions without broadening them.
- **Acceptance:** scanner rejects fabricated non-placeholder assignments containing each exempt fragment internally, while approved templates remain accepted. Run scanner fixtures, working-tree/history scans and both artifact scans.

### AUD3-002 — High — Unlisted direct-link availability disagrees with the order writer

- **Owner:** MAP-023, existing queue item 12 / AUD2-005; cross-reference MAP-019. This is an existing unresolved decision, not a new independent backlog item.
- **Source:** `src/context/StoreContext.jsx:268` fetches published Live, Active and Unlisted products; `:388` hides Unlisted only from browse. `supabase/migrations/20260902_purchase_time_reservation.sql:241` refuses every product status except Live and Active.
- **Reproduce:** `node docs/evidence/20260913-full-audit/probes/source-boundaries.mjs`; [source-boundaries.log](source-boundaries.log) prints these exact predicates.
- **Target vs actual:** the documented direct-link meaning and frontend product availability disagree with the canonical writer's allowlist. Source disagreement is confirmed; a production Unlisted purchase was not attempted.
- **Smallest safe fix:** obtain the existing commercial decision, then align the direct-link UI and SQL with that one policy. Do not silently broaden sale authority during an audit.
- **Acceptance:** a representative published Unlisted direct link either completes an authorized local purchase under the approved policy or clearly refuses before collecting order details. Browse visibility, direct-link refresh, and both guest/account paths must agree.

### AUD3-003 — High activation gate — guest conversation seed lacks executable captured recovery

- **Owner:** MAP-019; existing unfinished recovery gate.
- **Source:** `supabase/guest_order_conversation_seed_rollback.sql:6` names the exact two definitions/owners/ACLs to capture; `:18` raises `K2_GUEST_SEED_CAPTURED_RECOVERY_REQUIRED`.
- **Reproduce:** `node docs/evidence/20260913-full-audit/probes/source-boundaries.mjs`; [source-boundaries.log](source-boundaries.log) prints the explicit refusal. This is source proof of a deliberately disabled recovery script; it was not executed against production.
- **Target vs actual:** activation requires a rehearsed recovery procedure. The former broad rollback has already been replaced with a safe refusal guard. The guard prevents damage but is not an executable recovery artifact.
- **Smallest safe fix:** preserve the guard until exact target definitions and ACLs are captured, then prepare and rehearse scoped restoration or an explicitly reviewed roll-forward procedure.
- **Acceptance:** loopback apply/replay/recovery using the composed guest submission chain restores the captured two functions and their permissions, preserves unrelated functions and seeded audit history, and supplies a target-specific receipt before activation.

### AUD3-004 — Medium — inventory intake accepts booleans and arrays as quantity/cost

- **Owner:** MAP-018; MAP-020 validation cross-reference.
- **Source:** `server/admin-bff/product-intake.js:58` and `:59` call `Number` before validating the original input type.
- **Reproduce:** `node docs/evidence/20260913-full-audit/probes/intake-coercion.mjs`.
- **Output:** [intake-coercion.log](intake-coercion.log): quantity `true` and `[1]` both become `1`; unitCost `false` becomes `0`, accepted by the real exported command validator.
- **Target vs actual:** inventory facts require deliberately supplied numeric values. JSON booleans and arrays are silently converted into valid facts. Numeric string policy is not classified as a defect here. This does not bypass authentication or prove an unauthorized write.
- **Smallest safe fix:** reject unsupported original JSON types before normalization, while preserving intentionally supported numeric formats.
- **Acceptance:** booleans, arrays and objects are rejected at the BFF before RPC invocation; valid finite quantity/cost inputs still pass and SQL invariants remain enforced.

### AUD3-005 — Medium — expiry drawer uses yesterday's date after Manila midnight

- **Owner:** MAP-023, with MAP-021 UI verification.
- **Source:** `src/views/admin/DailyTaskNotificationDrawer.jsx:6`–`:12`, especially UTC `toISOString().slice(0,10)` at `:9`. Rulebook `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md:38` defines Manila API/UI reporting days.
- **Reproduce:** `node docs/evidence/20260913-full-audit/probes/expiry-day.mjs`.
- **Output:** [expiry-day.log](expiry-day.log): at `2026-09-13T16:30:00Z`, Manila day is September 14; September 13 expiry returns `daysLeft:0,status:critical` instead of `daysLeft:-1,status:expired`.
- **Target vs actual:** staff should see the applicable business day; the extracted real function remains on the prior UTC day for eight hours. The probe proves classification, not a database sale-eligibility bypass.
- **Smallest safe fix:** use the canonical business-day helper and reconcile the intended DB expiry-day policy before changing eligibility logic.
- **Acceptance:** fixed-clock cases on both sides of Manila midnight, in multiple browser time zones, produce consistent drawer classifications and agreed SQL expiry behavior.

### AUD3-006 — Medium — clearance success invents a local approval timestamp

- **Owner:** MAP-023; logic-placement/projection truth.
- **Source:** `src/views/admin/BatchExpiryManagerModal.jsx:145`–`:173`, especially `:169`. Canonical receipt shape: `supabase/migrations/20260812_admin_lots_bff_boundary.sql:325`–`:327`; BFF forwards it at `server/admin-bff/lots.js:131`.
- **Reproduce:** `node docs/evidence/20260913-full-audit/probes/clearance-projection.mjs`.
- **Output:** [clearance-projection.log](clearance-projection.log): a receipt matching the actual SQL shape contains no approval timestamp; the real success handler writes the browser's current ISO timestamp into `clearance_approved_at`. Assertion fails.
- **Target vs actual:** approval evidence should come from the canonical write/read. The UI manufactures this field, including after receipt replay. The probe uses the actual camelCase receipt fields and a consistent available quantity. An earlier exploratory fixture with a different shape is superseded by this retained probe; no claim is made that the server produces impossible clearance states.
- **Smallest safe fix:** return or refetch authoritative batch fields, then project those fields. Avoid using the browser clock as an approval fact.
- **Acceptance:** delayed/replayed success preserves the original server approval time and canonical quantities; failed or uncertain responses retain safe retry identity. No browser-generated approval time is substituted.

### AUD3-007 — Medium — deployment configs select a build without the target-specific gates

- **Owner:** MAP-024; MAP-021 cross-reference. Existing deployment-command gate, still unresolved.
- **Source:** `vercel.admin.json:2`, `vercel.storefront.json:2`; generic `package.json:10` versus target scripts `:11` and `:12`. `vercel.ts` selects separate configs; absence of a root vercel.json is not a defect.
- **Reproduce:** `node docs/evidence/20260913-full-audit/probes/deployment-build.mjs`.
- **Output:** [deployment-build.log](deployment-build.log): both configured commands invoke generic `npm run build`; `genericEnforcesBudget:false`, `genericEmitsAdminHead:false`.
- **Target vs actual:** the isolated local scripts enforce budgets and rewrite Admin discovery tags, but the checked-in deployment command does not invoke these steps. Provider overrides and actual deployment execution were not inspected in this audit. Generic build still has boundary and secret checks; those are not alleged missing.
- **Smallest safe fix:** align each selected configuration with its verified artifact-specific command after the existing preview gate is satisfied.
- **Acceptance:** separate previews from the exact reviewed commit record target-specific commands, budget failures stop deployment, Admin head metadata is correct, and host identity/boundary/route tests pass independently.

### AUD3-008 — Medium — CI does not execute the critical stock/payment rehearsal bodies

- **Owner:** MAP-025; MAP-023 transition proof and MAP-021 CI cross-references.
- **Source:** `.github/workflows/ci.yml:77` aggregate npm test, `:85` MAP-017 rehearsal, `:91` catalog rehearsal. `tests/confirmation-commitment-contract.spec.js:2` imports source reads and `:6` names the runner; these are source assertions, not PostgreSQL execution.
- **Reproduce:** `node docs/evidence/20260913-full-audit/probes/source-boundaries.mjs`; [source-boundaries.log](source-boundaries.log) lists every CI run command. Compare the independently executed stock/payment/final-Admin logs below.
- **Target vs actual:** CI should catch behavioral regressions in high-risk state transitions. It runs the aggregate source/UI suite and two SQL rehearsal families, but not purchase-time reservation, payment recovery, or final-Admin concurrency. This is distinct from the previously refuted claim that npm test omits contract specs.
- **Smallest safe fix:** wire the real transition rehearsals into a compatible isolated CI database job; preserve negative controls and keep provider credentials unnecessary.
- **Acceptance:** CI executes real current SQL bodies, records concurrency/replay/atomicity results, and fails with the retained old-body negative controls. A green source-string contract alone cannot satisfy this check.

## UNCONFIRMED / proof still needed

These are not additional confirmed runtime defects. They also bound the audit's assurance: neither an inventory nor a passing fixture suite proves every production state or every row action.

| ID / owner | Concern and existing evidence | Required proof |
| --- | --- | --- |
| U-001 / MAP-017 — launch-blocking applied-state gate | Re-auditing the earlier metadata capture yields 26 critical policy findings. [map017-schema-existing-export.log](map017-schema-existing-export.log) explicitly audits supplied metadata, not a new connection. Capture was 2026-09-13T03:27:29.777985, K2 project pixplcjqivlfflickobf; six ledger entries, latest 20260824143000. This is not 26 demonstrated exploits. | Fresh target-specific metadata and authorized application/postflight receipts. Verify exact roles, RLS, grants/default privileges, browser denial and catalog availability. Do not rerun phase one or treat local rehearsals as production application. |
| U-002 / MAP-023 I-001 | No `committed_at` or `stock_committed` references were found under src/server/prepared-api, while the new SQL records ownership commitment without moving physical custody. This raises a reader/projection coverage concern; absence of these names alone does not prove a wrong displayed total. | Representative confirmed/paid-before-handover data traced through every owned-stock report, recount and UI reader; compare owned, physical, reserved and sellable quantities against the canonical ledger. |
| U-003 / MAP-027 | The initial contracts invocation timed out waiting for the hero heading; all eight selling tests later passed. [hero-initial-error.md](hero-initial-error.md) and [test-contracts.log](test-contracts.log) preserve the failure. | Repeat cold-start runs with retained trace, browser console and network evidence to distinguish readiness/load problems from application failure. Do not label the original failure fixed or weaken its assertion. |
| U-004 / MAP-017/023 | Lexical inventory covers 102 migration files and 194 function definitions. It is not exact overload/dynamic-patch or a fresh-install proof. Duplicate date prefixes are recorded in migration-versions.json. Custom application may make this intentional. | Supported fresh-install orchestration from an empty database, exact signature/ACL inventory after composition, migration ledger mapping and captured recovery for each applied change. No unsupported `supabase db push` conclusion is made. |
| U-005 / MAP-023/025 | The concurrency rehearsals pass, but there is no exhaustive interleaving proof for every purchase/confirm/cancel/sweep/recount/clearance/packing/payment/handover writer combination. | Full current-chain pairwise concurrency fixtures with timeout/deadlock evidence and representative multi-SKU/lot data. Production query plans and index/selectivity evidence are also needed before alleging N+1 or missing-index performance faults. |
| U-006 / MAP-021/025/027 | Responsive, motion, theme, keyboard shopping and selected phone Admin flows pass. No complete manual contrast, screen-reader, 200–400% zoom, physical-device or every-target-size matrix was performed in this audit. | Exact-route/state checks on the agreed device/accessibility matrix; measured contrast and target geometry, focus recovery and reduced-motion evidence. No global design score is assigned without that evidence. |
| U-007 / MAP-019/023/025 | Every Admin action source occurrence is inventoried in admin-action-inventory.txt, but the automated suites do not independently exercise every table action against a real authenticated database. | Per-action record identity, role/AAL2, reason, audit event, stale response, lost receipt and retry tests against representative local data, then authorized exact-host journeys. Source inventory is not row-action acceptance. |
| U-008 / MAP-024/025/028 | Local builds are distinct and pass. Applied BFF state, provider callbacks, real phones, mail/alerts, CSP telemetry, rollback/promotion, and exact current-commit deployment remain outside this local-only audit. Prior host evidence belongs to the preceding report and older deployed code. | Owner-authorized exact-target preview/provider evidence and operational receipts. Preserve phone publication and channel activation gates. |
| U-009 / MAP-018/027 | PRODUCT's review/ratings claims and SKU fallback content require provenance reconciliation; this audit has not established that any specific claim is false. | Approved source records for each displayed product fact, image, testimonial and aggregate rating, including missing/rejected knowledge fixtures. |

## Execution receipts

### Contracts and browser acceptance

The 12 groups were executed sequentially with CI=1 and no concurrent browser suite. [browser-suite-results.json](browser-suite-results.json) records exit 0 for every group. Counts overlap with the separate contract invocation and must not be added twice.

| Command | Result / log |
| --- | --- |
| npm run test:contracts | 559 source tests pass; subsequent selling run 7 pass / 1 failure. [log](test-contracts.log) |
| npm run test:base | 765 pass. [log](test-base.log) |
| npm run test:store-orientation | 2 pass, desktop/portrait/landscape. [log](test-store-orientation.log) |
| npm run test:storefront-ui | 31 pass. [log](test-storefront-ui.log) |
| npm run test:admin-ui | 32 pass. [log](test-admin-ui.log) |
| npm run test:payment-ui | 33 pass. [log](test-payment-ui.log) |
| npm run test:inbox-ui | 27 pass. [log](test-inbox-ui.log) |
| npm run test:admin-product-master-ui | 1 pass, 375px edit/lifecycle/delete. [log](test-admin-product-master-ui.log) |
| npm run test:owner-count-close-ui | 1 pass. [log](test-owner-count-close-ui.log) |
| npm run test:customer-account-ui | 3 pass; test:storefront-identity-ui is the same runner alias, not rerun. [log](test-customer-account-ui.log) |
| npm run test:selling-surfaces | Later run: all 8 pass. [log](test-selling-surfaces.log) |
| npm run test:workflow-api | 4 pass. [log](test-workflow-api.log) |
| npm run test:intake-ai-ui | 9 pass. [log](test-intake-ai-ui.log) |

### Separate builds and security

`npm run prebuild`, `npm run security:surfaces`, `npm run security:gate`, `npm run security:dependency-audit`, `npm run build:storefront`, `npm run build:admin` all exited 0; [map021-receipts.json](map021-receipts.json) retains command receipts and individual matching logs retain output. npm audit reported zero vulnerabilities. Dependency policy checked 18 direct / 278 locked packages and three reviewed install scripts. Semver ranges plus a lockfile and npm ci are not classified as unpinned installation.

Storefront: 150.16 / 150.50 kB landing JS gzip and 27.52 / 30.00 kB CSS gzip; 31 manifest modules. Admin: 188.96 / 300.00 kB minified application budget; 40 manifest modules. Units differ intentionally. Both emitted separate target markers and passed boundary/secret scans. Storefront's zero product sitemap entries are intentional under the existing prelaunch noindex gate, not a newly discovered sitemap defect. Source security inventory reports zero route classification gaps, unexpected PUBLIC grants and unexpected anonymous grants; it explicitly does not establish applied permissions. AUD3-001 limits scanner assurance.

### Local PostgreSQL rehearsals, MAP order

All commands use `node scripts/<name>.mjs`. These execute local PostgreSQL 17.11 only. No production application occurred. Each named runner has a matching log in this directory unless an alternate filename is stated. Nested MAP-017 runners are covered by the portable parent rather than counted as independent repeats.

| MAP | Runner and result |
| --- | --- |
| 017 | rehearse-map017-portable: pass; 12 authorization groups, seven exact function ACLs/real trigger behavior, rollback/replay/refusal, encrypted backup, 14-row archive equality and restore. `map017-portable.log`. Includes local migration and function-lockdown rehearsals. |
| 018 | rehearse-map018-cleanup-portable, rehearse-intake-ai-portable, rehearse-publication-transitions: pass. |
| 018 | rehearse-catalog-spreadsheet: initial exit 2 missing local URL; configured rerun passes, `catalog-configured.log`. |
| 019 | rehearse-map019-staff-invitation-reason, rehearse-map019-mfa-replacement, rehearse-map019-account-claim: pass. |
| 020 | rehearse-map020-admin-preauth-rate, rehearse-map020-storefront-auth-rate, rehearse-map020-shopee-ingress: pass. |
| 022 | rehearse-database-backup-restore: initial exit 2 missing URLs; configured rerun passes, `backup-configured.log`, encrypted dump 63603 bytes and matching restore fingerprint. |
| 023 | rehearse-purchase-time-reservation: 37/37 properties, real composed lifecycle bodies, old-body negative controls and captured rollback. rehearse-map023-last-unit-concurrency, rehearse-payment-recovery, rehearse-final-admin-concurrency: pass. Final-Admin test reproduces vulnerable baseline and rejects it after serialization. |
| 026 | rehearse-marketplace-snapshot-portable, rehearse-channel-vocabulary-portable: pass. |
| 027 | rehearse-product-knowledge-portable: pass, nine persistence boundaries. |

Configured reruns used explicit loopback databases on 127.0.0.1:55432: `k2_catalog_rehearsal_full_audit_20260913` and `k2_restore_rehearsal_full_audit_20260913`, with the repository's `.tools/postgresql-17.11/bin` utilities. Set `K2_CATALOG_REHEARSAL_URL` to `postgresql://postgres@127.0.0.1:55432/k2_catalog_rehearsal_full_audit_20260913` for catalog; set `K2_BACKUP_REHEARSAL_SOURCE_URL` to that same local source and `K2_BACKUP_REHEARSAL_TARGET_URL` to `postgresql://postgres@127.0.0.1:55432/k2_restore_rehearsal_full_audit_20260913` for backup. PSQL_BIN/PG_DUMP_BIN/PG_RESTORE_BIN point to the corresponding bundled executable paths. [configured-db-results.json](configured-db-results.json) records both final exit codes 0. The local server was stopped after these runs. The provider-connected live-public-boundary rehearsal was intentionally not run under this local-only task.

## Coverage and limits

| Requested domain | Evidence obtained | Assurance boundary |
| --- | --- | --- |
| Database | Source inventory, supplied schema audit, real-role MAP-017 checks, composed stock/payment/auth/backup rehearsals | Not exhaustive production schema/query-plan or all-writer schedule proof; U-001/004/005 |
| Server | Contract/base suite, source security inventory, signed boundary/replay/rate/upload/AI tests, real intake validator probe | Fixtures and local SQL, not current deployed handler/provider proof |
| Storefront | Orientation, buyer/mobile/motion/theme/route/selling/account/wholesale suites | No real customer submission or full assistive/device matrix; U-003/006/009 |
| Admin BOS | Dashboard, payments, inbox, Product Master, Owner Count & Close, workflow and intake suites; all action occurrences inventoried | U-007 explicitly retains every-action integration proof |
| Logic placement | Unlisted predicate comparison; real expiry and clearance handler probes; commitment-reader search | Findings limited to proved disagreements; ownership totals remain U-002 |
| Tests/rehearsals | All listed local portable families plus aggregate acceptance; CI invocation comparison | Passing source assertions distinguished from actual SQL execution |
| Docs/code | Governing records, runbook gates, counts and deployment/indexing/recovery claims cross-checked in examined areas | Not a line-by-line proof of every statement in the large rulebook/Brain/MAP; provenance remains U-009 |
| Dependencies/builds | Fresh npm audit, dependency policy, prebuild/security gates, both separate budgets/boundaries | No current-commit remote CI/provider/runtime proof |

## What is supported as solid

- Local stock lifecycle atomicity/replay/negative-control behavior is supported by 37/37 real SQL properties and independent last-unit concurrency. The earlier atomicity accusation is not re-raised.
- The corrected working-tree Admin command center and representative payment/inbox retry workflows pass their current acceptance suites. These are local fixture results.
- Current separate build artifacts pass their respective budgets and boundaries; no browser credential leak was demonstrated. Scanner assurance is qualified by AUD3-001.
- Local auth/rate-limit/final-Admin protection and backup restoration have behavioral evidence, not only regex assertions.
- Existing safe refusal gates remain visible. Historical missing-search_path candidates are not treated as live faults merely because older CREATE FUNCTION text lacks later ALTER hardening.

## Preservation and handoff

[baseline-verification.json](baseline-verification.json) checks 1,121 starting files: no unexpected baseline changes. Fourteen previously existing PNGs rewritten by browser tests were copied under this audit's `screenshots/` tree and restored byte-for-byte from the starting snapshot. New audit evidence/probes and ignored local tooling are the only intentional audit additions. Existing dirty changes and stash were not reset, committed or rearranged.

Owning MAP items and objective next checks are attached to each finding above. Application/provider rollback is unnecessary because this audit made no such changes. Disposable local rehearsal databases can be retained as evidence; their presence is not production state. MAP edits are proposed only in the chat reply, as requested. No MAP item is closed and no completion or launch claim is made.
