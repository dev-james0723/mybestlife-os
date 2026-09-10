import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.MIND_COUNCIL_VERIFY_BASE_URL ?? "http://127.0.0.1:3114";
const out = "../artifacts/mind-council-nuwa-2026-09-08";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
await context.addCookies([{ name: "mylifeos_dev_bypass", value: "1", url: baseUrl }]);
const page = await context.newPage();
page.setDefaultTimeout(60_000);
let profile = null;
let skill = null;
let profilesCreated = 0;
let researchCalls = 0;
let chatPayload;
const pageErrors = [];
page.on("pageerror", error => pageErrors.push(error.message));
const content = {
  lensTitle: "Ada Lovelace–inspired Lens", lensSubtitle: "Patterns, imagination, and precise reasoning.",
  systemPromptHint: "I connect symbolic patterns to practical experiments.",
  thinkingStyle: "Distinguish a mechanism from the uses imagination can find for it.",
  decisionPrinciples: ["Test the analogy"], communicationStyle: "Precise, curious, first person.",
  likelyQuestions: ["What could this represent?"], bestFor: ["Creative reasoning"], avoidFor: ["Private facts"], blindSpots: ["Limited public material"],
  starterPrompts: ["How can I test this idea?"],
  skillMarkdown: "# Ada Lovelace — fixture skill\nUse first person. Test symbolic patterns.",
  distillation: { protocol: "nuwa-v1", mode: "grounded", generatedAt: "2026-09-08", researchNotes: "Synthetic browser fixture only." },
};
const fulfill = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
await page.route("**/rest/v1/**", route => {
  const url = new URL(route.request().url());
  const table = url.pathname.split("/").at(-1);
  const write = route.request().method() === "POST";
  const single = (route.request().headers().accept ?? "").includes("object");
  if (table === "role_models") {
    if (write) {
      profilesCreated++;
      profile = { ...route.request().postDataJSON(), id: "11111111-1111-4111-8111-111111111114", user_id: "fixture", quotes: [], key_lessons: [], tags: [], created_at: "2026-09-08", updated_at: "2026-09-08" };
    }
    return fulfill(route, single ? profile : profile ? [profile] : []);
  }
  if (table === "role_model_neural_skills") {
    if (write) skill = { ...route.request().postDataJSON(), id: "fixture-skill", user_id: "fixture", created_at: "2026-09-08", updated_at: "2026-09-08" };
    return fulfill(route, single ? skill : skill ? [skill] : []);
  }
  return fulfill(route, []);
});
await page.route("**/api/mind-council/recommend", route => fulfill(route, { recommendedSkillIds: [], rationale: "" }));
await page.route("**/api/ai/role-model/distill-skill", route => {
  researchCalls++;
  assert.equal(route.request().postDataJSON().requireResearch, true);
  if (researchCalls === 1) return fulfill(route, { error: "research_unavailable" }, 503);
  return fulfill(route, { result: content, meta: { modelUsed: "browser-fixture", generationMode: "grounded" } });
});
await page.route("**/api/mind-council/chat", route => {
  chatPayload = route.request().postDataJSON();
  return fulfill(route, { reply: "I’d first ask what your symbols can represent. Then I’d test the smallest example.", source: "nuwa", skillPackageLoaded: true });
});
try {
  await mkdir(out, { recursive: true });
  const hydrated = page.waitForRequest(request => request.url().includes("/api/mind-council/recommend"), { timeout: 120_000 });
  await page.goto(`${baseUrl}/en/mind-council`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await hydrated;
  await page.getByRole("button", { name: "Add a council member", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Person’s name", { exact: true }).fill("Ada Lovelace");
  await dialog.getByRole("button", { name: "Create skill", exact: true }).click();
  await dialog.getByRole("alert").waitFor();
  assert.equal(profilesCreated, 1);
  assert.equal(skill, null, "Research failure must not save a generic skill");
  assert.equal(await dialog.getByLabel("Person’s name", { exact: true }).inputValue(), "Ada Lovelace");
  await page.screenshot({ path: `${out}/creation-retry.png` });
  await dialog.getByRole("button", { name: "Create skill", exact: true }).click();
  await page.getByRole("heading", { name: "Ada Lovelace", exact: true }).waitFor();
  assert.equal(profilesCreated, 1, "Retry must reuse the same profile");
  assert.equal(researchCalls, 2);
  assert.equal(skill.skill_json.skillMarkdown, content.skillMarkdown);
  assert.equal(skill.status, "ready");
  dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").fill("Help me develop an idea.");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await dialog.locator("article").waitFor();
  assert.equal(chatPayload.skillId, skill.mind_skill_id);
  assert(!("customSystemHint" in chatPayload), "Saved skill chat should send only its ID");
  assert(!("customLensTitle" in chatPayload));
  await page.screenshot({ path: `${out}/created-skill-chat.png` });
  await page.goto(`${baseUrl}/en/mind-council?skill=${skill.mind_skill_id}&mode=chat`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Ada Lovelace", exact: true }).waitFor();
  await page.getByRole("dialog").getByRole("textbox").fill("Can we continue after reload?");
  await page.getByRole("dialog").getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("dialog").locator("article").waitFor();
  assert.equal(chatPayload.skillId, skill.mind_skill_id);
  assert.deepEqual(pageErrors, []);
  const receipt = { execution: "local browser fixtures; no real AI calls or account writes", checks: ["name-only creation", "research failure and retry", "no duplicate profile", "full skill saved", "chat uses persisted skill ID", "reload and deep link"], profilesCreated, researchCalls };
  await writeFile(`${out}/creation-receipt.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  await page.screenshot({ path: `${out}/creation-failure.png` });
  console.error({ url: page.url(), pageErrors, text: (await page.locator("body").innerText()).slice(-1600) });
  throw error;
} finally {
  await browser.close();
}
