import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createGardenFixture, base, day } from "./sky-garden-fixture.mjs";

const out = process.env.GARDEN_VERIFY_OUT ?? "../artifacts/garden-v2/pass-1";
await mkdir(out, { recursive: true });
const fixture = await createGardenFixture(out), results = [];
const mode = process.argv[2] ?? "smoke";
const state = page => page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.snapshot());
const diagnostics = page => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__);
async function enter(page) { await page.locator("[data-garden-enter]").click(); await page.locator('[data-entered="true"]').waitFor(); await page.waitForTimeout(1500); }
async function capture(page, name) {
  await page.screenshot({ path: `${out}/${name}.png` });
  const d = await diagnostics(page);
  await writeFile(`${out}/${name}-diagnostics.json`, JSON.stringify(d, null, 2));
  console.log(`Captured ${name}`, d ? { fps: d.fps, calls: d.calls, triangles: d.triangles, dpr: d.dpr } : "fallback");
}
async function visit(page, kind, id) {
  await page.getByRole("button", { name: "Map & field notes", exact: true }).click();
  await page.getByTestId(`garden-destination-${kind}-${id}`).click();
  await page.waitForFunction(() => window.__THREE_GAME_TEST_HOOKS__.snapshot().target === null, null, { timeout: 20_000 });
  await page.waitForTimeout(150);
}
async function act(page) {
  const button = page.getByTestId("garden-action");
  const seq=(await state(page)).eventSeq;
  await button.click();
  await page.waitForFunction(seq=>{const s=window.__THREE_GAME_TEST_HOOKS__.snapshot();return s.action!==null||s.eventSeq>seq;},seq);
  await page.waitForFunction(() => window.__THREE_GAME_TEST_HOOKS__.snapshot().action === null, null, { timeout: 6000 });
  await page.waitForTimeout(150);
}
async function clean(test, name) {
  assert.deepEqual(test.errors, [], `${name} page errors`); assert.deepEqual(test.rendererErrors, [], `${name} renderer errors`);
  await test.context.close();
}
try {
  if (mode === "smoke") {
    const test = await fixture.open({ width: 1440, height: 900 });
    await capture(test.page, "desktop-entry");
    await enter(test.page); await capture(test.page, "desktop-active");
    const before = await state(test.page);
    await test.page.locator('[data-entered="true"]').focus(); await test.page.keyboard.down("w"); await test.page.waitForTimeout(900); await test.page.keyboard.up("w");
    const after = await state(test.page);
    assert(Math.hypot(after.player.x - before.player.x, after.player.z - before.player.z) > 2, "keyboard moves the gardener");
    await visit(test.page, "bed", "0"); await act(test.page);
    assert.equal((await state(test.page)).beds[0].stage, "planted");
    await act(test.page); assert.equal((await state(test.page)).beds[0].stage, "growing");
    await capture(test.page, "desktop-tending");
    results.push({ check: "keyboard, map route, plant and water", passed: true, writes: test.writes });
    await clean(test, "desktop smoke");
    const phone = await fixture.open({ width: 390, height: 844 }, { touch: true, dark: true });
    await enter(phone.page); await capture(phone.page, "phone-active");
    await clean(phone, "phone smoke");
  } else if (mode === "full") {
    const test = await fixture.open({ width: 1440, height: 900 }, { record: true });
    const page = test.page; await enter(page);
    const start = Date.now();
    await page.getByRole("button", { name: "Enable sound", exact: true }).click();
    for (let i = 0; i < 3; i++) {
      if ((await state(page)).water < 1) { await visit(page, "well", "well"); await act(page); }
      await visit(page, "bed", i); await act(page); await act(page);
      assert.equal((await state(page)).beds[i].stage, "growing", `bed ${i} was watered before waiting for harvest`);
    }
    for (let i = 0; i < 3; i++) { await visit(page, "forage", i); await act(page); }
    for (let i = 0; i < 3; i++) {
      await visit(page, "bed", i);
      await page.waitForFunction(i => window.__THREE_GAME_TEST_HOOKS__.snapshot().beds[i].stage === "ripe", i);
      await act(page);
    }
    await visit(page, "home", "home");
    test.loseNextResponse(); await act(page);
    assert.equal((await state(page)).delivered, true);
    await page.getByRole("button", { name: "Retry sync", exact: true }).waitFor(); test.recover();
    await page.getByRole("button", { name: "Retry sync", exact: true }).click();
    await page.getByText("Saved to your account", { exact: true }).waitFor();
    assert((await page.evaluate(() => window.__gardenAudioNotes)) > 5, "unlocked sound produces event cues");
    const completed = await state(page); await capture(page, "desktop-expedition-complete");
    await page.getByRole("button", { name: "Garden settings", exact: true }).click();
    await page.getByRole("button", { name: /Lantern\s*1 stamps/ }).click();
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some(el => el.textContent?.includes("Lantern") && el.getAttribute("aria-pressed") === "true"));
    await page.getByRole("button", { name: "Close menu and resume", exact: true }).click();
    await page.getByRole("button", { name: "Leave garden", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("[data-garden-enter]") === document.activeElement);
    results.push({ check: "complete real-input expedition with a lost save response", passed: true, seconds: (Date.now() - start) / 1000, earned: completed.earned, writes: test.writes });
    await clean(test, "full expedition");
    const second = await fixture.open({ width: 390, height: 844 }, { touch: true });
    await enter(second.page);
    assert.equal((await state(second.page)).delivered, true, "a second browser context restores the same account");
    await second.page.getByRole("button", { name: "Garden settings", exact: true }).click();
    assert.equal(await second.page.getByRole("button", { name: /Lantern\s*1 stamps/ }).getAttribute("aria-pressed"), "true");
    await capture(second.page, "phone-synced-settings"); await clean(second, "second device");
    const other = await fixture.open({ width: 820, height: 1180 }, { touch: true, account: "B", empty: true });
    await enter(other.page); assert.equal((await state(other.page)).earned.length, 0); await capture(other.page, "tablet-other-account"); await clean(other, "other account");
    results.push({ check: "same-account restore and second-account isolation through PostgreSQL-backed adapter", passed: true });
  } else if (mode === "controls") {
    const test = await fixture.open({ width: 390, height: 844 }, { touch: true, dark: true, record: true });
    const page = test.page; await enter(page);
    const cdp = await test.context.newCDPSession(page);
    const box = await page.getByRole("button", { name: "Move joystick", exact: true }).boundingBox();
    const finger = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 0 };
    const before = await state(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [finger] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...finger, y: finger.y - 40 }] });
    await page.waitForTimeout(650);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await page.waitForTimeout(400);
    const moved = await state(page);
    assert(Math.hypot(moved.player.x - before.player.x, moved.player.z - before.player.z) > 1, "touch joystick moves the character");
    await page.waitForTimeout(500);
    const stopped = await state(page);
    assert(Math.hypot(stopped.player.x - moved.player.x, stopped.player.z - moved.player.z) < 0.03, "pointer cancellation stops input");
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    const paused = await state(page); await page.waitForTimeout(500);
    assert.equal((await state(page)).elapsed, paused.elapsed, "pause freezes gameplay");
    await page.getByRole("button", { name: "Keep exploring", exact: true }).click();
    await page.setViewportSize({ width: 844, height: 390 });
    await page.getByRole("button", { name: "Garden settings", exact: true }).click();
    await capture(page, "phone-landscape-settings");
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "landscape has no horizontal overflow");
    await page.getByRole("button", { name: "Close menu and resume", exact: true }).click();
    await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
    await page.waitForFunction(() => !!document.fullscreenElement || document.body.textContent.includes("Using the full-window view"));
    const native = await page.evaluate(() => !!document.fullscreenElement);
    if (native) await page.getByRole("button", { name: "Exit fullscreen", exact: true }).click();
    await page.evaluate(() => { Element.prototype.requestFullscreen = () => Promise.reject(new Error("Test browser fullscreen denied")); });
    await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
    await page.getByText("Using the full-window view. This browser does not offer native fullscreen.", { exact: true }).waitFor();
    await capture(page, "fullscreen-fallback");
    await page.getByRole("button", { name: "Leave garden", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("[data-garden-enter]") === document.activeElement);
    results.push({ check: "touch movement and cancel, pause, orientation, fullscreen and denied-API fallback", passed: true, nativeFullscreenObserved: native });
    await clean(test, "touch controls");

    const fallback = await fixture.open({ width: 320, height: 740 }, { touch: true, noWebGL: true, reduced: true, empty: true, account: "B" });
    await enter(fallback.page);
    await fallback.page.getByRole("heading", { name: "Your garden is still here" }).waitFor();
    await visit(fallback.page, "bed", 0); await act(fallback.page); await act(fallback.page);
    assert.equal((await state(fallback.page)).beds[0].stage, "growing");
    await fallback.page.getByText("Saved to your account", { exact: true }).waitFor();
    await fallback.page.getByRole("button", { name: "Garden settings", exact: true }).click();
    assert.equal(await fallback.page.getByLabel("Gentle motion", { exact: true }).isChecked(), true);
    assert.equal(await fallback.page.getByLabel("Gentle motion", { exact: true }).isDisabled(), true);
    await capture(fallback.page, "no-webgl-reduced-motion");
    results.push({ check: "320px no-WebGL gardening still saves and system reduced motion is respected", passed: true });
    await clean(fallback, "fallback controls");
  } else if (mode === "challenge") {
    const test = await fixture.open({ width: 1440, height: 900 }, { record: true });
    const page = test.page; await enter(page);
    await page.getByRole("button", { name: "Map & field notes", exact: true }).click();
    await page.getByLabel("Timed butterfly challenge (38 seconds)", { exact: true }).check();
    await page.getByTestId("garden-destination-butterfly-butterfly").click();
    await page.waitForFunction(() => window.__THREE_GAME_TEST_HOOKS__.snapshot().target === null);
    await act(page);
    assert.equal((await state(page)).trail.phase, "following");
    await page.waitForFunction(() => window.__THREE_GAME_TEST_HOOKS__.snapshot().trail.phase === "failed", null, { timeout: 45_000 });
    await capture(page, "timed-trail-failed");
    await visit(page, "butterfly", "butterfly"); await act(page);
    for (let i = 0; i < 3; i++) { await visit(page, "butterfly", "butterfly"); await act(page); }
    assert.equal((await state(page)).trail.phase, "won");
    await page.getByText("Saved to your account", { exact: true }).waitFor();
    await capture(page, "timed-trail-retry-won");
    results.push({ check: "38-second timeout and real-input three-stop retry win", passed: true, writes: test.writes });
    await clean(test, "butterfly challenge");
  } else if (mode === "bonus") {
    const test = await fixture.open({ width: 1280, height: 900 }, { activityDelayMs: 10_000 });
    const page = test.page; await enter(page);
    assert.equal((await state(page)).water, 2, "player can enter before slow activity data returns");
    await page.waitForFunction(() => window.__THREE_GAME_TEST_HOOKS__.snapshot().water === 3, null, { timeout: 20_000 });
    await visit(page, "bed", 0); await act(page); await act(page);
    assert.equal((await state(page)).water, 2);
    await page.getByRole("button", { name: "Leave garden", exact: true }).click(); await enter(page);
    assert.equal((await state(page)).water, 2, "re-entering does not grant another bonus");
    results.push({ check: "slow account data grants one task water bonus after entry; re-entry does not repeat it", passed: true });
    await clean(test, "late task bonus");
  } else if (mode === "audio") {
    const test = await fixture.open({ width: 390, height: 844 }, { touch: true, record: true });
    const page = test.page;
    assert.equal(await page.evaluate(() => window.__gardenAudioContexts.length), 0, "entry page does not create an audio context");
    await enter(page);
    assert.equal(await page.evaluate(() => window.__gardenAudioContexts.length), 0, "garden starts silent");
    await page.getByRole("button", { name: "Enable sound", exact: true }).click();
    await page.waitForFunction(() => window.__gardenAudioContexts[0]?.state === "running");
    const started = await page.evaluate(() => window.__gardenAudioNotes);
    await page.waitForTimeout(2000);
    assert(await page.evaluate(() => window.__gardenAudioNotes) > started, "music schedules notes while playing");
    await visit(page, "bed", 0); await act(page); await act(page);
    assert.equal((await state(page)).beds[0].stage, "growing", "plant and water remain interactive with audio");
    await page.getByRole("button", { name: "Garden settings", exact: true }).click();
    await page.waitForFunction(() => window.__gardenAudioContexts[0]?.state === "suspended");
    for (const label of ["Music volume", "Sound effects volume", "Nature ambience volume"]) {
      const slider = page.getByRole("slider", { name: label, exact: true });
      await slider.focus(); await page.keyboard.press("Home");
      assert.equal(await slider.inputValue(), "0", `${label} independently supports mute`);
    }
    await capture(page, "phone-audio-settings");
    await page.getByRole("slider", { name: "Music volume", exact: true }).focus();
    for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowRight");
    await page.getByRole("slider", { name: "Sound effects volume", exact: true }).focus();
    for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight");
    await page.getByRole("button", { name: "Close menu and resume", exact: true }).click();
    await page.waitForFunction(() => window.__gardenAudioContexts[0]?.state === "running");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.waitForFunction(() => window.__gardenAudioContexts[0]?.state === "suspended");
    await page.getByRole("button", { name: "Keep exploring", exact: true }).click();
    await page.getByRole("button", { name: "Mute sound", exact: true }).click();
    await page.waitForFunction(() => window.__gardenAudioContexts[0]?.state === "suspended");
    await page.getByRole("button", { name: "Enable sound", exact: true }).click();
    await page.waitForFunction(() => window.__gardenAudioContexts[0]?.state === "running");
    assert.equal(await page.evaluate(() => window.__gardenAudioContexts.length), 1, "menus and toggles reuse one context");
    await page.getByRole("button", { name: "Leave garden", exact: true }).click();
    await page.waitForFunction(() => window.__gardenAudioContexts[0]?.state === "suspended");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("[data-garden-enter]:enabled").waitFor();
    assert.equal(await page.evaluate(() => window.__gardenAudioContexts.length), 0, "saved audio opt-in still waits for a gesture after reload");
    await enter(page);
    await page.waitForFunction(() => window.__gardenAudioContexts[0]?.state === "running");
    await page.getByRole("button", { name: "Garden settings", exact: true }).click();
    assert.equal(await page.getByRole("slider", { name: "Music volume", exact: true }).inputValue(), "40");
    assert.equal(await page.getByRole("slider", { name: "Sound effects volume", exact: true }).inputValue(), "60");
    assert.equal(await page.getByRole("slider", { name: "Nature ambience volume", exact: true }).inputValue(), "0");
    results.push({ check: "real phone UI: silence before gesture, music and gardening, three volume sliders, blur/pause/mute/resume, one context and saved settings after reload", passed: true });
    await clean(test, "garden audio");
  } else if (mode === "reminders") {
    const test = await fixture.open({ width: 1280, height: 900 }, { automaticTimezone: true });
    const page = test.page; await enter(page);
    await page.getByRole("button", { name: "Garden settings", exact: true }).click();
    const hour = new Date().getUTCHours();
    await page.getByText("Quiet hours use Pacific/Honolulu.", { exact: true }).waitFor();
    await page.getByLabel(/^From/).selectOption(String(hour));
    await page.waitForTimeout(300);
    await page.getByLabel(/^Until/).selectOption(String((hour + 1) % 24));
    await page.waitForTimeout(300);
    await page.getByLabel(/Buddy garden invitations/).click();
    await page.waitForFunction(() => [...document.querySelectorAll("label")].some(el => el.textContent?.includes("Buddy garden invitations") && el.querySelector("input")?.checked));
    await page.getByRole("button", { name: "Return to My Best Life OS", exact: true }).click();
    await page.goto(`${base}/en/dashboard`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Visit garden", exact: true }).waitFor({ timeout: 85_000 });
    await capture(page, "buddy-garden-invitation");
    await page.getByRole("button", { name: "Visit garden", exact: true }).click();
    await page.locator("[data-garden-enter]:enabled").waitFor();
    assert(page.url().endsWith("/garden"), "Buddy CTA opens the garden page");
    await enter(page);
    results.push({ check: "opt-in settings, automatic device timezone, real Dock invitation and Visit garden navigation", passed: true, invitationClaims: test.writes.filter(w => w.action === "invite") });
    await clean(test, "Buddy invitations");
  } else if (mode === "visual") {
    const { inspectPage } = await import(process.env.GARDEN_CANVAS_INSPECTOR ?? "/Users/ouxianxing/.codex/skills/threejs-qa-release/scripts/inspect-threejs-canvas.mjs");
    const runId = out.split("/").at(-1);
    const captures = [
      { mode: "desktop", state: "active-play", viewport: { width: 1440, height: 900 } },
      { mode: "mobile", state: "active-play", viewport: { width: 390, height: 844 }, options: { touch: true, dark: true } },
      { mode: "mobile", state: "paused", viewport: { width: 320, height: 740 }, options: { touch: true, reduced: true } },
      { mode: "mobile", state: "fail-or-retry", viewport: { width: 844, height: 390 }, options: { touch: true } },
      { mode: "mobile", state: "hero-asset", viewport: { width: 820, height: 1180 }, options: { touch: true } },
    ].map(c => ({ ...c, report: `${out}/${c.mode}-${c.state}.json` }));
    await writeFile(`${out}/evidence.json`, JSON.stringify({ version: 1, runId, captures: captures.map(({ mode, state, report }) => ({ mode, state, report })) }, null, 2));
    for (const c of captures) {
      const test = await fixture.open(c.viewport, { ...c.options, deferNavigation: true });
      const report = await inspectPage(test.page, { url: `${base}/en/garden`, out, mobile: c.mode === "mobile", state: c.state, seed: Number(day.replaceAll("-", "")), runId, wait: 750 });
      await writeFile(c.report, JSON.stringify(report, null, 2));
      await writeFile(`${out}/${c.mode}-${c.state}-svg-diagnostics.json`, JSON.stringify(await test.page.evaluate(() => window.__gardenSvgInvalid), null, 2));
      console.log(c.mode, c.state, JSON.stringify({ result: report.result, gpu: report.gpu, errors: report.consoleErrors }));
      assert.equal(report.result.ok, true);
      assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.consoleErrors, []);
      results.push({ check: `${c.mode} ${c.state}`, passed: true, gpu: report.gpu });
      await clean(test, `visual ${c.state}`);
    }
    for (const width of [1440, 390]) {
      const context = await fixture.browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await page.goto(new URL("../../docs/garden-research/v2/garden-adventure-research.html", import.meta.url).href);
      assert.equal(await page.locator("article h2").count(), 5);
      const sources = await page.locator('a[href^="https://"]').evaluateAll(links => links.map(link => link.href));
      for (const url of ["https://slowroads.io/", "https://github.com/brunosimon/folio-2025", "https://poki.com/en/g/misland", "https://www.crazygames.com/game/farm-land", "https://growden.io/", "https://oskarstalberg.com/Townscaper/", "https://blog.duolingo.com/improving-the-streak/"]) assert(sources.includes(url), `Research source missing: ${url}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "research fits the viewport");
      await page.screenshot({ path: `${out}/research-${width}.png`, fullPage: true });
      await context.close();
    }
  } else throw new Error(`Unknown verification mode: ${mode}`);
  await writeFile(`${out}/${mode}-results.json`, JSON.stringify({ state: `${process.env.GARDEN_VERIFY_MODE??"development"} test-only preview; isolated database and fixture auth/activity`, day, results }, null, 2));
} catch (error) {
  await writeFile(`${out}/${mode}-failure.txt`, error.stack ?? String(error));
  for (const context of fixture.browser.contexts()) for (const page of context.pages()) { await page.screenshot({ path: `${out}/failure.png` }).catch(() => {}); await writeFile(`${out}/failure-body.txt`, await page.locator("body").innerText().catch(() => "unavailable")); }
  throw error;
} finally { await fixture.close(); }
