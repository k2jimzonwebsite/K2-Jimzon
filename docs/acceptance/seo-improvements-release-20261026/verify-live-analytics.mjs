import { chromium } from 'playwright'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
let phase = 'unconsented'
const events = []
const statuses = []
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const vendor = /google-analytics\.com\/g\/collect/
page.on('request', request => {
  if (!vendor.test(request.url())) return
  const url = new URL(request.url())
  for (const line of (request.postData() || '').split('\n')) {
    const params = new URLSearchParams(url.search)
    for (const [key, value] of new URLSearchParams(line)) params.set(key, value)
    events.push({ phase, measurement: params.get('tid'), event: params.get('en'), location: params.get('dl'), referrer: params.get('dr'), title: params.get('dt') })
  }
})
page.on('response', response => { if (vendor.test(response.url())) statuses.push(response.status()) })
const scriptCount = () => page.locator('script[src*="googletagmanager.com/gtag/js"]').count()
const result = { at: new Date().toISOString() }
try {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('https://www.k2jimzon.com/store');
  await page.getByRole('main', { name: 'K2 virtual store' }).waitFor({ timeout: 60000 });
  assert.equal(await page.getByRole('region', { name: 'Optional analytics' }).count(), 0);
  assert.equal(await scriptCount(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('k2-analytics-consent-v1')), null);
  await page.getByRole('button', { name: 'Leave the store', exact: true }).click();
  await page.getByRole('region', { name: 'Optional analytics' }).waitFor();
  result.immersive = 'Unknown consent stays unknown, no vendor or prompt in room; choices return on exit';
  await page.goto('https://www.k2jimzon.com/pasabuy?seo_probe=public-check#probe')
  await page.getByRole('heading', { level: 1, name: /Pasabuy, from Italy to the Philippines/i }).waitFor()
  await page.getByRole('region', { name: 'Optional analytics' }).waitFor()
  assert.equal(await scriptCount(), 0)
  await page.getByRole('button', { name: 'Decline', exact: true }).click()
  await sleep(700)
  assert.equal(await scriptCount(), 0)
  assert.equal(events.length, 0)
  result.decline = 'No vendor script or collection request'
  await page.getByRole('button', { name: 'Analytics choices', exact: true }).click()
  phase = 'accepted'
  await page.getByRole('button', { name: 'Accept analytics', exact: true }).click()
  for (let i = 0; i < 30 && !statuses.length; i++) await sleep(1000)
  assert.equal(await scriptCount(), 1)
  assert(events.some(e => e.measurement === 'G-4JQ3D0GDB9' && e.event === 'page_view'))
  assert(statuses.some(status => status >= 200 && status < 300))
  for (const event of events) {
    assert(!/seo_probe|public-check|#probe/.test(JSON.stringify(event)))
    if (event.location) assert.equal(event.location, 'https://www.k2jimzon.com/pasabuy')
  }
  result.accept = 'Real Google collection response and sanitized manual page_view'
  phase = 'private'
  await page.getByRole('button', { name: 'Review your basket', exact: true }).click()
  await page.waitForURL('**/checkout')
  assert.equal(await page.evaluate(() => window['ga-disable-G-4JQ3D0GDB9']), true)
  await sleep(1500)
  assert(!events.some(e => /checkout|account|messages|confirmation/.test(`${e.location} ${e.referrer}`)))
  result.private = 'Disable flag true before private route; no private URL collected'
  await page.getByRole('button', { name: 'Analytics choices', exact: true }).click()
  phase = 'withdrawn'
  await page.getByRole('button', { name: 'Decline', exact: true }).click()
  const cookies = (await page.context().cookies()).map(c => c.name).filter(name => /^_ga(?:_|$)/.test(name))
  assert.equal(cookies.length, 0)
  await page.goto('https://www.k2jimzon.com/catalog')
  await page.getByRole('heading', { level: 1 }).waitFor()
  await sleep(1000)
  assert.equal(await scriptCount(), 0)
  result.withdraw = 'GA cookies removed; next public load does not load vendor'
  result.pass = true
} catch (error) {
  result.pass = false
  result.error = error.message
  throw error
} finally {
  result.events = events
  result.collectionStatuses = statuses
  fs.writeFileSync('.tools/seo-improvements-release-20261026/live-analytics.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
  await browser.close()
}
