import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.DAILY_PLANNER_DND_VERIFY_BASE_URL ?? "http://127.0.0.1:3100";
const outputDir = path.join(appRoot, "test-results/daily-planner-dnd");
const timeZone = process.env.DAILY_PLANNER_DND_VERIFY_TIME_ZONE ?? "America/Indiana/Indianapolis";
const touchPreActivationMs = Number(
  process.env.DAILY_PLANNER_DND_VERIFY_TOUCH_PRE_ACTIVATION_MS ?? 120,
);
const maxTouchActivationMs = Number(
  process.env.DAILY_PLANNER_DND_VERIFY_MAX_TOUCH_ACTIVATION_MS ?? 450,
);
const maxMouseActivationMs = Number(
  process.env.DAILY_PLANNER_DND_VERIFY_MAX_MOUSE_ACTIVATION_MS ?? 750,
);
const maxVisibleDropMs = Number(
  process.env.DAILY_PLANNER_DND_VERIFY_MAX_VISIBLE_DROP_MS ?? 1_000,
);
const dropOverlaySettleMs = 300;
const requestedScenarios = new Set(
  (process.env.DAILY_PLANNER_DND_VERIFY_SCENARIOS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const receiptFileName = path.basename(
  process.env.DAILY_PLANNER_DND_VERIFY_RECEIPT_FILE ?? "receipt.json",
);

const browserCandidates = [
  process.env.DAILY_PLANNER_DND_VERIFY_BROWSER,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browserExecutable = browserCandidates.find((candidate) => existsSync(candidate));

const taskIds = ["planner-a", "planner-b", "planner-c", "planner-d", "planner-e"];
const initialOrder = [...taskIds];

function dateKeyInTimeZone(date, targetTimeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: targetTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const planDate = dateKeyInTimeZone(new Date(), timeZone);
const storageKey = `mylifeos:daily-plan:v1:${planDate}`;
const seededAt = new Date().toISOString();
const fixture = {
  plan_date: planDate,
  start_time: "09:00",
  end_time: "18:00",
  mode: "time-block",
  schedule_image_url: null,
  template_id: null,
  created_at: seededAt,
  updated_at: seededAt,
  free_tasks: [],
  tasks: taskIds.map((plannerTaskId, order) => ({
    plannerTaskId,
    taskName: `Task ${String.fromCharCode(65 + order)}`,
    blocks: 2,
    gapBlocks: 0,
    order,
  })),
};

function taskSelector(id) {
  return `[data-planner-task-id="${id}"]`;
}

function cardBodySelector(id) {
  return `${taskSelector(id)} > div > div.z-10`;
}

function rowClipSelector(id) {
  return `${taskSelector(id)} > div`;
}

function swipeActionPanelSelector(id) {
  return `${rowClipSelector(id)} > div.z-0`;
}

function handleSelector(id) {
  return `${taskSelector(id)} [data-drag-handle]`;
}

function serializeError(error) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: "UnknownError", message: String(error) };
}

async function ensureServerIsReachable() {
  try {
    await fetch(`${baseUrl}/en/daily-planner`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    throw new Error(
      `Daily Planner dev server is unavailable at ${baseUrl}. Start it with \`npm run dev:3100\` from ${appRoot}.`,
      { cause: error },
    );
  }
}

async function installFixture(page) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    },
    { key: storageKey, value: fixture },
  );

  // The Daily Planner uses localStorage in dev-bypass mode. Other page-level
  // data hooks may still make read-only PostgREST requests; keep those
  // deterministic and unrelated to the drag assertions.
  await page.route("**/rest/v1/**", async (route) => {
    const accept = route.request().headers().accept ?? "";
    const wantsObject = accept.includes("application/vnd.pgrst.object+json");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "*/0" },
      body: wantsObject ? "null" : "[]",
    });
  });
  await page.route("**/api/quick-tasks/backfill-icons", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ updated: 0 }),
    });
  });
}

function recordDiagnostics(page) {
  const diagnostics = {
    pageErrors: [],
    consoleErrors: [],
    requestFailures: [],
    startupRetries: [],
  };
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    diagnostics.requestFailures.push({
      method: request.method(),
      url: request.url(),
      reason: request.failure()?.errorText ?? "unknown",
    });
  });
  return diagnostics;
}

async function openSeededPlanner(browser, kind) {
  const mobile = kind === "mobile";
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    deviceScaleFactor: mobile ? 2 : 1,
    hasTouch: mobile,
    isMobile: mobile,
    reducedMotion: "no-preference",
    timezoneId: timeZone,
  });
  await context.addCookies([{ name: "mylifeos_dev_bypass", value: "1", url: baseUrl }]);
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const diagnostics = recordDiagnostics(page);
  await installFixture(page);
  await page.goto(`${baseUrl}/en/daily-planner`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  // A fresh Next dev context can occasionally stall during client bootstrap.
  // Record that state and retry the navigation once; gesture timing starts
  // only after the fixture has rendered, so this cannot mask drag latency.
  const firstTask = page.locator(taskSelector("planner-a"));
  try {
    await firstTask.waitFor({ state: "visible", timeout: 15_000 });
  } catch (firstError) {
    diagnostics.startupRetries.push({
      reason: firstError instanceof Error ? firstError.message : String(firstError),
      url: page.url(),
      localFixturePresent: await page.evaluate((key) => localStorage.getItem(key) !== null, storageKey),
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await firstTask.waitFor({ state: "visible", timeout: 45_000 });
  }
  await expectOrder(page, initialOrder, "initial fixture order");
  await assertRequiredSelectors(page);
  return { context, page, diagnostics };
}

async function assertRequiredSelectors(page) {
  for (const id of taskIds) {
    assert.equal(
      await page.locator(taskSelector(id)).count(),
      1,
      `Expected one stable row selector for ${id}`,
    );
    assert.equal(
      await page.locator(handleSelector(id)).count(),
      1,
      `Expected one dedicated drag handle for ${id}`,
    );
    assert.equal(
      await page.locator(taskSelector(id)).getAttribute("data-dnd-state"),
      "idle",
      `Expected ${id} to expose data-dnd-state="idle" before dragging`,
    );
  }
}

async function visibleOrder(page) {
  return page.locator("[data-planner-task-id]").evaluateAll((nodes) => {
    const result = [];
    for (const node of nodes) {
      if (!(node instanceof HTMLElement) || node.offsetParent === null) continue;
      const id = node.dataset.plannerTaskId;
      if (id && !result.includes(id)) result.push(id);
    }
    return result;
  });
}

async function expectOrder(page, expected, label) {
  await page.waitForFunction(
    ({ selector, target }) => {
      const result = [];
      for (const node of document.querySelectorAll(selector)) {
        if (!(node instanceof HTMLElement) || node.offsetParent === null) continue;
        const id = node.dataset.plannerTaskId;
        if (id && !result.includes(id)) result.push(id);
      }
      return JSON.stringify(result) === JSON.stringify(target);
    },
    { selector: "[data-planner-task-id]", target: expected },
  );
  assert.deepEqual(await visibleOrder(page), expected, label);
}

async function centerOf(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  return currentCenterOf(locator, label);
}

async function currentCenterOf(locator, label) {
  const box = await locator.boundingBox();
  assert(box, `${label} needs a measurable bounding box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

async function waitForDragState(page, id, timeout = maxTouchActivationMs) {
  await page.locator(`${taskSelector(id)}[data-dnd-state="dragging"]`).waitFor({
    state: "attached",
    timeout,
  });
}

async function persistedTasks(page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.tasks ?? null;
  }, storageKey);
}

async function waitForPersistedOrder(page, expected) {
  await page.waitForFunction(
    ({ key, target }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return (
        JSON.stringify(parsed.tasks?.map((task) => task.plannerTaskId)) ===
        JSON.stringify(target)
      );
    },
    { key: storageKey, target: expected },
    { timeout: 8_000 },
  );
  const persisted = await persistedTasks(page);
  assert(Array.isArray(persisted), "Expected a persisted planner task array");
  assert.deepEqual(
    persisted.map((task) => task.plannerTaskId),
    expected,
    "persisted task order",
  );
  assert.deepEqual(
    persisted.map((task) => task.order),
    expected.map((_, order) => order),
    "persisted order fields must be contiguous",
  );
  assert(
    persisted.every((task) => !("_uid" in task)),
    "Client-only _uid fields must not be persisted",
  );
  assert(
    persisted.every((task) => task.start_time == null && task.end_time == null),
    "The derived-only fixture must stay derived-only after reordering",
  );
}

async function expectTaskTimeRange(page, id, expectedTimeRange) {
  await page.waitForFunction(
    ({ selector, target }) =>
      document.querySelector(selector)?.textContent?.includes(target) === true,
    { selector: taskSelector(id), target: expectedTimeRange },
  );
}

async function scrollState(page) {
  return page.evaluate(() => {
    const main = document.querySelector('[role="region"][aria-label="Main content"]');
    return {
      main: main instanceof HTMLElement ? main.scrollTop : 0,
      document: document.scrollingElement?.scrollTop ?? 0,
    };
  });
}

async function assertPointHits(page, point, selector, label) {
  const hit = await page.evaluate(
    ({ x, y, targetSelector }) => {
      const inViewport = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight;
      const element = inViewport ? document.elementFromPoint(x, y) : null;
      return {
        inViewport,
        matches: element instanceof Element && element.closest(targetSelector) !== null,
        hitTag: element?.tagName ?? null,
      };
    },
    { x: point.x, y: point.y, targetSelector: selector },
  );
  assert(hit.inViewport, `${label} center must be inside the viewport`);
  assert(hit.matches, `${label} center must hit ${selector}; hit ${hit.hitTag ?? "nothing"}`);
}

function assertNoPageErrors(diagnostics, scenario) {
  assert.deepEqual(
    diagnostics.pageErrors,
    [],
    `${scenario} emitted page runtime errors`,
  );
}

async function dispatchTouch(client, type, x, y) {
  await client.send("Input.dispatchTouchEvent", {
    type,
    touchPoints:
      type === "touchEnd" || type === "touchCancel"
        ? []
        : [{ id: 1, x, y, radiusX: 2, radiusY: 2, force: 1 }],
  });
}

async function moveTouch(page, client, from, to, steps = 12) {
  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    await dispatchTouch(
      client,
      "touchMove",
      from.x + (to.x - from.x) * progress,
      from.y + (to.y - from.y) * progress,
    );
    await page.waitForTimeout(18);
  }
}

async function captureFailure(page, scenarioName) {
  await page
    .screenshot({
      path: path.join(outputDir, `failure-${scenarioName}.png`),
      fullPage: false,
    })
    .catch(() => {});
}

async function desktopMouseScenario(browser) {
  const { context, page, diagnostics } = await openSeededPlanner(browser, "desktop");
  try {
    await page.evaluate(() => {
      globalThis.__plannerOriginalARow = document.querySelector(
        '[data-planner-task-id="planner-a"]',
      );
    });
    const source = await centerOf(page.locator(handleSelector("planner-a")), "Task A handle");
    const target = await centerOf(page.locator(taskSelector("planner-b")), "Task B row");
    await assertPointHits(page, source, handleSelector("planner-a"), "Task A handle");
    await assertPointHits(page, target, taskSelector("planner-b"), "Task B row");

    await page.mouse.move(source.x, source.y);
    await page.mouse.down();
    const activationStartedAt = Date.now();
    await page.mouse.move(source.x, source.y + 12, { steps: 3 });
    await waitForDragState(page, "planner-a", maxMouseActivationMs);
    const activationMs = Date.now() - activationStartedAt;
    assert(
      activationMs <= maxMouseActivationMs,
      `Mouse activation took ${activationMs}ms (limit ${maxMouseActivationMs}ms)`,
    );
    await page.screenshot({
      path: path.join(outputDir, "desktop-mouse-drag-active.png"),
      fullPage: false,
    });
    await page.mouse.move(source.x, target.y + target.box.height * 0.2, { steps: 12 });
    const dropStartedAt = Date.now();
    await page.mouse.up();

    const expected = ["planner-b", "planner-a", "planner-c", "planner-d", "planner-e"];
    await expectOrder(page, expected, "mouse drag A below B");
    const visibleDropMs = Date.now() - dropStartedAt;
    assert(
      visibleDropMs <= maxVisibleDropMs,
      `Mouse drop took ${visibleDropMs}ms to show the new order (limit ${maxVisibleDropMs}ms)`,
    );
    await expectTaskTimeRange(page, "planner-a", "9:20 AM – 9:40 AM");
    await page.waitForTimeout(dropOverlaySettleMs);
    await page.screenshot({
      path: path.join(outputDir, "desktop-mouse-after-drop.png"),
      fullPage: false,
    });

    await waitForPersistedOrder(page, expected);
    await page.waitForTimeout(500);
    assert(
      await page.evaluate(
        () =>
          globalThis.__plannerOriginalARow ===
          document.querySelector('[data-planner-task-id="planner-a"]'),
      ),
      "Task A should retain the same DOM row across save/refetch hydration",
    );
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator(taskSelector("planner-b")).waitFor({ state: "visible" });
    await expectOrder(page, expected, "saved mouse order after reload");
    assertNoPageErrors(diagnostics, "desktop mouse and persistence");

    return {
      assertions: {
        mouseDrag: "Task A moved below Task B",
        activationMs,
        visibleDropMs,
        persistedLocalOrder: expected,
        rowIdentityStableAcrossRefetch: true,
        survivedReload: true,
      },
      diagnostics,
    };
  } catch (error) {
    await captureFailure(page, "desktop-mouse-and-persistence");
    throw error;
  } finally {
    await context.close();
  }
}

async function mobileBodyScrollScenario(browser) {
  const { context, page, diagnostics } = await openSeededPlanner(browser, "mobile");
  const client = await context.newCDPSession(page);
  try {
    const title = page.locator(taskSelector("planner-c")).getByText("Task C", { exact: true });
    await title.evaluate((element) => element.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(100);
    const closedCardBackground = await page
      .locator(cardBodySelector("planner-c"))
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    assert.equal(
      closedCardBackground,
      "rgb(255, 255, 255)",
      "A closed mobile task card must fully cover the hidden swipe actions",
    );
    const closedCardTransform = await page
      .locator(cardBodySelector("planner-c"))
      .evaluate((element) => getComputedStyle(element).transform);
    assert.equal(
      closedCardTransform,
      "none",
      "A fully closed mobile card must not retain a compositor transform",
    );
    const closedCornerRadii = {
      wrapper: await page
        .locator(rowClipSelector("planner-c"))
        .evaluate((element) => getComputedStyle(element).borderTopRightRadius),
      card: await page
        .locator(cardBodySelector("planner-c"))
        .evaluate((element) => getComputedStyle(element).borderTopRightRadius),
      actionPanel: await page
        .locator(swipeActionPanelSelector("planner-c"))
        .evaluate((element) => getComputedStyle(element).borderTopRightRadius),
    };
    assert.equal(
      closedCornerRadii.card,
      "0px",
      "The overscanning mobile foreground must keep a square right edge so hidden action colors cannot enter the outer anti-aliased clip",
    );
    assert.notEqual(
      closedCornerRadii.wrapper,
      "0px",
      "The outer wrapper must preserve the visible rounded corner",
    );
    assert.equal(
      Number.parseFloat(closedCornerRadii.wrapper) -
        Number.parseFloat(closedCornerRadii.actionPanel),
      1,
      "The action panel radius must be concentric with its 1px inset wrapper",
    );
    const closedLayerWidths = {
      wrapper: await page
        .locator(rowClipSelector("planner-c"))
        .evaluate((element) => element.getBoundingClientRect().width),
      card: await page
        .locator(cardBodySelector("planner-c"))
        .evaluate((element) => element.getBoundingClientRect().width),
    };
    assert(
      closedLayerWidths.card >= closedLayerWidths.wrapper + 1.5,
      `The mobile card must overscan the clip by 2px; observed ${closedLayerWidths.card - closedLayerWidths.wrapper}px`,
    );
    const closedActionInsets = await page.evaluate(
      ({ wrapperSelector, panelSelector }) => {
        const wrapper = document.querySelector(wrapperSelector)?.getBoundingClientRect();
        const panel = document.querySelector(panelSelector)?.getBoundingClientRect();
        if (!wrapper || !panel) return null;
        return {
          top: panel.top - wrapper.top,
          right: wrapper.right - panel.right,
          bottom: wrapper.bottom - panel.bottom,
        };
      },
      {
        wrapperSelector: rowClipSelector("planner-c"),
        panelSelector: swipeActionPanelSelector("planner-c"),
      },
    );
    assert(closedActionInsets, "The mobile action panel and wrapper must both render");
    assert(
      closedActionInsets.top >= 0.75 &&
        closedActionInsets.right >= 0.75 &&
        closedActionInsets.bottom >= 0.75,
      `The hidden action panel must stay at least 1px inside the outer clip; observed ${JSON.stringify(closedActionInsets)}`,
    );
    const source = await centerOf(title, "Task C body");
    await assertPointHits(page, source, taskSelector("planner-c"), "Task C body");
    const touchActionChain = await page.evaluate(
      ({ x, y }) => {
        const actions = [];
        let element = document.elementFromPoint(x, y);
        while (element instanceof HTMLElement) {
          actions.push(getComputedStyle(element).touchAction);
          if (element.matches('[role="region"][aria-label="Main content"]')) break;
          element = element.parentElement;
        }
        return actions;
      },
      source,
    );
    assert(
      touchActionChain.includes("pan-y"),
      `Task body ancestor chain must explicitly allow pan-y; observed ${touchActionChain.join(", ")}`,
    );
    assert(
      !touchActionChain.includes("none"),
      `Task body ancestor chain must not claim all touch movement; observed ${touchActionChain.join(", ")}`,
    );
    const before = await scrollState(page);
    const scrollHeadroom = await page.evaluate(() => {
      const main = document.querySelector('[role="region"][aria-label="Main content"]');
      return main instanceof HTMLElement
        ? main.scrollHeight - main.clientHeight - main.scrollTop
        : 0;
    });
    assert(scrollHeadroom >= 50, `Main content needs scroll headroom; observed ${scrollHeadroom}px`);

    await dispatchTouch(client, "touchStart", source.x, source.y);
    await moveTouch(
      page,
      client,
      source,
      { x: source.x + 2, y: Math.max(40, source.y - 150) },
      10,
    );
    await dispatchTouch(client, "touchEnd", source.x + 2, Math.max(40, source.y - 150));
    await page.waitForTimeout(350);

    const after = await scrollState(page);
    const scrollDelta = after.main - before.main;
    assert(
      scrollDelta >= 20,
      `Vertical swipe on the task body should scroll the page; observed ${scrollDelta.toFixed(1)}px`,
    );
    await expectOrder(page, initialOrder, "body scroll must not reorder tasks");
    await page.screenshot({
      path: path.join(outputDir, "mobile-body-scroll.png"),
      fullPage: false,
    });
    assertNoPageErrors(diagnostics, "mobile body scroll");

    return {
      assertions: {
        closedCardBackground,
        closedCardTransform,
        closedCornerRadii,
        closedLayerWidths,
        closedActionInsets,
        bodyTouchActionChain: touchActionChain,
        bodyScrollDeltaPx: scrollDelta,
        orderUnchanged: true,
      },
      diagnostics,
    };
  } catch (error) {
    await captureFailure(page, "mobile-body-scroll");
    throw error;
  } finally {
    await client.detach();
    await context.close();
  }
}

async function mobileLongPressScenario(browser) {
  const { context, page, diagnostics } = await openSeededPlanner(browser, "mobile");
  const client = await context.newCDPSession(page);
  try {
    await page
      .locator(taskSelector("planner-c"))
      .evaluate((element) => element.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(100);
    // Measure both after one shared scroll. Calling scrollIntoView separately
    // would invalidate the first row's coordinates on a short mobile viewport.
    const source = await currentCenterOf(
      page.locator(handleSelector("planner-b")),
      "Task B handle",
    );
    const target = await currentCenterOf(
      page.locator(taskSelector("planner-e")),
      "Task E row",
    );
    await assertPointHits(page, source, handleSelector("planner-b"), "Task B handle");
    await assertPointHits(page, target, taskSelector("planner-e"), "Task E row");
    const handleTouchAction = await page
      .locator(handleSelector("planner-b"))
      .evaluate((element) => getComputedStyle(element).touchAction);
    assert.equal(handleTouchAction, "none", "The dedicated mobile drag handle must use touch-action:none");
    const beforeScroll = await scrollState(page);
    const activationStartedAt = Date.now();

    await dispatchTouch(client, "touchStart", source.x, source.y);
    await page.waitForTimeout(touchPreActivationMs);
    assert.equal(
      await page.locator(taskSelector("planner-b")).getAttribute("data-dnd-state"),
      "idle",
      `Touch drag must stay idle during the first ${touchPreActivationMs}ms`,
    );
    const elapsedBeforeActivationWait = Date.now() - activationStartedAt;
    await waitForDragState(
      page,
      "planner-b",
      Math.max(50, maxTouchActivationMs - elapsedBeforeActivationWait),
    );
    const activationMs = Date.now() - activationStartedAt;
    assert(
      activationMs <= maxTouchActivationMs,
      `Long-press activation took ${activationMs}ms (limit ${maxTouchActivationMs}ms)`,
    );
    await moveTouch(page, client, source, { x: source.x, y: target.y }, 16);
    await page.screenshot({
      path: path.join(outputDir, "mobile-long-press-drag-active.png"),
      fullPage: false,
    });
    const expected = ["planner-a", "planner-c", "planner-d", "planner-e", "planner-b"];
    const dropStartedAt = Date.now();
    await dispatchTouch(client, "touchEnd", source.x, target.y);
    await expectOrder(page, expected, "long-press drag B to E");
    const visibleDropMs = Date.now() - dropStartedAt;
    assert(
      visibleDropMs <= maxVisibleDropMs,
      `Touch drop took ${visibleDropMs}ms to show the new order (limit ${maxVisibleDropMs}ms)`,
    );
    const afterScroll = await scrollState(page);
    const scrollDelta = Math.abs(afterScroll.main - beforeScroll.main);
    assert(
      scrollDelta <= 4,
      `Dragging from the handle must not scroll the page; observed ${scrollDelta.toFixed(1)}px`,
    );
    await expectTaskTimeRange(page, "planner-b", "10:20 AM – 10:40 AM");
    await page.waitForTimeout(dropOverlaySettleMs);
    await page.screenshot({
      path: path.join(outputDir, "mobile-long-press-after-drop.png"),
      fullPage: false,
    });
    assertNoPageErrors(diagnostics, "mobile long-press handle");

    return {
      assertions: {
        handleTouchAction,
        activationMs,
        visibleDropMs,
        touchDrag: "Task B moved to Task E position",
        pageScrollDeltaPx: scrollDelta,
      },
      diagnostics,
    };
  } catch (error) {
    await captureFailure(page, "mobile-long-press-handle");
    throw error;
  } finally {
    // A failing assertion can leave the synthetic finger down. Cancel first so
    // the shared browser process cannot inherit a stuck input state.
    await dispatchTouch(client, "touchCancel", 0, 0).catch(() => {});
    await client.detach();
    await context.close();
  }
}

async function keyboardScenario(browser) {
  const { context, page, diagnostics } = await openSeededPlanner(browser, "desktop");
  try {
    const handle = page.locator(handleSelector("planner-b"));
    await handle.focus();
    assert(
      await handle.evaluate((element) => document.activeElement === element),
      "Dedicated drag handle must be keyboard-focusable",
    );
    await handle.press("Space");
    await page.locator(`${taskSelector("planner-b")}[data-dnd-state="dragging"]`).waitFor();
    // KeyboardSensor installs its document-level key listener on the next
    // macrotask. Give that listener (and the first sortable measurement) a
    // chance to settle before sending the move and drop keystrokes.
    await page.waitForTimeout(75);
    await page.keyboard.press("ArrowDown", { delay: 20 });
    await page.waitForFunction(
      ({ draggedSelector, destinationSelector }) => {
        const dragged = document.querySelector(draggedSelector);
        const destination = document.querySelector(destinationSelector);
        if (!(dragged instanceof HTMLElement) || !(destination instanceof HTMLElement)) {
          return false;
        }
        return dragged.getBoundingClientRect().top > destination.getBoundingClientRect().top;
      },
      {
        draggedSelector: taskSelector("planner-b"),
        destinationSelector: taskSelector("planner-c"),
      },
      { timeout: 2_000 },
    );
    await page.keyboard.press("Space", { delay: 20 });
    await page.locator(`${taskSelector("planner-b")}[data-dnd-state="idle"]`).waitFor();

    const expected = ["planner-a", "planner-c", "planner-b", "planner-d", "planner-e"];
    await expectOrder(page, expected, "keyboard reorder B below C");
    await expectTaskTimeRange(page, "planner-b", "9:40 AM – 10:00 AM");
    await page.waitForTimeout(dropOverlaySettleMs);
    assert(
      await page
        .locator(handleSelector("planner-b"))
        .evaluate((element) => document.activeElement === element),
      "Keyboard focus must remain on the moved Task B handle after drop",
    );
    await page.screenshot({
      path: path.join(outputDir, "desktop-keyboard-after-drop.png"),
      fullPage: false,
    });
    assertNoPageErrors(diagnostics, "keyboard handle");

    return {
      assertions: {
        handleKeyboardFocusable: true,
        focusRetainedAfterDrop: true,
        keyboardReorder: "Space, ArrowDown, Space moved Task B below Task C",
      },
      diagnostics,
    };
  } catch (error) {
    await captureFailure(page, "keyboard-handle");
    throw error;
  } finally {
    await context.close();
  }
}

await mkdir(outputDir, { recursive: true });
const startedAt = new Date().toISOString();
const results = [];

try {
  assert(browserExecutable, `No supported system Chromium executable found: ${browserCandidates.join(", ")}`);
  await ensureServerIsReachable();

  const allScenarios = [
    ["desktop-mouse-and-persistence", desktopMouseScenario],
    ["mobile-body-scroll", mobileBodyScrollScenario],
    ["mobile-long-press-handle", mobileLongPressScenario],
    ["keyboard-handle", keyboardScenario],
  ];
  const scenarios =
    requestedScenarios.size === 0
      ? allScenarios
      : allScenarios.filter(([name]) => requestedScenarios.has(name));
  assert(scenarios.length > 0, "No matching Daily Planner verification scenarios were selected");

  for (const [name, run] of scenarios) {
    let scenarioBrowser;
    try {
      // A separate browser process per journey prevents webpack HMR and
      // third-party animation workers from leaking bootstrap state between
      // otherwise isolated mouse, touch, and keyboard checks.
      scenarioBrowser = await chromium.launch({
        headless: true,
        executablePath: browserExecutable,
      });
      const result = await run(scenarioBrowser);
      results.push({ name, passed: true, ...result });
      console.log(`PASS ${name}`);
    } catch (error) {
      results.push({ name, passed: false, error: serializeError(error) });
      console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await scenarioBrowser?.close();
    }
  }
} catch (error) {
  results.push({ name: "setup", passed: false, error: serializeError(error) });
  console.error(`FAIL setup: ${error instanceof Error ? error.message : String(error)}`);
}

const receipt = {
  state: results.length > 0 && results.every((result) => result.passed) ? "passed" : "failed",
  execution: "local dev-bypass browser validation with an isolated localStorage fixture",
  startedAt,
  finishedAt: new Date().toISOString(),
  baseUrl,
  browserExecutable,
  viewportChecks: ["1280x900 mouse + keyboard", "390x844 emulated touch"],
  fixture: { planDate, storageKey, taskIds },
  checks: [
    "desktop mouse drag moves Task A below Task B",
    "the reordered plan is written to localStorage and survives reload",
    "a vertical touch gesture on the card body scrolls without reordering",
    "closed mobile task cards are opaque so hidden swipe actions cannot bleed through",
    "the visible wrapper keeps a 14 px radius while the hidden panel is concentrically inset by 1 px",
    "the opaque mobile foreground overscans the right clip edge by 2 px",
    "fully closed mobile cards return to transform:none to avoid a composited color seam",
    "a bounded long press on the dedicated mobile handle moves Task B to Task E without scrolling",
    "the dedicated handle supports Space/ArrowDown/Space keyboard reordering",
  ],
  selectors: ["data-planner-task-id", "data-drag-handle", "data-dnd-state"],
  results,
};

await writeFile(
  path.join(outputDir, receiptFileName),
  `${JSON.stringify(receipt, null, 2)}\n`,
);
console.log(JSON.stringify(receipt, null, 2));

if (receipt.state !== "passed") process.exitCode = 1;
