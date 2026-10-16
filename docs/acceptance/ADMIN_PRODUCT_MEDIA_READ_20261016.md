Release authorization update16October: owner explicitly approved the narrow live release after the initial preparation below. Current execution/evidence: ADMIN_PRODUCT_MEDIA_READ_RELEASE_20261016.md. Earlier pending-approval wording is historical.

# Admin saved-photo read correction — 16 October 2026

Owning work: MAP-023 / IDEA-20261016-01. This is evidence, not another backlog.

The owner asked to continue the prior inventory-listing session and explicitly approved Draft content/photo enrichment, the exact saved McKennedy brand retry, then Sweet spreads creation and initial paired assignment for SKU K2-SKU-001125. No live code release has yet been authorized in this chat.

## Verified actual product changes

Normal signed-in production Admin acknowledged McKennedy reference creation, two photo uploads/assignment, Sweet spreads creation, and the existing Draft's paired taxonomy/content Save. Reload shows McKennedy Cookie Creme Duo Cookie, SKU001125, Draft, price0/stock0. Exact-K2 read-only reconciliation at2026-10-16T07:14:06.978Z confirms short name, description, serving suggestion, McKennedy/Sweet spreads IDs, PRIMARY and one lifestyle image, no supporting image, published=false and is_human_reviewed=false. Barcode/net_weight/size remain null. Combino remains Live349PHP/10units with unchanged2026-10-15timestamp. No stock/publication/Website/review or role change; no direct SQL write.

Canonical receipts: outputs/listing-handoff-20261015/mckennedy-media-readback-resumed-20261016.json and mckennedy-enrichment-readback-resumed-20261016.json. Screenshots: docs/evidence/20261016-draft-enrichment-resumed/mckennedy-saved-draft.jpg and mckennedy-saved-card.jpg. All195JSON/CSVhandoff rows agree; only001125actual-enrichment fields changed, proposed source facts preserved. Manifest retains local quality/provenance and separate actual-assignment fields.

## Observed defect and bounded correction

Production Photos reopened with PRIMARY only, although canonical lifestyle_images contains the saved AFTER URL. Source prepared-api/admin/products.js selects/projects only primary_image_url. PhotoManagerModal initializes AFTER from product.lifestyle_images[0] and supporting slots from secondary_images; a later ordinary save could therefore clear saved slots. Do not upload again or treat an empty production dialog as canonical absence.

The local correction adds only lifestyle_images/secondary_images to the existing protected query and response, preserving arrays and returning empty arrays for unset fields. Existing authorization, routes, writer, stock derivation, taxonomy and schema are unchanged. Manual scoped diff review found no actionable issue in these two files; this is not independent agent review. Against the current origin/main, the source/test diff is23insertions/1deletion in two files; unrelated dirty work is excluded from any proposed release.

## Verification

- Required preflight:k2-project initially refused unavailable sandbox network; network-permitted read-only run45dc15 exit0 identifies pixplcjqivlfflickobf. readiness:k2-live d9bfe5 exits0:9verified/2owner/3connector/0blocked; script writes .tools/current-production-backups/live-readiness.json. Passing gates authorize no SQL.
- Failing-first node --test tests/admin-product-read-taxonomy.test.mjs (801607):2existingpass/2newfail because saved lifestyle array is undefined. Same command after minimal correction227c4c exits0,4/4pass, including current stock-unavailable behavior and empty slots.
- npm run verify:development was run once after the final source edit (d6bf35/c63ca5):75/76Admin checks passed; the one loopback HTTP test never reached its local POST in the sandbox. Exact failed-file retry with loopback permission6930c6 exits0,2/2pass. Unexecuted remaining prebuild constituents ran once ada143/28a9c1 and exited0:environment, project/readiness, sensitivefiles, sourceboundary, dependencies, surfaces0gaps, secrets and imports. Do not describe the initial aggregate command as exit0.
- Scoped git diff --check6ecc84 exits0. No later code edit. No redundant application build/browser release gate was run; owner-requested promotion requires verify:release once immediately before it.
- First canonical read-only query used a nonexistent human_review_completed column and was refused42703; corrected is_human_reviewed query a47db9 exited0. No write/retry of a mutation followed from that diagnostic error.

## Current limits and recovery

Source correction is prepared locally, uncommitted/unpushed/undeployed. Live AFTER/supporting reopen remains defective until released and observed. A narrow live-release question is pending; owner approval must precede production-linked main promotion. Preserve both existing photo URLs and versioned files; no repeated upload, orphan cleanup, destructive rollback or SQL needed. Revert only prepared-api/admin/products.js and the added test lines for source rollback. Recover product copy only through normal current-version/reasoned Admin commands; initial taxonomy changes require a separately reviewed correction path. Remaining194Draft enrichment, missing/held media and broader operational acceptance remain in MAP-023.

Final data-only check:195JSON/CSVrows agree, all joined paths exist,30PRIMARY/164AFTERpaths are current,194selected assets decode/hash/geometry checks pass and5source/evidence pins match. These asset/handoff records do not grant human approval. No code changes after the documented development batch.
