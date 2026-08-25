# K2 Jimzon — External Integrations & Connectors

This document describes all third-party systems, cloud infrastructure providers, marketplace connectors, and AI tool integrations.

---

## 1. Cloud Infrastructure & Database

### A. Supabase
- **Role**: Primary database, authentication provider, object storage, and Edge Runtime.
- **Database Engine**: PostgreSQL 17.
- **Row Level Security (RLS)**: Enforced across all public domain tables.
- **Storage Buckets**:
  - `intake-evidence` (Private): Stores staff mobile intake photos (front/back/barcode); accessible only via signed staff URLs.
  - `product-media` (Public): Stores sanitized storefront product visuals after metadata stripping.
- **Edge Functions**:
  - `invite-staff`: AAL2-verified Edge Function for inviting new staff members with strict authorization checks.
  - `shopee-webhook`: Ingress handler for marketplace webhook pushes with 30s body-read deadlines, payload signature verification, and atomic event capture.

### B. Vercel
- **Role**: Hosting platform and Serverless Node.js execution runtime.
- **Deployment Structure**: Two separate production projects:
  - `k2-jimzon-storefront`: Serves customer storefront and Storefront BFF router.
  - `k2-jimzon-admin`: Serves staff Admin BOS and Admin BFF router.
- **Execution Limits**: Configured with 10-second max duration per serverless execution.

---

## 2. Bot Defense & WAF

### Cloudflare Turnstile
- **Role**: Non-intrusive CAPTCHA and bot defense for sensitive guest-facing endpoints (`/api/storefront/order`, `/api/storefront/pasabuy`, `/api/storefront/wholesale`, `/api/storefront/account/auth/*`).
- **Validation Engine**: `server/bot-challenge.js`.
- **Implementation**: The client sends a Turnstile token in headers/body; the server verifies with Cloudflare's API before processing requests.

---

## 3. Marketplace Connectors

### Shopee / Lazada / TikTok Shop Connectors
- **Role**: Synchronization of orders, stock allocation, and catalog updates across external channels.
- **Current State**: Local connector runtime logic implemented in `src/lib/connectorRuntime.js` and `supabase/functions/shopee-webhook/`.
- **Security Invariants**:
  - **Bounded Payloads**: Webhook bodies are strictly capped at 256 KB.
  - **Deterministic Signatures**: Payloads are verified against SHA-256 HMAC webhook secrets.
  - **Replay Protection**: Nonces and timestamps are validated with a 5-minute replay window.

---

## 4. AI & Content Intelligence

### OpenAI ChatGPT Integration
- **Role**: Assists staff during product intake with content extraction and structured JSON normalization.
- **Prompt Specification**: `k2.product-content.v3` (in `src/views/admin/productResearchPrompt.js`).
- **Safety Boundary**: ChatGPT provides **content and attribute suggestions only** (brand, description, origin, ingredients, volume). It is **strictly prohibited** from determining SKUs, prices, stock levels, batch numbers, expiry dates, or publication status. Staff review, accept, or reject each field explicitly.

---

## 5. Environment Variable Contract

| Variable Name | Environment | Sensitivity | Description |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Browser | Safe Public | Supabase API project endpoint. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | Safe Public | Modern Supabase publishable key (browser identifier). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | **CRITICAL SECRET** | Supabase admin key; used only inside protected BFF functions. |
| `K2_ADMIN_BFF_ENABLED` | Server Only | Internal Flag | Feature flag enabling the Admin BFF router (`true` on Admin). |
| `K2_STOREFRONT_BFF_ENABLED` | Server Only | Internal Flag | Feature flag enabling the Storefront BFF router (`true` on Storefront). |
| `K2_ADMIN_COOKIE_SECRET` | Server Only | **CRITICAL SECRET** | AES-256 key used to encrypt Admin staff session cookies. |
| `K2_GUEST_GRANT_SECRET` | Server Only | **CRITICAL SECRET** | Secret used to sign and verify scoped guest grant cookies. |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY`| Server Only | **CRITICAL SECRET** | Secret key for verifying Turnstile bot challenge tokens. |
| `SHOPEE_WEBHOOK_SECRET` | Server Only | **CRITICAL SECRET** | Secret key for verifying incoming Shopee webhook signatures. |
