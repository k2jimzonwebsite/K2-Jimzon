import { createHash, createHmac, randomUUID } from 'node:crypto'
export { verifyBotChallenge } from '../bot-challenge.js'

const MAX_BODY_BYTES = 24 * 1024
const GUEST_COOKIE = 'k2_guest_access'

function configuredOrigins() {
  const configured = String(process.env.K2_STOREFRONT_ORIGINS || '')
    .split(',').map((value) => value.trim()).filter(Boolean)
  const local = process.env.NODE_ENV === 'production'
    ? []
    : ['http://127.0.0.1:5173', 'http://localhost:5173']
  return new Set([...configured, ...local])
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';')
    .map((part) => part.trim()).filter(Boolean).map((part) => {
      const index = part.indexOf('=')
      return index < 0 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))]
    }))
}

function bffKey() {
  const key = Buffer.from(process.env.K2_GUEST_BFF_SECRET || '', 'base64')
  if (key.length < 32) throw new Error('GUEST_BFF_SECRET_NOT_CONFIGURED')
  return key
}

function cookie(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' || process.env.K2_COOKIE_SECURE === 'true'
  const parts = [
    `${GUEST_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/api/storefront',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
    'HttpOnly',
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function requireStorefrontProject() {
  return process.env.NODE_ENV !== 'production' || process.env.K2_DEPLOYMENT_TARGET === 'storefront'
}

export function requireAllowedOrigin(req) {
  const origin = String(req.headers.origin || '')
  return Boolean(origin && configuredOrigins().has(origin))
}

export function requestIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim().slice(0, 128)
}

export function authorizationBearer(req) {
  const header = String(req.headers.authorization || '')
  const match = /^Bearer ([A-Za-z0-9._~-]{20,4096})$/.exec(header)
  return match ? match[1] : null
}

export async function readJson(req) {
  const declared = Number(req.headers['content-length'] || 0)
  if (!Number.isFinite(declared) || declared > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE')
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    throw new Error('JSON_REQUIRED')
  }
  if (req.body && typeof req.body === 'object') {
    if (Buffer.byteLength(JSON.stringify(req.body), 'utf8') > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE')
    return req.body
  }
  const raw = typeof req.body === 'string' ? req.body : ''
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE')
  try { return JSON.parse(raw) } catch { throw new Error('INVALID_JSON') }
}

export function safeJson(res, status, body, extraHeaders = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  for (const [name, value] of Object.entries(extraHeaders)) res.setHeader(name, value)
  res.end(JSON.stringify(body))
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function signedRpcArguments(req, action, payload) {
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = randomUUID()
  const payloadText = stableStringify(payload)
  const ipHash = createHmac('sha256', bffKey()).update(requestIp(req)).digest('hex')
  const payloadHash = createHash('sha256').update(payloadText).digest('hex')
  const message = `${action}\n${timestamp}\n${nonce}\n${payloadHash}\n${ipHash}`
  const signature = createHmac('sha256', bffKey()).update(message).digest('hex')
  const guestToken = parseCookies(req)[GUEST_COOKIE] || ''
  const guestGrantHash = /^[0-9a-f]{64}$/.test(guestToken)
    ? createHash('sha256').update(guestToken).digest('hex')
    : null
  const guestGrantActions = new Set([
    'order', 'pasabuy', 'conversation', 'wholesale_inquiry', 'guest_read', 'guest_reply', 'account_claim',
  ])
  return {
    p_timestamp: timestamp,
    p_nonce: nonce,
    p_payload_text: payloadText,
    p_ip_hash: ipHash,
    p_signature: signature,
    ...(guestGrantActions.has(action) ? { p_guest_grant_hash: guestGrantHash } : {}),
  }
}

export function setGuestGrantCookie(res, token) {
  if (/^[0-9a-f]{64}$/.test(String(token || ''))) {
    res.setHeader('Set-Cookie', cookie(token, 30 * 24 * 60 * 60))
  }
}

export function text(value, name, { required = false, min = 0, max = 500 } = {}) {
  const result = typeof value === 'string' ? value.trim() : ''
  if (required && result.length < Math.max(1, min)) throw new Error(`${name}_INVALID`)
  if (result.length > max || (result && result.length < min)) throw new Error(`${name}_INVALID`)
  return result
}

export function contact(emailValue, phoneValue) {
  const email = text(emailValue, 'EMAIL', { max: 320 }).toLowerCase()
  const phone = text(phoneValue, 'PHONE', { max: 40 }).replace(/[^0-9+]/g, '')
  if (!email && !phone) throw new Error('CONTACT_REQUIRED')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('EMAIL_INVALID')
  if (phone && phone.replace(/\D/g, '').length < 7) throw new Error('PHONE_INVALID')
  return { email, phone }
}

export function idempotencyKey(value) {
  const result = text(value, 'IDEMPOTENCY_KEY', { required: true, min: 36, max: 64 })
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new Error('IDEMPOTENCY_KEY_INVALID')
  }
  return result.toLowerCase()
}

export function publicFailure(error) {
  const code = String(error?.message || '')
  if (code === 'BODY_TOO_LARGE') return [413, 'REQUEST_TOO_LARGE']
  if (code === 'JSON_REQUIRED' || code === 'INVALID_JSON') return [400, 'INVALID_REQUEST']
  if (code.endsWith('_INVALID') || code === 'CONTACT_REQUIRED') return [400, code]
  return [503, 'SERVICE_UNAVAILABLE']
}
