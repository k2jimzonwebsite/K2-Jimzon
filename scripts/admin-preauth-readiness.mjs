export const ADMIN_PREAUTH_SIGNATURE = 'public.consume_admin_preauth_rate_v1(p_action text, p_timestamp bigint, p_nonce uuid, p_ip_hash text, p_contact_hash text, p_signature text)'
export const ADMIN_PREAUTH_PERMISSION = Object.freeze({ signature: ADMIN_PREAUTH_SIGNATURE, owner: 'postgres', definer: true, result: 'jsonb', publicExecute: false })

export function classifyAdminPreauthDependency(snapshot, expectedBodySha256, { preparedAbsent = false } = {}) {
  const refuse = detail => ({ state: 'blocked', detail })
  if (!snapshot || !Object.hasOwn(snapshot, 'routine') || !Object.hasOwn(snapshot, 'nonces') || !Object.hasOwn(snapshot, 'buckets')
      || !/^[a-f0-9]{64}$/.test(expectedBodySha256 || '')) return refuse('Incomplete Admin pre-auth dependency evidence')
  if (snapshot.routine === null && snapshot.nonces === null && snapshot.buckets === null) {
    return preparedAbsent
      ? { state: 'owner', detail: 'All three pre-auth objects are absent; exact additive installation is prepared, not applied or authorized by this flag' }
      : refuse('Admin login/MFA/recovery dependency is missing: signed rate RPC and private nonce/bucket tables')
  }
  const routine = snapshot.routine
  if (!routine || !snapshot.nonces || !snapshot.buckets) return refuse('Partial Admin pre-auth installation; automatic replacement refused')
  if (Object.entries(ADMIN_PREAUTH_PERMISSION).some(([key,value]) => routine[key] !== value)
      || routine.bodySha256 !== expectedBodySha256 || routine.emptySearchPath !== true
      || routine.anonExecute !== true || routine.authenticatedExecute !== false) return refuse('Admin pre-auth function body/authority differs from reviewed source')
  for (const table of [snapshot.nonces, snapshot.buckets]) {
    if (table.owner !== 'postgres' || table.rls !== true || table.forceRls !== true
        || table.anonAccess !== false || table.authenticatedAccess !== false) return refuse('Admin pre-auth private table boundary differs')
  }
  return { state: 'verified', detail: 'Exact signed Admin pre-auth function, limited execute and private forced-RLS rate tables verified; genuine hosted login remains separate' }
}
