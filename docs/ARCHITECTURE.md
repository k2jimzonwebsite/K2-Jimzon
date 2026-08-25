# K2 Jimzon — System Architecture

## 1. High-Level Architecture

The K2 Jimzon architecture is engineered around the principles of **defense-in-depth, strict surface separation, and transactional data integrity**:

```
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

---

## 2. Multi-Target Build Separation

The monorepo uses Vite's alias and mode configuration to compile completely independent artifacts:

```bash
# Build Storefront Production Artifact (outputs dist/ with StorefrontApp.jsx entry)
npm run build:storefront

# Build Admin BOS Production Artifact (outputs dist/ with AdminApp.jsx entry)
npm run build:admin
```

### Build Boundary Guarantees (`scripts/verify-build-boundary.mjs`)
- **Storefront Artifact**:
  - Contains only customer-facing views (`Home`, `Catalog`, `ProductDetail`, `Checkout`, `Pasabuy`, `CustomerAccount`, `GuestMessages`, `Contact`, `Wholesale`).
  - Zero Admin modules or staff management code.
  - Zero `service_role` keys or server-only credentials.
- **Admin BOS Artifact**:
  - Contains the complete operational suite (`Overview`, `InventoryGrid`, `Sheet`, `ConsignmentManager`, `PasabuyManager`, `Inbox`, `StaffPermissionManager`, `ProductIntakeSessionModal`, etc.).
  - Communicates exclusively through same-origin Admin BFF routes.

---

## 3. Serverless API Architecture

Both Storefront and Admin APIs are consolidated into single Serverless Function entrypoints to stay well within Vercel execution ceilings and function count limits:

- **`api/admin/index.js`**: Consolidated entrypoint routing 68 Admin endpoints.
- **`api/storefront/index.js`**: Consolidated entrypoint routing 13 Storefront endpoints.

Each route enforces:
- **HTTP Method Whitelist**: Non-matching methods return `405 Method Not Allowed` with exact `Allow` headers.
- **Origin & Referer Validation**: Prevents cross-site request hijacking.
- **Idempotency Keys**: POST mutations require UUID `Idempotency-Key` headers to prevent duplicate charges or lot adjustments.
- **Execution Deadlines**: Strict 10-second serverless execution timeouts.

---

## 4. Database Schema & RLS Architecture

PostgreSQL is partitioned into two functional schema domains:

### `public` Schema (Application Domain)
- All 42 tables have Row Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) enabled.
- All 9 public views specify `WITH (security_invoker = true)` so that querying views enforces the caller's RLS policies.
- Direct DML (INSERT, UPDATE, DELETE) for anonymous and unauthenticated users is revoked. Mutations occur through `SECURITY DEFINER` RPCs.

### `k2_private` Schema (Security & Platform State)
- Inaccessible to `anon` and `authenticated` Supabase roles.
- Contains platform infrastructure tables:
  - `admin_sessions`: Active staff sessions and token hashes.
  - `admin_session_events`: Session lifecycle logs (login, MFA, revoke).
  - `rate_limit_buckets`: Distributed HMAC token-bucket counters.
  - `security_events`: Redacted security incident logs.
  - `evidence_cleanup_ledger`: Orphan file cleanup reconciliation queue.
