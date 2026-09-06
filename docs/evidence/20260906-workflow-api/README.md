# Workflow API local acceptance — 6 September 2026

IDEA-20260906-04 / MAP-028 I-016. Owner requests functional API calls in the map.
First bounded slice adds explicit reads for inventory/catalog and consignment
nodes via existing getAdminProducts/getAdminConsignments services. No write,
provider activation or data migration occurs in this slice.

Release evidence: a438d85 was pushed to main; both Vercel project statuses
succeeded and full CI 34021862535 passed, including the new workflow suite and
PostgreSQL authorization/rollback rehearsals. The public Admin entry returns
HTTP 200 with the application bootstrap. Authenticated staff use is unverified
and remains MAP-028 I-016; existing BFF activation gates are unchanged.

Changed files: WorkflowRecords.jsx; WorkflowDetailDrawer.jsx; dedicated
playwright.workflow.config.js and workflow-api UI fixture/tests; package test
entry and base-runner exclusion; authoritative rulebook, Brain, MAP and design.

Checks: isolated release `npm run test:workflow-api` passes 4/4 (9.2s), in addition
to the original working-tree 4/4 (1.6m); dedicated API config with
workflow-guide-truth, staff-workflow-guide-contract and workflow-graph-canvas
passes 12/12; `npm run build:admin` passes boundaries, budget and secret scan.
The isolated Admin build has 38 manifest modules and a 186.91/300 kB application
chunk. The release also passes 25 configuration/CI contracts, including the
regression for identical local rehearsal database targets.
Initial attempts exposed the missing control and slow cold Vite navigation;
the final runner uses the repository's 120-second browser-test allowance.
No application timeout was enlarged. Retained logs name fixture-only evidence.

Browser checks use intercepted GET requests, covering an explicit request,
returned SKU/name, phone panel bounds, denied/malformed results, partial-data
warning, ten-row limit, refresh replacement and node-switch cancellation/empty
data. The desktop and phone record-panel screenshots were inspected for legible
content and button layout. The disabled switch is enforced in source; actual
staff-session/role and real-host acceptance remain in I-016, along with write
commands, broader read coverage and the external API/editor scope question.

Recovery: remove the WorkflowRecords import and keyed render in the drawer.
Existing guide/navigation behavior remains; no backend rollback is needed.

| Node domain | Existing request | Server authority |
| --- | --- | --- |
| inventory | GET /api/admin/products via getAdminProducts | Admin project, allowed origin, active staff session, AAL2, session registry and database access controls |
| consignment | GET /api/admin/consignments via getAdminConsignments | Same authorizeAdminRequest boundary |

The panel checks VITE_ADMIN_BFF_ENABLED before making either request. Test routes
are intercepted fixtures; deployed staff-session acceptance remains I-016.
