# Pagani duplicate Draft retirement — verified live

MAP-023 / IDEA-20261026-02. The owner expressly approved retaining Pagani
Prosciutto K2-SKU-001150 and retiring duplicate Drafts 001151/001152 while
preserving their history. The owner separately confirmed Galatine Blue 125 g
and 150 g are different packages; both Galatine SKUs remain untouched.

Fresh dependency inspection found no Pagani lots, balances, Website assignments,
orders, reservations, inventory events, active intake, family links, consignment
items, purchase lines or nonzero staff allocations. Product facts matched apart
from original identifiers, source workbook review notes/timestamps and separate
URLs for the same supporting image. These source records must remain traceable.

The existing signed Admin status controls applied the supported
Draft → Under Review → Unlisted → Discontinued path to **only** 001151/001152.
Every step included a reason naming the owner decision and retained SKU001150.
Neither source was made Live or marked human-reviewed; no product row was deleted.

Exact-K2 readback at `2026-10-26T05:55:43.131Z` confirms:

- 001151/001152 are Discontinued, unpublished, unreviewed and zero-stock.
- 001150 remains Draft. All 196 product records remain present.
- Only source status, updated timestamp and catalog-record version changed.
- Source workbook notes, identifiers, media and all other product fields remain.
- All captured lots, balances and Website listings remain byte-for-byte equal.
- Public catalog remains 120 listings; neither retired Draft was publicly listed.

Private evidence: `.tools/duplicate-products-20261026/pagani-dependencies.json`,
`borella-package-updates.json`, `complete-catalog-after-pagani.json`,
`pagani-conservation.json`. The first readback attempt did not execute because
automatic approval review reached an account usage limit. A later owner-requested
retry produced the readback above. No failed attempt is represented as evidence.

Discontinued is terminal in the supported lifecycle. Do not delete audit history,
recreate source rows or claim a normal UI undo exists. Any future correction needs
a separately reviewed history-preserving operational decision. Existing source
notes and snapshots remain the recovery reference. This bounded retirement is
complete; stocked Borella merge installation/application remains active MAP-023.
