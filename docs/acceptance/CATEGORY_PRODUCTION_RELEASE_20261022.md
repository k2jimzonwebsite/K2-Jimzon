# Category production release — 22 October 2026

Owner: MAP-023 / IDEA-20261022-01. The owner explicitly said proceed after the feature-only delivery gap was explained. This authorizes the category source release to main and both existing production artifacts; it does not approve missing product facts, stock, prices, human reviews or blanket Draft publication.

Production base: 5f700020f313d481407a4bc76a7e3d3e2f613781. Original feature commits remain on codex/inventory-categories. This candidate ports only category commit4a0506c onto current main, resolving conflicts with the existing catalog/search and Admin behavior; unrelated bdc6d8d progressive-search, media and Admin changes are excluded. The public query adds the canonical category-name relation needed for truthful fallback. No schema or provider-setting change.

Focused evidence on the current-main integration: node --test tests/store-categories.test.mjs tests/admin-product-read-taxonomy.test.mjs passes9/9; npm run test:store-categories passes4pure plus11actual-component Chromium journeys. Current-main fixtures preserve normal storefront search, shared categories, sold-out browsing, Admin bulk preview, category filtering, original-request recovery and partial-stop behavior. Final development and complete release gate are pending and are not yet claimed green.

Fresh exact-K2 identity passed. Browser inventory reports local browser use disabled in Work settings; owner access request is pending. Do not substitute local synthetic rendering or provider metadata for real hosted staff/browser acceptance. No production promotion or product mutation has occurred at this checkpoint.

Remaining action: independent source review, final development and single complete release gate, scoped commit/main push, both existing Vercel artifacts and public category checks, then independently eligible listing work under existing product-specific holds. Preserve original dirty checkout. Source recovery is a reviewed revert of this category slice or restoration of the previous verified production deployment; no database restore or replay of business decisions. Keep all pending original actor/body/key records.
