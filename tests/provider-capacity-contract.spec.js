import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { MAX_EVIDENCE_BYTES } from '../server/admin-bff/product-intake.js'
import {
  PRODUCT_EVIDENCE_MAX_BYTES,
  PRODUCT_EVIDENCE_MIMES,
} from '../src/lib/uploadValidation.js'

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('K2 payload caps stay below provider ceilings and agree across evidence boundaries', async () => {
  expect(MAX_EVIDENCE_BYTES).toBe(4 * 1024 * 1024)
  expect(PRODUCT_EVIDENCE_MAX_BYTES).toBe(MAX_EVIDENCE_BYTES)
  expect(PRODUCT_EVIDENCE_MAX_BYTES).toBeLessThan(4.5 * 1000 * 1000)
  expect(PRODUCT_EVIDENCE_MIMES).toEqual(['image/jpeg', 'image/png', 'image/webp'])

  const [server, service, modal, adminClient] = await Promise.all([
    source('server/admin-bff/product-intake.js'),
    source('src/services/productIntakeService.js'),
    source('src/views/admin/ProductIntakeSessionModal.jsx'),
    source('src/services/adminBffService.js'),
  ])
  expect(server).not.toContain('10 * 1024 * 1024')
  expect(service).toContain('maxBytes: PRODUCT_EVIDENCE_MAX_BYTES')
  expect(modal).toContain('PRODUCT_EVIDENCE_MAX_BYTES')
  expect(modal).toContain('no larger than 4 MB')
  expect(adminClient).toContain('no larger than 4 MB')
})

test('separate Vercel projects explicitly cap prepared functions at ten seconds', async () => {
  const configs = await Promise.all([
    source('vercel.storefront.json').then(JSON.parse),
    source('vercel.admin.json').then(JSON.parse),
  ])
  expect(configs[0].functions['api/storefront/index.js'].maxDuration).toBe(10)
  expect(configs[1].functions['api/admin/index.js'].maxDuration).toBe(10)
})

test('all browser and server ingress boundaries declare bounded payload or time limits', async () => {
  const [storefront, admin, invite, shopee, shopeeHandler, timeout, adminClient, guestClient, marketplacePush] = await Promise.all([
    source('server/storefront-bff/security.js'),
    source('server/admin-bff/security.js'),
    source('supabase/functions/invite-staff/handler.ts'),
    source('supabase/functions/shopee-webhook/validation.js'),
    source('supabase/functions/shopee-webhook/index.ts'),
    source('src/lib/fetchWithTimeout.js'),
    source('src/services/adminBffService.js'),
    source('src/services/guestCommerceService.js'),
    source('supabase/functions/_shared/marketplace-push.js'),
  ])
  expect(storefront).toContain('const MAX_BODY_BYTES = 24 * 1024')
  expect(admin).toContain('const MAX_BODY_BYTES = 16 * 1024')
  expect(invite).toContain('const MAX_REQUEST_BYTES = 4096')
  // The ceiling and the read deadline moved to the shared marketplace reader
  // (MAP-028 D3) so Lazada and TikTok inherit them. Shopee still publishes the
  // same bound under the same name, and the deadline is still absolute.
  expect(marketplacePush).toContain('MAX_PUSH_BYTES = 256 * 1024')
  expect(shopee).toContain('MAX_SHOPEE_PUSH_BYTES = MAX_PUSH_BYTES')
  expect(marketplacePush).toContain('_BODY_READ_TIMEOUT')
  expect(shopeeHandler).toContain("Deno.env.get('SHOPEE_BODY_READ_TIMEOUT_MS')")
  expect(timeout).toContain('maxAttempts = 3')
  expect(adminClient).toContain('fetchWithTimeout(path, requestInit, 15000)')
  expect(adminClient).toContain('}, 30000)')
  expect(guestClient).toContain('}, 15000)')
})

test('capacity runbook distinguishes documented ceilings from missing account evidence', async () => {
  const runbook = await source('docs/runbooks/PROVIDER_LIMITS_AND_CAPACITY_RUNBOOK.md')
  expect(runbook).toContain('Provider documented')
  expect(runbook).toContain('Owner evidence required')
  expect(runbook).toContain('https://vercel.com/docs/functions/limitations')
  expect(runbook).toContain('https://supabase.com/docs/guides/platform/compute-and-disk')
  expect(runbook).toContain('K2-specific plan')
  expect(runbook).toContain('blocked on authenticated Vercel/Supabase account evidence')
  expect(runbook).not.toMatch(/SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY\s*=/)
})
