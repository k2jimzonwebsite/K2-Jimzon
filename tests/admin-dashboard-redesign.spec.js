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

    if (table === 'product_intake_sessions') {
      const session = {
        id: '40000000-0000-4000-8000-000000000001',
        status: 'active',
        checklist_step: 'identify',
        packaging_images: [],
        evidence_checklist: {},
        inventory_result: null,
      }
      const body = request.method() === 'GET' ? [] : {
        ...session,
        checklist_step: request.method() === 'PATCH' ? 'packaging_evidence' : session.checklist_step,
      }
      return route.fulfill({
        status: request.method() === 'POST' ? 201 : 200,
        contentType: 'application/json',
        headers: { 'content-range': request.method() === 'GET' ? '*/0' : '0-0/1' },
        body: JSON.stringify(body),
      })
    }

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
    await page.addInitScript(() => {
      window.turnstile = {
        render: (_, options) => { options.callback('verified-admin-test-token'); return 1 },
        remove: () => {},
      }
    })
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

  test('keeps Wholesale inquiry triage honest and usable at 375px', async ({ page }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/admin-portal-k2-secure', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Operations command center' })).toBeVisible({ timeout: 45000 })
    await page.evaluate(async () => {
      const [reactModule,reactDomClientModule,wholesaleModule]=await Promise.all([
        import('/@id/react'),import('/@id/react-dom/client'),import('/src/views/admin/Customers.jsx'),
      ])
      const React=reactModule.default||reactModule
      const createRoot=reactDomClientModule.createRoot||reactDomClientModule.default?.createRoot
      const app=document.getElementById('root'); if(app) app.style.display='none'
      const mount=document.createElement('div'); mount.id='wholesale-visual-harness'; mount.className='min-h-screen bg-adm-bg p-3 text-white'; document.body.appendChild(mount)
      const inquiry={publicReference:'WI-0123456789ABCDEF',conversationReference:'CV-0123456789ABCDEF',organizationName:'Launch Test Cafe',businessType:'cafe_restaurant',contactName:'Maria Buyer',contactRole:'Owner',email:'wholesale@example.test',phone:null,volumeBand:'starter',deliveryArea:'Makati City',targetItems:'Coffee beans and pantry items, approximately 30 units.',customerNotes:'Opening a second branch.',status:'submitted',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}
      function Harness(){
        const [selected,setSelected]=React.useState(null); const [status,setStatus]=React.useState('under_review'); const [reason,setReason]=React.useState('')
        return React.createElement(React.Fragment,null,
          React.createElement(wholesaleModule.WholesaleInquirySection,{secure:true,inquiryError:'',loading:false,inquiries:[inquiry],onReview:setSelected}),
          selected&&React.createElement(wholesaleModule.WholesaleReviewDialog,{inquiry:selected,status,setStatus,reason,setReason,error:'',saving:false,onClose:()=>setSelected(null),onSubmit:event=>{event.preventDefault();window.__wholesaleReview={status,reason}}}),
        )
      }
      createRoot(mount).render(React.createElement(Harness))
    })
    await expect(page.getByRole('heading', { name: 'Wholesale inquiries' })).toBeVisible()
    await expect(page.getByText('Inquiry only · no commercial approval')).toBeVisible()
    await page.getByRole('button', { name: 'Review inquiry' }).click()
    await expect(page.getByRole('dialog', { name: 'Review Launch Test Cafe' })).toBeVisible()
    await expect(page.getByText('It cannot approve a buyer, price, credit, stock, terms, or delivery.')).toBeVisible()
    await page.getByLabel('Reason').fill('Contact need verified; continue staff review only.')
    await page.getByRole('button', { name: 'Record status' }).click()
    await expect.poll(()=>page.evaluate(()=>window.__wholesaleReview)).toEqual({status:'under_review',reason:'Contact need verified; continue staff review only.'})
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    await page.screenshot({path:'C:/tmp/k2-admin-wholesale-review-mobile.png',fullPage:true})
  })

  test('keeps Globe review evidence and publication controls usable at 375px', async ({ page }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.route('**/api/admin/globe-cms', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, cms: {
          globeProducts: [{ productId: 'rio-mare', enabled: true, heroImage: null, displayOrder: 0, version: 1 }],
          reviews: [{ id: '00000000-0000-4000-8000-000000000071', productId: 'rio-mare', name: 'Verified buyer', channel: 'Shopee · verified', stars: 5, text: 'The package arrived safely and matched the listing.', item: 'Rio Mare tuna', reviewDate: '2026-08-20', status: 'draft', sourceKind: 'verified_marketplace', sourceReference: 'SHOPEE-ORDER-1042', rightsBasis: 'marketplace_publication', version: 1 }],
        } }) })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, result: {} }) })
    })
    await page.goto('/admin-portal-k2-secure', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Operations command center' })).toBeVisible({ timeout: 45000 })
    await page.evaluate(async () => {
      const [reactModule, reactDomClientModule, globeModule] = await Promise.all([
        import('/@id/react'), import('/@id/react-dom/client'), import('/src/views/admin/GlobeCms.jsx'),
      ])
      const React = reactModule.default || reactModule
      const createRoot = reactDomClientModule.createRoot || reactDomClientModule.default?.createRoot
      const app = document.getElementById('root'); if (app) app.style.display = 'none'
      const mount = document.createElement('main'); mount.className = 'min-h-[100dvh] bg-adm-bg p-3 text-white'; document.body.appendChild(mount)
      createRoot(mount).render(React.createElement(globeModule.GlobeCmsWorkspace, { canManagePublicClaims: true, secureMode: true }))
    })
    await expect(page.getByRole('heading', { name: 'Public claim control' })).toBeVisible()
    await page.getByRole('tab', { name: 'Review claims' }).click()
    await expect(page.getByText('SHOPEE-ORDER-1042')).toBeVisible()
    await page.getByRole('button', { name: 'Add attributable draft' }).click()
    await expect(page.getByText('Saving never publishes')).toBeVisible()
    await expect(page.getByLabel('Private source reference')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('button', { name: 'Publish' }).click()
    const dialog = page.getByRole('dialog', { name: 'Publish this review claim?' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Close dialog' })).toBeFocused()
    await dialog.getByLabel('Reason').fill('Evidence and rights reviewed by Admin.')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: 'C:/tmp/k2-admin-globe-review-mobile.png', fullPage: true })
  })

  test('keeps supplier evidence and unavailable procurement powers clear at 375px', async ({ page }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.route('**/api/admin/procurement', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, procurement: { suppliers: [{ id: '00000000-0000-4000-8000-000000000081', name: 'Verified Italia Supplier', contactEmail: 'supply@example.test', leadTimeDays: 14, performanceScore: null, outstandingBalance: 0 }], purchaseOrders: [], purchaseOrderCreationAvailable: false, receivingAvailable: false } }) }))
    await page.goto('/admin-portal-k2-secure', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Operations command center' })).toBeVisible({ timeout: 45000 })
    await page.evaluate(async () => {
      const [reactModule, reactDomClientModule, supplierModule] = await Promise.all([import('/@id/react'), import('/@id/react-dom/client'), import('/src/views/admin/Suppliers.jsx')])
      const React = reactModule.default || reactModule; const createRoot = reactDomClientModule.createRoot || reactDomClientModule.default?.createRoot
      const app = document.getElementById('root'); if (app) app.style.display = 'none'
      const mount = document.createElement('main'); mount.className = 'min-h-[100dvh] bg-adm-bg p-3 text-white'; document.body.appendChild(mount)
      createRoot(mount).render(React.createElement(supplierModule.default, { canCreateSupplier: true, secureMode: true }))
    })
    await expect(page.getByRole('heading', { name: 'Suppliers & purchase orders' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Verified Italia Supplier' })).toBeVisible()
    await expect(page.getByText('Creation and batch-aware receiving remain unavailable.')).toBeVisible()
    await page.getByRole('button', { name: 'Add supplier' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add verified supplier' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Close supplier dialog' })).toBeFocused()
    await expect(dialog.getByText('does not approve pricing or create a purchase order')).toBeVisible()
    await dialog.getByLabel('Reason and source').fill('Verified contact record reviewed by Admin.')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: 'C:/tmp/k2-admin-supplier-mobile.png', fullPage: true })
  })

  test('keeps signed channel evidence and connector truth usable at 375px', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.route('**/api/admin/channels', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, channels: { connections: [
      { channel: 'website', displayName: 'K2 Jimzon Website', status: 'not_connected', lastEventAt: null, note: 'No reconciled event.' },
      { channel: 'pasabuy', displayName: 'K2 Jimzon Pasabuy', status: 'live', lastEventAt: '2026-08-22T00:00:00Z', note: 'Verified PB-100.' },
      { channel: 'shopee', displayName: 'Shopee', status: 'not_connected' },
      { channel: 'tiktok', displayName: 'TikTok Shop', status: 'not_connected' },
      { channel: 'lazada', displayName: 'Lazada', status: 'not_connected' },
    ], readiness: [{ channel: 'shopee', total: 40, ready: 0, incomplete: 40, published: 0 }], externalConnectorsActivated: false, pollAfterSeconds: 30 } }) }))
    await page.goto('/admin-portal-k2-secure', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Operations command center' })).toBeVisible({ timeout: 45000 })
    await page.evaluate(async () => {
      const [reactModule, reactDomClientModule, channelModule] = await Promise.all([import('/@id/react'), import('/@id/react-dom/client'), import('/src/views/admin/ChannelIntegrations.jsx')])
      const React = reactModule.default || reactModule; const createRoot = reactDomClientModule.createRoot || reactDomClientModule.default?.createRoot
      const app = document.getElementById('root'); if (app) app.style.display = 'none'
      const mount = document.createElement('main'); mount.className = 'min-h-[100dvh] bg-adm-bg p-3 text-white'; document.body.appendChild(mount)
      createRoot(mount).render(React.createElement(channelModule.default, { secureMode: true }))
    })
    await expect(page.getByRole('heading', { name: 'Channel readiness board' })).toBeVisible()
    await expect(page.getByText('External marketplaces are not connected.')).toBeVisible()
    await page.getByRole('button', { name: 'Verify real event' }).click()
    const dialog = page.getByRole('dialog', { name: 'Verify K2 Jimzon Website' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Close verification dialog' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: 'C:/tmp/k2-admin-channel-boundary-mobile.png', fullPage: true })
  })

  test('keeps staff privilege changes reasoned and recoverable at 375px', async ({ page }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.route('**/api/admin/staff-access', async route => {
      const request = route.request()
      const body = request.method() === 'POST'
        ? { ok: true, result: { profile: { id: '00000000-0000-4000-8000-000000000092', email: 'staff@example.test', fullName: 'Staff Member', role: 'Staff' } } }
        : { ok: true, staffAccess: { profiles: [
          { id: user.id, email: user.email, fullName: 'K2 Operations', role: 'Admin', createdAt: '2026-01-01T00:00:00Z' },
          { id: '00000000-0000-4000-8000-000000000092', email: 'staff@example.test', fullName: 'Staff Member', role: 'Admin', createdAt: '2026-02-01T00:00:00Z' },
        ], hasDeletePin: true, currentSessionAal2: true, invitationAvailable: true, mfaEnrollmentAvailable: false } }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(async () => {
      const [reactModule, reactDomClientModule, staffModule] = await Promise.all([import('/@id/react'), import('/@id/react-dom/client'), import('/src/views/admin/StaffPermissionManager.jsx')])
      const React = reactModule.default || reactModule; const createRoot = reactDomClientModule.createRoot || reactDomClientModule.default?.createRoot
      const app = document.getElementById('root'); if (app) app.style.display = 'none'
      const mount = document.createElement('main'); mount.className = 'min-h-[100dvh] bg-adm-bg p-3 text-white'; document.body.appendChild(mount)
      createRoot(mount).render(React.createElement(staffModule.default, { secureMode: true, runtime: {
        user: { id: '8b185c31-66f7-49fd-81d0-4f36a38b9812' },
        inviteStaff: async (email, role, reason) => {
          window.__staffInvite = { email, role, reason }
          return { ok: true, note: `Invite sent to ${email}; the ${role} role was assigned.` }
        },
      } }))
    })
    await expect(page.getByRole('heading', { name: 'Staff & roles' })).toBeVisible()
    await page.getByLabel('Email address').fill('new.staff@example.test')
    await page.getByLabel('Reason for this invitation').fill('Add a warehouse operator for daily receiving.')
    await page.getByRole('button', { name: 'Send invite' }).click()
    await expect(page.getByText('Invite sent to new.staff@example.test; the Staff role was assigned.')).toBeVisible()
    expect(await page.evaluate(() => window.__staffInvite)).toEqual({
      email: 'new.staff@example.test', role: 'Staff', reason: 'Add a warehouse operator for daily receiving.',
    })
    await page.getByLabel('Change role').nth(1).selectOption('Staff')
    const dialog = page.getByRole('dialog', { name: 'Change role to Staff' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Close role change dialog' })).toBeFocused()
    await dialog.getByLabel('Reason for this access change').fill('Limit this account to daily operations.')
    await dialog.getByRole('button', { name: 'Change to Staff' }).click()
    await expect(page.getByText('Role updated with an attributable reason.')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: 'C:/tmp/k2-admin-staff-access-mobile.png', fullPage: true })
  })

  test('lets an invited staff account enroll an authenticator through the secure pending session at 375px', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(async () => {
      const [reactModule, reactDomClientModule, authModule] = await Promise.all([
        import('/@id/react'), import('/@id/react-dom/client'), import('/src/views/admin/AdminAuthModal.jsx'),
      ])
      const React = reactModule.default || reactModule
      const createRoot = reactDomClientModule.createRoot || reactDomClientModule.default?.createRoot
      const app = document.getElementById('root'); if (app) app.style.display = 'none'
      const mount = document.createElement('main'); document.body.appendChild(mount)
      const runtime = {
        loginAdmin: async credentials => {
          window.__adminLoginRequest = credentials
          return { ok: false, enrollmentRequired: true }
        },
        enrollMfa: async () => ({
          ok: true, factorId: '40000000-0000-4000-8000-000000000004',
          qr: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTYgMTZoNDh2NDhIMTZ6TTk2IDE2aDQ4djQ4SDk2ek0xNiA5Nmg0OHY0OEgxNnoiIGZpbGw9ImJsYWNrIi8+PC9zdmc+',
          secret: 'JBSWY3DPEHPK3PXP',
        }),
        verifyMfaEnroll: async (factorId, code) => {
          window.__mfaEnrollment = { factorId, code }
          return { ok: true }
        },
        challengeMfa: async () => ({ ok: false }), adminOAuthAvailable: false,
        mfaRequired: false, authError: '', adminBotChallengeRequired: true,
      }
      createRoot(mount).render(React.createElement(authModule.AdminAuthForm, { runtime, isOpen: true, onClose: () => {} }))
    })
    await page.getByLabel('Email').fill('new.staff@example.test')
    await page.getByLabel('Password').fill('correct-horse-battery-staple')
    await expect(page.getByText('Complete this check before K2 verifies staff credentials.')).toBeVisible()
    await page.getByRole('button', { name: 'Sign in' }).click()
    expect(await page.evaluate(() => window.__adminLoginRequest)).toEqual({
      email: 'new.staff@example.test', password: 'correct-horse-battery-staple',
      botToken: 'verified-admin-test-token',
    })
    await expect(page.getByRole('heading', { name: 'Set up your authenticator' })).toBeVisible()
    await expect(page.getByAltText('Authenticator setup QR code')).toBeVisible()
    await expect(page.getByText('JBSWY3DPEHPK3PXP')).toBeVisible()
    await page.getByLabel('Six-digit verification code').fill('481209')
    await page.getByRole('button', { name: 'Verify and enter Admin' }).click()
    expect(await page.evaluate(() => window.__mfaEnrollment)).toEqual({
      factorId: '40000000-0000-4000-8000-000000000004', code: '481209',
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: 'C:/tmp/k2-admin-mfa-enrollment-mobile.png', fullPage: true })
  })

  test('requests and completes staff password recovery without account enumeration at 375px', async ({ page }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(async () => {
      window.history.replaceState({}, '', '/?recovery=invalid')
      const [reactModule, reactDomClientModule, authModule] = await Promise.all([
        import('/@id/react'), import('/@id/react-dom/client'), import('/src/views/admin/AdminAuthModal.jsx'),
      ])
      const React = reactModule.default || reactModule
      const createRoot = reactDomClientModule.createRoot || reactDomClientModule.default?.createRoot
      const app = document.getElementById('root'); if (app) app.style.display = 'none'
      const mount = document.createElement('main'); document.body.appendChild(mount)
      const runtime = {
        loginAdmin: async () => ({ ok: false }), challengeMfa: async () => ({ ok: false }),
        requestPasswordRecovery: async (email, botToken) => {
          window.__passwordRecoveryRequest = { email, botToken }
          return { ok: true }
        },
        completePasswordRecovery: async password => {
          window.__passwordRecoveryComplete = { password }
          return { ok: true }
        },
        adminOAuthAvailable: false, mfaRequired: false, authError: '', adminBotChallengeRequired: true,
      }
      createRoot(mount).render(React.createElement(authModule.AdminAuthForm, {
        runtime, isOpen: true, onClose: () => {},
      }))
    })

    await expect(page.getByText('This recovery link is invalid, expired, or already used. Request a new link.')).toBeVisible()
    await page.getByRole('button', { name: 'Forgot password?' }).click()
    await expect(page.getByRole('heading', { name: 'Reset staff password' })).toBeVisible()
    await page.getByLabel('Staff email').fill('unknown.staff@example.test')
    await expect(page.getByText('Complete this check before K2 requests a staff recovery email.')).toBeVisible()
    await page.screenshot({ path: 'C:/tmp/k2-admin-auth-turnstile-mobile.png', fullPage: true })
    await page.getByRole('button', { name: 'Send recovery email' }).click()
    await expect(page.getByText('If that email belongs to an invited staff account, a recovery link is on its way.')).toBeVisible()
    expect(await page.evaluate(() => window.__passwordRecoveryRequest)).toEqual({
      email: 'unknown.staff@example.test', botToken: 'verified-admin-test-token',
    })

    await page.evaluate(() => window.history.replaceState({}, '', '/?recovery=ready'))
    await page.getByRole('button', { name: 'Use recovery link' }).click()
    expect(await page.evaluate(() => window.location.search)).toBe('')
    await page.getByLabel('New password', { exact: true }).fill('long-company-password')
    await page.getByLabel('Confirm new password').fill('long-company-password')
    await page.getByRole('button', { name: 'Set new password' }).click()
    await expect(page.getByText('Password changed. Sign in again with your new password and authenticator.')).toBeVisible()
    expect(await page.evaluate(() => window.__passwordRecoveryComplete)).toEqual({ password: 'long-company-password' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: 'C:/tmp/k2-admin-password-recovery-mobile.png', fullPage: true })
    await page.setViewportSize({ width: 812, height: 375 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: 'C:/tmp/k2-admin-password-recovery-landscape.png', fullPage: true })
  })

  test('replaces an active Admin authenticator with a reason and keeps recovery honest at 375px', async ({ page }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.route('**/api/admin/staff-access', async route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, staffAccess: {
        profiles: [{ id: user.id, email: user.email, fullName: 'K2 Operations', role: 'Admin', createdAt: '2026-01-01T00:00:00Z' }],
        hasDeletePin: true, currentSessionAal2: true, invitationAvailable: false, mfaReplacementAvailable: true,
      } }),
    }))
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(async userId => {
      const [reactModule, reactDomClientModule, staffModule] = await Promise.all([
        import('/@id/react'), import('/@id/react-dom/client'), import('/src/views/admin/StaffPermissionManager.jsx'),
      ])
      const React = reactModule.default || reactModule
      const createRoot = reactDomClientModule.createRoot || reactDomClientModule.default?.createRoot
      const app = document.getElementById('root'); if (app) app.style.display = 'none'
      const mount = document.createElement('main'); mount.className = 'min-h-[100dvh] bg-adm-bg p-3 text-white'; document.body.appendChild(mount)
      createRoot(mount).render(React.createElement(staffModule.default, { secureMode: true, runtime: {
        user: { id: userId },
        startMfaReplacement: async reason => {
          window.__mfaReplacementStart = { reason }
          return { ok: true, replacement: {
            replacementId: '50000000-0000-4000-8000-000000000005',
            previousFactorId: '60000000-0000-4000-8000-000000000006',
            factorId: '70000000-0000-4000-8000-000000000007',
            qr: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTYgMTZoNDh2NDhIMTZ6TTk2IDE2aDQ4djQ4SDk2ek0xNiA5Nmg0OHY0OEgxNnoiIGZpbGw9ImJsYWNrIi8+PC9zdmc+',
            secret: 'JBSWY3DPEHPK3PXP', reason,
          } }
        },
        completeMfaReplacement: async replacement => {
          window.__mfaReplacementComplete = replacement
          return { ok: true }
        },
      } }))
    }, user.id)
    await page.getByRole('button', { name: 'Replace authenticator' }).click()
    const dialog = page.getByRole('dialog', { name: 'Replace authenticator' })
    await expect(dialog.getByRole('button', { name: 'Close authenticator replacement' })).toBeFocused()
    await expect(dialog.getByText('Lost access to the current authenticator?')).toBeVisible()
    await dialog.getByLabel('Reason for replacing your authenticator').fill('Moving Admin MFA to the company-managed phone.')
    await dialog.getByRole('button', { name: 'Start secure replacement' }).click()
    await expect(dialog.getByAltText('New authenticator setup QR code')).toBeVisible()
    await expect(dialog.getByText('Keep your current authenticator until this replacement succeeds.', { exact: true })).toBeVisible()
    await page.screenshot({ path: 'C:/tmp/k2-admin-mfa-replacement-mobile.png' })
    await dialog.getByLabel('Six-digit code from the new authenticator').fill('481209')
    await dialog.getByRole('button', { name: 'Verify and replace authenticator' }).click()
    expect(await page.evaluate(() => window.__mfaReplacementStart)).toEqual({ reason: 'Moving Admin MFA to the company-managed phone.' })
    expect(await page.evaluate(() => window.__mfaReplacementComplete)).toMatchObject({
      replacementId: '50000000-0000-4000-8000-000000000005', code: '481209',
    })
    await expect(page.getByText('Authenticator replaced. Your previous factor is no longer active.')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  })

  test('keeps protected system readiness boolean-only and recoverable at 375px', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.route('**/api/admin/system-readiness', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, readiness: {
      serverBoundary: true, currentSessionAal2: true, databaseAccess: true,
      orderRequestsPresent: true, channelBoundaryPresent: true, staffBoundaryPresent: true,
      sessionRegistryPresent: true, securityEventBoundaryPresent: true,
      rawDiagnosticsExposed: false, providerHealthVerified: false, deploymentLatencyVerified: false,
    } }) }))
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(async () => {
      const [reactModule, reactDomClientModule, readinessModule] = await Promise.all([import('/@id/react'), import('/@id/react-dom/client'), import('/src/views/admin/SystemDevOpsModal.jsx')])
      const React = reactModule.default || reactModule; const createRoot = reactDomClientModule.createRoot || reactDomClientModule.default?.createRoot
      const app = document.getElementById('root'); if (app) app.style.display = 'none'
      const mount = document.createElement('main'); mount.className = 'min-h-[100dvh] bg-adm-bg text-white'; document.body.appendChild(mount)
      function Harness() { const [open, setOpen] = React.useState(true); return React.createElement(readinessModule.default, { isOpen: open, onClose: () => setOpen(false), secureMode: true }) }
      createRoot(mount).render(React.createElement(Harness))
    })
    const dialog = page.getByRole('dialog', { name: 'System readiness' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Close system readiness' })).toBeFocused()
    await expect(dialog.getByText('Same-origin server boundary verified this request')).toBeVisible()
    await expect(dialog.getByText('These checks do not prove')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: 'C:/tmp/k2-admin-system-readiness-mobile.png', fullPage: true })
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('keeps product-media validation and recovery usable at 375px', async ({ page }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/admin-portal-k2-secure', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Operations command center' })).toBeVisible({ timeout: 45000 })
    await page.evaluate(async () => {
      const [reactModule, reactDomClientModule, mediaModule] = await Promise.all([
        import('/@id/react'), import('/@id/react-dom/client'),
        import('/src/views/admin/PhotoManagerModal.jsx'),
      ])
      const React = reactModule.default || reactModule
      const createRoot = reactDomClientModule.createRoot || reactDomClientModule.default?.createRoot
      const app = document.getElementById('root'); if (app) app.style.display = 'none'
      const mount = document.createElement('main')
      mount.className = 'min-h-[100dvh] bg-adm-bg p-4 text-white'
      document.body.appendChild(mount)
      createRoot(mount).render(React.createElement(mediaModule.default, {
        product: { sku: 'K2-MEDIA-001', primary_image_url: 'https://example.test/product.jpg', lifestyle_images: [], secondary_images: [] },
        onClose: () => { window.__photoManagerClosed = true }, onSave: () => {},
      }))
    })
    await expect(page.getByRole('dialog', { name: 'Product photos' })).toBeVisible()
    await expect(page.getByText('transitional staff database path')).toBeVisible()
    await page.getByRole('button', { name: 'Remove Primary storefront photo 1' }).click()
    const input = page.getByLabel('Primary storefront photo')
    await expect(input).toBeVisible()
    await expect(page.getByText('JPEG, PNG or WebP · 4 MB max').first()).toBeVisible()
    await input.setInputFiles({
      name: 'unsafe.svg', mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg><script>alert(1)</script></svg>'),
    })
    await expect(page.getByRole('alert')).toContainText('not supported')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('alertdialog', { name: 'Discard unsaved photo changes' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    await page.screenshot({ path: 'C:/tmp/k2-admin-product-media-mobile.png', fullPage: true })
    await page.getByRole('button', { name: 'Discard changes' }).click()
    await page.route('**/api/admin/product-media/orphans*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          ok: true,
          review: { items: [{
            objectPath: '00000000-0000-4000-8000-000000000001/product-media/f8f55374-e8c2-42f0-9c8c-ce8c65efc4f7-aaaaaaaaaaaaaaaa.jpg',
            createdAt: '2026-08-22T06:00:00.000Z', contentType: 'image/jpeg', size: 2048,
          }] },
        }) })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, cleanupPending: true }) })
      }
    })
    await page.evaluate(async () => {
      const [reactModule, reactDomClientModule, cleanupModule] = await Promise.all([
        import('/@id/react'), import('/@id/react-dom/client'),
        import('/src/views/admin/ProductMediaCleanupModal.jsx'),
      ])
      const React = reactModule.default || reactModule
      const createRoot = reactDomClientModule.createRoot || reactDomClientModule.default?.createRoot
      const mount = document.createElement('main')
      document.body.appendChild(mount)
      createRoot(mount).render(React.createElement(cleanupModule.default, { onClose: () => {} }))
    })
    await expect(page.getByRole('dialog', { name: 'Unused verified uploads' })).toBeVisible()
    await expect(page.getByText('Only receipt-backed files older than one hour')).toBeVisible()
    await page.getByRole('checkbox').check()
    await page.getByLabel('Cleanup reason').fill('Remove abandoned verified upload after review.')
    await page.getByRole('button', { name: 'Remove 1 unused' }).click()
    await expect(page.getByText('Storage has not confirmed completion')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry cleanup' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: 'C:/tmp/k2-admin-product-media-cleanup-mobile.png', fullPage: true })
  })

  test('keeps phone product intake usable, truthful, and recoverable at 375px', async ({ page, context }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/admin-portal-k2-secure', { waitUntil: 'domcontentloaded' })
    await page.evaluate(async () => {
      const [reactModule, reactDomClientModule, { default: ProductIntakeSessionModal }] = await Promise.all([
        import('/@id/react'),
        import('/@id/react-dom/client'),
        import('/src/views/admin/ProductIntakeSessionModal.jsx'),
      ])
      const React = reactModule.default || reactModule
      const createRoot = reactDomClientModule.createRoot || reactDomClientModule.default?.createRoot
      const app = document.getElementById('root')
      if (app) app.style.display = 'none'
      const fixture = document.createElement('div')
      fixture.id = 'product-intake-browser-fixture'
      document.body.appendChild(fixture)
      const root = createRoot(fixture)
      function IntakeFixture() {
        const [open, setOpen] = React.useState(true)
        return React.createElement(ProductIntakeSessionModal, {
          isOpen: open,
          onClose: () => setOpen(false),
        })
      }
      root.render(React.createElement(IntakeFixture))
    })

    const dialog = page.getByRole('dialog', { name: 'Phone-First Product Intake' })
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('button', { name: 'Close product intake' })).toBeFocused()
    await expect(page.getByLabel('Product barcode, SKU, or name')).toBeVisible()
    const overflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)

    await context.setOffline(true)
    await expect(dialog.getByRole('status')).toContainText('Offline.')
    await page.getByLabel('Product barcode, SKU, or name').fill('800123456789')
    await page.getByRole('button', { name: 'Check Duplicate' }).click()
    await expect(dialog.getByRole('alert')).toContainText('Reconnect before checking for duplicate products')

    await context.setOffline(false)
    await expect(dialog.getByRole('status')).toBeHidden()

    await page.route('**/rest/v1/products*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '*/0' },
      body: '[]',
    }))
    await page.getByRole('button', { name: 'Check Duplicate' }).click()
    await expect(dialog.getByText('Verified New Product Candidate', { exact: false })).toBeVisible()
    await dialog.getByRole('button', { name: 'Next' }).click()
    await expect(dialog.getByText('If camera access is unavailable or denied', { exact: false })).toBeVisible()

    await page.route('**/storage/v1/object/**', route => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'fabricated provider failure' }),
    }))
    await page.getByLabel('Front Package evidence photo').setInputFiles({
      name: 'front-package.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fabricated-image-fixture'),
    })
    await expect(dialog.getByRole('alert')).toContainText('evidence photo was not uploaded')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
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
