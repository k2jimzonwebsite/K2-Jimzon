import { expect, test } from '@playwright/test'
import { logoutAdminBff, completeAdminPasswordRecoveryBff } from '../src/services/adminBffService.js'

for (const [cookie, command, header] of [
  ['k2_admin_csrf=%', () => logoutAdminBff(), 'X-K2-CSRF'],
  ['k2_admin_recovery_csrf=%E0%A4%A', () => completeAdminPasswordRecoveryBff('fixture-only'), 'X-K2-Recovery-CSRF'],
]) {
  test(`invalid client cookie receives safe server denial: ${header}`, async () => {
    const originalFetch = globalThis.fetch
    const originalDocument = globalThis.document
    globalThis.document = { cookie }
    let sentToken
    globalThis.fetch = async (_input, init) => {
      sentToken = init.headers[header]
      return new Response(JSON.stringify({ error: { code: 'CSRF_INVALID' } }), { status: 403 })
    }
    try {
      const result = await command()
      expect(result.ok).toBe(false)
      expect(result.code).toBe('CSRF_INVALID')
      expect(sentToken).toBe('')
    } finally {
      globalThis.fetch = originalFetch
      if (originalDocument === undefined) delete globalThis.document
      else globalThis.document = originalDocument
    }
  })
}

test('valid encoded CSRF cookie survives irregular cookie spacing', async () => {
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  globalThis.document = { cookie: 'other=one;k2_admin_csrf=valid%2Btoken; another=two' }
  let sentToken
  globalThis.fetch = async (_input, init) => {
    sentToken = init.headers['X-K2-CSRF']
    return new Response('{"ok":true}')
  }
  try {
    expect((await logoutAdminBff()).ok).toBe(true)
    expect(sentToken).toBe('valid+token')
  } finally {
    globalThis.fetch = originalFetch
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
  }
})
