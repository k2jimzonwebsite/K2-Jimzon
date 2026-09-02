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

## 4. Courier & Delivery Rating

### Current State
**No courier integration exists.** No carrier API is called, no rate table is stored,
and no automatic quote is produced. Shipping is a number a staff member types by hand
into `set_order_delivery_details`
(`supabase/migrations/20260809_operations_hardening.sql`), which then sets
`total_amount = subtotal - discount_amount + p_shipping_amount`. The storefront shows
`Courier delivery - Quoted after review` and never displays a shipping-inclusive total.
This is the documented manual model under `MASTER_ACTION_PLAN.md` gap **G-013**.

### Rating and booking are separate integrations
The distinction governs every decision below.

| Capability | Purpose | Realistic availability |
| :--- | :--- | :--- |
| **Booking / waybill / tracking** | Create a shipment, obtain a waybill number, print a label, poll status | What carrier APIs actually provide |
| **Rate quote** | Price a parcel before it ships | Frequently not exposed; when exposed, often list rates rather than contracted rates |

For an SME merchant in the Philippines the authoritative price is the **contracted rate
card** issued by the carrier account manager - zones by weight bracket - not an API
response. Obtaining API access does not remove the rate card; booking and pricing stay
separate concerns.

### Integration paths

**Path A - Local rate table (recommended for the current testing phase).**
The contracted card is encoded as K2-owned data. No external dependency, no per-request
latency, no failure mode when the carrier is unreachable, and no provider contract
required. Additional carriers are additional rows. Cost: the table must be re-entered
whenever the carrier revises rates, so it carries a staleness risk that needs an owner
review date.

**Path B - Direct carrier API (J&T Express).**
Requires a corporate account and credentials issued by the carrier's business team; it
is contract-gated rather than self-serve. Delivers booking, waybills, and tracking, and
may or may not deliver rating. Each additional carrier is a separate integration with
its own auth scheme, payload shape, and error semantics.

**Path C - Aggregator** (for example Shipmates, Locad, Shippingcart, JuanEx).
One API spanning several carriers, and aggregators commonly do expose cross-carrier rate
endpoints. Fastest path to multi-carrier support. Cost: an added margin, dependence on a
third party's uptime and business continuity, and rates that are the aggregator's rather
than K2's negotiated J&T rates.

### Provider-neutral seam
Whichever path is chosen, callers must depend on one signature so the provider can be
replaced without touching checkout, admin, or order submission:

```
quoteShipping({ destination, items }) -> { amount, carrier, service, source }
```

`source` records provenance (`rate_table`, `jnt_api`, `aggregator`) so any stored quote
remains auditable, and so a quote produced by a table is never mistaken for a
carrier-confirmed price.

### Data prerequisites
These are required by every path and cannot be reconstructed after the fact. They are
the actual blocker on automatic rating - not the integration code.

- **Numeric per-SKU weight and L x W x H dimensions.** `products.net_weight` is currently
  free text (`'1000g'`), which cannot be used for bracket arithmetic. The only numeric
  `weight_kg` column belongs to `pasabuy_quotes`, a separate import-cost flow.
- **Structured destination zone** on the order. `delivery_address` is a single free-text
  field; nothing records Luzon / Visayas / Mindanao. Note that
  `src/views/Checkout.jsx` currently hardcodes `fulfillmentMethod: 'Metro Manila delivery'`
  on every order regardless of address.
- **Charged amount versus actual carrier cost.** Only `shipping_amount` (billed) exists.
  Without the carrier's actual charge stored alongside it, under-quoting is an invisible
  margin loss.

### Chargeable weight
Carriers bill `max(actual weight, volumetric weight)`, where
`volumetric = (L x W x H) / divisor`. The divisor is account-specific and must be
confirmed with the carrier - it is not safe to assume. This disproportionately affects
K2's light, bulky seasonal stock (panettone being the clearest case), where volumetric
weight can exceed actual weight several times over.

### Open questions for the J&T account manager
Unanswered items block any move beyond Path A.

1. Is API access available at K2's volume, and what is the onboarding process?
2. Does the API include a rate-quote endpoint, or only booking and tracking?
3. What is the contracted rate card - zones, first-kg rate, per-additional-kg rate?
4. What volumetric divisor applies to the account?
5. Is COD supported, at what fee, and on what remittance cycle?
6. Which Visayas/Mindanao areas carry surcharges or fall outside coverage?

### Invariants
- A rate-table quote is an **estimate**, never a carrier-confirmed booking, and any UI
  showing it must say so, per the manual-capability rule in G-013.
- No carrier connector is enabled until the owner supplies the provider account, fee
  schedule, rate limits, and sandbox reconciliation evidence required by G-013.
- Carrier credentials are server-only secrets and must never appear in `VITE_` variables
  or browser code.

---

## 5. AI & Content Intelligence

### OpenAI ChatGPT Integration
- **Role**: Assists staff during product intake with content extraction and structured JSON normalization.
- **Prompt Specification**: `k2.product-content.v3` (in `src/views/admin/productResearchPrompt.js`).
- **Safety Boundary**: ChatGPT provides **content and attribute suggestions only** (brand, description, origin, ingredients, volume). It is **strictly prohibited** from determining SKUs, prices, stock levels, batch numbers, expiry dates, or publication status. Staff review, accept, or reject each field explicitly.

---

## 6. Environment Variable Contract

| Variable Name | Environment | Sensitivity | Description |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Browser | Safe Public | Supabase API project endpoint. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | Safe Public | Modern Supabase publishable key (browser identifier). |
| `SUPABASE_URL` | Server Only | Internal | Supabase project endpoint used by the constrained server client. |
| `SUPABASE_PUBLISHABLE_KEY` | Server Only | Public Identifier | Publishable key used by the constrained server client; service-role keys are forbidden in Vercel. |
| `K2_ADMIN_BFF_ENABLED` | Server Only | Internal Flag | Feature flag enabling the Admin BFF router (`true` on Admin). |
| `K2_STOREFRONT_BFF_ENABLED` | Server Only | Internal Flag | Feature flag enabling the Storefront BFF router (`true` on Storefront). |
| `K2_AI_SPEND_CONTROLS_ENABLED` | Server Only | Internal Flag | Keep false until the owner-controlled SuperAdmin paid-AI cap/control boundary and activation evidence pass; it never contains a provider key. |
| `K2_SESSION_COOKIE_KEY` | Server Only | **CRITICAL SECRET** | Base64 32-byte key used to encrypt Admin staff session cookies. |
| `K2_ADMIN_BFF_REQUEST_SECRET` | Server Only | **CRITICAL SECRET** | Base64 32-byte key for Admin request-subject HMACs. |
| `K2_GUEST_BFF_SECRET` | Server Only | **CRITICAL SECRET** | Base64 32-byte secret used for scoped guest grants and request-subject HMACs. |
| `K2_TURNSTILE_SECRET_KEY`| Server Only | **CRITICAL SECRET** | Secret key for verifying Turnstile bot challenge tokens. |
| `SHOPEE_WEBHOOK_SECRET` | Server Only | **CRITICAL SECRET** | Secret key for verifying incoming Shopee webhook signatures. |
