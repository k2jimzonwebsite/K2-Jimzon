# Calmer dashboard and left-panel widgets

Requested 6 September; verification continued 7 September 2026.
IDEA-20260906-07 refines IDEA-20260906-06, owned by MAP-028 I-012 / MAP-021/023/025.
Checkout `.tools/hero-release`, branch `codex/automatic-intake-preparation`.
Local uncommitted work only; no deployment, paid calls, keys or production changes.
Existing automatic-intake preparation and unrelated root work are preserved.

Seven widget destinations now live in the existing sidebar and mobile navigation.
The central workspace shows one selected view. Shop & channel metrics is the
default; original sales reconciliation/export and operational destinations remain.
Flat neutral panels, restrained selection, readable secondary text and labelled
44px controls preserve the K2 product register. No new dependency or design system.

The overview's existing reads now request exact counts to detect capped results.
Missing/incomplete data cannot masquerade as zero totals or valid sales exports.
Unrecognized sources retain a separate channel group. A generation check rejects
out-of-order responses; retained data keeps the retrieved period in labels/exports.
Traffic, conversion, ad spend, payouts and actual profit are explicitly unavailable.

| Before | After | Reason |
| --- | --- | --- |
| All reporting panels stacked together | Seven named sidebar widgets | Staff opens the task they need. |
| Repeated accent backgrounds and subdued small copy | Neutral icons/panels and stronger secondary text | Lower visual competition without hiding state. |
| Failed reads could become empty arrays and zero totals | Source-specific unavailable states | Absence of data is not absence of business activity. |
| Unrecognized source defaulted to Website | Separate Other / unrecognized group | Preserve attribution truth. |
| Navigation badge changed its accessible name | Explicit stable navigation labels | Counts do not alter the action's identity. |

Source checkpoint: `docs/design-checkpoints/20260906-admin-widgets/` includes
Admin/Overview before copies, SHA-256 hashes and a before screenshot.
`desktop.png`, `mobile-metrics.png`, `mobile-sales.png` use fabricated fixture
records. They were visually inspected; they do not establish live channel activity.

## Verification

API/logic/sales suite: 81 passed with
`npx playwright test --config=playwright.api.config.js tests/admin-logic-regressions.spec.js tests/admin-bff-contract.spec.js tests/admin-sales-calculation.spec.js`.
This includes exact state arithmetic, source completeness and the existing BFF
authorization boundary. No real API account was contacted.

Browser acceptance: `npm run test:admin-ui` **31 passed**. Coverage: all widget destinations, source
failure/recovery, channel attribution, truncated totals/export denial, retained
period/export, desktop/375px/200% text zoom, keyboard/focus, CSV values and existing
staff workspaces. After the final loading/export guard, all **7 affected dashboard
journeys passed again** using the same config with
`-g 'widgets show|widget source|unknown channels|phone metrics|failed period|renders multichannel|collapses safely'`.
That guard prevents a previously capped sales set becoming exportable while a
replacement date-range read is still pending. Both builds and `git diff --check` pass.
Initial fixture count headers lacked CORS exposure; corrected to match PostgREST.
The resulting visible inventory count exposed a navigation accessible-name issue;
explicit labels fixed it. No failure was hidden by skipping a test.

Separate Admin and Storefront builds passed their import, environment, route,
secret and bundle-boundary checks. Admin application 188.47/300 kB minified;
Storefront landing 149.89/150 kB gzip. Source inventory has zero route-control gaps.

## Limits and recovery

Read-only browser fixtures and local builds are not deployed staff acceptance.
Exact counts add read cost; real-host latency and known production row caps still
need observation. Full external analytics/settlement/profit sources are not added.
Physical-device testing and measured staff task timing remain unverified.
Deployment/activation scope stays in MAP-028 I-012 and existing provider gates.

See `docs/runbooks/ADMIN_DASHBOARD_RUNBOOK.md` for staff use and scoped rollback.
Retain data-availability fixes during any visual rollback. No database rollback.
