import { authorizeAdminRequest } from './authorize.js'
import {
  readJson, refreshActiveSessionCookie, safeJson,
} from './security.js'
import { recordSecurityEvent } from './security-events.js'
import {
  completeActiveMfaReplacement, inspectActiveMfaReplacement,
  isMfaReplacementConfigured, mfaFactorFingerprint, recordMfaReplacementEvent,
  startActiveMfaReplacement, validateMfaReplacementCommand,
} from './mfa-replacement.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function replacementError(res, error) {
  const code = String(error?.message || '')
  const known = {
    MFA_REPLACEMENT_INVALID: [400, 'MFA_REPLACEMENT_INVALID'],
    MFA_REPLACEMENT_ACTIVE_FACTOR_REQUIRED: [409, 'MFA_REPLACEMENT_ACTIVE_FACTOR_REQUIRED'],
    MFA_REPLACEMENT_MULTIPLE_ACTIVE_FACTORS: [409, 'MFA_REPLACEMENT_MULTIPLE_ACTIVE_FACTORS'],
    MFA_REPLACEMENT_FACTOR_INVALID: [409, 'MFA_REPLACEMENT_FACTOR_INVALID'],
    MFA_REPLACEMENT_VERIFICATION_FAILED: [401, 'MFA_REPLACEMENT_VERIFICATION_FAILED'],
    MFA_REPLACEMENT_RETIRE_FAILED: [503, 'MFA_REPLACEMENT_RETIRE_FAILED'],
    MFA_REPLACEMENT_CONFLICT: [409, 'IDEMPOTENCY_CONFLICT'],
    MFA_REPLACEMENT_RATE_LIMITED: [429, 'RATE_LIMITED'],
    MFA_REPLACEMENT_AUDIT_UNAVAILABLE: [503, 'MFA_REPLACEMENT_AUDIT_UNAVAILABLE'],
  }[code]
  return safeJson(res, known?.[0] || 503, { error: { code: known?.[1] || 'MFA_REPLACEMENT_UNAVAILABLE' } }, known?.[1] === 'RATE_LIMITED' ? { 'Retry-After': '60' } : {})
}

export default async function handleMfaReplacement(req, res) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const replacementId = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(replacementId)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  if (authorized.identity.role !== 'Admin') return safeJson(res, 403, { error: { code: 'STAFF_ACCESS_ADMIN_REQUIRED' } })
  if (!isMfaReplacementConfigured()) return safeJson(res, 503, { error: { code: 'MFA_REPLACEMENT_UNAVAILABLE' } })
  try {
    const command = validateMfaReplacementCommand(await readJson(req))
    if (command.action === 'start') {
      const inspected = await inspectActiveMfaReplacement(authorized.client)
      const previousFactorHash = mfaFactorFingerprint(inspected.previousFactorId)
      await recordMfaReplacementEvent(
        authorized.client, authorized.identity, 'admin_mfa_replacement_requested', replacementId,
        { reason: command.reason, previousFactorHash },
      )
      const enrollment = await startActiveMfaReplacement(authorized.client, inspected.previousFactorId)
      await recordSecurityEvent(authorized.client, {
        correlationId: authorized.correlationId, eventType: 'credential_change', source: 'admin_bff',
        severity: 'warning', outcome: 'flagged', sessionId: authorized.session.sessionId,
        routeKey: 'admin.staff-access.mfa-replacement', reasonCode: 'MFA_REPLACEMENT_STARTED',
        subjectKind: 'mfa_replacement', subjectId: replacementId,
      })
      return safeJson(res, 200, { ok: true, replacement: { replacementId, ...enrollment } })
    }
    if (command.replacementId !== replacementId) throw new Error('MFA_REPLACEMENT_INVALID')
    const result = await completeActiveMfaReplacement(
      authorized.client, command.previousFactorId, command.factorId, command.code,
    )
    if (result.authSession) refreshActiveSessionCookie(res, {
      ...result.authSession,
      expires_at: Math.floor(Date.now() / 1000) + result.authSession.expires_in,
    }, authorized.session)
    await recordMfaReplacementEvent(
      authorized.client, authorized.identity, 'admin_mfa_replacement_completed', replacementId,
      {
        reason: command.reason,
        previousFactorHash: mfaFactorFingerprint(command.previousFactorId),
        factorHash: mfaFactorFingerprint(command.factorId),
      },
    )
    await recordSecurityEvent(authorized.client, {
      correlationId: authorized.correlationId, eventType: 'credential_change', source: 'admin_bff',
      severity: 'warning', outcome: 'succeeded', sessionId: authorized.session.sessionId,
      routeKey: 'admin.staff-access.mfa-replacement', reasonCode: 'MFA_REPLACEMENT_COMPLETED',
      subjectKind: 'mfa_replacement', subjectId: replacementId,
    })
    return safeJson(res, 200, { ok: true, replacementComplete: true })
  } catch (error) {
    if (['BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'MFA_REPLACEMENT_INVALID' } })
    }
    return replacementError(res, error)
  }
}
