import { chromium, devices } from 'playwright';

const iPhone = devices['iPhone 12'];

(async () => {
  console.log("Launching Playwright...");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...iPhone
  });
  const page = await context.newPage();
  
  console.log("Navigating to local site...");
  await page.goto('http://localhost:5173');
  
  // wait for react to render
  await page.waitForTimeout(2000);
  
  console.log("Checking for horizontal overflow...");
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  
  if (hasOverflow) {
    console.log("❌ Horizontal overflow detected on Home page!");
  } else {
    console.log("✅ No horizontal overflow detected on Home page.");
  }
  
  // Go to product page
  console.log("Navigating to Product page...");
  await page.evaluate(() => {
    // Click the first product
    document.querySelector('button h3').click();
  });
  
  await page.waitForTimeout(2000);
  
  const productOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  
  if (productOverflow) {
    console.log("❌ Horizontal overflow detected on Product page!");
  } else {
    console.log("✅ No horizontal overflow detected on Product page.");
  }
  
  // Check ProductCard titles specifically for overlapping
  console.log("Checking for text overflow inside cards...");
  const textIssues = await page.evaluate(() => {
    const issues = [];
    document.querySelectorAll('h3, p').forEach(el => {
      if (el.scrollWidth > el.clientWidth && el.clientWidth > 0) {
        issues.push({
          tag: el.tagName,
          text: el.innerText.substring(0, 30) + '...',
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth
        });
      }
    });
    return issues;
  });
  
  if (textIssues.length > 0) {
    console.log("❌ Text overflow found in the following elements:", textIssues);
  } else {
    console.log("✅ No text overflow found in any cards/text blocks.");
  }
  
  await browser.close();
  console.log("Playwright checks completed.");
})();
