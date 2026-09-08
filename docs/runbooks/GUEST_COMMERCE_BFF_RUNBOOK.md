# Guest Commerce BFF Activation Runbook

## Checkout delivery commitment — I-003, prepared 8 September

Checkout keeps the manual delivery-approval model. It no longer mounts the
standalone DeliveryEstimate pilot or adds its unpersisted quote to the products
total. The new contract failed against the old total, then all 15 selected
operations/delivery contracts passed. The Storefront build passed its security,
artifact and budget checks. The phone request → confirmation → reload/back/
forward browser journey passes after waiting for the lazy checkout heading.
Target-host acceptance remains I-003. Do not enable the fee pilot before the order endpoint validates
and stores accepted locality, rate version and amount and both receipt/Admin
projections show the same values. Recovery checkpoint:
`docs/design-checkpoints/20260908-checkout-delivery/`.

## Reconciliation locking — prepared 8 September continuation

MAP-023 / I-001 H-020. `npm run rehearse:purchase-hold -- --baseline-reconciliation`
reproduced a deadlock between the actual purchase and recount functions: recount
held product while purchase held inventory and needed a product FK lock (22/24
properties at reproduction). `20260908_reconciliation_lock_order.sql` patches
the installed recount to acquire balance → existing batches by ID → product,
rejects unexpected source shape, and preserves existing grants and count/audit
logic. Missing balances initialize reserved as well as physical quantity from
existing lot counters; new-product first counts remain supported.

`npm run rehearse:purchase-hold` now passes 28/28 including both purchase/recount
and clearance/recount races, quarantine sellable-stock exclusion with holds
retained, rejection of removed lots/below-hold counts, first-count and missing-
balance behavior, migration replay and captured function/ACL recovery. Final
prebuild and 66 tests across purchase-time-reservation, admin-bff-contract and
security-surface-inventory pass using `playwright.api.config.js`.

No production apply occurred. Before future application, satisfy MAP-017/OWNER-005
and I-001's remaining writer/lifecycle gates, capture exact installed recount
definition/owner/ACL, and preserve that recovery receipt. Recovery restores the
reviewed capture rather than a base migration and never deletes stock or audit
rows. Pause affected writes and reconcile uncertain command receipts before
restoration; the deadlocking baseline is not an approved operating fallback.
Remaining custody/receiving/channel and signed lifecycle work stays in I-001.

## Payment balance integrity — prepared 8 September continuation

MAP-023 / MAP-028 I-001, existing IDEA-20260908-01. The new migration
`20260908_payment_balance_integrity.sql` follows the 6 September evidence-recovery
migration. It patches only the installed payment stock gate, preserves grants,
rejects unexpected function shape, locks balances in SKU order before allocation/
batch rows, and refuses missing/null/under-reserved/overdrawn balances. It neither
repairs counters nor changes deduction timing. Refund recording bypasses this
new-stock gate, retaining exception recovery.

Fresh local evidence:

- `npm run rehearse:payment-recovery -- --baseline-balance` reproduces acceptance
  of evidence with a missing balance (the same SQL case failed before the patch).
- `npm run rehearse:payment-recovery -- --baseline-balance-lock` fails because
  the old function accepts a signed review during an inconsistent balance write.
- `npm run rehearse:payment-recovery` passes ten denied balance/state combinations,
  unchanged denial history, refund recovery, concurrent balance-change denial
  without a payment/success receipt, existing signed payment/packing replay and
  concurrent independent-review checks. Double apply and captured-definition/ACL
  restoration/reapply also pass.
- `npm run prebuild` and the 63 focused tests in `payment-recovery.spec.js`,
  `packing-lot-proof.spec.js`, `admin-bff-contract.spec.js` and
  `security-surface-inventory.spec.js` pass using `playwright.api.config.js`.

The SQL fixture extends only its dedicated disposable loopback database.
No provider application occurred. Activation still requires MAP-017/OWNER-005
and the full I-001 lifecycle gate. Capture exact installed function/owner/ACL
before any future apply; rollback uses that reviewed capture, not the historical
base migration. Pause affected payment writes and reconcile state/receipts before
restoration; retain audit records and never blindly retry an ambiguous command.
Next engineering action: reproduce purchase versus reconciliation lock inversion
identified in I-001, then compose the remaining writer and commitment lifecycle.

## Purchase hold lock order — prepared 8 September 2026

MAP-023 / MAP-028 I-001 H-020, IDEA-20260908-01. The existing helper could
deadlock on A/B versus B/A baskets while inserting/checking balance conflicts.
`npm run rehearse:purchase-hold -- --baseline-lock-order` reproduced the deadlock
and incomplete totals (17/19). The fixture delays reservation inserts to expose
the competing transactions; it never contacts a provider.

`20260908_purchase_hold_lock_order.sql` requires the purchase helper and the
6 September coverage guard. It rejects unexpected function text and patches only
balance initialization/locking and line order. Balances are initialized and
locked by SKU before any new lot allocation; FEFO, canonical counters, coverage
and RPC grants remain intact. `npm run rehearse:purchase-hold` passes 22/22 with
the correction installed before all operational tests, double application, exact
opposing-basket lot/balance/catalog/event totals, replay, and captured-definition/
ACL recovery. `npm run rehearse:payment-recovery` separately passes signed payment
and packing assertions. Twenty-four focused API/inventory/CI contracts and final
`npm run prebuild` pass. No complete signed inventory lifecycle is claimed.

Activation remains gated by MAP-017/OWNER-005 and I-001's full lifecycle/all-writer
checks. Before any future apply, capture the exact installed helper definition,
owner and ACL in the approved recovery artifacts. The local runner demonstrates
restoring its captured definition with unchanged ACL and inventory, then reapplying.
Do not blindly reinstall the old base migration: that would discard the coverage
guard. On an operational incident, pause affected writes and reconcile receipts,
reservations and events before any reviewed function restoration; the original
deadlocking function is not an accepted operating fallback. Next engineering work
is the remaining writer lock audit and confirmation/payment commitment lifecycle
under I-001. This migration has not been applied to production.

## Handover coverage — prepared 6 September 2026

MAP-023 H-023: the old function accepted confirmed/paid orders with no allocated
stock. `node scripts/rehearse-purchase-time-reservation.mjs --baseline-handover`
reproduced that failure. `20260906_handover_coverage.sql` patches the installed
function with complete packed-line coverage, ordered locks, stock eligibility
and counter checks, and captures active IDs before changing their state so
released historical allocations do not enter deduction totals. Existing ACLs
are preserved. Unexpected installed function shape aborts application.

The normal runner passes 17/17 properties after double application. Its
`supabase/tests/handover_coverage.sql` proves purchase/confirm/exact packing/
handover, missing/unpacked refusal, counter rollback, exact lot/balance/catalog
stock, historical release preservation and replay. Payment is seeded in this
fixture, not falsely represented as an end-to-end financial transaction.
Signed payment and packing are tested separately by the payment runner.

This correction keeps the existing handover-time deduction; OWNER-002 requires
confirmation/payment-time deduction and remains unfinished. H-020 common locks
across all writers and signed full-lifecycle acceptance also remain open.
Apply only after those and MAP-017/OWNER-005, with coordinated secure fulfillment
cutover. No production action occurred. For recovery, pause fulfillment, inspect
the command receipt, exact reservation/lot state and immutable events before
retry; retain history and never blindly repeat deduction with a new key.

## Reservation completeness — prepared 6 September 2026

`20260906_reservation_coverage_guard.sql` patches the installed reserve helper's
existing-active-row shortcut. It refuses partial, expired, orphaned or ineligible
allocations and insufficient lot/balance counters; it does not silently allocate
replacement stock. Apply only after the purchase-time helper; unexpected helper
shape refuses installation, and existing ACLs are preserved. Staff must reconcile
the order's exact allocations before confirming again. `--baseline-coverage`
reproduced `Partial reservation coverage was confirmed`. With the correction
installed before the existing regression cases, `npm run rehearse:purchase-hold`
passes 15/15 properties including complete-hold replay and both last-unit races.
The partial/expired refusals leave request status and legacy order rows unchanged.
This is local prepared evidence only. Recovery before apply is to remove the
prepared guard; after apply, preserve the guard while reconciling actual stock,
never bypass it to force confirmation. Full operational deduction and handover
remain H-023 gates.

## Atomic purchase-hold expiry — prepared 6 September 2026

MAP-023 H-019/H-021: `20260906_atomic_order_hold_expiry.sql` replaces the existing
sweep without changing its signature or ACL. Only submitted unpaid/failed
orders with a known due deadline and no packed units qualify. Confirmed,
verified, evidence-pending, packed and unknown-deadline commitments stay intact.
Selection locks orders first, then all affected balances in SKU order,
reservations and batches. Eligibility is re-read after reservation locks so an
extension that committed during the wait is not ignored. The limit counts
complete orders; returned count/IDs still describe released reservation rows.
One due line releases the eligible order's complete active allocation,
including a later-deadline sibling, avoiding partial order coverage.

Release refuses missing/insufficient balance or lot counters, appends inventory
events and recomputes the sellable catalog projection with existing shelf-life
rules. It never claims released physical stock is necessarily sellable.
The staff notice now describes a bounded batch and asks staff to review the
remaining queue. There is still no automatic scheduled release service.

Evidence: `node scripts/rehearse-purchase-time-reservation.mjs --baseline-expiry`
reproduced `Expiry released confirmed stock`. The corrected
`npm run rehearse:purchase-hold` passes 14/14 composed properties, including
protected commitments, mixed deadlines/limit 1, replay, public-stock refresh,
event attribution and full rollback for bad balance/lot counters. Forty focused
purchase-policy/payment/retry contracts pass. This fixture owns only loopback
port 54331 and `k2_purchase_hold_rehearsal`; no production connection occurred.

Activation requires MAP-017/OWNER-005, the existing operational/expiry/purchase
and cancellation migrations and composed deployment acceptance. Preserve exact
prior function definition/ACL before apply. On a mismatch or uncertain command,
stop release, retain evidence and reconcile counters; do not rerun blindly or
clamp them. Before apply, remove only this prepared correction to recover the
prior local behavior. After apply, disable release while recovering; restoring
the known unsafe sweep is not a safe operating fallback. H-019/H-020/H-023 still
own confirmation-time deduction, reserve completeness, extension/cancellation
and cross-operation locking races, payment/packing/handover composition and
real-host acceptance. This correction contains expiry risk, not full OWNER-002
lifecycle implementation.

## Purchase-hold cancellation correction — local only, 5 September 2026

### Historical release upgrade

The prepared `20260902_reservation_expiry_policy.sql` now installs
`inventory_reservations_released_has_cause_check` as NOT VALID when absent.
PostgreSQL still checks every new or updated row; only the historical scan is
deferred. Existing installed constraints stay untouched. Do not drop a validated
constraint or backfill a guessed cause merely to match this preparation.

The local pre-policy fixture first made the original migration fail. After the
correction, `node scripts/rehearse-purchase-time-reservation.mjs` passes 13/13:
unknown old cause/time and free stock survive; new insert and update attempts
without attribution fail with the expected constraint name. No production
history was inspected or changed. The earlier 12-check result below predates
this additional regression.

Before approved provider application, record the count of released rows from
the recovery snapshot; after installation inspect attribution and validation:

```sql
select count(*) as unattributed_historical_releases
from public.inventory_reservations
where status = 'released' and release_cause is null;

select convalidated
from pg_constraint
where conrelid = 'public.inventory_reservations'::regclass
  and conname = 'inventory_reservations_released_has_cause_check';
```

Staff may reconcile causes only from trustworthy historical evidence, with
auditable reasons. Retain unresolved rows as unknown. Once the first count is
zero, a separately approved migration may VALIDATE CONSTRAINT; record that
result rather than assuming installation validated old data. Keep new-write
enforcement throughout. Rollback does not require deleting or rewriting
historical rows: use the normal captured-schema recovery gate, and do not
replace NOT VALID with immediate validation while unknown historical rows exist.

### Cancellation evidence

MAP-023 H-022 owns `20260905_purchase_hold_cancellation.sql`, prepared after the
expiry and purchase-time reservation migrations. Cancelling Submitted or
Confirmed releases only active allocations, with `cancelled` cause and timestamp;
historical releases cannot inflate the stock release. It updates aggregate and
catalog availability and aborts atomically on counter mismatches. It preserves
the previous function ACL. It does not implement payment refunds or the remaining
confirmation/expiry/packing lifecycle changes.

Verification:

- `node scripts/rehearse-purchase-time-reservation.mjs --baseline-cancellation`
  reproduced `Cancelled submitted order still holds stock` with real SQL.
- `node scripts/rehearse-purchase-time-reservation.mjs` passed 12/12 checks,
  including last-unit purchase/confirmation behavior and both cancellation
  states, release cause/time, historical-allocation exclusion, replay and full
  rollback on lot mismatch. The correction is applied twice in that run.
- `npx playwright test --config=playwright.api.config.js tests/purchase-time-reservation.spec.js tests/reservation-policy-contract.spec.js --reporter=dot`
  passed 30/30. Pure/source checks are not full operational acceptance.

The rehearsal resets only its dedicated `k2_purchase_hold_rehearsal` database
on localhost:54331 and stops PostgreSQL if it started it. Windows required
elevated execution. The bootstrap is simplified, but actual expiry, purchase,
confirmation and cancellation definitions execute. No production data changed.

Do not activate this correction as a standalone readiness claim: H-019–H-023
retain confirmation-time deduction, historical release-cause compatibility,
expiry/cancellation locking, payment/refund/packing and provider acceptance.
Before any approved provider application, capture the current function and ACL
under the recovery gate. Rollback restores that exact function with its ACL;
do not replay the entire historical operations migration. Locally the baseline
flag restores the original cancellation definition in the disposable fixture.

This runbook implements the approved hybrid model: customers can buy, request
Pasabuy, start or continue a scoped conversation without an account; accounts remain
optional for verified history and cross-device continuity.

## Current state

The BFF code, identity migration, signed guest-boundary migration, cutover
migration, rollback evidence, and feature-gated guest inbox exist locally. None
is active in production. The storefront still calls the transitional direct
RPCs while `VITE_GUEST_BFF_ENABLED=false`.

The isolated production Storefront does not expose the workstation `DemoRail`.
Appending `#demo` cannot reveal its direct-password VIP prototype or claim that
authentication unlocks tier pricing. That prototype remains only in combined
local mode. Optional customer accounts and wholesale pricing must not be added
back through the rail: they require verified-contact claim commands and server-
authorized commercial terms under MAP-019.

The default Wholesale fallback currently opens a reviewable email draft. It is
not a BFF receipt and must remain labelled unsent until the customer presses
Send in their email client. Do not restore the removed `WA-*` browser reference,
`k2_wholesale_applications` localStorage record, registration-number-first
intake, or unapproved response-time copy. A secure inquiry route is now prepared
locally behind the same disabled Storefront BFF flag. It uses exact Origin,
Turnstile, signed request, durable rate, idempotency, safe-error, and scoped guest
conversation controls; it may capture an inquiry but cannot grant wholesale
authority. Activation still requires the ordered migration, matching private
secrets, exact provider environments, preview denial tests, and real-host proof.

The optional customer-account UI now awaits the deferred Storefront Supabase
client before reading Auth, owns cancellation and subscription cleanup, and
signs out only through the resolved client reference. The exact local
customer-account/secure Wholesale harness passes 3/3 and one uninterrupted
exact current-tree local `npm test` aggregate passes 550/550 after the final
customer-fixture containment change. This is fixture/browser evidence only; the
customer flag, provider delivery, migration, and production route remain
inactive until the activation order below is satisfied.

The Vercel Hobby deployment rejects more than 12 Serverless Functions. The 81
route handler files remain under `prepared-api/`, outside Vercel's deployable
`api/` directory. Only one guarded consolidated entrypoint per artifact has
been promoted locally. Both server and browser BFF flags remain false. The
Contact email-draft fallback and legacy browser Admin Auth do not require these
inactive functions.

The local consolidation is now prepared: `server/storefront-bff/router.js`
explicitly allowlists all 14 Storefront handlers and
`prepared-api/storefront-router.js` is the shared router adapter, and
`api/storefront/index.js` is the single deployable entrypoint.
The verifier derives the endpoint inventory from the filesystem and fails on a
missing or duplicate route; unknown and traversal-like paths return a minimal
`404`. `vercel.storefront.json` now declares the exact
`/api/storefront/*` rewrite carrying the bounded remaining path as `route`.
The entrypoint independently requires `K2_DEPLOYMENT_TARGET=storefront` and
`K2_STOREFRONT_BFF_ENABLED=true`, so its default response is `404` even if the
browser flag changes accidentally. This is locally tested source, not a
deployment or feature activation. Preview function inventory must prove that
the Storefront artifact contains only its intended function.

## Required activation order

1. Obtain MAP-016 evidence that the exposed legacy service-role key is disabled
   and rejected. Do not proceed without it.
2. Apply and postflight the MAP-017 public-write boundary.
3. Apply and postflight `20260812_guest_account_identity_and_messaging.sql`.
4. Apply and postflight `20260812_guest_submission_boundary.sql`. Do not apply
   the cutover migration yet.
5. Apply and postflight `20260822_guest_account_claim_boundary.sql`. Its account
   command must remain unreachable until the customer Auth flow and active guest
   grant cookie are both available on the same preview host.
   This migration also provides the owner-scoped account history and account
   reply commands used after successful claim.
6. Apply and postflight `20260825_storefront_customer_auth_boundary.sql`. Prove
   its exact anonymous grant, forced-RLS private nonce/rate tables, HMAC-only
   subjects, denial persistence, cleanup, and replay rejection before enabling
   any customer Auth route. It reuses the Storefront request secret and creates
   no browser-readable table access.
7. Generate two independent random 32-byte values outside the repository. Store
   the first as base64 in Storefront Vercel `K2_GUEST_BFF_SECRET`; store only its
   decoded bytes plus the second contact-HMAC key in the private database table.
   Never paste either value into Git, logs, screenshots, chat, or browser code.
8. Configure Storefront Vercel server variables: `SUPABASE_URL`, limited
   `SUPABASE_PUBLISHABLE_KEY`, exact `K2_STOREFRONT_ORIGINS`, and
   `K2_TURNSTILE_SECRET_KEY`. Keep `K2_STOREFRONT_BFF_ENABLED=false` until the
   preview is otherwise ready. The signing secret must match the private database
   request secret. No service-role/secret key is used by these endpoints.
9. Configure the prepared `VITE_TURNSTILE_SITE_KEY` on the Storefront preview
   environment. Confirm the deployed function inventory, enable
   `K2_STOREFRONT_BFF_ENABLED=true` on preview, prove the server routes and
   denials, then enable `VITE_GUEST_BFF_ENABLED=true` last for the coordinated
   preview release. Verify valid, missing, expired, replayed, and bot-failed
   challenges on the real preview host. Order and Pasabuy require the challenge;
   coupon preview uses the durable rate boundary without interrupting browsing.
10. Apply and postflight `20260831_guest_order_status_boundary.sql` after its
   guest-grant/request-signing dependencies and before enabling the browser
   switch. Switch the storefront service calls to `/api/storefront/order`,
   `/api/storefront/order/status`,
   `/api/storefront/pasabuy`, `/api/storefront/conversation`, and
   `/api/storefront/coupon`. Verify minimal
   receipts, safe errors, duplicate retries, 429 behavior, and HttpOnly cookie
   issuance without reading the cookie from JavaScript. Submit an order, reload
   `/confirmation`, use Back/Forward, and prove only the scoped safe status
   projection returns. A clean browser, changed scope, expired/revoked grant,
   cross-guest attempt, and unavailable boundary must fail with explicit
   recovery and no contact/address/note/internal-ID leakage.
11. Enable the prepared guest history/message surface, which starts through POST
   `/api/storefront/conversation` and calls POST `/api/storefront/messages` and
   `/api/storefront/message`. Verify an anonymous
   browser with the scoped cookie can read/reply only to its own conversations;
   another browser, changed conversation reference, expired/revoked grant, and
   duplicate/different-content retries must fail safely. Prove that a clean
   browser can start a Website conversation without an order or Pasabuy request.
   Verify the guest conversation view and post-order confirmation both state
   that cancellation and return have no self-service path, direct the customer
   to K2 staff, and describe case-by-case review without promising a response
   time or outcome.
12. Configure and verify the actual Supabase email-link redirect, phone/SMS OTP
    policy, expiry, resend, provider throttling, and the exact preview callback.
    Prove `POST /api/storefront/account/auth/email`, `account/auth/phone`, and
    `account/auth/verify` permit and deny at their documented IP/contact/global
    thresholds before any provider call. For email/SMS issuance, prove a valid
    `customer_auth` Turnstile action, missing/expired/replayed/wrong-action denial,
    budget denial before remote challenge work, challenge denial before provider
    delivery, and browser reset after success, safe denial, timeout, or ambiguous
    request failure. SMS verification must
    remain protected by its strict attempt budget without a second challenge.
    Test malformed input, safe `Retry-After`, delivery ambiguity, code expiry,
    and session establishment on the real preview host. Do not enable the browser
    flag first.
13. Prove `POST /api/storefront/account/claim` with a real confirmed customer
    session: matching contact succeeds once, the guest grant is revoked, retry is
    idempotent, and unverified, mismatched, conflicting, replayed, expired, and
    cross-guest attempts fail without account or audit duplication.
    Then enable `VITE_CUSTOMER_ACCOUNT_ENABLED=true`
    on preview only and prove `/api/storefront/account/history` and
    `/api/storefront/account/message` exclude cross-customer/internal data after
    the guest grant is revoked. The browser flag stays false in production.
14. Apply `20260812_guest_submission_cutover.sql` in the same release window.
   Run its postflight and prove direct old RPC calls fail for `anon` and
   `authenticated` while all four submission/start BFF paths still work.
15. Run repository/history/bundle secret scans, both production builds, IDOR and
    cross-customer tests, then record real-host evidence before domains are
    considered ready.

If any step fails before cutover, keep the old storefront path and fix forward.
If cutover fails, roll back only the cutover grants immediately; do not delete
identity, request, conversation, grant, replay, or rate records.
