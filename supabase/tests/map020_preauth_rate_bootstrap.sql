\set ON_ERROR_STOP on

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

create schema extensions;
create schema k2_private;
create extension if not exists pgcrypto with schema extensions;

create table k2_private.admin_bff_secrets (
  singleton boolean primary key default true check (singleton),
  request_secret bytea not null check (octet_length(request_secret) = 32),
  configured_at timestamptz not null default now()
);
insert into k2_private.admin_bff_secrets(singleton, request_secret)
values (true, decode(repeat('17', 32), 'hex'));

revoke all on schema k2_private from public, anon, authenticated;
revoke all on table k2_private.admin_bff_secrets from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

