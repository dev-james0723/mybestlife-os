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
    path.join(appRoot, "test-results/journal-redesign/save-flow"),
);
const browserCandidates = [
  process.env.JOURNAL_VERIFY_BROWSER,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browserExecutable = browserCandidates.find((candidate) =>
  existsSync(candidate),
);

assert(browserExecutable, "A Chromium browser executable is required");
await mkdir(outputDir, { recursive: true });

const USER_ID = "00000000-0000-4000-8000-000000000001";
const ENTRY_ID = "00000000-0000-4000-8000-000000000002";
const FIXED_TIME = "2026-09-04T12:00:00.000Z";
const fixtureUser = {
  id: USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "journal-fixture@example.test",
  email_confirmed_at: FIXED_TIME,
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: FIXED_TIME,
  updated_at: FIXED_TIME,
};
const jwtHeader = Buffer.from(
  JSON.stringify({ alg: "HS256", typ: "JWT" }),
).toString("base64url");
const jwtPayload = Buffer.from(
  JSON.stringify({
    aud: "authenticated",
    exp: 4_102_444_800,
    sub: USER_ID,
    email: fixtureUser.email,
    role: "authenticated",
  }),
).toString("base64url");
const fixtureSession = {
  access_token: `${jwtHeader}.${jwtPayload}.fixture-signature`,
  refresh_token: "fixture-refresh",
  token_type: "bearer",
  expires_in: 3_600,
  expires_at: 4_102_444_800,
  user: fixtureUser,
};
const authCookieValue = `base64-${Buffer.from(
  JSON.stringify(fixtureSession),
).toString("base64url")}`;

function deferred() {
  let resolve;
  const promise = new Promise((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

async function waitFor(promise, label, timeoutMs = 20_000) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Timed out waiting for ${label}`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function chooseSelectOption(page, trigger, name) {
  const option = page.getByRole("option", { name, exact: true });
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
      await option.waitFor({ state: "visible", timeout: 2_000 });
      await option.click({ force: true });
      return;
    } catch {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }
  }

  assert.fail(`Select option did not open: ${name}`);
}

const insertGate = deferred();
const insertSeen = deferred();
const summaryGate = deferred();
const summarySeen = deferred();
let insertCount = 0;
let summaryCount = 0;
const unexpectedWrites = [];
const unexpectedAuthRequests = [];

const origin = new URL(baseUrl).origin;
const corsHeaders = {
  "access-control-allow-origin": origin,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers":
    "authorization, apikey, content-type, prefer, x-client-info",
  "access-control-expose-headers": "content-range",
};

const browser = await chromium.launch({
  executablePath: browserExecutable,
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  reducedMotion: "reduce",
});

try {
  await context.addCookies([
    { name: "mylifeos_dev_bypass", value: "1", url: baseUrl },
    {
      name: "sb-aprjlwajbubjddtbqufk-auth-token",
      value: authCookieValue,
      url: baseUrl,
    },
  ]);
  await context.addInitScript(
    ({ session }) => {
      localStorage.setItem(
        "mylifeos-theme",
        JSON.stringify({
          uiTheme: "default",
          colorMode: "dark",
          iconPack: "command-glass",
          fontSize: "medium",
          widgetDensity: "comfortable",
          focusMode: false,
        }),
      );
      localStorage.setItem(
        "mylifeos:settings-profile:v1",
        JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          full_name: "Journal Save Flow",
          avatar_url: null,
          language: "en",
          timezone: "America/Indiana/Indianapolis",
          theme: "dark",
          ui_theme: "default",
          color_mode: "dark",
          focus_areas: [],
          widget_density: "comfortable",
          focus_mode: false,
          font_size_pref: "medium",
          onboarding_completed: true,
        }),
      );
    },
    { session: fixtureSession },
  );

  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.route("**/auth/v1/user", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify(fixtureUser),
    });
  });
  await page.route("**/auth/v1/token*", async (route) => {
    unexpectedAuthRequests.push(route.request().url());
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify({ error: "unexpected_fixture_refresh" }),
    });
  });
  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }
    if (method === "GET" || method === "HEAD") {
      const wantsObject =
        (request.headers().accept ?? "").includes(
          "application/vnd.pgrst.object+json",
        );
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { ...corsHeaders, "content-range": "*/0" },
        body: wantsObject ? "null" : "[]",
      });
      return;
    }
    if (method === "POST" && url.pathname.endsWith("/journal_entries")) {
      insertCount += 1;
      insertSeen.resolve();
      const rawPayload = request.postDataJSON();
      const payload = Array.isArray(rawPayload) ? rawPayload[0] : rawPayload;
      await insertGate.promise;
      const row = {
        id: ENTRY_ID,
        user_id: USER_ID,
        ...payload,
        ai_output: null,
        ai_media: null,
        source: "journal",
        created_at: FIXED_TIME,
        updated_at: FIXED_TIME,
      };
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        headers: { ...corsHeaders, "content-range": "0-0/1" },
        body: JSON.stringify(row),
      });
      return;
    }

    unexpectedWrites.push(`${method} ${url.pathname}`);
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify({ error: "unexpected_fixture_write" }),
    });
  });
  await page.route("**/api/journal/summary", async (route) => {
    summaryCount += 1;
    summarySeen.resolve();
    await summaryGate.promise;
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "fixture_summary_failure" }),
    });
  });

  await page.goto(`${baseUrl}/en/journal`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.locator("[data-slot='os-glass-panel']").first().waitFor();

  const form = page.locator("form").first();
  const selectTriggers = form.locator("[data-slot='select-trigger']");
  await chooseSelectOption(page, selectTriggers.first(), "Quick Reset");
  await page
    .getByRole("group", { name: "Emotion Picker" })
    .getByRole("button", { name: /^Red —/ })
    .click();
  await chooseSelectOption(page, selectTriggers.nth(1), "Enraged");

  const bulletInput = form
    .locator("label")
    .filter({ hasText: "What happened? (1-2 bullets)" })
    .locator("xpath=..")
    .locator("input")
    .first();
  await bulletInput.fill("Received a difficult message.");
  await page
    .getByRole("group", { name: "Needs (choose exactly 1)" })
    .getByRole("checkbox", { name: "Rest", exact: true })
    .click();
  const nextStepInput = form
    .locator("label")
    .filter({ hasText: "Next Tiny Step" })
    .locator("xpath=../..")
    .locator("input")
    .first();
  await nextStepInput.fill("Take three slow breaths.");

  const saveButton = page.getByRole("button", {
    name: "Save Entry",
    exact: true,
  });
  await saveButton.evaluate((button) => {
    button.click();
    button.click();
  });

  try {
    await waitFor(insertSeen.promise, "the first insert request");
  } catch (error) {
    const diagnostics = await form.evaluate((formElement) => ({
      text: formElement.textContent,
      inputs: Array.from(formElement.querySelectorAll("input")).map((input) => ({
        type: input.type,
        value: input.value,
        disabled: input.disabled,
      })),
      alerts: Array.from(formElement.querySelectorAll('[role="alert"]')).map(
        (alert) => alert.textContent,
      ),
      buttons: Array.from(formElement.querySelectorAll("button")).map(
        (button) => ({
          text: button.textContent,
          type: button.type,
          disabled: button.disabled,
          pressed: button.getAttribute("aria-pressed"),
          checked: button.getAttribute("aria-checked"),
        }),
      ),
    }));
    console.error(JSON.stringify({ stage: "insert", diagnostics }, null, 2));
    throw error;
  }
  await page.waitForTimeout(150);
  assert.equal(insertCount, 1, "Rapid submits must create exactly one entry");
  insertGate.resolve();

  await waitFor(summarySeen.promise, "the summary request");
  const summaryPanel = page.locator(
    'section[aria-labelledby="journal-summary-title"]',
  );
  await summaryPanel
    .getByText("Generating summary...", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Save Entry", exact: true }).count(),
    0,
  );
  assert.equal(summaryCount, 1);

  const startNewButton = page.getByRole("button", {
    name: "Start new entry",
    exact: true,
  });
  assert.equal(await startNewButton.isDisabled(), true);
  assert.equal(await selectTriggers.first().isDisabled(), true);
  assert.equal(await selectTriggers.nth(1).isDisabled(), true);
  for (const quadrant of await page
    .getByRole("group", { name: "Emotion Picker" })
    .getByRole("button")
    .all()) {
    assert.equal(await quadrant.isDisabled(), true);
  }
  assert.equal(await bulletInput.isDisabled(), true);
  assert.equal(await nextStepInput.isDisabled(), true);
  assert.equal(
    await page.getByRole("checkbox", { name: "Rest", exact: true }).isDisabled(),
    true,
  );
  assert.equal(
    await page.getByRole("slider", { name: "Intensity" }).getAttribute("aria-disabled"),
    "true",
  );
  await page.screenshot({
    path: path.join(outputDir, "summary-generating-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });

  summaryGate.resolve();
  const failedText = "Entry saved, but the AI summary could not be generated.";
  await summaryPanel.getByText(failedText, { exact: true }).waitFor();
  assert.equal(
    await summaryPanel
      .getByText("Generating summary...", { exact: true })
      .count(),
    0,
  );
  assert.equal(await startNewButton.isEnabled(), true);
  assert.equal(
    await page.getByText("Failed to save entry", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .getByText("Journal entry saved with AI summary!", { exact: true })
      .count(),
    0,
  );
  assert.equal(insertCount, 1);
  assert.equal(summaryCount, 1);
  assert.deepEqual(unexpectedWrites, []);
  assert.deepEqual(unexpectedAuthRequests, []);
  assert.deepEqual(pageErrors, []);
  await page.screenshot({
    path: path.join(outputDir, "summary-failed-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });

  await startNewButton.click();
  await page.getByText(failedText, { exact: true }).waitFor({ state: "hidden" });
  assert.equal(await selectTriggers.first().isEnabled(), true);

  const receipt = {
    checkedAt: new Date().toISOString(),
    execution: "local browser verification with isolated network fixtures",
    browserExecutable,
    viewport: { width: 390, height: 844 },
    assertions: {
      duplicateSavePrevented: insertCount === 1,
      summaryRequestedOnce: summaryCount === 1,
      fieldsLockedWhileSaving: true,
      failedSummaryStateVisible: true,
      contradictoryToastsAbsent: true,
      resetRestoresForm: true,
      unexpectedWrites,
      unexpectedAuthRequests,
      pageErrors,
    },
    screenshots: [
      "summary-generating-mobile.png",
      "summary-failed-mobile.png",
    ],
  };
  await writeFile(
    path.join(outputDir, "receipt.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  insertGate.resolve();
  summaryGate.resolve();
  await context.close();
  await browser.close();
}
