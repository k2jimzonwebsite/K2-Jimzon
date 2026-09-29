# Inventory listing readiness, 29 September 2026

**Scope:** a read-only measurement of the live K2 catalogue against the MAP-018
acceptance bar, then the source fixes that were possible without an owner
decision. **No production write, migration, flag, edge rule or deployment
occurred. Every figure below is a database projection, not a verified physical
fact.**

**Idea:** IDEA-20260929-03. **Owning item:** MAP-018, with MAP-026 for the stock
truth and MAP-024 for the customer-visible surfaces.

## What was measured, live, read-only

Through the Supabase management API with `read_only: true` only.

### Product facts — the real gap

Of 30 products:

| Field | Populated |
| --- | --- |
| published | 22 |
| `is_human_reviewed` | **0** |
| `brand_id` | **0** |
| `category_id` | **0** |
| image | 1 |
| description | 1 |
| barcode | 1 |
| price | 28 |
| subcategory | 22 |

The `brands` and `categories` tables **exist with zero rows**. There is no brand
or category data to display, which is why the defects below had not surfaced.

### Lot ledger — not the gap

21 lots, 21 SKUs. Zero missing expiry, custodian, hub, box code or status. Zero
consignment, zero unaccounted, zero damaged or expired. The stock ledger shape is
sound; the product facts are what is missing.

### Stock truth — three sources that disagree

| Source | SKUs |
| --- | --- |
| `products.stock_available` | 21 positive |
| `v_product_stock_from_batches` | 21 |
| `inventory_balances` | **29** present, 25 on-hand |

Eight SKUs exist only in `inventory_balances`. The storefront displays the batch
figure with a fallback to `products.stock_available`. This is MAP-026's
"splitting stock truth", measured rather than theorised.

### Infrastructure

`product_intake_sessions` and `k2_sku_seq` are both absent, so the protected
intake path cannot run. `products_status_check` allows exactly
`Live/Active/Unlisted/Draft/Discontinued`, which confirms the `Draft` fix.

## A correction to an earlier reading

An initial pass reported that 11 live products were unreachable by any category
chip. **That was wrong.** It came from a paraphrase of `src/data/products.js`
rather than the file. Read at source, `CATEGORIES` does contain
`Seasoning, Staple Foods & Baking Ingredients`, `Beverages`, `Bath & Body` and
`Fragrances`. A query restricted to live and published products returned **zero**
unreachable. The 8 products with an empty subcategory are all unpublished.

What is real is narrower: **5 of the 10 chips match zero live products**
(`Breakfast Food`, `Hair Care`, `Skin Care`, `Slimming`, `Whitening`). This is an
editorial taxonomy awaiting stock, not a defect — `CatalogGrid.jsx:99` already
renders "No products found matching these filters" with a Clear filters action.
No code change was made and none is warranted.

## Fixed here

### 1. A foreign key was being printed as a brand name

`MasterProduct.jsx:288` rendered `product.brand_id` directly into the
customer-facing Brand row, `MasterProduct.jsx:183` fell back to
`product.category_id` for the category chip, `storeAssetPlan.js:189` copied the
same value into the 3D store asset plan, and `productStructuredData.js:59`
emitted it as schema.org `brand.name`. A UUID is not a label, and a UUID in
`brand.name` is invalid structured data.

New `src/lib/productIdentity.js` treats a bare UUID as "not set". A resolved
`brand`, `brand_name` or a non-UUID `brand_id` — which is how the local sample
catalogue stores it — still displays. Showing a real brand still requires
resolving the name from the `brands` table, which is blocked on the table being
empty.

### 2. `published` had no review guard

The database blocks a status change to `Live` with `K2_PUBLICATION_NOT_READY`
in three functions. The storefront's real gate is `published = true`, written by
a direct `update` at `Sheet.jsx:282` with no review check. All 22 published
products have `is_human_reviewed = false`, so the MAP-018 rule "staff review
actual label, allergen, storage, price and media rights before publication" was
not enforced on the path that actually publishes.

`Sheet.jsx` now refuses to set `published: true` on an unreviewed product and
reports `PUBLISH_REVIEW_REQUIRED`. This closes the admin path only.

### Verification

`tests/listing-readiness-contract.spec.js` 7/7, added to `test:contracts`.
`npm run verify:development` exit 0. Surrounding source-pin suites 67/67.

## Recorded, not fixed — these need an owner decision or a connector

1. **All 22 published products are unreviewed, right now, in production.** The
   code guard stops the next one. Whether to unpublish the existing 22 or accept
   them is an owner decision, and unpublishing is a production write.
2. **The database has no `published` review guard.** The UI guard is bypassable
   by any other writer. Closing it needs a trigger or a restricted update path,
   which is a migration and needs owner authorization.
3. **`brands` and `categories` are empty.** Brand and category display cannot be
   completed without reference data, and that data comes from real packaging.
4. **1 of 30 products has an image, a description or a barcode.** Media rights
   and label facts are owner work. The barcode lookup feature is therefore
   effectively dead for 29 SKUs.
5. **Three stock sources disagree.** Choosing the canonical source is an
   architecture and owner decision for MAP-026, not a code patch.
6. **Intake is unappliable** until `product_intake_sessions` and `k2_sku_seq`
   exist. Owner authorization is the only missing input; see
   `docs/runbooks/K2_PRODUCTION_READINESS_RUNBOOK.md`.
7. **Staff cannot sign in on the exact host.** The Admin BFF is off and the edge
   gate returns 404 for `/api/admin/session`, so none of the above can be
   human-verified on production. Vercel and Cloudflare are unreachable from this
   harness.
8. **Pre-existing, unrelated to this work:** `tests/storefront-selling-surfaces.spec.js`
   fails under `playwright.api.config.js` because that config has no `baseURL`
   for its relative `page.goto`, and its intended `playwright.selling.config.js`
   times out waiting 120s for its web server on this Windows host. Both reproduce
   on a pristine checkout. The browser suites could not be run here, so the three
   fixes above carry source-pin and unit evidence only, not browser evidence.

## Recovery

No production state changed, so there is nothing to recover. The source change is
one commit on `main`, reversible with `git revert`. Standing recovery is
unchanged: both BFF flags off, Admin edge gate closed, previous separate Vercel
deployments retained.
