# K2 Jimzon — Direct Italian Goods & Operations Platform

> **Specialized direct Italian import, curated retail, customer Pasabuy, wholesale, and multi-channel operations platform.**

---

## 🌟 Overview

**K2 Jimzon** connects authentic European luxury, beauty, personal care, gourmet food, and lifestyle goods directly from Milan to consumers, collectors, and wholesale partners in the Philippines.

The platform coordinates **five core income channels**:
1. **Website**: Curated luxury wood storefront retail with batch-stock transparency.
2. **Shopee**: Integrated marketplace channel with bounded webhook ingress.
3. **TikTok Shop**: Live selling and social commerce synchronization.
4. **Lazada**: Secondary marketplace retail channel.
5. **Pasabuy**: Custom on-demand Italian product sourcing and quoting wizard.

---

## 🏛️ System Architecture

K2 Jimzon is built as a **monorepo with two isolated production faces**:

- **Customer Storefront** (`npm run build:storefront`): A luxury wood editorial experience featuring 3D Globe cargo visualizers, guest-first passwordless ordering, and scoped order messaging.
- **Staff Admin BOS** (`npm run build:admin`): A high-density Business Operating System for barcode scanning (Milan packing & Manila receiving), FEFO shelf-life inventory gating, and staff RBAC with AAL2 MFA.
- **Backend-For-Frontend (BFF)**: Consolidated serverless API routers (`/api/storefront` and `/api/admin`) backed by PostgreSQL 17 on Supabase with Row Level Security (RLS).

---

## 🚀 Quick Start

### 1. Install & Setup
```bash
# Install dependencies
npm install

# Setup local environment
cp .env.example .env.local

# Run prebuild security verification
npm run prebuild
```

### 2. Development Servers
```bash
# Run Customer Storefront (Port 5173)
npm run dev:storefront

# Run Staff Admin BOS (Port 5174)
npm run dev:admin

# Run Combined Workstation
npm run dev
```

### 3. Testing & Verification
```bash
# Run 179 API & security contract tests
npm run test:contracts

# Run portable PostgreSQL 17 rehearsals
npm run verify:map017-portable
npm run rehearse:map019-account-claim

# Run Playwright UI suites
npm run test:smoke
npm run test:admin-ui
npm run test:customer-account-ui

# Verify isolated production builds
npm run build:storefront
npm run build:admin
```

---

## 📚 Documentation Library

Complete documentation lives in the [`/docs/`](./docs/README.md) directory:

- [**Project Overview**](./docs/PROJECT_OVERVIEW.md) — Business model, cargo manifests, and FEFO inventory rules.
- [**System Architecture**](./docs/ARCHITECTURE.md) — Dual-surface design, Serverless BFF routers, and database schemas.
- [**Project Directory Map**](./docs/PROJECT_MAP.md) — Comprehensive guide to folder responsibilities and structure.
- [**Feature Catalog**](./docs/FEATURES.md) — Complete status of all storefront and admin features.
- [**Data Model**](./docs/DATA_MODEL.md) — Database schema, relationships, and derived stock formulas.
- [**Routes & APIs**](./docs/ROUTES.md) — Map of all 11 storefront views and 81 BFF endpoints.
- [**Integrations & Connectors**](./docs/INTEGRATIONS.md) — Supabase, Vercel, Shopee, Turnstile, and OpenAI prompts.
- [**Development Guide**](./docs/DEVELOPMENT.md) — Testing commands, prebuild gates, and local PostgreSQL rehearsals.
- [**Deployment Pipeline**](./docs/DEPLOYMENT.md) — Target-separated production deployment guide for Vercel.
- [**Security Model**](./docs/SECURITY.md) — RLS policies, RBAC roles, HMAC rate limiting, and session encryption.
- [**Design System**](./docs/DESIGN_SYSTEM.md) — Luxury Wood Storefront vs High-Density Admin BOS tokens.
- [**Decision Log (ADRs)**](./docs/DECISIONS.md) — Architectural Decision Records 001 through 007.
- [**Known Issues & Owner Gates**](./docs/KNOWN_ISSUES.md) — Active technical debt and open owner decisions.

---

## ⏳ Deferred Dependencies & Gated Work

The following items are deferred pending owner business decisions in `K2 Jimzon - Brain/OWNER_QUESTIONS.md`:
- **Online payment gateway**: Direct credit card / e-wallet processing (currently uses verified manual bank/QR payment verification).
- **Custom storefront/admin domains**: Hostinger DNS and Vercel custom-domain
  routing for `k2jimzon.com`, `www.k2jimzon.com`, and `admin.k2jimzon.com` are
  applied; Supabase Auth allowlists, crawler assets, and real-host acceptance
  remain open under MAP-024 (`OWNER-001`).
- **Production database hardening migration**: Prepared and rehearsed locally (`verify:map017-portable`), awaiting authorization under `OWNER-005`.

---

## 🛡️ Governance & Rules of Operation

- All project development is governed by [`MASTER_ACTION_PLAN.md`](./MASTER_ACTION_PLAN.md), the **single active backlog**.
- AI coding agents must read and adhere to [`AGENTS.md`](./AGENTS.md) before making code or architecture modifications.
- Operational invariants and logistics workflows are defined in [`K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md`](./K2%20Jimzon%20-%20Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md).
