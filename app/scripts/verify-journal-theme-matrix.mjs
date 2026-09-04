import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl =
  process.env.JOURNAL_VERIFY_BASE_URL ?? "http://127.0.0.1:3100";
const outputDir = path.resolve(
  process.env.JOURNAL_VERIFY_OUTPUT_DIR ??
    path.join(appRoot, "test-results/journal-redesign/theme-matrix"),
);
const browserCandidates = [
  process.env.JOURNAL_VERIFY_BROWSER,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browserExecutable = browserCandidates.find((candidate) => existsSync(candidate));
const themes = process.env.JOURNAL_VERIFY_THEME
  ? [process.env.JOURNAL_VERIFY_THEME]
  : ["default", "astronaut", "academia", "forest"];
const colorModes = process.env.JOURNAL_VERIFY_MODE
  ? [process.env.JOURNAL_VERIFY_MODE]
  : ["light", "dark"];
const viewportName = process.env.JOURNAL_VERIFY_VIEWPORT ?? "mobile";
const viewport =
  viewportName === "desktop"
    ? { width: 1440, height: 1000 }
    : { width: 390, height: 844 };

assert(
  viewportName === "mobile" || viewportName === "desktop",
  `Unknown JOURNAL_VERIFY_VIEWPORT: ${viewportName}`,
);

assert(browserExecutable, "A Chromium browser executable is required");
await mkdir(outputDir, { recursive: true });

async function chooseFirstTopic(page) {
  const trigger = page.locator("[data-slot='select-trigger']").first();
  const options = page.getByRole("option");
  const activations = [
    () => trigger.click({ force: true }),
    async () => {
      await trigger.focus();
      await page.keyboard.press("Enter");
    },
    async () => {
      await trigger.focus();
      await page.keyboard.press("Space");
    },
    async () => {
      await trigger.focus();
      await page.keyboard.press("ArrowDown");
    },
  ];

  for (const activate of activations) {
    await activate();
    try {
      await options.first().waitFor({ state: "visible", timeout: 2_000 });
      await options.first().click({ force: true });
      return;
    } catch {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
    }
  }

  assert.fail("Topic options must open after pointer and keyboard activation");
}

async function prepareScreenshot(page, { scrollTop = false } = {}) {
  await page.evaluate(async (shouldScrollTop) => {
    await document.fonts.ready;
    if (shouldScrollTop) window.scrollTo({ top: 0, behavior: "instant" });
    for (const portal of document.querySelectorAll("nextjs-portal")) {
      if (portal instanceof HTMLElement) portal.style.display = "none";
    }
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  }, scrollTop);
  await page.waitForTimeout(400);
}

const browser = await chromium.launch({
  executablePath: browserExecutable,
  headless: true,
});
const results = [];

try {
  for (const theme of themes) {
    for (const colorMode of colorModes) {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
        colorScheme: colorMode,
        reducedMotion: "reduce",
      });
      await context.addCookies([
        { name: "mylifeos_dev_bypass", value: "1", url: baseUrl },
      ]);
      await context.addInitScript(
        ({ selectedTheme, selectedMode }) => {
          localStorage.setItem(
            "mylifeos-theme",
            JSON.stringify({
              uiTheme: selectedTheme,
              colorMode: selectedMode,
              iconPack: "command-glass",
              fontSize: "medium",
              widgetDensity: "comfortable",
              focusMode: false,
            }),
          );
          localStorage.setItem(
            "mylifeos:settings-profile:v1",
            JSON.stringify({
              id: "00000000-0000-0000-0000-000000000000",
              email: "dev-bypass@mylifeos.local",
              full_name: "Journal Theme Check",
              avatar_url: null,
              language: "en",
              timezone: "America/Indiana/Indianapolis",
              theme: selectedMode,
              ui_theme: selectedTheme,
              color_mode: selectedMode,
              focus_areas: [],
              widget_density: "comfortable",
              focus_mode: false,
              font_size_pref: "medium",
              onboarding_completed: true,
            }),
          );
        },
        { selectedTheme: theme, selectedMode: colorMode },
      );

      const page = await context.newPage();
      page.setDefaultTimeout(60_000);
      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.route("**/rest/v1/**", async (route) => {
        const accept = route.request().headers().accept ?? "";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "content-range": "*/0" },
          body: accept.includes("application/vnd.pgrst.object+json") ? "null" : "[]",
        });
      });

      await page.goto(`${baseUrl}/en/journal`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForTimeout(1_500);
      await page.evaluate(
        ({ selectedTheme, selectedMode }) => {
          const themeKey = "mylifeos-theme";
          const profileKey = "mylifeos:settings-profile:v1";
          const storedTheme = JSON.parse(localStorage.getItem(themeKey) ?? "{}");
          const storedProfile = JSON.parse(localStorage.getItem(profileKey) ?? "{}");
          localStorage.setItem(
            themeKey,
            JSON.stringify({
              ...storedTheme,
              uiTheme: selectedTheme,
              colorMode: selectedMode,
            }),
          );
          localStorage.setItem(
            profileKey,
            JSON.stringify({
              ...storedProfile,
              theme: selectedMode,
              ui_theme: selectedTheme,
              color_mode: selectedMode,
            }),
          );
        },
        { selectedTheme: theme, selectedMode: colorMode },
      );
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
      try {
        await page.waitForFunction(
          ({ selectedTheme, selectedMode }) =>
            document.documentElement.dataset.uiTheme === selectedTheme &&
            document.documentElement.dataset.colorMode === selectedMode,
          { selectedTheme: theme, selectedMode: colorMode },
          { timeout: 60_000 },
        );
      } catch (error) {
        console.error(
          JSON.stringify({
            stage: "theme-hydration",
            theme,
            colorMode,
            url: page.url(),
            applied: await page.evaluate(() => ({
              uiTheme: document.documentElement.dataset.uiTheme,
              colorMode: document.documentElement.dataset.colorMode,
              storedTheme: localStorage.getItem("mylifeos-theme"),
              storedProfile: localStorage.getItem("mylifeos:settings-profile:v1"),
            })),
          }),
        );
        throw error;
      }
      await page.locator("[data-slot='os-glass-panel']").first().waitFor();
      await page.waitForLoadState("load");
      await page.waitForTimeout(750);
      // Ignore warnings caused by the deliberate theme-reload handoff; assertions
      // below cover the stable, interactive page state.
      consoleErrors.length = 0;
      pageErrors.length = 0;

      const topScreenshotName = `${theme}-${colorMode}-${viewportName}-top.png`;
      await prepareScreenshot(page, { scrollTop: true });
      await page.screenshot({
        path: path.join(outputDir, topScreenshotName),
        animations: "disabled",
      });

      assert.equal(
        await page.getByRole("button", { name: /Generate (Illustration|Audio)/i }).count(),
        0,
        "AI generation controls should stay compact and locked before save",
      );
      await page.getByText(/Save your entry first/i).waitFor();

      const topicTrigger = page.locator("[data-slot='select-trigger']").first();
      const topicBox = await topicTrigger.boundingBox();
      assert(topicBox, "Topic trigger must be visible");
      assert(topicBox.width >= 300, `Topic trigger too narrow: ${topicBox.width}`);
      assert.equal(
        await page.getByRole("button", { name: /Save Entry/i }).count(),
        0,
        "Save should stay hidden before the progressive form is ready",
      );

      await chooseFirstTopic(page);
      const quadrant = page
        .getByRole("group", { name: /Emotion Picker/i })
        .getByRole("button")
        .first();
      await quadrant.click();

      const saveButton = page.getByRole("button", { name: /Save Entry/i });
      await saveButton.waitFor();
      await saveButton.scrollIntoViewIfNeeded();
      await prepareScreenshot(page);
      const saveMetrics = await saveButton.evaluate((button) => {
        const parent = button.parentElement;
        const buttonBox = button.getBoundingClientRect();
        const parentStyle = parent ? getComputedStyle(parent) : null;
        return {
          width: buttonBox.width,
          height: buttonBox.height,
          parentBackground: parentStyle?.backgroundColor ?? "missing",
          parentPosition: parentStyle?.position ?? "missing",
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          uiTheme: document.documentElement.dataset.uiTheme,
          colorMode: document.documentElement.dataset.colorMode,
          heading: document.querySelector("h1")?.textContent?.trim() ?? "",
          buttonText: button.textContent?.trim() ?? "",
        };
      });

      if (viewportName === "mobile") {
        assert(saveMetrics.width >= 320, `Save button too narrow: ${saveMetrics.width}`);
      }
      assert(saveMetrics.height >= 44, `Save button too short: ${saveMetrics.height}`);
      assert.equal(saveMetrics.buttonText, "Save Entry");
      assert.equal(saveMetrics.parentPosition, "static");
      assert.equal(saveMetrics.parentBackground, "rgba(0, 0, 0, 0)");
      assert(saveMetrics.documentWidth <= saveMetrics.viewportWidth);
      assert.deepEqual(consoleErrors, []);
      assert.deepEqual(pageErrors, []);

      const screenshotName = `${theme}-${colorMode}-${viewportName}-save.png`;
      await page.screenshot({
        path: path.join(outputDir, screenshotName),
        animations: "disabled",
      });
      results.push({
        theme,
        colorMode,
        viewport: viewportName,
        topScreenshot: topScreenshotName,
        screenshot: screenshotName,
        ...saveMetrics,
        consoleErrors,
        pageErrors,
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(outputDir, `receipt-${viewportName}.json`),
  `${JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2)}\n`,
);
console.log(JSON.stringify({ browserExecutable, results }, null, 2));
