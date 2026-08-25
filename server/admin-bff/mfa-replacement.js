import { createHash } from 'node:crypto'
import { signedAdminCommandArguments } from './security.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const QR_DATA = /^data:image\/svg\+xml(?:;charset=[a-z0-9-]+)?;base64,[A-Za-z0-9+/=]+$/i
const TOTP_SECRET = /^[A-Z2-7]{16,128}$/

export function isMfaReplacementConfigured(env = process.env) {
  return String(env.K2_MFA_REPLACEMENT_ENABLED || '').toLowerCase() === 'true'
}

export function validateMfaReplacementCommand(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('MFA_REPLACEMENT_INVALID')
  const reason = String(body.reason || '').trim()
  if (reason.length < 3 || reason.length > 500) throw new Error('MFA_REPLACEMENT_INVALID')
  if (body.action === 'start' && Object.keys(body).length === 2
      && ['action', 'reason'].every((key) => Object.hasOwn(body, key))) {
    return { action: 'start', reason }
  }
  if (body.action === 'complete' && Object.keys(body).length === 7
      && ['action', 'replacementId', 'previousFactorId', 'factorId', 'code', 'reason', 'confirmation'].every((key) => Object.hasOwn(body, key))
      && UUID.test(String(body.replacementId || ''))
      && UUID.test(String(body.previousFactorId || ''))
      && UUID.test(String(body.factorId || ''))
      && body.previousFactorId !== body.factorId
      && /^\d{6}$/.test(String(body.code || ''))
      && body.confirmation === 'replace_active_factor') {
    return {
      action: 'complete', replacementId: String(body.replacementId),
      previousFactorId: String(body.previousFactorId), factorId: String(body.factorId),
      code: String(body.code), reason, confirmation: 'replace_active_factor',
    }
  }
  throw new Error('MFA_REPLACEMENT_INVALID')
}

export function mfaFactorFingerprint(factorId) {
  if (!UUID.test(String(factorId || ''))) throw new Error('MFA_REPLACEMENT_INVALID')
  return createHash('sha256').update(String(factorId), 'utf8').digest('hex')
}

async function listTotpFactors(client) {
  const { data, error } = await client.auth.mfa.listFactors()
  if (error || !Array.isArray(data?.totp)) throw new Error('MFA_REPLACEMENT_UNAVAILABLE')
  return data.totp
}

export async function inspectActiveMfaReplacement(client) {
  const factors = await listTotpFactors(client)
  const verified = factors.filter((factor) => factor?.status === 'verified' && UUID.test(String(factor?.id || '')))
  if (verified.length === 0) throw new Error('MFA_REPLACEMENT_ACTIVE_FACTOR_REQUIRED')
  if (verified.length !== 1) throw new Error('MFA_REPLACEMENT_MULTIPLE_ACTIVE_FACTORS')
  return { previousFactorId: String(verified[0].id) }
}

export async function startActiveMfaReplacement(client, previousFactorId) {
  const factors = await listTotpFactors(client)
  const verified = factors.filter((factor) => factor?.status === 'verified' && UUID.test(String(factor?.id || '')))
  if (verified.length !== 1 || verified[0].id !== previousFactorId) {
    throw new Error(verified.length > 1 ? 'MFA_REPLACEMENT_MULTIPLE_ACTIVE_FACTORS' : 'MFA_REPLACEMENT_ACTIVE_FACTOR_REQUIRED')
  }
  const stale = factors.filter((factor) => factor?.status === 'unverified' && UUID.test(String(factor?.id || '')))
  if (stale.length > 5) throw new Error('MFA_REPLACEMENT_UNAVAILABLE')
  for (const factor of stale) {
    const { error } = await client.auth.mfa.unenroll({ factorId: factor.id })
    if (error) throw new Error('MFA_REPLACEMENT_UNAVAILABLE')
  }
  const { data, error } = await client.auth.mfa.enroll({
    factorType: 'totp', friendlyName: 'K2 Jimzon Admin replacement',
  })
  const factorId = String(data?.id || '')
  const qr = String(data?.totp?.qr_code || '')
  const secret = String(data?.totp?.secret || '')
  if (error || !UUID.test(factorId) || factorId === previousFactorId
      || qr.length > 32 * 1024 || !QR_DATA.test(qr) || !TOTP_SECRET.test(secret)) {
    if (UUID.test(factorId)) await client.auth.mfa.unenroll({ factorId }).catch(() => undefined)
    throw new Error('MFA_REPLACEMENT_UNAVAILABLE')
  }
  return { previousFactorId, factorId, qr, secret }
}

export async function completeActiveMfaReplacement(client, previousFactorId, factorId, code) {
  const factors = await listTotpFactors(client)
  const previous = factors.find((factor) => factor?.id === previousFactorId && factor?.status === 'verified')
  const replacement = factors.find((factor) => factor?.id === factorId)
  if (!replacement || !['unverified', 'verified'].includes(replacement.status)) {
    throw new Error('MFA_REPLACEMENT_FACTOR_INVALID')
  }
  if (!previous && replacement.status === 'verified') return { authSession: null, alreadyCompleted: true }
  if (!previous) throw new Error('MFA_REPLACEMENT_ACTIVE_FACTOR_REQUIRED')

  let authSession = null
  if (replacement.status === 'unverified') {
    const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge?.id) throw new Error('MFA_REPLACEMENT_VERIFICATION_FAILED')
    const { data: verified, error: verifyError } = await client.auth.mfa.verify({
      factorId, challengeId: challenge.id, code,
    })
    if (verifyError || !verified?.access_token || !verified?.refresh_token || !verified?.user) {
      throw new Error('MFA_REPLACEMENT_VERIFICATION_FAILED')
    }
    authSession = verified
  }

  const { error: retireError } = await client.auth.mfa.unenroll({ factorId: previousFactorId })
  if (retireError) throw new Error('MFA_REPLACEMENT_RETIRE_FAILED')
  return { authSession, alreadyCompleted: false }
}

export async function recordMfaReplacementEvent(client, identity, action, replacementId, payload) {
  const signed = signedAdminCommandArguments(action, identity.userId, replacementId, payload)
  const { data, error } = await client.rpc('record_admin_mfa_replacement_event_v1', signed)
  if (error || data?.recorded !== true) {
    const raw = String(error?.message || '')
    if (raw.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) throw new Error('MFA_REPLACEMENT_CONFLICT')
    if (raw.includes('K2_ADMIN_RATE_LIMITED')) throw new Error('MFA_REPLACEMENT_RATE_LIMITED')
    throw new Error('MFA_REPLACEMENT_AUDIT_UNAVAILABLE')
  }
  return data
}
