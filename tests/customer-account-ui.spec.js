import { expect, test } from '@playwright/test'

const AUTH_STORAGE_KEY = 'sb-pixplcjqivlfflickobf-auth-token'

function fakeJwt() {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    aud: 'authenticated', sub: '10000000-0000-4000-8000-000000000001',
    role: 'authenticated', aal: 'aal1', exp: Math.floor(Date.now() / 1000) + 3600,
    email: 'buyer@example.com',
  })}.signature`
}

test('customer account entry is phone-safe, passwordless, recoverable, and keeps primary mobile navigation at five', async ({ page, context }, testInfo) => {
  test.setTimeout(90000)
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.turnstile={render:(_,options)=>{options.callback('verified-test-token');return 1},remove:()=>{}}`,
  }))
  await page.route('**/api/storefront/account/auth/email', route => {
    expect(route.request().postDataJSON()).toEqual({ email: 'buyer@example.com', botToken: 'verified-test-token' })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  })
  await page.goto('/')
  await expect(page.getByRole('main')).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: 'Customer account' }).click()
  await expect(page.getByRole('heading', { name: 'Keep verified K2 history across devices.' })).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('navigation', { name: 'Mobile storefront' }).getByRole('button')).toHaveCount(5)
  await expect(page.getByLabel('Email address')).toBeVisible()
  await expect(page.getByText('Complete this check before K2 asks the sign-in provider to send a link or text code.')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toHaveCount(0)
  await expect(page.getByText(/VIP Login|Authenticate to unlock tier pricing/i)).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

  await context.setOffline(true)
  await expect(page.getByRole('status').filter({ hasText: 'You are offline' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeDisabled()
  await context.setOffline(false)
  await page.getByLabel('Email address').fill('buyer@example.com')
  await page.screenshot({ path: testInfo.outputPath('account-auth-turnstile-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Send sign-in link' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('account-email-sent-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
  await page.setViewportSize({ width: 812, height: 375 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await expect(page.getByRole('button', { name: 'Customer account' })).toBeVisible()
})

test('verified account claims once, loads only customer-visible history, and sends an authenticated bounded reply', async ({ page }, testInfo) => {
  const accessToken = fakeJwt()
  await page.addInitScript(({ key, token }) => {
    localStorage.setItem(key, JSON.stringify({
      access_token: token, refresh_token: 'test-refresh-token', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: '10000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated',
        email: 'buyer@example.com', email_confirmed_at: new Date().toISOString(),
        app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString(),
      },
    }))
  }, { key: AUTH_STORAGE_KEY, token: accessToken })
  let linked = false
  let replyBody = null
  await page.route('**/api/storefront/account/history', async route => {
    const authorization = route.request().headers().authorization
    expect(authorization).toBe(`Bearer ${accessToken}`)
    if (!linked) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: { code: 'ACCOUNT_NOT_LINKED' } }) })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, history: {
      linked_at: '2026-08-22T07:00:00Z',
      orders: [{ public_reference: 'WEB-A19X7K2Q', status: 'confirmed', payment_status: 'not_requested', total_amount: 1234.5, created_at: '2026-08-22T07:00:00Z' }],
      pasabuy_requests: [{ public_reference: 'PB-Q81M4K2Z', status: 'researching', item_title: 'Italian pantry item', quantity: 2, created_at: '2026-08-22T07:00:00Z' }],
      conversations: [{ conversation_reference: 'CV-0123456789ABCDEF', channel: 'Website', status: 'Open', last_message_at: '2026-08-22T07:05:00Z', messages: [{ direction: 'outbound', content: 'Customer-visible reply', delivery_status: 'sent', created_at: '2026-08-22T07:05:00Z' }] }],
    } }) })
  })
  await page.route('**/api/storefront/account/claim', route => {
    const body = route.request().postDataJSON()
    expect(Object.keys(body).sort()).toEqual(['contactKind','idempotencyKey'].sort())
    expect(body.contactKind).toBe('email')
    linked = true
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: { claimed: true, guest_access_revoked: true, linked_at: '2026-08-22T07:00:00Z' } }) })
  })
  await page.route('**/api/storefront/account/message', route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${accessToken}`)
    replyBody = route.request().postDataJSON()
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: { message_status: 'received', created_at: '2026-08-22T07:06:00Z' } }) })
  })

  await page.goto('/?account=continue')
  await expect(page.getByRole('heading', { name: 'Link this browser’s guest records' })).toBeVisible()
  await page.getByRole('button', { name: 'Link verified guest records' }).click()
  await expect(page.getByRole('heading', { name: 'Your K2 records, in one place.' })).toBeVisible()
  await expect(page.getByText('WEB-A19X7K2Q')).toBeVisible()
  await expect(page.getByText('Private staff note')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('account-linked-mobile.png'), fullPage: true })
  await page.getByLabel('Reply').fill('Please confirm my delivery status.')
  await page.getByRole('button', { name: 'Record reply' }).click()
  await expect.poll(() => replyBody).not.toBeNull()
  expect(replyBody).toMatchObject({ conversationReference: 'CV-0123456789ABCDEF', message: 'Please confirm my delivery status.' })
  expect(replyBody.customerId).toBeUndefined()
  expect(replyBody.userId).toBeUndefined()
})
