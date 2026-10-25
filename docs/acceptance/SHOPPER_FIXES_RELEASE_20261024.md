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


## 25 October continuation — final qualification before promotion

The exact release head is c5dfd241de24d97d4a0b1e9d00dd2b970ee1049a, PR26. The full local verify:release invocation found that the new checkout spec was also discovered by the incompatible shared fixture; the original failed/interrupted log remains preserved. One testIgnore entry restricts it to its existing dedicated storefront-recovery suite. Focused routing and shopper checks pass; no runtime change followed the already reviewed13search/10shopper cases. Final independent review finds no issues at c5dfd241.

Final development exits0. Exact-head GitHub CI40102590657 succeeds in both critical-sql-behavior and build-and-smoke, including the complete npm-test acceptance command and both configured isolated production builds/boundaries/budgets. Local Build Output packaging3/3 exits0. These cover every verify:release manifest component on the exact source; qualification.json records the reconciliation. The corrected local shared suite also passes1118/1118. Its later duplicate browser work was intentionally interrupted after the entire same-head CI result was confirmed, rather than repeating already passing acceptance. Do not claim a clean complete local aggregate exit0; the original setup/failure/interruption is not erased. No code change follows these passing checks.

Fresh25October read-only preflight/readiness passes exact K2 with9verified/2owner/3connector/0blocked,196products/130live/49lots. This is not a physical count. The Vercel connector now refuses the K2 team403 and its consent helper404; the existing authenticated browser independently reaches the K2 dashboard and observes its current source. Do not label the failed connector as reached successfully. Preview checks both succeed in GitHub. Initial automatic approval-review usage-limit failure prevented the prior remaining-check action; the resumed authorized checks ran after the user continued. No approval check was bypassed.

Promotion and actual-host evidence follow below only after observed results. Remaining fact/physical/real order-payment boundaries remain unchanged.


## Verified live production — 25 October 2026

PR26 merged at02:27:10UTC (10:27:10Singapore) to9caa06792f8e4272e30779431e43f68290f41305. Its tree d5d8f5ac120c0811a18167ebeea2a06efebda593 exactly matches qualified c5dfd241. Separate Storefront dpl_47mGZStT9nXxxEyfsvCsgd5y8w43 and Admin dpl_7fqkhWc4B8szdUTJfD3XviMQv6KV are both actually observed Ready/Production/Current on this exact main commit with www.k2jimzon.com/admin.k2jimzon.com assigned. This observation comes from the existing authenticated Vercel browser, not the403 connector. Both actual custom hosts return200, root markup and correct storefront/admin build-target markers. No project/environment/domain/firewall configuration changed.

Actual public shopper recheck: English pistachio and Italian pistacchio each show the same5listing names (Etna, Siciliani Crema, Siciliani Crunchy, Tigullio and Dulciar), with literal-query ranking retained. Three show positive availability7/4/8;2are sold out. Partial SKU001173 settles to the one correct Crunchy200g product. The brief exit animation retains old cards momentarily; the recorded assertion waits for exit completion, not an immediate transitional count. Product remains499/7available/200g. Add one jar locally, open basket499, then ordinary Review order request.

At390×844, dark and light actual hosted checkout have one50px-high inline chat opener (position static), no horizontal overflow (375document width within390viewport), and zero submit/chat overlap. Dark Submit measures301×52 atx37/y696.21875; chat is out of view above the form atx16/y-1782.53125. No floating duplicate covers it. Both live screenshots are retained and visually inspected. Enter opens the existing chat dialog, Escape closes it and returns focus to the mounted opener. Cloudflare Success appeared automatically; the agent did not solve a challenge or bypass security. Submit remained disabled with blank contact/unaccepted delivery; no real order/payment/customer/contact/Pasabuy/message was created. Remove the one test jar, confirm empty checkout and restore dark theme and normal viewport. Public catalog search is left available to inspect; the user's original Admin tab remains untouched.

A fresh temporary browser visit to the released Admin host genuinely loads signed-in Product Catalog & Stock:196SKUs,130active,66Drafts,273displayedavailable units. These are current UI observations, not new physical counts. The temporary Admin/Vercel tabs are closed; no editor was opened or product saved. No price, stock, media, status, Website membership, SQL or provider change is part of this release. The unresolved001173actual ingredient/allergen label,66intentional Draft holds and genuine order/payment/fulfillment/physical-device acceptance remain MAP-023.

Final evidence: production.json (source/deployments/search/geometry/focus/cleanup/Admin hydration), host-checks.json, ci-final.json, qualification.json, fresh preflight-final.log/readiness-final.log, live-checkout-390-dark.png/light.png, plus original interrupted release/development/remaining-suite/packaging logs in outputs/shopper-fixes-release-20261024/. Complete release coverage is reconciled as documented above; no clean local aggregate exit0 is asserted. Independent final source/config review has no findings. Functional promotion was reported as soon as both production artifacts were verified; subsequent documentation-only recording does not require another app qualification or waiting on redundant deployments.

Recovery: revert this source slice on a fresh qualified production-base branch, or restore baseline da287281 with Storefront dpl_AeFYdfXiD8uARk7oY8gvvkrbCXB2 and Admin dpl_9ihoo8KmixHRPcbDDvRsYZs5QgV5. Preserve current product/stock/history and all original pending commands; no SQL replay or stale snapshot restore. The completed shopper source release is removed from the active MAP after this evidence is durable. Later receipt-only commits are distinct from the verified functional release above.
