const { chromium } = require('playwright');

(async () => {
  const context = await chromium.launchPersistentContext('./playwright-user-data', {
    headless: false,
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  await page.goto('https://6973a91f1b2e3fec91aa1006.blocks-app.diy/Dashboard', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  console.log('Please log in manually in this browser window.');
  console.log('After login is complete, keep this profile folder for reuse.');
})();