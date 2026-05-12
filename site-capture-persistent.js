const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  OUTPUT_DIR: process.env.SITE_CAPTURE_OUTPUT_DIR || 'site_capture_output',
  USER_DATA_DIR: process.env.SITE_CAPTURE_USER_DATA_DIR || './playwright-user-data',
  HEADLESS:
    process.env.SITE_CAPTURE_HEADLESS === '1' ||
    process.env.SITE_CAPTURE_HEADLESS === 'true',
  PAGE_TIMEOUT: 90000,
  FIXED_WAIT_AFTER_GOTO: 5000,
  FIXED_WAIT_AFTER_SCROLL: 1500,
  FIXED_WAIT_BEFORE_SCREENSHOT: 1000,
  DESKTOP_VIEWPORT: { width: 1440, height: 900 },
  MOBILE_DEVICE: devices['iPhone 13'],
  AUTO_SCROLL_STEP: 500,
  AUTO_SCROLL_DELAY: 300,
  SEGMENT_OVERLAP: 120,
  MAX_SEGMENTS_PER_PAGE: 300,
};

const BASE_URL = 'https://6973a91f1b2e3fec91aa1006.blocks-app.diy';

const DEFAULT_MANUAL_URLS = [
  `${BASE_URL}/Dashboard`,
  `${BASE_URL}/DailyPlanner`,
  `${BASE_URL}/Tasks`,
  `${BASE_URL}/WeeklyReview`,
  `${BASE_URL}/GoogleCalendar`,
  `${BASE_URL}/Analytics`,
  `${BASE_URL}/AboutMe`,
  `${BASE_URL}/MyGratefulThings`,
  `${BASE_URL}/Health`,
  `${BASE_URL}/HabitsRoutines`,
  `${BASE_URL}/Journal`,
  `${BASE_URL}/Career`,
  `${BASE_URL}/Goals`,
  `${BASE_URL}/Projects`,
  `${BASE_URL}/Notes`,
  `${BASE_URL}/KnowledgeBase`,
  `${BASE_URL}/AIKnowledge`,
  `${BASE_URL}/JapaneseStudy`,
  `${BASE_URL}/IdeaCapture`,
  `${BASE_URL}/Relationships`,
  `${BASE_URL}/RoleModels`,
  `${BASE_URL}/Finance`,
  `${BASE_URL}/Assets`,
  `${BASE_URL}/Documents`,
  `${BASE_URL}/SoftwareVault`,
  `${BASE_URL}/YouTubeRadar`,
  `${BASE_URL}/BusinessAnalyst`,
  `${BASE_URL}/AIAssistant`,
  `${BASE_URL}/Settings`,
];

function loadManualUrls() {
  const file = process.env.SITE_CAPTURE_URLS_FILE;
  if (file) {
    const abs = path.isAbsolute(file) ? file : path.join(__dirname, file);
    const raw = fs.readFileSync(abs, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((u) => typeof u === 'string')) {
      throw new Error('SITE_CAPTURE_URLS_FILE must be a JSON array of URL strings');
    }
    return parsed;
  }
  return DEFAULT_MANUAL_URLS;
}

const MANUAL_URLS = loadManualUrls();

const DIRS = {
  root: CONFIG.OUTPUT_DIR,
  desktop: path.join(CONFIG.OUTPUT_DIR, 'screenshots', 'desktop'),
  segments: path.join(CONFIG.OUTPUT_DIR, 'screenshots', 'segments'),
  html: path.join(CONFIG.OUTPUT_DIR, 'html'),
  text: path.join(CONFIG.OUTPUT_DIR, 'text'),
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function ensureAllDirs() {
  Object.values(DIRS).forEach(ensureDir);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function writeText(filePath, text) {
  fs.writeFileSync(filePath, text, 'utf-8');
}

function nowIso() {
  return new Date().toISOString();
}

function sanitizeFilename(input) {
  return input
    .replace(/^https?:\/\//, '')
    .replace(/[\/:?&=#%"<>|\\*\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 220);
}

async function waitForPageLoadAndRender(page) {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: CONFIG.PAGE_TIMEOUT });
  } catch {}

  await page.waitForTimeout(CONFIG.FIXED_WAIT_AFTER_GOTO);

  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch {}

  await page.waitForTimeout(1000);
}

async function autoScrollToBottom(page) {
  await page.evaluate(
    async ({ step, delay }) => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let lastScrollHeight = 0;
        let stableRounds = 0;

        const timer = setInterval(() => {
          const scrollHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          );

          window.scrollBy(0, step);
          totalHeight += step;

          const currentScrollHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          );

          if (currentScrollHeight === lastScrollHeight) {
            stableRounds += 1;
          } else {
            stableRounds = 0;
          }

          lastScrollHeight = currentScrollHeight;

          if (totalHeight >= currentScrollHeight || stableRounds >= 3) {
            clearInterval(timer);
            resolve();
          }
        }, delay);
      });
    },
    {
      step: CONFIG.AUTO_SCROLL_STEP,
      delay: CONFIG.AUTO_SCROLL_DELAY,
    }
  );

  await page.waitForTimeout(CONFIG.FIXED_WAIT_AFTER_SCROLL);
}

async function scrollBackToTop(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
}

async function extractVisibleText(page) {
  return await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const lines = [];
    let node;

    while ((node = walker.nextNode())) {
      const text = node.textContent.replace(/\s+/g, ' ').trim();
      if (text) lines.push(text);
    }

    return lines.join('\n');
  });
}

async function detectLikelyLoginPage(page) {
  try {
    const url = page.url();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const text = (bodyText || '').toLowerCase();

    return (
      url.toLowerCase().includes('login') ||
      text.includes('welcome to my life os') ||
      text.includes('send me a login link') ||
      text.includes('continue with google')
    );
  } catch {
    return false;
  }
}

async function captureSegments(page, baseName) {
  const segmentPaths = [];

  const metrics = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;

    return {
      totalHeight: Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      ),
      viewportHeight: window.innerHeight,
    };
  });

  const { totalHeight, viewportHeight } = metrics;

  let y = 0;
  let index = 1;

  while (y < totalHeight) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(900);

    const filename = `${baseName}__segment_${String(index).padStart(3, '0')}.png`;
    const outputPath = path.join(DIRS.segments, filename);

    await page.screenshot({ path: outputPath });
    segmentPaths.push(outputPath);

    const increment = Math.max(200, viewportHeight - CONFIG.SEGMENT_OVERLAP);
    y += increment;
    index++;

    if (index > CONFIG.MAX_SEGMENTS_PER_PAGE) break;
  }

  await scrollBackToTop(page);
  return segmentPaths;
}

async function main() {
  ensureAllDirs();

  const context = await chromium.launchPersistentContext(CONFIG.USER_DATA_DIR, {
    headless: CONFIG.HEADLESS,
    viewport: CONFIG.DESKTOP_VIEWPORT,
  });

  const page = await context.newPage();

  const manifest = {
    startedAt: nowIso(),
    finishedAt: null,
    userDataDir: CONFIG.USER_DATA_DIR,
    pages: [],
    errors: [],
    stats: {
      totalRequested: MANUAL_URLS.length,
      successCount: 0,
      errorCount: 0,
      loginRedirectCount: 0,
    },
  };

  try {
    for (const currentUrl of MANUAL_URLS) {
      const key = sanitizeFilename(currentUrl);
      const result = {
        url: currentUrl,
        finalUrl: '',
        pageTitle: '',
        desktopScreenshot: null,
        segmentScreenshots: [],
        success: false,
        error: null,
      };

      console.log(`Capturing: ${currentUrl}`);

      try {
        await page.goto(currentUrl, {
          waitUntil: 'domcontentloaded',
          timeout: CONFIG.PAGE_TIMEOUT,
        });

        await waitForPageLoadAndRender(page);

        result.finalUrl = page.url();

        const isLogin = await detectLikelyLoginPage(page);
        if (isLogin) {
          result.error = 'Redirected to login page';
          manifest.stats.loginRedirectCount += 1;
          manifest.stats.errorCount += 1;
          manifest.errors.push({ url: currentUrl, error: result.error });
          manifest.pages.push(result);
          continue;
        }

        await autoScrollToBottom(page);
        await scrollBackToTop(page);
        await page.waitForTimeout(CONFIG.FIXED_WAIT_BEFORE_SCREENSHOT);

        result.pageTitle = await page.title().catch(() => '');

        const html = await page.content();
        writeText(path.join(DIRS.html, `${key}.html`), html);

        const text = await extractVisibleText(page);
        writeText(path.join(DIRS.text, `${key}.txt`), text);

        const desktopPath = path.join(DIRS.desktop, `${key}.png`);
        await page.screenshot({
          path: desktopPath,
          fullPage: true,
        });
        result.desktopScreenshot = desktopPath;

        result.segmentScreenshots = await captureSegments(page, key);
        result.success = true;
        manifest.stats.successCount += 1;
      } catch (err) {
        result.error = err.message || String(err);
        manifest.stats.errorCount += 1;
        manifest.errors.push({ url: currentUrl, error: result.error });
      }

      manifest.pages.push(result);
      writeJson(path.join(DIRS.root, 'manifest.json'), manifest);
    }
  } finally {
    manifest.finishedAt = nowIso();
    writeJson(path.join(DIRS.root, 'manifest.json'), manifest);
    await context.close();
  }

  console.log('Done.');
  console.log(`Output folder: ${CONFIG.OUTPUT_DIR}`);
  console.log(`Requested pages: ${manifest.stats.totalRequested}`);
  console.log(`Success: ${manifest.stats.successCount}`);
  console.log(`Failed: ${manifest.stats.errorCount}`);
  console.log(`Login redirects: ${manifest.stats.loginRedirectCount}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
});