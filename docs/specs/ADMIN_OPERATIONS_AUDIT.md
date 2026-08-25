# K2 Jimzon Admin Operations Audit

Status: dated audit evidence; not an active backlog
Audit date: 2026-08-10
Scope: admin application, operational database migrations, storefront hand-offs, and existing automated tests

All accepted unfinished work from this audit is maintained only in
`MASTER_ACTION_PLAN.md`. Remaining-action text below explains the audit findings
at that date and must not be used as a competing task list.

## Executive conclusion

The admin application now has a production-backed P0 operations foundation.
Authentication, staff-only transitions, product-master editing, exact
consignment scanning, request submission, manual inbox workflow, and the
separate admin production build are real. Marketplace detail/message/waybill
adapters, receiver acceptance, and complete payment evidence remain partial or
deferred.

The initial audit found the same business fact represented differently in
separate modules:

- website orders use `order_requests`, while the Shopee webhook writes directly to legacy `orders`;
- the dashboard reads `products.stock_available`, while controlled inventory uses `inventory_balances` and `product_batches`;
- admin coupons use Supabase, while the storefront coupon flow uses browser storage;
- batch records carry free-text hub, custodian, and channel values instead of stable operational identities;
- the packing scanner marks a whole order line from one SKU scan and may choose the wrong order;
- a custody transfer can move every unit of a SKU instead of a deliberate quantity.

The 2026-08-10 operations and security migrations remediate these P0 paths with
canonical order requests, exact reservations/scans, server coupon validation,
protected custody transitions, and durable connector intake. Remaining
integrations must build on these records rather than recreate parallel order or
stock logic.

## Verification completed

- Admin and storefront production builds: **passed sequentially** on 2026-08-10.
- Admin/storefront deployment-boundary verification: **passed for both separate targets**.
- Focused admin logic regressions: **6 passed**. Import integrity also passed.
- `20260809_operations_hardening.sql` and both `20260810` security follow-ups:
  **passed complete live-schema rollback validation and were applied through the
  Supabase migration system**.
- Full Playwright browser/contract suite: **48 passed**, including the production
  permission boundary and deprecated-RPC lockdown contracts.
- Production postflight: all required functions/tables exist, RLS is enabled on
  new event tables, `orders.sku` references current `products`, all eight orders
  remain, and no order SKU is orphaned.
- Supabase security advisor postflight: **zero errors**. Four anonymous warnings
  are the reviewed public order/Pasabuy/coupon endpoints; every other anonymous
  security-definer RPC is blocked. Authenticated staff RPCs are internally
  staff-guarded or deliberately self-scoped, with zero unclassified functions.

## Remediation package status

The following P0 corrections are implemented and production-live:

- order product foreign-key repair (`products_old` → current `products`);
- exact eligible-lot reservation, unit packing scans, and exact fulfillment;
- non-destructive batch reconciliation and partial lot custody transfer;
- multi-box/multi-lot repeated SKU flight manifests;
- server-backed storefront coupon validation and confirmation-time redemption;
- actual courier quote, customer confirmation, tracking, and waybill fields;
- durable idempotent channel event intake without placeholder orders.

The owner explicitly approved the production migration on 2026-08-10. It was
applied atomically after a read-only preflight and followed by two separately
rollback-validated security migrations. No existing order or product row was
deleted.

## Status legend

- **Backed** — persisted in Supabase with a meaningful server-side rule.
- **Partial** — useful real behavior exists, but the workflow is incomplete or has unsafe gaps.
- **Broken** — the visible feature is disconnected from the intended operational result.
- **Deferred** — truthfully unavailable until an external dependency or API is provided.

## Capability matrix

| Area | Status | Current truth | Required correction |
|---|---|---|---|
| Admin authentication | Backed | Supabase password/Google auth, staff role check, optional TOTP | Require MFA for privileged roles before launch; test OAuth redirects and role revocation |
| Staff roles | Partial | Admin/Staff/Customer and final-admin protection exist | Add capability-level permissions and deactivation; do not give all Staff financial/catalog powers |
| Product master | Partial | Database-backed edits and audit logs exist | Add publish-readiness rules, canonical category/brand/supplier IDs, validation, and error-safe saves |
| Bulk CSV import | Partial | Insert-only drafts; stock intentionally excluded | Add complete preview, row validation, per-row error report, import batch ID, and idempotency |
| AI product helper | Partial | Honest copy/paste research workflow | Store sources/evidence and human approval; keep automatic research disabled until server-backed |
| Inventory balance | Backed foundation | Exact batch quantities, reservations, disposition, clearance, custody, and immutable changes are enforced | Replace remaining free-text dimensions with canonical IDs |
| Batch editor | Current data clean; secure correction prepared | Preserves lot IDs and prevents destructive omission; 21 live lots pass aggregate integrity checks; inactive signed BFF and rollback rehearsal now prove reserved availability, expiry/clearance derivation, reasoned audit, exact retry, and corrected views | Apply only in coordinated Admin cutover; run deployed denial and fulfillment/custody regression tests, richer disposition evidence, and representative staff acceptance |
| Custody transfer | Partial | Exact source lot and quantity transfer with immutable history are live | Add receiver acceptance/rejection |
| Flight consignment | Backed foundation; secure cutover prepared | Flight, box, batch, repeated-SKU lines, Milan/Manila exact scans, discrepancy review, and controlled completion are live; an inactive signed BFF now verifies barcode-to-line scans, durable retry, state reasons, and atomic finalization | Activate only after the coordinated security cutover; add damage, unexpected/wrong-item, expiry, quarantine, and correction-evidence paths |
| Website order request | Backed foundation | Server-priced submission, coupon snapshot/redemption, delivery quotation, reservation, cancellation, packing, and fulfillment are live | Add complete payment-evidence records and customer order detail |
| Packing | Backed | Operator selects the exact order, then records one immutable scan per unit | Add optional waybill/packing QR hardware runbook |
| Fulfillment/FEFO | Backed | Confirmation reserves eligible exact lots and fulfillment consumes those reservations | Add broader exception recovery and receiver evidence |
| Payment tracking | Partial | Manual statuses and events exist | Add payment evidence record, amount/method/reference/proof, verifier identity, and separation of duties |
| Coupons | Backed | Storefront validation and confirmation-time redemption use the database contract | Add campaign reporting and customer eligibility rules only when approved |
| Pasabuy | Partial | Requests, quote versions, estimates, and state transitions exist | Separate request, quote acceptance, purchase, shipment, receipt, settlement, and refund records |
| Unified inbox | Partial, strongest module | Internal notes, assignment, SLA, unread state, and immutable events exist | Add real channel ingestion/sending, identity matching, attachments, delivery evidence, and retry handling |
| Customer directory | Partial | Excludes staff and distinguishes Customer/VIP records | Model cross-channel identities and show order/conversation/value history |
| Suppliers and POs | Partial | Basic supplier create and PO reading exist | Add purchasing workflow, receiving links, actual costs, terms, performance, and audit events |
| Channel readiness | Partial | Connections and draft-readiness view exist | Add listing creation/editing and channel-specific validations; never equate webhook receipt with operational readiness |
| Shopee connector | Partial, Events only | Signed events enter a durable idempotent inbox and never create placeholder orders | Add approved order-detail fetch, retries/dead letters, and canonical conversion |
| TikTok/Lazada connectors | Deferred | Seller Center/manual operations only | Implement adapters only after canonical order, listing, inventory, and message contracts exist |
| Waybills | Deferred | Internal packing slip is labeled honestly | Add courier/channel document adapters when APIs or approved files are available |
| Globe/review CMS | Partial | Database-backed, protected by the shared admin boundary, and no duplicate login UI | Add moderation/publication state and review provenance |
| Dashboard analytics | Partial | Uses real queries and reports empty/error states without fabricated fallbacks | Unify remaining canonical sources/timezone, define every KPI, and add record-level drilldowns |

## P0 defects remediated on 2026-08-10

### P0 — production-backed corrections

1. Marketplace events now enter an idempotent channel inbox before canonical conversion; connectors cannot create placeholder legacy orders.
2. Packing is order-first and records one immutable scan for each exact unit.
3. Custody transfers require an exact source lot, quantity, destination, reason, and initiator. Receiver acceptance remains P1.
4. Expired, damaged, quarantined, missing, and short-life-unapproved lots are excluded from sellable FEFO stock.
5. Coupons validate in Supabase, snapshot on the request, and redeem atomically during confirmation.
6. Batch reconciliation preserves identity and immutable reasoned history.
7. Failed consignment finalization remains open and shows the server error.
8. Dashboard failures and empty data remain distinct; fabricated fallbacks were removed.

### P1 — complete the core operating workflows

1. Add order detail, payment evidence, confirmation, cancellation, packing, handover, fulfillment, and timeline controls to the fulfillment workspace.
2. Redesign the consignment manifest around flight → box → item/batch → scans → reconciliation → accepted inventory; add manifest history and next-flight creation.
3. Separate Pasabuy entities and state machines so a request cannot become approved or purchased without the appropriate accepted quote and evidence.
4. Create canonical locations, staff/custodians, stock lots, channel reservations, and transfer records using IDs rather than free text.
5. Add product publication readiness and make `status` the single publication source; retire or derive the separate `published` boolean.
6. Add actual landed-cost capture and reconciliation without overwriting the original estimate.
7. Build a real listing workbench before enabling marketplace publication or stock synchronization.
8. Filter customer records correctly and introduce cross-channel customer identities.

### P2 — integration and decision support

1. Add the connector platform: encrypted server-side credentials, raw events, idempotency keys, sync jobs, retries, dead-letter queue, rate limits, and health checks.
2. Implement one marketplace adapter at a time, starting with the channel whose official API access is approved first.
3. Add inbound/outbound message adapters with delivery truth; retain manual-copy mode until a connector confirms delivery.
4. Add waybill/document adapters and printer-friendly mobile flows.
5. Rebuild dashboard KPIs from canonical records with explicit formula, time window, timezone, freshness, owner, error state, and drilldown.
6. Add returns, refunds, failed delivery, exchanges, partial fulfillment, and stock disposition workflows.

## Canonical operating model

The following records must remain separate even when the interface shows them together:

1. **Demand** — customer order request or Pasabuy request.
2. **Commercial agreement** — accepted quote, prices, discounts, shipping charge, and payment terms.
3. **Supply commitment** — purchase order or marketplace/source purchase.
4. **Physical shipment** — flight, consignment, box, manifest lines, and scan events.
5. **Inventory lot** — SKU, batch/lot, expiry, location, custodian, condition, and quantity buckets.
6. **Fulfillment** — order allocation, picked/scanned units, package, waybill, handover, and delivery.
7. **Settlement** — payment evidence, verification, refund, supplier actuals, landed cost, and margin.
8. **Communication** — channel conversation, messages, internal notes, delivery state, and identity link.

No status on one record should silently pretend that a different record exists. For example, `purchased` is not `in_transit`, `arrived` is not accepted inventory, and `copied reply` is not delivered message.

## Required state machines

### Consignment

`draft → packing_italy → sealed → in_transit → arrived_manila → receiving → reconciled → completed`

Side states: `on_hold`, `cancelled`. Discrepancies are classified per line as shortage, overage, wrong SKU, damaged, expired/too-short shelf life, or unmanifested. Corrections are new events; scans are never deleted.

### Canonical order

`submitted → confirmed → allocated → picking → packed → ready_for_handover → handed_over → delivered`

Side states: `on_hold`, `cancelled`, `partially_fulfilled`, `failed_delivery`, `returned`, `refunded`. Payment state remains separate.

### Payment

`not_requested → awaiting_payment → evidence_submitted → verified | failed → partially_refunded | refunded`

Evidence includes method, amount, currency, reference, proof file, payer, submitted time, verifier, verified time, and reason. Until a gateway exists, verification remains a manual staff action and is labeled as such.

### Pasabuy

Request: `received → needs_information | researching → quote_ready → quote_sent → accepted | declined | expired`

Purchase: `approved_for_purchase → purchasing → purchased | unavailable | substitution_required`

Shipment/receipt: `awaiting_consolidation → packed → in_transit → arrived → reconciled → ready_for_delivery → delivered`

Payment and settlement remain separate. Quote versions are immutable; one version is explicitly accepted.

### Inventory transfer

`draft → offered → accepted | rejected → completed`

Stock becomes `in_transfer` after offer and changes custody only on acceptance. Cancellation and expiry return it to the prior available bucket.

## Non-negotiable invariants

- Available stock is derived; staff cannot type it directly.
- `available = on_hand - reserved - damaged - expired - quarantined - missing - in_transfer` and never falls below zero.
- One physical unit cannot be reserved, transferred, and fulfilled at the same time.
- Expired/damaged/quarantined lots are never selected by FEFO.
- Every stock mutation records actor, time, reason code, quantity delta, source, destination, related record, and before/after balance.
- Every connector event has a unique channel + external event/order key and is safe to replay.
- A webhook is acknowledged only after durable capture; processing can retry independently.
- A channel is “connected” only after authentication and a verified API operation; it is “healthy” only while recent syncs succeed.
- Payment evidence submission and payment verification are distinct events.
- Coupon redemption and stock reservation occur in the same order-confirmation transaction.
- One scan changes only the explicitly selected operational record and quantity.
- A UI must not show success unless the database returns success.
- Empty data, loading, stale data, and query failure are visibly different states.
- Destructive or bulk actions require preview, impact count, confirmation, and reason.

## Dashboard KPI contract

Every KPI must define:

- business question and owner;
- canonical table/view and formula;
- included/excluded statuses;
- currency and timezone (`Asia/Manila` unless explicitly changed);
- time window and comparison window;
- last-refreshed time;
- loading, empty, stale, and error behavior;
- click-through destination with the exact source records and filter.

Initial dashboard groups should be:

1. **Today:** verified revenue, confirmed orders, units fulfilled, and manual payment exceptions.
2. **Act now:** overdue conversations, unconfirmed orders, packing mismatches, consignment discrepancies, expired/quarantined stock, and connector failures.
3. **Inventory:** available, reserved, in transit, expiring, damaged, missing, and stockout risk by location/channel.
4. **Channels:** captured orders, fulfilled orders, verified revenue, cancellations/returns, listing errors, and last successful sync.
5. **Pasabuy:** requests awaiting action, quote acceptance, purchasing exceptions, in-transit value, actual-versus-estimated landed cost, and settlement backlog.

## Test plan and release gates

### Database contract tests

- Replay the same marketplace event twice; only one canonical order exists.
- Concurrent confirmations cannot over-reserve a SKU.
- Coupon limits and redemption remain correct under concurrent confirmation.
- Expired/damaged/quarantined lots cannot be reserved or fulfilled.
- FEFO chooses the earliest eligible lot, not merely the earliest date.
- Partial custody transfers conserve total units and require acceptance.
- Consignment reconciliation supports repeated SKUs across boxes and records all discrepancies.
- A failed transaction leaves balances, lots, and statuses unchanged.
- Role/capability tests prove Staff cannot perform admin-only financial/security actions.

### Admin browser journeys

- Admin and Staff login, MFA, logout, expired session, demotion, and no-role denial.
- Create draft SKU → validate → publish → unlist without stock editing.
- Create flight → scan Milan → seal → arrive → scan Manila → reconcile → inspect inventory events.
- Submit order → validate coupon → confirm/reserve → verify manual payment → pack exact quantities → fulfill.
- Pasabuy request → sourced quote versions → send/accept → purchase → shipment → receipt → settlement.
- Inbox assignment, overdue SLA, internal note, external-send fallback, and immutable history.
- Mobile camera permissions, scan debounce, offline/network failure, retry, and no double submission.
- Desktop/mobile layouts with no hidden destructive action and no horizontal page overflow.

### Deployment and data gates

- Separate admin and storefront builds and production projects remain mandatory.
- Admin production host must not serve storefront routes/assets beyond shared libraries required by the admin bundle.
- Production schema preflight reports every required table, column, function, trigger, policy, view, and grant.
- A read-only production data health report checks negative balances, bucket mismatches, duplicate external keys, orphaned lines, stale open work, and invalid states.
- Backup/restore drill and rollback migration are documented before operational migrations run.

## Implementation sequence

### Phase A — freeze and contracts

- Mark unsafe controls as unavailable or add confirmation guards.
- Remove fabricated dashboard fallback metrics.
- Add database preflight and failing tests for all P0 invariants.
- Freeze the stale historical blueprints; point contributors to this audit and `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md`.

### Phase B — operational foundation

- Add canonical location, staff/custodian, inventory lot, lot balance, transfer, channel event, canonical order, payment evidence, and coupon-redemption records.
- Provide additive compatibility views/adapters so existing storefront behavior does not break.
- Implement all mutations as narrow server functions with immutable events.

### Phase C — receiving and inventory

- Rebuild flight/box/manifest-line relationships without deleting the existing scan history.
- Add controlled corrections and discrepancy dispositions.
- Replace batch replace-all and all-unit transfers.

### Phase D — orders, coupons, payments, fulfillment

- Connect storefront checkout to canonical coupon validation and order snapshotting.
- Build the order-first packing workspace and eligible-lot FEFO allocation.
- Add manual payment evidence and full fulfillment timeline.

### Phase E — Pasabuy

- Split request, quote, approval, purchase, shipment, receipt, and settlement.
- Store estimated and actual landed cost separately and report variance.

### Phase F — channels and messages

- Implement connector infrastructure and one approved marketplace adapter.
- Add listings, stock sync, order capture, messages, waybills, retry, and health reporting incrementally.

### Phase G — dashboard and launch proof

- Rebuild analytics on canonical views.
- Complete integration/browser tests, production preflight, staff acceptance tests, and runbooks.

## Decisions requiring owner confirmation

The owner questionnaire is maintained in `K2 Jimzon - Brain/OWNER_QUESTIONS.md`. It currently has no unresolved questions required for admin hardening. Technical safety and architecture choices are not sent to the owner for approval.

Confirmed requirements and engineering decisions:

1. **Packing:** open/scan the order or waybill first, then scan exact item quantities. A direct website order uses a K2 packing QR until courier booking creates the delivery waybill.
2. **Consignment identity:** the same SKU may appear in multiple boxes, lots, or expiry batches on one flight. Manifest identity must retain the box and batch context.
3. **Custody:** transfers must specify an exact quantity instead of moving every unit of a SKU. Receiver confirmation is a safe custody-control default, not a business-policy question.
4. **Shelf life:** use a configurable 90-day minimum for ordinary sale; 31–89 days requires an approved disclosed clearance path; 0–30 days, expired stock, and unknown dates on expiry-tracked items are not sellable.
5. **Delivery charges:** use the charge supplied by each marketplace; direct and Pasabuy delivery uses a communicated courier quote confirmed by the customer.
6. **Customer exceptions:** cancellations, returns, exchanges, refunds, and failed deliveries are case-by-case workflows backed by communication, evidence, an authorized decision, and a recorded outcome.
7. **Pasabuy price:** never auto-approve a fixed markup or margin. Show cost components, then record the owner's manually chosen final quote and rationale for that request.

## Documentation cleanup

- `SYSTEM_LOGIC_BLUEPRINT.md` contains obsolete prototype behavior and must be labeled historical, not operational truth.
- `PRE_DEPLOYMENT_TODO.md` is labeled as a historical July 2026 checklist.
- `IMPROVEMENT_ROADMAP.md` is labeled as a historical planning snapshot.
- `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md` remains the living system summary, but it should only be updated after a feature is implemented and verified.
- `MASTER_ACTION_PLAN.md` owns the only active backlog. This audit remains evidence
  of the 2026-08-10 assessment and must not receive new action items.
