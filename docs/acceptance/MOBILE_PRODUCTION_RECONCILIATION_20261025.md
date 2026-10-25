# Mobile production reconciliation — 25 October 2026

MAP-023 / existing IDEA-20261024-02 and IDEA-20261024-03. Owner requested checking commit/push differences, then said proceed with the fix after the confirmed pushed-but-undeployed mobile branch was explained. This authorizes this scoped source reconciliation/release; no database, product/media, lot, stock, order or payment mutation is included. The separate partial SKU merge remains preserved in its existing worktree.

## Source and recovery

Production baseline: main b00e9feea9db771f838ceb8434d8d2ab989cb2c5. Recovered source: codex/mobile-homepage-fixes901c15df4ec9d65f6f922e39c16a2309c3168744, through its delta from common ancestor76e6810b. Release candidate: codex/mobile-production-reconcile, prepared from fresh main in an isolated managed worktree. No old branch replacement, force push, bulk commit or unrelated generated-baseline import.

The original mobile source/tests are reconciled by three-way application. The actual chat conflict keeps main's inline checkout opener, dialog semantics and suppression of floating checkout chat while adding compact non-home mobile chat and Home's in-flow chat control. Main's lockfile/Motion14.5, catalogSearch, formatMoney and deferred GlobeSection files remain byte-identical. Home's existing deferred loader is retained. PR25 detail containment is already present and preserved.

Recovered behavior: compact mobile hero with reachable shopping actions; readable full-photo featured rail with named44px Previous/Next controls; larger arrival thumbnails with explicit zero internal padding; removal of five decorative white divider badges; mobile sourcing-route controls with keyboard semantics; responsive header/tablet navigation and measured bottom clearance; modal drawer focus containment/inert background/recovery; full checkout names and contained coupons; FAQ/policy contrast/semantics; previously owner-decided payment wording aligned with final-total/instruction/funds verification. No payment eligibility or transaction implementation changed.

Recovery: revert only this release's scoped source changes or select prior separate production deployments recorded in COMMIT_PUSH_DEPLOYMENT_RECONCILIATION_20261025.md. Preserve all later business data and pending command identities. Never restore a stale database or duplicate the unfinished SKU implementation.

## Local evidence

- Fresh npm ci installs the committed lockfile (143 packages).
- Failing-first restored375dark homepage test fails on baseline, retaining original layout/thumbnail/route-control failures in mobile-production-20261025/red-homepage.log.
- Reconciled homepage/mobile matrix:46/46 pass, including320/375/430/768/1440 light/dark,16routes,200%text,rail navigation,drawer focus,history recovery,tablet/insets and payment-state wording.
- Existing checkout-help/search preservation:10/10 pass, including zero submit/help overlap,empty checkout,keyboard Escape/focus and English pistachio.
- Final npm run verify:development exits0. Required source detector returns[]. Detector output does not establish full accessibility certification.
- Batched375dark and1440light local fixture captures visually inspected. Placeholder products/prices are synthetic; these are viewport/render evidence, not live product or physical touch acceptance.
- Complete verify:release is running once with configured K2 public URL, guest/account flags. No release success is claimed until its terminal evidence and required exact-head CI are recorded.

## Remaining release state

Prepared locally only. Required CI,complete release result,separate READY production artifacts and real-host320/375/430light/dark plus desktop confirmation remain pending in MAP-023. Read-only owner-environment project preflight/readiness must pass before production promotion; unreached connector gates stay distinct from actual observed Vercel/GitHub evidence. No provider/database write is proposed. Physical-device touch/notch and genuine payment/order/fulfillment acceptance remain outside fixture proof.

## Preserved aggregate failure and focused correction

The one complete local verify:release invocation stopped at test:base:1117 shared cases passed,one stale Hero source-copy assertion required the removed Availability checked before payment phrase. Product-family/category and preceding Node stages passed. release.log preserves the original failure; no clean aggregate0 claim is made. The contract now requires approved Manila stock and Pasabuy options and explicitly rejects the obsolete before-payment/no-payment promises,while preserving stock-sync/SLA/staff-review refusals. Focused correction1/1 and final development0 pass. Independent follow-up review finds no blockers and confirms commerce safeguards unchanged. Only unrun post-base test stages,packaging and both configured builds are resumed; exact revised-head CI must still pass the complete configured workflow.

### Release fixture isolation and mobile-route correction

The first resumed storefront-ui stage has28passes/4failures. Three failures came from production guest/account flags incorrectly inherited by disabled-commerce fixtures; rerunning those cases with the flags unset passes unchanged. Failure snapshots confirm wholesale navigation succeeded; no navigation source correction was needed. One stale mobile test expected the desktop SVG at390px,although the approved mobile source intentionally shows accessible route controls instead. The corrected test asserts visible named group/three buttons and Enter-driven Milano aria-pressed state,retaining all globe heading/application/canvas/pan-y checks. Focused route1/1 and final development0 pass. An intermediate failed rerun retained the old assertion because the editing command expected CRLF while this source uses LF; it is preserved honestly,then corrected without application changes.

Exact-head CI8769bd50 independently fails only that stale mobile SVG assertion; diagnostics are retained. Independent route-test review has no blockers. Remaining acceptance resumes after storefront-ui with no production flags in test fixtures;production flags apply only to builds. No repeated clean full local aggregate is claimed. Final exact-head CI must pass before merge.

## Current qualified checkpoint

Candidate de522dfafcabd8d38cab21b022b57ddadeac7e05 / tree a42caae8e84588f0535ed8dc746576a3b45bd928 is fully qualified locally through1598reconciled browser cases,packaging,both configured builds and final development. Storefront142.59/150.50kB gzip JS,29.98/30.00CSS;Admin226.86/300minified. Exact-head CI40195341705 still runs complete acceptance;SQL behavior and both Previews pass. No production merge/deployment is yet claimed. The active MAP checkpoint owns resumption. Final receipts will supersede this prepared checkpoint only after actual promotion/host evidence.

## Final source qualification; production promotion blocked

All local release constituents pass with1598reconciled browser cases,packaging and both configured builds. Exact-head CI40195341705 is SUCCESS on de522dfafcabd8d38cab21b022b57ddadeac7e05: build-and-smoke18m44s and critical-sql-behavior1m3s. Both exact-head Vercel Previews are READY. Final read-only K2 gates pass9verified/2owner/3connector-unreached/0blocked;unreached script surfaces are not provider observations.

The attempted exact-head PR28 merge command was rejected before execution by automatic approval review: production-linked main can trigger live deployment,and the owner has not explicitly authorized a main merge/live production release under repository policy. Do not bypass or retry through another surface. Fresh read-only evidence confirms PR28 is OPEN and remote main remainsb00e9fee. The owner must explicitly authorize merging PR28 into main and deploying both production sites before promotion. All preparation is complete; no application/source changes are needed to ask that final approval.

Verified hosted Preview geometry at375x812 with real catalog data: primary action bottom468.16 vs bottom-nav top737.81;document360<=375;arrival images70x70 with0padding;white Monthly Cargo Flights/Verified Reviews badge count0;Home chat static/visible and floating Home chat hidden. Browser-emulated viewport,not physical-device evidence. The Preview uses the same application source as final de522 (intervening commits correct tests only). Preview screenshot retained at C:/Users/jerze/.codex/visualizations/2026/10/25/01a17308-9689-7e11-9920-90c380cef98e/mobile-fix-preview-375-dark.png. Temporary viewport reset;verification browser hidden after owner requested the agent's own background browser. Production mobile/theme and genuine payment/order/fulfillment acceptance remain unverified for this unreleased source.

Source PR28 stays pinned to the fully green de522 head. A separate receipt-only feature branch preserves final evidence without advancing that reviewed PR head or starting redundant CI. Owning MAP-023 retains only the explicit release approval and subsequent two-artifact/actual-host checks. Earlier prepared/current qualification paragraphs above are dated checkpoints;this final section controls current status.

25 October2026 explicit owner release authorization: after the question asking whether to merge PR28 into main and deploy both production sites,the owner replied proceed. This supplies the final source-release approval previously missing. Exact qualified head remainsde522dfafcabd8d38cab21b022b57ddadeac7e05;no business/provider/database mutation is included. Refresh read-only gates and verify exact source before merge;production/real-host acceptance remains to be observed.

## VERIFIED LIVE — PR28 production release

25 October2026,21:21:51Singapore: PR28 mergedc2e55d7057bb65b72ad2d0a337046d10764e7168 after the owner's explicit proceed reply to the main-merge/both-production-sites question. The merge treea42caae8e84588f0535ed8dc746576a3b45bd928 exactly equals qualifiedde522,with green CI40195341705 and1598reconciled local browser cases/packaging/both configured builds. Final owner-environment read-only project/readiness gates pass9verified/2owner/3script-unreached/0blocked. The earlier auto-review refusal is superseded by this explicit approval and successful exact-head merge;it was not bypassed.

| Artifact | READY Production deployment | Exact source | Canonical host |
| --- | --- | --- | --- |
| Storefront | dpl_GtDmydTGkaKTbfQcpkZPLViRiaaQ | c2e55d7057bb65b72ad2d0a337046d10764e7168 | https://www.k2jimzon.com |
| Admin | dpl_2eeHwb8eCDNqJSbhXjGjvhG5PM8c | same | https://admin.k2jimzon.com |

Actual canonical hosts returnHTTP200 with storefront/admin respectively in k2-build-target.json,and retain Report-OnlyCSP/X-Frame-OptionsDENY. Provider receipts record both matching production aliases/source/READY. Script-unreached connector states remain distinct from these actual connector/HTTP/browser observations.

Actual public Home passes320/375/430dark/light measurements:document widths305/360/415fit;primary CTA bottoms505.72/468.16/477.63clear nav tops737.81/737.81/751.41;four arrival images render70x70with0padding and are fully loaded;five obsolete divider badges are removed(the two reported labels are explicitly counted0);Home chat is static/visible while the floating Home instance is hidden. Three named route controls remain. Real Next featured browsing moves the328pxrail toleft170/scrollwidth498. Actual1440light document1425<=1440and three featured cards pass. Phone dark/light Home/arrival and desktop light screenshots are saved and representative dark phone/desktop images visually inspected. Source photo bytes and canonical product facts were not changed.

Actual375light product→cart→checkout uses one temporary Tigullio Radicchio e Speck item only. Inline help has0submit overlap,document360<=375,Enter opens chat and Escape closes/returns focus. No order/payment/message was submitted. Cart item removed,cart0and dark mode restored. Authenticated Admin loads Command center/Operations command center on its separate canonical host. One initial Add-to-cart locator omitted the displayed price,and a backdrop-close attempt left the cart open;fresh DOM/actual named controls corrected both without a source change or business submission. Final verification tabs are closed and temporary viewport state retired with them.

Evidence: production-merge.json,production-deployments.json,production-hosts.json,production-mobile-matrix.json,production-checkout.json and named production PNGs under mobile-production-20261025/. Qualification logs retain original failures/focused corrections and exact green CI. No redundant app/build/database rehearsal was run for receipt-only updates.

Completed mobile source promotion/actual-host action is removed from MAP-023 after these records. MAP-023 still owns physical-device touch/notch,real order/payment/funds/exact-lot fulfillment acceptance and unrelated listing facts/unfinished SKU merge;this release proves none of those. Preserve the existing SKU worktree and all original dirty workspace changes. Recovery: scoped revert of PR28 or select priorb00e9fee Storefrontdpl_G2RrSHLcTYAZ3Gj5bbK6kGJKiTBs/Admindpl_9yh5Hawyog7z8UewpKNDTzEd5fRj;never restore stale business data or replay product/lot commands. Subsequent publication of these final receipts is documentation-only;the verified application source remainsc2e55d70and no repeated application run/poll is needed.
