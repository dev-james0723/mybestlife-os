import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createPondFixture, base } from "./garden-pond-fixture.mjs";

const out = "../artifacts/garden-v3/buddy";
await mkdir(out, { recursive: true });
const fixture = await createPondFixture(out), checks = [];
async function until(predicate, message) {
  const end = Date.now() + 30_000;
  while (Date.now() < end) { if (await predicate()) return; await new Promise((resolve) => setTimeout(resolve, 250)); }
  throw new Error(message);
}
try {
  const test = await fixture.open({ width: 1280, height: 900 }), page = test.page;
  await page.locator("[data-garden-enter]").click();
  await page.getByRole("button", { name: "Enter living pond", exact: true }).click();
  const panel = page.locator("[data-pond-panel]");
  await panel.getByText("Saved to your account", { exact: true }).waitFor();
  await panel.getByRole("button", { name: "My next step", exact: true }).click();
  const optIn = panel.getByRole("checkbox", { name: "Buddy invitations for new pond changes", exact: true });
  assert.equal(await optIn.isChecked(), false);
  await optIn.click();
  await until(() => optIn.isChecked(), "Opt-in did not persist");
  checks.push({ name: "explicit opt-in uses the durable account command", passed: true });
  // A test-only clock fixture sets a mature milestone. This is not a claim that eight real hours elapsed.
  await fixture.readyPondGrowth();
  await page.getByRole("button", { name: "Leave garden", exact: true }).click();
  await page.goto(`${base}/en/dashboard`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Visit pond", exact: true }).waitFor({ timeout: 85_000 });
  await page.getByText(/Your dawnfish are ready for their next stage of growth/).waitFor();
  await until(async () => (await fixture.invitationRows()).rows.some((row) => row.shown_at), "Shown acknowledgement was not recorded");
  await page.screenshot({ path: `${out}/actual-buddy-invitation.png` });
  checks.push({ name: "the actual OS Buddy Dock displays a server-verified growth invitation", passed: true });
  test.fail();
  await page.getByRole("button", { name: "Close OS Buddy message", exact: true }).click();
  await page.waitForTimeout(600);
  test.recover();
  await page.reload({ waitUntil: "domcontentloaded" });
  await until(async () => (await fixture.invitationRows()).rows.some((row) => row.dismissed_at), "Queued dismissal did not survive reload");
  assert.equal((await fixture.invitationRows()).rows.length, 1);
  assert.equal(await page.getByRole("button", { name: "Visit pond", exact: true }).count(), 0);
  checks.push({ name: "offline dismissal survives reload and the same event is not invited again", passed: true });
  assert.deepEqual(test.errors, []);
  await writeFile(`${out}/validation.json`, JSON.stringify({ state: "actual Dock and SQL with fixture accounts and an explicitly simulated maturity timestamp; no external notification sent", checks }, null, 2));
} catch (error) {
  for (const context of fixture.browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
    await writeFile(`${out}/failure-body.txt`, await page.locator("body").innerText().catch(() => "unavailable"));
  }
  throw error;
} finally { await fixture.close(); }
