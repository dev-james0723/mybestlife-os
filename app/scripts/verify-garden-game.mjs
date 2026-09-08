import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import sharp from "sharp";

// Isolated browser fixtures. Every service request is intercepted; no real account writes.
const base = process.env.GARDEN_VERIFY_URL ?? "http://127.0.0.1:3000";
const out = process.env.GARDEN_VERIFY_OUT ?? "../artifacts/garden-3d/first-pass";
await mkdir(out, { recursive: true });
const projectRef = JSON.parse(await readFile("package.json", "utf8")).scripts["db:link"]?.match(/--project-ref\s+(\S+)/)?.[1];
const userId = "00000000-0000-4000-8000-000000000071";
const day = new Date().toISOString().slice(0, 10);
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const results = [];
async function open(viewport, { dark = false, touch = false, noWebGL = false, locale = "en", empty = false, fail = false, reduced = false } = {}) {
  const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1, reducedMotion: reduced ? "reduce" : "no-preference" });
  await context.addCookies([{ name: "mylifeos_dev_bypass", value: "1", url: base, httpOnly: true }]);
  await context.addInitScript(({ dark, noWebGL, projectRef, userId, locale }) => {
    const mode = dark ? "dark" : "light";
    localStorage.setItem("mylifeos-theme", JSON.stringify({ uiTheme: "default", colorMode: mode, fontSize: "medium", widgetDensity: "comfortable", focusMode: false }));
    const user = { id: userId, email: "garden-fixture@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} };
    window.__gardenAudioNotes = 0;
    const originalOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function(...args) { window.__gardenAudioNotes++; return originalOscillator.apply(this,args); };
    localStorage.setItem("mylifeos:settings-profile:v1", JSON.stringify({ id: userId, language: locale, onboarding_completed: true, theme: mode, ui_theme: "default", color_mode: mode }));
    const payload = btoa(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })).replaceAll("=", "");
    const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.fixture`, refresh_token: "local-fixture", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user };
    for (const ref of ["placeholder", projectRef].filter(Boolean)) document.cookie = `sb-${ref}-auth-token=base64-${btoa(JSON.stringify(session)).replaceAll("=", "")}; Path=/; SameSite=Lax`;
    if (noWebGL) { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/.test(type) ? null : original.call(this, type, ...args); }; }
  }, { dark, noWebGL, projectRef, userId, locale });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [], writes = [];
  page.on("pageerror", e => errors.push(e.message));
  const rendererErrors=[];
  page.on("console",message=>{
    if (message.type()==="error" && /THREE|WebGL|shader|hydration/i.test(message.text()) && !(noWebGL && /Error creating WebGL context/.test(message.text()))) rendererErrors.push(message.text().slice(0,500));
  });
  await page.routeWebSocket("**/realtime/**", ws => ws.onMessage(() => {}));
  await page.route("**/auth/v1/**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: userId, email: "garden-fixture@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} }) }));
  let plant = empty ? null : { id: "garden-fixture", user_id: userId, plant_type: "sunflower", growth_stage: 3, growth_points: 4, streak_days: 5, last_watered_at: "2026-09-01", planted_at: "2026-08-01T12:00:00Z", variant: "normal", is_wilted: false };
  const logs = [1, 2, 4, 5].map(n => ({ user_id: userId, log_date: new Date(Date.parse(`${day}T12:00:00Z`) - n * 86400000).toISOString().slice(0,10), watered: true }));
  let shouldFail = fail;
  await page.route("**/rest/v1/**", async route => {
    const req = route.request(), url = new URL(req.url()), table = url.pathname.split("/").at(-1), method = req.method();
    const single = (req.headers().accept ?? "").includes("application/vnd.pgrst.object+json");
    if (table === "profiles") return route.fulfill({ status:200, contentType:"application/json", body:JSON.stringify(single ? { id:userId, language:locale, full_name:"Garden preview", onboarding_completed:true, theme:dark?"dark":"light", ui_theme:"default", color_mode:dark?"dark":"light", font_size_pref:"medium", widget_density:"comfortable", focus_mode:false, os_buddy_enabled:false } : []) });
    if (table === "focus_preferences") return route.fulfill({status:200, contentType:"application/json",body:JSON.stringify(single ? {id:"focus-fixture",user_id:userId,reality_mode:"normal"} : [])});
    if (shouldFail && ["user_garden", "garden_daily_log", "plant_collection"].includes(table)) return route.fulfill({ status:503, contentType:"application/json", body:JSON.stringify({ message:"Local fixture: unavailable" }) });
    let rows = [];
    if (method !== "GET" && method !== "HEAD") {
      writes.push({ table, method });
      if (table === "user_garden") { if (method === "DELETE") plant = null; else plant = { ...(plant ?? { id:"garden-fixture", user_id:userId, growth_stage:1, growth_points:0, streak_days:0, variant:"normal", last_watered_at:null }), ...req.postDataJSON() }; }
      else if (table === "garden_daily_log") { const record = req.postDataJSON(); const previous = logs.find(l => l.log_date === record.log_date); if (previous) Object.assign(previous, record); else logs.push(record); }
      else if (table !== "plant_collection") return route.fulfill({ status:403, contentType:"application/json", body:JSON.stringify({ message:"Unexpected fixture write blocked" }) });
    }
    if (table === "user_garden") rows = plant ? [plant] : [];
    if (table === "garden_daily_log") rows = logs.filter(l => !url.searchParams.get("log_date")?.startsWith("eq.") || l.log_date === url.searchParams.get("log_date").slice(3));
    if (table === "tasks" || table === "journal_entries") rows = url.searchParams.get("select") === "id" ? [{ id: "life-fixture" }] : [];
    if (table === "plant_collection") rows = empty ? [] : [{ id:"flower-1", user_id:userId, plant_type:"grass", variant:"normal", bloom_date:"2026-09-01", harvested_at:"2026-09-01T12:00:00Z", streak_days:7 }];
    return route.fulfill({ status:200, contentType:"application/json", headers:{"content-range":`0-${Math.max(0, rows.length-1)}/${rows.length}`}, body:method === "HEAD" ? "" : JSON.stringify(single ? rows[0] ?? null : rows) });
  });
  await page.route("**/api/**", route => route.fulfill({ status:200, contentType:"application/json", body:"{}" }));
  if (process.env.GARDEN_VERIFY_SCOPED_BUILD === "1") await page.route(`${base}/**`, route => {
    const request=route.request(), pathname=new URL(request.url()).pathname;
    if (pathname === "/favicon.ico" || (/^\/(en|zh-hk)\/(?!garden(?:\/|$))/.test(pathname) && !request.isNavigationRequest())) return route.fulfill({status:204});
    return route.fallback();
  });
  await page.goto(`${base}/${locale === "zh-TW" ? "zh-hk" : locale}/garden`, { waitUntil:"domcontentloaded", timeout:120000 });
  try { await page.getByTestId("garden-game").waitFor({timeout:120000}); }
  catch (e) { await writeFile(`${out}/startup-failure.json`,JSON.stringify({url:page.url(),errors,body:(await page.locator("body").innerText()).slice(0,1500)})); throw e; }
  if (!noWebGL) await page.locator('[data-testid="garden-canvas"] canvas').waitFor({timeout:120000});
  await page.waitForTimeout(1800);
  return { page, context, errors, rendererErrors, writes, recover: () => { shouldFail = false; } };
}

async function capture(page, name) {
  const game = page.getByTestId("garden-game");
  await game.evaluate(el => el.scrollIntoView({block:"start"}));
  await page.waitForTimeout(250);
  if (await page.locator('[data-expanded="true"]').count()) await page.locator('[data-expanded="true"]').screenshot({path:`${out}/${name}.png`});
  else await game.screenshot({ path:`${out}/${name}.png` });
  await page.screenshot({ path:`${out}/${name}-viewport.png` });
}
async function playWithDestinations(page) {
  const game = page.getByTestId("garden-game");
  if (await page.getByRole("button", {name:"Guide Sprout",exact:true}).isVisible()) await page.getByRole("button", {name:"Guide Sprout",exact:true}).click();
  for (let turn = 0; turn < 20; turn++) {
    if (await game.getAttribute("data-phase") === "won") return;
    const count = Number(await game.getAttribute("data-dew"));
    const targets = page.locator(`[data-testid^="garden-${count >= 2 ? "bed" : "drop"}-"]:enabled`);
    const item = targets.first();
    assert(await item.count(), "No reachable objective action");
    await item.click();
    await item.waitFor({ state:"attached" });
    const id = await item.getAttribute("data-testid");
    await page.waitForFunction(id => document.querySelector(`[data-testid="${id}"]`)?.disabled || document.querySelector('[data-testid="garden-game"]')?.dataset.phase === "won", id, { timeout:12000 });
  }
  assert.equal(await game.getAttribute("data-phase"), "won");
}
try {
  if(process.env.GARDEN_VERIFY_ONLY === "locale") {
    const test=await open({width:390,height:844},{locale:"zh-TW",dark:true,touch:true,reduced:true});
    await capture(test.page,"locale-debug");
    await writeFile(`${out}/locale-debug.json`,JSON.stringify({errors:test.errors,rendererErrors:test.rendererErrors},null,2));
    console.log(JSON.stringify({errors:test.errors,rendererErrors:test.rendererErrors},null,2));
    await browser.close(); process.exit(test.errors.length ? 1 : 0);
  }
  const desktop = await open({width:1440,height:1000});
  await capture(desktop.page, "desktop-ready");
  await desktop.page.getByRole("button", {name:"Turn sound on",exact:true}).click();
  await desktop.page.getByRole("button", {name:"Enter the garden",exact:true}).click();
  const region = desktop.page.getByRole("region", {name:"Interactive 3D garden adventure"});
  await region.focus(); await desktop.page.keyboard.down("ArrowLeft"); await desktop.page.waitForTimeout(600); await desktop.page.keyboard.up("ArrowLeft");
  await capture(desktop.page, "desktop-playing");
  const canvas = desktop.page.locator("[data-testid=garden-canvas] canvas");
  const diagnostics = JSON.parse(await canvas.getAttribute("data-garden-diagnostics") ?? "{}");
  const pixelData=await sharp(await canvas.screenshot()).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let coloredPixels=0; const colors=new Set();
  for(let i=0;i<pixelData.data.length;i+=16){if(pixelData.data[i+3]>0){coloredPixels++;colors.add(`${pixelData.data[i]>>4},${pixelData.data[i+1]>>4},${pixelData.data[i+2]>>4}`);}}
  assert(coloredPixels>1000 && colors.size>10,"Canvas must contain a varied rendered island");
  assert(diagnostics.player.x < -0.5,"Keyboard movement must move the companion");
  await region.focus(); await desktop.page.keyboard.down("ArrowRight");
  for(let frame=0;frame<4;frame++){ await desktop.page.waitForTimeout(140); await canvas.screenshot({path:`${out}/motion-${frame}.png`}); }
  await desktop.page.keyboard.up("ArrowRight");
  await desktop.page.getByRole("button", {name:"Pause adventure",exact:true}).click();
  assert.equal(await desktop.page.getByTestId("garden-game").getAttribute("data-phase"), "paused");
  await desktop.page.getByRole("button", {name:"Keep exploring",exact:true}).last().click();
  await playWithDestinations(desktop.page);
  const audioNotes = await desktop.page.evaluate(()=>window.__gardenAudioNotes);
  assert(audioNotes > 0,"Real pickup/bloom events must trigger opted-in sound");
  await capture(desktop.page, "desktop-win");
  await desktop.page.getByRole("button", {name:"Give today’s water",exact:true}).first().click();
  await desktop.page.getByRole("button", {name:"Cared for today",exact:true}).first().waitFor();
  assert.equal(desktop.writes.filter(w=>w.table === "user_garden" && w.method === "PATCH").length, 1);
  await desktop.page.reload({waitUntil:"domcontentloaded"}); await desktop.page.getByRole("button", {name:"Cared for today",exact:true}).waitFor();
  results.push({ name:"desktop", diagnostics, pixels:{sampledVisible:coloredPixels,colorBins:colors.size}, audioNotes, errors:desktop.errors, rendererErrors:desktop.rendererErrors, writes:desktop.writes, reloadCare:true });
  await desktop.context.close();
  if (process.env.GARDEN_VERIFY_QUICK !== "1") {
    for (const scenario of [
      {name:"phone", width:390,height:844,touch:true}, {name:"small-phone",width:320,height:740,touch:true},
      {name:"tablet-dark",width:820,height:1180,touch:true,dark:true}, {name:"landscape",width:844,height:390,touch:true},
      {name:"zh-dark",width:390,height:844,touch:true,dark:true,locale:"zh-TW",reduced:true},
      {name:"no-webgl",width:390,height:844,touch:true,noWebGL:true}, {name:"empty",width:1280,height:900,empty:true}, {name:"unavailable",width:1280,height:900,fail:true},
    ]) {
      const test = await open({width:scenario.width,height:scenario.height}, scenario);
      const ui = scenario.locale ? "走進花園" : "Enter the garden";
      await test.page.getByRole("button",{name:ui,exact:true}).click();
      if(scenario.fail) await test.page.getByText("Your garden couldn’t load",{exact:true}).waitFor();
      await capture(test.page, scenario.name);
      const overflow = await test.page.evaluate(()=>{
        const el=document.querySelector('[data-testid="garden-game"]'), box=el.getBoundingClientRect();
        return document.documentElement.scrollWidth > innerWidth || box.right > innerWidth + 1 || box.width < el.scrollWidth - 1;
      });
      assert(!overflow, `${scenario.name} horizontal overflow`);
      if (scenario.noWebGL) { await playWithDestinations(test.page); await capture(test.page,"no-webgl-win"); }
      if (scenario.name === "phone") {
        const box = await test.page.locator("[data-testid=garden-canvas] canvas").boundingBox();
        const before = JSON.parse(await test.page.locator("[data-testid=garden-canvas] canvas").getAttribute("data-garden-diagnostics"));
        await test.page.touchscreen.tap(box.x+box.width*.35, box.y+box.height*.5); await test.page.waitForTimeout(1400);
        const after = JSON.parse(await test.page.locator("[data-testid=garden-canvas] canvas").getAttribute("data-garden-diagnostics"));
        assert(Math.hypot(after.player.x-before.player.x, after.player.z-before.player.z) > .3,"Touch movement must move the companion");
        await test.page.setViewportSize({width:844,height:390}); await capture(test.page,"phone-rotated");
        assert.equal(await test.page.getByRole("dialog").getAttribute("aria-modal"),"true");
        await test.page.getByRole("button",{name:"Exit expanded garden",exact:true}).click();
        await test.page.getByRole("region",{name:"Interactive 3D garden adventure"}).focus();
        await test.page.keyboard.press("Escape");
        assert.equal(await test.page.getByTestId("garden-game").getAttribute("data-phase"),"paused");
      }
      if (scenario.fail) { test.recover(); await test.page.getByRole("button",{name:"Try again",exact:true}).click(); await test.page.getByRole("button",{name:"Give today’s water",exact:true}).waitFor(); }
      const diagnostics = await test.page.locator("[data-testid=garden-canvas] canvas").count() ? JSON.parse(await test.page.locator("[data-testid=garden-canvas] canvas").getAttribute("data-garden-diagnostics")) : null;
      results.push({name:scenario.name,overflow,diagnostics,errors:test.errors,rendererErrors:test.rendererErrors,writes:test.writes}); await test.context.close();
    }
  }
  if(process.env.GARDEN_VERIFY_QUICK !== "1"){
    const timeoutTest=await open({width:390,height:844},{noWebGL:true});
    await timeoutTest.page.clock.install();
    await timeoutTest.page.getByRole("button",{name:"90-second challenge",exact:true}).click();
    await timeoutTest.page.getByRole("button",{name:"Enter the garden",exact:true}).click();
    await timeoutTest.page.clock.runFor(91000);
    assert.equal(await timeoutTest.page.getByTestId("garden-game").getAttribute("data-phase"),"timeout");
    await capture(timeoutTest.page,"challenge-timeout");
    await timeoutTest.page.getByRole("button",{name:"Continue without a timer",exact:true}).click();
    assert.equal(await timeoutTest.page.getByTestId("garden-game").getAttribute("data-phase"),"playing");
    await timeoutTest.page.getByRole("button",{name:"Pause adventure",exact:true}).click();
    await timeoutTest.page.getByRole("button",{name:"Start again",exact:true}).click();
    assert.equal(await timeoutTest.page.getByTestId("garden-game").getAttribute("data-blooms"),"0");
    results.push({name:"timeout-continue-retry",errors:timeoutTest.errors,rendererErrors:timeoutTest.rendererErrors});await timeoutTest.context.close();
  }
  const reportPage=await browser.newPage({viewport:{width:1200,height:1000}});
  await reportPage.goto(new URL("../../docs/garden-research/garden-retention-research.html",import.meta.url).href);
  assert.equal(await reportPage.locator("h1").innerText(),"A garden worth returning to");
  assert.equal(await reportPage.locator("table tbody tr").count(),6);
  await reportPage.screenshot({path:`${out}/research-opening.png`});
  await reportPage.locator("table").screenshot({path:`${out}/research-comparison.png`});
  await reportPage.close();
  await writeFile(`${out}/results.json`, JSON.stringify({execution:"browser fixtures; no live writes",results},null,2));
  assert(results.every(r=>r.errors.length===0 && r.rendererErrors.length===0), JSON.stringify(results.map(r=>({name:r.name,errors:r.errors,rendererErrors:r.rendererErrors}))));
  console.log(JSON.stringify(results,null,2));
} finally { await browser.close(); }
