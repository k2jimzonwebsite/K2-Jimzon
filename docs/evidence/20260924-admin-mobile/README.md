# Admin phone workflow refinement — IDEA-20260924-03

Owner request: make the Admin simpler and more human for staff on phones, reduce the sense of one long page, group lists, improve container use, and stop words or oversized controls from escaping their boxes.

## Local change

- `Admin.jsx`: the phone drawer groups all existing sections by work area, opens the current area, and moves secondary tools into a disclosure. It uses `AdminDialog` for focus containment and Escape/return focus. The phone top bar names the section briefly. The hidden horizontal action toolbar is desktop-only; Inventory has one in-workspace Add inventory action, and the phone drawer retains CSV and spreadsheet access.
- `AdminWorkspaceUi.jsx` and `index.css`: shared headings, status text, metric values/details, and buttons can shrink and wrap. This affects text layout only; status meanings and actions are unchanged.
- `InventoryGrid.jsx`: removed a redundant plus sign from the Add inventory label.
- `tests/admin-dashboard-redesign.spec.js`: checks the grouped phone drawer, Inventory action access and root horizontal overflow across all 18 registered Admin sections at 360px. Existing browser checks were updated to open the named groups before choosing a destination.

## Evidence and limits

- Focused Admin source contracts passed 41/41. `npm run verify:development` passed. `npm run build:admin` passed the target boundary, secret scan and 217.34/300.00 kB minified Admin entry budget.
- The rendered 360px audit passed across all 18 sections. The complete Admin browser run passed 38/39; its sole failure was a test locator matching both a visible phone `h1` and hidden desktop `h1`, while the page snapshot showed the correct mobile label and Add inventory button. The corrected selector passed in an isolated rerun (1/1). No unaffected browser case was rerun.
- `navigation.png` and `inventory-actions.png` are local fabricated-data Chromium screenshots. They prove the rendered layout, not real staff comprehension, authorized record writes, or physical-device behavior.
- **Live snapshot, 24 September:** commit `5494b2bf71f7ecf30422e2b8c5bfc246b895bc9f` is on GitHub `main`. `admin.k2jimzon.com` returned the `admin` target marker and served `Admin-DnjF-ocB.js` containing `Buying & shipments`. Exact Vercel deployment IDs were not captured. No provider state, database row, role grant or order changed. Representative staff should find a product, process an order, open a Pasabuy request and return to the same record on actual phones before MAP-025 acceptance.
- The owner-requested `npm run verify:release` did not finish; its first 947 base tests printed passing results, then the runner stalled and was interrupted. The full release gate is not recorded as green. Earlier focused Admin evidence above is unchanged.

## Recovery

Use `docs/design-checkpoints/20260924-admin-mobile/` for the exact pre-edit shared files, then revert this UI slice only. Tests and this evidence record identify the route/action contract. There is no provider rollback; prior payment/SEO feature-branch changes must be preserved.
