# Storefront mobile audit and correction — 24 October 2026

MAP-023 / IDEA-20261024-03. Owner requests the whole storefront mobile audit, correction of verified design faults, then commit and push after verification. Source baseline1c8b3b9c on codex/mobile-homepage-fixes. Feature-branch push is authorized; main merge and production promotion are not requested. No business/data/provider write or approved photo mutation.

## Scope and findings

Baseline rendered64 states:16 storefront routes ×320/375px ×light/dark, using the actual StorefrontApp and a hermetic six-product catalog with long names. No route failed, no runtime page error and no root horizontal overflow. Geometry inspection still found internal clipped controls hidden by the shell's overflow guard. Source review independently covered every route and shared drawer/chrome. Alias mappings reuse the same route views; /catalog,/product,/pasabuy,/trade,/contact,/messages,/account,/checkout,/confirmation,/privacy,/terms,/returns,/policies,unknown-route recovery,/store and Home are included. /store uses the reduced-motion accessible list fallback; this does not certify all WebGL/touch interactions.

| ID / severity | Before | After | Evidence |
| --- | --- | --- | --- |
| S01/P1 | Checkout coupon fieldset's intrinsic minimum pushes Apply outside320px; final-review names ellipsized. | min-w-0 fieldset; two-column summary with wrapped full names and amount below. | Rendered bounds,complete title,200%coupon check. |
| S02/P1 | FAQ active All uses inverted navy token with white text,near1:1 in dark; rotated32px circle extends beyond its288px row. | Crimson/white selection; shrinkable question label; only the plus glyph rotates. Clear filters has44px target. | Theme contrast,question scroll width,keyboard no-results recovery. |
| S03/P2 | Policy buttons expose partial tab pattern without tablist/arrow behavior. | Ordinary labeled navigation buttons with aria-current; named content region. Contact CTA uses crimson rather than a near-white dark fill. | Enter route change and current-page state. |
| S04/P1 | Cart/chat Tab escapes modal; chat opener disappears/remounts; cart navigation can lose focus. | Shared small focus/inert hook; cleanup restores prior background inertness. Chat waits a frame and selects visible opener/trigger/heading; cart route actions target main h1. | Forward/reverse loop,Escape/return,cart checkout destination and phone/desktop browser Back. |
| S05/P2 | Drawer header/content lacks notch/home inset; floating chat ignores nav inset. | Native header/footer/body inset padding; matching bottom-nav inset; a ResizeObserver publishes the actual bar height to the shared shell for its spacer and chat clearance. | Simulated top44px/bottom34px plus rendered geometry. |
| S06/P2 | Header logo33px at320; cart footer secondary actions one line tall. |44px logo and both footer actions with wrapping. | Exact target bounds and independent review. |
| S07/P1 | Receiving-account unavailable warning is near-white on pale amber in dark mode. | Existing bg-shell/text-navy semantic pair and gold border. | Actual charge/status fixtures and computed sRGB contrast≥4.5 in both themes. |
| S08/P1 | At200%text,cart/theme controls extend to520px in320px viewport; sticky header consumes most of screen. | Header controls wrap; header stays in normal flow below1024. | All header controls contained at200%; no mobile sticky trap. |
| S09/P1 |768–1023px hides both bottom navigation and desktop navigation. | Bottom nav remains through1023; labels wrap with enlarged text; chat offset and bottom spacer follow measured bar height,including210px at200%text. Desktop nav retained. |768/1023visible navigation,route action and chat separation. |

Intentional decorative orbs clipped by their own surfaces,cart-count badges,screen-reader-only labels and inline legal text links were not treated as layout bugs. No photo-background recoloring/cropping was introduced. Source photo scene/transparent whitespace remains an item-specific media quality limitation.

## Four-skill council and implementation

| Skill | Before | After / rationale |
| --- | --- | --- |
| ui-ux-pro-max | Incomplete modal keyboard path,undersized actions,missing tablet nav. |44px controls,native navigation semantics,focus containment/restoration and reachable tablet destinations. |
| impeccable | Inverted neutral colors yield white fragments/low contrast; transformed decorative ring exceeds row. | Existing semantic canvas/text tokens and crimson action tokens; rotate only explanatory glyph. |
| design-taste-frontend | Inconsistent mobile summary hierarchy and clipped full names. | Complete item names with deliberate name/quantity/amount layout; established editorial/wood identity preserved. |
| emil-design-eng | Overlay focus and safe areas conflict with navigation; enlarged controls offscreen. | Native input/focus behavior,normal-flow mobile header,responsive labels and recoverable drawer interactions. |

Systematic debugging reproduced root causes before fixes. Karpathy scoped source changes to affected UI and one shared two-drawer hook; no new dependency or second business authority. Existing Hero heading styles are reused through equivalent utilities and redundant rules removed to meet the unchanged CSS budget. Required acceptance and existing tests remain in test:selling-surfaces; isolated selling config explicitly enables account runtime like production. Independent Luna source reviewers found no remaining actionable blocker; they did not run suites or inspect live production.

## Verification and limits

Baseline and failing-first logs are retained in storefront-mobile-audit-20261024/. Initial warning/policy fixture mistakes were corrected to actual names and both status/conversation endpoints before relying on their results. Browser colors can be OKLCH: final contrast checks convert through an sRGB canvas rather than treating OKLCH channels as RGB. red-warning-srgb.log proves the original dark warning fails while light passes. Layout/inset checks poll settled native geometry. Two extra runner starts found the dedicated5191port occupied by the already-running suite; they made no source diagnosis and were retried after the suite released it.

The full affected selling suite passed70 tests before the final bottom-label wrapping/spacing refinement. Final delta,development,artifact and readability results are recorded in the qualification addendum below. Existing six selling-flow tests retain stock/cart constraints; the audit introduces no new writes to live services. All external requests are aborted or fulfilled with test fixtures. Read-only npm dependency audit reports0 vulnerabilities; repository supply-chain policy passes. Impeccable source detector returns[]; this is only a bounded pattern scan.

Storefront final configured build: JS150.49/150.50kB gzip,CSS29.98/30.00kB gzip; separate Admin226.68/300kB. Both boundary/secret gates pass. Public K2 URL and guest/account flags supplied; no owner env credential loaded. Earlier CSS failures30.09/30.06/30.03/30.01 are preserved and resolved through scoped selector/style reuse; no limit raised. No complete verify:release is run because this is a feature-branch push,not live promotion.

Final screenshots: docs/design-checkpoints/20261024-storefront-mobile/ (both themes across key pages,enlarged header/nav) and real-media/ (unchanged cached approved photos; synthetic stock/prices,not live catalog proof). Phone Home,sourcing story,checkout and approved-photo shelf captures were visually inspected; final enlarged header/nav capture is reviewed separately. This is viewport/browser evidence,not physical-device touch,notch hardware,full screen-reader/WCAG conformance or measured Core Web Vitals. Authenticated account/order/payment journeys and actual provider failure behavior are not exhaustively verified by fixtures.

## Flagged operational mismatch and handoff

The owner's payment-first policy conflicts with older no-upfront/staff-first language in CartDrawer,Checkout,Catalog,Confirmation,site FAQ and policies. Existing payment/charge eligibility and receipt proof explicitly depend on current snapshots. This design audit does not invent an integrated payment-first checkout,change amount/stock/payment gates or rewrite legal policy from an unverified operational assumption. MAP-023 owns research of the actual accepted payment-first journey,then matching customer wording and genuine hosted payment/receipt acceptance. This is a flagged operational issue,not a silently closed design finding. Staff-held product facts/media uncertainty remain in the existing listing holds.

Changed systems: storefront presentation/shared Wordmark,drawer focus hook,isolated browser config and regression coverage. Required current records: operations,System Brain,PRODUCT,DESIGN,FUTURE_IDEAS and owning MAP-023. Recovery reverts only this scoped audit commit; do not revert earlier authorized hero/photo work or restore business snapshots. Branch history predates production squash merge: future release must prepare a scoped candidate against current main before one complete release gate,required CI and separate artifact/actual-host verification. No main merge or deployment follows from this push. GitHub workflow triggers on main/master pushes or PR; a plain feature push does not itself establish required release CI.


Measured-navigation qualification note: final rendering exposed a210px tall bar with200%labels,which a fixed rem offset did not clear. Native ResizeObserver now shares the exact nav offsetHeight with the shell spacer and floating chat; cleanup disconnects/removes it. The enlarged-header control check and navigation-gap checks failed before correction. Inset checks now await the ResizeObserver layout turn rather than checking stale same-task geometry. Final source review reports no concrete cleanup/spacing issue. Top safe padding lives on native header nodes because Motion resolves initial CSS variables on animated elements. This preserves env defaults and allows layout changes without reading test-only values in business code.


Final verification reconciliation: the last54-case delta passes53 and reproduces the one remaining safe-padding observer gap. The border-box correction passes all4affected inset/enlarged/tablet tests; final equivalent unused hero-selector removal is checked with those4 plus3existing hero checks. This union covers the original full70-case selling run,53passing delta cases,7readability and final focused cases without falsely calling the failed delta green. Border-box observation matters because padding alone does not change ResizeObserver's default content box. The failed boundary was retained and fixed,not bypassed. Final Storefront150.49/150.50JS29.98/30CSS; removing an unused heading class name resolves a sub-byte-rounded JS ceiling failure (150.50displayed but above exact threshold). Limits unchanged. Final source hashes and exact command exits are in qualification.json. No app suite was rerun after receipt-only documentation changes.


Final exact-source focused7/exit0 and development/exit0 confirmed. Scoped source is qualified for the owner-requested feature-branch push. This receipt does not claim a main merge or deployment. Local preview stopped after captures.


## Delivered feature branch

24October2026 delivery / MAP-023 / IDEA-20261024-03: verified source commit a439507a8e63aacb0b14a273f4288b09f7e03a2a pushed to origin/codex/mobile-homepage-fixes; independent git ls-remote matches. No main merge or production deployment. Audit source/tests/docs are committed; remaining unstaged files are unrelated generated baseline images. Required next actions remain payment-first operational-copy reconciliation,device/hosted acceptance and separately owner-requested release. Final evidence/recovery: docs/acceptance/STOREFRONT_MOBILE_AUDIT_20261024.md. This delivery receipt is documentation-only; no repeat app gate/deployment required.
