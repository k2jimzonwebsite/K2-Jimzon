# K2 Jimzon Documentation Index

Welcome to the central documentation library for the **K2 Jimzon** platform. This directory is the authoritative reference for engineers, product owners, and AI coding agents.

---

## 🧭 Core Documentation Map

| Document | Purpose | Target Audience |
| :--- | :--- | :--- |
| [**PROJECT_OVERVIEW.md**](./PROJECT_OVERVIEW.md) | Business domain, direct Italian import model, FEFO inventory, and dual-surface structure. | Everyone |
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | System architecture: Storefront, Admin BOS, BFF Serverless functions, Supabase PostgreSQL, Edge Functions. | Engineers & Architects |
| [**PROJECT_MAP.md**](./PROJECT_MAP.md) | Comprehensive folder directory map, component boundaries, and placement rules. | Developers & AI Agents |
| [**FEATURES.md**](./FEATURES.md) | Complete catalog of features with status badges (`STABLE`, `ACTIVE DEVELOPMENT`, `PROTOTYPE`, `PLANNED`). | Product & Engineering |
| [**DATA_MODEL.md**](./DATA_MODEL.md) | Authoritative database entities, derived stock formulas, schema boundaries, and invariants. | Backend Engineers |
| [**ROUTES.md**](./ROUTES.md) | Complete index of 12 Storefront view states, 81 Admin BFF routes, and 14 Storefront BFF routes. | Full-Stack Engineers |
| [**INTEGRATIONS.md**](./INTEGRATIONS.md) | External services: Supabase, Vercel, Shopee/Lazada/TikTok connectors, Cloudflare Turnstile, OpenAI. | Integrations & DevOps |
| [**DEVELOPMENT.md**](./DEVELOPMENT.md) | Local development setup, dual Vite dev servers, PostgreSQL 17 rehearsals, and testing suites. | Engineers |
| [**DEPLOYMENT.md**](./DEPLOYMENT.md) | Isolated target builds (`storefront` vs `admin`), Vercel environment contracts, and boundary validation. | DevOps & Release |
| [**SECURITY.md**](./SECURITY.md) | Security model: RLS, RBAC, HMAC rate limits, session encryption, AAL2 MFA, and secret policies. | Security Engineers |
| [**DESIGN_SYSTEM.md**](./DESIGN_SYSTEM.md) | Luxury Wood Storefront vs High-Density Admin BOS design systems, typography, color tokens, and motion. | Designers & UI Engineers |
| [**DECISIONS.md**](./DECISIONS.md) | Architectural Decision Records (ADRs) capturing key architectural rationale and constraints. | Everyone |
| [**KNOWN_ISSUES.md**](./KNOWN_ISSUES.md) | Technical debt tracking, pending owner business decisions (`OWNER-001` through `OWNER-006`), and future migrations. | Engineering Leads |

---

## 📖 Operational Runbooks (`docs/runbooks/`)

Standard Operating Procedures (SOPs) and technical runbooks:

- [**ADMIN_BFF_SECURITY_RUNBOOK.md**](./runbooks/ADMIN_BFF_SECURITY_RUNBOOK.md) — Admin Backend-For-Frontend security controls and route policies.
- [**GUEST_COMMERCE_BFF_RUNBOOK.md**](./runbooks/GUEST_COMMERCE_BFF_RUNBOOK.md) — Guest checkout, scoped grant cookies, and universal messaging.
- [**PRODUCT_INTAKE_RUNBOOK.md**](./runbooks/PRODUCT_INTAKE_RUNBOOK.md) — Phone-first SKU generation, photo evidence capture, and first-inventory gate.
- [**STAFF_PRODUCT_DELETION_SOP.md**](./runbooks/STAFF_PRODUCT_DELETION_SOP.md) — Four-digit Delete PIN prerequisite, eligible-product deletion, lockout recovery, and BFF cutover behavior.
- [**CATALOG_SPREADSHEET_RUNBOOK.md**](./runbooks/CATALOG_SPREADSHEET_RUNBOOK.md) — Multi-variant spreadsheet export, staging, and atomic commit.
- [**DATABASE_BACKUP_AND_RESTORE_RUNBOOK.md**](./runbooks/DATABASE_BACKUP_AND_RESTORE_RUNBOOK.md) — Encrypted dump creation and loopback restoration rehearsal.
- [**CUSTOMER_DATA_RETENTION_AND_DELETION_RUNBOOK.md**](./runbooks/CUSTOMER_DATA_RETENTION_AND_DELETION_RUNBOOK.md) — Data lifecycle, retention policies, and GDPR/DPA deletion gates.
- [**PROVIDER_LIMITS_AND_CAPACITY_RUNBOOK.md**](./runbooks/PROVIDER_LIMITS_AND_CAPACITY_RUNBOOK.md) — Platform quotas, Vercel function limits, and Supabase connection ceilings.
- [**SECURITY_INCIDENT_AND_KEY_ROTATION_RUNBOOK.md**](./runbooks/SECURITY_INCIDENT_AND_KEY_ROTATION_RUNBOOK.md) — Incident response, token compromise recovery, and credential rotation.
- [**DEPLOYMENT_RUNBOOK.md**](./runbooks/DEPLOYMENT_RUNBOOK.md) — Step-by-step production promotion checklist.

---

## 🔬 Evidence & Audits (`docs/evidence/`)

Verification logs, rollback validations, and schema audits for MAP work items:
- MAP-016 through MAP-020 verification reports, schema audits, and rollback proofs.

---

## 📐 Specs & Blueprints (`docs/specs/`)

Technical specifications, connector integration blueprints, and operations audits:
- [**MASTER_WORKFLOW_GRAPH_SPEC.md**](./specs/MASTER_WORKFLOW_GRAPH_SPEC.md) — Visual workflow engine, SVG connector mathematics, shift checklists, and AI Prompt Studio.
- Admin BOS blueprint, authorization matrix, connector integration specs, and AI studio configurations.

---

## 🏛️ Authoritative Governance Files

The core project truth is governed by:
1. `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md` — Target operational rules, non-negotiable invariants, and logistics workflows.
2. `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md` — Current verified production state, verified schema truth, and active security baselines.
3. `MASTER_ACTION_PLAN.md` — The **single active project backlog** (currently through MAP-028). Do not create competing TODO lists.
4. `K2 Jimzon - Brain/OWNER_QUESTIONS.md` — Business decisions requiring explicit owner authorization.
