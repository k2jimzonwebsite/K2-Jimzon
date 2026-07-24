-- Error reporting table: captures client-side crashes and failed queries so the
-- team can see problems instead of users silently hitting an error screen.
-- Additive and idempotent — safe to run on the live database.

create table if not exists public.error_reports (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  message     text,
  stack       text,
  url         text,
  user_agent  text,
  context     jsonb default '{}'::jsonb,
  status      text default 'new'
);

alter table public.error_reports enable row level security;

-- Anyone (including anonymous storefront visitors) may LOG an error…
drop policy if exists "Anyone can log errors" on public.error_reports;
create policy "Anyone can log errors"
  on public.error_reports
  for insert
  to anon, authenticated
  with check (true);

-- …but only staff may READ them. Uses the non-recursive is_staff() helper
-- created in the RLS-fix migration.
drop policy if exists "Staff read errors" on public.error_reports;
create policy "Staff read errors"
  on public.error_reports
  for select
  to authenticated
  using (public.is_staff());
