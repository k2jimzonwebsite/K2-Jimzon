do $$ begin
 if to_regprocedure('public.execute_admin_website_listing_command_v1(text,bigint,uuid,uuid,text,text)') is null
 then raise exception 'WEBSITE_ASSIGNMENT_BOUNDARY_MISSING'; end if;
end $$;

insert into auth.users(id) values
 ('41000000-0000-4000-8000-000000000001'),('41000000-0000-4000-8000-000000000002');
insert into public.user_profiles(id,role) values
 ('41000000-0000-4000-8000-000000000001','Admin'),('41000000-0000-4000-8000-000000000002','Staff')
 on conflict(id) do update set role=excluded.role;
insert into k2_private.admin_bff_secrets(singleton,request_secret)
values(true,extensions.gen_random_bytes(32))
on conflict(singleton) do update set request_secret=excluded.request_secret;
insert into public.products(sku,name,status,srp,primary_image_url,is_human_reviewed,published)
values('LOCAL-WEBSITE-OFFER','Isolated reviewed product','Live',100,'https://example.test/fixture.jpg',true,true);

create function pg_temp.website_command(p_payload jsonb,p_key uuid default gen_random_uuid()) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_action text:='website_listing_set'; v_ts bigint:=floor(extract(epoch from clock_timestamp()))::bigint;
 v_nonce uuid:=gen_random_uuid(); v_text text:=p_payload::text; v_hash text; v_signature text;
begin
 v_hash:=encode(extensions.digest(convert_to(v_text,'UTF8'),'sha256'),'hex');
 v_signature:=encode(extensions.hmac(convert_to(v_action||E'\n'||v_ts||E'\n'||v_nonce||E'\n'||auth.uid()||E'\n'||p_key||E'\n'||v_hash,'UTF8'),
  (select request_secret from k2_private.admin_bff_secrets where singleton),'sha256'),'hex');
 return public.execute_admin_website_listing_command_v1(v_action,v_ts,v_nonce,p_key,v_text,v_signature);
end $$;
revoke all on function pg_temp.website_command(jsonb,uuid) from public;
grant execute on function pg_temp.website_command(jsonb,uuid) to authenticated;
create function pg_temp.website_expect_error(p_sql text,p_expected text) returns void
language plpgsql as $$ begin
 begin execute p_sql; exception when others then
  if sqlerrm=p_expected then return; end if; raise;
 end;
 raise exception 'EXPECTED_DENIAL_MISSING: %',p_expected;
end $$;

do $$ begin
 if has_function_privilege('anon','public.execute_admin_website_listing_command_v1(text,bigint,uuid,uuid,text,text)','EXECUTE')
 or not has_function_privilege('authenticated','public.execute_admin_website_listing_command_v1(text,bigint,uuid,uuid,text,text)','EXECUTE')
 or has_function_privilege('anon','k2_private.require_website_order_items(jsonb)','EXECUTE')
 or has_function_privilege('authenticated','k2_private.require_website_order_items(jsonb)','EXECUTE')
 or has_table_privilege('authenticated','public.channel_listings','INSERT,UPDATE,DELETE')
 then raise exception 'WEBSITE_BROWSER_PRIVILEGE_BOUNDARY_INVALID'; end if;
 perform pg_temp.website_expect_error($q$select k2_private.require_website_order_items('[{"sku":"LOCAL-WEBSITE-OFFER","quantity":1}]')$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
end $$;
create temp table website_identity_baseline as select count(*) customers from public.customers;
set local role anon;
select pg_temp.website_expect_error($q$select public.execute_admin_website_listing_command_v1('website_listing_set',0,gen_random_uuid(),gen_random_uuid(),'{}','')$q$,'permission denied for function execute_admin_website_listing_command_v1');
select pg_temp.website_expect_error($q$select __GUEST_DENIED_CALL__$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
reset role;
do $$ begin
 if (select count(*) from public.customers)<>(select customers from website_identity_baseline)
 or (select count(*) from public.order_requests)<>(select orders from website_fixture_baseline)
 then raise exception 'REJECTED_WEBSITE_ORDER_CREATED_RECORDS'; end if;
end $$;

select set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
select pg_temp.website_expect_error($q$select pg_temp.website_command('{"sku":"LOCAL-WEBSITE-OFFER","assigned":true,"expectedUpdatedAt":null,"reason":"Reviewed selection"}')$q$,'K2_ADMIN_REQUIRED');
reset role;
select set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
set local role authenticated;
select pg_temp.website_expect_error($q$select pg_temp.website_command('{"sku":"LOCAL-WEBSITE-OFFER","assigned":true,"expectedUpdatedAt":null,"reason":"Reviewed selection"}')$q$,'K2_ADMIN_REQUIRED');
reset role;
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
select pg_temp.website_expect_error($q$update public.channel_listings set status='Paused'$q$,'permission denied for table channel_listings');
-- Actual authenticated calls exercise NULL and forged HMAC denial, not only ACL metadata.
select pg_temp.website_expect_error($q$select public.execute_admin_website_listing_command_v1('website_listing_set',floor(extract(epoch from now()))::bigint,gen_random_uuid(),gen_random_uuid(),'{"sku":"LOCAL-WEBSITE-OFFER","assigned":true,"expectedUpdatedAt":null,"reason":"Bypass attempt"}',null)$q$,'K2_ADMIN_REQUEST_INVALID');
select pg_temp.website_expect_error($q$select public.execute_admin_website_listing_command_v1('website_listing_set',null,gen_random_uuid(),gen_random_uuid(),'{}',repeat('0',64))$q$,'K2_ADMIN_REQUEST_INVALID');
select pg_temp.website_expect_error($q$select public.execute_admin_website_listing_command_v1('website_listing_set',floor(extract(epoch from now()))::bigint,null,gen_random_uuid(),'{}',repeat('0',64))$q$,'K2_ADMIN_REQUEST_INVALID');
select pg_temp.website_expect_error($q$select public.execute_admin_website_listing_command_v1('website_listing_set',floor(extract(epoch from now()))::bigint,gen_random_uuid(),null,'{}',repeat('0',64))$q$,'K2_ADMIN_REQUEST_INVALID');
select pg_temp.website_expect_error($q$select public.execute_admin_website_listing_command_v1('website_listing_set',floor(extract(epoch from now()))::bigint,gen_random_uuid(),gen_random_uuid(),null,repeat('0',64))$q$,'K2_ADMIN_REQUEST_INVALID');
select pg_temp.website_expect_error($q$select public.execute_admin_website_listing_command_v1('website_listing_set',floor(extract(epoch from now()))::bigint,gen_random_uuid(),gen_random_uuid(),'{}',repeat('0',64))$q$,'K2_ADMIN_SIGNATURE_INVALID');
select pg_temp.website_expect_error($q$select pg_temp.website_command('{"sku":"LOCAL-WEBSITE-OFFER","assigned":null,"expectedUpdatedAt":null,"reason":"Reviewed selection"}')$q$,'K2_WEBSITE_LISTING_INVALID');
select pg_temp.website_expect_error($q$select pg_temp.website_command('{"sku":"LOCAL-WEBSITE-OFFER","assigned":true,"expectedUpdatedAt":"yesterday","reason":"Reviewed selection"}')$q$,'K2_WEBSITE_LISTING_INVALID');
select pg_temp.website_expect_error($q$select pg_temp.website_command('{"sku":"LOCAL-WEBSITE-MISSING","assigned":true,"expectedUpdatedAt":null,"reason":"Reviewed selection"}')$q$,'K2_WEBSITE_PRODUCT_NOT_FOUND');
do $$
declare v_payload jsonb:='{"sku":"LOCAL-WEBSITE-OFFER","assigned":true,"expectedUpdatedAt":null,"reason":"Reviewed selection"}';
 v_key uuid:=gen_random_uuid(); v_first jsonb; v_replay jsonb; v_paused jsonb;
begin
 v_first:=pg_temp.website_command(v_payload,v_key);
 if v_first#>>'{listing,assigned}'<>'true' then raise exception 'WEBSITE_ASSIGNMENT_FAILED'; end if;
 v_replay:=pg_temp.website_command(v_payload,v_key);
 if v_replay is distinct from v_first then raise exception 'WEBSITE_ASSIGNMENT_REPLAY_CHANGED'; end if;
 perform pg_temp.website_expect_error(format('select pg_temp.website_command(%L,%L)',v_payload||'{"assigned":false}',v_key),'K2_ADMIN_IDEMPOTENCY_CONFLICT');
 perform pg_temp.website_expect_error(format('select pg_temp.website_command(%L)',v_payload),'K2_WEBSITE_LISTING_STALE');
 v_paused:=pg_temp.website_command(v_payload||jsonb_build_object('assigned',false,'expectedUpdatedAt',v_first#>>'{listing,updatedAt}'));
 if v_paused#>>'{listing,assigned}'<>'false' then raise exception 'WEBSITE_PAUSE_FAILED'; end if;
 v_first:=pg_temp.website_command(v_payload||jsonb_build_object('expectedUpdatedAt',v_paused#>>'{listing,updatedAt}'));
 if v_first#>>'{listing,assigned}'<>'true' then raise exception 'WEBSITE_REASSIGN_FAILED'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from k2_private.website_listing_events where sku='LOCAL-WEBSITE-OFFER')<>3
 or (select count(*) from public.channel_listings where sku='LOCAL-WEBSITE-OFFER')<>1
 then raise exception 'WEBSITE_ASSIGNMENT_DUPLICATED_AUDIT_OR_LISTING'; end if;
 perform k2_private.require_website_order_items('[{"sku":"LOCAL-WEBSITE-OFFER","quantity":1}]');
 perform pg_temp.website_expect_error($q$select k2_private.require_website_order_items(null)$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
 perform pg_temp.website_expect_error($q$select k2_private.require_website_order_items('{}')$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
 perform pg_temp.website_expect_error($q$select k2_private.require_website_order_items('[]')$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
 update public.channel_listings set status='Paused' where sku='LOCAL-WEBSITE-OFFER';
 perform pg_temp.website_expect_error($q$select k2_private.require_website_order_items('[{"sku":"LOCAL-WEBSITE-OFFER","quantity":1}]')$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
 update public.channel_listings set status='Active' where sku='LOCAL-WEBSITE-OFFER';
 update public.channel_listings set validation_errors='["label unchecked"]' where sku='LOCAL-WEBSITE-OFFER';
 perform pg_temp.website_expect_error($q$select k2_private.require_website_order_items('[{"sku":"LOCAL-WEBSITE-OFFER","quantity":1}]')$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
 update public.channel_listings set validation_errors='[]',publication_status='draft' where sku='LOCAL-WEBSITE-OFFER';
 perform pg_temp.website_expect_error($q$select k2_private.require_website_order_items('[{"sku":"LOCAL-WEBSITE-OFFER","quantity":1}]')$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
 update public.channel_listings set publication_status='ready' where sku='LOCAL-WEBSITE-OFFER';
 update public.products set status='Draft' where sku='LOCAL-WEBSITE-OFFER';
 perform pg_temp.website_expect_error($q$select k2_private.require_website_order_items('[{"sku":"LOCAL-WEBSITE-OFFER","quantity":1}]')$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
 update public.products set status='Discontinued' where sku='LOCAL-WEBSITE-OFFER';
 perform pg_temp.website_expect_error($q$select k2_private.require_website_order_items('[{"sku":"LOCAL-WEBSITE-OFFER","quantity":1}]')$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
 update public.products set status='Live',is_human_reviewed=false where sku='LOCAL-WEBSITE-OFFER';
 perform pg_temp.website_expect_error($q$select k2_private.require_website_order_items('[{"sku":"LOCAL-WEBSITE-OFFER","quantity":1}]')$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
 update public.products set is_human_reviewed=true,published=false where sku='LOCAL-WEBSITE-OFFER';
 perform pg_temp.website_expect_error($q$select k2_private.require_website_order_items('[{"sku":"LOCAL-WEBSITE-OFFER","quantity":1}]')$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
 update public.products set published=true,primary_image_url=null where sku='LOCAL-WEBSITE-OFFER';
 perform pg_temp.website_expect_error($q$select k2_private.require_website_order_items('[{"sku":"LOCAL-WEBSITE-OFFER","quantity":1}]')$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
 update public.products set primary_image_url='https://example.test/fixture.jpg',srp=0,retail_price=0 where sku='LOCAL-WEBSITE-OFFER';
 perform pg_temp.website_expect_error($q$select k2_private.require_website_order_items('[{"sku":"LOCAL-WEBSITE-OFFER","quantity":1}]')$q$,'K2_PRODUCT_NOT_OFFERED_ON_WEBSITE');
 update public.products set status='Unlisted',is_human_reviewed=true,published=false,srp=100,retail_price=100 where sku='LOCAL-WEBSITE-OFFER';
 perform k2_private.require_website_order_items('[{"sku":"LOCAL-WEBSITE-OFFER","quantity":1}]');
end $$;
set local role anon;
do $$ declare v_result jsonb; begin
 select to_jsonb(r) into v_result from __GUEST_ALLOWED_CALL__ r;
 if (v_result->>'ok')::boolean is distinct from true then raise exception 'SIGNED_WEBSITE_ORDER_FAILED'; end if;
end $$;
reset role;
select 'WEBSITE_LISTING_BEHAVIOR_PASS';
