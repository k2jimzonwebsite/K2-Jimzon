25 October 2026 / MAP-021 / IDEA-20261025-01 — verified live Dependabot completion

PR27 merged8d210c6fd76841c9a5bafe63b8c6375f288f393c, exact qualified97521c4e treeb17cddcb8ba5af63a3dfbb6713276ac7c85234b5. Motion14.5.0 is verified live on separate Storefront dpl_ERpVAPXXTpq8pNtWGeL5GykrcVd2 and Admin dpl_5dkYVQAKksvBHZNZ9v6s7WeTQWv1, both Ready/Production/custom aliases on that source. Actual hosts200/target-correct/existing Report-Only CSP/security headers pass. Production landing142.51/150.50kB JS and29.98/30.00CSS; thresholds unchanged. Existing deferred GlobeSection supplies/reuses the public provider; identical pure peso helper separates eager labels from legacy catalog data. Admin/combined providers, curation, remote review truth and Motion features remain intact.

Complete1552 browser cases/API/packaging/both builds are reconciled across preserved initial failures and focused/unrun-stage passes, corroborated by exact-head CI40159878284 success. Independent initial/follow-up review and final development0 pass. Original local aggregate1 at obsolete source placement assertion is retained; later one-time customer-rate fixture heading timeout passes unchanged on focused rerun. No original clean aggregate0 or confirmed timeout root cause is claimed.

Owner signed-in Codex browser applies dependency graph/Dependabot alerts/security updates On; actual feed checked25October shows0open/0closed, no open bot PRs. No ignore/dismissal/auto-merge/access/credential/paid-scanner change. Actual new-release globe loads with honest no-published-reviews state; English/Italian search each find5 and partial001173finds1. Actual390pxdark/light checkout has doc375<=390 and0help-submit overlap; Enter opens help, Escape closes/returns focus. Test jar removed/cart0/dark restored. Actual authenticated375px Admin workflow doc360<=375 and current inventory196/130active/66Drafts/273displayedunits pass. Physical counts, real orders/payments and broader operational acceptance remain separate; no live business record was edited.

Fresh exact-K2 owner-checkout identity/readiness9verified/2owner/3script-unreached/0blocked precedes settings and merge. Script-unreached states do not override actual Vercel browser/connector observations. Durable full receipt/source and evidence pins/recovery: docs/acceptance/DEPENDABOT_REMEDIATION_20261025.md and dependabot-20261025/motion145/. Revert only this dependency/provider/formatter/test slice or choose prior per-project14.0 deployments; preserve all canonical data and pending requests. Completed Dependabot action removed from active MAP; no receipt-only build/deployment required.

25October2026 / MAP-021 / IDEA-20261025-01 — monitoring applied and observed

Owner's fix-Dependabot request and explicit use of the signed-in Codex browser admit the existing monitoring follow-up. Actual browser GitHub identity k2jimzonwebsite enables dependency graph, Dependabot alerts and security-update pull requests in K2-Jimzon settings. All three saved On states are observed. Actual alerts feed reports dependency files checked25October2026,0open/0closed. No alert dismissed or ignored and no auto-merge/access/credential/paid scanner setting changed. CLI remains developer EdgerzXc. Fresh owner-checkout read-only K2 gates pass9verified/2owner/3script-unreached/0blocked; first wrong-cwd readiness failure is retained and corrected without copying credentials. Script-unreached connector states remain separate from actual Vercel browser/connector observations. Source14.5 qualification is still running; current live source remains280efb49. Evidence/settings captures and exact recovery: docs/acceptance/DEPENDABOT_REMEDIATION_20261025.md and dependabot-20261025/motion145/. Reversal requires an owner-scoped settings change; preserve all source and canonical data.

# K2 Jimzon — Security Model & Controls

This document details the security architecture, authorization matrices, data boundaries, and threat mitigation mechanisms across the K2 Jimzon platform.

---

## 1. Zero-Trust Threat Model

K2 Jimzon operates under a **defense-in-depth, zero-trust** architecture:
1. **Public Clients are Untrusted**: Front-end browsers (both customer Storefront and staff Admin BOS) are untrusted clients. They cannot be granted direct, unrestrained database write access.
2. **Surface Boundary Separation**: The public Storefront must never have access to staff credentials, supplier pricing, unredacted audit trails, or administrative RPCs.
3. **Fail-Closed Execution**: If an authorization check, rate limit, nonce check, or session decrypt fails, the API immediately halts execution and returns a generic, sanitized error response.

---

## 2. Authentication & Session Security

### A. Staff Admin BOS Authentication
- **Session Tokens**: Encrypted using AES-256-GCM and stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies (`k2_admin_session`).
- **Multi-Factor Authentication (MFA)**: Mandatory TOTP authenticator enrollment for all staff accounts.
- **AAL2 Step-Up Enforcement**: Sensitive mutations (e.g. inviting staff, replacing MFA factors, bulk clearance approvals, manual lot adjustments) strictly require Authenticator Assurance Level 2 (AAL2).
- **Session Revocation**: Active sessions can be instantly invalidated globally or per-device via `k2_private.admin_sessions`.

### B. Guest Commerce & Scoped Grants
- **Passwordless Guest Experience**: Customers can submit order requests and chat with staff without creating accounts.
- **Encrypted Scoped Grants**: Upon submitting an order or Pasabuy request, the server issues an encrypted `k2_guest_grant` cookie. This token is cryptographically scoped *only* to that specific order ID and conversation ID.

---

## 3. Database Security (PostgreSQL & Supabase)

### A. Row Level Security (RLS)
- Every table in the `public` schema has Row Level Security enabled.
- Anonymous (`anon`) role has **SELECT-only** access to live public products and active store settings. All direct `INSERT`, `UPDATE`, and `DELETE` privileges are revoked.
- Staff access is verified through the `is_staff()` and `is_admin()` security helper functions.

### B. Function Hardening & Search Path Hijacking Protection
- All `SECURITY DEFINER` functions explicitly declare `SET search_path = ''`.
- Every table reference inside functions is explicitly schema-qualified (e.g. `public.products`, `k2_private.admin_sessions`).

### C. Private Schema (`k2_private`)
- Internal security tables (`admin_sessions`, `rate_limit_buckets`, `security_events`, `evidence_cleanup_ledger`) reside in `k2_private`, entirely shielded from PostgREST API reflection.

---

## 4. Abuse Prevention & Rate Limiting

- **Domain-Separated HMAC Rate Limits**: Requests are hashed into HMAC-SHA256 tokens using rotating salt keys to prevent user enumeration while strictly enforcing rate buckets across IP addresses, emails, and device fingerprints.
- **Bot Mitigation**: Cloudflare Turnstile bot challenges on all public guest mutation endpoints.
- **Idempotency Gates**: POST mutations enforce unique UUID `Idempotency-Key` headers to prevent double-billing or duplicate stock movement.

---

## 5. Secret Management & Sensitive File Policy

- **No Secrets in Client Bundles**: Scanned automatically by `scripts/scan-secrets.mjs` during prebuild and build steps.
- **Git History Auditing**: `npm run security:history` scans git commit history for accidental token leaks.
- **Sensitive File Protection**: `scripts/verify-tracked-sensitive-files.mjs` enforces that `.env`, `.pem`, `.key`, `.p12`, and database dump files are never tracked in version control.
