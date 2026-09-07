# Marketplace snapshot staging and Owner Close runbook

**Owner:** MAP-023, with aliases/coverage/rebalancing owned by MAP-026  
**Prepared:** 31 August 2026  
**Current state:** locally implemented and rehearsed; inactive, unapplied, and
not provider-verified

## Operational-readiness evidence refresh — 7 September 2026

The portable PostgreSQL rehearsal passed sequentially after the last-unit
rehearsal: bootstrap, preflight, migration, migration replay, exact-shop
staging/order behavior, duplicate and changed-payload conflict handling,
Owner Count & Close checkpoints, postflight, and non-destructive rollback.
Rollback revoked the prepared entry points while preserving staged evidence.
This is an isolated local rehearsal using synthetic fixtures, not a production
database apply, provider export, connector receipt, settlement, or channel
activation.

The Admin workflow requires the saved shop UUID in the close session and checks
the provider/shop pairing before staging. Reported marketplace quantity remains
an observation and never changes canonical lots or stock. Shopee event capture
does not become order ingestion; Lazada, TikTok, social messaging, outbound
listing/publication and stock synchronization remain unavailable. Exact real
shop exports, provider dictionaries, retention approval, authenticated staff
acceptance, and the coordinated production migration/rollback window remain
required before activation.

The final focused local evidence passed 86/86 API/contract checks and the
Owner Count & Close browser check 1/1. The separate Admin and Storefront builds
passed their local boundary, budget and secret checks. This does not establish
provider receipts, real-export acceptance, production migration state, or an
active connector.

Session audit: the separate vocabulary rehearsal now passes 13 checks and
requires exact denial errors. Its external-item index is scoped to shop ID;
equal external item IDs across different shops are valid. The former test's
cross-shop uniqueness claim was inaccurate. Listing staging is scoped to
provider/shop; order imports additionally reference the saved close session.

## Purpose and truth boundary

This slice accepts bounded customer-free listing and order snapshots for one
exact marketplace shop. It preserves source evidence, proposes product matches,
records Admin human decisions, deduplicates order lines across imports, derives
versioned fee estimates, records physical reviews through the canonical lot
command, proposes exact-shop coverage, records customer-minimized Pasabuy
readiness, and seals a customer-free bookkeeping handoff. It is not a provider
connector, settlement, official accounting close, or automatic stock import.

Reported marketplace quantity is an observation. It cannot create or change a
lot, custody, reservation, `product_batches`, Master Inventory, publication, or
provider availability. Any accepted physical correction continues through the
existing reasoned lot-reconciliation boundary.

## Prepared artifacts

- Parser and BFF handlers: `server/admin-bff/marketplace-snapshots.js`
- Routes: `prepared-api/admin/marketplace-snapshots/{stage,decision,status}.js`,
  `prepared-api/admin/marketplace-orders/{stage,status}.js`, and
  `prepared-api/admin/owner-close/{session,fees,stock,coverage,pasabuy,bookkeeping}.js`
- Migration: `supabase/migrations/20260831_marketplace_snapshot_staging.sql`
- Preflight/postflight/rollback:
  `supabase/marketplace_snapshot_staging_{preflight,postflight,rollback}.sql`
- Synthetic fixtures: `tests/fixtures/marketplace-snapshots/` and
  `tests/fixtures/marketplace-orders/`
- Source/math contracts: `tests/marketplace-snapshot-contract.spec.js`,
  `tests/marketplace-order-contract.spec.js`,
  `tests/marketplace-fee-estimate-contract.spec.js`,
  `tests/marketplace-stock-count-contract.spec.js`,
  `tests/marketplace-coverage-contract.spec.js`,
  `tests/owner-close-pasabuy-contract.spec.js`, and
  `tests/owner-close-bookkeeping-contract.spec.js`
- Phone workspace: `src/views/admin/OwnerCountClose.jsx` and
  `src/views/admin/ownerCountCloseModel.js`
- Phone source/rendered contracts: `tests/owner-count-close-contract.spec.js`
  and `tests/owner-count-close-ui.spec.js`
- Review-only coverage model and contract: `src/lib/marketplaceCoverage.js` and
  `tests/marketplace-coverage-contract.spec.js`
- Integer-minor-unit fee model: `src/lib/marketplaceFeeEstimate.js`
- Exact-lot review and formula-safe handoff models:
  `src/lib/ownerCloseStockReview.js` and
  `src/lib/ownerCloseBookkeepingHandoff.js`
- Isolated database rehearsal:
  `scripts/rehearse-marketplace-snapshot-portable.mjs` and
  `supabase/tests/marketplace_snapshot_staging_{bootstrap,assertions}.sql`

The fixed CSV schema versions are `k2.marketplace-snapshot.v1` and
`k2.marketplace-orders.v1`. Header order and field meaning live in the operations
rulebook and connector specification. A header-only order file is valid reviewed
zero-sales evidence; it is not inferred from an absent file.

## Authorization and command behavior

- Snapshot stage/status: authenticated Staff or Admin with AAL2 through the
  same-origin Admin BFF.
- Product decision and Owner Close save/read: Admin with AAL2.
- Every state-changing request requires Origin/CSRF checks, a signed server
  command, bounded payload, reason, nonce, idempotency key, and durable receipt.
- An exact idempotency replay returns the prior result. Changed payload under the
  same key conflicts. Reusing a shop/source identity with the same content hash
  returns the prior import; changing its hash conflicts.
- Product linking accepts only an eligible suggestion stored with the staged
  row. A reviewed new product receives `generate_k2_sku_internal()` output and
  remains Draft/unpublished. Unresolved rows remain immutable evidence.
- Close sessions use explicit shop IDs, `Asia/Manila`, and optimistic versions;
  a stale save conflicts.
- Order identity is exact shop + external order + external line. Cross-import
  exact payloads become duplicates and changed payloads become conflicts before
  stored import totals are recomputed.
- Fee saves are Admin/AAL2 signed commands. They require a named reviewed policy
  and reason, derive values from the latest immutable import's accepted/linked
  facts, block current conflict or unresolved evidence, preserve older import
  evidence, and preserve monotonic estimate versions. Their four
  truth flags deny settlement, official books, tax filing, and actual-profit
  authority.
- Stock review completes only when the physical total equals the current
  canonical exact-lot sum. Discrepancies first use `/api/admin/lots/reconcile`;
  this migration contains no `product_batches` DML.
- Coverage is proposal-only. Reasoned include/thin/skip overrides perform no
  provider write or custody transfer.
- Pasabuy input omits customer identity/contact fields, and readiness cannot
  change canonical request status.
- Bookkeeping completion derives blockers server-side, seals one private fixed-
  schema customer-minimized artifact/event, and marks only the session
  Completed. The CSV is formula-safe and remains estimate-only.

## Local verification

Run from the repository root:

```powershell
npx.cmd playwright test --config=playwright.api.config.js tests/marketplace-snapshot-contract.spec.js
npm.cmd run test:marketplace-orders
npm.cmd run test:marketplace-fees
npx.cmd playwright test --config=playwright.api.config.js tests/marketplace-stock-count-contract.spec.js tests/marketplace-coverage-contract.spec.js tests/owner-close-pasabuy-contract.spec.js tests/owner-close-bookkeeping-contract.spec.js tests/owner-count-close-contract.spec.js
npm.cmd run test:owner-count-close-ui
npm.cmd run test:marketplace-coverage
npm.cmd run rehearse:marketplace-snapshots
npm.cmd run check:imports
npm.cmd run verify:admin-bff
npm.cmd run security:surfaces
```

The portable rehearsal creates and removes a disposable localhost database. A
pass proves SQL compilation/replay, request signatures, private-table access,
receipt replay/conflict, human decisions, server Draft SKU, close-session version
conflict, cross-import order deduplication, latest-import fee
blocking/arithmetic/versioning, matched/reconciled/zero-lot stock reviews,
customer-minimized Pasabuy readiness, blocker-free handoff completion,
postflight, rollback, retained evidence, and an unchanged
`product_batches` sentinel. It does not prove production or provider behavior.
The rendered journey uses a mocked same-origin secure Admin BFF and proves all
nine rails through a sealed handoff at 375×812 plus 812×375
reduced-motion overflow and touch-target checks. Its portrait render was visually
reviewed. It is not real-export, physical-device, real screen-reader, deployed-
host, provider-policy, settlement, accounting, or staff-acceptance evidence.

The coverage read uses canonical `inventory_balances.available`, latest retained
observations, and only confirmed/fulfilled period sales. Admin include/skip
overrides require a 10–500 character reason and append an immutable before/after
event. Coverage output is proposal-only: it cannot write marketplace availability,
move custody, or reconcile a physical lot. The phone step is exposed only after
the physical-count/reconciliation checkpoint.

## Activation gates

Do not apply the migration or enable routes until the owning MAP item records all
of the following evidence:

1. one current redacted representative export for every real seller shop, or
   approved current provider documentation;
2. a reviewed versioned provider-to-v1 dictionary for each export shape,
   including timestamps, listing states, prices, quantities, and missing values;
3. customer-data minimization and fixture retention approval;
4. real-export mapping rehearsals for duplicates, changed evidence, variant
   conflicts, stale observations, and recovery;
5. production backup, preflight, coordinated migration/route flag plan, deployed
   role/CSRF/signature denials, and monitored rollback window;
6. representative phone and laptop acceptance for interrupted, offline,
   conflict, ambiguous-timeout, unresolved, and recovery journeys.

Provider credentials remain service-only and are not part of CSV activation.
Never place them in browser code or `VITE_` variables.

## Recovery

For a prepared or partially activated backend boundary, run the reviewed
`supabase/marketplace_snapshot_staging_rollback.sql`. It revokes the command and
read entry points but deliberately preserves private imports, rows, decisions,
events, aliases, observations, order facts, fee versions, stock/Pasabuy reviews,
coverage overrides, handoff artifacts, and close sessions for diagnosis and
retry. Do not drop those records as a routine rollback.

If synthetic fixtures become misleading, remove only
`tests/fixtures/marketplace-snapshots/`, `tests/fixtures/marketplace-orders/`, and
their focused test references. They contain no production/provider state. Record
every remaining blocker and exact next action in MAP-023; this runbook is not a
separate backlog.
