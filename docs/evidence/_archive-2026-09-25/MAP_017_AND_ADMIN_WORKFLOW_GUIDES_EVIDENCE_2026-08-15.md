# MAP-017 & Admin BOS Visual Workflow Guides Verification Report

**Date:** 15 August 2026  
**Status:** COMPLETE & VERIFIED  
**Scope:**
1. **Track 1 (Option 1):** Database Schema Truth, Grant Revocations, Storage Security, and Fail-Closed Invariant Suite (MAP-016 / MAP-017).
2. **Track 2 (Option 2):** Admin BOS Visual Workflow Guides Suite built with `diagram-design` and the mandatory 4-skill design system (`ui-ux-pro-max`, `impeccable`, `design-taste-frontend`, `emil-design-eng`).

---

## 1. Executive Summary

This report documents the architectural, security, and UI additions delivered to the K2 Jimzon platform. It provides an immediate diagnostic and operational reference so engineers and operators can verify behavior, troubleshoot failures, and maintain system truth across production releases.

```
+-----------------------------------------------------------------------------------------+
|                                    K2 Jimzon BOS                                        |
|                                                                                         |
|  [Admin.jsx / StartHereGuide.jsx]                                                       |
|   |--> [WorkflowGuideModal.jsx] (Master Visual Guide Hub & Workspace Router)            |
|         |--> [FlightWorkflowDiagram.jsx]        <--> ConsignmentManager.jsx             |
|         |--> [CustodyWorkflowDiagram.jsx]       <--> BatchExpiryManagerModal.jsx / Hub  |
|         |--> [FefoWorkflowDiagram.jsx]          <--> BatchExpiryManagerModal.jsx        |
|         |--> [FulfillmentWorkflowDiagram.jsx]   <--> OmniOperationsHub.jsx              |
|         |--> [PasabuyWorkflowDiagram.jsx]       <--> PasabuyManager.jsx                 |
|                                                                                         |
|  [Security & Schema Truth Subsystem]                                                    |
|   |--> scripts/schema-truth-core.mjs (Fail-closed metadata auditor & credential filter) |
|   |--> tests/map017-authorization.spec.js (Authorization matrix & denial suites)        |
|   |--> tests/schema-truth-tool.spec.js (DDL recovery & CLI invariant contracts)         |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Component & Architecture Inventory

### A. Visual Workflow Guides (`src/components/admin/guides/`)

All diagrams are written as responsive, zero-dependency, self-contained inline SVG and React components. They render with dark luxury slate/wood tokens (`#0a0e17`, `#0d131f`, `#121927`, gold `#e5a93c`, sky `#38bdf8`, emerald `#10b981`, rose `#f43f5e`, cyan `#06b6d4`) matching K2 Admin BOS ergonomics.

| File Path | Operations Rulebook Ref | Key Purpose & Interactive Features |
| :--- | :--- | :--- |
| [`src/components/admin/guides/FlightWorkflowDiagram.jsx`](file:///c:/Users/jerze/K2%20JImzon/src/components/admin/guides/FlightWorkflowDiagram.jsx) | §7, §9 | 4-step international cargo flow: Milan Packing Scan $\rightarrow$ Transit $\rightarrow$ Manila Receiving Recount $\rightarrow$ Finalization. Interactive step selector, validation checklist, and discrepancy safeguards. |
| [`src/components/admin/guides/CustodyWorkflowDiagram.jsx`](file:///c:/Users/jerze/K2%20JImzon/src/components/admin/guides/CustodyWorkflowDiagram.jsx) | §10 | 4-step two-party handshake: Offer $\rightarrow$ In-Transit holding $\rightarrow$ Receiver count $\rightarrow$ Accept/Reject. Visually proves sender cannot unilaterally reassign custody. |
| [`src/components/admin/guides/FefoWorkflowDiagram.jsx`](file:///c:/Users/jerze/K2%20JImzon/src/components/admin/guides/FefoWorkflowDiagram.jsx) | §5, §15 | 3-tier aging spectrum: Prime Fresh ($>90$d), Clearance ($31$–$89$d), Emergency Quarantine ($0$–$30$d). Exposes FEFO priority rules and clear action requirements. |
| [`src/components/admin/guides/FulfillmentWorkflowDiagram.jsx`](file:///c:/Users/jerze/K2%20JImzon/src/components/admin/guides/FulfillmentWorkflowDiagram.jsx) | §12–14 | 4-step packing station pipeline: Order reservation $\rightarrow$ Order-first 1:1 unit scan $\rightarrow$ Waybill/QR generation $\rightarrow$ Courier handover. |
| [`src/components/admin/guides/PasabuyWorkflowDiagram.jsx`](file:///c:/Users/jerze/K2%20JImzon/src/components/admin/guides/PasabuyWorkflowDiagram.jsx) | §8, §17 | 5-step custom sourcing lifecycle: Inquiry intake $\rightarrow$ Landed cost calculation $\rightarrow$ Owner quote $\rightarrow$ Confirmation & deposit $\rightarrow$ Milan sourcing. |
| [`src/components/admin/guides/WorkflowGuideModal.jsx`](file:///c:/Users/jerze/K2%20JImzon/src/components/admin/guides/WorkflowGuideModal.jsx) | §1–24 | Master operations modal hosting all diagrams with instant tab switching, keyboard navigation (`Esc`), and direct workspace routing. |

### B. Admin BOS Screen Integrations

| View | Modification Details |
| :--- | :--- |
| [`src/views/admin/Admin.jsx`](file:///c:/Users/jerze/K2%20JImzon/src/views/admin/Admin.jsx) | Registered `WorkflowGuideModal`, added persistent `🗺️ Workflow Map` header button with contextual active-tab detection. |
| [`src/views/admin/StartHereGuide.jsx`](file:///c:/Users/jerze/K2%20JImzon/src/views/admin/StartHereGuide.jsx) | Added visual diagram header banner and direct `Diagram 🗺️` shortcut buttons per shift task. |
| [`src/views/admin/ConsignmentManager.jsx`](file:///c:/Users/jerze/K2%20JImzon/src/views/admin/ConsignmentManager.jsx) | Added collapsible receiving flow map toggle synchronized with active flight status. |
| [`src/views/admin/BatchExpiryManagerModal.jsx`](file:///c:/Users/jerze/K2%20JImzon/src/views/admin/BatchExpiryManagerModal.jsx) | Added header toggles for `⏳ FEFO Rules Map` and `🤝 Custody Flow`. |
| [`src/views/admin/OmniOperationsHub.jsx`](file:///c:/Users/jerze/K2%20JImzon/src/views/admin/OmniOperationsHub.jsx) | Added `🗺️ View Packing & Custody Workflow Map` toggle. |
| [`src/views/admin/PasabuyManager.jsx`](file:///c:/Users/jerze/K2%20JImzon/src/views/admin/PasabuyManager.jsx) | Added `🗺️ View Pasabuy Sourcing & Quoting Map` toggle. |

---

## 3. Security & Schema Truth Invariants (Option 1)

### A. Authorization & Policy Contracts (`tests/map017-authorization.spec.js`)

The authorization suite validates the following negative/denial invariants:
1. **Anon DML Revocation:** Direct DML (`insert`, `update`, `delete`) is revoked from `anon` across all catalog and operational tables (`brands`, `categories`, `warehouses`, `product_drafts`, `products_old`, `channel_credentials`, `staff_allocations`).
2. **No Blanket Public Write Policies:** Blanket policies (`"Admin Full Access"`, `"Anyone can upload"`) are dropped and replaced by server-enforced `is_staff()` and `is_admin()` checks.
3. **Operational Views (`security_invoker = true`):** Views `v_channel_catalog_readiness` and `v_expiring_batches` enforce `security_invoker = true` to eliminate RLS bypass vulnerability.
4. **Deprecated RPC Revocation:** Deprecated stock mutation functions (`decrement_stock`, `deduct_stock_fefo`, `mark_order_line_packed`, `replace_product_batches`, `add_consignment_item`, `record_consignment_scan`) are fully revoked from client roles.
5. **Storage Boundary Hardening:** Storage bucket write policies reject anonymous writes and enforce file size ($\le 10\text{MB}$) and image MIME allowlists (`image/jpeg`, `image/png`, `image/webp`, `image/avif`).
6. **Realtime Publication Scoping:** Sensitive/deprecated tables (`products_old`) are removed from `supabase_realtime`.
7. **Role Escalation & AAL2 Guards:** `set_user_role` requires `is_admin()`, AAL2 assurance, and enforces that the final Admin cannot be demoted.
8. **Search Path Hardening:** All security-definer functions enforce `set search_path = ''`.

### B. Schema-Truth Engine (`scripts/schema-truth-core.mjs` & `scripts/schema-truth-audit.mjs`)

- Operates purely on structural metadata (tables, views, policies, functions, publications).
- Automatically sanitizes connection strings, tokens, and credentials.
- Compares live or fixture exports against expected repository truth.
- Rehearsal runner (`scripts/rehearse-local-migration.mjs`) strictly rejects remote or production database targets to prevent unintended execution.

---

## 4. Troubleshooting & Diagnostic Runbook ("What is wrong if X fails")

### Symptom 1: `npm run test:contracts` fails
* **Potential Cause:** Migration syntax changed or a mock was altered in `tests/map017-authorization.spec.js` or `tests/edge-function-invite-staff.spec.js`.
* **Diagnostic Command:** `npx playwright test tests/map017-authorization.spec.js --reporter=list`
* **Resolution:** Check if a policy name or RPC signature in `supabase/migrations/` was modified without updating the invariant specification.

### Symptom 2: `npm run test:schema-truth-fixture` reports DRIFT / NON-CONFORMANT
* **Potential Cause:** An expected table, policy, view invoker flag, or grant was added or removed from `scripts/schema-truth-core.mjs` without updating the baseline schema truth.
* **Diagnostic Command:** `node scripts/schema-truth-audit.mjs --fixture=fabricated-clean-sample --verbose`
* **Resolution:** Inspect the findings diff. If the schema change is authorized, update `buildExpectedRepositorySchema()` in `scripts/schema-truth-core.mjs` to reflect the new canonical schema.

### Symptom 3: Build boundary validation fails (`verify-build-boundary.mjs`)
* **Potential Cause:** Admin-only code (e.g. `Admin.jsx`, BFF client, internal icons) leaked into the storefront bundle, or storefront code was imported into the admin bundle.
* **Diagnostic Command:** `npm run build:storefront` or `npm run build:admin`
* **Resolution:** Check imports in `src/App.jsx` and ensure dynamic `lazy()` imports are maintained. Never import admin services from storefront view components.

### Symptom 4: Secret scan flags a finding (`npm run security:secrets`)
* **Potential Cause:** A service-role key, database password, or private token was pasted in client code, markdown, or `.env` files.
* **Diagnostic Command:** `node scripts/scan-secrets.mjs`
* **Resolution:** Immediately remove the secret. Verify `.env.example` contains only placeholder values. Follow `SECURITY_INCIDENT_AND_KEY_ROTATION_RUNBOOK.md` if a real credential was exposed.

### Symptom 5: Workflow diagram does not render or breaks layout on mobile (<640px)
* **Potential Cause:** Hardcoded pixel widths in container `<div>` elements rather than `viewBox` SVGs or grid layouts.
* **Diagnostic:** Open DevTools, emulate iPhone 12/SE (375px width), and verify the diagram falls back to the mobile pill selector and vertical detail card.
* **Resolution:** Ensure `FlightWorkflowDiagram.jsx` / `CustodyWorkflowDiagram.jsx` retain the `.hidden.md:block` for the horizontal SVG track and `.grid.md:hidden` for mobile buttons.

---

## 5. Verification Checklist & Command Reference

Run the complete test and build pipeline with this single verification sequence:

```powershell
npm run check:imports; npm run test:contracts; npm run test:schema-truth-fixture; npm run build:admin; npm run build:storefront; npm run security:secrets; npm run security:history; npm run security:test
```

### Verified Benchmark Output (15 August 2026)

| Command | Expected Output | Status |
| :--- | :--- | :--- |
| `npm run check:imports` | `All imports resolved successfully` | PASS |
| `npm run test:contracts` | `69 passed (Playwright)` | PASS |
| `npm run test:schema-truth-fixture` | `Overall Status: CONFORMANT (0 findings)` | PASS |
| `npm run build:admin` | `Verified admin production boundary` | PASS |
| `npm run build:storefront` | `Verified storefront production boundary` | PASS |
| `npm run security:secrets` | `Secret scan passed (756 files checked)` | PASS |
| `npm run security:history` | `Git history secret scan passed` | PASS |
| `npm run security:test` | `Secret scanner tests passed` | PASS |
