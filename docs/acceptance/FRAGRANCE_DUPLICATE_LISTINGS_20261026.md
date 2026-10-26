# Fragrance duplicate Website listing correction — 26 October 2026

Owner: MAP-023 / IDEA-20261026-01. The owner supplied live catalog screenshots
and requested investigation and correction of duplicate product cards.

## Applied and observed

Nine redundant Website assignments were removed through the existing signed-in
Admin Website assignment dialog on `https://admin.k2jimzon.com/`. Every save used
the current assignment version and a reason naming the retained canonical SKU.
Each dialog subsequently confirmed the original decision was recorded and the
current assignment was **Not assigned**. No direct SQL business write was used.

| Product | Retained Website SKU | Paused Website SKUs |
| --- | --- | --- |
| G. Bellini One Fragrance 75 ml | K2-SKU-001145 | K2-SKU-001146, K2-SKU-001147, K2-SKU-001148 |
| G. Bellini Homme Paris 75 ml | K2-SKU-001072 | K2-SKU-001073 |
| G. Bellini Homme Sport 75 ml | K2-SKU-001074 | K2-SKU-001075, K2-SKU-001076 |
| G. Bellini X-Bolt 75 ml | K2-SKU-001193 | K2-SKU-001194, K2-SKU-001195 |
| Chalou | K2-SKU-001024 | K2-SKU-001025 |

Fresh exact-K2 read-only readback confirms precisely these eight captured
G. Bellini listings and the additional Chalou listing changed to `Paused` / `paused`.
The five retained listings remain
`Active` / `ready`. The captured product projections, complete related lot rows
and balance rows compare byte-for-byte equal before and after the correction.
All twelve fragrance products retain their original Live lifecycle, identifiers,
images and zero stock. This corrects listings; it does not merge product records.

An independent own-browser reload of `https://www.k2jimzon.com/catalog` showed
**122 products** after the first eight corrections, then **121 products** after
Chalou, down from 130. The final Fragrances category showed 10 products and
exactly one rendered heading/card for each of the five corrected products.
Admin still showed 196 product records, 130 active and 273 displayed
units. Those unit projections are not a physical stock count.

## Safety and evidence

Before applying, the twelve affected products matched within each group on
captured name, size, brand/category, unit, weight, price and review facts. They
had no lots or nonzero balances and no order items, legacy orders, reservations,
inventory events, active intake, family links, consignment items, purchase lines
or nonzero staff allocations. Independent review recommended reversible Website
unassignment rather than terminal Discontinued status or a new merge feature.

- Fresh K2 preflight verified project `pixplcjqivlfflickobf`.
- `npm run readiness:k2-live`: 8 verified, 2 owner, 3 connector, **0 blocked**.
  Unobserved provider/connector and broader hosted acceptance remain unverified.
- Fresh encrypted backup:
  `current-pixplcjqivlfflickobf-2026-10-26T020445114Z-bf37894c3cd4`.
- Isolated local restore verified at `2026-10-26T02:10:11.271Z`: 75 public
  relations, latest migration `20261013110000`; its owned local server stopped.
  Managed Vault, Storage objects and provider settings are excluded from proof.
- Private local evidence: `.tools/duplicate-products-20261026/initial-read.json`,
  `dependencies.json`, `group-facts.json`, `after-read.json`,
  `restore-receipt.json`; encrypted backup and restore proof under
  `.tools/current-production-backups/fragrance-duplicates-before-20261026.k2backup*`.
  Preserve these locally; do not commit environment files or raw provider dumps.

No app source, schema, security, prices, product lifecycle or quantities changed.
Existing production artifacts remain in use. Documentation of this data operation
does not require another application build, release gate or deployment.

## Final continuation and recovery

Final public category inspection also found Chalou K2-SKU-001024 / 001025 with
matching captured facts and the same image content-hash suffix. Both have zero
stock/lots and no checked operational dependencies. Browser access briefly became
disabled before this last correction. After the owner requested retry/continuation,
fresh exact-K2 dependency/readiness gates passed, and the signed Admin dialog
confirmed 001025 **Not assigned**. Readback confirms 001024 remains Active/ready,
001025 is Paused/paused, and both captured product rows, lots and balances are
unchanged. Private evidence adds `chalou-read.json`, `chalou-dependencies.json`,
`chalou-after.json` and `fragrances-after.png` in the same evidence directory.
All five bounded listing corrections are complete; no remaining step belongs to
IDEA-20261026-01. This completed slice is removed from the active MAP queue.

Stocked Borella groups remain untouched: Carne 45 units and Prosciutto 64 units
across their original lots. Their separate lot-preserving correction and package
qualification remain IDEA-20261025-04 in MAP-023. The SKU merge SQL is not installed.

To reverse a specific listing correction, freshly read its current Website
assignment and use the supported signed Admin assignment dialog to assign that
SKU again with a reason and fresh version. Do not restore the whole database,
delete records, change quantities or replay stale decisions. If a save outcome is
unknown, retain and retry the original saved request/key through recovery controls
before beginning another decision. Reverting this document does not reverse live
Website assignments.
