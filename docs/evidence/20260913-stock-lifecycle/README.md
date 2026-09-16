# Stock commitment composition — 13 September 2026

Owner: MAP-023 / MAP-028 I-001, continuation of IDEA-20260908-01. The owner
requested unfinished MAP work in its governed dependency order. Existing
uncommitted work on `main` at `41d96df012997cc98751ca405ab632f95ae8806f` was
preserved. This is local preparation and executable evidence, not provider
application, deployment or authenticated host acceptance.

## Changed behavior

`20260913_payment_handover_commitment.sql` adds no new stock table or API. It
patches three installed functions transactionally, requires their prior
coverage/payment/lock-order corrections, refuses unexpected source shapes,
preserves their ACLs, and replays without duplicate behavior.

- Verified payment calls the existing internal commitment helper after locked
  stock validation and independent payment review. The first caller owns the
  original actor/time/cause; confirmation and payment never overwrite it.
- Payment and confirmation accept attributable committed lots after their old
  temporary purchase deadline. Uncommitted expired holds, incomplete commitment
  proof, invalid lot eligibility and incomplete coverage remain denied.
- Handover requires attributable commitment on every locked active allocation.
  It uses the existing `K2_RESERVATION_RECONCILIATION_REQUIRED` error, already
  handled by the BFF. It moves physical stock once without another commitment.
- Refund leaves physical stock and commitment history untouched, both before
  dispatch and after it. Cancellation separately releases exact lots once.
- The earlier confirmation rollback refuses with
  `K2_COMPOSED_COMMITMENT_RECOVERY_REQUIRED` when payment uses the helper.

## Executed evidence

`node scripts/rehearse-purchase-time-reservation.mjs`: **37/37 property groups
passed** on disposable loopback PostgreSQL 17.11, port 54331. Existing purchase,
last-unit, cancellation, expiry, packing, handover and recount evidence remains
in this runner. New checks execute repository SQL and the actual HMAC/receipt
wrapper on a synthetic schema, local Auth identities and a fabricated local key.

The added fixtures prove:

- a second-lot inventory-event failure rolls back confirmation status,
  compatibility order, coupon redemption/count and every commitment write;
- retry commits three units across two lots once, retaining physical custody;
- signed payment failure on the second lot rolls back payment, stock events,
  commitment, command receipt and request nonce; the same payload/key succeeds
  after the injected fault is removed;
- both payment-first and confirmation-first orderings, independent-verifier
  denial, expired uncommitted denial, elapsed committed deadlines, exact packing,
  missing timestamp/actor/cause and unknown-cause denial, handover replay,
  refund before/after dispatch, cancellation replay and retained evidence;
- PostgreSQL `anon` and `authenticated` cannot execute the internal helper;
- restoring each original payment/reservation/handover function makes the
  corresponding lifecycle assertion fail; each negative-control session rolls
  back, then the corrected functions remain installed;
- restoring captured definitions returns exact function bodies and ACLs;
  reapplication succeeds; the old rollback refuses without changing the
  fingerprint of public functions and their ACLs.

Initial payment baseline failed with
`OWNER002_MISSING_PAYMENT_OWNERSHIP_DEDUCTION`. The later fault-injection test
now detects that same old payment body earlier with
`Payment did not reach second commitment fault`. The old rollback baseline
failed at **36/37**, demonstrating that it changed the composed functions.
After its refusal guard, **37/37** passed. Two fixture-only setup errors were
corrected: schema-qualifying the fault trigger under an empty search path, and
explicitly supplying synthetic delivery approval for handover. No production
code was changed to bypass either prerequisite.

Other fresh checks:

- `node scripts/rehearse-payment-recovery.mjs`: existing payment/balance and
  signed packing assertions passed in its separate disposable database.
- `npx.cmd playwright test --config=playwright.api.config.js
  tests/confirmation-commitment-contract.spec.js
  tests/purchase-time-reservation.spec.js tests/admin-bff-contract.spec.js
  tests/security-surface-inventory.spec.js --workers=1`: **81 passed**.
- `npm.cmd run prebuild`: security fixtures, environment and dependency policy,
  source inventory, secret scan and import integrity passed. Source inventory
  remains 92 Admin / 15 Storefront routes with zero classification gaps.
- `npx.cmd playwright test --config=playwright.config.js --list`: selects
  **759 tests in 81 files**, including all **55** specs explicitly named in
  `test:contracts` and the sales-calculation spec. This is selection evidence,
  not a fresh aggregate/remote CI pass.

The sandbox could not start local PostgreSQL; the reviewed elevated local runs
passed. No automatic approval rejection remains. The focused tests emit the
existing NO_COLOR/FORCE_COLOR warning; prebuild emits the existing inaccessible
user Git-ignore warning. Neither command failed.

## Audit corrections and limits

AUD2-003's claim that an error mid-function commits partial confirmation is
refuted by the fault-injection result. PostgreSQL executes these functions
inside a transaction; the original function was left intact. See the primary
[transaction documentation](https://www.postgresql.org/docs/17/tutorial-transactions.html).
This is an injected SQL failure test, not a power-loss or provider failover test.
AUD2-004's claim that npm test omits source contracts is also refuted by actual
base-runner selection. No duplicate contract run was added to CI.

The new migration is applied after earlier concurrency tests in the runner.
Those races do not prove the complete new writer composition. No owned-stock
read projection or UI consumer was added; historical attribution, complete RLS
visibility, deadline extension/due queues, remaining writer pairs, real devices,
remote CI and activated host journeys remain in I-001. Delivery approval is a
fixture prerequisite, not a tested courier or customer-approval workflow.
Synthetic staff/Auth functions do not establish production role or MFA policy.
Actual-role helper denial is narrower than a full RLS authorization audit.

## Recovery and next action

Before application, removing only this migration and its runner/fixture additions
abandons the new local composition; retain the existing confirmation preparation
and unrelated dirty work. The rollback refusal is protective and can remain.
For disposable rehearsal recovery, the runner captures/restores the exact three
function definitions and ACLs before reapplying the patch. Do not use the older
confirmation rollback against the composed chain. Any future provider change
requires fresh applicability, an exact reviewed recovery artifact and the
existing MAP-017 approval gates; prefer reviewed roll-forward after activation.

The next required action is the owned-stock read projection and existing Admin
consumers under I-001, followed by current-chain writer races and the remaining
acceptance gates. MASTER_ACTION_PLAN.md holds all unfinished work; this evidence
file is not another backlog. No whole MAP item is closed by this batch.
