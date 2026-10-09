# K2 Jimzon — Master Operations Workflow Graph Specification

**Status:** revised source and local fixture verification, 2 October 2026; deployed-host acceptance unverified.
**Surface:** Admin BOS `workflow_graph` and the existing guide modal.
**Authority:** Operations rulebook and verified System Brain; MAP-028 owns readability/guide acceptance. MAP-018/023/026/017/020 own operational activation dependencies.

## Reading and exploration

The 49-step / 60-connection graph preserves all existing node IDs and relationships. It has five operational sections and eight workflows: cross-border lifecycle, existing-stock intake, new-product intake, inventory handover, monthly count, order fulfillment, Pasabuy and channel readiness. The guide is versioned draft source, not owner-locked operational approval.

Open at 100% with the selected workflow and the shared entry step. Full map shows all 49 steps. Type filters remove unrelated steps; they never dim words. Titles use 16px and supporting text 14px at ordinary browser size. Native scroll/touch, mouse background dragging and focused arrow-key panning support exploration. Selection centers against the actual viewport. Search offers selectable results and returns keyboard focus to the selected button within the same map instance. Full instructions remain in the Selected step details region below the canvas. Browser text enlargement reflows instructions; canvas zoom controls serve overview navigation.

## Current operational gates

| Subject | Required guide distinction |
| --- | --- |
| Product intake | Preserve canonical subcategory and approved manual K2 Product Content / K2 Product Image Studio Projects. The AiPromptStudioCard remains a prompt helper; it does not call external image APIs or publish products. |
| Receipt | Recording physical stock does not publish or authorize picking. Check eligible lots, explicit Website assignment and attributable order allocation/commitment. |
| Eligible lots | Manila dates; 90-day ordinary band, reasoned current approval for 31–89-day clearance, no ordinary offer for 0–30/unknown. Relevant history invalidates clearance. Category rules may raise the threshold. |
| Shop offers | One canonical physical truth; existing two-unit per-eligible-shop proposal bounded by eligible availability. Offer allocation does not change custody. Protected locks/transfer acceptance and complete snapshots remain required; current Shop stock is read-only. |
| Website | Global publication and Website membership are separate. Review product/media/subcategory and eligible stock. Unlisted uses the reviewed direct-offer path. |
| Orders/payment | Prepared 30-minute purchase holds are distinct from attributable commitments. Independent staff compare actual receiving-account funds against the accepted saved grand total, including delivery once. First attribution survives packing/handover; unknown causes reconcile. |
| Express | Current owner target is staff-quoted NCR Lalamove/Grab express, availability and buyer acceptance before payment. Selecting Express books no rider; unknown fees remain pending. Protected editable/versioned rates are a target requiring implementation/acceptance. |
| Channels | Local Shopee ingress preparation is not a verified real-provider event. Other marketplace/social adapters stay unavailable unless separately evidenced. |

Checkmarks and Training examples only track guide review in the open component. They do not save inventory, reserve stock, verify payment or establish real completion. Named existing screens perform real work; check saved records and receipts there.

## Component boundaries

| File | Responsibility |
| --- | --- |
| MasterWorkflowGraph.jsx | Section/workflow selection, scoped search focus, route tracing and local guide marks. |
| WorkflowSvgCanvas.jsx | Computed visible layers, actual model edges, native viewport exploration and immediate focus/zoom. No decorative camera animation. |
| WorkflowDetailDrawer.jsx | Complete step instructions, implementation notes, local examples and graph context. |
| workflowData.js / workflowGraph.js | Versioned teaching data and unchanged relationship identities; never operational authority. |
| workflowMap.css | Admin-scoped reading contrast, input text and responsive tooltip containment. |
| `AiPromptStudioCard.jsx` | Existing manually used prompt studio mounted in the guide; approved Projects remain the new-product teaching path. |

## Verification and recovery

`npm run test:workflow-map` exercises the actual components in a network-isolated local fixture. It is registered under the existing workflow test gate. Focused guide/graph/procedure contracts and the final development gate accompany the browser results. See `docs/evidence/20261002-workflow-map/README.md` for exact results/limits and `docs/design-checkpoints/20261002-workflow-map/README.md` for source recovery. No provider, database or production release is performed by this guide change. Actual staff, touch hardware and exact-host acceptance remain in MAP-028/025 and the operational MAP dependencies; no completed work is kept as an active queue item.
