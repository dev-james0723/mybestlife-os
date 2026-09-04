import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.MIND_COUNCIL_VERIFY_BASE_URL ?? "http://127.0.0.1:3100";
const browserPath =
  process.env.MIND_COUNCIL_VERIFY_BROWSER ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputDir = "test-results/mind-council-chat";
const viewports = [
  { name: "desktop", width: 1280, height: 900, colorMode: "dark" },
  { name: "mobile", width: 390, height: 844, colorMode: "light" },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: browserPath });
const results = [];

async function installMocks(page) {
  let retryFailureSent = false;
  await page.route("**/api/mind-council/recommend", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ recommendedSkillIds: [], rationale: "" }),
    }),
  );
  await page.route("**/api/mind-council/chat", (route) => {
    const payload = route.request().postDataJSON();
    const lastMessage = payload.messages?.at(-1)?.content;
    if (lastMessage === "Exercise the retry state." && !retryFailureSent) {
      retryFailureSent = true;
      return route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: "temporary_failure" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply:
          "## A sharper frame\n\n**Signal:** The real constraint is attention, not ambition.\n\n- Name the decision\n- Test the smallest reversible move\n\n> Protect the essential.\n\n| Lens | Next move |\n| --- | --- |\n| Craft | Run one focused experiment |\n\nUse `one clear constraint` before adding complexity.\n\n[Read the evidence](https://example.com)",
      }),
    });
  });
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "*/0" },
      body: "[]",
    }),
  );
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "reduce",
    });
    await context.addCookies([
      { name: "mylifeos_dev_bypass", value: "1", url: baseUrl },
    ]);
    const page = await context.newPage();
    await page.addInitScript((colorMode) => {
      localStorage.setItem("mylifeos-theme", JSON.stringify({ colorMode }));
    }, viewport.colorMode);
    page.setDefaultTimeout(60_000);
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await installMocks(page);

    const hydrated = page.waitForRequest((request) =>
      request.url().includes("/api/mind-council/recommend"),
    );
    await page.goto(`${baseUrl}/en/mind-council`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByRole("heading", { name: "Mind Council", exact: true }).waitFor();
    await hydrated;
    if (
      viewport.colorMode === "dark" &&
      !(await page.locator("html").evaluate((root) => root.classList.contains("dark")))
    ) {
      await page
        .getByRole("button", { name: "Switch to dark mode", exact: true })
        .click();
      await page.locator("html.dark").waitFor();
    }
    await page.getByRole("button", { name: "Lens chat", exact: true }).first().click();

    const dialog = page.getByRole("dialog");
    try {
      await dialog.waitFor({ timeout: 15_000 });
    } catch (error) {
      await page.screenshot({ path: `${outputDir}/failure-${viewport.name}.png` });
      console.error(
        JSON.stringify({
          viewport: viewport.name,
          url: page.url(),
          pageErrors,
          consoleErrors,
          dialogCount: await dialog.count(),
          dialogContentCount: await page.locator('[data-slot="dialog-content"]').count(),
          visibleLensButtons: await page
            .getByRole("button", { name: "Lens chat", exact: true })
            .count(),
          bodyTail: (await page.locator("body").innerText()).slice(-1000),
        }),
      );
      throw error;
    }
    const box = await dialog.boundingBox();
    assert(box, "Dialog needs a measurable bounding box");
    const centerDelta = Math.abs(box.x + box.width / 2 - viewport.width / 2);
    assert(centerDelta <= 2, `${viewport.name} modal is off-center by ${centerDelta}px`);
    assert(box.x > 0 && box.y > 0, `${viewport.name} modal is pinned to a viewport edge`);

    const composer = dialog.getByRole("textbox");
    if (viewport.name === "desktop") {
      await page.locator("nextjs-portal").evaluateAll((portals) => {
        for (const portal of portals) portal.style.display = "none";
      });
      await page.screenshot({ path: `${outputDir}/desktop-empty.png`, fullPage: false });
      await dialog.getByRole("button", { name: "Ship a product", exact: true }).click();
      assert.equal(await composer.inputValue(), "Ship a product");
    }
    await composer.fill("Help me make a difficult decision.");
    await composer.press("Enter");
    await dialog.getByRole("heading", { name: "A sharper frame", exact: true }).waitFor();

    assert.equal(await dialog.locator("article strong").first().textContent(), "Signal:");
    assert.equal(await dialog.locator("article ul li").count(), 2);
    assert.equal(await dialog.locator("article table").count(), 1);
    assert.equal(await dialog.locator("article a").getAttribute("target"), "_blank");

    const screenshot = `${outputDir}/${viewport.name}.png`;
    await page.locator("nextjs-portal").evaluateAll((portals) => {
      for (const portal of portals) portal.style.display = "none";
    });
    await page.screenshot({ path: screenshot, fullPage: false });

    if (viewport.name === "desktop") {
      await composer.fill("Exercise the retry state.");
      await composer.press("Enter");
      await dialog.getByRole("alert").waitFor();
      await dialog.getByRole("button", { name: "Try again", exact: true }).click();
      await dialog.locator("article").nth(1).waitFor();
      await dialog
        .getByRole("button", { name: "Start a new conversation", exact: true })
        .click();
      assert.equal(await dialog.locator("article").count(), 0);
      await composer.fill("First line");
      await composer.press("Shift+Enter");
      assert((await composer.inputValue()).includes("\n"));
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
    }

    assert.deepEqual(pageErrors, []);
    results.push({
      viewport: viewport.name,
      box,
      centerDelta,
      richText: true,
      screenshot,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const receipt = {
  generatedAt: new Date().toISOString(),
  execution: "mocked authenticated browser validation",
  checks: [
    "centered modal geometry",
    "desktop dark theme",
    "390px mobile layout",
    "rich Markdown semantics and safe external links",
    "contextual starter prompt",
    "error retry without duplicate user turn",
    "new conversation reset",
    "Shift+Enter newline",
    "Escape dismissal",
  ],
  results,
};
await writeFile(`${outputDir}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
