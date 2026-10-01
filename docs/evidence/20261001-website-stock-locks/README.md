# Website and inventory lock compatibility — 1 October 2026

IDEA-20261001-05; owning item MAP-023, with MAP-018 eligibility and
MAP-017/020 installation/recovery dependencies. Branch:
`codex/map017-guest-chat-preview`. Prepared and locally verified only.
No provider call, SQL, assignment, stock, order, configuration or release changed.

The new Website helper took a product lock before reservation work. Prepared
cancellation, expiry and recount take a balance before their product projection.
Two sessions could therefore each own the row the other needed. The actual
cancellation function and Website helper reproduced PostgreSQL's `deadlock
detected` error before the edit. `before-fix-receipt.json` pins that source
manifest and the observed failure; the before-fix command deliberately exited 1.

The unapplied `20260916_automated_delivery_quotation.sql` now initializes any
missing Manila balance from the existing canonical lots, including their reserved
quantity, then locks every basket balance in SKU order before product/listing
locks. It does not copy display stock, change physical lots, assign offers or
rewrite inventory arithmetic. The assignment command remains product then listing
and does not take a balance. Existing eligibility and signature rules are retained.

## Evidence and exact scope

`node scripts/rehearse-website-stock-locks.mjs` passed at the timestamp in
`local-receipt.json`. It creates a disposable database
`k2_website_stock_locks_20261001` from `k2_current_restore_20260929` on
`127.0.0.1:54388`, checks the exact data directory and target, and records a
random ownership marker before fixture installation. It refuses an existing
clone. Cleanup checks the same target/marker and deletes only this owned clone;
the original restore's table counts and public/private function/ACL fingerprint
are unchanged. The local server was stopped after the final rehearsals.

The witness installs the 21-source guest/Website chain, the real prepared expiry,
coverage, balance-lock, cancellation and sweep corrections, and the extracted
reservation helper and original recount function followed by its real lock patch.
Each manifest entry identifies whole-source versus extracted-function scope.
This is compatibility of those actual bodies on the restored application schema,
not proof that the complete older purchase migration installs on current K2.
The fixture's balance-update trigger and a held lot create deterministic barriers;
`pg_blocking_pids` proves the waiting sessions before a gate is released. The
barriers leave business function bodies unchanged. Recount uses the repository
body, rather than claiming to patch the differently encoded restored body.

Independent read-only source review found no Critical or Important defect in the
scoped correction and witness, and `git diff --check` passed. It did not rerun SQL,
the development gate or provider checks. Its minor clarification is reflected
here: the clone name is fixed and ownership-guarded, rather than randomly named.

| Scenario | Observed result |
| --- | --- |
| Website eligibility/reservation versus actual cancellation | Both commit; old allocation is released with `cancelled` cause. |
| Same Website path versus actual overdue sweep | Both commit; old allocation is released with `expired` cause. |
| Same Website path versus physical recount | Both commit; the two exact allocations and reserved counters are preserved. |
| Two claimants for one unit | The winner commits; the waiting loser is refused with insufficient lot stock and has no allocation. |
| Signed authenticated Admin/AAL2 pause versus Website buyer | Pause commits; waiting buyer observes the current unavailable offer and creates no allocation. |
| Baskets supplied in opposite SKU order | Both commit with matching balance, lot and reservation totals for both SKUs. |
| Missing balance with an existing hold | Canonical physical and reserved lot counts are preserved when the balance is rebuilt. |
| Original Website assignment/eligibility rehearsal | The refreshed 21-source rollback witness passes signed roles/payloads/denials, membership, eligibility, order continuity and rollback. |
| `npm run verify:development` after final code edit | Exit 0; no release gate, application build or deployment was requested. |

The concurrency tests call private eligibility followed by the actual reservation
helper for fixture orders. They do **not** assert that current signed checkout
calls that helper. Synthetic keys and fixture identities remain local. Managed
provider roles, PostgREST, cookie/bot behavior, all other inventory writers,
coupon interactions, payment/commitment and real-host acceptance are outside this
witness. Independent source review does not replace these SQL checks.

## Remaining integration gate and recovery

The same witness confirms current K2's 11-argument `submit_order_request_v2`
overload and absence of the older 9-argument signature required by
`20260902_purchase_time_reservation.sql`. It then executes two actual anonymous
signed submissions for one local unit: both return success and neither creates a
hold. This is a failing operational requirement, recorded as a successful
diagnostic observation. The final receipt explicitly sets
`canonicalSignedHoldIntegration=false`. This source must not be activated on the
strength of the passing reservation-helper races.

MAP-023 retains the exact next action: compose purchase-time holds with the
installed 11-argument writer without dropping its current order/conversation,
shipping, identity, grant or idempotency behavior; prove signed last-unit refusal,
retry and rollback with the complete install/recovery chain. Other inventory and
coupon writers and server-authoritative J&T pricing also remain there. MAP-017/020
must recompose the stale provider installer/captures, refresh same-target backup
and preflight, and obtain the exact apply/configuration authorization before any
activation. MAP-018 retains staff assignment UI and reviewed real facts, media,
membership and physical counts. No full MAP item is removed by this local slice.

Local source recovery is a scoped revert of this helper/runner change, preserving
the evidence and later signing guard. No production recovery was exercised or
made ready. If a failed rehearsal leaves the clone, check the exact loopback
database/data directory and its `k2_stock_fixture.owner` marker against the failed
run before any cleanup; never drop an unowned pre-existing database or the source
restore. An absent/mismatched marker requires review, not automatic deletion.

The original negative command was run before the helper edit:
`node scripts/rehearse-website-stock-locks.mjs --before-fix`. Running that flag
against the corrected helper should fail its expected-deadlock assertion. The
source hashes in the negative and final receipts distinguish those states.
