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
