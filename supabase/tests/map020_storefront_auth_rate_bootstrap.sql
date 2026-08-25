\set ON_ERROR_STOP on

drop schema if exists k2_private cascade;
drop schema if exists extensions cascade;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end
$$;

create schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema k2_private;
revoke all on schema k2_private from public, anon, authenticated;

create table k2_private.guest_bff_secrets (
  singleton boolean primary key default true check (singleton),
  request_secret bytea not null check (octet_length(request_secret) >= 32),
  contact_secret bytea not null check (octet_length(contact_secret) >= 32),
  configured_at timestamptz not null default now()
);
revoke all on table k2_private.guest_bff_secrets from public, anon, authenticated;
insert into k2_private.guest_bff_secrets(singleton, request_secret, contact_secret)
values (true, decode(repeat('15', 32), 'hex'), decode(repeat('16', 32), 'hex'));
