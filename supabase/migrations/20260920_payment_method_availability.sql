-- Prepared MAP-023 Cash on Delivery availability switch (IDEA-20260920-12).
-- Additive only. COD stays OFF until an Admin switches it on: the seed row
-- ships with available = false, every consumer treats a missing or unreadable
-- row as unavailable, and the trigger below refuses only newly claimed COD
-- notes while leaving existing rows and unrelated updates untouched.
-- Apply in the MAP-017 window; do not run under any earlier approval.

begin;

create table if not exists public.payment_method_availability (
  method text primary key,
  cod_available boolean not null default false,
  updated_by uuid null,
  updated_at timestamptz not null default now()
);

alter table public.payment_method_availability enable row level security;

drop policy if exists payment_availability_anon_read on public.payment_method_availability;
create policy payment_availability_anon_read on public.payment_method_availability
  for select to anon, authenticated using (true);

drop policy if exists payment_availability_staff_write on public.payment_method_availability;
create policy payment_availability_staff_write on public.payment_method_availability
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Grants stay narrow and tolerate bare loopback instances the same way the
-- multi-shop migration does; Supabase projects always carry these roles.
do $$ begin
  grant select on public.payment_method_availability to anon, authenticated;
exception when undefined_object then null; end $$;
do $$ begin
  grant update on public.payment_method_availability to authenticated;
exception when undefined_object then null; end $$;

insert into public.payment_method_availability (method, cod_available)
values ('cod', false)
on conflict (method) do nothing;

-- Defense in depth behind the checkout and BFF gates: refuse order rows that
-- newly claim Cash on Delivery while the switch is off. Updates that leave
-- the note untouched always pass, so existing rows keep reconciling.
create or replace function public.check_cod_availability()
returns trigger
language plpgsql
set search_path = '' as $$
declare
  v_available boolean;
begin
  if tg_op = 'UPDATE'
    and new.customer_note is not distinct from old.customer_note then
    return new;
  end if;
  if position('cash on delivery' in lower(coalesce(new.customer_note, ''))) = 0 then
    return new;
  end if;
  select cod_available into v_available
  from public.payment_method_availability
  where method = 'cod';
  if coalesce(v_available, false) = false then
    raise exception using errcode = 'K2COD', message = 'COD_UNAVAILABLE';
  end if;
  return new;
end; $$;

-- Trigger functions fire without EXECUTE, so close the default PUBLIC grant
-- the same way the function lockdown migration does; the gate refuses any
-- unexpected PUBLIC function grant.
do $$ begin
  revoke all on function public.check_cod_availability() from public, anon, authenticated;
exception when undefined_object then null; end $$;

-- Attach only where the orders table exists; the loopback rehearsal provides
-- a minimal stub, and replay stays idempotent either way.
do $$ begin
  if to_regclass('public.order_requests') is not null then
    drop trigger if exists check_cod_availability_trigger on public.order_requests;
    create trigger check_cod_availability_trigger
      before insert or update on public.order_requests
      for each row execute function public.check_cod_availability();
  end if;
end $$;

commit;
