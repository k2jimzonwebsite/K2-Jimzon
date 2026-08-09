-- K2 launch preflight: restore multi-channel and admin support relations when
-- historical migrations were skipped. Safe to rerun; RLS is enabled before
-- commit and no permissive policies are created here.

begin;

create table if not exists public.channel_listings (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku) on delete cascade,
  channel_source text not null,
  external_item_id text,
  external_sku_id text,
  channel_price numeric,
  status text not null default 'Active'
    check (status in ('Active', 'Paused', 'Unlinked')),
  publication_status text default 'draft',
  validation_errors jsonb not null default '[]'::jsonb,
  last_synced_at timestamptz,
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_sku_channel unique (sku, channel_source)
);

create table if not exists public.channel_credentials (
  id uuid primary key default gen_random_uuid(),
  channel_code text unique not null,
  encrypted_payload text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_allocations (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products(sku) on delete cascade,
  staff_user_id uuid references public.user_profiles(id) on delete set null,
  staff_name text not null,
  location text,
  bin text,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staff_allocations_sku_staff_uniq
  on public.staff_allocations (sku, staff_name);

create table if not exists public.product_deletions (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  product_name text,
  snapshot jsonb,
  deleted_by uuid references public.user_profiles(id) on delete set null,
  deleted_by_email text,
  deleted_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  priority text not null check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  message text not null,
  action_url text,
  read_status boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.channel_listings enable row level security;
alter table public.channel_credentials enable row level security;
alter table public.staff_allocations enable row level security;
alter table public.product_deletions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

commit;

notify pgrst, 'reload schema';
