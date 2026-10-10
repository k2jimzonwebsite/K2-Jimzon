-- MAP-018: owned RAM fixture test. Synthetic claims, not JWT/BFF acceptance.
begin;
set local search_path='';
set local lock_timeout='2s';
set local statement_timeout='10s';
do $owned$ begin
 if current_database()<>'postgres' or current_user<>'supabase_admin'
 or current_setting('data_directory')<>'/tmp/k2-managed-data'
 or inet_server_addr() is not null then raise exception 'OWNED_RAM_TAXONOMY_REQUIRED';end if;
end $owned$;
insert into auth.users(id) values('ee000000-0000-4000-8000-000000000001'),('ee000000-0000-4000-8000-000000000002');
insert into public.user_profiles(id,role) values
 ('ee000000-0000-4000-8000-000000000001','Staff'),
 ('ee000000-0000-4000-8000-000000000002','Admin')
on conflict(id) do update set role=excluded.role;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $staff$ begin
 if current_user<>'authenticated' or not public.is_staff() or public.is_admin()
 then raise exception 'EXACT_NATIVE_STAFF_REQUIRED';end if;
 if not has_schema_privilege(current_user,'public','USAGE')
 or not has_table_privilege(current_user,'public.brands','SELECT,INSERT')
 or not has_table_privilege(current_user,'public.categories','SELECT,INSERT')
 or not has_column_privilege(current_user,'public.brands','id','SELECT')
 or not has_column_privilege(current_user,'public.brands','name','SELECT')
 or not has_column_privilege(current_user,'public.categories','id','SELECT')
 or not has_column_privilege(current_user,'public.categories','name','SELECT')
 then raise exception 'CAPTURED_TAXONOMY_GRANTS_REQUIRED';end if;
end $staff$;
select id,name from public.brands order by name asc limit 501;
select id,name from public.categories order by name asc limit 501;
insert into public.brands(id,name) values('ee000000-0000-4000-8000-000000000003','Synthetic captured Staff brand');
insert into public.categories(id,name) values('ee000000-0000-4000-8000-000000000004','Synthetic captured Staff category');
do $staff_rows$ begin
 if (select count(*) from public.brands where id='ee000000-0000-4000-8000-000000000003')<>1
 or (select count(*) from public.categories where id='ee000000-0000-4000-8000-000000000004')<>1
 then raise exception 'STAFF_INSERT_READBACK_REQUIRED';end if;
end $staff_rows$;
select 'K2_CAPTURED_STAFF_TAXONOMY_OK';
reset role;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $admin$ begin
 if current_user<>'authenticated' or not public.is_staff() or not public.is_admin()
 then raise exception 'EXACT_NATIVE_ADMIN_REQUIRED';end if;
end $admin$;
select id,name from public.brands order by name asc limit 501;
select id,name from public.categories order by name asc limit 501;
insert into public.brands(id,name) values('ee000000-0000-4000-8000-000000000005','Synthetic captured Admin brand');
insert into public.categories(id,name) values('ee000000-0000-4000-8000-000000000006','Synthetic captured Admin category');
do $admin_rows$ begin
 if (select count(*) from public.brands where id='ee000000-0000-4000-8000-000000000005')<>1
 or (select count(*) from public.categories where id='ee000000-0000-4000-8000-000000000006')<>1
 then raise exception 'ADMIN_INSERT_READBACK_REQUIRED';end if;
end $admin_rows$;
select 'K2_CAPTURED_ADMIN_TAXONOMY_OK';
rollback;
