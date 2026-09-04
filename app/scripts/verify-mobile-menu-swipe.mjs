import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(appDir, "test-results", "mobile-menu-swipe");
const receiptPath = path.join(outputDir, "result.json");
const swipeAreaSelector = '[data-slot="sidebar-swipe-area"]';
const drawerSelector = '[data-sidebar="sidebar"][data-mobile="true"]';
const backdropSelector = '[data-slot="sidebar-drawer-backdrop"]';
const mainRegionSelector = '[role="region"][aria-label="Main content"]';
const sourcePaths = [
  fileURLToPath(import.meta.url),
  path.join(appDir, "src", "components", "ui", "sidebar.tsx"),
  path.join(appDir, "src", "components", "protected-scroll-layout.tsx"),
  path.join(appDir, "src", "components", "topbar", "utility-pill.tsx"),
  path.join(appDir, "src", "components", "app-sidebar.tsx"),
  path.join(appDir, "src", "app", "globals.css"),
];
const browserCandidates = [
  process.env.MOBILE_MENU_SWIPE_VERIFY_BROWSER,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browserExecutable = browserCandidates.find((candidate) =>
  existsSync(candidate),
);

async function computeSourceHash() {
  const hash = createHash("sha256");
  for (const sourcePath of sourcePaths) {
    hash.update(sourcePath);
    hash.update(await readFile(sourcePath));
  }
  return hash.digest("hex");
}

async function writeReceipt(receipt) {
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

function recordPageErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
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

async function moveTouch(page, client, points) {
  for (const point of points) {
    await dispatchTouch(client, "touchMove", point.x, point.y);
    await page.waitForTimeout(24);
  }
}

async function waitForDrawerOpen(page) {
  await page.locator(drawerSelector).waitFor({ state: "visible" });
  await page.waitForFunction((selector) => {
    const drawer = document.querySelector(selector);
    if (!(drawer instanceof HTMLElement)) return false;
    return drawer.hasAttribute("data-open") &&
      !drawer.hasAttribute("data-swiping") &&
      Math.abs(drawer.getBoundingClientRect().right - window.innerWidth) < 0.5;
  }, drawerSelector);
}

async function waitForDrawerClosed(page) {
  await page.waitForFunction((selector) => {
    const drawer = document.querySelector(selector);
    if (!(drawer instanceof HTMLElement) || drawer.hidden) return true;

    const style = getComputedStyle(drawer);
    const rect = drawer.getBoundingClientRect();
    return !drawer.hasAttribute("data-open") &&
      (style.display === "none" ||
        style.visibility === "hidden" ||
        rect.left >= window.innerWidth - 1);
  }, drawerSelector);
}

async function readDrawerState(page) {
  return page.locator(drawerSelector).evaluate((drawer) => {
    const rect = drawer.getBoundingClientRect();
    const style = getComputedStyle(drawer);
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      transform: style.transform,
      transitionDuration: style.transitionDuration,
      open: drawer.hasAttribute("data-open"),
      swiping: drawer.hasAttribute("data-swiping"),
    };
  });
}

async function readBackdropState(page) {
  return page.locator(backdropSelector).evaluate((backdrop) => {
    const style = getComputedStyle(backdrop);
    return {
      opacity: Number.parseFloat(style.opacity),
      transitionDuration: style.transitionDuration,
      swiping: backdrop.hasAttribute("data-swiping"),
    };
  });
}

async function ensureScrollableMainRegion(page) {
  return page.locator(mainRegionSelector).evaluate((region) => {
    if (!region.querySelector('[data-mobile-menu-scroll-spacer="true"]')) {
      const spacer = document.createElement("div");
      spacer.style.height = "2000px";
      spacer.style.width = "1px";
      spacer.style.pointerEvents = "none";
      spacer.dataset.mobileMenuScrollSpacer = "true";
      region.append(spacer);
    }
    region.scrollTop = 0;
    return {
      clientHeight: region.clientHeight,
      scrollHeight: region.scrollHeight,
      scrollTop: region.scrollTop,
    };
  });
}

async function startDrawerOpenObserver(page) {
  await page.evaluate((selector) => {
    const observation = { opened: false, swiped: false };
    const inspect = () => {
      const drawer = document.querySelector(selector);
      if (!(drawer instanceof HTMLElement)) return;
      observation.opened ||= drawer.hasAttribute("data-open");
      observation.swiped ||= drawer.hasAttribute("data-swiping");
    };
    const observer = new MutationObserver(inspect);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-open", "data-swiping"],
      childList: true,
      subtree: true,
    });
    globalThis.__mobileMenuDrawerObserver = { observation, observer };
    inspect();
  }, drawerSelector);
}

async function stopDrawerOpenObserver(page) {
  return page.evaluate(() => {
    const record = globalThis.__mobileMenuDrawerObserver;
    if (!record) return { opened: false, swiped: false };
    record.observer.disconnect();
    delete globalThis.__mobileMenuDrawerObserver;
    return record.observation;
  });
}

async function openWithLeftSwipe(page, client, { captureMidGesture = false } = {}) {
  const start = { x: 388, y: 320 };
  await dispatchTouch(client, "touchStart", start.x, start.y);
  await moveTouch(page, client, [
    { x: 376, y: 320 },
    { x: 358, y: 320 },
    { x: 338, y: 320 },
  ]);

  await page.locator(drawerSelector).waitFor({ state: "visible" });
  const trackingSamples = [];
  for (const x of [316, 280]) {
    await dispatchTouch(client, "touchMove", x, 320);
    await page.waitForTimeout(32);
    trackingSamples.push({ x, drawer: await readDrawerState(page) });
  }

  const midGesture = trackingSamples.at(-1).drawer;
  assert.equal(midGesture.swiping, true, "Drawer should expose finger-tracking swipe state");
  assert(
    midGesture.right > 0 && midGesture.left < 390,
    `Drawer should remain visible during open swipe; left=${midGesture.left}, right=${midGesture.right}`,
  );
  const openFingerDelta = trackingSamples[0].x - trackingSamples[1].x;
  const openDrawerDelta =
    trackingSamples[0].drawer.left - trackingSamples[1].drawer.left;
  assert(
    openDrawerDelta >= openFingerDelta * 0.5 &&
      openDrawerDelta <= openFingerDelta * 1.5,
    `Open drawer should track the finger; finger=${openFingerDelta}, drawer=${openDrawerDelta}`,
  );
  const backdrop = await readBackdropState(page);
  assert.equal(backdrop.swiping, true, "Backdrop should expose swipe progress state");
  assert(
    backdrop.opacity > 0 && backdrop.opacity < 0.6,
    `Backdrop should interpolate during open swipe; opacity=${backdrop.opacity}`,
  );

  if (captureMidGesture) {
    await page.screenshot({
      path: path.join(outputDir, "opening-mid-swipe.png"),
      fullPage: false,
    });
  }

  await moveTouch(page, client, [
    { x: 238, y: 320 },
    { x: 194, y: 320 },
    { x: 148, y: 320 },
    { x: 100, y: 320 },
  ]);
  await dispatchTouch(client, "touchEnd", 100, 320);
  await waitForDrawerOpen(page);
  return { ...midGesture, trackingSamples, backdrop };
}

async function closeWithRightSwipe(page, client) {
  const drawer = await readDrawerState(page);
  const startX = Math.max(drawer.left + 72, 150);
  await dispatchTouch(client, "touchStart", startX, 420);
  await moveTouch(page, client, [
    { x: startX + 24, y: 420 },
    { x: startX + 56, y: 420 },
    { x: startX + 92, y: 420 },
  ]);

  const trackingSamples = [];
  for (const offset of [132, 172]) {
    const x = startX + offset;
    await dispatchTouch(client, "touchMove", x, 420);
    await page.waitForTimeout(32);
    trackingSamples.push({ x, drawer: await readDrawerState(page) });
  }

  const midGesture = trackingSamples.at(-1).drawer;
  assert.equal(midGesture.swiping, true, "Drawer should track the rightward close swipe");
  assert(
    midGesture.left > drawer.left,
    `Drawer should move right during close swipe; before=${drawer.left}, during=${midGesture.left}`,
  );
  const closeFingerDelta = trackingSamples[1].x - trackingSamples[0].x;
  const closeDrawerDelta =
    trackingSamples[1].drawer.left - trackingSamples[0].drawer.left;
  assert(
    closeDrawerDelta >= closeFingerDelta * 0.5 &&
      closeDrawerDelta <= closeFingerDelta * 1.5,
    `Close drawer should track the finger; finger=${closeFingerDelta}, drawer=${closeDrawerDelta}`,
  );

  await page.screenshot({
    path: path.join(outputDir, "closing-mid-swipe.png"),
    fullPage: false,
  });

  await moveTouch(page, client, [{ x: 388, y: 420 }]);
  await dispatchTouch(client, "touchEnd", 388, 420);
  await waitForDrawerClosed(page);
  return { ...midGesture, trackingSamples };
}

async function createContext(browser, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    reducedMotion: options.reducedMotion ?? "no-preference",
  });
  await context.addCookies([
    { name: "mylifeos_dev_bypass", value: "1", url: baseUrl },
  ]);
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const pageErrors = recordPageErrors(page);
  await page.goto(`${baseUrl}/en/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.locator(swipeAreaSelector).waitFor({ state: "attached" });
  return { context, page, pageErrors };
}

async function runMobileGestureScenario(browser) {
  const { context, page, pageErrors } = await createContext(browser);
  const client = await context.newCDPSession(page);
  try {
    const initialBodyOverflow = await page.evaluate(
      () => document.body.style.overflow,
    );
    const touchAction = await page
      .locator(swipeAreaSelector)
      .evaluate((element) => getComputedStyle(element).touchAction);
    assert.equal(touchAction, "pan-y", "Edge gesture must preserve vertical scrolling");

    const openMidGesture = await openWithLeftSwipe(page, client, {
      captureMidGesture: true,
    });
    const openState = await readDrawerState(page);
    assert.equal(openState.open, true);
    assert(Math.abs(openState.right - 390) < 2, "Open drawer should align to the right edge");
    assert(
      openState.transitionDuration
        .split(",")
        .some((value) => Number.parseFloat(value) > 0),
      `Normal motion should retain a release transition; got ${openState.transitionDuration}`,
    );
    const openBackdropState = await readBackdropState(page);
    assert(
      openBackdropState.transitionDuration
        .split(",")
        .some((value) => Number.parseFloat(value) > 0),
      `Normal motion should retain a backdrop transition; got ${openBackdropState.transitionDuration}`,
    );
    assert.equal(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
      "Opening the drawer should lock body scrolling",
    );

    const backgroundBefore = await ensureScrollableMainRegion(page);
    await dispatchTouch(client, "touchStart", 24, 650);
    await moveTouch(page, client, [
      { x: 24, y: 590 },
      { x: 24, y: 520 },
      { x: 24, y: 440 },
    ]);
    await dispatchTouch(client, "touchEnd", 24, 440);
    await page.waitForTimeout(200);
    const backgroundWhileOpen = await page
      .locator(mainRegionSelector)
      .evaluate((region) => region.scrollTop);
    assert.equal(
      backgroundWhileOpen,
      backgroundBefore.scrollTop,
      "The main region must remain locked while the drawer is open",
    );
    assert.equal(
      (await readDrawerState(page)).open,
      true,
      "A vertical backdrop gesture must not close the drawer",
    );
    await page.screenshot({
      path: path.join(outputDir, "menu-open.png"),
      fullPage: false,
    });

    const closeMidGesture = await closeWithRightSwipe(page, client);
    await page.waitForFunction(() => document.body.style.overflow !== "hidden");
    assert.notEqual(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
      "Closing the drawer should restore body scrolling",
    );

    await dispatchTouch(client, "touchStart", 200, 650);
    await moveTouch(page, client, [
      { x: 200, y: 590 },
      { x: 200, y: 520 },
      { x: 200, y: 440 },
    ]);
    await dispatchTouch(client, "touchEnd", 200, 440);
    await page.waitForTimeout(200);
    const backgroundAfterClose = await page
      .locator(mainRegionSelector)
      .evaluate((region) => region.scrollTop);
    assert(
      backgroundAfterClose > backgroundWhileOpen + 20,
      `The main region should scroll again after close; before=${backgroundWhileOpen}, after=${backgroundAfterClose}`,
    );
    await page.locator(mainRegionSelector).evaluate((region) => {
      region.scrollTop = 0;
    });
    await page.waitForTimeout(350);

    await openWithLeftSwipe(page, client);
    await page.keyboard.press("Escape");
    await waitForDrawerClosed(page);

    await openWithLeftSwipe(page, client);
    await page.touchscreen.tap(24, 420);
    await waitForDrawerClosed(page);

    const tapTrigger = page.locator('[data-slot="mobile-menu-trigger"]');
    await tapTrigger.waitFor({ state: "visible" });
    assert.equal(await tapTrigger.getAttribute("aria-expanded"), "false");
    await tapTrigger.tap();
    await waitForDrawerOpen(page);
    assert.equal(await tapTrigger.getAttribute("aria-expanded"), "true");
    await page.getByRole("button", { name: "Close menu" }).tap();
    await waitForDrawerClosed(page);

    assert.equal(
      await page.evaluate(() => document.body.style.overflow),
      initialBodyOverflow,
      "All close paths should restore the pre-drawer body overflow",
    );
    assert.deepEqual(pageErrors, [], "Gesture scenario emitted page runtime errors");

    return {
      touchAction,
      openMidGesture,
      openState,
      openBackdropState,
      closeMidGesture,
      backgroundScroll: {
        whileOpen: backgroundWhileOpen,
        afterClose: backgroundAfterClose,
      },
      escapeClose: true,
      backdropClose: true,
      tapOpenAndClose: true,
      restoredBodyOverflow: initialBodyOverflow,
      pageErrors,
    };
  } finally {
    await client.detach();
    await context.close();
  }
}

async function runGestureIsolationScenario(browser) {
  const scenarios = [
    {
      name: "verticalEdgeSwipe",
      start: { x: 388, y: 440 },
      points: [
        { x: 388, y: 390 },
        { x: 386, y: 330 },
        { x: 384, y: 260 },
      ],
      end: { x: 384, y: 260 },
    },
    {
      name: "nonEdgeHorizontalSwipe",
      start: { x: 220, y: 300 },
      points: [
        { x: 175, y: 300 },
        { x: 120, y: 300 },
        { x: 65, y: 300 },
      ],
      end: { x: 65, y: 300 },
    },
  ];
  const result = {};

  for (const scenario of scenarios) {
    const { context, page, pageErrors } = await createContext(browser);
    const client = await context.newCDPSession(page);
    try {
      let scrollTopBefore;
      if (scenario.name === "verticalEdgeSwipe") {
        scrollTopBefore = (await ensureScrollableMainRegion(page)).scrollTop;
      }

      await startDrawerOpenObserver(page);
      await dispatchTouch(
        client,
        "touchStart",
        scenario.start.x,
        scenario.start.y,
      );
      await moveTouch(page, client, scenario.points);
      await dispatchTouch(client, "touchEnd", scenario.end.x, scenario.end.y);
      await page.waitForTimeout(300);
      await waitForDrawerClosed(page);
      const observation = await stopDrawerOpenObserver(page);
      assert.equal(
        observation.opened,
        false,
        `${scenario.name} must never flash the drawer open`,
      );
      assert.equal(
        observation.swiped,
        false,
        `${scenario.name} must never enter drawer swipe state`,
      );
      const scrollTopAfter = scrollTopBefore === undefined
        ? undefined
        : await page
            .locator('[role="region"][aria-label="Main content"]')
            .evaluate((region) => region.scrollTop);
      if (scrollTopAfter !== undefined) {
        assert(
          scrollTopAfter > scrollTopBefore + 20,
          `Vertical edge swipe should scroll main content; before=${scrollTopBefore}, after=${scrollTopAfter}`,
        );
      }
      assert.deepEqual(
        pageErrors,
        [],
        `${scenario.name} emitted page runtime errors`,
      );
      result[scenario.name] = {
        opened: observation.opened,
        swiped: observation.swiped,
        scrollTopBefore,
        scrollTopAfter,
        pageErrors,
      };
    } finally {
      await client.detach();
      await context.close();
    }
  }

  return result;
}

async function runReducedMotionScenario(browser) {
  const { context, page, pageErrors } = await createContext(browser, {
    reducedMotion: "reduce",
  });
  const client = await context.newCDPSession(page);
  try {
    await openWithLeftSwipe(page, client);
    const state = await readDrawerState(page);
    const backdropState = await readBackdropState(page);
    assert(
      state.transitionDuration.split(",").every((value) => value.trim() === "0s"),
      `Reduced motion should remove drawer release animation; got ${state.transitionDuration}`,
    );
    assert(
      backdropState.transitionDuration
        .split(",")
        .every((value) => value.trim() === "0s"),
      `Reduced motion should remove backdrop animation; got ${backdropState.transitionDuration}`,
    );
    assert.deepEqual(pageErrors, [], "Reduced-motion scenario emitted page runtime errors");
    return {
      transitionDuration: state.transitionDuration,
      backdropTransitionDuration: backdropState.transitionDuration,
      pageErrors,
    };
  } finally {
    await client.detach();
    await context.close();
  }
}

async function runBreakpointResetScenario(browser) {
  const { context, page, pageErrors } = await createContext(browser);
  const client = await context.newCDPSession(page);
  try {
    await openWithLeftSwipe(page, client);
    assert.equal(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
    );

    await page.setViewportSize({ width: 1025, height: 844 });
    await page.waitForFunction(
      (selector) => !document.querySelector(selector),
      swipeAreaSelector,
    );
    await waitForDrawerClosed(page);
    await page.waitForFunction(() => document.body.style.overflow !== "hidden");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(swipeAreaSelector).waitFor({ state: "attached" });
    await page.waitForTimeout(250);
    await waitForDrawerClosed(page);
    assert.notEqual(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
      "Returning to mobile must not reopen the drawer",
    );
    assert.deepEqual(pageErrors, [], "Breakpoint reset emitted page runtime errors");

    return {
      desktopWidth: 1025,
      mobileWidth: 390,
      stayedClosed: true,
      pageErrors,
    };
  } finally {
    await client.detach();
    await context.close();
  }
}

async function runDesktopBoundaryScenario(browser) {
  const context = await browser.newContext({
    viewport: { width: 1025, height: 844 },
    hasTouch: true,
    isMobile: false,
  });
  await context.addCookies([
    { name: "mylifeos_dev_bypass", value: "1", url: baseUrl },
  ]);
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/en/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(300);
    assert.equal(
      await page.locator(swipeAreaSelector).count(),
      0,
      "The mobile edge swipe area must not render at the desktop breakpoint",
    );
    return { swipeAreaCount: 0 };
  } finally {
    await context.close();
  }
}

await mkdir(outputDir, { recursive: true });
const startedAt = new Date().toISOString();
const sourceHash = await computeSourceHash();
await writeReceipt({ status: "running", startedAt, sourceHash, baseUrl });

let browser;
try {
  assert(
    browserExecutable,
    `No supported system Chromium executable found: ${browserCandidates.join(", ")}`,
  );
  browser = await chromium.launch({
    headless: true,
    executablePath: browserExecutable,
  });
  const result = {
    status: "passed",
    startedAt,
    finishedAt: new Date().toISOString(),
    sourceHash,
    baseUrl,
    mobile: await runMobileGestureScenario(browser),
    gestureIsolation: await runGestureIsolationScenario(browser),
    reducedMotion: await runReducedMotionScenario(browser),
    breakpointReset: await runBreakpointResetScenario(browser),
    desktopBoundary: await runDesktopBoundaryScenario(browser),
  };
  result.finishedAt = new Date().toISOString();
  await writeReceipt(result);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await writeReceipt({
    status: "failed",
    startedAt,
    finishedAt: new Date().toISOString(),
    sourceHash,
    baseUrl,
    error: error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: "UnknownError", message: String(error) },
  });
  throw error;
} finally {
  await browser?.close();
}
