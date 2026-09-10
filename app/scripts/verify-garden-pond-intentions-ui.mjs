import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createPondFixture } from "./garden-pond-fixture.mjs";

const out = "../artifacts/garden-v3/intentions";
await mkdir(out, { recursive: true });
const fixture = await createPondFixture(out), checks = [];
async function check(name, run) { await run(); checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
async function enter(page) {
  await page.locator("[data-garden-enter]").click();
  await page.getByRole("button", { name: "Enter living pond", exact: true }).click();
  await page.locator("[data-pond-panel]").getByText("Saved to your account", { exact: true }).waitFor();
  await page.locator("[data-pond-panel]").getByRole("button", { name: "My next step", exact: true }).click();
}
async function saved(panel) { await panel.getByText("Saved to your account", { exact: true }).waitFor(); }
async function capture(page, path) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400); // Finish scroll/paint before capturing the active world and its text.
  await page.screenshot({ path, animations: "disabled", caret: "hide" });
}
try {
  const view = await fixture.open({ width: 390, height: 844 }, { touch: true }), page = view.page;
  await enter(page);
  const panel = page.locator("[data-pond-panel]");
  let id;
  await check("a touch player chooses a source and an optional planned date", async () => {
    await panel.getByText("Connected life modules", { exact: true }).click();
    for (const name of ["Tasks", "Chosen rest"]) { await panel.getByRole("checkbox", { name, exact: true }).click(); await saved(panel); }
    await panel.getByLabel("Choose a source", { exact: true }).selectOption("task");
    await panel.getByLabel("Your action", { exact: true }).selectOption("00000000-0000-4000-8000-000000000081");
    await panel.getByLabel("Planned date (optional)", { exact: true }).fill("2026-10-01");
    await panel.getByRole("button", { name: "Choose this step", exact: true }).tap(); await saved(panel);
    await panel.locator("[data-intention]").getByText("Outline my next chapter", { exact: true }).waitFor();
    id = (await fixture.pondStepState()).intentions[0].id;
    assert.equal((await fixture.pondStepState()).intentions[0].planned_for, "2026-10-01");
  });
  const step = panel.locator(`[data-intention="${id}"]`);
  await check("pause survives reload and keeps the original step identity", async () => {
    await step.getByRole("button", { name: "Pause step", exact: true }).tap(); await saved(panel);
    await step.getByText("Taking a break · resume whenever it fits", { exact: true }).waitFor();
    assert.equal(await step.getByRole("button", { name: "Check my saved action", exact: true }).count(), 0);
    await page.reload({ waitUntil: "domcontentloaded" }); await enter(page);
    await step.getByRole("button", { name: "Resume step", exact: true }).waitFor();
    assert.equal((await fixture.pondStepState()).grants.length, 0);
  });
  await check("a paused step can change from work to rest without creating another intention", async () => {
    await step.getByRole("button", { name: "Adjust step", exact: true }).tap();
    await panel.getByLabel("Choose a source", { exact: true }).selectOption("rest");
    await panel.getByLabel("The small step I choose", { exact: true }).fill("Take ten quiet minutes");
    await panel.getByLabel("Planned date (optional)", { exact: true }).fill("");
    await panel.getByRole("button", { name: "Save step changes", exact: true }).tap(); await saved(panel);
    await step.getByText("Take ten quiet minutes", { exact: true }).waitFor();
    assert.equal(await step.getAttribute("data-status"), "paused");
    const state = await fixture.pondStepState(); assert.equal(state.intentions.length, 1); assert.equal(state.intentions[0].id, id); assert.equal(state.objects.length, 4);
  });
  await check("resume and choose a smaller task scope using real controls", async () => {
    await step.getByRole("button", { name: "Resume step", exact: true }).tap(); await saved(panel);
    await step.getByRole("button", { name: "I did my chosen rest", exact: true }).waitFor();
    await step.getByRole("button", { name: "Adjust step", exact: true }).tap();
    await panel.getByLabel("Choose a source", { exact: true }).selectOption("task");
    await panel.getByLabel("Your action", { exact: true }).selectOption("00000000-0000-4000-8000-000000000081");
    await panel.getByLabel("The small step I choose", { exact: true }).fill("Write just the opening sentence");
    await panel.getByRole("checkbox", { name: "I am choosing just part of this task", exact: true }).check();
    await panel.getByRole("button", { name: "Save step changes", exact: true }).tap(); await saved(panel);
    await step.getByRole("button", { name: "I did this chosen part", exact: true }).waitFor();
    await step.scrollIntoViewIfNeeded();
    await capture(page, `${out}/mobile-chosen-step.png`);
  });
  await check("self-confirmed progress builds a persistent object with an honest source label", async () => {
    await step.getByRole("button", { name: "I did this chosen part", exact: true }).tap(); await saved(panel);
    await step.waitFor({ state: "detached" });
    let state = await fixture.pondStepState();
    assert.equal(state.task_status, "todo"); assert.equal(state.grants.length, 1); assert.equal(state.grants[0].evidence_kind, "self_report");
    assert.equal(state.grants[0].intention_id, id);
    await panel.getByRole("button", { name: "Arrange", exact: true }).tap();
    await panel.getByLabel("Build from a life opportunity", { exact: true }).selectOption({ index: 1 });
    await panel.getByLabel("Choose what to build", { exact: true }).selectOption("leaf");
    await panel.getByText("Choose a position with buttons", { exact: true }).click();
    await panel.getByRole("button", { name: "Position 4, water", exact: true }).tap();
    await panel.getByRole("button", { name: "Place here", exact: true }).tap(); await saved(panel);
    await panel.getByRole("button", { name: "Position 4, Lily leaf", exact: true }).waitFor();
    await panel.getByText("From a step you personally confirmed.", { exact: true }).waitFor();
    state = await fixture.pondStepState(); assert.equal(state.objects.length, 5); assert.equal(state.task_status, "todo");
    await fixture.completeTask();
    assert.equal((await fixture.pondStepState()).grants.length, 1);
    await capture(page, `${out}/mobile-step-result.png`);
  });
  assert.deepEqual(view.errors, []); assert.deepEqual(view.rendererErrors, []);
  const sources = ["src/components/garden/PondPanel.tsx", "src/lib/garden/pond-persistence.ts", "supabase/migrations/20260908162634_garden_living_pond.sql"];
  const hashes = Object.fromEntries(await Promise.all(sources.map(async (path) => [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
  const geometry = await panel.evaluate(node => {
    const heading = node.querySelector("header"), close = heading.querySelector("button"), content = node.querySelector("nav").nextElementSibling;
    return { panelWidth: node.clientWidth, panelScrollWidth: node.scrollWidth, panelScrollLeft: node.scrollLeft, headingWidth: heading.clientWidth, headingScrollWidth: heading.scrollWidth, contentWidth: content.clientWidth, contentScrollWidth: content.scrollWidth, closeRight: close.getBoundingClientRect().right, panelRight: node.getBoundingClientRect().right };
  });
  await writeFile(`${out}/geometry.json`, JSON.stringify(geometry, null, 2));
  assert(geometry.closeRight <= geometry.panelRight, "The close control stays inside the mobile panel after building");
  assert(geometry.panelScrollWidth <= geometry.panelWidth + 1, "Long source labels do not cause horizontal panel overflow");
  await writeFile(`${out}/validation.json`, JSON.stringify({ state: "real touch UI and SQL, isolated fixture accounts; not a physical phone or user study", verifiedAt: new Date().toISOString(), sources: hashes, geometry, checks }, null, 2));
} catch (error) {
  for (const context of fixture.browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
    await writeFile(`${out}/failure-body.txt`, await page.locator("body").innerText().catch(() => "unavailable"));
  }
  throw error;
} finally { await fixture.close(); }
