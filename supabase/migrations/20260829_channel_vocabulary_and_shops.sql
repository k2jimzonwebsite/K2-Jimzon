-- MAP-028 D1 / MAP-026 foundation — one channel vocabulary, and shop identity.
--
-- Three spellings for the same channel coexisted before this migration:
--
--   * order_requests.channel_source  CHECK ('website','shopee','tiktok','lazada','pasabuy','manual')
--   * channel_type ENUM              ('shopee_account_1','website_retail', ...)
--   * channel_listings.channel_source   free text, no constraint at all
--
-- `tiktok` and `tiktok_shop` are the same channel spelled two ways. A connector
-- writing one while a report reads the other returns an empty result, not an
-- error — the worst kind of failure, because nothing reports it.
--
-- This settles the vocabulary in one place and gives K2 the shop identity the
-- operating model requires: several seller accounts per marketplace, each run by
-- a staff member who physically holds that shop's stock. Shop identity has to
-- exist on an order *before* the first marketplace order arrives; backfilling it
-- onto orders that never carried it would be guesswork.
--
-- Deliberately NOT in scope here, and left to MAP-026: re-keying
-- channel_connections and channel_credentials per shop, the batch allocation
-- dimension, and the staff-request/admin-approval transfer workflow. This is the
-- vocabulary and the entity they will all hang from.

begin;

-- ---------------------------------------------------------------------------
-- The canonical vocabulary
--
-- A table rather than an enum: adding a channel must not require DDL, and a
-- foreign key gives every other table the same constraint for free. Enum values
-- also cannot be removed, which is how the legacy channel_type became permanent.
-- ---------------------------------------------------------------------------

create table if not exists public.channels (
  code text primary key,
  display_name text not null,
  sort_order integer not null default 100,
  -- A marketplace is operated through seller shops and can carry many of them.
  -- K2's own surfaces cannot, which is what stops a website order being
  -- attributed to a shop that does not exist.
  is_marketplace boolean not null default false,
  created_at timestamptz not null default now(),
  constraint channels_code_shape_check check (code ~ '^[a-z][a-z0-9_]{1,30}$')
);

insert into public.channels (code, display_name, sort_order, is_marketplace) values
  ('website',  'Website',      10, false),
  ('pasabuy',  'Pasabuy',      20, false),
  ('manual',   'Manual entry', 30, false),
  ('shopee',   'Shopee',       40, true),
  ('lazada',   'Lazada',       50, true),
  ('tiktok',   'TikTok Shop',  60, true)
on conflict (code) do update
  set display_name = excluded.display_name,
      sort_order = excluded.sort_order,
      is_marketplace = excluded.is_marketplace;

-- ---------------------------------------------------------------------------
-- Shop identity
--
-- One row per K2 seller account. Two Shopee shops are two rows, never one.
-- `shop_code` is the stable internal handle that survives a marketplace
-- reissuing its own identifiers; `external_shop_id` is what the marketplace
-- calls it and is only unique within that marketplace.
-- ---------------------------------------------------------------------------

create table if not exists public.channel_shops (
  id uuid primary key default gen_random_uuid(),
  shop_code text not null unique,
  channel_code text not null references public.channels(code) on update cascade,
  external_shop_id text,
  display_name text not null,
  custodian_user_id uuid references public.user_profiles(id) on delete set null,
  status text not null default 'not_connected',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_shops_code_shape_check
    check (shop_code ~ '^[a-z][a-z0-9_-]{1,40}$'),
  constraint channel_shops_status_check
    check (status in ('not_connected', 'pending', 'operational', 'suspended')),
  -- Two shops on one marketplace must not claim the same marketplace identity.
  -- Nulls are allowed and repeatable: a shop that exists on paper but has no
  -- approved app yet has no external id to record.
  constraint channel_shops_external_identity_unique
    unique (channel_code, external_shop_id)
);

create index if not exists channel_shops_channel_idx
  on public.channel_shops (channel_code, status);

create index if not exists channel_shops_custodian_idx
  on public.channel_shops (custodian_user_id)
  where custodian_user_id is not null;

comment on table public.channel_shops is
  'One K2 seller account per row. N shops per channel, no fixed limit.';

-- ---------------------------------------------------------------------------
-- Orders carry the vocabulary and the shop
-- ---------------------------------------------------------------------------

do $orders$
begin
  if to_regclass('public.order_requests') is null then
    raise exception 'order_requests must exist before the channel vocabulary is applied';
  end if;

  -- Every existing value is already in the seeded vocabulary, so this cannot
  -- orphan a row. Verify rather than assume, and fail closed if it would.
  if exists (
    select 1 from public.order_requests o
    where o.channel_source is not null
      and not exists (select 1 from public.channels c where c.code = o.channel_source)
  ) then
    raise exception 'order_requests holds a channel_source outside the canonical vocabulary';
  end if;

  -- The CHECK is replaced by a foreign key so a new channel is one insert into
  -- public.channels rather than a constraint rewrite on a live table.
  alter table public.order_requests drop constraint if exists order_requests_channel_source_check;
  alter table public.order_requests drop constraint if exists order_requests_channel_source_fkey;
  alter table public.order_requests
    add constraint order_requests_channel_source_fkey
    foreign key (channel_source) references public.channels(code) on update cascade;
end
$orders$;

alter table public.order_requests
  add column if not exists shop_id uuid references public.channel_shops(id);

create index if not exists order_requests_shop_idx
  on public.order_requests (shop_id) where shop_id is not null;

-- A marketplace order must name its shop; a website or pasabuy order must not
-- claim one. Without this an order could arrive from "Shopee" with no way to
-- tell which of K2's Shopee shops owes the stock.
--
-- Enforced by trigger rather than CHECK: the rule depends on another table
-- (`channels.is_marketplace`), and PostgreSQL does not permit a subquery in a
-- CHECK constraint. A CHECK that reads a second table would also be silently
-- wrong after that table changed.
alter table public.order_requests drop constraint if exists order_requests_marketplace_shop_check;

create or replace function public.enforce_order_channel_shop()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_marketplace boolean;
  v_shop_channel text;
begin
  select c.is_marketplace into v_is_marketplace
  from public.channels c where c.code = new.channel_source;
  if v_is_marketplace is null then
    raise exception using errcode='23514', message='K2_CHANNEL_UNKNOWN';
  end if;

  if new.shop_id is null then
    -- Marketplace orders without a shop are the exact ambiguity this exists to
    -- prevent, so they are refused rather than accepted and reconciled later.
    if v_is_marketplace then
      raise exception using errcode='23514', message='K2_MARKETPLACE_ORDER_REQUIRES_SHOP';
    end if;
    return new;
  end if;

  if not v_is_marketplace then
    raise exception using errcode='23514', message='K2_NON_MARKETPLACE_ORDER_HAS_SHOP';
  end if;

  select s.channel_code into v_shop_channel
  from public.channel_shops s where s.id = new.shop_id;
  if v_shop_channel is distinct from new.channel_source then
    raise exception using errcode='23514', message='K2_ORDER_SHOP_CHANNEL_MISMATCH';
  end if;
  return new;
end;
$$;

-- PostgreSQL grants EXECUTE on a new function to PUBLIC by default. A trigger
-- function does not need it -- the trigger fires as the table owner -- and a
-- security-definer function callable by anyone is a surface, not a helper.
revoke all on function public.enforce_order_channel_shop()
  from public, anon, authenticated;

drop trigger if exists order_requests_channel_shop_trigger on public.order_requests;
create trigger order_requests_channel_shop_trigger
  before insert or update of channel_source, shop_id on public.order_requests
  for each row execute function public.enforce_order_channel_shop();

-- ---------------------------------------------------------------------------
-- Channel listings carry the vocabulary and the shop
--
-- This table had no constraint on channel_source at all, so it is where the
-- third spelling came from.
-- ---------------------------------------------------------------------------

do $listings$
begin
  if to_regclass('public.channel_listings') is null then
    return;
  end if;

  -- Map the historical spellings onto the canonical vocabulary before
  -- constraining, so no existing row is orphaned by the foreign key.
  update public.channel_listings set channel_source = 'tiktok'
    where channel_source in ('tiktok_shop', 'tiktokshop');
  -- Regex, not LIKE: `[_]` is a character class in some dialects but not in
  -- PostgreSQL, where `_` is a single-character wildcard and `[` is literal --
  -- so a LIKE pattern written that way silently matches nothing.
  update public.channel_listings set channel_source = 'shopee'
    where channel_source ~ '^shopee[_-]?(account|shop)';
  update public.channel_listings set channel_source = 'lazada'
    where channel_source ~ '^lazada[_-]?(account|shop)';
  update public.channel_listings set channel_source = 'tiktok'
    where channel_source ~ '^tiktok[_-]?(account|shop)';
  update public.channel_listings set channel_source = 'website'
    where channel_source in ('website_retail', 'website_vip');

  if exists (
    select 1 from public.channel_listings l
    where not exists (select 1 from public.channels c where c.code = l.channel_source)
  ) then
    raise exception 'channel_listings holds a channel_source outside the canonical vocabulary';
  end if;

  alter table public.channel_listings drop constraint if exists channel_listings_channel_source_fkey;
  alter table public.channel_listings
    add constraint channel_listings_channel_source_fkey
    foreign key (channel_source) references public.channels(code) on update cascade;
end
$listings$;

alter table public.channel_listings
  add column if not exists shop_id uuid references public.channel_shops(id) on delete cascade;

create index if not exists channel_listings_shop_idx
  on public.channel_listings (shop_id)
  where shop_id is not null;

-- The old uniqueness was (sku, channel_source), which made two shops listing the
-- same SKU on the same marketplace impossible. Uniqueness is per shop now.
-- Drop the constraint first: it owns the index, and PostgreSQL refuses a direct
-- DROP INDEX on a constraint-backed index.
alter table public.channel_listings drop constraint if exists unique_sku_channel;
drop index if exists public.unique_sku_channel;
create unique index if not exists channel_listings_sku_shop_unique
  on public.channel_listings (sku, channel_source, coalesce(shop_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Two shops must not claim the same marketplace item either.
create unique index if not exists channel_listings_external_item_unique
  on public.channel_listings (shop_id, external_item_id)
  where shop_id is not null and external_item_id is not null;

-- ---------------------------------------------------------------------------
-- Read boundary
--
-- The vocabulary is public reference data — the storefront labels an order by
-- it. Shops are internal: which staff member holds which account is not a
-- customer-facing fact.
-- ---------------------------------------------------------------------------

alter table public.channels enable row level security;
alter table public.channels force row level security;
alter table public.channel_shops enable row level security;
alter table public.channel_shops force row level security;

revoke all on table public.channels from public, anon, authenticated;
revoke all on table public.channel_shops from public, anon, authenticated;
grant select on table public.channels to anon, authenticated;
grant select on table public.channel_shops to authenticated;

drop policy if exists channels_public_read on public.channels;
create policy channels_public_read
on public.channels for select to anon, authenticated using (true);

drop policy if exists channel_shops_staff_read on public.channel_shops;
create policy channel_shops_staff_read
on public.channel_shops for select to authenticated using (public.is_staff());

-- No write policy for any client role. Shops are created by an admin command,
-- not by a dashboard insert.

notify pgrst,'reload schema';
commit;
