const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Create dir if needed
  const outDir = 'C:/Users/jerze/.gemini/antigravity/brain/0e06835a-c645-425e-9699-703130e030c8';
  
  const takeShots = async (prefix) => {
    // Wait a bit for animations
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, `${prefix}_light.png`), fullPage: true });
    
    // Toggle dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, `${prefix}_dark.png`), fullPage: true });
    
    // Reset to light
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
  };

  await page.goto('http://localhost:5173/');
  await takeShots('home');

  const productCard = page.getByTestId('product-card').first();
  await productCard.waitFor();
  await productCard.getByRole('heading').first().click();
  await takeShots('product_detail');
  
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await takeShots('admin_dashboard');

  await browser.close();
  console.log('Screenshots saved!');
})();
