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
