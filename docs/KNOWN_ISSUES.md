# K2 Jimzon — Known Technical Debt & Open Owner Decisions

This document tracks active technical debt, pending architectural migrations, and business decisions awaiting explicit owner approval in `K2 Jimzon - Brain/OWNER_QUESTIONS.md`.

---

## 🏛️ Gated Owner Decisions (Awaiting Approval)

| Decision ID | Summary | Impacted MAP Item | Current Status |
| :--- | :--- | :--- | :--- |
| **`OWNER-001`** | **Production Domains & DNS**: Hostinger/Vercel mapping for Storefront (`k2jimzon.com`, `www.k2jimzon.com`) and Admin (`admin.k2jimzon.com`). | MAP-024 | DNS and custom hosts applied; Auth allowlists, crawler assets, and real-host acceptance remain open. |
| **`OWNER-002`** | **Reservation Hold Policy**: Timeout for unpaid order reservations. | MAP-023 | **Answered 2 Sep 2026.** A cart holds no stock at any age; a hold is 30 minutes from the purchase click; staff extensions run 30 minutes to 7 days; Pasabuy and wholesale take no hold and record history instead. Implemented in `src/lib/reservationPolicy.js`. |
| **`OWNER-003`** | **Wholesale Terms & Tiers**: MOQ, tier discounts, credit terms, and the public response-time claim. | MAP-023 | **Partially answered 2 Sep 2026.** Wholesale and Pasabuy are roles on signed-in customers; wholesale stays **manual quote only** with no tier table and **no credit**. Still blocking: the exact promised response time and the business hours it is measured against. Until then every surface says `Staff review required`. |
| **`OWNER-004`** | **Official Contact Channels**: Public phone / Viber / WhatsApp details. | MAP-023 | **Answered 2 Sep 2026.** One number carries calls, SMS, Viber, and WhatsApp. **Not yet published:** acceptance requires testing every generated `tel:`, Viber, and `wa.me` link from a real phone and confirming both accounts are installed and monitored. |
| **`OWNER-007`** | **Paid AI Product-Intake Controls**: Model tier and spend ceilings for AI-assisted intake. | MAP-018 / MAP-027 | **Answered 2 Sep 2026.** Premium configuration approved with a USD 100 monthly ceiling and derived per-product/per-session caps. `gpt-image-1` retires 23 Oct 2026 and must not be named as the approved snapshot. Enforced in `src/lib/aiSpendControls.js`. |
| **`OWNER-005`** | **Public-Write Boundary Production Migration**: Authorization to apply prepared DDL hardening to production Supabase. | **MAP-017** | **Authorized 26 Aug; the named database/Storage backups, isolated restores, off-site checksum/reassembly, and retrieved-envelope decryption are verified. Only the owner's password-manager/offline-copy custody and current Google 2-Step Verification recovery confirmation remain. See `docs/OWNER_ACTION_HANDOFF.md` §1.** |
| **`OWNER-006`** | **Customer Data Retention Policy**: Bounded retention period for guest order contact info. | MAP-019 / Runbook | **Deliberately deferred by the owner 2 Sep 2026** pending Philippine accounting/tax advice. Consequence, recorded rather than hidden: every operational record is preserved, so K2 **cannot yet honour a data-deletion request**. No privacy workflow is active and none is claimed in the UI. Must be revisited before any published privacy notice promises erasure. |

---

## 🛠️ Active Technical Debt & Refactoring Queue

### 1. Production DDL Apply Gate (`MAP-017`)
- **Status**: Exhaustive live schema audit completed (55 findings recorded in `MAP_017_EXHAUSTIVE_AUTHORIZATION_AUDIT_2026-08-22.md`).
- **Remediation**: Hardening migration, preflight, rollback, and idempotent replay pass 100% on isolated PostgreSQL 17.11 loopback (`npm run verify:map017-portable`). Permanent apply to production database is fail-closed pending the one remaining `OWNER-005` owner recovery-access confirmation.
- **Live exposure, unclosed**: until this migration is applied, the anonymous role holds write privileges on `brands`, `categories`, `warehouses`, `product_drafts`, and `products_old`, whose RLS policies are blanket `ALL USING(true)` rules that restrict nothing; and the `product-images` bucket carries anyone-can-upload/update/delete policies with no size limit or MIME allowlist. This is an open production hole, not a queued improvement.

### 1a. Delivery Quotation Migrations — apply state unrecorded (`MAP-023`)
- **Status**: **Unknown, and that is the defect.** Five migrations dated
  2026-09-02 exist in `supabase/migrations/`:
  `20260902_delivery_quote_control.sql`, `20260902_delivery_quote_admin_command.sql`,
  `20260902_delivery_guest_quote_boundary.sql`, `20260902_delivery_quote_pilot_seed.sql`,
  and `20260902_product_shipping_dimensions.sql`. They came from commit
  `38038f6`, which is still unpushed.
- **Why it is listed here**: no authoritative record states whether any of them is
  applied to production. This section exists precisely to distinguish prepared
  work from permanently applied database state, and these five appear in neither
  state. `AGENTS.md` forbids collapsing those into a generic claim, so the honest
  entry is that the state is unknown rather than an assumed "prepared".
- **What is true in source**: the exact-locality pilot resolver
  (`src/lib/deliveryQuote.js`), its server-side twin, the Admin rate register
  (`src/views/admin/DeliveryRateControl.jsx`), and 31 passing local contracts
  including a JS/SQL parity suite. Local evidence only.
- **Required next action**: read the live migration ledger and record the result
  here, before any further delivery migration is written on top of these. MAP-023
  carries a weight-banding item (`IDEA-20260902-03`) that would add a sixth.

### 1b. Virtual Store & Product Knowledge Apply Gate (`MAP-027`)
- **Status**: Three migrations are prepared and unapplied to production:
  `20260828_store_conversation_origin.sql`, `20260828_virtual_store_live_chat.sql`,
  and `20260828_product_knowledge_boundary.sql`.
- **What is true in source**: the virtual-store chat writes to the canonical
  conversations table with a `virtual_store_message` source kind; staff replies
  travel one signed BFF path and are returned to the customer by the existing
  scoped guest reader; approved product knowledge and FAQs are stored in
  `product_knowledge` / `product_knowledge_faqs`, readable by the public only
  when `status = 'approved'`, and writable only through a signed staff command.
- **What is not yet true**: none of it is live until the migrations are applied.
  Both surfaces fail closed and say so — the admin inbox shows "Website reply
  migration pending" and disables sending, and product panels render the honest
  unavailable state rather than inventing copy.
- **Rehearsed**: `npm run rehearse:product-knowledge` applies the knowledge
  migration to an isolated PostgreSQL 17.11 loopback, replays it for
  idempotency, and asserts 9 boundary properties (anonymous readers see approved
  rows only and cannot write; non-staff cannot publish; empty approvals and
  unknown SKUs are refused; a save replaces rather than merges).
- **Blocked by**: the same production DDL gate as `OWNER-005`.
- **Also required before either is live**: `VITE_GUEST_BFF_ENABLED` and
  `VITE_ADMIN_BFF_ENABLED` must be confirmed `true` in the deployed
  environments. These could not be verified from the repository.

### 2. Provider Quotas & Edge Timeouts (`MAP-020`)
- **Status**: All BFF endpoints enforce strict 10s execution timeouts and payload caps (256 KB on webhooks, 4 MB on private photo evidence).
- **Future Improvement**: Add streaming upload support directly to S3/Supabase Storage for multi-gigabyte video evidence if required.

### 3. Marketplace Webhook Live E2E Verification (`MAP-020`)
- **Status**: Shopee webhook ingress function (`supabase/functions/shopee-webhook`) passes unit and boundary contract tests.
- **Next Step**: Connect live Shopee Open Platform test environment once developer credentials are provisioned by owner.
