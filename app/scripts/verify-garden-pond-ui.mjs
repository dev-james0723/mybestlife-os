import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createPondFixture } from "./garden-pond-fixture.mjs";

const out = "../artifacts/garden-v3/playthrough";
await mkdir(out, { recursive: true });
const fixture = await createPondFixture(out), checks = [], rendering = [];
async function check(name, run) { await run(); checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
async function enter(page) {
  await page.locator("[data-garden-enter]").click();
  await page.locator('[data-entered="true"]').waitFor();
  await page.getByRole("button", { name: "Enter living pond", exact: true }).click();
  await page.locator("[data-pond-panel]").getByText("Saved to your account", { exact: true }).waitFor();
  await page.waitForTimeout(900); // Let the actual camera transition finish before visual evidence.
}
async function saved(page) { await page.locator("[data-pond-panel]").getByText("Saved to your account", { exact: true }).waitFor(); }
try {
  const desktop = await fixture.open({ width: 1440, height: 1000 });
  const { page } = desktop;
  const pondSourceReads = [];
  page.on("request", (request) => {
    const url = new URL(request.url()), select = url.searchParams.get("select");
    if (url.pathname.endsWith("/garden_pond_task_choices")) pondSourceReads.push("tasks");
    if ((url.pathname.endsWith("/tasks") && select === "id,title,status,project_id") || (url.pathname.endsWith("/habits") && select === "id,name") || (url.pathname.endsWith("/grateful_things") && select === "id,created_at")) pondSourceReads.push(url.pathname.split("/").at(-1));
  });
  await check("enter the account-owned pond from the real garden HUD", () => enter(page));
  const panel = page.locator("[data-pond-panel]");
  await page.screenshot({ path: `${out}/desktop-entry.png` });
  await check("place an owned reed using keyboard-accessible positions", async () => {
    await panel.getByText("Choose a position with buttons", { exact: true }).click();
    await panel.getByRole("button", { name: "Position 2, water", exact: true }).click();
    await panel.getByRole("button", { name: "Place here", exact: true }).click();
    await saved(page);
    await panel.getByRole("button", { name: "Position 2, Shore reeds", exact: true }).waitFor();
  });
  await check("pause and resume recover a still-in-flight placement without blocking the pond",async()=>{
    desktop.delayNextPondReply(4000);
    await panel.getByRole("button",{name:"Position 5, water",exact:true}).click();
    await panel.getByRole("button",{name:"Place here",exact:true}).click();
    await panel.getByText("Change kept · awaiting confirmation",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Pause",exact:true}).click();
    await page.getByRole("button",{name:"Keep exploring",exact:true}).click();
    await saved(page);
    await panel.getByText("Choose a position with buttons", { exact: true }).click();
    await panel.getByRole("button",{name:"Position 5, Shore reeds",exact:true}).waitFor();
    await panel.getByRole("button",{name:"Position 2, water",exact:true}).click();
    await panel.getByRole("button",{name:"Place here",exact:true}).click(); await saved(page);
    await panel.getByRole("button",{name:"Position 2, Shore reeds",exact:true}).waitFor();
  });
  await check("guide an animated fish route and record its first discovery", async () => {
    await panel.getByRole("button", { name: "Observe", exact: true }).click();
    for (const position of [3, 8, 12]) await panel.getByRole("button", { name: `Position ${position}, water`, exact: true }).click();
    await panel.getByRole("button", { name: "Guide fish", exact: true }).click();
    const record = panel.getByRole("button", { name: "Record", exact: true }).first();
    await record.waitFor();
    await record.click({ timeout: 40_000 }); await saved(page);
    await panel.getByText("Dawnfish ✓", { exact: true }).waitFor();
    await panel.getByRole("button", { name: "Record", exact: true }).nth(1).click(); await saved(page);
    await panel.getByText("Leaf snail ✓", { exact: true }).waitFor();
  });
  await check("chosen rest creates one real SQL grant and a built perch", async () => {
    await panel.getByRole("button", { name: "My next step", exact: true }).click();
    await panel.getByText("Connected life modules", { exact: true }).click();
    await panel.getByRole("checkbox", { name: "Chosen rest", exact: true }).click(); await saved(page);
    assert.deepEqual(pondSourceReads, [], "Rest-only consent must not load unrelated source lists");
    await panel.getByLabel("The small step I choose", { exact: true }).fill("Take a quiet walk");
    await panel.getByRole("button", { name: "Choose this step", exact: true }).click(); await saved(page);
    await panel.getByRole("button", { name: "I did my chosen rest", exact: true }).click(); await saved(page);
    await panel.getByRole("button", { name: "Arrange", exact: true }).click();
    await panel.getByLabel("Build from a life opportunity", { exact: true }).selectOption({ index: 1 });
    await panel.getByLabel("Choose what to build", { exact: true }).selectOption("perch");
    await panel.getByText("Choose a position with buttons", { exact: true }).click();
    await panel.getByRole("button", { name: "Position 4, water", exact: true }).click();
    desktop.loseNextResponse();
    await panel.getByRole("button", { name: "Place here", exact: true }).click();
    await panel.getByRole("button", { name: "Retry sync", exact: true }).waitFor();
    assert.equal(await panel.getByRole("button", { name: "Clear proposed change", exact: true }).count(),0,"Unknown network outcome must remain retryable");
    desktop.recover(); await panel.getByRole("button", { name: "Retry sync", exact: true }).click(); await saved(page);
    await panel.getByRole("button", { name: "Position 4, Quiet perch", exact: true }).waitFor();
    assert.equal(await panel.getByRole("button",{name:"Quiet perch Position 4",exact:true}).getAttribute("aria-pressed"),"true");
  });
  await check("an unfinished source can be corrected after a known rule rejection", async () => {
    await panel.getByRole("button", { name: "My next step", exact: true }).click();
    await panel.getByText("Connected life modules", { exact: true }).click();
    await panel.getByRole("checkbox", { name: "Tasks", exact: true }).click(); await saved(page);
    await panel.getByLabel("Choose a source", { exact: true }).selectOption("task");
    await panel.getByLabel("Your action", { exact: true }).selectOption("00000000-0000-4000-8000-000000000081");
    assert(pondSourceReads.includes("tasks"));
    assert(!pondSourceReads.includes("habits") && !pondSourceReads.includes("grateful_things"), "Task consent cannot enable other modules");
    await panel.getByRole("button", { name: "Choose this step", exact: true }).click(); await saved(page);
    await panel.getByRole("button", { name: "Check my saved action", exact: true }).click();
    await panel.getByText("Save this action in its life module first", { exact: true }).waitFor();
    await panel.getByRole("button", { name: "Clear proposed change", exact: true }).click(); await saved(page);
    await fixture.completeTask();
    await panel.getByRole("button", { name: "Check my saved action", exact: true }).click(); await saved(page);
    await panel.getByRole("button", { name: "Arrange", exact: true }).click();
    await panel.getByLabel("Build from a life opportunity", { exact: true }).waitFor();
  });
  await check("native fullscreen can enter and exit while the pond remains open",async()=>{
    await page.getByRole("button",{name:"Fullscreen",exact:true}).click();
    await page.waitForFunction(()=>!!document.fullscreenElement);
    await panel.waitFor();
    await page.getByRole("button",{name:"Exit fullscreen",exact:true}).click();
    await page.waitForFunction(()=>!document.fullscreenElement);
    await panel.waitFor();
  });
  rendering.push({device:"desktop Chrome headless; not physical-device performance", diagnostics:await page.evaluate(()=>window.__THREE_GAME_DIAGNOSTICS__)});
  await page.screenshot({ path: `${out}/desktop-built-pond.png` });
  await check("a second device reads the same placed habitat", async () => {
    const second = await fixture.open({ width: 390, height: 844 }, { touch: true });
    await enter(second.page);
    await second.page.screenshot({ path: `${out}/mobile-pond.png` });
    rendering.push({device:"390px touch emulation; not a physical phone",diagnostics:await second.page.evaluate(()=>window.__THREE_GAME_DIAGNOSTICS__)});
    const secondPanel = second.page.locator("[data-pond-panel]");
    await secondPanel.getByText("Choose a position with buttons", { exact: true }).click();
    await secondPanel.getByRole("button", { name: "Position 4, Quiet perch", exact: true }).waitFor();
    assert.equal(second.errors.length, 0);
    await second.context.close();
  });
  await check("a separate account can place objects without WebGL or animation", async () => {
    const fallback=await fixture.open({width:360,height:800},{account:"B",touch:true,noWebGL:true,reduced:true});
    await enter(fallback.page);
    const controls=fallback.page.locator("[data-pond-panel]");
    assert.equal(await controls.getByText("Quiet perch",{exact:true}).count(),0);
    await controls.getByRole("button",{name:"Position 2, water",exact:true}).tap();
    await controls.getByRole("button",{name:"Place here",exact:true}).tap(); await saved(fallback.page);
    await controls.getByRole("button",{name:"Position 2, Shore reeds",exact:true}).waitFor();
    await fallback.page.screenshot({path:`${out}/mobile-fallback.png`});
    assert.deepEqual(fallback.errors,[]);
    await fallback.context.close();
  });
  assert.deepEqual(desktop.errors, []); assert.deepEqual(desktop.rendererErrors, []);
  const sources = ["src/components/garden/GardenAdventure.tsx", "src/components/garden/PondPanel.tsx", "src/components/garden/pond-world.ts", "src/hooks/use-garden-pond.ts", "src/lib/repositories/garden-pond.ts", "src/lib/garden/pond-config.ts", "src/hooks/use-garden-buddy-invitations.ts", "supabase/migrations/20260908162634_garden_living_pond.sql", "supabase/migrations/20260908172055_garden_pond_buddy.sql"];
  const hashes = Object.fromEntries(await Promise.all(sources.map(async (path) => [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
  await writeFile(`${out}/validation.json`, JSON.stringify({ state: "isolated test accounts; actual UI and candidate SQL; not production", verifiedAt: new Date().toISOString(), sources: hashes, checks, rendering, errors: desktop.errors, writes: desktop.writes }, null, 2));
} catch (error) {
  for (const context of fixture.browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
    await writeFile(`${out}/failure-body.txt`, await page.locator("body").innerText().catch(() => "unavailable"));
  }
  throw error;
} finally { await fixture.close(); }
