// MAP-018 / IDEA-20261010-08. Disposable native witness, no dispatcher.
import { prepareRepairEnvelope, retainedSnapshotSql } from './repair-envelope.mjs'

export function preparePopulatedMatrix(input) {
  const repair = prepareRepairEnvelope(input)
  const prior = JSON.parse(input.priorBytes), corrected = JSON.parse(input.correctedBytes)
  const targets = prior.functions.map((f, i) => ({ before: f, after: corrected.functions[i] }))
    .filter(({ before, after }) => before.definition !== after.definition)
  const guard = `DO $owned$ BEGIN IF current_user<>'postgres' OR current_database()<>'postgres'
 OR current_setting('data_directory')<>'/tmp/k2-managed-data' OR inet_server_addr() IS NOT NULL
 OR current_setting('server_version_num')<>'170006'
 OR (SELECT pg_catalog.shobj_description(oid,'pg_database') FROM pg_catalog.pg_database WHERE datname=current_database())
 IS DISTINCT FROM 'K2 retained repair:${input.marker}' THEN RAISE EXCEPTION 'K2_RETAINED_REPAIR_OWNED_TARGET_INVALID'; END IF; END $owned$;`
  const states = Array.from({ length: 8 }, (_, mask) => ({ mask,
    sql: "BEGIN;SET LOCAL lock_timeout='2s';SET LOCAL statement_timeout='10s';\n" + guard + '\n' +
      targets.map(({ before, after }, bit) => (mask & (1 << bit) ? after : before).definition + ';').join('\n') + '\nCOMMIT;\n' }))
  const faults = [1, 2, 3].map(after => ({ after, sql: prepareRepairEnvelope({ ...input, faultAfter: after }).sql }))
  const psql = (user, file) => `su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U ${user} -d postgres -v ON_ERROR_STOP=1 -f /tmp/${file}'`
  const snapshot = name => `${psql('supabase_admin', 'retained-snapshot.sql')} > /tmp/retained-state-${name}.json\n`
  const catalog = name => `${psql('postgres', 'race-catalog.sql')} > /tmp/retained-catalog-${name}.json\n`
  const sameState = (a, b) => `cmp -s /tmp/retained-state-${a}.json /tmp/retained-state-${b}.json\n`
  const sameCatalog = (a, b) => `cmp -s /tmp/retained-catalog-${a}.json /tmp/retained-catalog-${b}.json\n`
  let shell = `#!/bin/sh
set -eu
if kill -0 "$auth_pid" 2>/dev/null || kill -0 "$rest_pid" 2>/dev/null;then exit 1;fi
su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U postgres -d postgres -v ON_ERROR_STOP=1' <<'SETTLED'
DO $settled$ BEGIN IF EXISTS(SELECT 1 FROM pg_catalog.pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend') THEN RAISE EXCEPTION 'K2_RETAINED_OTHER_CLIENT_PRESENT';END IF;END $settled$;
SETTLED
echo K2_RETAINED_AUTH_REST_STOPPED_NO_CLIENTS
` + snapshot('initial') + snapshot('settled') + sameState('initial', 'settled') +
    catalog('corrected') + `${psql('postgres', 'retained-repair.sql')} > /tmp/retained-initial-noop.log 2>&1\n` +
    snapshot('initial-noop') + sameState('initial', 'initial-noop') +
    `${psql('postgres', 'cold-authority.sql')}\n`
  for (const { mask } of states) {
    shell += `${psql('postgres', 'retained-state-' + mask + '.sql')}\n` +
      snapshot(mask + '-before') + sameState('initial', mask + '-before') +
      catalog(mask + '-before') +
      `${psql('postgres', 'retained-repair.sql')} > /tmp/retained-repair-${mask}.log 2>&1\n` +
      `grep -q 'K2_RETAINED_REPAIR_CORRECTIONS:${3 - [0, 1, 2].filter(bit => mask & (1 << bit)).length}' /tmp/retained-repair-${mask}.log\n` +
      snapshot(mask + '-after') + sameState(mask + '-before', mask + '-after') +
      catalog(mask + '-after') + sameCatalog('corrected', mask + '-after') +
      `${psql('postgres', 'retained-repair.sql')} > /tmp/retained-repeat-${mask}.log 2>&1\n` +
      `grep -q 'K2_RETAINED_REPAIR_CORRECTIONS:0' /tmp/retained-repeat-${mask}.log\n` +
      snapshot(mask + '-repeat') + sameState(mask + '-after', mask + '-repeat') +
      catalog(mask + '-repeat') + sameCatalog('corrected', mask + '-repeat') +
      `${psql('postgres', 'cold-authority.sql')}\necho K2_RETAINED_STATE_${mask}_REPAIR_REPEAT_CONSERVED\n`
  }
  for (const { after } of faults) {
    shell += `${psql('postgres', 'retained-state-0.sql')}\n` + snapshot('fault-' + after + '-before') +
      catalog('fault-' + after + '-before') + `set +e\n` +
      `${psql('postgres', 'retained-fault-' + after + '.sql')} > /tmp/retained-fault-${after}.log 2>&1\nfault_exit=$?\nset -e\n[ "$fault_exit" = 3 ]\ngrep -q 'K2_RETAINED_REPAIR_INJECTED_FAULT' /tmp/retained-fault-${after}.log\n` +
      snapshot('fault-' + after + '-after') + sameState('fault-' + after + '-before', 'fault-' + after + '-after') +
      catalog('fault-' + after + '-after') + sameCatalog('fault-' + after + '-before', 'fault-' + after + '-after') +
      `${psql('postgres', 'cold-authority.sql')}\necho K2_RETAINED_FAULT_${after}_ROLLED_BACK\n`
  }
  shell += `${psql('postgres', 'retained-repair.sql')}\n` + snapshot('final') + sameState('initial', 'final') +
    catalog('final') + sameCatalog('corrected', 'final') + `${psql('postgres', 'cold-authority.sql')}\n` +
    'sha256sum /tmp/retained-state-initial.json /tmp/retained-state-final.json\necho K2_RETAINED_MATRIX_ALL8_OK\n'
  return { states, faults, shell, repairSql: repair.sql, snapshotSql: retainedSnapshotSql,
    providerWrites: false, runtimeExecuted: false }
}
