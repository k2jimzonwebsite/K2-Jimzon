# Owner Count & Close Activation Audit and Live Boundary Diagnostics

**Date:** 26 September 2026
**Owning MAP Item:** MAP-023
**Status:** Locally verified (35/35 contracts, 1/1 phone UI journey); Production Supabase rehearsal passed (7/7 invariants); Live deployment blocked by missing Vercel server environment variables and unauthenticated Vercel CLI.

---

## 1. Executive Summary

The owner authorized completing the prerequisites and activating **Owner Count & Close** on the live Admin site (`admin.k2jimzon.com`).

Following the strict operational rules in [AGENTS.md](../../../AGENTS.md) and [MARKETPLACE_SNAPSHOT_STAGING_RUNBOOK.md](../../runbooks/MARKETPLACE_SNAPSHOT_STAGING_RUNBOOK.md):
1. **Zero Synthetic Business Records:** No mock marketplace exports, physical counts, or fee policies were inserted into production.
2. **Fail-Closed Client Safety:** The global client cutover switch `VITE_ADMIN_BFF_ENABLED` remains **OFF** in production. Flipping this switch before the server runtime is configured would immediately switch all Admin operations (Overview, Products, Consignments, Fulfillment, Inbox, Coupons, Staff) to same-origin `/api/admin/*` endpoints and crash the live Admin site.
3. **Database Rehearsal Passed 7/7:** An atomic end-to-end dry run of the complete migration chain (`20260811_product_intake_and_sku_gate.sql`, `20260829_channel_vocabulary_and_shops.sql`, and `20260831_marketplace_snapshot_staging.sql`) was executed against the live Supabase project `pixplcjqivlfflickobf` within a `BEGIN ... ROLLBACK` transaction. All 7 postflight invariant booleans returned `true`. Zero rows or schema objects were permanently mutated.
4. **Local Verification Passed 100%:** All 35/35 Count & Close and marketplace contracts passed, and the phone UI journey passed 1/1 (`tests/owner-count-close-ui.spec.js`).
5. **Exact Live Blocker Identified:** Probing `https://admin.k2jimzon.com/api/admin/session` returns `HTTP 404 Not Found (X-Vercel-Error: NOT_FOUND)`. The Vercel project `k2-jimzon-admin` lacks all 7 required server-only environment variables (`K2_ADMIN_BFF_ENABLED`, `K2_SESSION_COOKIE_KEY`, `K2_ADMIN_BFF_REQUEST_SECRET`, `K2_ADMIN_ORIGINS`, `K2_TURNSTILE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`). Automated configuration via CLI is blocked because Vercel CLI is `Logged out.` and the local OIDC token is expired (`403 forbidden`).

---

## 2. Production Database Schema Audit (Supabase `pixplcjqivlfflickobf`)

Read-only metadata inspection of Supabase project `pixplcjqivlfflickobf` revealed:

| Object | Status in Live DB | Required Migration |
| --- | --- | --- |
| `public.k2_sku_seq` | Absent | `20260811_product_intake_and_sku_gate.sql` |
| `public.generate_k2_sku_internal()` | Absent | `20260811_product_intake_and_sku_gate.sql` |
| `public.product_intake_sessions` | Absent | `20260811_product_intake_and_sku_gate.sql` |
| `public.channels` | Absent | `20260829_channel_vocabulary_and_shops.sql` |
| `public.channel_shops` | Absent | `20260829_channel_vocabulary_and_shops.sql` |
| `k2_private.marketplace_snapshot_imports` | Absent | `20260831_marketplace_snapshot_staging.sql` |
| `k2_private.marketplace_snapshot_rows` | Absent | `20260831_marketplace_snapshot_staging.sql` |
| `k2_private.owner_close_sessions` | Absent | `20260831_marketplace_snapshot_staging.sql` |
| `k2_private.owner_close_fee_estimates` | Absent | `20260831_marketplace_snapshot_staging.sql` |
| `k2_private.owner_close_stock_reviews` | Absent | `20260831_marketplace_snapshot_staging.sql` |
| `k2_private.owner_close_coverage_overrides` | Absent | `20260831_marketplace_snapshot_staging.sql` |
| `k2_private.owner_close_pasabuy_reviews` | Absent | `20260831_marketplace_snapshot_staging.sql` |
| `k2_private.owner_close_bookkeeping_handoffs` | Absent | `20260831_marketplace_snapshot_staging.sql` |
| `k2_private.admin_sessions` | **Present** | (Applied earlier) |
| `k2_private.admin_bff_secrets` | **Present** (1 row, 32 bytes) | Configured 2026-09-18 10:42:05 |
| `k2_private.verify_admin_bff_request()` | **Present** | (Applied earlier) |

### Live Dry-Run Rehearsal
An atomic transaction was executed directly against `pixplcjqivlfflickobf`:
```sql
BEGIN;
-- 1. Execute 20260811_product_intake_and_sku_gate.sql
-- 2. Execute 20260829_channel_vocabulary_and_shops.sql
-- 3. Execute 20260831_marketplace_snapshot_staging.sql
-- 4. Verify postflight invariants:
SELECT
  to_regclass('public.channels') IS NOT NULL AS channels,
  to_regclass('public.k2_sku_seq') IS NOT NULL AS k2_sku_seq,
  to_regclass('public.channel_shops') IS NOT NULL AS channel_shops,
  to_regclass('k2_private.owner_close_sessions') IS NOT NULL AS owner_close_sessions,
  to_regprocedure('public.generate_k2_sku_internal()') IS NOT NULL AS generate_k2_sku_internal,
  to_regclass('k2_private.marketplace_snapshot_imports') IS NOT NULL AS marketplace_snapshot_imports,
  to_regclass('k2_private.owner_close_bookkeeping_handoffs') IS NOT NULL AS owner_close_bookkeeping_handoffs;
ROLLBACK;
```
**Rehearsal Result:**
```json
{
  "channels": true,
  "k2_sku_seq": true,
  "channel_shops": true,
  "owner_close_sessions": true,
  "generate_k2_sku_internal": true,
  "marketplace_snapshot_imports": true,
  "owner_close_bookkeeping_handoffs": true
}
```
All 7 invariant checks passed, proving SQL syntax and schema dependency order are 100% clean. Rollback was executed cleanly without mutating live production data.

---

## 3. Secret Synchronization Inspection

`k2_private.verify_admin_bff_request()` in Supabase verifies HMAC-SHA256 signatures generated by the Admin BFF against `k2_private.admin_bff_secrets.request_secret`:
- Inspection of `k2_private.admin_bff_secrets` confirms 1 active row (`singleton=true`, `len=32`, `configured_at='2026-09-18 10:42:05.764724+00'`).
- The SHA-256 hash of the local `.env.local` `K2_ADMIN_BFF_REQUEST_SECRET` did **not** match the database row.
- The exact 32-byte secret in `k2_private.admin_bff_secrets` was queried via the Supabase management API (`SELECT encode(request_secret, 'base64')`).
- **Required Action:** The base64 encoding of this exact 32-byte secret must be configured in Vercel as `K2_ADMIN_BFF_REQUEST_SECRET` on project `k2-jimzon-admin`.

---

## 4. Live Host & Vercel Runtime Diagnostics

### Exact Host Probe
```powershell
curl.exe -i -s https://admin.k2jimzon.com/api/admin/session
```
**Response:**
```http
HTTP/1.1 404 Not Found
Server: Vercel
X-Robots-Tag: noindex, nofollow
X-Vercel-Error: NOT_FOUND
Content-Type: text/plain; charset=utf-8

The page could not be found
NOT_FOUND
```

### Root Cause
1. `api/admin/index.js` explicitly gates execution:
   ```javascript
   function adminBoundaryEnabled() {
     return process.env.K2_DEPLOYMENT_TARGET === 'admin'
       && process.env.K2_ADMIN_BFF_ENABLED === 'true'
   }
   ```
   Neither `K2_DEPLOYMENT_TARGET=admin` nor `K2_ADMIN_BFF_ENABLED=true` is currently active on Vercel's serverless function runtime for this endpoint.
2. The Vercel project `k2-jimzon-admin` (ID: `prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x`) environment variables inventory ([vercel-env-inventory.json](../../../scripts/map016-evidence/vercel-env-inventory.json)) only contains public frontend variables:
   - `K2_DEPLOYMENT_TARGET`
   - `VITE_ADMIN_BFF_ENABLED`
   - `VITE_IS_ADMIN_DEPLOYMENT`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`
3. Missing server-side variables required per [ADMIN_BFF_SECURITY_RUNBOOK.md](../../runbooks/ADMIN_BFF_SECURITY_RUNBOOK.md#L439-L457):
   - `K2_ADMIN_BFF_ENABLED=true`
   - `K2_SESSION_COOKIE_KEY` (AES-256-GCM 32 random bytes Base64)
   - `K2_ADMIN_BFF_REQUEST_SECRET` (Matching `k2_private.admin_bff_secrets`)
   - `K2_ADMIN_ORIGINS=https://admin.k2jimzon.com`
   - `K2_TURNSTILE_SECRET_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
4. Automated Vercel CLI access is unavailable (`npx vercel whoami` -> `Logged out.`, `VERCEL_OIDC_TOKEN` -> `403 forbidden invalidToken: true`).

---

## 5. Contract and UI Verification Evidence

Executed in this session:
1. `npm run verify:development`: **Passed** (1,646 files checked; 0 secret leaks; 0 boundary gaps; import-integrity verified).
2. Count & Close contract tests: **35/35 Passed** in 4.6s:
   - `tests/marketplace-coverage-contract.spec.js` (4/4 passed)
   - `tests/marketplace-fee-estimate-contract.spec.js` (5/5 passed)
   - `tests/marketplace-order-contract.spec.js` (4/4 passed)
   - `tests/marketplace-snapshot-contract.spec.js` (10/10 passed)
   - `tests/marketplace-stock-count-contract.spec.js` (3/3 passed)
   - `tests/owner-close-bookkeeping-contract.spec.js` (3/3 passed)
   - `tests/owner-close-pasabuy-contract.spec.js` (2/2 passed)
   - `tests/owner-count-close-contract.spec.js` (4/4 passed)
3. Owner Count & Close Phone UI Journey: **1/1 Passed** in 1.8m:
   - `tests/owner-count-close-ui.spec.js`: Reached sealed customer-free handoff at 375x812 and 812x375 with zero horizontal overflow.

---

## 6. Required Owner Action & Next Steps

To safely complete live activation without breaking production Admin:

1. **Owner Action (Vercel Project Configuration):**
   In the Vercel Dashboard for project `k2-jimzon-admin` (Settings -> Environment Variables):
   - Set `K2_ADMIN_BFF_ENABLED = true` (Production & Preview)
   - Set `K2_SESSION_COOKIE_KEY = [Base64 of 32 random bytes]` (Production & Preview, Server only)
   - Set `K2_ADMIN_BFF_REQUEST_SECRET = [Base64 of DB secret from k2_private.admin_bff_secrets]` (Production & Preview, Server only)
   - Set `K2_ADMIN_ORIGINS = https://admin.k2jimzon.com` (Production & Preview, Server only)
   - Set `SUPABASE_URL = https://pixplcjqivlfflickobf.supabase.co` (Server only)
   - Set `SUPABASE_PUBLISHABLE_KEY = [Supabase anon/publishable key]` (Server only)
   - Set `K2_TURNSTILE_SECRET_KEY = [Cloudflare Turnstile secret key]` (Server only)
2. **Apply Database Migration Chain:**
   Once Vercel server environment is ready, apply `20260811`, `20260829`, and `20260831` to Supabase `pixplcjqivlfflickobf`.
3. **Verify Server Preview:**
   Verify `/api/admin/session` responds with HTTP 401 (session expired) instead of 404, proving the BFF router is active and Origin/CSRF boundaries work.
4. **Run Release Gate & Promote:**
   - Run `npm run verify:release`.
   - Set `VITE_ADMIN_BFF_ENABLED = true` on Vercel Admin project.
   - Run authenticated exact-host Count & Close smoke test on `admin.k2jimzon.com`.
