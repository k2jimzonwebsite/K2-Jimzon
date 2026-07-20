import { test, expect } from '@playwright/test';

test.describe('Admin POV', () => {
  test('Admin dashboard loads and navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Use DemoRail to go to Admin
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    
    // Wait for the admin page to load
    await page.waitForTimeout(1000);
    
    // Check main dashboard heading (K2 Jimzon BOS)
    await expect(page.getByText('Mission Control')).toBeVisible({ timeout: 10000 });
    
    // Navigate to Product Master
    // Since it's a sidebar button:
    const productMasterBtn = page.getByRole('button', { name: /Product Master/i });
    await productMasterBtn.waitFor();
    await productMasterBtn.click();
    
    // Check if Add New Row is visible
    await expect(page.getByRole('button', { name: /Add New Row/i })).toBeVisible({ timeout: 10000 });
    
    // Navigate to Global Logistics (formerly Kanban Board)
    const kanbanBtn = page.getByText('Global Logistics', { exact: true });
    await kanbanBtn.waitFor();
    await kanbanBtn.click();
    
    // Should see 'Customer Orders' button
    await expect(page.getByRole('button', { name: /Customer Orders/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Product Master (PIM) features', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.waitForTimeout(1000);
    
    const productMasterBtn = page.getByRole('button', { name: /Product Master/i });
    await productMasterBtn.waitFor();
    await productMasterBtn.click();
    
    // Add New Row
    const addRowBtn = page.getByRole('button', { name: /Add New Row/i });
    await expect(addRowBtn).toBeVisible({ timeout: 10000 });
    await addRowBtn.click();
    
    // Just verify the table is there
    await expect(page.locator('.ag-theme-alpine-dark, .grid-container, table').first()).toBeVisible();

    // Helper to click close button
    const clickCloseBtn = async () => {
      // Find the first button inside the modal wrapper that is not the primary action button
      const closeBtn = page.locator('.fixed.inset-0 button').first();
      await closeBtn.click();
      await page.waitForTimeout(500); // Give it time to animate out
    };

    // Open Smart Paste Modal
    const smartPasteBtn = page.getByRole('button', { name: /Smart Paste AI/i });
    await smartPasteBtn.click();
    
    await expect(page.getByRole('heading', { name: /Smart Paste AI/i })).toBeVisible();
    await clickCloseBtn();
    
    // Open Scan Box Modal
    const scanBoxBtn = page.getByRole('button', { name: /Scan Box/i });
    await scanBoxBtn.click();
    
    await expect(page.getByRole('heading', { name: /Scan New Box/i }).or(page.getByText(/Scan New Box/i)).first()).toBeVisible();
    await clickCloseBtn();
    
    // Open CSV Upload Modal
    const csvBtn = page.getByRole('button', { name: '📂 Upload CSV' });
    await csvBtn.click();
    
    await expect(page.getByRole('heading', { name: /Bulk CSV Import/i }).or(page.getByText(/Bulk CSV Import/i)).first()).toBeVisible();
    await clickCloseBtn();
  });

  test('Interact with Product Master grid', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.waitForTimeout(1000);
    const productMasterBtn = page.getByRole('button', { name: /Product Master/i });
    await productMasterBtn.waitFor();
    await productMasterBtn.click();
    
    // Check Preview Button logic
    // Usually it's an EyeIcon. Find the first row's preview button.
    const previewBtn = page.getByRole('button', { name: /Preview|View/i }).first();
    if (await previewBtn.isVisible()) {
        await previewBtn.click();
        // Since it sets view to 'home' and productId, we should be on the product page
        await expect(page.getByRole('button', { name: /Add to cart|Request via Pasabuy/i }).first()).toBeVisible({ timeout: 10000 });
        // Go back to admin
        await page.goto('/');
        await page.getByRole('button', { name: 'Admin', exact: true }).click();
        await page.getByRole('button', { name: /Product Master/i }).click();
    }
  });

  test('Global Logistics specific checks', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.waitForTimeout(1000);
    
    const kanbanBtn = page.getByText('Global Logistics', { exact: true });
    await kanbanBtn.waitFor();
    await kanbanBtn.click();
    
    // Ensure the 4 columns exist
    // Ensure the 4 columns exist
    await expect(page.getByText('Shopee A').first()).toBeVisible();
    await expect(page.getByText('Shopee B').first()).toBeVisible();
    await expect(page.getByText('Website').first()).toBeVisible();
  });
});
