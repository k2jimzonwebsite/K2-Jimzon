# Autonomous MAP remediation — 14 September 2026

IDEA-20260914-02; existing MAP-019/020/023/027/028 owners. This receipt is not a
backlog. Root MASTER_ACTION_PLAN.md owns unfinished work. Baseline includes
pre-existing dirty changes and the preceding master audit; preserve them.

## Local backend correction

`server/storefront-bff/security.js` now isolates cookie decoding failures.
Malformed values grant no guest access; an unrelated malformed cookie does not
break a valid grant. `server/admin-bff/customers.js` requests exact counts for
related history and withholds all customer metrics if any history is incomplete
or its count is absent. Existing unavailable UI handles this result.

Failing-first evidence: `tests/master-audit-recovery.spec.js` initially had two
expected failures (URIError and capped history marked available) and one passing
complete-history control. After correction and updating the existing canonical
customer fixture to return exact counts, the following command passed 82/82:

`npx playwright test --config=playwright.api.config.js tests/master-audit-recovery.spec.js tests/guest-commerce-bff-contract.spec.js tests/admin-bff-contract.spec.js`

This is local BFF behavior with synthetic database responses. It does not
establish production activation or complete customer-register pagination.

## Browser verification environment

The dedicated Storefront recovery config uses synthetic loopback REST and order
responses, blocks external traffic and supplies a synthetic bot widget. Port
5199 was occupied, so this isolated runner uses 5207. Initial sandbox Chromium
launch failed with EPERM; approved escalation allowed launch. Cold Vite module
loading required the existing repository's 120-second suite budget and a bounded
90-second product-ready assertion. Failures before readiness are environmental
setup observations, not evidence of application regressions.

## Recovery and limits

Selectively reverse only IDEA-20260914-02's source/tests/documentation edits.
No production migration, provider activation, payment, real inventory change or
deployment has run. Exact-host acceptance and the previously rejected live
metadata query remain gated in the MAP. This file records only executed evidence;
no full-MAP completion is claimed.

## Independent verification — 14 September 2026 (same dirty tree)

Revision `41d96df` plus the uncommitted IDEA-20260914-02 work. State taxonomy:
everything below is **locally prepared work with passing local evidence**.
Applied production state is unchanged (phase one `20260824143000` and follow-up
`20260909023000`, both applied 13 September — never re-applied here). BFF
flags stay disabled, nothing was deployed, no provider was called, and no
credential/channel/DNS/Auth change was made. Real-host behavior is unverified.

| Command | Result |
| --- | --- |
| `npx playwright test --config=playwright.api.config.js tests/master-audit-recovery.spec.js tests/guest-commerce-bff-contract.spec.js tests/admin-bff-contract.spec.js` | PASS — 82/82 (cookie isolation, exact-count customer metrics, guest/Admin contracts) |
| `npx playwright test --config=playwright.storefront-recovery.config.js` | PASS — 6/6 (uncertain-checkout freeze + same-payload/fresh-challenge retry; pasabuy/messages challenge renewal; honest product facts/availability; phone ordering/targets; gallery-shrink recovery). Screenshots: `product-390.png`, `product-1440.png` |
| `npm run prebuild` (incl. `security:surfaces`) | PASS — 92 Admin / 15 Storefront prepared routes, 0 gaps, 0 unexpected PUBLIC/anon grants, 0 wildcard CORS; secret/env/file/source/dependency scans clean |
| `npm run test:contracts` (+ selling) | PASS — 565 api-contract checks + 8 selling checks |
| `npm run test:base` | PASS — 774/774 |
| `npm run test:storefront-ui` | PASS — 31/31 |
| `npm run test:customer-account-ui` | PASS — 3/3 (incl. wholesale-inquiry-ui) |
| `npm run test:admin-ui` | PASS — 32/32 |
| `npm run test:payment-ui` | PASS — 33/33, incl. the custody variant (see contradiction note below) |
| `npm run build:storefront` | PASS — landing JS 150.33/150.50 kB gzip, CSS 27.56/30 kB; sitemap 2 routes + 0 product URLs (pre-launch gate ON) |
| `npm run build:admin` | PASS — app chunk 189.73/300 kB minified; 40 manifest modules |
| `npm audit --audit-level=low` | PASS — `found 0 vulnerabilities` |
| `rehearse-purchase-time-reservation.mjs` (`K2_TEST_PG_BIN` → `.tools/postgresql-17.11/runtime/pgsql/bin`) | PASS — 37/37 properties |
| `rehearse-payment-recovery.mjs` | PASS (local fixture only) |
| `rehearse-guest-seed-recovery.mjs` | PASS (definitions/ACL restoration + drift refusal; submission behavior not covered) |

**Open contradiction — F-023-001 custody evidence disagrees (recorded, not
resolved):** the full-audit register reports `npm run test:payment-ui` as
32 pass + 1 FAIL on the custody variant (`payment-recovery-ui.spec.js:57-99`,
post-Confirm field-freeze at `:81`), while the earlier `remaining-tests.log`
in this folder and the fresh run above both record 33/33 PASS including that
variant. The audit's isolated rerun separately failed with a harness goto
timeout (U-007), which points at environment flakiness rather than a stable
product regression. The structural observation behind F-023-001 is
unaffected by either run: the custody caller still issues direct `rpc` calls
with no retained key (`src/views/admin/OmniOperationsHub.jsx:313,360,389,408`)
beside the retained handover/delivery paths, so the passing browser test does
not prove the bypass is covered. MAP-023 owns the fix (route custody through
`useRetainedFulfillmentCommand`) plus a regression that pins the bypass
directly; do not close F-023-001 on test counts alone.

## F-019-002 remediation — single shared strict-numeric validator (14 September, local)

Failing-first: new `tests/admin-bff-numeric-coercion.spec.js` (8 tests) failed
7/7 before the fix, each proving a poison value was accepted
(`minSpend: true → 1`, `itemCostForeign: true → 1`, lot `quantity: true → 1`,
`leadTimeDays: true → 1`, intake `quantity: '0x10' → 16`, `unitCost: null → 0`,
`stars: true → 1`, `displayOrder: '' → 0`, order-fact `quantity: true → 1`).

Fix: new dependency-free `server/shared-numeric.js` (`strictNumeric` /
`strictInteger`: genuine numbers + canonical numeric strings only; booleans,
null/undefined, arrays, objects, blank and non-canonical text rejected with a
caller-owned error code). Wired into `server/admin-bff/coupons.js`,
`pasabuy.js`, `lots.js`, `procurement.js`, `product-intake.js` (undefined
unitCost still defaults to 0; null is now rejected), `globe-cms.js`,
`marketplace-snapshots.js` (order-fact quantity, coverage priority, fee/stock
integers, handoff version — each keeps its module error code), and
`server/storefront-bff/security.js` (`numeric()`/`quantity()` now delegate, so
both BFFs enforce literally one rule). Registered the spec in
`test:contracts`. No migration, activation, deployment, or UI change.

Verification (same dirty tree): new spec 8/8; focused BFF/intake/marketplace
suite 118/118; `test:contracts` 573 + selling 8; `test:base` 782/782;
`test:admin-ui` 32/32; `test:intake-ai-ui` 10/10; `test:payment-ui` 33/33;
`prebuild` (surfaces 92/15, 0 gaps) and both isolated builds pass with
unchanged budgets. `npm audit` and portable rehearsals unaffected (no
dependency or SQL change); skipped with that reason recorded.

Audit-citation corrections found while scoping (recorded, code unchanged):
`prepared-api/admin/overview.js:45` coerces the range but enforces an
`ALLOWED_RANGES` whitelist after it, so poison values default or reject safely
— no hole. `server/admin-bff/security-events.js` contains no numeric coercion
at all, and `server/admin-bff/overview.js` does not exist — both citations are
stale. Same bare-`Number()` pattern also exists outside this finding's named
set (`delivery.js:71,85`, `consignments.js:52`, `reservations.js:40`,
`product-media.js:219`, `catalog-spreadsheet.js:238,242`,
`ai-spend-controls.js:50`); deliberately left for the next MAP-019/020 pass
rather than widened silently. This is locally prepared work with passing local
evidence; the Admin BFF stays disabled, so no live behavior changed and
real-host acceptance remains open.

## F-019-003 remediation — path-conditional customer copy (14 September, local)

Failing-first: new `tests/storefront-copy-contract.spec.js` (2 tests) failed
2/2 before the fix (recorded path had no own wording; Contact promised a reply
to every message). Fix is copy-only — same elements, classes, tokens and brand
voice; no layout, motion, or target change:

| Before | After | Why |
| --- | --- | --- |
| Wholesale "What Happens Next" step 1 always says "…after the email is actually sent", including on the recorded BFF path | Step 1 is path-conditional: recorded path says "K2 records the inquiry and its Website conversation for manual review…", email-draft path keeps the original line | A recorded inquiry is not an email draft; the receipt state already says so (`Wholesale.jsx:276`) |
| Contact header says "We reply to every message we receive, by email or phone" while the Message handling panel says "No response time is promised" | Header says "…Messages are reviewed during Manila business hours." | One consistent reviewed-hours statement; OWNER-003's response-time value is still missing, so no reply promise is publishable |

Verification (same dirty tree): new spec 2/2; `test:contracts` 575 + selling
8; `test:base` 784/784; `test:storefront-ui` 31/31; `test:customer-account-ui`
3/3; `prebuild` (surfaces 92/15, 0 gaps) and both isolated builds pass
(Storefront 150.34/150.50, Admin 189.73/300 unchanged). Copy strings appear
only in dated evidence snapshots otherwise, which are history and were not
rewritten. Locally prepared, not deployed; real-host acceptance remains open.

## F-028-001/F-028-002 remediation — inbox honesty and retained Admin commands (14 September, local)

Failing-first: 4 new `inbox-phase2.spec.js` browser cases failed 4/4 before the
fix (no visible-page qualifier, template overwrote drafts, no same-command
retry, no history actor). One pre-existing inbox case caught a real regression
during the work (click-event object accepted as a frozen workflow) and now
passes with the shape guard.

| Before | After | Why |
| --- | --- | --- |
| MetricRail totals computed over a possibly truncated page with no qualifier | Details append "· this page" whenever the read reports truncation | A visible-window count must not read as a queue total |
| Template replaces any typed draft on first click | First click arms ("Replace draft with template"); second click replaces | Typed staff text is work product, not placeholder |
| Uncertain note/reply/workflow shows a warning with no recovery action | "Retry the same command" re-dispatches the frozen payload through the retained session (same operation identity) | Response loss must resolve the original receipt, not mint a second command |
| History timeline shows type/reason/time only | Each event names its staff actor when resolvable (`actor_id` added to the BFF and legacy history projections; unknown actors show nothing) | Audit trail without attribution is incomplete |

F-028-002 structural fixes: coupon Activate/Pause/Archive carry a pre-click
Admin blocker in secure mode (advisory client mirror of `COUPON_ADMIN_REQUIRED`
via `useOptionalAdminStore`; server stays authoritative); archive takes two
deliberate clicks; photo Discard respects `closeDisabled` and an
insecure-uncertain close routes to a reconcile warning instead of a silent
discard; photo and fulfillment audit reasons raised 3→10 chars (handover keeps
3: its field is a courier reference, not an audit reason); deletion freezes an
unconfirmed form with same-key retry and key rotation when the payload changes;
OwnerCountClose session saves reuse their key for identical drafts and all
eight staged flows already retain attempt identity for retry. New
`tests/admin-retained-command-gaps.spec.js` (5 source pins, in
`test:contracts`); archive and delete-uncertain browser cases added (the delete
case first failed under a wrong-runner invocation — harness error, not product
evidence — then passed under its own config).

Corrections to audit claims found while scoping (recorded, not silently
resolved): note/reply already run through the retained inbox session, so the
"omit key/session" charge applies only to the unused raw helpers, which stay
as a tested low-level surface; `saveOwnerCloseSessionBff`'s key fallback is
required for first attempts and the versioned/staged flows are duplication-safe
by construction. Coupon/supplier insecure transports still cannot persist
reasons — that needs the MAP-024 cutover, which stays held. Same
bare-`Number()` pattern remains in `delivery.js`, `consignments.js`,
`reservations.js`, `product-media.js`, `catalog-spreadsheet.js`,
`ai-spend-controls.js` for the next pass.

Verification (same dirty tree): inbox-ui 32/32; payment-ui 34/34 (incl. new
archive case); admin-product-master-ui 2/2 (incl. new uncertain-delete case);
owner-close-ui 1/1; contracts 580+8; base 789; admin-ui 32/32; prebuild and
admin build pass (189.73/300 unchanged). Locally prepared, not deployed.

## F-020-001 remediation — hostname-bound single-use bot challenges (14 September, local)

Failing-first: new `tests/bot-challenge-contract.spec.js` (5 tests, siteverify
stubbed, no network) failed 4/4 before the fix (missing secret passed, replays
and foreign-host tokens passed, no call site bound a hostname).

Fix: `server/bot-challenge.js` keeps a bounded per-process seen-token store
(10-minute TTL, 2000-entry cap — a cost shield, not a distributed guarantee),
requires the Cloudflare-reported hostname to equal the validated request
origin passed by all seven server call sites (order, pasabuy, conversation,
wholesale, customer-auth, admin login and recovery via new `requestHostname()`
helpers in both BFF security modules), and fails closed with no secret unless
`K2_TURNSTILE_ALLOW_UNCONFIGURED=true` is set explicitly. Challenge-free
coupon/quote/message/status reads stay challenge-free by recorded decision and
sit behind durable per-IP/contact rate budgets (router manifest; guest runbook
step 9). Registered the spec in `test:contracts`; documented the bypass var in
both BFF runbooks. No test-runner change was needed: every suite that submits
guest forms intercepts its endpoints or drives fixtures, verified by re-running
them unchanged. No migration, activation, deployment, or provider call.

Verification (same dirty tree): new spec 5/5; focused guest/auth/wiring suite
31/31; `test:contracts` 585+8; `test:base` 794/794; storefront-recovery 6/6;
selling 8/8; customer-account-ui 3/3; admin-ui 32/32; storefront-ui 31/31;
`prebuild` (surfaces 92/15, 0 gaps) and both isolated builds pass
(150.34/150.50, 189.73/300 unchanged). Locally prepared, not deployed;
real-host challenge behavior (valid/expired/replayed/bot-failed on preview)
remains open per the guest runbook.

## F-020-003/F-020-004 remediation — media provenance and cost shields (14 September, local)

Failing-first: 3 new `product-media-ownership.spec.js` cases failed on a
missing export before the fix; 2 new `rate-shield-contract.spec.js` cases
failed on a missing module; 4 new Shopee edge cases failed on live code.

F-020-003: new exported `rejectForeignLegacyMedia` + `readCurrentProductMediaUrls`
in `server/admin-bff/product-media.js`. Null-path (legacy) URLs may only be
retained — every one must already sit on the product's current register, else
`REQUEST_INVALID`; an unreadable register refuses legacy references while fresh
uploads (actor-prefixed path + public-URL equality) still pass. Full
storage-object attestation additionally runs inside the prepared
`execute_admin_product_media_assignment_v1` migration at activation.

F-020-004: new `server/rate-shield.js` (bounded per-route+IP token buckets)
wired into both consolidated routers ahead of their handlers — all 15
storefront routes plus the sessionless Admin auth entrypoints (login,
password-recovery request). Ordinary traffic never notices (300/120 per
minute, durable budgets stay stricter and authoritative); floods get early
429s with `Retry-After` before any RPC cost.

Verification (same dirty tree): media spec 3/3; shield spec 2/2; webhook spec
10/10 + ingress rehearsal; `test:contracts` 594+8; `test:base` 803/803;
payment-ui 34/34; `prebuild` (surfaces 92/15, 0 gaps) and both isolated builds
pass (150.34/150.50, 189.73/300 unchanged). No migration, activation,
deployment, or provider call.

## F-020-002 remediation — Shopee webhook edge gaps (14 September, local)

Failing-first: 4 new `shopee-webhook-boundary.spec.js` cases failed before the
fix (GET answered 200, no shared pre-filter or strict env parser existed).

Fix in `supabase/functions/shopee-webhook/index.ts` + shared
`supabase/functions/_shared/marketplace-push.js`: GET now returns 405 with
`Allow: POST`; the pre-filter moved into a tested `createPrefilterBucket`
factory (windowed per-IP shed, fail-closed by construction — the old
`catch { return true }` is gone); both env boundaries parse through new
`strictEnvInt` with bounds derived from the existing assertions (body deadline
1–30s, replay window 60–86400s), and a misconfigured function refuses pushes
with 503 instead of running on coerced zeros. Bounds are asserted, not
invented; signature, envelope, capture and durable-budget behavior untouched.

Verification: webhook spec 10/10; `rehearse-map020-shopee-ingress.mjs` passes
(incl. MAP-023 inbound-event acceptance). No migration, activation, deployment,
or provider call.


## Continued guest and intake recovery — IDEA-20260914-02

Automatic field-review adoption in ProductIntakeSessionModal retains session,
reviewed content and outer identity through useRetainedIntakeCommand. Sheet
now uses the Grid actor/role remount key. Valid response-loss red evidence is
`intake-recovery-valid-red.log`: the original callback dispatched once, then
showed generic unavailability without exact recovery. Earlier red/green attempts
used incomplete content, failed parsing, and are NOT evidence of response loss.
After correcting the fixture and restoring the prepared implementation,
`intake-recovery-final.log` passed all 10 intake browser cases (2.7 minutes).
The new case proves equal payload/key on retry and explicit field acceptance.
Sheet's complete navigation journey and publication refresh recovery remain open.

Guest/product changes in this slice: immutable mounted checkout payload and
cart-line snapshot; frozen contact/cart/coupon controls; fresh bot tokens after
submission in Checkout/Pasabuy/Messages/Wholesale; isolated malformed cookies;
exact-count supporting history metrics; no demo-fact/media merge for canonical
products; unknown stock preserved; honest passport/missing-fact copy; bounded
active gallery index; phone buying actions before supporting tabs; 44px product
tabs/breadcrumbs; associated coupon label; unsupported Latest option removed;
neutral receipt-aware error boundary. Later refinements add a pending unload
guard, reject late coupon responses and use the bounded slide for alt text and
indicator state too. These final refinements require the current recovery rerun.

The earlier expanded run (`aggregate-tests.log`) passed 774 base, 2 orientation,
31 storefront and 6 recovery cases, then stopped with 30/32 Admin cases. Both
failure snapshots were still loading; bounded readiness assertions were added
without changing business assertions. `admin-readiness-retry.log` passed 2/2.
`remaining-tests.log` passed payment 33/33 then ended while starting Inbox;
it does not establish completion of that command chain. Subsequent independent
verification above records newer shared-tree work separately. Never add these
counts together as one uninterrupted npm-test pass. `security-gate.log` records
successful secret/history and security checks before the newer shared-tree edits.

Numeric follow-up inspection corrected an overbroad prior remainder: delivery
amount/sort fields and reservation limits already use integer guards; AI spend
uses isSafeMicros with deliberate nullable unconfigured caps; consignment
commands do not contain a bare numeric parser; catalog version conversion follows
its digit/safe-integer check. Do not widen these contracts merely to share a
helper. Media orphan-age query normalization still merits a bounded strict-input
check. This inspection made no numeric source change.


## Review truth, scoped crawler policy and media-age follow-up

RemoteGlobeCmsProvider no longer loads demo testimonials when the published
review register is empty or returns an error. GlobeSection distinguishes empty
and unavailable feedback. Local development seeds remain local-only. Two browser
regressions failed before the fix (`review-truth-red.log`) and all nine current
storefront recovery tests passed (`current-storefront-recovery.log`, 2.9m),
including final unload/late-response-era checkout, gallery and scoped metadata.

Account/messages/checkout/confirmation now use noindex/nofollow in page metadata
and four exact Vercel header rules. The scoped header regression failed first;
the first discovery run passed 14 tests, not 17 as an intermediate chat update
stated. Updating the older prelaunch assertion preserves public marketing
indexability while admitting these four deliberately scoped routes. An exact
source dependency-array pin was updated too. Final scoped discovery: 19/19;
subsequent trade-alias additions: 20/20 (`discovery-final.log`). Vite browser
checks verify page metadata, not execution of deployed Vercel headers.

Media orphan review uses validateProductMediaOrphanAge in the real GET handler.
The original parser was extracted unchanged, then the new regression failed on
alternate numeric syntax (`media-age-red.log`). It now uses strictInteger,
refusing repeated query values/hex/exponents, preserving default 60 and inclusive
bounds 60..10080. Media/numeric/Admin contracts passed 75/75 in
`media-age-green.log`. No provider/storage call was made.

Current broad verification: `current-base.log` completed 803 pass + one old
product-only noindex assertion failure; unprivileged Windows Vite teardown
stalled, so only inspected helper PIDs 22172/21760 were terminated. Stop-Process
failed internally; taskkill succeeded. After correcting the assertion and adding
the media tests, approved `current-base-final.log` completed 806/806 in 23.6s.
`current-prebuild.log`, `current-build-storefront.log` and
`current-build-admin.log` passed (150.30/150.50 kB landing gzip; 27.56/30 kB CSS;
189.73/300 kB Admin minified). The later wholesale canonical edit needs its final
Storefront rebuild; no full aggregate pass or deployment is claimed.

Historical screenshot integrity: 91 pre-run images verified/restored, with all
14 differing captures first preserved under `acceptance-captures/`. Exact hashes
and paths are in `screenshot-preservation.json`; no capture was discarded.


## Continued guest and intake recovery — IDEA-20260914-02

Automatic field-review adoption in ProductIntakeSessionModal retains session,
reviewed content and outer identity through useRetainedIntakeCommand. Sheet
now uses the Grid actor/role remount key. Valid response-loss red evidence is
`intake-recovery-valid-red.log`: the original callback dispatched once, then
showed generic unavailability without exact recovery. Earlier red/green attempts
used incomplete content, failed parsing, and are NOT evidence of response loss.
After correcting the fixture and restoring the prepared implementation,
`intake-recovery-final.log` passed all 10 intake browser cases (2.7 minutes).
The new case proves equal payload/key on retry and explicit field acceptance.
Sheet's complete navigation journey and publication refresh recovery remain open.

Guest/product changes in this slice: immutable mounted checkout payload and
cart-line snapshot; frozen contact/cart/coupon controls; fresh bot tokens after
submission in Checkout/Pasabuy/Messages/Wholesale; isolated malformed cookies;
exact-count supporting history metrics; no demo-fact/media merge for canonical
products; unknown stock preserved; honest passport/missing-fact copy; bounded
active gallery index; phone buying actions before supporting tabs; 44px product
tabs/breadcrumbs; associated coupon label; unsupported Latest option removed;
neutral receipt-aware error boundary. Later refinements add a pending unload
guard, reject late coupon responses and use the bounded slide for alt text and
indicator state too. These final refinements require the current recovery rerun.

The earlier expanded run (`aggregate-tests.log`) passed 774 base, 2 orientation,
31 storefront and 6 recovery cases, then stopped with 30/32 Admin cases. Both
failure snapshots were still loading; bounded readiness assertions were added
without changing business assertions. `admin-readiness-retry.log` passed 2/2.
`remaining-tests.log` passed payment 33/33 then ended while starting Inbox;
it does not establish completion of that command chain. Subsequent independent
verification above records newer shared-tree work separately. Never add these
counts together as one uninterrupted npm-test pass. `security-gate.log` records
successful secret/history and security checks before the newer shared-tree edits.

Numeric follow-up inspection corrected an overbroad prior remainder: delivery
amount/sort fields and reservation limits already use integer guards; AI spend
uses isSafeMicros with deliberate nullable unconfigured caps; consignment
commands do not contain a bare numeric parser; catalog version conversion follows
its digit/safe-integer check. Do not widen these contracts merely to share a
helper. Media orphan-age query normalization still merits a bounded strict-input
check. This inspection made no numeric source change.


## Review truth, scoped crawler policy and media-age follow-up

RemoteGlobeCmsProvider no longer loads demo testimonials when the published
review register is empty or returns an error. GlobeSection distinguishes empty
and unavailable feedback. Local development seeds remain local-only. Two browser
regressions failed before the fix (`review-truth-red.log`) and all nine current
storefront recovery tests passed (`current-storefront-recovery.log`, 2.9m),
including final unload/late-response-era checkout, gallery and scoped metadata.

Account/messages/checkout/confirmation now use noindex/nofollow in page metadata
and four exact Vercel header rules. The scoped header regression failed first;
the first discovery run passed 14 tests, not 17 as an intermediate chat update
stated. Updating the older prelaunch assertion preserves public marketing
indexability while admitting these four deliberately scoped routes. An exact
source dependency-array pin was updated too. Final scoped discovery: 19/19;
subsequent trade-alias additions: 20/20 (`discovery-final.log`). Vite browser
checks verify page metadata, not execution of deployed Vercel headers.

Media orphan review uses validateProductMediaOrphanAge in the real GET handler.
The original parser was extracted unchanged, then the new regression failed on
alternate numeric syntax (`media-age-red.log`). It now uses strictInteger,
refusing repeated query values/hex/exponents, preserving default 60 and inclusive
bounds 60..10080. Media/numeric/Admin contracts passed 75/75 in
`media-age-green.log`. No provider/storage call was made.

Current broad verification: `current-base.log` completed 803 pass + one old
product-only noindex assertion failure; unprivileged Windows Vite teardown
stalled, so only inspected helper PIDs 22172/21760 were terminated. Stop-Process
failed internally; taskkill succeeded. After correcting the assertion and adding
the media tests, approved `current-base-final.log` completed 806/806 in 23.6s.
`current-prebuild.log`, `current-build-storefront.log` and
`current-build-admin.log` passed (150.30/150.50 kB landing gzip; 27.56/30 kB CSS;
189.73/300 kB Admin minified). The later wholesale canonical edit needs its final
Storefront rebuild; no full aggregate pass or deployment is claimed.

Historical screenshot integrity: 91 pre-run images verified/restored, with all
14 differing captures first preserved under `acceptance-captures/`. Exact hashes
and paths are in `screenshot-preservation.json`; no capture was discarded.


## Wholesale canonical and publication refresh continuation

F-024-002: permanent /wholesale -> /trade Vercel redirect plus matching
canonical/social metadata. Redirect contract failed first (`trade-alias-red.log`),
20 discovery/prelaunch checks passed (`discovery-final.log`), and actual local
alias rendering passed (`trade-alias-green.log`, 1/1). Vite does not establish
production redirect execution. Verify Location/status after an approved release.

I-002: publication already used the retained hook; its post-write session read
now uses refreshAfterIntakeCommand so a failed read cannot clear uncertainty.
The frozen payload includes product ID instead of reading mutable session state.
The valid regression failed on the original unlocked form after one successful
write and a failed read (`publication-refresh-red.log`); publication plus automatic
field review passed 2/2 (`publication-refresh-green.log`). Remaining session setup,
evidence upload, full navigation and real signed receipts belong to I-002.

## F-021-001, F-023-002, F-028-003 remediation (14 September 2026, local)

Failing-first evidence:
1. `F-021-001`: `tests/admin-logic-regressions.spec.js` asserts unknown stock distinction in `InventoryGrid.jsx:398-402`. Verified that `stock_available` being null/undefined is excluded from available count without being counted as out-of-stock. Passed 3/3 in `admin-logic-regressions.spec.js`.
2. `F-023-002`: Added contract assertion to `tests/delivery-quote-parity.spec.js:153-163` checking that `guestCommerceService.calculateDeliveryQuote` preserves `result.quote` as required by `DeliveryEstimate.jsx:75`. Confirmed RED failure, then patched `src/services/guestCommerceService.js:86` to return `data: ... || result.quote, quote: result.quote`. Confirmed GREEN pass: 9/9 in `delivery-quote-parity.spec.js`. (Note: mounting in `Checkout.jsx` remains blocked by `tests/operations-hardening.spec.js:56` and `OPERATIONS_LOGIC_AND_WORKFLOW.md:85-90` (I-003) which mandates manual delivery quote flow until order-endpoint revalidation is persisted).
3. `F-028-003`: 6 failing-first tests added to `tests/admin-retained-command-gaps.spec.js`:
   - Sheet action buttons (`w-11 h-11` min-h-11) and domain jumps (`min-h-11`), emoji `✨` replaced with `<SparkleIcon />`.
   - InventoryGrid search exception buttons (`min-h-11`) and select-all (`min-h-11`).
   - Admin sidebar nav buttons, search button, DevOps button, and Lock button meet 44px (`min-h-11`).
   - OmniOperationsHub packing queue provides responsive phone cards (`lg:hidden`) beside wide table (`hidden lg:block`).
   - OmniOperationsHub (`HandoverDialog`, `DeliveryDetailsModal`, `PaymentStatusModal`) and Suppliers (`SupplierDialog`) accept and pass `returnFocusRef`.
   - `adminBffService.js` explicit human-readable error messages for `AAL2_REQUIRED`, `MFA_REQUIRED`, `STAFF_ACCESS_REQUIRED`, `SESSION_REVOKED`, and `FORBIDDEN_ROLE` instead of generic `ADMIN_SERVICE_UNAVAILABLE`.
   Confirmed all 11/11 tests pass in `tests/admin-retained-command-gaps.spec.js`.

Broad verification suite run (same dirty tree):
- `tests/admin-retained-command-gaps.spec.js`: PASS — 11/11
- `npm run test:contracts` (+ selling): PASS — 605 contract checks + 8 selling checks = 613/613
- `npm run test:admin-ui`: PASS — 32/32
- `npm run prebuild`: PASS — 92 Admin / 15 Storefront prepared routes, 0 gaps, secret/env/file/source/dependency checks clean
- `npm run build:admin`: PASS — app chunk 189.73/300 kB minified; 40 manifest modules
- `npm run build:storefront`: PASS — landing JS 150.31/150.50 kB gzip, CSS 27.56/30.00 kB gzip; sitemap 2 routes + 0 product URLs


## 15 September I-002 session and evidence continuation

Session creation: failed-response/failed-refresh cases reproduced the previous
unlocked setup (`session-setup-red.log`). The modal now retains a distinct inner
request ID and outer key; on an uncertain retry the service replays creation
instead of using a general latest-session lookup. A failed initial resume read
can be retried explicitly. Session/publication/actor cases passed 4/4 in
`session-setup-green.log`. This is secure mounted-session behavior only.

Evidence upload: both response/refresh loss cases failed first
(`evidence-upload-red.log`). The original File, name, slot, session and caller


## 15 September I-002 session and evidence continuation

Session creation: failed-response/failed-refresh cases reproduced the previous
unlocked setup (`session-setup-red.log`). The modal now retains a distinct inner
request ID and outer key; on an uncertain retry the service replays creation
instead of using a general latest-session lookup. A failed initial resume read
can be retried explicitly. Session/publication/actor cases passed 4/4 in
`session-setup-green.log`. This is secure mounted-session behavior only.

Evidence upload: both response/refresh loss cases failed first
(`evidence-upload-red.log`). The original File, name, slot, session and caller
key are now retained. The BFF transport accepts that key unchanged and preserves
HTTP failure status; service errors distinguish uncertain outcomes from queued
cleanup. Canonical receipt path/slot/upload state must match the refreshed image
before its preview is shown. Existing cleanup IDs remain actionable, and pending
operations create no preview object URL to leak on disposal. The legacy branch
retains its prior reconciliation limitation. Evidence/session cases passed 4/4
in `evidence-upload-green.log`; focused API/intake/retry contracts passed 77/77
in `intake-api-current.log`. Additional incomplete-receipt, stale-record, malformed
resume and denied-retry checks are still under verification, owned by I-002.
No storage upload, deletion, database write, migration or provider call occurred.


## 15 September I-001 (Finish the Inventory Lifecycle) — local implementation verified

State: **locally prepared work with passing local evidence**.
Applied production state remains unchanged. BFF flags stay disabled, nothing was deployed, no provider was called, and no credential/channel/DNS/Auth change was made. Real-host behavior is unverified.

### 1. Derived owned-stock read boundary and Admin consumers
- Implementation: `src/lib/ownedStock.js` provides `deriveOwnedStock`, `deriveCatalogOwnedStock`, and `computeInventoryMetrics`.
- Properties enforced:
  - Owned stock is computed as physical sellable on-hand (`available` lots with >= 90 days shelf-life or clearance approval between 31-89 days) minus active committed holds.
  - Active purchase holds (uncommitted) remain in physical stock and do NOT reduce owned stock prior to confirmation or verified payment.
  - Incomplete or unattributed legacy commitments (`committed_at` without valid `committed_by` or `commit_cause`) are surfaced as `unattributedCommitted` and flagged as `reconciliationRequired: true`.
  - Malformed or corrupt commitment rows never silently collapse into healthy stock numbers.
  - No second writable balance column was created; owned stock remains strictly a read projection.
- Consumers:
  - `server/admin-bff/lots.js`: attaches `activeAllocations` per lot, maps `derivedStock` by SKU with explicit `reconciliationRequired` flags, maps `RESERVATION_ALREADY_COMMITTED` to `[409, 'RESERVATION_ALREADY_COMMITTED']` in `PROVIDER_ERRORS`.
  - `src/views/admin/InventoryGrid.jsx`: updated 4-column totals rail (Physical On Hand, Purchase Holds, Committed Owned, Available Sellable), 12px product register floor, icon markers.
  - `src/views/admin/BatchExpiryManagerModal.jsx`: updated totals rail with clock and box icons.

### 2. 8 Concurrent writer races composed and proven
All 8 concurrent writer races and lock hierarchies were composed and proven against local PostgreSQL 17.11 (`scripts/rehearse-purchase-time-reservation.mjs`):
1. **Confirmation vs Payment Verification Race**: Both writers race to commit stock on the same order. Serialization on order/reservation locks ensures exactly one `stock_committed` event is emitted; subsequent writer is idempotent with no double deduction.
2. **Payment Verification vs Cancellation Race**: Payment verification races cancellation. Winning verification commits stock; cancellation unblocks, cancels order, releases lot back to sellable stock, while retaining commitment attribution audit trail on the released reservation.
3. **Payment Verification vs Expiry Sweep Race**: Verification races background expiry sweep. Sweep skips or ignores locked/verified order; committed reservations survive sweep indefinitely even if temporary expiry timestamp is in the past.
4. **Recount vs Payment Verification Race**: Physical recount races payment verification on a lot. Serializes cleanly across batch and balance locks without deadlock or lost updates.
5. **Custody Transfer vs Confirmation Race**: Custody transfer moves available units on a lot; concurrent confirmation for all units serializes on batch lock and is cleanly refused for insufficient lot stock, preventing over-allocation.
6. **Consignment Receiving vs Confirmation Race**: Manila arrival receipt finalization inserts batches and updates balances concurrently with an order confirmation. Serialization ensures new stock is immediately available without lost updates or race corruption.
7. **Handover vs Cancellation Race**: Physical handover fulfillment races customer cancellation on a fully packed/verified order. Handover dispatches to courier; subsequent cancellation is cleanly refused because order status has progressed to fulfilled.
8. **Channel Allocation vs Confirmation Race**: Multi-channel contention (Shopee sync confirm vs Website checkout confirm) for the last remaining unit serializes on the lot lock; exactly one channel wins, loser is refused with `Insufficient sellable lot stock`.

### 3. Deadline extension and due-queue verification for committed lots
- `supabase/migrations/20260913_payment_handover_commitment.sql`:
  - `v_reservations_due` view filtered to `r.status = 'active' and r.expires_at is not null and r.committed_at is null`.
  - `extend_reservation_v1` updated to reject committed reservations with error `RESERVATION_ALREADY_COMMITTED`.
- Proven in rehearsal:
  - Uncommitted reservation appears in `v_reservations_due` and can be extended by staff.
  - Once confirmed/committed, reservation immediately disappears from `v_reservations_due`.
  - Extension on committed reservation is refused with `RESERVATION_ALREADY_COMMITTED`.
  - Background expiry sweep refuses to touch committed reservations even with expired timestamps.

### 4. Verification suite results (47/47 properties pass)
- `node scripts/rehearse-purchase-time-reservation.mjs`: **47/47 properties held** (all 8 races + deadline extension/due queue).
- `npm run test:contracts`: **620/620 tests PASS** (612 contract specs + 8 selling surface tests).
- `npm run prebuild`: **PASS** (all security scans, route surfaces, dependency policies clean).
- `npm run build:admin`: **PASS** (189.73 kB / 300 kB minified limit).
- `npm run build:storefront`: **PASS** (JS 150.31 kB / 150.50 kB gzip; CSS 27.56 kB / 30 kB gzip).
