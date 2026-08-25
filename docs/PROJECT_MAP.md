# K2 Jimzon — Project Directory Map

This guide outlines the directory structure, file placement responsibilities, and structural boundaries of the repository.

---

## 📁 Root Directory Layout

```text
c:\Users\jerze\K2 JImzon\
├── .agent/                      # AI Agent workspace configuration and agent instruction rules
├── .agents/                     # Specialized skill definitions and execution runbooks
├── .tools/                      # Local isolated PostgreSQL 17.11 runtime for offline rehearsals
├── api/                         # Consolidated Vercel Serverless Function entrypoints
│   ├── admin/index.js           # Admin BFF consolidated router (68 endpoints)
│   └── storefront/index.js      # Storefront BFF consolidated router (13 endpoints)
├── prepared-api/                # Individual route handler implementations
│   ├── admin/                   # Admin route handlers (auth, inventory, intake, sessions, etc.)
│   └── storefront/              # Storefront route handlers (order, pasabuy, claim, auth, etc.)
├── server/                      # Core BFF router engines and middleware
│   ├── admin-bff/               # Admin authorization, session registry, CSRF, security
│   ├── storefront-bff/          # Guest grants, customer preauth rates, Turnstile WAF
│   └── bot-challenge.js         # Cloudflare Turnstile token validation engine
├── src/                         # React 19 + Tailwind CSS Frontend Application
│   ├── main.jsx                 # Application entrypoint with target alias resolution
│   ├── StorefrontApp.jsx        # Root component for Storefront production builds
│   ├── AdminApp.jsx             # Root component for Admin BOS production builds
│   ├── App.jsx                  # Combined workstation development runner
│   ├── index.css                # Tailwind 4 design system rules and CSS custom properties
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
│   │   └── supabaseClient.js    # Browser Supabase client instance
│   └── views/                   # Full-page views
│       ├── admin/               # 40+ Admin views, modals, and management tools
│       ├── Home.jsx             # Luxury Wood showcase & consignment hero
│       ├── Catalog.jsx          # Public catalog grid with batch-stock derivation
│       ├── ProductDetail.jsx    # Editorial variant details, ingredients, pairing notes
│       ├── Checkout.jsx         # Guest-first order request submission
│       ├── Pasabuy.jsx          # Custom Italian sourcing request form
│       ├── CustomerAccount.jsx  # Passwordless login, SMS OTP, and claim history
│       ├── GuestMessages.jsx    # Scoped order chat & customer support
│       ├── Wholesale.jsx        # Business inquiry & tier pricing intake
│       └── Contact.jsx          # Verified channel communication directory
├── supabase/                    # Backend database architecture
│   ├── migrations/              # Authoritative SQL migrations ledger
│   ├── functions/               # Supabase Edge Functions (invite-staff, shopee-webhook)
│   └── tests/                   # SQL test suites & bootstrap schemas for portable rehearsal
├── scripts/                     # CI/CD, verification, security scanning & rehearsal tools
├── tests/                       # Playwright E2E suites & 179 contract tests
├── docs/                        # Complete project documentation library
├── K2 Jimzon - Brain/           # Authoritative business logic, current state & owner questions
└── MASTER_ACTION_PLAN.md        # The ONLY active implementation backlog
```

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
