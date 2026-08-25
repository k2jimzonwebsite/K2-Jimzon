# MAP-020 Admin lots and expiry rollback validation — 12 August 2026

## Scope

This evidence covers a prepared, inactive Admin BFF lot/expiry correction. It
does not claim that cookie authentication, the signed wrapper, trigger/view
correction, direct-RPC cutover, domain, or marketplace adapter is live.

## Production truth inspected

- `product_batches`, reservations, balances, change events, stock/expiry views,
  RLS policies, constraints, trigger body, mutation RPC bodies, and grants were
  inspected directly.
- Production has 21 lots, all currently `available`. Aggregate checks found no
  negative, over-reserved, availability-mismatch, positive-stock missing expiry/
  hub/custodian, unsafe 0–30 day available, or unapproved 31–89 day available row.
- Production has zero `batch_change_events`; the prepared behavior therefore
  must not be confused with live audit history.
- Anonymous execution of reconciliation and clearance is absent; authenticated
  execution remains present until coordinated cutover.
- The live `sync_product_batch_compat_columns` trigger sets
  `quantity_available = quantity`, including after reservation changes. The
  live stock view sums physical quantity and the expiry view chooses the greater
  of physical and available quantity. These are verified future-write/reporting
  defects even though the current sample is consistent.
- The live `user_role` enum contains `Admin`, `Staff`, `Customer`, and `VIP`, not
  `SuperAdmin`; server and browser staff-role assumptions were aligned to it.

## Prepared boundary and interface

- `GET /api/admin/lots` returns only a fixed projection, optionally scoped to
  one validated SKU, with a 200-row per-product and 500-row overall bound.
- Reconciliation accepts at most 50 exact lot objects and a 10–500 character
  reason. Every positive lot requires box, batch, expiry, hub, and custodian.
- Existing lot IDs cannot be omitted, duplicated, moved across SKUs, or reduced
  below active reservations. New rows have zero reservations.
- Available quantity is derived from physical quantity minus reservations only
  when disposition and shelf life permit sale. Unknown expiry and 0–30 days are
  unavailable; 31–89 days requires a reasoned clearance approval.
- Changing expiry or a non-available disposition invalidates prior clearance.
- Every successful row writes immutable before/after evidence. Durable receipts
  bind retry keys to payloads and enforce replay and per-actor/action limits.
- The coordinated migration replaces the compatibility trigger, normalizes
  current rows, adds `product_batches_quantity_available_check`, corrects the
  stock and expiry views, synchronizes product sellable counts, and revokes
  direct authenticated reconcile/clearance RPC execution.
- The Admin interface shows physical, reserved, and sellable totals separately;
  uses one-family readable typography, labeled 44px mobile controls, skeleton/
  empty/error/conflict states, inline clearance and reconciliation reasons, and
  restrained state-only motion. Emoji icons, pulsing warnings, raw provider
  messages, generic reconciliation reasons, and browser prompts were removed.
- While the secure flag is off, reconciliation is explicitly locked for a
  product with reservations so the live compatibility trigger cannot corrupt
  reservation-derived availability.

## Rollback-only behavior verified

The shared foundation and lot migration compiled together in a production
transaction. A transaction-local verifier stub and real staff identity then
exercised representative records before `ROLLBACK`:

1. A live positive lot was given two reservations and intentionally inconsistent
   available quantity.
2. Signed reconciliation corrected available to physical minus reserved.
3. One immutable change event was written; an exact retry returned the stored
   result without writing a second event.
4. A second command attempting quantity below reservations was denied with
   `K2_LOT_RESERVED_CONFLICT`.
5. A rollback-only 60-day lot with five physical and one reserved unit was
   approved for clearance; status became available and sellable quantity became
   four.
6. Retrying that clearance wrote no second event.
7. The expiry view reported five physical units and the stock view equaled the
   sum of eligible `quantity_available` values.
8. The transaction rolled back. A separate query proved 21 lots, zero batch
   events, both direct grants live, the legacy trigger unchanged, and the new
   wrapper/constraint absent.

## Local verification

- 32 BFF and regression contracts pass.
- The isolated Admin production build passes with 21 manifest modules and
  bundle-content isolation.
- The Admin BFF foundation verifier passes.
- The secret scan passes across 688 files.
- `git diff --check` passes; line-ending notices are informational.

## Remaining before activation

- Complete MAP-016/MAP-017 identity and authorization prerequisites.
- Install the matching private request secret and apply the foundation, lot
  migration, and feature flag in one coordinated Admin release.
- Run deployed denial tests for role/AAL/CSRF/origin/project/replay/payload/rate/
  ID and clearance cases.
- Rehearse reservations, packing/fulfillment, exact custody transfer, receipt,
  clearance reversal, expired/unknown/damaged/quarantine cases, and rollback on
  the deployed boundary.
- Record owner/staff mobile and laptop acceptance before activation.
- Keep `VITE_ADMIN_BFF_ENABLED=false` until every required Admin capability no
  longer depends on browser Supabase Auth or privileged direct data access.
