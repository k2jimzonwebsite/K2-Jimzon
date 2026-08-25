create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema if not exists auth;
create schema if not exists k2_private;

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
create or replace function public.is_staff() returns boolean language sql stable as $$
  select auth.uid() is not null
$$;

create table k2_private.admin_bff_secrets(
  singleton boolean primary key,
  request_secret bytea not null
);
insert into k2_private.admin_bff_secrets values(true,decode(repeat('05',32),'hex'));
create table k2_private.admin_request_nonces(
  actor_id uuid not null,
  action text not null,
  nonce uuid not null,
  expires_at timestamptz not null,
  primary key(actor_id,action,nonce)
);
create table public.product_intake_sessions(
  id uuid primary key,
  created_by uuid not null
);
insert into public.product_intake_sessions(id,created_by) values(
  'e74a4161-72ca-4d72-8f59-37aa690e1869',
  '6a88b5f9-8be6-4f4d-a504-173c96f40df1'
);
grant usage on schema public,auth,extensions to authenticated;
grant execute on function auth.uid(),auth.jwt(),public.is_staff() to authenticated;
