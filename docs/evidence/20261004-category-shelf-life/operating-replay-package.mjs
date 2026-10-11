// MAP-018: generate an owned-local single-transaction fresh-or-exact-replay package.
import {isDeepStrictEqual} from 'node:util'
import {createHash} from 'node:crypto'
const quote=s=>"'"+String(s).replaceAll("'","''")+"'"
// Provider preparation has its own admission. Never remove the owned-local
// identity guard from an accepted package to make it run remotely.
const managedSettings={policyGrants:'supautils.policy_grants',reservedRoles:'supautils.reserved_roles',superuserRole:'supautils.superuser',privilegedRole:'supautils.privileged_role',dropTriggerGrants:'supautils.drop_trigger_grants',reservedMemberships:'supautils.reserved_memberships',localPreloadLibraries:'local_preload_libraries',sessionPreloadLibraries:'session_preload_libraries'}
export const providerManagedAuthoritySql='select pg_catalog.jsonb_build_object('+Object.entries(managedSettings).map(([key,name])=>quote(key)+',pg_catalog.current_setting('+quote(name)+',true)').join(',')+')'
export function providerOperatingReplayPackage({contractSql,before,after,fragments,authoritySql,authority,serverVersion,managedAuthority,qualifiedPlatformBarrier=false}){
 if(serverVersion!=='170006'||!before||!after||!Array.isArray(fragments)||!fragments.length)throw Error('PROVIDER_REVIEWED_INPUTS_REQUIRED')
 if([before,after].some(c=>c.contract!=='k2-category-operating-schema-v1'||c.unsupportedAggregates?.length||!c.relations?.length||c.relations.some(r=>r.kind==='f')))throw Error('PROVIDER_CONTRACT_UNSUPPORTED')
 if(isDeepStrictEqual(before,after))throw Error('PROVIDER_DISTINCT_CALIBRATED_STATES_REQUIRED')
 if(!/^select\s/i.test(authoritySql)||authoritySql.includes(';')||!authority?.roles?.length||!Array.isArray(authority.memberships)||!Array.isArray(authority.eventTriggers))throw Error('PROVIDER_AUTHORITY_REQUIRED')
 if(!managedAuthority||!isDeepStrictEqual(Object.keys(managedAuthority).sort(),Object.keys(managedSettings).sort())||Object.values(managedAuthority).some(v=>typeof v!=='string')||managedAuthority.sessionPreloadLibraries!=='supautils')throw Error('PROVIDER_MANAGED_AUTHORITY_REQUIRED')
 // These untouched platform tables have no suitable captured lock privilege.
 // Admit only the audited payload; retain their complete schema comparisons.
 const protectedPlatformTables=qualifiedPlatformBarrier?['auth.schema_migrations','storage.migrations','storage.buckets_analytics','storage.buckets_vectors','storage.s3_multipart_uploads','storage.s3_multipart_uploads_parts','storage.vector_indexes']:[]
 if(qualifiedPlatformBarrier){
  const contents=fragments.join('\n')
  // Separate immutable pins for the captured baseline and its reviewed imported continuation.
  const reviewedContents=['7c7e96cc81aa6535976ddf447355fd707fbe3392e7e5b2f79866abe814afd1fb','372b188c83b16cc64438a996a99d429c3ebe39a862a09824ce6caa2411951633',
   // IDEA-20261010-08: exact imported union plus guarded Product Master transport overlay.
   'd4600da2a995b983454f720fc3ad1622cc97aeef9b611f00c4accf5d618a0010',
   // IDEA-20261010-08: exact imported union plus Master and tariff transport overlays.
   '8790fa089868b6fff3bcecbf8b9d5cabe28d997136a3437a0416f9f96845d65a',
   // IDEA-20261010-08: same union plus the exact guarded category conflict overlay.
   '1827099d14153f9d4cf55e43213341c609692d36aac234033dc96cb71e8717b9',
   // IDEA-20261010-06: reviewed exact reference additions; native integration still required.
   '0a945f7183c1ba483894fa83a09c2a38bf4bff1bd50a2cfcd6e5144454cfec8d',
   // IDEA-20261011-01: reviewed exact two-read-function extension on the same union.
   '71f0b7b7a4e7b9471276f32f78334804a33daa05f53bbd1914cee9819a79fae3']
  if(!reviewedContents.includes(createHash('sha256').update(contents).digest('hex')))throw Error('PROVIDER_PLATFORM_BARRIER_CONTENTS_DRIFT')
  for(const name of protectedPlatformTables){
   const prior=before.relations.find(r=>r.name===name),next=after.relations.find(r=>r.name===name)
   if(!prior||!['r','p'].includes(prior.kind)||!isDeepStrictEqual(prior,next)||contents.includes(name))throw Error('PROVIDER_PLATFORM_BARRIER_METADATA_DRIFT:'+name)
  }
 }
 const cutoverTables=before.relations.filter(r=>['r','p'].includes(r.kind)&&!protectedPlatformTables.includes(r.name)).map(r=>r.name).sort()
 const platformFilter=qualifiedPlatformBarrier?' and (r->>\'name\') <> all(array['+protectedPlatformTables.map(quote).join(',')+']::text[])':''
 const selectContract="select s.category_operating_contract into v_actual from ("+contractSql.trim().replace(/;$/,'')+") s;"
 const checkAuthority="if ("+authoritySql+") is distinct from "+quote(JSON.stringify(authority))+"::jsonb then raise exception 'K2_PROVIDER_AUTHORITY_DRIFT';end if;\n  if ("+providerManagedAuthoritySql+") is distinct from "+quote(JSON.stringify(managedAuthority))+"::jsonb then raise exception 'K2_PROVIDER_MANAGED_AUTHORITY_DRIFT';end if;"
 const content=JSON.stringify([before,after,fragments,contractSql,authoritySql,authority,managedAuthority]);
 let delimiter='$provider_install$',suffix=0;
 while(content.includes(delimiter))delimiter='$provider_install_'+(++suffix)+'$';
 const body=`do ${delimiter}
 declare v_actual jsonb;v_before constant jsonb:=${quote(JSON.stringify(before))}::jsonb;v_after constant jsonb:=${quote(JSON.stringify(after))}::jsonb;v_tables text;
 begin
  if current_database() is distinct from 'postgres' or current_user is distinct from 'postgres'
   or current_setting('server_version_num') is distinct from '${serverVersion}' then raise exception 'K2_PROVIDER_INSTALL_TARGET_INVALID';end if;
  perform pg_catalog.pg_advisory_xact_lock(1261585232,1347374169);
  ${checkAuthority}
  ${selectContract}
  if v_actual=v_after then raise notice 'K2_PROVIDER_EXACT_REPLAY';return;end if;
  if v_actual is distinct from v_before then raise exception 'K2_PROVIDER_SCHEMA_DRIFT';end if;
  select string_agg(r->>'name',',' order by r->>'name') into v_tables
   from jsonb_array_elements(v_before->'relations') r where r->>'kind' in ('r','p')${platformFilter};
  if v_tables is null then raise exception 'K2_PROVIDER_CUTOVER_TABLES_REQUIRED';end if;
  execute 'lock table '||v_tables||' in access exclusive mode';
  ${checkAuthority}
  ${selectContract}
  if v_actual is distinct from v_before then raise exception 'K2_PROVIDER_CUTOVER_CONTRACT_CHANGED';end if;
  execute ${quote(fragments.join('\n'))};
  ${checkAuthority}
  ${selectContract}
  if v_actual is distinct from v_after then raise exception 'K2_PROVIDER_POSTCONDITION_FAILED';end if;
  raise notice 'K2_PROVIDER_FRESH_APPLY';
 end ${delimiter};`
 return {
  ...(qualifiedPlatformBarrier?{cutoverTables,protectedPlatformTables}:{}),
  expectedConnectorProject:'pixplcjqivlfflickobf',
  // The reviewed execution tool must bind this project. SQL database/role names
  // alone cannot establish Supabase project identity.
  requiresConnectorProjectBinding:true,
  sql:"-- Execute only through reviewed Supabase project pixplcjqivlfflickobf; SQL does not establish project identity.\nbegin;set local lock_timeout='2s';set local statement_timeout='10s';set local search_path='';\n"+body+'\ncommit;'
 }
}
export function operatingReplayPackage(contractSql,before,after,fragments,eventGuard){
 if(before.length!==after.length||before.length!==2)throw Error('REPLAY_EXACT_VARIANTS_REQUIRED')
 if([...before,...after].some(c=>c.unsupportedAggregates?.length))throw Error('REPLAY_AGGREGATE_UNSUPPORTED')
 if([...before,...after].flatMap(c=>c.relations).some(r=>r.kind==='f'))throw Error('REPLAY_FOREIGN_TABLE_UNSUPPORTED')
 const selectContract="select s.category_operating_contract into v_actual from ("+contractSql.trim().replace(/;$/,'')+") s;"
 const content=JSON.stringify([before,after,fragments,contractSql,eventGuard]);
 let delimiter='$operating_install$',suffix=0;
 while(content.includes(delimiter))delimiter='$operating_install_'+(++suffix)+'$';
 const body=`do ${delimiter}
 declare v_actual jsonb;v_before constant jsonb:=${quote(JSON.stringify(before))}::jsonb;v_after constant jsonb:=${quote(JSON.stringify(after))}::jsonb;v_db text:=current_database();v_kind text;v_index integer;v_tables text;
 begin
  if current_user is distinct from 'postgres' or current_setting('data_directory') is distinct from 'C:/Users/jerze/K2 JImzon/.tools/current-restore-20260929-pg-data'
   or inet_server_port() is distinct from 54388 or host(inet_server_addr()) is distinct from '127.0.0.1'
   or v_db!~'^k2_category_(foundation|cold)_[0-9a-f]{32}$' then raise exception 'K2_OPERATING_INSTALL_TARGET_INVALID';end if;
  v_kind:=case when v_db like 'k2_category_foundation_%' then 'foundation' else 'cold' end;
  if (select pg_get_userbyid(datdba) from pg_database where datname=v_db)<>'postgres'
   or (select shobj_description(oid,'pg_database') from pg_database where datname=v_db) is distinct from 'K2 category '||v_kind||':'||right(v_db,32)::uuid::text then raise exception 'K2_OPERATING_INSTALL_MARKER_INVALID';end if;
  perform pg_catalog.pg_advisory_xact_lock(1261585232,1347374169);
  ${selectContract}
  for v_index in 0..jsonb_array_length(v_after)-1 loop
   if v_actual=v_after->v_index then raise notice 'K2_OPERATING_EXACT_REPLAY';return;end if;
  end loop;
  for v_index in 0..jsonb_array_length(v_before)-1 loop
   if v_actual=v_before->v_index then
    -- Legacy roots predate advisory admission. Drain their canonical resource
    -- locks and hold the complete table barrier until this transaction ends.
    select string_agg(r->>'name',',' order by r->>'name') into v_tables
     from jsonb_array_elements(v_before->v_index->'relations') r
     where r->>'kind' in ('r','p');
    if v_tables is null then raise exception 'K2_OPERATING_CUTOVER_TABLES_REQUIRED';end if;
    execute 'lock table '||v_tables||' in access exclusive mode';
    ${selectContract}
    if v_actual is distinct from v_before->v_index then raise exception 'K2_OPERATING_CUTOVER_CONTRACT_CHANGED';end if;
    execute ${quote(fragments.join('\n'))};
    ${selectContract}
    if v_actual is distinct from v_after->v_index then raise exception 'K2_OPERATING_POSTCONDITION_FAILED';end if;
    raise notice 'K2_OPERATING_FRESH_APPLY';return;
   end if;
  end loop;
  raise exception 'K2_OPERATING_SCHEMA_DRIFT';
 end ${delimiter};`
 // Optional exact global event bindings supplement the existing scoped bodies.
 // Check at initial admission, after the fresh table barrier, and after DDL.
 // Existing callers without this supplement retain byte-identical packages.
 if(eventGuard&&(!Array.isArray(eventGuard.expected)||typeof eventGuard.sql!=='string'||!/^select\s/i.test(eventGuard.sql)||eventGuard.sql.includes(';')))throw Error('REPLAY_EVENT_GUARD_INVALID')
 const eventCheck=eventGuard?"if ("+eventGuard.sql+") is distinct from "+quote(JSON.stringify(eventGuard.expected))+"::jsonb then raise exception 'K2_OPERATING_EVENT_TRIGGER_DRIFT';end if;\n  ":''
 const guardedBody=eventGuard?body.replaceAll(selectContract,eventCheck+selectContract):body
 return {body:guardedBody,sql:"begin;set local lock_timeout='2s';set local statement_timeout='10s';set local search_path='';\n"+guardedBody+'\ncommit;'}
}
