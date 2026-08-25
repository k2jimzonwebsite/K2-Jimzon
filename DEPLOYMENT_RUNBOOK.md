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
- `K2_STOREFRONT_BFF_ENABLED=false` until the server boundary and preview function inventory are proven
- `VITE_GUEST_BFF_ENABLED=false` until the BFF, migrations, policies, and production acceptance checks are proven end to end

### Admin Project (`vercel.admin.json`)
- `K2_DEPLOYMENT_TARGET=admin`
- `VITE_SUPABASE_URL=https://pixplcjqivlfflickobf.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>`
- `K2_ADMIN_BFF_ENABLED=false` until the server boundary, preview function
  inventory, `20260825_admin_preauth_rate_boundary.sql`, its read-only postflight,
  and deployed login and pending-session MFA denial/provider-suppression behavior
  are proven
- `VITE_ADMIN_BFF_ENABLED=false` until the BFF, migrations, policies, and production acceptance checks are proven end to end
- `K2_ADMIN_PASSWORD_RECOVERY_ENABLED=false` until
  `20260825_admin_preauth_rate_boundary.sql`, the read-only
  `map020_admin_preauth_rate_postflight.sql`, the
  exact callback/template, link-tracking and prefetch behavior, real provider
  mail, single-use replay, staff-role denial, global session revocation, and
  deployed `429`/provider-suppression behavior are proven
- `K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL=https://<exact-admin-host>/api/admin/auth/password-recovery/verify`

> [!CAUTION]
> **Secret Prohibition**
> Never place `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_`, webhook secrets, or private tokens in browser-readable `VITE_` variables. Supabase Edge Function secrets belong in Supabase. A future Vercel server function may use an approved server-only environment variable, but it must never be exposed to the client bundle.

### Redacted provider inventory check

Export or transcribe **names only** for the custom environment variables configured
in both Vercel projects. Never place values in the evidence file. Use this temporary
local shape (the file must not be committed):

```json
{
  "admin": ["K2_DEPLOYMENT_TARGET", "VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_ADMIN_BFF_ENABLED"],
  "storefront": ["K2_DEPLOYMENT_TARGET", "VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_GUEST_BFF_ENABLED"]
}
```

Run `npm run security:env-contract -- --inventory <path-to-name-only-json>`.
The command fails when a required variable is missing, a custom variable is not in
the target allowlist, a provider secret is present in Vercel, or a secret-shaped
name is exposed through `VITE_`. Delete the temporary inventory after recording the
redacted pass/fail result in MAP-016 evidence.

Before activating either BFF, rerun the same name-only inventory with
`--activation admin`, `--activation storefront`, or
`--activation admin,storefront`. Activation mode additionally requires every
target-specific server-only URL, publishable key, signing/cookie secret name,
exact-origin allowlist, independent server BFF switch, and Storefront Turnstile
variable. This validates names
and separation only—it does not inspect values, prove matching database secrets,
create rewrites, enable a feature flag, or prove a deployment.

The repository now contains one guarded consolidated entrypoint per boundary:
`api/admin/index.js` and `api/storefront/index.js`, with exact catch-all rewrites
in their target configuration files. Each entrypoint requires both its matching
`K2_DEPLOYMENT_TARGET` and its server-only BFF switch. This is fail-closed local
source evidence only. Before activation, inspect the actual Vercel preview
function inventory and prove that each project packaged only its intended
entrypoint; the `functions` configuration tunes matching functions but is not
itself an exclusion manifest. Enable the server switch on preview first and the
browser `VITE_*_BFF_ENABLED` switch only after server denial/allowance tests pass.

Password recovery additionally requires the exact callback URL in the Supabase
Auth redirect allowlist and the custom recovery email template recorded in
`ADMIN_BFF_SECURITY_RUNBOOK.md`. Keep its independent server switch false until
one real mailbox journey proves the token reaches only the server callback,
email tracking does not rewrite it, security prefetch does not consume it,
replay fails, and global sign-out makes every previous Admin session fail its
provider-session registry check.

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
