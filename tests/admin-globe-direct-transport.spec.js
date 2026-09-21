import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('Globe Admin direct transport reads and writes through authenticated RPCs', async () => {
  const { createAdminGlobeCmsTransport } = await import('../src/services/adminGlobeCmsService.js')
  expect(typeof createAdminGlobeCmsTransport).toBe('function')

  const calls = []
  const client = { rpc: async (name, args) => {
    calls.push({ name, args })
    return { data: name === 'read_admin_globe_cms_v1' ? { globeProducts: [], reviews: [] } : { productId: 'rio-mare', enabled: false }, error: null }
  } }
  const transport = createAdminGlobeCmsTransport({ client, bffEnabled: false })
  expect(await transport.read()).toEqual({ ok: true, cms: { globeProducts: [], reviews: [] } })
  expect(await transport.command('globe_config_update', { productId: 'rio-mare', enabled: false, reason: 'Hide pending photo review' }, '11111111-1111-4111-8111-111111111111')).toEqual({ ok: true, result: { productId: 'rio-mare', enabled: false } })
  expect(calls[0]).toEqual({ name: 'read_admin_globe_cms_v1', args: undefined })
  expect(calls[1]).toEqual({ name: 'execute_admin_globe_review_direct_v1', args: {
    p_action: 'globe_config_update', p_idempotency_key: '11111111-1111-4111-8111-111111111111',
    p_payload_text: JSON.stringify({ productId: 'rio-mare', enabled: false, reason: 'Hide pending photo review' }),
  } })
})

test('Globe Admin transport preserves the BFF path when enabled', async () => {
  const { createAdminGlobeCmsTransport } = await import('../src/services/adminGlobeCmsService.js')
  const transport = createAdminGlobeCmsTransport({
    client: { rpc: () => { throw new Error('Direct RPC must not run') } },
    bffEnabled: true,
    bffRead: async () => ({ ok: true, cms: { globeProducts: [], reviews: [] } }),
    bffCommand: async (action, payload, key) => ({ ok: true, result: { action, payload, key } }),
  })
  expect((await transport.read()).ok).toBe(true)
  expect((await transport.command('review_publish', { id: 'a' }, 'key')).result).toEqual({ action: 'review_publish', payload: { id: 'a' }, key: 'key' })
})

test('direct Globe command keeps database role, MFA, evidence, version and audit gates', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260921_admin_globe_direct_rpc.sql', import.meta.url), 'utf8')
  expect(sql).toContain('public.execute_admin_globe_review_direct_v1')
  expect(sql).toContain('public.is_admin()')
  expect(sql).toContain("auth.jwt()->>'aal'")
  expect(sql).toContain('K2_ADMIN_REVIEW_EVIDENCE_REQUIRED')
  expect(sql).toContain('K2_ADMIN_GLOBE_STALE')
  expect(sql).toContain('K2_ADMIN_REVIEW_STALE')
  expect(sql).toContain('k2_private.globe_review_events')
  expect(sql).toContain('k2_private.admin_command_receipts')
  expect(sql).toContain('revoke insert,update,delete on public.globe_products,public.reviews from authenticated')
})
