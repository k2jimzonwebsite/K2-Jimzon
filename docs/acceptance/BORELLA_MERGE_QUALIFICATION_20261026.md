# Borella duplicate consolidation — qualification in progress

MAP-023 / IDEA-20261025-04. The owner requested continuing the merging/purging
of duplicate items. This record is source and local evidence, not a live merge.

## Current facts and defect

Fresh exact-K2 read-only audit found 121 public listings. The remaining exact-name
public duplicates are Borella Carne 001016/001017/001018 and Borella Prosciutto
001019/001020/001021. Carne's original lot carries 45 units on 001017. Prosciutto
has original lots carrying 42 units on 001020 and 22 on 001021. The three other
Borella rows have no lots. Three Pagani Prosciutto Draft rows also repeat a name;
their exact identity/dependencies remain unqualified, not authorized for deletion.

The original product photos for both Borella products visibly identify a 250 g
bag. Missing size/net-weight/package fields block the prepared merge. In an
isolated restored application database, setting the six Borella rows to size
`250 g`, net weight `250`, package `Bag` clears both package blockers. Those fields were subsequently saved through the existing signed/versioned Admin
Product Master editor for all six SKUs. Fresh readback at2026-10-26T03:22:06.998Z
confirms only size/net_weight/package_type and normal updated_at/catalog version
bookkeeping changed. All lots, balances and Website listings remain byte-for-byte
equal to their pre-save captures. Prices, names, stock and shipping weight remain
unchanged; no shipping weight is inferred. No actual SKU/lot merge has applied.

The next populated signed rehearsal exposed a defect missed by the old synthetic
fixture: production's `website_listing_events` has `UNIQUE(actor_id,request_id)`,
but a merge emits an event for each source under the same real parent request.
The second event therefore aborts the whole merge. The synthetic fixture omitted
that constraint. Original failing receipts remain private and unchanged.

## Bounded repair and verification

`20261025_product_sku_merge.sql` now acquires `ACCESS EXCLUSIVE NOWAIT` on the
Website event table before checking the exact original validated, nondeferrable
unique-constraint definition. It refuses unexpected schema drift. It replaces
only that uniqueness constraint with `(actor_id,request_id,sku)`, retaining all
existing rows and the original request lineage. Existing RLS, ACLs, signed
payload/key binding and command receipts remain intact. Same-request/same-SKU
duplicates still refuse. No fake child request IDs or source history deletion.

The rehearsal now includes the original event primary keys, NOT NULL/check and
unique constraints. Red reproduces the actual collision. The final focused run
passes **27 checks**, including competing DDL lock refusal before constraint
inspection, missing-constraint refusal, exact retry without additional events,
changed-body key refusal, per-source shared-parent audits, original lot metadata,
stock conservation, dependency contention and cleared command context.

The final populated rehearsal at `2026-10-26T02:56:34.474Z` installs the migration
inside a transaction on the owned restored database and exercises the actual
restored signed wrapper/functions/data. Carne consolidates to 45 available units
on 001017 with its original lot; Prosciutto consolidates to 64 on 001020 with both
original lots. All original lot IDs and metadata except the intended SKU/update
timestamp remain equal. Existing Website audit history remains equal, exact
retries return the original result and create no additional events, and every
source is retained as Discontinued/unpublished with zero projected stock.

After rollback, captured products, lots, balances and Website listings match
their pre-rehearsal hashes and the merge reader is absent again. This is **four
business-table state restoration**, not complete database/sequence restoration:
identity sequences can advance on rolled-back inserts. The local runtime uses
restored functions/data with local authenticated claims and narrow schema/execute
grants because backup restoration excludes original ACLs. It does not prove
hosted Auth, all original permissions or managed provider recovery. Its owned
database server was stopped. Post-merge preview `WEBSITE_ASSIGNMENT` blockers in
the private receipt reflect already-paused sources after the successful local
merges; they are not pre-merge eligibility failures.

Independent initial/follow-up review found the missing pre-check DDL lock; it was
fixed and a real competing-lock regression added. Final review reports no
remaining Critical/Important findings in this bounded correction.

## Evidence and remaining action

Private evidence under `.tools/duplicate-products-20261026/`:

- `remaining-audit.json` / `.mjs`: current production read-only inventory audit.
- `restored-merge-probe.json`: original package blockers, rolled back.
- `restored-normalized-merge-probe.json`: normalized local package eligibility.
- `restored-signed-merge-probe-error.txt`: original production-constraint failure.
- `restored-signed-merge-probe.json` / `probe-restored-signed-merge.mjs`: final
  populated signed merge/retry/history/conservation proof, local only.
- `audit-constraint-red.log`, `audit-constraint-green.log`,
  `audit-constraint-final.log`, `audit-constraint-locked-final.log`: preserved
  failing/passing lineage. Final fixture receipt is
  `.tools/sku-merge-rehearsals/defd067e-44e6-4224-affe-33a8188daa87/receipt.json`.

An initial release gate was interrupted when review identified the missing DDL
lock; it is not a passing final-source release receipt. Final development passes and the fresh pre-merge backup restore passes. The final
release aggregate stopped after1115basepasses/3comparison-navigation failures;
local fixture HTTP also timed out on its first focused retry. Existing no-watch
acceptance mode passes the unchanged12comparison cases. Resumed storefront suite
has47passes/one320-light heading timeout, which passes unchanged on direct-Node
focused retry. A Windows npx regex invocation that selected no tests is retained
and is not evidence of a pass. Only remaining suites/builds are resumed. The
aggregate is not represented as a clean exit0. Live handles/logs remain in MAP-023.

Next: finish final-source release qualification; qualify the exact production
installation packet, current authority/constraints and fresh encrypted backup
restore proof; run exact K2 preflight and zero-failed readiness. The photo-supported package facts have been saved and conserved as above; install
the qualified package under the owner-authorized MAP scope, then perform the two
Borella signed merges one group at a time with fresh preview/version and durable
request recovery. Reopen products/lots and verify the public cards and all units.
Do not reinstate paused One Fragrance assignments merely to satisfy merge
eligibility. Pagani and any further physical record retirement remain explicit
follow-up within MAP-023; the overall duplicate objective is incomplete.

## Recovery

Before installation, revert only this source slice and retain evidence. Before
any merge has emitted multi-source events, a reviewed uninstall can restore the
original wrapper definitions and original audit constraint after verifying its
old uniqueness still holds. After an actual merge, do not re-add the old constraint
or delete new events: preserve history and use reviewed forward recovery. Any
stock recovery must preserve original lot IDs and later operations; never
manufacture stock adjustments, recreate lots or restore an old whole database
over subsequent business activity. Unknown save outcomes require the exact
original saved request/key, not a new decision.
