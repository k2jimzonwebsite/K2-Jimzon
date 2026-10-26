import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/admin/session', route => route.fulfill({ status: 401, json: { error: { code: 'SESSION_EXPIRED' } } }))
  await page.route('https://fixture.supabase.co/**', route => route.fulfill({ status: 401, json: {} }))
})

test('secure Admin keeps Google available and routes the verified token through its BFF', async ({ page }) => {
  await page.addInitScript(() => {
    window.turnstile = { render: (_, options) => { options.callback('fixture-verified-token'); return 1 }, remove: () => {} }
  })
  await page.route('**/api/admin/auth/google/start', async route => {
    expect(route.request().postDataJSON()).toEqual({ botToken: 'fixture-verified-token' })
    await route.fulfill({ status: 503, json: { error: { code: 'AUTH_UNAVAILABLE' } } })
  })
  await page.goto('/admin-portal-k2-secure', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.screenshot({ path: `docs/design-checkpoints/20261014-admin-auth-recovery/google-${width}.png`, fullPage: true })
  }
  await page.getByRole('button', { name: 'Continue with Google' }).click({ timeout: 15000 })
  await expect(page.getByRole('alert')).toContainText(/unavailable|completed/i)
})

test('a failed challenge script can be retried without reloading the login form', async ({ page }) => {
  let attempts = 0
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**', async route => {
    attempts++
    if (attempts === 1) return route.abort('failed')
    return route.fulfill({ contentType: 'application/javascript', body: `window.turnstile={render:(_,o)=>{o.callback('fixture-verified-token');return 1},remove:()=>{}}` })
  })
  await page.goto('/admin-portal-k2-secure', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Email', { exact: true }).fill('staff@example.test')
  await expect(page.getByRole('alert')).toContainText('could not load')
  await page.screenshot({ path: 'docs/design-checkpoints/20261014-admin-auth-recovery/challenge-retry-375.png', fullPage: true })
  await page.getByRole('button', { name: 'Retry security check' }).click({ timeout: 10000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('staff@example.test')
  expect(attempts).toBe(2)
})

for (const code of ['MFA_REQUIRED', 'MFA_ENROLLMENT_REQUIRED', 'OAUTH_RETURN_INVALID']) {
  test(`Google return handles ${code} without a browser provider session`, async ({ page }) => {
    let exchanges = 0
    let enrollments = 0
    let providerRequests = 0
    await page.route('https://fixture.supabase.co/auth/v1/**', route => { providerRequests++; return route.fulfill({ status: 401, json: {} }) })
    await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**', route => route.abort())
    await page.route('**/api/admin/auth/google/complete', async route => {
      exchanges++
      expect(route.request().postDataJSON()).toEqual({ code: 'one-time-provider-code', state: 'fixture-state' })
      await route.fulfill({ status: code === 'OAUTH_RETURN_INVALID' ? 401 : 202,
        json: code === 'OAUTH_RETURN_INVALID' ? { error: { code } } : { ok: false, code } })
    })
    await page.route('**/api/admin/auth/mfa', async route => {
      enrollments++
      await route.fulfill({ json: { ok: true, enrollment: { factorId: 'fixture-factor', secret: 'FIXTURESECRET',
        qr: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="176" height="176"><rect width="176" height="176"/></svg>' } } })
    })
    await page.goto('/admin-portal-k2-secure?google=fixture-state&code=one-time-provider-code', { waitUntil: 'domcontentloaded' })
    if (code === 'MFA_REQUIRED') await expect(page.getByText('Two-factor required', { exact: true })).toBeVisible()
    if (code === 'MFA_ENROLLMENT_REQUIRED') {
      await expect(page.getByRole('heading', { name: 'Set up your authenticator' })).toBeVisible()
      const qr = page.getByRole('img', { name: 'Authenticator setup QR code' })
      await expect(qr).toBeVisible()
      await expect.poll(() => qr.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)
      await expect(page.getByLabel('Six-digit verification code', { exact: true })).toBeVisible()
    }
    if (code === 'OAUTH_RETURN_INVALID') await expect(page.getByRole('alert').filter({ hasText: 'Google sign-in' })).toContainText('Start Google sign-in again')
    expect(exchanges).toBe(1)
    expect(providerRequests).toBe(0)
    expect(enrollments).toBe(code === 'MFA_ENROLLMENT_REQUIRED' ? 1 : 0)
    expect(page.url()).not.toContain('code=')
    expect(page.url()).not.toContain('google=')
    expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.includes('auth-token')))).toEqual([])
  })
}

test('the visible provider widget fits the actual Admin form at phone and desktop widths', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.turnstile = {
      render(container, options) {
        const widget = document.createElement('div')
        widget.dataset.testid = 'provider-widget-geometry'
        widget.style.cssText = `min-width:${options.size === 'compact' ? 150 : 300}px;height:${options.size === 'compact' ? 140 : 65}px`
        widget.textContent = 'Synthetic provider geometry'
        container.appendChild(widget)
        options.callback('fixture-verified-token')
        return widget
      }, remove(widget) { widget.remove() },
    }
  })
  await page.goto('/admin-portal-k2-secure', { waitUntil: 'domcontentloaded' })
  for (const width of [375, 1440, 375]) {
    await page.setViewportSize({ width, height: 900 })
    const widget = page.getByTestId('provider-widget-geometry')
    await expect(widget).toBeVisible()
    await expect.poll(() => widget.evaluate(el => {
      const parentElement = el.parentElement
      if (!el.isConnected || !parentElement) return false
      const box = el.getBoundingClientRect(), parent = parentElement.getBoundingClientRect()
      return box.width <= parent.width && box.right <= parent.right
    })).toBe(true)
    await expect(page.getByRole('status', { name: 'Security check status' })).toContainText('complete')
    await page.screenshot({ path: testInfo.outputPath(`admin-widget-fit-${width}.png`), fullPage: true })
  }
})
