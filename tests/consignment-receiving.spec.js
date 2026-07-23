import { test, expect } from '@playwright/test';

test.describe('Italy-to-Manila Consignment & Mobile Barcode Box Receiving', () => {

  test('Admin authenticates and manages Italy flight consignment & box receiving', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Inject admin session before loading page
    await page.addInitScript(() => {
      window.localStorage.setItem('k2_admin_session', 'true');
    });

    // 1. Visit main app
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Open Admin view via DemoRail
    const adminBtn = page.getByRole('button', { name: 'Admin', exact: true }).first();
    await adminBtn.click();

    // Navigate to "Global Logistics"
    const globalLogisticsBtn = page.getByRole('button', { name: /Global Logistics/i }).first();
    await globalLogisticsBtn.waitFor({ state: 'visible', timeout: 10000 });
    await globalLogisticsBtn.click();

    // Verify Unified Header
    await expect(page.getByText(/Global Logistics & Manifest Command/i)).toBeVisible({ timeout: 15000 });

    // Verify Flight Consignment Manager Header
    await expect(page.getByText(/Flight Consignment/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Milan Packed Total')).toBeVisible();
    await expect(page.getByText('Manila Scanned Total')).toBeVisible();

    // Test +1 Scan Increment on first item row
    const firstScanBtn = page.getByRole('button', { name: '+1 Scan' }).first();
    await firstScanBtn.click();
    await page.waitForTimeout(500);

    // Verify scanned count cell exists and is visible
    const scannedCell = page.locator('td.text-forest').first();
    await expect(scannedCell).toBeVisible();

    // Test Milan Camera Scanner (Italy POV)
    const milanScannerBtn = page.getByRole('button', { name: /Milan Camera Scanner/i }).first();
    await milanScannerBtn.click();

    // Verify Milan Scanner Modal opens
    await expect(page.getByText('Milan Packing POV')).toBeVisible();
    await expect(page.getByText('Flight Box Packing Scanner')).toBeVisible();

    // Tap quick SKU tile to increment +1 pack
    const quickTileBtn = page.getByRole('button', { name: /KIKO-3D-05/i }).first();
    await quickTileBtn.click();

    // Close Milan Scanner using exact aria-label 'Close Milan Packing Scanner'
    const closeMilanBtn = page.getByRole('button', { name: 'Close Milan Packing Scanner' }).first();
    await closeMilanBtn.click();
    await expect(page.getByText('Milan Packing POV')).not.toBeVisible({ timeout: 10000 });

    // Open Side-by-Side Discrepancy Reconciliation Matrix
    const reconcileBtn = page.getByRole('button', { name: /Reconciliation/i }).first();
    await reconcileBtn.scrollIntoViewIfNeeded();
    await reconcileBtn.click({ force: true });

    // Check Reconciliation Modal title
    await expect(page.getByText('Box Checking Discrepancy Reconciliation')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Italy Packed Box Qty')).toBeVisible();

    // Close modal
    const closeBtn = page.getByRole('button', { name: 'Back to Scanning' });
    await closeBtn.click();
    await expect(page.getByText('Box Checking Discrepancy Reconciliation')).not.toBeVisible();
  });

});
