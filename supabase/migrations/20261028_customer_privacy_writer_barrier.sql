-- MAP-019 / IDEA-20261027-02. Inactive private writer-barrier foundation.
-- No public freeze/erasure RPC, configuration, keys or grants are installed.
-- The complete relation/association contract must qualify before activation.
begin;

-- Intentionally FK-free: freeze capture must never acquire scope KEY SHARE
-- locks after exclusive entry, and restored original UUIDs may be absent.
create table k2_private.customer_privacy_freezes (
 id uuid primary key, request_id uuid not null, user_id uuid not null,
 customer_id uuid, database_id uuid not null,
 generation bigint not null check(generation between 1 and 9007199254740991),
 state text not null default 'frozen' check(state in('frozen','released','closed')),
 created_at timestamptz not null default clock_timestamp()
);
create unique index customer_privacy_freezes_active_user on k2_private.customer_privacy_freezes(user_id) where state='frozen';
create unique index customer_privacy_freezes_active_customer on k2_private.customer_privacy_freezes(customer_id) where state='frozen' and customer_id is not null;
revoke all on k2_private.customer_privacy_freezes from public,anon,authenticated,service_role;

create function k2_private.privacy_writer_enter() returns void
language plpgsql volatile security definer set search_path='' set lock_timeout='2s' as $$
begin
 if current_setting('transaction_isolation')<>'read committed' then
   raise exception 'K2_PRIVACY_CURRENT_SNAPSHOT_REQUIRED';
 end if;
 -- A two-integer namespace is disjoint from the older bigint account locks.
 perform pg_advisory_xact_lock_shared(1261568025,19);
end $$;
revoke all on function k2_private.privacy_writer_enter() from public,anon,authenticated,service_role;

create function k2_private.privacy_freeze_enter() returns void
language plpgsql volatile security definer set search_path='' set lock_timeout='2s' as $$
begin
 if current_setting('transaction_isolation')<>'read committed' then
   raise exception 'K2_PRIVACY_CURRENT_SNAPSHOT_REQUIRED';
 end if;
 -- Dedicated RPC entry must run before nonce/rate writes, account locks, row
 -- locks or ordinary DML. Never upgrade shared entry or inherit an inversion.
 if pg_current_xact_id_if_assigned() is not null or exists(
   select 1 from pg_locks where pid=pg_backend_pid() and granted
     and (locktype='advisory' or (locktype='relation' and mode<>'AccessShareLock'))
 ) then raise exception 'K2_PRIVACY_FREEZE_CLEAN_ENTRY_REQUIRED'; end if;
 perform pg_advisory_xact_lock(1261568025,19);
end $$;
revoke all on function k2_private.privacy_freeze_enter() from public,anon,authenticated,service_role;

create function k2_private.privacy_freeze_gate_held() returns boolean
language sql volatile security definer set search_path='' as $$
 select exists(select 1 from pg_locks where pid=pg_backend_pid() and granted
   and locktype='advisory' and mode='ExclusiveLock' and classid=1261568025
   and objid=19 and objsubid=2 and database=(select oid from pg_database where datname=current_database()))
$$;
revoke all on function k2_private.privacy_freeze_gate_held() from public,anon,authenticated,service_role;

create function k2_private.privacy_freeze_record_guard() returns trigger
language plpgsql volatile security definer set search_path='' as $$
begin
 if not k2_private.privacy_freeze_gate_held() then raise exception 'K2_PRIVACY_FREEZE_EXCLUSIVE_ENTRY_REQUIRED'; end if;
 if tg_level='STATEMENT' then return null; end if;
 if tg_op='UPDATE' and (new.id,new.request_id,new.user_id,new.customer_id,new.database_id,new.generation,new.created_at)
   is distinct from (old.id,old.request_id,old.user_id,old.customer_id,old.database_id,old.generation,old.created_at) then
   raise exception 'K2_PRIVACY_FREEZE_IDENTITY_IMMUTABLE';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function k2_private.privacy_freeze_record_guard() from public,anon,authenticated,service_role;
create trigger privacy_freeze_record_guard before insert or update or delete
 on k2_private.customer_privacy_freezes for each row execute function k2_private.privacy_freeze_record_guard();
alter table k2_private.customer_privacy_freezes enable always trigger privacy_freeze_record_guard;
-- TRUNCATE takes its table lock before a statement trigger runs. Require
-- already-held entry here; acquiring the gate now could invert lock order.
create trigger privacy_freeze_truncate_guard before truncate
 on k2_private.customer_privacy_freezes for each statement execute function k2_private.privacy_freeze_record_guard();
alter table k2_private.customer_privacy_freezes enable always trigger privacy_freeze_truncate_guard;
commit;
