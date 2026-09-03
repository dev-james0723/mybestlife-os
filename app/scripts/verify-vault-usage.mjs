import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VAULT_VERIFY_BASE_URL ?? "http://127.0.0.1:3100";
const outputDir = path.resolve("test-results/software-vault-usage");
const browserExecutable =
  process.env.VAULT_VERIFY_BROWSER ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function vaultEntry({ id, name, count, lastOpenedAt, isDefault = false }) {
  return {
    id,
    user_id: "00000000-0000-4000-8000-000000000001",
    app_name: name,
    website_url: name === "Claude" ? "https://claude.ai" : "https://figma.com",
    icon_url: null,
    category: name === "Claude" ? "AI" : "Design",
    platforms: "Web, macOS",
    use_cases: "Focused creative work",
    status: "Active",
    priority: "Nice-to-have",
    cost_type: "Subscription",
    cost_amount: 20,
    cost_period: "month",
    why_i_use_it: "It supports my core workflow.",
    best_feature: "Fast collaboration",
    biggest_downside: null,
    best_alternative: null,
    replaces: null,
    tags: "workflow",
    default_tool_for: "Creative work",
    summary: "A focused tool used throughout the week.",
    ai_generated_fields: [],
    pricing_plans: [],
    selected_plan_id: null,
    billing_cycle: "monthly",
    cost_currency: "USD",
    alternative_options: [],
    field_sources: [],
    field_confidence: {},
    pricing_last_checked_at: null,
    is_default_stack: isDefault,
    launch_count: count,
    last_opened_at: lastOpenedAt,
    created_at: "2026-08-01T12:00:00.000Z",
    updated_at: lastOpenedAt ?? "2026-08-01T12:00:00.000Z",
  };
}

let entries = [
  vaultEntry({
    id: "10000000-0000-4000-8000-000000000001",
    name: "Claude",
    count: 4,
    lastOpenedAt: "2026-09-01T12:00:00.000Z",
    isDefault: true,
  }),
  vaultEntry({
    id: "20000000-0000-4000-8000-000000000002",
    name: "Figma",
    count: 2,
    lastOpenedAt: "2026-08-30T12:00:00.000Z",
  }),
];

function overlaps(a, b) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

async function installMocks(page) {
  await page.route("**/rest/v1/software_vault*", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": `0-${entries.length - 1}/${entries.length}` },
      body: JSON.stringify(entries),
    });
  });

  await page.route("**/api/vault/usage/record", async (route) => {
    assert.equal(route.request().method(), "POST");
    const body = route.request().postDataJSON();
    assert.equal(body.entryId, entries[0].id);
    const recordedAt = new Date().toISOString();
    entries = entries.map((entry, index) =>
      index === 0
        ? {
            ...entry,
            launch_count: entry.launch_count + 1,
            last_opened_at: recordedAt,
            updated_at: recordedAt,
          }
        : entry,
    );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: null,
        launchCount: entries[0].launch_count,
        lastOpenedAt: recordedAt,
        historyRecorded: false,
      }),
    });
  });
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: browserExecutable });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.addCookies([
  {
    name: "mylifeos_dev_bypass",
    value: "1",
    domain: "127.0.0.1",
    path: "/",
  },
]);
const page = await context.newPage();
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
});
await installMocks(page);

try {
  await page.goto(`${baseUrl}/en/vault`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText("Claude", { exact: true }).first().click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.getByTestId("vault-use-count").filter({ visible: true }).waitFor();
  assert.equal(await page.getByTestId("vault-use-count").filter({ visible: true }).textContent(), "4");
  assert.equal(await dialog.getByText("Tool Intelligence", { exact: true }).count(), 0);

  const defaultAction = await page.getByTestId("vault-default-stack-action").boundingBox();
  const recordAction = await page.getByTestId("vault-record-use").boundingBox();
  const toolbar = await page.getByRole("group", { name: "Tool actions" }).boundingBox();
  const close = await dialog.getByRole("button", { name: "Close" }).boundingBox();
  assert(defaultAction && recordAction && toolbar && close);
  assert(Math.abs(defaultAction.x - recordAction.x) <= 2, "mobile primary actions are not left-aligned");
  assert(!overlaps(toolbar, close), "modal toolbar overlaps the close button");

  await page.screenshot({
    path: path.join(outputDir, "mobile-modal-before-record.png"),
    fullPage: true,
  });

  await page.getByTestId("vault-record-use").click();
  await page.getByTestId("vault-use-count").filter({ visible: true }).getByText("5", { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(outputDir, "mobile-modal-after-record.png"),
    fullPage: true,
  });

  await dialog.getByRole("button", { name: "Close" }).click();
  await page.getByRole("tab", { name: "Usage" }).click();
  await page.getByTestId("vault-usage-dashboard").waitFor();
  await page.getByTestId("vault-usage-frequency-chart").waitFor();
  await page.getByTestId("vault-usage-distribution-chart").waitFor();
  await page.getByText("7", { exact: true }).first().waitFor();
  await page.waitForFunction(
    () => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.includes("Usage"),
  );
  await page.waitForTimeout(1_200);
  assert(
    await page.locator(".recharts-pie-sector").count() > 0,
    "usage distribution sectors did not render",
  );
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(mobileOverflow <= 1, `mobile horizontal overflow: ${mobileOverflow}px`);
  await page.screenshot({
    path: path.join(outputDir, "mobile-usage-dashboard.png"),
  });
  const mainRegion = page.getByRole("region", { name: "Main content" });
  await mainRegion.evaluate((element) => element.scrollTo({ top: element.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outputDir, "mobile-usage-ranking.png") });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("region", { name: "Main content" }).evaluate(
    (element) => element.scrollTo({ top: 0, behavior: "instant" }),
  );
  await page.waitForFunction(
    () => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.includes("Usage"),
  );
  await page.getByTestId("vault-usage-dashboard").waitFor();
  await page.waitForTimeout(1_200);
  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(desktopOverflow <= 1, `desktop horizontal overflow: ${desktopOverflow}px`);
  await page.screenshot({
    path: path.join(outputDir, "desktop-usage-dashboard.png"),
  });

  const receipt = {
    state: "mocked-browser-validation",
    passed: true,
    viewportChecks: ["390x844", "1280x900"],
    assertions: {
      mobileActionsLeftAligned: true,
      headerToolbarDoesNotOverlapClose: true,
      toolIntelligenceHidden: true,
      recordUseCountUpdated: "4 -> 5",
      usageDashboardTotalUpdated: 7,
      chartsRendered: ["frequency", "distribution"],
      horizontalOverflow: false,
      browserErrors,
    },
  };
  await writeFile(path.join(outputDir, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await browser.close();
}
