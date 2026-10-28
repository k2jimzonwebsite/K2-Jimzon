-- Test-only real sessions on the fresh owned committed clone.
do $$ begin
  if current_database() !~ '^k2_native_address_[0-9a-f]{32}$' or inet_server_addr()<>'127.0.0.1'::inet then
    raise exception 'OWNED_NATIVE_ADDRESS_CLONE_REQUIRED'; end if;
end $$;
create extension dblink with schema public;
create schema k2_address_fixture;
create table k2_address_fixture.context(actor uuid not null,address_id uuid not null,path jsonb not null);
do $$
declare actor uuid:=gen_random_uuid(); path jsonb;
begin
  insert into auth.users(id,email,email_confirmed_at,created_at,updated_at,aud,role,raw_app_meta_data,raw_user_meta_data)
    values(actor,'address-race-'||actor||'@example.invalid',clock_timestamp(),clock_timestamp(),clock_timestamp(),'authenticated','authenticated','{}','{}');
  with recursive parents as (
    select code,parent_code,0 as distance from k2_private.delivery_psgc_locations
      where code=(select code from k2_private.delivery_psgc_locations where level='Bgy' order by code limit 1)
    union all select p.code,p.parent_code,c.distance+1 from k2_private.delivery_psgc_locations p join parents c on c.parent_code=p.code
  ) select jsonb_agg(code order by distance desc) into path from parents;
  insert into k2_address_fixture.context values(actor,gen_random_uuid(),path);
end $$;
create function k2_address_fixture.save(expected bigint,label text,operation uuid) returns jsonb language plpgsql as $$
declare c k2_address_fixture.context; payload text; ts bigint:=extract(epoch from clock_timestamp())::bigint;
  nonce uuid:=gen_random_uuid(); ip text:=repeat('a',64); signature text; result jsonb;
begin
  select * into strict c from k2_address_fixture.context;
  perform set_config('request.jwt.claim.sub',c.actor::text,true);
  payload:=jsonb_build_object('operation','addresses','operationId',operation,'expectedRevision',expected,
    'displayName','Synthetic profile '||label,'defaultAddressId',c.address_id,'addresses',jsonb_build_array(jsonb_build_object(
      'id',c.address_id,'label',label,'recipientName','Synthetic recipient '||label,'phone','+639178546329',
      'street','18 Synthetic Street','postalCode','','landmark','',
      'destination',jsonb_build_object('sourceVersion','psgc-2026-06-30','path',c.path))))::text;
  select encode(extensions.hmac(convert_to('account_settings_write'||E'\n'||ts||E'\n'||nonce||E'\n'||
    encode(extensions.digest(convert_to(payload,'UTF8'),'sha256'),'hex')||E'\n'||ip,'UTF8'),request_secret,'sha256'),'hex')
    into signature from k2_private.guest_bff_secrets where singleton;
  result:=public.save_customer_account_address_book_v1(ts,nonce,payload,ip,signature);
  return jsonb_build_object('pid',pg_backend_pid(),'operation',operation,'result',result);
end $$;
do $$
declare connection text; actor uuid; lock_key bigint; a jsonb; b jsonb; winner jsonb; loser jsonb; op_a uuid; op_b uuid;
  pid_a integer; pid_b integer; waiting integer; released boolean:=true; checks jsonb:='[]'; saved jsonb;
begin
  select c.actor into strict actor from k2_address_fixture.context c;
  lock_key:=hashtextextended('account-claim-user:'||actor::text,0);
  connection:='host=127.0.0.1 port='||current_setting('port')||' dbname='||current_database()||' user='||current_user;
  perform public.dblink_connect('address_a',connection); perform public.dblink_connect('address_b',connection);
  select pid into pid_a from public.dblink('address_a','select pg_backend_pid()') as t(pid integer);
  select pid into pid_b from public.dblink('address_b','select pg_backend_pid()') as t(pid integer);
  if pid_a=pid_b then raise exception 'ADDRESS_RACE_NOT_INDEPENDENT_SESSIONS'; end if;
  for expected in 0..1 loop
    op_a:=gen_random_uuid(); op_b:=gen_random_uuid();
    perform pg_advisory_lock(lock_key); released:=false;
    perform public.dblink_send_query('address_a',format('select k2_address_fixture.save(%s,%L,%L::uuid)',expected,'Home A',op_a));
    perform public.dblink_send_query('address_b',format('select k2_address_fixture.save(%s,%L,%L::uuid)',expected,'Home B',op_b));
    waiting:=0;
    for attempt in 1..150 loop
      select count(*) into waiting from pg_stat_activity where pid in (pid_a,pid_b) and wait_event='advisory';
      exit when waiting=2;
      perform pg_sleep(0.01);
      perform pg_stat_clear_snapshot();
    end loop;
    if waiting<>2 then raise exception 'ADDRESS_WRITERS_DID_NOT_REACH_SHARED_ACTOR_BARRIER'; end if;
    perform pg_advisory_unlock(lock_key); released:=true;
    select reply into a from public.dblink_get_result('address_a') as t(reply jsonb);
    select reply into b from public.dblink_get_result('address_b') as t(reply jsonb);
    -- Drain the command completion so the connections can run the next race.
    perform * from public.dblink_get_result('address_a') as t(reply jsonb);
    perform * from public.dblink_get_result('address_b') as t(reply jsonb);
    if (a#>>'{result,ok}'='true')=(b#>>'{result,ok}'='true') then raise exception 'ADDRESS_RACE_NOT_ONE_WINNER'; end if;
    winner:=case when a#>>'{result,ok}'='true' then a else b end;
    loser:=case when a#>>'{result,ok}'='true' then b else a end;
    if loser#>>'{result,error_code}'<>'ADDRESS_BOOK_CONFLICT' then
      raise exception 'ADDRESS_RACE_LOSER_NOT_CONFLICT'; end if;
    select to_jsonb(s) into saved from k2_private.customer_account_settings s where user_id=actor;
    if saved->>'address_revision'<>(expected+1)::text
      or saved->>'address_last_operation_id'<>winner->>'operation'
      or saved->'delivery_addresses' is distinct from winner#>'{result,settings,addressBook,addresses}' then
      raise exception 'ADDRESS_RACE_STORED_STATE_DIFFERS_FROM_WINNER'; end if;
    checks:=checks||to_jsonb(case when expected=0 then 'simultaneous first saves: one complete profile/address winner, one conflict'
      else 'simultaneous existing revision saves: one winner, no overwritten update' end);
  end loop;
  perform public.dblink_disconnect('address_a'); perform public.dblink_disconnect('address_b');
  raise notice 'ADDRESS_BOOK_REAL_SESSION_RACES_PASSED';
  perform set_config('k2_test.address_races',jsonb_build_object('checks',checks,'disconnected',true)::text,false);
exception when others then
  if not released then perform pg_advisory_unlock(lock_key); end if;
  begin perform public.dblink_disconnect('address_a'); exception when others then null; end;
  begin perform public.dblink_disconnect('address_b'); exception when others then null; end;
  raise;
end $$;
select current_setting('k2_test.address_races')::jsonb;
