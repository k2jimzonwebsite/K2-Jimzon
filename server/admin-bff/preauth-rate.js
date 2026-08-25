import { createHmac, randomUUID } from 'node:crypto'
import { requestIp } from './security.js'

const ACTION_SUBJECT_DOMAINS = Object.freeze({
  admin_login: 'login-contact',
  admin_mfa: 'mfa-pending-session',
  password_recovery: 'recovery-contact',
  password_recovery_verify: 'recovery-token',
  password_recovery_complete: 'recovery-session',
})

function requestSecret(env = process.env) {
  const secret = Buffer.from(env.K2_ADMIN_BFF_REQUEST_SECRET || '', 'base64')
  if (secret.length !== 32) throw new Error('ADMIN_PREAUTH_RATE_UNAVAILABLE')
  return secret
}

function subjectHash(secret, scope, value) {
  return createHmac('sha256', secret)
    .update(`admin-preauth-rate\n${scope}\n${value}`, 'utf8')
    .digest('hex')
}

export function signedAdminPreauthRateArguments(req, action, subject, env = process.env) {
  const secret = requestSecret(env)
  const subjectDomain = ACTION_SUBJECT_DOMAINS[action]
  const normalizedSubject = String(subject || '').trim().toLowerCase()
  if (!subjectDomain || !normalizedSubject || normalizedSubject.length > 254) {
    throw new Error('ADMIN_PREAUTH_RATE_UNAVAILABLE')
  }
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = randomUUID()
  const ipHash = subjectHash(secret, 'ip', requestIp(req))
  const contactHash = subjectHash(secret, subjectDomain, normalizedSubject)
  const message = [action, timestamp, nonce, ipHash, contactHash].join('\n')
  return {
    p_action: action,
    p_timestamp: timestamp,
    p_nonce: nonce,
    p_ip_hash: ipHash,
    p_contact_hash: contactHash,
    p_signature: createHmac('sha256', secret).update(message, 'utf8').digest('hex'),
  }
}

function validResult(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === 2
    && Object.hasOwn(value, 'allowed')
    && Object.hasOwn(value, 'retryAfter')
    && typeof value.allowed === 'boolean'
    && Number.isInteger(value.retryAfter)
    && value.retryAfter >= 0
    && value.retryAfter <= 86_400)
}

export async function consumeAdminPreauthRate(client, req, action, subject, env = process.env) {
  const args = signedAdminPreauthRateArguments(req, action, subject, env)
  const { data, error } = await client.rpc('consume_admin_preauth_rate_v1', args)
  if (error || !validResult(data)) throw new Error('ADMIN_PREAUTH_RATE_UNAVAILABLE')
  return Object.freeze({ allowed: data.allowed, retryAfter: data.retryAfter })
}
