# OWNER-002 stock commitment continuation

Owner: MAP-023 / MAP-028 I-001, IDEA-20260908-01. This is design and evidence,
not an implementation backlog. Remaining steps and recovery live in I-001.

## Required behavior and design

Purchase reserves exact lots for 30 minutes. First confirmation or verified
payment deducts owned stock once. Physical custody remains until handover.
Cancellation restores owned stock once and releases encumbrance; financial refund
alone does not establish a physical return. Signed command receipts and existing
authorization remain authoritative. No production activation is part of this work.

Decision: keep physical `quantity` / `on_hand` and encumbered `reserved_quantity`
unchanged at commitment. Persist commitment actor/time/cause on exact active
allocations. Derive owned stock as physical minus active committed units. At
handover, physical and encumbered counters decrease together; ownership does not
decrease again. Cancellation releases the allocation while retaining its original
commitment evidence. No second writable stock balance is introduced.

Rejected: moving the existing physical decrement into confirmation. It contradicts
the physical-count rule and permits recount to resurrect sold ownership.
Rejected: moving committed units out of reserved counters into a second counter.
That requires changing every FEFO, availability, custody and compatibility reader
atomically without adding value over retained exact allocation evidence.

Assumptions inherited from approved scope: existing bounded orders, staff-only
Admin authority, atomic PostgreSQL transactions, no external provider dependency
for local rehearsal, and unchanged physical lot eligibility. Historical confirmed
or verified allocations without commitment evidence remain unresolved; no invented
timestamp or retrospective sale event. Projection access must prove complete
allocation visibility, and the eventual Admin consumer must label each quantity.

## Review decisions

- Independent schema/lifecycle review accepted the representation. Accepted
  objections: exempt committed rows from temporary deadlines; exclude them from
  due/extension/expiry paths; require commitment coverage at handover; protect
  legacy rows from early-return certification; test both confirmation/payment
  orderings, cancellation and all composed writer races.
- Constraint review: APPROVED for local implementation/rehearsal. Accepted
  requirements: preserve RPC ACLs, revoke new-helper browser/default execution,
  keep events and transitions atomic, and deny authoritative projection claims
  when RLS or legacy attribution makes the owned-stock total incomplete.

## Failing baseline

User Advocate: APPROVED for local preparation, with explicit physical/held/
committed/owned labels, legacy reconciliation, cancellation sellability and
financial-only refund wording required in later consumer acceptance. Integrator:
APPROVED for local implementation/rehearsal; all design objections accepted and
resolved, no production activation authority. These consumer gates remain I-001.

`node scripts/rehearse-purchase-time-reservation.mjs` now executes the new
`supabase/tests/order_stock_commitment.sql` after the existing purchase, expiry,
packing, handover and recount checks. The approved localhost run failed with
`OWNER002_MISSING_CONFIRMATION_OWNERSHIP_DEDUCTION`, from the real confirmation
function. Existing preceding assertions passed. The initial sandbox attempt
could not start PostgreSQL; the approved run reached the intended assertion.
Log: `.tools/commitment-baseline.log` (local generated evidence).

This is failing-first evidence, not an implemented or production-ready lifecycle.

## Implementation (12 September 2026, prepared only)

`supabase/migrations/20260912_confirmation_stock_commitment.sql` implements
the design above for the confirmation ordering: additive commitment columns
on `inventory_reservations`, the internal idempotent
`commit_order_request_stock_v1` helper (cause allowlist, per-allocation
`stock_committed` events, physical/encumbered counters untouched), the
confirmation call, and the sweep exemption for committed rows. Cancellation
needs no change: it already releases every active row and now retains the
commitment facts on the released rows.

- `npm run rehearse:purchase-hold`: 30/30 properties held, including the
  previously failing ownership-deduction assertions and the new
  `supabase/tests/confirmation_commitment_behavior.sql` checks. Migration
  apply + replay proven inside the run.
- Rollback `supabase/confirmation_stock_commitment_rollback.sql` executed on
  a scratch loopback database: helper dropped, prior confirmation/sweep
  bodies restored, evidence columns retained.
- 45/45 focused contracts pass
  (`confirmation-commitment-contract`, `purchase-time-reservation`,
  `consignment-receiving`, `reservation-policy-contract`); security surfaces
  scan reports zero gaps.
- Full evidence log: `docs/evidence/20260912-autonomous-batch/README.md`.

No production migration ran. The payment-verification caller, the handover
commitment-coverage gate, and the owned-stock projection consumer remain open
in I-001 with the review's accepted requirements unchanged.
