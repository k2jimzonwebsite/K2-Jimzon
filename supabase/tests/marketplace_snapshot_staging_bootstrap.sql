-- Isolated PostgreSQL bootstrap for MAP-023 marketplace snapshot rehearsal.
-- This is deliberately customer-free and never targets a saved Supabase URL.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists auth;
create schema if not exists k2_private;
create schema if not exists k2_test;

do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;

create table auth.users (
  id uuid primary key,
  email text not null unique
);

create or replace function auth.uid() returns uuid
language sql stable set search_path=''
as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;

create or replace function auth.jwt() returns jsonb
language sql stable set search_path=''
as $$ select jsonb_build_object(
  'sub',current_setting('request.jwt.claim.sub', true),
  'aal',coalesce(nullif(current_setting('request.jwt.claim.aal', true),''),'aal1')
) $$;

create table public.user_profiles (
  id uuid primary key references auth.users(id),
  role text not null check (role in ('Staff','Admin'))
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path=''
as $$ select exists(
  select 1 from public.user_profiles
  where id=auth.uid() and role in ('Staff','Admin')
) $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=''
as $$ select exists(
  select 1 from public.user_profiles where id=auth.uid() and role='Admin'
) $$;

create table public.channel_shops (
  id uuid primary key,
  shop_code text not null unique,
  channel_code text not null check (channel_code in ('shopee','lazada','tiktok')),
  display_name text not null,
  status text not null default 'not_connected'
);

create sequence public.k2_test_sku_sequence start 1;
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  status text not null default 'Draft',
  published boolean not null default false,
  barcode text,
  description text,
  size text,
  package_type text,
  subcategory text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create or replace function public.generate_k2_sku_internal() returns text
language sql volatile security definer set search_path=''
as $$ select 'K2-'||lpad(nextval('public.k2_test_sku_sequence')::text,6,'0') $$;

-- This sentinel is the physical stock boundary. Marketplace quantity evidence
-- must never insert, update, or delete it.
create table public.product_batches (
  id uuid primary key,
  sku text not null,
  quantity integer not null,
  reserved_quantity integer not null default 0,
  box_code text,
  batch_code text,
  expiry_date date,
  landed_date date,
  hub text,
  custodian text,
  channel text,
  is_pinned boolean not null default false,
  inventory_status text not null default 'available'
);
create table public.inventory_balances (
  sku text not null,
  location_code text not null,
  available integer not null default 0,
  primary key (sku,location_code)
);
create table public.order_requests (
  id uuid primary key,
  shop_id uuid references public.channel_shops(id),
  status text not null,
  created_at timestamptz not null
);
create table public.order_request_items (
  id uuid primary key,
  order_request_id uuid not null references public.order_requests(id),
  sku text not null,
  quantity integer not null
);
create table public.pasabuy_requests (
  id uuid primary key,
  public_reference text not null unique,
  item_title text not null,
  quantity integer not null,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table k2_private.admin_bff_secrets (
  singleton boolean primary key default true,
  request_secret bytea not null
);
create table k2_private.admin_command_receipts (
  actor_id uuid not null,
  action text not null,
  idempotency_key uuid not null,
  payload_hash text not null,
  result jsonb,
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  primary key(actor_id,action,idempotency_key)
);
create table k2_private.admin_request_nonces (
  actor_id uuid not null,
  action text not null,
  nonce uuid not null,
  expires_at timestamptz not null,
  primary key(actor_id,action,nonce)
);
create table k2_private.admin_request_rate_buckets (
  scope text not null,
  subject text not null,
  bucket_start timestamptz not null,
  hit_count integer not null,
  primary key(scope,subject,bucket_start)
);

create or replace function k2_private.verify_admin_bff_request(
  text,bigint,uuid,uuid,text,text
) returns boolean language sql as $$ select true $$;

insert into auth.users(id,email) values
  ('10000000-0000-0000-0000-000000000001','staff@example.invalid'),
  ('10000000-0000-0000-0000-000000000002','admin@example.invalid');
insert into public.user_profiles(id,role) values
  ('10000000-0000-0000-0000-000000000001','Staff'),
  ('10000000-0000-0000-0000-000000000002','Admin');
insert into public.channel_shops(id,shop_code,channel_code,display_name) values
  ('20000000-0000-0000-0000-000000000001','shopee-01','shopee','K2 Shopee Main'),
  ('20000000-0000-0000-0000-000000000002','shopee-02','shopee','K2 Shopee Second'),
  ('20000000-0000-0000-0000-000000000003','lazada-01','lazada','K2 Lazada Main');
insert into public.products(id,sku,name,status,published,barcode) values
  ('30000000-0000-0000-0000-000000000001','K2-EXISTING','Existing Product','Active',true,'480000000001');
insert into public.product_batches(id,sku,quantity) values
  ('40000000-0000-0000-0000-000000000001','K2-EXISTING',17);
insert into public.inventory_balances(sku,location_code,available) values
  ('K2-EXISTING','MANILA_MAIN',3);
insert into public.order_requests(id,shop_id,status,created_at) values
  ('41000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','fulfilled','2026-08-15T00:00:00Z'),
  ('41000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','confirmed','2026-08-16T00:00:00Z');
insert into public.order_request_items(id,order_request_id,sku,quantity) values
  ('42000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','K2-EXISTING',2),
  ('42000000-0000-0000-0000-000000000002','41000000-0000-0000-0000-000000000002','K2-EXISTING',8);
insert into public.pasabuy_requests(id,public_reference,item_title,quantity,status,created_at,updated_at) values
  ('43000000-0000-0000-0000-000000000001','PB-2026-001','Synthetic espresso accessory',1,'arrived','2026-08-14T00:00:00Z','2026-08-30T00:00:00Z'),
  ('43000000-0000-0000-0000-000000000002','PB-2026-CLOSED','Synthetic delivered item',1,'delivered','2026-08-10T00:00:00Z','2026-08-20T00:00:00Z');
insert into k2_private.admin_bff_secrets(singleton,request_secret)
values(true,decode(repeat('ab',32),'hex'));

grant usage on schema public,auth to anon,authenticated;
grant select on public.products,public.product_batches,public.inventory_balances,
  public.order_requests,public.order_request_items,public.pasabuy_requests to authenticated;
