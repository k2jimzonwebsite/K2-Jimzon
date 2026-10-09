import { expect, test } from '@playwright/test'

test('legacy CSV upload stages a synthetic unpublished Draft without stock writes', async ({ page }) => {
  const requests = []
  await page.route('https://fixture.supabase.co/**', async (route) => {
    const request = route.request()
    if (request.url().includes('/rest/v1/products') && request.method() === 'POST') {
      requests.push({ url: request.url(), rows: request.postDataJSON() })
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.goto('/tests/fixtures/payment-harness.html?csv=1')
  await page.getByRole('button', { name: 'Open catalog CSV review' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Bulk CSV Import' })).toBeVisible()
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'synthetic-catalog.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('sku,name,description,srp,wholesale_price\nK2-SYNTHETIC-CSV-20260929,Synthetic CSV fixture,Test only,0,0\n'),
  })
  await dialog.getByRole('button', { name: 'Import 1 Rows' }).click()
  await expect.poll(() => requests.length).toBe(1)
  expect(requests[0].rows).toEqual([expect.objectContaining({
    sku: 'K2-SYNTHETIC-CSV-20260929',
    status: 'Draft',
    published: false,
    warehouse_id: null,
  })])
  expect(requests[0].rows[0]).not.toHaveProperty('quantity')
  expect(requests[0].rows[0]).not.toHaveProperty('stock')
  await expect(page.getByRole('status')).toHaveText('Catalog import refreshed')
})
