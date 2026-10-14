// MAP-018 / IDEA-20261010-08. Pure disposable preparation, never dispatch.
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

const sha = value => createHash('sha256').update(value).digest('hex')
const quote = value => "'" + value.replaceAll("'", "''") + "'"
// Matched complete catalogs and package bytes, never independently selectable.
// The second prior is a derived fixture fault state; its corrected catalog is
// native calibration01 evidence, including every exact request prerequisite.
const catalogPairs = [
  ['e9ff18682ab3f3f65c43bf16eff7e6bad6bc77dc32f3f329ecb68d5b22e15460',
    'f15546967b026374dc2c93893cba51508ac549eb290a9904bfd1fbb49fea7a3a',
    '05dadb37cbe01edc0a70172e12a3d047438559df5c3949edb82ec817f8505b84'],
  ['bb3983d843c41dfa94f490c03f3f2b6f73767d225e6061c591e975b28fab1b08',
    'f02519a354fca1002298bb2b97e5cdc8eea4e2f20ebb496a3cb5deb7dcf3876d',
    '05dadb37cbe01edc0a70172e12a3d047438559df5c3949edb82ec817f8505b84'],
  // Complete controlled-installation profile; prior remains a synthetic fault.
  ['a7e4c6d8ac12ebca39b37e9987edc871597af9df37583115c868cf70c6850925',
    '1d7ff4a4339029a42786df660edf70a81c012132679219121ce350d0008aae2e',
    'ddf4def0eceb753480eb4e36c4d775e665b868b9ede62e49dbc74a7832904ac9'],
  // Same three repairs on native-calibrated catalog PT409 successor. Catalog
  // itself is fixed outside the repair targets; its historical body is drift.
  ['b9956c3f27e1ff2f460f04bb8d18d6ff2d4b3582e3720a5f6c7b203fab312e82',
    '712269c5ef7a9d9216f263f6b8e523f446a8c94bcb5f2ecb771aad7c622decf6',
    'ec40b9a40102f63ccf4bc483fa52747551ee4abd61bf5134065d1757ed2ba967'],
]
const fragmentPins = [
  'ef4442fe9d6ebba0bd557e9a53bf25e75c78585d91a1cd54f910b02fd78d8476',
  'efe76030dfc116ace181492b02d03cacf4a5e7140ecb30141575a6d2ea8ed166',
  '974b404f066282f001963d8ba7d548c5e137f95f40c57a73d480abeba7abc6b0',
]
const names = ['execute_admin_product_master_command_v1', 'execute_customer_delivery_rates_v1', 'mutate_category_policy_v1']

// Run only inside the separately reviewed owned fixture. Output stays private.
// Transaction gives one settled capture; fixture coordinator controls writers.
export const retainedSnapshotSql = `BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL search_path='';SET TIME ZONE 'UTC';SET LOCAL DateStyle='ISO, YMD';
SET LOCAL bytea_output='hex';SET LOCAL extra_float_digits=3;
CREATE TEMP TABLE k2_retained_snapshot(name text PRIMARY KEY,kind text,value jsonb) ON COMMIT DROP;
DO $snapshot$ DECLARE r record;v jsonb;BEGIN
 FOR r IN SELECT c.oid,c.relkind,pg_catalog.format('%I.%I',n.nspname,c.relname) AS name
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind in ('r','p','m','S') AND c.relpersistence<>'t'
 AND n.nspname<>'pg_catalog' AND n.nspname<>'information_schema'
 AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp_%'
 ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C" LOOP
  IF r.relkind='S' THEN
   EXECUTE pg_catalog.format('SELECT pg_catalog.jsonb_build_object(''lastValue'',last_value::text,''isCalled'',is_called) FROM %s',r.oid::regclass) INTO v;
  ELSE
   EXECUTE pg_catalog.format('SELECT pg_catalog.jsonb_build_object(''count'',count(*),''sha256'',pg_catalog.encode(extensions.digest(pg_catalog.convert_to(coalesce(pg_catalog.string_agg(to_jsonb(t)::text,chr(10) ORDER BY to_jsonb(t)::text collate "C"),''''),''UTF8''),''sha256''),''hex'')) FROM %s t',r.oid::regclass) INTO v;
  END IF;
  INSERT INTO k2_retained_snapshot VALUES(r.name,r.relkind,v);
 END LOOP;
END $snapshot$;
SELECT pg_catalog.jsonb_build_object('contract','K2_RETAINED_FULL_PHYSICAL_STATE_V1',
 'relationCount',count(*),'relations',coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('name',name,'kind',kind,'state',value) ORDER BY name COLLATE "C"),'[]'::jsonb)) FROM k2_retained_snapshot;
COMMIT;
`

export function prepareRepairEnvelope(input) {
  const priorPin = sha(input.priorBytes), correctedPin = sha(input.correctedBytes)
  const profile = catalogPairs.find(([before, after]) => before === priorPin && after === correctedPin)
  if (!profile)
    throw Error('RETAINED_REPAIR_SOURCE_PIN:catalogPair')
  if (sha(input.packageBytes) !== profile[2])
    throw Error('RETAINED_REPAIR_SOURCE_PIN:packageBytes')
  if (!Array.isArray(input.fragments) || input.fragments.length !== 3 ||
      input.fragments.some((f, i) => sha(f) !== fragmentPins[i])) throw Error('RETAINED_REPAIR_SOURCE_PIN:fragments')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(input.marker))
    throw Error('RETAINED_REPAIR_OWNED_MARKER_REQUIRED')
  const faultAfter = input.faultAfter ?? 0
  if (![0, 1, 2, 3].includes(faultAfter)) throw Error('RETAINED_REPAIR_FAULT_BOUNDARY_INVALID')
  const prior = JSON.parse(input.priorBytes), corrected = JSON.parse(input.correctedBytes)
  const pkg = JSON.parse(input.packageBytes)
  const targets = names.map(name => {
    const index = prior.functions.findIndex(f => f.catalog.proname === name)
    if (index < 0 || corrected.functions[index].identity !== prior.functions[index].identity)
      throw Error('RETAINED_REPAIR_INPUT_CONTRACT')
    return { index, before: prior.functions[index], after: corrected.functions[index] }
  })
  const normalize = catalog => {
    const normalized = structuredClone(catalog), corrections = []
    for (const { index, before, after } of targets) {
      const current = normalized.functions?.[index]
      if (current?.definition === before.definition) corrections.push(before.identity)
      else if (current?.definition !== after.definition) throw Error('RETAINED_REPAIR_SCHEMA_DRIFT')
      current.definition = after.definition
    }
    if (!isDeepStrictEqual(normalized, corrected)) throw Error('RETAINED_REPAIR_SCHEMA_DRIFT')
    return { corrections, noOp: corrections.length === 0 }
  }
  normalize(prior)
  const classify = (catalog, authority, managedAuthority) => {
    if (!isDeepStrictEqual(authority, pkg.authority)) throw Error('RETAINED_REPAIR_AUTHORITY_DRIFT')
    if (!isDeepStrictEqual(managedAuthority, pkg.managedAuthority)) throw Error('RETAINED_REPAIR_MANAGED_AUTHORITY_DRIFT')
    return normalize(catalog)
  }

  // Extract the existing serializers/authority checks from exact pinned bytes.
  // Do not maintain another catalog serializer or weaken the installation guards.
  const admission = '\n  perform pg_catalog.pg_advisory_xact_lock(1261585232,1347374169);\n'
  if (pkg.sql.split(admission).length !== 2) throw Error('RETAINED_REPAIR_INPUT_CONTRACT')
  const authorityAt = pkg.sql.indexOf(admission) + admission.length
  const catalogAt = pkg.sql.indexOf('  select s.category_operating_contract into v_actual from (', authorityAt)
  const catalogEnd = pkg.sql.indexOf(') as category_operating_contract) s;', catalogAt) + ') as category_operating_contract) s;'.length
  if (!(catalogAt > authorityAt && catalogEnd > catalogAt)) throw Error('RETAINED_REPAIR_INPUT_CONTRACT')
  const authorityCheck = pkg.sql.slice(authorityAt, catalogAt)
  const catalogCheck = pkg.sql.slice(catalogAt, catalogEnd)
  const admissionChecks = targets.map(({ index, before, after }, bit) => `
  if v_actual#>>'{functions,${index},definition}'=${quote(before.definition)} then v_pending[${bit + 1}]:=true;
  elsif v_actual#>>'{functions,${index},definition}' is distinct from ${quote(after.definition)} then raise exception 'K2_RETAINED_REPAIR_SCHEMA_DRIFT';end if;
  v_normalized:=pg_catalog.jsonb_set(v_normalized,'{functions,${index},definition}',pg_catalog.to_jsonb(${quote(after.definition)}::text));`).join('\n')
  const corrections = input.fragments.map((fragment, bit) => `
  if v_pending[${bit + 1}] then
   EXECUTE ${quote(fragment)};
   v_executed:=v_executed+1;
   ${faultAfter ? `if v_executed=${faultAfter} then raise exception 'K2_RETAINED_REPAIR_INJECTED_FAULT';end if;` : ''}
  end if;`).join('\n')
  const body = `
 declare v_actual jsonb;v_normalized jsonb;v_pending boolean[]:=array[false,false,false];v_executed integer:=0;
 v_after constant jsonb:=${quote(JSON.stringify(corrected))}::jsonb;
 begin
  if current_database() is distinct from 'postgres' or current_user is distinct from 'postgres'
   or current_setting('server_version_num') is distinct from '170006'
   or current_setting('data_directory') is distinct from '/tmp/k2-managed-data'
   or current_setting('port') is distinct from '5432' or inet_server_addr() is not null
   or (select pg_catalog.pg_get_userbyid(datdba) from pg_catalog.pg_database where datname=current_database()) is distinct from 'postgres'
   or (select pg_catalog.shobj_description(oid,'pg_database') from pg_catalog.pg_database where datname=current_database()) is distinct from ${quote('K2 retained repair:' + input.marker)}
   then raise exception 'K2_RETAINED_REPAIR_OWNED_TARGET_INVALID';end if;
  perform pg_catalog.pg_advisory_xact_lock(1261585232,1347374169);
  ${authorityCheck}
  ${catalogCheck}
  v_normalized:=v_actual;
  ${admissionChecks}
  if v_normalized is distinct from v_after then raise exception 'K2_RETAINED_REPAIR_SCHEMA_DRIFT';end if;
  ${faultAfter ? `if (v_pending[1]::integer+v_pending[2]::integer+v_pending[3]::integer)<${faultAfter} then raise exception 'K2_RETAINED_REPAIR_FAULT_BOUNDARY_UNAVAILABLE';end if;` : ''}
  ${corrections}
  ${authorityCheck}
  ${catalogCheck}
  if v_actual is distinct from v_after then raise exception 'K2_RETAINED_REPAIR_POSTCONDITION';end if;
  raise notice 'K2_RETAINED_REPAIR_CORRECTIONS:%',v_executed;
 end `
  let delimiter = '$retained_repair$', suffix = 0
  while (body.includes(delimiter)) delimiter = '$retained_repair_' + (++suffix) + '$'
  const sql = "-- Disposable owned RAM qualification only\nBEGIN;set local lock_timeout='2s';set local statement_timeout='10s';set local search_path='';\nDO " + delimiter + body + delimiter + ';\nCOMMIT;\n'
  return { sql, sqlSha256: sha(sql), classify, runtimeExecuted: false, providerWrites: false }
}
