import { test, expect } from '@playwright/test';

test.describe('Buyer POV', () => {
  test('Home page loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check title or main hero text
    await expect(page.getByText(/The Milano/i)).toBeVisible();
    await expect(page.getByText(/Flash Sale/i)).toBeVisible();
  });

  test('Can browse catalog and view product details', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load fully
    await page.waitForTimeout(2000); 
    
    // Click the title of the first product to open the modal/page
    const productCard = page.getByTestId('product-card').first();
    await productCard.waitFor();
    await productCard.getByRole('heading').first().click();
    
    // Wait for Add to cart button
    const addToCartBtn = page.getByRole('button').filter({ hasText: /Add to cart/i });
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
  });

  test('Can add item to cart and checkout', async ({ page }) => {
    await page.goto('/');
    
    // Click into the product
    const productCard = page.getByTestId('product-card').first();
    await productCard.waitFor();
    await productCard.getByRole('heading').first().click();
    
    const addToCartBtn = page.getByRole('button').filter({ hasText: /Add to cart/i });
    await addToCartBtn.waitFor({ timeout: 10000 });
    await addToCartBtn.click();
    
    // Now open the cart drawer. It might open automatically, or we need to click the Cart button in the header.
    const cartButton = page.locator('header').locator('button').filter({ hasText: /Cart|Bag|₱/ }).first();
    if (await cartButton.isVisible()) {
        await cartButton.click();
    }
    
    // Check if checkout button appears
    const checkoutBtn = page.getByRole('button', { name: 'Go to checkout' });
    await checkoutBtn.waitFor();
    await checkoutBtn.click();
    
    // Now we are on the checkout page
    await expect(page.getByRole('heading', { name: 'Checkout', exact: true })).toBeVisible({ timeout: 10000 });
    
    // Fill the form
    const inputBoxes = await page.locator('input[type="text"], input[type="email"], input[type="tel"]').all();
    if (inputBoxes.length >= 4) {
        await inputBoxes[0].fill('Test');
        await inputBoxes[1].fill('Buyer');
        await inputBoxes[2].fill('test@example.com');
        await inputBoxes[3].fill('09123456789');
    }
    
    // Note: this assumes there is a "Complete Order" button
    // Note: this assumes there is a "Complete Order" button
    const completeBtn = page.getByRole('button', { name: 'Confirm payment' });
    await expect(completeBtn).toBeVisible();
  });
});
