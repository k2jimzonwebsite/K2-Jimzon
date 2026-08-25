# K2 Jimzon — Routes & API Endpoints

## 1. Storefront Views (11 Views)

| View | Route Path | Component | Description |
| :--- | :--- | :--- | :--- |
| `home` | `/` | `src/views/Home.jsx` | Editorial luxury wood showcase, 3D Globe, and consignment highlights. |
| `catalog` | `/catalog` | `src/views/Catalog.jsx` | Filterable product grid with live stock availability. |
| `product` | `/product/:id` | `src/views/ProductDetail.jsx` | Product variant view, ingredients, pairing notes, and cart action. |
| `master_product` | `/master-product/:sku` | `src/views/MasterProduct.jsx` | Canonical variant deep-link with batch-level transparency. |
| `pasabuy` | `/pasabuy` | `src/views/Pasabuy.jsx` | Custom Italian sourcing intake request form. |
| `checkout` | `/checkout` | `src/views/Checkout.jsx` | Passwordless guest order request submission with contact validation. |
| `confirmation` | `/confirmation` | `src/views/Confirmation.jsx` | Post-submission receipt with scoped tracking link. |
| `wholesale` | `/wholesale` | `src/views/Wholesale.jsx` | B2B tier pricing calculator and commercial inquiry form. |
| `account` | `/account` | `src/views/CustomerAccount.jsx` | Passwordless login (Email/SMS OTP) and guest order claim history. |
| `messages` | `/messages` | `src/views/GuestMessages.jsx` | Scoped universal chat for orders and Pasabuy requests. |
| `contact` | `/contact` | `src/views/Contact.jsx` | Honest directory of official channels (IG, WhatsApp, Viber). |

---

## 2. Storefront BFF Endpoints (13 Routes / `api/storefront`)

| Route Name | HTTP Method | Origin Check | Bot Challenge | Rate Limited | Scoped Grant | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `order` | `POST` | Yes | Yes | Yes (DB) | Issued | Submit a new guest order request. |
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

## 3. Admin BOS BFF Endpoints (68 Routes / `api/admin`)

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

### 📦 Products & Media (8 Routes)
- `overview` (`GET`): Aggregated operational KPIs.
- `products` (`GET`): Filtered master product list.
- `product-master` (`POST`): Create or update master variant attributes.
- `product-media` (`POST`): Upload sanitized public product image.
- `product-media/assign` (`POST`): Assign image to product SKU.
- `product-media/orphans` (`GET`, `POST`): Audit and purge unlinked media.
- `catalog-export` (`GET`): Export full product catalog spreadsheet.
- `catalog-import/*` (`POST`): Preview, commit, and monitor catalog import jobs.

### 📱 Phone-First Product Intake (8 Routes)
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

### 🚚 Fulfillment & Orders (8 Routes)
- `fulfillment` (`GET`): Order queue by status (Pending, Packing, Shipped).
- `fulfillment/confirm` (`POST`): Confirm customer order availability.
- `fulfillment/transfer-lot` (`POST`): Allocate specific batch to order.
- `fulfillment/assign-box` (`POST`): Package items into outbound parcel.
- `fulfillment/packing-scan` (`POST`): Verify barcode on outbound packaging.
- `fulfillment/payment` (`POST`): Record verified payment reference.
- `fulfillment/delivery` (`POST`): Attach courier tracking number / waybill.
- `fulfillment/fulfill` (`POST`): Complete order delivery handover.

### 💬 Universal Inbox & Pasabuy (7 Routes)
- `inbox` (`GET`): Unified message stream across all channels.
- `inbox/history` (`POST`): Thread message history.
- `inbox/workflow` (`POST`): Send response or update conversation state.
- `inbox/internal-note` (`POST`): Add staff-only private note.
- `inbox/mark-read` (`POST`): Update read receipts.
- `pasabuy` (`GET`): Custom sourcing request queue.
- `pasabuy/quote` (`POST`): Issue formal PHP quote and payment link.
- `pasabuy/transition` (`POST`): Advance Pasabuy state (Approved, Purchased, Flying).

### 👥 Staff Access & Security Governance (9 Routes)
- `staff-access` (`GET`): List authorized staff and roles.
- `staff-access/invite` (`POST`): Issue reason-bound staff invitation.
- `staff-access/mfa-replacement` (`POST`): Reset compromised MFA factor with audit reason.
- `security-events` (`GET`, `POST`): Review redacted intrusion alerts.
- `system-readiness` (`GET`): Boolean-only operational health check.
- `wholesale-inquiries` (`GET`): Commercial inquiry triage queue.
- `wholesale-inquiries/review` (`POST`): Accept or reject wholesale application.
- `globe-cms` (`GET`, `POST`): Update 3D Globe landing nodes and brand highlights.
- `procurement` (`GET`, `POST`): Supplier directory and pricing terms.
