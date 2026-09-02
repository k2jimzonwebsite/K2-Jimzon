# K2 Jimzon — Routes & API Endpoints

## 1. Storefront Views (12 States)

| View | Route Path | Component | Description |
| :--- | :--- | :--- | :--- |
| `home` | `/` | `src/views/Home.jsx` | Editorial luxury wood showcase, 3D Globe, and consignment highlights. |
| `catalog` | `/catalog` | `src/views/Catalog.jsx` | Filterable product grid with live stock availability. |
| `master_product` | `/product/:sku` | `src/views/MasterProduct.jsx` | Canonical product deep-link, availability, ingredients, pairing notes, and cart action. |
| `store` | `/store` | `src/views/InteractiveShop.jsx` | Optional lazy interactive shop with a semantic/reduced-motion shopping fallback. |
| `pasabuy` | `/pasabuy` | `src/views/Pasabuy.jsx` | Custom Italian sourcing intake request form. |
| `checkout` | `/checkout` | `src/views/Checkout.jsx` | Passwordless guest order request submission with contact validation. |
| `confirmation` | `/confirmation` | `src/views/Confirmation.jsx` | Post-submission receipt with scoped tracking link. |
| `wholesale` | `/trade` (`/wholesale` accepted) | `src/views/Wholesale.jsx` | B2B tier pricing calculator and commercial inquiry form. |
| `account` | `/account` | `src/views/CustomerAccount.jsx` | Passwordless login (Email/SMS OTP) and guest order claim history. |
| `messages` | `/messages` | `src/views/GuestMessages.jsx` | Scoped universal chat for orders and Pasabuy requests. |
| `contact` | `/contact` | `src/views/Contact.jsx` | Honest directory of official channels (IG, WhatsApp, Viber). |
| `not_found` | Any unknown path | `src/views/NotFound.jsx` | Explicit noindex recovery; never silently substitutes Home. |

`src/lib/storefrontRoutes.js` is the shared source for client parsing/history
and static-host rewrites. Legacy `/cabinet` and `/shop` resolve to `catalog`;
`/wholesale` resolves to `wholesale` alongside canonical `/trade`. The Vercel
Storefront contract rewrites only these registered paths plus a
`/product/:sku` client fallback. Vercel checks the filesystem before the
higher-level rewrite, so generated product HTML wins and only an unpublished or
missing SKU reaches the client `Product unavailable` surface. There is no global
SPA catch-all: every other unmatched host path is expected to retain a real
not-found response and use the Storefront `404.html`; the Admin artifact does the
same outside `/admin-portal-k2-secure`. This is verified local artifact
configuration, not preview/live HTTP-status evidence.

---

## 2. Storefront BFF Endpoints (14 Routes / `api/storefront`)

| Route Name | HTTP Method | Origin Check | Bot Challenge | Rate Limited | Scoped Grant | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `order` | `POST` | Yes | Yes | Yes (DB) | Issued | Submit a new guest order request. |
| `order/status` | `POST` | Yes | No | Yes (DB) | Required | Read only guest-grant-scoped safe order receipt/status fields. |
| `pasabuy` | `POST` | Yes | Yes | Yes (DB) | Issued | Submit a custom Italian sourcing request. |
| `conversation` | `POST` | Yes | Yes | Yes (DB) | Issued | Initiate a general customer inquiry conversation. |
| `message` | `POST` | Yes | No | Yes (DB) | Required | Post a reply to an active customer conversation. |
| `messages` | `POST` | Yes | No | Yes (DB) | Required | Fetch conversation history for a scoped guest grant. |
| `coupon` | `POST` | Yes | No | Yes (DB) | None | Validate promotional coupon codes. |
| `wholesale` | `POST` | Yes | Yes | Yes (DB) | Issued | Submit a commercial wholesale inquiry. |
| `account/auth/email` | `POST` | Yes | Yes | Yes (DB) | None | Request passwordless email magic link. |
| `account/auth/phone` | `POST` | Yes | Yes | Yes (DB) | None | Request passwordless SMS OTP token. |
| `account/auth/verify` | `POST` | Yes | No | Yes (DB) | None | Verify OTP and issue customer session token. |
| `account/claim` | `POST` | Yes | No | Yes (DB) | Required | Claim guest order history into customer account. |
| `account/history` | `POST` | Yes | No | Yes (DB) | None | Fetch verified order history for signed-in customer. |
| `account/message` | `POST` | Yes | No | Yes (DB) | None | Post message from authenticated customer account. |

---

## 3. Admin BOS BFF Endpoints (81 Routes / `api/admin`)

Grouped by operational subsystem:

### 🔑 Authentication & Sessions (9 Routes)
- `auth/login` (`POST`): Staff email + password verification.
- `auth/logout` (`POST`): Terminate session and invalidate cookie.
- `auth/mfa` (`POST`): Verify TOTP factor during login or step-up.
- `auth/password-recovery/request` (`POST`): Pre-auth recovery token request.
- `auth/password-recovery/verify` (`GET`): Verify recovery hash.
- `auth/password-recovery/complete` (`POST`): Set new staff password.
- `session` (`GET`): Validate caller's current cookie session.
- `sessions` (`GET`): List all active staff sessions.
- `sessions/revoke` (`POST`): Revoke a specific staff session.

### 📦 Products, Media & Catalog (11 Routes)
- `overview` (`GET`): Aggregated operational KPIs.
- `products` (`GET`): Filtered master product list.
- `product-master` (`POST`): Create or update master variant attributes.
- `product-media` (`POST`): Upload sanitized public product image.
- `product-media/assign` (`POST`): Assign image to product SKU.
- `product-media/orphans` (`GET`, `POST`): Audit and purge unlinked media.
- `product-knowledge/save` (`POST`): Save reviewed customer-facing product knowledge through the signed Admin boundary.
- `catalog-export` (`GET`): Export full product catalog spreadsheet.
- `catalog-import/preview` (`POST`): Validate/classify an import without canonical writes.
- `catalog-import/commit` (`POST`): Commit the exact reviewed versioned import.
- `catalog-import/status` (`GET`): Recover a bounded redacted import receipt.

### 📱 Phone-First Product Intake (9 Routes)
- `product-intake/consignments` (`GET`): Read the fixed consignment choices available to intake.
- `product-intake/session` (`GET`, `POST`): Create or resume mobile intake wizard session.
- `product-intake/duplicates` (`POST`): Check barcode/name collisions before drafting.
- `product-intake/evidence` (`POST`): Register front/back/barcode camera evidence.
- `product-intake/evidence-cleanup` (`POST`): Reconcile failed upload registrations.
- `product-intake/step` (`POST`): Save checklist progress.
- `product-intake/draft` (`POST`): Atomically assign server SKU and create Draft.
- `product-intake/inventory` (`POST`): Attach flight line or admin opening balance.
- `product-intake/publication` (`POST`): Advance status to Under Review or Live.

### ✈️ Consignments & Flight Manifests (6 Routes)
- `consignments` (`GET`): List flight shipments and box counts.
- `consignments/create` (`POST`): Open a new flight manifest (e.g. `Packing_Italy`).
- `consignments/add-line` (`POST`): Add expected item line to box.
- `consignments/scan` (`POST`): Record barcode scan during Milan packing.
- `consignments/advance` (`POST`): Update flight status (Departed, Landed).
- `consignments/finalize` (`POST`): Reconcile landed items against manifest.

### 🏷️ Inventory Lots & Shelf-Life (3 Routes)
- `lots` (`GET`): List all physical batches with expiry dates.
- `lots/clearance` (`POST`): Staff clearance approval for 31–89 day shelf-life items.
- `lots/reconcile` (`POST`): Log physical discrepancy adjustment with reason.

### 🎟️ Coupons (4 Routes)
- `coupons` (`GET`): Read the fixed staff coupon projection.
- `coupons/create` (`POST`): Create a reasoned coupon through the signed boundary.
- `coupons/state` (`POST`): Activate/deactivate an exact coupon with reason.
- `coupons/archive` (`POST`): Archive an eligible coupon with reason and receipt.

### 🧾 Marketplace Snapshots & Owner Close (11 Routes)
- `marketplace-snapshots/stage` (`POST`): Stage a bounded customer-free listing snapshot for one exact shop; reported quantity remains observation evidence only.
- `marketplace-snapshots/decision` (`POST`): Record an Admin human decision to link, create a server-SKU Draft, or leave a row unresolved.
- `marketplace-snapshots/status` (`GET`): Read the staged import and row-level review state through the private boundary.
- `marketplace-orders/stage` (`POST`): Stage one bounded customer-free order export for an exact shop, retaining duplicate and changed-payload conflict rows without changing inventory.
- `marketplace-orders/status` (`GET`): Recover the immutable order-import summary, product-alias state, and row evidence.
- `owner-close/session` (`GET`, `POST`): Start, resume, or read an Asia/Manila close session for the selected exact shops.
- `owner-close/fees` (`GET`, `POST`): Read exact-shop order evidence and latest estimates, or save a signed versioned fee estimate derived from accepted linked order facts; conflicts/unresolved facts block saving and every result remains explicitly non-settlement/non-accounting.
- `owner-close/coverage` (`GET`, `POST`): Build an Admin-only review proposal from canonical available stock, exact-shop observations, and verified period sales, or save a reasoned include/skip override; neither operation performs a provider or custody write.
- `owner-close/stock` (`GET`, `POST`): Read the canonical stock review and save only a reasoned close decision through its signed boundary.
- `owner-close/pasabuy` (`GET`, `POST`): Read open Pasabuy readiness and save bounded boxing-review decisions without changing canonical request state.
- `owner-close/bookkeeping` (`GET`, `POST`): Prepare/recover the customer-minimized estimate-only handoff; never posts accounting or settlement truth.

### 🚚 Fulfillment & Orders (8 Routes)
- `fulfillment` (`GET`): Order queue by status (Pending, Packing, Shipped).
- `fulfillment/confirm` (`POST`): Confirm customer order availability.
- `fulfillment/transfer-lot` (`POST`): Allocate specific batch to order.
- `fulfillment/assign-box` (`POST`): Package items into outbound parcel.
- `fulfillment/packing-scan` (`POST`): Verify barcode on outbound packaging.
- `fulfillment/payment` (`POST`): Record verified payment reference.
- `fulfillment/delivery` (`POST`): Attach courier tracking number / waybill.
- `fulfillment/fulfill` (`POST`): Complete order delivery handover.

### 💬 Universal Inbox & Pasabuy (9 Routes)
- `inbox` (`GET`): Unified message stream across all channels.
- `inbox/history` (`POST`): Thread message history.
- `inbox/workflow` (`POST`): Send response or update conversation state.
- `inbox/internal-note` (`POST`): Add staff-only private note.
- `inbox/send-reply` (`POST`): Send a signed customer-visible website reply.
- `inbox/mark-read` (`POST`): Update read receipts.
- `pasabuy` (`GET`): Custom sourcing request queue.
- `pasabuy/quote` (`POST`): Issue formal PHP quote and payment link.
- `pasabuy/transition` (`POST`): Advance Pasabuy state (Approved, Purchased, Flying).

### 👥 Customers, Channels, Staff & Security Governance (11 Routes)
- `customers` (`GET`): Read the fixed canonical customer projection with staff identities excluded.
- `staff-access` (`GET`): List authorized staff and roles.
- `staff-access/invite` (`POST`): Issue reason-bound staff invitation.
- `staff-access/mfa-replacement` (`POST`): Reset compromised MFA factor with audit reason.
- `security-events` (`GET`, `POST`): Review redacted intrusion alerts.
- `system-readiness` (`GET`): Boolean-only operational health check.
- `wholesale-inquiries` (`GET`): Commercial inquiry triage queue.
- `wholesale-inquiries/review` (`POST`): Accept or reject wholesale application.
- `globe-cms` (`GET`, `POST`): Update 3D Globe landing nodes and brand highlights.
- `procurement` (`GET`, `POST`): Supplier directory and pricing terms.
- `channels` (`GET`, `POST`): Read readiness and record signed internal verification; it does not create a provider connector.
