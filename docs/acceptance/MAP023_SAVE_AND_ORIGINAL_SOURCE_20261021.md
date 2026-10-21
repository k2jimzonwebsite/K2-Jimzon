**21 October 2026 / release gate green:** The focused retry of the lone phone-navigation timeout passed without source/test changes. The complete `npm run verify:release` retry now exits 0, including all test groups, Vercel packaging, both production builds, boundary/budget and secret checks. No production promotion is claimed by this local gate. Exact Admin-only deployment remains the next MAP-023 action; do not rerun application checks for this receipt-only update.

# Product Knowledge save and original inventory source — 21 October 2026

Owning queue: MAP-023; existing decisions IDEA-20261014-04 and IDEA-20261018-01. The owner asked to remove the listing blockers and directed checking the original Downloads workbook. This is a current evidence receipt, not a second backlog or full storefront acceptance.

## Corrections to earlier reports

- Exact-K2 read-only preflight passes with permitted network access. The original sandbox failure was DNS ENOTFOUND api.supabase.com, not an observed project/token failure. Readiness exits 0: 9 verified, 2 owner, 3 connector, zero blocked/failed. No connector marked unreached is claimed observed. No unrelated Supabase connector was queried.
- Vercel Admin dpl_D5q63DTZxBE32sW2dDaFbn5p5Qjk is Ready at 5f700020f313d481407a4bc76a7e3d3e2f613781. The normalized V3 loader was already live. Storefront dpl_Cwy8Ap55XVYvsdya5GnnFGaaS9td is a separate unchanged artifact at the same source revision.
- All 196 review products, including 93 Live, now have source-linked SKUs. Exact source-review ID, original workbook hash and identical source-row arrays filled 104 formerly blank local links with zero conflicts. Combino is the existing three-lot dated/count-matched exception. This resolves the source crosswalk, not held-package/GTIN identification.

## Scoped code correction and evidence

The existing generator used camelCase seoTitle/metaDescription while the BFF/database required lowercase snake_case. It also emitted provenance.contract, which the BFF's closed allowlist rejected. Both reproduce REQUEST_INVALID before database dispatch.

Changes: src/lib/storeAssetPlan.js uses seo_title/meta_description; server/admin-bff/product-knowledge.js allows contract under the existing 200-character text bound. Unknown provenance keys still refuse. Three maintained tests cover parser-to-save mapping, bounded provenance, and complete-field queue accounting. No migration or authentication change.

Clean managed worktree: C:\Users\jerze\.codex\worktrees\product-knowledge-publish\K2 JImzon, branch codex/product-knowledge-publish-fix, base 5f700020. Original dirty working files are excluded. Test-generated screenshots are excluded from the release commit.

| Evidence | Result |
| --- | --- |
| Failing-first Node/Playwright checks | Both key and provenance failures reproduced before correction |
| node --test tests/product-research-draft-normalization.test.mjs | 2/2 pass |
| Selected map027-product-knowledge-persistence + map027-store-polish contracts | 86/86 pass |
| npm run verify:development | Exit 0 after final code edit |
| First npm run verify:release | Stopped at one Admin phone-navigation heading timeout, 41 other Admin UI cases passed |
| Isolated exact failed Admin phone-navigation case | Pass, 1/1, no code/test change |
| Release retry | Exit 0; all application tests, packaging and both builds pass |

Logs are in the clean worktree .tools/product-knowledge-save-20261021/development.log, release.log and release-retry.log. Current production is the old known deployment until a later explicit receipt proves the correction live. Product Knowledge persistence/public readback has not yet been accepted on the corrected host.

## Original workbook reconciliation

Source: C:\Users\jerze\Downloads\10_13_2026_JINJIN-INVENTORY-2026 (1).xlsx, SHA256 c880ebb85869f010b40e7929000d6d45e671000c5e7c0a705f95e7a3c6f8b0f9. Read OCT_13_2026 only as the dated stock snapshot. Historical sheets were not added together or subtracted. Preserve original invalid dates and text counts.

All 241 source rows map to the existing 196 products. All 49 current lots match the exact source quantity and expiry: 273 total, 0 reserved. No current lot differences found. The 192 source rows without lots include 181 positive counts, 10 zeros and one blank quantity. This is record coverage, not proof of lost stock or readiness to receive every row. All 33 zero-SRP products have no own-row price in this workbook.

Source totals remain separate: 1212 numeric as-listed units, 79 explicitly marked full packs, 26 pieces. Never call 1212 or a sum of all three the complete sellable-unit count. Five rows mix packs and pieces. Existing owner confirmation of 220 rows and Warehouse A/Bulacan/Jenna custody remains valid evidence and must not be requested again. Staff-deferred mixed rows34/36/123/125/135, implausible-date rows142/200 and blank quantity row137 remain held. Blank/SEPARATE cargo-box notes cannot become fabricated box labels. Remaining dated product rows also require their existing price/photo/identity/publication gates.

Aggregate machine receipt: MAP023_ORIGINAL_INVENTORY_RECONCILIATION_20261021.json. Detailed local artifacts in outputs/01a1395d-4c7c-77b2-9fe8-1760963e7e0c/product-content/: CANONICAL_SOURCE_CROSSWALK_20261021.json, ORIGINAL_INVENTORY_RECONCILIATION_20261021.json and .csv. Review JSON/CSV and verification.json are updated locally only. The read-only recipe is .tools/product-knowledge-save-20261021/reconcile-original-inventory.py; run with the bundled Python/openpyxl. It checks hash, one-to-one row coverage, ID/hash/row equality, 49 exact lot matches and 273 conservation before producing artifacts.

## Limits and recovery

No inventory import, lot/stock edit, selling-price inference, provider/SQL write, product publication or source-file transfer to Admin was performed in this reconciliation. The earlier manual owner loading decision and MAP-027 human acceptance remain. Main and storefront must not receive unrelated dirty workspace changes. For a source regression restore the previous Admin deployment only; no database rollback applies. For a future actual stock discrepancy, reread current lot/reservation/version state and use a normal reasoned Admin correction; never overwrite from the old workbook or replay an acknowledged batch. Exact remaining work is in MAP-023, not this receipt.
