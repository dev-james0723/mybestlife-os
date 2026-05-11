const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * =========================================================
 * CONFIG
 * =========================================================
 */
const CONFIG = {
  START_URL: 'https://6973a91f1b2e3fec91aa1006.blocks-app.diy/Dashboard',
  MAX_PAGES: 100,
  OUTPUT_DIR: 'site_capture_output',

  DESKTOP_VIEWPORT: { width: 1440, height: 900 },
  MOBILE_DEVICE: devices['iPhone 13'],

  PAGE_TIMEOUT: 45000,
  WAIT_AFTER_LOAD: 1500,

  AUTO_SCROLL_STEP: 500,
  AUTO_SCROLL_DELAY: 300,

  SEGMENT_OVERLAP: 120,

  SAVE_HTML: true,
  SAVE_TEXT: true,
  CAPTURE_MOBILE: true,
  CAPTURE_SEGMENTS: true,

  BLOCK_EXTERNAL: false,

  EXCLUDED_FILE_EXTENSIONS: [
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.mp4', '.mov', '.avi', '.zip', '.rar',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
  ],
};

/**
 * =========================================================
 * OUTPUT DIRECTORIES
 * =========================================================
 */
const DIRS = {
  root: CONFIG.OUTPUT_DIR,
  desktop: path.join(CONFIG.OUTPUT_DIR, 'screenshots', 'desktop'),
  mobile: path.join(CONFIG.OUTPUT_DIR, 'screenshots', 'mobile'),
  segments: path.join(CONFIG.OUTPUT_DIR, 'screenshots', 'segments'),
  html: path.join(CONFIG.OUTPUT_DIR, 'html'),
  text: path.join(CONFIG.OUTPUT_DIR, 'text'),
  logs: path.join(CONFIG.OUTPUT_DIR, 'logs'),
};

/**
 * =========================================================
 * FILE / PATH HELPERS
 * =========================================================
 */
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
    .slice(0, 180);
}

/**
 * =========================================================
 * URL HELPERS
 * =========================================================
 */
function getUrlObject(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function normalizeUrl(url) {
  try {
    const u = new URL(String(url).trim());
    u.hash = '';
    let normalized = u.toString();

    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    return null;
  }
}

function isSameOrigin(url, origin) {
  const parsed = getUrlObject(url);
  return !!parsed && parsed.origin === origin;
}

function hasExcludedExtension(url) {
  const pathname = getUrlObject(url)?.pathname?.toLowerCase() || '';
  return CONFIG.EXCLUDED_FILE_EXTENSIONS.some(ext => pathname.endsWith(ext));
}

/**
 * =========================================================
 * PAGE HELPERS
 * =========================================================
 */
async function setupRequestBlocking(page, origin) {
  if (!CONFIG.BLOCK_EXTERNAL) return;

  await page.route('**/*', async route => {
    const requestUrl = route.request().url();
    const parsed = getUrlObject(requestUrl);

    if (!parsed) {
      return route.continue();
    }

    if (parsed.origin === origin) {
      return route.continue();
    }

    if (requestUrl.startsWith('data:') || requestUrl.startsWith('blob:')) {
      return route.continue();
    }

    return route.abort('blockedbyclient');
  });
}

async function waitForPageStable(page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: CONFIG.PAGE_TIMEOUT });
  } catch {
    // 某些網站永遠都唔會真正 network idle，唔需要硬死
  }
  await page.waitForTimeout(CONFIG.WAIT_AFTER_LOAD);
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

  await page.waitForTimeout(1000);
}

async function scrollBackToTop(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
}

async function extractInternalLinks(page, origin) {
  const hrefs = await page.$$eval('a[href]', anchors =>
    anchors.map(a => a.href).filter(Boolean)
  );

  const filtered = hrefs
    .map(normalizeUrl)
    .filter(Boolean)
    .filter(url => isSameOrigin(url, origin))
    .filter(url => !hasExcludedExtension(url));

  return [...new Set(filtered)];
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

async function saveHtmlAndText(page, urlKey) {
  if (CONFIG.SAVE_HTML) {
    const html = await page.content();
    writeText(path.join(DIRS.html, `${urlKey}.html`), html);
  }

  if (CONFIG.SAVE_TEXT) {
    const text = await extractVisibleText(page);
    writeText(path.join(DIRS.text, `${urlKey}.txt`), text);
  }
}

async function captureFullPageScreenshot(page, outputPath) {
  await page.screenshot({
    path: outputPath,
    fullPage: true,
  });
}

async function captureSegmentedScreenshots(page, baseName) {
  if (!CONFIG.CAPTURE_SEGMENTS) return [];

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
    await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(700);

    const filename = `${baseName}__segment_${String(index).padStart(3, '0')}.png`;
    const outputPath = path.join(DIRS.segments, filename);

    await page.screenshot({ path: outputPath });
    segmentPaths.push(outputPath);

    const increment = Math.max(200, viewportHeight - CONFIG.SEGMENT_OVERLAP);
    y += increment;
    index++;

    if (index > 300) break;
  }

  await scrollBackToTop(page);
  return segmentPaths;
}

/**
 * =========================================================
 * CAPTURE SINGLE DESKTOP PAGE
 * =========================================================
 */
async function captureDesktopPage(page, url, origin) {
  const normalizedUrl = normalizeUrl(url);
  const urlKey = sanitizeFilename(normalizedUrl);

  const result = {
    url: normalizedUrl,
    key: urlKey,
    pageTitle: '',
    capturedAt: nowIso(),
    desktopScreenshot: null,
    mobileScreenshot: null,
    segmentScreenshots: [],
    internalLinks: [],
    success: false,
    error: null,
  };

  try {
    await page.goto(normalizedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.PAGE_TIMEOUT,
    });

    await waitForPageStable(page);
    await autoScrollToBottom(page);
    await scrollBackToTop(page);
    await waitForPageStable(page);

    result.pageTitle = await page.title().catch(() => '');

    await saveHtmlAndText(page, urlKey);

    const desktopPath = path.join(DIRS.desktop, `${urlKey}.png`);
    await captureFullPageScreenshot(page, desktopPath);
    result.desktopScreenshot = desktopPath;

    result.segmentScreenshots = await captureSegmentedScreenshots(page, urlKey);
    result.internalLinks = await extractInternalLinks(page, origin);

    result.success = true;
  } catch (error) {
    result.error = error.message || String(error);
  }

  return result;
}

/**
 * =========================================================
 * CAPTURE MOBILE PAGE
 * =========================================================
 */
async function captureMobilePage(browser, url) {
  if (!CONFIG.CAPTURE_MOBILE) return null;

  const normalizedUrl = normalizeUrl(url);
  const urlKey = sanitizeFilename(normalizedUrl);
  const outputPath = path.join(DIRS.mobile, `${urlKey}__mobile.png`);

  const mobileContext = await browser.newContext({
    ...CONFIG.MOBILE_DEVICE,
  });

  const mobilePage = await mobileContext.newPage();

  try {
    await mobilePage.goto(normalizedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.PAGE_TIMEOUT,
    });

    await waitForPageStable(mobilePage);
    await autoScrollToBottom(mobilePage);
    await scrollBackToTop(mobilePage);
    await waitForPageStable(mobilePage);

    await mobilePage.screenshot({
      path: outputPath,
      fullPage: true,
    });

    await mobileContext.close();
    return outputPath;
  } catch {
    await mobileContext.close();
    return null;
  }
}

/**
 * =========================================================
 * MAIN
 * =========================================================
 */
async function main() {
  ensureAllDirs();

  const startUrl = normalizeUrl(CONFIG.START_URL);
  if (!startUrl) {
    console.error('Invalid START_URL:', CONFIG.START_URL);
    process.exit(1);
  }
  const origin = new URL(startUrl).origin;

  const browser = await chromium.launch({ headless: true });

  const desktopContext = await browser.newContext({
    viewport: CONFIG.DESKTOP_VIEWPORT,
  });

  const page = await desktopContext.newPage();
  await setupRequestBlocking(page, origin);

  const queue = [startUrl];
  const visited = new Set();

  const manifest = {
    startedAt: nowIso(),
    finishedAt: null,
    startUrl,
    pages: [],
    errors: [],
    stats: {
      visitedCount: 0,
      successCount: 0,
      errorCount: 0,
    },
  };

  try {
    while (queue.length > 0 && visited.size < CONFIG.MAX_PAGES) {
      const currentUrl = queue.shift();
      if (!currentUrl) continue;
      if (visited.has(currentUrl)) continue;
      if (!isSameOrigin(currentUrl, origin)) continue;
      if (hasExcludedExtension(currentUrl)) continue;

      visited.add(currentUrl);
      console.log(`Capturing ${visited.size}: ${currentUrl}`);

      const pageResult = await captureDesktopPage(page, currentUrl, origin);

      if (pageResult.success) {
        const mobileScreenshot = await captureMobilePage(browser, currentUrl);
        pageResult.mobileScreenshot = mobileScreenshot;

        for (const link of pageResult.internalLinks) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
        }

        manifest.stats.successCount += 1;
      } else {
        manifest.stats.errorCount += 1;
        manifest.errors.push({
          url: currentUrl,
          error: pageResult.error,
        });
      }

      manifest.pages.push(pageResult);
      manifest.stats.visitedCount = visited.size;

      writeJson(path.join(DIRS.root, 'manifest.json'), manifest);
    }
  } catch (error) {
    manifest.errors.push({
      url: startUrl,
      error: error.message || String(error),
    });
  } finally {
    manifest.finishedAt = nowIso();
    writeJson(path.join(DIRS.root, 'manifest.json'), manifest);

    await desktopContext.close();
    await browser.close();
  }

  console.log('Done.');
  console.log(`Output folder: ${CONFIG.OUTPUT_DIR}`);
  console.log(`Visited pages: ${manifest.stats.visitedCount}`);
  console.log(`Success pages: ${manifest.stats.successCount}`);
  console.log(`Failed pages: ${manifest.stats.errorCount}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
});
