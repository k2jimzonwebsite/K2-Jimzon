# Master Action Plan truth audit — 9 September 2026

Owner request / decision: IDEA-20260909-02. Active ownership: MAP-028 J;
mobile repair: I-015 / MAP-027; runner isolation: I-014 / MAP-021.

This is a bounded audit of the combined dirty workspace, current queue instructions,
dated evidence, source contracts, local browsers and build artifacts. It is not
an exhaustive certification of every historical sentence, a new production schema
capture, or authenticated production acceptance. Existing intake, catalog retry,
security follow-up, documentation and screenshots were already uncommitted.
No deployment, migration, paid call, customer message or business mutation ran.

## Corrections and retained evidence

- Removed eight completed queue entries (1–5, 8–10) and completed migration,
  product-view, deferred-globe and static-manifest bullets. Their original evidence
  remains in Git history and the current behavior is summarized in System Brain.
  All 12 unfinished top-level MAP items remain. No completed implementation is
  being counted as a new task or as complete operational acceptance.
- Removed the obsolete phase-one apply command and zero-product blast-radius
  rationale. Updated MAP-017's status from the old 55 findings to the recorded
  26 critical findings, preserving the dated-export/provider evidence boundary.
  Phase one `20260824143000` is applied; `20260909023000` is a different prepared
  follow-up. No fresh provider grant or receipt read was performed in this audit.
- Corrected the widget release instruction, duplicate Admin heading, stale
  browser-access blocker, route inventory, missing MAP-028 dashboard row and owner
  decision summaries. OWNER-002/004 and original recovery access are answered;
  follow-up production authorization is separate.
- Preserved the deliberate product-noindex switch. Product sitemap omission is
  intended while that switch is on; a failed product-canonical verifier still
  means initial-response product metadata was not established. Neither finding
  authorizes turning indexing on. Build projection freshness/content readiness
  remains MAP-024, distinct from the passing home/robots/sitemap check.
- Retained undeclared-arrival limitations in MAP-023: declared positive expected
  quantity, Packing_Italy line creation and the Milan scan ceiling remain. Do not
  invent nominal manifests or infer undeclared receiving from Manila-derived counts.
- Fixed `playwright.config.js` so catalog-import recovery runs only in its
  dedicated protected fixture. The new contract imports both real configs and
  checks that each recovery spec is excluded from the shared runner while the
  dedicated runner remains in `npm test`. It failed for catalog import before
  the one-line exclusion and passed afterward; browser assertions were unchanged.

## Fresh verification

| Check | Result / scope |
| --- | --- |
| `npm run test:contracts` contract stage | 533 passed in 26.3s. Its subsequent eight selling browser tests could not launch Chromium inside the sandbox (`spawn EPERM`); the combined invocation is not a pass. The stalled run was interrupted before an approved browser rerun. |
| `npx playwright test --config=playwright.api.config.js tests/release-ci-contract.spec.js -g 'protected recovery journeys'` | Red: missing catalog-import exclusion. After correction the complete release CI spec passed 7/7. |
| API config: prelaunch-indexing, map017-authorization and release-ci-contract specs | 23/23 passed. Source/fixture contracts, not live SQL-role execution. |
| `npm run test:storefront-ui` | 31/31 passed, approved local Chromium run, 4.2m. Includes deep links, buyer basket, phone/fallback, 200% text, motion and theme cases. |
| `npm run test:admin-ui` | 32/32 passed, approved local Chromium run, 3.8m. Includes dashboard states and staff sign-in boundaries with fixtures. |
| `npm run test:selling-surfaces` | Approved rerun passed 8/8 in 2.3m: hero, product stock/cart, guest-message receipts, confirmation recovery and unknown routes. |
| Payment config: `tests/catalog-import-recovery-ui.spec.js` | 3/3 passed, approved local Chromium run, 2.1m: uncertain exact retry, disposed actor and definitive rejection. |
| `npm run build:storefront` | Passed prebuild, target/static recovery, bundle budget and 68-file secret scan. Landing JS 149.85/150 kB gzip; CSS 27.48/30 kB. 0 product pages emitted with deliberate noindex enabled. |
| `npm run build:admin` | Passed prebuild, separate artifact and 75-file secret scan. Entry 188.92/300 kB minified. Runs after Storefront because both write `dist`. |
| `node scripts/map024-evidence/verify-live-discovery.mjs` | Public GET-only approved run returned `MAP024_DISCOVERY_VERIFIED`: home, robots, canonical two-URL sitemap. Initial sandbox network attempt failed. No product or authenticated route accepted by this result. |
| `node scripts/audit-readiness-logic.mjs` | No automatic reloads; Latest still returns `[old,new]`, expected `[new,old]`. Existing I-005 remains open. Script exit 0 is diagnostic output, not a passing Latest assertion. |

Counts overlap; do not add them into one unique-test total. Full `npm test`,
remote CI, fresh PostgreSQL rehearsals and authenticated production journeys were
not run by this audit. Earlier dated evidence stays historical. The Storefront
landing budget has only 0.15 kB headroom; later code changes need a fresh build.

## Disposition of the active MAP items

| Item | Verified/recorded preparation | Why it remains active |
| --- | --- | --- |
| MAP-017 | Recorded phase-one receipt and 26-finding follow-up evidence; fresh source authorization contracts | Separate follow-up apply/postflight, coordinated guest cutover and provider defaults |
| MAP-018 | Intake/BFF contracts present in passing contract stage; existing dirty retry work preserved | Database/provider activation, complete reviewed intake and real-host acceptance |
| MAP-019 | Scoped guest/auth contracts and browser fixture boundaries | Inactive guest/account paths, ownership/messaging activation and real receipts |
| MAP-020 | Build security gates and prepared route/abuse contracts pass | Applied denial/allowance, upload/connector and provider acceptance |
| MAP-021 | Separate builds, browser suites and corrected runner selection pass | Exact-host browser/security/performance and remaining recovery coverage |
| MAP-022 | Existing backup/logging preparation retained | Real alerts, incident/provider configuration and operational recovery acceptance |
| MAP-023 | Operational contracts and Admin fixture checks pass; count-on-arrival limits retained | Whole inventory lifecycle, evidence-rich payments, unexpected receiving, policy and representative operations |
| MAP-024 | Recorded separate host release; fresh public home discovery and both builds | Product content/indexing readiness, Auth/BFF host acceptance, Google measurement and rollback evidence |
| MAP-025 | Local selected gates pass | Complete exact-commit CI, real staff/customer/device/owner acceptance |
| MAP-026 | Exact-shop staging/contracts retained | Provider adapters, authoritative stock/oversell policy and reconciled external receipts |
| MAP-027 | Store browser fixture/render evidence and lazy-load checks | New compact phone navigation/zoom report, approved knowledge/media, real-device and live messaging acceptance |
| MAP-028 | Truth corrections and cross-surface audit evidence | I/J defects and all delegated activation/recovery/acceptance remainders |

## Mobile review

Reviewed source: InteractiveShop, `.k2-store-steps` / `.k2-store-step` / zoom
styles, AisleCamera and the orientation test. Reviewed image:
`docs/evidence/20260908-store-orientation/3d-portrait-after.png` (historical fixture,
390×844, not a fresh phone capture). It shows two broad category controls across
the scene and a three-button vertical zoom strip. This supports the space concern;
it does not establish the cause of difficult physical-device pinch zoom.

| Before | Required after (not implemented here) | Why |
| --- | --- | --- |
| Full category labels in opposing pills across the room | Compact navigation preserving readable category context, disabled endpoints and 44px targets | Restore useful room area without reducing touch accessibility |
| Tests click +/− with no camera assertion | Assert actual camera changes, reset, repeated input, pinch and shelf transitions | A clickable control is insufficient zoom evidence |
| Orientation screenshots treated as broad mobile proof | Empty/full basket, keeper/chat, keyboard, 200% text and actual iOS/Android gesture acceptance | Layout, scene zoom and browser zoom are different behaviors |

Scope-limited design rubric: accessibility 2/4 (gesture/assistive-tech evidence
incomplete), performance 3/4 (lazy-load/budgets pass), responsive 2/4 (owner issue
and overlay occupancy), theming 3/4 (theme suite passes; scene tokens include fixed
colors), anti-patterns 3/4 (established wood/room identity, oversized controls).
13/20 is a diagnostic review score, not WCAG certification or readiness percentage.
Keep K2's existing identity; no replacement fonts, colors, assets or motion needed.
I-015 contains implementation and acceptance; this evidence file is not a backlog.

## Recovery and handoff

### Resumed review and verification, 9 September

After the usage interruption, the contract stage from `test:contracts` was run
directly through `node node_modules/@playwright/test/cli.js`, using the unchanged
package-script argument list before `&& npm run test:selling-surfaces`:
**534/534 passed in 17.2s**. The extra test versus the earlier 533-test baseline
is the runner-isolation regression added during this audit. The focused release,
route-inventory and MAP-017 authorization run passed **22/22**; the correctly
named `tests/prelaunch-indexing-contract.spec.js` passed **5/5**. These runs
overlap. Browser/build results above were checked against the retained logs;
they were not rerun during this documentation-only continuation.

Independent review found no runner regression or lost undeclared-receiving scope.
It identified stale phase-one and B8 publication instructions still present below
the audit's new summary. Those were corrected at their owning subsections.
The old dashboard promotion instruction, System Brain pre-apply next action and
B9 present-tense failure heading were also superseded locally. Project Map now
specifies that three journeys refers to catalog-import recovery, not the entire
payment runner. This closes the bounded audit/review work; it does not close
the whole MAP-028 J or certify every historical sentence or production workflow.

Remaining ownership: MAP-017 exact-payload follow-up authorization/revalidation;
MAP-028 I-001/I-002/I-004 recovery work in dependency order; I-015/MAP-027 compact
mobile navigation, camera assertions and physical-device zoom acceptance;
I-014 exact-commit CI and J's remaining operational findings. No application
logic or production/provider state changed in this resumed review.

Revert only this audit's documentation hunks and the one base-runner exclusion
plus its new CI contract if required; do not reset the dirty files wholesale.
Removing the exclusion reintroduces duplicate execution under the wrong fixture.
No database or provider rollback is needed. Completed queue evidence remains
recoverable in Git history. Follow MAP-017's separate activation contract and
MAP-028 I-001–004/I-010 recovery priority; mobile reproduction/repair stays I-015.
