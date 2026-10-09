import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  clearAdminBrowserSession, getOrStartAdminBrowserSession, resetAdminBrowserSession,
} from '../src/lib/adminSessionLifetime.js'
import {
  prepareActiveSession, readActiveSession, setPreparedActiveSessionCookies,
} from '../server/admin-bff/security.js'
import { validateAdminSessionCommand } from '../server/admin-bff/sessions.js'

const DAY = 24 * 60 * 60 * 1000
const USER_ID = 'e74a4161-72ca-4d72-8f59-37aa690e1869'
const SESSION_ID = '6a88b5f9-8be6-4f4d-a504-173c96f40df1'

function storage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

test('same-browser staff session survives idle time and expires seven days after sign-in', () => {
  const browser = storage()
  const started = resetAdminBrowserSession(browser, USER_ID, 1_000_000)
  expect(started.expiresAt).toBe(1_000_000 + 7 * DAY)
  expect(getOrStartAdminBrowserSession(browser, USER_ID, 1_000_000 + 6 * DAY)).toEqual(started)
  expect(getOrStartAdminBrowserSession(browser, USER_ID, 1_000_000 + 7 * DAY)).toEqual({ expired: true })
  clearAdminBrowserSession(browser)
  expect(getOrStartAdminBrowserSession(browser, USER_ID, 1_000_000 + 7 * DAY)).toEqual({
    expired: false, expiresAt: 1_000_000 + 14 * DAY,
  })
})

test('another staff identity cannot inherit the previous browser clock', () => {
  const browser = storage()
  resetAdminBrowserSession(browser, USER_ID, 1_000_000)
  expect(getOrStartAdminBrowserSession(browser, SESSION_ID, 2_000_000)).toEqual({
    expired: false, expiresAt: 2_000_000 + 7 * DAY,
  })
})

test('prepared server cookie and signed registry command use seven days without idle expiry', async () => {
  const previousNow = Date.now
  const previousKey = process.env.K2_SESSION_COOKIE_KEY
  const now = 2_000_000_000_000
  process.env.K2_SESSION_COOKIE_KEY = Buffer.alloc(32, 8).toString('base64')
  try {
    Date.now = () => now
    const prepared = prepareActiveSession({
      access_token: 'a'.repeat(32), refresh_token: 'r'.repeat(32),
      expires_at: Math.ceil((now + 60 * 60 * 1000) / 1000),
    }, { userId: USER_ID, role: 'Staff' })
    expect(prepared.session.expiresHardAt).toBe(now + 7 * DAY)
    expect(validateAdminSessionCommand('admin_session_register', {
      sessionId: SESSION_ID, createdAt: now, expiresAt: now + 7 * DAY,
    })).toBeTruthy()
    const headers = {}
    setPreparedActiveSessionCookies({ setHeader: (name, value) => { headers[name] = value } }, prepared)
    const cookie = headers['Set-Cookie'].map((value) => value.split(';')[0]).join('; ')
    Date.now = () => now + 6 * DAY
    expect(readActiveSession({ headers: { cookie } })?.sessionId).toBe(prepared.session.sessionId)
    Date.now = () => now + 7 * DAY
    expect(readActiveSession({ headers: { cookie } })).toBeNull()
  } finally {
    Date.now = previousNow
    if (previousKey === undefined) delete process.env.K2_SESSION_COOKIE_KEY
    else process.env.K2_SESSION_COOKIE_KEY = previousKey
  }
  const migration = await readFile(new URL('../supabase/migrations/20260822_admin_session_registry.sql', import.meta.url), 'utf8')
  expect(migration).toContain("v_expires_at <> v_created_at + interval '7 days'")
})
