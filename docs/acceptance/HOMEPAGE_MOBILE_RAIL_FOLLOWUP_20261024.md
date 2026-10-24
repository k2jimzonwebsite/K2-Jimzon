# Homepage rail and full-photo follow-up — 24 October 2026

MAP-023 / IDEA-20261024-02 H04. Owner directed “proceed on fixing it” after the current-state four-skill re-audit. Local source preparation on codex/mobile-homepage-fixes; no source push, production promotion, media/data/provider write or listing publication.

## Result and design decision

Hero.jsx adds two named44px native buttons below the existing two-card shelf, so its heading keeps its width. Disabled endpoints, native touch/trackpad scrolling, scroll-state updates and ResizeObserver keep the controls accurate. Desktop retains its three-column grid. Programmatic scrolling is instant with reduced motion and smooth otherwise; there is no autoplay or custom gesture capture.

Hero.css expands mobile full-image frames to clamp(10rem,50vw,14rem), removes internal image padding and retains object-fit:contain. Desktop remains7rem. NewArrivals.jsx changes only its thumbnail caller to80px trays and p-0, giving70px usable photo area instead of46px. Shared ProductVisual behavior and approved image URLs/bytes remain unchanged. Intrinsic source scene/transparent whitespace still varies: this improves display space without promising uniform subject scale, recoloring packages or cropping labels. Any later media correction requires item-specific review under MAP-023.

| Required design skill | Applied direction |
| --- | --- |
| ui-ux-pro-max | Named native44px controls, keyboard activation, disabled bounds and preserved route targets. |
| impeccable | Quiet controls below the rail; existing theme tokens, zero image padding and complete-photo containment. |
| design-taste-frontend | Larger mobile photo prominence, full product-name wrapping and existing editorial heading preserved. |
| emil-design-eng | Native scroll, resize/scroll bound updates, reduced-motion handling and desktop grid preservation. |

Systematic debugging/TDD/Karpathy guided the smallest affected-component correction. Independent Luna read-only source/design review found no actionable issue. No new dependency or shared carousel abstraction.

## Verification and limits

Retained RED at375 dark fails for46px thumbnail content and missing Previous control. GREEN npx playwright test --config=playwright.selling.config.js tests/homepage-mobile-fixes.spec.js tests/hero-enhancement.spec.js exits0:20 tests. Matrix covers320/375/430/768/1440,light/dark,200% text,keyboard routes,image fallbacks/loading/empty. Six new phone/theme cases verify44px controls,initial/end/back bounds,keyboard Enter reaches the third product without navigating,full-photo fit/padding and thumbnail space.

npx playwright test --config=playwright.store-orientation.config.js tests/store-readability-ui.spec.js exits0:7 cases. Final npm run verify:development exits0. Configured npm --ignore-scripts run build:storefront exits0 with public K2 URL and guest/account flags: JS150.37/150.50kB gzip,CSS29.98/30.00kB gzip,boundary and secret gates pass. Existing limits are unchanged. The earlier separate passing Admin artifact evidence is reused: this follow-up changes storefront-only component imports/styles, with no Admin entry or shared code change. No complete release gate was requested/run.

Logs and source hashes: homepage-mobile-fixes-20261024/rail-followup/. Screenshots: docs/design-checkpoints/20261024-homepage-mobile/rail-*.png and rail-followup/real-media-375-*.png. Cached approved photo bytes were rendered in a local intercepted fixture in both themes; these fixtures have synthetic stock/prices and establish presentation only, not current live catalog acceptance. Dark shelf and light arrivals were visually inspected alongside the automated phone matrix. Physical-device touch,full assistive technology,Core Web Vitals and actual-host fixed-page acceptance remain unverified.

## Handoff and recovery

Changed runtime files: src/components/home/Hero.jsx,Hero.css,NewArrivals.jsx. Regression: tests/homepage-mobile-fixes.spec.js. Current rules/status also recorded in operations,System Brain,PRODUCT,DESIGN,FUTURE_IDEAS and the owning MAP-023 item. Historical re-audit is explicitly linked forward to this receipt.

MAP-023 retains the remaining release action: only after an explicit source-release request, prepare a scoped candidate against current production-linked main (the worktree history predates its squash merge), run one complete verify:release and required CI, verify separate Storefront/Admin artifacts and actual-host mobile/light/dark behavior. Production was not changed by this follow-up. Recovery reverts only these three component files and their added tests/current records; preserve unrelated changes and never restore a stale database or product/media snapshot.
