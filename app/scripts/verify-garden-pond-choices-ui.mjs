import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createPondFixture } from "./garden-pond-fixture.mjs";

const out = "../artifacts/garden-v3/source-choices";
await mkdir(out, { recursive: true });
const fixture = await createPondFixture(out), checks = [];
async function check(name, run) { await run(); checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
try {
  const view = await fixture.open({ width: 390, height: 844 }, { touch: true }), page = view.page;
  await page.locator("[data-garden-enter]").tap();
  await page.getByRole("button", { name: "Enter living pond", exact: true }).tap();
  const panel = page.locator("[data-pond-panel]");
  await panel.getByText("Saved to your account", { exact: true }).waitFor();
  await panel.getByRole("button", { name: "My next step", exact: true }).tap();
  await panel.getByText("Connected life modules", { exact: true }).click();
  await panel.getByRole("checkbox", { name: "Tasks", exact: true }).tap();
  await panel.getByRole("checkbox", { name: "Tasks", exact: true, checked: true }).waitFor();
  await panel.getByText("Saved to your account", { exact: true }).waitFor();
  await panel.getByLabel("Choose a source", { exact: true }).selectOption("task");
  await panel.getByLabel("Your action", { exact: true }).selectOption("00000000-0000-4000-8000-000000000081");
  await check("a source-read failure is visible and retry recovers the current task choice", async () => {
    view.fail();
    await panel.getByRole("button", { name: "Refresh actions", exact: true }).tap();
    await panel.getByText("This life module could not be loaded. Try refreshing, or choose another kind of step.", { exact: false }).waitFor();
    view.recover(); await panel.getByRole("button", { name: "Retry", exact: true }).tap();
    await panel.getByLabel("Your action", { exact: true }).selectOption("00000000-0000-4000-8000-000000000081");
  });
  await check("a task completed before choosing a garden step appears as a saved-today choice", async () => {
    await fixture.completeTask(); // Real isolated source SQL; no intention has been chosen yet.
    await panel.getByRole("button", { name: "Refresh actions", exact: true }).tap();
    await panel.getByLabel("Your action", { exact: true }).selectOption({ label: "Outline my next chapter · Recorded today" });
    assert.equal(await panel.getByLabel("The small step I choose", { exact: true }).inputValue(), "Outline my next chapter");
    assert.equal(await panel.getByRole("checkbox", { name: "I am choosing just part of this task", exact: true }).count(), 0);
    await panel.getByText("This completion was saved while Tasks was connected, within today’s garden window. Choose it, then check the saved action to bring it into your pond.", { exact: true }).waitFor();
    assert.equal((await fixture.pondStepState()).grants.length, 0);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${out}/mobile-saved-action.png`, animations: "disabled" });
    await panel.getByRole("button", { name: "Choose this step", exact: true }).tap();
    await panel.locator("[data-intention]").getByText("Outline my next chapter", { exact: true }).waitFor();
    await panel.getByRole("button", { name: "Check my saved action", exact: true }).tap();
    await panel.locator("[data-intention]").waitFor({ state: "detached" });
    const state = await fixture.pondStepState(); assert.equal(state.grants.length, 1); assert.equal(state.grants[0].evidence_kind, "saved_record");
  });
  await check("the saved action builds one object and disappears from eligible completed choices", async () => {
    await panel.getByRole("button", { name: "Refresh actions", exact: true }).tap();
    await panel.getByRole("button", { name: "Refresh actions", exact: true }).waitFor({ state: "visible" });
    assert.equal(await panel.getByLabel("Your action", { exact: true }).locator("option[value='00000000-0000-4000-8000-000000000081']").count(), 0);
    await panel.getByRole("button", { name: "Arrange", exact: true }).tap();
    await panel.getByLabel("Build from a life opportunity", { exact: true }).selectOption({ index: 1 });
    await panel.getByLabel("Choose what to build", { exact: true }).selectOption("leaf");
    await panel.getByText("Choose a position with buttons", { exact: true }).click();
    await panel.getByRole("button", { name: "Position 4, water", exact: true }).tap();
    await panel.getByRole("button", { name: "Place here", exact: true }).tap();
    await panel.getByRole("button", { name: "Position 4, Lily leaf", exact: true }).waitFor();
    const state = await fixture.pondStepState(); assert.equal(state.objects.length, 5); assert.equal(state.grants.length, 1); assert.equal(state.task_status, "done");
    await page.screenshot({ path: `${out}/mobile-saved-result.png`, animations: "disabled" });
  });
  assert.deepEqual(view.errors, []); assert.deepEqual(view.rendererErrors, []);
  const paths = ["src/components/garden/PondPanel.tsx", "src/lib/repositories/garden-pond.ts", "src/lib/garden/pond-persistence.ts", "supabase/migrations/20260908162634_garden_living_pond.sql"];
  const sources = Object.fromEntries(await Promise.all(paths.map(async path => [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
  await writeFile(`${out}/validation.json`, JSON.stringify({ state: "real browser and SQL, isolated fixtures; touch emulation, not a physical device", verifiedAt: new Date().toISOString(), sources, checks }, null, 2));
} catch (error) {
  for (const context of fixture.browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
    await writeFile(`${out}/failure-body.txt`, await page.locator("body").innerText().catch(() => "unavailable"));
  }
  throw error;
} finally { await fixture.close(); }
