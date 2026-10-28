-- Test-only synthetic fixtures and real independent sessions. Never deploy.
do $$ begin
 if current_database() !~ '^k2_native_writer_[0-9a-f]{32}$' or inet_server_addr()<>'127.0.0.1'::inet then
   raise exception 'OWNED_NATIVE_WRITER_CLONE_REQUIRED'; end if;
end $$;
create extension dblink with schema public;
create schema k2_writer_fixture;
create table k2_writer_fixture.context(customer_id uuid not null);
insert into public.customers(display_name,created_source)
 values('Synthetic barrier lock qualification','website_account');
insert into k2_writer_fixture.context select id from public.customers where display_name='Synthetic barrier lock qualification';
create table k2_writer_fixture.results(name text primary key);

create function k2_writer_fixture.attempt(statement text) returns jsonb language plpgsql as $$
begin execute statement; return jsonb_build_object('ok',true);
exception when others then return jsonb_build_object('ok',false,'code',sqlstate,'message',sqlerrm);
end $$;
select public.dblink_connect('writer_left',format('host=127.0.0.1 port=%s dbname=%s user=postgres application_name=k2_writer_left',current_setting('port'),current_database()));
select public.dblink_connect('writer_right',format('host=127.0.0.1 port=%s dbname=%s user=postgres application_name=k2_writer_right',current_setting('port'),current_database()));
select public.dblink_exec('writer_left','set statement_timeout=''8s''');
select public.dblink_exec('writer_right','set statement_timeout=''8s''');

create function k2_writer_fixture.assert_attempt(statement text, expected text) returns void language plpgsql as $$
declare result jsonb;
begin
 select body into result from public.dblink('writer_right',format('select k2_writer_fixture.attempt(%L)',statement)) t(body jsonb);
 if result->>'ok' is distinct from 'false' or result->>'message' is distinct from expected then
   raise exception 'WRITER_BOUNDARY_EXPECTED_REFUSAL: %',result;
 end if;
end $$;

-- Each precondition is held by the same real session that calls the freezer.
do $$ declare customer uuid; freeze_id uuid:=gen_random_uuid(); subject uuid:=gen_random_uuid(); insert_text text; begin
 select customer_id into strict customer from k2_writer_fixture.context;
 perform public.dblink_exec('writer_right','begin');
 perform n from public.dblink('writer_right','select pg_advisory_xact_lock(914,51)::text') t(n text);
 perform k2_writer_fixture.assert_attempt('select k2_private.privacy_freeze_enter()','K2_PRIVACY_FREEZE_CLEAN_ENTRY_REQUIRED');
 perform public.dblink_exec('writer_right','rollback');
 insert into k2_writer_fixture.results values('preheld account advisory refuses before exclusive wait');

 perform public.dblink_exec('writer_right','begin');
 perform n from public.dblink('writer_right',format('select id::text from public.customers where id=%L for update',customer)) t(n text);
 perform k2_writer_fixture.assert_attempt('select k2_private.privacy_freeze_enter()','K2_PRIVACY_FREEZE_CLEAN_ENTRY_REQUIRED');
 perform public.dblink_exec('writer_right','rollback');
 insert into k2_writer_fixture.results values('preheld canonical customer row refuses before exclusive wait');

 perform public.dblink_exec('writer_right','begin');
 perform public.dblink_exec('writer_right','lock table public.customers in share mode');
 perform k2_writer_fixture.assert_attempt('select k2_private.privacy_freeze_enter()','K2_PRIVACY_FREEZE_CLEAN_ENTRY_REQUIRED');
 perform public.dblink_exec('writer_right','rollback');
 insert into k2_writer_fixture.results values('preheld conflicting table lock refuses even without row mutation');

 perform public.dblink_exec('writer_right','begin');
 perform public.dblink_exec('writer_right','insert into k2_writer_fixture.results values(''uncommitted'')');
 perform k2_writer_fixture.assert_attempt('select k2_private.privacy_freeze_enter()','K2_PRIVACY_FREEZE_CLEAN_ENTRY_REQUIRED');
 perform public.dblink_exec('writer_right','rollback');
 insert into k2_writer_fixture.results values('prior transaction mutation refuses freeze entry');

 perform public.dblink_exec('writer_right','begin');
 perform n from public.dblink('writer_right','select k2_private.privacy_writer_enter()::text') t(n text);
 perform k2_writer_fixture.assert_attempt('select k2_private.privacy_freeze_enter()','K2_PRIVACY_FREEZE_CLEAN_ENTRY_REQUIRED');
 perform public.dblink_exec('writer_right','rollback');
 insert into k2_writer_fixture.results values('shared to exclusive upgrade refuses');

 perform public.dblink_exec('writer_right','begin isolation level repeatable read');
 perform k2_writer_fixture.assert_attempt('select k2_private.privacy_writer_enter()','K2_PRIVACY_CURRENT_SNAPSHOT_REQUIRED');
 perform k2_writer_fixture.assert_attempt('select k2_private.privacy_freeze_enter()','K2_PRIVACY_CURRENT_SNAPSHOT_REQUIRED');
 perform public.dblink_exec('writer_right','rollback');
 insert into k2_writer_fixture.results values('stale isolation refuses both writer and freezer');

 insert_text:=format('insert into k2_private.customer_privacy_freezes(id,request_id,user_id,database_id,generation) values(%L,%L,%L,%L,1)',
   freeze_id,gen_random_uuid(),subject,gen_random_uuid());
 perform k2_writer_fixture.assert_attempt(insert_text,'K2_PRIVACY_FREEZE_EXCLUSIVE_ENTRY_REQUIRED');
 perform public.dblink_exec('writer_right','begin');
 perform n from public.dblink('writer_right','select k2_private.privacy_freeze_enter()::text') t(n text);
 perform public.dblink_exec('writer_right',insert_text);
 perform public.dblink_exec('writer_right','commit');
 if not exists(select 1 from k2_private.customer_privacy_freezes where id=freeze_id and user_id=subject) then
   raise exception 'FK_FREE_ABSENT_SUBJECT_FREEZE_NOT_SAVED'; end if;
 insert into k2_writer_fixture.results values('freeze row requires real exclusive gate and permits absent original UUID');

 perform k2_writer_fixture.assert_attempt(format('update k2_private.customer_privacy_freezes set state=''released'' where id=%L',freeze_id),
   'K2_PRIVACY_FREEZE_EXCLUSIVE_ENTRY_REQUIRED');
 perform k2_writer_fixture.assert_attempt(format('delete from k2_private.customer_privacy_freezes where id=%L',freeze_id),
   'K2_PRIVACY_FREEZE_EXCLUSIVE_ENTRY_REQUIRED');
 perform public.dblink_exec('writer_right','begin');
 perform n from public.dblink('writer_right','select k2_private.privacy_freeze_enter()::text') t(n text);
 perform k2_writer_fixture.assert_attempt(format('update k2_private.customer_privacy_freezes set user_id=%L where id=%L',gen_random_uuid(),freeze_id),
   'K2_PRIVACY_FREEZE_IDENTITY_IMMUTABLE');
 perform public.dblink_exec('writer_right',format('update k2_private.customer_privacy_freezes set state=''released'' where id=%L',freeze_id));
 perform public.dblink_exec('writer_right','commit');
 insert into k2_writer_fixture.results values('freeze identity is immutable while state transition needs exclusive gate');
end $$;
-- Separate controller transaction: its earlier freeze-row read must not retain
-- AccessShareLock while the other session requests TRUNCATE's table lock.
do $$ begin
 perform k2_writer_fixture.assert_attempt('truncate k2_private.customer_privacy_freezes','K2_PRIVACY_FREEZE_EXCLUSIVE_ENTRY_REQUIRED');
 insert into k2_writer_fixture.results values('truncate cannot bypass freeze record exclusive guard');
end $$;

create function k2_writer_fixture.wait_for_right() returns void language plpgsql as $$
declare until_time timestamptz:=clock_timestamp()+interval '1 second';
begin
 loop
   perform pg_stat_clear_snapshot();
   if exists(select 1 from pg_stat_activity where datname=current_database() and application_name='k2_writer_right'
      and wait_event_type='Lock') then return; end if;
   if clock_timestamp()>until_time then raise exception 'WRITER_BARRIER_WAIT_NOT_OBSERVED'; end if;
   perform pg_sleep(0.01);
 end loop;
end $$;

do $$ declare result jsonb; started timestamptz; elapsed_ms numeric; begin
 -- Ordinary writers retain shared entry to commit but do not serialize each other.
 perform public.dblink_exec('writer_left','begin');
 perform n from public.dblink('writer_left','select k2_private.privacy_writer_enter()::text') t(n text);
 perform n from public.dblink('writer_right','select k2_private.privacy_writer_enter()::text') t(n text);
 insert into k2_writer_fixture.results values('ordinary shared writer progresses alongside another writer');
 perform public.dblink_send_query('writer_right','select k2_writer_fixture.attempt(''select k2_private.privacy_freeze_enter()'')');
 perform k2_writer_fixture.wait_for_right();
 perform public.dblink_exec('writer_left','commit');
 select body into result from public.dblink_get_result('writer_right') t(body jsonb);
 perform body from public.dblink_get_result('writer_right') t(body jsonb);
 if result->>'ok' is distinct from 'true' then raise exception 'WRITER_BEFORE_FREEZE_FAILED: %',result; end if;
 insert into k2_writer_fixture.results values('exclusive freeze drains earlier shared transaction through commit');

 perform public.dblink_exec('writer_left','begin');
 perform n from public.dblink('writer_left','select k2_private.privacy_freeze_enter()::text') t(n text);
 perform public.dblink_send_query('writer_right','select k2_writer_fixture.attempt(''select k2_private.privacy_writer_enter()'')');
 perform k2_writer_fixture.wait_for_right();
 perform public.dblink_exec('writer_left','commit');
 select body into result from public.dblink_get_result('writer_right') t(body jsonb);
 perform body from public.dblink_get_result('writer_right') t(body jsonb);
 if result->>'ok' is distinct from 'true' then raise exception 'FREEZE_BEFORE_WRITER_FAILED: %',result; end if;
 insert into k2_writer_fixture.results values('ordinary writer waits for exclusive capture then resumes');

 perform public.dblink_exec('writer_left','begin');
 perform n from public.dblink('writer_left','select k2_private.privacy_writer_enter()::text') t(n text);
 started:=clock_timestamp();
 select body into result from public.dblink('writer_right','select k2_writer_fixture.attempt(''select k2_private.privacy_freeze_enter()'')') t(body jsonb);
 elapsed_ms:=extract(epoch from clock_timestamp()-started)*1000;
 perform public.dblink_exec('writer_left','rollback');
 if result->>'ok' is distinct from 'false' or result->>'code' is distinct from '55P03'
   or elapsed_ms<1500 or elapsed_ms>3500 then raise exception 'FREEZE_LOCK_BOUND_FAILED: % %',result,elapsed_ms; end if;
 insert into k2_writer_fixture.results values('exclusive lock wait expires at existing two second bound');
end $$;
select public.dblink_disconnect('writer_left');
select public.dblink_disconnect('writer_right');
select jsonb_build_object('checks',(select jsonb_agg(name order by name) from k2_writer_fixture.results),
 'disconnected',public.dblink_get_connections() is null);
