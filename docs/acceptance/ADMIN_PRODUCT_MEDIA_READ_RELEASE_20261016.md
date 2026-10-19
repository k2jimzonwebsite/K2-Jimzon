# Narrow saved-media read release — 16 October 2026

Owning work: MAP-023 / IDEA-20261016-01. Owner explicitly approved this narrow live release in the current chat. Other dirty work is excluded.

Baseline production source:6dfbc114bb1dd0954647495d3d62385a8780aef8. Prior Admin deployment:dpl_FafCR582RsTk2naiJcCuDAY7bck1; prior Storefront:dpl_Fn9Ku2gTTu7EG54FfaTqbD9YVeGf. Both remain rollback candidates only through the normal reviewed source/deployment path; no data restore is proposed.

Runtime scope:prepared-api/admin/products.js adds existing lifestyle_images/secondary_images to its literal select and response. Test scope:tests/admin-product-read-taxonomy.test.mjs covers populated/empty photo slots and stock-unavailable behavior. No writer, route, schema, permission, secret, product status, inventory, price or publication change. Preparation/live product evidence:ADMIN_PRODUCT_MEDIA_READ_20261016.md and companion JSON.

Managed isolated worktree:C:/Users/jerze/.codex/worktrees/admin-media-read-release/K2 JImzon, branchcodex/admin-media-read-release. Matching package-lock allows reuse of existing node_modules through a junction. No owner private management token is copied; builds use only an allowlisted public frontend environment.

Clean origin baseline taxonomy tests pass2/2 (2a9883); copied tested correction passes4/4 before release. Release gate/exact source commit/production receipts and genuine saved-slot reopen remain in progress; do not call this deployed until receipts are appended. Keep pending action solely in MAP-023. Preserve saved001125photoURLs without repeated upload or empty replacement.

## Qualified release checks before promotion

One aggregate verify:release run84a784/session53420 ended004844exit1 after1219browsercases passed and one Globe375navigation received localhost5180ERR_CONNECTION_REFUSED before DOM. Other40Adminsuitecases passed. Original log/errorcontext are preserved; no application change was made. The exact focused original case0e3131passes1/1 on a fresh testserver. Only unexecuted constituents were resumed in1d24dd/session40572; terminal1124fdexit0 adds235passingbrowsercases,3packagingtests and both builds. Total1455passingbrowsercaseexecutions; do not claim the initial aggregate exited0. Every required constituent is now qualified.

Storefront46modules/149.03kBJSgzip/29.98kBCSSgzip pass unchanged150.50/30.00budgets; Admin46modules/222.72kBapplication pass300.00budget. Secret/import/environment/route-boundary checks pass. Fresh owner-env read-only K2 identity/readinessfca693exit0:9verified/2owner/3script-unreachedconnector/0blocked. Vercel baseline itself was directly observed through correct-team connector; preserve the script's separate unreached labels.

Runtime/test bytes exactly match focused-qualified primary files. Evidence/pins:ADMIN_MEDIA_READ_RELEASE_GATE_20261016.json, baseline:ADMIN_MEDIA_READ_BASELINE_20261016.json. Raw logs:docs/evidence/20261016-admin-media-read-release/. Scope remains two existing code/testfiles plus narrow authoritative records. Commit/main promotion/exact-SHAdeployments/actualPhotosreopen still pending at this checkpoint.

## Verified live release

Owner-approved source commit `9f0c5daf22cb77842ae10b9c9b85c5559fda9568` was fast-forward pushed to production-linked `main` (1a9578). Both existing separate Vercel projects are READY on that exact SHA, with canonical aliases attached and no alias error:

- Admin: `dpl_4mnahxRwYBe2zwkTL9xmESwJa1CT`, project `prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x`, alias `admin.k2jimzon.com`.
- Storefront: `dpl_2K1bLm4Ek7AkdC2hBvcoUguBsVn3`, project `prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL`, aliases `www.k2jimzon.com` / `k2jimzon.com`.

Both canonical roots, correct target markers and referenced entry scripts return 200; foreign-target API paths return 404. No-Origin Admin GET correctly returns 403 ORIGIN_DENIED; matching-Origin unauthenticated GET returns 401 SESSION_EXPIRED. The first probe incorrectly expected 401 without Origin; its failed expectation is preserved and corrected without application changes. Current host receipt has eight passing host/API checks plus both entry assets.

Actual existing signed-in Admin was freshly reloaded after deployment. Reopening SKU K2-SKU-001125 Photos shows PRIMARY and AFTER, both fully decoded at 996x1245 and 1120x1400. Both URLs exactly equal the pre-release canonical saved URLs. The prior UI showed only PRIMARY. Save remains disabled with no unsaved changes; no upload, assignment or other product write was submitted during postflight. Supporting slots are currently empty; populated supporting preservation is covered by regression tests, not claimed as a populated live witness. The product remains Draft, zero price/stock and unpublished; earlier canonical reconciliation separately records review=false and unknown physical facts.

Evidence: `ADMIN_MEDIA_READ_DEPLOYMENTS_20261016.json`, `ADMIN_MEDIA_READ_LIVE_HOSTS_20261016.json`, `ADMIN_MEDIA_READ_RELEASE_GATE_20261016.json`, and `docs/evidence/20261016-draft-enrichment-resumed/media-read-before.json`, `media-read-after.json`, `media-read-before.jpg`, `media-read-after.jpg`. The live before/after URL/decode/no-unsaved-decision comparison passes (0c8eb0).

The narrow release and required live saved-slot verification are complete. This result was reported immediately after both artifacts and live behavior were verified. Final receipt-only records are local follow-up work; no new application gate or redundant deployment is required. Broader remaining Draft enrichment and operational acceptance stay in MAP-023.

Recovery remains source-only: review reverting the narrow commit or promoting the prior separate deployments recorded in the baseline receipt. Preserve canonical saved media and product records; do not restore the database, reupload images or replay an assignment. Unrelated dirty primary work remains untouched.

Final handoff: production main independently read back as9f0c5daf (0fd4d5). Receipt-only commit3cc47af56535fdf5d1f4a3a9577e1f1ed0c96e5a is retained locally on the release branch and was not pushed, avoiding another deployment. The managed worktree archive was requested after its ignored release logs were preserved under the primary docs/evidence folder; archive status is an app attachment, not a production action. Current source/product evidence and next required Draft work remain available from this receipt, System Brain and MAP-023.
