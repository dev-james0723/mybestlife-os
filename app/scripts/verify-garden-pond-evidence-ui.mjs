import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createPondFixture } from "./garden-pond-fixture.mjs";

const out = "../artifacts/garden-v3/linked-evidence";
await mkdir(out, { recursive: true });
const fixture = await createPondFixture(out), checks = [];
const task = "00000000-0000-4000-8000-000000000081", habit = "00000000-0000-4000-8000-000000000082";
async function check(name, run) { await run(); checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
async function enter(page) {
  await page.locator("[data-garden-enter]").click();
  await page.getByRole("button", { name: "Enter living pond", exact: true }).click();
  const panel = page.locator("[data-pond-panel]");
  await panel.getByText("Saved to your account", { exact: true }).waitFor();
  return panel;
}
try {
  // The two records explicitly describe the same fixture action; no text matching is used by the product.
  await fixture.renameTask("Take an afternoon walk");
  const view = await fixture.open({ width: 390, height: 844 }, { touch: true }), page = view.page;
  const linkRequests = [];
  page.on("request", request => {
    if (!request.url().endsWith("/rpc/garden_pond_command")) return;
    const input = request.postDataJSON();
    if (input?.p_command?.kind === "evidence") linkRequests.push(input);
  });
  const panel = await enter(page);
  await panel.getByRole("button", { name: "My next step", exact: true }).tap();
  await panel.getByText("Connected life modules", { exact: true }).click();
  for (const lifeModule of ["Tasks", "Habits", "Gratitude"]) {
    await panel.getByRole("checkbox", { name: lifeModule, exact: true }).tap();
    await panel.getByRole("checkbox", { name: lifeModule, exact: true, checked: true }).waitFor();
    await panel.getByText("Saved to your account", { exact: true }).waitFor();
  }
  await panel.getByLabel("Choose a source", { exact: true }).selectOption("task");
  await panel.getByLabel("Your action", { exact: true }).selectOption(task);
  await panel.getByRole("button", { name: "Choose this step", exact: true }).tap();
  const step = panel.locator("[data-intention]");
  await step.getByText("Take an afternoon walk", { exact: true }).waitFor();
  let rootId;
  await check("linking a second record creates no reward, and a lost response retries the same command", async () => {
    await step.getByText("Same action in another module?", { exact: true }).click();
    await step.getByLabel("Related module", { exact: true }).selectOption("habit");
    await step.getByLabel("Related record", { exact: true }).selectOption(habit);
    view.loseNextResponse();
    await step.getByRole("button", { name: "Link to this step", exact: true }).tap();
    await panel.getByRole("button", { name: "Retry sync", exact: true }).waitFor();
    const pending = await fixture.pondStepState();
    rootId = pending.intentions[0].id;
    assert.equal(pending.evidence_links.length, 2); assert.equal(pending.grants.length, 0);
    assert.equal(await panel.getByRole("button", { name: "Clear proposed change", exact: true }).count(), 0);
    view.recover(); await panel.getByRole("button", { name: "Retry sync", exact: true }).tap();
    await step.getByRole("button", { name: "Check linked Habit", exact: true }).waitFor();
    await panel.getByText("Saved to your account", { exact: true }).waitFor();
    assert.equal(linkRequests.length, 2);
    assert.equal(linkRequests[0].p_command_id, linkRequests[1].p_command_id);
    assert.equal((await fixture.pondStepState()).evidence_links.length, 2);
  });
  await check("reloading retains the named linked record and the original chosen step", async () => {
    await page.reload(); await enter(page);
    await panel.getByRole("button", { name: "My next step", exact: true }).tap();
    await step.getByText("An afternoon walk", { exact: true }).waitFor();
    assert.equal(await step.getAttribute("data-intention"), rootId);
    assert.equal(await step.locator("[data-evidence-link]").count(), 1);
    await page.screenshot({ path: `${out}/mobile-linked-step.png`, animations: "disabled" });
  });
  await check("only the linked Habit occurrence grants the shared step, without marking its Task done", async () => {
    const linkedState = await fixture.pondStepState();
    const linkedHabit = linkedState.evidence_links.find(link => link.source_kind === "habit");
    const previousDate = new Date(`${linkedHabit.occurrence}T12:00:00Z`);
    previousDate.setUTCDate(previousDate.getUTCDate() - 1);
    await fixture.completeHabit(previousDate.toISOString().slice(0, 10));
    await step.getByRole("button", { name: "Check linked Habit", exact: true }).tap();
    await panel.getByText("Save this action in its life module first", { exact: true }).waitFor();
    assert.equal((await fixture.pondStepState()).grants.length, 0);
    await panel.getByRole("button", { name: "Clear proposed change", exact: true }).tap();
    await panel.getByText("Saved to your account", { exact: true }).waitFor();
    await fixture.completeHabit(linkedHabit.occurrence);
    const sourceState = (await fixture.db.query("select current_date::text database_day, current_setting('TimeZone') database_timezone, (select timezone from garden_worlds limit 1) world_timezone, (select jsonb_agg(to_jsonb(c)) from habit_completions c) completions, (select jsonb_agg(to_jsonb(r)) from garden_source_receipts r) receipts")).rows[0];
    await writeFile(`${out}/linked-source-diagnostics.json`, JSON.stringify({ linkedState, sourceState }, null, 2));
    assert(sourceState.receipts?.some(receipt => receipt.canonical_key === linkedHabit.canonical_key), "The saved Habit fixture must produce the selected occurrence's receipt");
    await step.getByRole("button", { name: "Check linked Habit", exact: true }).tap();
    await step.waitFor({ state: "detached" });
    const state = await fixture.pondStepState();
    assert.equal(state.grants.length, 1); assert.equal(state.grants[0].intention_id, rootId);
    assert.equal(state.grants[0].source_kind, "habit"); assert.equal(state.grants[0].evidence_kind, "saved_record");
    assert.equal(state.task_status, "todo");
  });
  await check("the shared opportunity builds one persistent perch with its life attribution", async () => {
    await panel.getByRole("button", { name: "Arrange", exact: true }).tap();
    await panel.getByLabel("Build from a life opportunity", { exact: true }).selectOption({ index: 1 });
    await panel.getByLabel("Choose what to build", { exact: true }).selectOption("perch");
    await panel.getByText("Choose a position with buttons", { exact: true }).click();
    await panel.getByRole("button", { name: "Position 4, water", exact: true }).tap();
    await panel.getByRole("button", { name: "Place here", exact: true }).tap();
    await panel.getByRole("button", { name: "Position 4, Quiet perch", exact: true }).waitFor();
    await panel.getByText("This object came from Take an afternoon walk.", { exact: true }).waitFor();
    const state = await fixture.pondStepState();
    assert.equal(state.objects.length, 5); assert.equal(state.grants.length, 1);
    const built = state.objects.find(object => object.grant_id === state.grants[0].id);
    assert.equal(built.kind, "perch"); assert.equal(built.slot, 3); assert.equal(state.grants[0].consumed_by, built.id);
    await page.screenshot({ path: `${out}/mobile-linked-result.png`, animations: "disabled" });
  });
  let gratitude;
  await check("a later Gratitude record can be linked to an earned object without another reward", async () => {
    gratitude = (await fixture.saveGratitude()).rows[0].id;
    const records = panel.locator("[data-evidence-intention]");
    await records.getByText("Same action in another module?", { exact: true }).click();
    await records.getByLabel("Related module", { exact: true }).selectOption("gratitude");
    await records.getByLabel("Related record", { exact: true }).selectOption(gratitude);
    await records.getByRole("button", { name: "Link to this step", exact: true }).tap();
    await records.locator("[data-evidence-link]").filter({ hasText: "Gratitude" }).waitFor();
    await panel.getByText("Saved to your account", { exact: true }).waitFor();
    const state = await fixture.pondStepState(); assert.equal(state.evidence_links.length, 3); assert.equal(state.grants.length, 1);
    assert.equal(await records.getByRole("button", { name: "Remove link", exact: true }).count(), 0);
  });
  await check("a second browser context restores the same built object and related records", async () => {
    const second = await fixture.open({ width: 1366, height: 900 });
    const other = await enter(second.page);
    await other.getByRole("button", { name: "Quiet perch Position 4", exact: true }).click();
    await other.getByText("This object came from Take an afternoon walk.", { exact: true }).waitFor();
    assert.equal(await other.locator("[data-evidence-link]").count(), 2);
    await second.page.screenshot({ path: `${out}/desktop-linked-result.png`, animations: "disabled" });
    assert.deepEqual(second.errors, []); assert.deepEqual(second.rendererErrors, []);
    await second.context.close();
  });
  await check("later Task completion and a repeated Habit check cannot create another opportunity through the UI", async () => {
    await fixture.completeTask();
    await panel.getByRole("button", { name: "My next step", exact: true }).tap();
    await panel.getByLabel("Choose a source", { exact: true }).selectOption("task");
    await panel.getByRole("button", { name: "Refresh actions", exact: true }).tap();
    await panel.getByLabel("Your action", { exact: true }).locator(`option[value="${task}"]`).waitFor({ state: "detached" });
    await panel.getByLabel("Choose a source", { exact: true }).selectOption("habit");
    await panel.getByLabel("Your action", { exact: true }).selectOption(habit);
    await panel.getByRole("button", { name: "Choose this step", exact: true }).tap();
    await step.getByRole("button", { name: "Check my saved action", exact: true }).tap();
    await step.waitFor({ state: "detached" });
    const state = await fixture.pondStepState();
    assert.equal(state.grants.length, 1); assert.equal(state.objects.length, 5);
    assert.equal(state.intentions.find(i => i.id !== rootId).status, "acknowledged_without_grant");
  });
  await check("removing the source preserves the earned object and removes its private title after reload", async () => {
    await fixture.deleteTask();
    await page.reload(); await enter(page);
    await panel.getByRole("button", { name: "Quiet perch Position 4", exact: true }).tap();
    await panel.getByText("This object came from A step you chose.", { exact: true }).waitFor();
    assert.equal((await panel.innerText()).includes("Take an afternoon walk"), false);
    assert.equal(await panel.locator("[data-evidence-link]").count(), 2);
    const state = await fixture.pondStepState(); assert.equal(state.grants.length, 1); assert.equal(state.objects.length, 5);
    assert.equal(state.intentions.find(i => i.id === rootId).source_id, null);
  });
  assert.deepEqual(view.errors, []); assert.deepEqual(view.rendererErrors, []);
  const paths = ["src/components/garden/PondPanel.tsx", "src/components/garden/PondEvidenceLinks.tsx", "src/lib/repositories/garden-pond.ts", "src/lib/garden/pond-persistence.ts", "supabase/migrations/20260908162634_garden_living_pond.sql", "scripts/garden-pond-fixture.mjs", "scripts/verify-garden-pond-evidence-ui.mjs"];
  const sources = Object.fromEntries(await Promise.all(paths.map(async path => [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
  await writeFile(`${out}/validation.json`, JSON.stringify({ state: "real browser and candidate SQL; isolated fixture accounts; touch emulation, not physical devices", verifiedAt: new Date().toISOString(), sources, checks }, null, 2));
} catch (error) {
  for (const context of fixture.browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
    await writeFile(`${out}/failure-body.txt`, await page.locator("body").innerText().catch(() => "unavailable"));
  }
  throw error;
} finally { await fixture.close(); }
