#!/bin/sh
# MAP-018 / IDEA-20261010-06. Socket-only owned RAM schedules; no provider.
set -eu
psql_owned() {
 su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U postgres -d postgres -v ON_ERROR_STOP=1'
}
psql_owned < /tmp/reference-concurrency-setup.sql
wait_marker() {
 reference_attempt=0
 while ! grep -q "$2" "$1"; do
  reference_attempt=$((reference_attempt+1))
  [ "$reference_attempt" -lt 60 ] || { cat "$1";return 1; }
  sleep 0.02
 done
}
wait_lock() {
 reference_attempt=0
 while :;do
  reference_wait=$(printf "select count(*) from pg_catalog.pg_stat_activity a where a.application_name='k2_reference_waiter' and a.wait_event_type='Lock' and exists(select 1 from pg_catalog.pg_locks l where l.pid=a.pid and not l.granted and %s);\n" "$reference_expected_lock" | psql_owned)
  [ "$reference_wait" = 1 ] && break
  reference_attempt=$((reference_attempt+1))
  [ "$reference_attempt" -lt 30 ] || { cat "$reference_waiter_log";return 1; }
  sleep 0.02
 done
}
cleanup() {
 # Only the two children started by this owned script; no process discovery kill.
 [ -z "${reference_holder_pid:-}" ] || kill "$reference_holder_pid" 2>/dev/null || true
 [ -z "${reference_waiter_pid:-}" ] || kill "$reference_waiter_pid" 2>/dev/null || true
}
trap cleanup EXIT
for reference_case in brand_commit brand_rollback parent_commit parent_rollback lock_expiry statement_expiry;do
 reference_holder_log="/tmp/reference-${reference_case}-holder.log"
 reference_waiter_log="/tmp/reference-${reference_case}-waiter.log"
 mkfifo "/tmp/reference-${reference_case}.fifo"
 psql_owned < "/tmp/reference-${reference_case}.fifo" > "$reference_holder_log" 2>&1 &
 reference_holder_pid=$!
 exec 3>"/tmp/reference-${reference_case}.fifo"
 printf "set statement_timeout='10s';set lock_timeout='2s';begin;\n" >&3
 case "$reference_case" in
  brand_commit|brand_rollback|lock_expiry|statement_expiry)
   printf "insert into public.brands(name) values('Race %s');\n" "$reference_case" >&3
   reference_kind=brand;reference_parent=NULL;reference_name="Race $reference_case"
   reference_expected_lock="l.locktype='transactionid'";;
  parent_commit|parent_rollback)
   reference_kind=category;reference_name="Child $reference_case"
   reference_expected_lock="l.locktype='advisory' and l.classid=1261585232::oid and l.objid=1347374169::oid and l.objsubid=2"
   if [ "$reference_case" = parent_commit ];then reference_parent="'88400000-0000-4000-8000-000000000001'";
   else reference_parent="'88400000-0000-4000-8000-000000000002'";fi
   printf "set local role authenticated;set local request.jwt.claims='{\"sub\":\"88300000-0000-4000-8000-000000000002\",\"aal\":\"aal2\",\"role\":\"authenticated\"}';delete from public.categories where id=%s;\n" "$reference_parent" >&3;;
 esac
 printf "select 'K2_REFERENCE_HOLDER_READY';\n" >&3
 wait_marker "$reference_holder_log" K2_REFERENCE_HOLDER_READY
 reference_statement=10s
 [ "$reference_case" != statement_expiry ] || reference_statement=500ms
 {
  printf "\\set VERBOSITY verbose\nset application_name='k2_reference_waiter';set statement_timeout='%s';set lock_timeout='2s';set role authenticated;set request.jwt.claims='{\"sub\":\"88300000-0000-4000-8000-000000000001\",\"aal\":\"aal2\",\"role\":\"authenticated\"}';\n" "$reference_statement"
  printf "select k2_reference_probe.command(gen_random_uuid(),'%s','%s',%s);\n" "$reference_kind" "$reference_name" "$reference_parent"
 } > /tmp/reference-waiter.sql
 psql_owned < /tmp/reference-waiter.sql > "$reference_waiter_log" 2>&1 &
 reference_waiter_pid=$!
 wait_lock
 case "$reference_case" in
  lock_expiry|statement_expiry)
   set +e;wait "$reference_waiter_pid";reference_status=$?;set -e
   [ "$reference_status" -eq 3 ]
   if [ "$reference_case" = lock_expiry ];then grep -q '55P03:' "$reference_waiter_log";
   else grep -q '57014:' "$reference_waiter_log";fi
   printf 'rollback;\n' >&3;;
  brand_rollback|parent_rollback) printf 'rollback;\n' >&3;;
  *) printf 'commit;\n' >&3;;
 esac
 exec 3>&-
 wait "$reference_holder_pid";reference_holder_pid=
 case "$reference_case" in
  lock_expiry|statement_expiry) :;;
  parent_commit)
   set +e;wait "$reference_waiter_pid";reference_status=$?;set -e
   [ "$reference_status" -eq 3 ];grep -q K2_REFERENCE_PARENT_INVALID "$reference_waiter_log";;
  *)
   wait "$reference_waiter_pid"
   if [ "$reference_case" = brand_commit ];then grep -q '"reused": true' "$reference_waiter_log";
   else grep -q '"reused": false' "$reference_waiter_log";fi;;
 esac
 reference_waiter_pid=
 cat "$reference_holder_log" "$reference_waiter_log"
 echo "K2_REFERENCE_SCHEDULE_${reference_case}_OK"
done
psql_owned <<'SQL'
do $effects$
begin
 if (select count(*) from k2_private.reference_events where actor_id='88300000-0000-4000-8000-000000000001')<>3
  or (select count(*) from k2_private.admin_command_receipts where actor_id='88300000-0000-4000-8000-000000000001' and action='reference_create')<>3
  or exists(select 1 from k2_private.reference_command_context)
  or exists(select 1 from public.brands where name in ('Race lock_expiry','Race statement_expiry'))
  or exists(select 1 from public.categories where name='Child parent_commit') then
  raise exception 'REFERENCE_CONCURRENT_FAILURE_LEFT_EFFECTS';
 end if;
end $effects$;
SQL
echo K2_REFERENCE_CONCURRENCY_CHECKS_OK
