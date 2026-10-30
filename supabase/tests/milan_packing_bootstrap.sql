create extension pgcrypto;
create schema auth;
create schema extensions;
alter extension pgcrypto set schema extensions;
create schema k2_private;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select current_setting('request.jwt.claims',true)::jsonb $$;
create function public.is_staff() returns boolean language sql stable as $$ select current_setting('request.jwt.claim.role',true) in ('Admin','SuperAdmin','Staff') $$;
create function public.is_admin() returns boolean language sql stable as $$ select current_setting('request.jwt.claim.role',true) in ('Admin','SuperAdmin') $$;
create sequence public.k2_sku_seq;
create function public.generate_k2_sku_internal() returns text language sql as $$ select 'K2-SKU-'||lpad(nextval('public.k2_sku_seq')::text,6,'0') $$;
create table public.products(id uuid primary key default gen_random_uuid(),sku text unique not null,barcode text,name text not null,
 status text not null default 'Draft',published boolean not null default false,is_human_reviewed boolean not null default false,
 description text,slug text,internal_notes text,stock_available integer not null default 0,
 check(not published or is_human_reviewed));
create table public.consignments(id uuid primary key default gen_random_uuid(),manifest_code text unique,status text not null default 'Packing_Italy',
 flight_number text,departure_city text default 'Milan, Italy',destination_city text default 'Manila, Philippines',
 packed_at timestamptz,arrived_at timestamptz,created_at timestamptz default now());
create table public.consignment_items(id uuid primary key default gen_random_uuid(),consignment_id uuid references public.consignments(id),
 sku text references public.products(sku),batch_code text not null,box_code text not null,best_before_date date not null,
 expected_qty integer not null default 0 check(expected_qty>=0),italy_packed_qty integer not null default 0 check(italy_packed_qty>=0),
 manila_scanned_qty integer not null default 0 check(manila_scanned_qty>=0),status text default 'Pending',created_at timestamptz default now(),
 check (italy_packed_qty>=0));
create unique index consignment_items_manifest_lot_box_uniq
 on public.consignment_items(consignment_id,sku,batch_code,box_code);
-- Row types needed to compile the captured, non-executed receiving function.
create table public.inventory_balances(sku text,location_code text,on_hand integer);
create table public.product_batches(id uuid,sku text,box_code text,batch_code text,
 quantity_available integer,inventory_status text,hub text,custodian text);
create table public.audit_logs(id uuid primary key default gen_random_uuid(),table_name text,record_id text,action text,old_data jsonb,new_data jsonb,user_id uuid);
create table public.consignment_scan_events(id uuid primary key default gen_random_uuid(),consignment_id uuid,consignment_item_id uuid,
 sku text,stage text,resulting_qty integer,actor_id uuid,created_at timestamptz default now());
create table k2_private.admin_command_receipts(actor_id uuid,action text,idempotency_key uuid,payload_hash text,result jsonb,
 created_at timestamptz default now(),completed_at timestamptz,primary key(actor_id,action,idempotency_key));
create function k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text) returns boolean language sql as $$
 select public.is_staff() and current_setting('request.jwt.claims',true)::jsonb->>'aal'='aal2'
$$;
-- The production wrapper is installed by the runner; its command primitives are
-- deliberate unreachable fixture functions for non-packing branches.
create function public.create_consignment_manifest(text,text) returns public.consignments language sql as $$ select c from public.consignments c limit 1 $$;
create function public.add_consignment_item_v2(uuid,text,text,text,date,integer) returns public.consignment_items language sql as $$ select i from public.consignment_items i limit 1 $$;
create function public.record_consignment_item_scan(uuid,uuid,text) returns public.consignment_items language sql as $$ select i from public.consignment_items i limit 1 $$;
create function public.advance_consignment(uuid,text) returns public.consignments language sql as $$ select c from public.consignments c limit 1 $$;
create function public.finalize_consignment_receipt(uuid,text) returns public.consignments language sql as $$ select c from public.consignments c limit 1 $$;
