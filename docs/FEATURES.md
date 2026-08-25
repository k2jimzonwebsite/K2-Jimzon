# K2 Jimzon — Feature Catalog & Implementation Status

This document inventories all major functional features across the K2 Jimzon platform, their technical architecture, and their current delivery status.

---

## 🏷️ Status Classifications

- `STABLE`: Production-ready, fully verified with local and E2E tests, verified boundaries.
- `ACTIVE DEVELOPMENT`: In active development or preparation within the Master Action Plan; local contracts pass; live deployment gated.
- `PROTOTYPE / LOCAL PREPARED`: Prepared in local UI/BFF code with mocked or rehearsed backends; awaiting activation.
- `PLANNED`: Defined in business specifications; implementation queued in Master Action Plan.

---

## 🛍️ Customer Storefront Features

| Feature | Description | Surface / Route | Status |
| :--- | :--- | :--- | :--- |
| **Luxury Wood Catalog** | Curated grid of authentic Italian items with dynamic stock counts derived from active batches. | `/catalog`, `/` | `STABLE` |
| **Interactive 3D Globe** | WebGL Three.js interactive globe showing Milan-to-Manila cargo routes and European origins. | `/` (Hero) | `STABLE` |
| **Editorial Product Detail** | Rich product presentation with origin stories, ingredient provenance, and Italian pairing notes. | `/product/:id` | `STABLE` |
| **Guest Checkout Order Flow** | Seamless order request without mandatory sign-up; issues scoped `HttpOnly` guest grant cookie. | `/checkout` | `STABLE` |
| **Pasabuy Sourcing Wizard** | Form for requesting custom Italian items (photo, URL, max budget, urgency). | `/pasabuy` | `STABLE` |
| **Scoped Universal Messaging** | Order status tracking and direct customer-to-staff messaging via scoped guest grant token. | `/messages` | `STABLE` |
| **Passwordless Customer Account** | Email magic-link & SMS OTP sign-in with verified claim of previous guest order history. | `/account` | `ACTIVE DEVELOPMENT` (MAP-019) |
| **Wholesale Tier Inquiry** | Tier pricing calculator and bulk inquiry intake form. | `/wholesale` | `STABLE` |
| **Verified Contact Directory** | Honest contact channel directory (Instagram, WhatsApp, Viber) with live availability truth. | `/contact` | `STABLE` |

---

## 💼 Staff Admin BOS Features

| Feature | Description | Surface / Modal | Status |
| :--- | :--- | :--- | :--- |
| **Operational Overview** | Daily KPIs, low-stock warnings, unread customer chats, pending pasabuy requests. | `Overview.jsx` | `STABLE` |
| **FEFO Inventory Grid** | Batch-aware inventory table with shelf-life badges, stock filters, and custodian allocation. | `InventoryGrid.jsx` | `STABLE` |
| **Sheet Mode Editor** | High-density keyboard-navigable tabular inventory and pricing editor. | `Sheet.jsx` | `STABLE` |
| **Phone-First Product Intake** | Mobile-first camera evidence capture (front/back/barcode), AI prompt assistant, server SKU gate. | `ProductIntakeSessionModal` | `ACTIVE DEVELOPMENT` (MAP-018) |
| **Milan Packing Scanner** | Barcode scanning wizard for assembling physical cargo boxes in Italy. | `MilanPackingScannerModal` | `STABLE` |
| **Manila Receiving Scanner** | Receiving verification and discrepancy reconciliation for landed cargo flights. | `DiscrepancyReconciliation` | `STABLE` |
| **Consignment Manager** | Flight manifest tracking, box weight/dimensions, line item allocation. | `ConsignmentManager.jsx` | `STABLE` |
| **Universal Inbox** | Multi-channel messaging hub for responding to guest inquiries, Pasabuy chats, and orders. | `Inbox.jsx` | `STABLE` |
| **Pasabuy Sourcing Manager** | Quoting, conversion, deposit tracking, and flight assignment for custom requests. | `PasabuyManager.jsx` | `STABLE` |
| **Staff RBAC & MFA** | Staff invitation, role assignment (Admin, Staff), TOTP enrollment, and AAL2 step-up auth. | `StaffPermissionManager` | `ACTIVE DEVELOPMENT` (MAP-019) |
| **Catalog Spreadsheet I/O** | Safe multi-variant catalog export, validation preview, and atomic batch commit. | `BulkCsvImportModal` | `STABLE` |
| **Shopee Webhook Ingress** | Bounded body ingress handler for marketplace order synchronization. | `supabase/functions/shopee-webhook` | `ACTIVE DEVELOPMENT` (MAP-020) |
| **Canonical PO Receiving** | Full supplier purchase order lifecycle and direct supplier receipt reconciliation. | MAP-023 | `PLANNED` |
