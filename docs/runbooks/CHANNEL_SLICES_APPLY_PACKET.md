# Channel slices apply packet (MAP-026 / IDEA-20260929-06)

Follow in order. Stop on any ambiguity. Nothing here authorizes a write: each
production step waits on the owner authorization named in the Master Action Plan.

## STOP 0 - Identity (read-only)

```bash
npm run preflight:k2-project
```

Must print `K2_PROJECT_IDENTITY_OK project=pixplcjqivlfflickobf`. Never use the
ScoutIT-only connector for K2 work. Then:

```bash
npm run readiness:k2-live
```

Require zero failed gates.

## STOP 1 - Read the live position (read-only SQL)

```sql
select count(*) as entries, max(version) as latest
from supabase_migrations.schema_migrations;
-- EXPECTED: latest = 20260928092634. If newer, stop and re-rehearse.

select to_regclass('public.channels') as channels,
       to_regclass('public.channel_shops') as shops,
       to_regclass('public.channel_shop_allocations') as allocs,
       to_regclass('public.v_storefront_visible_skus') as vis_view;
-- EXPECTED: all null. If any exist, stop: the chain is partly applied.

select l.sku, l.status, p.status as product_status, p.published,
       p.is_human_reviewed
from public.channel_listings l
join public.products p on p.sku = l.sku
where l.channel_source = 'website' and l.status = 'Active'
order by l.sku;
-- Review every returned SKU for owner-approved Website membership before
-- applying the view: an existing Website assignment may become public.
-- Stop if membership or publication review is unknown; never auto-tag rows.
```

## STOP 2 - Local rehearsals must be green (no provider contact)

```bash
npm run rehearse:channel-listing-slices
npm run rehearse:channel-chain-current
```

Both exit 0. If either fails, fix the files, never the live database.

## STOP 3 - Backup (owner-authorized)

Fresh encrypted application-database backup with owner-only Drive upload and
independent hash readback, per `DATABASE_BACKUP_AND_RESTORE_RUNBOOK.md`.

## STOP 4 - Apply, in this exact order

1. `supabase/migrations/20260829_channel_vocabulary_and_shops.sql`
2. `supabase/migrations/20260917_multi_shop_allocation_and_transfers.sql`
3. `supabase/migrations/20260929_channel_listing_slices.sql`

One file at a time. Confirm each before the next.

## STOP 5 - Postflight (read-only SQL)

```sql
select count(*) as seed_shops from public.channel_shops
where shop_code in ('pasabuy-lazada','pasabuy-shopee','pasabuy-tiktok',
                    'jworld-lazada','jworld-shopee','jworld-tiktok')
  and status = 'not_connected';
-- EXPECTED: 6.

select count(*) as guarded_triggers from pg_trigger
where tgname in ('channel_shop_allocations_oversell_guard',
                 'inventory_balances_shop_allocation_guard')
  and not tgisinternal;
-- EXPECTED: 2.

select count(*) as weight_columns from information_schema.columns
where table_schema = 'public' and table_name = 'product_batches'
  and column_name = 'net_weight_g';
-- EXPECTED: 1.

select count(*) as visible_skus from public.v_storefront_visible_skus;
-- EXPECTED: runs clean (count may be 0 until website listings exist).

select has_table_privilege('anon', 'public.channel_listings', 'SELECT')
  as anon_can_read_base,
       has_table_privilege('authenticated', 'public.channel_listings', 'SELECT')
  as authenticated_can_read_base,
       has_table_privilege('anon', 'public.v_storefront_visible_skus', 'SELECT')
  as anon_can_read_projection,
       has_table_privilege('authenticated', 'public.v_storefront_visible_skus', 'SELECT')
  as authenticated_can_read_projection;
-- EXPECTED: false, false, true, true.

select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'channel_listings'
  and grantee in ('anon', 'authenticated');
-- EXPECTED: zero rows.
```

## STOP 6 - Rollback map (use only on failure, in reverse)

1. `supabase/migrations/20260929_channel_listing_slices_rollback.sql`
   (keeps any shop already operationalized; it drops `net_weight_g`, so
   export and preserve any entered lot weights before an authorized rollback)
2. `supabase/migrations/20260917_multi_shop_allocation_and_transfers_rollback.sql`
3. For 20260829 there is no paired file: restore from the STOP 3 backup.

## What this chain does not do

No website-listed rows are created. There is not yet a protected per-SKU Admin
assignment writer; do not add rows with browser-side writes or ad hoc SQL in
this packet. No offer quantities are set (rebalance or staff set them within
master). No product, price, or publication changes. No adapter, webhook, or
provider setting. MAP-018 still owns the protected Website assignment control
and server-side order membership guard. Do not deploy the new Storefront view
consumer until the view is applied and the order-side gate has been verified.
