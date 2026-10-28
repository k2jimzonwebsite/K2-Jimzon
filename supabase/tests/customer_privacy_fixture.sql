\set ON_ERROR_STOP on
-- Synthetic extension of the existing minimal account fixture, not hosted evidence.
alter table public.order_requests add column payment_evidence jsonb not null default '{}',
  add column shipping_quote_status text default 'waived', add column subtotal numeric default 10,
  add column shipping_amount numeric default 0;
alter table public.order_requests add column idempotency_key text default repeat('k',64);
create table public.order_request_items (
  id uuid primary key default gen_random_uuid(), order_request_id uuid references public.order_requests(id),
  sku text, product_name text, quantity integer, unit_price numeric, line_total numeric
);
create table k2_private.order_payment_receipts (
  id uuid primary key, order_id uuid references public.order_requests(id),
  media_type text, contents bytea, byte_size integer, payment_reference text, submitted_at timestamptz default now(),request_key uuid default gen_random_uuid(),sha256 text
);
create table k2_private.order_delivery_snapshots (order_id uuid primary key);
create function k2_private.project_express_quote_v1(uuid) returns jsonb language sql as $$ select null::jsonb $$;
do $$ begin if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if; end $$;
create table public.channel_identities(id uuid primary key default gen_random_uuid(),customer_id uuid,link_status text,external_customer_ref text,provenance jsonb,updated_at timestamptz);
create table public.wholesale_inquiries(id uuid primary key default gen_random_uuid(),customer_id uuid,status text);
create table public.conversation_events(id uuid primary key default gen_random_uuid(),conversation_id uuid,event_type text,reason text,metadata jsonb default '{}');
alter table public.conversation_events add column actor_id uuid,add column created_at timestamptz default now();
alter table public.conversations add column resolved_at timestamptz;
alter table public.messages add column external_message_id text,add column failure_reason text;
create schema k2_test;
create function k2_test.signature(text,bigint,uuid,text,text) returns text language sql as $$
  select encode(extensions.hmac(convert_to($1||E'\n'||$2::text||E'\n'||$3::text||E'\n'||
    encode(extensions.digest(convert_to($4,'UTF8'),'sha256'),'hex')||E'\n'||$5,'UTF8'),request_secret,'sha256'),'hex')
  from k2_private.guest_bff_secrets where singleton=true
$$;
create function k2_test.portfolio(payload jsonb) returns jsonb language plpgsql as $$
declare ts bigint:=extract(epoch from clock_timestamp())::bigint; nonce uuid:=gen_random_uuid(); txt text:=payload::text;
begin return public.read_customer_portfolio_v1(ts,nonce,txt,repeat('a',64),k2_test.signature('account_read',ts,nonce,txt,repeat('a',64))); end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('10000000-0000-4000-8000-000000000001','a@example.test',now()),('10000000-0000-4000-8000-000000000002','b@example.test',now());
insert into public.customers(id,display_name,created_source) values
 ('20000000-0000-4000-8000-000000000001','Buyer A','website_guest'),('20000000-0000-4000-8000-000000000002','Buyer B','website_guest');
insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,verification_status,verified_at,source)
 select ('30000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('20000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 'email',case n when 1 then 'a@example.test' else 'b@example.test' end,extensions.digest(n::text,'sha256'),'verified',now(),'website_guest' from generate_series(1,2)n;
insert into public.customer_accounts(user_id,customer_id,verified_contact_point_id)
 select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('20000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 ('30000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,2)n;
insert into public.order_requests(id,public_reference,customer_id,status,payment_status,total_amount,payment_evidence,created_at)
 select ('40000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'WEB-TEST-'||lpad(n::text,3,'0'),
 '20000000-0000-4000-8000-000000000001','fulfilled','verified',10,
 case when n=21 then '{}'::jsonb else '{"amount":10,"currency":"PHP","method":"GCash","payment_reference":"OWN"}'::jsonb end,
 '2026-10-01T00:00:00Z'::timestamptz + n*interval '1 minute' from generate_series(1,21)n;
insert into public.order_requests(id,public_reference,customer_id,status,payment_status,total_amount,payment_evidence)
 values('40000000-0000-4000-8000-000000000099','WEB-FOREIGN','20000000-0000-4000-8000-000000000002','fulfilled','verified',999,'{"amount":999,"currency":"PHP"}');
insert into public.order_request_items(order_request_id,sku,product_name,quantity,unit_price,line_total)
 select id,'SKU-TEST','Synthetic item',2,5,10 from public.order_requests where customer_id='20000000-0000-4000-8000-000000000001';
insert into k2_private.order_delivery_snapshots select id from public.order_requests;
insert into k2_private.order_payment_receipts(id,order_id,media_type,contents,byte_size,payment_reference) values
 ('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','application/pdf',convert_to('synthetic proof bytes','UTF8'),21,'OWN'),
 ('50000000-0000-4000-8000-000000000099','40000000-0000-4000-8000-000000000099','application/pdf',convert_to('FOREIGN PRIVATE CONTENT','UTF8'),23,'FOREIGN');
