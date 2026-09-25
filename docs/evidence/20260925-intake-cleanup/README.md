# 2026-09-25 intake cleanup (IDEA-20260925-01)

Single-logic intake cleanup: phone-scan `ProductIntakeSessionModal.jsx` is the canonical door. Nothing was deleted. Docs duplicates moved to `docs/evidence/_archive-2026-09-25/` with git history preserved as renames.

## Code audit verdicts (repository-wide import grep, 2026-09-25)

| File / path | Verdict | Evidence |
| :--- | :--- | :--- |
| `src/views/admin/ScanToAiModal.jsx` | KEEP, in flow | Imported by `InventoryGrid.jsx:5` and `Sheet.jsx:7`; scanner hands off to Smart Paste review |
| `src/views/admin/SmartPasteModal.jsx` | KEEP, in flow | Imported by both surfaces; review-only handoff, no product authority |
| `src/views/admin/AutomaticIntakePanel.jsx` | KEEP, in flow | Composed inside `ProductIntakeSessionModal.jsx:34` |
| `src/views/admin/IntakeStepGuide.jsx` | KEEP, in flow | Rendered inside `ProductIntakeSessionModal.jsx:35` |
| `src/components/admin/tour/AddInventoryChooserModal.jsx` | KEEP, in flow | Mounted by `InventoryGrid.jsx:553`; options pinned by `tests/spotlight-tour-contract.spec.js:91` |
| Tour anchors `scan-box-btn`, `smart-paste-btn`, `add-product-btn` | KEEP | Pinned by `tests/spotlight-tour-contract.spec.js:76` (source-contains assertions) |
| `docs/evidence/MAP_017_EXHAUSTIVE_AUTHORIZATION_AUDIT_2026-08-22.md` | KEEP in place | Pinned by `tests/schema-truth-tool.spec.js:388` (hash assertions) |
| `docs/evidence/20260909-map017-followup.md` | KEEP in place | Cited by System Brain, owner record, and `ADMIN_BFF_SECURITY_RUNBOOK.md` |
| Legacy `MANUAL-xxxx` browser SKU (`InventoryGrid.jsx:534,560`) | KEEP until BFF cutover | `secure = adminBffEnabled()` (`InventoryGrid.jsx:183`); Admin BFF is off in production, so `secure=false` there and this fallback is the live create path. Secure-mode save already refuses legacy creation (`InventoryGrid.jsx:388`: "Use phone-first intake to create an attributable product Draft."). Removal is a MAP-018/MAP-020 code slice, not this cleanup. |

## Source change in this slice (one line)

`src/views/admin/Sheet.jsx`: the Sheet scanner now receives the same `onOpenSmartPaste` handoff Inventory already had. Before, its "Open JSON review and image handoff" button closed the scanner and opened nothing (`ScanToAiModal.jsx:108-111` calls `onClose()` then the optional callback, which Sheet never passed). After, scan hands off to JSON review on both surfaces.

## Verification

- Focused: `product-intake-contract`, `admin-logic-regressions`, `spotlight-tour-contract` — 39/39 passed (`npx playwright test --config=playwright.api.config.js` on the three files).
- `npm run verify:development` (= `npm run prebuild`) — passed, exit 0: secret scan 1634 files, env contract 5 fixtures, file policy 1632 files, env boundary 224 browser + 172 server files, dependency policy 18 direct / 278 locked, surfaces 0 gaps, import integrity ok.

## Rollback

- Docs moves: `git mv` each file back from `docs/evidence/_archive-2026-09-25/`, or `git revert` the slice commit.
- Sheet handoff: revert the one-line prop addition; the button returns to close-only behavior.

## Still open (not this slice)

Full side-door reroute (Inventory Scan box / Smart paste buttons into phone-first flow) and browser-SKU path removal stay behind MAP-018 intake acceptance and the MAP-020 BFF cutover, with staff acceptance in MAP-025. No live behavior, provider, or database state changed here.
