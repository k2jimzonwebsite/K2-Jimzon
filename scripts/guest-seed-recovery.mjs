import { createHash } from 'node:crypto'

export const guestSeedSignatures = [
  'public.submit_guest_order_v1(bigint,uuid,text,text,text,text)',
  'public.submit_guest_pasabuy_v1(bigint,uuid,text,text,text,text)',
]
const literal = value => value === null ? 'null' : "'" + String(value).replaceAll("'", "''") + "'"

// Both captures must come from the same exact database: before and after seed.
// Recovery refuses any later body, owner or ACL change rather than undoing it.
export function generateGuestSeedRecovery(before, after) {
  if (!before?.database || before.database !== after?.database) throw Error('GUEST_SEED_DATABASE_MISMATCH')
  if (!before.systemIdentifier || before.systemIdentifier !== after.systemIdentifier) throw Error('GUEST_SEED_CLUSTER_MISMATCH')
  for (const capture of [before, after]) {
    if (!Array.isArray(capture.functions) || capture.functions.length !== 2
      || new Set(capture.functions.map(f => f.signature)).size !== 2) throw Error('GUEST_SEED_CAPTURE_REQUIRED')
    for (const signature of guestSeedSignatures) {
      const f = capture.functions.find(f => f.signature === signature)
      if (!f || !f.definition?.startsWith('CREATE OR REPLACE FUNCTION public.') || !f.owner
        || !(f.acl === null || typeof f.acl === 'string')) throw Error('GUEST_SEED_CAPTURE_REQUIRED')
    }
  }
  const statements = guestSeedSignatures.map(signature => {
    const old = before.functions.find(f => f.signature === signature)
    const seeded = after.functions.find(f => f.signature === signature)
    if (old.owner !== seeded.owner || old.acl !== seeded.acl) throw Error('GUEST_SEED_PERMISSION_DRIFT')
    return `
  target := to_regprocedure(${literal(signature)});
  if target is null then raise exception 'GUEST_SEED_SIGNATURE_MISSING'; end if;
  if pg_get_functiondef(target) is distinct from ${literal(seeded.definition)}
     or (select pg_get_userbyid(proowner) from pg_proc where oid=target) is distinct from ${literal(seeded.owner)}
     or (select proacl::text from pg_proc where oid=target) is distinct from ${literal(seeded.acl)} then
    raise exception 'GUEST_SEED_LATER_CHANGE_REFUSED';
  end if;
  execute ${literal(old.definition)};
  if pg_get_functiondef(target) is distinct from ${literal(old.definition)}
     or (select pg_get_userbyid(proowner) from pg_proc where oid=target) is distinct from ${literal(old.owner)}
     or (select proacl::text from pg_proc where oid=target) is distinct from ${literal(old.acl)} then
    raise exception 'GUEST_SEED_RECOVERY_MISMATCH';
  end if;`
  }).join('\n')
  const hash = createHash('sha256').update(JSON.stringify({ before, after })).digest('hex')
  return `-- Captured guest seed recovery ${hash}; review before execution.\nbegin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $guest_seed_recovery$
declare target oid;
begin
  if current_database() <> ${literal(before.database)} then raise exception 'GUEST_SEED_DATABASE_MISMATCH'; end if;
  if (select system_identifier::text from pg_control_system()) <> ${literal(before.systemIdentifier)} then raise exception 'GUEST_SEED_CLUSTER_MISMATCH'; end if;
${statements}
end $guest_seed_recovery$;
notify pgrst, 'reload schema';
commit;\n`
}
