import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getPublishableKey, getServiceRoleKey } from '../_shared/service-role.ts'
import { createInviteStaffHandler } from './handler.ts'

const env = {
  SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
  K2_ADMIN_ORIGINS: Deno.env.get('K2_ADMIN_ORIGINS') ?? '',
  K2_EDGE_ALLOW_LOCALHOST: Deno.env.get('K2_EDGE_ALLOW_LOCALHOST') ?? '',
}
const supabaseUrl = env.SUPABASE_URL
const publishableKey = getPublishableKey()
const serviceRoleKey = getServiceRoleKey()

function assertConfigured() {
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) throw new Error('EDGE_CONFIGURATION_MISSING')
}

const createAdminClient = () => {
  assertConfigured()
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
}

const handler = createInviteStaffHandler({
  env,
  configured: Boolean(supabaseUrl && publishableKey && serviceRoleKey),
  createCallerClient(authorization) {
    assertConfigured()
    return createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
  },
  createAdminClient,
  operationStore: {
    async claim(actorId, key, hash) {
      const { data, error } = await createAdminClient().rpc('claim_staff_invitation_operation', {
        p_actor_id: actorId, p_idempotency_key: key, p_payload_hash: hash,
      })
      if (error) throw new Error('OPERATION_CLAIM_FAILED')
      return data
    },
    async complete(actorId, key, hash, result) {
      const { error } = await createAdminClient().rpc('complete_staff_invitation_operation', {
        p_actor_id: actorId, p_idempotency_key: key, p_payload_hash: hash, p_result: result,
      })
      if (error) throw new Error('OPERATION_COMPLETE_FAILED')
    },
    async release(actorId, key, hash) {
      const { error } = await createAdminClient().rpc('release_staff_invitation_operation', {
        p_actor_id: actorId, p_idempotency_key: key, p_payload_hash: hash,
      })
      if (error) throw new Error('OPERATION_RELEASE_FAILED')
    },
  },
  logger: {
    error(event, detail) { console.error(JSON.stringify({ event, ...detail })) },
  },
})

Deno.serve(handler)
