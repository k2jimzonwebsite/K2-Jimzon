const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const QR_DATA = /^data:image\/svg\+xml(?:;charset=utf-8)?(?:;base64)?,/i
const TOTP_SECRET = /^[A-Z2-7]{16,128}$/

export function validatePendingMfaCommand(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('MFA_REQUEST_INVALID')
  const keys = Object.keys(body)
  if (keys.length === 1 && keys[0] === 'code' && /^\d{6}$/.test(String(body.code || ''))) {
    return { action: 'challenge', code: String(body.code) }
  }
  if (keys.length === 1 && body.action === 'enroll_start') return { action: 'enroll_start' }
  if (keys.length === 3 && body.action === 'enroll_verify'
      && ['action', 'factorId', 'code'].every((key) => Object.hasOwn(body, key))
      && UUID.test(String(body.factorId || '')) && /^\d{6}$/.test(String(body.code || ''))) {
    return { action: 'enroll_verify', factorId: String(body.factorId), code: String(body.code) }
  }
  throw new Error('MFA_REQUEST_INVALID')
}

export async function startPendingMfaEnrollment(client) {
  const { data: factors, error: factorsError } = await client.auth.mfa.listFactors()
  if (factorsError) throw new Error('MFA_ENROLLMENT_UNAVAILABLE')
  const totp = Array.isArray(factors?.totp) ? factors.totp : []
  if (totp.some((factor) => factor?.status === 'verified')) throw new Error('MFA_ALREADY_ENROLLED')
  const stale = totp.filter((factor) => factor?.status === 'unverified' && UUID.test(String(factor?.id || '')))
  if (stale.length > 5) throw new Error('MFA_ENROLLMENT_UNAVAILABLE')
  for (const factor of stale) {
    const { error } = await client.auth.mfa.unenroll({ factorId: factor.id })
    if (error) throw new Error('MFA_ENROLLMENT_UNAVAILABLE')
  }

  const { data, error } = await client.auth.mfa.enroll({
    factorType: 'totp', friendlyName: 'K2 Jimzon Admin',
  })
  const factorId = String(data?.id || '')
  const qr = String(data?.totp?.qr_code || '')
  const secret = String(data?.totp?.secret || '')
  if (error || !UUID.test(factorId) || qr.length > 32 * 1024 || !QR_DATA.test(qr)
      || !TOTP_SECRET.test(secret)) {
    if (UUID.test(factorId)) await client.auth.mfa.unenroll({ factorId }).catch(() => undefined)
    throw new Error('MFA_ENROLLMENT_UNAVAILABLE')
  }
  return { factorId, qr, secret }
}

export async function verifyPendingMfaEnrollment(client, factorId, code) {
  const { data: factors, error: factorsError } = await client.auth.mfa.listFactors()
  const factor = factors?.totp?.find((item) => item?.id === factorId && item?.status === 'unverified')
  if (factorsError || !factor) throw new Error('MFA_ENROLLMENT_INVALID')
  const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId })
  if (challengeError || !challenge?.id) throw new Error('MFA_ENROLLMENT_VERIFICATION_FAILED')
  const { data: verified, error: verifyError } = await client.auth.mfa.verify({
    factorId, challengeId: challenge.id, code,
  })
  if (verifyError || !verified?.access_token || !verified?.refresh_token || !verified?.user) {
    throw new Error('MFA_ENROLLMENT_VERIFICATION_FAILED')
  }
  return verified
}
