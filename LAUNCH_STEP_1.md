# K2 Jimzon — Step 1 launch runbook

This step prepares the website and operations dashboard without requiring a domain, a paid Vercel plan, a paid Supabase plan, marketplace connectors, or an online payment provider.

## Operating model

- Revenue channels: K2 Jimzon Website, Pasabuy, Shopee, TikTok Shop, and Lazada.
- Product master: one SKU record is the source for every channel.
- Inventory: one shared master balance prevents the same unit being promised twice.
- Physical control: batch, box, hub, custodian, and expiry fields show where stock actually is.
- Channel listings: marketplace rows remain `draft` or `ready` until a real connector publishes them.
- Website checkout: creates an order request; it does not take payment or reserve stock.
- Pasabuy: creates a sourcing request; staff save versioned landed-cost quotes and move them through controlled states.

## Completed in the repository

- Removed browser-side admin bypasses, prototype PIN access, mock operations data, and unsupported security claims.
- The activation migration removes the repository's deterministic truffle-order fixture and four seeded testimonial rows; review the backup before applying it.
- Restricted production catalog data to real Supabase rows; mock products remain development-only.
- Added persistent website order requests with idempotency, staff review, atomic reservations, packing, cancellation, payment reconciliation, fulfillment, and inventory events.
- Added persistent Pasabuy requests, quote assumptions, quote versions, and valid state transitions.
- Added consignment expected/packed/received counts, controlled transitions, discrepancy recording, and atomic receiving.
- Added atomic batch reconciliation and strict FEFO fulfillment. Attention pins no longer change dispatch order.
- Added channel connection truth and per-SKU readiness for Website, Shopee, TikTok Shop, and Lazada.
- Reworked the admin home into an exception queue based only on stored records.
- Replaced fabricated courier labels with an internal packing record that requires a real marketplace/courier label.
- Replaced fake supplier, purchase-order, AI enrichment, DevOps, customer broadcast, and wholesale behaviors with real records or explicit deferred states.
- Added launch-focused browser tests and production-build verification.

## Database activation

The project owner reported successful hosted-project activation on 2026-08-03.

The repository migration is:

`supabase/migrations/20260803_launch_core_stabilization.sql`

This is the only SQL file to apply for the current activation attempt. The earlier `20260802_*_compatibility_preflight.sql` recovery helpers are already incorporated and must not be rerun.

Apply it only after making a database backup or export. The migration intentionally replaces permissive legacy RLS policies with staff-only operational access. Run the full migration in a staging project first if one is available.

After applying it:

1. Confirm the admin user has an `Admin` role in `user_profiles`.
2. Confirm an anonymous visitor can select only live products.
3. Confirm an anonymous visitor cannot read orders, order requests, Pasabuy requests, batches, consignments, or inventory events.
4. Confirm a `Customer` account cannot open operational tables or call staff RPCs.
5. Confirm a `Staff` account can read queues and use the controlled operations functions.
6. Confirm product deletion works only for an `Admin` with a server-verified delete PIN.

Useful verification queries in the Supabase SQL editor:

```sql
select channel, status, last_event_at, note
from public.channel_connections
order by channel;

select channel, count(*) as catalog_rows,
       count(*) filter (where cardinality(missing_fields) = 0) as complete_rows
from public.v_channel_catalog_readiness
group by channel
order by channel;

select sku, location_code, on_hand, reserved, available,
       damaged, expired, unaccounted
from public.inventory_balances
order by sku;
```

## Product upload sequence

The waiting products should be staged after the migration is verified:

1. Export or back up the current product and batch tables.
2. Clean the catalog upload so every row has a unique SKU, product name, selling price, primary image, and review status. Stock columns are preview-only and are not imported into the product row.
3. After each draft exists, add batch/lot code, physical quantity, best-before date, hub, and custodian through batch reconciliation for inventory that is already on hand.
4. Upload products as `Draft` first.
5. Review images, descriptions, prices, package sizes, ingredients/allergens where relevant, and inventory totals.
6. Reconcile product stock against the batch total. Record the reason for every adjustment.
7. Publish only approved website products as `Live`.
8. Prepare Shopee, TikTok Shop, and Lazada listing rows as drafts. Use each Seller Center manually until connectors exist.
9. Never mark a marketplace listing `published` or a channel `live` without a real platform success response and reconciliation.

## End-to-end acceptance checks

- Submit a website order request and verify that stock does not change.
- Confirm it as staff and verify that stock becomes reserved exactly once.
- Try confirming the same request again and verify that no second reservation occurs.
- Pack each order line using the real SKU.
- Record a payment state only from real evidence; do not treat a request as revenue before `verified`.
- Fulfill the request and verify that the earliest-expiring batch is reduced first and the reservation is cleared.
- Cancel a separate confirmed request and verify that its reservation is released.
- Submit a Pasabuy request, save two quote versions, and verify both versions remain available.
- Create a consignment, record its expected quantity, scan-pack every unit, receive it in Manila, and verify discrepancies before finalization.
- Confirm no admin page displays seed orders, seed customers, fake API health, fake tracking numbers, or invented marketplace status.
- Test the storefront and admin at mobile, tablet, and desktop sizes; keyboard-check every form and dialog.

## Deferred until the missing dependencies are available

- Online payments and automated refunds.
- Custom domain, DNS, production email, and domain-based redirects.
- Paid hosting/database capacity and production backup/point-in-time recovery decisions.
- Shopee, TikTok Shop, and Lazada app credentials, webhooks, order ingestion, and stock publication.
- WhatsApp/Viber/social messaging connectors and real outbound sending.
- Transactional email/SMS for order and Pasabuy updates.
- Production rate limiting, bot protection, error monitoring, and analytics connectors.

## Go/no-go for the current website preview

Go for internal product loading and staff rehearsal when the migration and RLS checks pass. Go for a limited public preview when real products are approved, the privacy/terms/contact content is final, and a real website order request reaches the dashboard.

Do not call the operation fully launched until payment instructions, customer support ownership, delivery/courier procedures, backup/recovery, and at least one real-event reconciliation for every channel marked operational are complete.
