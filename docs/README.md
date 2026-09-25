# K2 Jimzon Documentation Compilation

One index for every doc, folder, and file collection in this repository. If a document is not listed here, treat it as unindexed history until it is added.

## Authority order (rulebook section 1)

1. `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md` — required target behavior.
2. `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md` — verified current behavior.
3. `MASTER_ACTION_PLAN.md` — the only active backlog (MAP-017 through MAP-028).
4. `K2 Jimzon - Brain/ADMIN_OPERATIONS_AUDIT.md` — verified gaps (if present).
5. `K2 Jimzon - Brain/FUTURE_IDEAS.md` — proposals, not live behavior.
6. `K2 Jimzon - Brain/OWNER_QUESTIONS.md` — unresolved owner decisions only.

When documents conflict, the rulebook defines the target and the System Brain defines what is live. Never describe a target as live without schema, code, permission, and test evidence.

## Live reference docs (`docs/` root)

| Document | What it is |
| :--- | :--- |
| `PROJECT_MAP.md` | Folder layout, component boundaries, placement rules. |
| `ARCHITECTURE.md` | Storefront/Admin separation, BFF routers, database schemas. |
| `PROJECT_OVERVIEW.md` | Business domain and dual-surface structure. |
| `FEATURES.md` | Feature catalog with status badges. Verify status against the System Brain. |
| `DATA_MODEL.md` | Database entities, derived stock formulas, invariants. |
| `ROUTES.md` | Storefront views and BFF route inventory. Verify counts against `tests/security-surface-inventory.spec.js`. |
| `INTEGRATIONS.md` | External services and connector boundaries. |
| `DEVELOPMENT.md` | Local setup, rehearsals, test suites. |
| `DEPLOYMENT.md` | Target builds and Vercel contracts. Promotion evidence lives in `runbooks/DEPLOYMENT_RUNBOOK.md`. |
| `SECURITY.md` | Security model and secret policies. |
| `DESIGN_SYSTEM.md` | Storefront vs Admin design systems. |
| `DECISIONS.md` | Architectural Decision Records. |
| `KNOWN_ISSUES.md` | Debt and pending decisions. Verify against the active MAP. |
| `OWNER_ACTION_HANDOFF.md` | Owner-side action handoffs. |
| `PRELAUNCH_INDEXING.md` | Prelaunch indexing notes. Product indexing stays gated per MAP-024. |
| `JNT_PUBLIC_RATE_INVESTIGATION.md`, `JNT_VIP_SAFE_AUTOMATION_INVESTIGATION.md` | Delivery-rate investigations behind the MAP-023 rate matrix. |

## Historical snapshots (read-only, do not execute)

- `AUDIT_FINDINGS.md` — August findings register (AUD-001 and others). Statuses may be superseded.
- `AUDIT_ACTION_PLAN.md` — August action checklist. Superseded by the active MAP.
- `PROJECT_AUDIT.md` — 25 August full-project audit. Provenance only.
- `audits/MASTER_PROJECT_AUDIT.md` — consolidated audit record. Provenance only.
- `K2 Jimzon - Brain/MASTER_ACTION_PLAN_HISTORY_2026-09-24.md` — superseded backlog snapshot. Not an active queue.

## Runbooks (`docs/runbooks/`, all 15)

- `ADMIN_BFF_SECURITY_RUNBOOK.md`, `GUEST_COMMERCE_BFF_RUNBOOK.md` — BFF boundaries and cutover order.
- `PRODUCT_INTAKE_RUNBOOK.md` — canonical single-logic intake: phone-scan session, server-assigned SKU, evidence, Draft, first inventory.
- `CATALOG_SPREADSHEET_RUNBOOK.md`, `STAFF_PRODUCT_DELETION_SOP.md`, `ADMIN_DASHBOARD_RUNBOOK.md` — staff procedures.
- `PAYMENT_EVIDENCE_AND_INSTRUCTIONS_RUNBOOK.md` — manual payment evidence and independent verification.
- `MARKETPLACE_SNAPSHOT_STAGING_RUNBOOK.md`, `SUPABASE_MIGRATION_AND_DEPLOYMENT_HANDOFF.md` — staging and migration handoffs.
- `DATABASE_BACKUP_AND_RESTORE_RUNBOOK.md`, `CUSTOMER_DATA_RETENTION_AND_DELETION_RUNBOOK.md` — data lifecycle.
- `PROVIDER_LIMITS_AND_CAPACITY_RUNBOOK.md`, `SECURITY_INCIDENT_AND_KEY_ROTATION_RUNBOOK.md` — limits and incidents.
- `DEPLOYMENT_RUNBOOK.md` — production promotion checklist and receipts.
- `MASTER_PROJECT_AUDIT.md` — consolidated audit record (provenance, see Historical snapshots).

## Specs (`docs/specs/`)

Live procedure: `PRODUCT_INTAKE_RUNBOOK.md` (above) plus `ADMIN_ASSISTANCE_AND_SHORTCUTS.md` (carries the 2026-09-25 single-logic intake note). Supporting prompt contracts: `CHATGPT_PRODUCT_INTELLIGENCE_PROJECT.md`, `CHATGPT_PRODUCT_JSON_PROJECT.md`, `CHATGPT_PRODUCT_IMAGE_PROJECT.md`. Design: `design/BARCODE_ASSISTED_PRODUCT_LISTING.md`. Remaining specs are integration blueprints and historical workflow plans; check each file's header before treating it as current.

## Evidence (`docs/evidence/`)

Dated MAP evidence folders (`20260906-*` through `20260925-*`). Two root papers stay in place because they are referenced: `MAP_017_EXHAUSTIVE_AUTHORIZATION_AUDIT_2026-08-22.md` (pinned by `tests/schema-truth-tool.spec.js:388`) and `20260909-map017-followup.md` (cited by the Brain, owner record, and runbook). Everything else old and unreferenced moves to `_archive-2026-09-25/` (see its README for the restore command).

## Recovery checkpoints (`docs/design-checkpoints/`)

Pre-edit file snapshots paired with evidence folders. They exist so a slice can be reverted file-by-file. Do not edit them and do not import from them.

## Single-logic intake (IDEA-20260925-01)

Canonical intake is the phone-scan `ProductIntakeSessionModal.jsx` with server-assigned SKU. Scan-to-AI output, Smart Paste review, and automatic/manual content are steps inside that flow, not competing entries. Docs cleanup is IDEA-20260925-01 slice work on a feature branch; the source reroute is a later code slice behind MAP-018.
