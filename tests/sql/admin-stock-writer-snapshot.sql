-- MAP-018 / IDEA-20261011-01. Owned committed synthetic setup, cold-recoverable.
set search_path='';set statement_timeout='10s';set lock_timeout='2s';
do $owned$ begin
 if session_user<>'supabase_admin' or current_database()<>'postgres'
  or current_setting('data_directory')<>'/tmp/k2-managed-data' or inet_server_addr() is not null
  or current_setting('server_version_num')<>'170006' then raise exception 'OWNED_STOCK_WRITER_REQUIRED';end if;
end $owned$;
begin;
create schema k2_stock_snapshot_probe;
revoke all on schema k2_stock_snapshot_probe from public,anon,authenticated,service_role;
grant usage on schema k2_stock_snapshot_probe to authenticated;
create table k2_stock_snapshot_probe.secret_before as table k2_private.admin_bff_secrets;
create table k2_stock_snapshot_probe.policy_before as table k2_private.category_policy_command_config;
create table k2_stock_snapshot_probe.rate_before as table k2_private.admin_request_rate_buckets;
create table k2_stock_snapshot_probe.nonce_before as table k2_private.admin_request_nonces;
create table k2_stock_snapshot_probe.hub_before as select * from public.hubs where id='HUB-MNL-CENTRAL';
-- Setup/cleanup only. The actual signed writer and every reader use origin.
set local session_replication_role=replica;
insert into auth.users(id,email,raw_user_meta_data) values('89600000-0000-4000-8000-000000000001','stock-writer@dummy.example.test','{}');
insert into public.user_profiles(id,email,role) values('89600000-0000-4000-8000-000000000001','stock-writer@dummy.example.test','Admin');
insert into public.categories(id,name) values('89600000-0000-4000-8000-000000000002','Synthetic writer snapshot category');
insert into public.hubs(id,name,code,country) values('HUB-MNL-CENTRAL','Synthetic writer hub','SYN-STOCK-WRITER-HUB','PH') on conflict(id) do update set country='PH';
insert into public.custodians(id,name,role,hub_id) values('SYN-STOCK-WRITER-CUST','Synthetic writer custodian','Synthetic','HUB-MNL-CENTRAL');
insert into public.products(sku,name,category_id,status,published) values('SYN-STOCK-WRITER','Synthetic writer snapshot','89600000-0000-4000-8000-000000000002','Draft',false);
insert into public.product_batches(id,sku,quantity,reserved_quantity,quantity_available,box_code,batch_code,expiry_date,best_before_date,hub,custodian)
select ('89600000-0000-4000-8000-00000000000'||n)::uuid,'SYN-STOCK-WRITER',case n when 3 then 10 else 20 end,1,case n when 3 then 9 else 19 end,'SYN','SYN',(statement_timestamp() at time zone 'Asia/Manila')::date+180,(statement_timestamp() at time zone 'Asia/Manila')::date+180,'HUB-MNL-CENTRAL','SYN-STOCK-WRITER-CUST' from generate_series(3,4) n;
insert into public.order_requests(id,customer_name,customer_email,idempotency_key)
select ('89600000-0000-4000-8000-00000000000'||n)::uuid,'Synthetic held customer','stock-hold@dummy.example.test','stock-writer-'||n from generate_series(5,6) n;
insert into public.order_request_items(id,order_request_id,sku,product_name,quantity,unit_price,line_total)
select ('89600000-0000-4000-8000-00000000000'||(n+2))::uuid,('89600000-0000-4000-8000-00000000000'||n)::uuid,'SYN-STOCK-WRITER','Synthetic held product',1,1,1 from generate_series(5,6) n;
insert into public.inventory_reservations(id,order_request_id,order_request_item_id,batch_id,sku,quantity)
select ('89600000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('89600000-0000-4000-8000-00000000000'||(n-4))::uuid,('89600000-0000-4000-8000-00000000000'||(n-2))::uuid,('89600000-0000-4000-8000-00000000000'||(n-6))::uuid,'SYN-STOCK-WRITER',1 from generate_series(9,10) n;
insert into public.inventory_balances(sku,location_code,on_hand,reserved) values('SYN-STOCK-WRITER','MANILA_MAIN',30,2);
insert into k2_private.admin_bff_secrets(singleton,request_secret) values(true,decode(repeat('19',32),'hex')) on conflict(singleton) do update set request_secret=excluded.request_secret;
insert into k2_private.category_policy_command_config(singleton,maximum_depth) values(true,10) on conflict(singleton) do update set maximum_depth=10;
set local session_replication_role=origin;
create function k2_stock_snapshot_probe.command() returns jsonb language plpgsql security invoker set search_path='' as $fixture$
declare payload text;t bigint;n uuid;k uuid;h text;s text;j jsonb;
begin
 if session_user<>'supabase_admin' or inet_server_addr() is not null or current_setting('session_replication_role')<>'origin' then raise exception 'OWNED_SIGNER_REQUIRED';end if;
 payload:=jsonb_build_object('sku','SYN-STOCK-WRITER','reason','Synthetic canonical writer snapshot qualification','lots',
  (select jsonb_agg(jsonb_build_object('id',id,'boxCode','SYN','batchCode','SYN','quantity',case right(id::text,1) when '3' then 4 else 6 end,
  'expiryDate',expiry_date,'landedDate','','hub','HUB-MNL-CENTRAL','custodian','SYN-STOCK-WRITER-CUST','channel','website','pinned',false,'status','available') order by id) from public.product_batches where sku='SYN-STOCK-WRITER'))::text;
 t:=extract(epoch from clock_timestamp())::bigint;n:=gen_random_uuid();k:=gen_random_uuid();
 h:=encode(extensions.digest(convert_to(payload,'UTF8'),'sha256'),'hex');
 s:=encode(extensions.hmac(convert_to(concat_ws(E'\n','lots_reconcile',t::text,n::text,auth.uid()::text,k::text,h),'UTF8'),decode(repeat('19',32),'hex'),'sha256'),'hex');
 j:=public.execute_admin_lot_command_v1('lots_reconcile',t,n,k,payload,s);
 if j->>'physicalQuantity' is distinct from '10' or j->>'sellableQuantity' is distinct from '8' or j->>'updatedLots' is distinct from '2' then raise exception 'CANONICAL_WRITER_RESULT_INVALID';end if;
 return j;
end $fixture$;
create function k2_stock_snapshot_probe.assert_snapshot(p_new boolean) returns void language plpgsql security invoker set search_path='' as $fixture$
declare j jsonb;v_sku text;v_stock bigint;begin
 if current_setting('session_replication_role')<>'origin' then raise exception 'ORIGIN_READER_REQUIRED';end if;
 j:=public.read_admin_lot_snapshot_v1('SYN-STOCK-WRITER');
 if j->>'complete' is distinct from 'true' or jsonb_array_length(j->'lots') is distinct from 2 or jsonb_array_length(j->'products') is distinct from 1
  or jsonb_array_length(j->'reservations') is distinct from 2 or jsonb_array_length(j->'orders') is distinct from 2 then raise exception 'SNAPSHOT_CARDINALITIES_INVALID';end if;
 if (select jsonb_agg(jsonb_build_array(l->>'id',l->>'quantity',l->>'reserved_quantity',l->>'quantity_available') order by l->>'id') from jsonb_array_elements(j->'lots') l)
  is distinct from jsonb_build_array(jsonb_build_array('89600000-0000-4000-8000-000000000003',case when p_new then '4' else '10' end,'1',case when p_new then '3' else '9' end),jsonb_build_array('89600000-0000-4000-8000-000000000004',case when p_new then '6' else '20' end,'1',case when p_new then '5' else '19' end)) then raise exception 'SNAPSHOT_LOTS_MIXED';end if;
 if (select jsonb_agg(jsonb_build_array(r->>'id',r->>'order_request_id',r->>'batch_id',r->>'quantity') order by r->>'id') from jsonb_array_elements(j->'reservations') r)
  is distinct from '[ ["89600000-0000-4000-8000-000000000009","89600000-0000-4000-8000-000000000005","89600000-0000-4000-8000-000000000003","1"], ["89600000-0000-4000-8000-000000000010","89600000-0000-4000-8000-000000000006","89600000-0000-4000-8000-000000000004","1"] ]'::jsonb
  or (select jsonb_agg(o->>'id' order by o->>'id') from jsonb_array_elements(j->'orders') o) is distinct from '["89600000-0000-4000-8000-000000000005","89600000-0000-4000-8000-000000000006"]'::jsonb then raise exception 'SNAPSHOT_HOLDS_OR_ORDER_LINKS_INVALID';end if;
 select sku,stock_from_batches into strict v_sku,v_stock from public.read_admin_product_stock_v1(array['SYN-STOCK-WRITER']);
 if v_sku is distinct from 'SYN-STOCK-WRITER' or v_stock is distinct from (case when p_new then 8 else 28 end) then raise exception 'STOCK_READER_MIXED';end if;
end $fixture$;
revoke all on function k2_stock_snapshot_probe.command(),k2_stock_snapshot_probe.assert_snapshot(boolean) from public,anon,authenticated,service_role;
grant execute on function k2_stock_snapshot_probe.command(),k2_stock_snapshot_probe.assert_snapshot(boolean) to authenticated;
commit;
select 'K2_STOCK_WRITER_SETUP_OK';
