# Storefront readability — 21 September 2026

Owner request: readable mobile/desktop Storefront fonts and human wording, mobile drag guidance instead of scene arrows, easier zoom and legible dark store/chat. IDEA-20260921-08 was merged into MAP-027 / MAP-028 I-015. This is locally prepared and verified code, not a deployment receipt.

| Before | After and reason |
| --- | --- |
| Fixed dark sheet/chat ink and white hover backgrounds failed in dark mode | Paired store text/surface tokens preserve readable labels, headings and Close controls. |
| Small decorative product text and helper copy | Source Sans UI product names at 17px, metadata 14px, chat inputs 16px; editorial display and wood identity retained. |
| Phone arrows obscured the room; swipes needed almost half a viewport | Arrows hidden on phones; visible swipe/pinch instruction, short swipe threshold, direct category choices retained. |
| Pinch after button zoom used the wrong initial scale | Initial distance multiplied by existing zoom; camera-distance test confirms pinch moves closer after zoom-in and reset restores view. |
| Keeper input blur changed its layout before Ask received a click | Focus tracked across the entire question form so the first click opens chat. |
| Footer service wording and small links were hard to scan | Plain action labels and 16px text, with readable dark accent colors. |

Design judgment: restrained controls, consistent vertical spacing and explanatory gestures; no new decorative motion. Shared chat CSS remains lazy to keep the initial Storefront budget. Existing commerce and service authority are unchanged.

## Local verification

- `npx playwright test --config=playwright.api.config.js tests/map027-interactive-shop.spec.js tests/map027-store-polish.spec.js tests/release-ci-contract.spec.js`: 109 passed.
- `npx playwright test --config=playwright.store-orientation.config.js`: 12 passed. Includes desktop/portrait/landscape 3D and fallback, keeper/basket collisions, shelf/chat/FAQ contrast >=4.5:1 at 390px and 1440px in both themes, 44px camera buttons, 90px drag, Chromium two-touch pinch after button zoom, reset, Escape, 200% root font size and phone footer contrast.
- `npm run build:storefront`: passed security, import, secret, artifact-boundary and bundle gates. Landing gzip JS 150.17/150.50 kB; CSS 29.25/30.00 kB. Existing large lazy 3D chunk warning remains non-blocking.
- `npx playwright test --config=playwright.selling.config.js tests/storefront-selling-surfaces.spec.js tests/storefront-theme.spec.js`: 7 passed (product/cart limits, synthetic guest start/reply, confirmation/recovery and theme persistence).
- Final release candidate: one uninterrupted `npm test` passed 1,143 checks after the Storefront fixtures were changed to wait for the cold stylesheet transform. The corrected phone-landscape acceptance asserts that mobile shelf arrows stay hidden while category tabs and products remain usable.

Screenshots in this directory show shelf and chat at both widths/themes, mobile 3D, enlarged phone text and both footer themes. Orientation/collision captures are copied under `orientation/` and `collisions/`; historical evidence remains unchanged.

Fixtures isolate service calls; external fonts are blocked and screenshots exercise the system fallback. Numeric computed contrast checks cover named elements, not a claim of whole-site accessibility certification. Root-font enlargement is not physical browser zoom. No real customer messages, orders, stock mutations, database changes or deployment were performed.

## Recovery and next action

Owning backlog: MAP-027, with MAP-028 I-015 presentation acceptance. Review/promote the Storefront artifact through the existing release workflow, then verify exact-host light/dark, Android/iOS pinch, browser zoom, orientation, keeper and chat; verify live stock/chat separately. Those pending actions stay in MAP, not here as a second backlog.

Source changes: `src/interactive-store.css`, `src/index.css`, `src/views/InteractiveShop.jsx`, `src/components/Footer.jsx`, and shop components StoreSheet, StoreSidePanel, StoreChatPanel, StoreKeeper, ShelfProductPanel and ShelfScene3D. New shared stylesheet: `src/components/shop/StoreChatPanel.css`. Test registration: the two Playwright configs and focused MAP/readability specs.

Recovery: compare and selectively restore pre-edit sources from `docs/design-checkpoints/20260921-store-readability/src/`, remove the new chat stylesheet only with its import, and revert the matching test assertions/config registration together. Preserve any later work. Rebuild and run the same checks. No database/provider rollback is needed.
