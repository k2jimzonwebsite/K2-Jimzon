-- Additional synthetic schema/Auth for the existing disposable purchase runner.
-- Commands, HMAC verification, receipts and stock functions are repository SQL.
create schema if not exists extensions;
alter extension pgcrypto set schema extensions;
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.actor',true),''),
    '20000000-0000-4000-8000-000000000001')::uuid
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select jsonb_build_object('aal',coalesce(nullif(current_setting('request.aal',true),''),'aal2'))
$$;
alter table public.order_requests add column if not exists public_reference text default 'LOCAL-COMMITMENT';
alter table public.order_requests add column if not exists fulfilled_at timestamptz;
alter table public.products add column if not exists barcode text;
create table if not exists public.packing_scan_events (
  order_request_id uuid,order_request_item_id uuid,reservation_id uuid,batch_id uuid,
  sku text,scanned_code text,scan_number integer,actor_id uuid
);
