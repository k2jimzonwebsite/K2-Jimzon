// MAP-018 / IDEA-20261010-08. Exact disposable fault setup/refusal/recovery only.
import { prepareRepairEnvelope, retainedSnapshotSql } from './repair-envelope.mjs'

export function prepareDriftProbe(input) {
  const repair = prepareRepairEnvelope(input)
  const corrected = JSON.parse(input.correctedBytes)
  const target = corrected.functions.find(f => f.catalog.proname === 'execute_admin_product_master_command_v1')
  const signature = 'public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)'
  const anchor = 'AS $function$'
  if (target.definition.split(anchor).length !== 2) throw Error('RETAINED_DRIFT_DEFINITION_ANCHOR')
  const guard = `DO $owned$ BEGIN IF current_user<>'supabase_admin' OR current_database()<>'postgres'
 OR current_setting('data_directory')<>'/tmp/k2-managed-data' OR inet_server_addr() IS NOT NULL
 OR current_setting('server_version_num')<>'170006' OR current_setting('port')<>'5432'
 OR (SELECT pg_catalog.pg_get_userbyid(datdba) FROM pg_catalog.pg_database WHERE datname=current_database())<>'postgres'
 OR (SELECT pg_catalog.shobj_description(oid,'pg_database') FROM pg_catalog.pg_database WHERE datname=current_database())
 IS DISTINCT FROM 'K2 retained repair:${input.marker}' THEN RAISE EXCEPTION 'K2_RETAINED_DRIFT_OWNED_TARGET_INVALID'; END IF;END $owned$;`
  const wrap = sql => "BEGIN;SET LOCAL lock_timeout='2s';SET LOCAL statement_timeout='10s';\n" + guard + '\n' + sql + '\nCOMMIT;\n'
  const cases = [
    { name: 'body', setup: wrap(target.definition.replace(anchor, anchor + '\n-- MAP018 unexpected body drift') + ';'), restore: wrap(target.definition + ';') },
    { name: 'owner', setup: wrap('ALTER FUNCTION ' + signature + ' OWNER TO supabase_admin;'), restore: wrap('ALTER FUNCTION ' + signature + ' OWNER TO postgres;') },
    { name: 'acl', setup: wrap('GRANT EXECUTE ON FUNCTION ' + signature + ' TO anon;'), restore: wrap('REVOKE EXECUTE ON FUNCTION ' + signature + ' FROM anon;') },
    { name: 'search-path', setup: wrap('ALTER FUNCTION ' + signature + ' SET search_path = public;'), restore: wrap("ALTER FUNCTION " + signature + " SET search_path = '';" ) },
    { name: 'schema', setup: wrap('CREATE TABLE public.k2_retained_unknown_schema(id integer);'), restore: wrap('DROP TABLE public.k2_retained_unknown_schema;') },
  ]
  const psql = (user, file) => `su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U ${user} -d postgres -v ON_ERROR_STOP=1 -f /tmp/${file}'`
  const snapshot = name => `${psql('supabase_admin', 'retained-snapshot.sql')} > /tmp/retained-drift-${name}.json\n`
  const catalog = name => `${psql('postgres', 'race-catalog.sql')} > /tmp/retained-drift-catalog-${name}.json\n`
  let shell = `#!/bin/sh
set -eu
if kill -0 "$auth_pid" 2>/dev/null || kill -0 "$rest_pid" 2>/dev/null;then exit 1;fi
su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U postgres -d postgres -v ON_ERROR_STOP=1' <<'SETTLED'
DO $settled$ BEGIN IF EXISTS(SELECT 1 FROM pg_catalog.pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend') THEN RAISE EXCEPTION 'K2_RETAINED_OTHER_CLIENT_PRESENT';END IF;END $settled$;
SETTLED
echo K2_RETAINED_AUTH_REST_STOPPED_NO_CLIENTS
` + snapshot('initial') + snapshot('settled') + 'cmp -s /tmp/retained-drift-initial.json /tmp/retained-drift-settled.json\n' +
    catalog('initial') + `${psql('postgres', 'retained-repair.sql')} > /tmp/retained-drift-noop.log 2>&1\n` +
    snapshot('noop') + 'cmp -s /tmp/retained-drift-initial.json /tmp/retained-drift-noop.json\n' +
    `${psql('postgres', 'cold-authority.sql')}\n`
  for (const { name } of cases) {
    shell += `${psql('supabase_admin', 'retained-drift-' + name + '-setup.sql')}\n` +
      snapshot(name + '-before') + catalog(name + '-before') +
      `set +e\ncmp -s /tmp/retained-drift-catalog-initial.json /tmp/retained-drift-catalog-${name}-before.json\ncatalog_compare_exit=$?\nset -e\n[ "$catalog_compare_exit" = 1 ]\nset +e\n` +
      `${psql('postgres', 'retained-repair.sql')} > /tmp/retained-drift-${name}-refusal.log 2>&1\nrefusal_exit=$?\nset -e\n[ "$refusal_exit" = 3 ]\ngrep -q 'K2_RETAINED_REPAIR_SCHEMA_DRIFT' /tmp/retained-drift-${name}-refusal.log\n` +
      snapshot(name + '-after') + catalog(name + '-after') +
      `cmp -s /tmp/retained-drift-${name}-before.json /tmp/retained-drift-${name}-after.json\n` +
      `cmp -s /tmp/retained-drift-catalog-${name}-before.json /tmp/retained-drift-catalog-${name}-after.json\n` +
      `${psql('supabase_admin', 'retained-drift-' + name + '-restore.sql')}\n` +
      snapshot(name + '-restored') + catalog(name + '-restored') +
      `cmp -s /tmp/retained-drift-initial.json /tmp/retained-drift-${name}-restored.json\n` +
      `cmp -s /tmp/retained-drift-catalog-initial.json /tmp/retained-drift-catalog-${name}-restored.json\n` +
      `${psql('postgres', 'cold-authority.sql')}\necho K2_RETAINED_DRIFT_${name.toUpperCase().replace('-', '_')}_REFUSED_CONSERVED\n`
  }
  shell += snapshot('final') + catalog('final') +
    'cmp -s /tmp/retained-drift-initial.json /tmp/retained-drift-final.json\ncmp -s /tmp/retained-drift-catalog-initial.json /tmp/retained-drift-catalog-final.json\n' +
    `${psql('postgres', 'cold-authority.sql')}\n` +
    'sha256sum /tmp/retained-drift-initial.json /tmp/retained-drift-final.json\necho K2_RETAINED_DRIFT_ALL5_OK\n'
  return { cases, shell, repairSql: repair.sql, snapshotSql: retainedSnapshotSql, runtimeExecuted: false, providerWrites: false }
}
