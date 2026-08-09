# K2 Jimzon — System Brain (Current State)

**Living source of truth. Last updated: 9 August 2026 (rev. 3).**

This is the "never get lost" document. It says what the system is, how our real
workflow maps onto it, everything that's been built, exactly what to run, and
what's left to do. When something changes, update this file.

Required operational behavior is defined in
[`OPERATIONS_LOGIC_AND_WORKFLOW.md`](OPERATIONS_LOGIC_AND_WORKFLOW.md). This
System Brain records what is currently implemented; the rulebook records how
completed workflows must behave. Never confuse a rulebook target with a live feature.

Future proposals that are not yet implemented are kept separately in
[`FUTURE_IDEAS.md`](FUTURE_IDEAS.md). Do not treat an entry in that register as
current production behavior until it is completed and incorporated here.

---

## 1. What K2 Jimzon is

K2 Jimzon imports authentic Italian products and sells them in the Philippines.
We are our own brand (not a plain reseller), and we run a **pasabuy-style cargo
model**: products are packed in Italy, flown to the Philippines, received into
hubs, held by specific staff, and sold across our website and marketplaces.

The software is **one project with two faces**:

- **Storefront** — the public website customers buy from.
- **Admin dashboard** — the staff control room; this is the **source of truth**.

**Tech stack:** React + Vite + Tailwind on the front end, **Supabase**
(Postgres + realtime + storage) as the backend, deployed on **Vercel**.
Live project ref: `pixplcjqivlfflickobf`.

---

## 2. Our real operating workflow

This is the actual process the dashboard is built around — not generic
e-commerce:

1. **Pack in Italy** — staff scan items into a cargo box (Milan packing scan).
2. **Confirm shipped** — the Italy side confirms the box has flown out.
3. **Receive in PH** — when the box reaches a hub/warehouse, staff **scan to
   receive** and verify the box contents are complete (discrepancies flagged).
4. **Custody** — received stock is held by a **specific staff member** at a
   **specific hub**. The same product can sit in several hubs with several
   holders at once.
5. **Batches & expiry** — the same product arrives across multiple boxes with
   **different expiry dates**. Each box's stock is its own **batch/lot**.
6. **Sell** — across Website + Shopee/Lazada/TikTok, etc.
7. **Fulfil** — orders land in the Fulfilment Hub; we ship **oldest-expiry
   first (FEFO)**.

There is **no PIN step** — receiving is a scan-to-verify, not a code entry.

---

## 3. The batch / expiry / location system

Current production truth: lot rows, expiry alerts, aggregate inventory, basic
custody fields, exact-lot reservation, unit scanning, and protected custody
transfers are live. The operations hardening and its two security follow-ups
were applied through the migration ledger on 2026-08-10.

The heart of inventory tracking. One product (one SKU) has **many lots**, and
each lot carries its own details.

**Each lot records:** quantity, expiry date, cargo box code, landed date,
**hub (where it is)**, **custodian (who holds it)**, **channel (which platform
it's for)**, and a pin flag.

**What it powers:**

- **Total stock** per product = sum of its lots.
- **Expiry alerts** — the 🔔 bell shows any lot nearing/past expiry, with its
  days-left, box, hub, holder and channel. Sell/clear these first.
- **FEFO allocation target** — confirmation reserves exact eligible lots in
  soonest-expiry order. Pins are attention markers and never override FEFO.
  The legacy `deduct_stock_fefo()` shortcut is intentionally disabled.
- **Inventory breakdown** — each product card in Inventory shows live splits:
  "42 pcs in 3 lots", 📍 by location, 🛒 by channel, 🙋 by holder.

**Where to edit:** Inventory → open a product → **📦 Batches** → add/edit lots
with all their fields.

---

## 4. Channels & connectors (honest status board)

The **Channels** screen shows each marketplace/chat channel as 🟢 **Live** or
⚪ **Not connected** — and the status is *real*, read from the
`channel_connections` table. A channel turns Live automatically the moment its
backend connector processes a real event. No fake "Connected" badges anymore.

**Key architecture rule (do not break):** connectors run on the **backend**
(Supabase Edge Functions) using the **service-role key**. **API keys are never
entered into the dashboard or any browser** — they live only in **Supabase →
Edge Function secrets**. Treat every API key like a password.

**For a non-technical helper:** each not-connected channel has a **"How to
connect"** button with a plain 5-step guide and buttons that jump straight to
the right Supabase page.

**Shopee connector intake** (`supabase/functions/shopee-webhook`) verifies a
signed push and durably queues it without inventing a SKU, quantity, buyer, or
order. It reports **Events only**, not Live, until full order-detail retrieval
and reconciliation work. Deployment still requires approved credentials and
verification against the exact current Shopee signing contract.

---

## 5. How data flows once connectors are on

Connector adapters will write into Supabase and the UI can consume canonical
records live. A captured webhook does not mean the full order/message/waybill
workflow is connected:

- Inventory sync → **`products`** → shows in admin Inventory **and** storefront.
- Incoming events → **`channel_event_inbox`** → detail retrieval and
  idempotent normalization → **`order_requests`** → Fulfilment Hub.
- Incoming messages → **`conversations` + `messages`** → unified Inbox.
- Connector heartbeat → **`channel_connections`** → Channels board turns Live.

Full contract in **`CONNECTOR_INTEGRATION_SPEC.md`**.

---

## 6. Database — what exists

**Core tables:** `products`, `orders`, `conversations`, `messages`,
`user_profiles`, plus supply-chain/consignment/notification tables from the
numbered migrations.

**Added recently:**

- `product_batches` — the batch bank (qty, expiry, box, hub, custodian, channel, pin).
- `channel_connections` — real Live/Not-connected status per channel.
- `error_reports` — client crashes/failed queries logged here.
- `orders` gained `customer_name`, `customer_email`, `total_amount`.

**Views:** `v_product_stock_from_batches`, `v_expiring_batches`,
`v_stock_by_hub`, `v_stock_by_custodian`, `v_stock_by_channel`,
`v_batch_allocations`.

**Functions:** `is_staff()`, exact-lot reservation, order-first unit packing,
non-destructive reconciliation, partial custody transfer, coupon redemption,
and delivery quotation are live. Deprecated direct-stock and ambiguous-scan
RPCs are unavailable to browser roles.

**Enums:** `channel_type` (order channels incl. shopee/lazada/tiktok/website),
`chat_platform` (inbox platforms).

### Migration source of truth

The historical `RUN_THIS_*` files explain earlier setup but are not the current
upgrade path. For this deployed project use the dated additive migrations in
`README.md`. Never rerun the old consolidated script merely to obtain a newer
feature.

### Historical SQL run order

Run these in the Supabase SQL editor in this order. If a fresh database, run
the numbered migrations `0001`–`0018` and the `20260722/23` RLS files first.

1. **`RUN_THIS_master_setup.sql`** — enums + order fields + batch bank + expiry
   + error reports + `is_staff()`.
2. **`RUN_THIS_batch_location_channel.sql`** — adds `channel` to lots + the
   by-hub / by-holder / by-channel views.
3. **`RUN_THIS_channel_connections.sql`** — the Live/Not-connected status table.
4. **`RUN_THIS_auth_roles.sql`** — staff logins: `is_admin()`, RLS on
   `user_profiles`, anti-role-escalation trigger. (Then bootstrap the first
   admin: sign in once, then `update user_profiles set role='Admin' where
   email='…'`.)
5. **`RUN_THIS_product_drafts.sql`** — the AI Sourcing review-queue table.

All have been run on the live database as of this update.

### Logins, roles & 2FA (secure — no backdoors)

Auth is real Supabase Auth (email+password or Google); passwords are bcrypt-
hashed and never seen by us. Access = a live session whose `user_profiles.role`
is Admin or Staff, enforced by RLS. The old localStorage "admin=true" flag,
master passcodes, and `password123` fallback were REMOVED. Accounts are
invite-only (super admin invites → person sets their own password → super admin
sets role in **Staff & Roles**). Admins can enroll TOTP 2FA on their own account.
Backend Edge Function `invite-staff` performs invites (admin-verified).
Supabase Auth URL Configuration must point at the two Vercel sites (storefront +
admin) or OAuth bounces to localhost.

---

## 7. Other things built into the admin

- **Start-here guide** + floating 🧭 **Guide** button — the daily workflow,
  written so staff can self-onboard without being told.
- **Dashboard Guide (AI)** — honest, grounded Q&A about what each screen is for
  (no fabricated data).
- **Floating ⚙️ tools gear** — draggable; calculator, margin, cargo volumetric
  weight, units, VAT 12%, expiry checker, scratchpad, plus a pinned Milan/Manila
  clock and EUR→PHP rate.
- **Error monitoring** — crashes auto-log to `error_reports`; stale-deploy
  chunk errors auto-reload.
- **Scanners** — Milan packing scan, mobile receive scan, discrepancy
  reconciliation, scan-to-AI (all real QR/barcode).
- **AI Sourcing** — dark, mobile, honest review queue reading real
  `product_drafts`. Empty "waiting for drafts from Italy" state; Approve writes
  only real product columns (upsert) and publishes; Reject discards. Backend AI
  feed writes drafts (not wired yet — same pattern as connectors).
- **Design consistency** — a shared `src/components/ui/adminKit.jsx` (one card,
  button, header, alert). All admin panels unified to one surface (`#161922`)
  and hairline borders; screens are mobile-first (44px targets, 16px inputs,
  stacked layouts). Data tables scroll horizontally on phones.
- **Storefront** — mobile-first globe section, real Italy→Manila flight
  animation, chameleon product backgrounds, unified light/dark theme.

---

## 8. Standing rules & decisions (keep these)

- **Honesty:** no fake "connected" states or fabricated data. If it isn't real,
  the UI says so.
- **Secrets:** never in the browser — only Supabase Edge Function secrets.
- **Admin is the source of truth**; storefront reads from it.
- **Luxury wood canvas:** light-mode storefront pages retain `public/wood-bg.jpg`
  behind translucent structural bands. Pure-white page backgrounds are prohibited;
  future redesigns adjust overlay strength instead of removing the texture.
- **FEFO** always — oldest expiry sells first.
- **Shelf-life gate (default enforcement live):** expiry-tracked stock needs at
  least **90 calendar days remaining** for ordinary sale by default.
  Category-specific rules may raise this minimum. Lots with **31–89 days** remaining
  require an explicitly approved, clearly disclosed clearance path; lots with **0–30
  days**, already expired lots, and expiry-tracked lots with an unknown date are not
  sellable and must stay out of available inventory. These are conservative K2 operating
  defaults, not a claim of regulatory sufficiency.
- **Stock is per-staff custody across multiple hubs** — not one warehouse.
- **SQL workflow:** dated additive migrations are rollback-validated and applied
  once through the Supabase migration system. `RUN_THIS_*` files are historical
  references and must not be used as the current upgrade path.

### Current flexible commercial rules

- **Channel direction:** marketplaces remain active acquisition and income channels,
  but K2's near-future objective is to move repeat customers toward direct website
  purchasing. The admin must operate both paths without treating marketplace rules as
  K2-wide rules.
- **Delivery charges:** Shopee, TikTok Shop, Lazada, and other connected channels use
  the delivery charge calculated by that channel. For direct and Pasabuy transactions,
  staff first obtain the applicable courier rate, communicate it to the customer, and
  record the customer's confirmation. A delivery estimate must remain labeled as an
  estimate until the courier amount is known.
- **Customer exceptions:** cancellation, return, exchange, refund, and failed-delivery
  outcomes are handled case by case through direct communication with the customer.
  The system must record the request, conversation, evidence, proposed resolution,
  authorized decision, stock disposition, and final outcome. It must not automatically
  promise a standard result that K2 has not agreed to.
- **Pasabuy pricing:** there is no standard percentage or automatic final-price rule.
  The owner decides the price for each request using factors such as season, scarcity,
  sourcing difficulty, actual item cost, delivery/logistics cost, and other documented
  circumstances. The system may calculate and display cost components, but the final
  quoted price remains a manual owner decision with a recorded reason. Estimated and
  actual costs must remain separate.

---

## 9. What's done vs what's next

**Done and live:** base batch/expiry/location/holder/channel records, inventory
breakdowns, expiry alerts, honest channel status, error monitoring, admin
guides/tools, storefront presentation, persistent order/Pasabuy intake, coupons,
consignment scan events, separate admin/storefront production builds, and the
2026-08-10 operations/security hardening package:

- exact eligible-lot FEFO reservation and one-scan-per-unit packing;
- non-destructive lot reconciliation and exact partial custody transfer;
- repeated SKU across flight boxes/lots and manifest history selection;
- server-backed storefront coupons with confirmation-time redemption;
- actual courier quote/customer-confirmation/waybill fields;
- durable connector event inbox and the Shopee Events-only intake state;
- repair of `orders.sku` from archived `products_old` to current `products`.
- anonymous access limited to reviewed customer submission/coupon RPCs;
- deprecated direct-stock, whole-line packing, and ambiguous scan RPCs locked.

**Paused (waiting on us / Shopee approval):**

- Get the **Shopee developer app approved** → obtain `SHOPEE_PARTNER_KEY` →
  put it in Supabase secrets → deploy `shopee-webhook`.
- Finish Shopee **`get_order_detail`** so orders arrive fully populated.
- Clone the connector for **Lazada, TikTok, Meta, WhatsApp**.
- Deploy `invite-staff` Edge Function (for the in-app invite button; adding
  staff via the Supabase dashboard already works without it).
- Enable **Google** provider in Supabase (needs Google Cloud OAuth credentials).
- Build the **Italy AI feed** that writes into `product_drafts`.

**Approved logic still to complete after hardening:** receiver acceptance
for custody transfers, configurable category shelf-life thresholds, complete
payment-evidence records/files, case-by-case exception workspace, Pasabuy
entity separation, and real marketplace detail/message/waybill adapters.

**Nice-to-have backlog:** auto-create batch rows from the receiving scan; a
stock-by-location/channel summary panel across all products; harden the Shopee
CSV import to exact export columns; wire consignment data fully live.

### Admin assistance layer (local implementation, 10 August 2026)

The admin now includes a no-cost guided operations layer: one operation-first
Scan center, guarded laptop shortcuts, focus-aware copy/paste research prompts
for new product drafts, and a deterministic procedure guide that retrieves up
to three relevant K2 procedures with rulebook citations. The guide is a local
RAG foundation, not a connected external AI, and it does not read live records
or perform state-changing actions. The complete behavior and future
server-backed retrieval plan are recorded in `ADMIN_ASSISTANCE_AND_SHORTCUTS.md`.

---

## 10. Where things live (quick map)

- Admin screens: `src/views/admin/*.jsx` (Inventory = `InventoryGrid.jsx`,
  Channels = `ChannelIntegrations.jsx`, batches = `BatchExpiryManagerModal.jsx`,
  expiry bell = `DailyTaskNotificationDrawer.jsx`).
- Storefront + globe: `src/components/home/*`, `src/components/globe/*`.
- Backend: `supabase/migrations/*` (SQL), `supabase/functions/*` (connectors).
- Reference docs: `CONNECTOR_INTEGRATION_SPEC.md`, `ADMIN_WORKFLOW_BLUEPRINT.md`,
  `SYSTEM_LOGIC_BLUEPRINT.md`, this file.
- Authoritative operations rulebook:
  `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md`.
