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
│  • 14 Scoped Commerce Endpoints            │  • 81 Operational Command Endpoints         │
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

The prepared Owner Count & Close slice follows that boundary: listing/order
sources enter immutable private staging, while product identity, exact-lot
reconciliation, Pasabuy state, and close completion cross named signed commands.
Marketplace quantities and coverage remain observations/proposals. The final
bookkeeping artifact is customer-minimized and estimate-only; it does not create
a parallel inventory, Pasabuy, settlement, or accounting system.

### Prepared deployment-config identity boundary

`scripts/map024-evidence/select-vercel-deployment-config.mjs` is a pure selector
used by the repository-owned Vercel config
boundary. It accepts the deployment target and current project identity plus an
explicit reviewed mapping, returns the existing Storefront or Admin contract
only for an exact pair, and refuses missing, invalid, unmapped, or mismatched
identity. Root `vercel.ts` binds both verified K2 project IDs to that selector
and is the supported programmatic Vercel configuration; the former generic `vercel.json`
is removed. `vercel.storefront.json` and `vercel.admin.json` remain the readable
artifact contracts. The target `functions` entries
tune matching functions; they are not treated as exclusion manifests.

### Storefront discovery boundary

- `src/components/StorefrontMetadata.jsx` owns the runtime title, canonical,
  Open Graph, Twitter, and Product/Offer JSON-LD projection for the current
  Storefront route. Its pure origin decision lives in
  `src/lib/storefrontMetadataOrigin.js`: localhost and unrelated staging hosts
  stay local for verification, while the apex and Vercel preview hosts map to
  the canonical public Storefront origin.
- `index.html` carries only absolute home discovery fields. Product-specific
  initial-response metadata and `sitemap.xml` require the same reviewed
  production catalog projection and remain separate from the browser bundle.
  `scripts/map024-evidence/generate-sitemap.mjs` owns the single visible-product
  selection and validation boundary; `generate-product-pages.mjs` consumes that
  selection to emit static product HTML with canonical/share/Product JSON-LD
  fields. `src/lib/storefrontRoutes.js` is the shared client/host registry for
  exact Storefront SPA paths. Vercel checks generated product HTML in the
  filesystem before its higher-level rewrites; `/product/:sku` falls back to the
  client entry only when no generated page exists. There is no global SPA
  catch-all, so other unmatched host paths can retain a real not-found response.
  `scripts/emit-static-404.mjs`
  emits a target-specific, script-free, noindex `404.html`, and the production
  boundary verifier rejects a missing, contaminated, or cross-target recovery
  document. Preview/live status and body behavior still require exact-host
  proof. Neither discovery generator reads secrets or queries Supabase, and
  unpublished, unsafe, duplicate, or incomplete rows cannot enter any artifact.
- `public/og-card.png` is the stable 1200×630 raster fallback for home shares and
  products without reviewed photography. The 192×192/512×512 app icons and
  180×180 Apple touch icon are deterministic renditions of the established SVG
  monogram. `vite.config.js` emits `manifest.json` per target at build time so
  the Storefront receives `/` and the public K2 identity while Admin receives
  its own identity; a shared public manifest can never leak the Admin start path
  into the Storefront artifact.

---

## 3. Serverless API Architecture

Both Storefront and Admin APIs are consolidated into single Serverless Function entrypoints to stay well within Vercel execution ceilings and function count limits:

- **`api/admin/index.js`**: Consolidated entrypoint routing 81 Admin endpoints.
- **`api/storefront/index.js`**: Consolidated entrypoint routing 14 Storefront endpoints.

Each route enforces:
- **HTTP Method Whitelist**: Non-matching methods return `405 Method Not Allowed` with exact `Allow` headers.
- **Origin & Referer Validation**: Prevents cross-site request hijacking.
- **Idempotency Keys**: POST mutations require UUID `Idempotency-Key` headers to prevent duplicate charges or lot adjustments.
- **Execution Deadlines**: Strict 10-second serverless execution timeouts.

The fourteenth Storefront route is `POST /api/storefront/order/status`. It is a
signed, origin-checked, durable-rate-limited read that derives its scope from the
existing HttpOnly guest grant. Its database projection returns only public
reference, operational/payment/delivery status, amount, item count, and creation
time. The backing migration and route are prepared/disabled until the MAP-017
and Storefront BFF activation order is complete.

### Client load boundaries

- `src/lib/lazySupabaseClient.js` defers the Storefront Supabase SDK until a
  remote catalog/Auth/CMS operation requests it. The Admin target aliases that
  import to `disabledLazySupabaseClient.js`, because Admin already owns its one
  eager staff Auth client and must not create a second browser client.
  Consumers must await the deferred client before using its Auth surface and
  must cancel initialization/unsubscribe when their route unmounts; an unresolved
  loader is not a Supabase client.
- Storefront cart UI, Interactive Shop CSS/JS, Three.js scene, and Admin master
  workflow graph are route/action-level chunks. `scripts/verify-bundle-budgets.mjs`
  fails target builds above the recorded landing/Admin budgets.
- Optional Google brand fonts are scheduled after application bootstrap; system
  font fallbacks keep both artifacts usable when the external font host is slow
  or unavailable.

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
