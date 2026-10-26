# Duplicate SKU merge source release — 26 October 2026

Owner: MAP-023 / IDEA-20261025-04. The owner explicitly requested “merge, commit and push.” PR [32](https://github.com/k2jimzonwebsite/K2-Jimzon/pull/32) is merged into production-linked main. This receipt supersedes the source-promotion-pending state in PRODUCT_SKU_MERGE_20261025.md.

## Released source and boundary

- Qualified head: `203cce6e8eebcbbc6f3682925def3ae4a60bc376`.
- Merge: `f6fc249ba2e4b85dd63fdd6079c4b0449451df7e`.
- Both exact trees: `c06414b666a2131672ad179ffe645df7e0463565`.
- CI [40254143166](https://github.com/k2jimzonwebsite/K2-Jimzon/actions/runs/40254143166): build-and-smoke, critical-sql-behavior and security-check-regression all SUCCESS. The full acceptance job completed before merge; no merge bypass.
- The merged feature branch was removed. Main is the only local branch. A newly generated unrelated Dependabot remote branch is retained for its own qualification, not silently merged or deleted.

The existing Admin Inventory Grid exposes the reviewed three-group product/lot preview and confirmation, actor-bound literal-body/idempotency recovery, group-based stale reconciliation and signed Product Master command. Canonical Website eligibility and source lifecycle/conservation refusals are retained. No service-role key, permission weakening, alternate stock writer, family workaround or lot recreation is introduced.

**Source release only:** `20261025_product_sku_merge.sql` is not installed. No real product group, SKU, lot, balance, listing, order, payment or provider setting was written. The operational correction remains active in MAP-023; the newly visible control does not prove the pending database capability is available.

## Release qualification

Evidence directory: `product-sku-merge-release-20261026/` beside this receipt. `release-coverage.json` is the non-additive stage ledger; `ci-final.json` binds all CI jobs to the qualified head.

The requested `npm run verify:release` was started once. It was interrupted after the general runner discovered the fixture-specific merge suite. A resumed general run exposed logo navigation/startup trouble. Two bounded routing changes put the 3 merge tests in the existing Product Master fixture and 16 logo tests in the existing Storefront fixture; both remain in `npm test`. Independent discovery review confirmed no dropped cases. Existing Windows `K2_ACCEPTANCE_NO_WATCH=true` avoids private archive crawling for local acceptance; production builds retain their configuration.

The corrected base run passed **1,118** cases. Initial passing security, merge Node, family/category and base Node stages were preserved; every unrun stage, packaging and both separate production builds then ran. Three local batch failures have passing unchanged focused successors:

| Original batch | Focused successor | Limit |
| --- | --- | --- |
| Storefront 47 pass / tablet dark reduced-motion assertion failed | Same 768 dark case passes | Root cause unconfirmed; original retained |
| Admin 41 pass / guide fixture React preamble loading error | Same guide case passes | Development fixture error retained |
| Auth recovery 5 pass / detached-parent geometry read during resize | Same widget case passes | Original retained |

Thus complete local release coverage is **reconciled**, not an original clean aggregate exit 0. All other successor stages exit 0. The exact-head CI independently passes the full acceptance command. Earlier focused evidence remains in PRODUCT_SKU_MERGE_20261025.md: 32 Node tests, 23 isolated SQL checks including concurrent reservation insertion/refusal and stock conservation, and merge recovery browser checks. Development after the final source/test-routing edit passes.

Storefront landing budget: JS **143.67 / 150.50 kB gzip**, CSS **29.98 / 30.00 kB gzip**. Admin **227.44 / 300.00 kB minified**. Artifact boundaries, packaging and secret scans pass; no threshold changed. Source-only metadata/schema rehearsals and synthetic Auth/stock do not prove a live business merge, physical count, new login or physical-device journey.

## Verified production observations

| Artifact | Deployment | Source/state/alias |
| --- | --- | --- |
| Storefront | `dpl_HV3dvRaLibPWFi1uaRygYAf6kMdG` | Merge f6fc249b; READY, production; www.k2jimzon.com |
| Admin | `dpl_G8wXAh42tAcuQNd9Yb9RYPkP1sZM` | Merge f6fc249b; READY, production; admin.k2jimzon.com |

Authenticated Vercel connector observations bind both projects and canonical aliases to the merge. Actual canonical hosts return HTTP 200, correct `k2-build-target.json`, fetched entry assets, the existing Report-Only CSP and X-Frame-Options DENY. `deployment-final.json`, `production-http.json` and `production-receipt.json` retain details.

Own background browser observes the hydrated Storefront with catalog content and cart 0. The existing authenticated Admin session hydrates; Inventory loads **196 products / 130 Active / 66 Drafts / 273 displayed units** and the new Combine approved duplicates button. These are displayed canonical projections, not a physical recount. The control was not clicked, no merge preview RPC or saved decision was attempted, and no business write occurred. Temporary verification tabs were closed.

Fresh owner-checkout preflight confirms exact K2 `pixplcjqivlfflickobf`; readiness reports **8 verified / 2 owner / 3 connector / 0 failed**. Script-unreached connector states remain separate from directly observed Vercel deployment evidence. The unrelated Supabase connector was not used.

## Recovery and remaining operation

Source/per-project rollback is prior main `5e828bb7c3ad35880d10696f4f51ac741604f57e`: Storefront `dpl_8ir8NX5CiZbjirE25S3GE5LG6MdU`, Admin `dpl_G8WPCC5EjDVVB4wCFm9zdvLXGYuf`. Roll back only the intended source artifact; no database rollback is needed because this release applies no SQL/data changes. Historical recovery snapshots remain intact. This run's 157 regenerated historical screenshots were preserved under `.tools/sku-merge-completion/generated-images/` and their tracked baselines restored.

MAP-023 owns the exact current provider packet/helper-trigger-schema authority, populated conservation/rollback and backup/retrieval safeguards, then migration installation and the approved one-group-at-a-time Admin application/readback. Preserve every original lot ID, unit and historical reference and refuse groups whose current dependency/eligibility cannot be proved. Once a real merge has applied, never reverse stock or replay migrations blindly over later operations.

This final receipt is documentation/evidence only; its commit changes no application inputs and requires no redundant application test/build/deployment cycle.
