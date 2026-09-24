import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { validateCustomerSettings } from '../prepared-api/storefront/account/settings.js'

test('customer settings accept bounded profile data and reject extra fields', () => {
  expect(validateCustomerSettings({ displayName: '  Maria  ', deliveryAddress: '  Manila  ', notifyInApp: true }))
    .toEqual({ displayName: 'Maria', deliveryAddress: 'Manila', notifyInApp: true })
  for (const bad of [
    { displayName: '', deliveryAddress: 'Manila', notifyInApp: true },
    { displayName: 'Maria', deliveryAddress: 'x'.repeat(501), notifyInApp: true },
    { displayName: 'Maria', deliveryAddress: 'Manila', notifyInApp: 'yes' },
    { displayName: 'Maria', deliveryAddress: 'Manila', notifyInApp: true, userId: 'other' },
  ]) expect(() => validateCustomerSettings(bad)).toThrow()
})

test('account settings and notifications require authenticated bounded server routes', async () => {
  const [router, settings, notices, service] = await Promise.all([
    readFile('server/storefront-bff/router.js', 'utf8'),
    readFile('prepared-api/storefront/account/settings.js', 'utf8'),
    readFile('prepared-api/storefront/account/notifications.js', 'utf8'),
    readFile('src/services/customerAccountService.js', 'utf8'),
  ])
  expect(router).toContain("'account/settings'")
  expect(router).toContain("'account/notifications'")
  expect(settings).toContain('client.auth.getUser(accessToken)')
  expect(settings).toContain('signedRpcArguments')
  expect(notices).toContain('client.auth.getUser(accessToken)')
  expect(notices).toContain('signedRpcArguments')
  expect(service).toContain("accountRequest('account/settings'")
  expect(service).toContain("accountRequest('account/notifications'")
})

test('private profile and notification SQL uses account ownership and canonical events', async () => {
  const sql = await readFile('supabase/migrations/20260924_customer_account_settings_notifications.sql', 'utf8')
  expect(sql).toContain('k2_private.customer_account_settings')
  expect(sql).toContain('k2_private.customer_account_notifications')
  expect(sql).toContain('user_id=auth.uid()')
  expect(sql).toContain('payment_status = \'verified\'')
  expect(sql).toContain("new.delivery_status <> 'sent'")
  expect(sql).toContain('on conflict (source_event_key) do nothing')
  expect(sql).not.toContain('new.content')
})
