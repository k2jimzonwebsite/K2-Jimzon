do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth;
create schema extensions;
create extension pgcrypto with schema extensions;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.actor', true), '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select jsonb_build_object('aal', current_setting('request.aal', true))
$$;
create function public.is_staff() returns boolean language sql stable as $$ select auth.uid() is not null $$;
create table public.order_requests (
  id uuid primary key, public_reference text, status text, payment_status text,
  updated_at timestamptz default clock_timestamp()
);
create table public.order_request_events (
  id bigint generated always as identity primary key, order_request_id uuid,
  from_status text, to_status text, reason text, actor_id uuid, metadata jsonb,
  created_at timestamptz default clock_timestamp()
);
create table public.order_request_items (id uuid primary key, order_request_id uuid, sku text, quantity integer);
create table public.product_batches (
  id uuid primary key, sku text, quantity integer, reserved_quantity integer,
  inventory_status text, expiry_date date, best_before_date date,
  clearance_approved_at timestamptz
);
create table public.inventory_reservations (
  id uuid primary key, order_request_id uuid, order_request_item_id uuid,
  batch_id uuid, sku text, quantity integer, status text, expires_at timestamptz
);
create table public.inventory_balances (
  sku text, location_code text, on_hand integer, reserved integer,
  primary key(sku,location_code)
);
insert into public.inventory_balances values ('LOCAL-SKU','MANILA_MAIN',3,1);
select set_config('request.actor', '11111111-1111-4111-8111-111111111111', false);
select set_config('request.aal', 'aal2', false);
insert into order_requests(id,public_reference,status,payment_status) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','LOCAL-PAYMENT','confirmed','failed');
insert into order_request_items values
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','LOCAL-SKU',1);
insert into product_batches values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','LOCAL-SKU',3,1,'available',current_date+120,null,null);
insert into inventory_reservations values
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'LOCAL-SKU',1,'active',now()+interval '30 minutes');
insert into order_request_events(order_request_id,from_status,to_status,reason,actor_id,metadata)
 values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','confirmed','confirmed','Rejected first proof',auth.uid(),
 '{"event":"payment_status_changed","from":"evidence_submitted","to":"failed"}');
