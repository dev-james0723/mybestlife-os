import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createPondFixture } from "./garden-pond-fixture.mjs";

const out = "../artifacts/garden-v3/focus";
await mkdir(out, { recursive: true });
const fixture = await createPondFixture(out), checks = [];
async function check(name, run) { await run(); checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
try {
  const view = await fixture.open({ width: 1440, height: 1000 }), page = view.page;
  const panel = page.locator("[data-pond-panel]");
  await page.locator("[data-garden-enter]").focus(); await page.keyboard.press("Enter");
  async function open() {
    await page.getByRole("button", { name: "Enter living pond", exact: true }).focus(); await page.keyboard.press("Enter");
    await panel.getByText("Saved to your account", { exact: true }).waitFor();
  }
  await check("keyboard entry focuses the named pond region before its controls", async () => {
    await open();
    assert(await panel.evaluate(node => node === document.activeElement));
    await page.keyboard.press("Tab");
    assert(await panel.getByRole("button", { name: "Return to garden", exact: true }).evaluate(node => node === document.activeElement));
    await page.keyboard.press("Tab");
    assert(await panel.getByRole("button", { name: "Arrange", exact: true }).evaluate(node => node === document.activeElement));
  });
  await check("Tab and Shift-Tab wrap within the entered world", async () => {
    const target = '[data-entered="true"]';
    const getControls = () => page.locator(`${target} button:not(:disabled), ${target} input:not(:disabled), ${target} select:not(:disabled), ${target} a[href], ${target} [tabindex="0"]`).filter({ visible: true });
    const controls = getControls(), first = controls.first(), last = controls.last();
    await last.focus(); await page.keyboard.press("Tab");
    assert(await first.evaluate(node => document.activeElement === node));
    await page.keyboard.press("Shift+Tab");
    assert(await last.evaluate(node => document.activeElement === node));
    assert(await last.evaluate(node => !!node.closest('[data-entered="true"]')));
  });
  await check("Escape returns focus to the world instead of the document body", async () => {
    await panel.getByRole("button", { name: "Observe", exact: true }).focus();
    await page.keyboard.press("Escape"); await panel.waitFor({ state: "detached" });
    assert(await page.locator('[data-entered="true"]').evaluate(node => document.activeElement === node));
    await page.keyboard.press("Tab");
    assert(await page.evaluate(() => !!document.activeElement.closest('[data-entered="true"]')));
  });
  await check("the explicit close button also restores usable world focus", async () => {
    await open(); await page.keyboard.press("Tab"); await page.keyboard.press("Enter");
    await panel.waitFor({ state: "detached" });
    assert(await page.locator('[data-entered="true"]').evaluate(node => document.activeElement === node));
  });
  await open(); await page.keyboard.press("Tab");
  await page.screenshot({ path: `${out}/keyboard-pond-entry.png`, animations: "disabled" });
  assert.deepEqual(view.errors, []); assert.deepEqual(view.rendererErrors, []);
  const paths = ["src/components/garden/PondPanel.tsx", "src/components/garden/GardenAdventure.tsx"];
  const sources = Object.fromEntries(await Promise.all(paths.map(async path => [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
  await writeFile(`${out}/validation.json`, JSON.stringify({ state: "real browser keyboard focus and Tab navigation; isolated fixture, not a screen-reader user study", verifiedAt: new Date().toISOString(), sources, checks }, null, 2));
} catch (error) {
  for (const context of fixture.browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
    await writeFile(`${out}/failure.txt`, await page.locator("body").innerText().catch(() => "unavailable"));
  }
  throw error;
} finally { await fixture.close(); }
