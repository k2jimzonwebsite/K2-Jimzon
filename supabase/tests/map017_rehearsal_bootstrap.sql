\set ON_ERROR_STOP on

drop publication if exists supabase_realtime;
drop schema if exists supabase_migrations cascade;
drop schema if exists storage cascade;
drop schema if exists auth cascade;
drop schema public cascade;
create schema public;
grant usage on schema public to public;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_admin') then create role supabase_admin nologin; end if;
end $$;

create schema auth;
create schema storage;
create schema supabase_migrations;

create table supabase_migrations.schema_migrations(
  version text not null,
  name text,
  statements text[],
  created_by text,
  idempotency_key text,
  rollback text[]
);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb->>'app_role', '')
    in ('Admin', 'Staff')
$$;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

create table public.brands(id bigint generated always as identity primary key, name text not null);
create table public.categories(id bigint generated always as identity primary key, name text not null);
create table public.warehouses(id bigint generated always as identity primary key, name text not null);
create table public.product_drafts(id bigint generated always as identity primary key, title text not null);
create table public.products_old(id bigint generated always as identity primary key, sku text not null);
create table public.channel_credentials(id bigint generated always as identity primary key, secret_label text not null);
create table public.staff_allocations(id bigint generated always as identity primary key, staff_label text not null);
create table public.products(
  id bigint generated always as identity primary key,
  sku text not null unique,
  status text not null
);
create table public.product_batches(
  id bigint generated always as identity primary key,
  sku text not null,
  quantity_available integer not null default 0
);
create table public.error_reports(
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message text,
  stack text,
  url text,
  user_agent text,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'new'
);

insert into public.products(sku, status) values
  ('LIVE-001', 'Live'), ('UNLISTED-001', 'Unlisted'), ('DRAFT-001', 'Draft');
insert into public.products_old(sku)
select 'LEGACY-' || lpad(value::text, 3, '0')
from generate_series(1, 14) as value;
insert into public.product_batches(sku, quantity_available) values
  ('LIVE-001', 5), ('LIVE-001', 2), ('UNLISTED-001', 3), ('DRAFT-001', 99);

alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.warehouses enable row level security;
alter table public.product_drafts enable row level security;
alter table public.products_old enable row level security;
alter table public.channel_credentials enable row level security;
alter table public.staff_allocations enable row level security;
alter table public.products enable row level security;
alter table public.product_batches enable row level security;
alter table public.error_reports enable row level security;

grant all on public.brands, public.categories, public.warehouses,
  public.product_drafts, public.products_old to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select, insert, update, delete on public.product_batches to authenticated;
grant select, insert on public.error_reports to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

create policy "Admin Full Access" on public.brands for all to public using (true) with check (true);
create policy "Admin Full Access" on public.categories for all to public using (true) with check (true);
create policy "Admin Full Access" on public.warehouses for all to public using (true) with check (true);
create policy "Staff manage product_drafts" on public.product_drafts for all to authenticated using (true) with check (true);
create policy "Admins manage products" on public.products_old for all to public using (true) with check (true);
create policy products_public_read on public.products for select to anon, authenticated using (true);
create policy batches_staff_read on public.product_batches for select to authenticated using (public.is_staff());
create policy error_reports_public_insert on public.error_reports
  for insert to anon, authenticated with check (true);
create policy error_reports_staff_read on public.error_reports
  for select to authenticated using (public.is_staff());

create view public.v_channel_catalog_readiness with (security_invoker = true) as select id, name from public.brands;
create view public.v_expiring_batches with (security_invoker = true) as select id, sku from public.product_batches;
create view public.v_product_stock_from_batches with (security_invoker = true) as
  select sku, coalesce(sum(quantity_available), 0)::bigint as stock_from_batches
  from public.product_batches group by sku;
grant select on public.v_channel_catalog_readiness, public.v_expiring_batches,
  public.v_product_stock_from_batches to anon, authenticated;

create table storage.buckets(
  id text primary key,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects(
  id bigint generated always as identity primary key,
  bucket_id text not null,
  name text not null
);
alter table storage.objects enable row level security;
insert into storage.buckets(id, file_size_limit, allowed_mime_types)
values ('product-images', null, null);
grant usage on schema storage to anon, authenticated;
grant all on storage.objects to anon, authenticated;
create policy "Anyone can upload" on storage.objects for insert to public with check (true);
create policy "Anyone can update" on storage.objects for update to public using (true) with check (true);
create policy "Anyone can delete" on storage.objects for delete to public using (true);

create publication supabase_realtime for table public.products_old;

-- Reproduce the live future-object defaults after current objects are built so
-- the fixture's explicit present-object grants remain independently controlled.
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated;
alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated;
alter default privileges for role supabase_admin in schema public grant all on tables to anon, authenticated;
alter default privileges for role supabase_admin in schema public grant all on sequences to anon, authenticated;
alter default privileges for role supabase_admin in schema public grant execute on functions to anon, authenticated;
