# K2 Jimzon Production Deployment and Domain Runbook

This operational runbook governs the deployment, artifact isolation, domain routing, and rollback procedures for K2 Jimzon across Storefront and Admin BOS.

## 1. Production Architecture Overview

K2 Jimzon ships as **two separate Vercel production projects** built from the single reviewed repository:

| Project | Environment Target | Canonical Host Target | Purpose |
| --- | --- | --- | --- |
| **Storefront** | `K2_DEPLOYMENT_TARGET=storefront` | `www.<owner-domain>` | Public editorial catalog, Pasabuy, guest checkout, universal messaging |
| **Admin BOS** | `K2_DEPLOYMENT_TARGET=admin` | `admin.<owner-domain>` | Central staff BOS: intake, consignments, inventory, lots, orders, fulfillment |

Apex `<owner-domain>` redirects via HTTP 308 to `www.<owner-domain>`.

---

## 2. Environment Variables Matrix

### Storefront Project (`vercel.storefront.json`)
- `K2_DEPLOYMENT_TARGET=storefront`
- `VITE_SUPABASE_URL=https://pixplcjqivlfflickobf.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>`
- `VITE_GUEST_BFF_ENABLED=false` until the BFF, migrations, policies, and production acceptance checks are proven end to end

### Admin Project (`vercel.admin.json`)
- `K2_DEPLOYMENT_TARGET=admin`
- `VITE_SUPABASE_URL=https://pixplcjqivlfflickobf.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>`
- `VITE_ADMIN_BFF_ENABLED=false` until the BFF, migrations, policies, and production acceptance checks are proven end to end

> [!CAUTION]
> **Secret Prohibition**
> Never place `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_`, webhook secrets, or private tokens in browser-readable `VITE_` variables. Supabase Edge Function secrets belong in Supabase. A future Vercel server function may use an approved server-only environment variable, but it must never be exposed to the client bundle.

---

## 3. Build & Artifact Boundary Verification

Before any deployment, execute local production builds and verification:
```powershell
npm run build:storefront; npm run build:admin
```

The verifier (`scripts/verify-build-boundary.mjs`) guarantees:
1. Storefront bundle contains **0 admin views/routes** and no admin command markers.
2. Admin bundle contains **0 storefront views/routes** and no guest commerce markers.
3. Both `dist/` bundles pass the zero-secret scan (`scripts/scan-secrets.mjs dist`).

---

## 4. Domain & DNS Configuration (Gated on OWNER-001)

When the owner confirms the domain name and grants registrar access:

1. Add the confirmed storefront domain and `www` host to the Storefront Vercel project.
2. Add the confirmed `admin` host to the Admin BOS Vercel project.
3. At cutover time, copy the exact DNS records shown by each Vercel project. Do not rely on hard-coded targets in this runbook because provider instructions can change.
4. **DNS Preservation Rule:**
   - Inspect existing MX, SPF, DKIM, DMARC, and TXT verification records before any nameserver update. Never overwrite existing mail or business domain records.
5. **HTTPS & Security Headers:**
   - Vercel automatically provisions Let's Encrypt TLS certificates.
   - Admin headers include `X-Robots-Tag: noindex, nofollow` to prevent search indexing.

---

## 5. Rollback Procedures

### Application Rollback
In the Vercel dashboard:
1. Open the affected project (Storefront or Admin).
2. Go to **Deployments** -> select the previous known good deployment -> click **Promote to Production**.
3. Verification: Execute smoke tests against the production host.

### DNS / Routing Rollback
If a domain issue occurs:
1. Revert DNS CNAME / A records at the registrar to point to the fallback host.
2. TTL should be configured to 300s (5 minutes) during cutover windows to allow rapid propagation of rollbacks.
