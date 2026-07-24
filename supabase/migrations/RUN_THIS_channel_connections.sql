-- ============================================================================
-- K2 JIMZON — Channel connection status (real Live / Not-connected board)
-- ============================================================================
-- The admin "Channels" screen reads this table to show whether each channel is
-- actually live. Secrets NEVER live here or in the browser — they go in Supabase
-- Edge Function secrets. The backend connector updates the row below (status =
-- 'live', last_event_at = now()) every time it successfully processes an event.
-- Idempotent — safe to run once. Run in the Supabase SQL editor.
-- ============================================================================

create table if not exists public.channel_connections (
  channel       text primary key,                 -- 'shopee','lazada','tiktok','meta','whatsapp'
  display_name  text,
  status        text not null default 'not_connected',  -- 'live' | 'not_connected' | 'error'
  last_event_at timestamptz,                       -- last time real data arrived
  note          text,                              -- optional message from the backend
  updated_at    timestamptz not null default now()
);

-- Seed the five channels as "not connected" (won't overwrite existing rows)
insert into public.channel_connections (channel, display_name, status) values
  ('shopee',   'Shopee Seller Center',              'not_connected'),
  ('lazada',   'Lazada Open Platform',              'not_connected'),
  ('tiktok',   'TikTok Shop',                       'not_connected'),
  ('meta',     'Meta (Facebook & Instagram)',       'not_connected'),
  ('whatsapp', 'WhatsApp Business & Viber',         'not_connected')
on conflict (channel) do nothing;

alter table public.channel_connections enable row level security;

-- Staff may READ the status (no secrets are stored here, so this is safe)
drop policy if exists "Staff read channel status" on public.channel_connections;
create policy "Staff read channel status"
  on public.channel_connections for select to authenticated using (true);

-- Only the backend (service-role key) writes status. Service role bypasses RLS,
-- so no write policy is needed for authenticated users.

-- Live status changes push to the dashboard instantly
do $$ begin
  alter publication supabase_realtime add table public.channel_connections;
exception when duplicate_object then null; end $$;

-- ── How the backend flips a channel live (example the connector runs) ─────────
-- update public.channel_connections
--   set status = 'live', last_event_at = now(), updated_at = now(), note = null
--   where channel = 'shopee';
