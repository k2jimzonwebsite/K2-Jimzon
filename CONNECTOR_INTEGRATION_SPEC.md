# K2 Jimzon — Connector Integration Spec (Data Contract)

**Purpose:** the admin dashboard and storefront are already the "receiving end." They read from
Supabase and listen for **real-time changes** on `products`, `orders`, `conversations`, and
`messages`. So any connector (Shopee / Lazada / TikTok / Meta / Viber / WhatsApp) only needs to
**write incoming data into these tables** — the UI updates live, with no front-end changes.

This doc is the contract: build the backend to match it, and "the moment we connect, it flows."

> **Important:** connectors run on the **backend** (e.g. Supabase Edge Functions or a Node
> service) using the **service-role key** — never the browser. The service role bypasses RLS.
> Never put marketplace secrets in the client.

---

## 1. Inventory sync → `products` (your Inventory Master)

A stock/price update from a marketplace **upserts** into `products` keyed by `sku`. This instantly
reflects in the admin **Inventory** sheet *and* the storefront **catalog** (both read `products`
live).

```sql
insert into public.products (sku, name, srp, wholesale_price, stock_available, status, origin)
values ('LAV-ORO-1KG', 'Lavazza Oro 1kg', 1299, 1020, 26, 'Live', 'Shopee|Beverages')
on conflict (sku) do update set
  srp = excluded.srp,
  stock_available = excluded.stock_available,
  status = excluded.status,
  updated_at = now();
```

Real columns to use: `sku` (PK), `name`, `srp`, `wholesale_price`, `stock_available`, `status`
(`'Live'` to show on the storefront), `primary_image_url`, `secondary_images` (text[]),
`description`, `barcode`, `origin`. **Only `status IN ('Live','Active')` products appear on the
storefront.**

---

## 2. Incoming orders → `orders`

> ⚠️ **Do §4 (enum setup) first.** The `channel_source` values below (`shopee`, `lazada`,
> `tiktok`) must already exist in the `channel_type` enum, or the insert fails with
> `invalid input value for enum channel_type`. The insert below is illustrative — it's what
> the connector does automatically; you don't need to run it by hand.

A new marketplace order **inserts one row per line item** into `orders`. It appears immediately in
the **Fulfilment Hub** queue and the Home **Pending fulfilment** count.

```sql
insert into public.orders
  (sku, quantity, channel_source, fulfillment_method, order_status, payment_status,
   customer_name, customer_email, total_amount)
values
  ('LAV-ORO-1KG', 2, 'shopee', 'J&T Express', 'Pending', 'Paid',
   'Maria Santos', 'maria@example.com', 2598);
```

Columns: `sku` (FK → products.sku), `quantity`, `channel_source` (enum — see §4),
`fulfillment_method` (text), `order_status` (enum, start `'Pending'`), `payment_status` (enum),
`customer_name`, `customer_email`, `total_amount` (line total). Decrement stock via the existing
`decrement_stock(p_sku, p_quantity)` RPC so you never oversell.

---

## 3. Incoming messages → `conversations` + `messages`

An inbound chat from any channel **upserts a conversation** then **inserts a message**. It shows up
live in the admin **Inbox**, tagged by platform.

```sql
-- 1) conversation (one per customer thread)
insert into public.conversations (customer_name, platform, status)
values ('Juan Dela Cruz', 'Shopee', 'Open')
returning id;

-- 2) the message
insert into public.messages (conversation_id, sender_type, content)
values ('<conversation id>', 'Customer', 'Do you have KIKO shade 05 in stock?');

-- keep the thread sorted
update public.conversations set last_message_at = now() where id = '<conversation id>';
```

Columns: `conversations` → `customer_name`, `platform` (enum — see §4), `status` (`'Open'`),
`last_message_at`. `messages` → `conversation_id` (FK), `sender_type` (enum: `'Customer'` inbound /
`'Admin'` outbound), `content`, `is_draft` (bool). Outbound replies from staff already insert with
`sender_type = 'Admin'`; a connector can watch for those and push them back to the marketplace.

---

## 4. Enum readiness (run this before connecting)

`orders.channel_source` and `conversations.platform` are **Postgres enums**. Inserts fail if the
value isn't in the enum. First list what you already have:

```sql
select t.typname as enum_type,
       string_agg(e.enumlabel, ', ' order by e.enumsortorder) as values
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
group by t.typname
order by t.typname;
```

Then add any missing marketplace values (idempotent — safe to run):

```sql
-- channel_source (adjust the type name if your list above shows a different one)
alter type channel_type add value if not exists 'shopee';
alter type channel_type add value if not exists 'lazada';
alter type channel_type add value if not exists 'tiktok';

-- conversation platform (the app already expects these labels)
-- replace <platform_enum> with the enum type name from the query above
alter type <platform_enum> add value if not exists 'Shopee';
alter type <platform_enum> add value if not exists 'Lazada';
alter type <platform_enum> add value if not exists 'TikTok';
alter type <platform_enum> add value if not exists 'Messenger';
alter type <platform_enum> add value if not exists 'Instagram';
alter type <platform_enum> add value if not exists 'Viber';
alter type <platform_enum> add value if not exists 'WhatsApp';
```

The app's accepted platform labels (from `StoreContext.createConversation`) are:
`WhatsApp, Viber, Messenger, Instagram, TikTok, Shopee, Lazada, Website, Pasabuy`.

---

## 5. What's already ready vs what to build

**Ready now (no work needed):**
- The `products` / `orders` / `conversations` / `messages` tables and their real-time
  subscriptions.
- The admin Inventory, Fulfilment Hub, Overview, and Inbox all read these live.
- The storefront catalog reads `products` live.
- CSV import (Inventory → Upload CSV) already maps Shopee export columns for a manual bulk transfer.

**To build (the backend "pipe"), per platform:**
1. Register a developer app (Shopee Open Platform / Lazada Open Platform / TikTok Shop / Meta).
2. OAuth authorization + token storage & refresh (service-side).
3. Webhook endpoints (Edge Functions) that receive order/message/stock events and write them into
   the tables above per this contract.
4. Signature verification + rate-limit handling.
5. Optional outbound: watch `messages` (sender_type='Admin') and `orders` (status changes) to push
   replies / fulfilment back to the marketplace.

Once #3 writes into these tables, the dashboard displays everything live — no front-end changes.
