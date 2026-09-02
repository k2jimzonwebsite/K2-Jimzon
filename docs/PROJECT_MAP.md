# K2 Jimzon — Project Directory Map

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
│   ├── admin/index.js           # Admin BFF consolidated router (81 endpoints)
│   └── storefront/index.js      # Storefront BFF consolidated router (14 endpoints)
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
│   │   └── ui/                  # ErrorBoundary, Image sliders, dialog primitives
│   ├── context/                 # Application State & Context Providers
│   │   ├── StoreContext.jsx     # Storefront catalog, cart, guest checkout, views
│   │   ├── AdminStoreContext.jsx# Admin live products, batch stock, refresh polling
│   │   ├── useAdminAuthRuntime  # Session checking, login/logout, and TOTP step-up
│   │   └── useAdminInboxRuntime # Universal customer-staff conversation polling
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
│   ├── emit-static-404.mjs       # Target-specific script-free noindex host recovery document
│   ├── verify-bundle-budgets.mjs# Hard Storefront/Admin production route budgets
│   └── map024-evidence/         # Redacted hostname/discovery tools and prepared Vercel selector engine
├── playwright.map027.config.js  # Strict self-starting Interactive Shop browser acceptance harness
├── tests/                       # Playwright E2E suites & API/source contract tests
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
