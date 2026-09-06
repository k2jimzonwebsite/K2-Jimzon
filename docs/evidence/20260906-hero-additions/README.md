# Additive hero evidence — 6 September 2026

Release-tree refresh: isolated branch based on GitHub main 53647a4 contains only
the hero, its checkpoint/evidence, dedicated test wiring and scoped documentation.
Both production builds pass, plus all 8 hero/selling browser cases (36.1 seconds).
Release logs: `release-storefront-build.log`, `release-admin-build.log` and
`release-browser-tests.log`. Release landing JS 149.88/150 kB; CSS 27.39/30 kB
gzip; Admin chunk 186.91/300 kB. Earlier figures below refer to the broader local
working tree, not this focused release. Vercel is confirmed on K2 team
team_C3Wf3dVUBjUqGQ4rndMTCchz; prior production rollback candidate is
dpl_C6LPnEjmTUqTtQU9C9Lki78tAdr9. No configuration or database activation changes.

Owning work: IDEA-20260906-03 / MAP-028 I-009, with MAP-027 storefront ownership.
The request was to save the current design and enhance the hero by adding.

Changed source: `src/components/home/Hero.jsx` plus isolated `Hero.css`. Added
three catalog product links above the existing map, current retail/wholesale
price selection, neutral image failure fallback and loading/empty messaging.
The exact pre-edit diff preserves all existing rendered content. Shared CSS
and FlightMap remain byte-identical to the checkpoint.

`tests/hero-enhancement.spec.js` owns local keyboard/product navigation, original
CTA preservation, phone/tablet/desktop geometry, themes, reduced motion, failed
images and loading/empty checks. Its screenshot products, names, prices and
stock are deliberately fabricated; photographs use existing repository mock
assets for layout inspection. All HTTPS traffic is blocked. These screenshots
are design examples, not approved inventory, prices or product photography.
External font loading is blocked, so the established fallback fonts may render.

The full-component phone capture includes the browser's fixed bottom navigation
partway through the tall hero. `hero-375-shopping-viewport.png` captures the
actual scrolled shopping view with that navigation in its viewport position.
These are browser-emulated viewports, not real-device or assistive-tech evidence.

Verification commands:

```powershell
npm run build:storefront
npx playwright test --config=playwright.selling.config.js tests/hero-enhancement.spec.js
```

The first browser attempt required an unrestricted local browser process. The
first successful browser launch passed image/empty checks but hit the default
five-second product-route assertion while Vite was compiling the lazy route.
The fixture uses the existing suite's 60-second cold-transform allowance; this
does not change application timeouts or establish production load performance.
Final rerun: **3/3 passed (1.9 minutes)**. Original shopping and Pasabuy routes,
keyboard product navigation, fallback imagery and loading/empty behavior pass.
Rendered geometry is checked at 375/768/1440 and 812×375 landscape; the shelf
also stays within its bounds at 200% text. Light/dark screenshots were inspected.
The Storefront build passes: landing JS **149.85/150.00 kB** and CSS
**27.41/30.00 kB** gzip, with boundary and secret checks passing. No bundle cap
was raised. `browser-tests.log` and `storefront-build.log` retain fresh output.
The hero tests are included in the existing selling-surfaces command; the wider
suite was not rerun as part of this scoped visual change.

Recovery: follow
`../../design-checkpoints/20260906-hero-before-additions/README.md`. Restore only
the original Hero entry; its new CSS import disappears, leaving unrelated work
intact. All three checkpoint SHA-256 values were checked after implementation.
No provider changes or deployment occurred. Remaining broad design/readiness
acceptance and exact next action live in MAP-028 I-009, not this evidence record.
