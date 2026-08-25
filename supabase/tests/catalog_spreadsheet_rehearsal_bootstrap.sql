\set ON_ERROR_STOP on

do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;
create schema extensions;
create extension pgcrypto with schema extensions;
create schema auth;
create schema k2_private;

create table auth.users(id uuid primary key);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;

create table public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  sku varchar not null unique,
  name varchar not null,
  title text,
  status varchar not null default 'Draft',
  published boolean not null default false,
  description text,
  usage_instructions text,
  storage_instructions text,
  ingredients text,
  allergens text,
  country_of_origin varchar,
  net_weight numeric,
  package_type varchar,
  subcategory varchar,
  seo_keywords text[],
  primary_image_url varchar,
  product_video_url varchar,
  internal_notes text,
  origin text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.is_staff() returns boolean
language sql stable as $$ select auth.uid() is not null $$;

create or replace function public.is_admin() returns boolean
language sql stable as $$ select auth.uid() is not null $$;

create sequence public.k2_sku_seq start 1;
create or replace function public.generate_k2_sku_internal() returns text
language plpgsql security definer set search_path='' as $$
declare v_sku text;
begin
  loop
    v_sku := 'K2-SKU-' || lpad(nextval('public.k2_sku_seq'::regclass)::text,6,'0');
    exit when not exists(select 1 from public.products where upper(sku)=upper(v_sku));
  end loop;
  return v_sku;
end
$$;

create table k2_private.admin_command_receipts (
  actor_id uuid not null,
  action text not null,
  idempotency_key uuid not null,
  payload_hash text not null check(payload_hash ~ '^[0-9a-f]{64}$'),
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key(actor_id,action,idempotency_key)
);

create table k2_private.admin_bff_secrets (
  singleton boolean primary key default true check(singleton),
  request_secret bytea not null check(octet_length(request_secret)=32)
);
insert into k2_private.admin_bff_secrets(singleton,request_secret)
values(true,decode(repeat('11',32),'hex'));

create table k2_private.admin_request_nonces (
  actor_id uuid not null,
  action text not null,
  nonce uuid not null,
  primary key(actor_id,action,nonce)
);

create or replace function k2_private.verify_admin_bff_request(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
  p_payload_text text,p_signature text
) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_inserted integer;
begin
  if auth.uid() is null or not public.is_staff()
     or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_ACCESS_REQUIRED';
  end if;
  if p_action<>'catalog_import_chunk'
     or octet_length(convert_to(p_payload_text,'UTF8'))>1048576 then
    raise exception using errcode='22023',message='K2_ADMIN_REQUEST_INVALID';
  end if;
  insert into k2_private.admin_request_nonces(actor_id,action,nonce)
  values(auth.uid(),p_action,p_nonce) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  return v_inserted=1;
end
$$;

grant usage on schema public to authenticated;
grant select,insert,update,delete on public.products to authenticated;
