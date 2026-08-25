const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TOKEN_HASH = /^[0-9a-f]{64}$/i
const ADMIN_ROUTE = '/admin-portal-k2-secure'

function exactKeys(value, keys) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every(key => Object.hasOwn(value, key)))
}

export function validatePasswordRecoveryRequest(body) {
  if (!exactKeys(body, ['email', 'botToken'])) throw new Error('PASSWORD_RECOVERY_REQUEST_INVALID')
  const email = String(body.email || '').trim().toLowerCase()
  const botToken = String(body.botToken || '')
  if (email.length > 254 || !EMAIL.test(email) || botToken.length < 10 || botToken.length > 2048) {
    throw new Error('PASSWORD_RECOVERY_REQUEST_INVALID')
  }
  return { email, botToken }
}

export function validatePasswordRecoveryCallback(query) {
  const value = { tokenHash: String(query?.token_hash || ''), type: String(query?.type || '') }
  if (!exactKeys(query, ['token_hash', 'type']) || !TOKEN_HASH.test(value.tokenHash)
      || value.type !== 'recovery') throw new Error('PASSWORD_RECOVERY_LINK_INVALID')
  return value
}

export function validatePasswordRecoveryCompletion(body) {
  if (!exactKeys(body, ['password', 'confirmation'])) throw new Error('PASSWORD_RECOVERY_PASSWORD_INVALID')
  const password = String(body.password || '')
  if (password !== String(body.confirmation || '') || password.length < 12 || password.length > 128
      || /^\s|\s$/.test(password)) throw new Error('PASSWORD_RECOVERY_PASSWORD_INVALID')
  return { password }
}

export function passwordRecoveryCallbackUrl(env = process.env) {
  const raw = String(env.K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL || '')
  let callback
  try { callback = new URL(raw) } catch { throw new Error('PASSWORD_RECOVERY_CONFIG_INVALID') }
  const production = env.NODE_ENV === 'production'
  const localHttp = !production && callback.protocol === 'http:'
    && ['localhost', '127.0.0.1'].includes(callback.hostname)
  const allowedOrigins = new Set(String(env.K2_ADMIN_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean))
  if ((callback.protocol !== 'https:' && !localHttp) || callback.username || callback.password
      || callback.search || callback.hash
      || callback.pathname !== '/api/admin/auth/password-recovery/verify'
      || !allowedOrigins.has(callback.origin)) throw new Error('PASSWORD_RECOVERY_CONFIG_INVALID')
  return callback
}

export function isPasswordRecoveryConfigured(env = process.env) {
  if (env.K2_ADMIN_PASSWORD_RECOVERY_ENABLED !== 'true') return false
  try { passwordRecoveryCallbackUrl(env); return true } catch { return false }
}

export function passwordRecoveryResultUrl(status, env = process.env) {
  if (!['ready', 'invalid'].includes(status)) throw new Error('PASSWORD_RECOVERY_CONFIG_INVALID')
  const callback = passwordRecoveryCallbackUrl(env)
  return new URL(`${ADMIN_ROUTE}?recovery=${status}`, callback.origin).toString()
}
