# Pre-hardening connector reference

This contract documents the earlier direct-table connector shape. New connector
work must follow `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md`, including
durable raw events, idempotency, canonical orders, atomic reservations, retries,
dead-letter handling, and capability-specific health. Update this contract before
using it for a production connector.

## Prepared canonical channel and shop identity (29 August 2026)

The legacy examples below remain historical and must not be used as an
implementation recipe. The prepared replacement migration
`20260829_channel_vocabulary_and_shops.sql` establishes:

- canonical channel codes: `website`, `pasabuy`, `manual`, `shopee`, `lazada`,
  and `tiktok`;
- one private `channel_shops` record for every seller account, so a second
  Shopee/Lazada/TikTok shop never shares identity with the first;
- `order_requests.channel_source` and `channel_listings.channel_source` foreign
  keys to the canonical vocabulary;
- required same-channel shop identity on marketplace orders and forbidden shop
  identity on Website, Pasabuy, or manual orders;
- listing uniqueness per shop and external marketplace-item uniqueness within
  each shop.

Adapters still capture durable provider evidence first and normalize through a
reviewed service-only command. They do not write the historical `orders`
example below, decrement product columns directly, or infer a missing shop. The
migration passes 12 isolated PostgreSQL behavior/access/index checks but is not
applied to production; no marketplace adapter is thereby connected.

# K2 Jimzon — Connector Integration Spec (Data Contract)

**Purpose:** define how a connector captures attributable shop evidence and
normalizes it through K2's reviewed service boundaries. A connector does not gain
permission to write canonical product, inventory, order, or communication truth
merely because an Admin surface can render those tables.

> **Important:** connectors run on the **backend** (e.g. Supabase Edge Functions or a Node
> service) using the **service-role key** — never the browser. The service role bypasses RLS.
> Never put marketplace secrets in the client.

---

## 1. Inbound marketplace inventory/catalog snapshot

The former direct `products` upsert example is rejected. A provider SKU is scoped
to one shop and may collide with another variant; provider quantity is a reported
listing observation, not verified physical stock.

CSV imports first, and approved APIs later, write one private staged snapshot
contract with:

- provider and exact shop identity;
- source/export identity, content hash, schema version, observation period/time,
  receipt time, and idempotency/recovery identity;
- per row: external item/variant/SKU/barcode evidence, title/variant attributes,
  price/currency, listing status, reported available quantity, and source row;
- normalized validation, duplicate/conflict, freshness, and safe error state;
- an Admin decision of Link existing, Create new Draft, or Leave unresolved;
- a separate quantity decision that preserves the observation or invokes the
  controlled physical-count reconciliation command.

One K2 SKU remains the canonical sellable-variant identity. Marketplace SKUs and
external IDs remain per-shop aliases after approval. Matching SKU, normalized
name, or barcode may rank a suggestion but never merges automatically. New
products receive the existing server-generated K2 SKU and remain Draft. Product
fields are reviewable suggestions; no import silently publishes or overwrites
Product Master.

Reported shop quantity never changes Master Inventory directly. The flexible
availability target is two eligible units per individual selected shop, with
Covered, Thin, Skipped, Out, and Needs-review states. Recent verified sales may
rank a scarcity proposal, and the owner may override or skip shops. Approved
automatic availability rebalancing cannot exceed canonical sellable stock,
double-count units, violate reservations, or represent physical custody
movement. Actual custody transfer keeps its exact-lot request/approval/receipt
workflow.

Every canonical decision is Admin/AAL2, signed, reasoned, payload-idempotent,
rate/batch bounded, and recorded with immutable before/after evidence. Provider
credentials remain service-only. A staged row, CSV receipt, configured account,
or successful parse is not proof of a live connector, reconciled inventory, or
updated marketplace.

### Prepared local v1 boundary (31 August 2026)

The inactive implementation now fixes the provider-neutral header order as:
`schema_version`, `source_row_id`, `external_item_id`,
`external_variant_id`, `marketplace_sku`, `barcode`, `title`, `size`,
`concentration`, `flavor`, `shade`, `formulation`, `pack_count`, `unit_price`,
`currency`, `listing_status`, `reported_quantity`, and `observed_at`. The common
schema version is `k2.marketplace-snapshot.v1`; the K2 parser ceiling is 512 KiB,
1,000 rows, and 4,000 characters per cell. These are K2 safety bounds, not claims
about provider export limits.

The prepared close-session order contract is separately versioned as
`k2.marketplace-orders.v1` with exact headers `schema_version`,
`external_order_id`, `external_line_id`, `marketplace_sku`, `quantity`,
`gross_amount`, `currency`, `ordered_at`, `order_status`, and `payment_status`.
It contains no customer/contact/address columns, is scoped to one exact shop and
close period, permits a header-only reviewed zero-sales export, and retains at
most 5,000 facts under the same 512 KiB/4,000-character safety envelope. Exact
shop/order/line payload replays become duplicates across rows and imports;
changed payloads become conflicts. SQL repeats this identity check so BFF-only
deduplication cannot become a double-counting gap.

`20260831_marketplace_snapshot_staging.sql` prepares private forced-RLS import,
row, alias, observation, event, and close-session records plus signed
`marketplace_snapshot_stage`, `marketplace_order_fact_stage`,
`marketplace_match_decision`, `marketplace_fee_estimate_save`, and
`owner_close_session_save` actions. The fee action derives integer-minor-unit
gross/commission/payment/withholding/fixed estimates from accepted linked facts,
blocks changed or unresolved evidence, versions each shop/session estimate, and
always returns non-settlement/non-accounting flags. It does not contain physical
inventory DML.
The Admin BFF prepares `marketplace-snapshots/stage`, `/decision`, `/status`, and
`marketplace-orders/stage`, `/status`, `owner-close/session`, and
`owner-close/fees`. Synthetic listing and customer-free order fixtures named for Shopee, Lazada, and TikTok
prove only normalized K2 behavior. The isolated PostgreSQL rehearsal and focused
contracts pass, but no real export dictionary, provider API, production apply,
flag, deployment, shop reconciliation, or staff acceptance has occurred. See
`docs/runbooks/MARKETPLACE_SNAPSHOT_STAGING_RUNBOOK.md` for activation and
recovery gates.

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

Every webhook additionally has a fixed content type, byte ceiling, and bounded
body-read deadline that cancels a stalled stream before parsing or capture. The
deadline must be explicitly configured and fail closed when absent or invalid. It verifies
the signature over the exact raw provider body, and requires provider account,
timestamp, and deterministic event identity before capture. Its replay window
must be taken from the approved current provider contract and configured
explicitly; arrival time or randomness never repairs a missing provider key.
Shopee's prepared intake implements these provider-independent controls but
remains Events-only and undeployable until its exact signing string and retry
semantics are verified against the approved partner documentation.
After validation, capture crosses one service-only database command that
atomically consumes provider-account and connector-global budgets before inbox
insert. The command must have no guessed default limits, must count denied
attempts durably, must preserve an existing processing/processed row on exact
replay, and must reject changed evidence under an existing event identity.
Shopee's prepared `capture_shopee_event_v1` boundary implements this contract
locally, but its migration and provider-approved limits are not applied.

MAP-023 acceptance reuses `npm.cmd run verify:map020-shopee-ingress-portable`.
The 31 August 2026 isolated run applied the actual prepared migration, treated a
successful capture response as lost, and retried the identical event. The retry
returned the existing terminal row without changing its processing state or
creating another row. A changed payload under that identity returned `conflict`
without replacing stored evidence. The exact postcondition is one inbox row plus
shop/global budget counts of `3` for capture, replay, and conflict. This remains
local prepared-source evidence: it does not verify the provider signing contract,
real delivery/retry timing, production limits, deployment, order normalization,
or outbound stock publication.

Once #3 writes into these tables, the dashboard displays everything live — no front-end changes.
