\set ON_ERROR_STOP on
drop schema if exists k2_private cascade;
drop schema if exists auth cascade;
drop schema if exists extensions cascade;
drop schema if exists storage cascade;
drop table if exists public.customer_claim_requests cascade;
drop table if exists public.customer_accounts cascade;
drop table if exists public.guest_access_grants cascade;
drop table if exists public.customer_contact_points cascade;
drop table if exists public.customers cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.pasabuy_requests cascade;
drop table if exists public.order_requests cascade;
drop table if exists public.po_lines cascade;
drop table if exists public.purchase_orders cascade;
drop table if exists public.suppliers cascade;
drop type if exists public.po_status cascade;
drop type if exists public.message_sender cascade;
drop type if exists public.chat_platform cascade;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema auth;
create schema storage;
create schema k2_private;
create table storage.objects (
  id uuid primary key default extensions.gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(bucket_id,name)
);
create table public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  sku text not null unique,
  name text not null default '', short text, barcode text, subcategory text,
  country_of_origin text, origin text, net_weight numeric, package_type text, size text,
  description text, why_buy text, why_rare text, usage_instructions text,
  storage_instructions text, ingredients text, allergens text,
  finished_product_details text, pairings text[] default '{}',
  cost_price numeric default 0, srp numeric default 0, wholesale_price numeric default 0,
  dealer_price numeric default 0, reorder_level integer default 0, slug text,
  seo_keywords text[] default '{}', is_featured boolean default false,
  is_human_reviewed boolean default false, product_video_url text, internal_notes text,
  brand_id uuid, category_id uuid, retail_price numeric,
  status text not null default 'Draft',
  published boolean not null default false,
  primary_image_url text,
  image_url text,
  lifestyle_images text[] default '{}',
  secondary_images text[] default '{}',
  updated_at timestamptz not null default now()
);
create table public.globe_products (
  product_id text primary key, enabled boolean not null default true,
  hero_image text, display_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create table public.reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id text references public.globe_products(product_id) on delete set null,
  name text not null, channel text not null default '', stars integer not null check(stars between 1 and 5),
  text text not null, item text not null default '', review_date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.globe_products enable row level security;
alter table public.reviews enable row level security;
create table auth.users (
  id uuid primary key, email text, email_confirmed_at timestamptz,
  phone text, phone_confirmed_at timestamptz
);
create table auth.sessions (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb
$$;
create function public.is_staff() returns boolean language sql stable as $$
  select coalesce((auth.jwt()->>'is_staff')::boolean,false)
$$;
create function public.is_admin() returns boolean language sql stable as $$
  select coalesce((auth.jwt()->>'is_admin')::boolean,false)
$$;
create type public.user_role as enum ('Admin','Staff','Customer');
create table public.user_profiles (
  id uuid primary key references auth.users(id), email text,
  role public.user_role not null default 'Customer', created_at timestamptz not null default now(),
  full_name text, updated_at timestamptz not null default now()
);
alter table public.user_profiles enable row level security;
create policy user_profiles_staff_read on public.user_profiles for select to authenticated using(public.is_staff());
grant select on public.user_profiles to authenticated;
create table k2_private.staff_delete_credentials (
  user_id uuid primary key references auth.users(id), pin_hash text not null,
  pin_set_at timestamptz not null, failed_attempts integer not null default 0,
  attempt_window_started_at timestamptz, locked_until timestamptz,
  updated_at timestamptz not null default now()
);
create function public.set_user_role(uuid,text) returns public.user_profiles
language sql security definer set search_path='' as $$ select p from public.user_profiles p where false $$;
create function public.set_delete_pin(text) returns boolean language sql security definer set search_path='' as $$ select true $$;
create function public.has_delete_pin() returns boolean language sql security definer set search_path='' as $$ select false $$;
create function public.delete_products_with_pin_v2(text[],text,text,uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
  delete from public.products where sku=any($1);
  get diagnostics v_count=row_count;
  return jsonb_build_object('ok',true,'deleted_count',v_count);
end $$;
grant execute on function public.set_user_role(uuid,text),public.set_delete_pin(text),public.has_delete_pin() to authenticated;
grant execute on function public.delete_products_with_pin_v2(text[],text,text,uuid) to authenticated;
create policy reviews_public_read on public.reviews for select to anon,authenticated using(true);
create policy reviews_staff_manage on public.reviews for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy globe_products_staff_manage on public.globe_products for all to authenticated using(public.is_staff()) with check(public.is_staff());
grant select on public.globe_products,public.reviews to anon,authenticated;
grant insert,update,delete on public.globe_products,public.reviews to authenticated;
create type public.po_status as enum ('Draft','Sent','Partially Received','Received','Cancelled');
create table public.suppliers (
  id uuid primary key default extensions.gen_random_uuid(), name text not null,
  contact_email text, lead_time_days integer default 14,
  performance_score integer default 100, outstanding_balance numeric default 0,
  created_at timestamptz not null default now()
);
create table public.purchase_orders (
  id uuid primary key default extensions.gen_random_uuid(), supplier_id uuid references public.suppliers(id) on delete cascade,
  po_number text not null, status public.po_status not null default 'Draft', total_amount numeric default 0,
  expected_delivery date, created_at timestamptz not null default now()
);
create table public.po_lines (
  id uuid primary key default extensions.gen_random_uuid(), po_id uuid references public.purchase_orders(id) on delete cascade,
  sku text, quantity integer not null, unit_cost numeric not null, created_at timestamptz not null default now()
);
create table public.channel_connections (
  channel text primary key, display_name text not null, status text not null default 'not_connected',
  last_event_at timestamptz, note text, updated_at timestamptz not null default now()
);
create table public.channel_listings (
  id uuid primary key default extensions.gen_random_uuid(), sku text not null,
  channel_source text not null, external_item_id text, external_sku_id text,
  channel_price numeric, status text, publication_status text not null default 'draft',
  validation_errors jsonb not null default '[]'::jsonb, last_synced_at timestamptz,
  sync_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.channel_connections(channel,display_name) values
  ('website','K2 Jimzon Website'),('pasabuy','K2 Jimzon Pasabuy'),
  ('shopee','Shopee'),('tiktok','TikTok Shop'),('lazada','Lazada');
create view public.v_channel_catalog_readiness as
select p.sku,p.sku::varchar as product_name,c.channel,
  coalesce(l.publication_status,'draft') as publication_status,l.external_item_id,
  l.channel_price,l.validation_errors,l.last_synced_at,c.status as connection_status,
  array[]::text[] as missing_fields
from public.products p cross join public.channel_connections c
left join public.channel_listings l on l.sku=p.sku and l.channel_source=c.channel;
create function public.verify_internal_channel_event(text,text,text)
returns public.channel_connections language sql security definer set search_path='' as $$
  select c from public.channel_connections c where false
$$;
grant execute on function public.verify_internal_channel_event(text,text,text) to authenticated;
grant select on public.channel_connections,public.channel_listings,public.v_channel_catalog_readiness to authenticated;
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.po_lines enable row level security;
create policy suppliers_staff_manage on public.suppliers for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy purchase_orders_staff_manage on public.purchase_orders for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy po_lines_staff_manage on public.po_lines for all to authenticated using(public.is_staff()) with check(public.is_staff());
grant select on public.suppliers,public.purchase_orders,public.po_lines to authenticated;
grant insert,update on public.suppliers to authenticated;
create table public.customers (
  id uuid primary key default extensions.gen_random_uuid(), display_name text not null,
  status text not null default 'active', created_source text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.customer_contact_points (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid not null references public.customers(id), contact_kind text not null,
  contact_value text not null, normalized_hash bytea not null,
  verification_status text not null default 'unverified', verified_at timestamptz,
  verified_by uuid references auth.users(id), source text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  revoked_at timestamptz
);
create unique index customer_contacts_verified_identity_uidx
  on public.customer_contact_points(contact_kind,normalized_hash)
  where verification_status='verified' and revoked_at is null;
create table public.customer_accounts (
  user_id uuid primary key references auth.users(id), customer_id uuid not null unique references public.customers(id),
  verified_contact_point_id uuid not null references public.customer_contact_points(id),
  status text not null default 'active', linked_at timestamptz not null default now(),
  linked_by uuid references auth.users(id), revoked_at timestamptz
);
create table public.guest_access_grants (
  id uuid primary key default extensions.gen_random_uuid(), customer_id uuid not null references public.customers(id),
  token_hash bytea not null unique, status text not null default 'active', expires_at timestamptz not null,
  max_uses integer, use_count integer not null default 0, last_used_at timestamptz,
  revoked_at timestamptz, revoke_reason text, created_at timestamptz not null default now()
);
create table public.guest_access_grant_scopes (
  grant_id uuid not null references public.guest_access_grants(id), scope_kind text not null,
  scope_id uuid not null, permissions text[] not null, primary key(grant_id,scope_kind,scope_id)
);
create table public.customer_claim_requests (
  id uuid primary key default extensions.gen_random_uuid(), customer_id uuid not null references public.customers(id),
  contact_point_id uuid not null references public.customer_contact_points(id),
  requested_user_id uuid not null references auth.users(id), token_hash bytea not null unique,
  status text not null default 'pending', expires_at timestamptz not null,
  consumed_at timestamptz, created_at timestamptz not null default now()
);
create type public.chat_platform as enum ('Website','Pasabuy');
create type public.message_sender as enum ('Customer','Admin','AI');
create table public.order_requests (
  id uuid primary key default extensions.gen_random_uuid(), public_reference text not null unique,
  customer_id uuid references public.customers(id), status text not null,
  payment_status text not null, total_amount numeric not null default 0,
  created_at timestamptz not null default now()
);
create table public.pasabuy_requests (
  id uuid primary key default extensions.gen_random_uuid(), public_reference text not null unique,
  customer_id uuid references public.customers(id), status text not null,
  item_title text not null, quantity integer not null,
  created_at timestamptz not null default now()
);
create table public.conversations (
  id uuid primary key default extensions.gen_random_uuid(), customer_id uuid references public.customers(id),
  customer_name text not null, platform public.chat_platform not null, status text not null,
  guest_reference text not null unique default ('CV-'||upper(substr(replace(extensions.gen_random_uuid()::text,'-',''),1,16))), last_message_at timestamptz not null default now(),
  last_inbound_at timestamptz, unread_count integer not null default 0,
  customer_email text, customer_phone text, source_kind text, source_id uuid,
  response_due_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index conversations_source_uidx on public.conversations(source_kind,source_id)
  where source_kind is not null and source_id is not null;
create table public.messages (
  id uuid primary key default extensions.gen_random_uuid(), conversation_id uuid references public.conversations(id),
  sender_type public.message_sender not null, content text not null, is_draft boolean not null default false,
  delivery_status text not null, provider_event_key text, direction text,
  created_at timestamptz not null default now()
);
create unique index messages_provider_key_uidx on public.messages(conversation_id,provider_event_key)
  where provider_event_key is not null;
create table k2_private.guest_bff_secrets (
  singleton boolean primary key default true, request_secret bytea not null,
  contact_secret bytea not null, configured_at timestamptz not null default now()
);
create table k2_private.guest_request_nonces (
  action text not null, nonce uuid not null, used_at timestamptz not null default now(),
  expires_at timestamptz not null, primary key(action,nonce)
);
create table k2_private.guest_rate_buckets (
  action text not null, dimension text not null, subject_hash bytea not null,
  bucket_start timestamptz not null, window_seconds integer not null,
  hit_count integer not null default 0, updated_at timestamptz not null default now(),
  primary key(action,dimension,subject_hash,bucket_start)
);
create function k2_private.consume_guest_rate(text,text,bytea,integer,integer)
returns table(allowed boolean,retry_after_seconds integer)
language sql security definer set search_path='' as $$ select true,0 $$;
create function k2_private.contact_hash(p_payload jsonb) returns bytea
language sql security definer set search_path='' as $$
  select extensions.hmac(convert_to(case when nullif(lower(trim(p_payload->>'email')),'') is not null
    then 'email:'||lower(trim(p_payload->>'email')) else 'phone:'||regexp_replace(coalesce(p_payload->>'phone',''),'[^0-9+]','','g') end,'UTF8'),contact_secret,'sha256')
  from k2_private.guest_bff_secrets where singleton=true
$$;
create function k2_private.resolve_guest_identity(p_payload jsonb,p_source text,p_existing_grant_hash bytea)
returns table(customer_id uuid,grant_id uuid,raw_grant_token text)
language plpgsql security definer set search_path='' as $$
declare v_customer uuid; v_grant uuid; v_raw text; v_email text:=nullif(lower(trim(p_payload->>'email')),''); v_phone text:=nullif(regexp_replace(coalesce(p_payload->>'phone',''),'[^0-9+]','','g'),''); v_hash bytea;
begin
  if p_existing_grant_hash is not null then select g.customer_id,g.id into v_customer,v_grant from public.guest_access_grants g where g.token_hash=p_existing_grant_hash and g.status='active' and g.expires_at>now(); end if;
  if v_customer is null then
    insert into public.customers(display_name,created_source) values(trim(p_payload->>'customerName'),p_source) returning id into v_customer;
    v_raw:=encode(extensions.gen_random_bytes(32),'hex');
    insert into public.guest_access_grants(customer_id,token_hash,expires_at,max_uses) values(v_customer,extensions.digest(convert_to(v_raw,'UTF8'),'sha256'),now()+interval '30 days',10000) returning id into v_grant;
  end if;
  if v_email is not null then v_hash:=extensions.hmac(convert_to('email:'||v_email,'UTF8'),(select contact_secret from k2_private.guest_bff_secrets where singleton=true),'sha256'); insert into public.customer_contact_points(customer_id,contact_kind,contact_value,normalized_hash,source) values(v_customer,'email',v_email,v_hash,p_source); end if;
  if v_phone is not null then v_hash:=extensions.hmac(convert_to('phone:'||v_phone,'UTF8'),(select contact_secret from k2_private.guest_bff_secrets where singleton=true),'sha256'); insert into public.customer_contact_points(customer_id,contact_kind,contact_value,normalized_hash,source) values(v_customer,'phone',v_phone,v_hash,p_source); end if;
  customer_id:=v_customer; grant_id:=v_grant; raw_grant_token:=v_raw; return next;
end $$;
insert into k2_private.guest_bff_secrets(singleton,request_secret,contact_secret)
values (true,convert_to(repeat('r',32),'UTF8'),convert_to(repeat('c',32),'UTF8'));
create table k2_private.admin_bff_secrets (
  singleton boolean primary key default true, request_secret bytea not null
);
create table k2_private.admin_request_nonces (
  actor_id uuid not null, action text not null, nonce uuid not null,
  used_at timestamptz not null default now(), expires_at timestamptz not null,
  primary key(actor_id,action,nonce)
);
create table k2_private.admin_command_receipts (
  actor_id uuid not null, action text not null, idempotency_key uuid not null,
  payload_hash text not null, result jsonb, created_at timestamptz not null default now(),
  completed_at timestamptz, primary key(actor_id,action,idempotency_key)
);
insert into k2_private.admin_bff_secrets values(true,convert_to(repeat('a',32),'UTF8'));
create function k2_private.verify_admin_bff_request(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
  p_payload_text text,p_signature text
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_secret bytea; v_hash text; v_expected text; v_message text;
begin
  if v_actor is null or not public.is_staff() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_ACCESS_REQUIRED';
  end if;
  if p_action<>'wholesale_inquiry_review' or abs(extract(epoch from clock_timestamp())::bigint-p_timestamp)>300 then
    raise exception using errcode='22023',message='K2_ADMIN_REQUEST_INVALID';
  end if;
  select request_secret into v_secret from k2_private.admin_bff_secrets where singleton=true;
  v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  v_message:=p_action||E'\n'||p_timestamp||E'\n'||p_nonce||E'\n'||v_actor||E'\n'||p_idempotency_key||E'\n'||v_hash;
  v_expected:=encode(extensions.hmac(convert_to(v_message,'UTF8'),v_secret,'sha256'),'hex');
  if v_expected<>p_signature then raise exception using errcode='28000',message='K2_ADMIN_SIGNATURE_INVALID'; end if;
  insert into k2_private.admin_request_nonces(actor_id,action,nonce,expires_at)
    values(v_actor,p_action,p_nonce,now()+interval '10 minutes') on conflict do nothing;
  return found;
end $$;
