-- MAP-023 / OWNER-002 — give reservations a deadline.
--
-- public.inventory_reservations has existed since 20260809 with an active /
-- released / fulfilled status, but nothing ever expires. A hold with no deadline
-- is not a hold: it is stock that leaves the sellable pool the first time someone
-- abandons a checkout and never comes back. This adds the deadline the owner
-- specified on 2 September 2026, and the one operation that acts on it.
--
-- Additive only. No existing column, constraint, or function changes behaviour,
-- and existing rows get a null deadline, which this code treats as "unknown, do
-- not touch" rather than as overdue.
--
-- The owner's policy, in full:
--   * a cart holds nothing, for any length of time;
--   * clicking purchase reserves the exact lots for 30 minutes;
--   * staff may extend, but never by less than 30 minutes or more than 7 days;
--   * confirmation deducts; expiry releases.
-- Pasabuy and wholesale take no hold at all — those are history records.

begin;

do $preflight$
begin
  if to_regclass('public.inventory_reservations') is null
     or to_regprocedure('public.is_staff()') is null then
    raise exception 'MAP-023 reservation expiry: inventory_reservations and is_staff() are required';
  end if;
end
$preflight$;

alter table public.inventory_reservations
  add column if not exists expires_at timestamptz,
  add column if not exists hold_minutes integer,
  add column if not exists extension_count integer not null default 0,
  add column if not exists last_extended_at timestamptz,
  add column if not exists last_extended_by uuid,
  add column if not exists last_extension_reason text,
  add column if not exists released_at timestamptz,
  add column if not exists release_cause text;

do $constraints$
begin
  if not exists (select 1 from pg_constraint where conname = 'inventory_reservations_hold_minutes_check') then
    alter table public.inventory_reservations add constraint inventory_reservations_hold_minutes_check
      check (hold_minutes is null or (hold_minutes >= 1 and hold_minutes <= 10080));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'inventory_reservations_extension_count_check') then
    alter table public.inventory_reservations add constraint inventory_reservations_extension_count_check
      check (extension_count >= 0 and extension_count <= 50);
  end if;
  -- A release must say why. "Released" with no cause is the state that makes a
  -- stock discrepancy impossible to investigate three weeks later.
  if not exists (select 1 from pg_constraint where conname = 'inventory_reservations_release_cause_check') then
    alter table public.inventory_reservations add constraint inventory_reservations_release_cause_check
      check (
        release_cause is null
        or release_cause in ('expired', 'cancelled', 'staff_released', 'superseded')
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'inventory_reservations_released_has_cause_check') then
    alter table public.inventory_reservations add constraint inventory_reservations_released_has_cause_check
      check (status <> 'released' or release_cause is not null);
  end if;
  -- An extension must be attributable. An anonymous extension is indistinguishable
  -- from stock quietly going missing.
  if not exists (select 1 from pg_constraint where conname = 'inventory_reservations_extension_attributed_check') then
    alter table public.inventory_reservations add constraint inventory_reservations_extension_attributed_check
      check (
        extension_count = 0
        or (last_extended_at is not null and last_extended_by is not null
            and char_length(btrim(coalesce(last_extension_reason, ''))) >= 10)
      );
  end if;
end
$constraints$;

comment on column public.inventory_reservations.expires_at is
  'When this hold ends. Null means unknown and is never treated as overdue: releasing on unknown would cancel a live customer''s hold.';
comment on column public.inventory_reservations.release_cause is
  'Why the hold ended. Required whenever status is released, so a stock movement can always be explained.';

-- Only active rows with a real deadline are ever candidates for release, so the
-- sweep never scans the whole history.
create index if not exists inventory_reservations_due_idx
  on public.inventory_reservations (expires_at)
  where status = 'active' and expires_at is not null;

-- ---------------------------------------------------------------------------
-- Release every hold whose deadline has passed.
--
-- Idempotent by construction: it selects only 'active' rows and leaves each one
-- 'released', so running it twice releases nothing the second time. Rows are
-- locked FOR UPDATE SKIP LOCKED so two concurrent sweeps cannot double-release
-- the same reservation and decrement reserved_quantity twice.
-- ---------------------------------------------------------------------------

create or replace function public.release_expired_reservations_v1(p_limit integer default 500)
returns table(released_count integer, released_ids uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_ids uuid[] := '{}';
  v_count integer := 0;
begin
  if not public.is_staff() then
    raise exception 'STAFF_REQUIRED' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'RELEASE_LIMIT_INVALID' using errcode = '22023';
  end if;

  for v_row in
    select r.id, r.batch_id, r.sku, r.quantity
    from public.inventory_reservations r
    where r.status = 'active'
      and r.expires_at is not null
      and r.expires_at <= now()
    order by r.expires_at
    limit p_limit
    for update skip locked
  loop
    -- Return the units to the exact batch they were taken from. greatest() guards
    -- against ever driving reserved_quantity negative if a prior partial release
    -- was recorded by another path.
    update public.product_batches
    set reserved_quantity = greatest(reserved_quantity - v_row.quantity, 0),
        updated_at = now()
    where id = v_row.batch_id;

    update public.inventory_balances
    set reserved = greatest(reserved - v_row.quantity, 0), updated_at = now()
    where sku = v_row.sku and location_code = 'MANILA_MAIN';

    update public.inventory_reservations
    set status = 'released',
        released_at = now(),
        release_cause = 'expired',
        updated_at = now()
    where id = v_row.id;

    v_ids := v_ids || v_row.id;
    v_count := v_count + 1;
  end loop;

  return query select v_count, v_ids;
end;
$$;

revoke all on function public.release_expired_reservations_v1(integer) from public, anon;
grant execute on function public.release_expired_reservations_v1(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- What staff need to see: holds that are about to lapse.
-- ---------------------------------------------------------------------------

create or replace view public.v_reservations_due
with (security_invoker = true)
as
select
  r.id,
  r.order_request_id,
  r.sku,
  r.quantity,
  r.expires_at,
  r.extension_count,
  greatest(0, floor(extract(epoch from (r.expires_at - now())) / 60)::integer) as minutes_remaining,
  (r.expires_at <= now()) as is_overdue
from public.inventory_reservations r
where r.status = 'active' and r.expires_at is not null;

revoke all on public.v_reservations_due from public, anon;
grant select on public.v_reservations_due to authenticated;

commit;
