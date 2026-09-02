# K2 Jimzon Production Deployment and Domain Runbook

This operational runbook governs the deployment, artifact isolation, domain routing, and rollback procedures for K2 Jimzon across Storefront and Admin BOS.

## 1. Production Architecture Overview

K2 Jimzon ships as **two separate Vercel production projects** built from the single reviewed repository:

| Project | Environment Target | Canonical Host Target | Purpose |
| --- | --- | --- | --- |
| **Storefront** | `K2_DEPLOYMENT_TARGET=storefront` | `www.<owner-domain>` | Public editorial catalog, Pasabuy, guest checkout, universal messaging |
| **Admin BOS** | `K2_DEPLOYMENT_TARGET=admin` | `admin.<owner-domain>` | Central staff BOS: intake, consignments, inventory, lots, orders, fulfillment |

Provider-account boundary: use only the owner-authenticated Vercel team that
contains `k2-jimzon` and `k2-jimzon-admin`. A connector session that lists an
unrelated team or projects is not K2 evidence and must not be used to deploy,
change environment variables, or edit domains. The continuation on 27 August
2026 encountered team `edgerzxcs-projects` with unrelated projects; no K2
deployment or setting was changed through it. The same connector context exposes
only the unrelated Supabase `ScoutIT` project and denies K2 ref
`pixplcjqivlfflickobf`; do not run K2 SQL, migrations, or Auth changes through
that session.

A read-only connector refresh on 28 August 2026 returned the same unrelated
Vercel team and Supabase `ScoutIT` project; the K2 Vercel projects and Supabase
ref remain unavailable through this session. No provider or database write was
attempted.

A read-only Hostinger refresh on 28 August 2026 confirmed the Active,
privacy-protected, transfer-locked `k2jimzon.com` registration and the exact
Vercel web records documented in the cutover evidence. This does not prove
public DNS propagation, Vercel alias visibility, or real-host behavior.

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
- `K2_AI_SPEND_CONTROLS_ENABLED=false` until the owner-controlled SuperAdmin
  role, paid-AI control migration, provider/model/retention decisions, cap and
  confirmation tests, and rollback evidence are proven; this flag never stores
  or exposes an API key
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
`api/admin/index.js` and `api/storefront/index.js`, with exact API-prefix
rewrites in their target configuration files. Each entrypoint requires both its matching
`K2_DEPLOYMENT_TARGET` and its server-only BFF switch. This is fail-closed local
source evidence only. Before activation, inspect the actual Vercel preview
function inventory and prove that each project packaged only its intended
entrypoint; the `functions` configuration tunes matching functions but is not
itself an exclusion manifest. Enable the server switch on preview first and the
browser `VITE_*_BFF_ENABLED` switch only after server denial/allowance tests pass.

### Repository-owned config selector — prepared, not deployed

The pure selector at
`scripts/map024-evidence/select-vercel-deployment-config.mjs` checks an explicit
`K2_DEPLOYMENT_TARGET` against the current `VERCEL_PROJECT_ID` and a reviewed
target-to-project mapping before returning either existing artifact config. It
has no fallback. Its isolated-process contracts use synthetic project IDs and
prove missing/invalid/mismatch refusal plus exact config selection. Root
`vercel.ts` now supplies both owner-authenticated K2 project mappings and exports
the exact selected contract through Vercel's supported programmatic configuration
entrypoint; the weaker generic `vercel.json` is removed. Preview verification of
provider loading, rewrites, headers, and function limits remains mandatory.
Local evidence refreshed 30 August 2026: a single-authority regression failed
while both root files coexisted, passed after the generic JSON was removed, and
the complete focused contract passed 16/16. Both
target production builds passed security preflight, artifact-boundary checks,
and secret scans after the removal. The empty-catalog Storefront artifact
correctly contains only the two stable sitemap routes and no product pages. Do
not promote those results to preview or production proof.

Do not deploy or promote this root adapter until all of the following pass:

1. a safe, separately tested source-inventory path for Vercel checkouts without
   `.git`; never bypass the tracked-sensitive-file gate;
2. current named routes, environment-name inventory, custom domains, aliases,
   and prior deployment IDs needed for rollback;
3. preview function inventory plus guarded `404`, disabled-BFF, bundle, rewrite,
   header, and cache evidence for both projects.

If activation fails, restore the recorded root configuration and promote the
prior deployment separately for the affected project. The present root adapter
is locally prepared evidence only; no provider deployment or setting changed.

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

### CI acceptance parity — locally proven, remotely unproven

GitHub CI must run `npm test`, not a hand-selected smoke subset. That aggregate
owns the base source/API/workflow suite and the dedicated Storefront, Admin BOS,
Product Master, Owner Count & Close, customer-account/Wholesale, and selling
journeys. One uninterrupted exact current-tree local aggregate, rerun after the
final customer-fixture containment change, passes 550/550 across base 484/484,
Storefront 30/30, Admin 26/26, Product Master 1/1, Owner Count & Close 1/1,
customer-account/secure Wholesale 3/3, and selling surfaces 5/5. The workflow
must not export a provider URL across the aggregate: that would change
Storefront fallback behavior. Instead, the dedicated Admin and customer-account
harnesses set `VITE_SUPABASE_URL=https://fixture.supabase.co` and synthetic
public keys; the account harness derives the matching test storage key, and all
requests to the fabricated provider origin are intercepted. Neither harness
names K2's real Supabase project. The fixture identifier/key carries no provider
credential or authority, and a fixture regression cannot address the real provider.

Every Playwright configuration must reject focused `.only` tests when `CI` is
set. Shared servers must not be reused in CI, dedicated tests must stay excluded
from the combined runner, and web-server commands must be portable to the
Ubuntu GitHub runner (no `npm.cmd` or `npx.cmd`). CI retains both
`playwright-report/` and `test-results/` when present so a failed release gate is
diagnosable.

Local source and browser results do not prove this workflow executed remotely.
Release evidence requires a green GitHub Actions run for the exact candidate
commit and inspection of the uploaded evidence artifact. If the complete suite
fails, do not replace it with a narrower smoke step: fix the owning suite or
restore the last known-green workflow, preserve the failure artifact, and keep
the release blocked. The current post-portability Owner Count & Close rendered
rerun is also pending because local Chromium approval capacity was exhausted;
rerun `npm.cmd run test:owner-count-close-ui` when it resets before treating the
local CI change as fully reverified.

---

## 4. Domain & DNS Configuration

`OWNER-001` was resolved and the first cutover was applied on 27 August 2026:

1. `k2jimzon.com` and `www.k2jimzon.com` belong only to Storefront Vercel project `k2-jimzon`; the apex redirects 308 to `www`.
2. `admin.k2jimzon.com` belongs only to Admin BOS Vercel project `k2-jimzon-admin`.
3. Hostinger currently carries apex A records `216.198.79.1` and `64.29.17.1`, `www` CNAME `f683b7ff3d09cb06.vercel-dns-017.com.`, and `admin` CNAME `be6a2ad6b5b189c6.vercel-dns-017.com.`, at TTL 300. Treat these as recorded current state, not timeless provider defaults; use Vercel's current instructions for any future rebuild.
4. **DNS Preservation Rule:**
   - Inspect existing MX, SPF, DKIM, DMARC, and TXT verification records before any nameserver update. Never overwrite existing mail or business domain records.
5. **HTTPS & Security Headers:**
   - Vercel automatically provisions Let's Encrypt TLS certificates.
   - Project-level response routes currently provide CSP report-only, anti-framing, MIME, referrer, permissions, and no-store headers.
   - Admin headers include `X-Robots-Tag: noindex, nofollow` and `Cache-Control: private, no-store`.
6. **Disabled API safety gates:** project-level start-position routes return 404 for `/api/storefront/:path*` and `/api/admin/:path*`. Remove or disable the matching gate only as part of the accepted BFF activation sequence, immediately before proving the enabled function on preview and production.
7. **Supabase Auth:** production Site URL and redirect allowlist are still pending. `supabase/config.toml` is prepared evidence only; do not claim callbacks are live until a narrow provider update and real callback test pass.
8. **Persisted-hostname check:** before rewriting any operational URL, run
   `npm.cmd run evidence:map024-hostnames -- <redacted-output-path>` from an
   approved network-enabled owner session. The command is read-only and emits
   only schema/column names and counts for absolute, legacy Vercel, localhost,
   and loopback matches. Classify each match before any bounded migration; never
   perform a blanket replacement.
9. **Sitemap preparation:** use
   `node scripts/map024-evidence/generate-sitemap.mjs --input=<reviewed-catalog-projection.json> --output=<named-output.xml>`
   only with a reviewed, read-only production projection (a top-level JSON
   array of product rows). The generator is
   pinned to `https://www.k2jimzon.com`, includes home/catalog and published
   customer-visible `Live`/`Active` products only, and fails closed on missing
   SKU/image data, unsafe or legacy-host images, duplicate SKUs, or a
   non-canonical origin.
   It does not query Supabase or read environment files. Do not generate or
   deploy `public/sitemap.xml` from local fallback products, fixtures, or an
   unverified database snapshot; validate XML, real-host content type, and
   crawler/rendered behavior after deployment.
10. **Static share metadata:** the prepared `index.html` carries absolute home
    canonical/`og:url`, `og:image`, and Twitter image values for
    `https://www.k2jimzon.com/`. The pure
    `src/lib/storefrontMetadataOrigin.js` resolver preserves localhost and
    unrelated staging origins for local verification, while mapping the apex or
    Vercel preview hosts back to the canonical Storefront origin. The Storefront
    build also prerenders product-specific raw HTML from the exact reviewed
    sitemap projection. Vercel's higher-level rewrites check the filesystem
    first, so a generated product page wins; `/product/:sku` falls back to the
    client entry only for a missing/unpublished SKU. There is no global SPA catch-all.
    Unmatched paths are expected to retain a host 404 and use the target-specific,
    script-free, noindex `404.html`; `verify-build-boundary.mjs` rejects a missing
    or cross-target recovery document. A product must be published in the reviewed
    projection before a page is emitted. This remains local preparation until
    preview and real-host status/body/initial-response/share-card checks pass.
    The home/product fallback image is the reviewed 1200×630
    `public/og-card.png`; do not replace it with SVG. Confirm the deployed
    response reports `image/png` and test at least one real share debugger or
    messaging client before acceptance. The build must also emit a
    target-specific `manifest.json` with `/icon-192.png`, `/icon-512.png`, and no
    opposite-target start URL. Confirm the 180×180 Apple touch icon on a real iOS
    device and one Android install surface; local dimensions alone are not
    installed-device evidence.
11. **Exact-host discovery evidence:** from an owner-authenticated,
    network-enabled session, run
    `npm.cmd run evidence:map024-discovery -- --origin=https://www.k2jimzon.com`
    and add one or more reviewed `--product=<sku>` arguments for representative
    published products. The command performs public GETs only and emits redacted
    status/content-type/check summaries. It fails closed on SPA HTML at crawler
    paths, missing exact robots directives, non-XML sitemap responses,
    disclosure of the private Admin route in robots, non-canonical sitemap URLs,
    missing absolute `/og-card.png` home metadata or product share tags, or
    missing product-specific initial-response metadata. Write the evidence to a
    named path only after reviewing the output; this does not deploy anything.

---

## 5. Rollback Procedures

### Application Rollback
In the Vercel dashboard:
1. Open the affected project (Storefront or Admin).
2. Go to **Deployments** -> select the previous known good deployment -> click **Promote to Production**.
3. Verification: Execute smoke tests against the production host.

### DNS / Routing Rollback
If a domain issue occurs:
1. Revert only the recorded K2 web records at Hostinger to the last captured
   values. Hostinger snapshot `175986373` (27 August 2026 12:30:37Z) preserves
   the pre-cutover apex A `2.57.91.91` and `www` CNAME `k2jimzon.com.` at TTL
   300; `admin` did not exist in that snapshot. Never remove later-added mail
   or verification records as part of a web rollback. A restore must be
   separately rehearsed and verified before it is treated as complete.
2. TTL should be configured to 300s (5 minutes) during cutover windows to allow rapid propagation of rollbacks.
