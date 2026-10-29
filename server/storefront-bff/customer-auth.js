import {
  publicFailure, readJson, requestHostname, requestIp, requireAllowedOrigin, requireStorefrontProject, safeJson,
  verifyBotChallenge,
} from './security.js'
import { createStorefrontServerSupabase } from './supabase.js'
import { consumeStorefrontPreauthRate } from './preauth-rate.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+[1-9]\d{7,14}$/
const CODE = /^\d{6}$/

function normalizeCustomerPhone(value) {
  const phone = String(value || '').replace(/[\s()-]/g, '')
  if (!PHONE.test(phone)) throw new Error('CUSTOMER_AUTH_REQUEST_INVALID')
  return phone
}

function exactKeys(value, keys) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key)))
}

export function validateCustomerEmailAuth(body) {
  if (!exactKeys(body, ['email', 'botToken'])) throw new Error('CUSTOMER_AUTH_REQUEST_INVALID')
  const email = String(body.email || '').trim().toLowerCase()
  const botToken = String(body.botToken || '')
  if (email.length > 254 || !EMAIL.test(email) || botToken.length < 10 || botToken.length > 2048) {
    throw new Error('CUSTOMER_AUTH_REQUEST_INVALID')
  }
  return { email, botToken }
}

export function validateCustomerPhoneAuth(body) {
  if (!exactKeys(body, ['phone', 'botToken'])) throw new Error('CUSTOMER_AUTH_REQUEST_INVALID')
  const phone = normalizeCustomerPhone(body.phone)
  const botToken = String(body.botToken || '')
  if (botToken.length < 10 || botToken.length > 2048) {
    throw new Error('CUSTOMER_AUTH_REQUEST_INVALID')
  }
  return { phone, botToken }
}

export function validateCustomerPhoneVerification(body) {
  if (!exactKeys(body, ['phone', 'code'])) throw new Error('CUSTOMER_AUTH_REQUEST_INVALID')
  const phone = normalizeCustomerPhone(body.phone)
  const code = String(body.code || '')
  if (!CODE.test(code)) throw new Error('CUSTOMER_AUTH_REQUEST_INVALID')
  return { phone, code }
}

export function validateCustomerEmailVerification(body) {
  if (!exactKeys(body, ['tokenHash']) || !/^[a-zA-Z0-9_-]{40,256}$/.test(body.tokenHash)) throw new Error('CUSTOMER_AUTH_REQUEST_INVALID')
  return { tokenHash: body.tokenHash }
}

function handlerFactory({ action, validate, execute, bot = false }, overrides = {}) {
  const createClient = overrides.createStorefrontServerSupabase || createStorefrontServerSupabase
  const consumeRate = overrides.consumeStorefrontPreauthRate || consumeStorefrontPreauthRate
  const verifyBot = overrides.verifyBotChallenge || verifyBotChallenge
  return async function handler(req, res) {
    if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
    if (req.method !== 'POST') {
      return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
    }
    if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
    try {
      const payload = validate(await readJson(req))
      const client = createClient()
      const subject = payload.email || payload.phone || payload.tokenHash
      const actionName = typeof action === 'function' ? action(payload) : action
      const attempt = await consumeRate(client, req, actionName, subject)
      if (!attempt.allowed) {
        return safeJson(res, 429, {
          error: { code: 'RATE_LIMITED', retryAfter: attempt.retryAfter },
        }, { 'Retry-After': String(attempt.retryAfter) })
      }
      if (bot && !await verifyBot(payload.botToken, requestIp(req), 'customer_auth', { hostname: requestHostname(req) })) {
        return safeJson(res, 403, { error: { code: 'BOT_CHALLENGE_REQUIRED' } })
      }
      return execute({ client, payload, req, res })
    } catch (error) {
      const [status, code] = publicFailure(error)
      return safeJson(res, status, { error: { code } })
    }
  }
}

export function createCustomerEmailAuthHandler(overrides = {}) {
  return handlerFactory({
    action: 'customer_auth_email_request',
    bot: true,
    validate: validateCustomerEmailAuth,
    execute: async ({ client, payload, req, res }) => {
      const emailRedirectTo = new URL('/?account=continue', req.headers.origin).toString()
      const { error } = await client.auth.signInWithOtp({
        email: payload.email, options: { emailRedirectTo, shouldCreateUser: true },
      })
      if (error) return safeJson(res, 503, { error: { code: 'CUSTOMER_AUTH_UNAVAILABLE' } })
      return safeJson(res, 202, { ok: true })
    },
  }, overrides)
}

export function createCustomerPhoneAuthHandler(overrides = {}) {
  return handlerFactory({
    action: 'customer_auth_sms_request',
    bot: true,
    validate: validateCustomerPhoneAuth,
    execute: async ({ client, payload, res }) => {
      const { error } = await client.auth.signInWithOtp({
        phone: payload.phone, options: { shouldCreateUser: true },
      })
      if (error) return safeJson(res, 503, { error: { code: 'CUSTOMER_AUTH_UNAVAILABLE' } })
      return safeJson(res, 202, { ok: true })
    },
  }, overrides)
}

export function createCustomerPhoneVerifyHandler(overrides = {}) {
  return handlerFactory({
    // Email confirmation shares the existing signed email budget. Both email
    // steps consume its IP limit; the high-entropy hash is HMACed as subject.
    action: payload => payload.tokenHash ? 'customer_auth_email_request' : 'customer_auth_sms_verify',
    validate: body => Object.hasOwn(body || {}, 'tokenHash') ? validateCustomerEmailVerification(body) : validateCustomerPhoneVerification(body),
    execute: async ({ client, payload, res }) => {
      const { data, error } = await client.auth.verifyOtp(payload.tokenHash ? {
        token_hash: payload.tokenHash, type: 'email',
      } : {
        phone: payload.phone, token: payload.code, type: 'sms',
      })
      const accessToken = data?.session?.access_token
      const refreshToken = data?.session?.refresh_token
      if (error || typeof accessToken !== 'string' || accessToken.length < 16
          || typeof refreshToken !== 'string' || refreshToken.length < 12) {
        return safeJson(res, 401, { error: { code: 'CUSTOMER_AUTH_CODE_INVALID' } })
      }
      return safeJson(res, 200, { ok: true, session: { accessToken, refreshToken } })
    },
  }, overrides)
}
