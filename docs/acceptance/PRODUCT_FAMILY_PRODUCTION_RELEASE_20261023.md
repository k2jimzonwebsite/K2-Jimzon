# Product family production release — 23 October 2026

Owner: MAP-023 / IDEA-20261021-03 and IDEA-20261022-03. [PR21](https://github.com/k2jimzonwebsite/K2-Jimzon/pull/21) merged at 2026-10-22T16:27:22Z (23 October, Singapore). Tested head: `dcca20ac441b903a41ff514b12a430d101e90571`. Production source merge: `8d5d4e3cc00d44ca334f2abd6d3913361f143036`. The source trees are identical; the merge adds ancestry only.

The owner explicitly answered **“Publish the feature after gates pass”** to approval of PR21's variation feature on the separate Admin and storefront, retaining the 103 held Drafts and unconfirmed family memberships. The authorized source release is verified live. No family assignment, product/stock/publication decision, SQL replay, credential change or unrelated primary-checkout feature was performed.

## What changed and why

The feature links existing SKUs for optional family discovery and variation selection while retaining each SKU's price, stock, photos, facts, Knowledge, publication and order history. Actual-component regressions fixed a successful authorized family GET returning503, new-member lifecycle labels disappearing, and a direct variant search selecting the wrong sibling. Eligible public members alone determine choices, counts and price ranges. Grouping reads are deferred so price/stock loading remains independent.

The compatible Vite patch8.2.2 →8.2.4 restores the existing mandatory zero-vulnerability audit without changing any transitive package version or weakening package policy. Unrelated mixed primary-checkout work was excluded. Full source review and dependency review found zero Critical or Important findings. Detailed source/files/evidence: [candidate](PRODUCT_FAMILY_CANDIDATE_20261022.md), [dependency gate](PRODUCT_FAMILY_DEPENDENCY_GATE_20261022.md), and their pinned receipts.

## Reconciled release qualification

The owner-requested `npm run verify:release` was invoked once. **Its original exit status remains1.** It passed the family18 Node/23 Chromium cases, categories4 Node/11 Chromium cases and1104 base browser cases, then failed the route-documentation assertion because the new family route made104 Admin routes while two docs still said103. The only subsequent tracked source delta is those two documentation corrections; the focused security-surface suite passes4/4.

Continue the release manifest at unrun tasks instead of restarting passing prefixes. The first continuation passed mobile4, orientation12, storefront32, storefront recovery29, Admin42, and7 shop-stock cases. One ShopAllocationManager module-fetch failure happened before behavior assertions; the exact unchanged focused case passes1/1. Its PowerShell result-array errors make the outer status/results receipt unreliable; that wrapper is explicitly excluded from qualification. Its raw command output and next-task boundaries preserve the actual passing stage evidence.

The reliable Node continuation records native child exits. Auth recovery5, payments47 plus catalog legacy1, and inbox41 pass. Product Master passes55 cases, with one initial customer-rate fixture heading-mount failure before business assertions; the exact unchanged focused case passes1/1. The previously unrun sheet-reference subchain and all remaining manifest commands then pass with explicit native exit0. No application code changed for either transient fixture failure, and their original logs are retained.

The final11 native-exit tasks cover sheet reference2, Website assignment14, owner count1, customer account8, selling surfaces14, direct receipt2, workflow API, intake AI, Vercel packaging and both builds. `post-product-master-results.json` records complete=true and11/11 exit0. Final independent manifest-union review approves with no Critical or Important verification gap. Do not relabel the original full invocation as successful.

[Required CI39811392474](https://github.com/k2jimzonwebsite/K2-Jimzon/actions/runs/39811392474) passes both build-and-smoke and critical-sql-behavior at tested head dcca20ac. Both project previews also pass. Older failed/superseded CI remains historical evidence, not current required status. Final artifacts pass boundary, package policy and secret checks: storefront147.42/150.50kB JS gzip and29.95/30.00kB CSS gzip; Admin226.68/300.00kB minified. All49 Admin manifest-referenced files and its static404 exist.

Raw command output, original failures, focused passes and controller files are preserved in both worktree and primary `.tools/product-family-release-20261023/`. Tracked [qualification receipt](product-family-production-20261023/release-qualification.json) lists SHA256/size for every archived file. Native phase receipts are adjacent. No redundant suite/build rerun is required for the documentation-only completion receipt.

## Production gates and artifacts

Fresh owner-environment `npm run preflight:k2-project` confirmed exact K2 `pixplcjqivlfflickobf` and `https://pixplcjqivlfflickobf.supabase.co`. `npm run readiness:k2-live` reports9 verified /2 owner /3 connector /0 blocked, with no failed gate. Readiness JSON and logs are retained. Unreached connector classifications remain unobserved; these receipts confirm neither physical facts nor business-write authority. No unrelated Supabase connector was used.

Vercel team: `team_C3Wf3dVUBjUqGQ4rndMTCchz` / k2-jimzon. Both production deployments are READY, point to the exact merge SHA, and own their custom-host aliases:

| Surface | Project | Production deployment | Verified host |
| --- | --- | --- | --- |
| Storefront | prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL | dpl_3QsTqaJEu7h5xUzz5pjkkHkWycQ4 | https://www.k2jimzon.com |
| Admin | prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x | dpl_AZWP7K74vpyXWoQi3v9MxUYHno35 | https://admin.k2jimzon.com |

Raw read-only metadata is stored in `product-family-production-20261023/{storefront,admin}-deployment.json`. Preview success alone was not accepted as production evidence.

## Actual-host read and preview

On the refreshed custom Admin host, authenticated Admin inventory loads196 SKUs,93 active,103 Drafts and273 projected units. Search finds the four Montegrappa records. Selecting only K2-SKU-001131 and001132 and opening **Manage variations** completes the actual protected family read, displaying both exact names and separate **Live · Website Assigned · ready** state. The mother name/type fields remain empty. The editor closes without saving; selection and search are cleared. No error/warning logs were present on this bounded check. Saved [dialog text](product-family-production-20261023/admin-family-preview.txt) and [screenshot](product-family-production-20261023/admin-family-preview.png) show this genuine read/preview.

The public custom host renders93 catalog listings. Opening **Tigullio Genovese Plain** reaches `/product/K2-SKU-001178`, price297PHP and4 ready units, retains the independently saved copy, and shows no family selector for this ungrouped SKU. All six main/related images inspected by DOM were decoded. No cart, order, payment, message or data save was submitted. [Catalog snapshot](product-family-production-20261023/storefront-catalog.txt), [product snapshot](product-family-production-20261023/storefront-product.txt) and [screenshot](product-family-production-20261023/storefront-product.png) are retained. This is a desktop browser check, not physical-device or saved-family/order acceptance.

## Remaining work and recovery

The owning active item is MAP-023. Supported exact membership/option choices, the103 held Drafts' identity/photo/selling-unit/price/taxonomy/human-review/physical-stock facts, actual family save/reopen/recovery and customer exact-variant order/reservation/FEFO remain unresolved. Existing original-workbook comparison and variation-review candidates are review inputs only. Do not infer values or manufacture a grouping/order just to claim acceptance. No real family assignment was authorized by this source release.

The exact family migration was installed once before this release and is unchanged: `supabase/migrations/20261021_product_families.sql`, SHA256 `e3ffcaa9b9029cb92d3c071c411f6131c67ba8053a4828f99f53b3f9648bb1cb`. **Never replay it.** Previous copy saves and held-fact decisions must not be replayed either.

Presentation rollback targets are the previous verified separate production artifacts at source `a9e369a7a6b7f586f05efaee5ea8d109f64b688b`: storefront `dpl_GBwyskHP2jnp7U2MdjyctcQiiU3X`, Admin `dpl_5pm9fxX9B9UXU6PKg7teTi36giXs`. Restore those artifacts for a source regression without dropping/replaying schema or restoring older SKU/lot/order rows. Future authorized grouping reversals use normal versioned ungrouping and retain event/receipt history. Primary mixed work and all original pending commands remain preserved.
