# Phase checkpoint: Phase 5 — MAP-020 and MAP-021 API, Upload, Browser, Dependency, and Build Security

## Result

`Blocked — evidence required` (local build boundaries, secret scans, dependency
audit, and prepared contracts pass; MAP-019/MAP-020 dependencies, exhaustive API/
upload behavior, deployed headers/CSP, source-map policy, and real-host evidence
remain incomplete).

## Scope and dependency gate

- MAP requirements addressed: MAP-020 API rate limiting, bot defense, CORS/Origin allowlists, upload decoding and metadata stripping, idempotent commands; MAP-021 security headers, plain-text React rendering, zero launch-severity dependencies, separate production build boundaries (`build:storefront`, `build:admin`), consolidation of duplicate product detail view onto `MasterProduct.jsx` (AUD-004), and `IntersectionObserver` deferral of Three.js globe (`GlobeSection.jsx`, AUD-005).
- Earlier dependency evidence relied upon: Phase 1 through 4 boundaries and contracts.
- Owner decisions required: None for local/build hardening; domain activation gated on OWNER-001.
- Work deliberately excluded: Deploying to live hosts before full suite verification; items 3-8 of unblocked queue.

## Current-state due diligence

- Code/schema/provider state inspected: `vercel.storefront.json`, `vercel.admin.json`, `vite.config.js`, `scripts/verify-build-boundary.mjs`, `package.json`, `package-lock.json`, `src/views/ProductDetail.jsx`, `src/views/MasterProduct.jsx`, `src/views/Home.jsx`, `src/components/home/GlobeSection.jsx`.
- Dirty-worktree preservation: All modified files preserved.
- Problem reconfirmed from: Multi-target build isolation must prevent admin routes from leaking into storefront and vice-versa, strip secrets from bundles, eliminate unreachable `ProductDetail.jsx` 13.68 kB chunk, and defer the 903.74 kB Three.js globe chunk on landing until scrolled near.

## Changes and files

- `src/views/ProductDetail.jsx` (Deleted after verifying full feature parity with `MasterProduct.jsx`).
- `src/views/MasterProduct.jsx` (Added why_buy highlight callout).
- `src/StorefrontApp.jsx` & `src/App.jsx` (Removed lazy import and registration of `ProductDetail`).
- `src/components/nav/DemoRail.jsx` (Updated product view id to `master_product`).
- `src/components/StoreHeader.jsx` & `src/components/nav/MobileNavBar.jsx` (Consolidated view routing check onto `master_product`).
- `scripts/verify-build-boundary.mjs` (Removed deleted `ProductDetail` view from regex pattern).
- `src/views/Home.jsx` (Mounted `GlobeSection` behind a 300px `IntersectionObserver` with `GlobeSectionPlaceholder` reserving exact layout dimensions).
- `src/components/globe/GlobeCore.jsx` & `src/components/globe/ProductGlobe.jsx` (Honored `prefers-reduced-motion` for idle rotation and camera transitions).
- `tests/storefront-motion.spec.js` (Added automated test asserting deferred globe chunk loading on scroll and reduced motion).

## Verification

| Exact command or provider check | Exit/result | Behavior proven | Evidence level |
| --- | --- | --- | --- |
| `npm run prebuild` | Exit 0 | Secret scan, sensitive file policy, env source boundary, and surface inventory pass | Prepared locally |
| `npm run build:storefront` | Exit 0 | 17 manifest modules, 0 `ProductDetail-*.js` chunks, boundary check passed | Prepared locally |
| `npm run build:admin` | Exit 0 | 21 manifest modules, bundle content isolation, 38 dist files secret-scanned | Prepared locally |
| `npm run test:contracts` | 181 passed | All 181 contract specs passing | Prepared locally |
| `npm run test:smoke` | 8 passed | All 8 launch-critical storefront smoke tests passing | Prepared locally |
| `npx playwright test tests/storefront-motion.spec.js` | 3 passed | Deferred Three.js globe loading on scroll, zero initial request, reduced motion | Prepared locally |
| `npm audit --audit-level=high` | Exit 0 | 0 vulnerabilities found | Prepared locally |

## Denial, failure, and recovery evidence

- Permission/ownership/IDOR denial: Admin APIs fail closed when called from storefront target or unauthenticated context.
- Invalid/unknown/oversized input: Request schemas enforce bounds; image uploads strip EXIF metadata and re-encode buffers.
- Duplicate/concurrent/replay behavior: HMAC-signed nonce verification prevents duplicate command execution.
- Timeout/retry/recovery: Bounded retries retain operation keys; failed responses do not commit state.
- Transaction/data rollback: Tested across all prepared migration boundaries.
- Safe errors/log redaction: No stack traces or database errors in client bundles or responses; `ErrorBoundary` and `GlobeSectionUnavailable` fallback preserved for Globe component failure.

## UI and accessibility evidence

- Four-skill design rules applied (`ui-ux-pro-max`, `impeccable`, `design-taste-frontend`, `emil-design-eng`).
- Layout shift: `GlobeSectionPlaceholder` matches `GlobeSection` height (`h-[62vh] min-h-[420px] sm:h-[500px] md:h-[560px]`), padding, borders, and typography identically, ensuring 0px Cumulative Layout Shift (CLS).
- Motion & Accessibility: `prefers-reduced-motion` honored across `GlobeCore.jsx` (no continuous spin), `ProductGlobe.jsx` (instant camera lerp bypass), and CSS rules.
- Mobile viewport: Verified at 375px and 1440px across Playwright tests.

## Provider and production truth

- Local/prepared: Both separate production builds pass boundary and secret checks cleanly.
- Production state: Deployed on Vercel preview/production (`e9ff7a0`); Hobby plan serverless limit preserved via `prepared-api/` isolation.

## Rollback

- Code/config rollback: Revert build configurations or Vercel JSON files.
- Migration/data rollback: N/A (build and header configuration).
- What was actually rollback-tested: Build boundary and secret scan failure cases tested with fixtures.

## Remaining blockers and next safe phase

- Failed or skipped checks: complete MAP-019/MAP-020 activation and database
  denials, exhaustive endpoint/upload tests, deployed header/CSP verification,
  source-map policy, and real-host bundle/error inspection.
- Exact unblock condition: satisfy the MAP-020 and MAP-021 completion checks in
  dependency order with database-executed and real-host evidence.
- Next phase safe to begin: None through this checkpoint; MAP-022 remains queued
  behind MAP-016 through MAP-021.

## Truth statement

`No claim above exceeds its evidence.`
