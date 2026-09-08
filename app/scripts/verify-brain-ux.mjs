import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

// Local browser fixtures only. No production rows or credentials are used.
const baseUrl = process.env.BRAIN_VERIFY_URL ?? "http://127.0.0.1:3000";
const phase = process.env.BRAIN_VERIFY_PHASE ?? "after";
const output = path.resolve(`../artifacts/brain-ux-2026-09-07/${phase}`);
await mkdir(output, { recursive: true });
const userId = "00000000-0000-4000-8000-000000000001";
const common = { user_id: userId, created_at: "2026-08-01T12:00:00Z", updated_at: "2026-09-01T12:00:00Z" };
const topics = ["Music", "Learning", "Research", "Wellbeing", "Writing", "Community"];
const projectRef = JSON.parse(await readFile("package.json", "utf8")).scripts["db:link"]?.match(/--project-ref\s+(\S+)/)?.[1];
function fixtures(count = 120) {
  return {
    goals: topics.map((name, i) => ({ ...common, id: `goal-${i}`, name: `${name} practice`, description: `Build a thoughtful ${name.toLowerCase()} practice.`, category: name, status: "active" })),
    projects: topics.map((name, i) => ({ ...common, id: `project-${i}`, name: `${name} notebook`, description: `Connect ideas about ${name.toLowerCase()}.`, tags: [name.toLowerCase()], status: "active", priority: "medium" })),
    tasks: Array.from({ length: count }, (_, i) => ({ ...common, id: `task-${i}`, title: `${topics[i % 6]} session ${i + 1}`, description: "Browser verification fixture", project_id: `project-${i % 6}`, status: "todo", priority: "medium", tags: [topics[i % 6].toLowerCase()] })),
  };
}
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const results = [];
async function openPage(viewport, { mode = "light", locale = "en", count = 120, reduced = false, scenario = "populated", touch = false, noWebGL = false } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: touch ? 3 : 1, hasTouch: touch, isMobile: touch, colorScheme: mode, reducedMotion: reduced ? "reduce" : "no-preference" });
  // Keep server-side fixture access stable when the real client auth hook
  // clears its JS-readable dev cookie after receiving our synthetic user.
  await context.addCookies([{ name: "mylifeos_dev_bypass", value: "1", url: baseUrl, httpOnly: true }]);
  await context.addInitScript(({ mode, locale, noWebGL, projectRef }) => {
    localStorage.setItem("mylifeos-theme", JSON.stringify({ uiTheme: "default", colorMode: mode, iconPack: "command-glass", fontSize: "medium", widgetDensity: "comfortable", focusMode: false }));
    localStorage.setItem("mylifeos:settings-profile:v1", JSON.stringify({ id: "00000000-0000-4000-8000-000000000001", language: locale, onboarding_completed: true, theme: mode, ui_theme: "default", color_mode: mode }));
    // The local dev server uses placeholder.supabase.co. This synthetic session
    // is scoped to this isolated context and every service request is intercepted.
    const testUser = { id: "00000000-0000-4000-8000-000000000001", email: "brain-fixture@example.test", role: "authenticated", aud: "authenticated", app_metadata: {}, user_metadata: {} };
    const payload = btoa(JSON.stringify({ sub: testUser.id, exp: Math.floor(Date.now() / 1000) + 3600 })).replaceAll("=", "");
    const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.fixture`, refresh_token: "local-fixture-only", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user: testUser };
    for (const ref of ["placeholder", projectRef].filter(Boolean)) document.cookie = `sb-${ref}-auth-token=base64-${btoa(JSON.stringify(session)).replaceAll("=", "")}; Path=/; SameSite=Lax`;
    window.__brainFrames = 0;
    window.__brainLabels = 0;
    window.__brainGLFrames = 0;
    window.__brainGpuBuffers = new Set();
    window.__brainGpuTextures = new Set();
    window.__brainLongTasks = [];
    const original = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.closest(".force-graph-container")) window.__brainFrames++;
      return original.apply(this, args);
    };
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      if (this.canvas.closest(".force-graph-container")) window.__brainLabels++;
      return fillText.apply(this, args);
    };
    for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const clear = type.prototype.clear;
      type.prototype.clear = function (...args) { window.__brainGLFrames++; return clear.apply(this, args); };
      for (const [resource, set] of [["Buffer", window.__brainGpuBuffers], ["Texture", window.__brainGpuTextures]]) {
        const create = type.prototype[`create${resource}`], remove = type.prototype[`delete${resource}`];
        type.prototype[`create${resource}`] = function (...args) { const obj = create.apply(this, args); if (obj) set.add(obj); return obj; };
        type.prototype[`delete${resource}`] = function (obj) { set.delete(obj); return remove.call(this, obj); };
      }
    }
    if (noWebGL) {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) { return /webgl/.test(type) ? null : getContext.call(this, type, ...args); };
    }
    new PerformanceObserver(list => window.__brainLongTasks.push(...list.getEntries().map(e => e.duration))).observe({ type: "longtask", buffered: true });
  }, { mode, locale, noWebGL, projectRef });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const errors = [];
  const redact = text => text.replace(/wss?:\/\/\S+/g, "[WebSocket URL]").replace(/apikey=[^&\s]+/g, "apikey=[redacted]");
  page.on("pageerror", e => errors.push(redact(e.stack ?? e.message)));
  page.on("console", m => { if (m.type() === "error") errors.push(redact(m.text())); });
  page.on("response", response => { if (response.status() === 404) console.log(`Fixture 404: ${new URL(response.url()).pathname}`); });
  await page.routeWebSocket("**/realtime/**", ws => { ws.onMessage(() => {}); });
  await page.route("**/auth/v1/**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: userId, email: "brain-fixture@example.test", role: "authenticated", aud: "authenticated", app_metadata: {}, user_metadata: {} }) }));
  const rows = fixtures(count);
  await page.route("**/rest/v1/**", async route => {
    const request = route.request();
    const table = new URL(request.url()).pathname.split("/").at(-1);
    if (request.method() !== "GET") {
      errors.push(`Blocked unexpected fixture write: ${request.method()} ${table}`);
      await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Browser verification blocks database writes" }) });
      return;
    }
    if (table === "profiles") {
      const profile = { id: userId, language: locale, full_name: "Brain fixture", onboarding_completed: true, theme: mode, ui_theme: "default", color_mode: mode, font_size_pref: "medium", widget_density: "comfortable", focus_mode: false };
      const single = (request.headers().accept ?? "").includes("application/vnd.pgrst.object+json");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(single ? profile : [profile]) });
      return;
    }
    if (table === "focus_preferences") {
      const preference = { id: "focus-fixture", user_id: userId, reality_mode: "normal" };
      const single = (request.headers().accept ?? "").includes("application/vnd.pgrst.object+json");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(single ? preference : [preference]) });
      return;
    }
    if (!page.__recovered && (scenario === "failure" || (scenario === "partial" && table === "goals"))) {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Local test: data source unavailable" }) });
      return;
    }
    const single = (request.headers().accept ?? "").includes("application/vnd.pgrst.object+json");
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "*/0" }, body: JSON.stringify(scenario === "empty" ? single ? null : [] : rows[table] ?? (single ? null : [])) });
  });
  await page.route("**/api/**", route => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  if (process.env.BRAIN_VERIFY_SCOPED_BUILD === "1") {
    // The optimized fixture build contains Brain only. Do not turn unrelated
    // sidebar route prefetches or its missing favicon into graph failures.
    await page.route(`${baseUrl}/**`, route => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const outOfScopeRoute = /^\/(en|zh-hk)\/(?!brain(?:\/|$))/.test(pathname);
      if (pathname === "/favicon.ico" || (outOfScopeRoute && !request.isNavigationRequest())) return route.fulfill({ status: 204 });
      return route.fallback();
    });
  }
  const started = Date.now();
  await page.goto(`${baseUrl}/${locale}/brain`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  if (scenario === "populated" || scenario === "partial") {
    try { await page.locator(".force-graph-container canvas").first().waitFor({ timeout: 30000 }); }
    catch (e) {
      console.log(JSON.stringify({ startupFailure: true, url: page.url(), errors, body: (await page.locator("body").innerText()).slice(0, 2000) }));
      await page.screenshot({ path: `${output}/startup-failure.png` });
      throw e;
    }
  }
  else await page.waitForTimeout(2500);
  const loadMs = Date.now() - started;
  await page.waitForTimeout(4500);
  return { context, page, errors, loadMs };
}
async function metrics(page) {
  const start = await page.evaluate(() => window.__brainFrames);
  await page.waitForTimeout(2000);
  return page.evaluate(start => ({ idleCanvasClears2s: window.__brainFrames - start, longTasks: window.__brainLongTasks.length, maxLongTaskMs: Math.round(Math.max(0, ...window.__brainLongTasks)), overflow: document.documentElement.scrollWidth > innerWidth, canvases: [...document.querySelectorAll(".force-graph-container canvas")].map(c => ({ css: { w: c.clientWidth, h: c.clientHeight }, pixels: { w: c.width, h: c.height } })) }), start);
}

async function checkInteractions(page, width, height) {
  const root = page.getByTestId("brain-workspace");
  const graph = page.getByTestId("brain-graph");
  const zoom = () => page.getByRole("button", { name: "Reset zoom", exact: true });
  const failures = [];
  const check = async (name, fn) => { try { await fn(); return true; } catch (e) { failures.push({ name, url: page.url(), error: e.message.slice(0, 700) }); await page.screenshot({ path: `${output}/failure-${width}-${name.replaceAll(" ", "-")}.png` }); return false; } };
  await check("zoom and keyboard", async () => {
    const before = parseInt(await zoom().innerText());
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.waitForTimeout(500);
    assert(parseInt(await zoom().innerText()) > before);
    await page.getByRole("region", { name: "Interactive knowledge graph", exact: true }).focus();
    await page.keyboard.press("-");
    await page.waitForTimeout(400);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("0");
  });
  await check("focus mode preserves canvas and zoom", async () => {
    await page.waitForTimeout(500);
    const before = await zoom().innerText();
    await page.evaluate(() => { window.__canvasBefore = document.querySelector(".force-graph-container canvas"); });
    await page.getByRole("button", { name: "Focus mode", exact: true }).click();
    await page.waitForTimeout(400);
    const bounds = await root.boundingBox();
    assert(bounds && Math.abs(bounds.width - width) <= 2 && Math.abs(bounds.height - height) <= 2);
    assert(await page.evaluate(() => window.__canvasBefore === document.querySelector(".force-graph-container canvas")));
    assert.equal(await zoom().innerText(), before);
    await page.waitForTimeout(800); // Capture the restored, full-quality label pass.
    await page.screenshot({ path: `${output}/focus-${width}x${height}.png` });
    await page.getByRole("button", { name: "Graph settings", exact: true }).click();
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await page.getByRole("button", { name: "Close filters", exact: true }).click();
    await page.keyboard.press("Escape");
    assert.equal(await root.getAttribute("data-expanded"), "false");
  });
  await check("search selection and details dismissal", async () => {
    const search = page.getByRole("combobox", { name: "Search your Brain" });
    await search.fill("Music notebook");
    await search.press("Enter");
    await page.waitForTimeout(500);
    if (width >= 1024) {
      const details = page.getByTestId("brain-desktop-details");
      await details.waitFor();
      await details.getByRole("button", { name: "Close", exact: true }).click();
      await page.waitForTimeout(250);
      assert.equal(await details.count(), 0);
    } else {
      await page.getByTestId("brain-mobile-details").waitFor();
      assert((await graph.boundingBox()).height >= 100);
      await page.getByRole("button", { name: "Expand node details" }).click();
      await page.getByRole("button", { name: "Collapse node details" }).click();
      await page.getByRole("button", { name: "Close details" }).click();
      await page.waitForTimeout(250);
      assert.equal(await page.getByTestId("brain-mobile-details").count(), 0);
    }
    await page.getByRole("button", { name: "Clear search" }).click();
    assert.equal(await search.inputValue(), "");
  });
  await check("node list and local depth", async () => {
    await page.getByRole("button", { name: "Browse nodes" }).click();
    await page.getByRole("region", { name: "Node list" }).getByRole("button", { name: /Learning notebook/ }).click();
    await page.getByRole("button", { name: "Neighborhood", exact: true }).click();
    await page.getByRole("button", { name: "Graph settings", exact: true }).click();
    await page.getByRole("button", { name: "2", exact: true }).click();
    await page.getByRole("button", { name: "Close settings", exact: true }).click();
    await page.getByRole("button", { name: "Overview", exact: true }).click();
  });
  await check("fullscreen plus controls", async () => {
    await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
    await page.waitForTimeout(400);
    assert.equal(await root.getAttribute("data-expanded"), "true");
    await page.getByRole("button", { name: "Graph settings", exact: true }).click();
    await page.getByRole("button", { name: "Close settings", exact: true }).click();
    if (await page.getByRole("button", { name: "Exit fullscreen", exact: true }).count()) await page.getByRole("button", { name: "Exit fullscreen", exact: true }).click();
    else await page.getByRole("button", { name: "Exit focus mode", exact: true }).click();
  });
  await check("unsupported fullscreen fallback", async () => {
    await page.evaluate(() => { window.__nativeFullscreen = Element.prototype.requestFullscreen; Element.prototype.requestFullscreen = () => Promise.reject(new DOMException("Test fixture", "NotSupportedError")); });
    await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
    await page.waitForTimeout(250);
    assert.equal(await root.getAttribute("data-expanded"), "true");
    await page.getByRole("button", { name: "Exit focus mode", exact: true }).click();
    await page.evaluate(() => { Element.prototype.requestFullscreen = window.__nativeFullscreen; });
  });
  return failures;
}
try {
  const viewports = phase === "before" ? [["phone", 390, 844], ["desktop", 1440, 900]] : [["phone", 390, 844], ["phone-landscape", 844, 390], ["tablet", 768, 1024], ["tablet-landscape", 1024, 768], ["laptop", 1280, 720], ["desktop", 1440, 900]];
  for (const [name, width, height] of viewports.filter(([name]) => !process.env.BRAIN_VERIFY_ONLY || process.env.BRAIN_VERIFY_ONLY.split(",").includes(name))) {
    const { context, page, errors, loadMs } = await openPage({ width, height }, { touch: width < 1100 });
    await page.screenshot({ path: `${output}/${name}.png` });
    const observed = await metrics(page);
    const interactions = phase === "before" ? [] : await checkInteractions(page, width, height);
    assert(new URL(page.url()).pathname.endsWith("/brain"), "Fixture navigation escaped the Brain page");
    results.push({ name, loadMs, ...observed, errors, interactions });
    console.log(JSON.stringify(results.at(-1)));
    if (phase !== "before") assert.equal(observed.overflow, false, `${name}: no page overflow`);
    await context.close();
  }
  if (process.env.BRAIN_VERIFY_EXTENDED === "1") {
    const cases = [
      ["dark-zh-tablet", { width: 768, height: 1024 }, { mode: "dark", locale: "zh-hk", touch: true }],
      ["large-phone", { width: 390, height: 844 }, { count: 900, touch: true }],
      ["empty", { width: 390, height: 844 }, { scenario: "empty" }],
      ["failure-retry", { width: 1280, height: 720 }, { scenario: "failure" }],
      ["partial-retry", { width: 1280, height: 720 }, { scenario: "partial" }],
      ["sphere-reduced", { width: 1024, height: 768 }, { reduced: true, touch: true }],
      ["sphere-unsupported", { width: 390, height: 844 }, { noWebGL: true, touch: true }],
      ["sphere-lifecycle", { width: 1024, height: 768 }, { reduced: true, touch: true }],
      ["filters-and-recovery", { width: 390, height: 844 }, { touch: true }],
    ];
    for (const [name, viewport, options] of cases.filter(([name]) => !process.env.BRAIN_VERIFY_CASES || process.env.BRAIN_VERIFY_CASES.split(",").includes(name))) {
      const { context, page, errors, loadMs } = await openPage(viewport, options);
      const interactions = [];
      let additional = {};
      try {
        if (name === "empty") await page.getByRole("heading", { name: "Your Brain starts here" }).waitFor();
        if (name.includes("retry")) {
          await page.getByText(name.startsWith("failure") ? "Could not load your Brain" : /Partial sync/).waitFor({ timeout: 20000 });
          page.__recovered = true;
          await page.getByRole("button", { name: "Retry", exact: true }).click();
          await page.locator(".force-graph-container canvas").waitFor({ timeout: 15000 });
          await page.waitForTimeout(4500);
          assert.equal(await page.getByText(/Partial sync/).count(), 0);
        }
        if (name === "sphere-reduced") {
          await page.getByRole("button", { name: "Sphere", exact: true }).click();
          await page.locator('[aria-label="Brain knowledge sphere — interactive 3D graph"] canvas').waitFor({ timeout: 30000 });
          await page.waitForTimeout(3000);
          const initial = await page.evaluate(() => window.__brainGLFrames);
          assert(initial > 0, "3D must actually render");
          await page.getByRole("button", { name: "Graph settings", exact: true }).click();
          await page.getByRole("button", { name: "normal", exact: true }).click();
          await page.getByRole("button", { name: "Close settings" }).click();
          await page.waitForTimeout(1500);
          const before = await page.evaluate(() => window.__brainGLFrames);
          await page.waitForTimeout(2000);
          additional.idleWebGLClears2s = await page.evaluate(() => window.__brainGLFrames) - before;
          assert.equal(additional.idleWebGLClears2s, 0, "Reduced motion must suppress ambient rendering");
          await page.getByRole("button", { name: "Zoom in 5 percent", exact: true }).click();
          await page.waitForTimeout(400);
          assert(await page.evaluate(() => window.__brainGLFrames) > before, "Sphere zoom must redraw");
          await page.getByRole("button", { name: "Fit full sphere" }).click();
        }
        if (name === "sphere-unsupported") {
          await page.getByRole("button", { name: "Sphere", exact: true }).click();
          await page.getByText(/doesn't support WebGL/).waitFor();
          await page.getByRole("button", { name: "Overview", exact: true }).click();
          await page.locator(".force-graph-container canvas").waitFor();
          await page.waitForTimeout(4500);
        }
        if (name === "sphere-lifecycle") {
          await page.getByRole("button", { name: "Sphere", exact: true }).click();
          const sphere = page.locator('[aria-label="Brain knowledge sphere — interactive 3D graph"]');
          await sphere.locator("canvas").waitFor({ timeout: 30000 });
          await page.getByRole("button", { name: "Graph settings", exact: true }).click();
          await page.getByLabel("Sphere links", { exact: true }).check();
          await page.waitForTimeout(500);
          const counts = [];
          for (const value of ["node_type", "category", "node_type", "category", "node_type", "category"]) {
            await page.getByLabel("Cluster by").selectOption(value);
            await page.waitForTimeout(500);
            counts.push(await page.evaluate(() => ({ buffers: window.__brainGpuBuffers.size, textures: window.__brainGpuTextures.size })));
          }
          additional.gpuResourcesByGrouping = counts;
          if (process.env.BRAIN_VERIFY_ALLOW_LEAK !== "1") {
            assert.equal(counts.at(-1).buffers, counts[1].buffers, "Grouping changes must release old edge buffers");
            assert.equal(counts.at(-1).textures, counts[1].textures, "Grouping changes must release old textures");
          }
          await page.getByRole("button", { name: "Close settings" }).click();
          await page.getByRole("button", { name: "Focus mode", exact: true }).click();
          await page.waitForTimeout(500);
          const canvasSize = await sphere.locator("canvas").evaluate(c => ({ width: c.width, height: c.height, cssWidth: c.clientWidth, cssHeight: c.clientHeight }));
          additional.sphereCanvas = canvasSize;
          assert(Math.abs(canvasSize.width - canvasSize.cssWidth) <= 1, "Coarse-pointer sphere DPR is capped at 1");
          assert(Math.abs(canvasSize.height - canvasSize.cssHeight) <= 1, "Fractional CSS sizes may round by one pixel");
          const box = await sphere.boundingBox();
          const zoomButton = page.getByRole("button", { name: "Zoom to farthest", exact: true });
          const beforeZoom = parseInt(await zoomButton.innerText());
          const cdp = await context.newCDPSession(page);
          const x = box.x + box.width / 2, y = box.y + box.height * .15;
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x - 25, y, id: 1 }, { x: x + 25, y, id: 2 }] });
          for (let d = 35; d <= 75; d += 10) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - d, y, id: 1 }, { x: x + d, y, id: 2 }] }); await page.waitForTimeout(40); }
          await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          await page.waitForTimeout(700);
          const afterZoom = parseInt(await zoomButton.innerText());
          additional.spherePinchZoom = { before: beforeZoom, after: afterZoom };
          assert(afterZoom > beforeZoom, "Spreading fingers must zoom in, not out");
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x - 75, y, id: 1 }, { x: x + 75, y, id: 2 }] });
          for (let d = 65; d >= 25; d -= 10) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - d, y, id: 1 }, { x: x + d, y, id: 2 }] }); await page.waitForTimeout(40); }
          await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          await page.waitForTimeout(700);
          const inwardZoom = parseInt(await zoomButton.innerText());
          additional.spherePinchZoom.inward = inwardZoom;
          assert(inwardZoom < afterZoom, "Bringing fingers together must zoom out");
          await page.getByRole("button", { name: "Exit focus mode", exact: true }).click();
        }
        if (name === "filters-and-recovery") {
          await page.getByRole("combobox", { name: "Search your Brain" }).fill("Music");
          await page.getByRole("button", { name: "Graph settings", exact: true }).click();
          await page.getByLabel("Connection filter").selectOption("orphans_only");
          await page.getByRole("button", { name: "Close settings" }).click();
          await page.getByRole("button", { name: "Clear all filters", exact: true }).click();
          assert.equal(await page.getByRole("combobox", { name: "Search your Brain" }).inputValue(), "");
          await page.locator(".force-graph-container canvas").waitFor();
          await page.getByRole("button", { name: "Graph settings", exact: true }).click();
          await page.getByRole("button", { name: "Find connections", exact: true }).click();
          await page.getByRole("button", { name: "Close connection suggestions" }).click();
          await page.getByRole("button", { name: "Graph settings", exact: true }).click();
          await page.getByRole("button", { name: "Refresh data", exact: true }).click();
          await page.getByText("Data refreshed", { exact: true }).waitFor();
          await page.getByRole("button", { name: "Reset layout", exact: true }).click();
          await page.getByRole("button", { name: "Close settings" }).click();
          await page.waitForTimeout(4500);
        }
        if (name === "dark-zh-tablet") {
          await page.getByRole("combobox", { name: "搜尋你的大腦" }).waitFor();
          await page.getByRole("button", { name: "专注模式" }).count();
          await page.getByRole("button", { name: "圖譜設定", exact: true }).click();
        }
        if (name === "large-phone") {
          const before = parseInt(await page.getByRole("button", { name: "Reset zoom", exact: true }).innerText());
          const box = await page.getByTestId("brain-graph").boundingBox();
          const cdp = await context.newCDPSession(page);
          const y = box.y + box.height * .15, x = box.x + box.width / 2;
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x - 20, y, id: 1 }, { x: x + 20, y, id: 2 }] });
          for (let d = 30; d <= 70; d += 10) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - d, y, id: 1 }, { x: x + d, y, id: 2 }] }); await page.waitForTimeout(40); }
          await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          await page.waitForTimeout(1000);
          const after = parseInt(await page.getByRole("button", { name: "Reset zoom", exact: true }).innerText());
          additional.pinchZoom = { before, after };
          assert(after > before, `Pinch must zoom (${before} -> ${after})`);
          await page.getByRole("button", { name: "Fit graph to view" }).click();
          await page.waitForTimeout(1200);
        }
        await page.getByTestId("brain-workspace").waitFor();
        assert(new URL(page.url()).pathname.endsWith("/brain"), "Fixture navigation escaped the Brain page");
        const observed = await metrics(page);
        assert.equal(observed.overflow, false);
        additional = { ...additional, ...observed };
        await page.screenshot({ path: `${output}/${name}.png` });
      } catch (e) { interactions.push({ name, url: page.url(), error: e.message.slice(0, 800) }); await page.screenshot({ path: `${output}/${name}-failure.png` }); }
      const unexpected = options.scenario === "failure" || options.scenario === "partial" ? errors.filter(e => !e.includes("503")) : errors;
      results.push({ name, loadMs, ...additional, errors: unexpected, interactions });
      console.log(JSON.stringify(results.at(-1)));
      await context.close();
    }
  }
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ execution: "local browser fixtures", phase, results }, null, 2));
  await browser.close();
}
assert(results.every(r => r.errors.length === 0 && r.interactions.length === 0), "Browser interaction or console failures; see results.json");
