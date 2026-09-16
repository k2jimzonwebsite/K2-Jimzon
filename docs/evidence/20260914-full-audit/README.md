# FULL PROJECT AUDIT — K2 Jimzon — 2026-09-14

READ-ONLY audit. No production migration, BFF activation, deployment, paid call,
credential/channel/DNS/Auth change was made. All verification is local:
contract suites, browser suites, isolated builds, `prebuild`,
`security:surfaces`, `security:dependency-audit`, and loopback PostgreSQL
17.11 rehearsals via `.tools/postgresql-17.11`.

- Skills invoked first: `using-superpowers` (routing),
  `k2-pasabuy-commerce-operations` (domain truth), `andrej-karpathy`
  (surgical, evidence-first discipline), plus `ui-ux-pro-max`, `impeccable`,
  `design-taste-frontend`, `emil-design-eng` for all visible-UI judgments.
- Read in order: `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md`
  (target), `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md` (claimed current),
  `MASTER_ACTION_PLAN.md` (only backlog, MAP-017→MAP-028),
  `docs/PROJECT_MAP.md`, `docs/ARCHITECTURE.md`.
- State taxonomy used everywhere below: **target** (rulebook) vs **prepared**
  (repo files, unapplied/inactive) vs **local evidence** (passing local runs)
  vs **applied/production** (provider state) vs **real-host verified**
  (measured on canonical hosts). These are never collapsed into "done".
- Method: MAP-017→MAP-028 in dependency order, bottom-up SQL→BFF→UI→docs.
  Five parallel read-only sweeps (DB, server/BFF, storefront, Admin, tests/docs/deps)
  plus first-hand spot verification by the lead auditor. Every finding has
  file:line evidence, the proving command, and an objective acceptance check.
  Anything not reproducible is in UNCONFIRMED with what would confirm it.
- No MAP item created, closed, or edited. No competing backlog. Completion is
  never claimed. Proposed MAP text updates are in the covering reply, not here.

## Verification runs (2026-09-14, local, no prod change)

| Command | Result |
| --- | --- |
| `npm run prebuild` | PASS (secret/env/file/source/dependency/surface/secret scans + import check) |
| `npm run security:surfaces` | PASS — 92 Admin / 15 Storefront prepared routes, 0 gaps, 0 unexpected PUBLIC/anon grants, 0 wildcard CORS |
| `npm run security:dependency-audit` | PASS — `found 0 vulnerabilities` |
| `npm run test:contracts` (api stage + selling) | PASS — 565 api-contract checks (14.9s) + 8 selling checks |
| focused subset (admin-bff, guest-commerce, purchase-time, confirmation-commitment, catalog-freshness, surface-inventory) | PASS — 102/102 |
| `npm run test:base` | PASS — 764/764 (note: docs cite 759/742 in older entries; count drifted as specs were added) |
| `npm run test:storefront-ui` | PASS — 31/31 |
| `npm run test:admin-ui` | PASS — 32/32 |
| `npm run test:payment-ui` | **32 pass, 1 FAIL** — `custody freezes pending details and retries the same uncertain command` (see F-023-001) |
| `npm run test:inbox-ui` | PASS — 27/27 |
| `npm run test:admin-product-master-ui` | PASS — 1/1 |
| `npm run test:owner-count-close-ui` | PASS — 1/1 |
| `npm run test:customer-account-ui` | PASS — 3/3 (incl. wholesale-inquiry-ui) |
| `npm run test:selling-surfaces` | PASS — 8/8 |
| `npm run test:workflow-api` | PASS — 4/4 |
| `npm run test:intake-ai-ui` | PASS — 9/9 |
| `npm run test:store-orientation` | PASS — 2/2 |
| `npm run build:storefront` | PASS — landing JS 150.16/150.50 kB gzip, CSS 27.52/30 kB; sitemap 2 routes + 0 product URLs (pre-launch gate ON) |
| `npm run build:admin` | PASS — app chunk 188.96/300 kB minified; 40 manifest modules |
| `rehearse-purchase-time-reservation.mjs` | PASS — 37/37 properties |
| `rehearse-payment-recovery.mjs` | PASS |
| `rehearse-map023-last-unit-concurrency.mjs` | PASS (PgSleep lock proof, 1/1 reservation) |
| `rehearse-marketplace-snapshot-portable.mjs` | PASS (rollback preserves staged evidence) |
| `rehearse-channel-vocabulary-portable.mjs` | PASS — 13/13 |
| `rehearse-map017-portable.mjs` | PASS — 12 authz groups + backup/restore |
| `rehearse-map018-cleanup-portable.mjs` | PASS |
| `rehearse-intake-ai-portable.mjs` | PASS |
| `rehearse-final-admin-concurrency.mjs` | PASS (reproduces 0-Admin loss, then holds 1 Admin) |
| `rehearse-map019-staff-invitation-reason.mjs` | PASS |
| `rehearse-map019-mfa-replacement.mjs` | PASS |
| `rehearse-map020-admin-preauth-rate.mjs` | PASS |
| `rehearse-map020-storefront-auth-rate.mjs` | PASS |
| `rehearse-map020-shopee-ingress.mjs` | PASS |
| `rehearse-product-knowledge-portable.mjs` | PASS — 9/9 |
| `rehearse-map019-account-claim.mjs` | PASS |
| `rehearse-database-backup-restore.mjs` | ENV-BLOCKED by design (`BLOCKED_LOCAL_DATABASE_UNAVAILABLE` — needs explicit rehearsal URLs; fails closed, exit nonzero) |
| `rehearse-catalog-spreadsheet.mjs` | ENV-BLOCKED by design (`BLOCKED_LOCAL_DATABASE_UNAVAILABLE` — needs `K2_CATALOG_REHEARSAL_URL`) |

`K2_TEST_PG_BIN` pointed at `.tools/postgresql-17.11/runtime/pgsql/bin`
(verified present: `psql.exe`, `initdb.exe`, etc.). Node v24.16.0, Playwright 1.61.1.

## Ranked findings

Severity: **launch-blocking** (must resolve before launch) / high / medium / low.
"Owning MAP" is where the fix belongs. Nothing here edits the MAP.

### F-017-001 — MAP-017 follow-up unapplied: 26 critical findings still live (launch-blocking, MAP-017)
- Evidence: `MASTER_ACTION_PLAN.md:1924-1931,1966-1979` (26 critical on 8 Sept
  export; phase-one applied, follow-up `20260909023000` prepared, no provider
  write); `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md:104-134`;
  `docs/evidence/20260909-map017-followup.md:12`; live probe
  `live-schema-metadata.json`. Local rehearsal passes
  (`rehearse-map017-portable.mjs`, 12 groups) — prepared only.
- Command: `node scripts/rehearse-map017-portable.mjs` (passes locally) vs
  `node scripts/schema-truth-audit.mjs --export=live-schema-metadata.json`
  (reports findings against the dated export). Fresh export + live anon probe
  still required — see U-001.
- Target vs actual: target = 0 anon-write grants, locked-down function ACLs,
  retired error-report inserts. Actual = prepared migrations + green loopback
  rehearsal; production still carries error-report anon inserts, 14
  PUBLIC/anon trigger/receiving grants, 4 legacy guest RPC grants (20
  non-provider findings mapped to existing migrations), 6 provider-owned
  defaults on the supported-provider path.
- Fix direction: exact-payload authorization and single application of
  `20260909023000` with receipt/postflight per the recorded gate; never repeat
  phase one (`20260824143000`).
- Acceptance: fresh metadata export shows the expected −16 rows; 14/14 anon
  read checks pass live; refreshed actual-role/catalog evidence recorded.

### F-023-001 — custody uncertain-command retry broken: payment-ui custody variant FAILS (launch-blocking, MAP-023 / MAP-028 I-002)
- Evidence: `tests/payment-recovery-ui.spec.js:57-99` (handover/delivery/
  supplier variants pass; custody variant fails). Full run: 32 pass, 1 fail at
  the post-Confirm field-freeze assertion (`:81`); isolated rerun also fails
  (harness goto timeout on port 5195 — see U-007). Custody path:
  `src/views/admin/OmniOperationsHub.jsx:313,360,389,408` direct `rpc` calls
  with no retained key (insecure bypass beside the retained
  `FulfillmentActionDialog:584` / `Handover:617` / `Delivery:656` paths).
- Command: `npm run test:payment-ui` (reproduces 32/33).
- Target vs actual: rulebook response-loss rule (retain exact payload + outer
  receipt key, freeze fields/dismissal, one explicit retry) vs custody caller
  that never enters the frozen pending state, so the same logical custody
  transfer cannot be safely retried after a lost response.
- Fix direction: route the custody transfer through the existing retained
  fulfillment command (`useRetainedFulfillmentCommand`) like handover/delivery;
  remove the direct-rpc bypass.
- Acceptance: `npm run test:payment-ui` 33/33, incl. the custody variant on all
  three viewports.

### F-023-002 — delivery exact-fee path unreachable: shape mismatch + unmounted picker (launch-blocking, MAP-023)
- Evidence: `src/services/guestCommerceService.js:45-48,85`
  (`quoteGuestDelivery` returns `postGuestCommerce` → `{ok, data}`, no `quote`
  field) vs `src/components/DeliveryEstimate.jsx:75`
  (`result.ok && result.quote?.customerVisible` → always undefined → always
  "Quoted after review"); picker never mounted in `src/views/Checkout.jsx`
  (static line `:88` only). First-hand verified.
- Command: source read (no runtime needed — dead by construction); `npm run
  test:selling-surfaces` passes because it only asserts the quoted-after-review copy.
- Target vs actual: rulebook §13 pilot `STANDARD_FEE` (exact-locality quote →
  communicated → customer_confirmed → frozen charge) vs a UI where the pilot
  fee can never resolve even with BFF active.
- Fix direction: return the quote through the service (or delete the picker);
  mount `DeliveryEstimate` in Checkout behind the pilot-eligibility gate; keep
  quoted-after-review as the explicit fallback.
- Acceptance: with guest BFF active, a pilot-eligible locality yields an exact
  fee persisted through the accepted-quote chain (I-003), or an explicit
  unavailable state — never a silent fallback; new contract pins the
  service→component shape.

### F-019-001 — payment evidence still a narrow transition + free text (launch-blocking, MAP-019 / MAP-023)
- Evidence: `MASTER_ACTION_PLAN.md:112-123`; rulebook IDEA-20260907-01 boundary
  (`OPERATIONS_LOGIC_AND_WORKFLOW.md:10-14`): prepared payment route records
  only status transition + free-text event, no method/amount/currency/payer/
  reference/proof/instruction-delivery records, no finance-verifier separation.
  `tests/admin-bff-contract.spec.js:757` pins only `verified/failed/refunded`
  values — no amount/currency/method persistence test exists.
- Command: `Select-String -Path prepared-api/admin/fulfillment/payment.js -Pattern "amount|currency|method|proof"` (absent) + contract suite passes (proves the gap is untested, not absent).
- Target vs actual: rulebook §16 (evidence separate from status; verifier, time,
  amount, notes; screenshot ≠ paid) vs status-only transitions.
- Fix direction: separately reviewed migration for structured
  instruction/evidence storage + Admin command with negative/uncertain/replay
  tests, after owner decisions on method/payee/QR/verifier separation.
- Acceptance: evidence submit→verify→refund lifecycle with persisted
  amount/currency/method/reference/proof, independent verifier, immutable
  rejected-attempt history; `rehearse-payment-recovery.mjs` extended accordingly.

### F-024-001 — legacy direct-browser writes still live beside the prepared BFF (launch-blocking, MAP-024 / MAP-028 I-002)
- Evidence: `src/views/admin/ConsignmentManager.jsx:94-96,117-121,147-149,172,191`
  direct `supabase.rpc` with no key/uncertainty handling;
  `src/views/admin/InventoryGrid.jsx:330,364` insecure edit/status with no
  reason; `Suppliers.jsx:52`, `CouponManager.jsx:96,160`,
  `OmniOperationsHub.jsx:192,288,313,360,389,408` same pattern. MAP's own
  hazard notes (`MASTER_ACTION_PLAN.md:1184-1211`) confirm applying
  `catalog_spreadsheet_commit` / `admin_product_master_boundary` revokes before
  cutover breaks creation/editing/photo-saving/deletion.
- Command: `npm run test:contracts` passes (prepared-route contracts) — proves
  nothing about which transport the shipped UI uses; `Select-String -Path
  src/views/admin/*.jsx -Pattern "supabase\.rpc|supabase\.from.*\.(update|insert|delete)"` enumerates bypasses.
- Target vs actual: cutover rule (named product-master commands, signed +
  idempotent + reasoned; direct writes revoked in coordinated cutover) vs
  dual transports where the legacy path has no CSRF/idempotency/AAL2/reason.
- Fix direction: finish I-002 caller migration to retained-key BFF commands,
  then execute MAP-024 cutover steps 3–5 in order; keep revokes held until then.
- Acceptance: zero direct `supabase.rpc/update/insert/delete` call sites in
  shipped Admin views (contract-enforced); revokes applied; all Admin journeys
  green through the BFF.

### F-023-003 — cross-writer lock-order inversions (high, MAP-023 / MAP-028 I-001)
- Evidence (first-hand): purchase-hold takes balances first
  (`20260908_purchase_hold_lock_order.sql:29-38`: balances `ORDER BY sku`,
  then items `ORDER BY sku,created_at,id`); payment takes items first
  (`20260908_payment_balance_integrity.sql:19-26`: items `ORDER BY id`, then
  balances `ORDER BY sku`, reservations, batches); cancellation loops per-sku
  without pre-locking the full set and orders reservations by
  `(batch_id,id)` without leading `sku`
  (`20260905_purchase_hold_cancellation.sql:29-47`); reconciliation orders
  batches by `id` alone (`20260908_reconciliation_lock_order.sql:19-21`) while
  every other writer uses `(sku,id)`.
- Command: the `Select-String ... -Pattern "FOR UPDATE|ORDER BY|LOCK"` run
  above; `rehearse-purchase-time-reservation.mjs` 37/37 proves only the
  purchase-vs-purchase and purchase-vs-recount pairs.
- Target vs actual: rulebook §5 (all writers compose without lock inversion)
  vs A/B inversions across purchase/confirm/cancel/sweep/recount/clearance/
  handover/packing/payment that no rehearsal exercises together.
- Fix direction: single documented lock hierarchy (order row → balances by sku
  → reservations by (sku,batch_id,id) → batches by (sku,id) → product) applied
  to every writer incl. cancellation/sweep/payment/handover; add a
  cross-writer concurrency rehearsal (purchase vs payment vs cancel vs sweep on
  overlapping SKUs).
- Acceptance: new rehearsal passes with zero deadlocks/serialization anomalies
  and exact totals; owned-stock readers and deadline queues covered (closes the
  I-001 remainder alongside).

### F-020-001 — bot-challenge: no hostname binding, no replay store, fail-open off-prod (high, MAP-020)
- Evidence (first-hand): `server/bot-challenge.js:1-16` — verifies `success` +
  `action` only; no hostname check, no single-use/replay store; `:3` missing
  secret returns `NODE_ENV !== 'production'` (fail-open on previews/dev).
  Public reads bypass challenge entirely (`coupon.js:16-33`,
  `delivery/quote.js:57-94`, `message.js:21-42`, `messages.js:6-22`,
  `order/status.js:6-24` with `bot:false` in `server/storefront-bff/router.js:45-50`).
- Command: source read; `tests/turnstile-wiring-contract.spec.js` passes (pins
  wiring, not hostname/replay semantics).
- Target vs actual: rulebook (bounded Turnstile per action; rejected traffic
  must not consume bot checks or provider delivery) vs replayable tokens
  accepted on any host and unmetered public reads (coupon enumeration, quote
  scraping).
- Fix direction: verify `hostname`, enforce per-action single-use with a
  short-lived nonce store, fail closed when secret unconfigured; add durable
  budgets in front of coupon/quote reads or document them as intentionally open
  with abuse thresholds.
- Acceptance: replayed token rejected; wrong-hostname token rejected; missing
  secret fails closed everywhere; new contracts pin all three.

### F-027-001 — sample reviews carry marketplace "verified" badges with no sample label (high, MAP-027)
- Evidence: `src/data/globeSeedReviews.js:1-26,32,52,66,80` (file labels
  SAMPLE/Mock; entries carry `Shopee · verified` / `Lazada · verified`);
  `src/data/globeCms.jsx:176-181` falls back to seeds on empty/error;
  `src/views/Home.jsx:28`, `src/components/home/GlobeSection.jsx:29,61-65`
  promise "published customer feedback" and only show the reconnecting notice
  when count is zero (seeded load hides it).
- Command: source read; any empty-`reviews`-table render shows badged samples.
- Target vs actual: rulebook (never claim fake sourcing evidence; seed strings
  do not prove consent/attribution/publication) vs live-labeled social proof.
- Fix direction: badge seeds as "Sample" in UI or render the empty state
  instead of seeds until real rows exist (owner data-entry task already tracked).
- Acceptance: with zero review rows, UI shows an explicit sample/empty state;
  no "verified" badge renders without a canonical review row; contract pins it.

### F-021-001 — InventoryGrid counts unknown stock as out-of-stock (high, MAP-021 / MAP-023)
- Evidence (first-hand): `src/views/admin/InventoryGrid.jsx:398-402`
  (`Number(stock_available) || 0`; `stock <= 0 → out++`) vs
  `src/views/admin/Overview.jsx:368-373,438` +
  `src/lib/overviewAvailability.js:40-52` (unknown separated as Unavailable).
  Null/failed reads inflate "out" and understate unknown.
- Command: source read; `npm run test:admin-ui` passes (no unknown-stock case).
- Target vs actual: rulebook §21 (missing is not zero; unknown ≠ out) vs grid
  metrics that overstate stockouts.
- Fix direction: reuse `overviewAvailability` semantics in the grid metrics;
  show Unknown as its own count.
- Acceptance: null-stock products counted as Unknown, never Out; contract pins
  null vs 0 divergence.

### F-023-004 — declarative quantity/money invariants missing (high, MAP-023)
- Evidence: `supabase/migrations/20260803_launch_core_stabilization.sql:300-311`
  has balance CHECKs, but no CHECK pins the `products` mirror
  (`stock_available/total_stock` maintained by trigger clamp `:195-203` and
  per-writer recompute), no `CHECK(line_total = quantity*unit_price)` /
  `CHECK(total = subtotal-discount+shipping)`, FEFO eligibility and reservation
  coverage enforced only procedurally (`K2_RESERVATION_RECONCILIATION_REQUIRED`
  etc. in `20260906_reservation_coverage_guard.sql:42-44`,
  `20260908_payment_balance_integrity.sql:27-38`).
- Command: `Select-String -Path supabase/migrations/*.sql -Pattern "CHECK *\("` enumerates the absence.
- Target vs actual: rulebook §5 (available derived, never negative; one unit
  never double-committed; confirmation proves complete coverage) vs
  trigger+function convention with drift surface between `products` mirror and
  `inventory_balances.available`.
- Fix direction: add CHECKs wherehot (non-negative mirrors, arithmetic
  identities) or a periodic reconciliation guard; at minimum a contract that
  fails if a writer updates batches without recomputing the mirror.
- Acceptance: divergent-mirror regression test fails before/passes after; all
  writer rehearsals still green.

### F-020-002 — Shopee webhook edge gaps (medium, MAP-020)
- Evidence: `supabase/functions/shopee-webhook/index.ts:77` unauthenticated
  GET→200; `:71-73` pre-filter fail-open; `:15-16` `Number('')→0` env parsing
  delegated to config assert. Signature path itself is sound (HMAC-SHA256 over
  `url|rawBytes`, constant-time compare, 401 on fail, `:22-44`; replay window +
  identity in `validation.js:42-54`; conflict/rate-limit mapping `:146-161`).
- Command: `npx playwright test --config=playwright.api.config.js tests/shopee-webhook-boundary.spec.js` (passes — pins the good path, not the three gaps).
- Fix direction: GET→404/405 on the push route; fail closed pre-filter;
  strict env parsing.
- Acceptance: three new boundary contracts (GET denied, no-config push
  refused, malformed env refused).

### F-020-003 — product-media ownership/URL gaps (medium, MAP-020 / MAP-018)
- Evidence: `server/admin-bff/product-media.js:10-21` allows any HTTPS URL;
  `:61` `objectPath===null` skips ownership; `:59-67` ownership is
  `getPublicUrl` equality, not server attestation. Byte-level verification +
  re-encode + 4MB cap exist (`product-intake.js:226-267`) — the gap is
  provenance, not bytes.
- Fix direction: attest ownership server-side (storage metadata / signed
  lookup); reject null-path assignments; allowlist media hosts or require
  uploaded-object references.
- Acceptance: foreign-URL assignment denied; null-path assignment denied;
  contracts pin both.

### F-020-004 — no BFF in-memory rate limiter; DB-budget only (medium, MAP-020)
- Evidence: no limiter in `server/*-bff/`; floods reach RPC cost via
  `mapBoundaryResult` (`server/storefront-bff/supabase.js:17-19`;
  `server/admin-bff/fulfillment.js:123-125`); local `consumeLoginAttempt`
  only (`server/admin-bff/security.js:173-191`).
- Fix direction: add bounded in-memory token buckets in front of the durable
  budgets for public/auth routes (documented as the accepted architecture:
  budgets stay authoritative, limiter is a cost shield).
- Acceptance: flood test shows early 429s without proportional RPC growth.

### F-019-002 — Admin BFF numeric coercion accepts bool/''/[]/null (medium, MAP-019 / MAP-020)
- Evidence (first-hand): `server/admin-bff/coupons.js:27-31`
  (`Number(true)=1`, `Number('')=0`, `Number([])=0`, `Number(null)=0` all pass
  finite+range checks); same helper in `pasabuy.js:29-30`, `lots.js:45`,
  `procurement.js:14`, `product-intake.js:58-59`, `globe-cms.js`,
  `marketplace-snapshots.js`, `overview.js:45`, `security-events.js:30`.
  Storefront strictly rejects bool/null
  (`server/storefront-bff/security.js:166-175`) — inconsistent strictness;
  `delivery/quote.js:23-26` is strict the other way (`Number.isInteger`
  rejects numeric strings).
- Fix direction: single shared numeric validator (reject boolean/null/array,
  accept canonical numbers + numeric strings, or reject strings everywhere —
  one rule); apply to both BFFs.
- Acceptance: `true`/`''`/`[]`/`null` rejected with `REQUEST_INVALID`;
  `guest-commerce-bff-contract.spec.js:386` pattern extended to Admin BFF.

### F-024-002 — duplicate storefront canonicals `/trade` + `/wholesale` (medium, MAP-024)
- Evidence (first-hand): `src/lib/storefrontRoutes.js:8-9,22` (both paths →
  `wholesale`; canonical `VIEW_TO_PATH` is `/trade`; metadata canonicalizes
  the pathname verbatim in `StorefrontMetadata.jsx:59,81`).
- Fix direction: one canonical path with a redirect from the other; canonical
  tag always emits the canonical form.
- Acceptance: both URLs resolve to one canonical; sitemap/discovery contracts
  pin the single canonical.

### F-024-003 — private flows indexable (medium, MAP-024)
- Evidence: `src/components/StorefrontMetadata.jsx:84` — checkout/account/
  messages/confirmation emit `index,follow`; unavailable surfaces correctly
  `noindex`.
- Fix direction: `noindex,nofollow` on all scoped/private routes.
- Acceptance: discovery contract asserts noindex on checkout, account,
  messages, confirmation.

### F-019-003 — misleading customer-facing copy (medium, MAP-019 / MAP-023)
- Evidence (first-hand): `src/views/Wholesale.jsx:220` ("after the email is
  actually sent" shown on the recorded non-email BFF path too);
  `src/views/Contact.jsx:43` ("We reply to every message") vs `:115` ("No
  response time is promised").
- Fix direction: path-conditional wholesale copy; soften Contact to reviewed-
  hours language consistently.
- Acceptance: recorded-path receipt copy never mentions email sending; Contact
  makes one consistent response-time statement.

### F-028-001 — Inbox: truncated counts shown as totals, template clobbers draft, no same-command retry (medium, MAP-019 / MAP-028)
- Evidence: `src/views/admin/Inbox.jsx:539-557` (MetricRail from visible
  conversations while admitting truncation); `:399-404` template overwrites
  typed draft without confirm; `:725` uncertain notice with no Retry button
  (`:429-467` manual resend mints fresh identity); history `:122-128` shows no
  actor; `:203-205` reason required only for resolution changes.
- Command: `npm run test:inbox-ui` 27/27 passes (pins guards, not these gaps).
- Fix direction: label counts as visible-window counts; confirm-before-overwrite
  for templates; expose retained-session retry on uncertain commands; record
  actor on history events.
- Acceptance: new browser cases pin all four.

### F-028-002 — Coupon/Supplier/Photo/Delete/OwnerClose retained-key + reason gaps (medium, MAP-019 / MAP-028 I-002)
- Evidence: insecure transports drop reason (`CouponManager.jsx:88,160-162`,
  `Suppliers.jsx:52`, `PhotoManagerModal.jsx:35-40`); Staff sees
  Activate/Archive with server rejecting only after click
  (`CouponManager.jsx:250` vs `COUPON_ADMIN_REQUIRED`); Archive is single-
  confirm (`:229-230`); `PhotoManagerModal.jsx:128` Discard bypasses
  `closeDisabled`; insecure uncertain `onClose()` discards identity (`:57`);
  3-char reasons for storefront-visible/handover actions
  (`PhotoManagerModal.jsx:69-72`, `OmniOperationsHub.jsx:587,603,629,643`);
  `DeleteProductsModal.jsx:91-94,125-133` uncertain leaves form editable with
  the same requestId (IDEMPOTENCY_CONFLICT risk `:146`);
  `OwnerCountClose.jsx:795,829,854,870,884,912,923,933,947` fresh key per
  click (retention only post-failure via `*_retry`); `adminBffService.js:268`
  mints a fresh key whenever a caller omits one (e.g. `OwnerCountClose:798`,
  `previewCatalogCsvBff:774-777`); Inbox `saveInternalNote/sendReply`
  (`adminBffService.js:463-470`) omit key/session.
- Command: `npm run test:payment-ui` (coupon suite) + `test:inbox-ui` pass —
  they pin the retained paths, not the insecure fallbacks.
- Fix direction: require reason on insecure paths or remove them; pre-click
  Admin-required blockers; strength
...[truncated 8188 chars]