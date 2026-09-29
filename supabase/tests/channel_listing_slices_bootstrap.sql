-- Fixture for the 20260929 channel listing slices rehearsal.
--
-- Disposable local-only rehearsal database
-- (k2_map017_rehearsal_channel_slices on a loopback port), so the real
-- migration file runs against it verbatim. Nothing here can reach K2.
--
-- Minimal shapes of the earlier chain (20260829 vocabulary/shops, 20260917
-- allocations, 0015 listings, products, batches, balances): only the columns
-- the slice migration touches.
create extension if not exists pgcrypto with schema public;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

drop table if exists public.channel_shop_allocations;
drop table if exists public.channel_listings;
drop table if exists public.product_batches;
drop table if exists public.inventory_balances;
drop table if exists public.channel_shops;
drop table if exists public.channels;
drop table if exists public.products;

create table public.products (
  sku text primary key,
  name text not null,
  status text not null default 'Draft',
  published boolean not null default false
);

create table public.channels (
  code text primary key,
  display_name text not null,
  is_marketplace boolean not null default false
);

insert into public.channels (code, display_name, is_marketplace) values
  ('website', 'Website', false),
  ('shopee', 'Shopee', true),
  ('lazada', 'Lazada', true),
  ('tiktok', 'TikTok Shop', true);

create table public.channel_shops (
  id uuid primary key default gen_random_uuid(),
  shop_code text not null unique,
  channel_code text not null references public.channels(code),
  display_name text not null,
  status text not null default 'not_connected'
);

-- One pre-existing operational shop: the seed step must not touch it, and the
-- rollback must not delete it.
insert into public.channel_shops (shop_code, channel_code, display_name, status) values
  ('shopee-01', 'shopee', 'Shopee Main Shop', 'operational');

create table public.channel_listings (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku) on delete cascade,
  channel_source text not null,
  status text not null default 'Active'
);

create table public.product_batches (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku),
  box_code text,
  quantity integer not null default 0,
  hub text default 'MANILA_MAIN',
  custodian text
);

create table public.inventory_balances (
  sku text not null,
  location_code text not null default 'MANILA_MAIN',
  on_hand integer not null default 0,
  reserved integer not null default 0,
  damaged integer not null default 0,
  expired integer not null default 0,
  unaccounted integer not null default 0,
  available integer generated always as (greatest(on_hand - reserved - damaged - expired - unaccounted, 0)) stored,
  primary key (sku, location_code)
);

create table public.channel_shop_allocations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.channel_shops(id) on delete cascade,
  sku text not null,
  allocated_units integer not null default 0,
  constraint channel_shop_allocations_shop_sku_unique unique (shop_id, sku)
);

insert into public.products (sku, name, status, published) values
  ('K2-SLICE-1', 'Visible: Live plus website-listed', 'Live', true),
  ('K2-SLICE-2', 'Direct-link only: Unlisted with Website listing', 'Unlisted', true),
  ('K2-SLICE-3', 'Hidden: Live with no website listing', 'Live', true),
  ('K2-SLICE-4', 'Hidden: unpublished despite website listing', 'Live', false),
  ('K2-SLICE-5', 'Hidden: Unlisted without Website listing', 'Unlisted', true);

insert into public.channel_listings (sku, channel_source, status) values
  ('K2-SLICE-1', 'website', 'Active'),
  ('K2-SLICE-1', 'shopee', 'Paused'),
  ('K2-SLICE-2', 'website', 'Active'),
  ('K2-SLICE-4', 'website', 'Active');

insert into public.product_batches (sku, box_code, quantity, hub, custodian) values
  ('K2-SLICE-1', 'BOX-WEB-01', 10, 'MANILA_MAIN', 'Admin Staff'),
  ('K2-SLICE-1', 'BOX-SHP-02', 10, 'MANILA_MAIN', 'Cousin Staff');

insert into public.inventory_balances (sku, location_code, on_hand) values
  ('K2-SLICE-1', 'MANILA_MAIN', 12);

-- Mirror the existing production boundary: anonymous users cannot read the
-- staff-only listing table; only authenticated staff can read it directly.
alter table public.channel_listings enable row level security;
create policy channel_listings_staff_read on public.channel_listings
  for select to authenticated using (true);
grant usage on schema public to anon, authenticated;
grant select on public.channel_listings to authenticated;
revoke all on public.channel_listings from public, anon;
