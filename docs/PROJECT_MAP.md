# K2 Jimzon — Project Directory Map

Operational readiness verification uses
`scripts/rehearse-map023-last-unit-concurrency.mjs` and
`supabase/tests/operational_readiness_{bootstrap,assertions}.sql` to execute
extracted receiving/payment functions before reservation concurrency. The schema
and Auth are synthetic; full migration/BFF/RLS acceptance remains separate.
Evidence and limits: `docs/evidence/20260907-operational-readiness/README.md`.

Dashboard widget destinations are defined by `src/views/admin/dashboardWidgets.js`.
`Admin.jsx` retains the selected widget and exposes desktop/mobile navigation;
`Overview.jsx` displays the selected reporting surface and its existing data.
`src/lib/overviewAvailability.js` checks failed/capped reads for both the prepared
Admin overview route and the legacy browser read path. No reporting database or
new connector is introduced. Acceptance uses `tests/admin-dashboard-redesign.spec.js`
and `tests/admin-logic-regressions.spec.js` in the existing runners.

Automatic intake (locally prepared, MAP-018 / MAP-028 I-016):
`src/views/admin/AutomaticIntakePanel.jsx` composes reviewed API preparation inside
`ProductIntakeSessionModal.jsx`; services use the registered prepared Admin AI
route. `server/admin-bff/intake-ai-provider.js` owns bounded provider requests;
`intake-ai-jobs.js` owns authentication/orchestration and canonical attachment.
`supabase/migrations/20260906_automatic_intake_jobs.sql` owns private durable jobs,
signed claims/recovery and cap accounting. `tests/intake-ai-*.spec.js`,
`supabase/tests/intake_ai_*.sql` and `scripts/rehearse-intake-ai-portable.mjs`
hold fixtures/rehearsal. Evidence: `docs/evidence/20260906-intake-ai/README.md`.

Workflow record access: `src/components/admin/master-workflow-graph/WorkflowRecords.jsx`
owns the drawer's bounded catalog/consignment reads through `adminBffService.js`.
`playwright.workflow.config.js` and `tests/workflow-api-ui.spec.js` verify the
rendered states using intercepted API responses. MAP-028 I-016 owns remaining work.

Hero additions are isolated in `src/components/home/Hero.css` and rendered by
`Hero.jsx`. `tests/hero-enhancement.spec.js` runs only through the selling-surfaces
configuration. Recovery: `docs/design-checkpoints/20260906-hero-before-additions/`.
Evidence: `docs/evidence/20260906-hero-additions/`.

Wholesale/media retry cases are tests/wholesale-recovery-ui.spec.js and tests/media-recovery-ui.spec.js, using the payment fixture and dedicated payment runner (now protected-mode fixture). npm test includes that runner; base config excludes those specs. Evidence/checkpoints are under docs/evidence/20260908-{wholesale,media}-retry and docs/design-checkpoints/20260908-{wholesale,media}-retry. Remaining acceptance stays in I-002.

Coupon retry acceptance lives in `tests/coupon-recovery-ui.spec.js`, sharing
the payment fixture and `playwright.payment.config.js`. `npm test` invokes
`test:payment-ui`; the base runner excludes both recovery UI specs to preserve
their fixture environment. `CouponManager.jsx` owns coupon state and the shared
AdminDialog/hook own focus and retained command lifecycle. Evidence and scoped
recovery: `docs/evidence/20260908-coupon-retry/README.md`; remaining work: I-002.

- Prepared Admin routes: 92
- Prepared Storefront routes: 15

These are source registry counts, checked by
`tests/security-surface-inventory.spec.js` in the contract and CI suites.
The two consolidated entrypoints below are source files, not verified emitted
or enabled provider function inventories. Exact-preview inventories remain I-014.

`20260908_purchase_hold_lock_order.sql` and the existing purchase-hold rehearsal
own the prepared opposing-basket deadlock correction under MAP-023/I-001.
Recovery/activation evidence lives in the Guest Commerce BFF runbook.

`20260908_payment_balance_integrity.sql`, `payment_balance_integrity.sql` and
the existing payment-recovery runner own prepared balance/receipt denial checks.
They add no endpoint or frontend surface; I-001 owns remaining composition.

`20260908_reconciliation_lock_order.sql` and `purchase_reconciliation_*.sql`
extend the purchase runner with real recount/clearance concurrency and recovery.

`src/components/admin/master-workflow-graph/WorkflowRecords.jsx` owns bounded
catalog/consignment reads in the graph detail drawer. It reuses Admin services
and adds no backend route. `playwright.workflow.config.js` and the workflow-api
fixture/test own isolated acceptance. MAP-028 I-016 owns remaining action scope.

The additive hero uses `src/components/home/Hero.jsx` and its isolated
`Hero.css`; no shared styles or commerce services change. Its exact pre-edit
checkpoint lives under `docs/design-checkpoints/20260906-hero-before-additions/`.
`tests/hero-enhancement.spec.js` uses isolated catalog/image fixtures and writes
visual evidence to `docs/evidence/20260906-hero-additions/`. MAP-028 I-009 owns
remaining acceptance.

`tests/chunk-recovery.spec.js` verifies bootstrap preload-failure behavior and
blocked-storage resilience under MAP-028 I-010. Its failing historical baseline
is retained in the 6 September audit evidence; current bootstrap recovery is
user-initiated and leaves errors unsuppressed.

Audit evidence: `scripts/audit-web-readiness.mjs` runs a fabricated-catalog,
blocked-external-network browser survey on exclusive loopback port 5196.
`docs/evidence/20260906-readiness-audit/` retains evidence only; all follow-up
work is in MASTER_ACTION_PLAN section I. Current prepared route counts are
listed above; historical audit evidence retains its original date and counts.

`supabase/migrations/20260906_handover_coverage.sql` and
`supabase/tests/handover_coverage.sql` belong to MAP-023 H-023 and the existing
purchase-time reservation runner. Guest Commerce runbook records their local
evidence, activation dependencies and recovery scope.

Packing/payment rehearsal ownership: `scripts/rehearse-payment-recovery.mjs`
owns the isolated transition, signed receipt and concurrent-review fixture;
`supabase/tests/packing_signed_*.sql` extends it for packing composition.
`scripts/rehearse-purchase-time-reservation.mjs` owns inventory behavior including
`supabase/tests/packing_lot_proof.sql`. Prepared exact-lot function and wrapper
are separate `20260906_exact_packing_*.sql` migrations under MAP-023 H-016.

This guide outlines the directory structure, file placement responsibilities, and structural boundaries of the repository.

---

## 📁 Root Directory Layout

```text
c:\Users\jerze\K2 JImzon\
├── vercel.ts                   # Provider-supported project-ID-bound selector for separate Vercel artifact configs
├── .agent/                      # AI Agent workspace configuration and agent instruction rules
├── .agents/                     # Specialized skill definitions and execution runbooks
├── .tools/                      # Local isolated PostgreSQL 17.11 runtime for offline rehearsals
├── api/                         # Consolidated Vercel Serverless Function entrypoints
│   ├── admin/index.js           # Admin BFF consolidated router (92 prepared routes)
│   └── storefront/index.js      # Storefront BFF consolidated router (15 prepared routes)
│   ├── admin/index.js           # Admin BFF consolidated router (prepared inventory above)
│   └── storefront/index.js      # Storefront BFF consolidated router (prepared inventory above)
├── prepared-api/                # Individual route handler implementations
│   ├── admin/                   # Admin route handlers (auth, inventory, intake, sessions, etc.)
│   └── storefront/              # Storefront route handlers (order, pasabuy, claim, auth, etc.)
├── server/                      # Core BFF router engines and middleware
│   ├── admin-bff/               # Admin authorization, session registry, CSRF, security, spend controls
│   ├── storefront-bff/          # Guest grants, customer preauth rates, Turnstile WAF
│   └── bot-challenge.js         # Cloudflare Turnstile token validation engine
├── src/                         # React 19 + Tailwind CSS Frontend Application
│   ├── main.jsx                 # Application entrypoint with target alias resolution
│   ├── StorefrontApp.jsx        # Root component for Storefront production builds
│   ├── AdminApp.jsx             # Root component for Admin BOS production builds
│   ├── App.jsx                  # Combined workstation development runner
│   ├── index.css                # Tailwind 4 design system rules and CSS custom properties
│   ├── interactive-store.css    # Lazy virtual-store-only scene and fallback styles
│   ├── components/              # Modular UI components
│   │   ├── admin/               # Admin BOS UI cards, scanners, drawers, modals
│   │   ├── globe/               # 3D Three.js interactive globe & location visualizer
│   │   ├── home/                # Storefront luxury wood sections & consignment showcase
│   │   ├── nav/                 # Responsive mobile and desktop navigation bars
│   │   ├── security/            # Cloudflare Turnstile and bot challenge wrappers
│   │   ├── shop/                # Virtual store, shared guide moments, anime rig and semantic shelf UI
│   │   └── ui/                  # ErrorBoundary, Image sliders, dialog primitives
│   ├── context/                 # Application State & Context Providers
│   │   ├── StoreContext.jsx     # Storefront catalog, cart, guest checkout, views
│   │   ├── AdminStoreContext.jsx# Admin live products, batch stock, refresh polling
│   │   ├── useAdminAuthRuntime  # Session checking, login/logout, and TOTP step-up
│   │   ├── useAdminInboxRuntime # Universal customer-staff conversation polling
│   │   └── adminInboxPolling.js # Poll gating, generation guard, stale queue, read receipts
│   ├── services/                # Front-end API client wrappers (BFF communication)
│   │   ├── adminBffService.js   # Client methods for Admin BFF routes
│   │   ├── guestCommerceService # Client methods for guest checkout and order tracking
│   │   ├── customerAccountService # Client methods for passwordless customer accounts
│   │   └── productIntakeService # Client methods for mobile intake and evidence upload
│   ├── lib/                     # Client utilities and helpers
│   │   ├── fetchWithTimeout.js  # Bounded fetch wrapper with retry jitter
│   │   ├── safeUiError.js       # Sanitized user-facing error messages
│   │   ├── shelfLifeGate.js     # FEFO 90/30 day shelf-life calculator
│   │   ├── storefrontRoutes.js  # Shared exact Storefront client/host route registry
│   │   ├── storefrontMetadataOrigin.js # Canonical Storefront metadata origin resolver
│   │   ├── aiSpendControls.js   # Fail-closed paid-AI cap/confirmation contract
│   │   ├── cartInventory.js     # Atomic known-stock cart/bundle/submission invariant
│   │   ├── lazySupabaseClient.js# Storefront deferred SDK boundary
│   │   ├── disabledLazySupabaseClient.js # Admin target no-client alias
│   │   └── supabaseClient.js    # Singleton browser Supabase implementation
│   └── views/                   # Full-page views
│       ├── admin/               # 40+ Admin views, modals, procedure registry, and management tools
│       ├── Home.jsx             # Luxury Wood showcase & consignment hero
│       ├── Catalog.jsx          # Public catalog grid with batch-stock derivation
│       ├── InteractiveShop.jsx  # Optional room over canonical catalog/basket/conversation boundaries
│       ├── MasterProduct.jsx    # Editorial product details, availability and pairing notes
│       ├── Checkout.jsx         # Guest-first order request submission
│       ├── Pasabuy.jsx          # Custom Italian sourcing request form
│       ├── CustomerAccount.jsx  # Passwordless login, SMS OTP, and claim history
│       ├── GuestMessages.jsx    # Scoped order chat & customer support
│       ├── Wholesale.jsx        # Business inquiry & tier pricing intake
│       ├── Contact.jsx          # Verified channel communication directory
│       └── NotFound.jsx         # Explicit noindex unknown-route recovery
├── supabase/                    # Backend database architecture
│   ├── migrations/              # Authoritative SQL migrations ledger
│   ├── functions/               # Supabase Edge Functions (invite-staff, shopee-webhook)
│   └── tests/                   # SQL test suites & bootstrap schemas for portable rehearsal
├── scripts/                     # CI/CD, verification, security scanning & rehearsal tools
│   ├── build-anime-clerk.py      # Reproducible original K2 Blender model, exported named articulation
│   ├── emit-static-404.mjs       # Target-specific script-free noindex host recovery document
│   ├── verify-bundle-budgets.mjs# Hard Storefront/Admin production route budgets
│   └── map024-evidence/         # Redacted hostname/discovery tools and prepared Vercel selector engine
├── playwright.map027.config.js  # Strict self-starting Interactive Shop browser acceptance harness
├── playwright.inbox.config.js   # Isolated loopback Inbox draft/workflow acceptance, no server reuse
├── tests/                       # Playwright E2E suites & API/source contract tests
├── assets/3d/                   # Blender source, authoring renders and regeneration notes
├── public/models/               # Browser GLB exports loaded by optional 3D surfaces
├── docs/                        # Complete project documentation library
├── K2 Jimzon - Brain/           # Authoritative business logic, current state & owner questions
└── MASTER_ACTION_PLAN.md        # The ONLY active implementation backlog
```

The searchable staff workflow contract lives at
`src/views/admin/staffProcedureRegistry.js`; it is read-only guide data, not a
state-changing service. `src/lib/aiSpendControls.js` is likewise a pure
validation/display contract; the server-enforced SuperAdmin boundary lives in
`server/admin-bff/ai-spend-controls.js` and the prepared migration.
`src/lib/salesCalculations.js` is the pure shared sales-summary, exact record-
filtering, four-bucket payment/fulfillment reconciliation, customer-free CSV,
forward scenario with automatic percentage fees and fee-aware break-even,
reverse target-price math, and downward-rounded maximum-
discount math, plus minimum whole-unit planned-profit targeting used by Admin
Overview and the
non-posting tools panel; it has no data-write, price-approval, or accounting
authority. The same pure module formats the deterministic, customer-free
planning-summary clipboard handoff; clipboard interaction remains in the Admin
view and performs no canonical write.
`src/views/admin/adminGuide.js` adapts the procedure contracts for retrieval,
while the Operations guide and workflow graph render the same draft/version
truth.

`src/views/admin/OwnerCountClose.jsx` composes the prepared exact-shop close
through fixed `prepared-api/admin/marketplace-*` and `owner-close/*` routes.
Pure parsing/math/proposal/CSV logic stays in `src/lib/marketplace*` and
`src/lib/ownerClose*`; signed persistence and customer-minimized projections
stay in `server/admin-bff/marketplace-snapshots.js` plus the private migration.
The view never receives provider credentials or writes canonical lots directly.

---

## 🛡️ Folder Responsibilities & Placement Rules

| Directory | What Belongs Here | What MUST NOT Be Placed Here |
| :--- | :--- | :--- |
| `src/views/` | Top-level page views rendered by the router. | Business logic, direct SQL queries, raw API calls without services. |
| `src/views/admin/` | Admin BOS operational views and management modals. | Customer-facing storefront components. |
| `src/components/` | Reusable UI components (buttons, headers, drawers). | Full page layouts, route handlers. |
| `src/services/` | Frontend client functions calling the BFF API. | Direct database connection strings, service-role keys. |
| `server/` | BFF routers, middleware, cryptographic verifiers. | React JSX components, browser DOM logic. |
| `prepared-api/` | Modular serverless route handlers. | Unvalidated database mutations, client-only code. |
| `supabase/migrations/` | Idempotent, transaction-safe SQL migration files. | Unreviewed ad-hoc DDL fragments. |
| `scripts/` | Automated verification, scanning, and rehearsal scripts. | Application runtime code. |
| `tests/` | Playwright E2E and API contract tests. | Production application code. |


Store orientation regression: `tests/store-orientation-ui.spec.js` with `playwright.store-orientation.config.js` covers the actual `/store` canvas plus reduced-motion fallback, selected product, basket and draft continuity across viewport changes. Evidence: `docs/evidence/20260908-store-orientation/`. Ownership stays MAP-028 I-009/I-015 and MAP-027, IDEA-20260908-02.
