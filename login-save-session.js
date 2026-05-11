const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://6973a91f1b2e3fec91aa1006.blocks-app.diy/Dashboard');

  console.log('Please log in manually in the opened browser.');
  console.log('After login is fully complete and you can see the dashboard, press ENTER here.');

  process.stdin.once('data', async () => {
    await context.storageState({ path: 'auth.json' });
    console.log('Saved login session to auth.json');
    await browser.close();
    process.exit(0);
  });
})();
