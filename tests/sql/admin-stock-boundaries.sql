-- MAP-018 / IDEA-20261011-01. Owned synthetic reader qualification only.
-- Seed setup bypasses writer triggers locally; this does not qualify writers.
set search_path='';set statement_timeout='10s';set lock_timeout='2s';
do $owned$ begin
 if session_user<>'supabase_admin' or current_database()<>'postgres'
  or current_setting('data_directory')<>'/tmp/k2-managed-data' or inet_server_addr() is not null
  or current_setting('server_version_num')<>'170006' then raise exception 'OWNED_STOCK_BOUNDARY_REQUIRED';end if;
end $owned$;
begin;
insert into auth.users(id,email,raw_user_meta_data) values('89500000-0000-4000-8000-000000000001','stock-reader@dummy.example.test','{}');
update public.user_profiles set role='Staff' where id='89500000-0000-4000-8000-000000000001';
-- Only disposable seed construction; all triggers are restored before readers.
set local session_replication_role=replica;
insert into public.categories(id,name) values('89500000-0000-4000-8000-000000000002','Synthetic stock boundary category');
insert into public.hubs(id,name,code,country) values('HUB-MNL-CENTRAL','Synthetic stock hub','SYN-STOCK-BOUNDARY','PH') on conflict(id) do update set country='PH';
insert into public.custodians(id,name,role,hub_id) values('SYN-STOCK-CUSTODIAN','Synthetic stock custodian','Synthetic','HUB-MNL-CENTRAL');
insert into k2_private.category_policy_command_config(singleton,maximum_depth) values(true,10) on conflict(singleton) do update set maximum_depth=10;
insert into public.products(sku,name,category_id,status,published) values('SYN-STOCK-BOUNDARY','Synthetic reader stock','89500000-0000-4000-8000-000000000002','Draft',false);
insert into public.product_batches(id,sku,quantity,reserved_quantity,quantity_available,expiry_date,hub,custodian)
values('89500000-0000-4000-8000-000000000003','SYN-STOCK-BOUNDARY',10,3,7,(statement_timestamp() at time zone 'Asia/Manila')::date+180,'HUB-MNL-CENTRAL','SYN-STOCK-CUSTODIAN');
set local session_replication_role=origin;
create function pg_temp.assert_stock(p_expected bigint) returns void language plpgsql security invoker set search_path='' as $assert$
declare v_sku text;v_stock bigint;begin
 select sku,stock_from_batches into strict v_sku,v_stock from public.read_admin_product_stock_v1(array['SYN-STOCK-BOUNDARY']);
 if v_sku is distinct from 'SYN-STOCK-BOUNDARY' or v_stock is distinct from p_expected then raise exception 'STOCK_EXACT_ROW_OR_VALUE_INVALID';end if;
end $assert$;
do $temp$ begin execute format('grant usage on schema %I to authenticated',(select nspname from pg_catalog.pg_namespace where oid=pg_my_temp_schema()));end $temp$;
grant execute on function pg_temp.assert_stock(bigint) to authenticated;
set local request.jwt.claims='{"sub":"89500000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}';
set local role authenticated;
do $held$ declare j jsonb;begin
 perform pg_temp.assert_stock(7);
 j:=public.read_admin_lot_snapshot_v1('SYN-STOCK-BOUNDARY');
 if j->>'complete' is distinct from 'true' or jsonb_array_length(j->'lots') is distinct from 1
  or j->'lots'->0->>'quantity' is distinct from '10' or j->'lots'->0->>'reserved_quantity' is distinct from '3' then raise exception 'STOCK_PHYSICAL_HELD_SNAPSHOT_INVALID';end if;
end $held$;
reset role;
set local session_replication_role=replica;
update public.user_profiles set role='SuperAdmin' where id='89500000-0000-4000-8000-000000000001';
set local session_replication_role=origin;
set local role authenticated;
do $super$ begin
 perform pg_temp.assert_stock(7);
 if public.read_admin_lot_snapshot_v1('SYN-STOCK-BOUNDARY')->>'complete' is distinct from 'true' then raise exception 'SUPERADMIN_STOCK_READ_FAILED';end if;
end $super$;
reset role;
set local session_replication_role=replica;
update public.user_profiles set role='Customer' where id='89500000-0000-4000-8000-000000000001';
set local session_replication_role=origin;
set local role authenticated;
do $customer$ begin
 begin perform public.read_admin_product_stock_v1(array['SYN-STOCK-BOUNDARY']);raise exception 'CUSTOMER_STOCK_ADMITTED';exception when insufficient_privilege then if sqlerrm<>'K2_ADMIN_REQUIRED' then raise;end if;end;
 begin perform public.read_admin_lot_snapshot_v1('SYN-STOCK-BOUNDARY');raise exception 'CUSTOMER_LOTS_ADMITTED';exception when insufficient_privilege then if sqlerrm<>'K2_ADMIN_REQUIRED' then raise;end if;end;
end $customer$;
reset role;
set local session_replication_role=replica;
update public.user_profiles set role='Staff' where id='89500000-0000-4000-8000-000000000001';
set local session_replication_role=origin;
-- Construct only synthetic reader states; canonical writers remain unqualified.
set local session_replication_role=replica;
update public.product_batches set expiry_date=(statement_timestamp() at time zone 'Asia/Manila')::date+60,
 clearance_approved_at=statement_timestamp(),clearance_approved_by='89500000-0000-4000-8000-000000000001' where id='89500000-0000-4000-8000-000000000003';
set local session_replication_role=origin;
set local role authenticated;
do $unproven$ begin
 perform pg_temp.assert_stock(0);
end $unproven$;
reset role;
insert into public.batch_change_events(batch_id,sku,actor_id,reason,new_data,created_at)
select id,sku,clearance_approved_by,'Explicit synthetic clearance evidence',jsonb_build_object('expiry_date',expiry_date,'clearance_approved',true),clearance_approved_at from public.product_batches where id='89500000-0000-4000-8000-000000000003';
set local role authenticated;
do $clearance$ begin
 perform pg_temp.assert_stock(7);
end $clearance$;
reset role;
set local session_replication_role=replica;
update public.product_batches set inventory_status='quarantine' where id='89500000-0000-4000-8000-000000000003';
set local session_replication_role=origin;
set local role authenticated;
do $quarantine$ begin
 perform pg_temp.assert_stock(0);
end $quarantine$;
reset role;
set local session_replication_role=replica;
update public.products set category_id=null where sku='SYN-STOCK-BOUNDARY';
set local session_replication_role=origin;
set local role authenticated;
do $unknown$ begin
 perform pg_temp.assert_stock(null);
end $unknown$;
reset role;
set local session_replication_role=replica;
insert into public.product_batches(sku,quantity,reserved_quantity,quantity_available) select 'SYN-STOCK-BOUNDARY',0,0,0 from generate_series(1,200);
set local session_replication_role=origin;
set local role authenticated;
do $cap$ begin
 begin perform public.read_admin_lot_snapshot_v1('SYN-STOCK-BOUNDARY');raise exception 'PARTIAL_LOT_SCOPE_ADMITTED';exception when program_limit_exceeded then if sqlerrm<>'K2_ADMIN_LOT_READ_SCOPE_TOO_LARGE' then raise;end if;end;
end $cap$;
rollback;
select 'K2_ADMIN_STOCK_BOUNDARY_CHECKS_OK';
