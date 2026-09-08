-- Extend only the disposable payment fixture for composed packing receipts.
alter table public.order_requests add column delivery_status text;
alter table public.order_request_items add column product_name text;
alter table public.inventory_reservations add column packed_quantity integer not null default 0;
alter table public.inventory_reservations add column updated_at timestamptz;
create table public.products (sku text primary key, barcode text);
insert into public.products values ('LOCAL-SKU','LOCAL-BARCODE');
create table public.orders (order_request_id uuid,sku text,order_status text);
create table public.packing_scan_events (
 order_request_id uuid,order_request_item_id uuid,reservation_id uuid,batch_id uuid,
 sku text,scanned_code text,scan_number integer,actor_id uuid
);
create function public.record_packing_scan(uuid,text) returns jsonb language sql as $$ select '{}'::jsonb $$;
