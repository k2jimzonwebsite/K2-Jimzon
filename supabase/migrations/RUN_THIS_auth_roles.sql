-- ============================================================================
-- K2 JIMZON — Staff logins, roles & permissions (secure)
-- ============================================================================
-- Roles: 'Admin' (full), 'Staff' (operations), 'Customer' (storefront only).
-- Authentication is handled by Supabase Auth (bcrypt-hashed passwords / Google).
-- Authorization is enforced HERE by RLS + role — even if someone opens the admin
-- URL, they can read/write nothing without an Admin/Staff role.
-- Idempotent — safe to run once. Run in the Supabase SQL editor.
-- ============================================================================

-- 1) Non-recursive role checks (SECURITY DEFINER = can read user_profiles
--    without tripping its own RLS). is_staff() already exists from master setup.
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role::text ilike 'Admin'
  );
$$;

-- 2) RLS on user_profiles — self-service for everyone, full control for admins.
alter table public.user_profiles enable row level security;

-- Clear out any older/broad/recursive policies so these are the source of truth
drop policy if exists "Admin full access to user profiles" on public.user_profiles;
drop policy if exists "Users can view their own profile" on public.user_profiles;
drop policy if exists "Public read profiles" on public.user_profiles;

drop policy if exists "profiles_self_read" on public.user_profiles;
create policy "profiles_self_read" on public.user_profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_admin_read" on public.user_profiles;
create policy "profiles_admin_read" on public.user_profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "profiles_self_update" on public.user_profiles;
create policy "profiles_self_update" on public.user_profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_admin_update" on public.user_profiles;
create policy "profiles_admin_update" on public.user_profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3) Anti-privilege-escalation: a normal user may edit their own profile (e.g.
--    full_name) but may NOT change their own role. Only an admin can change role.
create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.role is distinct from OLD.role and not public.is_admin() then
    raise exception 'Only an admin can change a user role';
  end if;
  return NEW;
end $$;

drop trigger if exists trg_guard_role_change on public.user_profiles;
create trigger trg_guard_role_change
  before update on public.user_profiles
  for each row execute function public.guard_role_change();

-- ============================================================================
-- 4) BOOTSTRAP THE FIRST ADMIN (do this once).
--    a. Sign in once with your email (email+password or Google) so a profile row
--       is created for you.
--    b. Then run the line below with YOUR email to promote yourself:
--
--    update public.user_profiles set role = 'Admin'
--    where email = 'k2jimzonwebsite@gmail.com';
--
--    After that, you can invite/promote everyone else from the dashboard.
-- ============================================================================
