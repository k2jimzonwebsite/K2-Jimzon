import { expect, test } from '@playwright/test'
import { readActiveSession, readPendingSession, readRecoverySession, verifyCsrf } from '../server/admin-bff/security.js'

for (const cookie of ['unrelated=%', 'k2_admin_session=%', 'k2_admin_session=%E0%A4%A']) {
  test(`malformed cookie is safely unauthenticated: ${cookie}`, () => {
    const req = { headers: { cookie } }
    expect(readActiveSession(req)).toBeNull()
    expect(readPendingSession(req)).toBeNull()
    expect(readRecoverySession(req)).toBeNull()
  })
}

test('malformed unrelated cookie does not interrupt CSRF denial', () => {
  expect(verifyCsrf({ headers: { cookie: 'unrelated=%' } }, null)).toBe(false)
})
