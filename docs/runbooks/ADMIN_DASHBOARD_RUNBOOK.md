# Admin dashboard widgets

IDEA-20260906-07, MAP-028 I-012 / MAP-021/023. Locally prepared; no dashboard
deployment, production database change or new channel connection was performed.

Choose **Shop & channel metrics** in the left panel for the default summary.
On phones use **Dashboard widget**, or open **More** for the same destinations.
Only the selected widget is visible. Selection survives leaving and returning
within the mounted Admin session; a full reload returns to the default.

| Widget | What it shows / permits |
| --- | --- |
| Shop & channel metrics | Payment-verified value, verified orders, average verified order, request backlog, Pasabuy and unread counts; recorded channel requests, value and listing states. |
| Sales & records | Separate submitted/payment/fulfillment values, exact reconciliation filters and read-only CSV export. |
| Revenue trend | Daily payment-verified request value for the retrieved reporting period. |
| Priority work | Existing task counts and links to their canonical operational workspaces. |
| Inbox metrics | Unread, overdue, urgent and unassigned conversation workload. |
| Pasabuy metrics | Current open sourcing cases by milestone. |
| Stock metrics | Current product availability and batch expiry exceptions. |

The 7/30/90-day control applies to order records and their comparison period.
Inventory, inbox, Pasabuy, connection and listing state are current snapshots.
Figures are drawn from the existing overview boundary; widgets perform no writes.
They neither connect a shop nor approve payments, release stock or publish products.

**Interpretation:** internal channel records can exist while a connector is
disconnected. A recorded live connection is not proof of a functioning external
API. Unrecognized channel sources are grouped separately, never reassigned to
Website. Zero means no matching returned internal records; it is not a claim of
zero external-shop activity. Traffic, conversion, advertising, settled payouts and
actual profit remain unavailable until their specific verified sources exist.

**Recovery:** missing or known truncated query results show unavailable, and
dependent sales totals/exports are withheld. Narrow the order reporting period or
retry with Refresh. Current-state sources cannot be narrowed with the date control;
ask an administrator to resolve their read/capacity issue. Other readable widgets
remain accessible. If a refresh is interrupted, a retained snapshot explicitly
keeps its original period, including the CSV filename; it is not relabelled as the
newly requested period. Review source freshness before operational decisions.

**Rollback:** revert only the widget integration in Admin/Overview and its registry.
Preserve source-availability checks and existing sales/security fixes. Before
source copies and hashes are in `docs/design-checkpoints/20260906-admin-widgets/`.
Do not reset the worktree or copy old documentation over unrelated intake work.
No database rollback is required. Evidence lives in
`docs/evidence/20260906-admin-widgets/README.md`; deployment and measured staff
acceptance remain in MASTER_ACTION_PLAN.
