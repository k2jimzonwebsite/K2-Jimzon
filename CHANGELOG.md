# K2 Jimzon — Changelog

All notable changes, milestones, and architectural improvements across the K2 Jimzon platform are documented in this file.

---

## [Unreleased] — 2026-08-25

### 🧹 Repository Cleanup & Documentation System Rebuild
- **Repository Hygiene**: Purged all orphaned `.fuse_hidden*` files, root debug scripts (`temp.txt`, `pd_hist.txt`, `test.cjs`, `simulate_pasabuy.js`, etc.), and legacy data directories.
- **Unified Documentation Hub**: Built the comprehensive `/docs/` documentation system:
  - `docs/PROJECT_OVERVIEW.md` — Complete business and operational model.
  - `docs/ARCHITECTURE.md` — Dual-surface, BFF, and Supabase architecture.
  - `docs/PROJECT_MAP.md` — Detailed folder responsibilities and boundaries.
  - `docs/FEATURES.md` — Complete feature catalog with implementation status.
  - `docs/DATA_MODEL.md` — Authoritative data models, ERD, and derived stock formulas.
  - `docs/ROUTES.md` — Index of 11 views and 81 BFF API routes.
  - `docs/INTEGRATIONS.md` — External services, connectors, and environment contracts.
  - `docs/DEVELOPMENT.md` — Local setup, dev servers, and test commands.
  - `docs/DEPLOYMENT.md` — Separate production build and Vercel pipeline guide.
  - `docs/SECURITY.md` — Comprehensive security, RLS, and encryption model.
  - `docs/DESIGN_SYSTEM.md` — Luxury Wood and High-Density Admin visual tokens.
  - `docs/DECISIONS.md` — Architectural Decision Records (ADRs 001 to 007).
  - `docs/KNOWN_ISSUES.md` — Technical debt and open owner decisions.
- **Root Entrypoint Rebuild**: Modernized `README.md` and updated `AGENTS.md` for AI coding agents.

### 🛡️ Test Harness & Verification Improvements
- **Idempotent Postgres Rehearsal**: Fixed role bootstrap idempotency in `supabase/tests/map019_staff_invitation_reason_bootstrap.sql`.
- **Windows Pipe-Hang Fix**: Resolved `spawnSync` option forwarding in `scripts/rehearse-map019-account-claim.mjs`, reducing full 10-migration rehearsal time to 8 seconds.
- **Contract Test Suite**: 179/179 contracts passing across Storefront, Admin BFF, Product Intake, Schema Truth, Security Headers, and Shopee Ingress.
- **Dual Production Builds**: 100% boundary isolation verified for `npm run build:storefront` and `npm run build:admin`.

---

## [0.1.0] — 2026-08-24

### Added
- **Portable PostgreSQL 17 Rehearsal Harness**: Pinned loopback testing against isolated PostgreSQL 17.11 instances for MAP-017, MAP-018, MAP-019, and MAP-020.
- **Admin BFF Router**: Consolidated 68 operational endpoints into single serverless router with CSRF, origin checks, and HMAC rate limits.
- **Storefront BFF Router**: Consolidated 13 guest and customer endpoints with scoped HttpOnly guest grants.
- **Phone-First Product Intake**: Mobile camera evidence upload, AI prompt assistance, and server-side SKU generation.
- **Interactive 3D Globe**: Three.js interactive visualizer showing Milan-to-Manila cargo routes.
