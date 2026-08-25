do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
create schema if not exists k2_private;
revoke all on schema k2_private from public,anon,authenticated;

create table k2_private.staff_invitation_operations (
  actor_id uuid not null,
  idempotency_key uuid not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  result jsonb,
  state text not null default 'pending' check (state in ('pending','completed','released')),
  attempt_count integer not null default 1 check (attempt_count between 1 and 3),
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (actor_id,idempotency_key)
);
revoke all on table k2_private.staff_invitation_operations from public,anon,authenticated;
