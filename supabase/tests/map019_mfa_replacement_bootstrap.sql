do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema auth;
create schema extensions;
create schema k2_private;
create extension if not exists pgcrypto with schema extensions;

create table auth.users(id uuid primary key);
insert into auth.users(id) values('10000000-0000-4000-8000-000000000001');

create or replace function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable
as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;

create table k2_private.admin_bff_secrets(singleton boolean primary key default true);
insert into k2_private.admin_bff_secrets(singleton) values(true);

create or replace function public.is_admin() returns boolean language sql stable
as $$ select auth.uid() is not null $$;

create or replace function k2_private.verify_admin_bff_request(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
  p_payload_text text,p_signature text
) returns boolean language sql as $$ select true $$;

revoke all on schema k2_private from public,anon,authenticated;
grant usage on schema public,auth to anon,authenticated;
