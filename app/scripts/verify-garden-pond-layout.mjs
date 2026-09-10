import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { createPondFixture } from "./garden-pond-fixture.mjs";

const out = "../artifacts/garden-v3/layout";
await mkdir(out, { recursive: true });
const fixture = await createPondFixture(out), checks = [];
try {
  for (const [name, viewport, options] of [
    ["phone-320-zh", { width: 320, height: 740 }, { touch: true, locale: "zh-TW" }],
    ["phone-landscape", { width: 844, height: 390 }, { touch: true }],
    ["tablet", { width: 768, height: 1024 }, { touch: true }],
  ]) {
    const test = await fixture.open(viewport, options), page = test.page, zh = options.locale === "zh-TW";
    await page.locator("[data-garden-enter]").click();
    await page.getByRole("button", { name: zh ? "走進活水魚塘" : "Enter living pond", exact: true }).click();
    const panel = page.locator("[data-pond-panel]");
    await panel.getByText(zh ? "已儲存於帳戶" : "Saved to your account", { exact: true }).waitFor();
    await page.waitForTimeout(3500); // A real render sample after camera settling.
    const geometry = await panel.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, overflow: element.scrollWidth - element.clientWidth };
    });
    assert(geometry.left >= 0 && geometry.top >= 0 && geometry.right <= viewport.width + 1 && geometry.bottom <= viewport.height + 1, `${name}: panel must stay in the viewport`);
    assert(geometry.overflow <= 1, `${name}: panel must not scroll horizontally`);
    await page.screenshot({ path: `${out}/${name}.png` });
    await panel.getByText(zh ? "用按鈕選擇位置" : "Choose a position with buttons", { exact: true }).click();
    const last = panel.getByRole("button", { name: zh ? "位置 12，水面" : "Position 12, water", exact: true });
    await last.tap();
    assert.equal(await last.getAttribute("aria-pressed"), "true", "The last row must remain reachable by touch");
    const targets = await panel.getByRole("button").evaluateAll((buttons) => buttons.filter((button) => button.getClientRects().length).map((button) => ({ label: button.getAttribute("aria-label") ?? button.textContent, height: button.getBoundingClientRect().height })));
    assert(targets.every((target) => target.height >= 43.5), `${name}: visible buttons need 44px touch targets`);
    assert.deepEqual(test.errors, []); assert.deepEqual(test.rendererErrors, []);
    checks.push({ name, passed: true, geometry, targets, rendering: await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__) });
    await test.context.close(); console.log(`PASS ${name}`);
  }
  await writeFile(`${out}/validation.json`, JSON.stringify({ state: "Chrome touch emulation with isolated SQL; physical devices remain untested", checks }, null, 2));
} finally { await fixture.close(); }
