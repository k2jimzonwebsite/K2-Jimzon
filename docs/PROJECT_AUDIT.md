# K2 Jimzon — Full Project & Production Website Audit

> **Historical snapshot dated 25 August 2026.** It is not current system truth
> and does not authorize work. Preserve it for provenance; use
> `MASTER_ACTION_PLAN.md` as the only active backlog and the System Brain for
> verified current state.

**Audit Date:** 25 August 2026  
**Auditor:** Antigravity (Advanced Agentic Architecture & Security Specialist)  
**Methodology:** Full Codebase Inspection, Static Analysis, Portable PostgreSQL 17 Lifecycles, 179 Automated Contract Tests, Playwright UI Verification, Security Boundary Verification, and Live Vercel Production Inspection.

---

## 1. Executive Summary

### Overall Project Condition
K2 Jimzon is an exceptionally well-engineered, disciplined monorepo serving a specialized Italian cargo import and Pasabuy operation. The codebase displays world-class architectural rigor in its separation of concerns, defense-in-depth principles, audit logging, and supply chain invariants (FEFO batch tracking, one-scan-per-unit verification, independent Manila arrival reconciliation).

### Strongest Areas
1. **Security & Cryptographic Discipline:** Zero hardcoded secrets across 912 tracked files and entire Git history. Strict segregation between browser-safe publishable identifiers and backend secrets. Multi-factor authentication (AAL2 TOTP step-up) and salt-hashed Delete PINs stored in private schemas (`k2_private`).
2. **Supply Chain & Inventory Truth:** Strict invariants separating physical counts from reservations. Real FEFO shelf-life calculations (90-day ordinary sale gate, 31–89 day clearance approvals, 0–30 day sellable block). Milan packing scans and Manila receiving scans operate as independent verification events.
3. **Multi-Target Build Separation:** Vite-configured aliases and modes ensure that the Storefront artifact contains zero Admin code, zero staff management routes, and zero server secrets, while the Admin BOS artifact compiles with high-density operational tooling.
4. **Verification & Rehearsal Tooling:** 179 passing contract tests, portable PostgreSQL 17 lifecycle rehearsals, and automated prebuild security surface auditors prevent configuration drift and regression.

### Weakest Areas
1. **Live Schema Anonymous Write Gap (Pending `OWNER-005`):** While anonymous READ access is contained, the live Supabase database still holds blanket `ALL USING(true)` write policies on `brands`, `categories`, `warehouses`, `product_drafts`, `products_old`, and null upload limits on the `product-images` storage bucket. (The exact hardening migration `20260812_map017_public_write_boundary_hardening.sql` is prepared, postflight-validated, and rollback-tested, awaiting owner authorization).
2. **Live Storefront Batch Stock View 401 Fallback:** The live `v_product_stock_from_batches` view lacks an anonymous SELECT grant on production, causing the live storefront to log HTTP 401 and fall back to the legacy `products.stock_available` column.
3. **Storefront View-State Routing (No Deep Linking):** The storefront uses React in-memory state navigation rather than URL pathname synchronization (`/catalog`, `/product/:sku`, `/checkout`), preventing direct browser refreshes and native URL sharing.
4. **Inactive BFF Ingress on Production:** The 68 Admin BFF endpoints and 13 Storefront BFF endpoints are implemented and fully tested, but currently remain inactive behind feature flags (`K2_ADMIN_BFF_ENABLED=false`, `K2_STOREFRONT_BFF_ENABLED=false`). Production operates in transitional direct-client mode.

### Biggest Risks
- Applying `20260822_catalog_spreadsheet_commit.sql` prematurely before Admin BFF cutover will break staff product writes.
- Live database blanket write policies expose catalog tables to tampering until `OWNER-005` is authorized and applied.

### Recommended Immediate Focus
1. Obtain `OWNER-005` authorization and apply `20260812_map017_public_write_boundary_hardening.sql` to lock down public writes and restore batch stock view grants.
2. Maintain the single active backlog in `MASTER_ACTION_PLAN.md` (MAP-017 through MAP-025).
3. Activate the same-origin Storefront and Admin BFF routers on Vercel.

---

## 2. System Overview

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                       CLIENT LAYER                                       │
├────────────────────────────────────────────┬─────────────────────────────────────────────┤
│            STOREFRONT CLIENT               │                 ADMIN BOS CLIENT            │
│  (React 19 / Tailwind / Three.js / Globe)  │     (React 19 / Tailwind / HTML5 Barcode)   │
└─────────────────────┬──────────────────────┴──────────────────────┬──────────────────────┘
                      │                                             │
                      ▼                                             ▼
┌────────────────────────────────────────────┬─────────────────────────────────────────────┐
│           STOREFRONT BFF ROUTER            │               ADMIN BFF ROUTER              │
│       (api/storefront/index.js)            │           (api/admin/index.js)              │
├────────────────────────────────────────────┼─────────────────────────────────────────────┤
│  • 13 Scoped Commerce Endpoints            │  • 68 Operational Command Endpoints         │
│  • Guest Grant Token Encryptor             │  • Cookie Session Registry (AES-256-GCM)    │
│  • Domain-Separated Pre-Auth Rate Limiting │  • Mandatory AAL2 Step-Up Multi-Factor Auth │
│  • Cloudflare Turnstile Bot Defense        │  • Idempotency & SHA-256 Payload Hash Gate  │
│  • Strict Origin & Method Enforcement      │  • Security Definer RPC Invocation          │
└─────────────────────┬──────────────────────┴──────────────────────┬──────────────────────┘
                      │                                             │
                      └──────────────────────┬──────────────────────┘
                                             │
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE POSTGRESQL & EDGE RUNTIME                          │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  • Public Schema: 42 RLS Tables, 9 Security-Invoker Views, 53 Hardened RPC Functions     │
│  • k2_private Schema: Session Registry, Rate Limit Buckets, Audit Ledgers, Nonces        │
│  • Storage Buckets: private 'intake-evidence' vs public 'product-media'                  │
│  • Edge Functions: 'invite-staff' (AAL2-enforced), 'shopee-webhook' (Bounded Ingress)    │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

The system operates as **one codebase with two distinct faces**:
1. **Storefront**: Mobile-first customer experience with Luxury Wood canvas (`public/wood-bg.jpg`), interactive 3D Globe, editorial product stories, guest-first order requests, custom Pasabuy requests, passwordless customer accounts, and scoped conversation messaging.
2. **Admin BOS (Business Operating System)**: High-density dark workstation (`#161922`) for Milan packing scans, Manila receiving reconciliation, lot-level batch tracking, FEFO fulfillment, custody transfers, owner-governed Pasabuy quoting, coupon scheduling, and staff role management.

---

## 3. Audit Coverage

| Domain | Scope Inspected & Tested | Tools & Evidence Used |
| :--- | :--- | :--- |
| **Codebase & Architecture** | 142 source files, 29 BFF controllers, 44 Admin views, 11 Storefront views | AST static analysis, import integrity checks |
| **Build & Bundles** | Separate Storefront and Admin Vite production builds | `npm run build:storefront`, `npm run build:admin`, bundle secret scanner |
| **Database & Schema** | 87 tables, 12 views, 151 functions, 5 ledger records, RLS policies | `supabase/export-schema-metadata.sql`, portable PostgreSQL 17.11 loopback rehearsals |
| **Security & Secrets** | 912 tracked files, Git commit history, environment variables | `scripts/scan-secrets.mjs`, `scripts/scan-git-history-secrets.mjs`, sensitive file verifiers |
| **API & BFF Contracts** | 68 Admin routes, 13 Storefront routes, 2 Edge Functions | 179 Playwright API contract tests (`tests/*.spec.js`) |
| **UI & User Flows** | Desktop and mobile viewports (375px, 414px, 768px, 1280px) | Playwright E2E smoke tests (`tests/smoke.spec.js`, `tests/customer-account-ui.spec.js`) |
| **Live Production Site** | `https://k2-jimzon-admin-seven.vercel.app/` | Live HTTP request inspection, OAuth PKCE flow validation, public key verification |

---

## 4. Critical Findings (P0 / P1)

### [P0] AUD-001: Live Database Public Write Exposure on Catalog & Legacy Tables
- **Status:** CONFIRMED (Awaiting `OWNER-005` authorization)
- **Impact:** Anonymous role currently holds DML permissions with blanket `USING (true)` policies on `brands`, `categories`, `warehouses`, `product_drafts`, and `products_old`. Storage bucket `product-images` has null size/MIME limits.
- **Remediation:** Apply prepared and postflight-validated migration `20260812_map017_public_write_boundary_hardening.sql`.

### [P1] AUD-002: Live Storefront Stock View 401 Fallback
- **Status:** CONFIRMED
- **Impact:** Live anonymous callers receive HTTP 401 on `v_product_stock_from_batches` due to missing public SELECT grant, causing the storefront to fall back to `products.stock_available`.
- **Remediation:** Grant SELECT on the hardened stock wrapper in MAP-017 migration.

### [P1] AUD-006: Inactive Production BFF Gateways
- **Status:** CONFIRMED
- **Impact:** BFF entrypoints are doubly disabled on Vercel (`K2_ADMIN_BFF_ENABLED=false`, `K2_STOREFRONT_BFF_ENABLED=false`), leaving production in transitional direct-client mode.
- **Remediation:** Complete MAP-018/019/020 prerequisite verification and activate server environment flags.

### [P1] AUD-007: Migration Cutover Hazard in `20260822_catalog_spreadsheet_commit.sql`
- **Status:** CONFIRMED (Documented Hold)
- **Impact:** Line 398 revokes direct writes to `public.products` from authenticated users. Applying this migration before Admin BFF cutover will break staff product operations.
- **Remediation:** Hold migration until Admin BFF is deployed and active.

### [P1] AUD-013: Production Custom Domain Assignment (`OWNER-001`)
- **Status:** CONFIRMED
- **Impact:** Production currently runs on Vercel preview domain `k2-jimzon-admin-seven.vercel.app`.
- **Remediation:** Finalize custom domain DNS records and update Supabase Auth redirect allowlist.

---

## 5. Architecture Findings

1. **Clean Separation of Production Artifacts:** `vite.config.js` with `verify-build-boundary.mjs` prevents cross-contamination between Admin BOS and customer Storefront.
2. **Consolidated Serverless Handlers:** `api/admin/index.js` (68 routes) and `api/storefront/index.js` (13 routes) prevent Vercel Serverless Function count limits while maintaining 10-second maximum execution ceilings.
3. **Strict Method & Header Whitelisting:** All BFF endpoints strictly enforce HTTP methods, returning `405 Method Not Allowed` with exact `Allow` headers on mismatch.
4. **Idempotency Architecture:** Mutating POST operations enforce UUID `Idempotency-Key` headers to guarantee exactly-once processing for lots, consignments, and order requests.

---

## 6. Functional Findings

| System | Classification | Operational Notes |
| :--- | :--- | :--- |
| **Milan Packing Scanner** | PASS | Barcode/QR scan increments expected manifest line by 1; enforces box sealing invariants. |
| **Manila Receiving Reconciliation** | PASS | Independent physical recount; flags short, over, damaged, unlisted; creates lots idempotently. |
| **FEFO Batch Management** | PASS | Lot-level expiry tracking; 90/30 day shelf-life gate enforced; clearance approvals audited. |
| **One-Scan Fulfillment Packing** | PASS | Order-first scanning; 5 units require 5 scans; prevents cross-order unit mixing. |
| **Pasabuy Quoting Engine** | PASS | Manual owner price decision model; component cost calculation; immutable quote versions. |
| **Staff Role Management** | PASS | Admin / Staff RBAC; AAL2 MFA enforcement; Delete PIN salt-hash validation with lockout. |
| **Coupons & Promotions** | PASS | Database-backed validation; single-code verification; confirmation-time redemption. |
| **Channel Status Board** | PASS | Honest status from `channel_connections`; no fabricated "Live" badges. |
| **Passwordless Customer Accounts** | PASS | SMS OTP and email magic link verification via BFF; scoped grant tokens in HttpOnly cookies. |
| **Wholesale Intake** | PASS | Structured B2B inquiry intake; creates explicit server receipts without commercial authority. |

---

## 7. Data Findings

1. **Source of Truth Mapping:**
   - Product master: `public.products`
   - Batch lots & Expiry: `public.product_batches`
   - Flight manifests: `public.consignment_manifests`, `public.consignment_boxes`, `public.consignment_lines`
   - Orders & Pasabuy: `public.order_requests`, `public.orders`, `public.pasabuy_requests`
   - Conversation history: `public.conversations`, `public.messages`
   - Platform infrastructure: `k2_private.admin_sessions`, `k2_private.rate_limit_buckets`, `k2_private.security_events`
2. **Schema Invariant:** `available = on_hand - reserved - in_transfer - damaged - expired - quarantined - unaccounted`. Available count is always derived, never typed.
3. **Migration Ledger State:** 60 local migration files vs 5 remote ledger records. Schema verification uses direct structural comparison (`scripts/schema-truth-core.mjs`) rather than blind `supabase db push`.

---

## 8. Security Findings

1. **Zero Secret Exposure:** Verified clean across 912 repository files, Git commit history, and production bundles.
2. **MFA TOTP Step-Up:** AAL2 enforced on `invite-staff` Edge Function, Delete PIN administration, and sensitive staff commands.
3. **Delete PIN Protection:** PIN hashes stored in `k2_private.staff_delete_credentials`; 5-attempt lockout for 15 minutes.
4. **Cloudflare Turnstile WAF:** Integrated on customer auth, guest order requests, Pasabuy submissions, and staff logins (`server/bot-challenge.js`).
5. **Content-Security-Policy:** Report-Only baseline CSP deployed with strict script, connect, and frame restrictions.
6. **Upload Boundary:** Strict MIME type validation (JPEG, PNG, WebP), byte-level image verification, EXIF metadata stripping via Sharp, and max size limits.

---

## 9. Performance Findings

1. **Bundle Distribution:**
   - Storefront bundle: `GlobeSection` (903 kB, gzip: 244 kB), `index` (628 kB, gzip: 190 kB).
   - Admin bundle: `index` (494 kB, gzip: 144 kB), `html5-qrcode-scanner` (335 kB, gzip: 100 kB).
2. **Code Splitting:** All top-level views and heavy admin modals (`ConsignmentManager`, `InventoryGrid`, `Sheet`, `ProductIntakeSessionModal`, `OmniOperationsHub`) are dynamically imported via `React.lazy`.
3. **Network Resilience:** `fetchWithTimeout.js` enforces 10-second execution deadlines with exponential backoff and jitter for transient network read failures.
4. **Optimization Recommendation (AUD-005):** Defer mounting of `GlobeSection` using IntersectionObserver on mobile devices to improve initial First Contentful Paint.

---

## 10. UX Findings

1. **Dual Register Cohesion:**
   - **Storefront:** Luxury Wood canvas (`public/wood-bg.jpg`), cream/parchment surfaces (`#FAF7F2`), gold accents (`#C5A880`), dark navy-slate (`#090C15`).
   - **Admin BOS:** High-density `#161922` dark surface, slate background (`#080b11`), hairline borders, `#3B82F6` accents, `adminKit.jsx` primitives.
2. **Honesty Principle:** Zero fake "in stock" claims, zero fake "Connected" channel badges, and zero fake courier tracking numbers before courier booking.
3. **Staff Enablement:** Visual SVG workflow diagrams (`WorkflowGuideModal.jsx`), onboarding guide (`StartHereGuide.jsx`), and non-blocking draggable tool suite (`AdminToolsWidget.jsx`).

---

## 11. Responsive Findings

1. **Mobile-First Touch Targets:** Admin BOS and Storefront enforce 44px minimum touch targets and 16px input font size to prevent iOS Safari auto-zoom.
2. **Data Table Responsiveness:** Horizontal scrolling wrappers on dense data grids (`Sheet.jsx`, `InventoryGrid.jsx`, `OmniOperationsHub.jsx`).
3. **Mobile Navigation:** Sticky bottom navigation bar (`MobileNavBar.jsx`) on Storefront; responsive drawer on Admin.

---

## 12. Accessibility Findings (WCAG 2.1 AA)

1. **Focus Rings:** Explicit `focus-visible:ring-2 focus-visible:ring-blue/70` across interactive controls.
2. **Semantic Elements:** Standard button tags with `type="button"`, ARIA labels on icon-only buttons (`aria-label`), and structured heading hierarchy.
3. **Reduced Motion:** Comprehensive support for `prefers-reduced-motion` across CSS transitions and Framer Motion animations.

---

## 13. SEO Findings

1. **Admin Surface Privacy:** `vercel.admin.json` deploys `X-Robots-Tag: noindex, nofollow` to keep internal operations unindexed.
2. **Gaps Identified:**
   - Storefront lacks an explicit `public/robots.txt` and dynamic `sitemap.xml` (AUD-009).
   - Product detail views lack JSON-LD Schema.org `Product` structured data (AUD-010).
   - View-state routing prevents search engines from indexing individual URL paths (AUD-003).

---

## 14. Visual Consistency Findings

1. **Design Primitives:** `src/components/ui/adminKit.jsx` successfully standardizes cards, buttons, section headers, badges, and alerts across all 13 Admin BOS modules.
2. **Iconography:** Unified stroke icon library (`src/components/ui/icons.jsx`) used consistently across navigation and status displays.

---

## 15. Code Quality Findings

1. **Zero TODO / FIXME / HACK comments** in production source code.
2. **Zero `console.log` statements** in production source code (sanitized via `reportError.js`).
3. **Zero `@ts-ignore` or `@ts-expect-error` bypasses**.
4. **Refactoring Target:** `ProductIntakeSessionModal.jsx` (1,147 lines) and `InventoryGrid.jsx` (907 lines) exceed the 800-line guideline and should be modularized (AUD-011).

---

## 16. Dependency Findings

1. **Direct Dependencies:** 20 direct, 274 transitive packages.
2. **Security Audit:** `npm audit` reports **0 vulnerabilities**.
3. **Licenses:** All dependencies reviewed and compliant (MIT, Apache-2.0, BSD-3-Clause, ISC).

---

## 17. Documentation Findings

1. **Authoritative Alignment:** `OPERATIONS_LOGIC_AND_WORKFLOW.md` defines target business logic; `SYSTEM_BRAIN_CURRENT.md` defines current verified status; `MASTER_ACTION_PLAN.md` is the single active backlog.
2. **Traceability:** All security remediations, Edge Function invitations, and portable rehearsals are documented with SHA-256 artifact hashes and postflight verification SQL.

---

## 18. Production Website Findings

- **Admin Production Host (`https://k2-jimzon-admin-seven.vercel.app/`):**
  - Responds with HTTP 200 and valid HTML/JS bundle.
  - Security headers present (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
  - Google OAuth PKCE callback canonicalized to public origin.
  - TOTP MFA enrollment and verification active.
- **Storefront Production Host:**
  - Awaiting custom production domain cutover (`OWNER-001`).

---

## 19. Alignment Problems (Contradictions Identified)

1. **`ProductDetail.jsx` vs `MasterProduct.jsx`:** Both components exist in `src/views/`. `StorefrontApp.jsx` registers both, but `openProduct()` routes exclusively to `master_product` (AUD-004).
2. **Direct Product Writes vs `20260822_catalog_spreadsheet_commit.sql`:** Three Admin components (`InventoryGrid.jsx`, `Sheet.jsx`, `SmartPasteModal.jsx`) still use direct Supabase client writes during transitional mode, conflicting with the unapplied commit migration (AUD-007).

---

## 20. Missing Systems / Gaps

| Category | Gap Description | Priority |
| :--- | :--- | :--- |
| **Security** | Live database public write boundary hardening (`OWNER-005` required) | P0 |
| **Data** | Anonymous batch stock view SELECT grant on production | P1 |
| **SEO** | `robots.txt`, dynamic `sitemap.xml`, and JSON-LD structured data | P2 |
| **Routing** | Storefront URL pathname synchronization for deep linking | P2 |
| **Observability** | Automated recurring off-site encrypted database backup schedule | P2 |
| **Code Quality** | Modularization of `ProductIntakeSessionModal.jsx` (1,147 lines) | P3 |

---

## 21. Technical Debt

1. **Migration Ledger Reconciliation:** 60 local migration files vs 5 remote ledger records.
2. **Transitional Direct-Client Code:** Browser components contain fallback direct Supabase queries alongside prepared BFF calls until BFF gateways are fully enabled.

---

## 22. Potential Future Risks

1. **Marketplace Webhook Scale:** High-volume bursts from Shopee/TikTok webhooks require durable rate limiting and queueing (prepared in `capture_shopee_event_v1`).
2. **Three.js Asset Bandwidth:** High mobile traffic in low-bandwidth regions may incur excessive data transfer costs if 3D assets are not aggressively cached and deferred.

---

## 23. Verification Results

```text
PREBUILD GATES:           PASS (Secret Scan, Env Contract, Sensitive Files, Dependency Policy, Surface Audit)
STOREFRONT BUILD:         PASS (19 manifest modules, zero secrets in bundle)
ADMIN BOS BUILD:          PASS (21 manifest modules, zero secrets in bundle)
CONTRACT TESTS:           PASS (179/179 passed across API, Auth, BFF, and Security boundaries)
SMOKE TESTS:              PASS (8/8 passed on Chromium)
CUSTOMER ACCOUNT UI:      PASS (3/3 passed)
PORTABLE REHEARSALS:      PASS (6/6 portable PostgreSQL 17.11 lifecycle suites passed)
LIVE WEBSITE (ADMIN):     PASS (HTTP 200, clean bundle, OAuth PKCE active)
```

---

## Action Plan

### P0 — Immediate
- [ ] **AUD-001:** Obtain `OWNER-005` authorization and execute `20260812_map017_public_write_boundary_hardening.sql` on live Supabase database.

### P1 — Before Further Expansion
- [ ] **AUD-002:** Verify `v_product_stock_from_batches` anonymous read permissions post-migration.
- [ ] **AUD-006:** Deploy Vercel server environment variables and activate Storefront and Admin BFF routers.
- [ ] **AUD-007:** Ensure Admin BOS UI routes through `/api/admin/catalog-import/commit` before applying `20260822_catalog_spreadsheet_commit.sql`.
- [ ] **AUD-013:** Complete custom domain DNS setup and finalize Supabase OAuth redirect URLs (`OWNER-001`).

### P2 — Important Improvements
- [ ] **AUD-003:** Implement HTML5 History API URL synchronization for Storefront deep linking.
- [ ] **AUD-004:** Consolidate `ProductDetail.jsx` and `MasterProduct.jsx` into single canonical product view.
- [ ] **AUD-005:** Implement IntersectionObserver deferred mounting for Three.js `GlobeSection`.
- [ ] **AUD-008:** Reconcile migration ledger tracking across local and remote environments.
- [ ] **AUD-009:** Generate `public/robots.txt` and automated `sitemap.xml`.
- [ ] **AUD-010:** Inject JSON-LD Schema.org `Product` structured data in product detail views.
- [ ] **AUD-014:** Document staff SOP for Delete PIN setup in `Staff & Roles`.
- [ ] **AUD-015:** Configure automated off-site encrypted database backup export runner.
- [ ] **AUD-017:** Apply and verify the prepared direct-browser `error_reports`
  retirement after MAP-017 backup/authorization gates; local replay and
  100-attempt denial pass, production remains unchanged.

### P3 — Cleanup / Optimization
- [ ] **AUD-011:** Modularize `ProductIntakeSessionModal.jsx` (1,147 lines) into focused subcomponents.
- [ ] **AUD-012:** Optimize cold start component mount in `Home.jsx` to resolve 5s smoke test timing.
- [ ] **AUD-016:** Add staff email notification trigger for new wholesale B2B inquiries.

### P4 — Future
- [ ] **AUD-018:** Add clarifying UX copy regarding direct staff communication for order exceptions.
