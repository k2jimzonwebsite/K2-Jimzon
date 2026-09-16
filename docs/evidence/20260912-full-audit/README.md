# Full project audit — 12 September 2026

Historical findings, not a current completion register. Subsequent verification
and corrections are recorded in `../20260913-stock-lifecycle/README.md` and
`../20260913-map-verification/README.md`; use those records for updated statuses
and MAP-028 J for remaining work. In particular, do not revive refuted atomicity
or test-selection allegations without new evidence.

Read-only audit. No production migration, activation, deployment, paid call,
credential, or MAP edit was made. Seven parallel sweeps (DB, server,
storefront, admin, tests, docs-vs-code, deps/builds/CI) plus lead
verification of every launch-blocking and high finding below.

Status words: **CONFIRMED** = lead reproduced against source this session
(command quoted). **SWEEP-REPORTED** = adversarial sweep output with
file:line, lead spot-checked the anchor but not every instance — verify the
instances before fixing. **UNCONFIRMED** = structurally plausible, needs the
stated proof. **REFUTED** = checked and found wrong; do not re-raise without
new evidence.

Skills: using-superpowers, k2-pasabuy-commerce-operations,
andrej-karpathy, ui-ux-pro-max, impeccable, design-taste-frontend,
emil-design-eng.

## LAUNCH-BLOCKING (confirmed)

### AUD2-001 — Pasabuy security check can never pass (MAP-019)
`src/views/Pasabuy.jsx:140` renders
`<TurnstileChallenge key={challengeKey} onVerify={setBotToken} />`, but the
component destructures only `onTokenChange`
(`src/components/security/TurnstileChallenge.jsx:27-28`) and calls it on
verify/expire/error (`:46,:56-58,:63`). Every other caller passes
`onTokenChange` (Checkout:135, GuestMessages:105, Wholesale:476,
CustomerAccount:92, AdminAuthModal:197/318, StoreChatPanel:332). In Pasabuy
the prop is ignored, `botToken` stays `''`, and a successful Turnstile
callback throws on undefined. Pasabuy submission with the guest BFF enabled
is broken two ways.
Fix: pass `onTokenChange`. Accept: Pasabuy submit succeeds with BFF on; add
a prop-contract spec (wrong-prop-name test).

### AUD2-002 — Guest orders open empty, signal-less conversations (MAP-019)
`supabase/migrations/20260812_guest_submission_boundary.sql`:
`submit_guest_order_v1` (:256–361) inserts `conversations` at :334 with no
`messages` insert before its revoke at :361; `submit_guest_pasabuy_v1`
(:365–470) likewise at :443. Only `start_guest_conversation_v1` seeds a
first message (:607 + :614). Every guest order/pasabuy spawns a thread with
no message, no unread count, no response-due timer. Same defect class as
MAP Queue item 14. (MAP already records this at 1383–1420; still present.)
Fix: seed the order conversation like the contact path. Accept: guest order
→ thread with first message naming the reference + unread + due time.

### AUD2-003 — Refuted on 13 September: partial-commit claim
The earlier claim that an error mid-function leaves confirmed/partly committed
rows ignored PostgreSQL transaction atomicity. A fault on the second lot now
proves rollback of confirmation, compatibility orders, coupon redemption and
all commitment writes; retry commits all three units across two lots once.
No confirmation rewrite was needed. The signed payment variant also proves
receipt/nonce/payment rollback. This tests injected SQL failure, not power loss.
Evidence: `../20260913-stock-lifecycle/README.md`. Broader writer composition
and legacy reconciliation remain I-001.

### AUD2-004 — Refuted on 13 September: contract-suite omission claim
`npm test` starts with `test:base`, whose default discovery includes source
contracts. Actual `playwright test --config=playwright.config.js --list` selects
759 tests in 81 files, including every one of the 55 specs explicitly named in
`test:contracts` and the sales-calculation spec. No duplicate CI invocation
is needed to fix this alleged omission. This is selection evidence, not a fresh
aggregate pass or verification that SQL rehearsals run in CI.

### AUD2-005 — Unlisted buyable-by-link promise breaks at submit (MAP-019/023)
Storefront fetches `Live/Active/Unlisted` and filters Unlisted from browse
(`src/context/StoreContext.jsx`: `.in('status', ['Live','Active','Unlisted'])`
+ `products.filter(p => p.status !== 'Unlisted')`), but
`submit_order_request_v2`
(`supabase/migrations/20260902_purchase_time_reservation.sql:241`) raises
for non-`Live`/`Active`. An Unlisted direct link renders, carts, then refuses
at submission after PII entry. Needs the recorded owner policy choice first,
then either allowlist or honest early failure.
Accept: owner picks one meaning; a contract pins storefront predicate ==
RPC allowlist; an Unlisted SKU either orders or fails before PII entry.

## HIGH (confirmed)

### AUD2-006 — Fulfillment commands lack the Admin role gate siblings have (MAP-020)
`server/admin-bff/fulfillment.js:89-98` authorizes session + CSRF only; no
`isAdminRole` check, unlike coupons:108, delivery:275, wholesale:30,
product-media:212, and nine other modules. Any Staff can confirm orders,
pack, mark `payment_status → verified`, set delivery, fulfill, and transfer
lots — including self-verifying payment evidence (finance-verifier
separation unenforced at the BFF; DB guard
`K2_PAYMENT_INDEPENDENT_REVIEW_REQUIRED` needs live proof).
Fix: gate financial/fulfillment mutations to Admin like siblings. Accept:
Staff session gets 403 on payment-verify; Admin succeeds.

### AUD2-007 — Pasabuy + publication commands mint fresh idempotency keys (MAP-019)
`transitionPasabuyBff`/`savePasabuyQuoteBff`
(`src/services/adminBffService.js:494-495`) take no key, so `:268` mints
`crypto.randomUUID()` per attempt — a timeout retry creates a second
transition/quote version (financial). Same for publication:
`updateProductPublicationServer`
(`src/services/productIntakeService.js:496-504`) calls
`transitionProductPublicationBff({...})` with no key. Contrast the retained
inbox/reservation/delivery/coupon/intake-step sessions.
Fix: retained operation sessions for both. Accept: timeout-retry tests prove
same logical operation server-side.

### AUD2-008 — Dashboard null stock counted as out-of-stock (MAP-021/023)
`src/views/admin/Overview.jsx:375-376`:
`Number(product.stock_available || 0) <= 0` counts null/unknown as
out-of-stock. `src/lib/overviewAvailability.js:40-52` already has the correct
unknown split; Overview doesn't use it. False replenishment signal.
Fix: use the unknown-stock path. Accept: null-stock case in spec; unknown
renders Unavailable, never zero.

### AUD2-009 — Queues render raw counts, bypass unavailable handling (MAP-021)
Queue counts render raw (`Overview.jsx:704-717`, `{loading ? '—' :
queue.count}`) while only metrics use `display()` (`:541`). Failed reads
render as 0, and `:480` sorts "Priority queue" by count, so 50 ready
listings outrank 2 overdue inboxes.
Fix: route queues through `missing()/display()`; order by risk, not count.
Accept: failed-domain queue shows Unavailable; ordering spec exists.

### AUD2-010 — Channel attribution diverges screen vs CSV export (MAP-021)
`normalizeChannel` (Overview.jsx:83-91) defaults unknown to `'other'`;
`normalizeSalesChannel` (src/lib/salesCalculations.js:107-114) defaults to
`'website'`. Same order, two attributions.
Fix: one shared normalizer. Accept: channel-parity test screen vs export.

### AUD2-011 — Revenue grouped by creation date, header admits it (MAP-021)
`buildRevenueSeries` (Overview.jsx:127-144) buckets verified value by
`order.created_at`. Verified-late payments misattribute to creation day.
Fix: receipt/verification-date grouping. Accept: backdated verification
lands on the verification day.

### AUD2-012 — `manilaReportingWindow` has zero consumers (MAP-021)
Only definition exists (`src/lib/manilaReportingWindow.js:48`); Overview
imports `overviewPeriod` (`Overview.jsx:5`) and the prepared overview route
uses it too (`prepared-api/admin/overview.js:4`). Two Manila-day
implementations; the canonical one is unused and will drift.
Fix: migrate both consumers or delete the dead module. Accept: one
implementation, all consumers on it.

### AUD2-013 — Sold-out renders as "pending" (Storefront)
`src/views/MasterProduct.jsx:165`:
`<StockPill stock={product.stock_available || product.stock} />` — `0` is
falsy, so zero stock passes `undefined` ("Stock check pending") instead of
"Sold out". The add-to-cart block computes out-of-stock correctly.
Fix: `??`. Accept: zero-stock product shows Sold out; spec pins `||` vs `??`.

### AUD2-014 — Stale catalog renders as current, no marker (Storefront)
`src/context/StoreContext.jsx:296-301`: fetch failure hits
`// Preserve last known-good snapshot` with no stale flag, badge, or
timestamp; prices/stock render as live. With empty snapshot + prod,
`CatalogGrid` shows "No arrivals published yet" — failure reads as empty.
Fix: stale marker + failure-distinct-from-empty states. Accept: revoked-grant
run shows stale labeling; failed load never reads as empty store.

### AUD2-015 — No server revalidation at purchase on the direct path (MAP-019)
`placeOrder` validates against the in-memory snapshot (≤60s old) and the
direct-Supabase path flattens all server errors to "could not be saved"
(StoreContext.jsx:648 area), losing the INSUFFICIENT_STOCK distinction the
BFF path preserves (409 mapping exists in order.js:59-60).
Fix: surface structured stock errors on both paths. Accept: last-unit race
shows the insufficient-stock message, not a generic failure.

### AUD2-016 — Focus never follows navigation; CartDrawer traps nothing (Storefront)
`go()/openProduct()` scroll without moving focus (StoreContext.jsx:405-430;
`focusSelector` opt-in, used once); `CartDrawer.jsx:13-25` moves no focus in
and returns none on close. `StoreSheet.jsx:34-75` proves the correct pattern
exists. No a11y spec covers it.
Fix: replicate the StoreSheet pattern. Accept: keyboard walkthrough +
focus assertions.

### AUD2-017 — Sheet blanks the working set on failed refresh (Admin)
`src/views/admin/Sheet.jsx` error path does `setRows([])` (three
`setRows([])` sites confirmed); `AdminStoreContext.jsx` interval/visibility
poll does `setProducts([])` on failure (three sites confirmed).
InventoryGrid and Overview preserve + mark stale. Background failure empties
the catalog everywhere.
Fix: preserve-on-failure like siblings. Accept: refresh-failure tests.

### AUD2-018 — Sheet enrich + bulk act on wrong/stale records (Admin)
`Sheet.jsx:361` enriches `rows[0]` ignoring lens/search;
`InventoryGrid.jsx:371-379` never prunes `selected` on refresh, then bulk
acts + optimistically patches stale SKUs. H-017 fixed this class for
consignments only.
Fix: action-identity-from-visible-row + prune-on-refresh. Accept: filtered-row
and stale-selection tests.

### AUD2-019 — Staff-gated UI/server mismatch both directions (MAP-020)
Admin.jsx:483-500 renders Coupons/Omni/Consignment/Pasabuy/Reservations/
Inbox/Wholesale for any Staff (only staff_permissions/owner_close/delivery
gated), while the server demands Admin (COUPON_ADMIN_REQUIRED,
PRODUCT_ADMIN_REQUIRED, …) — Staff fills financial forms then gets
rejected. Reverse: Sheet row delete (`Sheet.jsx:642`, title-only, 36px) has
no `canManageProducts` check while InventoryGrid gates the same action
(:618-672).
Fix: UI/server parity matrix. Accept: parity test both directions.

### AUD2-020 — Bot challenge reusable across forms; dev fails open (MAP-019)
`server/bot-challenge.js`: no hostname check; `expectedAction` enforced only
when the caller passes it (`!expectedAction || action ===`). Only
customer-auth passes an action — order/pasabuy/wholesale/conversation tokens
are interchangeable. Missing secret fails open off-production (`:3`).
Fix: per-form actions everywhere; fail closed without secret. Accept:
cross-form token replay refused.

### AUD2-021 — Unescaped SKU ilike wildcard (MAP-020)
`server/admin-bff/product-intake.js`: SKU duplicate search interpolates raw
query into `.ilike('sku', query)` while the name search escapes (`safeLike`).
`query="%"` returns 5 arbitrary SKUs.
Fix: escape like the name path. Accept: `%`/`_` literal test.

### AUD2-022 — In-memory login rate-limit evaporates on restart (MAP-019)
`server/admin-bff/security.js`: `loginAttempts = new Map()`, 5/15min,
cleared on restart, per-instance on Vercel — while durable preauth limits
exist elsewhere.
Fix: durable store. Accept: restart-persistence test.

### AUD2-023 — Route-count contradictions across docs (MAP-028)
Runbook says registry-derived 91 Admin / 15 Storefront
(`docs/runbooks/DEPLOYMENT_RUNBOOK.md:20`); code + PROJECT_MAP +
ARCHITECTURE say 92/15 (security scan confirms 92 prepared Admin routes).
`docs/ROUTES.md:34,55` + `docs/README.md:16` say 81/14 and omit
delivery/channels/staff-access/mfa-replacement/system-readiness/product-intake/ai.
Fix: regenerate or correct ROUTES.md/README; correct the runbook number.
Accept: `ADMIN_BFF_ROUTES.length` == documented number, asserted in spec
(the surface spec only checks PROJECT_MAP/ARCHITECTURE).

### AUD2-024 — Finding-count denominators unlabeled: 21 vs 26 vs 55 (MAP-017)
MAP dashboard "26 critical remain" (:712), G-001 "latest exhaustive (47/7/1)"
(:8662), "first true live audit 21 findings" (:821), System Brain "26 down
from 55", followup evidence "26 critical, zero high" scoped re-audit vs
"55 (47/7/1)" exhaustive baseline. "Latest/remaining" used without scope
labels in two places.
Fix: label every count (scope + export + date). Accept: same export under
scoped vs exhaustive filter reproduces both numbers.

### AUD2-025 — OWNER-004 answered, number still hidden (MAP-019/024)
OWNER-004 resolved 2 Sept (+63 931 864 9654, publishable after link tests);
`src/views/Contact.jsx:109` still "Business number: Not published yet"; zero
`tel:`/`wa.me`/number hits in src. Live audit confirms unpublished.
Fix: publish + real-phone link tests, or record why withheld. Accept: contact
page shows the number with working links tested from a real phone.

### AUD2-026 — Deploys build generic `npm run build`, budgets never gate it (MAP-024)
`vercel.storefront.json:2` / `vercel.admin.json:2` run generic `npm run
build` (auto chain, no `verify-bundle-budgets`); budgets pass in CI yet the
deployed artifact is never budget-gated. Admin `maxDuration: 180` risks
plan-ceiling/billing surprise. CSP is Report-Only with no `report-uri` on
both targets: XSS ships unblocked, reports go nowhere.
Fix: target builds in deploy commands; budget gate in the chain; enforce CSP
or add report-uri; confirm duration vs plan. Accept: `npm run build` vs
targeted build log diff; header proof from a preview.

### AUD2-027 — Secret scanner skips ignored files, misses K2 patterns (MAP-020)
`scripts/scan-secrets.mjs` uses `git ls-files --exclude-standard`: local
`.env.local` (real keys) always passes prebuild green. Patterns miss
`K2_*_SECRET`, session/cookie keys, SHOPEE/LAZADA/TIKTOK/GEMINI keys,
generic base64-32B. History scan excludes the lockfile (credentialed
registry URLs invisible). Same shared `index.html` (storefront
canonical/OG) ships in the Admin artifact — no per-target head handling in
vite config (entryFile differs, index.html shared).
Fix: scan `.env.local` explicitly (blocked, non-printing reporter); add K2
patterns; per-target index handling. Accept: planted-fabricated-secret tests
for each hole.

### AUD2-028 — CI never runs most rehearsals; single job buries DB gates (MAP-025)
Only MAP-017 + catalog rehearsals run in CI; marketplace/product-knowledge/
channel/payment/MAP-019/MAP-020/final-admin portable suites have zero CI
steps. One sequential job with no `timeout-minutes`: a failing `npm test`
means DB gates never run (no red, just absent). No `concurrency` cancel.
Fix: CI steps per rehearsal (or an explicit rehearsal job), timeouts.
Accept: CI log shows each rehearsal executed.

### AUD2-029 — Dead spec + double counting (MAP-025)
`tests/wholesale-inquiry-ui.spec.js` is in base `testIgnore`
(playwright.config.js:32) and referenced by no config and no `test:*`
script — never executes. `smoke.spec.js` runs in three suites;
marketplace/intake-ai specs run in contracts AND dedicated scripts;
`test:contracts` appends `test:selling-surfaces`. Summed pass counts
overcount (note: this register counts nothing; it reports).
Fix: runner-membership test (every spec file in ≥1 runner); de-dupe or
label overlaps. Accept: `--list` per config covers every spec file.

### AUD2-030 — MAP-017 stale "Queued" section contradicts Active status (MAP-017)
`MASTER_ACTION_PLAN.md:1978` Active (phase one applied) vs `:2644` "MAP-017
remains Queued because no exporter connects" (15 August scaffolding, no
superseded banner). Both present-tense.
Fix: banner or remove the stale section. Accept: single status readable.

## HIGH (sweep-reported, verify instances before fixing)

- **AUD2-031** — Storefront quantity coercion: `Number(item.quantity)` then
  `isInteger` 1..99 (`prepared-api/storefront/order.js:24-25`) — `true`→1
  passes. Narrow but real; server coupon path uppercases (fine). Downgraded
  from sweep HIGH to HIGH-low: fix with typeof check.
- **AUD2-032** — `index.html` crawler copy promises "live stock across every
  channel" + "flown monthly" (`index.html:16`) vs staff-confirmed model.
  Fix copy. (Confirmed text present; marketing-vs-truth judgment stays owner.)
- **AUD2-033** — Seed reviews render as "Shopee · verified"
  (`src/data/globeCms.jsx:176-181` fallback + `GlobeSection.jsx:28-29`
  labels; Footer disclaimer DEV-only). Needs empty-table-in-prod proof.
- **AUD2-034** — `product.inside` dead field always renders
  delivery-readiness claim (`MasterProduct.jsx:261`); `DeliveryEstimate`
  zero references in src (unwired MAP-023 pilot fee); tile/grid filter split
  (`CategoryTiles.jsx:55-68` substring vs `CatalogGrid.jsx:15` exact).
- **AUD2-035** — Checkout double-submit renders bogus error
  (`StoreContext.jsx:587` returns undefined → Checkout.jsx:48 "could not be
  submitted"); Pasabuy idempotency fingerprint includes `botToken`
  (StoreContext.jsx:492) so challenge refresh rotates the key.
- **AUD2-036** — `/store` lazy-import failure leaves blank stage
  (`InteractiveShop.jsx:409-428`: boundary catches render errors, rejected
  import leaves `sceneReady === true` with no fallback).
- **AUD2-037** — `netlify.toml` (`/* → /index.html` 200, 3 headers, no CSP)
  dormant but resurrects global catch-all + unhardened headers if Netlify is
  ever connected. Confirm dashboard has no linked site, then delete or
  document.
- **AUD2-038** — Missing `beforeunload`/retained-key coverage at Pasabuy,
  publication, media-upload (`uploadProductMediaBff` hardcodes
  `crypto.randomUUID()` at adminBffService.js:524), cleanup/media/globe/
  master/supplier/channel/staff/invite single-arg call sites, consignment
  slot map on reload; Omni payment modal dismissible while uncertain
  (contrast Handover/Delivery guards); intake step-6 Save ignores command
  lock; Inbox thread-switch clears uncertain notice; scroll yank on poll.
- **AUD2-039** — Omni hardcoded custody/confirm reasons
  (`OmniOperationsHub.jsx:277-293,300-308`, confirm :186-189) without
  staff-entered reason or previous-holder display; Inbox history limit(20)
  without on-screen notice; no cursor pagination (queue, sales slice,
  consignments, coupons) except sales ledger.
- **AUD2-040** — Vacuous-test class: source-substring specs
  (confirmation-commitment-contract, purchase-time-reservation FEFO count,
  admin-logic-regressions), circular fixture mocks (dashboard-redesign,
  recovery UI, intake-ai, account, hero), hand-rolled Supabase builder
  mocks, `check(name, true)` tautologies after SQL files, `--baseline-*`
  flags that skip corrections while exiting 0, last-unit rehearsal slicing
  the obsolete 20260809 confirm (markers verified at
  rehearse-map023-last-unit-concurrency.mjs:70-78 against
  20260809_operations_hardening.sql — live confirm is 20260902+20260912).
  Each instance needs its stated negative control before it counts as proof.
- **AUD2-041** — Untested high-risk paths: refunds (zero specs execute a
  refund; no proof refund neither resurrects stock nor deletes
  `stock_committed`); handover of committed orders (no commitment-coverage
  gate, predates commitment); confirm/cancel/sweep races (fully serial
  tests); session absolute-TTL refusal; delete-PIN rate limiting; multi-batch
  commitment (tests single-batch only; behavior file asserts
  `count(stock_committed)==1` which a 2-batch order would break — suite
  never exercises it).
- **AUD2-042** — Lock-order hazard class (UNCONFIRMED as deadlock; confirmed
  as missing coverage): reserve/cancel/sweep/recount/packing/handover/payment
  lock in different granularities; cancel interleaves per-SKU
  balance→reservation updates while sweep locks all balances then all
  reservations. No concurrent writer-pair race test exists for any pair.
  Prove with pg_sleep-gated races before claiming deadlock; add the races
  regardless.
- **AUD2-043** — Missing SQL invariants: no CHECK on balances (old sweep
  clamped with `greatest()`, new sweep raises — same table, two
  philosophies); coupon attach checked without FOR UPDATE at submit vs FOR
  UPDATE at confirm (single-use coupon double-attach race); refund moves
  money state with zero stock movement and no reversal event; no
  `committed ⇒ active` / cause CHECK constraints (function guards only);
  helper returns row counts, not units (future-caller trap).
- **AUD2-044** — Stale/duplicate docs: FUTURE_IDEAS IDEA-20260906-0x duplicate
  register rows (06 appears 3× confirmed); pending IDEA-20260902-04/05/06
  "not audited" while MAP-023/026 hold prepared scope (no Accepted row);
  ARCHITECTURE diagram counts (42/9/53) vs live export (87/12/151);
  runbook Admin-timeout contradiction (180s vs 15s); duplicate entrypoint
  bullets in PROJECT_MAP/ARCHITECTURE; this session's own batch README claims
  "every batch green" while listing env-blocked rehearsals.
- **AUD2-045** — Shopee webhook: no pre-verify rate limit (CPU burn on invalid
  floods); signed URL strips query (two URLs verify identically); `:` allowed
  in identity values; edge GET 200 oracle; `===` secret compare;
  `K2_EDGE_ALLOW_LOCALHOST` widens prod CORS if set. Mostly-clean otherwise
  (exact raw-body verify, replay window, verify-before-capture confirmed by
  sweep read).
- **AUD2-046** — Media upload orphan paths: generic (non-evidence)
  `product-media` uses `upsert:true` + 503-without-cleanup on the generic
  error path (vs evidence path's pending record); ownership check is URL
  string equality with no existence/registration check; idempotency-conflict
  path deletes the registered object, contradicting the never-delete policy.
- **AUD2-047** — Checkout hardcodes `fulfillmentMethod: 'Metro Manila
  delivery'` (Checkout.jsx:46 via StoreContext call) — provincial addresses
  submit under a false method into quoting/staff review. No spec covers
  non-pilot labeling.
- **AUD2-048** — Wholesale validation trim-only (any email/phone string);
  coupon Remove control sub-44px (`Checkout.jsx:95-97` text-xs vs 44px rule
  rest of checkout honors); Pasabuy freight timeline promises
  (~4-6/~1-2 weeks) vs per-quote rule; arrivals recency asserted not derived
  (`products.slice(0,4)`); flight-map/hero logistics claims
  (direct/temperature-controlled/ready-to-dispatch); wholesale strip vs
  per-order terms; FAQ bulk-list implication; contact/wholesale mailto
  abandonment records nothing; "Pay when delivered" vs planned-GCash copy.

## UNCONFIRMED (needs the stated proof)

- **U-01** — Cancel-vs-sweep deadlock: needs two-session pg_sleep race on a
  2-SKU order (see AUD2-042). Until then it is a granularity difference,
  not a deadlock.
- **U-02** — Payment items-first vs order-first inversion: needs concurrent
  payment-verify + cancel race proof.
- **U-03** — Pack-vs-handover reservation race: needs concurrent proof.
- **U-04** — Inbox auto-mark-read-on-open: scroll yank confirmed
  (messageEndRef scrollIntoView); read-on-peek vs read-on-read needs a
  session-observation test.
- **U-05** — Anon `products` RLS (`Live/Active` only) silently filtering
  Unlisted reads at the table layer while the stock function includes them:
  needs anon REST probe of both paths.
- **U-06** — `submit_order_request_v2` anon grant at 20260809:250 reopening
  unsigned submission if applied without the cutover revoke: needs
  apply-order proof on a scratch DB (rehearsals install 20260809 standalone
  — check what each installs after it).

## REFUTED (checked, do not re-raise without new evidence)

- **R-01** — "No prefers-reduced-motion in Admin": 31 matches in
  src/views/admin. The broad claim is wrong; any motion complaint must cite
  a specific component.
- **R-02** — "Operational slice names don't exist": all three 20260803 names
  plus all three 20260809 names verified present; last-unit slices resolve.
  The real issue is narrower: it rehearses the obsolete 20260809 confirm
  (AUD2-040), not that slices fail.
- **R-03** — "Pasabuy cancel is single-click without confirmation": no
  `Move to Cancelled` control found in PasabuyManager; transitions go
  through a state-machine map. Dropped for lack of evidence.
- **R-04** — "Mixed-case coupon codes break client-side": server uppercases
  and validates (`order.js:30-31`). Non-issue.
- **R-05** — Omni selection "jumps after every poll": code only reselects
  when the current selection left the list
  (`!formatted.some(...) → formatted[0].id`). Narrower than claimed;
  still yank-prone on status change (medium, in AUD2-039 class).

## GENUINELY SOLID (with proof)

- Security surface inventory: 92/15 routes, zero gaps, zero unexpected
  grants, zero wildcard CORS — `npm run security:surfaces`, this session.
- Secrets: no service-role/server key material in browser code
  (VITE_TURNSTILE_SITE_KEY + flags only); `npm audit` 0 vulnerabilities,
  this session.
- Last-unit concurrency + purchase-hold 30/30 + payment/marketplace/channel/
  final-admin/invite/MFA/rate/ingress/claim/product-knowledge rehearsals —
  12 Sept loopback runs.
- `test:base` 742/742, inbox 27/27, payment 33/33, admin 32/32, storefront
  31/31, both isolated builds with boundary/budget/secret gates — 12 Sept.
- Anon grant posture matches the documented 14-function set at migration
  level; no anon grant on confirm/cancel/fulfill/reconcile/transfer/packing/
  payment/commit (sweep-verified, spot-confirmed).
- RLS deny-by-default shape on operational tables (select-only staff
  policies); trigger-mutation guards; FEFO 90/31-89/0-30 predicate
  consistent across reserve/payment/handover/sweep.
- Owner-question discipline: OWNER-003 missing value correctly gates public
  promises ("Staff review required", no response-time promise rendered).

## Verification log (lead-run, this session)

- `git status/log` (dirty tree preserved, main @ 41d96df).
- `node .agents/skills/impeccable/scripts/context.mjs` (register: brand).
- Grep/read verification of every CONFIRMED finding (commands above; outputs
  retained in session).
- `npm run security:dependency-audit` → 0 vulnerabilities.
- No writes except this file. No servers started, no migrations applied, no
  deployments, no paid calls.

## Remaining for the owner (not findings, gates)

MAP-017 follow-up apply authorization; BFF activation; paid intake
provider/model/caps; channel credentials; real inventory/content/media/
delivery/payment inputs; staff enrollment; OWNER-003 value; Unlisted policy
choice (AUD2-005 needs it); launch-timing choice; Queue-13 decision; final
acceptance. In I-001: AUD2-003 fix first, then payment-verification caller,
handover gate, owned-stock projection.
