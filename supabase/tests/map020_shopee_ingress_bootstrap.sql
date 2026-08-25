\set ON_ERROR_STOP on

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end
$$;

create schema k2_private;
grant usage on schema public to anon, authenticated, service_role;

create table public.channel_event_inbox (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('shopee', 'tiktok', 'lazada')),
  external_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'received'
    check (status in ('received', 'processing', 'processed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, external_event_id)
);

alter table public.channel_event_inbox enable row level security;
revoke all on public.channel_event_inbox from anon, authenticated;

