// MAP-018 / IDEA-20261010-08. Pure disposable preparation, never dispatch.
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

const sha = value => createHash('sha256').update(value).digest('hex')
const quote = value => "'" + value.replaceAll("'", "''") + "'"
const pins = {
  priorBytes: 'e9ff18682ab3f3f65c43bf16eff7e6bad6bc77dc32f3f329ecb68d5b22e15460',
  correctedBytes: 'f15546967b026374dc2c93893cba51508ac549eb290a9904bfd1fbb49fea7a3a',
  packageBytes: '05dadb37cbe01edc0a70172e12a3d047438559df5c3949edb82ec817f8505b84',
}
const fragmentPins = [
  'ef4442fe9d6ebba0bd557e9a53bf25e75c78585d91a1cd54f910b02fd78d8476',
  'efe76030dfc116ace181492b02d03cacf4a5e7140ecb30141575a6d2ea8ed166',
  '974b404f066282f001963d8ba7d548c5e137f95f40c57a73d480abeba7abc6b0',
]
const names = ['execute_admin_product_master_command_v1', 'execute_customer_delivery_rates_v1', 'mutate_category_policy_v1']

export function prepareRepairEnvelope(input) {
  for (const [key, pin] of Object.entries(pins))
    if (sha(input[key]) !== pin) throw Error('RETAINED_REPAIR_SOURCE_PIN:' + key)
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
