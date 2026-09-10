import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createPondFixture } from "./garden-pond-fixture.mjs";

const out = "../artifacts/garden-v3/equivalence";
await mkdir(out, { recursive: true });
const checks = [], results = [];
for (const mode of ["keyboard-muted", "touch-gentle", "touch-no-webgl"]) {
  const fixture = await createPondFixture(out);
  try {
    const touch = mode !== "keyboard-muted", fallback = mode === "touch-no-webgl";
    const view = await fixture.open(touch ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, { touch, reduced: touch, noWebGL: fallback }), page = view.page;
    async function activate(locator) {
      await locator.waitFor();
      if (touch) await locator.tap();
      else { await locator.scrollIntoViewIfNeeded(); await locator.focus(); await page.keyboard.press("Enter"); }
    }
    async function check(name, run) { await run(); checks.push({ mode, name, passed: true }); console.log(`PASS ${mode}: ${name}`); }
    await activate(page.locator("[data-garden-enter]"));
    await activate(page.getByRole("button", { name: "Garden settings", exact: true }));
    const audio = page.getByRole("checkbox", { name: "Garden audio", exact: true });
    if (await audio.isChecked()) {
      if (touch) await audio.tap(); else { await audio.focus(); await page.keyboard.press("Space"); }
    }
    await page.getByRole("checkbox", { name: "Garden audio", exact: true, checked: false }).waitFor();
    await activate(page.getByRole("button", { name: "Close menu and resume", exact: true }));
    await activate(page.getByRole("button", { name: "Enter living pond", exact: true }));
    const panel = page.locator("[data-pond-panel]");
    await panel.getByText("Saved to your account", { exact: true }).waitFor();
    async function positions() {
      const disclosure = panel.locator("details").filter({ has: page.locator('[aria-label^="Position 1,"]') });
      if (await disclosure.getAttribute("open") === null) await activate(disclosure.locator("summary"));
    }
    async function place(name, position, resultName) {
      await activate(panel.getByRole("button", { name, exact: true }));
      await positions();
      await activate(panel.getByRole("button", { name: `Position ${position}, water`, exact: true }));
      await activate(panel.getByRole("button", { name: "Place here", exact: true }));
      await panel.getByRole("button", { name: `Position ${position}, ${resultName}`, exact: true }).waitFor();
    }
    const routes = [];
    async function observe(expectedPath, screenshot) {
      await activate(panel.getByRole("button", { name: "Observe", exact: true }));
      await positions();
      await activate(panel.getByRole("button", { name: "Start again", exact: true }));
      for (const position of [4, 11, 12]) await activate(panel.getByRole("button", { name: `Position ${position}, water`, exact: true }));
      await activate(panel.getByRole("button", { name: "Guide fish", exact: true }));
      const route = panel.locator("[data-pond-route]");
      await route.waitFor(); assert.equal(await route.getAttribute("data-pond-route"), expectedPath.join(","));
      routes.push(expectedPath);
      if (touch) await panel.getByText("Your route is shown in position order. You can record this observation without watching motion or listening for a cue.", { exact: true }).waitFor();
      const record = panel.getByRole("button", { name: "Record", exact: true }).first();
      // Normal mode waits for the real renderer's fish callback; other modes expose the same route without motion.
      await page.waitForFunction(() => {
        const first = [...document.querySelectorAll("[data-pond-panel] button")].find(node => node.textContent.trim() === "Record");
        return first && !first.disabled;
      }, undefined, { timeout: 40_000 });
      await activate(record);
      await panel.getByText("Dawnfish ✓", { exact: true }).waitFor();
      await panel.getByText("Saved to your account", { exact: true }).waitFor();
      await route.scrollIntoViewIfNeeded(); await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${out}/${mode}-${screenshot}.png`, animations: "disabled" });
    }
    await check("starter objects form a habitat and the first route without life data", async () => {
      await place("Shore reeds In your kit", 2, "Shore reeds");
      await place("Lily leaf In your kit", 5, "Lily leaf");
      await observe([3, 7, 11, 10, 11], "first-route");
      await activate(panel.getByRole("button", { name: "Record", exact: true }).nth(1));
      await panel.getByText("Leaf snail ✓", { exact: true }).waitFor();
    });
    await check("moving the stone changes the same three ripples into a different saved route", async () => {
      await activate(panel.getByRole("button", { name: "Arrange", exact: true }));
      await place("Flow stone Position 6", 8, "Flow stone");
      await observe([3, 2, 6, 10, 11], "second-route");
      assert.notDeepEqual(routes[0], routes[1]);
      const world = (await fixture.db.query("select state from garden_worlds")).rows[0].state;
      assert.equal(world.observed_layouts.length, 2); assert.deepEqual(world.discoveries, ["dawnfish", "leafsnail"]);
      assert.equal((await fixture.pondStepState()).grants.length, 0);
      results.push({ mode, routes, objects: world.objects, discoveries: world.discoveries, observed_layouts: world.observed_layouts });
    });
    await check("a freely chosen rest adds the same perch and third species in every mode", async () => {
      await activate(panel.getByRole("button", { name: "My next step", exact: true }));
      await activate(panel.getByText("Connected life modules", { exact: true }));
      const rest = panel.getByRole("checkbox", { name: "Chosen rest", exact: true });
      if (touch) await rest.tap(); else { await rest.focus(); await page.keyboard.press("Space"); }
      await panel.getByRole("checkbox", { name: "Chosen rest", exact: true, checked: true }).waitFor();
      const title = panel.getByLabel("The small step I choose", { exact: true });
      await title.focus(); await page.keyboard.type("Take a quiet moment");
      await activate(panel.getByRole("button", { name: "Choose this step", exact: true }));
      await panel.getByRole("button", { name: "I did my chosen rest", exact: true }).waitFor();
      await activate(panel.getByRole("button", { name: "I did my chosen rest", exact: true }));
      await panel.locator("[data-intention]").waitFor({ state: "detached" });
      await activate(panel.getByRole("button", { name: "Arrange", exact: true }));
      const opportunity = panel.getByLabel("Build from a life opportunity", { exact: true });
      if (touch) await opportunity.selectOption({ index: 1 });
      else { await opportunity.focus(); await page.keyboard.press("c"); await page.keyboard.press("Enter"); } // Native select typeahead: Chosen rest.
      const recipe = panel.getByLabel("Choose what to build", { exact: true });
      if (touch) await recipe.selectOption("perch");
      else { await recipe.focus(); await page.keyboard.press("q"); await page.keyboard.press("Enter"); } // Quiet perch.
      await positions();
      await activate(panel.getByRole("button", { name: "Position 6, water", exact: true }));
      await activate(panel.getByRole("button", { name: "Place here", exact: true }));
      await panel.getByRole("button", { name: "Position 6, Quiet perch", exact: true }).waitFor();
      await activate(panel.getByRole("button", { name: "Observe", exact: true }));
      await activate(panel.getByRole("button", { name: "Record", exact: true }).nth(2));
      await panel.getByText("Bluewing ✓", { exact: true }).waitFor();
      const world = (await fixture.db.query("select state from garden_worlds")).rows[0].state;
      assert.deepEqual(world.discoveries, ["dawnfish", "leafsnail", "dragonfly"]);
      const state = await fixture.pondStepState(); assert.equal(state.grants.length, 1); assert.equal(state.grants[0].evidence_kind, "self_report");
      results.at(-1).objects = world.objects.map(({ kind, slot, rotation }) => ({ kind, slot, rotation }));
      results.at(-1).discoveries = world.discoveries;
      results.at(-1).observed_layouts = world.observed_layouts;
      await page.screenshot({ path: `${out}/${mode}-three-species.png`, animations: "disabled" });
    });
    await check("audio stays suspended during placement and observation", async () => {
      await page.waitForFunction(() => (window.__gardenAudioContexts ?? []).every(context => context.state !== "running"));
      const states = await page.evaluate(() => (window.__gardenAudioContexts ?? []).map(context => context.state));
      results.at(-1).audioContextStates = states;
      assert(states.every(state => ["suspended", "closed"].includes(state)));
    });
    assert.deepEqual(view.errors, []); assert.deepEqual(view.rendererErrors, []);
  } catch (error) {
    for (const context of fixture.browser.contexts()) for (const page of context.pages()) {
      await page.screenshot({ path: `${out}/${mode}-failure.png` }).catch(() => {});
      await writeFile(`${out}/${mode}-failure.txt`, await page.locator("body").innerText().catch(() => "unavailable"));
    }
    throw error;
  } finally { await fixture.close(); }
}
for (const result of results.slice(1)) {
  assert.deepEqual(result.objects, results[0].objects);
  assert.deepEqual(result.discoveries, results[0].discoveries);
  assert.deepEqual(result.observed_layouts, results[0].observed_layouts);
}
const paths = ["src/components/garden/PondPanel.tsx", "src/components/garden/pond-world.ts", "src/components/garden/AdventureScene.tsx", "src/lib/garden/audio.ts", "supabase/migrations/20260908162634_garden_living_pond.sql"];
const sources = Object.fromEntries(await Promise.all(paths.map(async path => [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
await writeFile(`${out}/validation.json`, JSON.stringify({ state: "real browser controls and isolated SQL; keyboard activation and touch emulation, not a full screen-reader audit or physical device test", verifiedAt: new Date().toISOString(), sources, checks, results }, null, 2));
