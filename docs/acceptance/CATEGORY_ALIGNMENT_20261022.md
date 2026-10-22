# Category alignment — 22 October 2026

Owner: MAP-023 / IDEA-20261022-01. This is an audit/evidence record; MASTER_ACTION_PLAN.md is the only execution backlog.

The owner confirmed inventory-derived Home/Catalog/Footer categories, bulk staff assignment and creating category names through assignment. Sold-out Website-listed products remain browsable for Pasabuy. Existing display `subcategory` is the staff-managed storefront shelf; canonical `category_id` continues to determine operational category policy and product-family eligibility. The established storefront wood/editorial identity and Admin product register remain authoritative.

## Fresh observed data

Read-only exact-K2 identity passed through the permitted network path. Product/category/Website SELECT observation: 2026-10-22T04:55:08.367Z (12:55 Singapore). There are 196 canonical product records, 93 published Website-listed Live/Active records, 13 canonical categories and 34 canonically unassigned records, all Draft and outside those 93 listings. Thirteen records have differing canonical/display labels; ten are listed, including six Fragrances labels under canonical Personal care. These dimensions must not be silently collapsed.

| Canonical category | All records | Listed records |
| --- | ---: | ---: |
| Biscuits and wafers | 10 | 5 |
| Chocolate | 12 | 10 |
| Clothing | 2 | 0 |
| Coffee and drink preparations | 23 | 16 |
| Cooking oils | 3 | 2 |
| Pasta | 25 | 14 |
| Pasta sauces | 6 | 4 |
| Personal care | 27 | 12 |
| Pesto and sauces | 18 | 15 |
| Sweet spreads | 6 | 4 |
| Sweets | 10 | 7 |
| Tinned fish | 19 | 4 |
| Tinned meat | 1 | 0 |
| Unassigned | 34 | 0 |

No stock conclusion is claimed. An attempted SELECT including the public stock view refused EXECUTE on get_public_product_stock; the audit was narrowed to category/product/Website reads without changing grants. The initial restricted-network identity refusal was followed by a successful permitted-network identity check. The unrelated Supabase connector was never used.

Live Chrome observation of the owner's open K2 Catalog shows the selected legacy `Seasoning, Staple Foods & Baking Ingredients` category, zero products, fixed legacy category controls and fixed Footer links. Capture: ../design-checkpoints/20261022-categories/live-empty-category.png. Raw read-only inputs initially retained in outputs/category-audit-20261022/.

## Reviewed behavior

| Before | Accepted correction | Why |
| --- | --- | --- |
| Fixed Home/Footer category names and empty Catalog fallback | Shared categories counted from the listed product set | Every offered shelf leads to real public listings. |
| A stale selected category is inserted into the menu | Successful current read returns obsolete category URLs to All | Old links do not manufacture empty shelves. |
| Local canonical-first mapping hides staff Fragrances labels | Staff display category first, canonical name as fallback | Preserve current merchandising and operational policy separately. |
| Staff repeat individual editor saves | Search/filter, select many, review one destination, apply with progress | Existing protected updates/recovery handle each actual SKU. |

Alternatives considered: editing the fixed lists would drift again; introducing a second storefront category registry would duplicate maintenance. The accepted inventory-driven model reuses current fields and transport. New names become reusable when assigned; there is no empty category creation side effect. Uncertain saves retain their original actor/body/key and stop remaining work. Confirmed earlier rows remain saved; the batch must never claim atomic success.

## Local implementation and final evidence

The source correction is implemented on the existing `codex/admin-google-turnstile-recovery` feature branch, preserving its pre-existing dirty work. `src/lib/storeCategories.js` supplies the display-first/canonical-fallback resolution and category counts. StoreContext exposes the same `storeCategories` to Home/Catalog/Footer and clears obsolete category filters only after a successful current read. A configured empty database no longer shows demo products during development. The dynamic Home list does not depend on an intersection animation threshold, so a long list stays visible.

InventoryGrid now offers Store category filter and Set store category for selected SKUs. BulkStoreCategoryDialog shows the exact selected rows, accepts an existing or new name, saves one existing protected/versioned Product Master update per row, and reports confirmed, already-assigned and remaining counts. An unknown/refused save stops the batch and keeps the existing original pending Product Master request. The Admin read projection adds `category_name` through the existing category relation so default labels agree with storefront fallback. No new backend writer, security privilege, category registry or SQL migration was added.

| Verification | Outcome |
| --- | --- |
| Initial two rendered regression cases before UI implementation | Both failed at missing real category tile / missing bulk action, as expected. |
| Invalid-name correction regression | Reproduced disabled input after validation; fixed with an explicit started-batch state. |
| Canonical-name Admin projection regression | Failed on missing category_name, then passed after the narrow read projection addition. |
| `npm run test:store-categories` | Exit 0: 4 pure checks and 11 actual-component Chromium journeys. Includes display fallback, sold-out shelf, Draft exclusion, stale URL, empty database, new bulk label → refreshed Home/Footer, partial failure/reload recovery, editable invalid input, filtered selection, 375/1440 layouts and 50-category visibility. |
| `node --test tests/admin-product-read-taxonomy.test.mjs tests/admin-product-stock-read.test.mjs` | Exit 0: 12 protected read checks (included with the four pure category checks in the 16/16 focused run). |
| Existing Storefront truth, catalog freshness and Admin BFF contracts | 135/140 passed in the restricted run; five HTTP cases refused loopback with EACCES. Only those five were rerun with permitted loopback and passed 5/5, exit 0. Combined current evidence covers all 140. |
| Impeccable detector, bulk dialog and CategoryTiles | Exit 0, `[]` findings. |
| `npm run verify:development` | Exit 0 after final code/test/package edits; Admin/session, identity/readiness contracts, environment/file/dependency/security surface/secret and import-integrity gates pass. Source inventory reports zero dynamic-operation and BFF classification gaps; secret scan checked 2,818 files. Full log: `outputs/category-audit-20261022/development.log`. |

One desktop/phone visual batch and a bounded confirmation were inspected. Retained local captures: `../design-checkpoints/20261022-categories/bulk-375.png`, `bulk-1440.png`, `store-375.png`, and `store-1440.png`. Synthetic product names, quantities and writes in these captures/tests do not establish any production product state. The storefront wood canvas and Admin product register remain intact. No complete release gate/build/deployment is required or claimed for this local implementation.

The read-only audit resolves to 15 currently populated public display shelves across 93 listings; counts and the 34 canonically unassigned Draft SKU IDs are retained in `CATEGORY_ALIGNMENT_20261022.json`. Exact raw product/category observations and the final development log are durably copied to `category-alignment-20261022/`. This is a projection of observed assignments, not an authorization to classify held Drafts or confirm physical stock. Existing Spaghetti/Pasta, Beverages/Coffee and Sweets/Sweets and confectionery labels remain separate staff choices until explicitly reassigned with the new bulk workflow.

## Remaining operational work and recovery

MAP-023 owns genuine staff/host acceptance and any separately owner-requested source release or real product assignments. The local implementation tasks are removed from the active queue. No production category assignment, canonical taxonomy change, schema/provider write or deployment occurred. Readiness was not needed for a production step because no such step was taken.

For source rollback, reverse only this category slice: storeCategories helper, BulkStoreCategoryDialog, CategoryTiles/CatalogGrid/Footer wiring, StoreContext category derivation/empty configured catalog guard, InventoryGrid filter/action/label, Admin category-name projection, package test entry and associated tests/fixtures/config. Preserve previous product-family, media, authentication and other dirty work. Preserve all original pending Product Master actor/body/key records and use existing retry/latest review to resolve an uncertain request. Subsequent stored label corrections require fresh normal Admin decisions; never restore stock/provider state to reverse a display label. Exact staff steps are in `../runbooks/STORE_CATEGORIES.md`.
