import { expect, test } from '@playwright/test'

const SHOP_ID = '20000000-0000-4000-8000-000000000001'
const SESSION_ID = '70000000-0000-4000-8000-000000000001'
const IMPORT_ID = '50000000-0000-4000-8000-000000000001'
const ROW_ID = '51000000-0000-4000-8000-000000000001'

const json = (route, body, status = 200) => route.fulfill({
  status, contentType: 'application/json', body: JSON.stringify(body),
})

test('phone Owner Count & Close reaches a sealed customer-free handoff', async ({ page }) => {
  const pageErrors = []
  const requestFailures = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`))
  let staged = false
  let decided = false
  let ordersStaged = false
  let feeSaved = false
  let stockReviewed = false
  let lotQuantity = 3
  let coverageOverride = null
  let pasabuyReview = null
  let bookkeepingCompleted = false
  const writes = []
  await page.route('**/api/admin/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (request.method() === 'POST') writes.push({ path, body: request.postDataJSON() })

    if (path === '/api/admin/session') return json(route, { ok: true, user: {
      userId: '10000000-0000-4000-8000-000000000002', email: 'owner@example.invalid',
      role: 'Admin', user_metadata: { full_name: 'K2 Owner' },
    } })
    if (path === '/api/admin/products') return json(route, { ok: true, products: [] })
    if (path === '/api/admin/inbox') return json(route, { ok: true, conversations: [] })
    if (path === '/api/admin/overview') return json(route, { ok: true, overview: {} })
    if (path === '/api/admin/owner-close/session' && request.method() === 'GET') {
      return json(route, { ok: true, session: null, shops: [{
        id: SHOP_ID, shopCode: 'shopee-01', channelCode: 'shopee',
        displayName: 'K2 Shopee Main', status: 'not_connected',
      }] })
    }
    if (path === '/api/admin/owner-close/session' && request.method() === 'POST') {
      const body = request.postDataJSON()
      return json(route, { ok: true, session: { ...body.session, sessionId: SESSION_ID, version: 1, status: 'in_progress' } })
    }
    if (path === '/api/admin/marketplace-snapshots/stage') {
      staged = true
      return json(route, { ok: true, result: { importId: IMPORT_ID, status: 'staged' } })
    }
    if (path === '/api/admin/marketplace-snapshots/status') {
      return json(route, { ok: true, status: {
        importId: IMPORT_ID, shopId: SHOP_ID, provider: 'shopee',
        sourceIdentity: 'shopee-01:shopee.synthetic.csv', status: decided ? 'resolved' : 'reviewing',
        rows: [{
          id: ROW_ID, rowNumber: 2, externalItemId: 'SP-ITEM-001', marketplaceSku: 'SP-K2-001',
          title: 'Synthetic Espresso Beans', reportedQuantity: 8, unitPrice: '1250.00',
          listingStatus: 'active', observedAt: '2026-08-31T00:00:00.000Z',
          outcome: 'accepted', matchStatus: decided ? 'unresolved' : 'pending',
          suggestions: [], source: { size: '1 kg' }, errors: [],
        }],
      } })
    }
    if (path === '/api/admin/marketplace-snapshots/decision') {
      decided = true
      return json(route, { ok: true, result: { rowId: ROW_ID, matchStatus: 'unresolved' } })
    }
    if (path === '/api/admin/marketplace-orders/stage') {
      ordersStaged = true
      return json(route, { ok: true, result: { importId: '92000000-0000-4000-8000-000000000001' } })
    }
    if (path === '/api/admin/marketplace-orders/status') {
      return json(route, { ok: true, status: {
        importId: '92000000-0000-4000-8000-000000000001', sessionId: SESSION_ID,
        shopId: SHOP_ID, sourceIdentity: 'shopee-01:lazada.synthetic.csv',
        accepted: 1, duplicates: 0, conflicts: 0, canonicalInventoryChanged: false,
        facts: [{ id: 1, rowNumber: 1, marketplaceSku: 'LZ-K2-001', productId: 'product-1', outcome: 'accepted', matchStatus: 'linked' }],
      } })
    }
    if (path === '/api/admin/owner-close/fees' && request.method() === 'GET') {
      return json(route, { ok: true, fees: {
        sessionId: SESSION_ID,
        shops: [{ id: SHOP_ID, shopCode: 'shopee-01', channelCode: 'shopee', displayName: 'K2 Shopee Main' }],
        orderImports: [{ importId: '92000000-0000-4000-8000-000000000001', shopId: SHOP_ID, sourceIdentity: 'shopee-01:lazada.synthetic.csv', accepted: 1, duplicates: 0, conflicts: 0 }],
        orderFacts: [{ id: 1, shopId: SHOP_ID, externalOrderId: 'LZ-ORDER-001', externalLineId: 'LINE-1', marketplaceSku: 'LZ-K2-001', grossAmount: '2400.00', currency: 'PHP', outcome: 'accepted', matchStatus: 'linked' }],
        latestEstimates: feeSaved ? [{
          estimateId: '93000000-0000-4000-8000-000000000001', shopId: SHOP_ID,
          estimateVersion: 1, policyVersion: 'manual-reviewed-v1', currency: 'PHP',
          grossMinor: 240000, acceptedLines: 1, acceptedOrders: 1, excludedLines: 0,
          commissionMinor: 14400, paymentMinor: 4800, withholdingMinor: 2400,
          fixedMinor: 0, estimatedFeeMinor: 21600, estimatedNetMinor: 218400,
          estimateOnly: true, settlementReconciled: false, officialBooks: false, actualProfit: false,
        }] : [],
      } })
    }
    if (path === '/api/admin/owner-close/fees' && request.method() === 'POST') {
      feeSaved = true
      return json(route, { ok: true, result: { estimateId: '93000000-0000-4000-8000-000000000001', estimateVersion: 1, estimateOnly: true } })
    }
    if (path === '/api/admin/owner-close/stock' && request.method() === 'GET') {
      return json(route, { ok: true, stock: {
        sessionId: SESSION_ID, asOf: new Date().toISOString(),
        products: [{ id: '30000000-0000-4000-8000-000000000001', sku: 'K2-001', name: 'Synthetic Espresso Beans' }],
        lots: [{
          id: '40000000-0000-4000-8000-000000000001', productId: '30000000-0000-4000-8000-000000000001',
          sku: 'K2-001', quantity: lotQuantity, reservedQuantity: 1, boxCode: 'BOX-1', batchCode: 'LOT-1',
          expiryDate: '2027-08-31', landedDate: '2026-08-01', hub: 'Manila', custodian: 'Owner',
          channel: '', pinned: false, status: 'available',
        }],
        observations: [{ productId: '30000000-0000-4000-8000-000000000001', shopId: SHOP_ID, reportedQuantity: 8, observedAt: '2026-08-31T00:00:00Z' }],
        acceptedSales: [{ productId: '30000000-0000-4000-8000-000000000001', shopId: SHOP_ID, units: 1 }],
        reviews: stockReviewed ? [{
          productId: '30000000-0000-4000-8000-000000000001', expectedCanonicalBefore: 3,
          physicalCount: 4, discrepancy: 1, outcome: 'reconciled', version: 1,
        }] : [], observationOnly: true, canonicalMutationRoute: '/api/admin/lots/reconcile',
      } })
    }
    if (path === '/api/admin/lots/reconcile') {
      lotQuantity = request.postDataJSON().lots[0].quantity
      return json(route, { ok: true, result: { sku: 'K2-001' } })
    }
    if (path === '/api/admin/owner-close/stock' && request.method() === 'POST') {
      stockReviewed = true
      return json(route, { ok: true, result: { outcome: 'reconciled', discrepancy: 1, version: 1 } })
    }
    if (path === '/api/admin/owner-close/coverage' && request.method() === 'GET') {
      return json(route, { ok: true, coverage: {
        asOf: '2026-08-31T12:00:00.000Z', targetPerShop: 2, freshnessHours: 72,
        alerts: { zero: 0, low: 1, needsReview: 0, allocationShortfall: 1, criticalMasterZero: 0, exactShopsAffected: 1 },
        rows: [{
          productId: '30000000-0000-4000-8000-000000000001', sku: 'K2-001',
          shopId: SHOP_ID, shopCode: 'shopee-01', shopName: 'K2 Shopee Main',
          reportedQuantity: 1, observedAt: '2026-08-31T00:00:00Z', status: 'thin',
          verifiedRecentSales: 1, proposedAvailability: 1, canonicalEligibleQuantity: 3,
          overrideAction: coverageOverride?.action || null,
          overridePriority: coverageOverride?.priority || null,
          overrideReason: coverageOverride?.reason || null,
          effect: 'proposal_only', providerWrite: false, custodyTransfer: false,
        }],
      } })
    }
    if (path === '/api/admin/owner-close/coverage' && request.method() === 'POST') {
      coverageOverride = request.postDataJSON()
      return json(route, { ok: true, result: { ...coverageOverride, version: 1, effect: 'proposal_only' } })
    }
    if (path === '/api/admin/owner-close/pasabuy' && request.method() === 'GET') {
      return json(route, { ok: true, pasabuy: {
        sessionId: SESSION_ID,
        requests: [{ id: '94000000-0000-4000-8000-000000000001', publicReference: 'PB-202608-001', itemTitle: 'Synthetic Pasabuy item', quantity: 2, status: 'arrived', createdAt: '2026-08-20T00:00:00Z', updatedAt: '2026-08-30T00:00:00Z' }],
        reviews: pasabuyReview ? [{ requestId: '94000000-0000-4000-8000-000000000001', ...pasabuyReview, version: 1 }] : [],
        customerMinimized: true, canonicalPasabuyStatusChanged: false, canonicalPasabuyRoute: '/api/admin/pasabuy',
      } })
    }
    if (path === '/api/admin/owner-close/pasabuy' && request.method() === 'POST') {
      pasabuyReview = request.postDataJSON()
      return json(route, { ok: true, result: { ...pasabuyReview, version: 1, canonicalPasabuyStatusChanged: false } })
    }
    if (path === '/api/admin/owner-close/bookkeeping' && request.method() === 'GET') {
      return json(route, { ok: true, handoff: {
        sessionId: SESSION_ID, periodStart: '2026-08-01', periodEnd: '2026-08-31', timezone: 'Asia/Manila',
        status: bookkeepingCompleted ? 'completed' : 'in_progress', currentStep: 'bookkeeping_handoff', sessionVersion: bookkeepingCompleted ? 2 : 1,
        readyToClose: true, blockers: [], customerMinimized: true, estimateOnly: true,
        officialBooks: false, settlementReconciled: false, actualProfit: false,
        handoff: bookkeepingCompleted ? { artifactId: '95000000-0000-4000-8000-000000000001', artifactVersion: 1 } : null,
        summary: {
          shopCount: 1, shops: [{ shopId: SHOP_ID, shopCode: 'shopee-01', displayName: 'K2 Shopee Main', channelCode: 'shopee', orderImportId: '92000000-0000-4000-8000-000000000001', acceptedLines: 1, duplicateLines: 0, conflictLines: 0, unresolvedLines: 0, feeEstimateId: '93000000-0000-4000-8000-000000000001', feeEstimateVersion: 1, feePolicyVersion: 'manual-reviewed-v1', currency: 'PHP', grossMinor: 240000, estimatedFeeMinor: 21600, estimatedNetMinor: 218400 }],
          stock: { linkedProducts: 1, reviewedProducts: 1, matchedProducts: 0, reconciledProducts: 1, totalPhysicalCount: 4, netDiscrepancy: 1 },
          coverageOverrides: { include: 0, thin: 1, skip: 0 },
          pasabuy: { openRequests: 1, reviewedRequests: 1, ready: 1, notReady: 0, notApplicable: 0 },
        },
      } })
    }
    if (path === '/api/admin/owner-close/bookkeeping' && request.method() === 'POST') {
      bookkeepingCompleted = true
      return json(route, { ok: true, result: { sessionId: SESSION_ID, artifactId: '95000000-0000-4000-8000-000000000001', artifactVersion: 1, status: 'completed', sessionVersion: 2, customerMinimized: true, estimateOnly: true, officialBooks: false, settlementReconciled: false, actualProfit: false } })
    }
    return json(route, { ok: true })
  })

  await page.goto('/admin-portal-k2-secure')
  await page.waitForTimeout(1000)
  expect(pageErrors).toEqual([])
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: /Count & Close/ }).click()
  await expect(page.getByText('Owner operations')).toBeVisible({ timeout: 20_000 })
  expect(pageErrors).toEqual([])
  // React's development StrictMode cancels the first effect request before
  // replaying it. Treat only non-abort network failures as defects.
  expect(requestFailures.filter((failure) => !failure.includes('ERR_ABORTED'))).toEqual([])
  await expect(page.getByRole('heading', { name: 'Owner Count & Close' }).last()).toBeVisible()
  await expect(page.getByText('Reported quantity is observation evidence')).toHaveCount(0)

  await page.getByText('K2 Shopee Main').click()
  await page.getByLabel('Save reason').fill('Close this exact Shopee shop for the August owner review.')
  await page.getByRole('button', { name: 'Save sources & continue' }).click()
  await expect(page.getByText(`Recovery ID: ${SESSION_ID}`)).toBeVisible()

  const sessionWrite = writes.find((item) => item.path === '/api/admin/owner-close/session')
  expect(sessionWrite.body.session.shopIds).toEqual([SHOP_ID])
  expect(sessionWrite.body.session.timezone).toBe('Asia/Manila')
  expect(sessionWrite.body.session.currentStep).toBe('source_import')

  await page.getByLabel('Marketplace CSV').setInputFiles('tests/fixtures/marketplace-snapshots/shopee.synthetic.csv')
  await page.getByLabel('Import reason').fill('Stage the bounded synthetic export for local phone review.')
  await page.getByRole('button', { name: 'Validate & stage snapshot' }).click()
  await expect(page.getByText('3. Make one human product decision')).toBeVisible()
  expect(staged).toBe(true)
  await expect(page.getByRole('radio', { name: /Link existing/ })).toBeVisible()
  await expect(page.getByRole('radio', { name: /Create new Draft/ })).toBeVisible()
  await expect(page.getByRole('radio', { name: /Leave unresolved/ })).toBeVisible()

  await page.getByRole('radio', { name: /Leave unresolved/ }).check()
  await page.getByLabel('Decision reason').fill('No trustworthy canonical identity exists for this synthetic row.')
  await page.getByRole('button', { name: 'Keep unresolved' }).click()
  await expect(page.getByText('Product review checkpoint')).toBeVisible()

  await page.getByLabel('Match checkpoint reason').fill('All retained product rows have an explicit human identity outcome.')
  await page.getByRole('button', { name: 'Continue to sales reconciliation' }).click()
  await expect(page.getByRole('heading', { name: '4. Deduplicate and reconcile sales/order facts' })).toBeVisible()
  await page.getByLabel('Marketplace order CSV').setInputFiles('tests/fixtures/marketplace-orders/lazada.synthetic.csv')
  await page.getByLabel('Order import reason').fill('Stage this customer-free synthetic order export for close reconciliation.')
  await page.getByRole('button', { name: 'Validate & stage order facts' }).click()
  await expect(page.getByText('Accepted order lines')).toBeVisible()
  expect(ordersStaged).toBe(true)
  await expect(page.getByText('Canonical inventory changed: No')).toBeVisible()
  await page.getByLabel('Sales reconciliation reason').fill('Accepted lines are linked and duplicate/conflict evidence has been reviewed.')
  await page.getByRole('button', { name: 'Save sales progress' }).click()
  expect(writes.filter((item) => item.path === '/api/admin/owner-close/session').at(-1).body.session.currentStep).toBe('fee_estimates')
  await expect(page.getByRole('heading', { name: '5. Calculate versioned marketplace fee estimates' })).toBeVisible()
  await expect(page.getByText('Derived preview')).toBeVisible()
  await page.getByLabel('Estimate reason').fill('Use the reviewed manual August policy only as an estimate for this shop.')
  await page.getByRole('button', { name: 'Save estimate version 1' }).click()
  await expect(page.getByText('Estimated', { exact: true })).toBeVisible()
  const feeWrite = writes.find((item) => item.path === '/api/admin/owner-close/fees')
  expect(feeWrite.body).toMatchObject({
    sessionId: SESSION_ID, shopId: SHOP_ID, policyVersion: 'manual-reviewed-v1',
    currency: 'PHP', commissionBasisPoints: 600, paymentBasisPoints: 200,
    withholdingBasisPoints: 100, fixedFeeMinorPerOrder: 0,
  })
  await page.getByLabel('Fee checkpoint reason').fill('Every selected exact shop now has a named reviewed estimate version.')
  await page.getByRole('button', { name: 'Save fee progress' }).click()
  expect(writes.filter((item) => item.path === '/api/admin/owner-close/session').at(-1).body.session.currentStep).toBe('stock_count')
  await expect(page.getByRole('heading', { name: '6. Compare expected stock with physical and canonical stock' })).toBeVisible()
  await expect(page.getByText('Marketplace-reported availability is observation only')).toBeVisible()
  await page.getByLabel('Physical lot count').fill('4')
  await page.getByLabel('Count and discrepancy reason').fill('Physical recount found one additional unit in this exact labelled lot.')
  await page.getByRole('button', { name: 'Reconcile exact lots & record review' }).click()
  await expect(page.getByText('Count review saved · reconciled · version 1')).toBeVisible()
  expect(writes.find((item) => item.path === '/api/admin/lots/reconcile').body).toMatchObject({
    sku: 'K2-001', lots: [{ id: '40000000-0000-4000-8000-000000000001', quantity: 4 }],
  })
  expect(writes.find((item) => item.path === '/api/admin/owner-close/stock').body).toMatchObject({
    sessionId: SESSION_ID, productId: '30000000-0000-4000-8000-000000000001',
    expectedCanonicalBefore: 3, physicalCount: 4,
  })
  await page.getByLabel('Stock checkpoint reason').fill('Every linked product has a durable physical count and exact-lot outcome.')
  await page.getByRole('button', { name: 'Save count progress' }).click()
  expect(writes.filter((item) => item.path === '/api/admin/owner-close/session').at(-1).body.session.currentStep).toBe('coverage_review')
  await expect(page.getByRole('heading', { name: '8. Review flexible per-shop coverage and low/zero warnings' })).toBeVisible()
  await expect(page.getByText('Proposal only. Provider write: No. Custody transfer: No.')).toBeVisible()
  await page.getByRole('radio', { name: 'Thin to one' }).check()
  await page.getByLabel('Priority').fill('1')
  await page.getByLabel('Override reason').fill('Keep one unit in this exact shop and review again after the next close.')
  await page.getByRole('button', { name: 'Save coverage override' }).click()
  expect(writes.find((item) => item.path === '/api/admin/owner-close/coverage').body).toMatchObject({
    sessionId: SESSION_ID, shopId: SHOP_ID, action: 'thin', priority: 1,
  })
  await page.getByLabel('Coverage checkpoint reason').fill('Exact-shop states, scarcity proposal, shortfalls, and overrides were reviewed.')
  await page.getByRole('button', { name: 'Save coverage progress' }).click()
  expect(writes.filter((item) => item.path === '/api/admin/owner-close/session').at(-1).body.session.currentStep).toBe('pasabuy_boxing')
  await expect(page.getByRole('heading', { name: '9. Check customer-minimized Pasabuy boxing readiness' })).toBeVisible()
  await expect(page.getByText('Canonical Pasabuy status changed: No.')).toBeVisible()
  await page.getByLabel('Boxing readiness reason').fill('The labelled item and quantity are physically present in the boxing area.')
  await expect(page.getByRole('button', { name: 'Save readiness review' })).toBeEnabled()
  await page.getByRole('button', { name: 'Save readiness review' }).click()
  await expect.poll(() => writes.find((item) => item.path === '/api/admin/owner-close/pasabuy')?.body).toEqual({
    sessionId: SESSION_ID, requestId: '94000000-0000-4000-8000-000000000001',
    readiness: 'ready', reason: 'The labelled item and quantity are physically present in the boxing area.',
  })
  await page.getByLabel('Pasabuy checkpoint reason').fill('Every open customer-minimized Pasabuy request has a boxing readiness review.')
  await page.getByRole('button', { name: 'Save Pasabuy progress' }).click()
  expect(writes.filter((item) => item.path === '/api/admin/owner-close/session').at(-1).body.session.currentStep).toBe('bookkeeping_handoff')
  await expect(page.getByRole('heading', { name: '10. Prepare the customer-free bookkeeping handoff' })).toBeVisible()
  await expect(page.getByText('Estimate-only operational handoff.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download customer-free CSV' })).toBeEnabled()
  await page.getByLabel('Completion reason').fill('Every prerequisite and the customer-free estimate-only extract were reviewed.')
  await page.getByRole('button', { name: 'Complete close & seal handoff' }).click()
  await expect.poll(() => writes.find((item) => item.path === '/api/admin/owner-close/bookkeeping')?.body).toEqual({
    sessionId: SESSION_ID, expectedSessionVersion: 1,
    reason: 'Every prerequisite and the customer-free estimate-only extract were reviewed.',
  })
  await expect(page.getByText(/Close completed with durable handoff evidence/)).toBeVisible()

  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }))
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport)
  const undersized = await page.locator('button:visible, input:visible, select:visible').evaluateAll((nodes) => nodes
    .filter((node) => !node.disabled)
    .map((node) => ({ label: node.getAttribute('aria-label') || node.textContent?.trim() || node.getAttribute('type'), rect: node.getBoundingClientRect() }))
    .filter((item) => item.rect.width < 44 || item.rect.height < 44))
  expect(undersized).toEqual([])

  await page.screenshot({ path: 'test-results/owner-count-close-phone.png', fullPage: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 812, height: 375 })
  const landscapeDimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }))
  expect(landscapeDimensions.width).toBeLessThanOrEqual(landscapeDimensions.viewport)
})
