import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createPondFixture } from "./garden-pond-fixture.mjs";

const output = "../artifacts/garden-v3/immersion";
await mkdir(output, { recursive: true });
const checks = [];
for (const [mode, viewport, options] of [
  ["touch-reduced", { width: 390, height: 844 }, { touch: true, reduced: true }],
  ["desktop", { width: 1366, height: 900 }, {}],
]) {
  const fixture = await createPondFixture(output);
  try {
    const view = await fixture.open(viewport, options), page = view.page;
    async function activate(locator) { await locator.scrollIntoViewIfNeeded(); if (options.touch) await locator.tap(); else { await locator.focus(); await page.keyboard.press("Enter"); } }
    async function check(name, run) { const evidence = await run(); checks.push({ mode, name, passed: true, ...evidence }); console.log(`PASS ${mode}: ${name}`); }
    async function rendering(expected) {
      await page.waitForFunction(expected => {
        const state = window.__THREE_GAME_DIAGNOSTICS__?.pondInteraction;
        return state && Object.entries(expected).every(([key, value]) => JSON.stringify(state[key]) === JSON.stringify(value));
      }, expected);
    }
    await activate(page.locator("[data-garden-enter]"));
    await activate(page.getByRole("button", { name: "Enter living pond", exact: true }));
    const panel = page.locator("[data-pond-panel]");
    await panel.getByText("Saved to your account", { exact: true }).waitFor();
    await activate(panel.getByText("Choose a position with buttons", { exact: true }));
    await activate(panel.getByRole("button", { name: "Position 3, water", exact: true }));
    await rendering({ activity: "arrange", grid: true, selection: true, preview: true, rippleCount: 0 });

    await check("observation replaces the placement grid and ghost with the three chosen water markers", async () => {
      await activate(panel.getByRole("button", { name: "Observe", exact: true }));
      await rendering({ activity: "observe", grid: false, selection: false, preview: false, rippleCount: 0 });
      for (const position of [3, 7, 8]) await activate(panel.getByRole("button", { name: `Position ${position}, water`, exact: true }));
      await rendering({ anchors: [2, 6, 7], rippleCount: 3 });
      await page.screenshot({ path: `${output}/${mode}-markers.png` });
    });
    await check("focusing on the pond frees the view and reopening tools preserves the chosen route", async () => {
      const full = await panel.boundingBox();
      await activate(panel.getByRole("button", { name: "Focus on pond", exact: true }));
      await panel.locator('#pond-activity-tools').waitFor({ state: "hidden" });
      const focused = await panel.boundingBox();
      assert(focused.height < full.height, "Focused controls must cover less of the world");
      assert(focused.height <= viewport.height * 0.26, "Focused tools must leave at least 74% of the viewport height");
      assert(focused.y >= 0 && focused.y + focused.height <= viewport.height + 1);
      await rendering({ anchors: [2, 6, 7], grid: false, preview: false, rippleCount: 3 });
      await page.screenshot({ path: `${output}/${mode}-focused.png` });
      await activate(panel.getByRole("button", { name: "Show pond tools", exact: true }));
      for (const position of [3, 7, 8]) assert.equal(await panel.getByRole("button", { name: `Position ${position}, water`, exact: true }).getAttribute("aria-pressed"), "true");
      return { focusedGeometry: focused };
    });
    await check("the revealed observation controls still guide and save a real fish discovery", async () => {
      await activate(panel.getByRole("button", { name: "Guide fish", exact: true }));
      await panel.locator('[data-pond-route="2,6,7"]').waitFor();
      const record = panel.getByRole("button", { name: "Record", exact: true }).first();
      await page.waitForFunction(() => {
        const button = Array.from(document.querySelectorAll('[data-pond-panel] button')).find(element => element.textContent.trim() === "Record");
        return button && !button.disabled;
      }, undefined, { timeout: 40_000 });
      await activate(record);
      await panel.getByText("Dawnfish ✓", { exact: true }).waitFor();
      assert.deepEqual((await fixture.db.query("select state->'discoveries' found from garden_worlds")).rows[0].found, ["dawnfish"]);
    });
    await check("life mode hides world tools and returning to arrangement retains its unsaved placement", async () => {
      await activate(panel.getByRole("button", { name: "My next step", exact: true }));
      await rendering({ activity: "life", grid: false, selection: false, preview: false, rippleCount: 0 });
      await activate(panel.getByRole("button", { name: "Arrange", exact: true }));
      await rendering({ activity: "arrange", grid: true, selection: true, preview: true, rippleCount: 0 });
      const positions = panel.locator("details").filter({ hasText: "Choose a position with buttons" });
      if (await positions.getAttribute("open") === null) await activate(positions.locator("summary"));
      assert.equal(await panel.getByRole("button", { name: "Position 3, water", exact: true }).getAttribute("aria-pressed"), "true");
      assert.equal((await fixture.pondStepState()).objects.length, 4, "Previewing and changing modes must not create an object");
    });
    assert.deepEqual(view.errors, []); assert.deepEqual(view.rendererErrors, []);
  } finally { await fixture.close(); }
}
const paths = ["src/components/garden/PondPanel.tsx", "src/components/garden/pond.module.css", "src/components/garden/pond-world.ts", "src/components/garden/AdventureScene.tsx", "src/components/garden/GardenAdventure.tsx", "scripts/verify-garden-pond-immersion.mjs"];
const sources = Object.fromEntries(await Promise.all(paths.map(async path => [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
await writeFile(`${output}/validation.json`, JSON.stringify({ state: "real browser input and renderer state, isolated SQL; not physical-device evidence", verifiedAt: new Date().toISOString(), sources, checks }, null, 2));
