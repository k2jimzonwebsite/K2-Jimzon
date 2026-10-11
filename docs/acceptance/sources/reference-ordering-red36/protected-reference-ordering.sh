#!/bin/sh
# Owned diagnostic schedule: exact command bodies, verifier-entry scheduling pause.
set -eu
psql_owned() { su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U postgres -d postgres -v ON_ERROR_STOP=1'; }
psql_owned < /tmp/reference-concurrency-setup.sql
psql_owned < /tmp/reference-ordering-setup.sql
cleanup() {
 for reference_pid in ${reference_latch_pid:-} ${reference_command_pid:-} ${reference_policy_pid:-};do kill "$reference_pid" 2>/dev/null || true;done
}
trap cleanup EXIT
wait_query() {
 reference_attempt=0
 while :;do
  reference_observed=$(printf '%s\n' "$1" | psql_owned)
  [ "$reference_observed" = 1 ] && break
  reference_attempt=$((reference_attempt+1));[ "$reference_attempt" -lt 30 ] || return 1
  sleep 0.02
 done
}
mkfifo /tmp/reference-ordering-latch.fifo
psql_owned < /tmp/reference-ordering-latch.fifo > /tmp/reference-ordering-latch.log 2>&1 &
reference_latch_pid=$!
exec 3>/tmp/reference-ordering-latch.fifo
printf "set application_name='k2_reference_latch';begin;select pg_advisory_xact_lock(1261585232,987654321);\n" >&3
wait_query "select count(*) from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='k2_reference_latch' and l.granted and l.classid=1261585232::oid and l.objid=987654321::oid;"
{
 printf "\\set VERBOSITY verbose\nset application_name='k2_reference_ordering';set statement_timeout='10s';set lock_timeout='2s';set role authenticated;set request.jwt.claims='{\"sub\":\"88300000-0000-4000-8000-000000000001\",\"aal\":\"aal2\",\"role\":\"authenticated\"}';\n"
 printf "select k2_reference_probe.command('88700000-0000-4000-8000-000000000001','category','Ordering child','88400000-0000-4000-8000-000000000002');\n"
} > /tmp/reference-ordering-command.sql
psql_owned < /tmp/reference-ordering-command.sql > /tmp/reference-ordering-command.log 2>&1 &
reference_command_pid=$!
wait_query "select count(*) from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='k2_reference_ordering' and not l.granted and l.classid=1261585232::oid and l.objid=987654321::oid;"
{
 printf "\\set VERBOSITY verbose\nset application_name='k2_policy_ordering';set statement_timeout='10s';set lock_timeout='2s';set role authenticated;set request.jwt.claims='{\"sub\":\"88300000-0000-4000-8000-000000000001\",\"aal\":\"aal2\",\"role\":\"authenticated\"}';\n"
 printf "select k2_reference_probe.policy_command('88700000-0000-4000-8000-000000000002');\n"
} > /tmp/reference-ordering-policy.sql
psql_owned < /tmp/reference-ordering-policy.sql > /tmp/reference-ordering-policy.log 2>&1 &
reference_policy_pid=$!
if [ "${K2_REFERENCE_ORDERING_EXPECTATION:-red}" = red ];then
 wait_query "select count(*) from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='k2_policy_ordering' and not l.granted and l.classid=1261585232::oid and l.objid=1347374169::oid;"
 echo K2_REFERENCE_EXISTING_POLICY_WAITS_CATEGORY_OBSERVED
else
 wait "$reference_policy_pid";reference_policy_pid=
 grep -q '"localMinimum": 91' /tmp/reference-ordering-policy.log
 echo K2_REFERENCE_EXISTING_POLICY_COMPLETED_BEFORE_LATCH_RELEASE
fi
printf 'commit;\n' >&3
exec 3>&-
wait "$reference_latch_pid";reference_latch_pid=
set +e
wait "$reference_command_pid";reference_command_status=$?;reference_command_pid=
if [ -n "$reference_policy_pid" ];then wait "$reference_policy_pid";reference_policy_status=$?;reference_policy_pid=;else reference_policy_status=0;fi
set -e
cat /tmp/reference-ordering-command.log /tmp/reference-ordering-policy.log
if [ "${K2_REFERENCE_ORDERING_EXPECTATION:-red}" = red ];then
 [ "$reference_command_status" -ne 0 ] || [ "$reference_policy_status" -ne 0 ]
 grep -q '40P01:' /tmp/reference-ordering-command.log /tmp/reference-ordering-policy.log
 echo K2_REFERENCE_ORDERING_ACTUAL_DEADLOCK_RED_OK
else
 [ "$reference_command_status" -eq 0 ];[ "$reference_policy_status" -eq 0 ]
 grep -q '"reused": false' /tmp/reference-ordering-command.log
 echo K2_REFERENCE_ORDERING_NO_CYCLE_GREEN_OK
fi
psql_owned <<'SQL'
do $restore$
declare d text;m jsonb;actual jsonb;
begin
 select definition,metadata into d,m from k2_reference_probe.original_verifier;
 execute d;
 select to_jsonb(p) into actual from pg_proc p where p.oid=
  'k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure;
 if actual is distinct from m or pg_get_functiondef('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure) is distinct from d then
  raise exception 'ORDERING_DIAGNOSTIC_RESTORE_DRIFT';
 end if;
 if exists(select 1 from k2_private.reference_command_context) then raise exception 'ORDERING_CONTEXT_LEAK';end if;
end $restore$;
select 'K2_REFERENCE_ORDERING_DIAGNOSTIC_RESTORED';
SQL
echo K2_REFERENCE_CONCURRENCY_CHECKS_OK
