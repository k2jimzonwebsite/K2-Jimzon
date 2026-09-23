import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('mobile store minimizes the Shopkeeper behind sheets and uses a compact camera toolbar', async () => {
  const shop = await read('../src/views/InteractiveShop.jsx')
  const keeper = await read('../src/components/shop/StoreKeeper.jsx')
  const css = await read('../src/interactive-store.css')

  expect(shop).toContain('forceCollapsed={Boolean(sheet)}')
  expect(keeper).toContain('forceCollapsed = false')
  expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*?\.k2-store-guide\[data-open='false'\][\s\S]*?width:\s*3\.5rem/)
  expect(css).toMatch(/\.k2-store-camera-toolbar/)
  expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*?\.k2-store-zoom\s*\{[\s\S]*?flex-direction:\s*row/)
})

test('footer exposes the six owner-approved marketplace destinations as real links', async () => {
  const footer = await read('../src/components/Footer.jsx')
  for (const value of [
    'Pasabuy Italy by K2',
    'https://s.lazada.com.ph/s.Z777zD?c=x',
    'https://s.shopee.ph/9V1fXWQ0gK',
    'https://vt.tiktok.com/ZS9Afhgs231Wm-Zj3hN/',
    'Jworldbasket',
    'https://s.lazada.com.ph/s.Z77ieU?c=x',
    'https://s.shopee.ph/5fowyVvX1R',
    'https://vt.tiktok.com/ZS9AfhVYjAJUb-HhBEF/',
  ]) expect(footer).toContain(value)
  expect(footer).toContain('rel="noreferrer"')
})

test('Admin is installable without caching authenticated operational data', async () => {
  const app = await read('../src/AdminApp.jsx')
  const installer = await read('../src/components/admin/AdminInstallButton.jsx')
  const vite = await read('../vite.config.js')
  const worker = await read('../src/admin-sw.js')

  expect(app).toContain('AdminInstallButton')
  expect(installer).toContain('beforeinstallprompt')
  expect(installer).toContain('Install Admin app')
  expect(vite).toContain("adminServiceWorkerPlugin(target)")
  expect(worker).toContain("self.addEventListener('fetch'")
  expect(worker).toContain('fetch(event.request)')
  expect(worker).not.toMatch(/caches\.(open|match)|cache\.put/)
})

test('anonymous chat moderation is hash-only, role-gated, auditable and separate', async () => {
  const migration = await read('../supabase/migrations/20260922_anonymous_chat_moderation.sql')
  const rollback = await read('../supabase/migrations/20260922_anonymous_chat_moderation_rollback.sql')
  const inbox = await read('../server/admin-bff/inbox.js')
  const view = await read('../src/views/admin/Inbox.jsx')

  expect(migration).toContain('k2_private.anonymous_chat_principals')
  expect(migration).toContain('k2_private.anonymous_chat_blocks')
  expect(migration).toContain('k2_private.anonymous_chat_deletion_receipts')
  expect(migration).toMatch(/octet_length\(ip_hash\)\s*=\s*32/)
  expect(migration).not.toMatch(/inet\b|raw_ip|ip_address/)
  expect(migration).toContain("in ('Admin','SuperAdmin')")
  expect(migration).toContain('customer_accounts')
  expect(migration).toContain("source_kind not in ('website_message','virtual_store_message')")
  expect(migration).toContain("'CHAT_BLOCKED'")
  expect(rollback).toContain('drop table if exists k2_private.anonymous_chat_blocks')

  expect(inbox).toContain("action === 'inbox_delete_anonymous'")
  expect(inbox).toContain("action === 'inbox_block_anonymous'")
  expect(inbox).toContain("action === 'inbox_unblock_anonymous'")
  expect(view).toContain('Delete anonymous conversation')
  expect(view).toContain('Block anonymous chat')
  expect(view).toContain('Unblock anonymous chat')
})
