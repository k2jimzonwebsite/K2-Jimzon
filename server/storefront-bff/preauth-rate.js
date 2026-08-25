import { createHmac, randomUUID } from 'node:crypto'
import { requestIp } from './security.js'

const SUBJECT_DOMAINS = Object.freeze({
  customer_auth_email_request: 'customer-auth-email',
  customer_auth_sms_request: 'customer-auth-sms',
  customer_auth_sms_verify: 'customer-auth-sms-verify',
})

function requestSecret(env = process.env) {
  const secret = Buffer.from(env.K2_GUEST_BFF_SECRET || '', 'base64')
  if (secret.length < 32) throw new Error('CUSTOMER_AUTH_RATE_UNAVAILABLE')
  return secret
}

function subjectHash(secret, domain, value) {
  return createHmac('sha256', secret)
    .update(`storefront-preauth-rate\n${domain}\n${value}`, 'utf8')
    .digest('hex')
}

export function signedStorefrontPreauthRateArguments(req, action, subject, env = process.env) {
  const secret = requestSecret(env)
  const domain = SUBJECT_DOMAINS[action]
  const normalized = String(subject || '').trim().toLowerCase()
  if (!domain || !normalized || normalized.length > 254) {
    throw new Error('CUSTOMER_AUTH_RATE_UNAVAILABLE')
  }
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = randomUUID()
  const ipHash = subjectHash(secret, 'ip', requestIp(req))
  const contactHash = subjectHash(secret, domain, normalized)
  const message = [action, timestamp, nonce, ipHash, contactHash].join('\n')
  return {
    p_action: action,
    p_timestamp: timestamp,
    p_nonce: nonce,
    p_ip_hash: ipHash,
    p_subject_hash: contactHash,
    p_signature: createHmac('sha256', secret).update(message, 'utf8').digest('hex'),
  }
}

function validResult(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === 2
    && typeof value.allowed === 'boolean'
    && Number.isInteger(value.retryAfter)
    && value.retryAfter >= 0
    && value.retryAfter <= 86_400)
}

export async function consumeStorefrontPreauthRate(client, req, action, subject, env = process.env) {
  const args = signedStorefrontPreauthRateArguments(req, action, subject, env)
  const { data, error } = await client.rpc('consume_storefront_customer_auth_rate_v1', args)
  if (error || !validResult(data)) throw new Error('CUSTOMER_AUTH_RATE_UNAVAILABLE')
  return Object.freeze({ allowed: data.allowed, retryAfter: data.retryAfter })
}
