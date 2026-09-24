# Calmer widget wording and contextual help

IDEA-20260907-04, MAP-028 I-012 / MAP-021. Local preparation, not deployed.
Preserves the separately prepared guided-intake pilot and PRODUCT.md/DESIGN.md.

| Before | After | Why |
| --- | --- | --- |
| Repeated widget description always shown | Help button beside selected title | Routine reading is optional. |
| No contextual explanation control | Inline How to read / What next panel | Help stays near the relevant numbers. |
| Technical inbox/stock/Pasabuy copy | Short plain-language descriptions | Reduce reading effort. |
| Help on every view | Help only on channel metrics, sales, revenue and priority | Explain non-obvious source, calculation, date and overlap rules without cluttering simple views. |

The four design skills guided restrained progressive disclosure and familiar
keyboard controls. Existing layout, palette, metrics, routes and permissions
are unchanged. Source failures, freshness, zero-data meaning and unavailable
finance/feed coverage remain outside help. No modal or new library was added.

Test-first: the new browser assertion failed because Help did not exist. The
implemented test passed for open/close, Escape focus recovery, widget-change
reset, contextual explanations and 375px overflow. An existing regression caught the
shortened zero-data wording; its visible sentence was restored, not hidden.
mobile.png is a fabricated-fixture screenshot inspected for readable controls.

Recovery: revert the scoped Overview/dashboardWidgets/help-test edits only;
preserve intake preparation. No database/provider rollback is needed.
Remaining release and real-staff acceptance are tracked in the MAP.

Owner refinement: Help must be necessary, not universal. The updated browser
test first failed because Stock still displayed Help. It now checks absence on
Stock, Inbox and Pasabuy, plus contextual guidance on all four eligible views.
The mobile fixture screenshot now shows the revenue-date explanation.

Final verification after the selective-help refinement: `npm run test:admin-ui`
passed 34/34. `npm run build:admin` passed prebuild security, import,
artifact boundary, budget and secret checks (195.85 kB / 300 kB Admin entry).
`git diff --check` passed. These checks include the preserved intake pilot;
they do not establish production deployment or authenticated real-data use.
