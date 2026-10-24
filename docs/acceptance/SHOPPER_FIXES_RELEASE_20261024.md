# Shopper fixes production release — 24 October 2026

MAP-023 / IDEA-20261024-07. Owner explicitly requests commit/push to live GitHub and Vercel. Status: isolated source qualified in focused checks; full release/CI/promotion and real-host verification pending. No live claim yet.

## Exact source scope

Release branch codex/shopper-fixes-production starts production main da2872816b83d79d55abc951f3e25aa8d067e214. Rollback baseline is that SHA with Storefront dpl_AeFYdfXiD8uARk7oY8gvvkrbCXB2 and Admin dpl_9ihoo8KmixHRPcbDDvRsYZs5QgV5, both freshly observed READY on main.

The original feature checkout is behind production and contains unrelated unfinished changes. It is preserved. Only StorefrontChatButton/Checkout inline help, existing catalogSearch helper and focused tests are carried. CatalogGrid consumes that helper in its incumbent layout, filters exact category first and groups existing family results afterward. The unrelated progressive catalog UI, original branch commit149-file payload, unpublished cleanup/tooling, Admin, backend, credentials/provider/SQL and product decisions are excluded. Product prices/stock/photos/Website/review state are unchanged by this source work. Node search tests join test:base; new rendered cases join the existing storefront-recovery suite, retaining full release/CI coverage.

| Before | After | Why |
| --- | --- | --- |
| Fixed chat overlaps checkout submit | Same opener inline; shell duplicate suppressed on checkout | Clear actions while keeping help, stable layout and focus return |
| English pistachio misses Italian-named products | Existing scorer gains bounded complete-word aliases | Find relevant variants while preserving filtering/grouping/sorting |
| Shared helper initially lost partial SKU matches | Literal SKU substring search retained | Preserve production search compatibility |
| Combined family/options string initially lost exact-name priority | Original product name compared separately | Keep exact product results above prefix matches |

All four design skills, Superpowers process/review/verification and Andrej Karpathy apply; established wood/editorial identity, controls and layout remain. Source fixes and original local evidence are documented separately in SHOPPER_FIXES_20261024.md; that older receipt describes its original workstation, not this integrated release.

## Evidence so far

- Exact production-base browser RED reproduced4658px² submit/chat overlap and zero English pistachio cards.
- Integrated Chromium10/10 passes:320/390/430/1440 light/dark/reduced-motion, zero overlap/overflow,44px chat target, Enter/open/Escape/focus return, empty-cart help, rendered English/Italian search. A focused rendered case also verifies literal partial SKU.
- Independent release review found the two compatibility issues above. Each was reproduced by a failing test, fixed minimally and confirmed. Final independent review reports no actionable findings and independently verifies search13/13.
- First integrated development gate passed; a new final development run follows the review-driven corrections. Full release gate has not been described as passed prematurely.
- Fresh read-only preflight confirms K2 pixplcjqivlfflickobf; readiness9verified/2owner/3connector/0blocked,196products/130live/49lots. These are preconditions, not physical counts or authenticated operational acceptance. Vercel was separately reached with its connector; script-unreached surfaces remain qualified as such.
- An early browser command ran before npm ci finished and could not find Playwright; after lockfile install the genuine RED/green runs above completed. This setup failure is not a product failure or passing test.

## Remaining boundary and recovery

Actual001173 Dolgam I Siciliani Crunchy200g back/side label plus front binding is still needed: exact-named online sources disagree25% pistachio/palm fats versus30%/coconut-cocoa. Do not invent ingredient/allergen/certification or price facts.66intentionally hidden Drafts retain their prior staff handoff. Source release never implies a paid order, genuine confirmation/reservation/payment verification, exact-lot picking/dispatch/delivery or physical-device/Safari acceptance; those remain MAP-023.

Before promotion: final development, complete npm run verify:release, exact-head CI and fresh read-only identity/readiness checks must be green/zero-failed. Then merge the reviewed exact branch and verify both separate Vercel artifacts and custom hosts, real English/Italian/partial-SKU discovery and checkout help/action clearance. Preserve initial failed attempts and every pending request. No new provider configuration or data-save authorization is inferred.

Recover by reverting only this source slice in a fresh qualified release or restoring the exact baseline source/per-project deployments above. Never reset the original dirty workspace, replay product saves/SQL or restore a stale database. No database migration or product mutation exists to reverse. Final deployment IDs, commit, CI, host checks and remaining action will be appended after actual observation.
