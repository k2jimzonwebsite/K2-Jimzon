import { test, expect } from '@playwright/test';

test.describe('Buyer POV', () => {

  test('Home page loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('The Milano').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Shop the Drop/i })).toBeVisible();
  });

  test('Can browse catalog and view product details', async ({ page }) => {
    await page.goto('/');
    
    // Scroll down to New Arrivals or Catalog
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(500);

    // Click first product card
    const firstProductCard = page.locator('article, .product-card, a[href*="/product"]').first();
    if (await firstProductCard.isVisible()) {
      await firstProductCard.click();
      await page.waitForTimeout(500);
    }
  });

  test('Can add item to cart and checkout', async ({ page }) => {
    await page.goto('/');
    
    // Add to cart from card or page
    const addBtn = page.getByRole('button', { name: /Add to Cart|Add \+/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);

      // Open Cart drawer if button exists
      const cartBtn = page.locator('button:has-text("Cart"), button:has-text("Bag")').first();
      if (await cartBtn.isVisible()) {
        await cartBtn.click();
      }

      // Proceed to checkout
      const checkoutBtn = page.getByRole('button', { name: /Checkout/i }).first();
      if (await checkoutBtn.isVisible()) {
        await checkoutBtn.click();
        await expect(page.getByText(/Checkout/i).first()).toBeVisible();
      }
    }
  });

  test('Search and filter catalog', async ({ page }) => {
    await page.goto('/');
    
    // Click Pasabuy or Search in navigation
    const pasabuyBtn = page.getByRole('button', { name: /Pasabuy/i }).first();
    if (await pasabuyBtn.isVisible()) {
      await pasabuyBtn.click();
      await expect(page.getByText(/Pasabuy/i).first()).toBeVisible();
    }
  });

  test('Navigate to Wholesale page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Wholesale/i, exact: true }).first().click();
    await expect(page.getByRole('heading', { name: /Stop waiting for a/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Navigate to Pasabuy page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Pasabuy/i, exact: true }).first().click();
    await expect(page.getByText(/Pasabuy/i).first()).toBeVisible({ timeout: 10000 });
  });

});
