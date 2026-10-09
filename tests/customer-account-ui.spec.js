import { expect, test } from '@playwright/test'

// Supplied by scripts/test-customer-account-ui.mjs, which also pins the
// VITE_SUPABASE_URL this key is derived from. The literal is only a
// fallback for running this spec directly against an already-running server.
const AUTH_STORAGE_KEY = process.env.K2_ACCOUNT_UI_AUTH_STORAGE_KEY || 'sb-fixture-auth-token'

function fakeJwt(userId = '10000000-0000-4000-8000-000000000001') {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    aud: 'authenticated', sub: userId,
    role: 'authenticated', aal: 'aal1', exp: Math.floor(Date.now() / 1000) + 3600,
    email: 'buyer@example.com',
  })}.c2lnbmF0dXJl`
}

test.beforeEach(async ({ page }) => {
  // No account fixture may make an external provider request. The fabricated
  // origin is needed only so supabase-js constructs its local Auth client.
  await page.route('https://fixture.supabase.co/**', route => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Fixture provider calls are disabled.' }),
  }))
})

const expressActor = '10000000-0000-4000-8000-000000000001'
const expressReference = 'WEB-ACCOUNTEXPRESS01'
const expressStorageKey = `k2-express-acceptance-v1:${expressReference}`
function accountUser(id) {
  return { id, aud: 'authenticated', role: 'authenticated', email: 'buyer@example.com',
    email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
}
async function seedExpressAccount(page, token) {
  await page.addInitScript(({ key, token, user }) => localStorage.setItem(key, JSON.stringify({
    access_token: token, refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, user,
  })), { key: AUTH_STORAGE_KEY, token, user: accountUser(expressActor) })
  await page.route('**/api/storefront/account/settings', route => route.fulfill({ status: 200,
    json: { ok: true, settings: { displayName: '', deliveryAddress: '', notifyInApp: true }, notifications: [] } }))
}
const accountExpressHistory = (accepted = false, feeMinor = 15000) => ({ ok: true, history: {
  linked_at: '2026-08-22T07:00:00Z', pasabuy_requests: [], conversations: [], orders: [{
    public_reference: expressReference, status: 'submitted', payment_status: 'not_requested',
    shipping_quote_status: accepted ? 'customer_confirmed' : 'pending_quote', total_amount: accepted ? 100 + feeMinor / 100 : null,
    created_at: '2026-08-22T07:00:00Z', express_quote: {
      quoteVersion: 1, courier: 'Grab', feeMinor, subtotal: 100, discountAmount: 0, proposedTotal: 100 + feeMinor / 100,
      quotedAt: new Date(Date.now() - 60000).toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString(),
      availabilityNote: 'Synthetic courier availability for readiness only', accepted,
    },
  }],
} })
const expressAccountReceipt = (feeMinor = 15000) => ({ orderReference: expressReference, quoteVersion: 1,
  shippingQuoteStatus: 'customer_confirmed', totalAmount: 100 + feeMinor / 100, acceptedAt: new Date().toISOString() })

test('legacy account history keeps recorded payment and messages without final bill or approval', async ({ page }) => {
  await seedExpressAccount(page, fakeJwt(expressActor))
  const result = accountExpressHistory(true)
  result.history.orders[0] = { ...result.history.orders[0], delivery_review_required: true,
    total_amount: null, payment_status: 'verified' }
  result.history.orders.push({ public_reference: 'WEB-CURRENT-CHARGE', status: 'submitted',
    payment_status: 'awaiting_instructions', shipping_quote_status: 'customer_confirmed',
    total_amount: 100, delivery_review_required: false, created_at: '2026-08-22T07:00:00Z' })
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 200, json: result }))
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Total needs staff review', { exact: true })).toBeVisible()
  await expect(page.getByText(/Recorded payment verified/)).toBeVisible()
  await expect(page.getByText('₱100.00', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: `Express delivery review for ${expressReference}` })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Website messages' })).toBeVisible()
  await expect(page.getByText(/Message K2 staff before transferring money/)).toBeVisible()
})

test('authenticated express approval recovers an already accepted lost reply after reload', async ({ page }) => {
  const token = fakeJwt(expressActor)
  await seedExpressAccount(page, token)
  let accepted = false
  const writes = []
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 200, json: accountExpressHistory(accepted) }))
  await page.route('**/api/storefront/account/delivery-accept', route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`)
    writes.push(route.request().postDataJSON())
    accepted = true
    return writes.length === 1 ? route.abort('failed') : route.fulfill({ status: 200, json: { ok: true, receipt: expressAccountReceipt() } })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  const review = page.getByRole('region', { name: `Express delivery review for ${expressReference}` })
  await expect(review.getByRole('button', { name: 'Accept final total' })).toBeDisabled()
  await review.getByRole('checkbox', { name: /I reviewed and accept/ }).check()
  await review.getByRole('button', { name: 'Accept final total' }).click()
  await expect(review.getByRole('button', { name: 'Retry saved approval' })).toBeVisible()
  const held = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), expressStorageKey)
  expect(held.identity).toBe(expressActor)
  expect(Object.keys(held.body).sort()).toEqual(['idempotencyKey', 'orderReference', 'quoteVersion'])
  await page.reload()
  await expect(review.getByRole('button', { name: 'Retry saved approval' })).toBeVisible()
  await review.getByRole('button', { name: 'Retry saved approval' }).click()
  await expect(review.getByRole('status')).toContainText('Final total ₱250.')
  expect(writes).toHaveLength(2); expect(writes[1]).toEqual(writes[0])
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).state, expressStorageKey)).toBe('resolved')
  await expect(page.getByAltText(/payment QR/i)).toHaveCount(0)
})

test('authenticated express late receipt stays with the original account and accepts an explicit zero fee', async ({ page }) => {
  const tokenA = fakeJwt(expressActor)
  const actorB = '10000000-0000-4000-8000-000000000002'
  const tokenB = fakeJwt(actorB)
  await seedExpressAccount(page, tokenA)
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({ status: 200,
    json: accountUser(route.request().headers().authorization === `Bearer ${tokenA}` ? expressActor : actorB) }))
  let accepted = false
  let started = false
  let release
  const heldReply = new Promise(resolve => { release = resolve })
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 200,
    json: route.request().headers().authorization === `Bearer ${tokenA}` ? accountExpressHistory(accepted, 0)
      : { ok: true, history: { linked_at: '2026-08-22T07:00:00Z', orders: [], conversations: [], pasabuy_requests: [] } } }))
  await page.route('**/api/storefront/account/delivery-accept', async route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${tokenA}`)
    started = true; accepted = true; await heldReply
    return route.fulfill({ status: 200, json: { ok: true, receipt: expressAccountReceipt(0) } })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  const review = page.getByRole('region', { name: `Express delivery review for ${expressReference}` })
  await expect(review.getByText('₱0', { exact: true })).toHaveCount(2)
  await review.getByRole('checkbox', { name: /I reviewed and accept/ }).check()
  await review.getByRole('button', { name: 'Accept final total' }).click()
  await expect.poll(() => started).toBe(true)
  const switchAccount = token => page.evaluate(async token => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const result = await (await customerAuthClient()).auth.setSession({ access_token: token, refresh_token: 'synthetic-switch-token' })
    if (result.error) throw result.error
  }, token)
  await switchAccount(tokenB)
  await expect(page.getByText(expressReference, { exact: true })).toHaveCount(0)
  release()
  await page.evaluate(key => navigator.locks.request(key, () => {}), expressStorageKey)
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), expressStorageKey)
  expect(saved.identity).toBe(expressActor); expect(saved.state).toBe('resolved'); expect(saved.receipt.totalAmount).toBe(100)
  await expect(page.getByText(/Delivery accepted\. Final total/)).toHaveCount(0)
  await switchAccount(tokenA)
  await expect(review.getByRole('status')).toContainText('Final total ₱100.')
  await expect(review.getByRole('button', { name: 'Accept final total' })).toHaveCount(0)
})

test('account switch discards a late previous-customer history response', async ({ page }) => {
  const actorA = '10000000-0000-4000-8000-000000000001'
  const actorB = '10000000-0000-4000-8000-000000000002'
  const tokenA = fakeJwt(actorA)
  const tokenB = fakeJwt(actorB)
  const user = id => ({ id, aud: 'authenticated', role: 'authenticated', email: 'buyer@example.com',
    email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() })
  await page.addInitScript(({ key, token, actor }) => localStorage.setItem(key, JSON.stringify({
    access_token: token, refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, user: actor,
  })), { key: AUTH_STORAGE_KEY, token: tokenA, actor: user(actorA) })
  await page.route('https://fixture.supabase.co/auth/v1/user', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(user(actorB)),
  }))
  await page.route('**/api/storefront/account/settings', route => route.fulfill({ status: 200,
    contentType: 'application/json', body: JSON.stringify({ ok: true,
      settings: { displayName: '', deliveryAddress: '', notifyInApp: true }, notifications: [] }),
  }))
  let releaseA
  let startedA = false
  let deliveredA = false
  const heldA = new Promise(resolve => { releaseA = resolve })
  await page.route('**/api/storefront/account/history', async route => {
    const isA = route.request().headers().authorization === `Bearer ${tokenA}`
    if (isA) { startedA = true; await heldA }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true,
      history: { linked_at: '2026-08-22T07:00:00Z', pasabuy_requests: [], conversations: [], orders: [{
        public_reference: isA ? 'WEB-PREVIOUSCUSTOMER' : 'WEB-CURRENTCUSTOMER', status: 'submitted',
        shipping_quote_status: 'pending_quote', payment_status: 'not_requested', created_at: '2026-08-22T07:00:00Z',
      }] },
    }) })
    if (isA) deliveredA = true
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect.poll(() => startedA).toBe(true)
  await page.evaluate(async token => {
    const { customerAuthClient } = await import('/src/services/customerAccountService.js')
    const client = await customerAuthClient()
    const result = await client.auth.setSession({ access_token: token, refresh_token: 'test-refresh-token-b' })
    if (result.error) throw result.error
  }, tokenB)
  await expect(page.getByText('WEB-CURRENTCUSTOMER', { exact: true })).toBeVisible()
  releaseA()
  await expect.poll(() => deliveredA).toBe(true)
  await expect(page.getByText('WEB-PREVIOUSCUSTOMER', { exact: true })).toHaveCount(0)
  await expect(page.getByText('WEB-CURRENTCUSTOMER', { exact: true })).toBeVisible()
})

test('a verified new customer can save profile settings and read a scoped notification before ordering', async ({ page }) => {
  test.setTimeout(120000)
  const accessToken = fakeJwt()
  await page.addInitScript(({ key, token }) => {
    localStorage.setItem(key, JSON.stringify({
      access_token: token, refresh_token: 'test-refresh-token', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '10000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated',
        email: 'buyer@example.com', email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    }))
  }, { key: AUTH_STORAGE_KEY, token: accessToken })
  await page.route('**/api/storefront/account/history', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: { code: 'ACCOUNT_NOT_LINKED' } }) }))
  let saved = null
  const notificationId = '10000000-0000-4000-8000-000000000099'
  await page.route('**/api/storefront/account/settings', route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${accessToken}`)
    const body = route.request().postDataJSON()
    if (Object.keys(body).length) saved = body
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true,
      settings: saved || { displayName: '', deliveryAddress: '', notifyInApp: true },
      notifications: [{ id: notificationId, event_kind: 'staff_reply', public_reference: 'CV-0123456789ABCDEF', created_at: '2026-09-24T00:00:00Z', read_at: null }],
    }) })
  })
  let readId = null
  await page.route('**/api/storefront/account/notifications', route => {
    readId = route.request().postDataJSON().notificationId
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, receipt: { read: true } }) })
  })
  await page.goto('/account', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Your account settings' })).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('button', { name: 'Customer account, 1 unread notification' })).toBeVisible()
  await page.getByLabel('Your name').fill('Maria Prieto')
  await page.getByLabel('Saved delivery address').fill('Manila, Philippines')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect.poll(() => saved?.displayName).toBe('Maria Prieto')
  expect(saved.deliveryAddress).toBe('Manila, Philippines')
  await page.getByRole('button', { name: 'Mark notification read' }).click()
  await expect.poll(() => readId).toBe(notificationId)
  await expect(page.getByRole('button', { name: 'Customer account', exact: true })).toBeVisible()
  await expect(page.getByText('You can start shopping before linking guest records.')).toBeVisible()
})

test('customer account entry is phone-safe, passwordless, recoverable, and keeps primary mobile navigation at five', async ({ page, context }, testInfo) => {
  test.setTimeout(180000)
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.turnstile={render:(_,options)=>{options.callback('verified-test-token');return 1},remove:()=>{}}`,
  }))
  await page.route('**/api/storefront/account/auth/email', route => {
    expect(route.request().postDataJSON()).toEqual({ email: 'buyer@example.com', botToken: 'verified-test-token' })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('main')).toBeVisible({ timeout: 90000 })
  await page.getByRole('button', { name: 'Customer account' }).click()
  await expect(page.getByRole('heading', { name: 'Keep verified K2 history across devices.' })).toBeVisible({ timeout: 90000 })
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
      orders: [
        { public_reference: 'WEB-A19X7K2Q', status: 'confirmed', payment_status: 'not_requested', shipping_quote_status: 'customer_confirmed', total_amount: 1234.5, created_at: '2026-08-22T07:00:00Z' },
        { public_reference: 'WEB-PENDING', status: 'submitted', payment_status: 'not_requested', shipping_quote_status: 'pending_quote', total_amount: 735, created_at: '2026-08-22T07:00:00Z' },
      ],
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

  await page.goto('/?account=continue', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Link this browser’s guest records' })).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: 'Link verified guest records' }).click()
  await expect(page.getByRole('heading', { name: 'Your K2 records, in one place.' })).toBeVisible()
  await expect(page.getByText('WEB-A19X7K2Q')).toBeVisible()
  await expect(page.getByText('Final total pending', { exact: true })).toBeVisible()
  await expect(page.getByText('₱1,234.50', { exact: true })).toBeVisible()
  await expect(page.getByText('₱735.00', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Private staff note')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('account-linked-mobile.png'), fullPage: true })
  await page.getByLabel('Reply').fill('Please confirm my delivery status.')
  await page.getByRole('button', { name: 'Record reply' }).click()
  await expect.poll(() => replyBody).not.toBeNull()
  expect(replyBody).toMatchObject({ conversationReference: 'CV-0123456789ABCDEF', message: 'Please confirm my delivery status.' })
  expect(replyBody.customerId).toBeUndefined()
  expect(replyBody.userId).toBeUndefined()
})
