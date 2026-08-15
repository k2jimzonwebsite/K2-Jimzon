import { createClient } from '@supabase/supabase-js'

export function createStorefrontServerSupabase() {
  const url = process.env.SUPABASE_URL || ''
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || ''
  if (!url || !publishableKey) throw new Error('SUPABASE_SERVER_CONFIG_MISSING')
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export function mapBoundaryResult(data) {
  const result = Array.isArray(data) ? data[0] : data
  if (!result) return { ok: false, status: 503, code: 'SERVICE_UNAVAILABLE' }
  if (result.ok) return { ok: true, result }
  if (result.error_code === 'RATE_LIMITED') {
    return { ok: false, status: 429, code: 'RATE_LIMITED', retryAfter: Number(result.retry_after_seconds || 60) }
  }
  if (result.error_code === 'IDEMPOTENCY_CONFLICT') {
    return { ok: false, status: 409, code: 'REQUEST_CONFLICT' }
  }
  if (result.error_code === 'GUEST_ACCESS_REQUIRED' || result.error_code === 'GUEST_ACCESS_EXPIRED') {
    return { ok: false, status: 401, code: result.error_code }
  }
  if (result.error_code === 'CONVERSATION_NOT_AVAILABLE') {
    return { ok: false, status: 404, code: 'CONVERSATION_NOT_AVAILABLE' }
  }
  return { ok: false, status: 409, code: 'REQUEST_REJECTED' }
}
