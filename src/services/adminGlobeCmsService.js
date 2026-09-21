function directError(error, fallback) {
  const message = String(error?.message || '')
  if (message.includes('K2_ADMIN_REQUIRED') || error?.code === '42501') return 'Admin access with a current MFA check is required.'
  if (message.includes('K2_ADMIN_GLOBE_STALE') || message.includes('K2_ADMIN_REVIEW_STALE')) return 'This record changed. Refresh and review it before saving.'
  if (message.includes('K2_ADMIN_REVIEW_EVIDENCE_REQUIRED')) return 'Record the source and publication rights before publishing.'
  if (message.includes('K2_ADMIN_GLOBE_REVIEW_INVALID')) return 'Check the review fields and reason, then try again.'
  return fallback
}

export function createAdminGlobeCmsTransport({ client, bffEnabled, bffRead, bffCommand }) {
  return {
    async read(signal) {
      if (bffEnabled) return bffRead(signal)
      if (!client) return { ok: false, error: 'Globe records are unavailable.' }
      const { data, error } = await client.rpc('read_admin_globe_cms_v1')
      if (signal?.aborted) return { aborted: true }
      return error || !data
        ? { ok: false, error: directError(error, 'Globe records could not be loaded.') }
        : { ok: true, cms: data }
    },
    async command(action, payload, idempotencyKey = crypto.randomUUID()) {
      if (bffEnabled) return bffCommand(action, payload, idempotencyKey)
      if (!client) return { ok: false, error: 'Globe editing is unavailable.' }
      const { data, error } = await client.rpc('execute_admin_globe_review_direct_v1', {
        p_action: action,
        p_idempotency_key: idempotencyKey,
        p_payload_text: JSON.stringify(payload),
      })
      return error
        ? { ok: false, error: directError(error, 'The change could not be recorded safely. Check the saved record before trying again.') }
        : { ok: true, result: data }
    },
  }
}
