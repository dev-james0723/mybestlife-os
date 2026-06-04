import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_ROUTES = ["/en/business-analyst", "/en/privacy"];
const DEFAULT_LOCALE = "en";
const DEFAULT_VIEWPORTS = [
  { name: "320", width: 320, height: 760 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1280", width: 1280, height: 832 },
  { name: "1440", width: 1440, height: 900 },
];

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = path.join(APP_ROOT, "src/app");
const NAVIGATION_FILE = path.join(APP_ROOT, "src/lib/constants/navigation.ts");

function usage() {
  return `
Usage:
  node scripts/audit-liquid-glass-runtime.mjs [options]

Options:
  --base=<url>                  Base URL to audit. Default: ${DEFAULT_BASE_URL}
  --locale=<locale>             Locale used for discovered routes. Default: ${DEFAULT_LOCALE}
  --routes=<list>               Comma-separated routes, or "pages"/"navigation".
  --list-routes                 Print the resolved route plan and exit.
  --include-dynamic=true        Include sampled dynamic routes.
  --max-routes=<n>              Limit the resolved route list.
  --viewports=<list>            Comma-separated viewport widths from 320,390,430,768,1024,1280,1440.
  --reduced-motion=false        Skip the reduced-motion pass.
  --element-click-limit=<n>     Click up to n safe interactive elements per viewport.
  --timeout-ms=<n>              Cooperative run timeout. Default: 120000.
  --out=<dir>                   Artifact output directory.
  --help                        Show this help and exit.
`.trim();
}

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

const DANGEROUS_ACTION_PATTERN =
  "\\b(delete|remove|archive|sign\\s*out|log\\s*out|logout|save|submit|create|add|upload|send|generate|import|export|sync|connect|disconnect|reset|clear|complete|start|stop|run|apply|publish|share|seed|backfill|regenerate|purchase|pay|checkout|unlink|revoke)\\b";

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
  const flag = `--${name}`;
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg === flag || arg.startsWith(prefix));
  if (!found) return fallback;
  return found === flag ? "true" : found.slice(prefix.length);
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

function readBooleanArg(name, fallback = false) {
  const raw = readArg(name, String(fallback));
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function routeSlug(route) {
  const slug = route.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return slug || "root";
}

function normalizeRoute(route) {
  if (!route.startsWith("/")) route = `/${route}`;
  return route.length > 1 ? route.replace(/\/+$/g, "") : route;
}

function buildUrl(baseUrl, route) {
  if (/^https?:\/\//.test(route)) return route;
  return new URL(route, baseUrl).toString();
}

function routeDestination(urlLike, baseUrl = DEFAULT_BASE_URL) {
  const url = new URL(urlLike, baseUrl);
  return `${normalizeRoute(url.pathname)}${url.search}`;
}

function isExpectedRedirect(requestedDestination, finalDestination) {
  const expectedRedirects = [
    [/^\/[^/]+\/ai-knowledge\/create$/, /^\/[^/]+\/ai-knowledge\?create=prompt$/],
    [/^\/[^/]+\/ai-knowledge\/create\/blank$/, /^\/[^/]+\/ai-knowledge\?create=manual$/],
    [/^\/[^/]+\/ai-knowledge\/create\/wizard$/, /^\/[^/]+\/ai-knowledge\?create=wizard$/],
    [/^\/[^/]+\/relationships$/, /^\/[^/]+\/relationship\?tab=relationship$/],
    [/^\/[^/]+\/software-vault$/, /^\/[^/]+\/vault$/],
  ];
  if (requestedDestination === "/" && /^\/[^/]+\/dashboard$/.test(finalDestination)) {
    return true;
  }
  return expectedRedirects.some(
    ([from, to]) => from.test(requestedDestination) && to.test(finalDestination),
  );
}

function withLocalePrefix(route, locale) {
  if (!route.startsWith("/")) route = `/${route}`;
  if (route === "/") return `/${locale}`;
  if (route === `/${locale}` || route.startsWith(`/${locale}/`)) return route;
  if (route.startsWith("/share/")) return route;
  return `/${locale}${route}`;
}

async function listPageFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listPageFiles(fullPath));
    } else if (/^page\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function sampleForDynamicSegment(segment) {
  const name = segment
    .replace(/^\[\[?\.\.\./, "")
    .replace(/^\[/, "")
    .replace(/\]\]?$/, "");
  return `${name || "param"}-sample`;
}

function routeFromPageFile(file, { locale, includeDynamic }) {
  const rel = path.relative(APP_DIR, file);
  const segments = rel.split(path.sep).slice(0, -1);
  const routeSegments = [];
  const dynamicSegments = [];

  for (const segment of segments) {
    if (/^\(.+\)$/.test(segment)) continue;
    if (segment === "[locale]") {
      routeSegments.push(locale);
      continue;
    }
    if (/^\[{1,2}\.\.\..+\]{1,2}$/.test(segment) || /^\[.+\]$/.test(segment)) {
      dynamicSegments.push(segment);
      routeSegments.push(includeDynamic ? sampleForDynamicSegment(segment) : segment);
      continue;
    }
    routeSegments.push(segment);
  }

  return {
    route: normalizeRoute(`/${routeSegments.join("/")}`),
    source: "page-file",
    pageFile: path.relative(APP_ROOT, file),
    dynamicSegments,
    skipped: dynamicSegments.length > 0 && !includeDynamic,
  };
}

async function discoverPageRoutes({ locale, includeDynamic }) {
  const files = await listPageFiles(APP_DIR);
  return files.map((file) => routeFromPageFile(file, { locale, includeDynamic }));
}

async function discoverNavigationRoutes(locale) {
  const content = await readFile(NAVIGATION_FILE, "utf8");
  const routes = [];
  const urlPattern = /url:\s*"([^"]+)"/g;
  let match;
  while ((match = urlPattern.exec(content))) {
    const rawUrl = match[1];
    if (!rawUrl.startsWith("/")) continue;
    const objectTail = content.slice(match.index, match.index + 360);
    const tabMatch = objectTail.match(/searchParams:\s*\{\s*tab:\s*"([^"]+)"/);
    const route = `${withLocalePrefix(rawUrl, locale)}${tabMatch ? `?tab=${encodeURIComponent(tabMatch[1])}` : ""}`;
    routes.push({
      route: normalizeRoute(route),
      source: "navigation",
      pageFile: path.relative(APP_ROOT, NAVIGATION_FILE),
      dynamicSegments: [],
      skipped: false,
    });
  }
  return routes;
}

function uniqueRouteEntries(entries) {
  const seen = new Set();
  const unique = [];
  for (const entry of entries) {
    if (entry.skipped) {
      unique.push(entry);
      continue;
    }
    if (seen.has(entry.route)) continue;
    seen.add(entry.route);
    unique.push(entry);
  }
  return unique;
}

async function resolveRoutePlan(rawRoutes, { locale, includeDynamic, maxRoutes }) {
  const requested = rawRoutes.map((route) => route.trim()).filter(Boolean);
  const wantsAuto = requested.includes("auto");
  const wantsPages = wantsAuto || requested.includes("pages");
  const wantsNavigation = wantsAuto || requested.includes("nav") || requested.includes("navigation");
  const discovered = [];

  if (wantsPages) discovered.push(...await discoverPageRoutes({ locale, includeDynamic }));
  if (wantsNavigation) discovered.push(...await discoverNavigationRoutes(locale));

  if (discovered.length) {
    const unique = uniqueRouteEntries(discovered);
    const skippedDynamic = unique.filter((entry) => entry.skipped);
    let routes = unique.filter((entry) => !entry.skipped).map((entry) => entry.route).sort();
    if (maxRoutes > 0) routes = routes.slice(0, maxRoutes);
    return { routes, skippedDynamic };
  }

  return {
    routes: requested.map((route) => normalizeRoute(route)),
    skippedDynamic: [],
  };
}

function resolveViewports() {
  const requested = readListArg("viewports", []);
  if (!requested.length || requested.includes("all")) return DEFAULT_VIEWPORTS;
  const selected = [];
  for (const item of requested) {
    const viewport = DEFAULT_VIEWPORTS.find(
      (candidate) => candidate.name === item || String(candidate.width) === item,
    );
    if (!viewport) {
      throw new Error(`Unknown viewport "${item}". Known: ${DEFAULT_VIEWPORTS.map((v) => v.name).join(", ")}, all`);
    }
    selected.push(viewport);
  }
  return selected;
}

async function safeVisible(locator) {
  try {
    if ((await locator.count()) === 0 || !(await locator.isVisible())) return false;
    return await locator.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const disabled = el.disabled === true || el.getAttribute("aria-disabled") === "true";
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
  if (!locator) return { ...spec, status: "missing" };

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
        (el.tagName.toLowerCase() === "input" && rect.width <= 1 && rect.height <= 1)
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
    const navigation = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    const resourceSummary = resources.reduce((summary, entry) => {
      const key = entry.initiatorType || "other";
      const bucket = summary.byType[key] ?? { count: 0, transferSize: 0, duration: 0 };
      bucket.count += 1;
      bucket.transferSize += Math.round(entry.transferSize || 0);
      bucket.duration += Math.round(entry.duration || 0);
      summary.byType[key] = bucket;
      summary.totalTransferSize += Math.round(entry.transferSize || 0);
      if (entry.duration > 1000) {
        summary.slowResources.push({
          name: entry.name,
          type: key,
          duration: Math.round(entry.duration),
          transferSize: Math.round(entry.transferSize || 0),
        });
      }
      return summary;
    }, { count: resources.length, totalTransferSize: 0, byType: {}, slowResources: [] });
    resourceSummary.slowResources = resourceSummary.slowResources
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 12);

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
      interactiveSample: interactive.slice(0, 40),
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
      timing: navigation
        ? {
            domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
            loadEventEnd: Math.round(navigation.loadEventEnd),
            responseStart: Math.round(navigation.responseStart),
            responseEnd: Math.round(navigation.responseEnd),
            transferSize: Math.round(navigation.transferSize || 0),
          }
        : null,
      vitals: window.__mylifeOsAuditVitals ?? null,
      resourceSummary,
    };
  }, { interactiveSelector: INTERACTIVE_SELECTOR });
}

async function auditElementInteractions(page, params) {
  const targets = await page.evaluate(({ interactiveSelector, dangerousPattern, limit }) => {
    const dangerous = new RegExp(dangerousPattern, "i");
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        Number(style.opacity || "1") > 0.05 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        style.pointerEvents !== "none"
      );
    };
    const labelFor = (el) =>
      [el.getAttribute("aria-label"), el.getAttribute("title"), el.textContent]
        .filter(Boolean)
        .join(" ")
        .trim()
        .replace(/\s+/g, " ");
    const safeCandidate = (el) => {
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role");
      const label = labelFor(el);
      if (!visible(el)) return false;
      if (el.disabled === true || el.getAttribute("aria-disabled") === "true") return false;
      if (["a", "input", "select", "textarea"].includes(tag)) return false;
      if (tag === "button" && ["submit", "reset"].includes((el.getAttribute("type") || "").toLowerCase())) return false;
      if (dangerous.test(label)) return false;
      return (
        tag === "summary" ||
        role === "tab" ||
        role === "switch" ||
        role === "checkbox" ||
        role === "menuitem" ||
        el.hasAttribute("aria-haspopup") ||
        el.hasAttribute("aria-controls") ||
        el.hasAttribute("aria-expanded") ||
        el.hasAttribute("data-state") ||
        /\b(menu|filter|search|settings|theme|clock|view|open|close|expand|collapse|tab)\b/i.test(label)
      );
    };

    return [...document.querySelectorAll(interactiveSelector)]
      .filter(safeCandidate)
      .slice(0, limit)
      .map((el, index) => {
        const id = `runtime-audit-${index}`;
        const rect = el.getBoundingClientRect();
        el.setAttribute("data-runtime-audit-id", id);
        return {
          id,
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute("role"),
          label: labelFor(el).slice(0, 120),
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        };
      });
  }, {
    interactiveSelector: INTERACTIVE_SELECTOR,
    dangerousPattern: DANGEROUS_ACTION_PATTERN,
    limit: params.limit,
  });

  const results = [];
  const initialUrl = page.url();
  for (const target of targets) {
    await cleanupVisibleLayer(page);
    const locator = page.locator(`[data-runtime-audit-id="${target.id}"]`).first();
    try {
      if ((await locator.count()) === 0) {
        results.push({ ...target, status: "detached" });
        continue;
      }
      const beforeUrl = page.url();
      await locator.click({ timeout: 3000 });
      await page.waitForTimeout(180);
      const layer = await visibleLayer(page);
      const afterUrl = page.url();
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(120);
      if (afterUrl !== beforeUrl) {
        await page.goto(initialUrl, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
        await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
      }
      results.push({
        ...target,
        status: "clicked",
        openedLayer: Boolean(layer),
        navigated: afterUrl !== beforeUrl ? { from: beforeUrl, to: afterUrl } : null,
        layer,
      });
    } catch (error) {
      results.push({
        ...target,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  await cleanupVisibleLayer(page);
  return results;
}

function compactError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.split("\n")[0] || message;
}

function isExpectedDevBypassHttpError(item, baseUrl) {
  if (item.status !== 401) return false;
  try {
    const base = new URL(baseUrl);
    const url = new URL(item.url);
    return url.origin === base.origin && url.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

function emptyMetrics(params, url) {
  return {
    url,
    title: "",
    h1: "",
    viewport: {
      width: params.viewport.width,
      height: params.viewport.height,
    },
    scroll: {
      width: params.viewport.width,
      height: params.viewport.height,
      overflowX: 0,
    },
    osSlots: 0,
    interactiveCount: 0,
    interactiveSample: [],
    tooSmallTargets: [],
    compactTargets: [],
    focusedAfterTab: null,
    timing: null,
    vitals: null,
    resourceSummary: {
      count: 0,
      totalTransferSize: 0,
      byType: {},
      slowResources: [],
    },
  };
}

async function auditViewport(browser, params) {
  const context = await browser.newContext({
    viewport: { width: params.viewport.width, height: params.viewport.height },
    reducedMotion: params.reducedMotion,
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    window.__mylifeOsAuditVitals = { lcp: 0, cls: 0 };
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries.at(-1);
        if (last) window.__mylifeOsAuditVitals.lcp = Math.round(last.startTime);
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__mylifeOsAuditVitals.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      window.__mylifeOsAuditVitals.unsupported = true;
    }
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
  const screenshotPath = path.join(
    params.outDir,
    `${routeSlug(params.route)}-${params.viewport.name}-${params.reducedMotion}.png`,
  );
  let metrics = null;
  const interactions = [];
  let elementInteractions = [];
  let auditFailure = null;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    await page.screenshot({ path: screenshotPath, fullPage: true });

    metrics = await collectMetrics(page);
    const shouldAuditShell = params.viewport.name === "390" || params.viewport.name === "1280";
    const isMobileViewport = params.viewport.width < 768;
    if (shouldAuditShell) {
      const specs = SHELL_INTERACTIONS.filter(
        (spec) => spec.viewports !== "desktop" || !isMobileViewport,
      );
      for (const spec of specs) {
        interactions.push(await auditInteraction(page, spec));
      }
    }
    elementInteractions = params.elementClickLimit > 0 && shouldAuditShell
      ? await auditElementInteractions(page, { limit: params.elementClickLimit })
      : [];
  } catch (error) {
    auditFailure = `Audit error: ${compactError(error)}`;
    metrics = metrics ?? emptyMetrics(params, page.url() || url);
    await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 5000 }).catch(() => {});
  } finally {
    await context.close();
  }

  const failures = auditFailure ? [auditFailure] : [];
  const warnings = [];
  const requestedDestination = routeDestination(params.route, params.baseUrl);
  const finalDestination = routeDestination(metrics.url || url, params.baseUrl);
  if (
    finalDestination !== requestedDestination &&
    !isExpectedRedirect(requestedDestination, finalDestination)
  ) {
    const finalPath = new URL(metrics.url || url, params.baseUrl).pathname;
    const requestedPath = new URL(buildUrl(params.baseUrl, params.route)).pathname;
    const message = `Unexpected redirect: ${requestedDestination} -> ${finalDestination}`;
    if (
      (finalPath.endsWith("/dashboard") && !requestedPath.endsWith("/dashboard")) ||
      finalPath.endsWith("/login")
    ) {
      failures.push(message);
    } else {
      warnings.push(message);
    }
  }
  if (metrics.url.includes("/login")) failures.push("Redirected to login");
  if (!metrics.h1) failures.push("Missing h1");
  if (metrics.scroll.overflowX > 1) failures.push(`Horizontal overflow: ${metrics.scroll.overflowX}px`);
  if (pageErrors.length) failures.push(`Page errors: ${pageErrors.length}`);
  if (metrics.tooSmallTargets.length) failures.push(`Targets under 24px: ${metrics.tooSmallTargets.length}`);
  const expectedHttpErrors = httpErrors.filter((item) =>
    isExpectedDevBypassHttpError(item, params.baseUrl),
  );
  const unexpectedHttpErrors = httpErrors.filter((item) =>
    !isExpectedDevBypassHttpError(item, params.baseUrl),
  );
  if (unexpectedHttpErrors.length) {
    const statusCounts = unexpectedHttpErrors.reduce((counts, item) => {
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
  for (const interaction of elementInteractions) {
    if (interaction.status === "error") {
      failures.push(`Element interaction failed: ${interaction.label || interaction.role || interaction.tag}`);
    }
    if (interaction.navigated) {
      warnings.push(`Element interaction navigated: ${interaction.label || interaction.role || interaction.tag}`);
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
    elementInteractions,
    consoleErrors: consoleErrors.slice(0, 10),
    httpErrors: httpErrors.slice(0, 20),
    expectedHttpErrors: expectedHttpErrors.slice(0, 20),
    pageErrors,
  };
}

function markdownSummary(results, outDir, routePlan, runInfo = {}) {
  const lines = [
    "# MyBestLife OS Runtime Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Output: ${outDir}`,
    `Routes checked: ${new Set(results.map((result) => result.route)).size}`,
    `Viewport checks: ${results.length}`,
    `Skipped dynamic routes: ${routePlan.skippedDynamic.length}`,
  ];
  if (runInfo.timedOut) {
    lines.push(`Run incomplete: timeout budget reached after ${runInfo.timeoutMs}ms.`);
  }
  lines.push(
    "",
    "| Route | Viewport | Motion | Status | Notes |",
    "| --- | ---: | --- | --- | --- |",
  );
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
  if (routePlan.skippedDynamic.length) {
    lines.push("");
    lines.push("## Skipped Dynamic Routes");
    lines.push("");
    lines.push("These page files need sample IDs or seeded data before runtime auditing can prove the detail routes:");
    lines.push("");
    for (const entry of routePlan.skippedDynamic) {
      lines.push(`- \`${entry.pageFile}\` (${entry.dynamicSegments.join(", ")})`);
    }
  }
  return `${lines.join("\n")}\n`;
}

async function writeAuditArtifacts(outDir, routePlan, results, runInfo = {}) {
  await writeFile(path.join(outDir, "route-plan.json"), JSON.stringify(routePlan, null, 2));
  await writeFile(path.join(outDir, "summary.json"), JSON.stringify(results, null, 2));
  await writeFile(path.join(outDir, "summary.md"), markdownSummary(results, outDir, routePlan, runInfo));
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const baseUrl = readArg("base", DEFAULT_BASE_URL);
  const locale = readArg("locale", DEFAULT_LOCALE);
  const requestedRoutes = readListArg("routes", DEFAULT_ROUTES);
  const includeDynamic = readBooleanArg("include-dynamic", false);
  const maxRoutes = readNumberArg("max-routes", 0);
  const routePlan = await resolveRoutePlan(requestedRoutes, { locale, includeDynamic, maxRoutes });
  const routes = routePlan.routes;
  if (readBooleanArg("list-routes", false)) {
    console.log(JSON.stringify(routePlan, null, 2));
    return;
  }
  const viewports = resolveViewports();
  const elementClickLimit = readNumberArg("element-click-limit", 0);
  const outDir = path.resolve(readArg("out", ".next/liquid-glass-audit"));
  const runTimeoutMs = readNumberArg("timeout-ms", 120000);
  const startedAt = Date.now();
  let timedOut = false;
  const shouldStopForTimeout = () => Date.now() - startedAt >= runTimeoutMs;
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    routeLoop:
    for (const route of routes) {
      for (const viewport of viewports) {
        if (shouldStopForTimeout()) {
          timedOut = true;
          break routeLoop;
        }
        console.log(`Auditing ${route} at ${viewport.name}px (${viewport.width}x${viewport.height}, no-preference)`);
        results.push(await auditViewport(browser, {
          baseUrl,
          route,
          viewport,
          reducedMotion: "no-preference",
          outDir,
          elementClickLimit,
        }));
        await writeAuditArtifacts(outDir, routePlan, results, { timedOut, timeoutMs: runTimeoutMs });
      }
      if (readBooleanArg("reduced-motion", true)) {
        if (shouldStopForTimeout()) {
          timedOut = true;
          break routeLoop;
        }
        const reducedMotionViewport = viewports.find((item) => item.name === "390") ?? viewports[0];
        console.log(`Auditing ${route} at ${reducedMotionViewport.name}px (${reducedMotionViewport.width}x${reducedMotionViewport.height}, reduce)`);
        results.push(await auditViewport(browser, {
          baseUrl,
          route,
          viewport: reducedMotionViewport,
          reducedMotion: "reduce",
          outDir,
          elementClickLimit,
        }));
        await writeAuditArtifacts(outDir, routePlan, results, { timedOut, timeoutMs: runTimeoutMs });
      }
    }
  } finally {
    await browser.close();
  }

  await writeAuditArtifacts(outDir, routePlan, results, { timedOut, timeoutMs: runTimeoutMs });

  const failed = results.filter((result) => result.status === "fail");
  const warned = results.filter((result) => result.status === "warn");
  console.log(`Runtime audit complete: ${results.length} checks, ${failed.length} fail, ${warned.length} warn.`);
  if (timedOut) console.log(`Runtime audit stopped after timeout budget: ${runTimeoutMs}ms.`);
  console.log(`Summary: ${path.join(outDir, "summary.md")}`);
  if (failed.length || timedOut) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
