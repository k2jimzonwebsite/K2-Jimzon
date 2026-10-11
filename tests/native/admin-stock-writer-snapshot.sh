#!/bin/sh
set -eu
psql_owned() { su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U supabase_admin -d postgres -v ON_ERROR_STOP=1'; }
psql_owned < /tmp/stock-writer-setup.sql
cleanup() { [ -z "${stock_holder_pid:-}" ] || kill "$stock_holder_pid" 2>/dev/null || true; }
trap cleanup EXIT
stock_identity="set role authenticated;set request.jwt.claims='{\"sub\":\"89600000-0000-4000-8000-000000000001\",\"aal\":\"aal2\",\"role\":\"authenticated\"}';"
for stock_end in rollback commit;do
 stock_fifo="/tmp/stock-writer-${stock_end}.fifo";stock_log="/tmp/stock-writer-${stock_end}.log"
 mkfifo "$stock_fifo"
 psql_owned < "$stock_fifo" > "$stock_log" 2>&1 & stock_holder_pid=$!
 exec 3>"$stock_fifo"
 printf "set application_name='k2_stock_writer_holder';set statement_timeout='10s';set lock_timeout='2s';begin;%s select k2_stock_snapshot_probe.command();select 'K2_STOCK_WRITER_HELD';\n" "$stock_identity" >&3
 stock_attempt=0
 while ! grep -q K2_STOCK_WRITER_HELD "$stock_log";do
  stock_attempt=$((stock_attempt+1));[ "$stock_attempt" -lt 60 ] || { cat "$stock_log";exit 1; };sleep 0.02
 done
 stock_observed=$(printf "select count(*) from pg_catalog.pg_stat_activity a where a.application_name='k2_stock_writer_holder' and a.state='idle in transaction' and a.backend_xid is not null and (select count(distinct l.relation) from pg_catalog.pg_locks l where l.pid=a.pid and l.granted and l.mode='RowExclusiveLock' and l.relation in ('public.products'::regclass,'public.product_batches'::regclass,'public.inventory_balances'::regclass))=3;\n" | psql_owned)
 [ "$stock_observed" = 1 ] || { cat "$stock_log";exit 1; }
 echo "K2_STOCK_CANONICAL_WRITER_LOCKS_${stock_end}_OBSERVED"
 printf "set statement_timeout='10s';set lock_timeout='2s';%s select k2_stock_snapshot_probe.assert_snapshot(false);select 'K2_STOCK_READER_OLD_WHILE_WRITER_HELD';\n" "$stock_identity" | psql_owned
 printf "%s;select 'K2_STOCK_WRITER_FINISHED';\n" "$stock_end" >&3
 exec 3>&-
 wait "$stock_holder_pid";stock_holder_pid=''
 grep -q K2_STOCK_WRITER_FINISHED "$stock_log"
 cat "$stock_log"
 stock_new=false;[ "$stock_end" != commit ] || stock_new=true
 printf "set statement_timeout='10s';set lock_timeout='2s';%s select k2_stock_snapshot_probe.assert_snapshot(%s);select 'K2_STOCK_READER_AFTER_%s_OK';\n" "$stock_identity" "$stock_new" "$stock_end" | psql_owned
done
psql_owned < /tmp/stock-writer-cleanup.sql
echo K2_ADMIN_STOCK_WRITER_SNAPSHOT_OK
