# Evidence: Mobile Store Overlay Collision Removal (I-015 / MAP-027)

Date: 2026-09-15  
Auditor / Pair: Antigravity  
Authoritative Spec: `MASTER_ACTION_PLAN.md` (Item I-015 / MAP-027), `OPERATIONS_LOGIC_AND_WORKFLOW.md` (Concept §18 Virtual Store), `PRODUCT.md`, `DESIGN.md`.

---

## 1. Problem & Root Cause Analysis

On mobile viewports (portrait and landscape, $\le 900$px):
- `.k2-store-basket-dock` was previously positioned at `top: 0.5rem; right: 4rem; width: min(11.25rem, calc(100% - 1rem))` (and overridden at line 1431 with `right: 4rem`).
- This caused the filled basket dock to float right in the top-center zone of the 3D room, directly occluding the Counter heading ("The Counter" / welcome signage), the ceiling pendant lamp, and shelf department headers.
- It also created collision hazards with the shopkeeper companion (`.k2-store-guide`) at `top: 0.5rem; left: 0.5rem` and zoom controls (`.k2-store-zoom`) at `top: 0.6rem; right: 0.6rem`.
- When the shopkeeper dialogue was opened, `.k2-store-guide-panel` (with `margin-left: 3.8rem`) overlapped the basket dock and squished dialogue text on 375px screens.
- Form inputs in the shopkeeper form lacked 16px mobile styling, risking iOS Safari automatic viewport zooming.

---

## 2. Reflow Architecture & Design Engineering

Adhering to the four mandatory design skills (`ui-ux-pro-max`, `impeccable`, `design-taste-frontend`, `emil-design-eng`) and repository working rules:

1. **Bottom-Right Basket Docking on Mobile (`@media (max-width: 900px)`)**:
   - Filled basket `.k2-store-basket-dock[data-filled="true"]` is relocated to `bottom: calc(44px + 1.15rem); right: 0.75rem; top: auto; left: auto; z-index: 9`.
   - Reflowed into a sleek, compact pill (`display: flex; align-items: center; gap: 0.5rem; min-height: 48px; border-radius: 999px; padding: 0.3rem 0.55rem 0.3rem 0.65rem;`).
   - Includes scaled tangible parcel graphic (`transform: scale(0.72)`), item count & peso subtotal (`Fraunces` serif strong + muted subtitle), and a direct terracotta "Review basket →" button meeting the $\ge 44\times 44$px touch invariant.
   - When empty (`data-filled="false"`), the basket dock remains completely hidden (`display: none;`) on mobile, eliminating unnecessary visual noise.
   - Grounded cleanly above the horizontal product rail (`.k2-store-rail`) with a deliberate 10–12px vertical rhythm.

2. **Top Scene Freedom**:
   - The top-center of the 3D viewport (Counter signage, clerk stage, lighting, and shelf banners) is now 100% clear of floating utility clutter.
   - Shopkeeper toggle pill remains docked at top-left (`top: 0.6rem; left: 0.6rem`).
   - Zoom controls remain docked at top-right (`top: 0.6rem; right: 0.6rem`).

3. **Shopkeeper Dialogue Card Overlay**:
   - When open (`data-open="true"`), `.k2-store-guide` expands with `z-index: 25; width: min(22rem, calc(100% - 1.2rem)); max-height: calc(100% - 9rem); display: flex; flex-direction: column`.
   - `.k2-store-guide-panel` features `flex: 1 1 auto; min-height: 0; max-height: min(10.5rem, calc(100% - 3.5rem)); overflow-y: auto; margin: -0.4rem 0 0 0; padding: 0.7rem 0.8rem 0.55rem; border-radius: 0 0 1.25rem 1.25rem`.
   - Bounded height guarantees at least 16–27px of clear air above the bottom basket dock on a 375×812 viewport, ensuring both the dialogue and basket review action remain fully visible and clickable without intersection.
   - Added `overflow-wrap: break-word; word-break: break-word;` to `.k2-store-guide-speech`.
   - Mobile `#keeper-question` input is set to `font-size: 1rem` (16px) to eliminate iOS Safari viewport auto-zoom.

4. **Horizontal Rail Overflow Protection**:
   - Rail buttons `.k2-store-rail > li > button` are protected with `max-width: min(80vw, 22rem); overflow: hidden; text-overflow: ellipsis; white-space: nowrap`.
   - Guaranteed zero page-wide horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`).

---

## 3. Verification & Evidence

### Test Execution Results
1. `npm run test:store-orientation`:
   - `tests/store-orientation-ui.spec.js`: 2/2 passed
   - `tests/store-overlay-collision.spec.js`: 3/3 passed (portrait, landscape, reduced motion fallback)
2. `npm run test:contracts`:
   - 625/625 contract tests passed
   - 8/8 selling surface tests passed
3. `npm run build:storefront`:
   - Passed with zero warnings / errors
   - Landing JS: 149.76 kB / 150.50 kB gzip ($\le 150.50$ kB budget)
   - Landing CSS: 27.77 kB / 30.00 kB gzip ($\le 30.00$ kB budget)
4. `npm run build:admin`:
   - Passed: 191.12 kB / 300.00 kB minified
   - Security gate and secret scan: 0 secrets found, 0 gaps

### Captured Visual Evidence
- `portrait-375-basket.png`: 375×812 portrait showing empty top-center, top-left shopkeeper toggle, top-right zoom controls, bottom-right basket pill, bottom product rail.
- `portrait-375-keeper-open.png`: 375×812 portrait with shopkeeper open, showing dialogue card, question input with 16px text, and bottom basket dock with review button fully visible and separated by a 16px+ clear gap.
- `landscape-844-basket.png`: 844×390 landscape with side panel on right, room controls separated, and basket dock cleanly docked above bottom rail.
- `flat-scene-basket.png`: 375×812 reduced motion fallback showing flat scene card centered and unobstructed.
