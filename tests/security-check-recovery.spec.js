import { test, expect } from '@playwright/test'

const actions = ['admin_auth', 'customer_auth', 'guest_order', 'guest_start', 'guest_wholesale', 'guest_pasabuy']

for (const action of actions) {
  test(`${action}: a silent provider has visible progress, bounded retry and no unverified submission`, async ({ page }, testInfo) => {
    await page.clock.install()
    await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**', route => route.fulfill({
      contentType: 'application/javascript', body: `window.fixtureWidgets=[];window.turnstile={render:(el,options)=>{window.fixtureWidgets.push(options);return window.fixtureWidgets.length},remove:()=>{}}`,
    }))
    await page.goto(`/tests/fixtures/security-check.html?action=${action}`)
    await expect.poll(() => page.evaluate(() => window.fixtureWidgets?.length)).toBe(1)
    await page.getByLabel('Email', { exact: true }).fill('person@example.test')
    await expect(page.getByRole('status', { name: 'Security check status' })).toContainText('Checking your browser')
    await page.getByRole('button', { name: 'Submit protected form' }).click()
    await expect(page.getByLabel('Form result')).toHaveText('Not submitted')
    await page.clock.runFor(30001)
    await expect(page.getByRole('alert')).toContainText('taking longer')
    const retry = page.getByRole('button', { name: 'Retry security check' })
    await expect(retry).toBeVisible()
    expect(await retry.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: testInfo.outputPath(`${action}-375.png`), fullPage: true })
    await retry.focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => page.evaluate(() => window.fixtureWidgets.length)).toBe(2)
    await page.evaluate(() => window.fixtureWidgets[0].callback('stale-token'))
    await page.getByRole('button', { name: 'Submit protected form' }).click()
    await expect(page.getByLabel('Form result')).toHaveText('Not submitted')
    await page.evaluate(() => window.fixtureWidgets[1].callback('fixture-token'))
    await expect(page.getByRole('status', { name: 'Security check status' })).toContainText('Security check complete')
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue('person@example.test')
    await page.setViewportSize({ width: 1440, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`${action}-1440.png`), fullPage: true })
    await page.getByRole('button', { name: 'Submit protected form' }).click()
    await expect(page.getByLabel('Form result')).toHaveText('Submitted')
  })
}

test('download refusal is recoverable and expiry clears a previously verified token', async ({ page }) => {
  let downloads = 0
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**', route => {
    if (++downloads === 1) return route.abort()
    return route.fulfill({ contentType: 'application/javascript', body: `window.turnstile={render:(_,options)=>{window.fixtureOptions=options;options.callback('fixture-token');return 1},remove:()=>{}}` })
  })
  await page.goto('/tests/fixtures/security-check.html?action=guest_order')
  await expect(page.getByRole('alert')).toContainText('could not load')
  await page.getByRole('button', { name: 'Retry security check' }).click()
  await expect(page.getByRole('status', { name: 'Security check status' })).toContainText('Security check complete')
  await page.evaluate(() => window.fixtureOptions['expired-callback']())
  await expect(page.getByRole('alert')).toContainText('expired')
  await page.getByRole('button', { name: 'Submit protected form' }).click()
  await expect(page.getByLabel('Form result')).toHaveText('Not submitted')
})

test('provider geometry fits narrow containers and recovers across viewport changes', async ({ page }) => {
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**', route => route.fulfill({
    contentType: 'application/javascript', body: `window.turnstile={render:(container,options)=>{const widget=document.createElement('div');widget.dataset.testid='provider-widget';widget.style.cssText='min-width:'+(options.size==='compact'?150:300)+'px;height:65px';container.appendChild(widget);options.callback('fixture-token');return widget},remove:widget=>widget.remove()}`,
  }))
  await page.setViewportSize({ width: 320, height: 812 })
  await page.goto('/tests/fixtures/security-check.html?action=admin_auth')
  for (const width of [320, 1440, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.getByTestId('provider-widget').evaluate(el => Boolean(el.parentElement) && el.getBoundingClientRect().width <= el.parentElement.clientWidth)).toBe(true)
    await expect(page.getByRole('status', { name: 'Security check status' })).toContainText('complete')
  }
})
