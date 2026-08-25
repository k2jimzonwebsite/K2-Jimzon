import { createHmac, randomUUID } from 'node:crypto'

const EVENT_TYPES = new Set([
  'authentication','mfa','password_reset','session','authorization','rls',
  'rate_limit','bot_challenge','suspicious_upload','webhook_failure',
  'credential_change','admin_change','destructive_operation','data_export',
  'browser_error','application_error',
])
const SOURCES = new Set(['admin_bff','storefront_bff','edge_function','database','admin_browser'])
const SEVERITIES = new Set(['info','warning','critical'])
const OUTCOMES = new Set(['succeeded','denied','failed','flagged'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ROUTE_KEY = /^[a-z0-9_./:-]{1,120}$/
const REASON_CODE = /^[A-Z0-9_]{3,80}$/
const SUBJECT_KIND = /^[a-z0-9_.:-]{1,60}$/
const SUBJECT_ID = /^[A-Za-z0-9_.:/-]{1,120}$/

export function validateSecurityEvent(event) {
  const value = {
    correlationId: String(event?.correlationId || randomUUID()),
    eventType: String(event?.eventType || ''), source: String(event?.source || ''),
    severity: String(event?.severity || ''), outcome: String(event?.outcome || ''),
    sessionId: event?.sessionId ? String(event.sessionId) : null,
    routeKey: String(event?.routeKey || ''), reasonCode: String(event?.reasonCode || ''),
    subjectKind: event?.subjectKind ? String(event.subjectKind) : null,
    subjectId: event?.subjectId ? String(event.subjectId) : null,
  }
  if (!UUID.test(value.correlationId) || !EVENT_TYPES.has(value.eventType)
      || !SOURCES.has(value.source) || !SEVERITIES.has(value.severity)
      || !OUTCOMES.has(value.outcome) || (value.sessionId && !UUID.test(value.sessionId))
      || !ROUTE_KEY.test(value.routeKey) || !REASON_CODE.test(value.reasonCode)
      || (value.subjectKind && !SUBJECT_KIND.test(value.subjectKind))
      || (value.subjectId && !SUBJECT_ID.test(value.subjectId))) {
    throw new Error('SECURITY_EVENT_INVALID')
  }
  return Object.freeze(value)
}

export function signedSecurityEventArguments(event, { timestamp = Math.floor(Date.now() / 1000), nonce } = {}) {
  const value = validateSecurityEvent(event)
  const eventNonce = String(nonce || value.correlationId)
  if (!UUID.test(eventNonce)) throw new Error('SECURITY_EVENT_INVALID')
  const secret = Buffer.from(process.env.K2_ADMIN_BFF_REQUEST_SECRET || '', 'base64')
  if (secret.length !== 32) throw new Error('ADMIN_REQUEST_SECRET_NOT_CONFIGURED')
  const fields = [
    timestamp,eventNonce,value.correlationId,value.eventType,value.source,value.severity,
    value.outcome,value.sessionId || '',value.routeKey,value.reasonCode,
    value.subjectKind || '',value.subjectId || '',
  ]
  return {
    p_timestamp: timestamp,
    p_nonce: eventNonce,
    p_correlation_id: value.correlationId,
    p_event_type: value.eventType,
    p_source: value.source,
    p_severity: value.severity,
    p_outcome: value.outcome,
    p_session_id: value.sessionId,
    p_route_key: value.routeKey,
    p_reason_code: value.reasonCode,
    p_subject_kind: value.subjectKind,
    p_subject_id: value.subjectId,
    p_signature: createHmac('sha256',secret).update(fields.join('\n'),'utf8').digest('hex'),
  }
}

export async function recordSecurityEvent(client, event) {
  try {
    const args = signedSecurityEventArguments(event)
    const result = await Promise.race([
      client.rpc('record_security_event_v1',args),
      new Promise((resolve) => setTimeout(() => resolve({ error: { message: 'SECURITY_EVENT_TIMEOUT' } }),750)),
    ])
    if (!result?.error && result?.data?.recorded === true) return { recorded: true, correlationId: args.p_correlation_id }
    if (String(result?.error?.message || '').includes('K2_SECURITY_EVENT_REPLAYED')) {
      return { recorded: true, replayed: true, correlationId: args.p_correlation_id }
    }
  } catch {
    // Security telemetry is best effort and must never break the protected action.
  }
  return { recorded: false }
}

export function adminRouteKey(req) {
  const supplied = Array.isArray(req?.query?.route) ? req.query.route.join('/') : String(req?.query?.route || '')
  const normalized = supplied.toLowerCase().replace(/^\/+|\/+$/g,'')
  const routeKey = `admin.${normalized.replaceAll('/','.')}`
  return ROUTE_KEY.test(routeKey) ? routeKey : 'admin.unknown'
}
