import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'

const SESSION_COOKIE = 'k2_admin_session'
const PENDING_COOKIE = 'k2_admin_pending'
const CSRF_COOKIE = 'k2_admin_csrf'
const MAX_BODY_BYTES = 16 * 1024
const MAX_SESSION_MS = 8 * 60 * 60 * 1000
const IDLE_SESSION_MS = 30 * 60 * 1000
const loginAttempts = new Map()

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

function sessionKey() {
  const encoded = process.env.K2_SESSION_COOKIE_KEY || ''
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== 32) throw new Error('SESSION_KEY_NOT_CONFIGURED')
  return key
}

function encrypt(value) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', sessionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${base64url(iv)}.${base64url(tag)}.${base64url(ciphertext)}`
}

function decrypt(value) {
  try {
    const [ivValue, tagValue, ciphertextValue] = String(value || '').split('.')
    if (!ivValue || !tagValue || !ciphertextValue) return null
    const decipher = createDecipheriv('aes-256-gcm', sessionKey(), Buffer.from(ivValue, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
    return JSON.parse(plaintext)
  } catch {
    return null
  }
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=')
        return index < 0 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))]
      })
  )
}

function cookie(name, value, options = {}) {
  const secure = process.env.NODE_ENV === 'production' || process.env.K2_COOKIE_SECURE === 'true'
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path || '/'}`,
    `SameSite=${options.sameSite || 'Strict'}`,
    `Max-Age=${options.maxAge ?? 0}`,
  ]
  if (options.httpOnly !== false) parts.push('HttpOnly')
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function requireAdminProject(req) {
  const target = process.env.K2_DEPLOYMENT_TARGET
  if (process.env.NODE_ENV === 'production' && target !== 'admin') return false
  return true
}

export function requireAllowedOrigin(req) {
  let origin = req.headers.origin
  if (!origin && req.headers.referer) {
    try { origin = new URL(req.headers.referer).origin } catch { origin = '' }
  }
  const configured = String(process.env.K2_ADMIN_ORIGINS || '')
    .split(',').map((item) => item.trim()).filter(Boolean)
  const local = process.env.NODE_ENV === 'production'
    ? []
    : ['http://127.0.0.1:5174', 'http://localhost:5174']
  const allowed = new Set([...configured, ...local])
  return Boolean(origin && allowed.has(origin))
}

export function requestIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim().slice(0, 128)
}

export function consumeLoginAttempt(key) {
  const now = Date.now()
  if (loginAttempts.size > 5000) {
    for (const [storedKey, value] of loginAttempts) {
      if (value.resetAt <= now) loginAttempts.delete(storedKey)
    }
    if (loginAttempts.size > 5000) loginAttempts.clear()
  }
  const current = loginAttempts.get(key)
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return { allowed: true, retryAfter: 0 }
  }
  current.count += 1
  if (current.count > 5) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) }
  }
  return { allowed: true, retryAfter: 0 }
}

export async function readJson(req) {
  const declared = Number(req.headers['content-length'] || 0)
  if (declared > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE')
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

export function newCsrfToken() {
  return randomBytes(32).toString('base64url')
}

export function hashToken(value) {
  return createHash('sha256').update(String(value)).digest('base64url')
}

export function signedAdminCommandArguments(action, actorId, idempotencyKey, payload) {
  const secret = Buffer.from(process.env.K2_ADMIN_BFF_REQUEST_SECRET || '', 'base64')
  if (secret.length !== 32) throw new Error('ADMIN_REQUEST_SECRET_NOT_CONFIGURED')
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = randomUUID()
  const payloadText = JSON.stringify(payload)
  const payloadHash = createHash('sha256').update(payloadText, 'utf8').digest('hex')
  const message = [action, timestamp, nonce, actorId, idempotencyKey, payloadHash].join('\n')
  const signature = createHmac('sha256', secret).update(message, 'utf8').digest('hex')
  return {
    p_action: action,
    p_timestamp: timestamp,
    p_nonce: nonce,
    p_idempotency_key: idempotencyKey,
    p_payload_text: payloadText,
    p_signature: signature,
  }
}

export function verifyCsrf(req, session) {
  const cookies = parseCookies(req)
  const cookieToken = cookies[CSRF_COOKIE] || ''
  const headerToken = String(req.headers['x-k2-csrf'] || '')
  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) return false
  const equal = timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  return equal && hashToken(cookieToken) === session.csrfHash
}

export function setPendingCookie(res, authSession) {
  const now = Date.now()
  const pending = encrypt({
    accessToken: authSession.access_token,
    refreshToken: authSession.refresh_token,
    expiresAt: authSession.expires_at * 1000,
    createdAt: now,
    expiresHardAt: now + 10 * 60 * 1000,
  })
  res.setHeader('Set-Cookie', cookie(PENDING_COOKIE, pending, { path: '/api/admin/auth', maxAge: 600 }))
}

export function readPendingSession(req) {
  const pending = decrypt(parseCookies(req)[PENDING_COOKIE])
  if (!pending || pending.expiresHardAt <= Date.now()) return null
  return pending
}

export function setActiveSessionCookies(res, authSession, identity = {}) {
  const now = Date.now()
  const csrf = newCsrfToken()
  const active = encrypt({
    accessToken: authSession.access_token,
    refreshToken: authSession.refresh_token,
    expiresAt: authSession.expires_at * 1000,
    userId: identity.userId,
    role: identity.role,
    aal: 'aal2',
    csrfHash: hashToken(csrf),
    createdAt: identity.createdAt || now,
    lastSeenAt: now,
    expiresHardAt: (identity.createdAt || now) + MAX_SESSION_MS,
  })
  res.setHeader('Set-Cookie', [
    cookie(SESSION_COOKIE, active, { path: '/api/admin', maxAge: MAX_SESSION_MS / 1000 }),
    cookie(CSRF_COOKIE, csrf, { path: '/', maxAge: MAX_SESSION_MS / 1000, httpOnly: false }),
    cookie(PENDING_COOKIE, '', { path: '/api/admin/auth', maxAge: 0 }),
  ])
}

export function refreshActiveSessionCookie(res, authSession, session) {
  const now = Date.now()
  const remainingSeconds = Math.max(0, Math.ceil((session.expiresHardAt - now) / 1000))
  const active = encrypt({
    accessToken: authSession.access_token,
    refreshToken: authSession.refresh_token,
    expiresAt: authSession.expires_at * 1000,
    userId: session.userId,
    role: session.role,
    aal: 'aal2',
    csrfHash: session.csrfHash,
    createdAt: session.createdAt,
    lastSeenAt: now,
    expiresHardAt: session.expiresHardAt,
  })
  res.setHeader('Set-Cookie', cookie(SESSION_COOKIE, active, {
    path: '/api/admin', maxAge: remainingSeconds,
  }))
}

export function readActiveSession(req) {
  const session = decrypt(parseCookies(req)[SESSION_COOKIE])
  const now = Date.now()
  if (!session || session.aal !== 'aal2' || session.expiresHardAt <= now
      || session.lastSeenAt + IDLE_SESSION_MS <= now) return null
  return session
}

export function clearSessionCookies(res) {
  res.setHeader('Set-Cookie', [
    cookie(SESSION_COOKIE, '', { path: '/api/admin', maxAge: 0 }),
    cookie(PENDING_COOKIE, '', { path: '/api/admin/auth', maxAge: 0 }),
    cookie(CSRF_COOKIE, '', { path: '/', maxAge: 0, httpOnly: false }),
  ])
}
