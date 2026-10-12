# Workflow map source checkpoint — IDEA-20261002-06

These five files are exact working-source copies made before the owner-requested Workflow map changes. They preserve the local state, including earlier work, and are not live/provider evidence. Owning item: MAP-028; related operational gates: MAP-018/023/026/017/020/025.

Recovery: inspect current diffs first. Restore only MasterWorkflowGraph.jsx, WorkflowSvgCanvas.jsx, WorkflowDetailDrawer.jsx, workflowData.js and workflowGraph.js into src/components/admin/master-workflow-graph/ from these copies. Remove the newly added workflowMap.css and isolated workflow-map fixture/spec/config files, and revert only the workflow-map test registration in package.json. Do not revert prior shop-stock, payment or public-stock work. Reconcile the current specification, rulebook/Brain/idea records to the reverted guide and run focused map contracts plus the development gate after a source restoration. No database/provider rollback applies.

The evidence manifest hashes both this checkpoint and final source. Historical documents/logs describe verification states at their capture time; later authorized UI documentation edits do not invalidate the earlier SQL execution evidence or turn it into a new SQL rehearsal.
