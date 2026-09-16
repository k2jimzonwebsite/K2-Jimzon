import { test, expect } from '@playwright/test'
import { verifyBotChallenge } from '../server/bot-challenge.js'

// MAP-020 F-020-001: bot tokens must be hostname-bound, single-use, and fail
// closed when no secret is configured. siteverify is stubbed; no network runs.
const realFetch = globalThis.fetch

function stubSiteverify(result) {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push(String(url))
    return { ok: true, json: async () => result }
  }
  return calls
}

test.afterEach(() => { globalThis.fetch = realFetch })

test('a missing secret fails closed without calling the provider', async () => {
  const priorSecret = process.env.K2_TURNSTILE_SECRET_KEY
  const priorBypass = process.env.K2_TURNSTILE_ALLOW_UNCONFIGURED
  delete process.env.K2_TURNSTILE_SECRET_KEY
  delete process.env.K2_TURNSTILE_ALLOW_UNCONFIGURED
  try {
    const calls = stubSiteverify({ success: true })
    expect(await verifyBotChallenge('synthetic-token', '127.0.0.1', 'guest_order')).toBe(false)
    expect(calls).toHaveLength(0)
  } finally {
    if (priorSecret === undefined) delete process.env.K2_TURNSTILE_SECRET_KEY
    else process.env.K2_TURNSTILE_SECRET_KEY = priorSecret
    if (priorBypass === undefined) delete process.env.K2_TURNSTILE_ALLOW_UNCONFIGURED
    else process.env.K2_TURNSTILE_ALLOW_UNCONFIGURED = priorBypass
  }
})

test('an explicit unconfigured bypass is opt-in and auditable', async () => {
  const priorSecret = process.env.K2_TURNSTILE_SECRET_KEY
  const priorBypass = process.env.K2_TURNSTILE_ALLOW_UNCONFIGURED
  delete process.env.K2_TURNSTILE_SECRET_KEY
  process.env.K2_TURNSTILE_ALLOW_UNCONFIGURED = 'true'
  try {
    expect(await verifyBotChallenge('synthetic-token', '127.0.0.1', 'guest_order')).toBe(true)
  } finally {
    if (priorSecret === undefined) delete process.env.K2_TURNSTILE_SECRET_KEY
    else process.env.K2_TURNSTILE_SECRET_KEY = priorSecret
    if (priorBypass === undefined) delete process.env.K2_TURNSTILE_ALLOW_UNCONFIGURED
    else process.env.K2_TURNSTILE_ALLOW_UNCONFIGURED = priorBypass
  }
})

test('a token is single-use: its replay is rejected', async () => {
  const prior = process.env.K2_TURNSTILE_SECRET_KEY
  process.env.K2_TURNSTILE_SECRET_KEY = 'fixture-secret'
  try {
    stubSiteverify({ success: true, action: 'guest_order', hostname: 'shop.test' })
    expect(await verifyBotChallenge('one-time-token', '127.0.0.1', 'guest_order', { hostname: 'shop.test' })).toBe(true)
    expect(await verifyBotChallenge('one-time-token', '127.0.0.1', 'guest_order', { hostname: 'shop.test' })).toBe(false)
  } finally {
    if (prior === undefined) delete process.env.K2_TURNSTILE_SECRET_KEY
    else process.env.K2_TURNSTILE_SECRET_KEY = prior
  }
})

test('a token minted for another host is rejected', async () => {
  const prior = process.env.K2_TURNSTILE_SECRET_KEY
  process.env.K2_TURNSTILE_SECRET_KEY = 'fixture-secret'
  try {
    stubSiteverify({ success: true, action: 'guest_order', hostname: 'evil.test' })
    expect(await verifyBotChallenge('foreign-token', '127.0.0.1', 'guest_order', { hostname: 'shop.test' })).toBe(false)
  } finally {
    if (prior === undefined) delete process.env.K2_TURNSTILE_SECRET_KEY
    else process.env.K2_TURNSTILE_SECRET_KEY = prior
  }
})

test('every server call site binds its validated request hostname', async () => {
  const { readFile } = await import('node:fs/promises')
  for (const file of [
    '../prepared-api/storefront/order.js',
    '../prepared-api/storefront/pasabuy.js',
    '../prepared-api/storefront/conversation.js',
    '../prepared-api/storefront/wholesale.js',
    '../server/storefront-bff/customer-auth.js',
    '../prepared-api/admin/auth/login.js',
  ]) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8')
    expect(source, file).toContain('requestHostname(req)')
  }
})
