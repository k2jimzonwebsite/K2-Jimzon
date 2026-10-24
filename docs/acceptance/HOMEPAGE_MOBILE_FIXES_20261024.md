# Mobile homepage corrections — 24 October 2026

Owning MAP-023 / IDEA-20261024-02. The owner approved fixing the seven findings from HOMEPAGE_MOBILE_AUDIT_20261024.md and explicitly requested the combined counsel of ui-ux-pro-max,impeccable,design-taste-frontend and emil-design-eng. This receipt describes locally implemented/tested source only. Production still serves the prior qualified PR25 source da2872816b83d79d55abc951f3e25aa8d067e214; no push,promotion,provider/database/product/media/stock/price/review/publication decision occurred.

## Four-skill design decisions

The existing storefront brand register,wood light canvas,dark surface tokens,editorial type and canonical product identity remain authoritative. Assumptions: existing catalog scale and React/Tailwind/Motion are sufficient; no new dependency,asset generation,carousel state,API or credential is required. The owner approved the audit's bounded correction direction by saying proceed on fixing things. No new discovery/permission loop was required for these routine implementation choices.

| Skill | Before | Local after | Why |
| --- | --- | --- | --- |
| UI/UX Pro Max | Main CTA covered by bottom navigation; tiny controls/previews. | CTA clears mobile navigation at320/375/430; named route buttons are44px+; thumbnails retain at least40px usable image area. | Readable content and touch/keyboard access outrank decorative density. |
| Impeccable | Five aria-hidden transit strips use an undefined surface token and near-white badge fallback in dark mode. | Decorative strips removed; useful route information stays in the hero route panel and native controls. | Removes the actual white-fragment/mini-label failure and low-value repetition without replacing K2 identity. |
| Design Taste Frontend | Three narrow hero cards and fragile short-label width budgets;48px mobile headline and long introduction. | Two visible cards in native horizontal overflow below1024,larger images,full product names with natural whole-word wrapping,compact fluid headline and introduction. | Deliberate mobile composition preserves actual SKU/name/price facts; it avoids blanket tiny fonts or nowrap. |
| Emil Design Engineering | Floating chat obscures hero content; map g controls lack keyboard access; hero initial transforms ignore reduced-motion preference. | Homepage chat is an inline44px control below1024; other mobile views use a compact floating icon; desktop chat remains. Native route buttons update the existing panel/map state,SVG hides below640,and reduced-motion initial transforms are suppressed. | Stable layout,native input and meaningful state changes preserve recoverable interaction without extra animation. |

Alternatives rejected: forcing every phrase onto one line by tiny type; silently shortening canonical product names; recoloring photos or inventing transparency; new gesture/carousel libraries; changing product family/publication facts; removing source/error/stock honesty to fit the bundle budget. The mobile header's decorative subtitle is compact and hides only below360 where it cannot fit; Admin and footer identity remain governed by their existing context.

## Changed source and operational boundaries

- src/components/home/Hero.jsx and Hero.css: compact top content,two-up native shelf/larger image fitting,responsive route panel header,inline homepage chat and reduced-motion preference. Existing shopping/Pasabuy/exact-SKU handlers are reused.
- src/views/Home.jsx: removes TransitDivider and its five decorative calls. No functional route or catalog section is removed.
- src/components/home/NewArrivals.jsx:64px thumbnail tray and explicit ProductVisual pad=p-1. Shared ProductVisual defaults remain intact; usable inner image fitting increases from14px to46px at the default root size.
- src/components/home/FlightMap.jsx: three named native buttons with aria-pressed,44px+ targets and existing state updates; tiny map SVG hides on phones,desktop map remains,info transition respects reduced motion.
- src/components/shop/StorefrontChatButton.jsx: home uses the inline chat path below1024; other mobile views use48px icon footprint; desktop label/path retained.
- src/components/ui/bits.jsx and src/index.css: header-only wordmark subtitle class/styles; no general storefront readability-ramp reduction or Admin theme change.
- tests/homepage-mobile-fixes.spec.js,package.json and playwright.config.js: actual Home regression added to the dedicated selling runner and excluded from the conflicting aggregate base runner.

No Supabase preflight/readiness was required for local presentation-only work; no provider/database operation was attempted. All125 live/71 staff-held listing outcomes and PR25's detail comparison correction are preserved. NewArrivals fixtures,prices,stock and stored-photo captures are local test data,not updated canonical records or live order/payment acceptance.

## Verification and preserved failures

Evidence/log root: outputs/hero-mobile-fix-20261024/ in this managed worktree. Screenshots: docs/design-checkpoints/20261024-homepage-mobile/.

1. Failing-first red.log reproduces audited defects,including14px thumbnail usable area,missing route controls and dense/covered mobile shopping paths before source edits.
2. green-first.log records10 passing matrix cases plus a failed200% navigation check caused by an ambiguous hero/footer button locator. Scoping it to main corrects the test; zoom.log passes1/1 with additional route-label/control overflow checks.
3. focused.log records19 passing checks and one old hero check selecting the newly introduced hidden duplicate Milano label. Mobile pill becomes Italy to Manila; separate route title remains Milano to Manila. No product route identity changes.
4. Final npx playwright test --config=playwright.selling.config.js tests/homepage-mobile-fixes.spec.js tests/hero-enhancement.spec.js exits0/14 cases:320/375/430/768/1440 both themes,CTA/nav/chat geometry,larger preview/thumbnail usable area,no white transit labels,no document overflow,native keyboard route controls,exact SKU shopping,loading/empty/image fallback,200% text and ordinary/reduced motion. Final receipt: focused-qualified.log. The earlier six existing storefront-selling-surfaces cases passed and their business logic was not edited by later equivalent hero CSS reuse.
5. Existing npx playwright test --config=playwright.store-orientation.config.js tests/store-readability-ui.spec.js exits0/7 cases: shared shelf/chat390/1440 themes,short mobile drag,enlarged phone text and footer readability. Receipt: readability.log.
6. Configured Storefront compile initially fails CSS30.07/30.00 and then30.05/30.00; both logs retained. Removing only redundant hero constraints/custom hover and replacing duplicate price-row CSS with existing equivalent utilities yields JS150.17/150.50 and CSS29.97/30.00. Final npm --ignore-scripts run build:storefront exits0 with public production K2 URL/guest/customer flags,boundary and secret scan passing. Receipt: storefront-build-qualified.log. Build thresholds are unchanged.
7. npm run verify:development exits0 after final application/test/config edit. Conditional subsequent npm --ignore-scripts run build:admin exits0,46-module boundary,budget226.68/300kB and88-file secret scan pass. Exit0 of the conditional process confirms both commands passed. Receipts: development.log/admin-build.log. Skipping npm lifecycle scripts for the two compile commands avoids repeating the separately completed development gate; it does not claim a complete release gate.
8. Independent source/design review and final equivalence review report no blockers; representative320 light/375 dark/1440 light captures were inspected by reviewer. The primary inspected final actual-photo local fixtures in both themes and the final synthetic matrix. No physical-device/touch,screen-reader,full performance benchmark or actual-host fix is claimed.

The real-media visual script reuses three already-audited cached public primary files unchanged and intercepts every catalog request locally. Six375px theme/top/shelf/arrival screenshots show the same photograph bytes in the new layout. URLs/hashes and explicit fixture scope are in real-media-visual.log; source-cache SHA-256 values remain unchanged. No upload,assignment,background removal or pixel edit occurred. The improved layout does not remove whites embedded in a source photo. Initial screenshot fixtures are synthetic; screenshots named real-media are local renderings of approved source bytes,not live-host evidence.

## Remaining release boundary and recovery

Local engineering verification is complete for this bounded slice. MAP-023 retains the exact remaining action: after an explicit live-promotion request,prepare a scoped candidate based on current production main,run the complete verify:release gate once and required CI,then verify both separate production artifacts plus actual homepage mobile/desktop light/dark behavior. The current local feature branch is codex/mobile-homepage-fixes; its predecessor e8279aeb contains receipt-only history atop runtime-equivalent PR25 source. Do not publish unrelated generated baseline screenshots or stale product snapshots. No release permission is inferred from earlier listing/media publication.

Rollback locally reverts only the named homepage/header/chat/style/test/config slice to e8279aeb while retaining the audit/decision evidence,PR25 detail-image fix,all user changes,canonical data and pending commands. There is no provider or data rollback. Completed implementation steps leave MAP-023 only after these verified local facts are durable; remaining source release and real-host acceptance stay visible there. Documentation-only receipt edits require no further application suite/build/deployment.

Durable copied logs,unchanged-source hashes and explicit exit results are archived under docs/acceptance/homepage-mobile-fixes-20261024/qualification.json and its companions. Temporary local preview is stopped after inspection; retained PNGs are review artifacts. Application source was not edited after the final focused/development/build evidence; this final record is receipt-only.
