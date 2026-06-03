import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_ROUTES = ["/en/business-analyst", "/en/privacy"];
const DEFAULT_VIEWPORTS = [
  { name: "320", width: 320, height: 760 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1280", width: 1280, height: 832 },
  { name: "1440", width: 1440, height: 900 },
];

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="switch"]',
  '[role="checkbox"]',
  "[aria-haspopup]",
  "[aria-controls]",
  "[onclick]",
  "[data-state]",
  "[data-testid]",
].join(",");

const LAYER_SELECTOR = [
  '[role="dialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="tooltip"]',
  '[data-slot="dialog-content"]',
  '[data-slot="sheet-content"]',
  '[data-slot="popover-content"]',
  '[data-radix-popper-content-wrapper]',
  "[cmdk-root]",
].join(",");

const SHELL_INTERACTIONS = [
  {
    key: "quick-capture",
    label: "Quick Capture",
    selector: 'button[aria-label="Quick Capture"]',
    expectsLayer: true,
    viewports: "all",
  },
  {
    key: "topbar-search",
    label: "Topbar search",
    selector: 'button[aria-label*="Search"], button:has-text("Search")',
    expectsLayer: true,
    viewports: "all",
  },
  {
    key: "theme-toggle",
    label: "Theme toggle",
    selector: 'button[aria-label^="Switch to"]',
    expectsLayer: false,
    viewports: "all",
  },
  {
    key: "utility-menu",
    label: "Utility menu",
    selector: 'button[aria-label="Open menu"]',
    expectsLayer: false,
    viewports: "desktop",
  },
  {
    key: "clock",
    label: "Clock tools",
    selector: 'button[aria-label^="Clock"]',
    expectsLayer: true,
    viewports: "all",
  },
];

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function readListArg(name, fallback) {
  const value = readArg(name, "");
  return value
    ? value.split(",").map((part) => part.trim()).filter(Boolean)
    : fallback;
}

function readNumberArg(name, fallback) {
  const raw = readArg(name, String(fallback));
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function routeSlug(route) {
  return route.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
}

function buildUrl(baseUrl, route) {
  if (/^https?:\/\//.test(route)) return route;
  return new URL(route, baseUrl).toString();
}

async function safeVisible(locator) {
  try {
    if ((await locator.count()) === 0 || !(await locator.isVisible())) return false;
    return await locator.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const disabled =
        el.disabled === true || el.getAttribute("aria-disabled") === "true";
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        Number(style.opacity || "1") > 0.05 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        style.pointerEvents !== "none" &&
        !disabled
      );
    });
  } catch {
    return false;
  }
}

async function firstActionable(page, selector) {
  const locator = page.locator(selector);
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await safeVisible(candidate)) return candidate;
  }
  return null;
}

async function visibleLayer(page) {
  return page.evaluate((selector) => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        Number(style.opacity || "1") > 0.05 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        el.getAttribute("aria-hidden") !== "true"
      );
    };
    const found = [...document.querySelectorAll(selector)].find(visible);
    return found
      ? {
          tag: found.tagName.toLowerCase(),
          role: found.getAttribute("role"),
          slot: found.getAttribute("data-slot"),
          text: found.textContent?.trim().replace(/\s+/g, " ").slice(0, 120) ?? "",
        }
      : null;
  }, LAYER_SELECTOR);
}

async function cleanupVisibleLayer(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(350);
  if (!(await visibleLayer(page))) return;
  const close = await firstActionable(page, 'button[aria-label="Close"], button:has-text("Close")');
  if (close) {
    await close.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function auditInteraction(page, spec) {
  await cleanupVisibleLayer(page);
  const locator = await firstActionable(page, spec.selector);
  if (!locator) {
    return { ...spec, status: "missing" };
  }

  try {
    await locator.click({ timeout: 5000 });
    await page.waitForTimeout(250);
    const layer = await visibleLayer(page);
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(350);
    const stillOpen = Boolean(await visibleLayer(page));
    if (stillOpen) await cleanupVisibleLayer(page);
    return {
      ...spec,
      status: layer ? "opened" : "clicked",
      layer,
      escapeClosed: layer ? !stillOpen : null,
    };
  } catch (error) {
    return {
      ...spec,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function collectMetrics(page) {
  await page.keyboard.press("Tab").catch(() => {});
  await page.waitForTimeout(80);

  return page.evaluate(({ interactiveSelector }) => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };
    const ignoreTapTarget = (el) => {
      const rect = el.getBoundingClientRect();
      return (
        Boolean(el.closest(".leaflet-control-attribution")) ||
        (el.tagName.toLowerCase() === "input" &&
          rect.width <= 1 &&
          rect.height <= 1)
      );
    };
    const interactive = [...document.querySelectorAll(interactiveSelector)]
      .filter((el) => visible(el) && !ignoreTapTarget(el))
      .map((el, index) => {
        const rect = el.getBoundingClientRect();
        return {
          index,
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute("role"),
          text: el.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "",
          ariaLabel: el.getAttribute("aria-label"),
          disabled: el.disabled === true || el.getAttribute("aria-disabled") === "true",
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        };
      });

    const active = document.activeElement;
    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body?.scrollWidth ?? 0);
    const scrollHeight = Math.max(doc.scrollHeight, body?.scrollHeight ?? 0);
    const osSlots = [...document.querySelectorAll('[data-slot^="os-"]')].length;
    const h1 = document.querySelector("h1")?.textContent?.trim() ?? "";

    return {
      url: window.location.href,
      title: document.title,
      h1,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      scroll: {
        width: scrollWidth,
        height: scrollHeight,
        overflowX: Math.max(0, scrollWidth - window.innerWidth),
      },
      osSlots,
      interactiveCount: interactive.length,
      tooSmallTargets: interactive
        .filter((item) => !item.disabled && (item.rect.width < 24 || item.rect.height < 24))
        .slice(0, 12),
      compactTargets: interactive
        .filter((item) => !item.disabled && (item.rect.width < 44 || item.rect.height < 44))
        .slice(0, 12),
      focusedAfterTab: active
        ? {
            tag: active.tagName.toLowerCase(),
            role: active.getAttribute("role"),
            text: active.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "",
            ariaLabel: active.getAttribute("aria-label"),
          }
        : null,
    };
  }, { interactiveSelector: INTERACTIVE_SELECTOR });
}

async function auditViewport(browser, params) {
  const context = await browser.newContext({
    viewport: { width: params.viewport.width, height: params.viewport.height },
    reducedMotion: params.reducedMotion,
    deviceScaleFactor: 1,
  });
  await context.addCookies([
    {
      name: "mylifeos_dev_bypass",
      value: "1",
      url: params.baseUrl,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.setDefaultNavigationTimeout(30000);
  const consoleErrors = [];
  const pageErrors = [];
  const httpErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      httpErrors.push({ status: response.status(), url: response.url() });
    }
  });

  const url = buildUrl(params.baseUrl, params.route);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);

  const screenshotPath = path.join(
    params.outDir,
    `${routeSlug(params.route)}-${params.viewport.name}-${params.reducedMotion}.png`,
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const metrics = await collectMetrics(page);
  const shouldAuditShell = params.viewport.name === "390" || params.viewport.name === "1280";
  const isMobileViewport = params.viewport.width < 768;
  const interactions = [];
  if (shouldAuditShell) {
    const specs = SHELL_INTERACTIONS.filter(
      (spec) => spec.viewports !== "desktop" || !isMobileViewport,
    );
    for (const spec of specs) {
      interactions.push(await auditInteraction(page, spec));
    }
  }

  await context.close();

  const failures = [];
  const warnings = [];
  if (metrics.url.includes("/login")) failures.push("Redirected to login");
  if (!metrics.h1) failures.push("Missing h1");
  if (metrics.scroll.overflowX > 1) failures.push(`Horizontal overflow: ${metrics.scroll.overflowX}px`);
  if (pageErrors.length) failures.push(`Page errors: ${pageErrors.length}`);
  if (metrics.tooSmallTargets.length) failures.push(`Targets under 24px: ${metrics.tooSmallTargets.length}`);
  if (httpErrors.length) {
    const statusCounts = httpErrors.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    }, {});
    warnings.push(
      `HTTP errors: ${Object.entries(statusCounts)
        .map(([status, count]) => `${status} x${count}`)
        .join(", ")}`,
    );
  }
  const nonResourceConsoleErrors = consoleErrors.filter(
    (item) => !item.startsWith("Failed to load resource:"),
  );
  if (nonResourceConsoleErrors.length) warnings.push(`Console errors: ${nonResourceConsoleErrors.length}`);
  if (metrics.viewport.width < 768 && metrics.compactTargets.length) {
    warnings.push(`Targets under 44px: ${metrics.compactTargets.length}`);
  }
  for (const interaction of interactions) {
    if (interaction.status === "error") failures.push(`${interaction.label} failed`);
    if (interaction.layer && interaction.escapeClosed === false) failures.push(`${interaction.label} did not close with Escape`);
    if (interaction.status === "missing") warnings.push(`${interaction.label} missing`);
    if (interaction.status === "clicked" && interaction.expectsLayer) {
      warnings.push(`${interaction.label} clicked without detected layer`);
    }
  }

  return {
    route: params.route,
    viewport: params.viewport.name,
    reducedMotion: params.reducedMotion,
    status: failures.length ? "fail" : warnings.length ? "warn" : "pass",
    failures,
    warnings,
    screenshotPath,
    metrics,
    interactions,
    consoleErrors: consoleErrors.slice(0, 10),
    httpErrors: httpErrors.slice(0, 20),
    pageErrors,
  };
}

function markdownSummary(results, outDir) {
  const lines = [
    "# MyBestLife OS Liquid Glass Runtime Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Output: ${outDir}`,
    "",
    "| Route | Viewport | Motion | Status | Notes |",
    "| --- | ---: | --- | --- | --- |",
  ];
  for (const result of results) {
    const notes = [...result.failures, ...result.warnings].join("; ") || "OK";
    lines.push(
      `| ${result.route} | ${result.viewport} | ${result.reducedMotion} | ${result.status} | ${notes.replace(/\|/g, "\\|")} |`,
    );
  }
  lines.push("");
  lines.push("## Evidence Notes");
  lines.push("");
  lines.push("- `pass`: no detected overflow, page errors, critical tap-target failures, or failed shell interactions.");
  lines.push("- `warn`: route rendered but has non-blocking warnings, usually compact controls under 44px or missing optional shell triggers at a breakpoint.");
  lines.push("- `fail`: route must not be marked `Verified` until failures are fixed or documented as unrelated.");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const baseUrl = readArg("base", DEFAULT_BASE_URL);
  const routes = readListArg("routes", DEFAULT_ROUTES);
  const outDir = path.resolve(readArg("out", ".next/liquid-glass-audit"));
  const runTimeoutMs = readNumberArg("timeout-ms", 120000);
  const runTimeout = setTimeout(() => {
    console.error(`Runtime audit exceeded ${runTimeoutMs}ms. Failing instead of hanging.`);
    process.exit(1);
  }, runTimeoutMs);
  runTimeout.unref?.();
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const route of routes) {
      for (const viewport of DEFAULT_VIEWPORTS) {
        console.log(`Auditing ${route} at ${viewport.name}px (${viewport.width}x${viewport.height}, no-preference)`);
        results.push(await auditViewport(browser, {
          baseUrl,
          route,
          viewport,
          reducedMotion: "no-preference",
          outDir,
        }));
      }
      const reducedMotionViewport = DEFAULT_VIEWPORTS.find((item) => item.name === "390");
      console.log(`Auditing ${route} at ${reducedMotionViewport.name}px (${reducedMotionViewport.width}x${reducedMotionViewport.height}, reduce)`);
      results.push(await auditViewport(browser, {
        baseUrl,
        route,
        viewport: reducedMotionViewport,
        reducedMotion: "reduce",
        outDir,
      }));
    }
  } finally {
    await browser.close();
  }

  await writeFile(path.join(outDir, "summary.json"), JSON.stringify(results, null, 2));
  await writeFile(path.join(outDir, "summary.md"), markdownSummary(results, outDir));
  clearTimeout(runTimeout);

  const failed = results.filter((result) => result.status === "fail");
  const warned = results.filter((result) => result.status === "warn");
  console.log(`Runtime audit complete: ${results.length} checks, ${failed.length} fail, ${warned.length} warn.`);
  console.log(`Summary: ${path.join(outDir, "summary.md")}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
