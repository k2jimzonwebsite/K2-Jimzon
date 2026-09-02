import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.describe('launch contract', () => {
  test('documents all five income channels and deferred dependencies', async () => {
    const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')
    for (const channel of ['Website', 'Shopee', 'TikTok Shop', 'Lazada', 'Pasabuy']) expect(readme).toContain(channel)
    expect(readme).toContain('Online payment gateway')
    expect(readme).toContain('Custom storefront/admin domains')
  })

  test('unsafe prototype security implementation is removed', async () => {
    const securityPlan = await readFile(new URL('../docs/specs/admin_deployment_security_plan.md', import.meta.url), 'utf8')
    expect(securityPlan).toContain('There is no local-storage admin bypass')
    await expect(readFile(new URL('../src/lib/securityVault.js', import.meta.url), 'utf8')).rejects.toThrow()
  })

  test('unconnected live chat and newsletter success simulations are removed', async () => {
    await expect(readFile(new URL('../src/components/ChatFab.jsx', import.meta.url), 'utf8')).rejects.toThrow()
    await expect(readFile(new URL('../src/components/home/Newsletter.jsx', import.meta.url), 'utf8')).rejects.toThrow()
  })
})
