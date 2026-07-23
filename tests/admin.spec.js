import { test, expect } from '@playwright/test';

// Helper to authenticate admin cleanly via init script
async function loginAdmin(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    window.localStorage.setItem('k2_admin_session', 'true');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Admin', exact: true }).first().click();
}

test.describe('Admin POV', () => {
  test('Admin dashboard loads and navigation works', async ({ page }) => {
    await loginAdmin(page);
    
    // Check main dashboard heading (Home Dashboard in header)
    await expect(page.getByRole('heading', { name: 'Home Dashboard' })).toBeVisible({ timeout: 15000 });
    
    // Navigate to Product Master
    const productMasterBtn = page.getByRole('button', { name: /Product Master/i }).first();
    await productMasterBtn.waitFor({ state: 'visible', timeout: 15000 });
    await productMasterBtn.click();
    
    // Check if Add New Row is visible
    await expect(page.getByRole('button', { name: /Add New Row/i })).toBeVisible({ timeout: 15000 });
    
    // Navigate to Global Logistics
    const kanbanBtn = page.getByRole('button', { name: /Global Logistics/i }).first();
    await kanbanBtn.waitFor({ state: 'visible', timeout: 15000 });
    await kanbanBtn.click();
    
    // Should see 'Customer Orders' button
    await expect(page.getByRole('button', { name: /Customer Orders/i }).first()).toBeVisible({ timeout: 15000 });
  });

  test('Product Master (PIM) features', async ({ page }) => {
    await loginAdmin(page);
    
    const productMasterBtn = page.getByRole('button', { name: /Product Master/i }).first();
    await productMasterBtn.waitFor({ state: 'visible', timeout: 15000 });
    await productMasterBtn.click();
    
    // Add New Row
    const addRowBtn = page.getByRole('button', { name: /Add New Row/i });
    await expect(addRowBtn).toBeVisible({ timeout: 15000 });
    await addRowBtn.click();
    
    // Just verify the table is there
    await expect(page.locator('.ag-theme-alpine-dark, .grid-container, table').first()).toBeVisible();

    // Helper to close modal via aria-label
    const closeModal = async () => {
      const closeBtn = page.getByRole('button', { name: 'Close modal' }).first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    };

    // Open Smart Paste Modal
    const smartPasteBtn = page.getByRole('button', { name: /Smart Paste AI/i });
    await smartPasteBtn.click();
    
    await expect(page.getByRole('heading', { name: /Smart Paste AI/i })).toBeVisible();
    await closeModal();
    
    // Open Scan Box Modal
    const scanBoxBtn = page.getByRole('button', { name: /Scan Box/i });
    await scanBoxBtn.click();
    
    await expect(page.getByText(/Scan Box/i).first()).toBeVisible();
    await closeModal();
    
    // Open CSV Upload Modal
    const csvBtn = page.getByRole('button', { name: /Upload CSV/i }).first();
    if (await csvBtn.isVisible().catch(() => false)) {
      await csvBtn.click();
      await expect(page.getByRole('heading', { name: /Bulk CSV Import/i }).or(page.getByText(/Bulk CSV Import/i)).first()).toBeVisible();
      await closeModal();
    }
  });

  test('Global Logistics specific checks', async ({ page }) => {
    await loginAdmin(page);
    
    const kanbanBtn = page.getByRole('button', { name: /Global Logistics/i }).first();
    await kanbanBtn.waitFor({ state: 'visible', timeout: 15000 });
    await kanbanBtn.click();
    
    // Ensure tabs exist
    await expect(page.getByRole('button', { name: /Italy ✈ Manila Manifests/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Customer Orders/i }).first()).toBeVisible();
  });
});
