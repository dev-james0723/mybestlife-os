import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createGardenFixture } from "./sky-garden-fixture.mjs";

const out = process.env.PHYSICALITY_OUT ?? "../artifacts/garden-physicality/ui-final";
await mkdir(out, { recursive: true });
const fixture = await createGardenFixture(out), evidence = [];
async function inspect(test, mobile = false) {
  const p = test.page, label = mobile ? "mobile" : "desktop";
  const diag = () => p.locator("canvas[data-garden-diagnostics]").evaluate(el => JSON.parse(el.dataset.gardenDiagnostics));
  await p.getByRole("button", { name: "Enter Garden", exact: true }).click();
  await p.getByRole("button", { name: "Garden settings", exact: true }).click();
  await p.getByLabel("Time of day", { exact: true }).selectOption("day");
  await p.getByLabel("Garden weather", { exact: true }).selectOption("clear");
  await p.getByRole("button", { name: "Close menu and resume", exact: true }).click();
  async function visit(kind, id, walking = false) {
    await p.getByRole("button", { name: "Map & field notes", exact: true }).click();
    await p.getByTestId(`garden-destination-${kind}-${id}`).click();
    if (walking) {
      await p.getByRole("button", { name: "Hide interface", exact: true }).click();
      for (let i = 0; i < 6; i++) {
        await p.waitForTimeout(150);
        evidence.push({ label: `${label}-walk-${i}`, ...(await diag()) });
        await p.screenshot({ path: `${out}/${label}-walk-${i}.png` });
      }
    }
    if (walking) await p.getByRole("button", { name: "Show interface", exact: true }).click();
    await p.waitForFunction(() => window.__THREE_GAME_TEST_HOOKS__.snapshot().target === null, null, { timeout: 60000 });
    await p.waitForTimeout(350);
  }
  if (!mobile) {
    for (let i = 0; i < 7; i++) await p.getByRole("button", { name: "Zoom in", exact: true }).click();
  }
  await visit("swing", "swing", !mobile);
  assert.match(await p.getByTestId("garden-action").innerText(), /Ride the swing/);
  await p.screenshot({ path: `${out}/${label}-swing-ready.png` });
  await p.getByTestId("garden-action").click();
  await p.waitForFunction(() => window.__THREE_GAME_TEST_HOOKS__.snapshot().swing.mode === "riding");
  await p.waitForTimeout(5000);
  const swings = [];
  for (let i = 0; i < 24; i++) {
    await p.waitForTimeout(140);
    const d = await diag(); swings.push(d.physicality.swing.angle);
    if (i % 6 === 0) await p.screenshot({ path: `${out}/${label}-swing-${i}.png` });
  }
  assert(Math.max(...swings) > 0.25 && Math.min(...swings) < -0.25, "Seat must complete a visible back-and-forth cycle");
  evidence.push({ label, swings, diagnostics: await diag() });
  await p.getByTestId("garden-action").click();
  await p.waitForFunction(() => window.__THREE_GAME_TEST_HOOKS__.snapshot().swing.mode === "idle", null, { timeout: 25000 });
  await p.waitForFunction(() => {
    const button = document.querySelector('[data-testid="garden-action"]');
    return button && !button.disabled && button.textContent.includes("Ride the swing");
  });
  await p.screenshot({ path: `${out}/${label}-swing-dismounted.png` });
  if (!mobile) {
    await visit("butterfly", "butterfly");
    await p.getByRole("button", { name: "Hide interface", exact: true }).click();
    const wings = [];
    for (let i = 0; i < 6; i++) {
      await p.waitForTimeout(85);
      wings.push((await diag()).physicality.wings);
      await p.screenshot({ path: `${out}/flight-${i}.png` });
    }
    for (let side = 0; side < 2; side++) assert(Math.max(...wings.map(w => w[side])) - Math.min(...wings.map(w => w[side])) > 0.9);
    evidence.push({ label: "flight", wings });
    await p.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState("island-asset"));
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/island-overview.png` });
  }
  assert.deepEqual(test.errors, []); assert.deepEqual(test.rendererErrors, []);
  const video = p.video();
  await test.context.close();
  if (video) evidence.push({ label, video: await video.path() });
}
try {
  await inspect(await fixture.open({ width: 1440, height: 900 }, { record: true }));
  await inspect(await fixture.open({ width: 390, height: 844 }, { touch: true, record: true }), true);
  await writeFile(`${out}/results.json`, JSON.stringify({ passed: true, execution: "Local fixture accounts, real WebGL renderer and UI input; no production services", evidence }, null, 2));
} catch (error) {
  for (const c of fixture.browser.contexts()) for (const p of c.pages()) await p.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  await writeFile(`${out}/failure.txt`, error.stack); throw error;
} finally { await fixture.close(); }
