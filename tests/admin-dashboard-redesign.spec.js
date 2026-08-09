import { test, expect } from '@playwright/test'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const projectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : ''
const storageKey = projectRef ? `sb-${projectRef}-auth-token` : ''

const user = {
  id: '8b185c31-66f7-49fd-81d0-4f36a38b9812',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'operations@k2jimzon.com',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'K2 Operations' },
  created_at: new Date(Date.now() - 180 * 86400000).toISOString(),
}

const daysAgo = days => new Date(Date.now() - days * 86400000).toISOString()
const daysAhead = days => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)

const orders = [
  ['website', 'fulfilled', 'verified', 4380, 1],
  ['shopee', 'fulfilled', 'verified', 2795, 3],
  ['tiktok', 'confirmed', 'verified', 6180, 5],
  ['lazada', 'fulfilled', 'verified', 3520, 8],
  ['website', 'submitted', 'not_requested', 1845, 0],
  ['website', 'confirmed', 'evidence_submitted', 5270, 2],
  ['pasabuy', 'confirmed', 'verified', 12650, 12],
  ['shopee', 'fulfilled', 'verified', 2240, 18],
  ['website', 'fulfilled', 'verified', 7120, 24],
  ['website', 'fulfilled', 'verified', 3650, 35],
  ['shopee', 'fulfilled', 'verified', 5940, 42],
].map(([channel_source, status, payment_status, total_amount, days], index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  channel_source,
  status,
  payment_status,
  total_amount,
  created_at: daysAgo(days),
}))

const products = Array.from({ length: 24 }, (_, index) => ({
  sku: `K2-${String(index + 1).padStart(4, '0')}`,
  name: `Catalog product ${index + 1}`,
  status: 'Active',
  stock_available: index < 2 ? 0 : index < 7 ? index - 1 : 14 + index,
  srp: 480 + index * 35,
  wholesale_price: 420 + index * 28,
  secondary_images: [],
  reorder_level: 5,
  expiry_date: index < 2 ? daysAhead(25 + index) : null,
}))

const conversations = [
  { id: '10000000-0000-4000-8000-000000000001', customer_name: 'Ariane Cruz', platform: 'Shopee', status: 'Open', priority: 'urgent', unread_count: 3, assigned_to: null, response_due_at: daysAgo(1), last_message_at: daysAgo(0), messages: [] },
  { id: '10000000-0000-4000-8000-000000000002', customer_name: 'Marco Villanueva', platform: 'Website', status: 'Open', priority: 'high', unread_count: 2, assigned_to: user.id, response_due_at: new Date(Date.now() + 2 * 3600000).toISOString(), last_message_at: daysAgo(0), messages: [] },
  { id: '10000000-0000-4000-8000-000000000003', customer_name: 'Bianca de Leon', platform: 'Pasabuy', status: 'Open', priority: 'normal', unread_count: 1, assigned_to: null, response_due_at: daysAgo(0.2), last_message_at: daysAgo(0), messages: [] },
]

const fixtures = {
  order_requests: orders,
  pasabuy_requests: [
    { id: '20000000-0000-4000-8000-000000000001', public_reference: 'PB-260801-A1', item_title: 'Italian pantry bundle', customer_name: 'Elena Garcia', customer_email: 'elena@example.test', quantity: 2, status: 'request_received', target_budget_php: 8500, assigned_to: null, created_at: daysAgo(1), pasabuy_quotes: [] },
    { id: '20000000-0000-4000-8000-000000000002', public_reference: 'PB-260730-C7', item_title: 'Limited beauty set', customer_name: 'Nina Mercado', customer_email: 'nina@example.test', quantity: 1, status: 'researching', target_budget_php: 14200, assigned_to: user.id, created_at: daysAgo(4), pasabuy_quotes: [] },
    { id: '20000000-0000-4000-8000-000000000003', public_reference: 'PB-260728-F3', item_title: 'Seasonal confectionery box', customer_name: 'Paolo Santos', customer_email: 'paolo@example.test', quantity: 3, status: 'quoted', target_budget_php: 7600, assigned_to: user.id, created_at: daysAgo(6), pasabuy_quotes: [{ id: 'quote-1', version: 1, item_cost_foreign: 38, fx_rate: 62.5, fx_source: 'Bank reference', weight_kg: 1.2, shipping_method: 'air', freight_rate_foreign_per_kg: 14, customs_tax_percent: 12, handling_php: 150, margin_percent: 40, final_price_php: 4890, valid_until: new Date(Date.now() + 2 * 86400000).toISOString() }] },
    { id: '20000000-0000-4000-8000-000000000004', public_reference: 'PB-260723-H8', item_title: 'Specialty grocery case', customer_name: 'Mika Reyes', customer_email: 'mika@example.test', quantity: 4, status: 'purchasing', target_budget_php: 21800, assigned_to: user.id, created_at: daysAgo(11), pasabuy_quotes: [] },
    { id: '20000000-0000-4000-8000-000000000005', public_reference: 'PB-260718-K4', item_title: 'Home fragrance collection', customer_name: 'Carla Lim', customer_email: 'carla@example.test', quantity: 2, status: 'in_transit', target_budget_php: 9700, assigned_to: user.id, created_at: daysAgo(16), pasabuy_quotes: [] },
  ],
  product_batches: [
    { id: '30000000-0000-4000-8000-000000000001', sku: 'K2-0001', box_code: 'IT-MNL-081', hub: 'Manila', custodian: 'operations', channel: 'Website', quantity: 12, quantity_available: 7, expiry_date: daysAhead(14), best_before_date: null },
    { id: '30000000-0000-4000-8000-000000000002', sku: 'K2-0002', box_code: 'IT-MNL-082', hub: 'Manila', custodian: '', channel: 'Shopee', quantity: 8, quantity_available: 4, expiry_date: daysAhead(25), best_before_date: null },
  ],
  channel_connections: [
    { channel: 'website', display_name: 'K2 Jimzon Website', status: 'live', last_event_at: daysAgo(0), note: 'Verified internal event' },
    { channel: 'pasabuy', display_name: 'K2 Jimzon Pasabuy', status: 'live', last_event_at: daysAgo(1), note: 'Verified internal event' },
    { channel: 'shopee', display_name: 'Shopee Seller Center', status: 'not_connected', last_event_at: null, note: null },
    { channel: 'tiktok', display_name: 'TikTok Shop', status: 'not_connected', last_event_at: null, note: null },
    { channel: 'lazada', display_name: 'Lazada Open Platform', status: 'not_connected', last_event_at: null, note: null },
  ],
  channel_listings: [
    { channel_source: 'website', publication_status: 'published', validation_errors: [], last_synced_at: daysAgo(0), sync_error: null },
    { channel_source: 'website', publication_status: 'published', validation_errors: [], last_synced_at: daysAgo(0), sync_error: null },
    { channel_source: 'shopee', publication_status: 'ready', validation_errors: [], last_synced_at: null, sync_error: null },
    { channel_source: 'shopee', publication_status: 'error', validation_errors: ['missing image'], last_synced_at: null, sync_error: 'Validation failed' },
    { channel_source: 'tiktok', publication_status: 'ready', validation_errors: [], last_synced_at: null, sync_error: null },
    { channel_source: 'lazada', publication_status: 'draft', validation_errors: [], last_synced_at: null, sync_error: null },
  ],
  v_channel_catalog_readiness: [
    { channel: 'shopee', publication_status: 'ready', missing_fields: [] },
    { channel: 'shopee', publication_status: 'draft', missing_fields: ['image'] },
    { channel: 'tiktok', publication_status: 'ready', missing_fields: [] },
    { channel: 'lazada', publication_status: 'draft', missing_fields: ['seller_sku'] },
  ],
  products,
  conversations,
  orders: [],
}

async function installSupabaseFixture(page) {
  const session = {
    access_token: 'visual-test-access-token',
    refresh_token: 'visual-test-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  }

  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: storageKey, value: session })

  await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }))
  await page.route('**/rest/v1/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split('/').pop()

    if (table === 'user_profiles' && (url.searchParams.get('select') || '').includes('email')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: user.id, email: user.email, full_name: 'K2 Operations', role: 'Admin' }]) })
    }

    if (table === 'user_profiles') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'Admin' }) })
    }

    const rows = fixtures[table] || []
    if (request.method() === 'HEAD') {
      let count = rows.length
      if (table === 'order_requests' && url.searchParams.get('status') === 'eq.submitted') count = 4
      if (table === 'orders') count = 3
      if (table === 'products' && url.searchParams.has('stock_available')) count = 7
      return route.fulfill({ status: 200, headers: { 'content-range': count ? `0-${count - 1}/${count}` : '*/0' } })
    }

    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': rows.length ? `0-${rows.length - 1}/${rows.length}` : '*/0' }, body: JSON.stringify(rows) })
  })
}

test.describe('admin command center redesign', () => {
  test.skip(!supabaseUrl, 'Local Supabase environment is required for the protected visual fixture.')

  test.beforeEach(async ({ page }) => {
    await installSupabaseFixture(page)
  })

  test('renders multichannel analytics without desktop overflow', async ({ page }) => {
    test.setTimeout(90000)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/admin-portal-k2-secure', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Operations command center' })).toBeVisible({ timeout: 45000 })
    await expect(page.getByText('Verified revenue trend')).toBeVisible()
    await expect(page.getByText('Channel performance and readiness')).toBeVisible()
    await expect(page.getByText('Inbox workload')).toBeVisible()
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 1440)

    await page.keyboard.press('Alt+s')
    await expect(page.getByRole('dialog', { name: 'What are you scanning?' })).toBeVisible()
    await expect(page.getByText('New product research', { exact: true })).toBeVisible()
    await expect(page.getByText('Pack a customer order', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'What are you scanning?' })).toBeHidden()

    await page.keyboard.press('?')
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.screenshot({ path: 'C:/tmp/k2-admin-command-center-desktop.png', fullPage: true })
  })

  test('collapses safely for mobile operations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/admin-portal-k2-secure', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Operations command center' })).toBeVisible({ timeout: 15000 })
    let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    await expect(page.locator('.pulse-dot').first()).toHaveCSS('animation-name', 'none')
    await page.screenshot({ path: 'C:/tmp/k2-admin-command-center-mobile.png', fullPage: true })

    await page.setViewportSize({ width: 844, height: 390 })
    overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    await expect(page.getByRole('heading', { name: 'Operations command center' })).toBeVisible()
  })

  test('keeps the five operational workspaces readable and overflow-safe', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/admin-portal-k2-secure', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Operations command center' })).toBeVisible({ timeout: 15000 })

    const workspaces = [
      ['Inventory', 'Inventory exception board', 'inventory'],
      ['Pasabuy Quotes', 'Request and quote control', 'pasabuy'],
      ['Fulfillment Hub', 'Order, packing, and custody desk', 'fulfillment'],
      ['Messages', 'Unified message control', 'inbox'],
      ['Channel Readiness', 'Channel readiness board', 'channels'],
    ]

    for (const [nav, heading, slug] of workspaces) {
      await page.getByRole('button', { name: nav, exact: true }).click()
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(1)
      await page.screenshot({ path: `C:/tmp/k2-admin-${slug}-desktop.png`, fullPage: true })
    }
  })

  test('keeps high-frequency workspace controls usable on mobile', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/admin-portal-k2-secure', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Operations command center' })).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'Inventory', exact: true }).last().click()
    await expect(page.getByRole('heading', { name: 'Inventory exception board' })).toBeVisible()
    await expect(page.getByLabel('Search inventory')).toBeVisible()
    await page.screenshot({ path: 'C:/tmp/k2-admin-inventory-mobile.png' })

    await page.getByRole('button', { name: 'Fulfil', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Order, packing, and custody desk' })).toBeVisible()
    await expect(page.getByLabel('Fulfillment work modes')).toBeVisible()

    await page.getByRole('button', { name: 'Messages', exact: true }).last().click()
    await expect(page.getByRole('heading', { name: 'Unified message control' })).toBeVisible()
    await expect(page.getByLabel('Search conversations')).toBeVisible()

    await page.getByRole('button', { name: 'More', exact: true }).click()
    await page.getByRole('button', { name: 'Pasabuy Quotes', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Request and quote control' })).toBeVisible()

    await page.getByRole('button', { name: 'More', exact: true }).click()
    await page.getByRole('button', { name: 'Channel Readiness', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Channel readiness board' })).toBeVisible()
    await page.screenshot({ path: 'C:/tmp/k2-admin-channels-mobile.png' })

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
