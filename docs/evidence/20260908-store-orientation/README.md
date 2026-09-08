# 3D store orientation - 8 September 2026

## Production verification

Commit `6ad7578235c8a6b16ce42b947028f090f1ae1eb1` reached the Storefront
production project in Vercel receipt `6328123772`; CI `34229084356` passed.
The canonical `/store` returned HTTP 200 and was rendered after deployment at
desktop, 390x844 portrait, and 844x390 landscape. The store heading, shelf
navigation, light control, exit control, zoom controls, shopkeeper, basket or
shelf concierge remained present as appropriate, and both mobile viewports had
no horizontal overflow. This is live-host rendering evidence; it is not a
physical-device, screen-reader, real-order, or provider acceptance claim.

Request: finish interrupted recovery work, then improve the architectural `/store`
on desktop and mobile portrait/landscape. Owner explicitly distinguishes it from
catalog/shop. IDEA-20260908-02 is merged into MAP-028 I-009/I-015 and MAP-027.

## Changes and reason
Actual WebGL screenshots exposed a 123.375px landscape header on a 390px screen,
an oversized introduction, and portrait basket/zoom overlap. The failing browser
baseline recorded the header >80px. Responsive CSS now uses a single-row short
landscape header, compact phone introduction, and selection-first detail rail.
Empty phone basket decoration is hidden; filled basket reserves zoom space.
The minimized keeper has a labeled avatar control. Existing room geometry,
camera, assets and canonical commerce state are preserved. No Blender asset
was needed. Catalog/shop is unchanged by this slice.

## Evidence
`*-before.png` and `*-after.png` are reduced-motion fallback captures.
`3d-*-before.png`, `3d-*-after.png`, and `3d-*-basket.png` show the actual local
WebGL room at desktop 1440x900, portrait 390x844 and landscape 844x390.
The browser fixture intercepts catalog reads using a fabricated coffee record;
these images are not live inventory, deployed-store or device-performance proof.

- Initial correction: 2/2 browser journeys pass; actual room rendering, selected
  product, basket quantity/subtotal and checkout control persist across rotation.
- Final interaction rerun adds zoom clickability with a filled basket and unsent
  keeper question preservation: 2/2 passed in the final run.
- Store/clerk/release source contracts: 111/111 pass.
- Storefront build passes boundary, budgets and emitted-secret scan; initial
  measurement 149.86/150kB landing JS and 27.45/30kB CSS gzip.

Commands: `npm run test:store-orientation`; `npm run build:storefront`;
`npx playwright test --config=playwright.api.config.js tests/map027-interactive-shop.spec.js tests/map027-store-polish.spec.js tests/map027-clerk-workflow.spec.js tests/release-ci-contract.spec.js`.
The orientation runner is included in `npm test`; aggregate npm test was not run.

## Remaining / recovery
Owning MAP item retains physical-phone touch/keyboard, GPU/performance, deployed
catalog and real staff/order end-to-end acceptance. No provider state, deployment,
asset upload or production flag was changed. Restore only the matching pre-edit
files in `docs/design-checkpoints/20260908-store-orientation/` to reverse the
layout; preserve unrelated working-tree changes. Next acceptance is the real
phone/browser journey in MAP I-009/I-015/MAP-027, then remaining I-002 intake/CSV
retry work in the owner's agreed dependency order.
