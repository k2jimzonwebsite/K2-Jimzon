import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// MAP-019 F-019-003: customer-facing copy must describe the path the customer
// is actually on. The recorded BFF inquiry path is not an email draft, and no
// surface may promise a reply while OWNER-003's response-time value is missing.
test('wholesale receipt copy follows the submission path', async () => {
  const wholesale = await readFile(new URL('../src/views/Wholesale.jsx', import.meta.url), 'utf8')
  // The unsent email-draft path keeps its honest wording.
  expect(wholesale).toContain('after the email is actually sent')
  // The recorded BFF path gets its own wording instead of borrowing the email line.
  expect(wholesale).toContain('records the inquiry')
})

test('contact makes one consistent reviewed-hours statement', async () => {
  const contact = await readFile(new URL('../src/views/Contact.jsx', import.meta.url), 'utf8')
  expect(contact).not.toContain('reply to every')
  expect(contact).toContain('No response time is promised')
})

test('storefront promises reconcile with manual launch facts without false SLAs or unapproved payment methods', async () => {
  const site = await readFile(new URL('../src/data/site.js', import.meta.url), 'utf8')
  // No unsupported payment methods in customer-facing FAQ
  expect(site).not.toMatch(/Maya|COD|Cash on delivery|bank transfer/i)
  // No false delivery SLA promises
  expect(site).not.toMatch(/1–2 business-day|2–3 week|guaranteed delivery/i)
  // Explicit manual check requirement before payment
  expect(site).toContain('Wait for K2 staff to confirm your stock')
  expect(site).toContain('Submitting a request does not confirm a delivery date')

  const hero = await readFile(new URL('../src/components/home/Hero.jsx', import.meta.url), 'utf8')
  expect(hero).toContain('No payment required at checkout')
  expect(hero).toContain('Staff checks before you pay')

  const confirmation = await readFile(new URL('../src/views/Confirmation.jsx', import.meta.url), 'utf8')
  expect(confirmation).toContain('No payment was charged')
  expect(confirmation).toContain('Saved for staff review')
  expect(confirmation).toContain('There is no self-service cancellation or return')

  const checkout = await readFile(new URL('../src/views/Checkout.jsx', import.meta.url), 'utf8')
  expect(checkout).not.toContain('GCash / Maya / Bank')
  expect(checkout).toContain('GCash QR after staff confirms your order')
  expect(checkout).toContain('MariBank QR after staff confirms your order')
})
