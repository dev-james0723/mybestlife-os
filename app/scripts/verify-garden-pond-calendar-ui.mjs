import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { base, createPondFixture } from "./garden-pond-fixture.mjs";

const out = "../artifacts/garden-v3/calendar";
await mkdir(out, { recursive: true });
const fixture = await createPondFixture(out), checks = [];
const habit = "00000000-0000-4000-8000-000000000082";
const deviceTimezone = "Pacific/Honolulu", profileTimezone = "Pacific/Kiritimati";
async function check(name, run) { await run(); checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
async function enter(page) {
  await page.locator("[data-garden-enter]").click();
  await page.getByRole("button", { name: "Enter living pond", exact: true }).click();
  const panel = page.locator("[data-pond-panel]");
  await panel.getByText("Saved to your account", { exact: true }).waitFor();
  return panel;
}
let page;
try {
  const view = await fixture.open({ width: 390, height: 844 }, { touch: true, reduced: true, deviceTimezone, profileTimezone, everyOtherDayHabit: true, allowHabitWrites: true });
  page = view.page;
  const requests = [];
  page.on("request", request => {
    if (request.url().endsWith("/rpc/garden_pond_command")) requests.push(request.postDataJSON());
  });
  const panel = await enter(page);
  await panel.getByRole("button", { name: "My next step", exact: true }).tap();
  await panel.getByText("Connected life modules", { exact: true }).click();
  await panel.getByRole("checkbox", { name: "Habits", exact: true }).tap();
  await panel.getByRole("checkbox", { name: "Habits", checked: true, exact: true }).waitFor();
  await panel.getByText("Saved to your account", { exact: true }).waitFor();
  let chosen;
  await check("an interval Habit selected through touch captures its device calendar despite a different account date", async () => {
    await panel.getByLabel("Choose a source", { exact: true }).selectOption("habit");
    await panel.getByLabel("Your action", { exact: true }).selectOption(habit);
    await panel.getByRole("button", { name: "Choose this step", exact: true }).tap();
    await panel.locator("[data-intention]").waitFor();
    const state = await fixture.pondStepState(); chosen = state.intentions[0];
    const request = requests.find(value => value.p_command.kind === "select");
    assert.equal(request.p_command.source_calendar.timezone, deviceTimezone);
    assert.equal(request.p_command.source_calendar.date, chosen.occurrence);
    assert.equal(chosen.zone_at_selection, deviceTimezone);
    const dates = (await fixture.db.query("select (now() at time zone 'Pacific/Honolulu')::date::text device_date,(now() at time zone 'Pacific/Kiritimati')::date::text account_date")).rows[0];
    assert.equal(chosen.occurrence, dates.device_date); assert.notEqual(chosen.occurrence, dates.account_date);
    await panel.getByText(`Selected habit day: ${chosen.occurrence} · ${deviceTimezone}`, { exact: true }).waitFor();
    await panel.getByText(`Selected habit day: ${chosen.occurrence} · ${deviceTimezone}`, { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/selected-habit-calendar.png` });
  });
  await check("Open life module reaches the original Habits UI and Mark done saves through its existing repository", async () => {
    await panel.locator("[data-intention]").getByRole("link", { name: "Open life module" }).tap();
    await page.waitForURL(`${base}/en/habits`);
    const saved = page.waitForResponse(response => response.url().includes("/rest/v1/habit_completions") && response.request().method() === "POST" && response.status() === 201);
    await page.getByRole("button", { name: "Mark done", exact: true }).tap(); await saved;
    await page.getByRole("button", { name: "Complete", exact: true }).waitFor();
    const sourceWrites = view.writes.filter(value => value.table === "habit_completions");
    assert.equal(sourceWrites.length, 1); assert.equal(sourceWrites[0].completion_date, chosen.occurrence);
    const source = (await fixture.db.query("select completion_date::text,status from habit_completions where habit_id=$1", [habit])).rows;
    assert.deepEqual(source, [{ completion_date: chosen.occurrence, status: "done" }]);
    assert.equal((await fixture.pondStepState()).grants.length, 0, "The OS save records a fact; Garden confirmation remains a player choice");
    await page.screenshot({ path: `${out}/original-habits-completed.png` });
  });
  await check("returning to the garden confirms that exact OS completion and builds a persistent object", async () => {
    await page.goto(`${base}/en/garden`); await enter(page);
    await panel.getByRole("button", { name: "My next step", exact: true }).tap();
    await panel.locator(`[data-intention="${chosen.id}"]`).getByRole("button", { name: "Check my saved action", exact: true }).tap();
    await panel.locator(`[data-intention="${chosen.id}"]`).waitFor({ state: "detached" });
    await panel.getByRole("button", { name: "Arrange", exact: true }).tap();
    await panel.getByLabel("Build from a life opportunity", { exact: true }).selectOption({ index: 1 });
    await panel.getByLabel("Choose what to build", { exact: true }).selectOption("perch");
    await panel.getByText("Choose a position with buttons", { exact: true }).click();
    await panel.getByRole("button", { name: "Position 4, water", exact: true }).tap();
    await panel.getByRole("button", { name: "Place here", exact: true }).tap();
    await panel.getByRole("button", { name: "Position 4, Quiet perch", exact: true }).waitFor();
    await panel.getByText("Saved to your account", { exact: true }).waitFor();
    await panel.getByText(`Habit day: ${chosen.occurrence} · ${deviceTimezone}`, { exact: true }).waitFor();
    await panel.getByText(`Habit day: ${chosen.occurrence} · ${deviceTimezone}`, { exact: true }).scrollIntoViewIfNeeded();
    const state = await fixture.pondStepState(); assert.equal(state.grants.length, 1); assert.equal(state.objects.length, 5);
    await page.screenshot({ path: `${out}/habit-built-perch.png` });
  });
  await check("undo and re-completion in the original Habits page preserve the earned object without another award", async () => {
    await page.goto(`${base}/en/habits`);
    const removed = page.waitForResponse(response => response.url().includes("/rest/v1/habit_completions") && response.request().method() === "DELETE");
    await page.getByRole("button", { name: "Complete", exact: true }).tap(); await removed;
    await page.getByRole("button", { name: "Mark done", exact: true }).waitFor();
    assert.equal((await fixture.pondStepState()).objects.length, 5);
    const restored = page.waitForResponse(response => response.url().includes("/rest/v1/habit_completions") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Mark done", exact: true }).tap(); await restored;
    await page.goto(`${base}/en/garden`); await enter(page);
    await panel.getByRole("button", { name: "My next step", exact: true }).tap();
    await panel.getByLabel("Choose a source", { exact: true }).selectOption("habit");
    await panel.getByLabel("Your action", { exact: true }).selectOption(habit);
    await panel.getByRole("button", { name: "Choose this step", exact: true }).tap();
    await panel.locator("[data-intention]").getByRole("button", { name: "Check my saved action", exact: true }).tap();
    await panel.locator("[data-intention]").waitFor({ state: "detached" });
    const state = await fixture.pondStepState(); assert.equal(state.grants.length, 1); assert.equal(state.objects.length, 5);
    assert.equal(state.intentions.filter(value => value.status === "acknowledged_without_grant").length, 1);
  });
  await check("another device calendar reads the same earned object with its original Habit date", async () => {
    const other = await fixture.open({ width: 1366, height: 900 }, { deviceTimezone: profileTimezone });
    const second = await enter(other.page);
    await second.getByRole("button", { name: "Quiet perch Position 4", exact: true }).click();
    await second.getByText(`Habit day: ${chosen.occurrence} · ${deviceTimezone}`, { exact: true }).waitFor();
    await second.getByText(`Habit day: ${chosen.occurrence} · ${deviceTimezone}`, { exact: true }).scrollIntoViewIfNeeded();
    const state = await fixture.pondStepState(); assert.equal(state.grants.length, 1); assert.equal(state.objects.length, 5);
    await other.page.screenshot({ path: `${out}/other-device-original-day.png` });
    assert.deepEqual(other.errors, []); assert.deepEqual(other.rendererErrors, []);
  });
  assert.deepEqual(view.errors, []); assert.deepEqual(view.rendererErrors, []);
  const paths = ["src/app/[locale]/(protected)/habits/page.tsx", "src/lib/repositories/habits.ts", "src/lib/garden/pond-calendar.ts", "src/lib/garden/pond-persistence.ts", "src/components/garden/PondPanel.tsx", "src/components/garden/PondEvidenceLinks.tsx", "supabase/migrations/20260908162634_garden_living_pond.sql", "scripts/garden-pond-fixture.mjs", "scripts/verify-garden-pond-calendar-ui.mjs"];
  const sources = Object.fromEntries(await Promise.all(paths.map(async path => [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
  await writeFile(`${out}/validation.json`, JSON.stringify({ state: "original Habits UI and repository, intercepted PostgREST transport with isolated SQL; not live auth, production PostgREST, or physical devices", verifiedAt: new Date().toISOString(), sources, checks }, null, 2));
} catch (error) {
  if (page) { await page.screenshot({ path: `${out}/failure.png` }).catch(() => {}); await writeFile(`${out}/failure-body.txt`, await page.locator("body").innerText().catch(() => "Unavailable")); }
  throw error;
} finally { await fixture.close(); }
