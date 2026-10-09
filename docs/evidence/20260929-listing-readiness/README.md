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

**29 September correction, IDEA-20260929-07:** The statement below describes the current query, not the owner's complete visibility rule. The owner requires an explicit Website channel assignment as an additional gate. `published=true` alone must not be called a Website tag. The current Storefront query has no Website assignment filter, and the Admin channel board does not assign one. MAP-018/026 own implementation and SKU-by-SKU reconciliation of the 22 already-published rows before any visibility-changing release.

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
7. **Protected Admin intake is not active on the exact host.** The Admin BFF is
   off and the edge gate returns 404 for `/api/admin/session`. This does not
   block or test the deployed direct Supabase login path, which still includes
   authenticator MFA for enrolled staff accounts. The direct path and legacy
   inventory listing need their own signed-in acceptance check; the protected
   new intake cannot be human-verified on production yet.
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

## Follow-up: the product-images bucket audit (same day)

An earlier line in this file said 1 of 30 products has an image, implying the
photos were simply missing. Checking the bucket changed the picture.

`product-images` is a **public** Supabase bucket holding 36 objects uploaded
19-20 July 2026. Only **7 are unique**; 15 objects are byte-identical copies of a
single file. Downloading and hashing them, then reading each unique image:

| Copies | Content | Verdict |
| --- | --- | --- |
| 15 | Bellarom Cappuccino tin, clean composite | Real photo, already linked to `bellarom-cappuccino` |
| 1 | Bellarom Cappuccino tin, styled editorial shot | Real photo, **unlinked**, and better than the linked one |
| 6 | Twinings Green Tea & Lemon box on a desk beside a keyboard, dented | Desk snapshot, damaged, and Twinings is not in the catalogue |
| 5 | Twinings Green Tea & Lemon, box torn open | Torn packaging, not in the catalogue |
| 4 | Screenshot of a TikTok video, Melophile "Banyuhay" | **Third-party copyrighted content in a public bucket** |
| 4 | Screenshot of `after_image_url` schema error | Debug screenshot in a product bucket |
| 1 | Screenshot of `invalid input syntax for type uuid: "bellarom"` | Debug screenshot in a product bucket |

**So the real media position is worse than "1 of 30", and also different in
kind:** 2 usable photos, both of the same single SKU. **Zero of the other 29
products have a photograph.** The 11 Twinings images are of a product K2 does not
sell, and 9 are screenshots that were uploaded to the wrong place entirely.

**Provider correction, 29 September:** The July screenshots show historical Smart Paste AI Import failures, but current signed-in Vercel evidence identifies `k2-jimzon-vert.vercel.app` as an alias of the existing `k2-jimzon` Storefront project. It shares the Ready Production deployment `CDHSSMBpvySmc82qzMQUVAJdWSkx` with `www.k2jimzon.com`, from `main` SHA `f95e384`, created by `k2jimzonwebsite`. There is no evidence of a third current project or independent writer. The owner will decide whether to keep or retire the extra hostname after a traffic/redirect check. This correction does not resolve the public-bucket media rights, the 22 published unreviewed rows, or the missing photographs for 29 products.

No production state changed. No object was deleted, no link was written, and the
bucket was only read.
