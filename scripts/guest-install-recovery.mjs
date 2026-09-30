import fs from 'node:fs'
import { createHash } from 'node:crypto'

const scope=JSON.parse(fs.readFileSync(new URL('../docs/evidence/20260930-guest-continuity-rehearsal/guest-install-scope.json',import.meta.url),'utf8'))
export const guestInstallCaptureSql=fs.readFileSync(new URL('../supabase/guest_install_state_capture.sql',import.meta.url),'utf8').trim().replace(/;$/,'')
const literal=value=>"'"+String(value).replaceAll("'","''")+"'"
const sameNames=(entries,names)=>Array.isArray(entries) && entries.length===names.length
  && JSON.stringify(entries.map(e=>e.name).sort())===JSON.stringify([...names].sort())

// Deactivation retains all schema/data and relationships. It removes only the
// new browser privileges and three notification hooks; it is not a schema undo.
export function generateGuestInstallDeactivation(before,after) {
  if (!before?.database || before.database!==after?.database) throw Error('GUEST_INSTALL_DATABASE_MISMATCH')
  if (!before.systemIdentifier || before.systemIdentifier!==after.systemIdentifier) throw Error('GUEST_INSTALL_CLUSTER_MISMATCH')
  for (const capture of [before,after]) {
    if (!['functions','tables','triggers'].every(key=>Array.isArray(capture[key]))) throw Error('GUEST_INSTALL_CAPTURE_INCOMPLETE')
  }
  if (before.functions.length || before.tables.length || before.triggers.length) throw Error('GUEST_INSTALL_PARTIAL_PREINSTALLATION')
  if (!sameNames(after.functions,scope.functions) || !sameNames(after.tables,scope.tables)
    || after.triggers.length!==scope.triggers.length) throw Error('GUEST_INSTALL_CAPTURE_INCOMPLETE')
  for (const f of after.functions) {
    if (typeof f.signature!=='string' || f.signature.slice(0,f.signature.indexOf('('))!==f.name
      || !/^[a-z_0-9]+\.[a-z_0-9]+\((?:bigint|uuid|text|jsonb|bytea|integer|numeric|boolean|,| )*\)$/.test(f.signature)
      || !f.definition?.startsWith(`CREATE OR REPLACE FUNCTION ${f.name}(`) || !f.owner
      || !(f.acl===null || typeof f.acl==='string')) throw Error('GUEST_INSTALL_CAPTURE_INCOMPLETE')
  }
  for (const t of after.tables) {
    if (!t.owner || !(t.acl===null || typeof t.acl==='string') || typeof t.rls!=='boolean'
      || typeof t.forceRls!=='boolean' || !['columns','constraints','policies'].every(key=>Array.isArray(t[key]))) throw Error('GUEST_INSTALL_CAPTURE_INCOMPLETE')
  }
  if (!scope.triggers.every(t=>after.triggers.some(a=>a.table===t.table && a.name===t.name
    && typeof a.definition==='string' && typeof a.enabled==='string'))) throw Error('GUEST_INSTALL_CAPTURE_INCOMPLETE')
  const hash=createHash('sha256').update(JSON.stringify({before,after})).digest('hex')
  const revocations=after.functions.map(f=>`revoke all on function ${f.signature} from public,anon,authenticated;`).join('\n')
  const tableRevocations=scope.tables.map(name=>`revoke all on table ${name} from public,anon,authenticated;`).join('\n')
  const hooks=scope.triggers.map(t=>`drop trigger ${t.name} on ${t.table};`).join('\n')
  const signatureValues=after.functions.map(f=>`(${literal(f.signature)},${literal(f.definition)},${literal(f.owner)})`).join(',\n')
  return `-- Captured guest installation deactivation ${hash}; review before execution.
-- Keeps data, constraints, identities and signing material; no production cutover.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $guard$
begin
  if current_database()<>${literal(before.database)} then raise exception 'GUEST_INSTALL_DATABASE_MISMATCH'; end if;
  if (select system_identifier::text from pg_control_system())<>${literal(before.systemIdentifier)} then raise exception 'GUEST_INSTALL_CLUSTER_MISMATCH'; end if;
  if (${guestInstallCaptureSql}) is distinct from ${literal(JSON.stringify(after))}::jsonb then
    raise exception 'GUEST_INSTALL_LATER_CHANGE_REFUSED';
  end if;
end $guard$;
${revocations}
${tableRevocations}
${hooks}
do $verify$
declare target record; table_name text; role_name text; privilege_name text;
begin
  for target in select * from (values ${signatureValues}) expected(signature,definition,owner) loop
    if pg_get_functiondef(to_regprocedure(target.signature)) is distinct from target.definition
      or (select pg_get_userbyid(proowner) from pg_proc where oid=to_regprocedure(target.signature)) is distinct from target.owner
      or has_function_privilege('anon',target.signature,'execute')
      or has_function_privilege('authenticated',target.signature,'execute')
      or exists(select 1 from pg_proc p,lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        where p.oid=to_regprocedure(target.signature) and a.grantee=0 and a.privilege_type='EXECUTE') then
      raise exception 'GUEST_INSTALL_DEACTIVATION_MISMATCH';
    end if;
  end loop;
  foreach table_name in array array[${scope.tables.map(literal).join(',')}] loop
    foreach role_name in array array['anon','authenticated'] loop
      foreach privilege_name in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        if has_table_privilege(role_name,table_name,privilege_name) then raise exception 'GUEST_INSTALL_TABLE_ACCESS_REMAINS'; end if;
      end loop;
      foreach privilege_name in array array['SELECT','INSERT','UPDATE','REFERENCES'] loop
        if has_any_column_privilege(role_name,table_name,privilege_name) then raise exception 'GUEST_INSTALL_COLUMN_ACCESS_REMAINS'; end if;
      end loop;
    end loop;
  end loop;
end $verify$;
notify pgrst,'reload schema';
commit;
`
}
