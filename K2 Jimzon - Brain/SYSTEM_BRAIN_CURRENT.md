# K2 Jimzon — System Brain (Current State)

**Living source of truth. Last updated: 24 July 2026.**

This is the "never get lost" document. It says what the system is, how our real
workflow maps onto it, everything that's been built, exactly what to run, and
what's left to do. When something changes, update this file.

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

## 3. The batch / expiry / location system (built, live)

The heart of inventory tracking. One product (one SKU) has **many lots**, and
each lot carries its own details.

**Each lot records:** quantity, expiry date, cargo box code, landed date,
**hub (where it is)**, **custodian (who holds it)**, **channel (which platform
it's for)**, and a pin flag.

**What it powers:**

- **Total stock** per product = sum of its lots.
- **Expiry alerts** — the 🔔 bell shows any lot nearing/past expiry, with its
  days-left, box, hub, holder and channel. Sell/clear these first.
- **FEFO shipping** — `deduct_stock_fefo()` ships the soonest-to-expire lot
  first (pinned lots prioritised).
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

**Shopee connector** (`supabase/functions/shopee-webhook`) is written and
deploy-ready: it verifies Shopee's signature, writes orders to `orders`, and
flips Shopee to Live. **Pending:** it still needs the `get_order_detail` call to
fill full line items, and it needs the real `SHOPEE_PARTNER_KEY` (issued by
Shopee Open Platform after they approve our developer app). The other four
channels reuse the same verify → write → mark-live pattern.

---

## 5. How data flows once connectors are on

Connectors write into Supabase; the UI reads it live (realtime subscriptions),
so **the moment a connector is connected, everything flows** with no front-end
changes:

- Inventory sync → **`products`** → shows in admin Inventory **and** storefront.
- Incoming orders → **`orders`** → Fulfilment Hub queue + Overview counts.
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

**Functions:** `deduct_stock_fefo(sku, qty)` (FEFO), `is_staff()`
(non-recursive staff check for RLS).

**Enums:** `channel_type` (order channels incl. shopee/lazada/tiktok/website),
`chat_platform` (inbox platforms).

### SQL run order (all idempotent — safe to re-run)

Run these in the Supabase SQL editor in this order. If a fresh database, run
the numbered migrations `0001`–`0018` and the `20260722/23` RLS files first.

1. **`RUN_THIS_master_setup.sql`** — enums + order fields + batch bank + expiry
   + error reports + `is_staff()`.
2. **`RUN_THIS_batch_location_channel.sql`** — adds `channel` to lots + the
   by-hub / by-holder / by-channel views.
3. **`RUN_THIS_channel_connections.sql`** — the Live/Not-connected status table.

All three have been run on the live database as of this update.

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
- **Storefront** — mobile-first globe section, real Italy→Manila flight
  animation, chameleon product backgrounds, unified light/dark theme.

---

## 8. Standing rules & decisions (keep these)

- **Honesty:** no fake "connected" states or fabricated data. If it isn't real,
  the UI says so.
- **Secrets:** never in the browser — only Supabase Edge Function secrets.
- **Admin is the source of truth**; storefront reads from it.
- **FEFO** always — oldest expiry sells first.
- **Stock is per-staff custody across multiple hubs** — not one warehouse.
- **SQL workflow:** Claude writes idempotent `RUN_THIS_*.sql`; you paste-and-run
  them yourself in the Supabase SQL editor.

---

## 9. What's done vs what's next

**Done and live:** batch/expiry/location/holder/channel tracking, FEFO,
inventory breakdown, expiry alerts, honest Channels status board + connect
guide, error monitoring, admin guides + tools, storefront polish, corrected
cargo workflow, connector data contract, Shopee connector scaffold.

**Paused (waiting on us / Shopee approval):**

- Get the **Shopee developer app approved** → obtain `SHOPEE_PARTNER_KEY` →
  put it in Supabase secrets → deploy `shopee-webhook`.
- Finish Shopee **`get_order_detail`** so orders arrive fully populated.
- Clone the connector for **Lazada, TikTok, Meta, WhatsApp**.

**Nice-to-have backlog:** auto-create batch rows from the receiving scan; a
stock-by-location/channel summary panel across all products; harden the Shopee
CSV import to exact export columns; wire consignment data fully live.

---

## 10. Where things live (quick map)

- Admin screens: `src/views/admin/*.jsx` (Inventory = `InventoryGrid.jsx`,
  Channels = `ChannelIntegrations.jsx`, batches = `BatchExpiryManagerModal.jsx`,
  expiry bell = `DailyTaskNotificationDrawer.jsx`).
- Storefront + globe: `src/components/home/*`, `src/components/globe/*`.
- Backend: `supabase/migrations/*` (SQL), `supabase/functions/*` (connectors).
- Reference docs: `CONNECTOR_INTEGRATION_SPEC.md`, `ADMIN_WORKFLOW_BLUEPRINT.md`,
  `SYSTEM_LOGIC_BLUEPRINT.md`, this file.
