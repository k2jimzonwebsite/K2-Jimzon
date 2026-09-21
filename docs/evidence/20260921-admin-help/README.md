# Admin help and workflow wording, 21 September 2026

Owner request: review question-mark help, add useful guidance, and make the workflow map concise for staff. IDEA-20260921-01; owning acceptance: MAP-028 I-012/I-016.

## Review and changes

Reviewed shared HelpTip, WorkspaceIntro/SectionHeading descriptions, Admin section descriptions, dashboard widget help and Overview panel help; reviewed workflow map orientation, categories, step detail headings, guide-only state and route controls. Kept already direct help in Inventory, shop allocations, Inbox and channel readiness. Copy changes preserve IDs, event handlers, calculations, approvals, state transitions and actual setup gates.

| Before | After | Reason |
| --- | --- | --- |
| Secure Admin BFF / legacy browser database path | Count & Close is not available yet; secure setup is required | Tell staff why the task is blocked and who to ask. |
| Operational SOP & Physical Directive | Do the work | Name the action in familiar language. |
| Step Exit Criteria (Server Verification Gate) | Before moving on | Keep the saved-result checks with a readable heading. |
| Grounding evidence | Supporting records | Make the reference section understandable. |
| FEFO batch risk | Batches nearing expiry; earliest-expiring sellable batch first | Explain the stock rule. |
| Confirm before holding stock | Review requests and check payment separately | Avoid contradicting purchase-time holds. |

Added map orientation and guide-checkmark help. Checkmarks remain temporary local review state; they do not save operational records. Preserved draft approval metadata, unavailable integration notices, numeric stock policies and private-customer boundaries. Count & Close remains gated off where secure setup is absent.

Skills applied: using-superpowers, humanizer, andrej-karpathy, ui-ux-pro-max, impeccable (product register), design-taste-frontend, emil-design-eng, verification-before-completion; continued the existing approved design scope. Existing Admin tokens and typography are retained.

## Evidence

- Contract suite: 692/692 passed after updating old copy expectations, without removing behavioral assertions.
- Focused Admin browser checks: 3/3 passed (375px keyboard help bounds, unavailable-channel map labels, desktop/phone graph routes). All 49 graph nodes, branch/convergence/return edges, zoom and route tracing remain covered.
- Admin build and security prebuild passed; final application size 201.18/300.00 kB minified; output secret scan 78 files, zero leaks.
- Initial test runs exposed old wording expectations; those expectations were updated. The chained storefront checks needed a separate browser launch outside the sandbox; result recorded below when complete.
- Count & Close browser result and release status are recorded below when available.

## Recovery and acceptance

Pre-edit sources: docs/design-checkpoints/20260921-admin-help/. Revert only the release commit or scoped Admin copy to recover; no data migration or database rollback is required. Unrelated GlobeOverlay changes remain excluded.
Staff comprehension and authenticated production use have not been observed. The owning MAP item retains staff acceptance; local fixtures do not prove production writes or deployment.

Count & Close phone browser: 1/1 passed through sealed bookkeeping handoff, with mobile touch targets and landscape overflow checks. Map screenshots were captured before the final matching Admin header title was shortened; map content is the tested version.

## Production receipt

Code release a1a8507e70732ecf98a4279354ada8f280b2a53c pushed to main. GitHub Vercel checks reported success for both separate projects: Admin deployment F1pHZV8bDUyAAgXNjtyzA1PQrLSz; storefront CDhWjt6UBjxJ1tSzoWHFAaBE1yzh. Public Admin HTML returned HTTP 200. New OwnerCountClose and MasterWorkflowGraph production assets returned HTTP 200 and contain the exact new copy; see live-assets.json. This proves deployed assets, not authenticated operational writes. Vercel connector returned team-access 403; GitHub deployment statuses and public files supplied the release evidence.

The separate storefront browser retry passed 8/8. Initial chained launch was blocked by the sandbox and its fixture server remained on port 5191; the verified task-owned process was stopped before retry. No product change was needed. GitHub CI run 35555884240 was still running at the initial production check; inspect that run for the complete remote gate. Previous production code 006ef6b is the rollback reference.
