do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.actor', true), '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select jsonb_build_object('aal', current_setting('request.aal', true))
$$;
create function public.is_staff() returns boolean language sql stable as $$ select auth.uid() is not null $$;
create function public.is_admin() returns boolean language sql stable as $$ select false $$;
create table public.products (
  id uuid primary key, status text, name text, brand_id uuid, category_id uuid,
  srp numeric, retail_price numeric, primary_image_url text, is_human_reviewed boolean,
  updated_at timestamptz
);
create table public.product_intake_sessions (
  id uuid primary key, product_id uuid, created_by uuid, packaging_images jsonb,
  checklist_step text, status text, completed_at timestamptz
);
create table public.audit_logs (
  table_name text, record_id text, action text, old_data jsonb, new_data jsonb, user_id uuid
);
