-- K2 Jimzon MAP-019: hybrid guest/account identity and universal messaging base.
-- Schema and authorization only. Submission/claim/grant BFF commands follow in
-- MAP-019/MAP-020 and must return minimal receipts.

begin;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(trim(display_name)) between 1 and 140),
  status text not null default 'active' check (status in ('active', 'merged', 'deleted')),
  created_source text not null check (created_source in (
    'website_guest', 'website_account', 'pasabuy', 'shopee', 'tiktok',
    'lazada', 'staff', 'migration'
  )),
  merged_into uuid references public.customers(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_merge_state_check check (
    (status = 'merged' and merged_into is not null and merged_into <> id)
    or (status <> 'merged' and merged_into is null)
  )
);

create table if not exists public.customer_contact_points (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  contact_kind text not null check (contact_kind in ('email', 'phone')),
  contact_value text not null check (length(trim(contact_value)) between 3 and 320),
  normalized_hash bytea not null check (octet_length(normalized_hash) = 32),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'conflict', 'revoked')),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  source text not null check (source in (
    'website_guest', 'website_account', 'pasabuy', 'shopee', 'tiktok',
    'lazada', 'staff', 'migration'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint contact_verification_state_check check (
    (verification_status = 'verified' and verified_at is not null and revoked_at is null)
    or (verification_status = 'revoked' and revoked_at is not null)
    or (verification_status in ('unverified', 'conflict') and verified_at is null and revoked_at is null)
  )
);
create index if not exists customer_contacts_customer_idx
  on public.customer_contact_points (customer_id, contact_kind);
create unique index if not exists customer_contacts_verified_identity_uidx
  on public.customer_contact_points (contact_kind, normalized_hash)
  where verification_status = 'verified' and revoked_at is null;

create table if not exists public.customer_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id uuid not null unique references public.customers(id) on delete restrict,
  verified_contact_point_id uuid not null references public.customer_contact_points(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  linked_at timestamptz not null default now(),
  linked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz
);

create table if not exists public.channel_identities (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in (
    'website', 'pasabuy', 'shopee', 'tiktok', 'lazada', 'whatsapp',
    'viber', 'messenger', 'instagram'
  )),
  external_account_ref text not null check (length(trim(external_account_ref)) between 1 and 200),
  external_customer_ref text not null check (length(trim(external_customer_ref)) between 1 and 300),
  customer_id uuid references public.customers(id) on delete restrict,
  link_status text not null default 'unlinked'
    check (link_status in ('unlinked', 'linked', 'conflict', 'revoked')),
  linked_by uuid references auth.users(id) on delete set null,
  linked_at timestamptz,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_identity_link_state_check check (
    (link_status = 'linked' and customer_id is not null and linked_at is not null and linked_by is not null)
    or (link_status in ('unlinked', 'conflict') and customer_id is null and linked_at is null)
    or (link_status = 'revoked')
  ),
  unique (channel, external_account_ref, external_customer_ref)
);

create table if not exists public.guest_access_grants (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz not null,
  max_uses integer check (max_uses is null or max_uses between 1 and 100000),
  use_count integer not null default 0 check (use_count >= 0),
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  constraint guest_grant_state_check check (
    (status = 'revoked' and revoked_at is not null and nullif(trim(revoke_reason), '') is not null)
    or (status <> 'revoked' and revoked_at is null)
  )
);
create index if not exists guest_access_grants_active_idx
  on public.guest_access_grants (token_hash, expires_at)
  where status = 'active';

create table if not exists public.guest_access_grant_scopes (
  grant_id uuid not null references public.guest_access_grants(id) on delete cascade,
  scope_kind text not null check (scope_kind in ('order_request', 'pasabuy_request', 'conversation')),
  scope_id uuid not null,
  permissions text[] not null default array['read']::text[],
  created_at timestamptz not null default now(),
  primary key (grant_id, scope_kind, scope_id),
  constraint guest_scope_permissions_check check (
    permissions <@ array['read', 'reply']::text[] and cardinality(permissions) > 0
  )
);
create index if not exists guest_grant_scopes_record_idx
  on public.guest_access_grant_scopes (scope_kind, scope_id);

create table if not exists public.customer_claim_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  contact_point_id uuid not null references public.customer_contact_points(id) on delete restrict,
  requested_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  status text not null default 'pending'
    check (status in ('pending', 'consumed', 'expired', 'cancelled', 'conflict')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint customer_claim_state_check check (
    (status = 'consumed' and consumed_at is not null)
    or (status <> 'consumed' and consumed_at is null)
  )
);
create index if not exists customer_claim_pending_idx
  on public.customer_claim_requests (requested_user_id, expires_at)
  where status = 'pending';

create or replace function public.validate_customer_account_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.customer_contact_points contact
    where contact.id = new.verified_contact_point_id
      and contact.customer_id = new.customer_id
      and contact.verification_status = 'verified'
      and contact.revoked_at is null
  ) then raise exception using errcode='23514', message='K2_VERIFIED_CONTACT_REQUIRED'; end if;
  if exists (
    select 1 from public.customer_accounts account
    where account.user_id = new.user_id and account.customer_id <> new.customer_id
  ) then raise exception using errcode='23505', message='K2_ACCOUNT_IDENTITY_CONFLICT'; end if;
  return new;
end;
$$;
revoke all on function public.validate_customer_account_link() from public, anon, authenticated;
drop trigger if exists trg_validate_customer_account_link on public.customer_accounts;
create trigger trg_validate_customer_account_link
before insert or update on public.customer_accounts
for each row execute function public.validate_customer_account_link();

create or replace function public.validate_guest_access_grant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or new.expires_at is distinct from old.expires_at)
     and (new.expires_at <= now() or new.expires_at > now() + interval '90 days') then
    raise exception using errcode='23514', message='K2_GUEST_GRANT_EXPIRY_INVALID';
  end if;
  if new.max_uses is not null and new.use_count > new.max_uses then
    raise exception using errcode='23514', message='K2_GUEST_GRANT_USE_LIMIT_INVALID';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_guest_access_grant() from public, anon, authenticated;
drop trigger if exists trg_validate_guest_access_grant on public.guest_access_grants;
create trigger trg_validate_guest_access_grant
before insert or update on public.guest_access_grants
for each row execute function public.validate_guest_access_grant();

create or replace function public.validate_guest_access_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_customer_id uuid;
begin
  select customer_id into v_customer_id from public.guest_access_grants where id = new.grant_id;
  if not found then raise exception using errcode='23503', message='K2_GUEST_GRANT_NOT_FOUND'; end if;
  if new.scope_kind = 'order_request' and not exists (
    select 1 from public.order_requests where id=new.scope_id and customer_id=v_customer_id
  ) then raise exception using errcode='23514', message='K2_GUEST_SCOPE_OWNER_MISMATCH'; end if;
  if new.scope_kind = 'pasabuy_request' and not exists (
    select 1 from public.pasabuy_requests where id=new.scope_id and customer_id=v_customer_id
  ) then raise exception using errcode='23514', message='K2_GUEST_SCOPE_OWNER_MISMATCH'; end if;
  if new.scope_kind = 'conversation' and not exists (
    select 1 from public.conversations where id=new.scope_id and customer_id=v_customer_id
  ) then raise exception using errcode='23514', message='K2_GUEST_SCOPE_OWNER_MISMATCH'; end if;
  return new;
end;
$$;
revoke all on function public.validate_guest_access_scope() from public, anon, authenticated;

create or replace function public.validate_customer_claim_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or new.expires_at is distinct from old.expires_at)
     and (new.expires_at <= now() or new.expires_at > now() + interval '30 minutes') then
    raise exception using errcode='23514', message='K2_CLAIM_EXPIRY_INVALID';
  end if;
  if (tg_op = 'INSERT' or new.status = 'consumed') and not exists (
    select 1 from public.customer_contact_points contact
    where contact.id=new.contact_point_id and contact.customer_id=new.customer_id
      and contact.verification_status='verified' and contact.revoked_at is null
  ) then raise exception using errcode='23514', message='K2_VERIFIED_CONTACT_REQUIRED'; end if;
  if exists (
    select 1 from public.customer_accounts account
    where account.user_id=new.requested_user_id and account.customer_id<>new.customer_id
      and account.status='active'
  ) then raise exception using errcode='23505', message='K2_ACCOUNT_IDENTITY_CONFLICT'; end if;
  return new;
end;
$$;
revoke all on function public.validate_customer_claim_request() from public, anon, authenticated;
drop trigger if exists trg_validate_customer_claim_request on public.customer_claim_requests;
create trigger trg_validate_customer_claim_request
before insert or update on public.customer_claim_requests
for each row execute function public.validate_customer_claim_request();

alter table public.order_requests
  add column if not exists customer_id uuid references public.customers(id) on delete restrict;
alter table public.order_requests
  add column if not exists request_fingerprint bytea;
alter table public.order_requests
  add constraint order_requests_fingerprint_size_check
  check (request_fingerprint is null or octet_length(request_fingerprint) = 32) not valid;

alter table public.pasabuy_requests
  add column if not exists customer_id uuid references public.customers(id) on delete restrict;
alter table public.pasabuy_requests
  add column if not exists request_fingerprint bytea;
alter table public.pasabuy_requests
  add column if not exists idempotency_key text;
create unique index if not exists pasabuy_requests_idempotency_uidx
  on public.pasabuy_requests (idempotency_key) where idempotency_key is not null;
alter table public.pasabuy_requests
  add constraint pasabuy_requests_fingerprint_size_check
  check (request_fingerprint is null or octet_length(request_fingerprint) = 32) not valid;

alter table public.conversations drop constraint if exists conversations_customer_id_fkey;
alter table public.conversations
  add constraint conversations_customer_id_fkey foreign key (customer_id)
  references public.customers(id) on delete restrict;
alter table public.conversations
  add column if not exists channel_identity_id uuid references public.channel_identities(id) on delete restrict;
alter table public.conversations
  add column if not exists external_conversation_id text;
alter table public.conversations
  add column if not exists consent_basis text;
alter table public.conversations
  add column if not exists last_external_event_at timestamptz;
create unique index if not exists conversations_channel_external_uidx
  on public.conversations (channel_identity_id, external_conversation_id)
  where channel_identity_id is not null and external_conversation_id is not null;

alter table public.messages
  add column if not exists direction text
  check (direction is null or direction in ('inbound', 'outbound', 'internal'));
alter table public.messages
  add column if not exists provider_event_key text;
alter table public.messages
  add column if not exists reply_to_message_id uuid references public.messages(id) on delete set null;
create unique index if not exists messages_external_per_conversation_uidx
  on public.messages (conversation_id, external_message_id)
  where conversation_id is not null and external_message_id is not null;

drop trigger if exists trg_validate_guest_access_scope on public.guest_access_grant_scopes;
create trigger trg_validate_guest_access_scope
before insert or update on public.guest_access_grant_scopes
for each row execute function public.validate_guest_access_scope();

create or replace function public.customer_record_owned_by_current_user(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.customer_accounts account
    where account.customer_id = p_customer_id
      and account.user_id = auth.uid()
      and account.status = 'active'
  );
$$;
revoke all on function public.customer_record_owned_by_current_user(uuid) from public, anon, authenticated;
grant execute on function public.customer_record_owned_by_current_user(uuid) to authenticated;

do $$
declare v_table text;
begin
  foreach v_table in array array[
    'customers', 'customer_contact_points', 'customer_accounts',
    'channel_identities', 'guest_access_grants', 'guest_access_grant_scopes',
    'customer_claim_requests'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on table public.%I from public, anon, authenticated', v_table);
  end loop;
end $$;

create policy customers_staff_or_owner_read on public.customers for select to authenticated
using (public.is_staff() or public.customer_record_owned_by_current_user(id));
create policy customer_contacts_staff_or_owner_read on public.customer_contact_points for select to authenticated
using (public.is_staff() or public.customer_record_owned_by_current_user(customer_id));
create policy customer_accounts_staff_or_self_read on public.customer_accounts for select to authenticated
using (public.is_staff() or user_id = auth.uid());
create policy channel_identities_staff_read on public.channel_identities for select to authenticated
using (public.is_staff());
create policy guest_access_grants_staff_read on public.guest_access_grants for select to authenticated
using (public.is_staff());
create policy guest_access_grant_scopes_staff_read on public.guest_access_grant_scopes for select to authenticated
using (public.is_staff());
create policy customer_claim_requests_staff_read on public.customer_claim_requests for select to authenticated
using (public.is_staff());

grant select on public.customers, public.customer_contact_points, public.customer_accounts,
  public.channel_identities, public.guest_access_grants,
  public.guest_access_grant_scopes, public.customer_claim_requests to authenticated;

-- Direct customer access to operational orders/conversations remains denied.
-- Named BFF/RPC projections will return only authorized, minimal records.

notify pgrst, 'reload schema';
commit;
