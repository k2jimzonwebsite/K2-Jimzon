-- ===========================================================================
-- K2 Jimzon — Product lifecycle status + PIN-gated deletion
-- ===========================================================================
-- Two things here:
--
--   1. Product status becomes a real, constrained lifecycle:
--        Live / Active — in the catalogue, browsable, buyable
--        Unlisted      — NOT in the catalogue, but a direct product link works
--        Draft         — invisible to customers entirely
--        Discontinued  — retired, kept for order history
--
--   2. Deleting a product now requires the operator's own 4-digit PIN, and
--      every deletion is written to an audit table with who did it.
--
-- The PIN is never sent to the browser. It is stored as a bcrypt hash and
-- checked server-side by verify_delete_pin(), which reads the row belonging to
-- auth.uid(). A leaked bundle therefore reveals nothing.
--
-- Safe to run as-is (idempotent). Run in the Supabase SQL editor.
-- ===========================================================================

create extension if not exists pgcrypto;

-- 1) Product status ----------------------------------------------------------
alter table public.products
  alter column status set default 'Draft';

update public.products set status = 'Draft' where status is null;

-- Anything not in the known set is normalised before the constraint lands, so
-- this migration can't fail on legacy rows.
update public.products
   set status = 'Draft'
 where status not in ('Live', 'Active', 'Unlisted', 'Draft', 'Discontinued');

alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check
  check (status in ('Live', 'Active', 'Unlisted', 'Draft', 'Discontinued'));

create index if not exists products_status_idx on public.products (status);

-- 2) Per-staff delete PIN ----------------------------------------------------
alter table public.user_profiles
  add column if not exists delete_pin_hash text,
  add column if not exists delete_pin_set_at timestamptz;

-- Set (or change) the calling user's own PIN. Cannot set anyone else's.
create or replace function public.set_delete_pin(new_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if new_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits';
  end if;

  update public.user_profiles
     set delete_pin_hash = crypt(new_pin, gen_salt('bf')),
         delete_pin_set_at = now()
   where id = auth.uid();

  return found;
end;
$$;

-- Check a PIN against the caller's own hash. Returns false rather than raising
-- so the UI can show a clean "wrong PIN" without leaking whether one is set.
create or replace function public.verify_delete_pin(candidate_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored text;
begin
  if auth.uid() is null then
    return false;
  end if;

  select delete_pin_hash into stored
    from public.user_profiles
   where id = auth.uid();

  if stored is null then
    return false;
  end if;

  return stored = crypt(candidate_pin, stored);
end;
$$;

-- Does the caller have a PIN configured? Lets the UI prompt for setup instead
-- of silently failing every delete.
create or replace function public.has_delete_pin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select delete_pin_hash is not null from public.user_profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.set_delete_pin(text) from public;
revoke all on function public.verify_delete_pin(text) from public;
revoke all on function public.has_delete_pin() from public;
grant execute on function public.set_delete_pin(text) to authenticated;
grant execute on function public.verify_delete_pin(text) to authenticated;
grant execute on function public.has_delete_pin() to authenticated;

-- 3) Deletion audit trail ----------------------------------------------------
-- Products are deleted for real, so the record of what existed has to outlive
-- them. Snapshot enough to answer "what was this and who removed it".
create table if not exists public.product_deletions (
  id           uuid primary key default gen_random_uuid(),
  sku          text not null,
  product_name text,
  snapshot     jsonb,
  deleted_by   uuid references public.user_profiles(id) on delete set null,
  deleted_by_email text,
  deleted_at   timestamptz not null default now()
);

create index if not exists product_deletions_sku_idx on public.product_deletions (sku);
create index if not exists product_deletions_at_idx  on public.product_deletions (deleted_at desc);

alter table public.product_deletions enable row level security;

drop policy if exists "Staff read deletions" on public.product_deletions;
create policy "Staff read deletions"
  on public.product_deletions for select to authenticated using (true);

drop policy if exists "Staff log deletions" on public.product_deletions;
create policy "Staff log deletions"
  on public.product_deletions for insert to authenticated with check (true);

-- Deletions are an audit trail: append-only, never edited or removed.
drop policy if exists "No deletion edits" on public.product_deletions;

-- 4) Atomic PIN-checked delete ----------------------------------------------
-- One call: verify the PIN, snapshot the row, delete it, log it. If the PIN is
-- wrong nothing happens. Prevents a client from skipping the check by calling
-- delete directly (RLS still applies to the table for other paths).
create or replace function public.delete_products_with_pin(skus text[], candidate_pin text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
  actor_email   text;
  rec           record;
begin
  if not public.verify_delete_pin(candidate_pin) then
    raise exception 'Invalid delete PIN';
  end if;

  select email into actor_email from public.user_profiles where id = auth.uid();

  for rec in select * from public.products where sku = any(skus) loop
    insert into public.product_deletions (sku, product_name, snapshot, deleted_by, deleted_by_email)
    values (rec.sku, rec.name, to_jsonb(rec), auth.uid(), actor_email);

    delete from public.products where sku = rec.sku;
    deleted_count := deleted_count + 1;
  end loop;

  return deleted_count;
end;
$$;

revoke all on function public.delete_products_with_pin(text[], text) from public;
grant execute on function public.delete_products_with_pin(text[], text) to authenticated;
