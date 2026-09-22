# Admin quick tools

IDEA-20260922-01 / MAP-028 I-012 / MAP-025. Owner requested useful tools in the floating gear menu. Changes are local and do not grant new permissions or perform operational writes.

| Before | After | Why |
| --- | --- | --- |
| Icon-only calculators | Visible names plus Quick actions | Staff can identify tools without hovering. |
| No frequent-work shortcuts | Product/page search, barcode scan, products/stock, orders/packing, messages, workflow map and keyboard help | Open existing authorized workspaces; review/save remains there. |
| Modal only handled Escape | Shared AdminDialog focus handling and return to trigger | Keyboard users stay in the open panel. |
| Saved gear could be outside viewport | Position clamped on mount and resize | Recover after moving from desktop to phone. |
| 30-day helper called goods fresh | Guidance uses 90-day arrival threshold and states no stock is released | Match recorded quarantine rules without claiming product condition. |
| Notes looked shared/permanent | Explicit same-browser scratchpad disclosure | Avoid mistaken team handoff or secret storage. |

Existing sales, margin, cargo, currency, unit, VAT and expiry tools remain planning utilities. Labels and contrast are improved; form fields use 16px. VAT text describes arithmetic, not tax approval. Admin-only stylesheet remains in the separate Admin artifact. Product-register treatment: plain named controls, restrained existing palette, no new animation.

Verification:

- `npx playwright test --config=playwright.admin.config.js tests/admin-dashboard-redesign.spec.js --grep 'quick tools' --output test-results-admin-tools`: passed the phone/desktop shortcut visibility, offscreen-position recovery, expiry guidance, scratchpad persistence, Escape/focus return, keyboard-help and Workflow-map navigation case. Screenshots: `mobile.png` and `desktop.png`.
- The existing `bounded sales plan` browser case passed after the toolbar changes, including forward/reverse calculations and clipboard recovery. Early quick-tools attempts timed out during cold page startup; the isolated rerun passed with a bounded 240-second test timeout and external font requests blocked.
- 38/38 focused contracts passed with `playwright.api.config.js`: `admin-sales-calculation`, `spotlight-tour-contract`, `storefront-copy-contract`, `release-ci-contract`.
- Final `npm run build:admin` passed security, import, artifact, budget and secret gates: 214.07/300.00 kB minified Admin application; main CSS 28.79 kB gzip.
- Final release candidate: one uninterrupted `npm test` passed 1,143 checks, including the complete 36-case Admin suite and the quick-tools and sales-planner journeys.

Scope: synthetic authenticated Admin fixture; no operational data writes. Every shortcut is checked for visibility; keyboard help and Workflow map are exercised end to end. Real scanner permissions, other shortcut destinations under actual staff roles, physical devices, font loading and deployed behavior still require staff acceptance. This is not full accessibility certification. Design review preserved the existing product palette and calculators; labels, field readability, focus, phone scrolling and recovery were the targeted improvements.

Recovery: compare `src/views/admin/Admin.jsx` and `AdminToolsWidget.jsx` with `docs/design-checkpoints/20260922-admin-quick-tools/`; remove the new stylesheet only with its import and revert matching tests. No database/provider rollback. MAP-025 retains representative staff/device acceptance and deployment review.
