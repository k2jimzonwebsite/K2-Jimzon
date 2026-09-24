# 24 September 2026 search readiness — IDEA-20260924-02

Owner request: help the current site appear for Italian imported goods and Pasabuy searches, and prepare individual product pages for search when real product content is ready.

## Local preparation

- `src/lib/storefrontSeoPages.js` is the shared public intent-page metadata registry. `StorefrontMetadata.jsx` uses it after navigation; `generate-marketing-pages.mjs` emits distinct initial-response HTML for `/catalog`, `/pasabuy` and `/trade`.
- `generate-sitemap.mjs` lists those routes with Home. `emit-storefront-sitemap.mjs` writes the static pages and counts the four stable URLs without adding products while the prelaunch gate is on.
- `read-published-catalog.mjs` includes public `description` and `short_description` in its narrow read-only projection and reports missing descriptions. The projection was not refreshed from production in this change.
- `index.html` home metadata matches the client default. No visible page copy, search claims, publication status, database schema, provider settings or product indexing rules were changed.

## Evidence and limits

- Focused MAP-024/prelaunch contracts: 14/14 passed after the final metadata copy compression. `npm run verify:development` passed, including security and import checks.
- `npm run build:storefront` passed after copy compression: sitemap has Home, Catalog, Pasabuy and Trade; zero product URLs; three distinct marketing pages and one catalog-backed product prerender; JS 150.48/150.50 kB and CSS 29.58/30.00 kB gzip. Build output was inspected in `dist/`.
- **Live snapshot, 24 September 2026:** commit `5494b2bf71f7ecf30422e2b8c5bfc246b895bc9f` is on GitHub `main`. The live `/pasabuy` response served title `Pasabuy from Italy to the Philippines | K2 Jimzon` and its distinct description. Both Storefront and Admin target markers returned HTTP 200. The exact Vercel deployment ID was not captured. This confirms host metadata only; Search Console indexing and rankings are not verified or guaranteed.
- The owner-requested `npm run verify:release` did not complete. Its first 947 base tests printed passing results, then the runner stalled and was interrupted. See `docs/runbooks/DEPLOYMENT_RUNBOOK.md`.
- The 2 September product-wide noindex gate remains ON. Product search eligibility requires approved individual descriptions and genuine photos, a reviewed production catalog projection, deliberate gate removal, and real-host URL Inspection.

## Next action and recovery

MAP-024 owns the final local gate and deployed crawler response verification. MAP-018 owns real product content and deliberate publication. MAP-025 owns owner-approved release and representative search/customer acceptance. Follow `docs/PRELAUNCH_INDEXING.md` when opening product indexing. To roll back this local slice, revert the registry, marketing prerender, sitemap/projection edits, tests and documentation together; no provider rollback is needed because no provider state changed.
