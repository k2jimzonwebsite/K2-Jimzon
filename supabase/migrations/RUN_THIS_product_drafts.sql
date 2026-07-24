-- ============================================================================
-- K2 JIMZON — AI product drafts (review queue from the Italy side)
-- ============================================================================
-- The Italy operator's AI writes proposed listings into this table. Staff review
-- them on the "AI Sourcing" screen and approve → the row is turned into a real
-- product. Until a draft arrives, the screen honestly shows an empty state.
-- Idempotent — safe to run once. Run in the Supabase SQL editor.
-- ============================================================================

create table if not exists public.product_drafts (
  id              uuid primary key default gen_random_uuid(),
  sku             text,
  name            text,
  srp             numeric,
  wholesale_price numeric,
  stock_available integer,
  origin          text,
  size            text,
  description     text,
  why_buy         text,
  why_rare        text,
  pairings        text[] default '{}',
  ai_confidence   numeric,          -- 0..1 from the AI
  raw_json        jsonb,            -- the raw payload the AI produced
  status          text not null default 'pending',  -- pending | approved | rejected
  created_at      timestamptz not null default now()
);

create index if not exists product_drafts_status_idx on public.product_drafts (status);

alter table public.product_drafts enable row level security;

-- Staff (signed-in) can read and manage the queue; the backend AI writes with
-- the service-role key (which bypasses RLS).
drop policy if exists "Staff manage product_drafts" on public.product_drafts;
create policy "Staff manage product_drafts"
  on public.product_drafts for all to authenticated using (true) with check (true);

-- New drafts appear on screen instantly
do $$ begin
  alter publication supabase_realtime add table public.product_drafts;
exception when duplicate_object then null; end $$;
